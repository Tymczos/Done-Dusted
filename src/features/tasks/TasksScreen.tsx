import { useCallback, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDatabase } from "../../database/provider";
import {
  categories,
  taskSchema,
  type TaskInput,
  type TaskView,
} from "../../database/repositories/tasks";
import type {
  CompletionHistory,
  LocalMember,
  TaskOccurrence,
} from "../../types/models";
import { Body, Button, Card, Field, Label, Screen } from "../../components/ui";
import { FormSheet } from "../../components/FormSheet";
import { AttachmentPanel } from "../../components/AttachmentPanel";
import { useTheme } from "../../theme";
export default function TasksScreen() {
  const { tasks } = useDatabase(),
    { colors: c } = useTheme();
  const [view, setView] = useState<TaskView>("Today"),
    [entries, setEntries] = useState<TaskOccurrence[]>([]),
    [members, setMembers] = useState<LocalMember[]>([]),
    [history, setHistory] = useState<CompletionHistory[]>([]),
    [showHistory, setShowHistory] = useState(false),
    [editor, setEditor] = useState<{ task?: TaskOccurrence } | null>(null),
    [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const request = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++request.current;
    await tasks.materialize();
    const [rows, people, log] = await Promise.all([
      tasks.list(view),
      tasks.members(),
      tasks.history(),
    ]);
    if (ticket !== request.current) return;
    setEntries(rows);
    setMembers(people);
    setHistory(log);
  }, [tasks, view]);
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .then(() => setError(""))
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Could not load tasks."),
        )
        .finally(() => setLoading(false));
      return () => {
        request.current++;
      };
    }, [load]),
  );
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update tasks.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Screen
        title="A lighter load"
        subtitle="A little care for the place you call home."
      >
        <Button
          title="＋ Add household task"
          disabled={busy}
          onPress={() => setEditor({})}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["Today", "Upcoming", "Overdue", "Completed"] as const).map((v) => (
            <Button
              key={v}
              title={v}
              secondary={v !== view}
              disabled={busy}
              onPress={() => setView(v)}
            />
          ))}
        </View>
        <Body>
          {view === "Today"
            ? "Due today and tasks without a due date."
            : view === "Upcoming"
              ? "Future tasks and recurring occurrences for the next 90 days. New occurrences are added as time advances."
              : view === "Overdue"
                ? "Unfinished occurrences before today."
                : "Each completed occurrence is recorded separately."}
        </Body>
        {error && (
          <Card>
            <Text accessibilityRole="alert" style={{ color: c.danger }}>
              {error}
            </Text>
            <Button
              title="Retry loading"
              onPress={() => void run(() => Promise.resolve())}
            />
          </Card>
        )}
        {loading && <Body>Loading tasks…</Body>}
        {!loading && !entries.length && (
          <Card>
            <Label>Room to breathe</Label>
            <Body>No tasks in this view.</Body>
          </Card>
        )}
        {entries.map((task) => (
          <Card key={task.occurrence_id}>
            <Label>{task.title}</Label>
            <Body>
              {task.category}
              {task.room ? ` · ${task.room}` : ""}
              {task.priority ? ` · ${task.priority} priority` : ""}
              {task.assignee_name
                ? `\nAssigned to ${task.assignee_name} (local member)`
                : ""}
              {`\n${task.occurrence_due || "No due date"}`}
              {task.recurrence ? ` · ${task.recurrence}` : ""}
            </Body>
            {task.completed_at && (
              <Body>
                Completed {new Date(task.completed_at).toLocaleString()}
              </Body>
            )}
            <Button
              title={task.completed_at ? "Undo completion" : "Mark completed"}
              disabled={busy}
              onPress={() =>
                void run(() =>
                  tasks.complete(task.occurrence_id, !task.completed_at),
                )
              }
            />
            <Button
              title={
                expanded[task.occurrence_id]
                  ? "Hide details"
                  : "Details, notes & photo"
              }
              secondary
              onPress={() =>
                setExpanded((s) => ({
                  ...s,
                  [task.occurrence_id]: !s[task.occurrence_id],
                }))
              }
            />
            {expanded[task.occurrence_id] && (
              <>
                <Body>
                  {task.description || "No description"}
                  {task.notes ? `\nNotes: ${task.notes}` : ""}
                </Body>
                <AttachmentPanel ownerType="task" ownerId={task.id} />
                <Button
                  title="Edit task"
                  secondary
                  disabled={busy}
                  onPress={() => setEditor({ task })}
                />
                <Button
                  title="Delete task"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Delete task?",
                      "This removes the task and all its occurrences from the active views. Its completion history is retained.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => void run(() => tasks.remove(task.id)),
                        },
                      ],
                    )
                  }
                />
                {history
                  .filter((h) => h.task_id === task.id)
                  .map((h) => (
                    <Body key={h.id}>
                      {new Date(h.completed_at).toLocaleString()} · occurrence{" "}
                      {h.due_date || "without date"}
                      {h.undone_at ? " · undone" : ""}
                    </Body>
                  ))}
              </>
            )}
          </Card>
        ))}
        <Button
          title={
            showHistory ? "Hide completion history" : "View completion history"
          }
          secondary
          onPress={() => setShowHistory(!showHistory)}
        />
        {showHistory && (
          <Card>
            <Label>Completion history</Label>
            {history.length ? (
              history.map((h) => (
                <Body key={h.id}>
                  {h.title} · {h.due_date || "Undated"}
                  {"\n"}
                  {new Date(h.completed_at).toLocaleString()}
                  {h.undone_at ? " · undone" : ""}
                </Body>
              ))
            ) : (
              <Body>No completions yet.</Body>
            )}
          </Card>
        )}
      </Screen>
      {editor && (
        <TaskEditor
          task={editor.task}
          members={members}
          busy={busy}
          error={error}
          onClose={() => setEditor(null)}
          onSave={async (value) => {
            if (await run(() => tasks.save(value, editor.task?.id)))
              setEditor(null);
          }}
          onAddMember={async (name) => {
            await tasks.addMember(name);
            setMembers(await tasks.members());
          }}
        />
      )}
    </>
  );
}
function TaskEditor({
  task,
  members,
  busy,
  error,
  onClose,
  onSave,
  onAddMember,
}: {
  task?: TaskOccurrence;
  members: LocalMember[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (v: TaskInput) => Promise<void>;
  onAddMember: (name: string) => Promise<void>;
}) {
  const [memberName, setMemberName] = useState(""),
    [memberBusy, setMemberBusy] = useState(false),
    [memberError, setMemberError] = useState("");
  const { control, handleSubmit } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      notes: task?.notes ?? "",
      category: categories.find((c) => c === task?.category) ?? "Cleaning",
      priority: (task?.priority as TaskInput["priority"]) ?? null,
      due_date: task?.due_date ?? "",
      recurrence: task?.recurrence ?? null,
      room: task?.room ?? "",
      assigned_member_id: task?.assigned_member_id ?? null,
    },
  });
  return (
    <FormSheet
      title={task ? "Edit household task" : "New household task"}
      onClose={onClose}
      busy={busy || memberBusy}
    >
      {(["title", "description", "notes", "due_date", "room"] as const).map(
        (name) => (
          <Controller
            key={name}
            name={name}
            control={control}
            render={({ field, fieldState }) => (
              <>
                <Field
                  label={
                    {
                      title: "Task title",
                      description: "Description (optional)",
                      notes: "Notes (optional)",
                      due_date: "Due / start date (YYYY-MM-DD, optional)",
                      room: "Room (optional)",
                    }[name]
                  }
                  multiline={name === "description" || name === "notes"}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize={name === "due_date" ? "none" : "sentences"}
                />
                {fieldState.error && <Body>{fieldState.error.message}</Body>}
              </>
            )}
          />
        ),
      )}
      <Body>Category</Body>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <Button
                key={c}
                title={c}
                secondary={c !== field.value}
                onPress={() => field.onChange(c)}
              />
            ))}
          </View>
        )}
      />
      <Body>Priority</Body>
      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
            {([null, "low", "medium", "high"] as const).map((p) => (
              <Button
                key={p ?? "none"}
                title={p ?? "None"}
                secondary={p !== field.value}
                onPress={() => field.onChange(p)}
              />
            ))}
          </View>
        )}
      />
      <Body>
        Repeat · each occurrence is completed separately. Monthly tasks stay
        anchored to the original day, clamping to shorter months.
      </Body>
      <Controller
        control={control}
        name="recurrence"
        render={({ field }) => (
          <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
            {([null, "daily", "weekly", "monthly"] as const).map((r) => (
              <Button
                key={r ?? "none"}
                title={r ?? "Never"}
                secondary={r !== field.value}
                onPress={() => field.onChange(r)}
              />
            ))}
          </View>
        )}
      />
      {task && (
        <Body>
          Changing the start date or recurrence replaces unfinished occurrences.
          Existing completions and history are preserved. Editing the other
          fields applies to the entire task.
        </Body>
      )}
      <Body>Assign a local household member</Body>
      <Controller
        control={control}
        name="assigned_member_id"
        render={({ field }) => (
          <View style={{ gap: 8 }}>
            <Button
              title="Unassigned"
              secondary={field.value !== null}
              onPress={() => field.onChange(null)}
            />
            {members.map((m) => (
              <Button
                key={m.id}
                title={m.display_name}
                secondary={field.value !== m.id}
                onPress={() => field.onChange(m.id)}
              />
            ))}
          </View>
        )}
      />
      <Field
        label="Add local member name"
        value={memberName}
        onChangeText={setMemberName}
        maxLength={80}
      />
      <Body>
        Local names only. This does not invite anyone or create an online
        account.
      </Body>
      <Button
        title="Add local member"
        secondary
        disabled={memberBusy || !memberName.trim()}
        onPress={() => {
          setMemberBusy(true);
          setMemberError("");
          onAddMember(memberName)
            .then(() => setMemberName(""))
            .catch((e) =>
              setMemberError(
                e instanceof Error ? e.message : "Could not add member.",
              ),
            )
            .finally(() => setMemberBusy(false));
        }}
      />
      {memberError && <Body>{memberError}</Body>}
      <Body>
        Save the task, then expand its details to manage an optional photo.
        Photos are shared across that task’s occurrences.
      </Body>
      {error && <Body>{error}</Body>}
      <Button
        title={busy ? "Saving…" : "Save task"}
        disabled={busy || memberBusy}
        onPress={() => void handleSubmit(onSave)()}
      />
    </FormSheet>
  );
}
