const config = {
  canvas: null,
  app: null,
  world: null,
  width: 800,
  height: 600,
  mobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  dpr: 1,
  maxDevils: 24
};

const player = { x: 400, y: 300, radius: 20, speed: 200, angle: 0, sprite: null };
const moveStick = { active: false, startX: 0, startY: 0, deltaX: 0, deltaY: 0, touchId: null, maxDistance: 70 };
const aimStick = { active: false, startX: 0, startY: 0, deltaX: 0, deltaY: 0, touchId: null, maxDistance: 70 };
const keys = {};

const state = {
  isPlaying: false,
  health: 100,
  rage: 80,
  ammo: 100,
  kills: 0,
  score: 0,
  survivalTime: 0,
  startTime: 0,
  wave: 1,
  devilsPerWave: 2,
  scaryLevel: 0,
  fireCooldown: 0,
  rapidTimer: 0,
  multishotTimer: 0,
  shieldTimer: 0,
  speedTimer: 0
};

const bullets = [];
const devils = [];
const pickups = [];
const pools = { bullets: [], devils: [] };

let lastTimestamp = 0;
let bgRect = null;
let graveLayer = null;

const $ = (id) => document.getElementById(id);

function rgbToHex(r, g, b) {
  return (r << 16) + (g << 8) + b;
}

function drawSimpleDevil(g, color, radius) {
  g.clear();
  g.beginFill(color);
  g.drawCircle(0, 0, radius);
  g.endFill();

  g.beginFill(0x2a0000);
  g.moveTo(-radius * 0.45, -radius * 0.8);
  g.lineTo(-radius * 0.2, -radius * 1.3);
  g.lineTo(-radius * 0.05, -radius * 0.7);
  g.endFill();

  g.beginFill(0x2a0000);
  g.moveTo(radius * 0.45, -radius * 0.8);
  g.lineTo(radius * 0.2, -radius * 1.3);
  g.lineTo(radius * 0.05, -radius * 0.7);
  g.endFill();

  g.beginFill(0xff2200);
  g.drawCircle(-radius * 0.28, -radius * 0.2, 3);
  g.drawCircle(radius * 0.28, -radius * 0.2, 3);
  g.endFill();
}

function setupPixi() {
  config.canvas = $('gameCanvas');

  const isLandscape = window.innerWidth > window.innerHeight;
  const isMobile = window.innerWidth < 768;

  if (isLandscape) {
    config.width = isMobile ? window.innerWidth - 10 : 1200;
    config.height = isMobile ? window.innerHeight - 100 : 640;
  } else {
    config.width = isMobile ? window.innerWidth - 10 : 900;
    config.height = isMobile ? window.innerHeight - 150 : 640;
  }

  config.dpr = Math.min(window.devicePixelRatio || 1, config.mobile ? 2 : 2.5);

  config.app = new PIXI.Application({
    view: config.canvas,
    width: config.width,
    height: config.height,
    antialias: true,
    backgroundAlpha: 1,
    resolution: config.dpr,
    autoDensity: true
  });

  config.canvas.style.width = `${config.width}px`;
  config.canvas.style.height = `${config.height}px`;

  config.world = new PIXI.Container();
  config.app.stage.addChild(config.world);
  config.app.stage.roundPixels = true;

  bgRect = new PIXI.Graphics();
  config.world.addChild(bgRect);

  graveLayer = new PIXI.Graphics();
  config.world.addChild(graveLayer);

  drawBackground();
  drawHorrorHouses();

  player.x = config.width / 2;
  player.y = config.height / 2;
  player.sprite = createPlayerSprite();
  config.world.addChild(player.sprite);
}

function drawBackground() {
  let top;
  let bottom;

  if (state.scaryLevel === 0) {
    top = rgbToHex(26, 0, 0);
    bottom = rgbToHex(10, 0, 0);
  } else if (state.scaryLevel === 1) {
    top = rgbToHex(0, 0, 10);
    bottom = rgbToHex(0, 0, 5);
  } else if (state.scaryLevel === 2) {
    top = rgbToHex(0, 0, 6);
    bottom = rgbToHex(0, 0, 2);
  } else {
    top = rgbToHex(0, 0, 3);
    bottom = rgbToHex(0, 0, 0);
  }

  bgRect.clear();
  bgRect.beginFill(top);
  bgRect.drawRect(0, 0, config.width, config.height * 0.65);
  bgRect.endFill();
  bgRect.beginFill(bottom);
  bgRect.drawRect(0, config.height * 0.65, config.width, config.height * 0.35);
  bgRect.endFill();
}

function drawHorrorHouses() {
  graveLayer.clear();
  const yBase = config.height - 120;
  const houseCount = Math.max(3, Math.floor(config.width / 260));

  for (let i = 0; i < houseCount; i++) {
    const x = 30 + i * (config.width / houseCount);

    graveLayer.beginFill(0x0a0a0a);
    graveLayer.drawRect(x, yBase, 90, 70);
    graveLayer.endFill();

    graveLayer.beginFill(0x101010);
    graveLayer.moveTo(x - 10, yBase);
    graveLayer.lineTo(x + 45, yBase - 35);
    graveLayer.lineTo(x + 100, yBase);
    graveLayer.lineTo(x - 10, yBase);
    graveLayer.endFill();

    const windowColor = state.scaryLevel >= 1 ? 0xff3300 : 0xffaa44;
    graveLayer.beginFill(windowColor, 0.7);
    graveLayer.drawRect(x + 15, yBase + 15, 18, 22);
    graveLayer.drawRect(x + 58, yBase + 15, 18, 22);
    graveLayer.endFill();
  }

  graveLayer.lineStyle(2, 0x1a1a1a, 1);
  for (let i = 0; i < 6; i++) {
    const tx = 40 + i * (config.width / 6);
    const ty = config.height - 40;
    graveLayer.moveTo(tx, ty);
    graveLayer.lineTo(tx, ty - 45);
    graveLayer.moveTo(tx, ty - 30);
    graveLayer.lineTo(tx - 15, ty - 42);
    graveLayer.moveTo(tx, ty - 30);
    graveLayer.lineTo(tx + 20, ty - 48);
  }

  graveLayer.beginFill(0x151515);
  for (let i = 0; i < 10; i++) {
    const gx = 20 + i * (config.width / 10);
    const gy = config.height - 28;
    graveLayer.drawRect(gx, gy, 12, 18);
  }
  graveLayer.endFill();
}

function createPlayerSprite() {
  const g = new PIXI.Graphics();
  g.beginFill(0x222222);
  g.drawCircle(0, 0, player.radius);
  g.endFill();

  g.lineStyle(3, 0xffd700, 1);
  g.drawCircle(0, 0, player.radius);

  g.beginFill(0x111111);
  g.drawRect(player.radius - 4, -4, 26, 8);
  g.endFill();

  g.beginFill(0x000000);
  g.drawRect(-14, -9, 10, 7);
  g.drawRect(4, -9, 10, 7);
  g.endFill();

  return g;
}

function spawnDevil() {
  if (devils.length >= config.maxDevils) return;

  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = Math.random() * config.width; y = -20; }
  if (side === 1) { x = config.width + 20; y = Math.random() * config.height; }
  if (side === 2) { x = Math.random() * config.width; y = config.height + 20; }
  if (side === 3) { x = -20; y = Math.random() * config.height; }

  const t = Math.random();
  const baseRadius = t < 0.3 ? 14 : (t < 0.75 ? 18 : 24);
  const health = t < 0.3 ? 1 : (t < 0.75 ? 2 : 3);

  let color = 0x8b0000;
  if (state.scaryLevel === 1) color = 0x5b0000;
  if (state.scaryLevel === 2) color = 0x2b0000;
  if (state.scaryLevel >= 3) color = 0x0a0000;

  const devil = pools.devils.pop() || {};
  devil.x = x;
  devil.y = y;
  devil.radius = baseRadius + state.scaryLevel * 2;
  devil.health = health;
  devil.maxHealth = health;
  devil.speed = 50;

  if (!devil.sprite) {
    devil.sprite = new PIXI.Graphics();
    config.world.addChild(devil.sprite);
  }

  drawSimpleDevil(devil.sprite, color, devil.radius);
  devil.sprite.visible = true;
  devils.push(devil);
}

function spawnWave() {
  for (let i = 0; i < state.devilsPerWave; i++) spawnDevil();
}

function getBulletFromPool() {
  const bullet = pools.bullets.pop() || {};
  bullet.radius = 4;
  bullet.life = 1.3;
  bullet.damage = 1;

  if (!bullet.sprite) {
    bullet.sprite = new PIXI.Graphics();
    bullet.sprite.beginFill(0xffa500);
    bullet.sprite.drawCircle(0, 0, 4);
    bullet.sprite.endFill();
    config.world.addChild(bullet.sprite);
  }

  bullet.sprite.visible = true;
  return bullet;
}

function recycleBullet(index) {
  const b = bullets[index];
  b.sprite.visible = false;
  pools.bullets.push(b);
  bullets.splice(index, 1);
}

function shoot(angle) {
  const isMulti = state.multishotTimer > 0;
  const spread = isMulti ? [-0.24, 0, 0.24] : [0];
  const speed = state.rapidTimer > 0 ? 760 : 560;

  for (const s of spread) {
    const b = getBulletFromPool();
    b.x = player.x;
    b.y = player.y;
    b.dx = Math.cos(angle + s) * speed;
    b.dy = Math.sin(angle + s) * speed;
    b.sprite.x = b.x;
    b.sprite.y = b.y;
    bullets.push(b);
  }
}

function spawnPickup(x, y) {
  if (Math.random() > 0.35) return;
  const list = [
    { type: 'multishot', color: 0x00ff00, icon: '🔫', duration: 8 },
    { type: 'rapidfire', color: 0xff00ff, icon: '⚡', duration: 10 },
    { type: 'shield', color: 0x00bfff, icon: '🛡️', duration: 12 },
    { type: 'speed', color: 0xffff00, icon: '⚡', duration: 8 },
    { type: 'bomb', color: 0xff8c00, icon: '💣', duration: 0 }
  ];
  const p = list[(Math.random() * list.length) | 0];
  const g = new PIXI.Graphics();
  g.beginFill(p.color, 0.95);
  g.drawCircle(0, 0, 12);
  g.endFill();
  g.x = x;
  g.y = y;
  config.world.addChild(g);
  pickups.push({ ...p, x, y, radius: 12, sprite: g });
}

function applyPickup(type) {
  if (type === 'multishot') state.multishotTimer = 8;
  if (type === 'rapidfire') state.rapidTimer = 10;
  if (type === 'shield') state.shieldTimer = 12;
  if (type === 'speed') state.speedTimer = 8;
  if (type === 'bomb') {
    for (let i = devils.length - 1; i >= 0; i--) {
      const d = devils[i];
      d.sprite.visible = false;
      pools.devils.push(d);
      devils.splice(i, 1);
      state.kills += 1;
      state.score += 100;
    }
  }
}

function updateTimers(dt) {
  state.rapidTimer = Math.max(0, state.rapidTimer - dt);
  state.multishotTimer = Math.max(0, state.multishotTimer - dt);
  state.shieldTimer = Math.max(0, state.shieldTimer - dt);
  state.speedTimer = Math.max(0, state.speedTimer - dt);
}

function updateScaryLevel() {
  const prev = state.scaryLevel;
  if (state.kills >= 50) state.scaryLevel = 3;
  else if (state.kills >= 30) state.scaryLevel = 2;
  else if (state.kills >= 15) state.scaryLevel = 1;
  else state.scaryLevel = 0;

  if (prev !== state.scaryLevel) {
    drawBackground();
    drawHorrorHouses();
  }
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;
  if (keys.ArrowLeft || keys.a || keys.A) mx -= 1;
  if (keys.ArrowRight || keys.d || keys.D) mx += 1;
  if (keys.ArrowUp || keys.w || keys.W) my -= 1;
  if (keys.ArrowDown || keys.s || keys.S) my += 1;

  mx += moveStick.deltaX;
  my += moveStick.deltaY;
  mx += aimStick.deltaX;
  my += aimStick.deltaY;

  const mag = Math.hypot(mx, my);
  if (mag > 0.06) {
    mx /= mag;
    my /= mag;
    player.angle = Math.atan2(my, mx);
    state.fireCooldown -= dt;
    if (state.fireCooldown <= 0) {
      shoot(player.angle);
      state.fireCooldown = state.rapidTimer > 0 ? 0.08 : 0.14;
    }
  }

  const speedMult = state.speedTimer > 0 ? 1.5 : 1;
  player.x += mx * player.speed * speedMult * dt;
  player.y += my * player.speed * speedMult * dt;
  player.x = Math.max(player.radius, Math.min(config.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(config.height - player.radius, player.y));

  player.sprite.x = Math.round(player.x);
  player.sprite.y = Math.round(player.y);
  player.sprite.rotation = player.angle;
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    b.life -= dt;
    b.sprite.x = Math.round(b.x);
    b.sprite.y = Math.round(b.y);

    if (b.life <= 0 || b.x < -30 || b.x > config.width + 30 || b.y < -30 || b.y > config.height + 30) {
      recycleBullet(i);
      continue;
    }

    for (let j = devils.length - 1; j >= 0; j--) {
      const d = devils[j];
      if (Math.hypot(b.x - d.x, b.y - d.y) < b.radius + d.radius) {
        d.health -= b.damage;
        recycleBullet(i);
        if (d.health <= 0) {
          spawnPickup(d.x, d.y);
          d.sprite.visible = false;
          pools.devils.push(d);
          devils.splice(j, 1);
          state.kills += 1;
          state.score += 100;
        }
        break;
      }
    }
  }
}

function updateDevils(dt) {
  for (let i = devils.length - 1; i >= 0; i--) {
    const d = devils[i];
    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const dist = Math.hypot(dx, dy) || 1;
    d.x += (dx / dist) * d.speed * dt;
    d.y += (dy / dist) * d.speed * dt;
    d.sprite.x = Math.round(d.x);
    d.sprite.y = Math.round(d.y);

    if (dist < d.radius + player.radius - 4) {
      if (state.shieldTimer > 0) d.health = 0;
      else state.health -= 18 * dt;
    }

    if (d.health <= 0) {
      d.sprite.visible = false;
      pools.devils.push(d);
      devils.splice(i, 1);
      state.kills += 1;
      state.score += 50;
    }
  }

  if (devils.length === 0 && state.isPlaying) {
    state.wave += 1;
    state.devilsPerWave = Math.min(2 + state.wave, 12);
    spawnWave();
  }
}

function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.sprite.rotation += 0.04;
    if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius + 4) {
      applyPickup(p.type);
      config.world.removeChild(p.sprite);
      pickups.splice(i, 1);
    }
  }
}

function updateHUD() {
  state.ammo = 100;
  state.rage = Math.min(100, 40 + state.kills * 0.8);
  state.health = Math.max(0, state.health);

  $('sunlightBar').style.width = `${state.ammo}%`;
  $('waterBar').style.width = `${state.rage}%`;
  $('healthBar').style.width = `${state.health}%`;
  $('sunlightValue').textContent = Math.floor(state.ammo);
  $('waterValue').textContent = Math.floor(state.rage);
  $('healthValue').textContent = Math.floor(state.health);
  $('growthLevel').textContent = state.kills;

  state.survivalTime = Math.floor((Date.now() - state.startTime) / 1000);
  $('dayNight').querySelector('.label').textContent = `⏱️ ${state.survivalTime}s`;
  $('daysCount').textContent = state.score;

  const active = [];
  if (state.multishotTimer > 0) active.push({ icon: '🔫', t: state.multishotTimer, color: '#00ff00' });
  if (state.rapidTimer > 0) active.push({ icon: '⚡', t: state.rapidTimer, color: '#ff00ff' });
  if (state.shieldTimer > 0) active.push({ icon: '🛡️', t: state.shieldTimer, color: '#00bfff' });
  if (state.speedTimer > 0) active.push({ icon: '💨', t: state.speedTimer, color: '#ffff00' });

  $('powerupsDisplay').innerHTML = active
    .map((a) => `<div class="powerup-indicator" style="color:${a.color};border-color:${a.color}"><span class="icon">${a.icon}</span><span class="timer">${a.t.toFixed(1)}s</span></div>`)
    .join('');
}

function update(dt) {
  if (!state.isPlaying) return;
  updateTimers(dt);
  updatePlayer(dt);
  updateBullets(dt);
  updateDevils(dt);
  updatePickups();
  updateScaryLevel();
  updateHUD();
  if (state.health <= 0) gameOver();
}

function resetGame() {
  state.isPlaying = true;
  state.health = 100;
  state.rage = 80;
  state.ammo = 100;
  state.kills = 0;
  state.score = 0;
  state.wave = 1;
  state.devilsPerWave = 2;
  state.scaryLevel = 0;
  state.startTime = Date.now();
  state.fireCooldown = 0;
  state.rapidTimer = 0;
  state.multishotTimer = 0;
  state.shieldTimer = 0;
  state.speedTimer = 0;

  player.x = config.width / 2;
  player.y = config.height / 2;
  player.angle = 0;

  for (const b of bullets) b.sprite.visible = false;
  for (const d of devils) d.sprite.visible = false;
  for (const p of pickups) config.world.removeChild(p.sprite);

  pools.bullets.push(...bullets);
  pools.devils.push(...devils);
  bullets.length = 0;
  devils.length = 0;
  pickups.length = 0;

  drawBackground();
  drawHorrorHouses();
  spawnWave();

  $('overlayTitle').textContent = "DEVIL'S NIGHTMARE";
  $('overlayMessage').textContent = 'Survive the devil horde!';
  $('statsBox').style.display = 'none';
  $('gameOverlay').classList.remove('active');
  updateHUD();
}

function gameOver() {
  state.isPlaying = false;
  moveStick.active = false;
  moveStick.deltaX = 0;
  moveStick.deltaY = 0;
  aimStick.active = false;
  aimStick.deltaX = 0;
  aimStick.deltaY = 0;
  $('joystickStick').style.transform = 'translate(-50%, -50%)';
  $('aimJoystickStick').style.transform = 'translate(-50%, -50%)';

  $('overlayTitle').textContent = '💀 YOU HAVE FALLEN 😈';
  $('overlayMessage').textContent = 'The devils overwhelmed you!';
  $('statsBox').style.display = 'block';
  const minutes = Math.floor(state.survivalTime / 60);
  const seconds = state.survivalTime % 60;
  $('finalGrowth').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  $('finalDays').textContent = state.score;
  $('bugsKilled').textContent = state.kills;
  $('gameOverlay').classList.add('active');
}

function handleStickStart(e, stick, oppositeTouchId) {
  if (!state.isPlaying) return;
  if (e.touches) {
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier !== oppositeTouchId) {
        stick.touchId = t.identifier;
        break;
      }
    }
  }
  stick.active = true;
  const rect = e.currentTarget.getBoundingClientRect();
  stick.startX = rect.left + rect.width / 2;
  stick.startY = rect.top + rect.height / 2;
}

function handleStickMove(e, stick, stickEl) {
  if (!stick.active) return;
  let cx;
  let cy;

  if (e.touches) {
    let found = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === stick.touchId) {
        found = e.touches[i];
        break;
      }
    }
    if (!found) return;
    cx = found.clientX;
    cy = found.clientY;
  } else {
    cx = e.clientX;
    cy = e.clientY;
  }

  let dx = cx - stick.startX;
  let dy = cy - stick.startY;
  const dist = Math.hypot(dx, dy);
  if (dist > stick.maxDistance) {
    dx = (dx / dist) * stick.maxDistance;
    dy = (dy / dist) * stick.maxDistance;
  }

  stick.deltaX = (dx / stick.maxDistance) * 1.25;
  stick.deltaY = (dy / stick.maxDistance) * 1.25;
  stickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function handleStickEnd(e, stick, stickEl) {
  if (e && e.changedTouches) {
    let ours = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stick.touchId) {
        ours = true;
        break;
      }
    }
    if (!ours) return;
  }

  stick.active = false;
  stick.deltaX = 0;
  stick.deltaY = 0;
  stick.touchId = null;
  stickEl.style.transform = 'translate(-50%, -50%)';
}

function setupControls() {
  const moveContainer = $('joystickContainer');
  const moveEl = $('joystickStick');
  const aimContainer = $('aimJoystickContainer');
  const aimEl = $('aimJoystickStick');

  moveContainer.addEventListener('touchstart', (e) => handleStickStart(e, moveStick, aimStick.touchId), { passive: true });
  moveContainer.addEventListener('touchmove', (e) => handleStickMove(e, moveStick, moveEl), { passive: true });
  moveContainer.addEventListener('touchend', (e) => handleStickEnd(e, moveStick, moveEl));

  aimContainer.addEventListener('touchstart', (e) => handleStickStart(e, aimStick, moveStick.touchId), { passive: true });
  aimContainer.addEventListener('touchmove', (e) => handleStickMove(e, aimStick, aimEl), { passive: true });
  aimContainer.addEventListener('touchend', (e) => handleStickEnd(e, aimStick, aimEl));

  moveContainer.addEventListener('mousedown', (e) => handleStickStart(e, moveStick, null));
  aimContainer.addEventListener('mousedown', (e) => handleStickStart(e, aimStick, null));
  document.addEventListener('mousemove', (e) => {
    handleStickMove(e, moveStick, moveEl);
    handleStickMove(e, aimStick, aimEl);
  });
  document.addEventListener('mouseup', (e) => {
    handleStickEnd(e, moveStick, moveEl);
    handleStickEnd(e, aimStick, aimEl);
  });

  config.canvas.addEventListener('mousemove', (e) => {
    const rect = config.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    player.angle = Math.atan2(y - player.y, x - player.x);
  });

  config.canvas.addEventListener('mousedown', () => {
    if (!state.isPlaying) return;
    shoot(player.angle);
  });

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') shoot(player.angle);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });
}

function setupUI() {
  $('startBtn').addEventListener('click', resetGame);
}

function handleResize() {
  if (!config.app) return;
  const isLandscape = window.innerWidth > window.innerHeight;
  const isMobile = window.innerWidth < 768;

  if (isLandscape) {
    config.width = isMobile ? window.innerWidth - 10 : 1200;
    config.height = isMobile ? window.innerHeight - 100 : 640;
  } else {
    config.width = isMobile ? window.innerWidth - 10 : 900;
    config.height = isMobile ? window.innerHeight - 150 : 640;
  }

  config.dpr = Math.min(window.devicePixelRatio || 1, config.mobile ? 2 : 2.5);
  config.app.renderer.resolution = config.dpr;
  config.app.renderer.resize(config.width, config.height);
  config.canvas.style.width = `${config.width}px`;
  config.canvas.style.height = `${config.height}px`;

  player.x = Math.max(player.radius, Math.min(config.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(config.height - player.radius, player.y));
  drawBackground();
  drawHorrorHouses();
}

function gameLoop(ts = 0) {
  const dtRaw = (ts - lastTimestamp) / 1000;
  lastTimestamp = ts;
  const dt = Math.min(Math.max(dtRaw || 0.016, 0.001), 0.033);
  update(dt);
  requestAnimationFrame(gameLoop);
}

window.onload = () => {
  setupPixi();
  setupControls();
  setupUI();
  updateHUD();
  window.addEventListener('resize', handleResize);
  requestAnimationFrame(gameLoop);
};