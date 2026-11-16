# Fitness App: Minimal PRD

**Platform:** Android (React Native + Expo, TypeScript)
**Storage:** SQLite (local, offline-first)
**Version:** 0.1 (MVP)

---

## 1. Goal

A simple, fast workout tracker. The user builds a library of exercises, composes workouts from them, runs a workout session with set logging and rest timers, and every completed workout is saved to the local database for future features (history, stats, charts).

## 2. Tech Stack

| Area      | Choice                                              |
| --------- | --------------------------------------------------- |
| Framework | React Native with Expo (Expo Router for navigation) |
| Language  | TypeScript (strict)                                 |
| Database  | SQLite via `expo-sqlite`                            |
| State     | Zustand (active session state)                      |
| Styling   | `StyleSheet` + central theme tokens (see section 8) |

## 3. Scope

### In scope (MVP)

- Exercise library (create, list)
- Workout builder (create, edit, delete)
- Start workout flow, session screen, set logging, rest timer, progress tracking
- Resume in-progress workout from Home
- Persist completed workouts with date, sets, reps and weight per set
- Bottom tab bar with a center "+" action

### Out of scope (later)

- History or stats screens, charts
- Editing or deleting exercises (list and add only for now)
- Accounts, cloud sync, backup/export
- Light theme, localization, notifications, sound/vibration settings

## 4. Features

### 4.1 Exercise Library

- List all exercises (name + target muscle).
- **Add exercise** form:
  - `Name` (required, text, unique, case-insensitive)
  - `Target muscle` (required, select)
- Predefined muscles: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Abs, Quads, Hamstrings, Glutes, Calves.

### 4.2 Workout Management

- List all workouts (name + exercise count).
- **Add / edit / delete** a workout.
- Workout fields:
  - `Name` (required)
  - Ordered list of exercises chosen from the library. Each entry has:
    - `Sets` (integer >= 1)
    - `Reps` (integer >= 1)
    - `Rest time` between sets (seconds)
- The same exercise may appear more than once in a workout.
- Exercises within a workout can be reordered and removed.
- Deleting a workout does not delete past completed sessions (they keep their own snapshot, see section 6).

### 4.3 Home Screen

- Primary button: **Start a workout**.
- If an in-progress session exists, show a **Resume workout** card below the button (workout name, progress, started time).
- Only one in-progress session at a time. Starting a new one while one exists asks the user to resume or discard the old one.

### 4.4 Start a Workout

- Tapping **Start a workout** opens a list of existing workouts.
- Selecting one creates a session (status `in_progress`) and opens the Session screen.
- Empty state: if no workouts exist, show a prompt to create one.

### 4.5 Workout Session Screen

- **Top:** overall progress bar (completed sets / total sets) with the workout name.
- **Body:** exercises in order, each showing its sets as rows:
  - Set number, target reps, `Weight` input (numeric), checkbox.
- **Completing a set:** user enters weight, taps the checkbox. The set is marked done and saved immediately.
  - A **rest timer** appears as a slim progress bar fixed at the bottom of the screen with remaining time, using that exercise's rest time.
  - The timer can be skipped, and starting another set's timer replaces the current one.
  - The last set of an exercise can still trigger the rest timer (leading into the next exercise).
- Un-checking a completed set reverts it to not done.
- **Edit sets during the session** (affects this session only, not the workout template):
  - Add a set to an exercise.
  - Remove a set from an exercise.
- **Finish:** bottom button **Workout is completed**. It marks the session `completed` and stores the finish date/time. If unfinished sets remain, show a confirmation; unfinished sets are saved as not completed.
- Leaving the screen (back or app closed) keeps the session `in_progress`, so it can be resumed from Home. All logged data persists as it is entered.

### 4.6 Navigation

Bottom tab bar, three items:

1. **Home**
2. **+** (center action button): opens a pop-up menu with **Add exercise** and **Add workout**.
3. **Library**: tabs/segments for **Exercises** and **Workouts** lists.
   Session screen is full-screen (tab bar hidden).

## 5. Screens

| Screen                         | Purpose                                |
| ------------------------------ | -------------------------------------- |
| Home                           | Start workout button, resume card      |
| Choose Workout                 | Pick a workout to start                |
| Workout Session                | Log sets, rest timer, progress, finish |
| Library (Exercises / Workouts) | Browse, open, edit, delete workouts    |
| Add Exercise                   | Exercise form                          |
| Add / Edit Workout             | Workout form with exercise rows        |
| "+" Action Sheet               | Choose Add exercise / Add workout      |

## 6. Data Model (SQLite)

```sql
CREATE TABLE exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  muscle        TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE workouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE workout_exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id    INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   INTEGER NOT NULL REFERENCES exercises(id),
  position      INTEGER NOT NULL,
  sets          INTEGER NOT NULL,
  reps          INTEGER NOT NULL,
  rest_seconds  INTEGER NOT NULL
);

-- A session is a snapshot of a workout at start time, so later edits or
-- deletes of the workout never change history.
CREATE TABLE sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id    INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
  workout_name  TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('in_progress','completed')),
  started_at    TEXT NOT NULL,
  completed_at  TEXT
);

CREATE TABLE session_exercises (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id    INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name  TEXT NOT NULL,
  muscle         TEXT NOT NULL,
  position       INTEGER NOT NULL,
  rest_seconds   INTEGER NOT NULL
);

CREATE TABLE session_sets (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id  INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number           INTEGER NOT NULL,
  target_reps          INTEGER NOT NULL,
  weight               REAL,               -- kg, null until logged
  completed            INTEGER NOT NULL DEFAULT 0,
  completed_at         TEXT
);
```

Notes:

- Enable `PRAGMA foreign_keys = ON` on connection.
- Dates stored as ISO 8601 strings (UTC).
- Weight unit is kg for MVP (single unit constant, easy to extend later).
- Keep schema changes in numbered migrations from day one.

## 7. Key Rules and Edge Cases

- Exercise names must be unique; show an inline error on duplicates.
- A workout needs a name and at least one exercise to be saved.
- An exercise used by a workout cannot be removed (exercise deletion is out of scope for the MVP anyway).
- Weight accepts decimals (e.g. 22.5); empty weight is allowed (saved as null).
- Rest timer must keep correct time if the app is backgrounded (compute from timestamps, not a ticking counter).
- Keep the screen awake during an active session.

## 8. Design

### Theme

- **Single dark theme** only. Primary color: an elegant blue.
- All colors and sizes live in one theme file, `src/theme/colors.ts` (plus `spacing`, `radius`, `typography`). No hard-coded hex values anywhere else in the code, so changing the palette updates the whole app.

### Initial palette (editable)

```ts
export const colors = {
  background: "#0B0F1A", // app background
  surface: "#131A2A", // cards, inputs
  surfaceElevated: "#1B2438", // modals, action sheet
  border: "#26314A",

  primary: "#4C8DFF", // main blue
  primaryPressed: "#3A74DB",
  primaryMuted: "#1E2F55", // tinted backgrounds, progress track

  textPrimary: "#F2F5FA",
  textSecondary: "#9AA6BF",
  textOnPrimary: "#FFFFFF",

  success: "#3DD68C", // completed set
  danger: "#FF5C6C", // delete, errors
};
```

### UI Guidelines

- Rounded cards (radius 12 to 16), generous spacing, clear hierarchy.
- Touch targets at least 48dp (gym use, sweaty thumbs).
- The center "+" is a prominent circular primary-colored button, slightly raised above the tab bar.
- Rest timer: slim full-width bar docked at the bottom, filled with `primary` over a `primaryMuted` track, with remaining seconds label.
- Session progress bar at the top uses the same component as the rest timer for consistency.
- Completed sets use `success` for the checkbox and a subtle dimmed row.

## 9. Suggested Project Structure

```
src/
  app/                 # Expo Router routes
    (tabs)/
      index.tsx        # Home
      library.tsx
    choose-workout.tsx
    session/[id].tsx
    exercise/new.tsx
    workout/new.tsx
    workout/[id].tsx
  db/                  # connection, migrations, queries
  components/          # Button, Card, ProgressBar, Select, SetRow...
  store/               # session store (Zustand)
  theme/               # colors, spacing, typography
```

## 10. Acceptance Criteria (MVP)

1. I can add an exercise with a name and a muscle from the predefined list.
2. I can create, edit and delete a workout made of saved exercises with sets, reps and rest time.
3. Home shows **Start a workout**; tapping it lists my workouts; choosing one opens the session screen.
4. In a session I can enter a weight, check a set, and see a rest timer bar at the bottom.
5. The top progress bar reflects completed sets out of total sets.
6. I can add or remove a set during a session.
7. Leaving mid-session keeps it saved, and Home shows a resume card that restores my progress.
8. Tapping **Workout is completed** saves the session as completed with date, sets, reps and weight per set.
9. The bottom bar has Home, a center "+" (Add exercise / Add workout) and Library.
10. The whole UI uses only colors from the central palette file.

## 11. Future Ideas

History screen, per-exercise progress charts, personal records, edit/delete exercises, exercise notes, supersets, kg/lb toggle, backup/export, notifications and sound for rest timer end.
