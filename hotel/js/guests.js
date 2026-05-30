// ═══════════════════════════════════════════
//  NEEDS SİSTEMİ
// ═══════════════════════════════════════════
function updateNeeds(g, dt){
  const td = GUEST_TYPES[g.guestType] || GUEST_TYPES.tourist;
  const inRoom = g.state === 'in_room';

  g.hunger        = Math.max(0, g.hunger        - td.hungerRate    * dt);
  g.fatigue       = inRoom ? Math.min(1, g.fatigue + 0.028 * dt) : Math.max(0, g.fatigue - td.fatigueRate * dt);
  g.entertainment = Math.max(0, g.entertainment - td.entertainRate * dt);

  const romQ = g.romType === T.SUITE ? 1.0 : g.romType === T.DELUXE ? 0.75 : 0.5;
  const isBroken = inRoom && grid[g.romF]?.[g.romC]?.broken;

  const happyTarget = isBroken ? 0.10
    : g.hunger * 0.35 + g.fatigue * 0.30 + g.entertainment * 0.25 + romQ * 0.10;

  g.happy += (happyTarget - g.happy) * 0.03 * dt;
  g.happy  = Math.max(0, Math.min(1, g.happy));

  if(g.needCooldown > 0) g.needCooldown -= dt;
}

function guestIcon(g){
  const td = GUEST_TYPES[g.guestType] || GUEST_TYPES.tourist;
  if(g.hunger < HUNGER_THR && (findCellType(T.RESTAURANT) || findCellType(T.BAR))) return '🍽';
  if(g.fatigue < FATIGUE_THR) return '😴';
  if(g.entertainment < ENTERTAIN_THR && (findCellType(T.POOL) || findCellType(T.BAR))) return '🎮';
  return td.icon;
}

// ═══════════════════════════════════════════
//  ARIZA SİSTEMİ
// ═══════════════════════════════════════════
function invalidatePathsThrough(bc, bf){
  for(const g of guests){
    if(g.path?.some(([c, f]) => c === bc && f === bf)){
      g.path = null; g.pi = 0; g.mt = 0;
    }
  }
  for(const s of staffArr){
    if(s.path?.some(([c, f]) => c === bc && f === bf)){
      s.path = null; s.pi = 0; s.mt = 0; s.state = 'idle'; s.tC = -1; s.tF = -1;
    }
  }
}

function dispatchRepairmen(){
  for(const s of staffArr){
    if(s.type === 'repairman' && s.state === 'idle') assignRepairman(s);
  }
}

function tryBreakdown(){
  // Asansör arızası
  const elevs = [];
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(cell.type === T.ELEVATOR && !cell.broken) elevs.push([c, f]);
  }
  if(elevs.length > 0 && Math.random() < 0.45){
    const [c, f] = elevs[Math.floor(Math.random() * elevs.length)];
    grid[f][c].broken = true;
    invalidatePathsThrough(c, f);
    dispatchRepairmen();
    for(const g of guests){ if(g.floor > 0) g.happy = Math.max(0, g.happy - 0.15); }
    toast('⚠️ Asansör arızalandı! Üst kattaki misafirler mahsur kaldı!');
    return;
  }
  // Oda su kaçağı — sadece boş odalar
  const rooms = [];
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if([T.STANDARD, T.DELUXE, T.SUITE].includes(cell.type) && !cell.broken && !cell.occupied)
      rooms.push([c, f]);
  }
  if(rooms.length > 0 && Math.random() < 0.55){
    const [c, f] = rooms[Math.floor(Math.random() * rooms.length)];
    grid[f][c].broken = true;
    dispatchRepairmen();
    toast('⚠️ Oda arızası! Su kaçağı tespit edildi.');
  }
}

// ═══════════════════════════════════════════
//  MİSAFİR SİSTEMİ
// ═══════════════════════════════════════════
function getSpawnableTypes(){
  const stars = hotelStars;
  const pool = [];
  for(const [key, td] of Object.entries(GUEST_TYPES)){
    if(stars >= td.minStars){
      for(let i = 0; i < td.weight; i++) pool.push(key);
    }
  }
  return pool;
}

function guestAcceptsPrice(roomType, priceMult){
  const base = BASE_PRICES[roomType] || 90;
  const priceRatio = (prices[roomType] || base) / base;
  const effectiveRatio = priceRatio / priceMult;
  return Math.random() < Math.max(0.15, Math.min(1, 1 / effectiveRatio));
}

function spawnGuest(){
  const typePool = getSpawnableTypes(); if(!typePool.length) return;
  const guestType = typePool[Math.floor(Math.random() * typePool.length)];
  const td = GUEST_TYPES[guestType];
  const startCol = Math.floor(COLS / 2);
  const rec = nearestCell(T.RECEPTION, startCol, 0); if(!rec) return;
  const pathToRec = bfs(startCol, 0, rec[0], rec[1]); if(!pathToRec) return;
  let room = null;
  for(const rt of td.roomPref){
    if(!guestAcceptsPrice(rt, td.priceMult)) continue;
    let bestRoom=null, bestD=Infinity;
    for(let f=0;f<FLOORS;f++) for(let c=0;c<COLS;c++){
      const cell=grid[f][c];
      if(cell.type!==rt||!cell.isAnchor||cell.occupied||cell.dirty||cell.broken) continue;
      if(!hasCorridorAccess(c,f)) continue;           // koridor bağlantısı zorunlu
      if(!bfs(rec[0],rec[1],c,f)) continue;          // ulaşılabilirlik kontrolü (asansör dahil)
      const d=Math.abs(c-startCol)+Math.abs(f);
      if(d<bestD){bestD=d; bestRoom=[c,f];}
    }
    if(bestRoom){room=bestRoom; break;}
  }
  if(!room) return;
  grid[room[1]][room[0]].occupied = true;
  grid[room[1]][room[0]].gId = guestIdCtr;
  guests.push({
    id:guestIdCtr++, col:startCol, floor:0,
    ox:0, oy:0, mt:0, pi:0, path:pathToRec,
    spd:1.3 + Math.random() * .5,
    color:td.color, guestType,
    happy:1.0,
    hunger:       0.8 + Math.random() * .2,
    fatigue:      0.7 + Math.random() * .3,
    entertainment:0.7 + Math.random() * .3,
    needCooldown: 0,
    state:'to_reception',
    recC:rec[0], recF:rec[1],
    romC:room[0], romF:room[1], romType:grid[room[1]][room[0]].type,
    stayFor: td.stayMin + Math.random() * (td.stayMax - td.stayMin),
    stayT:0, waitT:0,
    amC:-1, amF:-1, amNeed:'', returnToRoom:false,
    incomeEarned:false,
  });
}

function earn(amount, cat = 'misc'){
  money += amount; dailyIncome += amount;
  if(cat === 'room')      dailyIncomeRoom      += amount;
  else if(cat === 'amenity')   dailyIncomeAmenity   += amount;
  else if(cat === 'reception') dailyIncomeReception += amount;
}

function updateGuest(g, dt){
  updateNeeds(g, dt);
  const done = stepPath(g, dt); if(!done) return;
  const td = GUEST_TYPES[g.guestType] || GUEST_TYPES.tourist;

  switch(g.state){
    case 'to_reception':
      if(g.col === g.recC && g.floor === g.recF){
        g.state = 'checking_in'; g.waitT = 10;
        earn(prices[T.RECEPTION] || 40, 'reception');
      } else {
        const rec = findCellType(T.RECEPTION);
        if(rec){const p = bfs(g.col, g.floor, rec[0], rec[1]); if(p){setPath(g, p); g.recC = rec[0]; g.recF = rec[1];}else g.state = 'leaving_now';}
        else g.state = 'leaving_now';
      }
      break;

    case 'checking_in':{
      const hasRec = staffArr.some(s => s.type === 'receptionist' && s.state === 'at_desk');
      g.waitT -= dt * (hasRec ? 5 : 1);
      if(!hasRec){
        g.happy = Math.max(0, g.happy - 0.012 * dt);
        if(g.happy < 0.25){
          const cell = grid[g.romF]?.[g.romC];
          if(cell && cell.gId === g.id){cell.occupied = false; cell.gId = null;}
          const p = bfs(g.col, g.floor, Math.floor(COLS / 2), 0);
          setPath(g, p || []); g.state = 'leaving_now';
          toast('😠 Misafir resepsiyoncu olmadığı için ayrıldı!');
          break;
        }
      }
      if(g.waitT <= 0){
        const p = bfs(g.col, g.floor, g.romC, g.romF);
        if(p){setPath(g, p); g.state = 'to_room';} else g.state = 'checking_out';
      }
      break;
    }

    case 'to_room':
      if(g.col === g.romC && g.floor === g.romF){
        g.state = 'in_room'; g.stayT = g.stayFor;
        g.happy = Math.min(1, g.happy + 0.12);
        if(!g.incomeEarned){
          earn((prices[g.romType] || 0) * td.priceMult, 'room');
          g.incomeEarned = true;
        }
      } else {
        const p = bfs(g.col, g.floor, g.romC, g.romF);
        if(p) setPath(g, p); else g.state = 'checking_out';
      }
      break;

    case 'to_room_return':
      if(g.col === g.romC && g.floor === g.romF){g.state = 'in_room';}
      else{const p = bfs(g.col, g.floor, g.romC, g.romF); if(p) setPath(g, p); else g.state = 'checking_out';}
      break;

    case 'in_room':
      g.stayT -= dt;
      if(grid[g.romF]?.[g.romC]?.broken && g.stayT > 5) g.stayT = 5;
      if(g.needCooldown <= 0){
        if(g.hunger < HUNGER_THR){
          const food = nearestFreeAmenity([T.RESTAURANT, T.BAR], g.col, g.floor);
          if(food){
            const p = bfs(g.col, g.floor, food[0], food[1]);
            if(p){setPath(g, p); g.amC = food[0]; g.amF = food[1]; g.amNeed = 'hunger'; g.returnToRoom = g.stayT > 6; g.state = 'to_amenity'; break;}
            else g.needCooldown = 8;
          }
        }
        if(g.entertainment < ENTERTAIN_THR){
          const ent = nearestFreeAmenity([T.POOL, T.BAR], g.col, g.floor);
          if(ent){
            const p = bfs(g.col, g.floor, ent[0], ent[1]);
            if(p){setPath(g, p); g.amC = ent[0]; g.amF = ent[1]; g.amNeed = 'entertainment'; g.returnToRoom = g.stayT > 6; g.state = 'to_amenity'; break;}
            else g.needCooldown = 8;
          }
        }
      }
      if(g.stayT <= 0) g.state = 'checking_out';
      break;

    case 'to_amenity':
      if(g.col === g.amC && g.floor === g.amF){
        g.state = 'at_amenity'; g.waitT = 5 + Math.random() * 10;
        g.happy = Math.min(1, g.happy + 0.18);
        earn((prices[grid[g.floor][g.col].type] || 0) * td.priceMult * 0.6, 'amenity');
      } else {
        g.state = g.returnToRoom ? 'to_room_return' : 'checking_out';
      }
      break;

    case 'at_amenity':{
      g.waitT -= dt;
      const hasWaiter = staffArr.some(s => s.type === 'waiter' && s.state === 'at_service' && s.col === g.amC && s.floor === g.amF);
      const svcRate = hasWaiter ? 1.8 : 1.0;
      if(!hasWaiter) g.happy = Math.max(0, g.happy - 0.004 * dt);
      if(g.amNeed === 'hunger')        g.hunger        = Math.min(1, g.hunger        + 0.18 * dt * svcRate);
      if(g.amNeed === 'entertainment') g.entertainment = Math.min(1, g.entertainment + 0.14 * dt * svcRate);
      if(g.waitT <= 0){
        g.needCooldown = 10;
        if(g.returnToRoom && g.stayT > 0){
          const p = bfs(g.col, g.floor, g.romC, g.romF);
          if(p){setPath(g, p); g.state = 'to_room_return';} else g.state = 'checking_out';
        } else g.state = 'checking_out';
      }
      break;
    }

    case 'checking_out':{
      const cell = grid[g.romF]?.[g.romC];
      if(cell && cell.gId === g.id){cell.occupied = false; cell.dirty = true; cell.gId = null;}
      const p = bfs(g.col, g.floor, Math.floor(COLS / 2), 0);
      setPath(g, p || []); g.state = 'leaving_now';
      break;
    }

    case 'leaving_now':
      if(g.floor === 0) guests = guests.filter(x => x.id !== g.id);
      else{const p = bfs(g.col, g.floor, Math.floor(COLS / 2), 0); if(p) setPath(g, p); else guests = guests.filter(x => x.id !== g.id);}
      break;
  }
}
