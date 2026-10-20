import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, IndianRupee, MapPin, Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Admin() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const isLocalDemo = !authConfigured;
  const { user, loading } = useAuth({ redirectOnUnauthenticated: authConfigured, redirectPath: "/login" });
  const summary = trpc.admin.summary.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const [query, setQuery] = useState("");
  const search = trpc.admin.searchProperties.useQuery({ query }, { enabled: user?.role === "admin" && query.length > 0 });

  if (loading && !isLocalDemo) return <main className="admin-page"><p>Loading admin dashboard...</p></main>;
  if (!isLocalDemo && user?.role !== "admin") return <main className="admin-page"><h1>Admin access required</h1><Link href="/">Return to citizen workspace</Link></main>;

  const data = summary.data ?? (isLocalDemo ? { citizens: 1, properties: 1, totalRevenue: 2350, outstanding: 5700, mapProperties: [{ id: 1, propertyNo: "P-1024", ownerName: "Demo Administrator", houseNo: "12-4-88", address: "Powai Lakeview, Mumbai", latitude: 19.1176, longitude: 72.9060 }] } : undefined);
  const properties = query ? search.data ?? [] : data?.mapProperties ?? [];
  return <main className="admin-page">
    <header className="admin-header"><div><p className="eyebrow"><ShieldCheck size={13} /> Municipal control room</p><h1>Admin dashboard</h1><p>Manage citizens, properties, bills, collections, and map records.</p>{isLocalDemo && <span className="admin-demo-badge">Local demo data</span>}</div><Link href="/" className="admin-back"><ArrowLeft size={15} /> Citizen view</Link></header>
    <section className="admin-metrics"><div><Users /><span>Citizens</span><strong>{data?.citizens ?? 0}</strong></div><div><Building2 /><span>Properties</span><strong>{data?.properties ?? 0}</strong></div><div><IndianRupee /><span>Total collection</span><strong>₹{(data?.totalRevenue ?? 0).toLocaleString("en-IN")}</strong></div><div><IndianRupee /><span>Outstanding</span><strong>₹{(data?.outstanding ?? 0).toLocaleString("en-IN")}</strong></div></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Property registry</p><h2>Search and map properties</h2></div><label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="House no., property no., owner name" /></label></div><div className="admin-map"><div className="admin-map-grid" />{properties.map((property) => <button className="admin-marker" key={property.id} style={{ left: `${Math.max(5, Math.min(92, (property.longitude + 180) / 360 * 100))}%`, top: `${Math.max(8, Math.min(88, (90 - property.latitude) / 180 * 100))}%` }} title={`${property.propertyNo} · ${property.ownerName}`}><MapPin size={18} /><span>{property.propertyNo}</span></button>)}</div><div className="admin-table">{properties.map((property) => <div className="admin-row" key={property.id}><strong>{property.propertyNo}</strong><span>{property.ownerName}</span><span>{property.houseNo}</span><span>{property.address}</span></div>)}{properties.length === 0 && <p className="admin-empty">No properties found. Add records through the admin API.</p>}</div></section>
  </main>;
}