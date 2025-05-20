// CONFIG
const GROUND_Y = -2;
const PLAYER_X = -2.5;
const GRAVITY = 0.045;
const JUMP_VELOCITY = 0.7;
const OBSTACLE_MIN_X = -4, OBSTACLE_MAX_X = 4;
const OBSTACLE_START_Z = 10;
const OBSTACLE_SIZE = { x: 1, y: 1.2 };
const PLAYER_SIZE = { x: 1, y: 1.1 };
const PLAYER_JUMP_HEIGHT = 2.1;
const GAME_SPEED = 0.18;
const SPAWN_INTERVAL = 1050; // ms

// UI
const scoreDiv = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-message');
const restartBtn = document.getElementById('restart-btn');

// THREE JS
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 1, 6);

// ASSETS
const loader = new THREE.TextureLoader();
let dino, ground;
let obstacleTexture;
let obstacles = [];

// STATE
let velocityY = 0;
let onGround = true;
let score = 0;
let gameActive = false;
let obstacleTimer = null;
let animationId = null;
let lastTime = null;

// LOAD SPRITES
loader.load('dino.png', function(texture) {
  const material = new THREE.SpriteMaterial({ map: texture });
  dino = new THREE.Sprite(material);
  dino.scale.set(PLAYER_SIZE.x, PLAYER_SIZE.y, 1);
  dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  scene.add(dino);
});
loader.load('obstacle.png', function(texture) {
  obstacleTexture = texture;
});
function createGround() {
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 1),
    new THREE.MeshBasicMaterial({ color: 0x444444 })
  );
  g.position.set(0, GROUND_Y - 0.55, 0);
  scene.add(g);
  ground = g;
}
createGround();

// OBSTACLES
function spawnObstacle() {
  let x = 0; // centered
  let material;
  if (obstacleTexture) {
    material = new THREE.SpriteMaterial({ map: obstacleTexture });
    let obs = new THREE.Sprite(material);
    obs.scale.set(OBSTACLE_SIZE.x, OBSTACLE_SIZE.y, 1);
    obs.position.set(x, GROUND_Y + OBSTACLE_SIZE.y/2, OBSTACLE_START_Z);
    obs.userData.isSprite = true;
    scene.add(obs);
    obstacles.push(obs);
  } else {
    // fallback cube
    material = new THREE.MeshBasicMaterial({ color: 0xe0482f });
    let obs = new THREE.Mesh(new THREE.BoxGeometry(OBSTACLE_SIZE.x, OBSTACLE_SIZE.y, 0.8), material);
    obs.position.set(x, GROUND_Y + OBSTACLE_SIZE.y/2, OBSTACLE_START_Z);
    scene.add(obs);
    obstacles.push(obs);
  }
}
function startObstacleSpawner() {
  stopObstacleSpawner();
  obstacleTimer = setInterval(spawnObstacle, SPAWN_INTERVAL);
}
function stopObstacleSpawner() {
  if (obstacleTimer) clearInterval(obstacleTimer);
  obstacleTimer = null;
}

// GAME LOGIC
function jump() {
  if (!gameActive || !onGround) return;
  velocityY = JUMP_VELOCITY;
  onGround = false;
}

function resetGame() {
  obstacles.forEach(o => scene.remove(o));
  obstacles = [];
  score = 0;
  scoreDiv.textContent = score;
  scoreDiv.style.display = 'block';
  if (dino) dino.position.set(PLAYER_X, GROUND_Y + PLAYER_SIZE.y/2, 0);
  velocityY = 0;
  onGround = true;
}

function startGame() {
  overlay.style.display = 'none';
  restartBtn.style.display = 'none';
  resetGame();
  gameActive = true;
  startObstacleSpawner();
  lastTime = performance.now();
  animate();
}

function gameOver() {
  gameActive = false;
  stopObstacleSpawner();
  cancelAnimationFrame(animationId);
  overlay.style.display = 'flex';
  overlayMsg.innerHTML = `<div>Game Over!</div><div style="font-size:0.7em;margin-top:18px;">Score: ${score}</div>`;
  restartBtn.style.display = 'block';
}

function tapAnywhere(e) {
  e.preventDefault();
  if (!gameActive && overlay.style.display !== 'none') {
    startGame();
  } else if (gameActive) {
    jump();
  }
}
window.addEventListener('mousedown', tapAnywhere);
window.addEventListener('touchstart', tapAnywhere, { passive: false });
restartBtn.addEventListener('click', startGame);

// ANIMATE
function animate(now) {
  animationId = requestAnimationFrame(animate);
  let dt = (now - lastTime) / 16.7; // frame normalized
  lastTime = now;

  // Move obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.position.z -= GAME_SPEED * dt;
    if (obs.position.z < -2) {
      scene.remove(obs);
      obstacles.splice(i, 1);
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
  obstacles.forEach(obs => {
    if (!dino) return;
    let dz = Math.abs(obs.position.z - dino.position.z);
    let dx = Math.abs(obs.position.x - dino.position.x);
    let dy = Math.abs(obs.position.y - dino.position.y);
    let collideZ = dz < 0.5;
    let collideX = dx < (PLAYER_SIZE.x/2 + OBSTACLE_SIZE.x/2 - 0.07);
    let collideY = dy < (PLAYER_SIZE.y/2 + OBSTACLE_SIZE.y/2 - 0.09);
    if (collideZ && collideX && collideY) {
      gameOver();
    }
  });

  renderer.render(scene, camera);
}

// RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI INIT
function showStartScreen() {
  overlay.style.display = 'flex';
  overlayMsg.textContent = 'Tap to Start!';
  restartBtn.style.display = 'none';
  scoreDiv.style.display = 'none';
}
showStartScreen();
