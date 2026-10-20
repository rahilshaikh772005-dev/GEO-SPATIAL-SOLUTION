import { ArrowRight, Check, Droplets, FileText, Landmark, MapPinned, ShieldCheck, Zap } from "lucide-react";
import { Link } from "wouter";

const services = [
  { icon: Landmark, title: "Property tax", copy: "Track assessments, due dates, and payment status." },
  { icon: Droplets, title: "Water bills", copy: "Keep monthly water charges beside your property record." },
  { icon: Zap, title: "Electricity bills", copy: "See outstanding utility charges without switching portals." },
];

export default function PublicHome() {
  return <main className="public-home">
    <nav className="public-nav"><Link href="/" className="public-brand"><span><MapPinned size={18} /></span>Civic<span>Atlas</span></Link><div><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/login" className="public-login">Login</Link><Link href="/register" className="public-register">Register <ArrowRight size={14} /></Link></div></nav>
    <section className="public-hero"><div className="public-hero-copy"><p className="eyebrow">Geo-spatial municipal services</p><h1>Your property, bills, and payments in one clear view.</h1><p>Search municipal records by property number or owner name, see the location on a map, and manage every bill from one citizen workspace.</p><div className="public-actions"><Link href="/register" className="public-register large">Create your account <ArrowRight size={16} /></Link><Link href="/property-map" className="public-outline">Search a property</Link></div><div className="public-proof"><span><Check size={14} /> Tax, water, and electricity</span><span><Check size={14} /> Map-based records</span><span><Check size={14} /> Digital payment history</span></div></div><div className="public-hero-map"><span className="map-orbit orbit-a" /><span className="map-orbit orbit-b" /><span className="public-marker marker-a"><MapPinned size={18} /></span><span className="public-marker marker-b"><MapPinned size={18} /></span><span className="public-marker marker-c"><MapPinned size={18} /></span><span className="public-map-caption">Ward 14 · East Mumbai</span><div className="public-map-card"><span className="map-card-dot" /><div><strong>P-1024</strong><small>Powai Lakeview · 3 services</small></div></div></div></section>
    <section className="public-services"><div><p className="eyebrow">One connected record</p><h2>Everything your civic life needs.</h2></div><div className="public-service-grid">{services.map(({ icon: Icon, title, copy }) => <article key={title}><span><Icon size={19} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="public-trust"><div><ShieldCheck size={22} /><div><strong>Built around accountable public records.</strong><p>Keep property information, bills, receipts, and payment history together.</p></div></div><Link href="/about">Learn how it works <ArrowRight size={15} /></Link></section>
    <footer className="public-footer"><span>© 2026 Civic Atlas</span><span><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/login">Sign in</Link></span></footer>
  </main>;
}
