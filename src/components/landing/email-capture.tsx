"use client";

import { useState } from "react";
import { WaitlistForm } from "./waitlist-form";

interface EmailCaptureProps {
  title?: string;
  subtitle?: string;
}

/** 首页邮件收集区块（早鸟/等待列表） */
export function EmailCapture({
  title = "抢先体验",
  subtitle = "留下邮箱，新产品与限时优惠将第一时间通知你。",
}: EmailCaptureProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="mt-24 border-t border-slate-800/60 pt-16">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-slate-400">{subtitle}</p>
        <div className="mt-8">
          {submitted ? (
            <p className="text-emerald-400">感谢订阅，我们会尽快与你联系。</p>
          ) : (
            <WaitlistForm
              onSuccess={() => setSubmitted(true)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
