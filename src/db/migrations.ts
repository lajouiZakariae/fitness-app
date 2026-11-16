import type { SQLiteDatabase } from "expo-sqlite";

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        muscle TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE TABLE workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        sets INTEGER NOT NULL CHECK(sets >= 1),
        reps INTEGER NOT NULL CHECK(reps >= 1),
        rest_seconds INTEGER NOT NULL CHECK(rest_seconds >= 0)
      );
      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
        workout_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('in_progress','completed')),
        started_at TEXT NOT NULL,
        completed_at TEXT
      );
      CREATE TABLE session_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
        exercise_name TEXT NOT NULL,
        muscle TEXT NOT NULL,
        position INTEGER NOT NULL,
        rest_seconds INTEGER NOT NULL
      );
      CREATE TABLE session_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        target_reps INTEGER NOT NULL,
        weight REAL,
        completed INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT
      );
      PRAGMA user_version = 1;
    `);
    version = 1;
  }

  if (version < 2) {
    await db.execAsync(`
      ALTER TABLE sessions ADD COLUMN rest_started_at TEXT;
      ALTER TABLE sessions ADD COLUMN rest_duration_seconds INTEGER NOT NULL DEFAULT 0;
      PRAGMA user_version = 2;
    `);
    version = 2;
  }

  if (version < 3) {
    await db.execAsync(`
      CREATE UNIQUE INDEX one_active_session ON sessions(status) WHERE status='in_progress';
      PRAGMA user_version = 3;
    `);
    version = 3;
  }

  if (version < 4) {
    await db.execAsync(`
      INSERT OR IGNORE INTO exercises(name, muscle) VALUES
        ('Lying Leg Curl', 'Hamstrings'),
        ('Leg Extensions', 'Quads'),
        ('Cable Row', 'Back'),
        ('Machine Row', 'Back'),
        ('Lat Pulldown', 'Back'),
        ('Machine Press', 'Chest'),
        ('Incline Dumbbell Bench Press', 'Chest'),
        ('Seated Dumbbell Press', 'Shoulders'),
        ('Lateral Dumbbell Raise', 'Shoulders'),
        ('Standing Machine Calf Raise', 'Calves');
      PRAGMA user_version = 4;
    `);
    version = 4;
  }
}
