import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope/index.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "Cardia — Heart Disease Pattern Detection",
    template: "%s · Cardia",
  },
  description:
    "An academic machine-learning demonstration that classifies angiographic coronary artery disease presence from 13 UCI Cleveland findings.",
  applicationName: "Cardia",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#092821",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
