// CONFIG
const GROUND_Y = -2;
const PLAYER_X = -4.5; // fixed X
const GRAVITY = 0.045;
const JUMP_VELOCITY = 0.7;
const OBSTACLE_MIN_GAP = 2.4, OBSTACLE_MAX_GAP = 4.2;
const OBSTACLE_SIZE = { x: 1, y: 1.2 };
const PLAYER_SIZE = { x: 1, y: 1.1 };
const GAME_SPEED = 0.13;
const SPAWN_BUFFER = 12; // distance ahead for spawning obstacles

// UI
const scoreDiv = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-message');
const restartBtn = document.getElementById('restart-btn');

// THREE JS (orthographic for 2D)
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
document.body.appendChild(renderer.domElement);

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
let animationId = null;
let lastTime = null;
let nextObstacleX = PLAYER_X + SPAWN_BUFFER;

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
    new THREE.PlaneGeometry(50, 1),
    new THREE.MeshBasicMaterial({ color: 0x444444 })
  );
  g.position.set(0, GROUND_Y - 0.55, 0);
  scene.add(g);
  ground = g;
}
createGround();

// OBSTACLES
function spawnObstacle() {
  let material;
  if (obstacleTexture) {
    material = new THREE.SpriteMaterial({ map: obstacleTexture });
    let obs = new THREE.Sprite(material);
    obs.scale.set(OBSTACLE_SIZE.x, OBSTACLE_SIZE.y, 1);
    obs.position.set(nextObstacleX, GROUND_Y + OBSTACLE_SIZE.y/2, 0);
    obs.userData.isSprite = true;
    scene.add(obs);
    obstacles.push(obs);
  } else {
    // fallback cube
    material = new THREE.MeshBasicMaterial({ color: 0xe0482f });
    let obs = new THREE.Mesh(new THREE.BoxGeometry(OBSTACLE_SIZE.x, OBSTACLE_SIZE.y, 0.8), material);
    obs.position.set(nextObstacleX, GROUND_Y + OBSTACLE_SIZE.y/2, 0);
    scene.add(obs);
    obstacles.push(obs);
  }
  // calculate next spawn X (random gap)
  const gap = Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP) + OBSTACLE_MIN_GAP;
  nextObstacleX += gap;
}
function resetObstacles() {
  obstacles.forEach(o => scene.remove(o));
  obstacles = [];
  nextObstacleX = PLAYER_X + SPAWN_BUFFER;
  // spawn a few at start
  for (let i = 0; i < 3; i++) {
    spawnObstacle();
  }
}

// GAME LOGIC
function jump() {
  if (!gameActive || !onGround) return;
  velocityY = JUMP_VELOCITY;
  onGround = false;
}

function resetGame() {
  resetObstacles();
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

  // Move obstacles left
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.position.x -= GAME_SPEED * dt;
    if (obs.position.x < PLAYER_X - 3) {
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

  // Spawn new obstacles as needed
  if (obstacles.length === 0 || obstacles[obstacles.length-1].position.x < (PLAYER_X + SPAWN_BUFFER - 4)) {
    spawnObstacle();
  }

  // Collision detection
  obstacles.forEach(obs => {
    if (!dino) return;
    let dx = Math.abs(obs.position.x - dino.position.x);
    let dy = Math.abs(obs.position.y - dino.position.y);
    let collideX = dx < (PLAYER_SIZE.x/2 + OBSTACLE_SIZE.x/2 - 0.09);
    let collideY = dy < (PLAYER_SIZE.y/2 + OBSTACLE_SIZE.y/2 - 0.09);
    if (collideX && collideY) {
      gameOver();
    }
  });

  renderer.render(scene, camera);
}

// RESIZE
window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -aspect * viewSize / 2;
  camera.right = aspect * viewSize / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
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
