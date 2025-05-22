// --- CONFIG ---
const GROUND_Y = -2;
const PLAYER_X = 0; // Centered
const PLAYER_SIZE = { x: 2.5, y: 2.7 }; // Bigger
const GAME_SPEED = 0.13;
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
let dino;
const loader = new THREE.TextureLoader();
loader.load('dino.png', function(texture) {
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
loader.load('babyoil.png', function(texture) {
  babyOilTexture = texture;
});

// --- PARTICLE EFFECT ---
let particles = [];
let particlesActive = false;
let particlesMerged = false;
const PARTICLE_COUNT = 64;

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
  if (score % 500 === 0 && score > 0) {
    triggerSpecialEffect();
  }
}
function resetGame() {
  score = 0;
  scoreDiv.textContent = score;
  scoreDiv.style.display = 'block';
  if (dino) dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  velocityY = 0;
  onGround = true;
  removeBabyOilSprites();
  removeParticles();
  babyOilActive = false;
  particlesActive = false;
  particlesMerged = false;
  renderer.setClearColor(0x222244);
  effectActive = false;
  if (effectTimeout) {
    clearTimeout(effectTimeout);
    effectTimeout = null;
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
  if (effectActive) return;
  effectActive = true;
  babyOilActive = true;
  createBabyOilSprites();
  // After oil flies for a few seconds, start particles
  effectTimeout = setTimeout(() => {
    triggerParticles();
    effectTimeout = setTimeout(() => {
      resetEffectVisuals();
    }, 5000); // particles/whiteout last for 5 seconds then revert
  }, 3200);
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

// --- WHITE PARTICLE EFFECT ---
function triggerParticles() {
  particlesActive = true;
  // Create PARTICLE_COUNT particles at random positions around center
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    let mat = new THREE.SpriteMaterial({ color: 0xffffff });
    let p = new THREE.Sprite(mat);
    let angle = Math.random() * Math.PI * 2;
    let radius = 4 + Math.random() * 4;
    p.scale.set(0.7, 0.7, 1);
    p.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.4 + i * 0.005);
    p.userData = {
      vx: (0 - p.position.x) / (52 + Math.random() * 22), // ~52 frames to center
      vy: (0 - p.position.y) / (52 + Math.random() * 22),
      merge: false
    };
    scene.add(p);
    particles.push(p);
  }
  // After a short time, trigger merge
  setTimeout(() => {
    mergeParticles();
  }, 1400);
}
function updateParticles() {
  if (!particlesActive || particlesMerged) return;
  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    // When close to center, stop at center
    if (Math.abs(p.position.x) < 0.18 && Math.abs(p.position.y) < 0.18) {
      p.position.x = 0;
      p.position.y = 0;
      p.userData.merge = true;
    }
  }
}
function mergeParticles() {
  particlesMerged = true;
  // Animate all particles scaling up into one and fade to white
  let scale = 0.7;
  let alpha = 1;
  function animateMerge() {
    scale += 0.14;
    alpha += 0.13;
    for (let i = 0; i < particles.length; i++) {
      particles[i].scale.set(scale, scale, 1);
      particles[i].material.opacity = Math.max(1 - (alpha - 1) / 2, 0);
      particles[i].material.transparent = true;
    }
    if (scale < 18) {
      requestAnimationFrame(animateMerge);
    } else {
      whiteoutScreen();
    }
  }
  animateMerge();
}
function removeParticles() {
  while (particles.length > 0) {
    let p = particles.pop();
    scene.remove(p);
  }
}
function whiteoutScreen() {
  renderer.setClearColor(0xffffff, 1);
  removeParticles();
  removeBabyOilSprites();
}

// --- RESET EFFECT VISUALS ---
function resetEffectVisuals() {
  // Revert everything back to normal after 5 seconds of effect
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

  // Particles
  if (particlesActive && !particlesMerged) updateParticles();

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
