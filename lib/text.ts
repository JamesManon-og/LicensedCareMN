import type { StatusClass } from "@/lib/types";

/** Avatar initials: the first letters of the first two words ("A & E Homes Inc" → "AE"). */
export function initials(name: string) {
  const [first = name, second] = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (second ? first[0] + second[0] : first.slice(0, 2)).toUpperCase();
}

export function describeResultCount(total: number) {
  return `${total.toLocaleString("en-US")} ${total === 1 ? "provider matches" : "providers match"} your search`;
}

export const STATUS_LABEL: Record<StatusClass, string> = {
  active: "Active license",
  caution: "Conditional / provisional",
  critical: "Not currently licensed"
};

export const STATUS_EXPLANATION: Record<StatusClass, string> = {
  active: "The launch dataset lists this license as active.",
  caution: "The launch dataset lists a conditional or provisional status.",
  critical: "The launch dataset does not list this license as currently active."
};

export function formatPhone(phone: string | null) {
  return phone?.trim() || "Phone not listed";
}
