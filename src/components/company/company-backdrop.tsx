"use client";

import { useQuery } from "@tanstack/react-query";
import type { AuthLocale } from "@/components/auth/messages";
import { SectorTag } from "@/components/sectors/sector-tag";
import type { CompanyCardData } from "./company-card-data";
import { CompanyStatus } from "./company-status";
import "./company-backdrop.css";

async function fetchCompanies(locale: AuthLocale, signal: AbortSignal): Promise<CompanyCardData[]> {
  const response = await fetch(`/api/companies?locale=${locale}`, { signal });
  if (!response.ok) throw new Error("Could not load the company cards");

  const data: { companies: CompanyCardData[] } = await response.json();
  return data.companies;
}

function CompanyCard({ company }: { company: CompanyCardData }) {
  return (
    <article className="company-tile">
      <div className="flex min-w-0 items-center gap-sm">
        <span className="company-tile-mark">{company.name.charAt(0)}</span>
        <p className="min-w-0 truncate text-ms font-bold">{company.name}</p>
        {company.statusLabel && (
          <span className={`company-tile-status ${company.status === CompanyStatus.ACQUIRED ? "company-tile-status-acquired" : ""}`}>
            {company.statusLabel}
          </span>
        )}
      </div>
      <p className="company-tile-description line-clamp-2 text-sx leading-snug">{company.description}</p>
      <div className="company-tile-sectors flex flex-wrap gap-x-xl">
        {company.sectors.map(({ id, label }) => <SectorTag key={id} sector={id} label={label} className="gap-xs" isMonochrome />)}
      </div>
    </article>
  );
}

export function CompanyBackdrop({ locale }: { locale: AuthLocale }) {
  const { data: companies } = useQuery({
    queryKey: ["auth-company-cards", locale],
    queryFn: ({ signal }) => fetchCompanies(locale, signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!companies?.length) return null;

  const midpoint = Math.ceil(companies.length / 2);
  return (
    <div className="company-backdrop" aria-hidden="true">
      <div className="company-column company-column-start">
        {companies.slice(0, midpoint).map((company) => <CompanyCard key={company.id} company={company} />)}
      </div>
      <div className="company-column company-column-end">
        {companies.slice(midpoint).map((company) => <CompanyCard key={company.id} company={company} />)}
      </div>
    </div>
  );
}
