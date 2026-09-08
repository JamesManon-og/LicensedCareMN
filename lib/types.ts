export const SERVICE_TAGS = [
  "Foster Care / Supported Living",
  "Crisis Respite",
  "Out-of-Home Respite",
  "Remote Overnight Supervision",
  "Adult Mental Health Certification"
] as const;

export type ServiceTag = (typeof SERVICE_TAGS)[number];
export type StatusClass = "active" | "caution" | "critical";

export type ProviderLocation = {
  id: string;
  slug: string;
  program_name: string;
  company: string;
  tier: string;
  address: string;
  city: string;
  county: string;
  zip: string;
  phone: string | null;
  license_status: string;
  status_class: StatusClass;
  license_number: string;
  tags: ServiceTag[];
  primary_tag: ServiceTag;
};

export type SearchFilters = {
  query: string;
  county: string;
  tags: ServiceTag[];
  status: "active" | "all";
  page: number;
};

export type SearchResult = {
  items: ProviderLocation[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
};

export type CsvImportIssue = {
  row: number;
  field?: string;
  message: string;
};

export type ImportPreview = {
  records: ProviderLocation[];
  issues: CsvImportIssue[];
  totalRows: number;
};
