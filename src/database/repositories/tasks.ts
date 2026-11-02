import { z } from "zod";
import type { Database } from "../schema";
import type {
  CompletionHistory,
  LocalMember,
  Task,
  TaskOccurrence,
} from "../../types/models";
import {
  addDays,
  isDate,
  localDate,
  occurrenceDates,
} from "../../features/tasks/recurrence";
export const categories = [
  "Cleaning",
  "Laundry",
  "Kitchen",
  "Home",
  "Personal",
  "Other",
] as const;
export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a task title").max(120),
    description: z.string().max(4000),
    notes: z.string().max(4000),
    category: z.enum(categories),
    priority: z.enum(["low", "medium", "high"]).nullable(),
    due_date: z
      .string()
      .refine((v) => v === "" || isDate(v), "Use a valid date: YYYY-MM-DD"),
    recurrence: z.enum(["daily", "weekly", "monthly"]).nullable(),
    room: z.string().trim().max(80),
    assigned_member_id: z.string().nullable(),
  })
  .refine((v) => !v.recurrence || !!v.due_date, {
    message: "Recurring tasks need a start date",
    path: ["due_date"],
  });
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskView = "Today" | "Upcoming" | "Overdue" | "Completed";
export class TaskRepository {
  constructor(
    private db: Database,
    private householdId: string,
    private uuid: () => string,
  ) {}
  members() {
    return this.db.getAllAsync<LocalMember>(
      `SELECT m.id,p.display_name FROM household_members m JOIN local_profiles p ON p.id=m.profile_id WHERE m.household_id=? AND m.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY p.display_name`,
      this.householdId,
    );
  }
  async addMember(displayName: string) {
    const name = z.string().trim().min(1).max(80).parse(displayName),
      now = new Date().toISOString(),
      profile = this.uuid(),
      id = this.uuid();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "INSERT INTO local_profiles (id,display_name,created_at,updated_at) VALUES (?,?,?,?)",
        profile,
        name,
        now,
        now,
      );
      await this.db.runAsync(
        "INSERT INTO household_members (id,household_id,profile_id,role,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        id,
        this.householdId,
        profile,
        "member",
        now,
        now,
      );
    });
    return id;
  }
  get(id: string) {
    return this.db.getFirstAsync<Task>(
      "SELECT * FROM tasks WHERE id=? AND household_id=? AND deleted_at IS NULL",
      id,
      this.householdId,
    );
  }
  private async generate(
    task: Pick<Task, "id" | "due_date" | "recurrence">,
    today: string,
  ) {
    const now = new Date().toISOString(),
      through = addDays(today, 90);
    const dates = task.due_date
      ? occurrenceDates(
          task.due_date,
          task.recurrence,
          task.due_date > through ? task.due_date : through,
        )
      : [""];
    const existing = await this.db.getAllAsync<{
      due_date: string;
      deleted_at: string | null;
      completed_at: string | null;
    }>(
      "SELECT due_date,deleted_at,completed_at FROM task_occurrences WHERE task_id=? AND household_id=?",
      task.id,
      this.householdId,
    );
    const byDate = new Map(existing.map((o) => [o.due_date, o]));
    for (const due of dates) {
      const found = byDate.get(due);
      if (found && (!found.deleted_at || found.completed_at)) continue;
      await this.db.runAsync(
        "INSERT OR IGNORE INTO task_occurrences (id,household_id,task_id,due_date,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        this.uuid(),
        this.householdId,
        task.id,
        due,
        now,
        now,
      );
      await this.db.runAsync(
        "UPDATE task_occurrences SET deleted_at=NULL,updated_at=? WHERE task_id=? AND household_id=? AND due_date=? AND deleted_at IS NOT NULL AND completed_at IS NULL",
        now,
        task.id,
        this.householdId,
        due,
      );
    }
  }
  async save(input: TaskInput, id?: string, today = localDate()) {
    const v = taskSchema.parse(input),
      now = new Date().toISOString();
    const taskId = id ?? this.uuid();
    await this.db.withTransactionAsync(async () => {
      if (
        v.assigned_member_id &&
        !(await this.db.getFirstAsync(
          "SELECT id FROM household_members WHERE id=? AND household_id=? AND deleted_at IS NULL",
          v.assigned_member_id,
          this.householdId,
        ))
      )
        throw new Error("Choose a local member of this household.");
      const old = id ? await this.get(id) : null;
      if (id && !old) throw new Error("This task no longer exists.");
      if (id)
        await this.db.runAsync(
          "UPDATE tasks SET title=?,description=?,notes=?,category=?,priority=?,due_date=?,recurrence=?,room=?,assigned_member_id=?,updated_at=? WHERE id=? AND household_id=?",
          v.title,
          v.description,
          v.notes,
          v.category,
          v.priority,
          v.due_date || null,
          v.recurrence,
          v.room || null,
          v.assigned_member_id,
          now,
          taskId,
          this.householdId,
        );
      else
        await this.db.runAsync(
          "INSERT INTO tasks (id,household_id,title,description,notes,category,priority,due_date,recurrence,room,assigned_member_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
          taskId,
          this.householdId,
          v.title,
          v.description,
          v.notes,
          v.category,
          v.priority,
          v.due_date || null,
          v.recurrence,
          v.room || null,
          v.assigned_member_id,
          now,
          now,
        );
      if (
        old &&
        (old.due_date !== (v.due_date || null) ||
          old.recurrence !== v.recurrence)
      )
        await this.db.runAsync(
          "UPDATE task_occurrences SET deleted_at=?,updated_at=? WHERE task_id=? AND household_id=? AND completed_at IS NULL AND deleted_at IS NULL",
          now,
          now,
          taskId,
          this.householdId,
        );
      await this.generate(
        { id: taskId, due_date: v.due_date || null, recurrence: v.recurrence },
        today,
      );
    });
    return taskId;
  }
  async materialize(today = localDate()) {
    await this.db.withTransactionAsync(async () => {
      const tasks = await this.db.getAllAsync<Task>(
        "SELECT * FROM tasks WHERE household_id=? AND deleted_at IS NULL AND recurrence IS NOT NULL",
        this.householdId,
      );
      for (const task of tasks) await this.generate(task, today);
    });
  }
  async list(view: TaskView, today = localDate()) {
    const filter =
      view === "Completed"
        ? "o.completed_at IS NOT NULL"
        : `o.completed_at IS NULL AND ${view === "Today" ? "(o.due_date=? OR o.due_date='')" : view === "Overdue" ? "o.due_date<>'' AND o.due_date<?" : "o.due_date>?"}`;
    return this.db.getAllAsync<TaskOccurrence>(
      `SELECT t.*,o.id AS occurrence_id,o.due_date AS occurrence_due,o.completed_at,p.display_name AS assignee_name FROM task_occurrences o JOIN tasks t ON t.id=o.task_id LEFT JOIN household_members m ON m.id=t.assigned_member_id LEFT JOIN local_profiles p ON p.id=m.profile_id WHERE t.household_id=? AND o.household_id=? AND t.deleted_at IS NULL AND o.deleted_at IS NULL AND ${filter} ORDER BY ${view === "Completed" ? "o.completed_at DESC" : "o.due_date,t.title"}`,
      this.householdId,
      this.householdId,
      ...(view === "Completed" ? [] : [today]),
    );
  }
  async complete(occurrenceId: string, completed: boolean) {
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      const row = await this.db.getFirstAsync<{
        task_id: string;
        completed_at: string | null;
      }>(
        "SELECT o.task_id,o.completed_at FROM task_occurrences o JOIN tasks t ON t.id=o.task_id WHERE o.id=? AND o.household_id=? AND o.deleted_at IS NULL AND t.deleted_at IS NULL",
        occurrenceId,
        this.householdId,
      );
      if (!row) throw new Error("This task occurrence no longer exists.");
      if (!!row.completed_at === completed) return;
      await this.db.runAsync(
        "UPDATE task_occurrences SET completed_at=?,updated_at=? WHERE id=? AND household_id=?",
        completed ? now : null,
        now,
        occurrenceId,
        this.householdId,
      );
      if (completed)
        await this.db.runAsync(
          "INSERT INTO task_completion_history (id,household_id,task_id,occurrence_id,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
          this.uuid(),
          this.householdId,
          row.task_id,
          occurrenceId,
          now,
          now,
          now,
        );
      else
        await this.db.runAsync(
          "UPDATE task_completion_history SET undone_at=?,updated_at=? WHERE occurrence_id=? AND household_id=? AND undone_at IS NULL",
          now,
          now,
          occurrenceId,
          this.householdId,
        );
    });
  }
  async remove(id: string) {
    const now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "UPDATE task_occurrences SET deleted_at=?,updated_at=? WHERE task_id=? AND household_id=? AND deleted_at IS NULL",
        now,
        now,
        id,
        this.householdId,
      );
      await this.db.runAsync(
        "UPDATE tasks SET deleted_at=?,updated_at=? WHERE id=? AND household_id=? AND deleted_at IS NULL",
        now,
        now,
        id,
        this.householdId,
      );
    });
  }
  history(taskId?: string) {
    return this.db.getAllAsync<CompletionHistory>(
      `SELECT h.*,t.title,o.due_date FROM task_completion_history h JOIN tasks t ON t.id=h.task_id JOIN task_occurrences o ON o.id=h.occurrence_id WHERE h.household_id=? AND h.deleted_at IS NULL ${taskId ? "AND h.task_id=?" : ""} ORDER BY h.completed_at DESC,h.id`,
      this.householdId,
      ...(taskId ? [taskId] : []),
    );
  }
  async dashboard(today = localDate()) {
    await this.materialize(today);
    const [todayTasks, overdue, upcoming, completed] = await Promise.all([
      this.list("Today", today),
      this.list("Overdue", today),
      this.list("Upcoming", today),
      this.list("Completed", today),
    ]);
    return {
      today: todayTasks.filter((t) => t.occurrence_due === today).length,
      overdue: overdue.length,
      upcoming: upcoming.slice(0, 3),
      completed: completed.filter(
        (t) => t.completed_at && localDate(new Date(t.completed_at)) === today,
      ).length,
    };
  }
}
