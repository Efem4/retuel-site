// ═══════════════════════════════════════════
//  GRID  (hücre yönetimi, yıldız hesabı)
// ═══════════════════════════════════════════
function mkCell(t = T.EMPTY){
  return {type:t, occupied:false, dirty:false, broken:false, gId:null, sId:null};
}

function buildGrid(){
  grid = [];
  for(let f = 0; f < FLOORS; f++) grid[f] = Array.from({length:COLS}, () => mkCell());
  for(let c = 0; c < COLS; c++) grid[0][c] = mkCell(T.CORRIDOR);
  for(let f = 0; f < FLOORS; f++) grid[f][0] = mkCell(T.ELEVATOR);
  grid[0][2] = mkCell(T.RECEPTION); grid[0][3] = mkCell(T.RECEPTION);
  grid[1][1] = mkCell(T.CORRIDOR);  grid[1][2] = mkCell(T.CORRIDOR);
  grid[1][3] = mkCell(T.STANDARD);  grid[1][4] = mkCell(T.STANDARD);  grid[1][5] = mkCell(T.STANDARD);
}

function doAddFloor(){
  if(money < 2000){toast('Yetersiz para! Kat $2,000 tutuyor.'); return;}
  money -= 2000;
  const row = Array.from({length:COLS}, () => mkCell());
  row[0] = mkCell(T.ELEVATOR); grid.push(row); FLOORS++;
  resizeCanvas(); toast(`${FLOORS}. kat eklendi!`);
}

// ── Sayaçlar ──
function countType(type){
  let n = 0;
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++) if(grid[f][c].type === type) n++;
  return n;
}

function countRooms(){
  return countType(T.STANDARD) + countType(T.DELUXE) + countType(T.SUITE);
}

function countActiveFloors(){
  let n = 0;
  for(let f = 0; f < FLOORS; f++){
    const hasRoom = grid[f].some(c => [T.STANDARD,T.DELUXE,T.SUITE,T.RECEPTION,T.RESTAURANT,T.BAR,T.POOL].includes(c.type));
    if(hasRoom) n++;
  }
  return n;
}

// ── Yıldız hesabı ──
function calcStars(){
  if(!findCellType(T.RECEPTION)) return 0;
  const rooms = countRooms();
  const hasRest  = !!findCellType(T.RESTAURANT);
  const hasBar   = !!findCellType(T.BAR);
  const hasPool  = !!findCellType(T.POOL);
  const hasSuite = !!findCellType(T.SUITE);
  const floors   = countActiveFloors();
  if(rooms < 2)  return 0;
  if(rooms < 5)  return 1;
  if(rooms < 8  || !(hasRest || hasBar)) return 2;
  if(rooms < 12 || !hasRest || !hasBar)  return 3;
  if(rooms < 15 || !hasPool || !hasSuite || floors < 3) return 4;
  if(rooms >= 18 && hasPool && hasSuite && hasRest && hasBar && floors >= 4) return 5;
  return 4;
}

// ── Hücre arama yardımcıları ──
function findCellType(type, mustFree=false, mustClean=false, mustWorking=false){
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(cell.type !== type) continue;
    if(mustFree    && cell.occupied) continue;
    if(mustClean   && cell.dirty)    continue;
    if(mustWorking && cell.broken)   continue;
    return [c, f];
  }
  return null;
}

function nearestCell(type, sc, sf, mustFree=false, mustClean=false, mustWorking=false){
  let best = null, bestD = Infinity;
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(cell.type !== type) continue;
    if(mustFree    && cell.occupied) continue;
    if(mustClean   && cell.dirty)    continue;
    if(mustWorking && cell.broken)   continue;
    const d = Math.abs(c - sc) + Math.abs(f - sf);
    if(d < bestD){bestD = d; best = [c, f];}
  }
  return best;
}

function amenityCount(ac, af){
  return guests.filter(g => (g.state === 'at_amenity' || g.state === 'to_amenity') && g.amC === ac && g.amF === af).length;
}

function nearestFreeAmenity(types, sc, sf){
  let best = null, bestD = Infinity;
  for(const type of types){
    const cap = AMENITY_CAP[type] || 99;
    for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
      if(grid[f][c].type !== type) continue;
      if(amenityCount(c, f) >= cap) continue;
      const d = Math.abs(c - sc) + Math.abs(f - sf);
      if(d < bestD){bestD = d; best = [c, f];}
    }
  }
  return best;
}
