import { SkillDetailShell } from "./detail-shell";

interface SkillDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { id } = await params;
  return <SkillDetailShell id={id} />;
}
