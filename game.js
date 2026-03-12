// Game Configuration
const config = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    colors: {
        gangLeader: '#FFD700',
        devil: '#8B0000',
        bullet: '#FFA500',
        particle: ['#FF0000', '#FF4500', '#DC143C', '#8B0000']
    },
    powerupTypes: [
        { type: 'multishot', color: '#00FF00', icon: '🔫', name: 'Multi-Shot', duration: 8000 },
        { type: 'rapidfire', color: '#FF00FF', icon: '⚡', name: 'Rapid Fire', duration: 10000 },
        { type: 'bomb', color: '#FF8C00', icon: '💣', name: 'Bomb', duration: 0 },
        { type: 'shield', color: '#00BFFF', icon: '🛡️', name: 'Shield', duration: 12000 },
        { type: 'speed', color: '#FFFF00', icon: '⚡', name: 'Speed Boost', duration: 8000 }
    ]
};

// Gang Leader (Player)
const gangLeader = {
    x: 400,
    y: 300,
    radius: 30,
    speed: 280,
    dx: 0,
    dy: 0,
    angle: 0 // for direction facing
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
    maxDistance: 70
};

// Game State
const gameState = {
    isPlaying: false,
    ammo: 100,
    rage: 80,
    health: 100,
    kills: 0,
    score: 0,
    survivalTime: 0,
    startTime: 0,
    wave: 1,
    devilsPerWave: 1,
    activePowerups: [],
    hasShield: false,
    isFiring: false,
    fireInterval: null,
    scaryLevel: 0
};

// Arrays
const bullets = [];
const devils = [];
const particles = [];
const powerups = [];

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
    
    gangLeader.x = config.width / 2;
    gangLeader.y = config.height / 2;
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    
    // Setup fire button
    setupFireButton();
    
    // Track mouse for aiming
    config.canvas.addEventListener('mousemove', (e) => {
        const rect = config.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        gangLeader.angle = Math.atan2(mouseY - gangLeader.y, mouseX - gangLeader.x);
    });
    
    // Track touch for aiming (mobile)
    config.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const rect = config.canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const touchY = e.touches[0].clientY - rect.top;
            gangLeader.angle = Math.atan2(touchY - gangLeader.y, touchX - gangLeader.x);
        }
    });
    
    config.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            const rect = config.canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const touchY = e.touches[0].clientY - rect.top;
            gangLeader.angle = Math.atan2(touchY - gangLeader.y, touchX - gangLeader.x);
        }
    });
    
    // Joystick events
    setupJoystick();
    
    // Keyboard
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
    
    updateUI();
    
    // Start game loop for rendering even when not playing
    gameLoop();
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

function setupFireButton() {
    const fireButton = document.getElementById('fireButton');
    
    // Mouse events
    fireButton.addEventListener('mousedown', startFiring);
    fireButton.addEventListener('mouseup', stopFiring);
    fireButton.addEventListener('mouseleave', stopFiring);
    
    // Touch events
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startFiring();
    });
    fireButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopFiring();
    });
    fireButton.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        stopFiring();
    });
}

function startFiring() {
    if (!gameState.isPlaying || gameState.isFiring) return;
    
    gameState.isFiring = true;
    document.getElementById('fireButton').classList.add('firing');
    
    // Shoot immediately
    shootAtTarget();
    
    // Then shoot continuously
    const fireRate = 150; // milliseconds between shots
    gameState.fireInterval = setInterval(() => {
        if (gameState.isPlaying && gameState.isFiring) {
            shootAtTarget();
        }
    }, fireRate);
}

function stopFiring() {
    gameState.isFiring = false;
    document.getElementById('fireButton').classList.remove('firing');
    
    if (gameState.fireInterval) {
        clearInterval(gameState.fireInterval);
        gameState.fireInterval = null;
    }
}

function shootAtTarget() {
    if (!gameState.isPlaying) return;
    
    // Shoot in the direction the player is currently aiming (gangLeader.angle)
    // No auto-aim, player controls the direction
    const targetAngle = gangLeader.angle;
    
    const speed = gameState.activePowerups.some(p => p.type === 'rapidfire') ? 700 : 500;
    
    // Rage multiplier
    const damageMultiplier = 1 + (gameState.rage / 100);
    
    // Multi-shot powerup
    const isMultiShot = gameState.activePowerups.some(p => p.type === 'multishot');
    const angles = isMultiShot ? [targetAngle - 0.3, targetAngle, targetAngle + 0.3] : [targetAngle];
    
    angles.forEach(shootAngle => {
        bullets.push({
            x: gangLeader.x,
            y: gangLeader.y,
            dx: Math.cos(shootAngle) * speed,
            dy: Math.sin(shootAngle) * speed,
            radius: 5,
            damage: Math.floor(1 * damageMultiplier),
            life: 200
        });
        createMuzzleFlash(gangLeader.x, gangLeader.y, shootAngle);
    });
    
    // Keep ammo at 100 for display
    gameState.ammo = 100;
    updateUI();
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
    
    // Amplify sensitivity for better control
    joystick.deltaX = (deltaX / joystick.maxDistance) * 1.3;
    joystick.deltaY = (deltaY / joystick.maxDistance) * 1.3;
    
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
    gameState.ammo = 100;
    gameState.rage = 80;
    gameState.health = 100;
    gameState.kills = 0;
    gameState.score = 0;
    gameState.survivalTime = 0;
    gameState.startTime = Date.now();
    gameState.wave = 1;
    gameState.devilsPerWave = 1;
    gameState.scaryLevel = 0;
    
    gangLeader.x = config.width / 2;
    gangLeader.y = config.height / 2;
    
    bullets.length = 0;
    devils.length = 0;
    particles.length = 0;
    powerups.length = 0;
    gameState.activePowerups = [];
    gameState.hasShield = false;
    
    // Spawn first wave
    spawnWave();
    
    document.getElementById('gameOverlay').classList.remove('active');
    document.getElementById('statsBox').style.display = 'none';
    document.getElementById('overlayTitle').textContent = '💀 DEVIL\'S NIGHTMARE 😈';
    document.getElementById('overlayMessage').textContent = 'You\'re the last gang leader standing. Survive the devil horde!';
    
    updateUI();
}

function spawnWave() {
    for (let i = 0; i < gameState.devilsPerWave; i++) {
        spawnDevil();
    }
}

function spawnDevil() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    if (side === 0) { x = Math.random() * config.width; y = -30; }
    else if (side === 1) { x = config.width + 30; y = Math.random() * config.height; }
    else if (side === 2) { x = Math.random() * config.width; y = config.height + 30; }
    else { x = -30; y = Math.random() * config.height; }
    
    const devilType = Math.random();
    let speed, radius, health;
    
    // All devils have same speed (exactly 50)
    speed = 50;
    
    if (devilType < 0.3) {
        // Fast devil (smaller, less health)
        radius = 18;
        health = 1;
    } else if (devilType < 0.7) {
        // Normal devil
        radius = 22;
        health = 2;
    } else {
        // Tank devil (larger, more health)
        radius = 28;
        health = 3;
    }
    
    // Scarier colors based on scary level
    let devilColor;
    if (gameState.scaryLevel === 0) {
        devilColor = health === 1 ? '#DC143C' : health === 2 ? '#8B0000' : '#4B0000';
    } else if (gameState.scaryLevel === 1) {
        devilColor = health === 1 ? '#8B0000' : health === 2 ? '#4B0000' : '#2B0000';
    } else if (gameState.scaryLevel === 2) {
        devilColor = health === 1 ? '#4B0000' : health === 2 ? '#2B0000' : '#0a0000';
    } else {
        devilColor = health === 1 ? '#000000' : health === 2 ? '#0a0000' : '#000000';
    }
    
    devils.push({
        x, y,
        radius: radius + gameState.scaryLevel * 2, // Devils get bigger
        speed,
        health,
        maxHealth: health,
        color: devilColor,
        angle: 0,
        scaryLevel: gameState.scaryLevel
    });
}

function shootBullet(e) {
    if (!gameState.isPlaying) return;
    
    const rect = config.canvas.getBoundingClientRect();
    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    
    const angle = Math.atan2(targetY - gangLeader.y, targetX - gangLeader.x);
    const speed = gameState.activePowerups.includes('rapidfire') ? 700 : 500;
    
    // Rage multiplier
    const damageMultiplier = 1 + (gameState.rage / 100);
    
    // Multi-shot powerup
    const isMultiShot = gameState.activePowerups.includes('multishot');
    const angles = isMultiShot ? [angle - 0.3, angle, angle + 0.3] : [angle];
    
    angles.forEach(shootAngle => {
        bullets.push({
            x: gangLeader.x,
            y: gangLeader.y,
            dx: Math.cos(shootAngle) * speed,
            dy: Math.sin(shootAngle) * speed,
            radius: 5,
            damage: Math.floor(1 * damageMultiplier),
            life: 200
        });
        createMuzzleFlash(gangLeader.x, gangLeader.y, shootAngle);
    });
    
    // Keep ammo at 100 for display
    gameState.ammo = 100;
    updateUI();
}

function createMuzzleFlash(x, y, angle) {
    for (let i = 0; i < 8; i++) {
        const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
        particles.push({
            x: x + Math.cos(angle) * 35,
            y: y + Math.sin(angle) * 35,
            dx: Math.cos(spreadAngle) * (3 + Math.random() * 3),
            dy: Math.sin(spreadAngle) * (3 + Math.random() * 3),
            size: 3 + Math.random() * 4,
            color: '#FFA500',
            alpha: 1,
            life: 10
        });
    }
}

function spawnPowerup() {
    // Random position on screen (avoid edges)
    const margin = 50;
    const x = margin + Math.random() * (config.width - margin * 2);
    const y = margin + Math.random() * (config.height - margin * 2);
    
    // Random powerup type
    const types = config.powerupTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Spawn animation - start from above and fall down
    powerups.push({
        x: x,
        y: y - 100,
        targetY: y,
        radius: 20,
        type: type.type,
        color: type.color,
        icon: type.icon,
        name: type.name,
        pulse: 0,
        rotation: 0,
        spawnTime: Date.now(),
        trail: []
    });
    
    // Spawn announcement particles
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * 4,
            dy: Math.sin(angle) * 4,
            radius: 4,
            color: type.color,
            life: 40,
            alpha: 1
        });
    }
}

function activatePowerup(type) {
    const powerupConfig = config.powerupTypes.find(p => p.type === type);
    
    if (type === 'bomb') {
        // Screen flash effect
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle, rgba(255,140,0,0.8), transparent);pointer-events:none;z-index:9999;';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
        
        // Kill all devils and award points
        const killedCount = devils.length;
        devils.forEach(devil => {
            // Create massive explosion particles at each devil location
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 8;
                particles.push({
                    x: devil.x,
                    y: devil.y,
                    dx: Math.cos(angle) * speed,
                    dy: Math.sin(angle) * speed,
                    radius: 5 + Math.random() * 8,
                    color: ['#FF8C00', '#FF4500', '#FFD700', '#FF0000'][Math.floor(Math.random() * 4)],
                    life: 50,
                    alpha: 1
                });
            }
        });
        
        // Clear all devils and add to kill count
        gameState.kills += killedCount;
        devils.length = 0;
        
        // Screen shake effect - more intense
        config.canvas.style.transform = 'translate(8px, 8px)';
        setTimeout(() => {
            config.canvas.style.transform = 'translate(-8px, -8px)';
            setTimeout(() => {
                config.canvas.style.transform = 'translate(5px, -5px)';
                setTimeout(() => {
                    config.canvas.style.transform = '';
                }, 30);
            }, 30);
        }, 30);
        
    } else {
        // Screen flash for powerup activation
        const flash = document.createElement('div');
        flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle, ${powerupConfig.color}50, transparent);pointer-events:none;z-index:9999;`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
        
        // Timed powerup
        gameState.activePowerups.push({
            type: type,
            startTime: Date.now(),
            duration: powerupConfig.duration,
            name: powerupConfig.name,
            icon: powerupConfig.icon,
            color: powerupConfig.color
        });
        
        // Celebration particles around player
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40;
            const speed = 3 + Math.random() * 3;
            particles.push({
                x: gangLeader.x,
                y: gangLeader.y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 3,
                color: powerupConfig.color,
                life: 35,
                alpha: 1
            });
        }
    }
}

function update(dt) {
    if (!gameState.isPlaying) {
        // Still update particles even when not playing
        particles.forEach((p, index) => {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
            p.alpha = Math.max(0, p.alpha - 0.05);
            
            if (p.life <= 0 || p.alpha <= 0) {
                particles.splice(index, 1);
            }
        });
        return;
    }
    
    // Update survival time and score
    gameState.survivalTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    gameState.score = gameState.kills * 100 + gameState.survivalTime * 10;
    
    // Resource management
    gameState.ammo = Math.min(100, gameState.ammo + 15 * dt);
    gameState.rage = Math.min(100, gameState.rage + 5 * dt);
    
    // Update gang leader movement
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
    
    // Apply speed boost if active
    let currentSpeed = gangLeader.speed;
    if (gameState.activePowerups.some(p => p.type === 'speed')) {
        currentSpeed *= 1.6; // 60% speed boost
    }
    
    gangLeader.x += moveX * currentSpeed * dt;
    gangLeader.y += moveY * currentSpeed * dt;
    
    gangLeader.x = Math.max(gangLeader.radius, Math.min(config.width - gangLeader.radius, gangLeader.x));
    gangLeader.y = Math.max(gangLeader.radius, Math.min(config.height - gangLeader.radius, gangLeader.y));
    
    // Update bullets
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx * dt;
        bullet.y += bullet.dy * dt;
        bullet.life--;
        
        // Remove if off screen or expired
        if (bullet.x < -50 || bullet.x > config.width + 50 || 
            bullet.y < -50 || bullet.y > config.height + 50 || 
            bullet.life <= 0) {
            bullets.splice(index, 1);
            return;
        }
        
        // Check collision with devils
        devils.forEach((devil, dIndex) => {
            const dist = Math.sqrt(
                (bullet.x - devil.x) ** 2 + (bullet.y - devil.y) ** 2
            );
            if (dist < bullet.radius + devil.radius) {
                devil.health -= bullet.damage;
                createHitEffect(devil.x, devil.y);
                bullets.splice(index, 1);
                
                if (devil.health <= 0) {
                    gameState.kills++;
                    gameState.rage = Math.min(100, gameState.rage + 10);
                    createExplosion(devil.x, devil.y);
                    devils.splice(dIndex, 1);
                }
            }
        });
    });
    
    // Update devils
    devils.forEach((devil, index) => {
        const dx = gangLeader.x - devil.x;
        const dy = gangLeader.y - devil.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        devil.angle = Math.atan2(dy, dx);
        devil.x += (dx / dist) * devil.speed * dt;
        devil.y += (dy / dist) * devil.speed * dt;
        
        // Check collision with gang leader
        if (dist < gangLeader.radius + devil.radius) {
            if (gameState.hasShield) {
                // Shield absorbs hit
                gameState.activePowerups = gameState.activePowerups.filter(p => p.type !== 'shield');
                gameState.hasShield = false;
                
                // Create shield break effect
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 4;
                    particles.push({
                        x: gangLeader.x,
                        y: gangLeader.y,
                        dx: Math.cos(angle) * speed,
                        dy: Math.sin(angle) * speed,
                        radius: 3,
                        color: '#00FFFF',
                        life: 30,
                        alpha: 1
                    });
                }
            } else {
                // Take damage
                gameState.health = Math.max(0, gameState.health - 20);
                gameState.rage = Math.max(0, gameState.rage - 10);
            }
            
            createExplosion(devil.x, devil.y);
            devils.splice(index, 1);
        }
    });
    
    // Spawn new wave when all devils are killed
    if (devils.length === 0 && gameState.isPlaying) {
        gameState.wave++;
        gameState.devilsPerWave = Math.min(gameState.wave, 10); // Max 10 devils per wave
        
        // Update scary level based on wave
        if (gameState.wave >= 15) {
            gameState.scaryLevel = 3; // HELL MODE
        } else if (gameState.wave >= 10) {
            gameState.scaryLevel = 2; // NIGHTMARE MODE
        } else if (gameState.wave >= 5) {
            gameState.scaryLevel = 1; // DARK MODE
        }
        
        spawnWave();
        
        // Spawn powerup on wave clear (60% chance)
        if (Math.random() < 0.6) {
            spawnPowerup();
        }
    }
    
    // Update powerups
    powerups.forEach((powerup, index) => {
        // Pulsing animation
        powerup.pulse = (powerup.pulse + 0.08) % (Math.PI * 2);
        powerup.rotation += 0.05;
        
        // Falling animation for newly spawned powerups
        if (powerup.y < powerup.targetY) {
            powerup.y += 3;
        }
        
        // Create particle trail
        if (Math.random() < 0.3) {
            particles.push({
                x: powerup.x + (Math.random() - 0.5) * 10,
                y: powerup.y + (Math.random() - 0.5) * 10,
                dx: (Math.random() - 0.5) * 1,
                dy: (Math.random() - 0.5) * 1,
                radius: 2 + Math.random() * 3,
                color: powerup.color,
                life: 20,
                alpha: 0.8
            });
        }
        
        // Magnetic attraction to player when close
        const dx = gangLeader.x - powerup.x;
        const dy = gangLeader.y - powerup.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100 && distance > gangLeader.radius + powerup.radius) {
            // Pull powerup towards player
            const pullStrength = 0.15;
            powerup.x += (dx / distance) * pullStrength * 30;
            powerup.y += (dy / distance) * pullStrength * 30;
        }
        
        if (distance < gangLeader.radius + powerup.radius) {
            // Pickup powerup
            activatePowerup(powerup.type);
            powerups.splice(index, 1);
            
            // Create spectacular pickup effect particles
            for (let i = 0; i < 50; i++) {
                const angle = (Math.PI * 2 * i) / 50;
                const speed = 2 + Math.random() * 5;
                particles.push({
                    x: powerup.x,
                    y: powerup.y,
                    dx: Math.cos(angle) * 3,
                    dy: Math.sin(angle) * 3,
                    radius: 3,
                    color: powerup.color,
                    life: 30,
                    alpha: 1
                });
            }
        }
    });
    
    // Update active powerups timers
    gameState.activePowerups = gameState.activePowerups.filter(powerup => {
        const elapsed = Date.now() - powerup.startTime;
        return elapsed < powerup.duration;
    });
    
    // Update hasShield flag
    gameState.hasShield = gameState.activePowerups.some(p => p.type === 'shield');
    
    // Update particles
    particles.forEach((p, index) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        p.alpha = Math.max(0, p.alpha - 0.05);
        
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
    
    // Background - gets progressively darker and scarier
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    
    if (gameState.scaryLevel === 0) {
        // Normal - dark red
        gradient.addColorStop(0, '#1a0000');
        gradient.addColorStop(0.5, '#2d0a0a');
        gradient.addColorStop(1, '#0a0000');
    } else if (gameState.scaryLevel === 1) {
        // Dark mode - deeper red (Wave 5+)
        gradient.addColorStop(0, '#0a0000');
        gradient.addColorStop(0.5, '#1a0000');
        gradient.addColorStop(1, '#050000');
    } else if (gameState.scaryLevel === 2) {
        // Nightmare - almost black with red tint (Wave 10+)
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, '#0a0000');
        gradient.addColorStop(1, '#000000');
    } else {
        // Hell mode - pure darkness with blood red (Wave 15+)
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, '#050000');
        gradient.addColorStop(1, '#000000');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Add scary screen effects based on level
    if (gameState.scaryLevel >= 1) {
        // Red vignette effect - gets stronger
        const vignette = ctx.createRadialGradient(config.width/2, config.height/2, config.width*0.2, config.width/2, config.height/2, config.width*0.7);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, `rgba(139,0,0,${0.15 + gameState.scaryLevel * 0.15})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, config.width, config.height);
    }
    
    if (gameState.scaryLevel >= 2) {
        // Blood drip effects from top
        for (let i = 0; i < 8; i++) {
            const x = (i * 120 + Date.now() * 0.02) % config.width;
            const dripLength = Math.sin(Date.now() * 0.003 + i) * 40 + 60;
            ctx.fillStyle = `rgba(139, 0, 0, ${0.2 + Math.random() * 0.2})`;
            ctx.fillRect(x, 0, 2 + Math.random() * 2, dripLength);
        }
    }
    
    if (gameState.scaryLevel >= 3) {
        // Hell mode: Random lightning/blood flashes
        if (Math.random() < 0.008) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.fillRect(0, 0, config.width, config.height);
        }
        
        // Pulsing red border
        const pulse = Math.sin(Date.now() * 0.005);
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, config.width, config.height);
    }
    
    // Draw blood splatters
    ctx.fillStyle = 'rgba(139, 0, 0, 0.1)';
    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(
            (i * 197) % config.width,
            (i * 97) % config.height,
            10 + (i * 7) % 20,
            0, Math.PI * 2
        );
        ctx.fill();
    }
    
    // Draw devils
    devils.forEach(devil => {
        ctx.save();
        ctx.translate(devil.x, devil.y);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, devil.radius + 5, devil.radius * 0.8, devil.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body with gradient
        const gradient = ctx.createRadialGradient(0, 0, devil.radius * 0.3, 0, 0, devil.radius);
        gradient.addColorStop(0, devil.color);
        gradient.addColorStop(1, '#000');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, devil.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Dark outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Horns with 3D effect
        const hornGradient = ctx.createLinearGradient(-devil.radius, -devil.radius * 1.3, 0, -devil.radius);
        hornGradient.addColorStop(0, '#2a0000');
        hornGradient.addColorStop(1, '#000');
        ctx.fillStyle = hornGradient;
        
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-devil.radius * 0.5, -devil.radius * 0.8);
        ctx.quadraticCurveTo(-devil.radius * 0.8, -devil.radius * 1.5, -devil.radius * 0.6, -devil.radius * 1.4);
        ctx.lineTo(-devil.radius * 0.4, -devil.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Right horn
        ctx.beginPath();
        ctx.moveTo(devil.radius * 0.5, -devil.radius * 0.8);
        ctx.quadraticCurveTo(devil.radius * 0.8, -devil.radius * 1.5, devil.radius * 0.6, -devil.radius * 1.4);
        ctx.lineTo(devil.radius * 0.4, -devil.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Glowing evil eyes with sockets - intensity increases with scary level
        const scaryLevel = devil.scaryLevel || 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-devil.radius * 0.3, -devil.radius * 0.2, 6, 0, Math.PI * 2);
        ctx.arc(devil.radius * 0.3, -devil.radius * 0.2, 6, 0, Math.PI * 2);
        ctx.fill();
        
        const eyeGlow = 8 + scaryLevel * 8;
        const eyePulse = scaryLevel >= 2 ? Math.sin(Date.now() * 0.01) * 2 : 0;
        ctx.fillStyle = scaryLevel >= 3 ? '#FF0000' : '#FF0000';
        ctx.shadowBlur = eyeGlow + eyePulse;
        ctx.shadowColor = '#FF0000';
        ctx.beginPath();
        ctx.arc(-devil.radius * 0.3, -devil.radius * 0.2, 4 + eyePulse, 0, Math.PI * 2);
        ctx.arc(devil.radius * 0.3, -devil.radius * 0.2, 4 + eyePulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Extra evil aura for hell mode
        if (scaryLevel >= 3) {
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, devil.radius + 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        
        // Menacing mouth/fangs
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, devil.radius * 0.2, devil.radius * 0.4, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        // Fangs
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.moveTo(-devil.radius * 0.2, devil.radius * 0.3);
        ctx.lineTo(-devil.radius * 0.15, devil.radius * 0.5);
        ctx.lineTo(-devil.radius * 0.1, devil.radius * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(devil.radius * 0.2, devil.radius * 0.3);
        ctx.lineTo(devil.radius * 0.15, devil.radius * 0.5);
        ctx.lineTo(devil.radius * 0.1, devil.radius * 0.3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Health bar
        if (devil.health < devil.maxHealth) {
            const barWidth = devil.radius * 2;
            const barHeight = 5;
            const barX = devil.x - barWidth / 2;
            const barY = devil.y - devil.radius - 15;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
            
            ctx.fillStyle = '#300';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const healthGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
            healthGradient.addColorStop(0, '#FF0000');
            healthGradient.addColorStop(1, '#FF6600');
            ctx.fillStyle = healthGradient;
            ctx.fillRect(barX, barY, barWidth * (devil.health / devil.maxHealth), barHeight);
        }
    });
    
    // Draw bullets
    bullets.forEach(bullet => {
        ctx.fillStyle = '#FFA500';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFA500';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
    
    // Draw powerups
    powerups.forEach(powerup => {
        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        
        // Pulsing scale
        const scale = 1 + Math.sin(powerup.pulse) * 0.2;
        ctx.scale(scale, scale);
        ctx.rotate(powerup.rotation);
        
        // Outer glow rings (multiple layers)
        for (let i = 3; i > 0; i--) {
            ctx.shadowBlur = 30 * i;
            ctx.shadowColor = powerup.color;
            ctx.strokeStyle = powerup.color;
            ctx.globalAlpha = 0.3 / i;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, powerup.radius + i * 8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 25;
        
        // Background circle with animated gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.radius);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, powerup.color);
        gradient.addColorStop(1, powerup.color + '30');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotating border
        ctx.strokeStyle = powerup.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner sparkles
        ctx.shadowBlur = 0;
        for (let i = 0; i < 6; i++) {
            const sparkleAngle = (powerup.pulse + i * Math.PI / 3);
            const sparkleX = Math.cos(sparkleAngle) * (powerup.radius * 0.6);
            const sparkleY = Math.sin(sparkleAngle) * (powerup.radius * 0.6);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
        }
        
        // Icon emoji (larger and with shadow)
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.icon, 0, 0);
        
        ctx.restore();
    });
    
    // Draw gang leader
    ctx.save();
    ctx.translate(gangLeader.x, gangLeader.y);
    
    // Draw powerup auras around gang leader
    gameState.activePowerups.forEach((powerup, idx) => {
        const auraRadius = gangLeader.radius + 15 + idx * 10;
        const pulse = Math.sin(Date.now() * 0.003 + idx) * 5;
        
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = powerup.color;
        ctx.strokeStyle = powerup.color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.005 + idx) * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius + pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Orbiting powerup icon
        const orbitAngle = (Date.now() * 0.002 + idx * (Math.PI * 2 / gameState.activePowerups.length));
        const orbitX = Math.cos(orbitAngle) * auraRadius;
        const orbitY = Math.sin(orbitAngle) * auraRadius;
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.icon, orbitX, orbitY);
        ctx.restore();
    });
    
    ctx.rotate(gangLeader.angle);
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, gangLeader.radius + 5, gangLeader.radius * 0.8, gangLeader.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (muscular build)
    const bodyGradient = ctx.createRadialGradient(0, 0, gangLeader.radius * 0.3, 0, 0, gangLeader.radius);
    bodyGradient.addColorStop(0, '#2a2a2a');
    bodyGradient.addColorStop(1, '#000');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, gangLeader.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Tattoo on arm (skull)
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-gangLeader.radius * 0.7, gangLeader.radius * 0.3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💀', -gangLeader.radius * 0.7, gangLeader.radius * 0.35);
    
    // Thick gold chain
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 8, 10, 0, Math.PI * 2);
    ctx.stroke();
    
    // Chain links
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-8, 5, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8, 5, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Cool sunglasses with reflection
    ctx.fillStyle = '#000';
    ctx.fillRect(-15, -10, 12, 8);
    ctx.fillRect(3, -10, 12, 8);
    
    // Sunglasses bridge
    ctx.fillRect(-3, -9, 6, 2);
    
    // Lens reflection
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.fillRect(-13, -9, 4, 3);
    ctx.fillRect(5, -9, 4, 3);
    
    // Bandana/cap
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.arc(0, -gangLeader.radius * 0.8, gangLeader.radius * 0.6, Math.PI, 0);
    ctx.fill();
    
    // Professional tactical gun
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Gun body
    ctx.fillRect(gangLeader.radius - 5, -4, 30, 8);
    ctx.strokeRect(gangLeader.radius - 5, -4, 30, 8);
    
    // Gun barrel
    ctx.fillStyle = '#333';
    ctx.fillRect(gangLeader.radius + 25, -3, 15, 6);
    ctx.strokeRect(gangLeader.radius + 25, -3, 15, 6);
    
    // Gun barrel tip
    ctx.fillStyle = '#555';
    ctx.fillRect(gangLeader.radius + 40, -2, 3, 4);
    
    // Gun grip
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(gangLeader.radius - 3, 4, 8, 12);
    ctx.strokeRect(gangLeader.radius - 3, 4, 8, 12);
    
    // Gun details (scope/sights)
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(gangLeader.radius + 10, -6, 3, 2);
    ctx.fillRect(gangLeader.radius + 20, -6, 3, 2);
    
    // Trigger
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gangLeader.radius + 5, 2, 3, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
    
    // Draw shield if active
    if (gameState.hasShield) {
        ctx.save();
        ctx.translate(gangLeader.x, gangLeader.y);
        
        // Pulsing shield
        const shieldRadius = gangLeader.radius + 15 + Math.sin(Date.now() * 0.005) * 3;
        
        // Shield glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00FFFF';
        
        // Shield circle
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner shield ring
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius - 5, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    
    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 5,
            color: config.colors.particle[Math.floor(Math.random() * config.colors.particle.length)],
            alpha: 1,
            life: 30
        });
    }
}

function createHitEffect(x, y) {
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particles.push({
            x, y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            color: '#FF0000',
            alpha: 1,
            life: 15
        });
    }
}

function updateUI() {
    document.getElementById('sunlightValue').textContent = Math.floor(gameState.ammo);
    document.getElementById('sunlightBar').style.width = gameState.ammo + '%';
    
    document.getElementById('waterValue').textContent = Math.floor(gameState.rage);
    document.getElementById('waterBar').style.width = gameState.rage + '%';
    
    document.getElementById('healthValue').textContent = Math.floor(gameState.health);
    document.getElementById('healthBar').style.width = gameState.health + '%';
    
    document.getElementById('growthLevel').textContent = gameState.kills;
    document.getElementById('daysCount').textContent = gameState.score;
    
    const timeDisplay = document.getElementById('dayNight');
    const minutes = Math.floor(gameState.survivalTime / 60);
    const seconds = gameState.survivalTime % 60;
    timeDisplay.querySelector('.label').textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update powerups display
    const powerupsDisplay = document.getElementById('powerupsDisplay');
    powerupsDisplay.innerHTML = '';
    
    gameState.activePowerups.forEach(powerup => {
        const elapsed = Date.now() - powerup.startTime;
        const remaining = Math.ceil((powerup.duration - elapsed) / 1000);
        
        if (remaining > 0) {
            const powerupConfig = config.powerupTypes.find(p => p.type === powerup.type);
            const indicator = document.createElement('div');
            indicator.className = 'powerup-indicator';
            indicator.style.borderColor = powerupConfig.color;
            indicator.innerHTML = `
                <span class="icon">${powerup.icon}</span>
                <span class="timer">${remaining}s</span>
            `;
            powerupsDisplay.appendChild(indicator);
        }
    });
}

function gameOver() {
    gameState.isPlaying = false;
    stopFiring(); // Stop continuous firing
    
    document.getElementById('overlayTitle').textContent = '💀 YOU HAVE FALLEN 😈';
    document.getElementById('overlayMessage').textContent = 'The devils overwhelmed you!';
    document.getElementById('statsBox').style.display = 'block';
    
    const minutes = Math.floor(gameState.survivalTime / 60);
    const seconds = gameState.survivalTime % 60;
    document.getElementById('finalGrowth').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('finalDays').textContent = gameState.score;
    document.getElementById('bugsKilled').textContent = gameState.kills;
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
