CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_modes (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL UNIQUE,
  size INTEGER NOT NULL,
  round_duration INTEGER NOT NULL,
  black_cards INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lobbys (
  id SERIAL PRIMARY KEY,
  code_lobby VARCHAR(10) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  duration INTEGER NOT NULL,
  game_mode_id INTEGER NOT NULL REFERENCES game_modes(id),
  players_size INTEGER NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS users_lobbys (
  id SERIAL PRIMARY KEY,
  id_lobby INTEGER NOT NULL REFERENCES lobbys(id) ON DELETE CASCADE,
  id_user INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('spymaster', 'operative')),
  team TEXT NOT NULL CHECK (team IN ('red', 'blue')),
  winner BOOLEAN,
  joined_at TIMESTAMP DEFAULT NOW()
);


INSERT INTO game_modes (mode, size, round_duration, black_cards) VALUES
('Fácil', 4, 300, 1),
('Normal', 5, 180, 1),
('Difícil', 5, 60, 4),
('HARDCORE', 5, 30, 8);
