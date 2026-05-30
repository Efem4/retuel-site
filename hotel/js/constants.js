// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const MOBILE = (document.documentElement.clientWidth || window.innerWidth) <= 768;
const GHOST = MOBILE ? 2 : 3;
const GHOST_FLOORS = 2;
let TOPPAD = 0;
let _nightF = 0;
const EXPAND_COL_COST = 4000;
const ML = MOBILE ? 34 : 60;
const MB = MOBILE ? 20 : 38;
let CW = MOBILE ? 24 : 56;
let CH = MOBILE ? 17 : 42;
const DAY_LEN = 100, MAX_GUESTS = 60, SAVE_KEY = 'hm_v4';
const MAX_FLOORS = 25, MAX_COLS = 40;
let COLS = MOBILE ? 12 : 16, FLOORS = 5;

const T = {
  EMPTY:'empty', CORRIDOR:'corridor', ELEVATOR:'elevator', STAIRS:'stairs',
  RECEPTION:'reception', STANDARD:'standard', DELUXE:'deluxe', SUITE:'suite',
  RESTAURANT:'restaurant', BAR:'bar', POOL:'pool',
};

const DEF = {
  [T.CORRIDOR]:  {name:'Koridor',       cost:100 },
  [T.ELEVATOR]:  {name:'Asansör',       cost:1500},
  [T.STAIRS]:    {name:'Merdiven',      cost:400 },
  [T.RECEPTION]: {name:'Resepsiyon',    cost:2000},
  [T.STANDARD]:  {name:'Standart Oda', cost:800 },
  [T.DELUXE]:    {name:'Deluxe Oda',   cost:1500},
  [T.SUITE]:     {name:'Suit Oda',      cost:4000},
  [T.RESTAURANT]:{name:'Restoran',      cost:3000},
  [T.BAR]:       {name:'Bar',           cost:2000},
  [T.POOL]:      {name:'Havuz',         cost:6000},
};

const BASE_PRICES = {
  [T.RECEPTION]:40, [T.STANDARD]:90, [T.DELUXE]:170,
  [T.SUITE]:350,    [T.RESTAURANT]:55,[T.BAR]:45, [T.POOL]:90,
};

const STAFF_DEF = {
  receptionist:{name:'Resepsiyoncu',salary:300,color:'#5DADE2'},
  maid:        {name:'Temizlikçi',  salary:200,color:'#A9CCE3'},
  waiter:      {name:'Garson',      salary:250,color:'#FAD7A0'},
  repairman:   {name:'Tamirci',     salary:350,color:'#E59866'},
};

const GUEST_TYPES = {
  tourist: {
    icon:'🧳', color:'#27AE60', name:'Turist',
    stayMin:30, stayMax:65,
    roomPref:[T.STANDARD, T.DELUXE],
    hungerRate:0.007, entertainRate:0.006, fatigueRate:0.004,
    priceMult:1.0, minStars:1, weight:5,
  },
  business: {
    icon:'💼', color:'#2980B9', name:'İş İnsanı',
    stayMin:12, stayMax:28,
    roomPref:[T.DELUXE, T.SUITE, T.STANDARD],
    hungerRate:0.011, entertainRate:0.002, fatigueRate:0.007,
    priceMult:1.6, minStars:2, weight:3,
  },
  family: {
    icon:'👨‍👩‍👧', color:'#8E44AD', name:'Aile',
    stayMin:45, stayMax:90,
    roomPref:[T.STANDARD, T.DELUXE],
    hungerRate:0.010, entertainRate:0.009, fatigueRate:0.004,
    priceMult:0.85, minStars:2, weight:3,
  },
  vip: {
    icon:'⭐', color:'#F39C12', name:'VIP',
    stayMin:55, stayMax:110,
    roomPref:[T.SUITE, T.DELUXE],
    hungerRate:0.005, entertainRate:0.005, fatigueRate:0.003,
    priceMult:2.5, minStars:4, weight:1,
  },
};

const HUNGER_THR = 0.32, FATIGUE_THR = 0.25, ENTERTAIN_THR = 0.28;
const AMENITY_CAP = {[T.RESTAURANT]:3, [T.BAR]:2, [T.POOL]:5};

// Kaç hücre yer kapladığı (w=genişlik, h=yükseklik — şimdilik hep h:1)
const CELL_SIZE = {
  [T.CORRIDOR]:   {w:1, h:1},
  [T.ELEVATOR]:   {w:1, h:1},
  [T.STAIRS]:     {w:1, h:1},
  [T.RECEPTION]:  {w:2, h:1},
  [T.STANDARD]:   {w:1, h:1},
  [T.DELUXE]:     {w:2, h:1},
  [T.SUITE]:      {w:3, h:1},
  [T.RESTAURANT]: {w:3, h:1},
  [T.BAR]:        {w:2, h:1},
  [T.POOL]:       {w:3, h:1},
};
