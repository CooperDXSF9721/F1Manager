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
    const groundGeometry = new THREE.PlaneGeometry(800, 800);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const trackWidth = 25; // Wider track
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const barrierMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    
    // Helper function to create barriers along a straight
    function createStraightBarriers(x, z, rotation, length) {
        for (let side of [-1, 1]) {
            const segments = Math.ceil(length / 4);
            for (let i = 0; i < segments; i++) {
                const barrierGeometry = new THREE.BoxGeometry(2, 3, 4);
                const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
                barrier.rotation.y = rotation;
                
                const segmentPos = (i / segments) * length - length / 2;
                const barrierOffset = side * (trackWidth / 2 + 1.5);
                const barrierOffsetX = barrierOffset * Math.cos(rotation + Math.PI / 2);
                const barrierOffsetZ = barrierOffset * Math.sin(rotation + Math.PI / 2);
                
                const localX = segmentPos * Math.cos(rotation);
                const localZ = segmentPos * Math.sin(rotation);
                
                barrier.position.set(x + localX + barrierOffsetX, 1.5, z + localZ + barrierOffsetZ);
                barrier.castShadow = true;
                scene.add(barrier);
                barriers.push(barrier);
            }
        }
    }
    
    // Helper function to create curved barriers
    function createCurvedBarriers(centerX, centerZ, radius, startAngle, endAngle, isInner) {
        const segments = Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 16));
        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + (i / segments) * (endAngle - startAngle);
            const barrierGeometry = new THREE.BoxGeometry(2, 3, 3);
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            
            const barrierRadius = radius + (isInner ? -(trackWidth / 2 + 1.5) : (trackWidth / 2 + 1.5));
            const x = centerX + barrierRadius * Math.cos(angle);
            const z = centerZ + barrierRadius * Math.sin(angle);
            
            barrier.position.set(x, 1.5, z);
            barrier.rotation.y = angle + Math.PI / 2;
            barrier.castShadow = true;
            scene.add(barrier);
            barriers.push(barrier);
        }
    }
    
    // Starting straight (going north/forward)
    const straight1Length = 100;
    const straight1Geo = new THREE.PlaneGeometry(trackWidth, straight1Length);
    const straight1 = new THREE.Mesh(straight1Geo, trackMaterial);
    straight1.rotation.x = -Math.PI / 2;
    straight1.position.set(0, 0.01, -50);
    straight1.receiveShadow = true;
    scene.add(straight1);
    createStraightBarriers(0, -50, 0, straight1Length);
    
    // Turn 1 - Right turn (90 degrees)
    const turn1Radius = 35;
    const turn1Geo = new THREE.RingGeometry(
        turn1Radius - trackWidth / 2,
        turn1Radius + trackWidth / 2,
        32, 1, -Math.PI / 2, Math.PI / 2
    );
    const turn1 = new THREE.Mesh(turn1Geo, trackMaterial);
    turn1.rotation.x = -Math.PI / 2;
    turn1.position.set(turn1Radius, 0.01, 0);
    turn1.receiveShadow = true;
    scene.add(turn1);
    createCurvedBarriers(turn1Radius, 0, turn1Radius, -Math.PI / 2, 0, true);
    createCurvedBarriers(turn1Radius, 0, turn1Radius, -Math.PI / 2, 0, false);
    
    // Straight 2 (going east)
    const straight2Length = 120;
    const straight2Geo = new THREE.PlaneGeometry(trackWidth, straight2Length);
    const straight2 = new THREE.Mesh(straight2Geo, trackMaterial);
    straight2.rotation.x = -Math.PI / 2;
    straight2.rotation.z = Math.PI / 2;
    straight2.position.set(turn1Radius * 2 + 60, 0.01, turn1Radius);
    straight2.receiveShadow = true;
    scene.add(straight2);
    createStraightBarriers(turn1Radius * 2 + 60, turn1Radius, Math.PI / 2, straight2Length);
    
    // Turn 2 - Right turn (90 degrees)
    const turn2Radius = 35;
    const turn2Geo = new THREE.RingGeometry(
        turn2Radius - trackWidth / 2,
        turn2Radius + trackWidth / 2,
        32, 1, 0, Math.PI / 2
    );
    const turn2 = new THREE.Mesh(turn2Geo, trackMaterial);
    turn2.rotation.x = -Math.PI / 2;
    turn2.position.set(turn1Radius * 2 + 120, 0.01, turn1Radius + turn2Radius);
    turn2.receiveShadow = true;
    scene.add(turn2);
    createCurvedBarriers(turn1Radius * 2 + 120, turn1Radius + turn2Radius, turn2Radius, 0, Math.PI / 2, true);
    createCurvedBarriers(turn1Radius * 2 + 120, turn1Radius + turn2Radius, turn2Radius, 0, Math.PI / 2, false);
    
    // Straight 3 (going south)
    const straight3Length = 140;
    const straight3Geo = new THREE.PlaneGeometry(trackWidth, straight3Length);
    const straight3 = new THREE.Mesh(straight3Geo, trackMaterial);
    straight3.rotation.x = -Math.PI / 2;
    straight3.position.set(turn1Radius * 2 + 120 + turn2Radius, 0.01, turn1Radius + turn2Radius + 70);
    straight3.receiveShadow = true;
    scene.add(straight3);
    createStraightBarriers(turn1Radius * 2 + 120 + turn2Radius, turn1Radius + turn2Radius + 70, Math.PI, straight3Length);
    
    // Turn 3 - Hairpin (180 degrees)
    const turn3Radius = 30;
    const turn3Geo = new THREE.RingGeometry(
        turn3Radius - trackWidth / 2,
        turn3Radius + trackWidth / 2,
        32, 1, Math.PI / 2, Math.PI
    );
    const turn3 = new THREE.Mesh(turn3Geo, trackMaterial);
    turn3.rotation.x = -Math.PI / 2;
    turn3.position.set(turn1Radius * 2 + 120 + turn2Radius, 0.01, turn1Radius + turn2Radius + 140);
    turn3.receiveShadow = true;
    scene.add(turn3);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius, turn1Radius + turn2Radius + 140, turn3Radius, Math.PI / 2, Math.PI * 3 / 2, true);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius, turn1Radius + turn2Radius + 140, turn3Radius, Math.PI / 2, Math.PI * 3 / 2, false);
    
    // Straight 4 (going north, back)
    const straight4Length = 140;
    const straight4Geo = new THREE.PlaneGeometry(trackWidth, straight4Length);
    const straight4 = new THREE.Mesh(straight4Geo, trackMaterial);
    straight4.rotation.x = -Math.PI / 2;
    straight4.position.set(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2, 0.01, turn1Radius + turn2Radius + 70);
    straight4.receiveShadow = true;
    scene.add(straight4);
    createStraightBarriers(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2, turn1Radius + turn2Radius + 70, 0, straight4Length);
    
    // Turn 4 - Left chicane first part
    const turn4Radius = 25;
    const turn4Geo = new THREE.RingGeometry(
        turn4Radius - trackWidth / 2,
        turn4Radius + trackWidth / 2,
        32, 1, Math.PI, Math.PI / 2
    );
    const turn4 = new THREE.Mesh(turn4Geo, trackMaterial);
    turn4.rotation.x = -Math.PI / 2;
    turn4.position.set(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius, 0.01, turn1Radius + turn2Radius - turn4Radius);
    turn4.receiveShadow = true;
    scene.add(turn4);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius, turn1Radius + turn2Radius - turn4Radius, turn4Radius, Math.PI, Math.PI * 3 / 2, true);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius, turn1Radius + turn2Radius - turn4Radius, turn4Radius, Math.PI, Math.PI * 3 / 2, false);
    
    // Final turn back to start
    const turn5Radius = 40;
    const turn5Geo = new THREE.RingGeometry(
        turn5Radius - trackWidth / 2,
        turn5Radius + trackWidth / 2,
        32, 1, -Math.PI, Math.PI / 2
    );
    const turn5 = new THREE.Mesh(turn5Geo, trackMaterial);
    turn5.rotation.x = -Math.PI / 2;
    turn5.position.set(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius * 2 - turn5Radius, 0.01, turn1Radius - turn5Radius);
    turn5.receiveShadow = true;
    scene.add(turn5);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius * 2 - turn5Radius, turn1Radius - turn5Radius, turn5Radius, -Math.PI, -Math.PI / 2, true);
    createCurvedBarriers(turn1Radius * 2 + 120 + turn2Radius - turn3Radius * 2 - turn4Radius * 2 - turn5Radius, turn1Radius - turn5Radius, turn5Radius, -Math.PI, -Math.PI / 2, false);
    
    // Final straight to finish
    const straight5Length = 90;
    const straight5Geo = new THREE.PlaneGeometry(trackWidth, straight5Length);
    const straight5 = new THREE.Mesh(straight5Geo, trackMaterial);
    straight5.rotation.x = -Math.PI / 2;
    straight5.rotation.z = -Math.PI / 2;
    straight5.position.set(35, 0.01, turn1Radius - turn5Radius - turn5Radius);
    straight5.receiveShadow = true;
    scene.add(straight5);
    createStraightBarriers(35, turn1Radius - turn5Radius - turn5Radius, -Math.PI / 2, straight5Length);
    
    // Start/Finish line - highly visible
    const finishLineGeometry = new THREE.PlaneGeometry(trackWidth + 4, 4);
    const finishLineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFFFFF
    });
    const finishLine = new THREE.Mesh(finishLineGeometry, finishLineMaterial);
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.position.set(0, 0.03, -98);
    scene.add(finishLine);
    
    // Checkered pattern for finish line
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 4; j++) {
            if ((i + j) % 2 === 1) {
                const checkGeometry = new THREE.PlaneGeometry(3.5, 1);
                const checkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                const check = new THREE.Mesh(checkGeometry, checkMaterial);
                check.rotation.x = -Math.PI / 2;
                check.position.set(-12.25 + i * 3.5, 0.04, -99.5 + j * 1);
                scene.add(check);
            }
        }
    }
    
    // Checkpoints for lap counting
    checkpoints = [
        { x: 0, z: -50 },                                      // Start/finish
        { x: turn1Radius * 2 + 60, z: turn1Radius },          // First straight
        { x: turn1Radius * 2 + 120 + turn2Radius, z: turn1Radius + turn2Radius + 70 }, // Second straight
        { x: turn1Radius * 2 + 120 + turn2Radius, z: turn1Radius + turn2Radius + 140 }, // Hairpin
        { x: 70, z: turn1Radius },                            // Back section
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
    
    carGroup.position.set(0, 0.5, -95);
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
        
        if (distance < 3.5) {
            return true;
        }
    }
    return false;
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
