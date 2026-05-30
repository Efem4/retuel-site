// ═══════════════════════════════════════════
//  HOTEL ENGINE  (talep skoru, ekonomi)
// ═══════════════════════════════════════════
function calcDemandScore(){
  const totalRooms = countRooms();
  if(totalRooms === 0) return 0;

  const avgHappy = guests.length > 0
    ? guests.reduce((a, g) => a + g.happy, 0) / guests.length
    : 0.65;

  let dirtyRooms = 0, brokenRooms = 0, cleanFreeRooms = 0;
  for(let f = 0; f < FLOORS; f++) for(let c = 0; c < COLS; c++){
    const cell = grid[f][c];
    if(!cell.isAnchor) continue; // uzantı hücreler sayılmaz
    if(![T.STANDARD, T.DELUXE, T.SUITE].includes(cell.type)) continue;
    if(cell.dirty)          dirtyRooms++;
    else if(cell.broken)    brokenRooms++;
    else if(!cell.occupied) cleanFreeRooms++;
  }

  // Fiyat baskısı: base fiyatın ne kadar üstündeyiz
  let pricePressure = 0;
  const rTypes = [T.STANDARD, T.DELUXE, T.SUITE];
  for(const rt of rTypes) pricePressure += ((prices[rt] || BASE_PRICES[rt]) / BASE_PRICES[rt]) - 1;
  pricePressure /= rTypes.length;

  const score = 1
    + hotelStars  * 0.25
    + avgHappy    * 0.40
    + Math.min(cleanFreeRooms, 10) * 0.04
    - dirtyRooms  * 0.06
    - brokenRooms * 0.10
    - pricePressure * 0.30;

  return Math.max(0.2, score);
}
