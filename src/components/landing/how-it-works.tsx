/** 首页「如何运作」三步流程图 */
export function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "输入论文链接",
      desc: "粘贴 arXiv 或论文 URL，系统自动获取并解析内容。",
    },
    {
      step: "2",
      title: "选择难度",
      desc: "Explorer 入门 / Builder 进阶 / Researcher 深入，同一篇论文三种讲解深度。",
    },
    {
      step: "3",
      title: "获得课程与测验",
      desc: "异步生成结构化课程、博客、播客，学完每章可做测验巩固。",
    },
  ];

  return (
    <section className="mt-24 border-t border-slate-800/60 pt-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          如何运作
        </h2>
        <p className="mt-3 text-slate-400">
          论文 URL → 结构化提取 → 学习路径 → 多形态课程
        </p>
      </div>
      <div className="mx-auto mt-12 max-w-3xl">
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((item) => (
            <div
              key={item.step}
              className="relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 font-mono text-lg font-semibold text-sky-400">
                {item.step}
              </span>
              <h3 className="mt-4 font-medium text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
