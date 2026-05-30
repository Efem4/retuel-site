// ═══════════════════════════════════════════
//  CANVAS / KOORDİNATLAR
// ═══════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas(){
  if(MOBILE){
    CW = Math.max(18, Math.floor((window.innerWidth - ML - 2) / (COLS + GHOST * 2)));
    CH = Math.max(14, Math.round(CW * 0.68));
  }
  const area    = document.getElementById('canvas-area');
  const naturalH = (FLOORS + GHOST_FLOORS) * CH + MB;
  const availH   = area ? area.clientHeight : naturalH;
  TOPPAD = Math.max(0, availH - naturalH);
  canvas.width  = ML + (COLS + GHOST * 2) * CW + 2;
  canvas.height = naturalH + TOPPAD;
}

function centerView(){
  const area = document.getElementById('canvas-area'); if(!area) return;
  let minC = COLS, maxC = 0, any = false;
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    if(grid[f] && grid[f][c] && grid[f][c].type !== T.EMPTY){
      any = true; if(c < minC) minC = c; if(c > maxC) maxC = c;
    }
  }
  if(!any){minC = 0; maxC = COLS - 1;}
  const cx = ML + (GHOST + (minC + maxC) / 2 + 0.5) * CW;
  area.scrollLeft = Math.max(0, cx - area.clientWidth / 2);
}

window.addEventListener('resize', () => {resizeCanvas(); centerView();});

// Hücre → piksel merkezi
function cpos(col, floor){
  return {x: ML + (GHOST + col) * CW, y: TOPPAD + GHOST_FLOORS * CH + (FLOORS - 1 - floor) * CH};
}

// Piksel → hücre
function pxToCell(px, py){
  return {
    col:   Math.floor((px - ML) / CW) - GHOST,
    floor: FLOORS - 1 - Math.floor((py - TOPPAD - GHOST_FLOORS * CH) / CH),
  };
}
