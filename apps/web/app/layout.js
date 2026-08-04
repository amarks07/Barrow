import "./globals.css";

export const metadata = {
  title: "Barrow — Download",
  description: "Get the Barrow workout tracker app for Android — direct download, no Play Store needed.",
  icons: {
    icon: "/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
