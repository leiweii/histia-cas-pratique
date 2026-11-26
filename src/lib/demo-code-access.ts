import { createHash, timingSafeEqual } from "node:crypto";

export function canReadDemoCodes(authorization: string | null) {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.DEMO_CODE_PUBLIC === "true") return true;

  const password = process.env.DEMO_CODE_PASSWORD;
  const token = authorization?.match(/^Basic ([A-Za-z0-9+/=]+)$/i)?.[1];
  if (!password || !token) return false;

  const expected = Buffer.from(`demo:${password}`).toString("base64");
  return timingSafeEqual(
    createHash("sha256").update(token).digest(),
    createHash("sha256").update(expected).digest(),
  );
}
