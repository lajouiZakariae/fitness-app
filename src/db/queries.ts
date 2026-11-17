import type { SQLiteDatabase } from "expo-sqlite";

export const MUSCLES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Abs",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
] as const;

export type Exercise = { id: number; name: string; muscle: string };
export type WorkoutExercise = {
  id: number;
  exercise_id: number;
  name: string;
  muscle: string;
  position: number;
  sets: number;
  reps: number;
  rest_seconds: number;
};
export type Workout = { id: number; name: string; exercise_count: number };
export type SessionSet = {
  id: number;
  set_number: number;
  target_reps: number;
  weight: number | null;
  completed: number;
  completed_at: string | null;
};
export type SessionExercise = {
  id: number;
  exercise_id: number | null;
  exercise_name: string;
  muscle: string;
  position: number;
  rest_seconds: number;
  sets: SessionSet[];
};
export type Session = {
  id: number;
  workout_id: number | null;
  workout_name: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
  rest_started_at: string | null;
  rest_duration_seconds: number;
  exercises: SessionExercise[];
};

export async function listExercises(db: SQLiteDatabase) {
  return db.getAllAsync<Exercise>(
    "SELECT id, name, muscle FROM exercises ORDER BY name COLLATE NOCASE",
  );
}
export async function createExercise(
  db: SQLiteDatabase,
  name: string,
  muscle: string,
) {
  await db.runAsync(
    "INSERT INTO exercises(name, muscle) VALUES (?, ?)",
    name.trim(),
    muscle,
  );
}
export async function listWorkouts(db: SQLiteDatabase) {
  return db.getAllAsync<Workout>(
    `SELECT w.id, w.name, COUNT(we.id) AS exercise_count FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id=w.id GROUP BY w.id ORDER BY w.created_at DESC`,
  );
}
export async function getWorkout(db: SQLiteDatabase, id: number) {
  const workout = await db.getFirstAsync<{ id: number; name: string }>(
    "SELECT id, name FROM workouts WHERE id=?",
    id,
  );
  if (!workout) return null;
  const exercises = await db.getAllAsync<WorkoutExercise>(
    `SELECT we.id, we.exercise_id, e.name, e.muscle, we.position, we.sets, we.reps, we.rest_seconds FROM workout_exercises we JOIN exercises e ON e.id=we.exercise_id WHERE we.workout_id=? ORDER BY we.position`,
    id,
  );
  return { ...workout, exercises };
}
export async function saveWorkout(
  db: SQLiteDatabase,
  input: {
    id?: number;
    name: string;
    exercises: {
      exercise_id: number;
      sets: number;
      reps: number;
      rest_seconds: number;
    }[];
  },
) {
  await db.withTransactionAsync(async () => {
    let workoutId = input.id;
    if (workoutId)
      await db.runAsync(
        "UPDATE workouts SET name=? WHERE id=?",
        input.name.trim(),
        workoutId,
      );
    else {
      const result = await db.runAsync(
        "INSERT INTO workouts(name) VALUES (?)",
        input.name.trim(),
      );
      workoutId = result.lastInsertRowId;
    }
    await db.runAsync(
      "DELETE FROM workout_exercises WHERE workout_id=?",
      workoutId,
    );
    for (let position = 0; position < input.exercises.length; position++) {
      const item = input.exercises[position];
      await db.runAsync(
        "INSERT INTO workout_exercises(workout_id, exercise_id, position, sets, reps, rest_seconds) VALUES (?, ?, ?, ?, ?, ?)",
        workoutId,
        item.exercise_id,
        position,
        item.sets,
        item.reps,
        item.rest_seconds,
      );
    }
  });
}
export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM workouts WHERE id=?", id);
}
export async function deleteExercise(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    const usage = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM workout_exercises WHERE exercise_id=?",
      id,
    );
    if ((usage?.count ?? 0) > 0) {
      throw new Error("You can't delete the exercise; it's used in workouts.");
    }
    await db.runAsync("DELETE FROM exercises WHERE id=?", id);
  });
}
export async function getActiveSession(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<Omit<Session, "exercises">>(
    "SELECT * FROM sessions WHERE status='in_progress' ORDER BY started_at DESC LIMIT 1",
  );
  return row ? getSession(db, row.id) : null;
}
export async function getSession(
  db: SQLiteDatabase,
  id: number,
): Promise<Session | null> {
  const session = await db.getFirstAsync<Omit<Session, "exercises">>(
    "SELECT * FROM sessions WHERE id=?",
    id,
  );
  if (!session) return null;
  const exercises = await db.getAllAsync<Omit<SessionExercise, "sets">>(
    "SELECT * FROM session_exercises WHERE session_id=? ORDER BY position",
    id,
  );
  const complete = await Promise.all(
    exercises.map(async (exercise) => ({
      ...exercise,
      sets: await db.getAllAsync<SessionSet>(
        "SELECT * FROM session_sets WHERE session_exercise_id=? ORDER BY set_number",
        exercise.id,
      ),
    })),
  );
  return { ...session, exercises: complete };
}
export async function startSession(db: SQLiteDatabase, workoutId: number) {
  const workout = await getWorkout(db, workoutId);
  if (!workout) throw new Error("Workout not found.");
  const active = await getActiveSession(db);
  if (active) throw new Error("An active session already exists.");
  let sessionId = 0;
  const previous = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM sessions WHERE workout_id=? AND status='completed' ORDER BY completed_at DESC, started_at DESC LIMIT 1",
    workout.id,
  );
  await db.withTransactionAsync(async () => {
    const inserted = await db.runAsync(
      "INSERT INTO sessions(workout_id, workout_name, status, started_at) VALUES (?, ?, 'in_progress', ?)",
      workout.id,
      workout.name,
      new Date().toISOString(),
    );
    sessionId = inserted.lastInsertRowId;
    for (let position = 0; position < workout.exercises.length; position++) {
      const exercise = workout.exercises[position];
      const previousExercise = previous
        ? await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM session_exercises WHERE session_id=? AND exercise_id=? ORDER BY id DESC LIMIT 1",
            previous.id,
            exercise.exercise_id,
          )
        : null;
      const previousSets = previousExercise
        ? await db.getAllAsync<{ target_reps: number; weight: number | null }>(
            "SELECT target_reps, weight FROM session_sets WHERE session_exercise_id=? ORDER BY set_number",
            previousExercise.id,
          )
        : [];
      const insertedExercise = await db.runAsync(
        "INSERT INTO session_exercises(session_id, exercise_id, exercise_name, muscle, position, rest_seconds) VALUES (?, ?, ?, ?, ?, ?)",
        sessionId,
        exercise.exercise_id,
        exercise.name,
        exercise.muscle,
        position,
        exercise.rest_seconds,
      );
      const seedSets = previousSets.length
        ? previousSets
        : Array.from({ length: exercise.sets }, () => ({
            target_reps: exercise.reps,
            weight: null,
          }));
      for (let n = 1; n <= seedSets.length; n++)
        await db.runAsync(
          "INSERT INTO session_sets(session_exercise_id, set_number, target_reps, weight) VALUES (?, ?, ?, ?)",
          insertedExercise.lastInsertRowId,
          n,
          seedSets[n - 1].target_reps,
          seedSets[n - 1].weight,
        );
    }
  });
  return sessionId;
}
export async function discardSession(db: SQLiteDatabase, id: number) {
  await db.runAsync(
    "DELETE FROM sessions WHERE id=? AND status='in_progress'",
    id,
  );
}
export async function deleteSession(db: SQLiteDatabase, id: number) {
  await db.runAsync("DELETE FROM sessions WHERE id=?", id);
}
export async function updateSet(
  db: SQLiteDatabase,
  id: number,
  completed: boolean,
  weight: number | null,
) {
  await db.runAsync(
    "UPDATE session_sets SET completed=?, weight=?, completed_at=? WHERE id=?",
    completed ? 1 : 0,
    weight,
    completed ? new Date().toISOString() : null,
    id,
  );
}
export async function addSessionSet(
  db: SQLiteDatabase,
  exercise: SessionExercise,
  weight: number | null,
) {
  const nextNumber =
    exercise.sets.reduce((max, set) => Math.max(max, set.set_number), 0) + 1;
  const result = await db.runAsync(
    "INSERT INTO session_sets(session_exercise_id, set_number, target_reps, weight) VALUES (?, ?, ?, ?)",
    exercise.id,
    nextNumber,
    exercise.sets[exercise.sets.length - 1]?.target_reps ?? 1,
    weight,
  );
  return result.lastInsertRowId;
}
export async function removeSessionSet(
  db: SQLiteDatabase,
  exercise: SessionExercise,
) {
  const last = exercise.sets[exercise.sets.length - 1];
  if (!last) return;
  await db.runAsync("DELETE FROM session_sets WHERE id=?", last.id);
}
export async function addExerciseToSession(
  db: SQLiteDatabase,
  sessionId: number,
  exercise: Exercise,
) {
  const previous = await db.getFirstAsync<{ id: number }>(
    "SELECT se.id FROM session_exercises se JOIN sessions s ON s.id=se.session_id WHERE se.exercise_id=? AND s.status='completed' ORDER BY s.completed_at DESC, s.started_at DESC LIMIT 1",
    exercise.id,
  );
  const previousSets = previous
    ? await db.getAllAsync<{ target_reps: number; weight: number | null }>(
        "SELECT target_reps, weight FROM session_sets WHERE session_exercise_id=? ORDER BY set_number",
        previous.id,
      )
    : [];
  await db.withTransactionAsync(async () => {
    const position = await db.getFirstAsync<{ next_position: number }>(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM session_exercises WHERE session_id=?",
      sessionId,
    );
    const inserted = await db.runAsync(
      "INSERT INTO session_exercises(session_id, exercise_id, exercise_name, muscle, position, rest_seconds) VALUES (?, ?, ?, ?, ?, ?)",
      sessionId,
      exercise.id,
      exercise.name,
      exercise.muscle,
      position?.next_position ?? 0,
      90,
    );
    const seedSets = previousSets.length
      ? previousSets
      : Array.from({ length: 3 }, () => ({ target_reps: 10, weight: null }));
    for (let setNumber = 1; setNumber <= seedSets.length; setNumber++) {
      await db.runAsync(
        "INSERT INTO session_sets(session_exercise_id, set_number, target_reps, weight) VALUES (?, ?, ?, ?)",
        inserted.lastInsertRowId,
        setNumber,
        seedSets[setNumber - 1].target_reps,
        seedSets[setNumber - 1].weight,
      );
    }
  });
}
export async function updateSetReps(
  db: SQLiteDatabase,
  id: number,
  reps: number,
) {
  await db.runAsync(
    "UPDATE session_sets SET target_reps=? WHERE id=?",
    reps,
    id,
  );
}
export async function listRecentWorkouts(db: SQLiteDatabase) {
  return db.getAllAsync<Workout>(
    "SELECT w.id, w.name, COUNT(we.id) AS exercise_count FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id=w.id GROUP BY w.id ORDER BY w.created_at DESC LIMIT 3",
  );
}
export async function replaceSessionExercise(
  db: SQLiteDatabase,
  sessionExerciseId: number,
  exercise: Exercise,
) {
  await db.runAsync(
    "UPDATE session_exercises SET exercise_id=?, exercise_name=?, muscle=? WHERE id=?",
    exercise.id,
    exercise.name,
    exercise.muscle,
    sessionExerciseId,
  );
}
export async function removeSessionExercise(
  db: SQLiteDatabase,
  session: Session,
  sessionExerciseId: number,
) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "DELETE FROM session_exercises WHERE id=? AND session_id=?",
      sessionExerciseId,
      session.id,
    );
    const remaining = await db.getAllAsync<{ id: number }>(
      "SELECT id FROM session_exercises WHERE session_id=? ORDER BY position",
      session.id,
    );
    for (let position = 0; position < remaining.length; position++) {
      await db.runAsync(
        "UPDATE session_exercises SET position=? WHERE id=?",
        position,
        remaining[position].id,
      );
    }
  });
}
export async function setRestTimer(
  db: SQLiteDatabase,
  sessionId: number,
  duration: number,
) {
  await db.runAsync(
    "UPDATE sessions SET rest_started_at=?, rest_duration_seconds=? WHERE id=?",
    new Date().toISOString(),
    duration,
    sessionId,
  );
}
export async function clearRestTimer(db: SQLiteDatabase, sessionId: number) {
  await db.runAsync(
    "UPDATE sessions SET rest_started_at=NULL, rest_duration_seconds=0 WHERE id=?",
    sessionId,
  );
}
export async function completeSession(db: SQLiteDatabase, id: number) {
  await db.runAsync(
    "UPDATE sessions SET status='completed', completed_at=?, rest_started_at=NULL, rest_duration_seconds=0 WHERE id=?",
    new Date().toISOString(),
    id,
  );
}
