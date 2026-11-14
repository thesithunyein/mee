import type { Metadata } from "next";
import MethodView from "./MethodView";

export const metadata: Metadata = { title: "How it works · Mee" };

export default function MethodPage() {
  return <MethodView />;
}
