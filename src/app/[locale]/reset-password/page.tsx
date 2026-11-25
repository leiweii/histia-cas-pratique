import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isAuthLocale } from "@/components/auth/messages";
import { ResetPasswordCard } from "@/components/auth/reset-password-card";

async function ResetPasswordContent({ params, searchParams }: PageProps<"/[locale]/reset-password">) {
  const { locale } = await params;
  if (!isAuthLocale(locale)) notFound();

  const { token, error } = await searchParams;
  return <ResetPasswordCard locale={locale} token={!error && typeof token === "string" ? token : null} />;
}

export default function ResetPasswordPage(props: PageProps<"/[locale]/reset-password">) {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent {...props} />
    </Suspense>
  );
}
