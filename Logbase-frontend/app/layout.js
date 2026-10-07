import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { themeInitScript } from "@/lib/theme";
import { SITE } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "LogBase", template: "%s | LogBase" },
  description: SITE.description,
  applicationName: "LogBase",
  openGraph: {
    type: "website",
    siteName: "LogBase",
    title: `LogBase | ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_NG",
  },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // opens full screen, without the browser's address bar, when added to an iPhone's home screen
  appleWebApp: { capable: true, title: "LogBase", statusBarStyle: "default" },
};

// the colour of the phone's top bar
export const viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the small script below may add the "dark" class before React loads
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
