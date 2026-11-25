import { notFound } from "next/navigation";
import { ForgotPasswordCard } from "@/components/auth/forgot-password-card";
import { isAuthLocale } from "@/components/auth/messages";

export default async function ForgotPasswordPage({ params }: PageProps<"/[locale]/forgot-password">) {
  const { locale } = await params;
  if (!isAuthLocale(locale)) notFound();

  return <ForgotPasswordCard locale={locale} />;
}
