// ═══════════════════════════════════════════
//  INPUT  (fare, klavye, dokunmatik)
// ═══════════════════════════════════════════
canvas.addEventListener('mousemove', e => {
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(e.clientX-r.left,e.clientY-r.top);
  hovCell=(col>=-GHOST&&col<COLS+GHOST&&floor>=0&&floor<FLOORS+GHOST_FLOORS)?{col,floor}:null;
});
canvas.addEventListener('mouseleave', ()=>hovCell=null);

function handleClick(col, floor){
  if(floor<0) return;

  // Ghost kat (üst) → kat ekle
  if(floor>=FLOORS){
    if(FLOORS >= MAX_FLOORS){toast(`Maksimum ${MAX_FLOORS} kata ulaşıldı!`); return;}
    if(money<2000){toast('Yetersiz para! Kat $2,000 tutuyor.'); return;}
    showConfirm('🏗 Yeni Kat Ekle','Bir kat eklemek $2,000 tutacak.',yes=>{
      if(!yes) return;
      money-=2000;
      const row=Array.from({length:COLS},()=>mkCell());
      row[0]=mkCell(T.ELEVATOR); grid.push(row); FLOORS++;
      resizeCanvas(); toast(`${FLOORS}. kat eklendi! -$2,000`);
    },'Satın Al');
    return;
  }

  // Ghost kolon (yan) → genişlet
  if(col<0||col>=COLS){
    if(COLS >= MAX_COLS){toast(`Maksimum ${MAX_COLS} sütuna ulaşıldı!`); return;}
    if(money<EXPAND_COL_COST){toast(`Yetersiz para! Genişletme $${EXPAND_COL_COST} tutuyor.`); return;}
    const side=col<0?'left':'right';
    const dir =side==='left'?'Sola':'Sağa';
    showConfirm('🏗 Otel Genişlet',
      `${dir} bir sütun eklemek $${EXPAND_COL_COST} tutacak.`,
      yes=>{if(!yes)return; money-=EXPAND_COL_COST; expandHotel(side); toast(`Otel genişletildi! -$${EXPAND_COL_COST}`);},
      'Satın Al');
    return;
  }

  const cell=grid[floor][col];

  // Cursor: bilgi göster (uzantı hücreye tıklanmışsa anchor'a yönlendir)
  if(tool==='cursor'){
    const anchor=getAnchor(col,floor);
    if(anchor) showCellInfo(anchor.col, anchor.floor);
    closeMobSidebar(); return;
  }

  // Yık
  if(tool==='demolish'){
    if(cell.type===T.EMPTY) return;
    const anchor=getAnchor(col,floor); if(!anchor) return;
    if(anchor.cell.occupied){toast('İçinde biri var!'); return;}
    // Personel ref temizle
    if(anchor.cell.sId!==null){
      const s=staffArr.find(x=>x.id===anchor.cell.sId);
      if(s){s.state='idle'; s.tC=-1; s.tF=-1;}
    }
    const refund=Math.floor((DEF[anchor.cell.type]?.cost||0)*.5);
    money+=refund;
    const sz=CELL_SIZE[anchor.cell.type]||{w:1,h:1};
    for(let dy=0;dy<sz.h;dy++) for(let dx=0;dx<sz.w;dx++){
      if(grid[anchor.floor+dy]) grid[anchor.floor+dy][anchor.col+dx]=mkCell();
    }
    if(refund) toast(`Yıkıldı — $${refund} geri alındı.`);
    return;
  }

  // İnşa et
  const def=DEF[tool]; if(!def) return;
  if(money<def.cost){toast(`Yetersiz para! $${def.cost} gerekiyor.`); return;}

  const sz=CELL_SIZE[tool]||{w:1,h:1};
  // Footprint kontrolü
  let hasObstacle=false;
  for(let dy=0;dy<sz.h;dy++) for(let dx=0;dx<sz.w;dx++){
    const c=col+dx, f=floor+dy;
    if(c>=COLS||f>=FLOORS||grid[f]?.[c]?.type!==T.EMPTY){hasObstacle=true; break;}
  }

  if(hasObstacle){
    // Tümü aynı tipte mi → zaten var
    const existing=cell.isAnchor?cell.type:(grid[cell.anchorF]?.[cell.anchorC]?.type);
    if(existing===tool) return;
    toast(`${sz.w>1?sz.w+'×1 alan':'Alan'} gerekiyor — önce yıkın.`);
    return;
  }

  money-=def.cost;
  placeBuilding(tool, col, floor);
  const needsCorridor=[T.STANDARD,T.DELUXE,T.SUITE].includes(tool);
  if(needsCorridor && !hasCorridorAccess(col,floor)){
    toast(`${def.name} inşa edildi — ⚠️ koridor bağlantısı gerekli! -$${def.cost}`);
  } else {
    toast(`${def.name} inşa edildi! -$${def.cost}`);
  }
}

canvas.addEventListener('click', e=>{
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(e.clientX-r.left,e.clientY-r.top);
  handleClick(col,floor);
});

// Fare sürükle — sadece 1×1 araçlar için
let dragging=false;
canvas.addEventListener('mousedown', e=>{if(e.button===0) dragging=true;});
canvas.addEventListener('mouseup',   ()=>dragging=false);
canvas.addEventListener('mousemove', e=>{
  if(!dragging||!DEF[tool]||!hovCell) return;
  const{col,floor}=hovCell;
  if(col<0||col>=COLS||floor<0||floor>=FLOORS) return;
  const sz=CELL_SIZE[tool]||{w:1,h:1};
  if(sz.w>1||sz.h>1) return; // çok hücreli araçlar sürükle ile konmaz
  const cell=grid[floor][col];
  if(cell.type!==T.EMPTY||cell.occupied||money<DEF[tool].cost) return;
  money-=DEF[tool].cost;
  grid[floor][col]=mkCell(tool,true,null,null);
});

document.addEventListener('keydown', e=>{if(e.key==='s'||e.key==='S') saveGame();});

// ── Dokunmatik ──
let tStartX=0,tStartY=0,tScrollX=0,tScrollY=0,tMoved=false,tLastCell=null;
canvas.addEventListener('touchstart', e=>{
  e.preventDefault();
  const t=e.touches[0]; const area=document.getElementById('canvas-area');
  tStartX=t.clientX; tStartY=t.clientY; tScrollX=area.scrollLeft; tScrollY=area.scrollTop;
  tMoved=false; tLastCell=null;
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  hovCell=(col>=-GHOST&&col<COLS+GHOST&&floor>=0&&floor<FLOORS+GHOST_FLOORS)?{col,floor}:null;
},{passive:false});

canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  const t=e.touches[0]; const dx=t.clientX-tStartX, dy=t.clientY-tStartY;
  if(Math.abs(dx)>6||Math.abs(dy)>6) tMoved=true;
  if(tool==='cursor'){
    const area=document.getElementById('canvas-area');
    area.scrollLeft=tScrollX-dx; area.scrollTop=tScrollY-dy; hovCell=null; return;
  }
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  hovCell=(col>=0&&col<COLS&&floor>=0&&floor<FLOORS)?{col,floor}:null;
  if(!hovCell) return;
  const k=`${col},${floor}`; if(tLastCell===k) return; tLastCell=k;
  const def=DEF[tool]; if(!def) return;
  const sz=CELL_SIZE[tool]||{w:1,h:1};
  if(sz.w>1||sz.h>1) return;
  const cell=grid[floor]?.[col]; if(!cell) return;
  if(cell.type!==T.EMPTY||cell.occupied||money<def.cost) return;
  money-=def.cost; grid[floor][col]=mkCell(tool,true,null,null);
  navigator.vibrate&&navigator.vibrate(8);
},{passive:false});

canvas.addEventListener('touchend', e=>{
  hovCell=null;
  if(tMoved) return;
  const t=e.changedTouches[0]; const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  handleClick(col,floor);
  navigator.vibrate&&navigator.vibrate(12);
},{passive:false});
