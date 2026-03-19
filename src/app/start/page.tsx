import { StudyExperience } from "@/modules/study/components/study-experience";

interface StartPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return <StudyExperience initialToken={token} />;
}
