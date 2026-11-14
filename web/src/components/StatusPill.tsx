import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/lib/types";

export default function StatusPill({ status }: { status: Status }) {
  const dark = status !== "normal";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: dark ? STATUS_COLOR[status] : "#E9ECE7", color: status === "high" ? "#fff" : "#17211C" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dark ? "currentColor" : "#8A958F" }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
