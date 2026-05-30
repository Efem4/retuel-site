// ═══════════════════════════════════════════
//  SAVE / LOAD  +  FİYATLANDIRMA
// ═══════════════════════════════════════════
function saveGame(silent = false){
  const data = {
    v:5, money, day, gameTime, dailyIncome,
    dailyIncomeRoom, dailyIncomeAmenity, dailyIncomeReception,
    FLOORS, COLS, prices,
    grid: grid.map(f => f.map(c => ({
      t:c.type, d:c.dirty?1:0, b:c.broken?1:0,
      ia:c.isAnchor?1:0, aC:c.anchorC, aF:c.anchorF,
    }))),
    staff: staffArr.map(s => ({type:s.type, col:s.col, floor:s.floor})),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  if(!silent){toast('💾 Oyun kaydedildi!'); flashSave();} else flashSave();
}

function loadGame(){
  const raw = localStorage.getItem(SAVE_KEY); if(!raw) return false;
  try{
    const d = JSON.parse(raw); if(!d.v || d.v < 4) return false;
    money = d.money; day = d.day; gameTime = d.gameTime || 0; dailyIncome = d.dailyIncome || 0;
    dailyIncomeRoom = d.dailyIncomeRoom || 0;
    dailyIncomeAmenity = d.dailyIncomeAmenity || 0;
    dailyIncomeReception = d.dailyIncomeReception || 0;
    FLOORS = d.FLOORS; COLS = d.COLS; prices = {...BASE_PRICES, ...(d.prices || {})};
    const isV5 = d.v >= 5;
    grid = d.grid.map(f => f.map(c => ({
      type:c.t, dirty:c.d===1, broken:c.b===1, occupied:false, gId:null, sId:null,
      isAnchor: isV5 ? c.ia===1 : true,   // eski v4 kayıtları hep anchor
      anchorC:  isV5 ? (c.aC ?? null) : null,
      anchorF:  isV5 ? (c.aF ?? null) : null,
    })));
    staffArr = []; guestIdCtr = 0; staffIdCtr = 0;
    for(const s of (d.staff || [])){
      staffArr.push({id:staffIdCtr++, type:s.type, col:s.col, floor:s.floor,
        ox:0, oy:0, mt:0, pi:0, path:null, spd:0.9+Math.random()*.3,
        state:'idle', tC:-1, tF:-1, wt:0});
    }
    guests = [];
    return true;
  }catch(e){return false;}
}

function newGame(){
  showConfirm('🗑 Yeni Oyun', 'Mevcut ilerleme silinecek. Emin misin?', yes => {
    if(!yes) return;
    localStorage.removeItem(SAVE_KEY);
    money = 50000; day = 1; gameTime = 0; dailyIncome = 0;
    FLOORS = 5; COLS = MOBILE ? 12 : 16; prices = {...BASE_PRICES};
    guestIdCtr = 0; staffIdCtr = 0; guests = []; staffArr = [];
    buildGrid(); resizeCanvas(); updatePriceUI();
    toast('Yeni oyun başladı!');
  });
}

function flashSave(){
  const el = document.getElementById('saveFlash');
  if(!el) return;
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 1800);
}

// ── Fiyatlandırma ──
let pricingOpen = true;
function togglePricing(){
  pricingOpen = !pricingOpen;
  const pp = document.getElementById('price-panel'); if(pp) pp.style.display = pricingOpen ? '' : 'none';
  const pa = document.getElementById('price-arrow'); if(pa) pa.textContent = pricingOpen ? '▾' : '▸';
}

const PRICE_MAP = {
  reception:T.RECEPTION, standard:T.STANDARD, deluxe:T.DELUXE,
  suite:T.SUITE, restaurant:T.RESTAURANT, bar:T.BAR, pool:T.POOL
};
const PRICE_MIN = {reception:10,standard:20,deluxe:30,suite:50,restaurant:10,bar:10,pool:10};
const PRICE_MAX = {reception:200,standard:500,deluxe:800,suite:1500,restaurant:200,bar:150,pool:300};

function chPrice(k, d){
  const t = PRICE_MAP[k];
  prices[t] = Math.max(PRICE_MIN[k], Math.min(PRICE_MAX[k], (prices[t] || 0) + d));
  updatePriceUI();
}

function updatePriceUI(){
  for(const [k, t] of Object.entries(PRICE_MAP)){
    const el = document.getElementById('pv-' + k); if(el) el.textContent = '$' + prices[t];
  }
}
