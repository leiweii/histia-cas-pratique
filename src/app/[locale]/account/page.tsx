import { Suspense } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AuthSurface } from "@/components/auth/auth-surface";
import { authMessages, isAuthLocale } from "@/components/auth/messages";
import { SignOutButton } from "@/components/auth/sign-out-button";

async function Account({ params }: Pick<PageProps<"/[locale]/account">, "params">) {
  const { locale } = await params;
  if (!isAuthLocale(locale)) notFound();

  const requestHeaders = await headers();
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect(`/${locale}/login`);

  return (
    <AuthSurface>
      <h1 className="text-m font-semibold">{authMessages[locale].signedIn}</h1>
      <p className="mt-m break-all text-sx text-white/75">{session.user.email}</p>
      <SignOutButton locale={locale} />
    </AuthSurface>
  );
}

export default function AccountPage({ params }: PageProps<"/[locale]/account">) {
  return (
    <Suspense fallback={null}>
      <Account params={params} />
    </Suspense>
  );
}
