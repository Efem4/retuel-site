// ═══════════════════════════════════════════
//  GAME LOOP  (başlangıç + ana döngü)
// ═══════════════════════════════════════════
let lastTs = 0;
const loaded = loadGame();
if(!loaded) buildGrid();
resizeCanvas(); setTool('corridor'); updatePriceUI(); centerView();
if(loaded) toast(`💾 Kayıt yüklendi — Gün ${day}`);
// İlk paint sonrası canvas boyutunu düzelt
requestAnimationFrame(() => {resizeCanvas(); centerView();});

function loop(ts){
  const rawDt = Math.min((ts - lastTs) / 1000, .12);
  const dt    = rawDt * gameSpeed;
  lastTs = ts;

  gameTime  += dt;
  hotelStars = calcStars();
  if(hotelStars > prevStars && prevStars >= 0){
    toast(`⭐ Tebrikler! Otel ${'★'.repeat(hotelStars)}${'☆'.repeat(5-hotelStars)} oldu!`);
  }
  prevStars = hotelStars;

  // Engine
  demandScore = calcDemandScore();

  // Gün değişimi
  if(gameTime >= DAY_LEN){
    gameTime -= DAY_LEN; day++;
    for(const s of staffArr) s.tasksToday = 0;  // günlük kapasite sıfırla
    const sal = staffArr.reduce((t, s) => t + (STAFF_DEF[s.type]?.salary || 0), 0);
    money -= sal;
    const r  = Math.floor(dailyIncomeRoom);
    const a  = Math.floor(dailyIncomeAmenity);
    const rc = Math.floor(dailyIncomeReception);
    const net = r + a + rc - sal;
    if(money < 0) toast(`📅 Gün ${day} · ⚠️ Açık! Oda $${r} · Servis $${a} · Personel -$${sal}`);
    else          toast(`📅 Gün ${day} · 🏨$${r} · 🍽$${a} · 🛎$${rc} · Net ${net>=0?'+':''}$${net}`);
    dailyIncome=0; dailyIncomeRoom=0; dailyIncomeAmenity=0; dailyIncomeReception=0;
  }

  // Otomatik kayıt
  autoSaveTimer -= dt;
  if(autoSaveTimer <= 0){autoSaveTimer = 60; saveGame(true);}

  // Dinamik arıza
  breakdownTimer -= dt;
  if(breakdownTimer <= 0){
    const occupied  = guests.filter(g => g.romC >= 0).length;
    const repairmen = staffArr.filter(s => s.type === 'repairman').length;
    const interval  = Math.max(30, 90 - occupied*1.5 - countRooms()*0.3 + repairmen*8) + Math.random()*30;
    breakdownTimer  = interval;
    if(countRooms() > 2) tryBreakdown();
  }

  // Demand bazlı spawn
  nextSpawn -= dt;
  if(nextSpawn <= 0 && guests.length < MAX_GUESTS && hotelStars > 0){
    const spawnInterval = Math.max(2.5, 12 / demandScore);
    nextSpawn = spawnInterval + Math.random() * 3;
    spawnGuest();
    if(demandScore >= 1.5 && Math.random() < 0.28 && guests.length < MAX_GUESTS) spawnGuest();
    if(demandScore >= 2.0 && Math.random() < 0.15 && guests.length < MAX_GUESTS) spawnGuest();
  }

  for(const g of [...guests]) updateGuest(g, dt);
  for(const s of staffArr)    updateStaff(s, dt);

  render(); updateUI();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
