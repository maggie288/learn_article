import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/components/providers/root-providers";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  title: "PaperFlow",
  description: "AI driven paper learning engine bootstrap.",
  metadataBase: appUrl ? new URL(appUrl) : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
