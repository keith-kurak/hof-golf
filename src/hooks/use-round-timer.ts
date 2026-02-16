import { useSelector } from "@legendapp/state/react";
import { useEffect, useState } from "react";

import { game$, roundStartedAt$, roundTimedOut$ } from "@/store/game-store";

const ROUND_SECONDS = 60;

/**
 * Shared countdown timer for timed game rounds.
 * Reads `roundStartedAt$` from the store so both the team and player screens
 * show the same remaining time.
 */
export function useRoundTimer() {
  const active = useSelector(() => game$.active.get());
  const roundStart = useSelector(() => roundStartedAt$.get());
  const isTimed = !!(active && !active.finished && active.timed);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);

  useEffect(() => {
    if (!isTimed || !roundStart) return;

    const update = () => {
      const elapsed = Math.floor((Date.now() - roundStart) / 1000);
      const remaining = Math.max(0, ROUND_SECONDS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        roundTimedOut$.set(true);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isTimed, roundStart]);

  return { timeLeft, isTimed };
}
