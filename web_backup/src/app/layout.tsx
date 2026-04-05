import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const font = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampuGrid | The Distributed Compute Marketplace",
  description: "Harness idle campus hardware for 3D rendering, data processing, and ML training.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${font.className} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
