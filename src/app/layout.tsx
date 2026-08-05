import type { Metadata } from "next";
import { Chakra_Petch, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RailSplit",
  description:
    "RailSplit helps merchants publish a clear dollar-priced checkout link and settle directly on Flare.",
  icons: {
    icon: [
      { url: "/railsplit-icon-black.png", sizes: "32x32", type: "image/png" },
      { url: "/railsplit-icon-black.png", sizes: "192x192", type: "image/png" },
      { url: "/railsplit-icon-black.png", sizes: "180x180", type: "image/png", rel: "apple-touch-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${chakra.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
