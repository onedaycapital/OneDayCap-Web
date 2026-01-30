import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneDay Capital | Capital. In One Day.",
  description:
    "Fast, flexible access to working capital for small businesses. No collateral, minimal paperwork, same-day decisions. Funding based on real cash flow.",
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
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
