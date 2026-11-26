import { createOTP } from "@better-auth/utils/otp";
import { symmetricDecrypt } from "better-auth/crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { canReadDemoCodes } from "@/lib/demo-code-access";
import { prisma } from "@/lib/prisma";
import { TEST_ACCOUNTS, TEST_PASSWORD } from "@/lib/test-accounts";

// Development helper, provided with the exercise: it replaces the mailbox and the authenticator app.
// Not part of the UI to build.

const lastMail = (to: string, kind: "MFA_CODE" | "PASSWORD_RESET") =>
  prisma.devMail.findFirst({ where: { to, kind }, orderBy: { createdAt: "desc" } });

const loadAccounts = async () => {
  const { secretConfig } = await auth.$context;
  const users = await prisma.user.findMany({
    where: process.env.NODE_ENV === "production"
      ? { email: { in: TEST_ACCOUNTS.map(({ email }) => email) } }
      : undefined,
    include: { twofactors: true },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    users.map(async (user) => {
      const factor = user.twoFactorEnabled ? user.twofactors[0] : undefined;
      const [totp, recovery, mfaMail, resetMail] = await Promise.all([
        factor?.verified
          ? symmetricDecrypt({ key: secretConfig, data: factor.secret }).then((secret) => createOTP(secret).totp())
          : null,
        factor ? auth.api.viewBackupCodes({ body: { userId: user.id } }) : null,
        lastMail(user.email, "MFA_CODE"),
        lastMail(user.email, "PASSWORD_RESET"),
      ]);
      return {
        email: user.email,
        totp,
        recoveryCodes: recovery?.backupCodes ?? [],
        emailCode: user.emailTwoFactorEnabled ? mfaMail : null,
        resetLink: resetMail,
      };
    }),
  );
};

const time = (date: Date) => date.toLocaleTimeString("fr-FR");

const Code = ({ value, sentAt }: { value?: string | null; sentAt?: Date }) =>
  value ? (
    <>
      <span className="text-2xl font-semibold tracking-widest tabular-nums">{value}</span>
      {sentAt && <span className="block text-xs opacity-60">sent {time(sentAt)}</span>}
    </>
  ) : (
    <span className="opacity-30">—</span>
  );

// Reads the database on every request, so it streams in behind the static page shell.
const Accounts = async () => {
  if (!canReadDemoCodes((await headers()).get("authorization"))) notFound();
  const accounts = await loadAccounts();

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-current/20 text-xs uppercase opacity-60">
          <th className="py-2 pr-4 font-normal">Account</th>
          <th className="py-2 pr-4 font-normal">App code</th>
          <th className="py-2 pr-4 font-normal">Email code</th>
          <th className="py-2 font-normal">Reset link</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.email} className="border-b border-current/10 align-top">
            <td className="py-3 pr-4">
              {account.email}
              {account.recoveryCodes.length > 0 && (
                <details className="text-xs opacity-60">
                  <summary className="cursor-pointer">Recovery codes</summary>
                  {account.recoveryCodes.map((code) => (
                    <div key={code}>{code}</div>
                  ))}
                </details>
              )}
            </td>
            <td className="py-3 pr-4">
              <Code value={account.totp} />
            </td>
            <td className="py-3 pr-4">
              <Code value={account.emailCode?.content} sentAt={account.emailCode?.createdAt} />
            </td>
            <td className="py-3">
              {account.resetLink ? (
                <>
                  <a className="underline" href={account.resetLink.content}>
                    Open link
                  </a>
                  <span className="block text-xs opacity-60">sent {time(account.resetLink.createdAt)}</span>
                </>
              ) : (
                <span className="opacity-30">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function CodePage() {
  return (
    <main className="mx-auto flex w-full max-w-[48rem] flex-col gap-6 p-8 font-mono text-sm">
      {/* The app code changes every 30 seconds, so the page reloads itself. */}
      <meta httpEquiv="refresh" content="5" />
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">/code</h1>
        <p className="opacity-60">
          Password for every test account: <strong>{TEST_PASSWORD}</strong>
        </p>
      </header>
      <Suspense fallback={<p className="opacity-60">Loading…</p>}>
        <Accounts />
      </Suspense>
    </main>
  );
}
