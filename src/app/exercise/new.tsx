import { useState } from "react";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Button,
  Field,
  Heading,
  InlineError,
  PickerField,
  Screen,
} from "@/components/ui";
import { createExercise, MUSCLES } from "@/db/queries";

export default function NewExerciseScreen() {
  const db = useSQLiteContext();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || !muscle) {
      setError("Enter an exercise name and choose a target muscle.");
      return;
    }
    setSaving(true);
    try {
      await createExercise(db, trimmed, muscle);
      router.back();
    } catch (e) {
      if (String(e).toLowerCase().includes("unique")) {
        setError("An exercise with that name already exists.");
      } else {
        console.error("Could not save the exercise.", e);
        setError("Could not save the exercise.");
      }
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen scroll>
      <Heading subtitle="Add an exercise to your library">New exercise</Heading>
      <Field
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError("");
        }}
        placeholder="e.g. Barbell bench press"
        autoCapitalize="words"
        returnKeyType="done"
      />
      <PickerField
        label="Target muscle"
        value={muscle}
        options={MUSCLES}
        onChange={setMuscle}
      />
      <InlineError>{error}</InlineError>
      <Button
        title={saving ? "Saving…" : "Save exercise"}
        onPress={() => void save()}
        disabled={saving}
      />
      <Button
        title="Cancel"
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
