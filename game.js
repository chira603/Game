// Game Configuration
const config = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600
};

// Game State
let gameState = {
    score: 0,
    arrows: 10,
    arrowsShot: 0,
    targetsHit: 0,
    combo: 1,
    highScore: 0,
    isPlaying: false,
    isPaused: false,
    isCharging: false,
    chargePower: 0,
    maxPower: 100
};

// Bow and Arrow
let bow = {
    x: 0,
    y: 0,
    angle: 0,
    width: 80,
    height: 120
};

let arrows = [];
let activeArrow = null;

// Targets (bouncing balls)
let targets = [];

// Particles
let particles = [];

// Mouse/Touch tracking
let mouse = {
    x: 0,
    y: 0,
    isDown: false
};

// Colors
const colors = {
    bow: '#8B4513',
    arrow: '#FFD700',
    string: '#D2691E',
    targets: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'],
    particles: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFA07A']
};

// Initialize
window.onload = () => {
    config.canvas = document.getElementById('gameCanvas');
    config.ctx = config.canvas.getContext('2d');
    
    // Set canvas size
    const isMobile = window.innerWidth < 768;
    config.width = isMobile ? Math.min(window.innerWidth - 20, 400) : 800;
    config.height = isMobile ? Math.min(window.innerHeight - 150, 500) : 600;
    
    config.canvas.width = config.width;
    config.canvas.height = config.height;
    
    // Set bow position (bottom center)
    bow.x = config.width / 2;
    bow.y = config.height - 50;
    
    // Load high score
    gameState.highScore = parseInt(localStorage.getItem('arrowStrikeHighScore')) || 0;
    updateUI();
    
    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    
    // Mouse events
    config.canvas.addEventListener('mousemove', handleMouseMove);
    config.canvas.addEventListener('mousedown', handleMouseDown);
    config.canvas.addEventListener('mouseup', handleMouseUp);
    
    // Touch events
    config.canvas.addEventListener('touchstart', handleTouchStart, false);
    config.canvas.addEventListener('touchmove', handleTouchMove, false);
    config.canvas.addEventListener('touchend', handleTouchEnd, false);
    
    // Show start overlay
    showOverlay('🏹 ARROW STRIKE 🎯', 'Master the art of archery!');
    
    // Start animation loop
    requestAnimationFrame(gameLoop);
};

function startGame() {
    hideOverlay();
    resetGame();
    gameState.isPlaying = true;
    spawnTargets();
}

function resetGame() {
    gameState.score = 0;
    gameState.arrows = 10;
    gameState.arrowsShot = 0;
    gameState.targetsHit = 0;
    gameState.combo = 1;
    gameState.isCharging = false;
    gameState.chargePower = 0;
    
    arrows = [];
    targets = [];
    particles = [];
    activeArrow = null;
}

function spawnTargets() {
    // Initial spawn
    for (let i = 0; i < 5; i++) {
        setTimeout(() => spawnTarget(), i * 800);
    }
}

function spawnTarget() {
    if (!gameState.isPlaying) return;
    
    const size = 30 + Math.random() * 30;
    const x = size + Math.random() * (config.width - size * 2);
    const y = size + Math.random() * (config.height * 0.5);
    
    targets.push({
        x: x,
        y: y,
        radius: size / 2,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        color: colors.targets[Math.floor(Math.random() * colors.targets.length)],
        points: Math.floor(100 / (size / 30)),
        hit: false
    });
    
    // Spawn new target periodically
    if (gameState.isPlaying && targets.length < 8) {
        setTimeout(() => spawnTarget(), 2000 + Math.random() * 2000);
    }
}

function gameLoop(timestamp) {
    if (gameState.isPlaying && !gameState.isPaused) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update bow angle based on mouse position
    const dx = mouse.x - bow.x;
    const dy = mouse.y - bow.y;
    bow.angle = Math.atan2(dy, dx);
    
    // Update charge power
    if (gameState.isCharging) {
        gameState.chargePower = Math.min(gameState.chargePower + 2, gameState.maxPower);
        document.getElementById('powerFill').style.width = gameState.chargePower + '%';
    }
    
    // Update targets
    targets.forEach((target, index) => {
        if (target.hit) return;
        
        target.x += target.dx;
        target.y += target.dy;
        
        // Bounce off walls
        if (target.x - target.radius < 0 || target.x + target.radius > config.width) {
            target.dx *= -1;
            target.x = Math.max(target.radius, Math.min(config.width - target.radius, target.x));
        }
        
        if (target.y - target.radius < 0 || target.y + target.radius > config.height - 100) {
            target.dy *= -1;
            target.y = Math.max(target.radius, Math.min(config.height - 100 - target.radius, target.y));
        }
        
        // Apply gravity
        target.dy += 0.2;
    });
    
    // Update arrows
    arrows.forEach((arrow, index) => {
        arrow.x += arrow.dx;
        arrow.y += arrow.dy;
        arrow.dy += 0.3; // Gravity
        arrow.angle = Math.atan2(arrow.dy, arrow.dx);
        arrow.life--;
        
        // Check collision with targets
        targets.forEach(target => {
            if (target.hit) return;
            
            const dist = Math.sqrt(
                Math.pow(arrow.x - target.x, 2) + 
                Math.pow(arrow.y - target.y, 2)
            );
            
            if (dist < target.radius) {
                target.hit = true;
                gameState.targetsHit++;
                const points = target.points * gameState.combo;
                gameState.score += points;
                gameState.combo = Math.min(gameState.combo + 1, 10);
                
                createExplosion(target.x, target.y, target.color);
                
                // Show score popup
                createScorePopup(target.x, target.y, '+' + points);
                
                // Remove target and spawn new one
                setTimeout(() => {
                    targets.splice(targets.indexOf(target), 1);
                    if (gameState.isPlaying) {
                        spawnTarget();
                    }
                }, 100);
                
                updateUI();
            }
        });
        
        // Remove arrow if off screen or life expired
        if (arrow.x < -50 || arrow.x > config.width + 50 || 
            arrow.y < -50 || arrow.y > config.height + 50 || 
            arrow.life <= 0) {
            arrows.splice(index, 1);
            
            // Reset combo if arrow missed
            if (arrow.life > 0) {
                gameState.combo = 1;
                updateUI();
            }
        }
    });
    
    // Update particles
    particles.forEach((particle, index) => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dy += 0.1;
        particle.life--;
        particle.alpha = particle.life / particle.maxLife;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    
    // Remove hit targets
    targets = targets.filter(t => !t.hit);
    
    // Check game over
    if (gameState.arrows <= 0 && arrows.length === 0) {
        gameOver();
    }
}

function draw() {
    const ctx = config.ctx;
    
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#0a0515');
    gradient.addColorStop(1, '#1a0f2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Draw stars background
    for (let i = 0; i < 50; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
        ctx.fillRect(
            (i * 97) % config.width,
            (i * 53) % config.height,
            2, 2
        );
    }
    
    // Draw targets
    targets.forEach(target => {
        // Target shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(target.x + 5, target.y + 5, target.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Target
        ctx.fillStyle = target.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = target.color;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Target rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Target center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(target.x, target.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Points label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target.points, target.x, target.y);
    });
    
    // Draw arrows in flight
    arrows.forEach(arrow => {
        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(arrow.angle);
        
        // Arrow shaft
        ctx.fillStyle = colors.bow;
        ctx.fillRect(-20, -2, 40, 4);
        
        // Arrow head
        ctx.fillStyle = colors.arrow;
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors.arrow;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(10, -6);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Arrow feathers
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-25, -5);
        ctx.lineTo(-20, -2);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#4ECDC4';
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-25, 5);
        ctx.lineTo(-20, 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });
    
    // Draw bow
    ctx.save();
    ctx.translate(bow.x, bow.y);
    ctx.rotate(bow.angle);
    
    // Bow body
    ctx.strokeStyle = colors.bow;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.bow;
    ctx.beginPath();
    ctx.arc(0, 0, 40, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Bow string
    const stringTension = gameState.isCharging ? gameState.chargePower / 5 : 0;
    ctx.strokeStyle = colors.string;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, -25);
    ctx.lineTo(-stringTension, 0);
    ctx.lineTo(-30, 25);
    ctx.stroke();
    
    // Draw arrow being charged
    if (gameState.isCharging) {
        ctx.save();
        ctx.translate(-stringTension, 0);
        
        // Arrow shaft
        ctx.fillStyle = colors.bow;
        ctx.fillRect(-30, -2, 30, 4);
        
        // Arrow head
        ctx.fillStyle = colors.arrow;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    ctx.restore();
    
    // Draw particles
    particles.forEach(particle => {
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (particle.text) {
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'center';
            ctx.fillText(particle.text, particle.x, particle.y);
        }
    });
    ctx.globalAlpha = 1;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            size: Math.random() * 4 + 2,
            color: color,
            life: 60,
            maxLife: 60,
            alpha: 1
        });
    }
}

function createScorePopup(x, y, text) {
    particles.push({
        x: x,
        y: y,
        dx: 0,
        dy: -2,
        size: 0,
        color: '#FFD700',
        life: 60,
        maxLife: 60,
        alpha: 1,
        text: text
    });
}

function shootArrow() {
    if (gameState.arrows <= 0 || !gameState.isPlaying) return;
    
    const power = gameState.chargePower / 3.5;
    const arrow = {
        x: bow.x,
        y: bow.y,
        dx: Math.cos(bow.angle) * power,
        dy: Math.sin(bow.angle) * power,
        angle: bow.angle,
        life: 300
    };
    
    arrows.push(arrow);
    gameState.arrows--;
    gameState.arrowsShot++;
    gameState.chargePower = 0;
    gameState.isCharging = false;
    
    document.getElementById('powerMeter').classList.remove('active');
    document.getElementById('powerFill').style.width = '0%';
    
    updateUI();
}

function handleMouseMove(e) {
    const rect = config.canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

function handleMouseDown(e) {
    if (!gameState.isPlaying || gameState.arrows <= 0) return;
    
    e.preventDefault();
    gameState.isCharging = true;
    gameState.chargePower = 0;
    document.getElementById('powerMeter').classList.add('active');
}

function handleMouseUp(e) {
    if (!gameState.isPlaying || !gameState.isCharging) return;
    
    e.preventDefault();
    shootArrow();
}

function handleTouchStart(e) {
    if (!gameState.isPlaying || gameState.arrows <= 0) return;
    
    e.preventDefault();
    const rect = config.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    
    gameState.isCharging = true;
    gameState.chargePower = 0;
    document.getElementById('powerMeter').classList.add('active');
}

function handleTouchMove(e) {
    if (!gameState.isPlaying) return;
    
    e.preventDefault();
    const rect = config.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
}

function handleTouchEnd(e) {
    if (!gameState.isPlaying || !gameState.isCharging) return;
    
    e.preventDefault();
    shootArrow();
}

function gameOver() {
    gameState.isPlaying = false;
    
    // Update high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('arrowStrikeHighScore', gameState.highScore);
    }
    
    // Calculate accuracy
    const accuracy = gameState.arrowsShot > 0 ? 
        Math.floor((gameState.targetsHit / gameState.arrowsShot) * 100) : 0;
    
    // Show game over screen
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('targetsHit').textContent = gameState.targetsHit;
    document.getElementById('accuracy').textContent = accuracy + '%';
    document.getElementById('finalHighScore').textContent = gameState.highScore;
    document.getElementById('statsBox').style.display = 'block';
    
    const title = gameState.score > gameState.highScore ? 
        '🏆 NEW HIGH SCORE! 🏆' : '🎯 GAME OVER 🎯';
    const message = gameState.score > gameState.highScore ? 
        'Perfect shot! New record!' : 
        'Keep practicing your aim!';
    
    showOverlay(title, message);
}

function showOverlay(title, message) {
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayMessage').textContent = message;
    document.getElementById('gameOverlay').classList.add('active');
}

function hideOverlay() {
    document.getElementById('gameOverlay').classList.remove('active');
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('arrows').textContent = gameState.arrows;
    document.getElementById('combo').textContent = 'x' + gameState.combo;
    document.getElementById('highScore').textContent = gameState.highScore;
}
