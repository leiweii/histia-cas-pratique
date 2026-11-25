"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { AuthSurface } from "./auth-surface";
import { authMessages, type AuthLocale } from "./messages";
import type { MfaAttempt, MfaMethod } from "./mfa-attempt";
import { retryAfterSeconds, useResendCountdown } from "./use-resend-countdown";
import { VerificationCode } from "./verification-code";

type TwoFactorCardProps = {
  attempt: MfaAttempt;
  locale: AuthLocale;
  onChange: (attempt: MfaAttempt) => void;
  onVerified: () => void;
  onBack: (expired: boolean) => void;
};

export function TwoFactorCard({ attempt, locale, onChange, onVerified, onBack }: TwoFactorCardProps) {
  const copy = authMessages[locale];
  const labels = copy.mfa;
  const [recovering, setRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState<string>();
  const [codeVersion, resetInput] = useState(0);
  const requestInFlight = useRef(false);
  const automaticSendStarted = useRef(false);
  const email = attempt.method === "otp";
  const { remaining, coolingDown, start } = useResendCountdown(attempt.resendAt);

  const delivery = useMutation({
    mutationFn: async () => {
      let retryAfter: number | undefined;
      const result = await authClient.twoFactor.sendOtp({}, {
        onResponse({ response }) {
          if (response.status === 429) retryAfter = retryAfterSeconds(response);
        },
      });
      return { error: result.error, retryAfter };
    },
  });

  const verification = useMutation({
    gcTime: 0,
    mutationFn: async (code: string) => {
      if (recovering) return authClient.twoFactor.verifyBackupCode({ code });
      if (email) return authClient.twoFactor.verifyOtp({ code });
      return authClient.twoFactor.verifyTotp({ code });
    },
  });
  const busy = delivery.isPending || verification.isPending;

  async function sendCode() {
    if (requestInFlight.current || Date.now() < attempt.resendAt) return;
    requestInFlight.current = true;
    setError(undefined);

    try {
      const result = await delivery.mutateAsync();
      if (result.error?.code === "INVALID_TWO_FACTOR_COOKIE") {
        onBack(true);
        return;
      }

      if (result.error && result.error.status !== 429) {
        setError(copy.unavailable);
        return;
      }

      if (result.error) setError(copy.rateLimit);
      else resetInput((version) => version + 1);

      onChange({
        ...attempt,
        emailSent: attempt.emailSent || !result.error,
        resendAt: start(result.retryAfter),
      });
    } catch {
      setError(copy.unavailable);
    } finally {
      requestInFlight.current = false;
    }
  }

  const sendInitialCode = useEffectEvent(() => { void sendCode(); });
  useEffect(() => {
    if (!email || recovering || attempt.emailSent || attempt.resendAt || automaticSendStarted.current) return;
    automaticSendStarted.current = true;
    sendInitialCode();
  }, [email, recovering, attempt.emailSent, attempt.resendAt]);

  async function verifyCode(code: string) {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setError(undefined);

    try {
      const result = await verification.mutateAsync(code);
      if (!result.error) {
        onVerified();
        return;
      }

      const { code: errorCode, status } = result.error;
      if (errorCode === "INVALID_TWO_FACTOR_COOKIE") {
        onBack(true);
        return;
      }

      if (errorCode === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") setError(labels.requestNewCode);
      else if (status === 429) setError(copy.rateLimit);
      else if (errorCode === "INVALID_BACKUP_CODE") setError(labels.invalidRecovery);
      else if (errorCode === "INVALID_CODE" || errorCode === "OTP_HAS_EXPIRED" || errorCode === "OTP_NOT_ENABLED") {
        setError(recovering ? labels.invalidRecovery : labels.invalidCode);
      } else {
        setError(copy.unavailable);
      }
    } catch {
      setError(copy.unavailable);
    } finally {
      setRecoveryCode("");
      resetInput((version) => version + 1);
      verification.reset();
      requestInFlight.current = false;
    }
  }

  function chooseMethod(method: MfaMethod) {
    setError(undefined);
    onChange({ ...attempt, method });
  }

  function showRecovery(visible: boolean) {
    setError(undefined);
    setRecoveryCode("");
    setRecovering(visible);
  }

  function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = recoveryCode.trim();
    if (code) void verifyCode(code);
  }

  return (
    <AuthSurface locale={locale}>
      <h1 className="text-lm font-semibold">{recovering ? labels.recoveryTitle : labels.title}</h1>

      {recovering ? (
        <form onSubmit={submitRecovery} method="post" className="mt-xl flex flex-col gap-m text-left">
          <label htmlFor="recovery-code" className="sr-only">{labels.recoveryLabel}</label>
          <Input
            id="recovery-code"
            required
            value={recoveryCode}
            readOnly={busy}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "mfa-error" : undefined}
            placeholder={labels.recoveryLabel}
            onChange={(event) => setRecoveryCode(event.target.value)}
            className="rounded-sm border border-white/40 bg-black/10 px-4 py-2.5 focus-within:border-white/70"
            inputClassName="h-7 text-s placeholder:text-white/60"
          />
          <Button type="submit" variant="primary" size="lg" alignment="center" disabled={!recoveryCode.trim()} isLoading={verification.isPending}>
            {labels.verify}
          </Button>
        </form>
      ) : (
        <>
          <p className="mt-s text-s text-white/75">{email ? labels.emailInstruction : labels.appInstruction}</p>
          <div className="mt-xl">
            <VerificationCode
              key={`${attempt.method}-${codeVersion}`}
              label={labels.codeGroup}
              digitLabel={labels.digit}
              readOnly={busy}
              errorId={error ? "mfa-error" : undefined}
              onComplete={(code) => { void verifyCode(code); }}
            />
          </div>
        </>
      )}

      {error && <p id="mfa-error" role="alert" className="mt-m text-sx text-red-300">{error}</p>}
      {verification.isPending && <p role="status" className="mt-m text-sx text-white/75">{labels.verifying}</p>}

      <div className="mt-xl flex flex-col items-center gap-sm">
        {!recovering && email && (
          <>
            <Button type="button" variant="ghostMedium" disabled={busy || coolingDown} onClick={() => { void sendCode(); }}>
              {attempt.emailSent ? labels.resend : labels.send}{coolingDown ? ` (${remaining} s)` : ""}
            </Button>
            {delivery.isPending && <p role="status" className="text-sx text-white/75">{labels.sending}</p>}
            {!delivery.isPending && attempt.emailSent && !error && <p role="status" className="text-sx text-white/75">{labels.sent}</p>}
          </>
        )}

        {!recovering && attempt.methods.includes("totp") && attempt.methods.includes("otp") && (
          <Button type="button" variant="ghostMedium" disabled={busy} onClick={() => chooseMethod(email ? "totp" : "otp")}>
            {email ? labels.useApp : labels.useEmail}
          </Button>
        )}

        <Button type="button" variant="ghostMedium" disabled={busy} onClick={() => showRecovery(!recovering)}>
          {recovering ? labels.backToCode : labels.useRecovery}
        </Button>
        <Button type="button" variant="ghostMonochrome" disabled={busy} onClick={() => onBack(false)}>
          {labels.backToLogin}
        </Button>
      </div>
    </AuthSurface>
  );
}
