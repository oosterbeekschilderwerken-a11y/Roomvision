import Link from 'next/link';
export default function Header({ studio = false }: { studio?: boolean }) {
  return <header className="site-header"><Link href="/" className="brand" aria-label="RoomVision homepage"><span className="brand-icon" aria-hidden="true">◈</span> Room<span>Vision</span></Link><nav aria-label="Hoofdnavigatie"><Link href={studio ? '/' : '/#hoe-het-werkt'}>{studio ? '← Naar home' : 'Hoe het werkt'}</Link><Link href="/studio" className="button small">{studio ? '360° studio' : 'Open de studio'} <span aria-hidden="true">→</span></Link></nav></header>;
}
