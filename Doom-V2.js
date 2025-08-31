<html>
<head>
  <title>Open Arena DOOM Shooter - Big Map</title>
  <style>
    body { margin:0; overflow:hidden; background:black; cursor:none; font-family:sans-serif; }
    canvas { display:block; position:absolute; top:0; left:0; background:transparent; }
    #gun { position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:300px; pointer-events:none; }
    #gun-name { position:absolute; bottom:120px; left:50%; transform:translateX(-50%); color:white; font-size:24px; text-shadow:1px 1px 3px black; }
    #ammo-count { position:absolute; top:20px; right:20px; color:white; font-size:24px; text-shadow:1px 1px 3px black; }
    #score-count { position:absolute; top:60px; right:20px; color:white; font-size:24px; text-shadow:1px 1px 3px black; }

    /* Menu */
    #menu { position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; z-index:10; }
    #menu h1 { font-size:48px; margin-bottom:10px; text-shadow:2px 2px 5px black; }
    #menu p { font-size:24px; margin-bottom:40px; text-shadow:1px 1px 3px black; }
    .menu-button { background:darkred; color:white; font-size:24px; padding:15px 40px; margin:10px; border:none; cursor:pointer; border-radius:10px; box-shadow:2px 2px 5px black; transition:0.2s; }
    .menu-button:hover { background:red; }
    #credits-screen { display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
    #credits-screen p { font-size:24px; margin:10px; }
  </style>
</head>
<body>
<canvas id="game"></canvas>

<!-- Menu -->
<div id="menu">
  <h1>Free DOOM Assets</h1>
  <p>Wyatt Stark</p>
  <button class="menu-button" id="play-btn">Play</button>
  <button class="menu-button" id="credits-btn">Credits</button>

  <div id="credits-screen">
    <p>Created by Wyatt Stark</p>
    <p>Using Free DOOM Assets</p>
    <button class="menu-button" id="back-btn">Back</button>
  </div>
</div>

<div id="gun-name">Shotgun</div>
<div id="ammo-count">2 / 2</div>
<div id="score-count">Targets: 0</div>
<img id="gun" src="shotgun/idle.png">

<script>
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const gun = document.getElementById("gun");
const gunName = document.getElementById("gun-name");
const ammoCount = document.getElementById("ammo-count");
const scoreCount = document.getElementById("score-count");

// Menu
const menu = document.getElementById('menu');
const playBtn = document.getElementById('play-btn');
const creditsBtn = document.getElementById('credits-btn');
const creditsScreen = document.getElementById('credits-screen');
const backBtn = document.getElementById('back-btn');
let menuVisible = true;

creditsBtn.addEventListener('click', () => {
  playBtn.style.display = "none";
  creditsBtn.style.display = "none";
  creditsScreen.style.display = "flex";
});
backBtn.addEventListener('click', () => {
  playBtn.style.display = "inline-block";
  creditsBtn.style.display = "inline-block";
  creditsScreen.style.display = "none";
});
playBtn.addEventListener('click', () => {
  menu.style.display = 'none';
  menuVisible = false;
  canvas.requestPointerLock();
});

// Resize canvas
function resizeCanvas(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
window.addEventListener('resize',resizeCanvas);
resizeCanvas();

// --- Map ---
const mapSize = 100;
const map = Array(mapSize).fill(0).map(()=>Array(mapSize).fill(0));
for(let i=0;i<mapSize;i++){ map[0][i]=1; map[mapSize-1][i]=1; map[i][0]=1; map[i][mapSize-1]=1; }

// --- Targets inside map ---
let targets=[];
for(let i=0;i<10;i++){
  let x=Math.floor(Math.random()*(mapSize-2))+1;
  let y=Math.floor(Math.random()*(mapSize-2))+1;
  if(map[y][x]===0) targets.push({x,y,hit:false});
}

// Player
let posX=mapSize/2+0.5, posY=mapSize/2+0.5;
let playerAngle=Math.PI;
let playerPitch=0; // vertical look
const pitchLimit=Math.PI/4;
const planeLength=1.0;
const moveSpeed=0.08;
let keys={};

// Mouse look
canvas.addEventListener("click", () => { canvas.requestPointerLock(); });
document.addEventListener("pointerlockchange", () => {
  if(document.pointerLockElement===canvas) document.addEventListener("mousemove", onMouseMove);
  else document.removeEventListener("mousemove", onMouseMove);
});
const sensitivity=0.0025;
function onMouseMove(e){
  playerAngle += e.movementX * sensitivity;
  playerPitch += e.movementY * sensitivity; // **un-inverted Y**

  if(playerAngle<0) playerAngle+=2*Math.PI;
  if(playerAngle>2*Math.PI) playerAngle-=2*Math.PI;

  if(playerPitch < -pitchLimit) playerPitch = -pitchLimit;
  if(playerPitch > pitchLimit) playerPitch = pitchLimit;
}

// Weapons
const weapons={
  shotgun:{frames:["idle.png","shoot.png","shoot2.png","shoot3.png"],reloadFrames:["reload1.png","reload2.png","reload3.png","reload 4.png","reload 5.png","reload 6.png","reload 7.png","reload 8.png","relaod 9.png","idle.png"],sound:"shotgun.wav",reloadSound:"shotgun-reload.wav",width:300,ammoMax:2,damage:7},
  pistol:{frames:["pistol-idle.png","pistol-shoot.png","pistol-shoot2.png","pistol-shoot3.png"],reloadFrames:["pistol-reload1.png","pistol-reload2.png","pistol-reload3.png","pistol-idle.png"],sound:"pistol.wav",reloadSound:"pistol-reload.wav",width:200,ammoMax:8,damage:3}
};
let currentWeapon="shotgun",ammo=weapons[currentWeapon].ammoMax,isShooting=false,isReloading=false;

// Preload images
const preloadedImages={};
for(let w in weapons){ preloadedImages[w]={frames:[],reload:[]}; weapons[w].frames.forEach(src=>{const img=new Image(); img.src=src; preloadedImages[w].frames.push(img); }); weapons[w].reloadFrames.forEach(src=>{const img=new Image(); img.src=src; preloadedImages[w].reload.push(img); });}

// Movement keys
document.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

// Switch weapons
document.addEventListener("keydown",e=>{
  if(e.key==="1") switchWeapon("shotgun");
  if(e.key==="2") switchWeapon("pistol");
  if(e.key==="r") reloadWeapon();
});
function switchWeapon(weapon){ currentWeapon=weapon; ammo=weapons[weapon].ammoMax; gun.src=preloadedImages[weapon].frames[0].src; gun.style.width=weapons[weapon].width+"px"; gunName.innerText=weapon.charAt(0).toUpperCase()+weapon.slice(1); updateAmmoDisplay();}
function updateAmmoDisplay(){ ammoCount.innerText=`Ammo: ${ammo} / ${weapons[currentWeapon].ammoMax}`; }
function updateScore(){ scoreCount.innerText=`Targets: ${targets.filter(t=>t.hit).length}`; }

// Shoot & reload
function shootWeapon(){
  if(isShooting||isReloading||ammo<=0) return;
  isShooting=true; ammo--; updateAmmoDisplay();
  const weapon=weapons[currentWeapon];
  const sound=new Audio(weapon.sound); sound.currentTime=0; sound.play();

  targets.forEach(t=>{
    if(!t.hit){
      const dx=t.x+0.5-posX, dy=t.y+0.5-posY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const angleToTarget=Math.atan2(dy,dx);
      if(Math.abs(angleToTarget-playerAngle)<0.1 && dist<10) t.hit=true;
    }
  });
  updateScore();
  let frameIndex=1;
  gun.src=preloadedImages[currentWeapon].frames[frameIndex].src;
  const anim=setInterval(()=>{
    frameIndex++;
    if(frameIndex<preloadedImages[currentWeapon].frames.length) gun.src=preloadedImages[currentWeapon].frames[frameIndex].src;
    else{ clearInterval(anim); gun.src=preloadedImages[currentWeapon].frames[0].src; isShooting=false;}
  },100);
}
function reloadWeapon(){
  if(isReloading||ammo===weapons[currentWeapon].ammoMax) return;
  isReloading=true; const reloadSound=new Audio(weapons[currentWeapon].reloadSound); reloadSound.play();
  let frameIndex=0; gun.src=preloadedImages[currentWeapon].reload[frameIndex].src;
  const anim=setInterval(()=>{
    frameIndex++;
    if(frameIndex<preloadedImages[currentWeapon].reload.length) gun.src=preloadedImages[currentWeapon].reload[frameIndex].src;
    else{ clearInterval(anim); ammo=weapons[currentWeapon].ammoMax; updateAmmoDisplay(); gun.src=preloadedImages[currentWeapon].frames[0].src; isReloading=false; }
  },200);
}
document.addEventListener("click",shootWeapon);

// Game loop
function gameLoop(){
  if(!menuVisible){
    const dirX=Math.cos(playerAngle), dirY=Math.sin(playerAngle);
    const planeX=-dirY*planeLength, planeY=dirX*planeLength;

    // Movement
    if(keys["w"]){ if(map[Math.floor(posY)][Math.floor(posX+dirX*moveSpeed)]===0) posX+=dirX*moveSpeed; if(map[Math.floor(posY+dirY*moveSpeed)][Math.floor(posX)]===0) posY+=dirY*moveSpeed; }
    if(keys["s"]){ if(map[Math.floor(posY)][Math.floor(posX-dirX*moveSpeed)]===0) posX-=dirX*moveSpeed; if(map[Math.floor(posY-dirY*moveSpeed)][Math.floor(posX)]===0) posY-=dirY*moveSpeed; }
    if(keys["a"]){ const sx=Math.cos(playerAngle-Math.PI/2),sy=Math.sin(playerAngle-Math.PI/2); if(map[Math.floor(posY)][Math.floor(posX+sx*moveSpeed)]===0) posX+=sx*moveSpeed; if(map[Math.floor(posY+sy*moveSpeed)][Math.floor(posX)]===0) posY+=sy*moveSpeed; }
    if(keys["d"]){ const sx=Math.cos(playerAngle+Math.PI/2),sy=Math.sin(playerAngle+Math.PI/2); if(map[Math.floor(posY)][Math.floor(posX+sx*moveSpeed)]===0) posX+=sx*moveSpeed; if(map[Math.floor(posY+sy*moveSpeed)][Math.floor(posX)]===0) posY+=sy*moveSpeed; }

    // Render walls
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let x=0;x<canvas.width;x++){
      const cameraX=2*x/canvas.width-1;
      const rayDirX=dirX+planeX*cameraX, rayDirY=dirY+planeY*cameraX;
      let mapX=Math.floor(posX), mapY=Math.floor(posY);
      let sideDistX, sideDistY, stepX, stepY, hit=0, side;
      const deltaDistX=Math.abs(1/rayDirX), deltaDistY=Math.abs(1/rayDirY);
      if(rayDirX<0){stepX=-1; sideDistX=(posX-mapX)*deltaDistX;}else{stepX=1; sideDistX=(mapX+1-posX)*deltaDistX;}
      if(rayDirY<0){stepY=-1; sideDistY=(posY-mapY)*deltaDistY;}else{stepY=1; sideDistY=(mapY+1-posY)*deltaDistY;}
      while(hit===0){ if(sideDistX<sideDistY){sideDistX+=deltaDistX; mapX+=stepX; side=0;}else{sideDistY+=deltaDistY; mapY+=stepY; side=1;} if(map[mapY][mapX]>0) hit=1; }
      const perpWallDist=(side===0)? (mapX-posX+(1-stepX)/2)/rayDirX : (mapY-posY+(1-stepY)/2)/rayDirY;
      const lineHeight=Math.floor(canvas.height/perpWallDist);
      let drawStart=-lineHeight/2 + canvas.height/2 - playerPitch*canvas.height;
      let drawEnd=lineHeight/2 + canvas.height/2 - playerPitch*canvas.height;
      if(drawStart<0) drawStart=0;
      if(drawEnd>=canvas.height) drawEnd=canvas.height-1;
      ctx.strokeStyle=side?"darkred":"red";
      ctx.beginPath(); ctx.moveTo(x,drawStart); ctx.lineTo(x,drawEnd); ctx.stroke();
    }

    // Draw targets inside map (only when player near)
    targets.forEach(t => {
      if(!t.hit){
        const dx = t.x+0.5 - posX;
        const dy = t.y+0.5 - posY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < 10){
          const angleToTarget = Math.atan2(dy,dx) - playerAngle;
          const screenX = Math.tan(angleToTarget) * canvas.width / 2 + canvas.width / 2;
          const size = 50 / dist;
          const screenY = canvas.height / 2 - size / 2 - playerPitch*canvas.height;
          ctx.fillStyle="yellow";
          ctx.fillRect(screenX-size/2,screenY-size/2,size,size);
        }
      }
    });

    // Crosshair
    ctx.strokeStyle="white"; ctx.lineWidth=2;
    const cx=canvas.width/2, cy=canvas.height/2, size=15;
    ctx.beginPath();
    ctx.moveTo(cx-size,cy); ctx.lineTo(cx+size,cy);
    ctx.moveTo(cx,cy-size); ctx.lineTo(cx,cy+size);
    ctx.stroke();
  }
  requestAnimationFrame(gameLoop);
}
gameLoop();
</script>
</body>
</html>
