import { Screen, Card, Label, Body } from "../../src/components/ui";
export default function Calendar() {
  return (
    <Screen title="Room for life" subtitle="Your household calendar">
      <Card>
        <Label>Calendar is coming in a later milestone</Label>
        <Body>
          Local events and task due dates will appear here. Google and Apple
          Calendar synchronization is not connected.
        </Body>
      </Card>
    </Screen>
  );
}
