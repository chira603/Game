// Game Configuration
const config = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    colors: {
        plant: '#00FF00',
        vine: '#228B22',
        bug: '#FF0000',
        particle: ['#90EE90', '#32CD32', '#00FF00', '#ADFF2F']
    }
};

// Player Plant
const plant = {
    x: 400,
    y: 300,
    radius: 25,
    speed: 200,
    dx: 0,
    dy: 0
};

// Joystick
const joystick = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    maxDistance: 50
};

// Game State
const gameState = {
    isPlaying: false,
    sunlight: 100,
    water: 80,
    health: 100,
    growthLevel: 1,
    dayTime: 0, // 0-1 = day, 1-2 = night
    daysCount: 0,
    bugsKilled: 0
};

// Arrays
const vines = [];
const bugs = [];
const particles = [];

// Keyboard
const keys = {};

// Initialize
window.onload = () => {
    config.canvas = document.getElementById('gameCanvas');
    config.ctx = config.canvas.getContext('2d');
    
    const isMobile = window.innerWidth < 768;
    config.width = isMobile ? window.innerWidth - 10 : 800;
    config.height = isMobile ? window.innerHeight - 150 : 600;
    
    config.canvas.width = config.width;
    config.canvas.height = config.height;
    
    plant.x = config.width / 2;
    plant.y = config.height / 2;
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    
    // Canvas click to place vines
    config.canvas.addEventListener('click', placeVine);
    config.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = config.canvas.getBoundingClientRect();
        placeVine({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    
    // Joystick events
    setupJoystick();
    
    // Keyboard
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
    
    updateUI();
};

function setupJoystick() {
    const container = document.getElementById('joystickContainer');
    const stick = document.getElementById('joystickStick');
    
    container.addEventListener('touchstart', handleJoystickStart);
    container.addEventListener('touchmove', handleJoystickMove);
    container.addEventListener('touchend', handleJoystickEnd);
    
    container.addEventListener('mousedown', handleJoystickStart);
    document.addEventListener('mousemove', handleJoystickMove);
    document.addEventListener('mouseup', handleJoystickEnd);
}

function handleJoystickStart(e) {
    if (!gameState.isPlaying) return;
    joystick.active = true;
    const rect = e.currentTarget.getBoundingClientRect();
    joystick.startX = rect.left + rect.width / 2;
    joystick.startY = rect.top + rect.height / 2;
}

function handleJoystickMove(e) {
    if (!joystick.active) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let deltaX = clientX - joystick.startX;
    let deltaY = clientY - joystick.startY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance > joystick.maxDistance) {
        deltaX = (deltaX / distance) * joystick.maxDistance;
        deltaY = (deltaY / distance) * joystick.maxDistance;
    }
    
    joystick.deltaX = deltaX / joystick.maxDistance;
    joystick.deltaY = deltaY / joystick.maxDistance;
    
    const stick = document.getElementById('joystickStick');
    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
}

function handleJoystickEnd() {
    joystick.active = false;
    joystick.deltaX = 0;
    joystick.deltaY = 0;
    
    const stick = document.getElementById('joystickStick');
    stick.style.transform = 'translate(-50%, -50%)';
}

function startGame() {
    gameState.isPlaying = true;
    gameState.sunlight = 100;
    gameState.water = 80;
    gameState.health = 100;
    gameState.growthLevel = 1;
    gameState.dayTime = 0;
    gameState.daysCount = 0;
    gameState.bugsKilled = 0;
    
    plant.x = config.width / 2;
    plant.y = config.height / 2;
    
    vines.length = 0;
    bugs.length = 0;
    particles.length = 0;
    
    // Spawn initial bugs
    for (let i = 0; i < 3; i++) {
        spawnBug();
    }
    
    document.getElementById('gameOverlay').classList.remove('active');
    document.getElementById('statsBox').style.display = 'none';
    document.getElementById('overlayTitle').textContent = '🌱 VERDURA GROVE 🌿';
    document.getElementById('overlayMessage').textContent = 'Survive as a living plant! Defend against bugs with vines.';
    
    updateUI();
    gameLoop();
}

function spawnBug() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    if (side === 0) { x = Math.random() * config.width; y = -20; }
    else if (side === 1) { x = config.width + 20; y = Math.random() * config.height; }
    else if (side === 2) { x = Math.random() * config.width; y = config.height + 20; }
    else { x = -20; y = Math.random() * config.height; }
    
    bugs.push({
        x, y,
        radius: 12,
        speed: 80 + Math.random() * 40,
        color: '#FF0000'
    });
}

function placeVine(e) {
    if (!gameState.isPlaying || gameState.water < 10) return;
    
    const rect = config.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Don't place on plant
    const dist = Math.sqrt((x - plant.x) ** 2 + (y - plant.y) ** 2);
    if (dist < 50) return;
    
    gameState.water -= 10;
    gameState.growthLevel++;
    
    vines.push({
        x, y,
        width: 40,
        height: 40,
        color: config.colors.vine
    });
    
    createPlantParticles(x, y);
    updateUI();
}

function update(dt) {
    if (!gameState.isPlaying) return;
    
    // Resource management
    gameState.dayTime = (gameState.dayTime + dt * 0.08) % 2;
    const isDay = gameState.dayTime < 1;
    
    gameState.sunlight = Math.max(0, Math.min(100, 
        gameState.sunlight + (isDay ? 15 : -8) * dt
    ));
    
    gameState.water = Math.max(0, gameState.water - 3 * dt);
    
    if (!isDay) {
        gameState.health = Math.max(0, gameState.health - 2 * dt);
    }
    
    if (gameState.sunlight > 50 && gameState.health < 100) {
        gameState.health = Math.min(100, gameState.health + 8 * dt);
    }
    
    // Update days count
    gameState.daysCount = Math.floor(gameState.dayTime / 2);
    
    // Update plant movement
    let moveX = 0, moveY = 0;
    
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) moveX -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) moveX += 1;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) moveY -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) moveY += 1;
    
    if (joystick.active) {
        moveX += joystick.deltaX;
        moveY += joystick.deltaY;
    }
    
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > 0) {
        moveX /= magnitude;
        moveY /= magnitude;
    }
    
    plant.x += moveX * plant.speed * dt;
    plant.y += moveY * plant.speed * dt;
    
    plant.x = Math.max(plant.radius, Math.min(config.width - plant.radius, plant.x));
    plant.y = Math.max(plant.radius, Math.min(config.height - plant.radius, plant.y));
    
    // Update bugs
    bugs.forEach((bug, index) => {
        const dx = plant.x - bug.x;
        const dy = plant.y - bug.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        bug.x += (dx / dist) * bug.speed * dt;
        bug.y += (dy / dist) * bug.speed * dt;
        
        // Check collision with plant
        if (dist < plant.radius + bug.radius) {
            gameState.health = Math.max(0, gameState.health - 25);
            createExplosion(bug.x, bug.y, '#FF0000');
            bugs.splice(index, 1);
        }
        
        // Check collision with vines
        vines.forEach((vine, vIndex) => {
            const vDist = Math.sqrt(
                (bug.x - vine.x) ** 2 + (bug.y - vine.y) ** 2
            );
            if (vDist < bug.radius + 20) {
                gameState.bugsKilled++;
                createExplosion(bug.x, bug.y, '#FF6B00');
                bugs.splice(index, 1);
            }
        });
    });
    
    // Spawn bugs
    if (bugs.length < gameState.growthLevel + 2) {
        if (Math.random() < 0.02) {
            spawnBug();
        }
    }
    
    // Update particles
    particles.forEach((p, index) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.alpha -= 0.02;
        
        if (p.life <= 0 || p.alpha <= 0) {
            particles.splice(index, 1);
        }
    });
    
    // Game over
    if (gameState.health <= 0) {
        gameOver();
    }
    
    updateUI();
}

function draw() {
    const ctx = config.ctx;
    
    // Background
    const isDay = gameState.dayTime < 1;
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    if (isDay) {
        gradient.addColorStop(0, '#2a5a2a');
        gradient.addColorStop(1, '#1a4a1a');
    } else {
        gradient.addColorStop(0, '#0d1f0d');
        gradient.addColorStop(1, '#051205');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Draw stars at night
    if (!isDay) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(
                (i * 97) % config.width,
                (i * 53) % config.height,
                1, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }
    
    // Draw vines
    vines.forEach(vine => {
        ctx.fillStyle = vine.color;
        ctx.fillRect(
            vine.x - vine.width / 2,
            vine.y - vine.height / 2,
            vine.width,
            vine.height
        );
        ctx.strokeStyle = '#144414';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            vine.x - vine.width / 2,
            vine.y - vine.height / 2,
            vine.width,
            vine.height
        );
    });
    
    // Draw bugs
    bugs.forEach(bug => {
        ctx.fillStyle = bug.color;
        ctx.beginPath();
        ctx.arc(bug.x, bug.y, bug.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#AA0000';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Draw plant
    ctx.fillStyle = config.colors.plant;
    ctx.beginPath();
    ctx.arc(plant.x, plant.y, plant.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00AA00';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw plant "eyes"
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(plant.x - 8, plant.y - 5, 3, 0, Math.PI * 2);
    ctx.arc(plant.x + 8, plant.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function createExplosion(x, y, baseColor) {
    for (let i = 0; i < 15; i++) {
        const angle = (Math.PI * 2 * i) / 15;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3,
            color: baseColor,
            alpha: 1,
            life: 30
        });
    }
}

function createPlantParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            color: config.colors.particle[Math.floor(Math.random() * config.colors.particle.length)],
            alpha: 1,
            life: 25
        });
    }
}

function updateUI() {
    document.getElementById('sunlightValue').textContent = Math.floor(gameState.sunlight);
    document.getElementById('sunlightBar').style.width = gameState.sunlight + '%';
    
    document.getElementById('waterValue').textContent = Math.floor(gameState.water);
    document.getElementById('waterBar').style.width = gameState.water + '%';
    
    document.getElementById('healthValue').textContent = Math.floor(gameState.health);
    document.getElementById('healthBar').style.width = gameState.health + '%';
    
    document.getElementById('growthLevel').textContent = gameState.growthLevel;
    document.getElementById('daysCount').textContent = gameState.daysCount;
    
    const dayNight = document.getElementById('dayNight');
    const isDay = gameState.dayTime < 1;
    dayNight.querySelector('.label').textContent = isDay ? '☀️ DAY' : '🌙 NIGHT';
    dayNight.querySelector('.label').style.color = isDay ? '#FFD700' : '#87CEEB';
}

function gameOver() {
    gameState.isPlaying = false;
    
    document.getElementById('overlayTitle').textContent = '🌱 YOUR GROVE DIED... 🌿';
    document.getElementById('overlayMessage').textContent = 'The bugs overwhelmed your defenses!';
    document.getElementById('statsBox').style.display = 'block';
    document.getElementById('finalGrowth').textContent = gameState.growthLevel;
    document.getElementById('finalDays').textContent = gameState.daysCount;
    document.getElementById('bugsKilled').textContent = gameState.bugsKilled;
    document.getElementById('gameOverlay').classList.add('active');
}

let lastTime = 0;
function gameLoop(timestamp = 0) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}
