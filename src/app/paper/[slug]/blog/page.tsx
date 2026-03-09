interface BlogPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">{slug} Blog View</h1>
      <p className="mt-4 text-slate-300">
        博客形态渲染会在 Layer 6 接入后启用，当前保留路由占位。
      </p>
    </main>
  );
}
