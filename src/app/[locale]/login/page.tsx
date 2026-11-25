import { notFound } from "next/navigation";
import { LoginCard } from "@/components/auth/login-card";
import { isAuthLocale } from "@/components/auth/messages";

export default async function LocalizedLoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;

  if (!isAuthLocale(locale)) notFound();

  return <LoginCard locale={locale} />;
}
