"use client";

import { useEffect, useState } from "react";

const cooldownSeconds = 30;

export function retryAfterSeconds(response: Response) {
  const seconds = Number.parseInt(response.headers.get("X-Retry-After") ?? "", 10);
  return seconds > 0 ? seconds : cooldownSeconds;
}

export function useResendCountdown(resendAt: number) {
  const [now, setNow] = useState<number | null>(null);
  const remaining = now === null ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));
  const coolingDown = remaining > 0;

  useEffect(() => {
    if (!resendAt) return;

    function tick() {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime < resendAt) timer = window.setTimeout(tick, 250);
    }

    let timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [resendAt]);

  function start(seconds = cooldownSeconds) {
    const startedAt = Date.now();
    setNow(startedAt);
    return startedAt + seconds * 1000;
  }

  return { remaining, coolingDown, start };
}
