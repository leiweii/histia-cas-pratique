"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { authClient } from "@/lib/auth-client";
import { AuthSurface } from "./auth-surface";
import { authMessages, type AuthLocale } from "./messages";

type NewPassword = { password: string; confirmation: string };

export function ResetPasswordCard({ locale, token }: { locale: AuthLocale; token: string | null }) {
  const copy = authMessages[locale];
  const labels = copy.reset;
  const [result, setResult] = useState<"success" | "invalid">();
  const { register, handleSubmit, setError, clearErrors, reset, formState: { errors, isSubmitting } } =
    useForm<NewPassword>({ defaultValues: { password: "", confirmation: "" } });

  const submit = handleSubmit(async (values) => {
    if (!token) return;
    clearErrors();
    const schema = z.object({
      password: z.string().min(8, copy.shortPassword).max(128, copy.longPassword),
      confirmation: z.string(),
    }).refine(({ password, confirmation }) => password === confirmation, {
      path: ["confirmation"], message: copy.passwordsDiffer,
    });
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      const { password, confirmation } = z.flattenError(parsed.error).fieldErrors;
      if (password?.[0]) setError("password", { message: password[0] }, { shouldFocus: true });
      if (confirmation?.[0]) setError("confirmation", { message: confirmation[0] }, { shouldFocus: !password });
      return;
    }

    try {
      const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token });
      if (error?.code === "INVALID_TOKEN" || error?.code === "USER_NOT_FOUND") {
        reset();
        setResult("invalid");
      } else if (error) {
        setError("root.reset", { message: error.status === 429 ? copy.rateLimit : copy.unavailable });
      } else {
        reset();
        setResult("success");
      }
    } catch {
      setError("root.reset", { message: copy.unavailable });
    }
  });

  if (!token || result === "invalid" || result === "success") {
    const success = result === "success";

    return (
      <AuthSurface locale={locale}>
        <h1 className="text-lm font-semibold">{success ? labels.successTitle : labels.invalidTitle}</h1>
        <p className="mt-s text-s text-white/75" role={success ? "status" : "alert"}>
          {success ? labels.successDescription : labels.invalidLink}
        </p>
        <Button asChild variant="primary" size="lg" alignment="center" className="mt-xl">
          <Link href={`/${locale}/${success ? "login" : "forgot-password"}`}>
            {success ? labels.backToLogin : labels.requestAgain}
          </Link>
        </Button>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface locale={locale}>
      <h1 className="text-lm font-semibold">{labels.newPasswordTitle}</h1>
      <form method="post" noValidate onSubmit={submit} className="mt-xl flex flex-col gap-m text-left">
        <PasswordInput
          {...register("password")}
          label={labels.newPassword}
          visibilityLabels={copy.visibility}
          autoComplete="new-password"
          readOnly={isSubmitting}
          errorMessage={errors.password?.message}
        />
        <PasswordInput
          {...register("confirmation")}
          label={copy.confirmPassword}
          visibilityLabels={copy.visibility}
          autoComplete="new-password"
          readOnly={isSubmitting}
          errorMessage={errors.confirmation?.message}
        />
        {errors.root?.reset && <p role="alert" className="text-sx text-red-300">{errors.root.reset.message}</p>}
        <Button type="submit" variant="primary" size="lg" alignment="center" isLoading={isSubmitting}>
          {labels.update}
        </Button>
      </form>
    </AuthSurface>
  );
}
