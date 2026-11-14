"use client";

import { useLang } from "@/lib/i18n";
import { STATUS_COLOR, type Status } from "@/lib/types";

export default function StatusPill({ status }: { status: Status }) {
  const { t } = useLang();
  const dark = status !== "normal";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: dark ? STATUS_COLOR[status] : "#E9ECE7", color: status === "high" ? "#fff" : "#17211C" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dark ? "currentColor" : "#8A958F" }} />
      {t.status[status]}
    </span>
  );
}
