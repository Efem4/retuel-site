// ═══════════════════════════════════════════
//  UI  (paneller, toast, araçlar)
// ═══════════════════════════════════════════
function updateUI(){
  updateStaffUI();
  document.getElementById('s-money').textContent  = '$' + Math.floor(money).toLocaleString();
  document.getElementById('s-guests').textContent = guests.length;
  document.getElementById('s-day').textContent    = day;
  document.getElementById('s-income').textContent = '$' + Math.floor(dailyIncome).toLocaleString();
  document.getElementById('day-bar-fill').style.width = (gameTime / DAY_LEN * 100).toFixed(1) + '%';
  const _pl = document.getElementById('day-phase-lbl');
  if(_pl) _pl.textContent = dayPhaseLabel((gameTime / DAY_LEN) % 1);
  const s = hotelStars;
  document.getElementById('s-stars').textContent = '★'.repeat(s) + '☆'.repeat(5 - s);
  const avg = guests.length ? guests.reduce((a, g) => a + g.happy, 0) / guests.length : 0;
  const hIcon = avg > 0.7 ? '😊' : avg > 0.45 ? '😐' : '😠';
  document.getElementById('s-happy').textContent = guests.length ? hIcon + ' ' + Math.round(avg * 100) + '%' : '—';
  updateGuestPanel();
}

function toggleGuestPanel(){
  const panel = document.getElementById('guest-panel');
  const stat  = document.querySelector('#happy-wrap .stat');
  const open  = panel.classList.toggle('open');
  stat.classList.toggle('open', open);
}
document.addEventListener('click', e => {
  if(!document.getElementById('happy-wrap').contains(e.target)){
    document.getElementById('guest-panel').classList.remove('open');
    document.querySelector('#happy-wrap .stat').classList.remove('open');
  }
});

function updateGuestPanel(){
  const total = guests.length;
  if(!total){
    document.getElementById('gp-count').textContent = '👥 0 misafir';
    document.getElementById('gp-avg').textContent = '—';
    ['hungry','tired','bored','unhappy'].forEach(k => {
      document.getElementById('gp-num-' + k).textContent = '0';
      document.getElementById('gp-bar-' + k).style.width = '0%';
    });
    return;
  }
  const hungry  = guests.filter(g => g.hunger        < HUNGER_THR).length;
  const tired   = guests.filter(g => g.fatigue        < FATIGUE_THR).length;
  const bored   = guests.filter(g => g.entertainment  < ENTERTAIN_THR).length;
  const unhappy = guests.filter(g => g.happy          < 0.4).length;
  const avg = guests.reduce((a, g) => a + g.happy, 0) / total;
  document.getElementById('gp-count').textContent = `👥 ${total} misafir`;
  document.getElementById('gp-avg').textContent   = (avg>0.7?'😊':avg>0.45?'😐':'😠') + ' ' + Math.round(avg * 100) + '%';
  const pct = n => Math.round(n / total * 100) + '%';
  document.getElementById('gp-num-hungry').textContent  = hungry;
  document.getElementById('gp-num-tired').textContent   = tired;
  document.getElementById('gp-num-bored').textContent   = bored;
  document.getElementById('gp-num-unhappy').textContent = unhappy;
  document.getElementById('gp-bar-hungry').style.width  = pct(hungry);
  document.getElementById('gp-bar-tired').style.width   = pct(tired);
  document.getElementById('gp-bar-bored').style.width   = pct(bored);
  document.getElementById('gp-bar-unhappy').style.width = pct(unhappy);
}

// ── Confirm modal ──
let _confirmCb = null;
function showConfirm(title, msg, cb, yesLabel = 'Değiştir'){
  document.getElementById('cb-title').textContent = title;
  document.getElementById('cb-msg').textContent   = msg;
  document.querySelector('.cb-yes').textContent   = yesLabel;
  document.getElementById('confirm-overlay').classList.add('show');
  _confirmCb = cb;
}
function resolveConfirm(yes){
  document.getElementById('confirm-overlay').classList.remove('show');
  if(_confirmCb){_confirmCb(yes); _confirmCb = null;}
}
document.getElementById('confirm-overlay').addEventListener('click', e => {
  if(e.target === document.getElementById('confirm-overlay')) resolveConfirm(false);
});

// ── Toast ──
let toastT = null;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  if(toastT) clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Hız ──
function setSpeed(s){
  gameSpeed = s;
  document.querySelectorAll('.sp-btn').forEach(b => b.classList.remove('on'));
  document.getElementById('sp' + {1:'1',2:'2',4:'3'}[s]).classList.add('on');
}

// ── Araç seçimi ──
const TOOL_NAMES = {
  cursor:'👆 Seç / Bilgi',       demolish:'🔨 Yık  (%50 geri)',
  corridor:'🚶 Koridor  $100',   elevator:'🛗 Asansör  $1,500',
  stairs:'🪜 Merdiven  $400',    reception:'🛎 Resepsiyon  $2,000',
  standard:'🛏 Standart Oda  $800', deluxe:'🛏 Deluxe Oda  $1,500',
  suite:'👑 Suit Oda  $4,000',   restaurant:'🍽 Restoran  $3,000',
  bar:'🍹 Bar  $2,000',          pool:'🏊 Havuz  $6,000',
};
let _tipTimer = null;
function showToolTip(name){
  const el = document.getElementById('tool-tip');
  el.textContent = name; el.classList.add('show');
  if(_tipTimer) clearTimeout(_tipTimer);
  _tipTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

function setTool(t){
  tool = t;
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + t); if(btn) btn.classList.add('active');
  document.querySelectorAll('.mob-btn').forEach(b => b.classList.remove('active'));
  const mob = document.getElementById('mob-' + t); if(mob) mob.classList.add('active');
  if(TOOL_NAMES[t]) showToolTip(TOOL_NAMES[t]);
}

function showCellInfo(col, floor){
  const cell = grid[floor][col]; const def = DEF[cell.type];
  const p = document.getElementById('infopanel');
  if(cell.type === T.EMPTY){p.innerHTML = `<b>Boş Alan</b><br>Kat: ${floor===0?'Zemin':floor}  Sütun: ${col}`; return;}
  p.innerHTML = `<b>${def?.name||cell.type}</b><br>Kat: ${floor===0?'Zemin':floor}<br>
    ${prices[cell.type]?`<span style="color:#2ecc71">💰 $${prices[cell.type]}</span><br>`:''}
    ${cell.occupied?'🔴 Dolu':cell.dirty?'🟡 Kirli':cell.broken?'🔴 Arızalı':'🟢 Hazır'}`;
}

// ── Mobil paneller ──
function toggleMobSidebar(){
  const s = document.getElementById('sidebar');
  const open = s.classList.toggle('mob-open');
  document.getElementById('mob-overlay').classList.toggle('show', open);
  if(open) document.getElementById('price-popup').classList.remove('open');
  document.getElementById('mob-menu').classList.toggle('active', open);
}
function closeMobSidebar(){
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
  document.getElementById('mob-menu')?.classList.remove('active');
}
function togglePricePopup(){
  const pp = document.getElementById('price-popup');
  const open = pp.classList.toggle('open');
  document.getElementById('mob-overlay').classList.toggle('show', open);
  if(open){
    document.getElementById('sidebar').classList.remove('mob-open');
    document.getElementById('mob-menu')?.classList.remove('active');
  }
  document.getElementById('mob-price').classList.toggle('active', open);
}
function closeAllPanels(){
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('price-popup').classList.remove('open');
  document.getElementById('mob-overlay').classList.remove('show');
  document.getElementById('mob-menu')?.classList.remove('active');
  document.getElementById('mob-price')?.classList.remove('active');
}
