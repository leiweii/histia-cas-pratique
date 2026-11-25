"use client";

import { useEffect, useState } from "react";

const cooldownSeconds = 30;

export function retryAfterSeconds(response: Response) {
  const seconds = Number.parseInt(response.headers.get("X-Retry-After") ?? "", 10);
  return seconds > 0 ? seconds : cooldownSeconds;
}

export function useResendCountdown(resendAt: number) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const coolingDown = remaining > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [coolingDown]);

  function start(seconds = cooldownSeconds) {
    const startedAt = Date.now();
    setNow(startedAt);
    return startedAt + seconds * 1000;
  }

  return { remaining, coolingDown, start };
}
