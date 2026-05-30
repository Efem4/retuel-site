// ═══════════════════════════════════════════
//  STATE  (tüm değişken oyun verisi)
// ═══════════════════════════════════════════
let money = 50000, day = 1, gameTime = 0, gameSpeed = 1;
let tool = 'corridor';
let grid = [], guests = [], staffArr = [];
let guestIdCtr = 0, staffIdCtr = 0;
let nextSpawn = 6, dailyIncome = 0;
let dailyIncomeRoom = 0, dailyIncomeAmenity = 0, dailyIncomeReception = 0;
let demandScore = 1;
let hovCell = null;
let autoSaveTimer = 60;
let prices = {...BASE_PRICES};
let hotelStars = 0, prevStars = 0;
let breakdownTimer = 90;
