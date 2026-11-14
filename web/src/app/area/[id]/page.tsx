import { Suspense } from "react";
import AreaView from "./AreaView";

export default function AreaPage() {
  return (
    <Suspense fallback={<p className="text-ink-3">Loading…</p>}>
      <AreaView />
    </Suspense>
  );
}
