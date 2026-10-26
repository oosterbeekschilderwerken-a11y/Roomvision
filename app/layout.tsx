import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'RoomVision — Bekijk je ruimte met nieuwe ogen',
  description: 'Ontdek je eigen ruimte in 360°. Een rustige plek voor jouw volgende interieuridee.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="nl"><body>{children}</body></html>;
}
