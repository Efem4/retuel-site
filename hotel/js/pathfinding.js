// ═══════════════════════════════════════════
//  PATHFINDING  (BFS)
// ═══════════════════════════════════════════
function walkable(c, f){
  if(c < 0 || c >= COLS || f < 0 || f >= FLOORS) return false;
  const cell = grid[f][c];
  if(cell.type === T.EMPTY) return false;
  // Uzantı hücreler kendi başına yürünebilir değil — pathfinding sadece anchor'a gider
  if(!cell.isAnchor) return false;
  return true;
}

function nbrs(c, f){
  const r = [];
  if(walkable(c - 1, f)) r.push([c - 1, f]);
  if(walkable(c + 1, f)) r.push([c + 1, f]);
  const cell = grid[f]?.[c];
  // Kırık asansör: sadece yatay hareket, dikey yok
  if((cell?.type === T.ELEVATOR && !cell.broken) || cell?.type === T.STAIRS){
    if(walkable(c, f - 1)) r.push([c, f - 1]);
    if(walkable(c, f + 1)) r.push([c, f + 1]);
  }
  return r;
}

function bfs(sc, sf, ec, ef){
  if(sc === ec && sf === ef) return [];
  const q = [[[sc, sf], []]];
  const vis = new Set([`${sc},${sf}`]);
  while(q.length){
    const [[c, f], path] = q.shift();
    for(const [nc, nf] of nbrs(c, f)){
      const k = `${nc},${nf}`; if(vis.has(k)) continue; vis.add(k);
      const np = [...path, [nc, nf]];
      if(nc === ec && nf === ef) return np;
      q.push([[nc, nf], np]);
    }
  }
  return null;
}

// ── Hareket yardımcıları ──
function stepPath(e, dt){
  if(!e.path || e.pi >= e.path.length) return true;
  e.mt += e.spd * dt;
  const [tc, tf] = e.path[e.pi];
  if(e.mt < 1){
    const {x:cx, y:cy} = cpos(e.col, e.floor);
    const {x:tx, y:ty} = cpos(tc, tf);
    e.ox = (tx - cx) * e.mt; e.oy = (ty - cy) * e.mt; return false;
  }
  e.col = tc; e.floor = tf; e.ox = 0; e.oy = 0; e.mt = 0; e.pi++;
  return e.pi >= e.path.length;
}

function setPath(e, path){e.path = path; e.pi = 0; e.mt = 0; e.ox = 0; e.oy = 0;}
