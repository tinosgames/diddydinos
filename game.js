// --- CONFIG ---
const GROUND_Y = -2;
const PLAYER_X = -4.5;
const PLAYER_SIZE = { x: 1, y: 1.1 };
const OBSTACLE_SIZE = { x: 1.3, y: 1.6 };
const OBSTACLE_GAP = 10; // distance between obstacles
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

// --- OBSTACLE (always one, red block, z=0) ---
let obstacle;
function spawnObstacle(x) {
  if (obstacle) scene.remove(obstacle);
  const material = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(OBSTACLE_SIZE.x, OBSTACLE_SIZE.y, 0.2),
    material
  );
  obstacle.position.set(x, GROUND_Y + OBSTACLE_SIZE.y/2, 0);
  scene.add(obstacle);
  // DEBUG: log position
  console.log('Spawned obstacle at', obstacle.position.x, obstacle.position.y, obstacle.position.z);
}

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
}
function resetGame() {
  score = 0;
  scoreDiv.textContent = score;
  scoreDiv.style.display = 'block';
  if (dino) dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  velocityY = 0;
  onGround = true;
  spawnObstacle(PLAYER_X + OBSTACLE_GAP);
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

// --- ANIMATE ---
function animate(now) {
  animationId = requestAnimationFrame(animate);
  let dt = (now - (lastTime || now)) / 16.7;
  lastTime = now;

  // Move obstacle left
  if (obstacle) {
    obstacle.position.x -= GAME_SPEED * dt;
    // Respawn obstacle if offscreen
    if (obstacle.position.x < PLAYER_X - 3) {
      spawnObstacle(PLAYER_X + OBSTACLE_GAP);
      score++;
      scoreDiv.textContent = score;
    }
  }

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

  // Collision detection
  if (dino && obstacle) {
    let dx = Math.abs(obstacle.position.x - dino.position.x);
    let dy = Math.abs(obstacle.position.y - dino.position.y);
    let collideX = dx < (PLAYER_SIZE.x/2 + OBSTACLE_SIZE.x/2 - 0.09);
    let collideY = dy < (PLAYER_SIZE.y/2 + OBSTACLE_SIZE.y/2 - 0.09);
    if (collideX && collideY) gameOver();
  }

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
