import { Suspense } from "react";
import AreaView from "./AreaView";

export default function AreaPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-cell" />}>
      <AreaView />
    </Suspense>
  );
}
