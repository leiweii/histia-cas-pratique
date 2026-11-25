"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { AuthSurface } from "./auth-surface";
import { authMessages, type AuthLocale } from "./messages";
import { parseMfaSnapshot, readMfaSnapshot, writeMfaAttempt, type MfaAttempt, type MfaMethod } from "./mfa-attempt";
import { TwoFactorCard } from "./two-factor-card";

const modes = ["login", "signup"] as const;
type Mode = (typeof modes)[number];
type Credentials = { email: string; password: string; confirmation: string };
const noPendingAttempt = () => null;
const subscribeToSnapshot = () => () => {};

export function LoginCard({ locale }: { locale: AuthLocale }) {
  const router = useRouter();
  const copy = authMessages[locale];
  const [mode, setMode] = useState<Mode>("login");
  const savedMfa = useSyncExternalStore(subscribeToSnapshot, readMfaSnapshot, noPendingAttempt);
  const [currentMfa, setCurrentMfa] = useState<MfaAttempt | null>();
  const mfa = currentMfa === undefined ? parseMfaSnapshot(savedMfa) : currentMfa;
  const tabs = useRef<Partial<Record<Mode, HTMLButtonElement>>>({});
  const { register, handleSubmit, setError, clearErrors, resetField, formState } =
    useForm<Credentials>({ defaultValues: { email: "", password: "", confirmation: "" }, shouldUnregister: true });
  const { errors, isSubmitting } = formState;
  const isSignup = mode === "signup";
  const content = copy[mode];

  const authentication = useMutation({
    gcTime: 0,
    mutationFn: async ({ email, password }: Credentials) => {
      if (isSignup) {
        const name = email.slice(0, email.indexOf("@"));
        const { error } = await authClient.signUp.email({ name, email, password });
        return { error, methods: null };
      }

      const { data, error } = await authClient.signIn.email({ email, password });
      if (!data || !("twoFactorRedirect" in data) || data.twoFactorRedirect !== true) {
        return { error, methods: null };
      }

      const methods = "twoFactorMethods" in data && Array.isArray(data.twoFactorMethods)
        ? data.twoFactorMethods.filter((method): method is MfaMethod => method === "totp" || method === "otp")
        : [];
      return { error, methods };
    },
  });

  function updateMfa(attempt: MfaAttempt | null) {
    writeMfaAttempt(attempt);
    setCurrentMfa(attempt);
  }

  function completeSignIn() {
    updateMfa(null);
    router.replace(`/${locale}/account`);
  }

  function returnToLogin(expired: boolean) {
    updateMfa(null);
    if (expired) setError("root.auth", { message: copy.mfa.expiredSession });
  }

  function selectMode(nextMode: Mode) {
    if (nextMode === mode || isSubmitting) return;

    resetField("password");
    clearErrors();
    setMode(nextMode);
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    let nextMode: Mode;
    switch (event.key) {
      case "Home": nextMode = "login"; break;
      case "End": nextMode = "signup"; break;
      case "ArrowLeft":
      case "ArrowRight": nextMode = isSignup ? "login" : "signup"; break;
      default: return;
    }

    event.preventDefault();
    selectMode(nextMode);
    tabs.current[nextMode]?.focus();
  }

  const submit = handleSubmit(async (values) => {
    clearErrors();
    const schema = z.object({
      email: z.string().trim().pipe(z.email(copy.invalidEmail)),
      password: z.string().min(isSignup ? 8 : 1, isSignup ? copy.shortPassword : copy.missingPassword)
        .max(128, copy.longPassword),
      confirmation: z.string().optional(),
    }).refine(({ password, confirmation }) => !isSignup || password === confirmation, {
      path: ["confirmation"],
      message: copy.passwordsDiffer,
    });

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      let focus = true;
      for (const field of ["email", "password", "confirmation"] as const) {
        const message = fields[field]?.[0];
        if (!message) continue;
        setError(field, { type: "validate", message }, { shouldFocus: focus });
        focus = false;
      }
      return;
    }

    try {
      const { error, methods } = await authentication.mutateAsync({
        ...values,
        email: parsed.data.email,
      });

      if (error) {
        const message = error.status === 429 ? copy.rateLimit : {
          INVALID_EMAIL_OR_PASSWORD: copy.badCredentials,
          USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: copy.duplicateEmail,
        }[error.code ?? ""] ?? copy.unavailable;
        setError("root.auth", { message });
        return;
      }

      if (methods) {
        const method = methods.includes("totp") ? "totp" : methods[0];
        if (!method) {
          setError("root.auth", { message: copy.unavailable });
          return;
        }

        resetField("password");
        updateMfa({ methods, method, emailSent: false, resendAt: 0 });
        return;
      }

      completeSignIn();
    } catch {
      setError("root.auth", { message: copy.unavailable });
    } finally {
      authentication.reset();
    }
  });

  if (mfa) {
    return (
      <TwoFactorCard
        attempt={mfa}
        locale={locale}
        onChange={updateMfa}
        onVerified={completeSignIn}
        onBack={returnToLogin}
      />
    );
  }

  return (
    <AuthSurface locale={locale}>
      <header>
        <h1 className="text-lm font-semibold">{content.title}</h1>
        <p className="mt-s text-s text-white/65">{content.description}</p>
      </header>

      <div role="tablist" aria-label={copy.tabs} className="mt-3xl flex justify-center border-b border-white/30">
        {modes.map((tab) => (
          <button
            key={tab}
            ref={(element) => { if (element) tabs.current[tab] = element; }}
            id={`${tab}-tab`}
            type="button"
            role="tab"
            tabIndex={tab === mode ? 0 : -1}
            aria-selected={tab === mode}
            aria-controls="auth-panel"
            disabled={isSubmitting}
            onClick={() => selectMode(tab)}
            onKeyDown={handleTabKey}
            className="-mb-px cursor-pointer border-b border-transparent px-l py-sm text-s aria-selected:border-primary-200 aria-selected:text-primary-100"
          >
            {copy[tab].tab}
          </button>
        ))}
      </div>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`${mode}-tab`}>
        <form method="post" noValidate onSubmit={submit} className="mt-xl flex flex-col gap-m text-left">
          <div>
            <label htmlFor="email" className="sr-only">{copy.email}</label>
            <Input
              {...register("email")}
              id="email"
              type="email"
              autoComplete="email"
              placeholder={copy.email}
              readOnly={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="rounded-sm border border-white/40 bg-black/10 px-4 py-2.5 focus-within:border-white/70 has-[input[aria-invalid=true]]:border-danger"
              inputClassName="h-7 text-s placeholder:text-white/60"
            />
            {errors.email && <p id="email-error" role="alert" className="mt-s text-sx text-red-300">{errors.email.message}</p>}
          </div>

          <PasswordInput
            {...register("password")}
            key={mode}
            label={copy.password}
            visibilityLabels={copy.visibility}
            autoComplete={isSignup ? "new-password" : "current-password"}
            errorMessage={errors.password?.message}
            readOnly={isSubmitting}
          />

          {isSignup && (
            <PasswordInput
              {...register("confirmation")}
              label={copy.confirmPassword}
              visibilityLabels={copy.visibility}
              autoComplete="new-password"
              errorMessage={errors.confirmation?.message}
              readOnly={isSubmitting}
            />
          )}

          {!isSignup && (
            <Link href={`/${locale}/forgot-password`} className="self-start text-sx text-primary-100 hover:underline">
              {copy.reset.forgot}
            </Link>
          )}

          {errors.root?.auth && <p role="alert" className="text-sx text-red-300">{errors.root.auth.message}</p>}

          <Button type="submit" variant="primary" size="lg" alignment="center" className="mt-s w-full" isLoading={isSubmitting}>
            {content.submit}
          </Button>
        </form>
      </div>
    </AuthSurface>
  );
}
