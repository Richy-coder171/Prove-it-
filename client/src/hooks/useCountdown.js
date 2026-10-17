import { useEffect, useState } from "react";

export function useCountdown(deadlineAt, serverNow) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, Date.parse(deadlineAt) - Date.parse(serverNow)),
  );

  useEffect(() => {
    const clockOffset = Date.parse(serverNow) - Date.now();
    const update = () =>
      setRemainingMs(
        Math.max(0, Date.parse(deadlineAt) - (Date.now() + clockOffset)),
      );
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [deadlineAt, serverNow]);

  return Math.ceil(remainingMs / 1000);
}
