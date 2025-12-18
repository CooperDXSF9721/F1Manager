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
let playerCar;
let track;
let keys = {};
let playerVelocity = 0;
let playerRotation = 0;
let checkpoints = [];
let currentCheckpoint = 0;
let raceActive = false;
let barriers = [];

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
    barriers = [];
    
    const canvas = document.getElementById('raceCanvas');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300);
    
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
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -150;
    sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150;
    sunLight.shadow.camera.bottom = -150;
    scene.add(sunLight);
    
    // Create track
    createTrack();
    
    // Create player car
    createPlayerCar();
    
    // Start animation
    animate();
    
    updateHUD();
}

function createTrack() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const trackWidth = 15;
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const barrierMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    
    // Track sections with proper positioning
    const sections = [];
    
    // Starting straight (going forward/north)
    sections.push({
        type: 'straight',
        length: 60,
        position: { x: 0, z: -30 },
        rotation: 0
    });
    
    // Right turn 90 degrees
    sections.push({
        type: 'curve',
        radius: 25,
        angle: Math.PI / 2,
        position: { x: 25, z: 30 },
        rotation: Math.PI
    });
    
    // Straight going east
    sections.push({
        type: 'straight',
        length: 50,
        position: { x: 50, z: 55 },
        rotation: Math.PI / 2
    });
    
    // Hairpin turn (180 degrees)
    sections.push({
        type: 'curve',
        radius: 20,
        angle: Math.PI,
        position: { x: 75, z: 55 },
        rotation: Math.PI / 2
    });
    
    // Straight going west
    sections.push({
        type: 'straight',
        length: 50,
        position: { x: 50, z: 35 },
        rotation: -Math.PI / 2
    });
    
    // Left chicane - first part
    sections.push({
        type: 'curve',
        radius: 15,
        angle: Math.PI / 3,
        position: { x: 25, z: 35 },
        rotation: -Math.PI / 2
    });
    
    // Left chicane - second part
    sections.push({
        type: 'curve',
        radius: 15,
        angle: Math.PI / 3,
        position: { x: 15, z: 22 },
        rotation: -Math.PI / 6
    });
    
    // Final straight back to start
    sections.push({
        type: 'straight',
        length: 25,
        position: { x: 7.5, z: 5 },
        rotation: Math.PI
    });
    
    // Build track sections
    sections.forEach(section => {
        if (section.type === 'straight') {
            const geometry = new THREE.PlaneGeometry(trackWidth, section.length);
            const mesh = new THREE.Mesh(geometry, trackMaterial);
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = section.rotation;
            mesh.position.set(section.position.x, 0.01, section.position.z);
            mesh.receiveShadow = true;
            scene.add(mesh);
            
            // White lines on edges
            for (let side of [-1, 1]) {
                const lineGeometry = new THREE.PlaneGeometry(0.5, section.length);
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.rotation.x = -Math.PI / 2;
                line.rotation.z = section.rotation;
                const offset = side * (trackWidth / 2 - 0.25);
                const offsetX = offset * Math.cos(section.rotation);
                const offsetZ = -offset * Math.sin(section.rotation);
                line.position.set(section.position.x + offsetX, 0.02, section.position.z + offsetZ);
                scene.add(line);
                
                // Barriers
                const barrierGeometry = new THREE.BoxGeometry(2, 3, section.length);
                const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
                barrier.rotation.y = section.rotation;
                const barrierOffset = side * (trackWidth / 2 + 1.5);
                const barrierOffsetX = barrierOffset * Math.cos(section.rotation);
                const barrierOffsetZ = -barrierOffset * Math.sin(section.rotation);
                barrier.position.set(section.position.x + barrierOffsetX, 1.5, section.position.z + barrierOffsetZ);
                barrier.castShadow = true;
                scene.add(barrier);
                barriers.push(barrier);
            }
            
        } else if (section.type === 'curve') {
            const segments = 32;
            const innerRadius = section.radius - trackWidth / 2;
            const outerRadius = section.radius + trackWidth / 2;
            
            const geometry = new THREE.RingGeometry(innerRadius, outerRadius, segments, 1, 0, section.angle);
            const mesh = new THREE.Mesh(geometry, trackMaterial);
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = section.rotation;
            mesh.position.set(section.position.x, 0.01, section.position.z);
            mesh.receiveShadow = true;
            scene.add(mesh);
            
            // Curved barriers
            for (let radius of [innerRadius - 1, outerRadius + 1]) {
                for (let i = 0; i <= segments; i++) {
                    const angle = (i / segments) * section.angle;
                    const barrierGeometry = new THREE.BoxGeometry(2, 3, 2);
                    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
                    
                    const globalAngle = angle + section.rotation;
                    const x = section.position.x + radius * Math.cos(globalAngle);
                    const z = section.position.z + radius * Math.sin(globalAngle);
                    
                    barrier.position.set(x, 1.5, z);
                    barrier.rotation.y = globalAngle + Math.PI / 2;
                    barrier.castShadow = true;
                    scene.add(barrier);
                    barriers.push(barrier);
                }
            }
        }
    });
    
    // Start/Finish line - highly visible
    const finishLineGeometry = new THREE.PlaneGeometry(trackWidth + 4, 3);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF,
        transparent: false
    });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.03, -58);
    scene.add(finishLine);
    
    // Checkered pattern for finish line
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 3; j++) {
            if ((i + j) % 2 === 1) {
                const checkGeometry = new THREE.PlaneGeometry(3, 1);
                const checkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const check = new THREE.Mesh(checkGeometry, checkMaterial);
                check.rotation.x = -Math.PI / 2;
                check.position.set(-7.5 + i * 3, 0.04, -59.5 + j * 1);
                scene.add(check);
            }
        }
    }
    
    // Checkpoints for lap counting
    checkpoints = [
        { x: 0, z: 0 },      // Start/finish
        { x: 50, z: 55 },    // First straight
        { x: 75, z: 45 },    // Hairpin
        { x: 25, z: 35 },    // Back straight
    ];
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
    
    // Front wing
    const frontWingGeometry = new THREE.BoxGeometry(2.5, 0.1, 0.5);
    const frontWing = new THREE.Mesh(frontWingGeometry, wingMaterial);
    frontWing.position.set(0, 0.2, 2);
    carGroup.add(frontWing);
    
    carGroup.position.set(0, 0.5, -55);
    carGroup.rotation.y = 0;
    playerCar = carGroup;
    scene.add(carGroup);
}

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Collision detection
function checkBarrierCollision(x, z) {
    for (let barrier of barriers) {
        const dx = x - barrier.position.x;
        const dz = z - barrier.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 3) {
            return true;
        }
    }
    return false;
}

// Race logic
function animate() {
    if (!raceActive) return;
    
    requestAnimationFrame(animate);
    
    // Player controls - reduced sensitivity and slower acceleration
    const maxSpeed = 0.5 + (gameState.team.car.engine / 100) * 0.3;
    const acceleration = 0.008 + (gameState.team.car.engine / 100) * 0.004; // Much slower acceleration
    const turnSpeed = 0.015 + (gameState.team.car.chassis / 100) * 0.008; // Reduced turn speed
    
    if (keys['w'] || keys['arrowup']) {
        playerVelocity = Math.min(playerVelocity + acceleration, maxSpeed);
    } else if (keys['s'] || keys['arrowdown']) {
        playerVelocity = Math.max(playerVelocity - acceleration * 2, -maxSpeed * 0.4);
    } else {
        playerVelocity *= 0.98; // Friction
    }
    
    if (keys['a'] || keys['arrowleft']) {
        playerRotation += turnSpeed * (playerVelocity / maxSpeed); // Turn speed based on current speed
    }
    if (keys['d'] || keys['arrowright']) {
        playerRotation -= turnSpeed * (playerVelocity / maxSpeed);
    }
    
    // Calculate new position
    const newX = playerCar.position.x + Math.sin(playerRotation) * playerVelocity;
    const newZ = playerCar.position.z + Math.cos(playerRotation) * playerVelocity;
    
    // Check collision before moving
    if (!checkBarrierCollision(newX, newZ)) {
        playerCar.position.x = newX;
        playerCar.position.z = newZ;
    } else {
        // Bounce back slightly on collision
        playerVelocity *= -0.3;
    }
    
    playerCar.rotation.y = playerRotation;
    
    // Check player checkpoint
    const targetCheckpoint = checkpoints[currentCheckpoint];
    const dx = targetCheckpoint.x - playerCar.position.x;
    const dz = targetCheckpoint.z - playerCar.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 20) {
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
    
    // Camera follow - better positioning
    const camDistance = 12;
    const camHeight = 6;
    camera.position.x = playerCar.position.x - Math.sin(playerRotation) * camDistance;
    camera.position.y = playerCar.position.y + camHeight;
    camera.position.z = playerCar.position.z - Math.cos(playerRotation) * camDistance;
    camera.lookAt(playerCar.position);
    
    // Update HUD
    document.getElementById('speed').textContent = Math.round(Math.abs(playerVelocity) * 400) + ' km/h';
    document.getElementById('position').textContent = '1/1'; // Solo racing
    
    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('currentLap').textContent = `${currentLap}/${selectedTrack.laps}`;
}

function finishRace() {
    raceActive = false;
    
    // Calculate time bonus (faster = more money)
    const position = 1;
    const points = 25;
    const prize = points * 500000;
    const repGain = 10;
    
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
                <div style="font-size: 1.5em; margin-bottom: 10px;">Race Complete!</div>
                <div class="result-position">P${position}</div>
            </div>
        </div>
        <div class="result-item">
            <span>Championship Points</span>
            <span style="font-size: 1.5em; color: #f39c12;">${points} pts</span>
        </div>
        <div class="result-prize">Prize Money: ${formatMoney(prize)}</div>
        <div style="opacity: 0.8;">Reputation: +${repGain}</div>
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
