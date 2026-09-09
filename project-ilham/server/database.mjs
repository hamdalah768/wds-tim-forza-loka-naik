import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";

export function openDatabase(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename, {
    enableForeignKeyConstraints: true,
    enableDoubleQuotedStringLiterals: false,
    defensive: true,
  });
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
  );
  // First schema only; future changes belong in versioned migrations.
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version > 2)
    throw new Error(
      "Database lebih baru daripada aplikasi. Gunakan versi aplikasi yang sesuai.",
    );
  if (version === 0)
    db.exec(`
    BEGIN;
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      password_hash TEXT,
      recovery_hash TEXT,
      google_sub TEXT UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      absolute_at INTEGER NOT NULL,
      touched_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson TEXT NOT NULL,
      tasks TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, lesson)
    ) STRICT;
    CREATE TABLE drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      size TEXT NOT NULL,
      image TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX drafts_owner ON drafts(user_id, updated_at);
    CREATE TABLE rate_limits (
      bucket TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE oauth_states (
      state_hash TEXT PRIMARY KEY,
      session_hash TEXT NOT NULL,
      verifier TEXT NOT NULL,
      nonce TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX sessions_expiry ON sessions(expires_at);
    PRAGMA user_version=1;
    COMMIT;
  `);
  if (version < 2) {
    db.exec(`PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;
      CREATE TABLE users_v2 (
        id TEXT PRIMARY KEY, email TEXT UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
        password_hash TEXT, recovery_hash TEXT, google_sub TEXT UNIQUE,
        facebook_sub TEXT UNIQUE, phone TEXT UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
      ) STRICT;
      INSERT INTO users_v2(id,email,name,password_hash,recovery_hash,google_sub,email_verified,created_at)
      SELECT id,email,name,password_hash,recovery_hash,google_sub,email_verified,created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_v2 RENAME TO users;
      ALTER TABLE oauth_states ADD COLUMN provider TEXT NOT NULL DEFAULT 'google';
      CREATE TABLE phone_challenges(session_hash TEXT PRIMARY KEY, phone TEXT NOT NULL, expires_at INTEGER NOT NULL) STRICT;
      CREATE TABLE quizzes(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, lesson TEXT NOT NULL, correct INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,lesson)) STRICT;
      PRAGMA user_version=2; COMMIT; PRAGMA foreign_keys=ON;`);
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Migrasi data tidak konsisten.');
  }
  if (filename !== ':memory:') chmodSync(filename, 0o600);
  return db;
}
export function transaction(db, run) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = run();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
