import { notFound, redirect } from "next/navigation";
import { getCourseSlugById } from "@/lib/db/repositories";

interface CourseRedirectPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CourseRedirectPage({ params }: CourseRedirectPageProps) {
  const { id } = await params;
  const slug = await getCourseSlugById(id);

  if (!slug) {
    notFound();
  }

  redirect(`/paper/${slug}`);
}
