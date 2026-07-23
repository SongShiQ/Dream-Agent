import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context/app-context";

export const metadata: Metadata = {
  title: "OpenCamp AI 助教",
  description: "OS 训练营多 Agent AI 助教系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
