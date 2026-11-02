import { useCallback, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Screen, Card, Label, Body, Button } from "../../src/components/ui";
import { SceneHero } from "../../src/components/scenery/SceneHero";
import { householdName } from "../../src/database/repositories/household";
import { useDatabase } from "../../src/database/provider";
import { useTheme } from "../../src/theme";
import type { TaskRepository } from "../../src/database/repositories/tasks";
import type { DashboardId } from "../../src/theme/preferences";
export default function Home() {
  const { shopping, tasks, db, householdId } = useDatabase();
  const { preferences, greeting, now } = useTheme();
  const [count, setCount] = useState(0),
    [name, setName] = useState("Our home"),
    [summary, setSummary] = useState<Awaited<
      ReturnType<TaskRepository["dashboard"]>
    > | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void reload;
      void dayKey;
      const load = () =>
        Promise.all([
          shopping.outstandingCount(),
          householdName(db, householdId),
          tasks.dashboard(),
        ])
          .then(([n, h, s]) => {
            if (active) {
              setCount(n);
              setName(h);
              setSummary(s);
              setError("");
            }
          })
          .catch(() => {
            if (active) setError("Unable to load your household.");
          });
      void load();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void load();
      });
      return () => {
        active = false;
        subscription.remove();
      };
    }, [shopping, tasks, db, householdId, reload, dayKey]),
  );
  const sections: Record<DashboardId, React.ReactNode> = {
    shopping: (
      <Card>
        <Label>Your next shopping trip</Label>
        <Body>
          {count} shopping {count === 1 ? "item" : "items"} remaining
        </Body>
        <Button
          title="Open shopping lists"
          onPress={() => router.push("/shopping")}
        />
      </Card>
    ),
    tasks: (
      <Card>
        <Label>Today at home</Label>
        {summary ? (
          <>
            <Body>
              {summary.today} tasks due today · {summary.overdue} overdue
            </Body>
            <Body>{summary.completed} completed today</Body>
          </>
        ) : (
          <Body>Loading tasks…</Body>
        )}
        <Button
          title="Open household tasks"
          onPress={() => router.push("/tasks")}
        />
      </Card>
    ),
    upcoming: (
      <Card>
        <Label>A little look ahead</Label>
        {summary?.upcoming.length ? (
          summary.upcoming.map((task) => (
            <Body key={task.occurrence_id}>
              {task.title} · {task.occurrence_due}
              {task.room ? ` · ${task.room}` : ""}
            </Body>
          ))
        ) : (
          <Body>No upcoming chores.</Body>
        )}
      </Card>
    ),
  };
  return (
    <Screen title={greeting} subtitle={`${name} · One thing at a time.`}>
      <SceneHero />
      {error && (
        <Card>
          <Body>{error}</Body>
          <Button title="Retry" onPress={() => setReload((n) => n + 1)} />
        </Card>
      )}
      <Card>
        <Label>Make a little space</Label>
        <Button
          title="＋ Shopping item"
          secondary
          onPress={() => router.push("/shopping")}
        />
        <Button
          title="＋ Household task"
          secondary
          onPress={() => router.push("/tasks")}
        />
      </Card>
      {preferences.dashboard
        .filter((section) => section.visible)
        .map((section) => (
          <DashboardSection key={section.id}>
            {sections[section.id]}
          </DashboardSection>
        ))}
      <Button
        title="Personalize your Home"
        secondary
        onPress={() => router.push("/personalize")}
      />
      <Body>Stored on this device only. No cloud synchronization.</Body>
    </Screen>
  );
}
function DashboardSection({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
