export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "¥0",
    originalPrice: null,
    period: "永久免费",
    description: "每月 3 篇 Explorer 课程。",
    paid: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "15 USDT",
    originalPrice: "15 USDT",
    period: "月付",
    description: "完整难度层级、下载与优先队列。",
    paid: true,
    options: [
      { id: "pro-monthly" as const, label: "月付 15 USDT/月", plan: "pro" as const, amount: "15" },
      { id: "pro-yearly" as const, label: "年付 150 USDT/年", plan: "pro" as const, amount: "150" },
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "30 USDT",
    originalPrice: "30 USDT",
    period: "月付",
    description: "团队知识库、协作与管理能力。",
    paid: true,
    options: [{ id: "team" as const, label: "30 USDT/月", plan: "team" as const, amount: "30" }],
  },
] as const;
