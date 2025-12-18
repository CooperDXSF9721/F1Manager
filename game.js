// Game State
const gameState = {
    money: 50000000,
    reputation: 50,
    season: 1,
    team: {
        name: 'Racing Legends',
        color: '#e10600',
        drivers: [
            { name: 'Max Power', skill: 75, experience: 60, salary: 5000000 },
            { name: 'Luna Swift', skill: 70, experience: 55, salary: 4000000 }
        ],
        car: {
            engine: 70,
            aerodynamics: 65,
            chassis: 60,
            reliability: 75
        }
    }
};

const tracks = [
    { name: 'Monaco GP', difficulty: 85, laps: 3, length: 3.337 },
    { name: 'Silverstone', difficulty: 70, laps: 3, length: 5.891 },
    { name: 'Monza', difficulty: 65, laps: 3, length: 5.793 },
    { name: 'Spa-Francorchamps', difficulty: 75, laps: 3, length: 7.004 },
    { name: 'Suzuka', difficulty: 80, laps: 3, length: 5.807 }
];

const upgrades = [
    { name: 'Engine Power', stat: 'engine', cost: 5000000, improvement: 10 },
    { name: 'Aerodynamics', stat: 'aerodynamics', cost: 4500000, improvement: 10 },
    { name: 'Chassis', stat: 'chassis', cost: 4000000, improvement: 10 },
    { name: 'Reliability', stat: 'reliability', cost: 3000000, improvement: 10 }
];

let selectedTrack = tracks[0];
let currentLap = 1;

// 3D Racing Variables
let scene, camera, renderer;
let playerCar, aiCars = [];
let track;
let keys = {};
let playerVelocity = 0;
let playerRotation = 0;
let checkpoints = [];
let currentCheckpoint = 0;
let raceActive = false;

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'mainMenu') updateUI();
    if (screenId === 'team') renderTeam();
    if (screenId === 'garage') renderGarage();
    if (screenId === 'trackSelect') renderTracks();
}

// UI Updates
function updateUI() {
    document.getElementById('budget').textContent = formatMoney(gameState.money);
    document.getElementById('reputation').textContent = `${gameState.reputation}/100`;
    document.getElementById('season').textContent = gameState.season;
    document.getElementById('teamName').textContent = gameState.team.name;
}

function formatMoney(amount) {
    return `$${(amount / 1000000).toFixed(1)}M`;
}

// Team Screen
function renderTeam() {
    const grid = document.getElementById('driversGrid');
    grid.innerHTML = gameState.team.drivers.map(driver => `
        <div class="driver-card">
            <h3>${driver.name}</h3>
            <div class="stat-bar">
                <div class="stat-bar-header">
                    <span>Skill</span>
                    <span>${driver.skill}/100</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${driver.skill}%"></div>
                </div>
            </div>
            <div class="stat-bar">
                <div class="stat-bar-header">
                    <span>Experience</span>
                    <span>${driver.experience}/100</span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill" style="width: ${driver.experience}%"></div>
                </div>
            </div>
            <p style="margin-top: 15px; opacity: 0.8;">Salary: ${formatMoney(driver.salary)}/season</p>
        </div>
    `).join('');
}

// Garage Screen
function renderGarage() {
    const carStats = document.getElementById('carStats');
    carStats.innerHTML = Object.entries(gameState.team.car).map(([key, value]) => `
        <div class="stat-bar">
            <div class="stat-bar-header">
                <span style="text-transform: capitalize;">${key}</span>
                <span>${value}/100</span>
            </div>
            <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width: ${value}%"></div>
            </div>
        </div>
    `).join('');

    const upgradesGrid = document.getElementById('upgradesGrid');
    upgradesGrid.innerHTML = upgrades.map((upgrade, idx) => {
        const canAfford = gameState.money >= upgrade.cost;
        const maxed = gameState.team.car[upgrade.stat] >= 100;
        return `
            <div class="upgrade-card">
                <h3>${upgrade.name}</h3>
                <p>+${upgrade.improvement} to ${upgrade.stat}</p>
                <button 
                    class="upgrade-btn" 
                    onclick="purchaseUpgrade(${idx})"
                    ${!canAfford || maxed ? 'disabled' : ''}
                >
                    ${maxed ? 'Maxed Out' : formatMoney(upgrade.cost)}
                </button>
            </div>
        `;
    }).join('');
}

function purchaseUpgrade(idx) {
    const upgrade = upgrades[idx];
    if (gameState.money >= upgrade.cost && gameState.team.car[upgrade.stat] < 100) {
        gameState.money -= upgrade.cost;
        gameState.team.car[upgrade.stat] = Math.min(100, gameState.team.car[upgrade.stat] + upgrade.improvement);
        renderGarage();
        updateUI();
    }
}

// Track Selection
function renderTracks() {
    const grid = document.getElementById('tracksGrid');
    grid.innerHTML = tracks.map((track, idx) => `
        <div class="track-card" onclick="selectTrack(${idx})">
            <h3>${track.name}</h3>
            <div class="track-info">
                <span>Difficulty: ${track.difficulty}/100</span>
                <span>Laps: ${track.laps}</span>
            </div>
        </div>
    `).join('');
}

function selectTrack(idx) {
    selectedTrack = tracks[idx];
    initRace();
}

// 3D Race Setup
function initRace() {
    showScreen('race');
    currentLap = 1;
    currentCheckpoint = 0;
    raceActive = true;
    
    const canvas = document.getElementById('raceCanvas');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    // Create track
    createTrack();
    
    // Create player car
    createPlayerCar();
    
    // Create AI cars
    createAICars();
    
    // Start animation
    animate();
    
    updateHUD();
}

function createTrack() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Race track (oval)
    const trackWidth = 12;
    const trackLength = 80;
    const trackCurveRadius = 30;
    
    // Straight sections
    const straightGeometry = new THREE.PlaneGeometry(trackWidth, trackLength);
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const straight1 = new THREE.Mesh(straightGeometry, trackMaterial);
    straight1.rotation.x = -Math.PI / 2;
    straight1.position.set(-trackCurveRadius, 0.01, 0);
    straight1.receiveShadow = true;
    scene.add(straight1);
    
    const straight2 = new THREE.Mesh(straightGeometry, trackMaterial);
    straight2.rotation.x = -Math.PI / 2;
    straight2.position.set(trackCurveRadius, 0.01, 0);
    straight2.receiveShadow = true;
    scene.add(straight2);
    
    // Curved sections
    const curveGeometry = new THREE.RingGeometry(trackCurveRadius - trackWidth/2, trackCurveRadius + trackWidth/2, 32, 1, 0, Math.PI);
    
    const curve1 = new THREE.Mesh(curveGeometry, trackMaterial);
    curve1.rotation.x = -Math.PI / 2;
    curve1.position.set(0, 0.01, trackLength/2);
    curve1.receiveShadow = true;
    scene.add(curve1);
    
    const curve2 = new THREE.Mesh(curveGeometry, trackMaterial);
    curve2.rotation.x = -Math.PI / 2;
    curve2.rotation.z = Math.PI;
    curve2.position.set(0, 0.01, -trackLength/2);
    curve2.receiveShadow = true;
    scene.add(curve2);
    
    // White track lines
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const lineGeometry = new THREE.PlaneGeometry(0.5, trackLength);
    
    for (let side of [-1, 1]) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(-trackCurveRadius + side * trackWidth/2, 0.02, 0);
        scene.add(line);
        
        const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(trackCurveRadius + side * trackWidth/2, 0.02, 0);
        scene.add(line2);
    }
    
    // Checkpoints
    checkpoints = [
        { x: -trackCurveRadius, z: 0 },
        { x: 0, z: trackLength/2 },
        { x: trackCurveRadius, z: 0 },
        { x: 0, z: -trackLength/2 }
    ];
    
    // Start/Finish line
    const finishLineGeometry = new THREE.PlaneGeometry(trackWidth, 2);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8
    });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(-trackCurveRadius, 0.02, -trackLength/2 + 5);
    scene.add(finishLine);
}

function createPlayerCar() {
    const carGroup = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe10600 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    carGroup.add(body);
    
    // Cockpit
    const cockpitGeometry = new THREE.BoxGeometry(1.5, 0.6, 2);
    const cockpitMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.6, -0.5);
    cockpit.castShadow = true;
    carGroup.add(cockpit);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    const wheelPositions = [
        [-1, -0.3, 1.3],
        [1, -0.3, 1.3],
        [-1, -0.3, -1.3],
        [1, -0.3, -1.3]
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        carGroup.add(wheel);
    });
    
    // Rear wing
    const wingGeometry = new THREE.BoxGeometry(2.5, 0.1, 0.8);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xe10600 });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(0, 0.8, -2);
    carGroup.add(wing);
    
    carGroup.position.set(-30, 0.5, -35);
    playerCar = carGroup;
    scene.add(carGroup);
}

function createAICars() {
    const colors = [0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500];
    
    for (let i = 0; i < 6; i++) {
        const carGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: colors[i] });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        carGroup.add(body);
        
        const cockpitGeometry = new THREE.BoxGeometry(1.5, 0.6, 2);
        const cockpit = new THREE.Mesh(cockpitGeometry, new THREE.MeshLambertMaterial({ color: 0x000000 }));
        cockpit.position.set(0, 0.6, -0.5);
        carGroup.add(cockpit);
        
        carGroup.position.set(-30 + (i % 2) * 4, 0.5, -35 - (i * 6));
        carGroup.userData = {
            velocity: 0.3 + Math.random() * 0.1,
            checkpoint: 0,
            lap: 1,
            rotation: 0
        };
        
        aiCars.push(carGroup);
        scene.add(carGroup);
    }
}

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Race logic
function animate() {
    if (!raceActive) return;
    
    requestAnimationFrame(animate);
    
    // Player controls
    const maxSpeed = 0.8 + (gameState.team.car.engine / 100) * 0.4;
    const acceleration = 0.02 + (gameState.team.car.engine / 100) * 0.01;
    const turnSpeed = 0.03 + (gameState.team.car.chassis / 100) * 0.02;
    
    if (keys['w'] || keys['arrowup']) {
        playerVelocity = Math.min(playerVelocity + acceleration, maxSpeed);
    } else if (keys['s'] || keys['arrowdown']) {
        playerVelocity = Math.max(playerVelocity - acceleration * 1.5, -maxSpeed * 0.5);
    } else {
        playerVelocity *= 0.98; // Friction
    }
    
    if (keys['a'] || keys['arrowleft']) {
        playerRotation += turnSpeed;
    }
    if (keys['d'] || keys['arrowright']) {
        playerRotation -= turnSpeed;
    }
    
    // Update player position
    playerCar.position.x += Math.sin(playerRotation) * playerVelocity;
    playerCar.position.z += Math.cos(playerRotation) * playerVelocity;
    playerCar.rotation.y = playerRotation;
    
    // Update AI cars
    aiCars.forEach(car => {
        const targetCheckpoint = checkpoints[car.userData.checkpoint];
        const dx = targetCheckpoint.x - car.position.x;
        const dz = targetCheckpoint.z - car.position.z;
        const angle = Math.atan2(dx, dz);
        
        car.userData.rotation = angle;
        car.rotation.y = angle;
        
        car.position.x += Math.sin(angle) * car.userData.velocity;
        car.position.z += Math.cos(angle) * car.userData.velocity;
        
        // Check AI checkpoint
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 15) {
            car.userData.checkpoint = (car.userData.checkpoint + 1) % checkpoints.length;
            if (car.userData.checkpoint === 0) {
                car.userData.lap++;
            }
        }
    });
    
    // Check player checkpoint
    const targetCheckpoint = checkpoints[currentCheckpoint];
    const dx = targetCheckpoint.x - playerCar.position.x;
    const dz = targetCheckpoint.z - playerCar.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 15) {
        currentCheckpoint = (currentCheckpoint + 1) % checkpoints.length;
        if (currentCheckpoint === 0) {
            currentLap++;
            updateHUD();
            
            if (currentLap > selectedTrack.laps) {
                finishRace();
                return;
            }
        }
    }
    
    // Camera follow
    camera.position.x = playerCar.position.x - Math.sin(playerRotation) * 15;
    camera.position.y = playerCar.position.y + 8;
    camera.position.z = playerCar.position.z - Math.cos(playerRotation) * 15;
    camera.lookAt(playerCar.position);
    
    // Update HUD
    document.getElementById('speed').textContent = Math.round(Math.abs(playerVelocity) * 300) + ' km/h';
    
    // Calculate position
    let position = 1;
    aiCars.forEach(car => {
        if (car.userData.lap > currentLap || 
            (car.userData.lap === currentLap && car.userData.checkpoint > currentCheckpoint)) {
            position++;
        }
    });
    document.getElementById('position').textContent = `${position}/7`;
    
    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('currentLap').textContent = `${currentLap}/${selectedTrack.laps}`;
}

function finishRace() {
    raceActive = false;
    
    // Calculate final position
    let position = 1;
    aiCars.forEach(car => {
        if (car.userData.lap > currentLap) {
            position++;
        }
    });
    
    // Calculate points and rewards
    const pointsMap = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6 };
    const points = pointsMap[position] || 0;
    const prize = points * 500000;
    const repGain = Math.max(-5, Math.min(10, points - 10));
    
    gameState.money += prize;
    gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + repGain));
    
    // Show results
    showResults(position, points, prize, repGain);
}

function showResults(position, points, prize, repGain) {
    const resultsContent = document.getElementById('resultsContent');
    resultsContent.innerHTML = `
        <div class="result-item">
            <div>
                <div style="font-size: 1.5em; margin-bottom: 10px;">Final Position</div>
                <div class="result-position">P${position}</div>
            </div>
        </div>
        <div class="result-item">
            <span>Championship Points</span>
            <span style="font-size: 1.5em; color: #f39c12;">${points} pts</span>
        </div>
        <div class="result-prize">Prize Money: ${formatMoney(prize)}</div>
        <div style="opacity: 0.8;">Reputation: ${repGain > 0 ? '+' : ''}${repGain}</div>
    `;
    
    showScreen('results');
    
    // Cleanup
    if (renderer) {
        renderer.dispose();
        scene = null;
        camera = null;
        renderer = null;
    }
}

// Window resize
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Initialize
updateUI();
