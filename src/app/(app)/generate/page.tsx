import { GenerateCourseForm } from "@/components/generate/generate-course-form";

export default function GeneratePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">生成课程</h1>
        <p className="max-w-2xl text-slate-400">
          输入论文 URL，选择难度，提交后等待生成完成即可跳转到课程页学习。
        </p>
      </div>
      <GenerateCourseForm />
    </section>
  );
}
