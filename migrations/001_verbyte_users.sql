CREATE TABLE IF NOT EXISTS vb_users (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS vb_settings (
  user_id TEXT PRIMARY KEY,
  lang_code TEXT,
  daily_goal INTEGER DEFAULT 10,
  user_level TEXT DEFAULT 'A1',
  theme TEXT DEFAULT 'dark',
  first_use_date TEXT
);

CREATE TABLE IF NOT EXISTS vb_progress (
  user_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  word_key TEXT NOT NULL,
  interval REAL DEFAULT 0,
  ease REAL DEFAULT 2.5,
  due INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, lang, word_key)
);

CREATE TABLE IF NOT EXISTS vb_streak (
  user_id TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  last_date TEXT
);

CREATE TABLE IF NOT EXISTS vb_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  earned_at INTEGER,
  PRIMARY KEY (user_id, achievement_id)
);
