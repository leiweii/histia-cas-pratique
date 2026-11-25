import type { CompanyStatus } from "@/components/company/company-status";
import type { Sector } from "@/components/sectors/sectors";

export type CompanyCardData = {
  id: string;
  name: string;
  description: string;
  sectors: { id: Sector; label: string }[];
  status: CompanyStatus;
  statusLabel: string | null;
};
