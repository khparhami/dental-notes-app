import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('dentalnotes.db');
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      patientName    TEXT NOT NULL,
      date           TEXT NOT NULL,
      chiefComplaint TEXT NOT NULL DEFAULT '',
      status         TEXT NOT NULL DEFAULT 'recording',
      createdAt      TEXT NOT NULL,
      updatedAt      TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id              TEXT PRIMARY KEY,
      sessionId       TEXT NOT NULL UNIQUE,
      fullText        TEXT NOT NULL,
      durationSeconds INTEGER NOT NULL DEFAULT 0,
      recordedAt      TEXT NOT NULL,
      editedText      TEXT,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id                      TEXT PRIMARY KEY,
      sessionId               TEXT NOT NULL UNIQUE,
      patientName             TEXT NOT NULL,
      date                    TEXT NOT NULL,
      chiefComplaint          TEXT NOT NULL DEFAULT '',
      clinicalFindings        TEXT NOT NULL DEFAULT '',
      treatmentPerformed      TEXT NOT NULL DEFAULT '',
      recommendationsFollowUp TEXT NOT NULL DEFAULT '',
      rawContent              TEXT NOT NULL,
      generatedAt             TEXT NOT NULL,
      editedContent           TEXT,
      FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC, createdAt DESC);'
  );
}
