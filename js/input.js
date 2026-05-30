// ═══════════════════════════════════════════
//  INPUT  (fare, klavye, dokunmatik)
// ═══════════════════════════════════════════
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  const {col, floor} = pxToCell(e.clientX - r.left, e.clientY - r.top);
  hovCell = (col >= -GHOST && col < COLS + GHOST && floor >= 0 && floor < FLOORS + GHOST_FLOORS)
    ? {col, floor} : null;
});
canvas.addEventListener('mouseleave', () => hovCell = null);

function handleClick(col, floor){
  if(floor < 0) return;
  if(floor >= FLOORS){
    if(money < 2000){toast('Yetersiz para! Kat $2,000 tutuyor.'); return;}
    showConfirm('🏗 Yeni Kat Ekle', 'Bir kat eklemek $2,000 tutacak. Üst kata yeni alan açılacak.',
      yes => {
        if(!yes) return;
        money -= 2000;
        const row = Array.from({length:COLS}, () => mkCell());
        row[0] = mkCell(T.ELEVATOR); grid.push(row); FLOORS++;
        resizeCanvas(); toast(`${FLOORS}. kat eklendi! -$2,000`);
      }, 'Satın Al');
    return;
  }
  if(col < 0 || col >= COLS){
    if(money < EXPAND_COL_COST){toast(`Yetersiz para! Genişletme $${EXPAND_COL_COST} tutuyor.`); return;}
    const side = col < 0 ? 'left' : 'right';
    const dir  = side === 'left' ? 'Sola' : 'Sağa';
    showConfirm('🏗 Otel Genişlet',
      `${dir} bir sütun eklemek $${EXPAND_COL_COST} tutacak. Yeni alan inşaat için hazır olacak.`,
      yes => {if(!yes) return; money -= EXPAND_COL_COST; expandHotel(side); toast(`Otel genişletildi! -$${EXPAND_COL_COST}`);},
      'Satın Al');
    return;
  }
  const cell = grid[floor][col];
  if(tool === 'cursor'){showCellInfo(col, floor); closeMobSidebar(); return;}
  if(tool === 'demolish'){
    if(cell.type === T.EMPTY) return;
    if(cell.occupied){toast('İçinde biri var!'); return;}
    const refund = Math.floor((DEF[cell.type]?.cost || 0) * .5); money += refund;
    if(cell.sId !== null){const s = staffArr.find(x => x.id === cell.sId); if(s){s.state='idle';s.tC=-1;s.tF=-1;} cell.sId = null;}
    cell.type=T.EMPTY; cell.dirty=false; cell.broken=false; cell.occupied=false; cell.gId=null;
    if(refund) toast(`Yıkıldı — $${refund} geri alındı.`);
    return;
  }
  const def = DEF[tool]; if(!def) return;
  if(money < def.cost){toast(`Yetersiz para! $${def.cost} gerekiyor.`); return;}
  if(cell.occupied){toast('İçinde biri var!'); return;}
  if(cell.type !== T.EMPTY && cell.type !== tool){
    const existing = DEF[cell.type]?.name || cell.type;
    showConfirm(`⚠️ Dikkat`,
      `Bu hücrede "${existing}" var. "${def.name}" ile değiştirmek istiyor musunuz?`,
      yes => {if(!yes) return; money -= def.cost; cell.type=tool; cell.dirty=false; cell.broken=false; toast(`${def.name} inşa edildi!  -$${def.cost}`);}
    );
    return;
  }
  money -= def.cost; cell.type = tool; cell.dirty = false; cell.broken = false;
  toast(`${def.name} inşa edildi!  -$${def.cost}`);
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const {col, floor} = pxToCell(e.clientX - r.left, e.clientY - r.top);
  handleClick(col, floor);
});

let dragging = false;
canvas.addEventListener('mousedown', e => {if(e.button === 0) dragging = true;});
canvas.addEventListener('mouseup',   () => dragging = false);
canvas.addEventListener('mousemove', e => {
  if(!dragging || !DEF[tool] || !hovCell) return;
  const {col, floor} = hovCell;
  if(col < 0 || col >= COLS || floor < 0 || floor >= FLOORS) return;
  const cell = grid[floor][col];
  if(cell.type !== T.EMPTY || cell.occupied || money < DEF[tool].cost) return;
  money -= DEF[tool].cost; cell.type = tool; cell.dirty = false; cell.broken = false;
});

document.addEventListener('keydown', e => {if(e.key === 's' || e.key === 'S') saveGame();});

// ── Dokunmatik ──
let tStartX=0, tStartY=0, tScrollX=0, tScrollY=0, tMoved=false, tLastCell=null;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0]; const area = document.getElementById('canvas-area');
  tStartX=t.clientX; tStartY=t.clientY; tScrollX=area.scrollLeft; tScrollY=area.scrollTop;
  tMoved=false; tLastCell=null;
  const r = canvas.getBoundingClientRect();
  const {col, floor} = pxToCell(t.clientX - r.left, t.clientY - r.top);
  hovCell = (col>=-GHOST&&col<COLS+GHOST&&floor>=0&&floor<FLOORS+GHOST_FLOORS) ? {col,floor} : null;
}, {passive:false});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0]; const dx=t.clientX-tStartX, dy=t.clientY-tStartY;
  if(Math.abs(dx)>6||Math.abs(dy)>6) tMoved=true;
  if(tool === 'cursor'){
    const area=document.getElementById('canvas-area');
    area.scrollLeft=tScrollX-dx; area.scrollTop=tScrollY-dy; hovCell=null; return;
  }
  const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  hovCell=(col>=0&&col<COLS&&floor>=0&&floor<FLOORS)?{col,floor}:null;
  if(!hovCell) return;
  const k=`${col},${floor}`; if(tLastCell===k) return; tLastCell=k;
  const def=DEF[tool]; if(!def) return;
  const cell=grid[floor]?.[col]; if(!cell) return;
  if(cell.type!==T.EMPTY||cell.occupied||money<def.cost) return;
  money-=def.cost; cell.type=tool; cell.dirty=false; cell.broken=false;
  navigator.vibrate&&navigator.vibrate(8);
}, {passive:false});

canvas.addEventListener('touchend', e => {
  hovCell=null;
  if(tMoved) return;
  const t=e.changedTouches[0]; const r=canvas.getBoundingClientRect();
  const{col,floor}=pxToCell(t.clientX-r.left,t.clientY-r.top);
  handleClick(col,floor);
  navigator.vibrate&&navigator.vibrate(12);
}, {passive:false});
