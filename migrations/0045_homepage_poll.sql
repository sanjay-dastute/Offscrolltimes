CREATE TABLE homepage_poll (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  option_one TEXT NOT NULL,
  option_two TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE homepage_poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES homepage_poll(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  choice INTEGER NOT NULL CHECK(choice IN (1,2)),
  created_at INTEGER NOT NULL,
  UNIQUE(poll_id, voter_key)
);

CREATE INDEX homepage_poll_votes_poll_id_idx ON homepage_poll_votes(poll_id);
