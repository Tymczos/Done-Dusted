import { useRef, useState } from "react";
import { Alert, PanResponder, Pressable, Text, View } from "react-native";
import type { Shop } from "../../types/models";
import { useDatabase } from "../../database/provider";
import { useTheme } from "../../theme";
import { Button, Body, Card, Field } from "../../components/ui";
import { FormSheet } from "../../components/FormSheet";
import { moveShop } from "./shopOrder";
export function ShopManager({
  shops,
  onClose,
  onChange,
}: {
  shops: Shop[];
  onClose: () => void;
  onChange: () => Promise<void>;
}) {
  const { shops: repo } = useDatabase();
  const [name, setName] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dragging, setDragging] = useState<string | null>(null);
  const active = shops.filter((s) => !s.archived_at);
  const latest = useRef(active);
  latest.current = active;
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChange();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update shops.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function move(id: string, to: number) {
    const ordered = moveShop(latest.current, id, to);
    void run(() => repo.reorder(ordered.map((s) => s.id)));
  }
  return (
    <FormSheet title="Your shops" onClose={onClose} busy={busy}>
      <Body>
        Shops are reusable across lists. Pinned favourites stay first. Drag the
        handle vertically to reorder within each group, or use the up/down
        buttons.
      </Body>
      <Field
        label={editing ? "Rename shop" : "New shop name"}
        value={name}
        onChangeText={setName}
        maxLength={80}
      />
      <Button
        title={editing ? "Save shop name" : "Create shop"}
        disabled={busy || !name.trim()}
        onPress={() =>
          void run(async () => {
            if (editing) await repo.rename(editing, name);
            else await repo.create(name);
            setName("");
            setEditing(null);
          })
        }
      />
      {editing && (
        <Button
          title="Cancel rename"
          secondary
          onPress={() => {
            setEditing(null);
            setName("");
          }}
        />
      )}
      {error && <Body>{error}</Body>}
      <View>
        {active.map((shop, index) => (
          <DragRow
            key={shop.id}
            shop={shop}
            index={index}
            busy={busy}
            dragging={dragging === shop.id}
            onStart={() => setDragging(shop.id)}
            onEnd={() => setDragging(null)}
            onMove={(dy) => {
              setDragging(null);
              move(shop.id, index + Math.round(dy / 80));
            }}
            onUp={() => move(shop.id, index - 1)}
            onDown={() => move(shop.id, index + 1)}
          />
        ))}
      </View>
      {active.map((shop) => (
        <Card key={shop.id}>
          <Body>
            {shop.name} · {shop.outstanding} outstanding
          </Body>
          <Button
            title={shop.pinned ? "Unpin favourite" : "Pin favourite"}
            secondary
            disabled={busy}
            onPress={() => void run(() => repo.pin(shop.id, !shop.pinned))}
          />
          <Button
            title={`Rename ${shop.name}`}
            secondary
            disabled={busy}
            onPress={() => {
              setEditing(shop.id);
              setName(shop.name);
            }}
          />
          <Button
            title={`Archive ${shop.name}`}
            secondary
            disabled={busy}
            onPress={() =>
              Alert.alert(
                "Archive shop?",
                "Its items will remain in All Items as unassigned.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Archive",
                    onPress: () => void run(() => repo.archive(shop.id)),
                  },
                ],
              )
            }
          />
        </Card>
      ))}
      {shops.some((s) => s.archived_at) && <Body>Archived shops</Body>}
      {shops
        .filter((s) => s.archived_at)
        .map((s) => (
          <Button
            key={s.id}
            title={`Restore ${s.name}`}
            secondary
            disabled={busy}
            onPress={() => void run(() => repo.archive(s.id, false))}
          />
        ))}
    </FormSheet>
  );
}
function DragRow({
  shop,
  index,
  busy,
  dragging,
  onStart,
  onEnd,
  onMove,
  onUp,
  onDown,
}: {
  shop: Shop;
  index: number;
  busy: boolean;
  dragging: boolean;
  onStart: () => void;
  onEnd: () => void;
  onMove: (dy: number) => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const { colors: c } = useTheme();
  const [offset, setOffset] = useState(0);
  const callbacks = useRef({ busy, onStart, onEnd, onMove });
  callbacks.current = { busy, onStart, onEnd, onMove };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !callbacks.current.busy,
      onMoveShouldSetPanResponder: (_, g) =>
        !callbacks.current.busy && Math.abs(g.dy) > 5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => callbacks.current.onStart(),
      onPanResponderMove: (_, g) => setOffset(g.dy),
      onPanResponderRelease: (_, g) => {
        setOffset(0);
        callbacks.current.onMove(g.dy);
      },
      onPanResponderTerminate: () => {
        setOffset(0);
        callbacks.current.onEnd();
      },
    }),
  ).current;
  return (
    <View
      style={{
        height: 80,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: dragging ? c.soft : c.card,
        borderBottomWidth: 1,
        borderColor: c.border,
        transform: [{ translateY: dragging ? offset : 0 }],
        zIndex: dragging ? 10 : 0,
      }}
    >
      <View
        {...responder.panHandlers}
        accessible
        accessibilityLabel={`Drag ${shop.name} to reorder. Use move up or down buttons as an alternative.`}
        style={{
          width: 48,
          height: 64,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: c.text, fontSize: 26 }}>☰</Text>
      </View>
      <Text style={{ flex: 1, color: c.text }}>
        {shop.pinned ? "★ " : ""}
        {shop.name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${shop.name} up`}
        disabled={busy || index === 0}
        onPress={onUp}
        style={{ padding: 16, minHeight: 48 }}
      >
        <Text style={{ color: c.text }}>↑</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Move ${shop.name} down`}
        disabled={busy}
        onPress={onDown}
        style={{ padding: 16, minHeight: 48 }}
      >
        <Text style={{ color: c.text }}>↓</Text>
      </Pressable>
    </View>
  );
}
