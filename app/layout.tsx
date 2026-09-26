import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nottingham | Eymen'in Yaşam Paneli",
  description: "Nottingham'daki günlük bütçe, harcama ve yemek planın.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
