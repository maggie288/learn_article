import { GenerateCourseForm } from "@/components/generate/generate-course-form";

export default function GeneratePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Generate</h1>
        <p className="max-w-2xl text-slate-300">
          这是生产链路的入口页：输入论文 URL，选择难度，提交后轮询任务状态并跳到课程页。
        </p>
      </div>
      <GenerateCourseForm />
    </section>
  );
}
