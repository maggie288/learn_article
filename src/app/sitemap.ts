import type { MetadataRoute } from "next";
import { getJsonCache, setJsonCache } from "@/lib/cache/json-cache";
import { listPublishedCourses } from "@/lib/db/repositories";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://paperflow.local";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cached = await getJsonCache<MetadataRoute.Sitemap>("sitemap");
  if (cached) {
    return cached;
  }

  const courses = await listPublishedCourses(1000);

  const result = [
    {
      url: appUrl,
      lastModified: new Date(),
    },
    {
      url: `${appUrl}/explore`,
      lastModified: new Date(),
    },
    ...courses.map((course) => ({
      url: `${appUrl}/paper/${course.slug}`,
      lastModified: course.publishedAt ? new Date(course.publishedAt) : new Date(),
    })),
  ];

  await setJsonCache("sitemap", result, 60 * 60);
  return result;
}
