"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { authMessages, type AuthLocale } from "./messages";

export function SignOutButton({ locale }: { locale: AuthLocale }) {
  const copy = authMessages[locale];
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const { error } = await authClient.signOut();
      if (error) throw error;

      window.location.replace(`/${locale}/login`);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-xl">
      <Button type="button" variant="primary" size="lg" alignment="center" isLoading={pending} onClick={signOut}>
        {copy.signOut}
      </Button>
      {failed && <p role="alert" className="mt-m text-sx text-red-300">{copy.unavailable}</p>}
    </div>
  );
}
