import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abkhack IDE",
  description: "بيئة تطوير مدمجة بوكيل ذكاء اصطناعي",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-panel text-gray-100 antialiased">{children}</body>
    </html>
  );
}
