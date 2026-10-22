import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/runtime";
import { toast } from "sonner";
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
  if (!property
    || !Number.isFinite(property.latitude)
    || !Number.isFinite(property.longitude)
    || property.latitude < -90
    || property.latitude > 90
    || property.longitude < -180
    || property.longitude > 180
  ) return <div className="map-surface"><p>No linked property location is available.</p></div>;
  const { latitude, longitude } = property;
  const bbox = `${longitude - 0.03}%2C${latitude - 0.035}%2C${longitude + 0.03}%2C${latitude + 0.035}`;
  return <div className="map-surface" aria-label="OpenStreetMap showing linked property"><iframe title="OpenStreetMap property location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`} /><div className="map-legend"><span className="legend-home" /> Your property · OpenStreetMap</div></div>;
}

const DEMO_PROPERTY = { propertyNo: "P-1024", houseNo: "12-4-88", ownerName: "Demo Citizen", address: "Powai Lakeview, Mumbai, Maharashtra 400076", latitude: 19.1176, longitude: 72.906 };

export default function Home() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: authConfigured && !isDemoMode, redirectPath: "/login" });
  const dashboardQuery = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const addPropertyMutation = trpc.citizen.claimProperty.useMutation({
    onSuccess: () => {
      dashboardQuery.refetch();
      setShowPropertyModal(false);
      setClaimPropertyNo("");
      setClaimReason("");
      showNotice("Ownership claim submitted for administrator review.");
    },
    onError: (error) => showNotice(error.message),
  });
  const [activeNav, setActiveNav] = useState("Overview");
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [claimPropertyNo, setClaimPropertyNo] = useState("");
  const [claimReason, setClaimReason] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const routes: Record<string, string> = { "Overview": "/dashboard", "My properties": "/my-property", "Bills & payments": "/my-bills", "Documents": "/payment-history" };
    const route = routes[activeNav];
    if (route && window.location.pathname !== route) setLocation(route);
  }, [activeNav, setLocation]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  };

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
  const visibleBills = liveBills.length > 0 ? liveBills : isDemoMode && !user ? bills.map((bill) => {
    const status: Bill["status"] = bill.status === "Paid" ? "Paid" : bill.dueDate && bill.dueDate < today ? "Overdue" : "Due soon";
    return {
      ...bill,
      status,
      due: status === "Paid" ? `Paid ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : status === "Overdue" ? `Overdue since ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : `Due ${bill.dueDate?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
    };
  }) : [];
  const selectedProperty = dashboardQuery.data?.properties[0] ?? (isDemoMode && !user ? DEMO_PROPERTY : undefined);
  const unpaidBills = visibleBills.filter((bill) => bill.status !== "Paid");
  const overdueBills = unpaidBills.filter((bill) => bill.status === "Overdue");
  const payableTotal = unpaidBills.reduce((total, bill) => total + Number(bill.amount.replace(/[^0-9.]/g, "")), 0);
  const nextDueBill = [...unpaidBills].sort((left, right) => (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER))[0];
  const handlePayBill = (bill: Bill) => {
    if (!bill.id) {
      showNotice("Demo bills cannot be paid. Sign in with a configured account to request payment.");
      return;
    }
    setLocation(`/payment/${bill.id}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
      showNotice("You have been signed out.");
    } catch {
      toast.error("Sign out failed. Please try again.");
    }
  };

  if (loading || (!user && !isDemoMode)) {
    return <div className="app-frame" aria-busy="true"><main className="app-main"><div className="content-shell"><p className="eyebrow">Loading citizen workspace</p></div></main></div>;
  }

  return <div className="app-frame">
    <aside className={`app-sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="sidebar-top"><div className="sidebar-brand-row"><AppLogo /><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div><div className="workspace-chip"><span className="workspace-avatar">{user?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? (isDemoMode ? "D" : "C")}</span><div><p>{user?.name ?? (isDemoMode ? "Demo account" : "Citizen account")}</p><span>{user?.email ?? (isDemoMode ? "Local sample data" : "Citizen account")}</span></div><ChevronDown size={14} /></div></div>
      <div className="sidebar-nav-wrap"><p className="eyebrow sidebar-eyebrow">Workspace</p><nav className="sidebar-nav" aria-label="Primary navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.label} className={`sidebar-nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setMobileNav(false); }}><Icon size={18} /><span>{item.label}</span>{item.label === "Bills & payments" && <span className="nav-count">{unpaidBills.length}</span>}</button>; })}</nav>{isDemoMode && <><p className="eyebrow sidebar-eyebrow source-eyebrow">Sample services · demo only</p><div className="source-list"><div className="source-item"><span className="source-icon water-source"><Droplets size={15} /></span><span>Mumbai Water Supply</span></div><div className="source-item"><span className="source-icon power-source"><Zap size={15} /></span><span>Adani Electricity Mumbai</span></div><div className="source-item"><span className="source-icon civic-source"><Landmark size={15} /></span><span>BMC Ward 14 Office</span></div></div></>}</div>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={17} /></div><div><p>Data stays private</p><span>Only account records are shown</span></div></div><button className="sidebar-link" onClick={() => setLocation("/contact")}>Need help? <ArrowUpRight size={14} /></button><div className="sidebar-footer"><AppLogo compact /><span>v1.0 beta</span></div></div>
    </aside>
    {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation overlay" />}

    <main className="app-main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Civic Atlas</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>    <div className="topbar-actions"><label className="search-box"><Search size={16} /><input value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && propertySearch.trim()) setLocation(`/property-map?q=${encodeURIComponent(propertySearch.trim())}`); }} placeholder="Search your properties..." aria-label="Search your properties" /><kbd>Enter</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => { const message = overdueBills.length ? `${overdueBills.length} overdue bill${overdueBills.length === 1 ? "" : "s"}: ${overdueBills.map((bill) => bill.label).join(", ")}.` : unpaidBills.length ? `${unpaidBills.length} unpaid bill${unpaidBills.length === 1 ? "" : "s"} totaling ₹${payableTotal.toLocaleString("en-IN")} are outstanding.` : "You are all caught up. No unpaid bills."; showNotice(message); }}><Bell size={18} /><span className="notification-dot" /></button><div className="topbar-avatar">{user?.name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? (isDemoMode ? "D" : "C")}</div>{user ? <button className="signin-link" onClick={handleLogout}>Sign out</button> : isDemoMode ? <span className="signin-link">Demo mode</span> : <button className="signin-link" onClick={() => setLocation("/login")}>Sign in</button>}</div></header>
    <div className="content-shell"><div className="welcome-row"><div><div className="eyebrow welcome-eyebrow"><span className="live-dot" />{user ? "Citizen workspace" : "Local demo workspace"}</div><h1>Hello, {user?.name?.trim().split(/\s+/)[0] ?? (isDemoMode ? "Demo" : "Citizen")}<span>.</span></h1><p>{user ? "Here’s the latest from your account records." : "Sample records are shown for preview; no municipal services are connected."}</p></div><div className="welcome-actions"><button className="button button-secondary" onClick={() => setShowPropertyModal(true)}><Plus size={16} /> Claim property</button><button className="button button-primary" onClick={() => unpaidBills.length ? setLocation("/my-bills") : showNotice("There are no outstanding bills to review.")}><CircleDollarSign size={16} /> Review dues <ArrowUpRight size={15} /></button></div></div>
      <div className="sync-strip"><div className="sync-left"><span className="sync-pulse" /><span><strong>{dashboardQuery.isLoading ? "Loading account records" : dashboardQuery.isError ? "Account data unavailable" : user ? "Account records loaded" : "Demo records"}</strong> · {dashboardQuery.isError ? dashboardQuery.error.message : user ? `${dashboardQuery.data?.properties.length ?? 0} properties · ${dashboardQuery.data?.bills.length ?? 0} bills` : "Sample data only; no authorities are connected."}</span></div><button className="sync-button" onClick={() => void dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}><RefreshCw size={14} /> {dashboardQuery.isFetching ? "Refreshing" : "Refresh records"}</button></div>
      <section className="overview-grid"><div className="map-card panel-card"><div className="panel-heading"><div><p className="eyebrow">Property map</p><h2>One place for every service</h2></div><button className="mini-button" onClick={() => setLocation("/property-map")}>View full map <ArrowUpRight size={14} /></button></div><MapSurface property={selectedProperty} /><div className="map-footer"><div className="map-property"><span className="property-dot" /><div><strong>{selectedProperty ? `${selectedProperty.houseNo}, ${selectedProperty.address}` : "No linked property"}</strong><span>{selectedProperty ? `${selectedProperty.propertyNo} · ${user ? "Account record" : "Demo record"}` : "Submit a claim to request ownership access"}</span></div></div><button className="map-link" onClick={() => setShowPropertyModal(true)}>Claim property <ChevronRight size={15} /></button></div></div>
          <div className="profile-card panel-card"><div className="profile-card-top"><p className="eyebrow">Selected property</p><button className="more-button" aria-label="View property details" onClick={() => selectedProperty ? setLocation("/my-property") : setShowPropertyModal(true)}>•••</button></div><div className="property-visual"><div className="property-building"><div className="building-roof" /><div className="building-body"><span /><span /><span /><span /><span /><span /></div><div className="building-door" /></div><div className="property-sun" /></div><h3>{selectedProperty?.ownerName ?? "Property not linked"}</h3><p className="profile-address">{selectedProperty?.address ?? "Claim an existing municipal record to link it to your account."}</p><div className="profile-details"><div><span>Property ID</span><strong>{selectedProperty?.propertyNo ?? "Not linked"}</strong></div><div><span>Record status</span><strong>{selectedProperty ? user ? "Account record" : "Demo sample" : "No linked record"}</strong></div></div>
            <button className="button button-soft full-button" onClick={() => setShowPropertyModal(true)}>Manage property <ArrowUpRight size={15} /></button></div></section>
        <section className="metric-grid"><div className="metric-card"><div className="metric-icon metric-icon-amber"><CircleDollarSign size={18} /></div><div><p>Outstanding total</p><strong>₹{payableTotal.toLocaleString("en-IN")}</strong><span className="metric-note amber-note">{overdueBills.length ? `${overdueBills.length} overdue` : `${unpaidBills.length} unpaid`}</span></div><div className="metric-spark spark-amber"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="metric-card"><div className="metric-icon metric-icon-blue"><FileText size={18} /></div><div><p>{nextDueBill?.status === "Overdue" ? "Oldest overdue bill" : "Next due date"}</p><strong>{nextDueBill?.due ?? "All paid"}</strong><span className="metric-note">{nextDueBill?.label ?? "No outstanding bills"}</span></div><div className="date-badge"><span>BILLS</span><strong>{unpaidBills.length}</strong></div></div><div className="metric-card"><div className="metric-icon metric-icon-green"><RefreshCw size={18} /></div><div><p>Account data</p><strong>{dashboardQuery.isError ? "Unavailable" : dashboardQuery.isLoading ? "Loading" : user ? "Connected" : "Demo sample"}</strong><span className="metric-note green-note">{dashboardQuery.isError ? "Refresh to retry loading" : user ? "Loaded from your account" : "Not municipal records"}</span></div><div className="health-ring"><Check size={16} /></div></div></section>
        <section className="bills-section"><div className="section-heading"><div><p className="eyebrow">Your bills</p><h2>Stay ahead of every due date</h2></div><button className="section-link" onClick={() => setLocation("/my-bills")}>View all bills <ArrowUpRight size={14} /></button></div>{dashboardQuery.isError ? <div className="empty-state" role="alert">Could not load bills: {dashboardQuery.error.message}</div> : visibleBills.length === 0 ? <div className="empty-state">{dashboardQuery.isLoading ? "Loading bills…" : "No bills are linked to this account."}</div> : <div className="bill-grid">{visibleBills.map((bill) => { const Icon = bill.icon; const tone = toneStyles[bill.tone]; return <article className={`bill-card ${tone.tint}`} key={bill.id ?? bill.label}><div className="bill-top"><div className={`bill-icon ${tone.icon}`}><Icon size={19} /></div><StatusPill status={bill.status} /></div><div className="bill-info"><h3>{bill.label}</h3><p>{bill.provider}</p></div><div className="bill-meta"><span>{bill.period}</span><span>{bill.due}</span></div><div className="bill-bottom"><strong>{bill.amount}</strong>{bill.status === "Paid" ? <button className="bill-action paid-action" onClick={() => setLocation("/payment-history")}>View payment history <ChevronRight size={14} /></button> : <button className="bill-action" onClick={() => handlePayBill(bill)}>Review payment <ArrowUpRight size={14} /></button>}</div><div className={`bill-progress ${tone.bar}`} /></article>; })}</div>}</section>
        <section className="bottom-grid"><div className="activity-card panel-card"><div className="section-heading compact-heading"><div><p className="eyebrow">Recent activity</p><h2>Payment history</h2></div><button className="section-link" onClick={() => setLocation("/payment-history")}>View history <ArrowUpRight size={14} /></button></div><div className="activity-list">{dashboardQuery.isLoading ? <div className="empty-state">Loading account activity…</div> : dashboardQuery.error ? <div className="empty-state" role="alert">Could not load account activity.</div> : (dashboardQuery.data?.payments ?? []).slice(0, 3).map((payment) => <div className="payment-row" key={payment.id}><span><Check size={15} /></span><strong>{payment.reference}</strong><small>₹{payment.amount.toLocaleString("en-IN")}</small><time>{new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString()}</time></div>)}{!dashboardQuery.isLoading && !dashboardQuery.error && (dashboardQuery.data?.payments ?? []).length === 0 && <div className="empty-state">{user ? "No payment records are available yet." : "Demo activity is not a live service record."}</div>}</div></div><div className="insight-card"><div className="insight-orbit orbit-one" /><div className="insight-orbit orbit-two" /><div className="insight-top"><span className="insight-icon"><CloudSun size={18} /></span><span className="eyebrow">Civic insight</span></div><h2>Keep your property records together.</h2><p>Submit a claim for an existing municipal property. It will only be linked after administrator review.</p><button className="insight-button" onClick={() => setShowPropertyModal(true)}>Claim a property <Plus size={15} /></button></div></section>
        <footer className="content-footer"><span>© 2026 Civic Atlas</span><span><button onClick={() => setLocation("/about")}>About</button><button onClick={() => setLocation("/contact")}>Contact</button><button onClick={() => setLocation("/contact")}>Support</button></span></footer>
      </div>
    </main>

    {notice && <div className="toast-message"><span className="toast-check"><Check size={14} /></span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={14} /></button></div>}
    {showPropertyModal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPropertyModal(false); }}><form className="property-modal" role="dialog" aria-modal="true" aria-labelledby="property-modal-title" onSubmit={(event) => { event.preventDefault(); if (!user) { showNotice("Sign in before submitting an ownership claim."); return; } addPropertyMutation.mutate({ propertyNo: claimPropertyNo.trim(), claimReason: claimReason.trim() }); }}><div className="modal-header"><div><p className="eyebrow">Ownership request</p><h2 id="property-modal-title">Claim a property</h2></div><button type="button" className="modal-close" onClick={() => setShowPropertyModal(false)} aria-label="Close dialog"><X size={18} /></button></div><p className="modal-copy">Submit an existing municipal property number and a reason for the claim. The property remains unlinked until an administrator reviews it.</p><div className="modal-stepper"><span className="step active"><b>1</b> Claim details</span><span className="step-line" /><span className="step"><b>2</b> Admin review</span></div><label className="field-label">Municipal property number<input className="field-input" value={claimPropertyNo} onChange={(event) => setClaimPropertyNo(event.target.value)} placeholder="e.g. P-1024" required minLength={2} maxLength={32} /></label><label className="field-label">Claim reason<textarea className="field-input" value={claimReason} onChange={(event) => setClaimReason(event.target.value)} placeholder="Explain your relationship to this property" required minLength={10} maxLength={2000} /></label>{addPropertyMutation.error && <p role="alert">{addPropertyMutation.error.message}</p>}<div className="modal-note"><ShieldCheck size={16} /><span>A claim does not change the recorded owner unless it is approved.</span></div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowPropertyModal(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={addPropertyMutation.isPending}>{addPropertyMutation.isPending ? "Submitting…" : "Submit claim"} <ArrowUpRight size={15} /></button></div></form></div>}
  </div>;
}
