import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Omnichannel POS",
  description: "Advanced POS & Loyalty System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <AuthProvider>
          <Header />
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
