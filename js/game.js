// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const MOBILE = window.innerWidth <= 768;
const GHOST = MOBILE ? 2 : 3;
const GHOST_FLOORS = 2;
let TOPPAD = 0;          // extra sky filled above the building so the cycle covers the whole screen
let _nightF = 0;         // current night strength (0 day → ~0.9 night); fades the buildable grid hints
const EXPAND_COL_COST = 4000;
const ML_MIN = MOBILE ? 34 : 60;
let ML = ML_MIN;
const MB = MOBILE ? 20 : 38;
let CW = MOBILE ? 24 : 56;
let CH = MOBILE ? 17 : 42;
const DAY_LEN=100, MAX_GUESTS=60, SAVE_KEY='hm_v4';
let COLS = MOBILE ? 12 : 16, FLOORS=5;

const T = {
  EMPTY:'empty', CORRIDOR:'corridor', ELEVATOR:'elevator', STAIRS:'stairs',
  RECEPTION:'reception', STANDARD:'standard', DELUXE:'deluxe', SUITE:'suite',
  RESTAURANT:'restaurant', BAR:'bar', POOL:'pool',
};

const DEF = {
  [T.CORRIDOR]:  {name:'Koridor',       cost:100 },
  [T.ELEVATOR]:  {name:'Asansör',       cost:1500},
  [T.STAIRS]:    {name:'Merdiven',      cost:400 },
  [T.RECEPTION]: {name:'Resepsiyon',    cost:2000},
  [T.STANDARD]:  {name:'Standart Oda', cost:800 },
  [T.DELUXE]:    {name:'Deluxe Oda',   cost:1500},
  [T.SUITE]:     {name:'Suit Oda',      cost:4000},
  [T.RESTAURANT]:{name:'Restoran',      cost:3000},
  [T.BAR]:       {name:'Bar',           cost:2000},
  [T.POOL]:      {name:'Havuz',         cost:6000},
};

const BASE_PRICES = {
  [T.RECEPTION]:40, [T.STANDARD]:90, [T.DELUXE]:170,
  [T.SUITE]:350,    [T.RESTAURANT]:55,[T.BAR]:45, [T.POOL]:90,
};

const STAFF_DEF = {
  receptionist:{name:'Resepsiyoncu',salary:300,color:'#5DADE2'},
  maid:        {name:'Temizlikçi',  salary:200,color:'#A9CCE3'},
  waiter:      {name:'Garson',      salary:250,color:'#FAD7A0'},
  repairman:   {name:'Tamirci',     salary:350,color:'#E59866'},
};

// ── GUEST TYPES ──
const GUEST_TYPES = {
  tourist: {
    icon:'🧳', color:'#27AE60', name:'Turist',
    stayMin:30, stayMax:65,
    roomPref:[T.STANDARD, T.DELUXE],
    hungerRate:0.007, entertainRate:0.006, fatigueRate:0.004,
    priceMult:1.0, minStars:1, weight:5,
  },
  business: {
    icon:'💼', color:'#2980B9', name:'İş İnsanı',
    stayMin:12, stayMax:28,
    roomPref:[T.DELUXE, T.SUITE, T.STANDARD],
    hungerRate:0.011, entertainRate:0.002, fatigueRate:0.007,
    priceMult:1.6, minStars:2, weight:3,
  },
  family: {
    icon:'👨‍👩‍👧', color:'#8E44AD', name:'Aile',
    stayMin:45, stayMax:90,
    roomPref:[T.STANDARD, T.DELUXE],
    hungerRate:0.010, entertainRate:0.009, fatigueRate:0.004,
    priceMult:0.85, minStars:2, weight:3,
  },
  vip: {
    icon:'⭐', color:'#F39C12', name:'VIP',
    stayMin:55, stayMax:110,
    roomPref:[T.SUITE, T.DELUXE],
    hungerRate:0.005, entertainRate:0.005, fatigueRate:0.003,
    priceMult:2.5, minStars:4, weight:1,
  },
};

// Needs thresholds
const HUNGER_THR=0.32, FATIGUE_THR=0.25, ENTERTAIN_THR=0.28;
// Amenity capacity (guests using simultaneously)
const AMENITY_CAP={[T.RESTAURANT]:3,[T.BAR]:2,[T.POOL]:5};

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let money=50000, day=1, gameTime=0, gameSpeed=1;
let tool='corridor';
let grid=[], guests=[], staffArr=[];
let guestIdCtr=0, staffIdCtr=0;
let nextSpawn=6, dailyIncome=0;
let dailyIncomeRoom=0, dailyIncomeAmenity=0, dailyIncomeReception=0;
let demandScore=1;
let reputation=0.5;   // 0‒1: birikimli itibar skoru
let occupancyRate=0;  // 0‒1: anlık doluluk oranı
let hovCell=null, toastTimer=null;
let autoSaveTimer=60;
let prices={...BASE_PRICES};
let hotelStars=0, prevStars=0;
let breakdownTimer=90;

// ═══════════════════════════════════════════
//  GRID
// ═══════════════════════════════════════════
function mkCell(t=T.EMPTY){
  return {type:t, occupied:false, dirty:false, broken:false, gId:null, sId:null};
}

function buildGrid(){
  grid=[];
  for(let f=0;f<FLOORS;f++) grid[f]=Array.from({length:COLS},()=>mkCell());
  for(let c=0;c<COLS;c++) grid[0][c]=mkCell(T.CORRIDOR);
  for(let f=0;f<FLOORS;f++) grid[f][0]=mkCell(T.ELEVATOR);
  grid[0][2]=mkCell(T.RECEPTION); grid[0][3]=mkCell(T.RECEPTION);
  grid[1][1]=mkCell(T.CORRIDOR);  grid[1][2]=mkCell(T.CORRIDOR);
  grid[1][3]=mkCell(T.STANDARD);  grid[1][4]=mkCell(T.STANDARD);  grid[1][5]=mkCell(T.STANDARD);
}

function doAddFloor(){
  if(money<2000){toast('Yetersiz para! Kat $2,000 tutuyor.');return;}
  money-=2000;
  const row=Array.from({length:COLS},()=>mkCell());
  row[0]=mkCell(T.ELEVATOR); grid.push(row); FLOORS++;
  resizeCanvas(); toast(`${FLOORS}. kat eklendi!`);
}

// ═══════════════════════════════════════════
//  HOTEL STARS
// ═══════════════════════════════════════════
function countType(type){
  let n=0;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++) if(grid[f][c].type===type) n++;
  return n;
}

function countRooms(){
  return countType(T.STANDARD)+countType(T.DELUXE)+countType(T.SUITE);
}

function countActiveFloors(){
  let n=0;
  for(let f=0;f<FLOORS;f++){
    const hasRoom=grid[f].some(c=>[T.STANDARD,T.DELUXE,T.SUITE,T.RECEPTION,T.RESTAURANT,T.BAR,T.POOL].includes(c.type));
    if(hasRoom) n++;
  }
  return n;
}

function calcStars(){
  if(!findCellType(T.RECEPTION)) return 0;
  const rooms=countRooms();
  const hasRest=!!findCellType(T.RESTAURANT);
  const hasBar=!!findCellType(T.BAR);
  const hasPool=!!findCellType(T.POOL);
  const hasSuite=!!findCellType(T.SUITE);
  const floors=countActiveFloors();
  if(rooms<2) return 0;
  if(rooms<5) return 1;
  if(rooms<8||(!(hasRest||hasBar))) return 2;
  if(rooms<12||!hasRest||!hasBar) return 3;
  if(rooms<15||!hasPool||!hasSuite||floors<3) return 4;
  if(rooms>=18&&hasPool&&hasSuite&&hasRest&&hasBar&&floors>=4) return 5;
  return 4;
}

// ═══════════════════════════════════════════
//  HOTEL ENGINE
// ═══════════════════════════════════════════
function calcDemandScore(){
  const totalRooms=countRooms();
  if(totalRooms===0) return 0;

  const avgHappy=guests.length>0
    ? guests.reduce((a,g)=>a+g.happy,0)/guests.length
    : 0.65;

  let dirtyRooms=0, brokenRooms=0, cleanFreeRooms=0;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(![T.STANDARD,T.DELUXE,T.SUITE].includes(cell.type)) continue;
    if(cell.dirty) dirtyRooms++;
    else if(cell.broken) brokenRooms++;
    else if(!cell.occupied) cleanFreeRooms++;
  }

  // Fiyat baskısı: base fiyatın ne kadar üstündeyiz
  let pricePressure=0;
  const rTypes=[T.STANDARD,T.DELUXE,T.SUITE];
  for(const rt of rTypes) pricePressure+=((prices[rt]||BASE_PRICES[rt])/BASE_PRICES[rt])-1;
  pricePressure/=rTypes.length;

  // İtibar uzun vadeli talebi taşır
  const repBonus = reputation * 0.25;

  const score=1
    +hotelStars*0.25
    +avgHappy*0.30
    +repBonus
    +Math.min(cleanFreeRooms,10)*0.04
    -dirtyRooms*0.06
    -brokenRooms*0.10
    -pricePressure*0.30;

  return Math.max(0.2, score);
}

// Anlık doluluk oranı
function calcOccupancyRate(){
  let occupied=0, total=0;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if([T.STANDARD,T.DELUXE,T.SUITE].includes(cell.type)){
      total++;
      if(cell.occupied) occupied++;
    }
  }
  return total>0?occupied/total:0;
}

// Misafir ayrılırken itibarı güncelle
function updateReputation(finalHappy){
  // İyi ayrılış → itibar yükselir (1'e doğru yavaşlar)
  // Kötü ayrılış → itibar düşer (0'a doğru yavaşlar)
  let delta=0;
  if(finalHappy>0.65)       delta=+0.04*(1-reputation);
  else if(finalHappy<0.30)  delta=-0.06*reputation;
  reputation=Math.max(0,Math.min(1,reputation+delta));

  // Milestone toastları
  if(reputation>=0.80&&reputation-delta<0.80) toast('⭐ İtibarınız yükseliyor! Misafirler sizi seviyor.');
  if(reputation<=0.25&&reputation-delta>0.25) toast('📉 İtibar düşüyor! Servis kalitesine dikkat edin.');
}

// ═══════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════
function saveGame(silent=false){
  const data={
    v:4, money, day, gameTime, dailyIncome, dailyIncomeRoom, dailyIncomeAmenity, dailyIncomeReception, reputation, FLOORS, COLS, prices,
    grid:grid.map(f=>f.map(c=>({t:c.type,d:c.dirty?1:0,b:c.broken?1:0}))),
    staff:staffArr.map(s=>({type:s.type,col:s.col,floor:s.floor})),
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  if(!silent){toast('💾 Oyun kaydedildi!');flashSave();}else flashSave();
}

function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
  try{
    const d=JSON.parse(raw); if(!d.v||d.v<4) return false;
    money=d.money; day=d.day; gameTime=d.gameTime||0; dailyIncome=d.dailyIncome||0;
    dailyIncomeRoom=d.dailyIncomeRoom||0; dailyIncomeAmenity=d.dailyIncomeAmenity||0; dailyIncomeReception=d.dailyIncomeReception||0;
    reputation=d.reputation??0.5;
    FLOORS=d.FLOORS; COLS=d.COLS; prices={...BASE_PRICES,...(d.prices||{})};
    grid=d.grid.map(f=>f.map(c=>({type:c.t,dirty:c.d===1,broken:c.b===1,occupied:false,gId:null,sId:null})));
    staffArr=[]; guestIdCtr=0; staffIdCtr=0;
    for(const s of(d.staff||[])){
      staffArr.push({id:staffIdCtr++,type:s.type,col:s.col,floor:s.floor,
        ox:0,oy:0,mt:0,pi:0,path:null,spd:0.9+Math.random()*.3,
        state:'idle',tC:-1,tF:-1,wt:0});
    }
    guests=[];
    return true;
  }catch(e){return false;}
}

function newGame(){
  showConfirm('🗑 Yeni Oyun','Mevcut ilerleme silinecek. Emin misin?',yes=>{
    if(!yes) return;
    localStorage.removeItem(SAVE_KEY);
    money=50000; day=1; gameTime=0; dailyIncome=0;
    FLOORS=5; COLS=MOBILE?12:16; prices={...BASE_PRICES};
    guestIdCtr=0; staffIdCtr=0; guests=[]; staffArr=[];
    buildGrid(); resizeCanvas(); updatePriceUI();
    toast('Yeni oyun başladı!');
  });
}

function flashSave(){
  const el=document.getElementById('saveFlash');
  el.style.opacity='1';
  setTimeout(()=>el.style.opacity='0',1800);
}

// ═══════════════════════════════════════════
//  PRICING
// ═══════════════════════════════════════════
let pricingOpen=true;
function togglePricing(){
  pricingOpen=!pricingOpen;
  document.getElementById('price-panel').style.display=pricingOpen?'':'none';
  document.getElementById('price-arrow').textContent=pricingOpen?'▾':'▸';
}
const PRICE_MAP={reception:T.RECEPTION,standard:T.STANDARD,deluxe:T.DELUXE,
  suite:T.SUITE,restaurant:T.RESTAURANT,bar:T.BAR,pool:T.POOL};
const PRICE_MIN={reception:10,standard:20,deluxe:30,suite:50,restaurant:10,bar:10,pool:10};
const PRICE_MAX={reception:200,standard:500,deluxe:800,suite:1500,restaurant:200,bar:150,pool:300};
function chPrice(k,d){
  const t=PRICE_MAP[k]; prices[t]=Math.max(PRICE_MIN[k],Math.min(PRICE_MAX[k],(prices[t]||0)+d));
  updatePriceUI();
}
function updatePriceUI(){
  for(const[k,t]of Object.entries(PRICE_MAP)){
    const el=document.getElementById('pv-'+k); if(el) el.textContent='$'+prices[t];
  }
}

// ═══════════════════════════════════════════
//  CANVAS / COORDS
// ═══════════════════════════════════════════
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
function resizeCanvas(){
  const area=document.getElementById('canvas-area');
  // clientWidth is 0 before first layout — fall back to window.innerWidth
  const areaW=(area&&area.clientWidth>0)?area.clientWidth:window.innerWidth;
  if(MOBILE){
    CW=Math.max(18,Math.floor((areaW-ML_MIN*2)/(COLS+GHOST*2)));
    CH=Math.max(14,Math.round(CW*0.68));
  }
  const cellsW=(COLS+GHOST*2)*CW;
  const idealML=Math.floor((areaW-cellsW)/2);
  ML=Math.max(ML_MIN,idealML);
  const naturalH=(FLOORS+GHOST_FLOORS)*CH+MB;
  const availH=(area&&area.clientHeight>0)?area.clientHeight:naturalH;
  TOPPAD=Math.max(0,availH-naturalH);
  canvas.width=Math.max(areaW,ML+cellsW+ML_MIN);
  canvas.height=naturalH+TOPPAD;
}
function centerView(){
  const area=document.getElementById('canvas-area'); if(!area) return;
  const cellsW=(COLS+GHOST*2)*CW;
  const buildingCenter=ML+cellsW/2;
  area.scrollLeft=Math.max(0,buildingCenter-area.clientWidth/2);
}
window.addEventListener('resize',()=>{resizeCanvas();centerView();});
function cpos(col,floor){ return {x:ML+(GHOST+col)*CW, y:TOPPAD+GHOST_FLOORS*CH+(FLOORS-1-floor)*CH}; }
function pxToCell(px,py){
  return {col:Math.floor((px-ML)/CW)-GHOST, floor:FLOORS-1-Math.floor((py-TOPPAD-GHOST_FLOORS*CH)/CH)};
}

// ═══════════════════════════════════════════
//  PATHFINDING
// ═══════════════════════════════════════════
function walkable(c,f){
  if(c<0||c>=COLS||f<0||f>=FLOORS) return false;
  return grid[f][c].type!==T.EMPTY;
}
function nbrs(c,f){
  const r=[];
  if(walkable(c-1,f)) r.push([c-1,f]);
  if(walkable(c+1,f)) r.push([c+1,f]);
  const cell=grid[f]?.[c];
  // Broken elevator: horizontal only, no vertical
  if((cell?.type===T.ELEVATOR&&!cell.broken)||cell?.type===T.STAIRS){
    if(walkable(c,f-1)) r.push([c,f-1]);
    if(walkable(c,f+1)) r.push([c,f+1]);
  }
  return r;
}
function bfs(sc,sf,ec,ef){
  if(sc===ec&&sf===ef) return [];
  const q=[[[sc,sf],[]]]; const vis=new Set([`${sc},${sf}`]);
  while(q.length){
    const [[c,f],path]=q.shift();
    for(const [nc,nf] of nbrs(c,f)){
      const k=`${nc},${nf}`; if(vis.has(k)) continue; vis.add(k);
      const np=[...path,[nc,nf]];
      if(nc===ec&&nf===ef) return np;
      q.push([[nc,nf],np]);
    }
  }
  return null;
}

// ═══════════════════════════════════════════
//  ENTITY MOVEMENT
// ═══════════════════════════════════════════
function stepPath(e,dt){
  if(!e.path||e.pi>=e.path.length) return true;
  e.mt+=e.spd*dt;
  const[tc,tf]=e.path[e.pi];
  if(e.mt<1){
    const{x:cx,y:cy}=cpos(e.col,e.floor);
    const{x:tx,y:ty}=cpos(tc,tf);
    e.ox=(tx-cx)*e.mt; e.oy=(ty-cy)*e.mt; return false;
  }
  e.col=tc; e.floor=tf; e.ox=0; e.oy=0; e.mt=0; e.pi++;
  return e.pi>=e.path.length;
}
function setPath(e,path){e.path=path;e.pi=0;e.mt=0;e.ox=0;e.oy=0;}

// ═══════════════════════════════════════════
//  NEEDS SYSTEM
// ═══════════════════════════════════════════
function updateNeeds(g,dt){
  const td=GUEST_TYPES[g.guestType]||GUEST_TYPES.tourist;
  const inRoom=g.state==='in_room';

  // İhtiyaçlar akar
  g.hunger       =Math.max(0,g.hunger       -td.hungerRate   *dt);
  g.fatigue      =inRoom?Math.min(1,g.fatigue+0.028*dt):Math.max(0,g.fatigue-td.fatigueRate*dt);
  g.entertainment=Math.max(0,g.entertainment-td.entertainRate*dt);

  // Oda kalitesi (suite > deluxe > standard)
  const romQ=g.romType===T.SUITE?1.0:g.romType===T.DELUXE?0.75:0.5;
  const isBroken=inRoom&&grid[g.romF]?.[g.romC]?.broken;

  // happyTarget: ihtiyaçların ağırlıklı ortalaması + oda kalitesi
  const happyTarget=isBroken?0.10
    :g.hunger*0.35+g.fatigue*0.30+g.entertainment*0.25+romQ*0.10;

  // Yumuşak geçiş — mutluluk ani çökmez, yavaş kayar
  g.happy+=(happyTarget-g.happy)*0.03*dt;
  g.happy=Math.max(0,Math.min(1,g.happy));

  if(g.needCooldown>0) g.needCooldown-=dt;
}

function guestIcon(g){
  const td=GUEST_TYPES[g.guestType]||GUEST_TYPES.tourist;
  if(g.hunger<HUNGER_THR&&(findCellType(T.RESTAURANT)||findCellType(T.BAR))) return '🍽';
  if(g.fatigue<FATIGUE_THR) return '😴';
  if(g.entertainment<ENTERTAIN_THR&&(findCellType(T.POOL)||findCellType(T.BAR))) return '🎮';
  return td.icon;
}

// ═══════════════════════════════════════════
//  BREAKDOWN SYSTEM
// ═══════════════════════════════════════════

// Invalidate any paths that pass through a broken cell so entities re-route
function invalidatePathsThrough(bc,bf){
  for(const g of guests){
    if(g.path?.some(([c,f])=>c===bc&&f===bf)){
      g.path=null; g.pi=0; g.mt=0;
    }
  }
  for(const s of staffArr){
    if(s.path?.some(([c,f])=>c===bc&&f===bf)){
      s.path=null; s.pi=0; s.mt=0; s.state='idle'; s.tC=-1; s.tF=-1;
    }
  }
}

// Immediately wake up idle repairmen
function dispatchRepairmen(){
  for(const s of staffArr){
    if(s.type==='repairman'&&s.state==='idle') assignRepairman(s);
  }
}

function tryBreakdown(){
  // Elevator breakdown
  const elevs=[];
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(cell.type===T.ELEVATOR&&!cell.broken) elevs.push([c,f]);
  }
  if(elevs.length>0&&Math.random()<0.45){
    const [c,f]=elevs[Math.floor(Math.random()*elevs.length)];
    grid[f][c].broken=true;
    invalidatePathsThrough(c,f); // force all entities to re-route immediately
    dispatchRepairmen();
    // Guests on floors above can no longer reach ground — make them anxious
    for(const g of guests){
      if(g.floor>0) g.happy=Math.max(0,g.happy-0.15);
    }
    toast('⚠️ Asansör arızalandı! Üst kattaki misafirler mahsur kaldı!');
    return;
  }
  // Room water leak — empty (unoccupied) rooms only
  const rooms=[];
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if([T.STANDARD,T.DELUXE,T.SUITE].includes(cell.type)&&!cell.broken&&!cell.occupied)
      rooms.push([c,f]);
  }
  if(rooms.length>0&&Math.random()<0.55){
    const [c,f]=rooms[Math.floor(Math.random()*rooms.length)];
    grid[f][c].broken=true;
    dispatchRepairmen();
    toast('⚠️ Oda arızası! Su kaçağı tespit edildi.');
  }
}

// ═══════════════════════════════════════════
//  GUEST SYSTEM
// ═══════════════════════════════════════════
function findCellType(type,mustFree=false,mustClean=false,mustWorking=false){
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(cell.type!==type) continue;
    if(mustFree&&cell.occupied) continue;
    if(mustClean&&cell.dirty) continue;
    if(mustWorking&&cell.broken) continue;
    return [c,f];
  }
  return null;
}

function getSpawnableTypes(){
  const stars=hotelStars;
  const pool=[];
  for(const[key,td] of Object.entries(GUEST_TYPES)){
    if(stars>=td.minStars){
      for(let i=0;i<td.weight;i++) pool.push(key);
    }
  }
  return pool;
}

function guestAcceptsPrice(roomType,priceMult){
  const base=BASE_PRICES[roomType]||90;
  const priceRatio=(prices[roomType]||base)/base;
  // VIP/business toleransı + itibar bonusu (yüksek itibar → %20'ye kadar ek tolerans)
  const repTolerance=priceMult*(1+reputation*0.20);
  const effectiveRatio=priceRatio/repTolerance;
  return Math.random()<Math.max(0.15,Math.min(1,1/effectiveRatio));
}

function spawnGuest(){
  const typePool=getSpawnableTypes(); if(!typePool.length) return;
  const guestType=typePool[Math.floor(Math.random()*typePool.length)];
  const td=GUEST_TYPES[guestType];
  const startCol=Math.floor(COLS/2);
  const rec=nearestCell(T.RECEPTION,startCol,0); if(!rec) return;
  let room=null;
  for(const rt of td.roomPref){
    const r=nearestCell(rt,startCol,0,true,true,true); // free, clean, not broken, nearest
    if(r&&guestAcceptsPrice(rt,td.priceMult)){room=r;break;}
  }
  if(!room) return;
  const path=bfs(startCol,0,rec[0],rec[1]); if(!path) return;
  grid[room[1]][room[0]].occupied=true;
  grid[room[1]][room[0]].gId=guestIdCtr;
  guests.push({
    id:guestIdCtr++, col:startCol, floor:0,
    ox:0,oy:0,mt:0,pi:0, path,
    spd:1.3+Math.random()*.5,
    color:td.color, guestType,
    happy:1.0,
    hunger:0.8+Math.random()*.2,
    fatigue:0.7+Math.random()*.3,
    entertainment:0.7+Math.random()*.3,
    needCooldown:0,
    state:'to_reception',
    recC:rec[0],recF:rec[1],
    romC:room[0],romF:room[1],romType:grid[room[1]][room[0]].type,
    stayFor:td.stayMin+Math.random()*(td.stayMax-td.stayMin),
    stayT:0, waitT:0,
    amC:-1,amF:-1,amNeed:'',returnToRoom:false,
    incomeEarned:false,
  });
}

function earn(amount,cat='misc'){
  money+=amount; dailyIncome+=amount;
  if(cat==='room')      dailyIncomeRoom+=amount;
  else if(cat==='amenity')   dailyIncomeAmenity+=amount;
  else if(cat==='reception') dailyIncomeReception+=amount;
}

function updateGuest(g,dt){
  updateNeeds(g,dt);
  const done=stepPath(g,dt); if(!done) return;
  const td=GUEST_TYPES[g.guestType]||GUEST_TYPES.tourist;

  switch(g.state){
    case 'to_reception':
      if(g.col===g.recC&&g.floor===g.recF){
        g.state='checking_in'; g.waitT=10;
        earn(prices[T.RECEPTION]||40,'reception');
      } else {
        const rec=findCellType(T.RECEPTION);
        if(rec){const p=bfs(g.col,g.floor,rec[0],rec[1]);if(p){setPath(g,p);g.recC=rec[0];g.recF=rec[1];}else g.state='leaving_now';}
        else g.state='leaving_now';
      }
      break;

    case 'checking_in':{
      const hasRec=staffArr.some(s=>s.type==='receptionist'&&s.state==='at_desk');
      g.waitT-=dt*(hasRec?5:1);
      if(!hasRec){
        g.happy=Math.max(0,g.happy-0.012*dt); // gets annoyed waiting
        if(g.happy<0.25){
          // Too annoyed — frees room and leaves
          const cell=grid[g.romF]?.[g.romC];
          if(cell&&cell.gId===g.id){cell.occupied=false;cell.gId=null;}
          const p=bfs(g.col,g.floor,Math.floor(COLS/2),0);
          setPath(g,p||[]); g.state='leaving_now';
          toast('😠 Misafir resepsiyoncu olmadığı için ayrıldı!');
          break;
        }
      }
      if(g.waitT<=0){
        const p=bfs(g.col,g.floor,g.romC,g.romF);
        if(p){setPath(g,p);g.state='to_room';}else g.state='checking_out';
      }
      break;
    }

    case 'to_room':
      if(g.col===g.romC&&g.floor===g.romF){
        g.state='in_room'; g.stayT=g.stayFor;
        g.happy=Math.min(1,g.happy+0.12);
        if(!g.incomeEarned){
          const repMult=0.80+reputation*0.40; // itibar 0→%80, itibar 1→%120 oda geliri
          earn((prices[g.romType]||0)*td.priceMult*repMult,'room');
          g.incomeEarned=true;
        }
      } else {
        const p=bfs(g.col,g.floor,g.romC,g.romF);
        if(p) setPath(g,p); else g.state='checking_out';
      }
      break;

    case 'to_room_return':
      if(g.col===g.romC&&g.floor===g.romF){g.state='in_room';}
      else{const p=bfs(g.col,g.floor,g.romC,g.romF);if(p)setPath(g,p);else g.state='checking_out';}
      break;

    case 'in_room':
      g.stayT-=dt;
      // Leave if room is broken
      if(grid[g.romF]?.[g.romC]?.broken&&g.stayT>5) g.stayT=5;
      if(g.needCooldown<=0){
        if(g.hunger<HUNGER_THR){
          const food=nearestFreeAmenity([T.RESTAURANT,T.BAR],g.col,g.floor);
          if(food){
            const p=bfs(g.col,g.floor,food[0],food[1]);
            if(p){setPath(g,p);g.amC=food[0];g.amF=food[1];g.amNeed='hunger';g.returnToRoom=g.stayT>6;g.state='to_amenity';break;}
            else g.needCooldown=8; // can't reach — elevator broken? wait before retrying
          }
        }
        if(g.entertainment<ENTERTAIN_THR){
          const ent=nearestFreeAmenity([T.POOL,T.BAR],g.col,g.floor);
          if(ent){
            const p=bfs(g.col,g.floor,ent[0],ent[1]);
            if(p){setPath(g,p);g.amC=ent[0];g.amF=ent[1];g.amNeed='entertainment';g.returnToRoom=g.stayT>6;g.state='to_amenity';break;}
            else g.needCooldown=8;
          }
        }
      }
      if(g.stayT<=0) g.state='checking_out';
      break;

    case 'to_amenity':
      if(g.col===g.amC&&g.floor===g.amF){
        g.state='at_amenity'; g.waitT=5+Math.random()*10;
        g.happy=Math.min(1,g.happy+0.18);
        earn((prices[grid[g.floor][g.col].type]||0)*td.priceMult*0.6,'amenity');
      } else {
        g.state=g.returnToRoom?'to_room_return':'checking_out';
      }
      break;

    case 'at_amenity':{
      g.waitT-=dt;
      const hasWaiter=staffArr.some(s=>s.type==='waiter'&&s.state==='at_service'&&s.col===g.amC&&s.floor===g.amF);
      const svcRate=hasWaiter?1.8:1.0;
      if(!hasWaiter) g.happy=Math.max(0,g.happy-0.004*dt); // no service = mild annoyance
      if(g.amNeed==='hunger')        g.hunger        =Math.min(1,g.hunger        +0.18*dt*svcRate);
      if(g.amNeed==='entertainment') g.entertainment =Math.min(1,g.entertainment +0.14*dt*svcRate);
      if(g.waitT<=0){
        g.needCooldown=10;
        if(g.returnToRoom&&g.stayT>0){
          const p=bfs(g.col,g.floor,g.romC,g.romF);
          if(p){setPath(g,p);g.state='to_room_return';}else g.state='checking_out';
        } else g.state='checking_out';
      }
      break;
    }

    case 'checking_out':{
      updateReputation(g.happy); // misafir ayrılırken itibarı güncelle
      const cell=grid[g.romF]?.[g.romC];
      if(cell&&cell.gId===g.id){cell.occupied=false;cell.dirty=true;cell.gId=null;}
      const p=bfs(g.col,g.floor,Math.floor(COLS/2),0);
      setPath(g,p||[]); g.state='leaving_now';
      break;
    }
    case 'leaving_now':
      if(g.floor===0) guests=guests.filter(x=>x.id!==g.id);
      else{const p=bfs(g.col,g.floor,Math.floor(COLS/2),0);if(p)setPath(g,p);else guests=guests.filter(x=>x.id!==g.id);}
      break;
  }
}

// ═══════════════════════════════════════════
//  STAFF SYSTEM
// ═══════════════════════════════════════════
function hireStaff(type){
  const s={id:staffIdCtr++,type,col:1,floor:0,
    ox:0,oy:0,mt:0,pi:0,path:null,
    spd:0.9+Math.random()*.3,state:'idle',tC:-1,tF:-1,wt:0};
  staffArr.push(s);
  updateStaffUI();
  // Immediately dispatch to any pending job
  if(type==='repairman') assignRepairman(s);
  else if(type==='maid') assignMaid(s);
  else if(type==='receptionist') assignReceptionist(s);
  else if(type==='waiter') assignWaiter(s);
  toast(`${STAFF_DEF[type].name} işe alındı!`);
}

function updateStaffUI(){
  for(const type of Object.keys(STAFF_DEF)){
    const el=document.getElementById('sc-'+type); if(!el) continue;
    const n=staffArr.filter(s=>s.type===type).length;
    el.textContent=n>0?n:''; el.style.display=n>0?'':'none';
  }
}

function nearestCell(type,sc,sf,mustFree=false,mustClean=false,mustWorking=false){
  let best=null,bestD=Infinity;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(cell.type!==type) continue;
    if(mustFree&&cell.occupied) continue;
    if(mustClean&&cell.dirty) continue;
    if(mustWorking&&cell.broken) continue;
    const d=Math.abs(c-sc)+Math.abs(f-sf);
    if(d<bestD){bestD=d;best=[c,f];}
  }
  return best;
}

// Count guests currently at or heading to a specific amenity cell
function amenityCount(ac,af){
  return guests.filter(g=>(g.state==='at_amenity'||g.state==='to_amenity')&&g.amC===ac&&g.amF===af).length;
}

// Find nearest amenity with capacity available (types = array like [T.RESTAURANT, T.BAR])
function nearestFreeAmenity(types,sc,sf){
  let best=null,bestD=Infinity;
  for(const type of types){
    const cap=AMENITY_CAP[type]||99;
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      if(grid[f][c].type!==type) continue;
      if(amenityCount(c,f)>=cap) continue;
      const d=Math.abs(c-sc)+Math.abs(f-sf);
      if(d<bestD){bestD=d;best=[c,f];}
    }
  }
  return best;
}

function assignMaid(s){
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(!cell.dirty||cell.sId!==null) continue;
    const p=bfs(s.col,s.floor,c,f); if(!p) continue;
    cell.sId=s.id; setPath(s,p); s.tC=c; s.tF=f; s.state='to_clean'; return;
  }
}

function assignRepairman(s){
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(!cell.broken||cell.sId!==null) continue;
    const p=bfs(s.col,s.floor,c,f); if(!p) continue;
    cell.sId=s.id; setPath(s,p); s.tC=c; s.tF=f; s.state='to_repair'; return;
  }
}

function assignReceptionist(s){
  // Prefer an un-staffed desk; fall back to any desk if all are covered
  let target=null;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    if(grid[f][c].type!==T.RECEPTION) continue;
    const taken=staffArr.some(x=>x!==s&&x.type==='receptionist'&&
      (x.state==='to_desk'||x.state==='at_desk')&&x.tC===c&&x.tF===f);
    if(!taken){target=[c,f];break;}
  }
  if(!target) target=nearestCell(T.RECEPTION,s.col,s.floor);
  if(!target) return;
  const p=bfs(s.col,s.floor,target[0],target[1]); if(!p) return;
  setPath(s,p); s.tC=target[0]; s.tF=target[1]; s.state='to_desk';
}

function assignWaiter(s){
  // Find a venue (restaurant first, then bar) not already covered by another waiter
  for(const type of [T.RESTAURANT,T.BAR]){
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      if(grid[f][c].type!==type) continue;
      const taken=staffArr.some(x=>x!==s&&x.type==='waiter'&&
        (x.state==='to_service'||x.state==='at_service')&&x.tC===c&&x.tF===f);
      if(taken) continue;
      const p=bfs(s.col,s.floor,c,f); if(!p) continue;
      setPath(s,p); s.tC=c; s.tF=f; s.state='to_service'; s.wt=40+Math.random()*20; return;
    }
  }
  // All venues staffed — go to nearest anyway (extra help)
  const venue=nearestCell(T.RESTAURANT,s.col,s.floor)||nearestCell(T.BAR,s.col,s.floor);
  if(!venue) return;
  const p=bfs(s.col,s.floor,venue[0],venue[1]); if(!p) return;
  setPath(s,p); s.tC=venue[0]; s.tF=venue[1]; s.state='to_service'; s.wt=40+Math.random()*20;
}

function updateStaff(s,dt){
  const done=stepPath(s,dt); if(!done) return;
  if(s.state==='idle'){
    if(s.type==='maid')          assignMaid(s);
    if(s.type==='repairman')     assignRepairman(s);
    if(s.type==='receptionist')  assignReceptionist(s);
    if(s.type==='waiter')        assignWaiter(s);
  } else if(s.state==='to_clean'){
    if(s.col===s.tC&&s.floor===s.tF){s.state='cleaning';s.wt=4;}
    else{s.tC=-1;s.tF=-1;s.state='idle';}
  } else if(s.state==='cleaning'){
    s.wt-=dt;
    if(s.wt<=0){
      const cell=grid[s.floor]?.[s.col];
      if(cell){cell.dirty=false;if(cell.sId===s.id)cell.sId=null;}
      s.tC=-1;s.tF=-1;s.state='idle';
    }
  } else if(s.state==='to_repair'){
    if(s.col===s.tC&&s.floor===s.tF){s.state='repairing';s.wt=6;}
    else{s.tC=-1;s.tF=-1;s.state='idle';}
  } else if(s.state==='repairing'){
    s.wt-=dt;
    if(s.wt<=0){
      const cell=grid[s.floor]?.[s.col];
      if(cell){cell.broken=false;if(cell.sId===s.id)cell.sId=null;}
      s.tC=-1;s.tF=-1;s.state='idle';
      // Small happiness recovery for guests when something is fixed
      for(const g of guests) g.happy=Math.min(1,g.happy+0.05);
      toast('🔧 Tamir tamamlandı! Misafirler rahata erdi.');
    }
  } else if(s.state==='to_desk'){
    if(s.col===s.tC&&s.floor===s.tF){s.state='at_desk';}
    else{s.tC=-1;s.tF=-1;s.state='idle';}
  } else if(s.state==='at_desk'){
    if(grid[s.floor]?.[s.col]?.type!==T.RECEPTION){s.tC=-1;s.tF=-1;s.state='idle';}
  } else if(s.state==='to_service'){
    if(s.col===s.tC&&s.floor===s.tF){s.state='at_service';}
    else{s.tC=-1;s.tF=-1;s.state='idle';}
  } else if(s.state==='at_service'){
    s.wt-=dt;
    for(const g of guests){
      if(g.state==='at_amenity'&&g.amC===s.col&&g.amF===s.floor){
        g.happy=Math.min(1,g.happy+0.006*dt);
        earn(3*dt,'amenity');
      }
    }
    if(s.wt<=0||grid[s.floor]?.[s.col]?.type===T.EMPTY){s.tC=-1;s.tF=-1;s.state='idle';}
  }
}

// ═══════════════════════════════════════════
//  RENDERING
// ═══════════════════════════════════════════
const BGCOL={
  [T.EMPTY]:'#fff4ec',[T.CORRIDOR]:'#f4e2d0',[T.ELEVATOR]:'#e7dbf6',
  [T.STAIRS]:'#dcefe5',[T.RECEPTION]:'#dff2e4',[T.STANDARD]:'#dcebfb',
  [T.DELUXE]:'#e3e7fb',[T.SUITE]:'#fbeecb',[T.RESTAURANT]:'#fbe1dd',
  [T.BAR]:'#f8e8cf',[T.POOL]:'#d6eef3',
};

function drawCell(c,f,cell){
  const{x,y}=cpos(c,f);
  const hov=hovCell&&hovCell.col===c&&hovCell.floor===f;
  if(cell.type===T.EMPTY){ if(hov){ctx.fillStyle='rgba(90,60,40,.08)';ctx.fillRect(x,y,CW,CH);} return; }
  let bg=BGCOL[cell.type]||'#fbeee4';
  // Broken elevator gets a slightly different shade
  if(cell.broken&&cell.type===T.ELEVATOR) bg='#f5cabb';
  ctx.fillStyle=bg; ctx.fillRect(x,y,CW,CH);
  if(cell.type!==T.EMPTY){ctx.save();ctx.beginPath();ctx.rect(x+1,y+1,CW-2,CH-2);ctx.clip();drawDecor(x,y,cell.type);ctx.restore();}
  // Warm glow for occupied rooms
  if(cell.occupied&&(cell.type===T.STANDARD||cell.type===T.DELUXE||cell.type===T.SUITE)){
    ctx.fillStyle='rgba(255,170,55,.18)';ctx.fillRect(x,y,CW,CH);
  }
  if(cell.dirty){
    ctx.fillStyle='rgba(178,138,88,.34)';ctx.fillRect(x,y,CW,CH);
    ctx.font=`${MOBILE?8:11}px serif`;ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('🧺',x+CW-2,y+2);
  }
  if(cell.broken){
    ctx.fillStyle='rgba(231,108,90,.24)';ctx.fillRect(x,y,CW,CH);
    ctx.font=`${MOBILE?10:13}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('⚠️',x+CW/2,y+CH/2);
  }
  if(hov){ctx.fillStyle='rgba(90,60,40,.10)';ctx.fillRect(x,y,CW,CH);}
  ctx.strokeStyle='#ecd8c8';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,CW-1,CH-1);
}

function drawDecor(x,y,type){
  switch(type){
    case T.STANDARD:case T.DELUXE:case T.SUITE:{
      // Wall colour
      const wc=type===T.SUITE?'#fbe7c8':type===T.DELUXE?'#dee7fb':'#e3eefb';
      ctx.fillStyle=wc;ctx.fillRect(x,y,CW,CH);
      // Window frame
      const wfc=type===T.SUITE?'#d0a341':type===T.DELUXE?'#86abd2':'#92b4d8';
      const wx1=Math.round(x+CW*.1),wy1=Math.round(y+CH*.14);
      const wwA=Math.round(CW*.34),wwB=Math.round(CW*.3),wh=Math.round(CH*.42);
      ctx.fillStyle=wfc;ctx.fillRect(wx1,wy1,wwA,wh);ctx.fillRect(wx1+wwA+Math.round(CW*.06),wy1,wwB,wh);
      // Glass
      const gc=type===T.SUITE?'rgba(255,200,80,.55)':type===T.DELUXE?'rgba(120,190,255,.5)':'rgba(130,185,255,.42)';
      ctx.fillStyle=gc;ctx.fillRect(wx1+1,wy1+1,wwA-2,wh-2);ctx.fillRect(wx1+wwA+Math.round(CW*.06)+1,wy1+1,wwB-2,wh-2);
      // Floor strip
      ctx.fillStyle=type===T.SUITE?'#ecd0a0':type===T.DELUXE?'#c6d3e8':'#ccd8ea';
      ctx.fillRect(x,y+CH-Math.round(CH*.2),CW,Math.round(CH*.2));
      break;
    }
    case T.CORRIDOR:{
      // Floor planks
      ctx.fillStyle='#e7d0bb';ctx.fillRect(x,y+CH-Math.round(CH*.25),CW,Math.round(CH*.25));
      ctx.strokeStyle='rgba(190,150,120,.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,y+CH-Math.round(CH*.25));ctx.lineTo(x+CW,y+CH-Math.round(CH*.25));ctx.stroke();
      // Ceiling light dot
      ctx.fillStyle='rgba(255,215,130,.5)';ctx.beginPath();ctx.arc(x+CW/2,y+3,Math.max(2,CW*.08),0,Math.PI*2);ctx.fill();
      break;
    }
    case T.ELEVATOR:{
      // Metal doors
      const dw=Math.round((CW-6)/2);
      const lg=ctx.createLinearGradient(x+3,0,x+3+dw,0);
      lg.addColorStop(0,'#cdbcea');lg.addColorStop(1,'#bba6e2');
      ctx.fillStyle=lg;ctx.fillRect(x+3,y+2,dw,CH-4);
      const rg=ctx.createLinearGradient(x+CW/2+1,0,x+CW/2+1+dw,0);
      rg.addColorStop(0,'#bba6e2');rg.addColorStop(1,'#cdbcea');
      ctx.fillStyle=rg;ctx.fillRect(x+CW/2+1,y+2,dw,CH-4);
      // Centre gap
      ctx.fillStyle='#9a86c4';ctx.fillRect(x+CW/2-1,y+2,2,CH-4);
      // Arrow
      const arSz=Math.max(6,Math.round(CH*.3));
      ctx.fillStyle='rgba(108,78,168,.85)';ctx.font=`${arSz}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('↕',x+CW/2,y+CH/2);
      break;
    }
    case T.STAIRS:{
      const steps=Math.max(3,Math.round(CW/12));
      ctx.fillStyle='#9fcbb6';
      for(let i=0;i<steps;i++){
        const sw=(CW-6)/steps;
        ctx.fillRect(x+3+i*sw,Math.round(y+CH*.15+i*(CH*.7/steps)),Math.ceil(sw),Math.max(2,Math.round(CH*.12)));
      }
      break;
    }
    case T.RECEPTION:{
      // Counter
      ctx.fillStyle='#3fae6e';ctx.fillRect(x+3,Math.round(y+CH*.45),CW-6,Math.round(CH*.22));
      ctx.fillStyle='#6bd49a';ctx.fillRect(x+3,Math.round(y+CH*.45),CW-6,Math.round(CH*.06));
      // Monitor glow
      ctx.fillStyle='rgba(80,180,255,.3)';ctx.fillRect(Math.round(x+CW/2-6),Math.round(y+CH*.18),12,Math.round(CH*.22));
      ctx.fillStyle='rgba(80,200,255,.15)';ctx.fillRect(Math.round(x+CW/2-7),Math.round(y+CH*.17),14,Math.round(CH*.24));
      break;
    }
    case T.RESTAURANT:{
      // Tables
      [[.08],[.38],[.65]].forEach(([ox])=>{
        ctx.fillStyle='#dd8b7a';ctx.fillRect(Math.round(x+CW*ox),y+4,Math.round(CW*.26),Math.round(CH*.38));
        ctx.fillStyle='rgba(255,80,80,.15)';ctx.fillRect(Math.round(x+CW*ox)+1,y+5,Math.round(CW*.24),Math.round(CH*.2));
      });
      // Floor
      ctx.fillStyle='#f2d2cb';ctx.fillRect(x,y+CH-Math.round(CH*.22),CW,Math.round(CH*.22));
      break;
    }
    case T.BAR:{
      // Counter
      ctx.fillStyle='#cb9c5c';ctx.fillRect(x+3,y+CH-Math.round(CH*.3),CW-6,Math.round(CH*.3));
      ctx.fillStyle='#b9863f';ctx.fillRect(x+3,y+CH-Math.round(CH*.3),CW-6,Math.round(CH*.06));
      // Bottles with glow
      const nb=Math.max(2,Math.round(CW/14));
      for(let i=0;i<nb;i++){
        const bx=Math.round(x+4+i*(CW-8)/nb);
        const bc=['rgba(0,200,80,.5)','rgba(200,120,0,.5)','rgba(100,0,200,.5)','rgba(0,120,200,.5)'][i%4];
        ctx.fillStyle=bc;ctx.fillRect(bx,Math.round(y+CH*.1),Math.max(3,Math.round(CW*.08)),Math.round(CH*.38));
      }
      break;
    }
    case T.POOL:{
      // Pool water
      const pg=ctx.createLinearGradient(x,y+CH*.35,x,y+CH);
      pg.addColorStop(0,'#5cc0d2');pg.addColorStop(1,'#3a9cb0');
      ctx.fillStyle=pg;ctx.fillRect(x+3,Math.round(y+CH*.35),CW-6,Math.round(CH*.58));
      // Water shimmer lines
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1;
      const step=Math.max(8,Math.round(CW*.18));
      for(let wx=x+5;wx<x+CW-5;wx+=step){
        ctx.beginPath();ctx.moveTo(wx,Math.round(y+CH*.52));
        ctx.quadraticCurveTo(wx+step/2,Math.round(y+CH*.44),wx+step,Math.round(y+CH*.52));ctx.stroke();
      }
      // Pool edge
      ctx.fillStyle='#a9d2da';ctx.fillRect(x+3,Math.round(y+CH*.34),CW-6,Math.round(CH*.04));
      break;
    }
  }
}

function drawNeedBars(g){
  const{x,y}=cpos(g.col,g.floor);
  const px=x+CW/2+(g.ox||0), py=y+CH/2+(g.oy||0);
  const bW=MOBILE?14:22,bH=MOBILE?2:3,gap=1,bx=px-bW/2,by=py-(MOBILE?15:24);
  ctx.fillStyle='#2a0a0a';ctx.fillRect(bx,by,bW,bH);
  ctx.fillStyle='#e74c3c';ctx.fillRect(bx,by,bW*g.hunger,bH);
  ctx.fillStyle='#0a0a2a';ctx.fillRect(bx,by+bH+gap,bW,bH);
  ctx.fillStyle='#3498db';ctx.fillRect(bx,by+bH+gap,bW*g.fatigue,bH);
  ctx.fillStyle='#2a1a00';ctx.fillRect(bx,by+(bH+gap)*2,bW,bH);
  ctx.fillStyle='#f39c12';ctx.fillRect(bx,by+(bH+gap)*2,bW*g.entertainment,bH);
}

function drawEntity(e,bodyColor,icon){
  const{x,y}=cpos(e.col,e.floor);
  const px=x+CW/2+(e.ox||0),py=y+CH/2+(e.oy||0);
  const big=!MOBILE;
  const hR=big?5.4:3.7;            // big chibi head (dominant)
  const bw=hR*1.05, bh=hR*0.95;    // small rounded body
  const skin='#FCE0C4';
  // gentle bob: livelier while walking, calm while resting
  const now=performance.now()/1000;
  if(e.bobP===undefined) e.bobP=Math.random()*6.28;
  const resting=(e.state==='in_room'||e.state==='sleeping');
  const bob=Math.sin(now*(resting?2.2:5.6)+e.bobP)*(resting?0.4:(big?1.1:0.6));
  const baseTop=py+hR*0.30;
  const bodyTop=baseTop+bob;
  // soft shadow (stays on the floor)
  ctx.fillStyle='rgba(120,80,55,.16)';
  ctx.beginPath();ctx.ellipse(px,baseTop+bh*1.0,bw*0.95,bh*0.32,0,0,Math.PI*2);ctx.fill();
  // body — rounded clothing blob
  ctx.fillStyle=bodyColor;
  ctx.beginPath();
  ctx.moveTo(px-bw*0.72,bodyTop+bh);
  ctx.quadraticCurveTo(px-bw*0.98,bodyTop-bh*0.05,px,bodyTop-bh*0.12);
  ctx.quadraticCurveTo(px+bw*0.98,bodyTop-bh*0.05,px+bw*0.72,bodyTop+bh);
  ctx.quadraticCurveTo(px,bodyTop+bh*1.18,px-bw*0.72,bodyTop+bh);
  ctx.closePath();ctx.fill();
  // head — big skin circle
  const hy=py-hR*0.58+bob;
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(px,hy,hR,0,Math.PI*2);ctx.fill();
  // hair / cap on top in clothing colour
  ctx.fillStyle=bodyColor;
  ctx.beginPath();ctx.arc(px,hy,hR,Math.PI*1.04,Math.PI*1.96,false);ctx.closePath();ctx.fill();
  // face + accessories (desktop scale, where it reads)
  if(big){
    ctx.fillStyle='#5a463c';
    ctx.beginPath();ctx.arc(px-hR*0.36,hy+hR*0.10,1.0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px+hR*0.36,hy+hR*0.10,1.0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,138,138,.55)';
    ctx.beginPath();ctx.arc(px-hR*0.58,hy+hR*0.48,1.15,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px+hR*0.58,hy+hR*0.48,1.15,0,Math.PI*2);ctx.fill();
    // ── accessories by guest type ──
    const gt=e.guestType;
    if(gt==='vip'){
      // little gold crown
      ctx.fillStyle='#ffcf4d';
      const cy=hy-hR*0.78, cw=hR*1.25;
      ctx.beginPath();
      ctx.moveTo(px-cw/2,cy);
      ctx.lineTo(px-cw/2,cy-hR*0.5);
      ctx.lineTo(px-cw*0.2,cy-hR*0.02);
      ctx.lineTo(px,cy-hR*0.62);
      ctx.lineTo(px+cw*0.2,cy-hR*0.02);
      ctx.lineTo(px+cw/2,cy-hR*0.5);
      ctx.lineTo(px+cw/2,cy);
      ctx.closePath();ctx.fill();
    } else if(gt==='family'){
      // pink sun hat
      ctx.fillStyle='#ff9ec4';
      ctx.beginPath();ctx.ellipse(px,hy-hR*0.62,hR*1.18,hR*0.3,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(px,hy-hR*0.82,hR*0.55,hR*0.38,0,0,Math.PI*2);ctx.fill();
    } else if(gt==='business'){
      // little briefcase by the side
      ctx.fillStyle='#5b4632';
      ctx.fillRect(px+bw*0.62,bodyTop+bh*0.3,hR*0.55,hR*0.5);
      ctx.fillStyle='#3a2c20';
      ctx.fillRect(px+bw*0.62,bodyTop+bh*0.3,hR*0.55,hR*0.12);
    } else if(gt==='tourist'){
      // tiny backpack
      ctx.fillStyle='#d4593c';
      ctx.fillRect(px-bw*1.02,bodyTop+bh*0.05,hR*0.5,hR*0.8);
    }
  }
  // floating need / status icon above head
  if(icon){ctx.font=`${big?10:8}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,px,hy-hR-7);}
}

function drawGhostCols(){
  for(let gc=-GHOST;gc<0;gc++) drawGhostColumn(gc);
  for(let gc=COLS;gc<COLS+GHOST;gc++) drawGhostColumn(gc);
}

function drawGhostColumn(gc){
  const isLeft=gc<0;
  const distFromBuilding=isLeft?Math.abs(gc)-1:gc-COLS;
  const baseAlpha=Math.max(0.03,0.22-distFromBuilding*0.07);
  const gfade=1-_nightF*0.82;
  const hov=hovCell&&hovCell.col===gc;
  const innermost=distFromBuilding===0;
  for(let f=0;f<FLOORS;f++){
    const{x,y}=cpos(gc,f);
    ctx.fillStyle=`rgba(225,200,180,${(baseAlpha*0.5*gfade).toFixed(3)})`;
    ctx.fillRect(x,y,CW,CH);
    ctx.strokeStyle=`rgba(205,175,150,${(baseAlpha*1.4*gfade).toFixed(3)})`;
    ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,CW-1,CH-1);
    if(hov){ctx.fillStyle='rgba(46,204,113,.08)';ctx.fillRect(x,y,CW,CH);}
  }
  if(innermost){
    const midF=Math.floor(FLOORS/2);
    const{x,y}=cpos(gc,midF);
    const sz=Math.max(MOBILE?9:11,Math.round(CW*.22));
    ctx.save();
    ctx.globalAlpha=(hov?0.9:0.4)*gfade;
    ctx.font=`bold ${sz}px Fredoka, sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=hov?'#3fae6e':'#bda08a';
    ctx.fillText('+',x+CW/2,y+CH/2);
    if(hov&&!MOBILE){
      ctx.globalAlpha=0.92;
      const label=`$${EXPAND_COL_COST}`;
      const lsz=9;ctx.font=`${lsz}px Fredoka, sans-serif`;
      const tw=ctx.measureText(label).width;
      const tx=x+CW/2,ty=y-5;
      ctx.fillStyle='rgba(255,250,245,.95)';ctx.fillRect(tx-tw/2-4,ty-lsz-2,tw+8,lsz+4);
      ctx.fillStyle='#2ba37c';ctx.fillText(label,tx,ty-lsz/2+1);
    }
    ctx.restore();
  }
}

function expandHotel(side){
  COLS++;
  if(side==='right'){
    for(let f=0;f<FLOORS;f++) grid[f].push(mkCell());
  }else{
    for(let f=0;f<FLOORS;f++) grid[f].unshift(mkCell());
    for(const g of guests){
      g.col++;g.romC++;g.recC++;
      if(g.amC>=0) g.amC++;
      if(g.path) g.path=g.path.map(([c,f])=>[c+1,f]);
    }
    for(const s of staffArr){
      s.col++;
      if(s.tC>=0) s.tC++;
      if(s.path) s.path=s.path.map(([c,f])=>[c+1,f]);
    }
  }
  resizeCanvas();
}

function drawBuildPreview(){
  if(!hovCell||!DEF[tool]) return;
  if(hovCell.col<0||hovCell.col>=COLS||hovCell.floor>=FLOORS) return;
  const{col,floor}=hovCell,{x,y}=cpos(col,floor);
  const ok=money>=DEF[tool].cost;
  ctx.fillStyle=ok?'rgba(46,204,113,.25)':'rgba(231,76,60,.25)';ctx.fillRect(x,y,CW,CH);
  ctx.strokeStyle=ok?'#3fae6e':'#e74c3c';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,CW-2,CH-2);
}

function drawGhostFloors(){
  for(let gf=FLOORS;gf<FLOORS+GHOST_FLOORS;gf++) drawGhostFloor(gf);
}

function drawGhostFloor(gf){
  const distFromBuilding=gf-FLOORS;
  const baseAlpha=Math.max(0.03,0.22-distFromBuilding*0.09);
  const gfade=1-_nightF*0.82;
  const innermost=distFromBuilding===0;
  const isHovRow=hovCell&&hovCell.floor===gf;
  for(let c=0;c<COLS;c++){
    const{x,y}=cpos(c,gf);
    const hov=isHovRow&&hovCell.col===c;
    ctx.fillStyle=`rgba(225,200,180,${(baseAlpha*0.5*gfade).toFixed(3)})`;
    ctx.fillRect(x,y,CW,CH);
    ctx.strokeStyle=`rgba(205,175,150,${(baseAlpha*1.4*gfade).toFixed(3)})`;
    ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,CW-1,CH-1);
    if(hov){ctx.fillStyle='rgba(46,204,113,.08)';ctx.fillRect(x,y,CW,CH);}
  }
  if(innermost){
    const midC=Math.floor(COLS/2);
    const{x,y}=cpos(midC,gf);
    const sz=Math.max(MOBILE?9:11,Math.round(CH*.35));
    ctx.save();
    ctx.globalAlpha=(isHovRow?0.9:0.4)*gfade;
    ctx.font=`bold ${sz}px Fredoka, sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=isHovRow?'#3fae6e':'#bda08a';
    ctx.fillText('+',x+CW/2,y+CH/2);
    if(isHovRow&&!MOBILE){
      ctx.globalAlpha=0.92;
      const label='+Kat $2,000';const lsz=9;
      ctx.font=`${lsz}px Fredoka, sans-serif`;
      const tw=ctx.measureText(label).width;
      const tx=x+CW/2,ty=y-5;
      ctx.fillStyle='rgba(255,250,245,.95)';ctx.fillRect(tx-tw/2-4,ty-lsz-2,tw+8,lsz+4);
      ctx.fillStyle='#2ba37c';ctx.fillText(label,tx,ty-lsz/2+1);
    }
    ctx.restore();
  }
}

// ── Day / night cycle ──
let _stars=null;
function dayCycle(){
  const p=(gameTime/DAY_LEN)%1;
  // [pos, topRGB, botRGB, night]
  const K=[
    [0.00,[255,214,180],[255,240,228],0.28], // dawn
    [0.14,[255,224,205],[255,246,239],0.00], // morning
    [0.40,[201,227,255],[240,250,255],0.00], // midday (soft blue)
    [0.60,[255,201,158],[255,232,210],0.10], // afternoon gold
    [0.74,[255,150,120],[255,202,168],0.42], // sunset
    [0.86,[120,108,166],[170,150,186],0.82], // dusk
    [0.96,[74,66,124],[118,102,148],0.92],   // deep night
    [1.00,[255,214,180],[255,240,228],0.28],
  ];
  let i=0; while(i<K.length-1 && p>=K[i+1][0]) i++;
  const a=K[i], b=K[i+1];
  const f=(p-a[0])/((b[0]-a[0])||1);
  const mix=(x,y)=>`rgb(${Math.round(x[0]+(y[0]-x[0])*f)},${Math.round(x[1]+(y[1]-x[1])*f)},${Math.round(x[2]+(y[2]-x[2])*f)})`;
  return { top:mix(a[1],b[1]), bot:mix(a[2],b[2]), night:a[3]+(b[3]-a[3])*f, p };
}
function dayPhaseLabel(p){
  if(p<0.14) return '🌅 Şafak';
  if(p<0.40) return '☀️ Sabah';
  if(p<0.60) return '🌤️ Öğle';
  if(p<0.74) return '🌇 İkindi';
  if(p<0.86) return '🌆 Gün batımı';
  return '🌙 Gece';
}

function render(){
  const BX=ML+GHOST*CW;
  const TY=TOPPAD+GHOST_FLOORS*CH;
  // Sky gradient background — driven by the day/night cycle
  const dc=dayCycle();
  _nightF=dc.night;
  const skyGrad=ctx.createLinearGradient(0,0,0,canvas.height);
  skyGrad.addColorStop(0,dc.top);
  skyGrad.addColorStop(1,dc.bot);
  ctx.fillStyle=skyGrad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // Twinkling stars at night
  if(dc.night>0.32){
    if(!_stars||_stars.w!==canvas.width){
      _stars={w:canvas.width,pts:[]};
      for(let i=0;i<70;i++)_stars.pts.push([Math.random(),Math.random()*0.6,0.6+Math.random()*1.1,Math.random()*6.28]);
    }
    const tw=performance.now()/600, band=Math.max(60,TY);
    for(const[sx,sy,sr,sp]of _stars.pts){
      const a=(dc.night-0.32)/0.6*(0.45+0.55*Math.sin(tw+sp));
      ctx.fillStyle=`rgba(255,250,235,${Math.max(0,Math.min(1,a)).toFixed(3)})`;
      ctx.beginPath();ctx.arc(sx*canvas.width,sy*band,sr,0,Math.PI*2);ctx.fill();
    }
  }

  drawGhostCols();
  drawGhostFloors();

  // ── Built rooms as raised 3D cards floating on the open sky ──
  const WW=Math.max(3,Math.round(CW*0.1));
  const built=(c,f)=> f>=0&&f<FLOORS&&c>=0&&c<COLS&&grid[f][c].type!==T.EMPTY;

  // faint buildable hint on empty interior cells (no fill — sky shows through)
  ctx.strokeStyle='rgba(190,160,135,0.15)';ctx.lineWidth=1;
  for(let f=0;f<FLOORS;f++)for(let c=0;c<COLS;c++){
    if(grid[f][c].type===T.EMPTY){const{x,y}=cpos(c,f);ctx.strokeRect(x+1.5,y+1.5,CW-3,CH-3);}
  }

  // soft drop-shadow under the whole built mass (single union fill → clean silhouette)
  ctx.save();
  ctx.shadowColor='rgba(110,75,50,0.32)';
  ctx.shadowBlur=Math.max(6,CW*0.3);
  ctx.shadowOffsetX=Math.max(2,CW*0.05);
  ctx.shadowOffsetY=Math.max(4,CW*0.12);
  ctx.fillStyle='#fff7f0';
  ctx.beginPath();
  for(let f=0;f<FLOORS;f++)for(let c=0;c<COLS;c++){
    if(grid[f][c].type!==T.EMPTY){const{x,y}=cpos(c,f);ctx.rect(x,y,CW,CH);}
  }
  ctx.fill();
  ctx.restore();

  // the cells themselves (empty cells draw nothing → sky shows through)
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++) drawCell(c,f,grid[f][c]);

  // bevel the exposed edges of the built mass for a 3D pop
  for(let f=0;f<FLOORS;f++)for(let c=0;c<COLS;c++){
    if(grid[f][c].type===T.EMPTY) continue;
    const{x,y}=cpos(c,f);
    if(!built(c,f+1)){ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillRect(x,y,CW,2);}      // top highlight
    if(!built(c-1,f)){ctx.fillStyle='rgba(255,255,255,0.38)';ctx.fillRect(x,y,2,CH);}        // left highlight
    if(!built(c+1,f)){ctx.fillStyle='rgba(110,75,50,0.16)';ctx.fillRect(x+CW-2,y,2,CH);}     // right shade
    if(!built(c,f-1)){ctx.fillStyle='rgba(110,75,50,0.18)';ctx.fillRect(x,y+CH-2,CW,2);}     // bottom shade
  }

  // Floor labels
  const flFontSz=Math.max(7,Math.floor(CH*0.3));
  ctx.font=`600 ${flFontSz}px Fredoka, sans-serif`;ctx.textAlign='right';ctx.textBaseline='middle';
  for(let f=0;f<FLOORS;f++){
    const{y}=cpos(0,f);
    ctx.fillStyle=f===0?'#f06b48':'rgba(150,118,98,.78)';
    ctx.fillText(f===0?'G':`${f}`,BX-WW-4,y+CH/2);
  }

  // Ground strip
  const gy=TY+FLOORS*CH;
  ctx.fillStyle='#f0d6c2';
  ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,MB);
  ctx.fillStyle='#fff4ec';
  ctx.fillRect(0,gy,BX-WW,MB);
  ctx.fillRect(BX+COLS*CW+WW,gy,canvas.width,MB);
  ctx.fillStyle='#e6c9b2';
  ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,1);
  // Entrance marker
  const entrX=BX+Math.floor(COLS/2)*CW+CW/2;
  const enFontSz=Math.max(8,Math.floor(MB*0.45));
  ctx.fillStyle='#f06b48';
  ctx.font=`bold ${enFontSz}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('▲ GİRİŞ',entrX,gy+MB/2);

  // ── Night lighting: darken the building, glow the active windows ──
  if(dc.night>0.02){
    // darken only the built rooms (empty interior keeps showing the night sky)
    ctx.fillStyle=`rgba(34,26,62,${(dc.night*0.5).toFixed(3)})`;
    for(let f=0;f<FLOORS;f++)for(let c=0;c<COLS;c++){
      if(grid[f][c].type!==T.EMPTY){const{x,y}=cpos(c,f);ctx.fillRect(x,y,CW,CH);}
    }
    ctx.fillStyle=`rgba(34,26,62,${(dc.night*0.32).toFixed(3)})`;
    ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,MB);
    for(let f=0;f<FLOORS;f++)for(let c=0;c<COLS;c++){
      const cell=grid[f][c];
      const lit=(cell.occupied&&(cell.type===T.STANDARD||cell.type===T.DELUXE||cell.type===T.SUITE))
        ||cell.type===T.RECEPTION||cell.type===T.RESTAURANT||cell.type===T.BAR;
      if(!lit)continue;
      const{x,y}=cpos(c,f);
      const gl=ctx.createRadialGradient(x+CW/2,y+CH/2,1,x+CW/2,y+CH/2,CW*0.72);
      gl.addColorStop(0,`rgba(255,206,120,${(dc.night*0.78).toFixed(3)})`);
      gl.addColorStop(1,'rgba(255,206,120,0)');
      ctx.fillStyle=gl;ctx.fillRect(x-2,y-2,CW+4,CH+4);
    }
  }

  if(tool!=='cursor'&&tool!=='demolish') drawBuildPreview();
  for(const g of guests){drawEntity(g,g.color,guestIcon(g));}
  for(const s of staffArr){
    const icon=s.type==='maid'?'🧹':s.type==='receptionist'?'💁':s.type==='repairman'?'🔧':'🤵';
    drawEntity(s,STAFF_DEF[s.type].color,icon);
  }
}

// ═══════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════
function updateUI(){
  updateStaffUI();
  document.getElementById('s-money').textContent ='$'+Math.floor(money).toLocaleString();
  document.getElementById('s-guests').textContent =guests.length;
  document.getElementById('s-day').textContent    =day;
  document.getElementById('s-income').textContent ='$'+Math.floor(dailyIncome).toLocaleString();
  document.getElementById('day-bar-fill').style.width=(gameTime/DAY_LEN*100).toFixed(1)+'%';
  const _pl=document.getElementById('day-phase-lbl'); if(_pl) _pl.textContent=dayPhaseLabel((gameTime/DAY_LEN)%1);
  // Hotel stars
  const s=hotelStars;
  document.getElementById('s-stars').textContent='★'.repeat(s)+'☆'.repeat(5-s);
  // Average happiness
  const avg=guests.length?guests.reduce((a,g)=>a+g.happy,0)/guests.length:0;
  const hIcon=avg>0.7?'😊':avg>0.45?'😐':'😠';
  document.getElementById('s-happy').textContent=guests.length?hIcon+' '+Math.round(avg*100)+'%':'—';
  // İtibar ve doluluk — HTML'de element varsa göster
  const repEl=document.getElementById('s-reputation');
  if(repEl){
    const ri=Math.round(reputation*100);
    const rIcon=reputation>0.75?'🌟':reputation>0.45?'⭐':'💫';
    repEl.textContent=rIcon+' '+ri+'%';
  }
  const occEl=document.getElementById('s-occupancy');
  if(occEl) occEl.textContent=Math.round(occupancyRate*100)+'%';

  updateGuestPanel();
}

function toggleGuestPanel(){
  const panel=document.getElementById('guest-panel');
  const stat=document.querySelector('#happy-wrap .stat');
  const open=panel.classList.toggle('open');
  stat.classList.toggle('open',open);
}
document.addEventListener('click',e=>{
  if(!document.getElementById('happy-wrap').contains(e.target)){
    document.getElementById('guest-panel').classList.remove('open');
    document.querySelector('#happy-wrap .stat').classList.remove('open');
  }
});

function updateGuestPanel(){
  const total=guests.length;
  if(!total){
    document.getElementById('gp-count').textContent='👥 0 misafir';
    document.getElementById('gp-avg').textContent='—';
    ['hungry','tired','bored','unhappy'].forEach(k=>{
      document.getElementById('gp-num-'+k).textContent='0';
      document.getElementById('gp-bar-'+k).style.width='0%';
    });
    return;
  }
  const hungry  =guests.filter(g=>g.hunger<HUNGER_THR).length;
  const tired   =guests.filter(g=>g.fatigue<FATIGUE_THR).length;
  const bored   =guests.filter(g=>g.entertainment<ENTERTAIN_THR).length;
  const unhappy =guests.filter(g=>g.happy<0.4).length;
  const avg=guests.reduce((a,g)=>a+g.happy,0)/total;
  document.getElementById('gp-count').textContent=`👥 ${total} misafir`;
  document.getElementById('gp-avg').textContent=(avg>0.7?'😊':avg>0.45?'😐':'😠')+' '+Math.round(avg*100)+'%';
  const pct=n=>Math.round(n/total*100)+'%';
  document.getElementById('gp-num-hungry').textContent=hungry;
  document.getElementById('gp-num-tired').textContent=tired;
  document.getElementById('gp-num-bored').textContent=bored;
  document.getElementById('gp-num-unhappy').textContent=unhappy;
  document.getElementById('gp-bar-hungry').style.width=pct(hungry);
  document.getElementById('gp-bar-tired').style.width=pct(tired);
  document.getElementById('gp-bar-bored').style.width=pct(bored);
  document.getElementById('gp-bar-unhappy').style.width=pct(unhappy);
}

let _confirmCb=null;
function showConfirm(title,msg,cb,yesLabel='Değiştir'){
  document.getElementById('cb-title').textContent=title;
  document.getElementById('cb-msg').textContent=msg;
  document.querySelector('.cb-yes').textContent=yesLabel;
  document.getElementById('confirm-overlay').classList.add('show');
  _confirmCb=cb;
}
function resolveConfirm(yes){
  document.getElementById('confirm-overlay').classList.remove('show');
  if(_confirmCb){_confirmCb(yes);_confirmCb=null;}
}
document.getElementById('confirm-overlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('confirm-overlay')) resolveConfirm(false);
});

let toastT=null;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  if(toastT) clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.remove('show'),3200);
}

function setSpeed(s){
  gameSpeed=s;
  document.querySelectorAll('.sp-btn').forEach(b=>b.classList.remove('on'));
  document.getElementById('sp'+{1:'1',2:'2',4:'3'}[s]).classList.add('on');
}

const TOOL_NAMES={
  cursor:'👆 Seç / Bilgi', demolish:'🔨 Yık  (%50 geri)',
  corridor:'🚶 Koridor  $100',   elevator:'🛗 Asansör  $1,500',
  stairs:'🪜 Merdiven  $400',    reception:'🛎 Resepsiyon  $2,000',
  standard:'🛏 Standart Oda  $800', deluxe:'🛏 Deluxe Oda  $1,500',
  suite:'👑 Suit Oda  $4,000',   restaurant:'🍽 Restoran  $3,000',
  bar:'🍹 Bar  $2,000',          pool:'🏊 Havuz  $6,000',
};
let _tipTimer=null;
function showToolTip(name){
  const el=document.getElementById('tool-tip');
  el.textContent=name; el.classList.add('show');
  if(_tipTimer) clearTimeout(_tipTimer);
  _tipTimer=setTimeout(()=>el.classList.remove('show'),1400);
}

function setTool(t){
  tool=t;
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById('btn-'+t);if(btn)btn.classList.add('active');
  document.querySelectorAll('.mob-btn').forEach(b=>b.classList.remove('active'));
  const mob=document.getElementById('mob-'+t);if(mob)mob.classList.add('active');
  if(TOOL_NAMES[t]) showToolTip(TOOL_NAMES[t]);
}

function showCellInfo(col,floor){
  const cell=grid[floor][col];const def=DEF[cell.type];
  const p=document.getElementById('infopanel');
  if(cell.type===T.EMPTY){p.innerHTML=`<b>Boş Alan</b><br>Kat: ${floor===0?'Zemin':floor}  Sütun: ${col}`;return;}
  p.innerHTML=`<b>${def?.name||cell.type}</b><br>Kat: ${floor===0?'Zemin':floor}<br>
    ${prices[cell.type]?`<span style="color:#2ecc71">💰 $${prices[cell.type]}</span><br>`:''}
    ${cell.occupied?'🔴 Dolu':cell.dirty?'🟡 Kirli':cell.broken?'🔴 Arızalı':'🟢 Hazır'}`;
}

function toggleMobSidebar(){
  const s=document.getElementById('sidebar');
  const open=s.classList.toggle('mob-open');
  document.getElementById('mob-overlay').classList.toggle('show',open);
  if(open) document.getElementById('price-popup').classList.remove('open');
  document.getElementById('mob-menu').classList.toggle('active',open);
}
function closeMobSidebar(){
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
  document.getElementById('mob-menu')?.classList.remove('active');
}
function togglePricePopup(){
  const pp=document.getElementById('price-popup');
  const open=pp.classList.toggle('open');
  document.getElementById('mob-overlay').classList.toggle('show',open);
  if(open){
    document.getElementById('sidebar').classList.remove('mob-open');
    document.getElementById('mob-menu')?.classList.remove('active');
  }
  document.getElementById('mob-price').classList.toggle('active',open);
}
function closeAllPanels(){
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('price-popup').classList.remove('open');
  document.getElementById('mob-overlay').classList.remove('show');
  document.getElementById('mob-menu')?.classList.remove('active');
  document.getElementById('mob-price')?.classList.remove('active');
}

// ═══════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(e.clientX-r.left,e.clientY-r.top);
  hovCell=(col>=-GHOST&&col<COLS+GHOST&&floor>=0&&floor<FLOORS+GHOST_FLOORS)?{col,floor}:null;
});
canvas.addEventListener('mouseleave',()=>hovCell=null);

function handleClick(col,floor){
  if(floor<0) return;
  if(floor>=FLOORS){
    if(money<2000){toast('Yetersiz para! Kat $2,000 tutuyor.');return;}
    showConfirm(
      '🏗 Yeni Kat Ekle',
      'Bir kat eklemek $2,000 tutacak. Üst kata yeni alan açılacak.',
      yes=>{
        if(!yes)return;
        money-=2000;
        const row=Array.from({length:COLS},()=>mkCell());
        row[0]=mkCell(T.ELEVATOR);grid.push(row);FLOORS++;
        resizeCanvas();toast(`${FLOORS}. kat eklendi! -$2,000`);
      },
      'Satın Al'
    );
    return;
  }
  if(col<0||col>=COLS){
    if(money<EXPAND_COL_COST){toast(`Yetersiz para! Genişletme $${EXPAND_COL_COST} tutuyor.`);return;}
    const side=col<0?'left':'right';
    const dir=side==='left'?'Sola':'Sağa';
    showConfirm(
      '🏗 Otel Genişlet',
      `${dir} bir sütun eklemek $${EXPAND_COL_COST} tutacak. Yeni alan inşaat için hazır olacak.`,
      yes=>{if(!yes)return;money-=EXPAND_COL_COST;expandHotel(side);toast(`Otel genişletildi! -$${EXPAND_COL_COST}`);},
      'Satın Al'
    );
    return;
  }
  const cell=grid[floor][col];
  if(tool==='cursor'){showCellInfo(col,floor);closeMobSidebar();return;}
  if(tool==='demolish'){
    if(cell.type===T.EMPTY) return;
    if(cell.occupied){toast('İçinde biri var!');return;}
    const refund=Math.floor((DEF[cell.type]?.cost||0)*.5);money+=refund;
    if(cell.sId!==null){const s=staffArr.find(x=>x.id===cell.sId);if(s){s.state='idle';s.tC=-1;s.tF=-1;}cell.sId=null;}
    cell.type=T.EMPTY;cell.dirty=false;cell.broken=false;cell.occupied=false;cell.gId=null;
    if(refund) toast(`Yıkıldı — $${refund} geri alındı.`);
    return;
  }
  const def=DEF[tool];if(!def) return;
  if(money<def.cost){toast(`Yetersiz para! $${def.cost} gerekiyor.`);return;}
  if(cell.occupied){toast('İçinde biri var!');return;}
  if(cell.type!==T.EMPTY&&cell.type!==tool){
    const existing=DEF[cell.type]?.name||cell.type;
    showConfirm(
      `⚠️ Dikkat`,
      `Bu hücrede "${existing}" var. "${def.name}" ile değiştirmek istiyor musunuz?`,
      yes=>{
        if(!yes) return;
        money-=def.cost;cell.type=tool;cell.dirty=false;cell.broken=false;
        toast(`${def.name} inşa edildi!  -$${def.cost}`);
      }
    );
    return;
  }
  money-=def.cost;cell.type=tool;cell.dirty=false;cell.broken=false;
  toast(`${def.name} inşa edildi!  -$${def.cost}`);
}

canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(e.clientX-r.left,e.clientY-r.top);
  handleClick(col,floor);
});

let dragging=false;
canvas.addEventListener('mousedown',e=>{if(e.button===0)dragging=true;});
canvas.addEventListener('mouseup',()=>dragging=false);
canvas.addEventListener('mousemove',e=>{
  if(!dragging||!DEF[tool]||!hovCell) return;
  const{col,floor}=hovCell;
  if(col<0||col>=COLS||floor<0||floor>=FLOORS) return;
  const cell=grid[floor][col];
  if(cell.type!==T.EMPTY||cell.occupied||money<DEF[tool].cost) return;
  money-=DEF[tool].cost;cell.type=tool;cell.dirty=false;cell.broken=false;
});

document.addEventListener('keydown',e=>{if(e.key==='s'||e.key==='S') saveGame();});

// Touch
let tStartX=0,tStartY=0,tScrollX=0,tScrollY=0,tMoved=false,tLastCell=null;
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  const t=e.touches[0];const area=document.getElementById('canvas-area');
  tStartX=t.clientX;tStartY=t.clientY;tScrollX=area.scrollLeft;tScrollY=area.scrollTop;
  tMoved=false;tLastCell=null;
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  hovCell=(col>=-GHOST&&col<COLS+GHOST&&floor>=0&&floor<FLOORS+GHOST_FLOORS)?{col,floor}:null;
},{passive:false});

canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  const t=e.touches[0];const dx=t.clientX-tStartX,dy=t.clientY-tStartY;
  if(Math.abs(dx)>6||Math.abs(dy)>6) tMoved=true;
  if(tool==='cursor'){
    const area=document.getElementById('canvas-area');
    area.scrollLeft=tScrollX-dx;area.scrollTop=tScrollY-dy;hovCell=null;return;
  }
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  hovCell=(col>=0&&col<COLS&&floor>=0&&floor<FLOORS)?{col,floor}:null;
  if(!hovCell) return;
  const k=`${col},${floor}`;if(tLastCell===k) return;tLastCell=k;
  const def=DEF[tool];if(!def) return;
  const cell=grid[floor]?.[col];if(!cell) return;
  if(cell.type!==T.EMPTY||cell.occupied||money<def.cost) return;
  money-=def.cost;cell.type=tool;cell.dirty=false;cell.broken=false;
  navigator.vibrate&&navigator.vibrate(8);
},{passive:false});

canvas.addEventListener('touchend',e=>{
  hovCell=null;
  if(tMoved) return;
  const t=e.changedTouches[0];const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  handleClick(col,floor);
  navigator.vibrate&&navigator.vibrate(12);
},{passive:false});

// ═══════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════
let lastTs=0;
const loaded=loadGame();
if(!loaded) buildGrid();
resizeCanvas(); setTool('corridor'); updatePriceUI(); centerView();
if(loaded) toast(`💾 Kayıt yüklendi — Gün ${day}`);
// Re-run after first paint so area.clientWidth is correct
requestAnimationFrame(()=>{resizeCanvas();centerView();});

function loop(ts){
  const rawDt=Math.min((ts-lastTs)/1000,.12);
  const dt=rawDt*gameSpeed;
  lastTs=ts;

  gameTime+=dt;
  hotelStars=calcStars();
  if(hotelStars>prevStars&&prevStars>=0){
    toast(`⭐ Tebrikler! Otel ${'★'.repeat(hotelStars)}${'☆'.repeat(5-hotelStars)} oldu!`);
  }
  prevStars=hotelStars;

  // ── ENGINE: her frame hesapla ──
  demandScore=calcDemandScore();
  occupancyRate=calcOccupancyRate();

  // Day change
  if(gameTime>=DAY_LEN){
    gameTime-=DAY_LEN; day++;
    const sal=staffArr.reduce((t,s)=>t+(STAFF_DEF[s.type]?.salary||0),0);
    money-=sal;
    // Gün sonu gelir raporu
    const r=Math.floor(dailyIncomeRoom), a=Math.floor(dailyIncomeAmenity), rc=Math.floor(dailyIncomeReception);
    const net=r+a+rc-sal;
    if(money<0) toast(`📅 Gün ${day} · ⚠️ Açık! Oda $${r} · Servis $${a} · Personel -$${sal}`);
    else        toast(`📅 Gün ${day} · 🏨$${r} · 🍽$${a} · 🛎$${rc} · Net ${net>=0?'+':''}$${net}`);
    dailyIncome=0; dailyIncomeRoom=0; dailyIncomeAmenity=0; dailyIncomeReception=0;
  }

  // Auto-save
  autoSaveTimer-=dt;
  if(autoSaveTimer<=0){autoSaveTimer=60;saveGame(true);}

  // ── ENGINE: Dinamik arıza — doluluk ve oda sayısına göre ──
  breakdownTimer-=dt;
  if(breakdownTimer<=0){
    const occupied=guests.filter(g=>g.romC>=0).length;
    const repairmen=staffArr.filter(s=>s.type==='repairman').length;
    const interval=Math.max(30,90-occupied*1.5-countRooms()*0.3+repairmen*8)+Math.random()*30;
    breakdownTimer=interval;
    if(countRooms()>2) tryBreakdown();
  }

  // ── ENGINE: demandScore bazlı spawn ──
  nextSpawn-=dt;
  if(nextSpawn<=0&&guests.length<MAX_GUESTS&&hotelStars>0){
    const spawnInterval=Math.max(2.5,12/demandScore);
    nextSpawn=spawnInterval+Math.random()*3;
    spawnGuest();
    // Yüksek talep → grup gelişi
    if(demandScore>=1.5&&Math.random()<0.28&&guests.length<MAX_GUESTS) spawnGuest();
    if(demandScore>=2.0&&Math.random()<0.15&&guests.length<MAX_GUESTS) spawnGuest();
  }

  for(const g of [...guests]) updateGuest(g,dt);
  for(const s of staffArr)    updateStaff(s,dt);

  render(); updateUI();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);