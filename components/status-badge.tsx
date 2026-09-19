import { STATUS_LABEL } from "@/lib/text";
import type { StatusClass } from "@/lib/types";

export function StatusBadge({ status }: { status: StatusClass }) {
  return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;
}
