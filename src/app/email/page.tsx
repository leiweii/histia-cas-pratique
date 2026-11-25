import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { StolosMark } from "@/components/auth/auth-surface";
import { authMessages } from "@/components/auth/messages";
import { Button } from "@/components/ui/button";
import { TEST_ACCOUNTS } from "@/lib/test-accounts";
import "./email-preview.css";

export const metadata: Metadata = {
  title: "Stolos · Aperçu du courriel",
};

const exampleLink = "https://app.example.com/reset-password?token=preview";

function EmailPreview({ mail }: { mail?: { to: string; content: string } }) {
  const url = mail ? new URL(mail.content) : null;
  const locale = url?.searchParams.get("callbackURL") === "/en/reset-password" ? "en" : "fr";
  const labels = authMessages[locale].reset;

  return (
    <main className="reset-email-page" lang={locale}>
      <section className="reset-email-preview" aria-labelledby="reset-email-subject">
        <header className="reset-email-brand">
          <StolosMark className="reset-email-brand-mark" />
          <span>Stolos</span>
        </header>
        <div className="reset-email-card">
          <StolosMark className="reset-email-watermark" />
          <h1 id="reset-email-subject">{labels.mailSubject}</h1>
          <Button
            asChild={Boolean(url)}
            disabled={!url}
            variant="primary"
            size="lg"
            alignment="center"
            className="reset-email-action"
          >
            {url ? (
              <a href={`${url.pathname}${url.search}`} rel="noreferrer">{labels.mailAction}</a>
            ) : labels.mailAction}
          </Button>
          <p className="reset-email-body">{labels.mailBody}</p>
          <p className="reset-email-ignore">{labels.mailIgnore}</p>
          <p className="reset-email-copy">
            {labels.mailCopy}
            <span>{url?.href ?? exampleLink}</span>
          </p>
        </div>
        <p className="reset-email-footer">{labels.mailFooter}</p>
      </section>
      <p className="reset-email-details">
        {mail ? `${labels.mailRecipient} · ${mail.to}` : labels.mailExample}
        {!mail && process.env.NODE_ENV === "development" && <> · {labels.mailEmpty}</>}
      </p>
    </main>
  );
}

async function ResetEmail() {
  await connection();
  const { prisma } = await import("@/lib/prisma");
  const mail = await prisma.devMail.findFirst({
    where: { kind: "PASSWORD_RESET", to: { in: TEST_ACCOUNTS.map(({ email }) => email) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { to: true, content: true },
  });

  return <EmailPreview mail={mail ?? undefined} />;
}

export default function EmailPage() {
  if (process.env.NODE_ENV !== "development") return <EmailPreview />;

  return (
    <Suspense fallback={<EmailPreview />}>
      <ResetEmail />
    </Suspense>
  );
}
