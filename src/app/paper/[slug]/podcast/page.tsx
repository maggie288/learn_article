interface PodcastPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{slug} Podcast View</h1>
      <p className="mt-4 text-slate-300">
        播客模式会在 TTS 与聚合音频接入后提供，这里先保留路由结构。
      </p>
    </main>
  );
}
