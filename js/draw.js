// ═══════════════════════════════════════════
//  ÇİZİM / RENDER
// ═══════════════════════════════════════════
const BGCOL = {
  [T.EMPTY]:'#fff4ec',     [T.CORRIDOR]:'#f4e2d0',  [T.ELEVATOR]:'#e7dbf6',
  [T.STAIRS]:'#dcefe5',    [T.RECEPTION]:'#dff2e4',  [T.STANDARD]:'#dcebfb',
  [T.DELUXE]:'#e3e7fb',    [T.SUITE]:'#fbeecb',      [T.RESTAURANT]:'#fbe1dd',
  [T.BAR]:'#f8e8cf',       [T.POOL]:'#d6eef3',
};

function drawCell(c, f, cell){
  const {x, y} = cpos(c, f);
  const hov = hovCell && hovCell.col === c && hovCell.floor === f;
  if(cell.type === T.EMPTY){if(hov){ctx.fillStyle='rgba(90,60,40,.08)';ctx.fillRect(x,y,CW,CH);} return;}
  let bg = BGCOL[cell.type] || '#fbeee4';
  if(cell.broken && cell.type === T.ELEVATOR) bg = '#f5cabb';
  ctx.fillStyle = bg; ctx.fillRect(x, y, CW, CH);
  if(cell.type !== T.EMPTY){ctx.save();ctx.beginPath();ctx.rect(x+1,y+1,CW-2,CH-2);ctx.clip();drawDecor(x,y,cell.type);ctx.restore();}
  if(cell.occupied && (cell.type===T.STANDARD||cell.type===T.DELUXE||cell.type===T.SUITE)){
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

function drawDecor(x, y, type){
  switch(type){
    case T.STANDARD: case T.DELUXE: case T.SUITE:{
      const wc = type===T.SUITE?'#fbe7c8':type===T.DELUXE?'#dee7fb':'#e3eefb';
      ctx.fillStyle=wc;ctx.fillRect(x,y,CW,CH);
      const wfc=type===T.SUITE?'#d0a341':type===T.DELUXE?'#86abd2':'#92b4d8';
      const wx1=Math.round(x+CW*.1),wy1=Math.round(y+CH*.14);
      const wwA=Math.round(CW*.34),wwB=Math.round(CW*.3),wh=Math.round(CH*.42);
      ctx.fillStyle=wfc;ctx.fillRect(wx1,wy1,wwA,wh);ctx.fillRect(wx1+wwA+Math.round(CW*.06),wy1,wwB,wh);
      const gc=type===T.SUITE?'rgba(255,200,80,.55)':type===T.DELUXE?'rgba(120,190,255,.5)':'rgba(130,185,255,.42)';
      ctx.fillStyle=gc;ctx.fillRect(wx1+1,wy1+1,wwA-2,wh-2);ctx.fillRect(wx1+wwA+Math.round(CW*.06)+1,wy1+1,wwB-2,wh-2);
      ctx.fillStyle=type===T.SUITE?'#ecd0a0':type===T.DELUXE?'#c6d3e8':'#ccd8ea';
      ctx.fillRect(x,y+CH-Math.round(CH*.2),CW,Math.round(CH*.2));
      break;
    }
    case T.CORRIDOR:{
      ctx.fillStyle='#e7d0bb';ctx.fillRect(x,y+CH-Math.round(CH*.25),CW,Math.round(CH*.25));
      ctx.strokeStyle='rgba(190,150,120,.6)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,y+CH-Math.round(CH*.25));ctx.lineTo(x+CW,y+CH-Math.round(CH*.25));ctx.stroke();
      ctx.fillStyle='rgba(255,215,130,.5)';ctx.beginPath();ctx.arc(x+CW/2,y+3,Math.max(2,CW*.08),0,Math.PI*2);ctx.fill();
      break;
    }
    case T.ELEVATOR:{
      const dw=Math.round((CW-6)/2);
      const lg=ctx.createLinearGradient(x+3,0,x+3+dw,0);
      lg.addColorStop(0,'#cdbcea');lg.addColorStop(1,'#bba6e2');
      ctx.fillStyle=lg;ctx.fillRect(x+3,y+2,dw,CH-4);
      const rg=ctx.createLinearGradient(x+CW/2+1,0,x+CW/2+1+dw,0);
      rg.addColorStop(0,'#bba6e2');rg.addColorStop(1,'#cdbcea');
      ctx.fillStyle=rg;ctx.fillRect(x+CW/2+1,y+2,dw,CH-4);
      ctx.fillStyle='#9a86c4';ctx.fillRect(x+CW/2-1,y+2,2,CH-4);
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
      drawReceptionCounter(x,y);
      ctx.fillStyle='rgba(80,180,255,.3)';ctx.fillRect(Math.round(x+CW/2-6),Math.round(y+CH*.18),12,Math.round(CH*.22));
      ctx.fillStyle='rgba(80,200,255,.15)';ctx.fillRect(Math.round(x+CW/2-7),Math.round(y+CH*.17),14,Math.round(CH*.24));
      break;
    }
    case T.RESTAURANT:{
      [[.08],[.38],[.65]].forEach(([ox])=>{
        ctx.fillStyle='#dd8b7a';ctx.fillRect(Math.round(x+CW*ox),y+4,Math.round(CW*.26),Math.round(CH*.38));
        ctx.fillStyle='rgba(255,80,80,.15)';ctx.fillRect(Math.round(x+CW*ox)+1,y+5,Math.round(CW*.24),Math.round(CH*.2));
      });
      drawRestaurantCounter(x,y);
      break;
    }
    case T.BAR:{
      drawBarCounter(x,y);
      const nb=Math.max(2,Math.round(CW/14));
      for(let i=0;i<nb;i++){
        const bx=Math.round(x+4+i*(CW-8)/nb);
        const bc=['rgba(0,200,80,.5)','rgba(200,120,0,.5)','rgba(100,0,200,.5)','rgba(0,120,200,.5)'][i%4];
        ctx.fillStyle=bc;ctx.fillRect(bx,Math.round(y+CH*.1),Math.max(3,Math.round(CW*.08)),Math.round(CH*.38));
      }
      break;
    }
    case T.POOL:{
      const pg=ctx.createLinearGradient(x,y+CH*.35,x,y+CH);
      pg.addColorStop(0,'#5cc0d2');pg.addColorStop(1,'#3a9cb0');
      ctx.fillStyle=pg;ctx.fillRect(x+3,Math.round(y+CH*.35),CW-6,Math.round(CH*.58));
      ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1;
      const step=Math.max(8,Math.round(CW*.18));
      for(let wx=x+5;wx<x+CW-5;wx+=step){
        ctx.beginPath();ctx.moveTo(wx,Math.round(y+CH*.52));
        ctx.quadraticCurveTo(wx+step/2,Math.round(y+CH*.44),wx+step,Math.round(y+CH*.52));ctx.stroke();
      }
      ctx.fillStyle='#a9d2da';ctx.fillRect(x+3,Math.round(y+CH*.34),CW-6,Math.round(CH*.04));
      break;
    }
  }
}

function drawReceptionCounter(x, y){
  ctx.fillStyle='#3fae6e';ctx.fillRect(x+3,Math.round(y+CH*.45),CW-6,Math.round(CH*.22));
  ctx.fillStyle='#6bd49a';ctx.fillRect(x+3,Math.round(y+CH*.45),CW-6,Math.round(CH*.06));
}
function drawBarCounter(x, y){
  ctx.fillStyle='#cb9c5c';ctx.fillRect(x+3,y+CH-Math.round(CH*.3),CW-6,Math.round(CH*.3));
  ctx.fillStyle='#b9863f';ctx.fillRect(x+3,y+CH-Math.round(CH*.3),CW-6,Math.round(CH*.06));
}
function drawRestaurantCounter(x, y){
  ctx.fillStyle='#dd8b7a';ctx.fillRect(x+3,y+CH-Math.round(CH*.24),CW-6,Math.round(CH*.24));
  ctx.fillStyle='#ecb0a2';ctx.fillRect(x+3,y+CH-Math.round(CH*.24),CW-6,Math.round(CH*.05));
}

const COUNTER_STATION = {
  [T.RECEPTION]:  {voff:-0.12, front:drawReceptionCounter},
  [T.BAR]:        {voff: 0.12, front:drawBarCounter},
  [T.RESTAURANT]: {voff: 0.14, front:drawRestaurantCounter},
};

function drawNeedBars(g){
  const {x, y} = cpos(g.col, g.floor);
  const px=x+CW/2+(g.ox||0), py=y+CH/2+(g.oy||0);
  const bW=MOBILE?14:22,bH=MOBILE?2:3,gap=1,bx=px-bW/2,by=py-(MOBILE?15:24);
  ctx.fillStyle='#2a0a0a';ctx.fillRect(bx,by,bW,bH);
  ctx.fillStyle='#e74c3c';ctx.fillRect(bx,by,bW*g.hunger,bH);
  ctx.fillStyle='#0a0a2a';ctx.fillRect(bx,by+bH+gap,bW,bH);
  ctx.fillStyle='#3498db';ctx.fillRect(bx,by+bH+gap,bW*g.fatigue,bH);
  ctx.fillStyle='#2a1a00';ctx.fillRect(bx,by+(bH+gap)*2,bW,bH);
  ctx.fillStyle='#f39c12';ctx.fillRect(bx,by+(bH+gap)*2,bW*g.entertainment,bH);
}

function drawEntity(e, bodyColor, icon, voff=0, scale=1){
  const {x, y} = cpos(e.col, e.floor);
  const px=x+CW/2+(e.ox||0), py=y+CH/2+(e.oy||0)+voff;
  const big=!MOBILE;
  const hR=(big?5.4:3.7)*scale;
  const bw=hR*1.05, bh=hR*0.95;
  const skin='#FCE0C4';
  const now=performance.now()/1000;
  if(e.bobP===undefined) e.bobP=Math.random()*6.28;
  const resting=(e.state==='in_room'||e.state==='sleeping'||e.state==='at_desk'||e.state==='at_service');
  const bob=Math.sin(now*(resting?2.2:5.6)+e.bobP)*(resting?0.4:(big?1.1:0.6));
  const baseTop=py+hR*0.30;
  const bodyTop=baseTop+bob;
  ctx.fillStyle='rgba(120,80,55,.16)';
  ctx.beginPath();ctx.ellipse(px,baseTop+bh*1.0,bw*0.95,bh*0.32,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bodyColor;
  ctx.beginPath();
  ctx.moveTo(px-bw*0.72,bodyTop+bh);
  ctx.quadraticCurveTo(px-bw*0.98,bodyTop-bh*0.05,px,bodyTop-bh*0.12);
  ctx.quadraticCurveTo(px+bw*0.98,bodyTop-bh*0.05,px+bw*0.72,bodyTop+bh);
  ctx.quadraticCurveTo(px,bodyTop+bh*1.18,px-bw*0.72,bodyTop+bh);
  ctx.closePath();ctx.fill();
  const hy=py-hR*0.58+bob;
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(px,hy,hR,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bodyColor;
  ctx.beginPath();ctx.arc(px,hy,hR,Math.PI*1.04,Math.PI*1.96,false);ctx.closePath();ctx.fill();
  if(big){
    ctx.fillStyle='#5a463c';
    ctx.beginPath();ctx.arc(px-hR*0.36,hy+hR*0.10,1.0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px+hR*0.36,hy+hR*0.10,1.0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,138,138,.55)';
    ctx.beginPath();ctx.arc(px-hR*0.58,hy+hR*0.48,1.15,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px+hR*0.58,hy+hR*0.48,1.15,0,Math.PI*2);ctx.fill();
    const gt=e.guestType;
    if(gt==='vip'){
      ctx.fillStyle='#ffcf4d';
      const cy=hy-hR*0.78,cw=hR*1.25;
      ctx.beginPath();ctx.moveTo(px-cw/2,cy);ctx.lineTo(px-cw/2,cy-hR*0.5);
      ctx.lineTo(px-cw*0.2,cy-hR*0.02);ctx.lineTo(px,cy-hR*0.62);
      ctx.lineTo(px+cw*0.2,cy-hR*0.02);ctx.lineTo(px+cw/2,cy-hR*0.5);
      ctx.lineTo(px+cw/2,cy);ctx.closePath();ctx.fill();
    } else if(gt==='family'){
      ctx.fillStyle='#ff9ec4';
      ctx.beginPath();ctx.ellipse(px,hy-hR*0.62,hR*1.18,hR*0.3,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(px,hy-hR*0.82,hR*0.55,hR*0.38,0,0,Math.PI*2);ctx.fill();
    } else if(gt==='business'){
      ctx.fillStyle='#5b4632';ctx.fillRect(px+bw*0.62,bodyTop+bh*0.3,hR*0.55,hR*0.5);
      ctx.fillStyle='#3a2c20';ctx.fillRect(px+bw*0.62,bodyTop+bh*0.3,hR*0.55,hR*0.12);
    } else if(gt==='tourist'){
      ctx.fillStyle='#d4593c';ctx.fillRect(px-bw*1.02,bodyTop+bh*0.05,hR*0.5,hR*0.8);
    }
  }
  if(icon){ctx.font=`${big?10:8}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,px,hy-hR-7);}
}

// ── Ghost kolonlar / katlar ──
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
    ctx.save();ctx.globalAlpha=(hov?0.9:0.4)*gfade;
    ctx.font=`bold ${sz}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=hov?'#3fae6e':'#bda08a';ctx.fillText('+',x+CW/2,y+CH/2);
    if(hov&&!MOBILE){
      ctx.globalAlpha=0.92;const label=`$${EXPAND_COL_COST}`;const lsz=9;
      ctx.font=`${lsz}px Fredoka, sans-serif`;const tw=ctx.measureText(label).width;
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
      s.col++;if(s.tC>=0) s.tC++;
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
    const{x,y}=cpos(c,gf);const hov=isHovRow&&hovCell.col===c;
    ctx.fillStyle=`rgba(225,200,180,${(baseAlpha*0.5*gfade).toFixed(3)})`;ctx.fillRect(x,y,CW,CH);
    ctx.strokeStyle=`rgba(205,175,150,${(baseAlpha*1.4*gfade).toFixed(3)})`;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,CW-1,CH-1);
    if(hov){ctx.fillStyle='rgba(46,204,113,.08)';ctx.fillRect(x,y,CW,CH);}
  }
  if(innermost){
    const midC=Math.floor(COLS/2);const{x,y}=cpos(midC,gf);
    const sz=Math.max(MOBILE?9:11,Math.round(CH*.35));
    ctx.save();ctx.globalAlpha=(isHovRow?0.9:0.4)*gfade;
    ctx.font=`bold ${sz}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=isHovRow?'#3fae6e':'#bda08a';ctx.fillText('+',x+CW/2,y+CH/2);
    if(isHovRow&&!MOBILE){
      ctx.globalAlpha=0.92;const label='+Kat $2,000';const lsz=9;
      ctx.font=`${lsz}px Fredoka, sans-serif`;const tw=ctx.measureText(label).width;
      const tx=x+CW/2,ty=y-5;
      ctx.fillStyle='rgba(255,250,245,.95)';ctx.fillRect(tx-tw/2-4,ty-lsz-2,tw+8,lsz+4);
      ctx.fillStyle='#2ba37c';ctx.fillText(label,tx,ty-lsz/2+1);
    }
    ctx.restore();
  }
}

// ── Gün/gece döngüsü ──
let _stars = null;
function dayCycle(){
  const p = (gameTime / DAY_LEN) % 1;
  const K = [
    [0.00,[255,214,180],[255,240,228],0.28],
    [0.14,[255,224,205],[255,246,239],0.00],
    [0.40,[201,227,255],[240,250,255],0.00],
    [0.60,[255,201,158],[255,232,210],0.10],
    [0.74,[255,150,120],[255,202,168],0.42],
    [0.86,[120,108,166],[170,150,186],0.82],
    [0.96,[74,66,124],  [118,102,148],0.92],
    [1.00,[255,214,180],[255,240,228],0.28],
  ];
  let i = 0; while(i < K.length-1 && p >= K[i+1][0]) i++;
  const a = K[i], b = K[i+1];
  const f = (p - a[0]) / ((b[0] - a[0]) || 1);
  const mix = (x, y) => `rgb(${Math.round(x[0]+(y[0]-x[0])*f)},${Math.round(x[1]+(y[1]-x[1])*f)},${Math.round(x[2]+(y[2]-x[2])*f)})`;
  return {top:mix(a[1],b[1]), bot:mix(a[2],b[2]), night:a[3]+(b[3]-a[3])*f, p};
}

function dayPhaseLabel(p){
  if(p < 0.14) return '🌅 Şafak';
  if(p < 0.40) return '☀️ Sabah';
  if(p < 0.60) return '🌤️ Öğle';
  if(p < 0.74) return '🌇 İkindi';
  if(p < 0.86) return '🌆 Gün batımı';
  return '🌙 Gece';
}

function render(){
  const BX = ML + GHOST * CW;
  const TY = TOPPAD + GHOST_FLOORS * CH;
  const dc = dayCycle();
  _nightF = dc.night;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, dc.top); skyGrad.addColorStop(1, dc.bot);
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

  if(dc.night > 0.32){
    if(!_stars || _stars.w !== canvas.width){
      _stars = {w:canvas.width, pts:[]};
      for(let i=0;i<70;i++) _stars.pts.push([Math.random(),Math.random()*0.6,0.6+Math.random()*1.1,Math.random()*6.28]);
    }
    const tw=performance.now()/600, band=Math.max(60,TY);
    for(const [sx,sy,sr,sp] of _stars.pts){
      const a=(dc.night-0.32)/0.6*(0.45+0.55*Math.sin(tw+sp));
      ctx.fillStyle=`rgba(255,250,235,${Math.max(0,Math.min(1,a)).toFixed(3)})`;
      ctx.beginPath();ctx.arc(sx*canvas.width,sy*band,sr,0,Math.PI*2);ctx.fill();
    }
  }

  drawGhostCols(); drawGhostFloors();

  const WW = Math.max(3, Math.round(CW * 0.1));
  const built = (c, f) => f>=0&&f<FLOORS&&c>=0&&c<COLS&&grid[f][c].type!==T.EMPTY;

  ctx.strokeStyle='rgba(190,160,135,0.15)';ctx.lineWidth=1;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    if(grid[f][c].type===T.EMPTY){const{x,y}=cpos(c,f);ctx.strokeRect(x+1.5,y+1.5,CW-3,CH-3);}
  }

  ctx.save();
  ctx.shadowColor='rgba(110,75,50,0.32)';ctx.shadowBlur=Math.max(6,CW*0.3);
  ctx.shadowOffsetX=Math.max(2,CW*0.05);ctx.shadowOffsetY=Math.max(4,CW*0.12);
  ctx.fillStyle='#fff7f0';ctx.beginPath();
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    if(grid[f][c].type!==T.EMPTY){const{x,y}=cpos(c,f);ctx.rect(x,y,CW,CH);}
  }
  ctx.fill();ctx.restore();

  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++) drawCell(c,f,grid[f][c]);

  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    if(grid[f][c].type===T.EMPTY) continue;
    const{x,y}=cpos(c,f);
    if(!built(c,f+1)){ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillRect(x,y,CW,2);}
    if(!built(c-1,f)){ctx.fillStyle='rgba(255,255,255,0.38)';ctx.fillRect(x,y,2,CH);}
    if(!built(c+1,f)){ctx.fillStyle='rgba(110,75,50,0.16)'; ctx.fillRect(x+CW-2,y,2,CH);}
    if(!built(c,f-1)){ctx.fillStyle='rgba(110,75,50,0.18)'; ctx.fillRect(x,y+CH-2,CW,2);}
  }

  const flFontSz=Math.max(7,Math.floor(CH*0.3));
  ctx.font=`600 ${flFontSz}px Fredoka, sans-serif`;ctx.textAlign='right';ctx.textBaseline='middle';
  for(let f=0;f<FLOORS;f++){
    const{y}=cpos(0,f);
    ctx.fillStyle=f===0?'#f06b48':'rgba(150,118,98,.78)';
    ctx.fillText(f===0?'G':`${f}`,BX-WW-4,y+CH/2);
  }

  const gy=TY+FLOORS*CH;
  ctx.fillStyle='#f0d6c2';ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,MB);
  ctx.fillStyle='#fff4ec';
  ctx.fillRect(0,gy,BX-WW,MB);
  ctx.fillRect(BX+COLS*CW+WW,gy,canvas.width,MB);
  ctx.fillStyle='#e6c9b2';ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,1);
  const entrX=BX+Math.floor(COLS/2)*CW+CW/2;
  const enFontSz=Math.max(8,Math.floor(MB*0.45));
  ctx.fillStyle='#f06b48';ctx.font=`bold ${enFontSz}px Fredoka, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('▲ GİRİŞ',entrX,gy+MB/2);

  if(dc.night>0.02){
    ctx.fillStyle=`rgba(34,26,62,${(dc.night*0.5).toFixed(3)})`;
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      if(grid[f][c].type!==T.EMPTY){const{x,y}=cpos(c,f);ctx.fillRect(x,y,CW,CH);}
    }
    ctx.fillStyle=`rgba(34,26,62,${(dc.night*0.32).toFixed(3)})`;
    ctx.fillRect(BX-WW,gy,COLS*CW+WW*2,MB);
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      const cell=grid[f][c];
      const lit=(cell.occupied&&(cell.type===T.STANDARD||cell.type===T.DELUXE||cell.type===T.SUITE))
        ||cell.type===T.RECEPTION||cell.type===T.RESTAURANT||cell.type===T.BAR;
      if(!lit) continue;
      const{x,y}=cpos(c,f);
      const gl=ctx.createRadialGradient(x+CW/2,y+CH/2,1,x+CW/2,y+CH/2,CW*0.72);
      gl.addColorStop(0,`rgba(255,206,120,${(dc.night*0.78).toFixed(3)})`);
      gl.addColorStop(1,'rgba(255,206,120,0)');
      ctx.fillStyle=gl;ctx.fillRect(x-2,y-2,CW+4,CH+4);
    }
  }

  if(tool!=='cursor'&&tool!=='demolish') drawBuildPreview();

  const _stationed=[], _roaming=[];
  for(const s of staffArr){
    const atStation=(s.type==='receptionist'&&s.state==='at_desk')||(s.type==='waiter'&&s.state==='at_service');
    (atStation?_stationed:_roaming).push(s);
  }
  for(const s of _stationed){
    const cs=COUNTER_STATION[grid[s.floor]?.[s.col]?.type];
    const icon=s.type==='receptionist'?'💁':'🤵';
    drawEntity(s,STAFF_DEF[s.type].color,icon,cs?cs.voff*CH:0,0.9);
    if(cs){const{x,y}=cpos(s.col,s.floor);cs.front(x,y);}
  }
  for(const g of guests)  drawEntity(g, g.color, guestIcon(g));
  for(const s of _roaming){
    const icon=s.type==='maid'?'🧹':s.type==='receptionist'?'💁':s.type==='repairman'?'🔧':'🤵';
    drawEntity(s, STAFF_DEF[s.type].color, icon);
  }
}
