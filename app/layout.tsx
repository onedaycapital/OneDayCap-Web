import type { Metadata } from "next";
import "./globals.css";
import { CampaignRidTracker } from "@/components/CampaignRidTracker";

export const metadata: Metadata = {
  title: "OneDay Capital | Capital. In One Day.",
  description:
    "Fast, flexible access to working capital for small businesses. No collateral, minimal paperwork, same-day decisions. Funding based on real cash flow.",
  icons: {
    icon: "/images/bull-hero.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz"></script>
        <script src="https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.25.0-min.js.gz"></script>
        <script dangerouslySetInnerHTML={{__html: `window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));window.amplitude.init('17dea7f302865cf69e3fee139aa1885c', {"autocapture":{"elementInteractions":true}});`}} />
      </head>
      <body className="antialiased font-sans">
        <CampaignRidTracker />
        {children}
      </body>
    </html>
  );
}
