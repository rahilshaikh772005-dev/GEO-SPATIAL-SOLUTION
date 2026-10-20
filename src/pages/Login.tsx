import { startLogin } from "@/const";
import { ArrowRight, Building2, MapPinned, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "wouter";

export default function Login() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

  return <main className="login-page">
    <section className="login-visual" aria-label="Civic Atlas overview">
      <div className="login-brand"><span className="login-brand-mark"><MapPinned size={20} /></span><span>Civic<span>Atlas</span></span></div>
      <div className="login-visual-copy"><p className="eyebrow">Municipal services, connected</p><h1>One clear view of your civic life.</h1><p>Find property records, bills, payments, and map locations without moving between departments.</p></div>
      <div className="login-map-art"><span className="login-map-road road-a" /><span className="login-map-road road-b" /><span className="login-map-road road-c" /><span className="login-map-pin pin-a"><Building2 size={15} /></span><span className="login-map-pin pin-b"><MapPinned size={15} /></span><span className="login-map-pin pin-c"><WalletCards size={15} /></span><span className="login-map-label label-a">Ward 14</span><span className="login-map-label label-b">Your property</span></div>
      <div className="login-visual-footer"><span><ShieldCheck size={14} /> Privacy-first records</span><span>Built for citizens</span></div>
    </section>
    <section className="login-panel"><div className="login-panel-inner"><Link href="/" className="login-mobile-brand">Civic<span>Atlas</span></Link><div className="login-heading"><p className="eyebrow">Citizen workspace</p><h2>Welcome back.</h2><p>Sign in to manage your properties and municipal services.</p></div><button className="login-primary" onClick={() => authConfigured ? startLogin() : window.location.assign("/dashboard")}><span>{authConfigured ? "Continue with secure sign in" : "Enter local demo"}</span><ArrowRight size={17} /></button><div className="login-divider"><span>What you can do</span></div><ul className="login-benefits"><li><span><MapPinned size={16} /></span><div><strong>Locate every property</strong><small>View your address and map location in one place.</small></div></li><li><span><WalletCards size={16} /></span><div><strong>Track every bill</strong><small>See property tax, water, and electricity status.</small></div></li><li><span><ShieldCheck size={16} /></span><div><strong>Keep records together</strong><small>Review payments and receipts from one workspace.</small></div></li></ul><p className="login-legal">By continuing, you agree to use Civic Atlas for authorized municipal records and payments.</p><Link href="/" className="login-back">Back to overview</Link></div></section>
  </main>;
}
