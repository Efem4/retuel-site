// ═══════════════════════════════════════════
//  PERSONEL SİSTEMİ
// ═══════════════════════════════════════════
function hireStaff(type){
  const s = {id:staffIdCtr++, type, col:1, floor:0,
    ox:0, oy:0, mt:0, pi:0, path:null,
    spd:0.9 + Math.random() * .3, state:'idle', tC:-1, tF:-1, wt:0};
  staffArr.push(s);
  updateStaffUI();
  if(type === 'repairman')    assignRepairman(s);
  else if(type === 'maid')         assignMaid(s);
  else if(type === 'receptionist') assignReceptionist(s);
  else if(type === 'waiter')       assignWaiter(s);
  toast(`${STAFF_DEF[type].name} işe alındı!`);
}

function updateStaffUI(){
  for(const type of Object.keys(STAFF_DEF)){
    const el = document.getElementById('sc-' + type); if(!el) continue;
    const n = staffArr.filter(s => s.type === type).length;
    el.textContent = n > 0 ? n : ''; el.style.display = n > 0 ? '' : 'none';
  }
}

function assignMaid(s){
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(!cell.dirty || cell.sId !== null) continue;
    const p = bfs(s.col, s.floor, c, f); if(!p) continue;
    cell.sId = s.id; setPath(s, p); s.tC = c; s.tF = f; s.state = 'to_clean'; return;
  }
}

function assignRepairman(s){
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(!cell.broken || cell.sId !== null) continue;
    const p = bfs(s.col, s.floor, c, f); if(!p) continue;
    cell.sId = s.id; setPath(s, p); s.tC = c; s.tF = f; s.state = 'to_repair'; return;
  }
}

function assignReceptionist(s){
  let target = null;
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    if(grid[f][c].type !== T.RECEPTION) continue;
    const taken = staffArr.some(x => x !== s && x.type === 'receptionist' &&
      (x.state === 'to_desk' || x.state === 'at_desk') && x.tC === c && x.tF === f);
    if(!taken){target = [c, f]; break;}
  }
  if(!target) target = nearestCell(T.RECEPTION, s.col, s.floor);
  if(!target) return;
  const p = bfs(s.col, s.floor, target[0], target[1]); if(!p) return;
  setPath(s, p); s.tC = target[0]; s.tF = target[1]; s.state = 'to_desk';
}

function assignWaiter(s){
  for(const type of [T.RESTAURANT, T.BAR]){
    for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
      if(grid[f][c].type !== type) continue;
      const taken = staffArr.some(x => x !== s && x.type === 'waiter' &&
        (x.state === 'to_service' || x.state === 'at_service') && x.tC === c && x.tF === f);
      if(taken) continue;
      const p = bfs(s.col, s.floor, c, f); if(!p) continue;
      setPath(s, p); s.tC = c; s.tF = f; s.state = 'to_service'; s.wt = 40 + Math.random() * 20; return;
    }
  }
  const venue = nearestCell(T.RESTAURANT, s.col, s.floor) || nearestCell(T.BAR, s.col, s.floor);
  if(!venue) return;
  const p = bfs(s.col, s.floor, venue[0], venue[1]); if(!p) return;
  setPath(s, p); s.tC = venue[0]; s.tF = venue[1]; s.state = 'to_service'; s.wt = 40 + Math.random() * 20;
}

function updateStaff(s, dt){
  const done = stepPath(s, dt); if(!done) return;
  if(s.state === 'idle'){
    if(s.type === 'maid')          assignMaid(s);
    if(s.type === 'repairman')     assignRepairman(s);
    if(s.type === 'receptionist')  assignReceptionist(s);
    if(s.type === 'waiter')        assignWaiter(s);
  } else if(s.state === 'to_clean'){
    if(s.col === s.tC && s.floor === s.tF){s.state = 'cleaning'; s.wt = 4;}
    else{s.tC = -1; s.tF = -1; s.state = 'idle';}
  } else if(s.state === 'cleaning'){
    s.wt -= dt;
    if(s.wt <= 0){
      const cell = grid[s.floor]?.[s.col];
      if(cell){cell.dirty = false; if(cell.sId === s.id) cell.sId = null;}
      s.tC = -1; s.tF = -1; s.state = 'idle';
    }
  } else if(s.state === 'to_repair'){
    if(s.col === s.tC && s.floor === s.tF){s.state = 'repairing'; s.wt = 6;}
    else{s.tC = -1; s.tF = -1; s.state = 'idle';}
  } else if(s.state === 'repairing'){
    s.wt -= dt;
    if(s.wt <= 0){
      const cell = grid[s.floor]?.[s.col];
      if(cell){cell.broken = false; if(cell.sId === s.id) cell.sId = null;}
      s.tC = -1; s.tF = -1; s.state = 'idle';
      for(const g of guests) g.happy = Math.min(1, g.happy + 0.05);
      toast('🔧 Tamir tamamlandı! Misafirler rahata erdi.');
    }
  } else if(s.state === 'to_desk'){
    if(s.col === s.tC && s.floor === s.tF){s.state = 'at_desk';}
    else{s.tC = -1; s.tF = -1; s.state = 'idle';}
  } else if(s.state === 'at_desk'){
    if(grid[s.floor]?.[s.col]?.type !== T.RECEPTION){s.tC = -1; s.tF = -1; s.state = 'idle';}
  } else if(s.state === 'to_service'){
    if(s.col === s.tC && s.floor === s.tF){s.state = 'at_service';}
    else{s.tC = -1; s.tF = -1; s.state = 'idle';}
  } else if(s.state === 'at_service'){
    s.wt -= dt;
    for(const g of guests){
      if(g.state === 'at_amenity' && g.amC === s.col && g.amF === s.floor){
        g.happy = Math.min(1, g.happy + 0.006 * dt);
        earn(3 * dt, 'amenity');
      }
    }
    if(s.wt <= 0 || grid[s.floor]?.[s.col]?.type === T.EMPTY){s.tC = -1; s.tF = -1; s.state = 'idle';}
  }
}
