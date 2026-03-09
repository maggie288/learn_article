import type { Metadata } from "next";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { RootProviders } from "@/components/providers/root-providers";

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-reading",
  display: "swap",
});

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
    <html lang="zh-CN" className={notoSerifSC.variable}>
      <body>
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
