import "./globals.css";

export const metadata = {
  title: "Barrow",
  description: "Calendar-based workout tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barrow",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: "100dvh", overscrollBehavior: "none" }}>
        {children}
      </body>
    </html>
  );
}
