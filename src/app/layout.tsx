import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "错题成长岛",
  description: "本地错题分析与复习工作台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
