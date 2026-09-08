import { parse } from "csv-parse/sync";
import { z } from "zod";
import { isServiceTag } from "@/lib/locations";
import type { CsvImportIssue, ImportPreview, ProviderLocation, ServiceTag, StatusClass } from "@/lib/types";

export const REQUIRED_IMPORT_HEADERS = [
  "license_number",
  "program_name",
  "company",
  "address",
  "city",
  "county",
  "zip",
  "phone",
  "license_status",
  "tags"
] as const;

const rowSchema = z.object({
  license_number: z.string().trim().min(1),
  program_name: z.string().trim().min(1),
  company: z.string().trim().min(1),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1),
  county: z.string().trim().min(1),
  zip: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  license_status: z.string().trim().min(1),
  tags: z.string().trim().min(1)
});

type CsvRow = z.infer<typeof rowSchema>;

function slugify(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStatusClass(status: string): StatusClass {
  const normalized = status.toLocaleLowerCase();
  if (normalized === "active") return "active";
  if (normalized.includes("conditional") || normalized.includes("provisional")) return "caution";
  return "critical";
}

function toProvider(row: CsvRow, tier: string): ProviderLocation | CsvImportIssue[] {
  const tags = row.tags
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const invalidTags = tags.filter((tag) => !isServiceTag(tag));

  if (!tags.length || invalidTags.length) {
    return [{ row: 0, field: "tags", message: `Use pipe-separated approved tags. Invalid: ${invalidTags.join(", ") || "none"}` }];
  }

  const serviceTags = tags as ServiceTag[];
  return {
    id: row.license_number,
    license_number: row.license_number,
    slug: `${slugify(row.program_name)}-${slugify(row.city)}-${row.license_number}`,
    program_name: row.program_name,
    company: row.company,
    tier,
    address: row.address,
    city: row.city,
    county: row.county,
    zip: row.zip,
    phone: row.phone || null,
    license_status: row.license_status,
    status_class: getStatusClass(row.license_status),
    tags: serviceTags,
    primary_tag: serviceTags[0]
  };
}

export function parseNormalizedCsv(source: string): ImportPreview {
  const issues: CsvImportIssue[] = [];
  let rows: Record<string, string>[];

  try {
    rows = parse(source, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (error) {
    return { records: [], issues: [{ row: 0, message: error instanceof Error ? error.message : "CSV could not be parsed" }], totalRows: 0 };
  }

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const missingHeaders = REQUIRED_IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return {
      records: [],
      issues: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(", ")}` }],
      totalRows: rows.length
    };
  }

  const parsedRows: { row: number; value: CsvRow }[] = [];
  const seenLicenses = new Set<string>();
  rows.forEach((row, index) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) {
      issues.push({ row: index + 2, message: result.error.issues.map((issue) => issue.message).join("; ") });
      return;
    }
    if (seenLicenses.has(result.data.license_number)) {
      issues.push({ row: index + 2, field: "license_number", message: "License number appears more than once" });
      return;
    }
    seenLicenses.add(result.data.license_number);
    parsedRows.push({ row: index + 2, value: result.data });
  });

  const companyCounts = new Map<string, number>();
  parsedRows.forEach(({ value }) => companyCounts.set(value.company, (companyCounts.get(value.company) ?? 0) + 1));
  const records: ProviderLocation[] = [];

  parsedRows.forEach(({ row, value }) => {
    const tier = (companyCounts.get(value.company) ?? 0) > 1 ? "B - Multi-location" : "C - Single-location";
    const provider = toProvider(value, tier);
    if (Array.isArray(provider)) {
      provider.forEach((issue) => issues.push({ ...issue, row }));
      return;
    }
    records.push(provider);
  });

  return { records, issues, totalRows: rows.length };
}
