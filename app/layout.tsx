import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Network 1.0",
  description: "A small social network MVP, circa 2004.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-app-background text-app-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
