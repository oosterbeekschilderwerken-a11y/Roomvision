import type { Metadata, Viewport } from "next";
import "./globals.css";
export const viewport: Viewport = { themeColor: "#103f86" };
export const metadata: Metadata = {
  title: "RoomVision — Bekijk je ruimte met nieuwe ogen",
  description:
    "Ontdek je interieurkleuren met een gewone foto of 360°-panorama.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
