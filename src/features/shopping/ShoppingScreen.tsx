import { useCallback, useRef, useState } from "react";
import { Alert, View, Text, Pressable, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "../../database/provider";
import {
  itemSchema,
  listSchema,
  type ItemInput,
} from "../../database/repositories/shopping";
import type { Shop, ShoppingList, ShoppingItem } from "../../types/models";
import { Screen, Card, Body, Label, Button, Field } from "../../components/ui";
import { FormSheet } from "../../components/FormSheet";
import { AttachmentPanel } from "../../components/AttachmentPanel";
import { useTheme } from "../../theme";
import { ShopManager } from "./ShopManager";
type Editor =
  | { kind: "list"; id?: string; name: string }
  | { kind: "item"; item?: ShoppingItem };
export default function ShoppingScreen() {
  const { shopping, shops: shopRepo } = useDatabase(),
    { colors: c } = useTheme();
  const [lists, setLists] = useState<ShoppingList[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [items, setItems] = useState<ShoppingItem[]>([]),
    [shops, setShops] = useState<Shop[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [manage, setManage] = useState(false),
    [byShop, setByShop] = useState(false),
    [savedOpen, setSavedOpen] = useState(false),
    [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const selection = useRef(selected);
  selection.current = selected;
  const request = useRef(0);
  const refresh = useCallback(
    async (preferred?: string | null) => {
      const ticket = ++request.current;
      const next = await shopping.lists();
      const id = next.some((l) => l.id === preferred)
        ? preferred
        : (next[0]?.id ?? null);
      const [entries, groups] = await Promise.all([
        id ? shopping.items(id) : Promise.resolve([]),
        shopRepo.list(id ?? undefined, true),
      ]);
      if (ticket !== request.current) return;
      setLists(next);
      setSelected(id ?? null);
      setItems(entries);
      setShops(groups);
    },
    [shopping, shopRepo],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      refresh(selection.current)
        .catch(() => {
          if (active) setError("Could not load shopping. Try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [refresh]),
  );
  async function run(action: () => Promise<unknown>, preferred = selected) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh(preferred);
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function confirm(title: string, action: () => Promise<unknown>) {
    Alert.alert(
      title,
      "This removes the selected data from your active lists.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void run(action),
        },
      ],
    );
  }
  const list = lists.find((l) => l.id === selected),
    active = items.filter((i) => !i.purchased_at),
    completed = items.filter((i) => i.purchased_at),
    available = shops.filter((s) => !s.archived_at);
  function row(item: ShoppingItem) {
    return (
      <View
        key={item.id}
        style={{
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          paddingVertical: 8,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`${item.purchased_at ? "Undo purchase" : "Mark purchased"}: ${item.name}`}
            accessibilityState={{
              checked: !!item.purchased_at,
              disabled: busy,
            }}
            disabled={busy}
            onPress={() =>
              void run(() => shopping.setPurchased(item.id, !item.purchased_at))
            }
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={item.purchased_at ? "checkmark-circle" : "ellipse-outline"}
              color={c.primary}
              size={28}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${expanded[item.id] ? "Collapse" : "Expand"} details for ${item.name}${item.has_photo ? ", photo attached" : ""}`}
            accessibilityState={{ expanded: !!expanded[item.id] }}
            onPress={() =>
              setExpanded((v) => ({ ...v, [item.id]: !v[item.id] }))
            }
            style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
          >
            <Text
              style={{
                color: c.text,
                fontSize: 17,
                textDecorationLine: item.purchased_at ? "line-through" : "none",
              }}
            >
              {item.name} {item.has_photo ? "📷" : ""}
            </Text>
            <Body>
              {item.quantity}
              {item.unit ? ` ${item.unit}` : ""}
              {item.shop_id
                ? ` · ${shops.find((s) => s.id === item.shop_id)?.name ?? "Shop"}`
                : ""}
            </Body>
          </Pressable>
        </View>
        {expanded[item.id] && (
          <View style={{ gap: 12 }}>
            <Body>
              {item.category || "No category"}
              {item.notes ? `\n${item.notes}` : ""}
            </Body>
            <AttachmentPanel
              ownerType="shopping_item"
              ownerId={item.id}
              onChanged={() => void run(() => Promise.resolve())}
            />
            <Button
              title={`Edit ${item.name}`}
              secondary
              disabled={busy}
              onPress={() => setEditor({ kind: "item", item })}
            />
            <Button
              title={`Delete ${item.name}`}
              secondary
              disabled={busy}
              onPress={() =>
                confirm(`Delete ${item.name}?`, () =>
                  shopping.deleteItem(item.id),
                )
              }
            />
          </View>
        )}
      </View>
    );
  }
  function group(shop: Shop) {
    const entries = items.filter((i) => i.shop_id === shop.id),
      key = `shop:${shop.id}`;
    return (
      <Card key={shop.id}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !!expanded[key] }}
          accessibilityLabel={`${shop.name}, ${shop.outstanding} outstanding`}
          onPress={() => setExpanded((v) => ({ ...v, [key]: !v[key] }))}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text
            style={{ color: c.text, fontSize: 18, flex: 1, fontWeight: "600" }}
          >
            {shop.pinned ? "★ " : ""}
            {shop.name}
          </Text>
          <Text
            style={{
              color: c.muted,
              backgroundColor: c.soft,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            {shop.outstanding}
          </Text>
          <Text style={{ color: c.text }}>{expanded[key] ? "⌃" : "⌄"}</Text>
        </Pressable>
        {expanded[key] &&
          (entries.length ? (
            <>
              <Body>To pick up</Body>
              {entries.filter((i) => !i.purchased_at).map(row)}
              {entries.some((i) => i.purchased_at) && <Body>Purchased</Body>}
              {entries.filter((i) => i.purchased_at).map(row)}
            </>
          ) : (
            <Body>No items on this list.</Body>
          ))}
      </Card>
    );
  }
  return (
    <>
      <Screen
        title="The little essentials"
        subtitle="One less thing to remember."
      >
        {error && (
          <Card>
            <Text accessibilityRole="alert" style={{ color: c.danger }}>
              {error}
            </Text>
            <Button
              title="Retry"
              onPress={() => void run(() => Promise.resolve())}
            />
          </Card>
        )}
        {loading && <Body>Opening your lists…</Body>}
        <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
          {lists.map((l) => (
            <Button
              key={l.id}
              title={l.name}
              secondary={l.id !== selected}
              disabled={busy}
              onPress={() => void run(() => Promise.resolve(), l.id)}
            />
          ))}
        </ScrollView>
        <Button
          title="＋ Create a list"
          secondary
          disabled={busy}
          onPress={() => setEditor({ kind: "list", name: "" })}
        />
        <Button
          title="Manage shops"
          secondary
          disabled={busy}
          onPress={() => setManage(true)}
        />
        {list ? (
          <>
            <Card>
              <Label>{list.name}</Label>
              <Body>
                {active.length} to pick up · {completed.length} purchased
              </Body>
              <Button
                title="＋ Add item"
                disabled={busy}
                onPress={() => setEditor({ kind: "item" })}
              />
              <Button
                title="Rename list"
                secondary
                disabled={busy}
                onPress={() =>
                  setEditor({ kind: "list", id: list.id, name: list.name })
                }
              />
              <Button
                title="Delete list"
                secondary
                disabled={busy}
                onPress={() =>
                  confirm(`Delete ${list.name} and its items?`, () =>
                    shopping.deleteList(list.id),
                  )
                }
              />
            </Card>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                title="All Items"
                secondary={byShop}
                onPress={() => setByShop(false)}
              />
              <Button
                title="By Shop"
                secondary={!byShop}
                onPress={() => setByShop(true)}
              />
            </View>
            {byShop ? (
              <>
                {available.filter((s) => s.outstanding > 0).map(group)}
                {active.some((i) => !i.shop_id) && (
                  <Card>
                    <Label>Unassigned</Label>
                    <Body>Also available in All Items.</Body>
                    {active.filter((i) => !i.shop_id).map(row)}
                  </Card>
                )}
                <Button
                  title={`${savedOpen ? "Hide" : "Show"} Saved Shops (${available.filter((s) => s.outstanding === 0).length})`}
                  secondary
                  onPress={() => setSavedOpen(!savedOpen)}
                />
                {savedOpen &&
                  available.filter((s) => s.outstanding === 0).map(group)}
              </>
            ) : (
              <Card>
                <Label>To pick up</Label>
                {active.length ? (
                  active.map(row)
                ) : (
                  <Body>All clear. Add something for your next trip.</Body>
                )}
              </Card>
            )}
            {completed.length > 0 && (
              <Card>
                <Label>
                  {byShop ? "Purchased overview" : "Purchased · all shops"}
                </Label>
                {byShop && (
                  <Body>
                    Purchased items assigned to shops appear within their shop
                    sections. Unassigned purchases appear below.
                  </Body>
                )}
                {(byShop ? completed.filter((i) => !i.shop_id) : completed).map(
                  row,
                )}
                <Button
                  title="Clear purchased items"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    confirm("Clear purchased items?", () =>
                      shopping.clearCompleted(list.id),
                    )
                  }
                />
              </Card>
            )}
          </>
        ) : (
          !loading && (
            <Card>
              <Label>Start with your first list</Label>
              <Body>Create a list for your next trip.</Body>
            </Card>
          )
        )}
      </Screen>
      {manage && (
        <ShopManager
          shops={shops}
          onClose={() => setManage(false)}
          onChange={() => refresh(selected)}
        />
      )}
      {editor && (
        <EditorModal
          key={
            editor.kind === "item"
              ? (editor.item?.id ?? "new-item")
              : (editor.id ?? "new-list")
          }
          editor={editor}
          shops={available}
          busy={busy}
          error={error}
          onClose={() => setEditor(null)}
          onSave={async (value) => {
            let created: string | undefined;
            const success = await run(async () => {
              if (editor.kind === "list") {
                if (editor.id) await shopping.renameList(editor.id, value.name);
                else created = await shopping.createList(value.name);
              } else if (selected)
                await shopping.saveItem(
                  selected,
                  value as ItemInput,
                  editor.item?.id,
                );
            });
            if (success) {
              setEditor(null);
              if (created) await refresh(created);
            }
          }}
        />
      )}
    </>
  );
}
function EditorModal({
  editor,
  shops,
  busy,
  error,
  onClose,
  onSave,
}: {
  editor: Editor;
  shops: Shop[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (v: ItemInput | { name: string }) => Promise<void>;
}) {
  const listForm = useForm<{ name: string }>({
    resolver: zodResolver(listSchema),
    defaultValues: { name: editor.kind === "list" ? editor.name : "" },
  });
  const item = editor.kind === "item" ? editor.item : undefined;
  const itemForm = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name ?? "",
      quantity: item?.quantity ?? 1,
      unit: item?.unit ?? "",
      category: item?.category ?? "",
      shop_id: item?.shop_id ?? null,
      notes: item?.notes ?? "",
    },
  });
  return (
    <FormSheet
      title={
        editor.kind === "list"
          ? "Shopping list"
          : item
            ? "Edit item"
            : "Add an essential"
      }
      busy={busy}
      onClose={onClose}
    >
      {editor.kind === "list" ? (
        <Controller
          control={listForm.control}
          name="name"
          render={({ field, fieldState }) => (
            <>
              <Field
                label="List name"
                autoFocus
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                maxLength={80}
              />
              {fieldState.error && <Body>{fieldState.error.message}</Body>}
            </>
          )}
        />
      ) : (
        <>
          {(["name", "quantity", "unit", "category", "notes"] as const).map(
            (name) => (
              <Controller
                key={name}
                control={itemForm.control}
                name={name}
                render={({ field, fieldState }) => (
                  <>
                    <Field
                      label={
                        {
                          name: "Item name",
                          quantity: "Quantity",
                          unit: "Unit (optional)",
                          category: "Category (optional)",
                          notes: "Notes (optional)",
                        }[name]
                      }
                      multiline={name === "notes"}
                      keyboardType={
                        name === "quantity" ? "decimal-pad" : "default"
                      }
                      value={String(field.value ?? "")}
                      onChangeText={(v) =>
                        field.onChange(
                          name === "quantity"
                            ? v === ""
                              ? ""
                              : Number(v.replace(",", "."))
                            : v,
                        )
                      }
                      onBlur={field.onBlur}
                    />
                    {fieldState.error && (
                      <Body>{fieldState.error.message}</Body>
                    )}
                  </>
                )}
              />
            ),
          )}
          <Body>Shop assignment · change to move this item</Body>
          <Controller
            control={itemForm.control}
            name="shop_id"
            render={({ field }) => (
              <View style={{ gap: 8 }}>
                <Button
                  title="Unassigned"
                  secondary={field.value !== null}
                  onPress={() => field.onChange(null)}
                />
                {shops.map((s) => (
                  <Button
                    key={s.id}
                    title={s.name}
                    secondary={field.value !== s.id}
                    onPress={() => field.onChange(s.id)}
                  />
                ))}
              </View>
            )}
          />
          <Body>
            {item
              ? "Expand this item in the list to manage its photo."
              : "Save the item, then expand its details to attach an optional photo."}
          </Body>
        </>
      )}
      {error && <Body>{error}</Body>}
      <Button
        title={busy ? "Saving…" : "Save"}
        disabled={busy}
        onPress={() =>
          void (editor.kind === "list"
            ? listForm.handleSubmit(onSave)()
            : itemForm.handleSubmit(onSave)())
        }
      />
    </FormSheet>
  );
}
