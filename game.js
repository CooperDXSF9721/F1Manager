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
    scene.fog = new THREE.Fog(0x87CEEB, 100, 400);
    
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
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
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
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const trackWidth = 25;
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    // Simple oval track that works!
    // Main straight (going forward/+Z direction)
    const mainStraightLength = 150;
    const mainStraight = new THREE.PlaneGeometry(trackWidth, mainStraightLength);
    const mainStraightMesh = new THREE.Mesh(mainStraight, trackMaterial);
    mainStraightMesh.rotation.x = -Math.PI / 2;
    mainStraightMesh.position.set(-60, 0.01, 0);
    mainStraightMesh.receiveShadow = true;
    scene.add(mainStraightMesh);
    
    // Back straight (parallel to main)
    const backStraight = new THREE.PlaneGeometry(trackWidth, mainStraightLength);
    const backStraightMesh = new THREE.Mesh(backStraight, trackMaterial);
    backStraightMesh.rotation.x = -Math.PI / 2;
    backStraightMesh.position.set(60, 0.01, 0);
    backStraightMesh.receiveShadow = true;
    scene.add(backStraightMesh);
    
    // Turn 1 (top curve connecting straights)
    const turnRadius = 60;
    const turn1 = new THREE.RingGeometry(
        turnRadius - trackWidth / 2,
        turnRadius + trackWidth / 2,
        64, 1, 0, Math.PI
    );
    const turn1Mesh = new THREE.Mesh(turn1, trackMaterial);
    turn1Mesh.rotation.x = -Math.PI / 2;
    turn1Mesh.rotation.z = Math.PI / 2;
    turn1Mesh.position.set(0, 0.01, mainStraightLength / 2);
    turn1Mesh.receiveShadow = true;
    scene.add(turn1Mesh);
    
    // Turn 2 (bottom curve connecting straights)
    const turn2 = new THREE.RingGeometry(
        turnRadius - trackWidth / 2,
        turnRadius + trackWidth / 2,
        64, 1, 0, Math.PI
    );
    const turn2Mesh = new THREE.Mesh(turn2, trackMaterial);
    turn2Mesh.rotation.x = -Math.PI / 2;
    turn2Mesh.rotation.z = -Math.PI / 2;
    turn2Mesh.position.set(0, 0.01, -mainStraightLength / 2);
    turn2Mesh.receiveShadow = true;
    scene.add(turn2Mesh);
    
    // Start/Finish line
    const finishLineGeometry = new THREE.PlaneGeometry(trackWidth + 6, 5);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(-60, 0.03, -mainStraightLength / 2 + 10);
    finishLine.receiveShadow = true;
    scene.add(finishLine);
    
    // Checkered pattern
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 5; j++) {
            if ((i + j) % 2 === 1) {
                const checkGeometry = new THREE.PlaneGeometry(3.5, 1);
                const checkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const check = new THREE.Mesh(checkGeometry, checkMaterial);
                check.rotation.x = -Math.PI / 2;
                check.position.set(-73.25 + i * 3.5, 0.04, -mainStraightLength / 2 + 7.5 + j * 1);
                scene.add(check);
            }
        }
    }
    
    // White edge lines
    const lineGeometry = new THREE.PlaneGeometry(0.5, mainStraightLength);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Main straight lines
    for (let side of [-1, 1]) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(-60 + side * (trackWidth / 2 + 0.5), 0.02, 0);
        scene.add(line);
        
        const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(60 + side * (trackWidth / 2 + 0.5), 0.02, 0);
        scene.add(line2);
    }
    
    // Checkpoints - positioned at key track locations
    checkpoints = [
        { x: -60, z: -60 },  // Start/finish area
        { x: -60, z: 60 },   // End of main straight
        { x: 60, z: 60 },    // Top turn exit
        { x: 60, z: -60 }    // Bottom turn exit
    ];
}

function createPlayerCar() {
    const carGroup = new THREE.Group();
    
    // Main body - longer and lower like F1
    const bodyGeometry = new THREE.BoxGeometry(1.8, 0.5, 5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xe10600 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    carGroup.add(body);
    
    // Nose cone (front)
    const noseGeometry = new THREE.BoxGeometry(1.2, 0.3, 1);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.set(0, -0.1, 3);
    nose.castShadow = true;
    carGroup.add(nose);
    
    // Cockpit - smaller and more towards the back
    const cockpitGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.8);
    const cockpitMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.45, 0.5);
    cockpit.castShadow = true;
    carGroup.add(cockpit);
    
    // Halo (safety device)
    const haloGeometry = new THREE.TorusGeometry(0.6, 0.08, 8, 16, Math.PI);
    const haloMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.7, 0.5);
    carGroup.add(halo);
    
    // Wheels - F1 style
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    
    const wheelPositions = [
        [-1.1, -0.3, 2],    // Front left
        [1.1, -0.3, 2],     // Front right
        [-1.1, -0.3, -1.8], // Rear left
        [1.1, -0.3, -1.8]   // Rear right
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        carGroup.add(wheel);
    });
    
    // Front wing - very wide
    const frontWingGeometry = new THREE.BoxGeometry(2.8, 0.08, 0.6);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xe10600 });
    const frontWing = new THREE.Mesh(frontWingGeometry, wingMaterial);
    frontWing.position.set(0, 0.1, 3.5);
    carGroup.add(frontWing);
    
    // Rear wing - elevated
    const rearWingGeometry = new THREE.BoxGeometry(2.2, 0.1, 1);
    const rearWing = new THREE.Mesh(rearWingGeometry, wingMaterial);
    rearWing.position.set(0, 1, -2.5);
    carGroup.add(rearWing);
    
    // Wing supports
    const supportGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const supportMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    for (let side of [-0.8, 0.8]) {
        const support = new THREE.Mesh(supportGeometry, supportMaterial);
        support.position.set(side, 0.6, -2.5);
        carGroup.add(support);
    }
    
    // Sidepods
    const sidepodGeometry = new THREE.BoxGeometry(0.6, 0.4, 2);
    for (let side of [-1.2, 1.2]) {
        const sidepod = new THREE.Mesh(sidepodGeometry, bodyMaterial);
        sidepod.position.set(side, 0, 0);
        carGroup.add(sidepod);
    }
    
    carGroup.position.set(-60, 0.5, -65);
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

// Collision detection - disabled for now
function checkBarrierCollision(x, z) {
    return false; // No barriers yet
}

// Race logic
function animate() {
    if (!raceActive) return;
    
    requestAnimationFrame(animate);
    
    // Player controls - even slower acceleration
    const maxSpeed = 0.5 + (gameState.team.car.engine / 100) * 0.3;
    const acceleration = 0.003 + (gameState.team.car.engine / 100) * 0.002; // Even slower
    const turnSpeed = 0.015 + (gameState.team.car.chassis / 100) * 0.008;
    
    if (keys['w'] || keys['arrowup']) {
        playerVelocity = Math.min(playerVelocity + acceleration, maxSpeed);
    } else if (keys['s'] || keys['arrowdown']) {
        playerVelocity = Math.max(playerVelocity - acceleration * 2, -maxSpeed * 0.4);
    } else {
        playerVelocity *= 0.99; // Less friction
    }
    
    if (keys['a'] || keys['arrowleft']) {
        playerRotation += turnSpeed * Math.abs(playerVelocity / maxSpeed);
    }
    if (keys['d'] || keys['arrowright']) {
        playerRotation -= turnSpeed * Math.abs(playerVelocity / maxSpeed);
    }
    
    // Calculate new position
    const newX = playerCar.position.x + Math.sin(playerRotation) * playerVelocity;
    const newZ = playerCar.position.z + Math.cos(playerRotation) * playerVelocity;
    
    // Check collision before moving
    if (!checkBarrierCollision(newX, newZ)) {
        playerCar.position.x = newX;
        playerCar.position.z = newZ;
    } else {
        // Bounce back on collision
        playerVelocity *= -0.3;
    }
    
    playerCar.rotation.y = playerRotation;
    
    // Check player checkpoint
    const targetCheckpoint = checkpoints[currentCheckpoint];
    const dx = targetCheckpoint.x - playerCar.position.x;
    const dz = targetCheckpoint.z - playerCar.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < 25) {
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
    const camDistance = 14;
    const camHeight = 7;
    camera.position.x = playerCar.position.x - Math.sin(playerRotation) * camDistance;
    camera.position.y = playerCar.position.y + camHeight;
    camera.position.z = playerCar.position.z - Math.cos(playerRotation) * camDistance;
    camera.lookAt(playerCar.position);
    
    // Update HUD
    document.getElementById('speed').textContent = Math.round(Math.abs(playerVelocity) * 400) + ' km/h';
    document.getElementById('position').textContent = '1/1';
    
    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('currentLap').textContent = `${currentLap}/${selectedTrack.laps}`;
}

function finishRace() {
    raceActive = false;
    
    const position = 1;
    const points = 25;
    const prize = points * 500000;
    const repGain = 10;
    
    gameState.money += prize;
    gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + repGain));
    
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
