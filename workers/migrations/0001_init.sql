-- Logical copy of legacy Postgres tile table: id = y * 1000 + x, colour = 0xRRGGBB
CREATE TABLE IF NOT EXISTS tile (
  id INTEGER PRIMARY KEY NOT NULL,
  colour TEXT NOT NULL
);
