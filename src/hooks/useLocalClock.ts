import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { nextBoundary } from "../theme/time";
export function useLocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      const date = new Date();
      setNow(date);
      clearTimeout(timer);
      const midnight = new Date(date);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(
        refresh,
        Math.max(
          100,
          Math.min(nextBoundary(date).getTime(), midnight.getTime()) -
            date.getTime() +
            30,
        ),
      );
    }
    refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  return now;
}
