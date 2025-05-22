// --- CONFIG ---
const GROUND_Y = -2;
const PLAYER_X = 0; // Centered
const PLAYER_SIZE = { x: 2.5, y: 2.7 }; // Bigger
const GRAVITY = 0.045;
const JUMP_VELOCITY = 0.7;

// --- UI ---
const scoreDiv = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-message');
const restartBtn = document.getElementById('restart-btn');

// --- THREE JS ORTHOGRAPHIC ---
let aspect = window.innerWidth / window.innerHeight;
const viewSize = 12;
const camera = new THREE.OrthographicCamera(
  -aspect * viewSize / 2, aspect * viewSize / 2,
  viewSize / 2, -viewSize / 2, 1, 1000
);
camera.position.z = 10;

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x222244);
document.body.appendChild(renderer.domElement);

// --- PLAYER ---
let dino, dinoTexture;
const loader = new THREE.TextureLoader();
loader.load('dino.png', function(texture) {
  dinoTexture = texture;
  const material = new THREE.SpriteMaterial({ map: texture });
  dino = new THREE.Sprite(material);
  dino.scale.set(PLAYER_SIZE.x, PLAYER_SIZE.y, 1);
  dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  scene.add(dino);
});

// --- GROUND ---
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 1),
  new THREE.MeshBasicMaterial({ color: 0x444444 })
);
ground.position.set(0, GROUND_Y - 0.55, 0);
scene.add(ground);

// --- BABY OIL SPRITE ---
let babyOilTexture, babyOilSprites = [];
let babyOilActive = false;
let babyOilTimeout = null;
loader.load('babyoil.png', function(texture) {
  babyOilTexture = texture;
});

// --- PARTICLE EFFECT ---
let particles = [];
function spawnParticlesAt(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({ color: 0xffffff, opacity: 1, transparent: true });
    const s = new THREE.Sprite(mat);
    s.scale.set(0.4, 0.4, 1);
    s.position.set(x, y, z);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.12 + Math.random() * 0.16;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    particles.push({sprite: s, vx, vy, alpha: 1});
    scene.add(s);
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.sprite.position.x += p.vx * dt;
    p.sprite.position.y += p.vy * dt;
    p.alpha -= 0.04 * dt;
    p.sprite.material.opacity = Math.max(0, p.alpha);
    if (p.alpha <= 0) {
      scene.remove(p.sprite);
      particles.splice(i, 1);
    }
  }
}
function clearParticles() {
  for (const p of particles) scene.remove(p.sprite);
  particles = [];
}

// --- BOUNCING DINOS WITH GRAVITY ---
let sidewaysDino = null, bouncyDino = null;
let bouncingDinosActive = false;
let bouncyDinoVelocityY = 0;
let bouncyDinoOnSideways = false;
const BOUNCE_VELOCITY = 0.7;

// --- EFFECT TIMERS ---
let effectActive = false;
let effectTimeout = null;

// --- GAME STATE ---
let velocityY = 0;
let onGround = true;
let score = 0;
let gameActive = false;
let animationId = null;
let lastTime = null;

// --- GAME LOGIC ---
function jump() {
  if (!gameActive || !onGround) return;
  velocityY = JUMP_VELOCITY;
  onGround = false;
  score++;
  scoreDiv.textContent = score;
  if (score % 50 === 0 && score > 0) {
    triggerSpecialEffect();
    showBouncingDinos();
    if (babyOilTimeout) clearTimeout(babyOilTimeout);
    babyOilTimeout = setTimeout(() => {
      hideBouncingDinos();
      resetEffectVisuals();
    }, 15000);
  }
}
function resetGame() {
  score = 0;
  scoreDiv.textContent = score;
  scoreDiv.style.display = 'block';
  if (dino) dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  velocityY = 0;
  onGround = true;
  hideBouncingDinos();
  resetEffectVisuals();
  if (babyOilTimeout) {
    clearTimeout(babyOilTimeout);
    babyOilTimeout = null;
  }
}
function startGame() {
  overlay.style.display = 'none';
  restartBtn.style.display = 'none';
  resetGame();
  gameActive = true;
  lastTime = performance.now();
  animate();
}
function gameOver() {
  gameActive = false;
  cancelAnimationFrame(animationId);
  overlay.style.display = 'flex';
  overlayMsg.innerHTML = `<div>Game Over!</div><div style="font-size:0.7em;margin-top:18px;">Score: ${score}</div>`;
  restartBtn.style.display = 'block';
}
function tapAnywhere(e) {
  e.preventDefault();
  if (!gameActive && overlay.style.display !== 'none') startGame();
  else if (gameActive && !effectActive) jump();
}
window.addEventListener('mousedown', tapAnywhere);
window.addEventListener('touchstart', tapAnywhere, { passive: false });
restartBtn.addEventListener('click', startGame);

// --- BABY OIL ANIMATION ---
function triggerSpecialEffect() {
  babyOilActive = true;
  createBabyOilSprites();
}
function createBabyOilSprites() {
  removeBabyOilSprites();
  const count = 5;
  for (let i = 0; i < count; i++) {
    let sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: babyOilTexture, transparent: true }));
    sprite.scale.set(2.5, 2.5, 1);
    // Start at random positions around the dino
    sprite.position.set(
      (Math.random() - 0.5) * 10,
      (Math.random() * 8) - 2,
      0.1 + i * 0.05 // slight z offset
    );
    sprite.userData = {
      angle: Math.random() * Math.PI * 2,
      speed: 0.03 + Math.random() * 0.04,
      radius: 6 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2
    };
    scene.add(sprite);
    babyOilSprites.push(sprite);
  }
}
function updateBabyOilSprites(time) {
  if (!babyOilActive) return;
  for (let i = 0; i < babyOilSprites.length; i++) {
    let s = babyOilSprites[i];
    let ud = s.userData;
    ud.angle += ud.speed;
    // Fly around the dino center in spirals
    s.position.x = Math.cos(ud.angle + ud.phase) * ud.radius;
    s.position.y = Math.sin(ud.angle + ud.phase) * ud.radius * 0.7 + 0.5;
    s.position.z = 0.3 + i * 0.05;
    // Gradually spiral in
    if (ud.radius > 1.2) ud.radius -= 0.012; 
  }
}
function removeBabyOilSprites() {
  while (babyOilSprites.length > 0) {
    let s = babyOilSprites.pop();
    scene.remove(s);
  }
}

// --- PARTICLES BURSTING FROM DINOS ---
function particleBurstFromDinos() {
  if (dino && Math.random() < 0.37) {
    spawnParticlesAt(dino.position.x, dino.position.y + 1.2, 0.03);
  }
  if (sidewaysDino && Math.random() < 0.37) {
    spawnParticlesAt(sidewaysDino.position.x, sidewaysDino.position.y + 1.0, 0.03);
  }
  if (bouncyDino && Math.random() < 0.37) {
    spawnParticlesAt(bouncyDino.position.x, bouncyDino.position.y + 0.3, 0.03);
  }
}

// --- BOUNCING DINOS LOGIC WITH GRAVITY ---
function showBouncingDinos() {
  if (!dinoTexture) return;
  if (!sidewaysDino) {
    sidewaysDino = new THREE.Sprite(new THREE.SpriteMaterial({ map: dinoTexture, transparent: true }));
    sidewaysDino.scale.set(PLAYER_SIZE.y, PLAYER_SIZE.x, 1);
    sidewaysDino.position.set(PLAYER_X + 5.5, GROUND_Y + PLAYER_SIZE.y/2, 0);
    sidewaysDino.material.rotation = Math.PI / 2;
    scene.add(sidewaysDino);
  }
  if (!bouncyDino) {
    bouncyDino = new THREE.Sprite(new THREE.SpriteMaterial({ map: dinoTexture, transparent: true }));
    bouncyDino.scale.set(PLAYER_SIZE.x * 0.8, PLAYER_SIZE.y * 0.8, 1);
    // Place above sideways dino
    bouncyDino.position.set(
      PLAYER_X + 5.5,
      sidewaysDino.position.y + sidewaysDino.scale.y/2 + (PLAYER_SIZE.y * 0.8)/2 + 1,
      0.02
    );
    scene.add(bouncyDino);
    bouncyDinoVelocityY = 0;
    bouncyDinoOnSideways = false;
  }
  bouncingDinosActive = true;
}
function hideBouncingDinos() {
  if (sidewaysDino) {
    scene.remove(sidewaysDino);
    sidewaysDino = null;
  }
  if (bouncyDino) {
    scene.remove(bouncyDino);
    bouncyDino = null;
  }
  bouncingDinosActive = false;
}
function updateBouncingDinos(dt) {
  if (!(sidewaysDino && bouncyDino && bouncingDinosActive)) return;
  // Gravity for bouncy dino (bounce on sideways dino)
  bouncyDinoVelocityY -= GRAVITY * dt;
  bouncyDino.position.y += bouncyDinoVelocityY * dt;

  // The top of the sideways dino
  const sidewaysTopY = sidewaysDino.position.y + sidewaysDino.scale.y / 2;
  const bouncyBottomY = bouncyDino.position.y - bouncyDino.scale.y / 2;

  if (bouncyBottomY <= sidewaysTopY + 0.05) {
    // Bounce!
    bouncyDino.position.y = sidewaysTopY + bouncyDino.scale.y / 2 + 0.05;
    bouncyDinoVelocityY = BOUNCE_VELOCITY;
  }
}

// --- RESET EFFECT VISUALS ---
function resetEffectVisuals() {
  renderer.setClearColor(0x222244);
  removeParticles();
  removeBabyOilSprites();
  babyOilActive = false;
  particlesActive = false;
  particlesMerged = false;
  effectActive = false;
  effectTimeout = null;
}

// --- ANIMATE ---
function animate(now) {
  animationId = requestAnimationFrame(animate);
  let dt = (now - (lastTime || now)) / 16.7;
  lastTime = now;

  // Dino jump/gravity
  if (dino) {
    if (!onGround) {
      dino.position.y += velocityY * dt;
      velocityY -= GRAVITY * dt;
      if (dino.position.y <= GROUND_Y + PLAYER_SIZE.y/2) {
        dino.position.y = GROUND_Y + PLAYER_SIZE.y/2;
        velocityY = 0;
        onGround = true;
      }
    }
  }

  // Baby oil sprites
  if (babyOilActive) updateBabyOilSprites(now);

  // Bouncing dinos with gravity
  if (bouncingDinosActive) updateBouncingDinos(dt);

  // Particles
  if (babyOilActive) particleBurstFromDinos();
  updateParticles(dt);

  renderer.render(scene, camera);
}

// --- RESIZE ---
window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -aspect * viewSize / 2;
  camera.right = aspect * viewSize / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI INIT ---
function showStartScreen() {
  overlay.style.display = 'flex';
  overlayMsg.textContent = 'Tap to Start!';
  restartBtn.style.display = 'none';
  scoreDiv.style.display = 'none';
}
showStartScreen();
