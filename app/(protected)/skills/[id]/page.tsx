import { SkillDetailShell } from "./detail-shell";
import { use } from "react";

interface SkillDetailPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function SkillDetailPage({ params }: SkillDetailPageProps) {
  // Support both Promise and synchronous params to prevent Turbopack type checking discrepancies
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const id = resolvedParams?.id || "";
  
  return <SkillDetailShell id={id} />;
}
