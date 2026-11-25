import { notFound } from "next/navigation";
import { AuthQueryProvider } from "@/components/auth/auth-query-provider";
import { isAuthLocale } from "@/components/auth/messages";

export const metadata = { title: "Stolos" };

export function generateStaticParams() {
  return [{ locale: "fr" }, { locale: "en" }];
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!isAuthLocale(locale)) notFound();

  return <div lang={locale}><AuthQueryProvider>{children}</AuthQueryProvider></div>;
}
