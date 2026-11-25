import type { NextRequest } from "next/server";
import { isAuthLocale } from "@/components/auth/messages";
import { companiesForLocale } from "./companies";

export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "fr";
  if (!isAuthLocale(locale)) return Response.json({ error: "Unsupported locale" }, { status: 400 });

  return Response.json({ companies: companiesForLocale(locale) });
}
