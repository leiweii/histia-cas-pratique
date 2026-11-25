import { CompanyStatus } from "@/components/company/company-status";
import type { CompanyCardData } from "@/components/company/company-card-data";
import type { Sector } from "@/components/sectors/sectors";
import type { AuthLocale } from "@/components/auth/messages";

const sectorLabels = {
  ARTIFICIAL_INTELLIGENCE: { fr: "IA", en: "AI" },
  ECOLOGY: { fr: "Écologie", en: "Ecology" },
  FINANCE: { fr: "Finance", en: "Finance" },
  SOFTWARE: { fr: "Logiciel", en: "Software" },
  SPACE: { fr: "Spatial", en: "Space" },
  HEALTHCARE: { fr: "Santé", en: "Healthcare" },
  INDUSTRY: { fr: "Industrie", en: "Industry" },
  CONSTRUCTION: { fr: "Construction", en: "Construction" },
  ENERGY: { fr: "Énergie", en: "Energy" },
  RESOURCES: { fr: "Ressources", en: "Resources" },
  REAL_ESTATE: { fr: "Immobilier", en: "Real estate" },
  HOSPITALITY: { fr: "Hôtellerie", en: "Hospitality" },
  SOCIAL: { fr: "Social", en: "Social" },
  NEW_TECHNOLOGIES: { fr: "Nouvelles technologies", en: "New technologies" },
  EDUCATION: { fr: "Éducation", en: "Education" },
  FOOD: { fr: "Alimentation", en: "Food" },
  AGRICULTURE: { fr: "Agriculture", en: "Agriculture" },
  SPORTS: { fr: "Sport", en: "Sports" },
  MEDIA: { fr: "Médias", en: "Media" },
  COMMUNICATIONS: { fr: "Communication", en: "Communications" },
  CULTURE: { fr: "Culture", en: "Culture" },
  ENTERTAINMENT: { fr: "Divertissement", en: "Entertainment" },
  TRANSPORT: { fr: "Transport", en: "Transport" },
  COMPUTER_HARDWARE: { fr: "Matériel informatique", en: "Computer hardware" },
  SERVICES: { fr: "Services", en: "Services" },
  CONSUMER_GOODS: { fr: "Biens de consommation", en: "Consumer goods" },
  DISTRIBUTION: { fr: "Distribution", en: "Distribution" },
  TELECOMMUNICATIONS: { fr: "Télécommunications", en: "Telecommunications" },
  BIOTECHNOLOGY: { fr: "Biotechnologie", en: "Biotechnology" },
  WEB3: { fr: "Web3", en: "Web3" },
  LEGAL: { fr: "Juridique", en: "Legal" },
  DEFENSE: { fr: "Défense", en: "Defense" },
} satisfies Record<Sector, Record<AuthLocale, string>>;

const closed = { fr: "Fermée", en: "Closed" };
const statusLabels = {
  ACTIVE: null,
  CLOSED: closed,
  INACTIVE: closed,
  ACQUIRED: { fr: "Vendue", en: "Sold" },
} satisfies Record<CompanyStatus, Record<AuthLocale, string> | null>;

const doctolib = {
  name: "Doctolib",
  description: {
    fr: "Plateforme numérique facilitant la prise de rendez-vous médicaux et la gestion des consultations",
    en: "Digital platform for booking medical appointments and managing consultations",
  },
  sectors: ["HEALTHCARE", "SOFTWARE", "ARTIFICIAL_INTELLIGENCE"],
} as const;

// The Figma mockup repeats one sample company with different presentation states.
const backdropStatuses: CompanyStatus[] = [
  CompanyStatus.CLOSED,
  CompanyStatus.ACTIVE,
  CompanyStatus.ACTIVE,
  CompanyStatus.ACQUIRED,
  CompanyStatus.ACTIVE,
  CompanyStatus.ACTIVE,
  CompanyStatus.ACTIVE,
  CompanyStatus.ACTIVE,
];

export function companiesForLocale(locale: AuthLocale): CompanyCardData[] {
  return backdropStatuses.map((status, index) => ({
    id: `doctolib-${index + 1}`,
    name: doctolib.name,
    status,
    description: doctolib.description[locale],
    sectors: doctolib.sectors.map((id) => ({ id, label: sectorLabels[id][locale] })),
    statusLabel: statusLabels[status]?.[locale] ?? null,
  }));
}
