"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { AuthSurface } from "./auth-surface";
import { authMessages, type AuthLocale } from "./messages";
import { retryAfterSeconds, useResendCountdown } from "./use-resend-countdown";

const storageKey = "stolos.password-reset-request";
const requestSchema = z.object({ email: z.email().nullable(), resendAt: z.number().nonnegative() });
type ResetRequest = z.infer<typeof requestSchema>;

const emptyRequest = { email: null, resendAt: 0 };
const emptySnapshot = () => null;
const subscribeToSnapshot = () => () => {};

function readSnapshot() {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function restoreRequest(snapshot: string | null): ResetRequest {
  if (!snapshot) return emptyRequest;
  try {
    return requestSchema.safeParse(JSON.parse(snapshot)).data ?? emptyRequest;
  } catch {
    return emptyRequest;
  }
}

export function ForgotPasswordCard({ locale }: { locale: AuthLocale }) {
  const copy = authMessages[locale];
  const labels = copy.reset;
  const savedSnapshot = useSyncExternalStore(subscribeToSnapshot, readSnapshot, emptySnapshot);
  const [currentRequest, setCurrentRequest] = useState<ResetRequest>();
  const request = currentRequest ?? restoreRequest(savedSnapshot);
  const { coolingDown, remaining, start } = useResendCountdown(request.resendAt);
  const [requestError, setRequestError] = useState<string>();
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<{ email: string }>({
    defaultValues: { email: "" },
  });

  function remember(next: ResetRequest) {
    setCurrentRequest(next);
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Resending remains available in the current page.
    }
  }

  async function send(email: string) {
    if (inFlight.current || Date.now() < request.resendAt) return;
    inFlight.current = true;
    setSending(true);
    setRequestError(undefined);

    try {
      let retryAfter: number | undefined;
      const { error } = await authClient.requestPasswordReset(
        { email, redirectTo: `/${locale}/reset-password` },
        { onResponse({ response }) { if (response.status === 429) retryAfter = retryAfterSeconds(response); } },
      );

      if (error?.status === 429) {
        remember({ ...request, resendAt: start(retryAfter) });
        setRequestError(copy.rateLimit);
      } else if (error) {
        setRequestError(copy.unavailable);
      } else {
        remember({ email, resendAt: start() });
      }
    } catch {
      setRequestError(copy.unavailable);
    } finally {
      setSending(false);
      inFlight.current = false;
    }
  }

  async function submit({ email }: { email: string }) {
    const parsed = z.email(copy.invalidEmail).safeParse(email.trim());
    if (!parsed.success) {
      setError("email", { message: copy.invalidEmail }, { shouldFocus: true });
      return;
    }
    await send(parsed.data);
  }

  const sentTo = request.email;
  const countdown = coolingDown ? ` (${remaining} s)` : "";

  return (
    <AuthSurface locale={locale}>
      <h1 className="text-lm font-semibold">{sentTo ? labels.sentTitle : labels.forgot}</h1>
      <p className="mt-s text-s text-white/75">{sentTo ? labels.sentDescription : labels.requestDescription}</p>

      {sentTo ? (
        <div className="mt-xl flex flex-col items-center gap-m">
          <Button type="button" variant="primary" size="lg" alignment="center" disabled={coolingDown} isLoading={sending} onClick={() => { void send(sentTo); }}>
            {labels.resend}{countdown}
          </Button>
          <Button type="button" variant="ghostMedium" disabled={sending} onClick={() => { setRequestError(undefined); remember({ ...request, email: null }); }}>
            {labels.changeEmail}
          </Button>
        </div>
      ) : (
        <form method="post" noValidate onSubmit={(event) => { void handleSubmit(submit)(event); }} className="mt-xl flex flex-col gap-m text-left">
          <div>
            <label htmlFor="reset-email" className="sr-only">{copy.email}</label>
            <Input
              {...register("email")}
              id="reset-email"
              type="email"
              autoComplete="email"
              readOnly={sending}
              placeholder={copy.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "reset-email-error" : undefined}
              className="rounded-sm border border-white/40 bg-black/10 px-4 py-2.5 focus-within:border-white/70 has-[input[aria-invalid=true]]:border-danger"
              inputClassName="h-7 text-s placeholder:text-white/60"
            />
            {errors.email && <p id="reset-email-error" role="alert" className="mt-s text-sx text-red-300">{errors.email.message}</p>}
          </div>
          <Button type="submit" variant="primary" size="lg" alignment="center" disabled={coolingDown} isLoading={sending}>
            {labels.send}{countdown}
          </Button>
        </form>
      )}

      {requestError && <p role="alert" className="mt-m text-sx text-red-300">{requestError}</p>}

      <Link href={`/${locale}/login`} className="mt-xl inline-block text-sx text-primary-100 hover:underline">
        {labels.backToLogin}
      </Link>
    </AuthSurface>
  );
}
