export interface SyncRecord {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export interface HouseholdRecord extends SyncRecord {
  household_id: string;
}
export interface ShoppingList extends HouseholdRecord {
  name: string;
}
export interface ShoppingItem extends HouseholdRecord {
  list_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  purchased_at: string | null;
  shop_id: string | null;
  notes: string;
  has_photo?: number;
}
/** A future remote adapter can consume stable records; Phase 1 has no remote implementation. */
export interface RecordStore<T extends SyncRecord> {
  list(): Promise<T[]>;
  remove(id: string): Promise<void>;
}

export interface Shop extends HouseholdRecord {
  name: string;
  position: number;
  pinned: number;
  archived_at: string | null;
  outstanding: number;
}
export type AttachmentOwner = "shopping_item" | "task";
export interface Attachment extends HouseholdRecord {
  owner_type: AttachmentOwner;
  owner_id: string;
  filename: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number;
}
export type Recurrence = "daily" | "weekly" | "monthly";
export interface Task extends HouseholdRecord {
  title: string;
  description: string;
  notes: string;
  category: string;
  priority: string | null;
  due_date: string | null;
  recurrence: Recurrence | null;
  room: string | null;
  assigned_member_id: string | null;
}
export interface TaskOccurrence extends Task {
  occurrence_id: string;
  occurrence_due: string;
  completed_at: string | null;
  assignee_name: string | null;
}
export interface CompletionHistory extends HouseholdRecord {
  task_id: string;
  occurrence_id: string;
  completed_at: string;
  undone_at: string | null;
  title: string;
  due_date: string;
}
export interface LocalMember {
  id: string;
  display_name: string;
}
