/* script.js — core game logic for a simple top-down road safety game */
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const speedEl = document.getElementById('speed');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');

// Logical canvas size (independent of CSS scaling)
const W = 480, H = 720;
canvas.width = W; canvas.height = H;

let gameState = 'idle'; // idle, running, paused, over
let player, obstacles, signs, particles;
let keys = {};
let lastTime = 0;
let spawnTimer = 0;
let score = 0;

const config = {
  maxSpeed: 100, // km/h
  accel: 20, // km/h per second
  brake: 60,
  laneX: [W*0.25, W*0.65], // two-lane system, left-hand driving -> left-most lane is player's default
  roadLeft: W*0.15,
  roadRight: W*0.85,
}

function reset(){
  player = {
    x: config.laneX[0],
    lane: 0,
    y: H - 120,
    width: 56,
    height: 100,
    speed: 0, // km/h
    lives: 3
  };
  obstacles = [];
  signs = [];
  particles = [];
  score = 0;
  spawnTimer = 0;
  lastTime = performance.now();
  updateHUD();
}

function updateHUD(){
  speedEl.textContent = Math.round(player.speed);
  scoreEl.textContent = Math.floor(score);
  livesEl.textContent = player.lives;
}

function startGame(){
  reset();
  gameState = 'running';
  messageEl.textContent = 'Drive safely — keep left, obey signs.';
  startBtn.style.display = 'none';
  restartBtn.style.display = 'none';
  requestAnimationFrame(loop);
}

function gameOver(){
  gameState = 'over';
  messageEl.textContent = 'Game over. You can restart to try again.';
  restartBtn.style.display = 'inline-block';
}

function spawnObstacle(type){
  const lane = Math.floor(Math.random()*2);
  const x = config.laneX[lane];
  if(type === 'car'){
    obstacles.push({type:'car', x, y:-100, w:56, h:100, speed: randomRange(30,70)});
  } else if(type === 'ped'){ // pedestrian crossing / walker
    obstacles.push({type:'ped', x:randomRange(config.roadLeft+40, config.roadRight-40), y:-60, w:30, h:44, speed: randomRange(10,22), crossing:true});
  }
}

function spawnSign(kind){
  const x = W*0.5;
  signs.push({kind, x, y:-80, lifetime:10});
}

function loop(t){
  const dt = Math.min(0.05,(t-lastTime)/1000);
  lastTime = t;
  if(gameState !== 'running') return;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt){
  // Controls: accelerate with ArrowUp or W; brake S or ArrowDown; left/right to change lanes
  if(keys['ArrowUp'] || keys['w'] || keys['W']) player.speed = Math.min(config.maxSpeed, player.speed + config.accel*dt);
  if(keys['ArrowDown'] || keys['s'] || keys['S']) player.speed = Math.max(0, player.speed - config.brake*dt);
  if(keys['ArrowLeft'] || keys['a'] || keys['A']) player.lane = 0;
  if(keys['ArrowRight'] || keys['d'] || keys['D']) player.lane = 1;
  player.x = config.laneX[player.lane];

  // spawn logic
  spawnTimer += dt;
  if(spawnTimer > 1.0){
    spawnTimer = 0;
    // probability depends on speed
    const p = Math.min(0.75, 0.25 + player.speed/200);
    if(Math.random() < p) spawnObstacle('car');
    if(Math.random() < 0.25) spawnObstacle('ped');
    if(Math.random() < 0.12) spawnSign(randomSign());
  }

  // update obstacles
  for(let i=obstacles.length-1;i>=0;i--){
    const ob = obstacles[i];
    // obstacles move downwards relative to player speed to create forward motion
    ob.y += (ob.speed + player.speed)*dt*1.2;
    if(ob.y > H + 200) obstacles.splice(i,1);
    // collision
    if(boxCollide(player.x - player.width/2, player.y - player.height/2, player.width, player.height, ob.x - ob.w/2, ob.y - ob.h/2, ob.w, ob.h)){
      // collisions depend on type
      if(ob.type === 'car'){
        player.lives -= 1;
        particles.push({x:ob.x,y:ob.y,life:0.6});
        obstacles.splice(i,1);
        score -= 50;
      } else if(ob.type === 'ped'){
        // pedestrian hit is severe
        player.lives = Math.max(0, player.lives - 3);
        particles.push({x:ob.x,y:ob.y,life:1.2});
        obstacles.splice(i,1);
        score -= 500;
        messageEl.textContent = 'You hit a pedestrian — always stop at crossings!';
      }
      if(player.lives <= 0){
        updateHUD();
        gameOver();
        return;
      }
    }
  }

  // update signs
  for(let i=signs.length-1;i>=0;i--){
    const s = signs[i];
    s.y += (30 + player.speed/2)*dt;
    s.lifetime -= dt;
    if(s.lifetime <= 0 || s.y > H+100) signs.splice(i,1);
    // apply sign effects when near player
    if(s.y > player.y-200 && s.y < player.y - 100){
      applySignEffect(s.kind);
      signs.splice(i,1);
    }
  }

  // scoring: travel distance
  score += player.speed*dt*0.2;
  updateHUD();
}

function applySignEffect(kind){
  // Australian-themed signs: school zone, give way, speed limit
  if(kind === 'school40'){
    // temporary speed cap
    const prev = config.maxSpeed;
    config.maxSpeed = Math.min(40, config.maxSpeed);
    messageEl.textContent = 'School zone — 40 km/h ahead. Slow down.';
    setTimeout(()=>{ config.maxSpeed = prev; messageEl.textContent = 'School zone ended.'; }, 7000);
  } else if(kind === 'speed50'){
    const prev = config.maxSpeed;
    config.maxSpeed = Math.min(50, config.maxSpeed);
    messageEl.textContent = 'Speed limit 50 km/h.';
    setTimeout(()=>{ config.maxSpeed = prev; messageEl.textContent = 'Speed limit ended.'; }, 7000);
  } else if(kind === 'giveway'){
    messageEl.textContent = 'Give Way sign — check and yield.';
  } else if(kind === 'roundabout'){
    messageEl.textContent = 'Roundabout — give way to the right (remember: left-hand driving!).';
  }
}

function randomSign(){
  const arr = ['school40','speed50','giveway','roundabout'];
  return arr[Math.floor(Math.random()*arr.length)];
}

function render(){
  // clear
  ctx.clearRect(0,0,W,H);

  // draw sky / top
  drawRoadBackground();

  // draw signs
  for(const s of signs) drawSign(s);

  // draw obstacles
  for(const ob of obstacles) drawObstacle(ob);

  // draw player car
  drawPlayer();

  // draw HUD overlays (center)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0,0, W, 40);
}

function drawRoadBackground(){
  // Road band
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(config.roadLeft, 0, config.roadRight - config.roadLeft, H);
  // dashed center line (yellow for Australian roads)
  ctx.strokeStyle = '#f7df1e';
  ctx.lineWidth = 6;
  ctx.setLineDash([30,24]);
  ctx.beginPath();
  ctx.moveTo((config.roadLeft+config.roadRight)/2,0);
  ctx.lineTo((config.roadLeft+config.roadRight)/2,H);
  ctx.stroke();
  ctx.setLineDash([]);
  // road edges
  ctx.fillStyle = '#4b4b4b';
  ctx.fillRect(config.roadLeft-8,0,8,H);
  ctx.fillRect(config.roadRight,0,8,H);
}

function drawPlayer(){
  const p = player;
  // car body
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = '#1b9aaa';
  roundRect(ctx, -p.width/2, -p.height/2, p.width, p.height, 8);
  ctx.fill();
  // windows
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-p.width/4, -p.height/4, p.width/2, p.height/4);
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-p.width/2+6, p.height/2-10, 12, 6);
  ctx.fillRect(p.width/2-18, p.height/2-10, 12, 6);
  ctx.restore();
}

function drawObstacle(ob){
  ctx.save();
  ctx.translate(ob.x, ob.y);
  if(ob.type === 'car'){
    ctx.fillStyle = '#d62828';
    roundRect(ctx, -ob.w/2, -ob.h/2, ob.w, ob.h, 6);
    ctx.fill();
  } else if(ob.type === 'ped'){
    ctx.fillStyle = '#ffffff';
    // simple stick figure
    ctx.beginPath();
    ctx.arc(0, -8, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0,-2);
    ctx.lineTo(0,14);
    ctx.moveTo(0,6);
    ctx.lineTo(-8,2);
    ctx.moveTo(0,6);
    ctx.lineTo(8,2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSign(s){
  ctx.save();
  ctx.translate(s.x, s.y);
  // sign background
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(-36, -36, 72, 72);
  ctx.fill();
  ctx.stroke();
  // sign content
  ctx.fillStyle = '#000';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  if(s.kind === 'school40'){
    ctx.fillText('SCHOOL', 0, -2);
    ctx.fillText('40', 0, 18);
  } else if(s.kind === 'speed50'){
    ctx.fillText('SPEED', 0, -2);
    ctx.fillText('50', 0, 18);
  } else if(s.kind === 'giveway'){
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(26,24); ctx.lineTo(-26,24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillText('GIVE',0,8); ctx.fillText('WAY',0,24);
  } else if(s.kind === 'roundabout'){
    ctx.fillText('ROUND',0,-2); ctx.fillText('ABOUT',0,18);
  }
  ctx.restore();
}

// utilities
function randomRange(a,b){return a + Math.random()*(b-a)}

function boxCollide(x1,y1,w1,h1,x2,y2,w2,h2){
  return !(x2 > x1 + w1 || x2 + w2 < x1 || y2 > y1 + h1 || y2 + h2 < y1);
}

function roundRect(ctx,x,y,w,h,r){
  const r2 = Math.min(r,w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r2,y);
  ctx.arcTo(x+w,y,x+w,y+h,r2);
  ctx.arcTo(x+w,y+h,x,y+h,r2);
  ctx.arcTo(x,y+h,x,y,r2);
  ctx.arcTo(x,y,x+w,y,r2);
  ctx.closePath();
}

// Input
window.addEventListener('keydown', e=>{ keys[e.key]=true; if(e.key===' '){ if(gameState==='idle') startGame(); } });
window.addEventListener('keyup', e=>{ keys[e.key]=false; });
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', ()=>{ startBtn.style.display='none'; restartBtn.style.display='none'; startGame(); });

// Accessibility: pause on blur
window.addEventListener('blur', ()=>{ if(gameState==='running'){ gameState='paused'; messageEl.textContent='Paused (tab lost)'; }});
window.addEventListener('focus', ()=>{ if(gameState==='paused'){ gameState='running'; messageEl.textContent='Resumed'; lastTime = performance.now(); requestAnimationFrame(loop);} });

// show basic instructions overlay
messageEl.textContent = 'Press START to begin — drive on the left (Australia), obey signs.';

// Basic auto-start if desired
// requestAnimationFrame(loop);
