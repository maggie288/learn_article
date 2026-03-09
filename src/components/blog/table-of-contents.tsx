interface TocItem {
  orderIndex: number;
  title: string;
}

interface TableOfContentsProps {
  items: TocItem[];
  className?: string;
}

/** 博客长文目录：锚点链接到各章节 */
export function TableOfContents({ items, className = "" }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}
      aria-label="目录"
    >
      <h2 className="mb-3 text-sm font-semibold text-slate-400">目录</h2>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.orderIndex}>
            <a
              href={`#chapter-${item.orderIndex + 1}`}
              className="block text-sm text-slate-300 underline-offset-2 hover:text-cyan-400 hover:underline"
            >
              {item.orderIndex + 1}. {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
