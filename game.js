// --- CONFIG ---
const GROUND_Y = -2;
const PLAYER_X = 0; // Centered
const PLAYER_SIZE = { x: 2.5, y: 2.7 };

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

// --- PLAYER & CLONES ---
let dino, dinoTexture;
let sidewaysDino = null;
let bouncyDino = null;
let specialDinoVisible = false;

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

// --- PARTICLE SYSTEM ---
function createParticleMaterial() {
  return new THREE.SpriteMaterial({ color: 0xffffff, opacity: 1, transparent: true });
}
let specialParticles = []; // {sprite, vx, vy, alpha}
function spawnParticlesAt(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const mat = createParticleMaterial();
    const s = new THREE.Sprite(mat);
    s.scale.set(0.4, 0.4, 1);
    s.position.set(x, y, z);
    // random speed in all directions
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.12 + Math.random() * 0.16;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    specialParticles.push({sprite: s, vx, vy, alpha: 1});
    scene.add(s);
  }
}
function updateParticles(dt) {
  for (let i = specialParticles.length - 1; i >= 0; i--) {
    const p = specialParticles[i];
    p.sprite.position.x += p.vx * dt;
    p.sprite.position.y += p.vy * dt;
    p.alpha -= 0.04 * dt;
    p.sprite.material.opacity = Math.max(0, p.alpha);
    if (p.alpha <= 0) {
      scene.remove(p.sprite);
      specialParticles.splice(i, 1);
    }
  }
}
function clearParticles() {
  for (const p of specialParticles) scene.remove(p.sprite);
  specialParticles = [];
}

// --- EFFECT TIMERS ---
let effectActive = false;
let effectTimeout = null;

// --- GAME STATE ---
let score = 0;
let gameActive = false;
let animationId = null;
let lastTime = null;

let velocityY = 0;
let onGround = true;

// --- GAME LOGIC ---
function jump() {
  // Only allow jump if on ground and game is active
  if (!gameActive || !onGround) return;
  velocityY = 0.7;
  onGround = false;
  score++;
  scoreDiv.textContent = score;
  if (score % 50 === 0 && score > 0) {
    showSpecialDinos();
    effectActive = true;
    if (effectTimeout) clearTimeout(effectTimeout);
    effectTimeout = setTimeout(() => {
      hideSpecialDinos();
      effectActive = false;
      clearParticles();
    }, 5000);
  }
}
function resetGame() {
  score = 0;
  scoreDiv.textContent = score;
  scoreDiv.style.display = 'block';
  if (dino) dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  velocityY = 0;
  onGround = true;
  renderer.setClearColor(0x222244);
  effectActive = false;
  if (effectTimeout) {
    clearTimeout(effectTimeout);
    effectTimeout = null;
  }
  hideSpecialDinos();
  clearParticles();
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
  else if (gameActive) jump();
}
window.addEventListener('mousedown', tapAnywhere);
window.addEventListener('touchstart', tapAnywhere, { passive: false });
restartBtn.addEventListener('click', startGame);

// --- SPECIAL DINOS ---
let bouncePhase = 0;
function showSpecialDinos() {
  if (!dinoTexture) return;
  if (!sidewaysDino) {
    // Sideways dino (rotated 90 deg), at the right of the main dino, on ground
    sidewaysDino = new THREE.Sprite(new THREE.SpriteMaterial({ map: dinoTexture, transparent: true }));
    sidewaysDino.scale.set(PLAYER_SIZE.y, PLAYER_SIZE.x, 1); // swap x/y for sideways
    sidewaysDino.position.set(PLAYER_X + 5.5, GROUND_Y + PLAYER_SIZE.y/2, 0);
    sidewaysDino.material.rotation = Math.PI / 2; // rotate 90 deg
    scene.add(sidewaysDino);
  }
  if (!bouncyDino) {
    // Bouncy dino starts above sideways dino
    bouncyDino = new THREE.Sprite(new THREE.SpriteMaterial({ map: dinoTexture, transparent: true }));
    bouncyDino.scale.set(PLAYER_SIZE.x * 0.8, PLAYER_SIZE.y * 0.8, 1);
    bouncyDino.position.set(PLAYER_X + 5.5, GROUND_Y + PLAYER_SIZE.y + 2.8, 0.02);
    scene.add(bouncyDino);
  }
  specialDinoVisible = true;
  bouncePhase = 0; // reset bounce
}

function updateSpecialDinos(dt, time) {
  if (!(sidewaysDino && bouncyDino && specialDinoVisible)) return;
  // Super fast bouncing up and down, sinusoidal, and emit particles from both dinos
  const freqMain = 10; // Hz
  const ampMain = 2.1;
  const freqBouncy = 15; // Hz
  const ampBouncy = 1.3;

  bouncePhase += dt / 60;
  sidewaysDino.position.y = GROUND_Y + PLAYER_SIZE.y/2 + Math.cos(time * 0.012 * freqMain) * 1.2;
  bouncyDino.position.y = sidewaysDino.position.y + sidewaysDino.scale.y/2 + bouncyDino.scale.y/2 +
    Math.abs(Math.sin(time * 0.016 * freqBouncy)) * ampBouncy + 0.2;

  // Emit particles from both
  if (Math.random() < 0.45) {
    spawnParticlesAt(sidewaysDino.position.x, sidewaysDino.position.y + 1.0, 0.03);
    spawnParticlesAt(bouncyDino.position.x, bouncyDino.position.y + 0.3, 0.03);
  }
}

function hideSpecialDinos() {
  if (sidewaysDino) {
    scene.remove(sidewaysDino);
    sidewaysDino = null;
  }
  if (bouncyDino) {
    scene.remove(bouncyDino);
    bouncyDino = null;
  }
  specialDinoVisible = false;
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
      velocityY -= 0.045 * dt;
      if (dino.position.y <= GROUND_Y + PLAYER_SIZE.y/2) {
        dino.position.y = GROUND_Y + PLAYER_SIZE.y/2;
        velocityY = 0;
        onGround = true;
      }
    }
  }

  // Special sideways and bouncy dino
  if (specialDinoVisible) updateSpecialDinos(dt, now);

  // Fast bounce for main dino if effect is active
  if (effectActive && dino) {
    if (onGround) {
      // If effect is active and dino is on ground, make it bounce visually (but not logic)
      dino.position.y = GROUND_Y + PLAYER_SIZE.y/2 + Math.sin(now * 0.04) * 2.7;
      if (Math.random() < 0.37) {
        spawnParticlesAt(dino.position.x, dino.position.y + 1.2, 0.03);
      }
    }
  } else if (dino && onGround) {
    dino.position.y = GROUND_Y + PLAYER_SIZE.y/2;
  }

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
