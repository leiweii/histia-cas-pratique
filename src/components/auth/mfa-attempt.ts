import { z } from "zod";

const storageKey = "stolos.pending-mfa";
const methodSchema = z.enum(["totp", "otp"]);
const attemptSchema = z.object({
  methods: z.array(methodSchema).min(1),
  method: methodSchema,
  emailSent: z.boolean(),
  resendAt: z.number().nonnegative(),
}).refine(({ method, methods }) => methods.includes(method));

export type MfaMethod = z.infer<typeof methodSchema>;
export type MfaAttempt = z.infer<typeof attemptSchema>;

export function readMfaSnapshot() {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function parseMfaSnapshot(snapshot: string | null): MfaAttempt | null {
  if (!snapshot) return null;
  try {
    const result = attemptSchema.safeParse(JSON.parse(snapshot));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function writeMfaAttempt(attempt: MfaAttempt | null) {
  try {
    if (attempt) window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
    else window.sessionStorage.removeItem(storageKey);
  } catch {
    // The verification flow still works while this page is open.
  }
}
