import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/runtime";
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
  dueDate?: Date;
  status: "Due soon" | "Overdue" | "Paid";
  tone: "water" | "electric" | "civic";
};

const navItems = [
  { label: "Overview", icon: House },
  { label: "My properties", icon: MapPin },
  { label: "Bills & payments", icon: CircleDollarSign },
  { label: "Documents", icon: FileText },
];

const bills: Bill[] = [
  { icon: Droplets, label: "Water connection", provider: "Mumbai Water Supply", period: "Aug – Sep 2026", amount: "₹1,240", due: "Due 18 Sep", dueDate: new Date("2026-09-18"), status: "Due soon", tone: "water" },
  { icon: Zap, label: "Electricity", provider: "Adani Electricity Mumbai", period: "Aug 2026", amount: "₹2,680", due: "Due 22 Sep", dueDate: new Date("2026-09-22"), status: "Due soon", tone: "electric" },
  { icon: Landmark, label: "Municipal property tax", provider: "BMC Ward 14 Office", period: "FY 2026–27", amount: "₹360", due: "Paid 02 Sep", dueDate: new Date("2026-09-02"), status: "Paid", tone: "civic" },
];

const toneStyles = {
  water: { icon: "bg-cyan-50 text-cyan-700", bar: "bg-cyan-500", tint: "bg-cyan-50/60" },
  electric: { icon: "bg-amber-50 text-amber-700", bar: "bg-amber-400", tint: "bg-amber-50/60" },
  civic: { icon: "bg-violet-50 text-violet-700", bar: "bg-violet-500", tint: "bg-violet-50/60" },
};

function StatusPill({ status }: { status: Bill["status"] }) {
  const styles = status === "Paid" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "Overdue" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-amber-50 text-amber-700 ring-amber-200";
  return <span className={`status-pill ring-1 ${styles}`}><span className="status-dot" />{status}</span>;
}

function AppLogo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3"><div className="logo-mark"><span className="logo-dot logo-dot-a" /><span className="logo-dot logo-dot-b" /><span className="logo-dot logo-dot-c" /><span className="logo-line" /></div>{!compact && <div><p className="logo-wordmark">Civic<span>Atlas</span></p><p className="logo-subtitle">Municipal services</p></div>}</div>;
}

function MapSurface({ property }: { property?: { latitude: number; longitude: number } }) {
  if (!property) return <div className="map-surface"><p>No linked property location is available.</p></div>;
  const { latitude, longitude } = property;
  const bbox = `${longitude - 0.03}%2C${latitude - 0.035}%2C${longitude + 0.03}%2C${latitude + 0.035}`;
  return <div className="map-surface" aria-label="OpenStreetMap showing linked property"><iframe title="OpenStreetMap property location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`} /><div className="map-legend"><span className="legend-home" /> Your property · OpenStreetMap</div></div>;
}

const DEMO_PROPERTY = { propertyNo: "P-1024", houseNo: "12-4-88", ownerName: "Demo Citizen", address: "Powai Lakeview, Mumbai, Maharashtra 400076", latitude: 19.1176, longitude: 72.906 };

export default function Home() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const { user, loading } = useAuth({ redirectOnUnauthenticated: authConfigured && !isDemoMode, redirectPath: "/login" });
  const dashboardQuery = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const payBillMutation = trpc.citizen.initiatePayment.useMutation({ onSuccess: (payment) => { dashboardQuery.refetch(); showNotice(`Payment request ${payment.reference} is pending provider confirmation.`); } });
  const addPropertyMutation = trpc.citizen.claimProperty.useMutation({ onSuccess: () => { dashboardQuery.refetch(); setShowPropertyModal(false); showNotice("Ownership claim submitted for administrator review."); } });
  const [activeNav, setActiveNav] = useState("Overview");
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const routes: Record<string, string> = { "Overview": "/dashboard", "My properties": "/my-property", "Bills & payments": "/my-bills", "Documents": "/payment-history" };
    const route = routes[activeNav];
    if (route && window.location.pathname !== route) setLocation(route);
  }, [activeNav, setLocation]);

  const showNotice = (message: string) => { const unpaidBill = dashboardQuery.data?.bills.find((bill) => bill.status !== "paid"); if ((message.includes("payment flow") || message.includes("Secure payment")) && unpaidBill) { payBillMutation.mutate({ billId: unpaidBill.id }); return; } const latestPayment = dashboardQuery.data?.payments[0]; if (message.includes("Receipt available") && latestPayment) message = `Receipt ${latestPayment.reference} is recorded in payment history.`; if (message.includes("Property details saved")) { const fields = Array.from(document.querySelectorAll<HTMLInputElement>(".property-modal .field-input")); const propertyNo = fields[0]?.value.trim(); const claimReason = fields[1]?.value.trim(); if (propertyNo && claimReason) { addPropertyMutation.mutate({ propertyNo, claimReason }); return; } message = "Enter the property number and claim reason."; } setNotice(message); window.setTimeout(() => setNotice(""), 3600); };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const liveBills: Bill[] = (dashboardQuery.data?.bills ?? []).map((bill) => {
    const dueDate = new Date(bill.dueDate);
    const status = bill.status === "paid" ? "Paid" : dueDate < today ? "Overdue" : "Due soon";
    return {
    id: bill.id,
    icon: bill.billType === "water" ? Droplets : bill.billType === "electricity" ? Zap : Landmark,
    label: bill.billType === "property_tax" ? "Municipal property tax" : bill.billType === "electricity" ? "Electricity" : "Water connection",
    provider: bill.billType === "property_tax" ? "Municipal revenue department" : bill.billType === "electricity" ? "Electricity provider" : "Water supply department",
    period: new Date(bill.dueDate).getFullYear().toString(),
    amount: `₹${bill.amount.toLocaleString("en-IN")}`,
    dueDate,
    due: status === "Paid" ? `Paid ${dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : status === "Overdue" ? `Overdue since ${dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : `Due ${dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
    status,
    tone: bill.billType === "water" ? "water" : bill.billType === "electricity" ? "electric" : "civic",
  };
  });
  const visibleBills = liveBills.length > 0 ? liveBills : isDemoMode ? bills.map((bill) => {
    const status: Bill["status"] = bill.status === "Paid" ? "Paid" : bill.dueDate && bill.dueDate < today ? "Overdue" : "Due soon";
    return {
      ...bill,
      status,
      due: status === "Paid" ? `Paid ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : status === "Overdue" ? `Overdue since ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : `Due ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
    };
  }) : [];
  const selectedProperty = dashboardQuery.data?.properties[0] ?? (isDemoMode ? DEMO_PROPERTY : undefined);
  const unpaidBills = visibleBills.filter((bill) => bill.status !== "Paid");
  const overdueBills = unpaidBills.filter((bill) => bill.status === "Overdue");
  const payableTotal = unpaidBills.reduce((total, bill) => total + Number(bill.amount.replace(/[^0-9.]/g, "")), 0);
  const nextDueBill = [...unpaidBills].sort((left, right) => (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER))[0];
  const handlePayBill = (bill: Bill) => {
    if (!bill.id) {
      showNotice(`${bill.label} payment flow is ready for gateway integration.`);
      return;
    }
    payBillMutation.mutate({ billId: bill.id });
  };

  if (loading || (!user && !isDemoMode)) {
    return <div className="app-frame" aria-busy="true"><main className="app-main"><div className="content-shell"><p className="eyebrow">Loading citizen workspace</p></div></main></div>;
  }

  return <div className="app-frame">
    <aside className={`app-sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-top"><div className="sidebar-brand-row"><AppLogo /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div><div className="workspace-chip"><span className="workspace-avatar">RN</span><div><p>Ravi N. Rao</p><span>Citizen account</span></div><ChevronDown size={14} /></div></div>
      <div className="sidebar-nav-wrap"><p className="eyebrow sidebar-eyebrow">Workspace</p><nav className="sidebar-nav" aria-label="Primary navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} className={`sidebar-nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setMobileNav(false); }}><Icon size={18} /><span>{item.label}</span>{item.label === "Bills & payments" && <span className="nav-count">{unpaidBills.length}</span>}</button>; })}</nav>{isDemoMode && <><p className="eyebrow sidebar-eyebrow source-eyebrow">Connected sources · demo</p><div className="source-list"><div className="source-item"><span className="source-icon water-source"><Droplets size={15} /></span><span>Mumbai Water Supply</span><span className="source-check"><Check size={12} /></span></div><div className="source-item"><span className="source-icon power-source"><Zap size={15} /></span><span>Adani Electricity Mumbai</span><span className="source-check"><Check size={12} /></span></div><div className="source-item"><span className="source-icon civic-source"><Landmark size={15} /></span><span>BMC Ward 14</span><span className="source-check"><Check size={12} /></span></div></div></>}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17} /></div><div><p>Data stays private</p><span>Encrypted across every sync</span></div></div><button className="sidebar-link" onClick={() => showNotice("Help centre will open in a new window.")}>Need help? <ArrowUpRight size={14} /></button><div className="sidebar-footer"><AppLogo compact /><span>v1.0 beta</span></div></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" />}

    <main className="app-main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Civic Atlas</span><ChevronRight size={14} /><strong>{activeNav}</strong></div><div className="topbar-actions"><label className="search-box"><Search size={16} /><input placeholder="Search bills, properties..." aria-label="Search bills and properties" /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => { const message = overdueBills.length ? `${overdueBills.length} overdue bill${overdueBills.length === 1 ? "" : "s"}: ${overdueBills.map((bill) => bill.label).join(", ")}.` : unpaidBills.length ? `${unpaidBills.length} unpaid bill${unpaidBills.length === 1 ? "" : "s"} totaling ₹${payableTotal.toLocaleString("en-IN")} are coming due.` : "You are all caught up. No unpaid bills."; showNotice(message); }}><Bell size={18} /><span className="notification-dot" /></button><div className="topbar-avatar">RN</div><button className="signin-link" onClick={() => startLogin()}>Sign in</button></div></header>
      <div className="content-shell"><div className="welcome-row"><div><div className="eyebrow welcome-eyebrow"><span className="live-dot" />Live citizen workspace</div><h1>Hello, {user?.name?.split(" ")[0] ?? (isDemoMode ? "Demo" : "Citizen")}<span>.</span></h1><p>Here’s the latest across your connected municipal services.</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={() => setShowPropertyModal(true)}><Plus size={16} /> Add property</button><button className="button button-primary" onClick={() => showNotice("Secure payment flow is ready for gateway integration.")}><CircleDollarSign size={16} /> Pay all due <ArrowUpRight size={15} /></button></div></div>
        <div className="sync-strip"><div className="sync-left"><span className="sync-pulse" /><span><strong>{isDemoMode ? "Demo records" : "Municipal sync unavailable"}</strong> · {isDemoMode ? "Sample data only; no authorities are connected." : "No external municipal data integration is configured."}</span></div><button className="sync-button" onClick={() => showNotice("External municipal synchronization is not configured.")} disabled><RefreshCw size={14} /> Unavailable</button></div>
        <section className="overview-grid"><div className="map-card panel-card"><div className="panel-heading"><div><p className="eyebrow">Property map</p><h2>One place for every service</h2></div><button className="mini-button" onClick={() => showNotice("Map layers are ready for full GIS integration.")}>View full map <ArrowUpRight size={14} /></button></div><MapSurface property={selectedProperty} /><div className="map-footer"><div className="map-property"><span className="property-dot" /><div><strong>{selectedProperty ? `${selectedProperty.houseNo}, ${selectedProperty.address}` : "No linked property"}</strong><span>{selectedProperty ? `${selectedProperty.propertyNo} · Municipal record` : "Submit a claim to request ownership access"}</span></div></div><button className="map-link" onClick={() => setShowPropertyModal(true)}>Manage property <ChevronRight size={15} /></button></div></div>
          <div className="profile-card panel-card"><div className="profile-card-top"><p className="eyebrow">Selected property</p><button className="more-button" onClick={() => showNotice("Property actions are coming soon.")}>•••</button></div><div className="property-visual"><div className="property-building"><div className="building-roof" /><div className="building-body"><span /><span /><span /><span /><span /><span /></div><div className="building-door" /></div><div className="property-sun" /></div><h3>{selectedProperty?.ownerName ?? "Property not linked"}</h3><p className="profile-address">{selectedProperty?.address ?? "Claim an existing municipal record to link it to your account."}</p><div className="profile-details"><div><span>Property ID</span><strong>{selectedProperty?.propertyNo ?? "Not linked"}</strong></div><div><span>Record status</span><strong>{selectedProperty ? "Verified record" : "No linked record"}</strong></div></div>
            <button className="button button-soft full-button" onClick={() => setShowPropertyModal(true)}>Manage property <ArrowUpRight size={15} /></button></div></section>
        <section className="metric-grid"><div className="metric-card"><div className="metric-icon metric-icon-amber"><CircleDollarSign size={18} /></div><div><p>Payable total</p><strong>₹{payableTotal.toLocaleString("en-IN")}</strong><span className="metric-note amber-note">{overdueBills.length ? `${overdueBills.length} overdue` : `${unpaidBills.length} unpaid`}</span></div><div className="metric-spark spark-amber"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="metric-card"><div className="metric-icon metric-icon-blue"><FileText size={18} /></div><div><p>{nextDueBill?.status === "Overdue" ? "Oldest overdue bill" : "Next due date"}</p><strong>{nextDueBill?.due ?? "All paid"}</strong><span className="metric-note">{nextDueBill?.label ?? "Across connected services"}</span></div><div className="date-badge"><span>BILLS</span><strong>{unpaidBills.length}</strong></div></div><div className="metric-card"><div className="metric-icon metric-icon-green"><RefreshCw size={18} /></div><div><p>Data health</p><strong>All systems good</strong><span className="metric-note green-note"><span className="inline-dot" /> 3 of 3 sources online</span></div><div className="health-ring"><Check size={16} /></div></div></section>
        <section className="bills-section"><div className="section-heading"><div><p className="eyebrow">Your bills</p><h2>Stay ahead of every due date</h2></div><button className="section-link" onClick={() => setActiveNav("Bills & payments")}>View all bills <ArrowUpRight size={14} /></button></div><div className="bill-grid">{visibleBills.map((bill) => { const Icon = bill.icon; const tone = toneStyles[bill.tone]; return <article className={`bill-card ${tone.tint}`} key={bill.label}><div className="bill-top"><div className={`bill-icon ${tone.icon}`}><Icon size={19} /></div><StatusPill status={bill.status} /></div><div className="bill-info"><h3>{bill.label}</h3><p>{bill.provider}</p></div><div className="bill-meta"><span>{bill.period}</span><span>{bill.due}</span></div><div className="bill-bottom"><strong>{bill.amount}</strong>{bill.status === "Paid" ? <button className="bill-action paid-action" onClick={() => showNotice("Receipt available in Documents.")}>View receipt <ChevronRight size={14} /></button> : <button className="bill-action" onClick={() => showNotice(`${bill.label} payment flow is ready for gateway integration.`)}>Pay bill <ArrowUpRight size={14} /></button>}</div><div className={`bill-progress ${tone.bar}`} /></article>; })}</div></section>
        <section className="bottom-grid"><div className="activity-card panel-card"><div className="section-heading compact-heading"><div><p className="eyebrow">Recent activity</p><h2>What’s been happening</h2></div></div><div className="activity-list">{isDemoMode ? <div className="empty-state">Demo activity examples are not live service records.</div> : <div className="empty-state">No recent account activity is available.</div>}</div></div><div className="insight-card"><div className="insight-orbit orbit-one" /><div className="insight-orbit orbit-two" /><div className="insight-top"><span className="insight-icon"><CloudSun size={18} /></span><span className="eyebrow">Civic insight</span></div><h2>Everything is in one view now.</h2><p>Connect another property to keep family or rental records organized without extra paperwork.</p><button className="insight-button" onClick={() => setShowPropertyModal(true)}>Connect a property <Plus size={15} /></button></div></section>
        <footer className="content-footer"><span>© 2026 Civic Atlas</span><span><button onClick={() => showNotice("Privacy centre is coming soon.")}>Privacy</button><button onClick={() => showNotice("Terms are coming soon.")}>Terms</button><button onClick={() => showNotice("Support centre is coming soon.")}>Support</button></span></footer>
      </div>
    </main>

    {notice && <div className="toast-message"><span className="toast-check"><Check size={14} /></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
    {showPropertyModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPropertyModal(false); }}><div className="property-modal" role="dialog" aria-modal="true" aria-labelledby="property-modal-title"><div className="modal-header"><div><p className="eyebrow">Ownership request</p><h2 id="property-modal-title">Claim a property</h2></div><button className="modal-close" onClick={() => setShowPropertyModal(false)} aria-label="Close dialog"><X size={18} /></button></div><p className="modal-copy">Submit an existing municipal property number and a reason for the claim. The property remains unlinked until an administrator reviews it.</p><div className="modal-stepper"><span className="step active"><b>1</b> Claim details</span><span className="step-line" /><span className="step"><b>2</b> Admin review</span></div><label className="field-label">Municipal property number<input className="field-input" placeholder="e.g. P-1024" /></label><label className="field-label">Claim reason<input className="field-input" placeholder="Explain your relationship to this property" /></label><div className="modal-note"><ShieldCheck size={16} /><span>A claim does not change the recorded owner unless it is approved.</span></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setShowPropertyModal(false)}>Cancel</button><button className="button button-primary" onClick={() => showNotice("Property details saved. Verification flow is ready to connect.")} disabled={addPropertyMutation.isPending}>Submit claim <ArrowUpRight size={15} /></button></div></div></div>}
  </div>;
}
