// ═══════════════════════════════════════════
//  GRID  (hücre yönetimi, çok hücreli yapılar, yıldız hesabı)
// ═══════════════════════════════════════════

// isAnchor=true  → asıl hücre (render, logic burada)
// isAnchor=false → uzantı hücre (anchor'a referans verir, kendisi boş çizilir)
function mkCell(t=T.EMPTY, isAnchor=true, anchorC=null, anchorF=null){
  return {type:t, occupied:false, dirty:false, broken:false, gId:null, sId:null,
          isAnchor, anchorC, anchorF};
}

function buildGrid(){
  grid = [];
  for(let f=0; f<FLOORS; f++) grid[f] = Array.from({length:COLS}, ()=>mkCell());
  for(let c=0; c<COLS; c++) grid[0][c] = mkCell(T.CORRIDOR);
  for(let f=0; f<FLOORS; f++) grid[f][0] = mkCell(T.ELEVATOR);
  // Resepsiyon (2×1) — anchor col 2
  placeBuilding(T.RECEPTION, 2, 0);
  // Standart odalar
  grid[1][1] = mkCell(T.CORRIDOR);
  grid[1][2] = mkCell(T.CORRIDOR);
  grid[1][3] = mkCell(T.STANDARD);
  grid[1][4] = mkCell(T.STANDARD);
  grid[1][5] = mkCell(T.STANDARD);
}

function doAddFloor(){
  if(money<2000){toast('Yetersiz para! Kat $2,000 tutuyor.'); return;}
  money -= 2000;
  const row = Array.from({length:COLS}, ()=>mkCell());
  row[0] = mkCell(T.ELEVATOR);
  grid.push(row); FLOORS++;
  resizeCanvas(); toast(`${FLOORS}. kat eklendi!`);
}

// ── Çok hücreli yerleştirme ──
function placeBuilding(type, col, floor){
  const sz = CELL_SIZE[type] || {w:1, h:1};
  // Alan kontrolü
  for(let dy=0; dy<sz.h; dy++) for(let dx=0; dx<sz.w; dx++){
    const c=col+dx, f=floor+dy;
    if(c>=COLS||f>=FLOORS) return false;
    if(grid[f] && grid[f][c] && grid[f][c].type!==T.EMPTY) return false;
  }
  // Anchor hücreyi yerleştir
  grid[floor][col] = mkCell(type, true, null, null);
  // Uzantı hücrelerini yerleştir
  for(let dy=0; dy<sz.h; dy++) for(let dx=0; dx<sz.w; dx++){
    if(dx===0 && dy===0) continue;
    grid[floor+dy][col+dx] = mkCell(type, false, col, floor);
  }
  return true;
}

// Tüm footprint'i sil — {type, cost, ac, af} veya null döner
function removeBuilding(col, floor){
  const cell = grid[floor]?.[col];
  if(!cell || cell.type===T.EMPTY) return null;
  const ac = cell.isAnchor ? col   : cell.anchorC;
  const af = cell.isAnchor ? floor : cell.anchorF;
  const anchor = grid[af]?.[ac]; if(!anchor) return null;
  if(anchor.occupied) return {error:'occupied'};
  const type = anchor.type;
  const sz   = CELL_SIZE[type] || {w:1, h:1};
  const cost = DEF[type]?.cost || 0;
  const sId  = anchor.sId; // personel ref kaydet, temizlemeden önce
  for(let dy=0; dy<sz.h; dy++) for(let dx=0; dx<sz.w; dx++){
    if(grid[af+dy]) grid[af+dy][ac+dx] = mkCell();
  }
  return {type, cost, ac, af, sId};
}

// Herhangi bir hücrenin anchor'ını bul
function getAnchor(col, floor){
  const cell = grid[floor]?.[col]; if(!cell) return null;
  if(cell.isAnchor) return {col, floor, cell};
  if(cell.anchorC===null) return null;
  return {col:cell.anchorC, floor:cell.anchorF, cell:grid[cell.anchorF][cell.anchorC]};
}

// ── Sayaçlar (sadece anchor hücreler sayılır) ──
function countType(type){
  let n=0;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    if(grid[f][c].type===type && grid[f][c].isAnchor) n++;
  }
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

// ── Yıldız hesabı ──
function calcStars(){
  if(!findCellType(T.RECEPTION)) return 0;
  const rooms=countRooms();
  const hasRest =!!findCellType(T.RESTAURANT);
  const hasBar  =!!findCellType(T.BAR);
  const hasPool =!!findCellType(T.POOL);
  const hasSuite=!!findCellType(T.SUITE);
  const floors  =countActiveFloors();
  if(rooms<2)  return 0;
  if(rooms<5)  return 1;
  if(rooms<8  || !(hasRest||hasBar)) return 2;
  if(rooms<12 || !hasRest||!hasBar)  return 3;
  if(rooms<15 || !hasPool||!hasSuite||floors<3) return 4;
  if(rooms>=18&&hasPool&&hasSuite&&hasRest&&hasBar&&floors>=4) return 5;
  return 4;
}

// ── Hücre arama (sadece anchor hücreler) ──
function findCellType(type, mustFree=false, mustClean=false, mustWorking=false){
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(cell.type!==type||!cell.isAnchor) continue;
    if(mustFree    && cell.occupied) continue;
    if(mustClean   && cell.dirty)    continue;
    if(mustWorking && cell.broken)   continue;
    return [c,f];
  }
  return null;
}

function nearestCell(type, sc, sf, mustFree=false, mustClean=false, mustWorking=false){
  let best=null, bestD=Infinity;
  for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
    const cell=grid[f][c];
    if(cell.type!==type||!cell.isAnchor) continue;
    if(mustFree    && cell.occupied) continue;
    if(mustClean   && cell.dirty)    continue;
    if(mustWorking && cell.broken)   continue;
    const d=Math.abs(c-sc)+Math.abs(f-sf);
    if(d<bestD){bestD=d; best=[c,f];}
  }
  return best;
}

function amenityCount(ac, af){
  return guests.filter(g=>(g.state==='at_amenity'||g.state==='to_amenity')&&g.amC===ac&&g.amF===af).length;
}

function nearestFreeAmenity(types, sc, sf){
  let best=null, bestD=Infinity;
  for(const type of types){
    const cap=AMENITY_CAP[type]||99;
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      const cell=grid[f][c];
      if(cell.type!==type||!cell.isAnchor) continue;
      if(amenityCount(c,f)>=cap) continue;
      const d=Math.abs(c-sc)+Math.abs(f-sf);
      if(d<bestD){bestD=d; best=[c,f];}
    }
  }
  return best;
}
