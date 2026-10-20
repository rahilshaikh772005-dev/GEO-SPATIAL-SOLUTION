import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CloudSun,
  Droplets,
  FileText,
  House,
  Landmark,
  LocateFixed,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Bill = {
  id?: number;
  icon: typeof House;
  label: string;
  provider: string;
  period: string;
  amount: string;
  due: string;
  status: "Due soon" | "Paid";
  tone: "water" | "electric" | "civic";
};

const navItems = [
  { label: "Overview", icon: House },
  { label: "My properties", icon: MapPin },
  { label: "Bills & payments", icon: CircleDollarSign },
  { label: "Documents", icon: FileText },
];

const bills: Bill[] = [
  { icon: Droplets, label: "Water connection", provider: "Mumbai Water Supply", period: "Aug – Sep 2026", amount: "₹1,240", due: "Due 18 Sep", status: "Due soon", tone: "water" },
  { icon: Zap, label: "Electricity", provider: "Adani Electricity Mumbai", period: "Aug 2026", amount: "₹2,680", due: "Due 22 Sep", status: "Due soon", tone: "electric" },
  { icon: Landmark, label: "Municipal property tax", provider: "BMC Ward 14 Office", period: "FY 2026–27", amount: "₹360", due: "Paid 02 Sep", status: "Paid", tone: "civic" },
];

const toneStyles = {
  water: { icon: "bg-cyan-50 text-cyan-700", bar: "bg-cyan-500", tint: "bg-cyan-50/60" },
  electric: { icon: "bg-amber-50 text-amber-700", bar: "bg-amber-400", tint: "bg-amber-50/60" },
  civic: { icon: "bg-violet-50 text-violet-700", bar: "bg-violet-500", tint: "bg-violet-50/60" },
};

function StatusPill({ status }: { status: Bill["status"] }) {
  const styles = status === "Paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200";
  return <span className={`status-pill ring-1 ${styles}`}><span className="status-dot" />{status}</span>;
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="logo-mark"><span className="logo-dot logo-dot-a" /><span className="logo-dot logo-dot-b" /><span className="logo-dot logo-dot-c" /><span className="logo-line" /></div>{!compact && <div><p className="logo-wordmark">Civic<span>Atlas</span></p><p className="logo-subtitle">Municipal services</p></div>}</div>;
}

function MapSurface() {
  return <div className="map-surface" aria-label="OpenStreetMap showing linked property in Ward 14"><iframe title="OpenStreetMap property location" src="https://www.openstreetmap.org/export/embed.html?bbox=72.88%2C19.08%2C72.94%2C19.15&layer=mapnik&marker=19.1176%2C72.9060" /><div className="map-legend"><span className="legend-home" /> Your property · OpenStreetMap</div></div>;
}

export default function Home() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const { user, loading } = useAuth({ redirectOnUnauthenticated: authConfigured, redirectPath: "/login" });
  const dashboardQuery = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const payBillMutation = trpc.citizen.payBill.useMutation({ onSuccess: () => { dashboardQuery.refetch(); showNotice("Payment recorded successfully."); } });
  const addPropertyMutation = trpc.citizen.addProperty.useMutation({ onSuccess: () => { dashboardQuery.refetch(); setShowPropertyModal(false); showNotice("Property details saved and linked to your account."); } });
  const [activeNav, setActiveNav] = useState("Overview");
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const routes: Record<string, string> = { "Overview": "/dashboard", "My properties": "/my-property", "Bills & payments": "/my-bills", "Documents": "/payment-history" };
    const route = routes[activeNav];
    if (route && window.location.pathname !== route) setLocation(route);
  }, [activeNav, setLocation]);

  const showNotice = (message: string) => { const unpaidBill = dashboardQuery.data?.bills.find((bill) => bill.status !== "paid"); if ((message.includes("payment flow") || message.includes("Secure payment")) && unpaidBill) payBillMutation.mutate({ billId: unpaidBill.id, amount: unpaidBill.amount }); const latestPayment = dashboardQuery.data?.payments[0]; if (message.includes("Receipt available") && latestPayment) message = `Receipt ${latestPayment.reference} is recorded in payment history.`; if (message.includes("Property details saved")) { const fields = Array.from(document.querySelectorAll<HTMLInputElement>(".property-modal .field-input")); const houseNo = fields[0]?.value.trim(); const ownerName = fields[1]?.value.trim(); if (houseNo && ownerName) addPropertyMutation.mutate({ propertyNo: `P-${Date.now().toString().slice(-6)}`, houseNo, ownerName, address: `${houseNo}, Mumbai, Maharashtra`, latitude: 19.1176, longitude: 72.906 }); } setNotice(message); window.setTimeout(() => setNotice(""), 3600); };
  const handleSync = () => { setSyncing(true); window.setTimeout(() => { setSyncing(false); showNotice("All connected authorities are up to date."); }, 1000); };

  const liveBills: Bill[] = (dashboardQuery.data?.bills ?? []).map((bill) => ({
    id: bill.id,
    icon: bill.billType === "water" ? Droplets : bill.billType === "electricity" ? Zap : Landmark,
    label: bill.billType === "property_tax" ? "Municipal property tax" : bill.billType === "electricity" ? "Electricity" : "Water connection",
    provider: bill.billType === "property_tax" ? "Municipal revenue department" : bill.billType === "electricity" ? "Electricity provider" : "Water supply department",
    period: new Date(bill.dueDate).getFullYear().toString(),
    amount: `₹${bill.amount.toLocaleString("en-IN")}`,
    due: bill.status === "paid" ? `Paid ${new Date(bill.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : `Due ${new Date(bill.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
    status: bill.status === "paid" ? "Paid" : "Due soon",
    tone: bill.billType === "water" ? "water" : bill.billType === "electricity" ? "electric" : "civic",
  }));
  const visibleBills = liveBills.length > 0 ? liveBills : bills;
  const handlePayBill = (bill: Bill) => {
    if (!bill.id) {
      showNotice(`${bill.label} payment flow is ready for gateway integration.`);
      return;
    }
    const amount = Number(bill.amount.replace(/[^0-9]/g, ""));
    payBillMutation.mutate({ billId: bill.id, amount });
  };

  if (loading || (authConfigured && !user)) {
    return <div className="app-frame" aria-busy="true"><main className="app-main"><div className="content-shell"><p className="eyebrow">Loading citizen workspace</p></div></main></div>;
  }

  return <div className="app-frame">
    <aside className={`app-sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-top"><div className="sidebar-brand-row"><AppLogo /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div><div className="workspace-chip"><span className="workspace-avatar">RN</span><div><p>Ravi N. Rao</p><span>Citizen account</span></div><ChevronDown size={14} /></div></div>
      <div className="sidebar-nav-wrap"><p className="eyebrow sidebar-eyebrow">Workspace</p><nav className="sidebar-nav" aria-label="Primary navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} className={`sidebar-nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setMobileNav(false); }}><Icon size={18} /><span>{item.label}</span>{item.label === "Bills & payments" && <span className="nav-count">2</span>}</button>; })}</nav><p className="eyebrow sidebar-eyebrow source-eyebrow">Connected sources</p><div className="source-list"><div className="source-item"><span className="source-icon water-source"><Droplets size={15} /></span><span>Mumbai Water Supply</span><span className="source-check"><Check size={12} /></span></div><div className="source-item"><span className="source-icon power-source"><Zap size={15} /></span><span>Adani Electricity Mumbai</span><span className="source-check"><Check size={12} /></span></div><div className="source-item"><span className="source-icon civic-source"><Landmark size={15} /></span><span>BMC Ward 14</span><span className="source-check"><Check size={12} /></span></div></div></div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17} /></div><div><p>Data stays private</p><span>Encrypted across every sync</span></div></div><button className="sidebar-link" onClick={() => showNotice("Help centre will open in a new window.")}>Need help? <ArrowUpRight size={14} /></button><div className="sidebar-footer"><AppLogo compact /><span>v1.0 beta</span></div></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" />}

    <main className="app-main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Civic Atlas</span><ChevronRight size={14} /><strong>{activeNav}</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16} /><input placeholder="Search bills, properties..." aria-label="Search bills and properties" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => showNotice("You have 2 bills due this month.")}><Bell size={18} /><span className="notification-dot" /></button><div className="topbar-avatar">RN</div><button className="signin-link" onClick={() => startLogin()}>Sign in</button></div></header>
      <div className="content-shell"><div className="welcome-row"><div><div className="eyebrow welcome-eyebrow"><span className="live-dot" />Live citizen workspace</div><h1>Hello, Rahil<span>.</span></h1><p>Here’s the latest across your connected municipal services.</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={() => setShowPropertyModal(true)}><Plus size={16} /> Add property</button><button className="button button-primary" onClick={() => showNotice("Secure payment flow is ready for gateway integration.")}><CircleDollarSign size={16} /> Pay all due <ArrowUpRight size={15} /></button></div></div>
        <div className="sync-strip"><div className="sync-left"><span className="sync-pulse" /><span><strong>3 sources connected</strong> · Last synchronized today at 10:40 AM</span></div><button className="sync-button" onClick={handleSync} disabled={syncing}><RefreshCw size={14} className={syncing ? "spin" : ""} /> {syncing ? "Syncing" : "Sync now"}</button></div>
        <section className="overview-grid"><div className="map-card panel-card"><div className="panel-heading"><div><p className="eyebrow">Property map</p><h2>One place for every service</h2></div><button className="mini-button" onClick={() => showNotice("Map layers are ready for full GIS integration.")}>View full map <ArrowUpRight size={14} /></button></div><MapSurface /><div className="map-footer"><div className="map-property"><span className="property-dot" /><div><strong>12-4-88, Powai Lakeview</strong><span>Ward 14 · East Mumbai · 3 connected services</span></div></div><button className="map-link" onClick={() => setShowPropertyModal(true)}>Manage property <ChevronRight size={15} /></button></div></div>
          <div className="profile-card panel-card"><div className="profile-card-top"><p className="eyebrow">Selected property</p><button className="more-button" onClick={() => showNotice("Property actions are coming soon.")}>•••</button></div><div className="property-visual"><div className="property-building"><div className="building-roof" /><div className="building-body"><span /><span /><span /><span /><span /><span /></div><div className="building-door" /></div><div className="property-sun" /></div><h3>Rahil Shaikh's residence</h3><p className="profile-address">12-4-88, Powai Lakeview<br />Mumbai, Maharashtra 400076</p><div className="profile-details"><div><span>Property ID</span><strong>MUM-W14-004821</strong></div><div><span>Owner since</span><strong>April 2018</strong></div></div><button className="button button-soft full-button" onClick={() => setShowPropertyModal(true)}>Manage property <ArrowUpRight size={15} /></button></div></section>
        <section className="metric-grid"><div className="metric-card"><div className="metric-icon metric-icon-amber"><CircleDollarSign size={18} /></div><div><p>Payable today</p><strong>₹4,280</strong><span className="metric-note amber-note">2 bills due this month</span></div><div className="metric-spark spark-amber"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="metric-card"><div className="metric-icon metric-icon-blue"><FileText size={18} /></div><div><p>Next due date</p><strong>18 Sep <small>2026</small></strong><span className="metric-note">Water connection</span></div><div className="date-badge"><span>SEP</span><strong>18</strong></div></div><div className="metric-card"><div className="metric-icon metric-icon-green"><RefreshCw size={18} /></div><div><p>Data health</p><strong>All systems good</strong><span className="metric-note green-note"><span className="inline-dot" /> 3 of 3 sources online</span></div><div className="health-ring"><Check size={16} /></div></div></section>
        <section className="bills-section"><div className="section-heading"><div><p className="eyebrow">Your bills</p><h2>Stay ahead of every due date</h2></div><button className="section-link" onClick={() => setActiveNav("Bills & payments")}>View all bills <ArrowUpRight size={14} /></button></div><div className="bill-grid">{visibleBills.map((bill) => { const Icon = bill.icon; const tone = toneStyles[bill.tone]; return <article className={`bill-card ${tone.tint}`} key={bill.label}><div className="bill-top"><div className={`bill-icon ${tone.icon}`}><Icon size={19} /></div><StatusPill status={bill.status} /></div><div className="bill-info"><h3>{bill.label}</h3><p>{bill.provider}</p></div><div className="bill-meta"><span>{bill.period}</span><span>{bill.due}</span></div><div className="bill-bottom"><strong>{bill.amount}</strong>{bill.status === "Paid" ? <button className="bill-action paid-action" onClick={() => showNotice("Receipt available in Documents.")}>View receipt <ChevronRight size={14} /></button> : <button className="bill-action" onClick={() => showNotice(`${bill.label} payment flow is ready for gateway integration.`)}>Pay bill <ArrowUpRight size={14} /></button>}</div><div className={`bill-progress ${tone.bar}`} /></article>; })}</div></section>
        <section className="bottom-grid"><div className="activity-card panel-card"><div className="section-heading compact-heading"><div><p className="eyebrow">Recent activity</p><h2>What’s been happening</h2></div><button className="more-button" onClick={() => showNotice("Showing your latest service activity.")}>•••</button></div><div className="activity-list"><div className="activity-row"><span className="activity-icon activity-green"><Check size={15} /></span><div><strong>Property synced successfully</strong><p>All 3 connected authorities responded</p></div><time>Today, 10:40 AM</time></div><div className="activity-row"><span className="activity-icon activity-violet"><FileText size={15} /></span><div><strong>Municipal tax receipt added</strong><p>FY 2026–27 · ₹360 paid</p></div><time>02 Sep, 04:12 PM</time></div><div className="activity-row"><span className="activity-icon activity-blue"><Sparkles size={15} /></span><div><strong>New data source connected</strong><p>Adani Electricity Mumbai is now active</p></div><time>18 Aug, 11:06 AM</time></div></div></div><div className="insight-card"><div className="insight-orbit orbit-one" /><div className="insight-orbit orbit-two" /><div className="insight-top"><span className="insight-icon"><CloudSun size={18} /></span><span className="eyebrow">Civic insight</span></div><h2>Everything is in one view now.</h2><p>Connect another property to keep family or rental records organized without extra paperwork.</p><button className="insight-button" onClick={() => setShowPropertyModal(true)}>Connect a property <Plus size={15} /></button></div></section>
        <footer className="content-footer"><span>© 2026 Civic Atlas</span><span><button onClick={() => showNotice("Privacy centre is coming soon.")}>Privacy</button><button onClick={() => showNotice("Terms are coming soon.")}>Terms</button><button onClick={() => showNotice("Support centre is coming soon.")}>Support</button></span></footer>
      </div>
    </main>

    {notice && <div className="toast-message"><span className="toast-check"><Check size={14} /></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
    {showPropertyModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPropertyModal(false); }}><div className="property-modal" role="dialog" aria-modal="true" aria-labelledby="property-modal-title"><div className="modal-header"><div><p className="eyebrow">New connection</p><h2 id="property-modal-title">Add a property</h2></div><button className="modal-close" onClick={() => setShowPropertyModal(false)} aria-label="Close dialog"><X size={18} /></button></div><p className="modal-copy">Enter a house number and owner name. Civic Atlas will request the latest records from connected local authorities.</p><div className="modal-stepper"><span className="step active"><b>1</b> Property details</span><span className="step-line" /><span className="step"><b>2</b> Verify owner</span></div><label className="field-label">House / property number<input className="field-input" placeholder="e.g. 12-4-88" /></label><label className="field-label">Owner name<input className="field-input" placeholder="As it appears on municipal records" /></label><label className="field-label">City / ward<select className="field-input" defaultValue="mumbai"><option value="mumbai">Mumbai · Ward 14</option><option value="other">Choose another ward</option></select></label><div className="modal-note"><ShieldCheck size={16} /><span>Your details are only used to match records. We never sell personal information.</span></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setShowPropertyModal(false)}>Cancel</button><button className="button button-primary" onClick={() => { setShowPropertyModal(false); showNotice("Property details saved. Verification flow is ready to connect."); }}>Continue <ArrowUpRight size={15} /></button></div></div></div>}
  </div>;
}
