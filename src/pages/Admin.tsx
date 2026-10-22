import { useAuth } from "@/_core/hooks/useAuth";
import "@/civic-workflows.css";
import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/runtime";
import { ArrowLeft, Building2, Check, ChevronLeft, ChevronRight, IndianRupee, MapPin, Search, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Admin() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const isLocalDemo = isDemoMode;
  const { user, loading } = useAuth({ redirectOnUnauthenticated: authConfigured && !isLocalDemo, redirectPath: "/login" });
  const summary = trpc.admin.summary.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const registry = trpc.admin.properties.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const bills = trpc.admin.bills.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const claims = trpc.admin.ownershipClaims.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const utils = trpc.useUtils();
  const reviewClaim = trpc.admin.reviewOwnershipClaim.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.ownershipClaims.invalidate(), utils.admin.summary.invalidate()]);
    },
  });
  const addBill = trpc.admin.addBill.useMutation({
    onSuccess: async () => {
      setBillNotice("Bill record created.");
      setNewBill({ propertyId: "", billType: "property_tax", amount: "", dueDate: "" });
      await Promise.all([utils.admin.bills.invalidate(), utils.admin.summary.invalidate()]);
    },
    onError: (error) => setBillNotice(`Could not create bill: ${error.message}`),
  });
  const updateBillStatus = trpc.admin.updateBillStatus.useMutation({
    onSuccess: async (result) => {
      if (!result.success) {
        setBillNotice("The bill status was not changed. It may already be settled or no longer available.");
        return;
      }
      setBillNotice("Bill status updated.");
      await Promise.all([utils.admin.bills.invalidate(), utils.admin.summary.invalidate()]);
    },
    onError: (error) => setBillNotice(`Could not update bill: ${error.message}`),
  });
  const [query, setQuery] = useState("");
  const [datasetSearch, setDatasetSearch] = useState("");
  const [datasetPage, setDatasetPage] = useState(1);
  const [focusedPropertyId, setFocusedPropertyId] = useState<number | null>(null);
  const [newProperty, setNewProperty] = useState({
    propertyNo: "",
    houseNo: "",
    ownerName: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [editingPropertyId, setEditingPropertyId] = useState<number | null>(null);
  const [propertyChanges, setPropertyChanges] = useState({
    houseNo: "",
    ownerName: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [propertyNotice, setPropertyNotice] = useState("");
  const [newBill, setNewBill] = useState({ propertyId: "", billType: "property_tax" as "property_tax" | "water" | "electricity", amount: "", dueDate: "" });
  const [billNotice, setBillNotice] = useState("");
  const updateProperty = trpc.admin.updateProperty.useMutation({
    onSuccess: async () => {
      setEditingPropertyId(null);
      setPropertyNotice("Property record updated.");
      await Promise.all([
        utils.admin.summary.invalidate(),
        utils.admin.searchProperties.invalidate(),
        utils.admin.propertiesInBounds.invalidate(),
      ]);
    },
    onError: (error) => setPropertyNotice(`Could not update property: ${error.message}`),
  });
  const deleteProperty = trpc.admin.deleteProperty.useMutation({
    onSuccess: async () => {
      setPropertyNotice("Property record deleted.");
      await Promise.all([
        utils.admin.summary.invalidate(),
        utils.admin.searchProperties.invalidate(),
        utils.admin.propertiesInBounds.invalidate(),
      ]);
    },
    onError: (error) => setPropertyNotice(`Could not delete property: ${error.message}`),
  });
  const addProperty = trpc.admin.addProperty.useMutation({
    onSuccess: async () => {
      setPropertyNotice("Property record saved.");
      setNewProperty({ propertyNo: "", houseNo: "", ownerName: "", address: "", latitude: "", longitude: "" });
      await Promise.all([
        utils.admin.summary.invalidate(),
        utils.admin.searchProperties.invalidate(),
        utils.admin.propertiesInBounds.invalidate(),
      ]);
    },
    onError: (error) => setPropertyNotice(`Could not save property: ${error.message}`),
  });
  const search = trpc.admin.searchProperties.useQuery({ query }, { enabled: user?.role === "admin" && query.length > 0 });
  const mapProperties = trpc.admin.propertiesInBounds.useQuery({ north: 19.3, south: 18.8, east: 73.1, west: 72.7 }, { enabled: user?.role === "admin" });
  const propertyDataset = trpc.admin.propertyDataset.useQuery(
    { page: datasetPage, search: datasetSearch },
    { enabled: user?.role === "admin" || isLocalDemo },
  );

  if (loading && !isLocalDemo) return <main className="admin-page"><p>Loading admin dashboard...</p></main>;
  if (!isLocalDemo && user?.role !== "admin") return <main className="admin-page"><h1>Admin access required</h1><Link href="/">Return to citizen workspace</Link></main>;

  const data = summary.data ?? (isLocalDemo ? { citizens: 1, properties: 1, totalRevenue: 2350, outstanding: 5700 } : undefined);
  const properties = query ? search.data ?? [] : [];
  const focusedProperty = properties.find(property => property.id === focusedPropertyId)
    ?? mapProperties.data?.find(property => property.id === focusedPropertyId)
    ?? properties[0]
    ?? mapProperties.data?.[0];
  const mapUrl = focusedProperty
    && Number.isFinite(focusedProperty.latitude)
    && Number.isFinite(focusedProperty.longitude)
    && focusedProperty.latitude >= -90
    && focusedProperty.latitude <= 90
    && focusedProperty.longitude >= -180
    && focusedProperty.longitude <= 180
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${focusedProperty.longitude - 0.03}%2C${focusedProperty.latitude - 0.035}%2C${focusedProperty.longitude + 0.03}%2C${focusedProperty.latitude + 0.035}&layer=mapnik&marker=${focusedProperty.latitude}%2C${focusedProperty.longitude}`
    : undefined;
  return <main className="admin-page">
    <header className="admin-header"><div><p className="eyebrow"><ShieldCheck size={13} /> Municipal control room</p><h1>Admin dashboard</h1><p>Manage citizens, properties, bills, collections, and map records.</p>{isLocalDemo && <span className="admin-demo-badge">Local demo data</span>}</div><Link href="/" className="admin-back"><ArrowLeft size={15} /> Citizen view</Link></header>
    <section className="admin-metrics"><div><Users /><span>Citizens</span><strong>{data?.citizens ?? 0}</strong></div><div><Building2 /><span>Properties</span><strong>{data?.properties ?? 0}</strong></div><div><IndianRupee /><span>Total collection</span><strong>₹{(data?.totalRevenue ?? 0).toLocaleString("en-IN")}</strong></div><div><IndianRupee /><span>Outstanding</span><strong>₹{(data?.outstanding ?? 0).toLocaleString("en-IN")}</strong></div></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Property registry</p><h2>Search and map properties</h2></div><label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setFocusedPropertyId(null); }} placeholder="House no., property no., owner name" /></label></div><div className="admin-map">{mapUrl ? <iframe title={`Map centered on ${focusedProperty?.propertyNo}`} src={mapUrl} style={{ width: "100%", height: "100%", border: 0 }} /> : <p className="admin-empty">Search for a property with valid coordinates to view its location.</p>}</div><div className="admin-table">{properties.map((property) => <div key={property.id}><div className="admin-row" style={{ gridTemplateColumns: "120px 1fr 150px 2fr auto" }}><strong>{property.propertyNo}</strong><span>{property.ownerName}</span><span>{property.houseNo}</span><span>{property.address}</span><span className="admin-property-actions"><button type="button" onClick={() => setFocusedPropertyId(property.id)}>Locate</button>{user?.role === "admin" && <><button type="button" onClick={() => { setEditingPropertyId(property.id); setPropertyChanges({ houseNo: property.houseNo, ownerName: property.ownerName, address: property.address, latitude: String(property.latitude), longitude: String(property.longitude) }); }}>Edit</button><button type="button" disabled={deleteProperty.isPending} onClick={() => { if (window.confirm(`Delete property ${property.propertyNo}? Records with bills cannot be deleted.`)) deleteProperty.mutate({ id: property.id }); }}>Delete</button></>}</span></div>{editingPropertyId === property.id && <form className="admin-property-form" onSubmit={(event) => { event.preventDefault(); updateProperty.mutate({ id: property.id, ...propertyChanges, latitude: Number(propertyChanges.latitude), longitude: Number(propertyChanges.longitude) }); }}><label>House number<input required value={propertyChanges.houseNo} onChange={(event) => setPropertyChanges({ ...propertyChanges, houseNo: event.target.value })} /></label><label>Owner name<input required minLength={2} value={propertyChanges.ownerName} onChange={(event) => setPropertyChanges({ ...propertyChanges, ownerName: event.target.value })} /></label><label>Address<input required minLength={3} value={propertyChanges.address} onChange={(event) => setPropertyChanges({ ...propertyChanges, address: event.target.value })} /></label><label>Latitude<input required type="number" min="-90" max="90" step="any" value={propertyChanges.latitude} onChange={(event) => setPropertyChanges({ ...propertyChanges, latitude: event.target.value })} /></label><label>Longitude<input required type="number" min="-180" max="180" step="any" value={propertyChanges.longitude} onChange={(event) => setPropertyChanges({ ...propertyChanges, longitude: event.target.value })} /></label><button type="submit" disabled={updateProperty.isPending}>{updateProperty.isPending ? "Saving…" : "Save changes"}</button><button type="button" onClick={() => setEditingPropertyId(null)}>Cancel</button></form>}</div>)}{properties.length === 0 && <p className="admin-empty">Search by property number, house number, or owner name.</p>}    {propertyNotice && <p className="admin-empty" role={addProperty.error || updateProperty.error || deleteProperty.error ? "alert" : "status"}>{propertyNotice}</p>}</div></section>
    {user?.role === "admin" && <section className="admin-panel admin-dataset-panel">
    <div className="admin-panel-heading"><div><p className="eyebrow">Billing registry</p><h2>Manage bills</h2><p className="admin-dataset-caption">A bill can only be marked paid after verified provider confirmation.</p></div></div>
    <form className="admin-property-form" onSubmit={(event) => {
      event.preventDefault();
      addBill.mutate({
        propertyId: Number(newBill.propertyId),
        billType: newBill.billType,
        amount: Number(newBill.amount),
        dueDate: new Date(`${newBill.dueDate}T12:00:00`),
      });
    }}>
      <label>Property<select required value={newBill.propertyId} onChange={(event) => setNewBill({ ...newBill, propertyId: event.target.value })}><option value="">Select property</option>{(registry.data ?? []).map((property) => <option key={property.id} value={property.id}>{property.propertyNo} · {property.houseNo}</option>)}</select></label>
      <label>Service<select value={newBill.billType} onChange={(event) => setNewBill({ ...newBill, billType: event.target.value as typeof newBill.billType })}><option value="property_tax">Property tax</option><option value="water">Water</option><option value="electricity">Electricity</option></select></label>
      <label>Amount (₹)<input required type="number" min="1" step="1" value={newBill.amount} onChange={(event) => setNewBill({ ...newBill, amount: event.target.value })} /></label>
      <label>Due date<input required type="date" value={newBill.dueDate} onChange={(event) => setNewBill({ ...newBill, dueDate: event.target.value })} /></label>
      <button type="submit" disabled={addBill.isPending || !registry.data?.length}>{addBill.isPending ? "Saving…" : "Create bill"}</button>
    </form>
    {registry.error && <p className="admin-empty" role="alert">Could not load properties: {registry.error.message}</p>}
    {bills.isLoading ? <p className="admin-empty">Loading bills…</p> : bills.error ? <p className="admin-empty" role="alert">Could not load bills: {bills.error.message}</p> : bills.data?.length ? <div className="admin-claims">{bills.data.map((bill) => <article className="admin-claim" key={bill.id}>
      <div><strong>{bill.propertyNo} · {bill.billType.replace("_", " ")}</strong><span>₹{bill.amount.toLocaleString("en-IN")} · Due {new Date(bill.dueDate).toLocaleDateString()}</span><small>{bill.status}</small></div>
      {bill.status === "unpaid" && <button type="button" disabled={updateBillStatus.isPending} onClick={() => updateBillStatus.mutate({ id: bill.id, status: "overdue" })}>Mark overdue</button>}
      {bill.status === "overdue" && <button type="button" disabled={updateBillStatus.isPending} onClick={() => updateBillStatus.mutate({ id: bill.id, status: "unpaid" })}>Mark unpaid</button>}
    </article>)}</div> : <p className="admin-empty">No bill records have been created.</p>}
    {billNotice && <p className="admin-empty" role={addBill.error || updateBillStatus.error ? "alert" : "status"}>{billNotice}</p>}</section>}
    {user?.role === "admin" && <section className="admin-panel admin-dataset-panel">
      <div className="admin-panel-heading"><div><p className="eyebrow">Property registry</p><h2>Add municipal property</h2><p className="admin-dataset-caption">New records are unclaimed until ownership is separately verified.</p></div></div>
      <form className="admin-property-form" onSubmit={(event) => {
        event.preventDefault();
        addProperty.mutate({
          ...newProperty,
          latitude: Number(newProperty.latitude),
          longitude: Number(newProperty.longitude),
        });
      }}>
        <label>Property number<input required minLength={2} maxLength={32} value={newProperty.propertyNo} onChange={(event) => setNewProperty({ ...newProperty, propertyNo: event.target.value })} /></label>
        <label>House number<input required maxLength={128} value={newProperty.houseNo} onChange={(event) => setNewProperty({ ...newProperty, houseNo: event.target.value })} /></label>
        <label>Owner name<input required minLength={2} maxLength={160} value={newProperty.ownerName} onChange={(event) => setNewProperty({ ...newProperty, ownerName: event.target.value })} /></label>
        <label>Address<input required minLength={3} maxLength={500} value={newProperty.address} onChange={(event) => setNewProperty({ ...newProperty, address: event.target.value })} /></label>
        <label>Latitude<input required type="number" min="-90" max="90" step="any" value={newProperty.latitude} onChange={(event) => setNewProperty({ ...newProperty, latitude: event.target.value })} /></label>
        <label>Longitude<input required type="number" min="-180" max="180" step="any" value={newProperty.longitude} onChange={(event) => setNewProperty({ ...newProperty, longitude: event.target.value })} /></label>
        <button type="submit" disabled={addProperty.isPending}>{addProperty.isPending ? "Saving…" : "Save property"}</button>
      </form>
      {propertyNotice && <p className="admin-empty" role={addProperty.error ? "alert" : "status"}>{propertyNotice}</p>}
    </section>}
    <section className="admin-panel admin-dataset-panel">
      <div className="admin-panel-heading"><div><p className="eyebrow">Ownership review</p><h2>Property claims</h2></div></div>
      {claims.isLoading ? <p className="admin-empty">Loading ownership claims…</p> : claims.error ? <p className="admin-empty" role="alert">Could not load claims: {claims.error.message}</p> : claims.data?.length ? <div className="admin-claims">{claims.data.map((claim) => <article className="admin-claim" key={claim.id}>
        <div><strong>{claim.propertyNo}</strong><span>{claim.claimantName ?? "Citizen"} · {claim.claimantEmail ?? "No email"}</span><p>{claim.claimReason}</p><small>{claim.status} · Submitted {new Date(claim.createdAt).toLocaleDateString()}</small></div>
        {claim.status === "pending" && <div className="admin-claim-actions"><button type="button" disabled={reviewClaim.isPending} onClick={() => reviewClaim.mutate({ claimId: claim.id, decision: "approved" })}><Check size={14} /> Approve</button><button type="button" disabled={reviewClaim.isPending} onClick={() => reviewClaim.mutate({ claimId: claim.id, decision: "rejected" })}><X size={14} /> Reject</button></div>}
      </article>)}</div> : <p className="admin-empty">No ownership claims have been submitted.</p>}
      {reviewClaim.error && <p className="admin-empty" role="alert">Could not review claim: {reviewClaim.error.message}</p>}
    </section>
    <section className="admin-panel admin-dataset-panel">
      <div className="admin-panel-heading">
        <div><p className="eyebrow">Training dataset</p><h2>Geospatial property records</h2><p className="admin-dataset-caption">12,000 sample records · Separate from the live property registry</p></div>
        <label className="admin-search"><Search size={16} /><input value={datasetSearch} onChange={(event) => { setDatasetSearch(event.target.value); setDatasetPage(1); }} placeholder="Search any dataset field" /></label>
      </div>
      {propertyDataset.isLoading ? <p className="admin-empty">Loading dataset records...</p> : propertyDataset.error ? <p className="admin-empty" role="alert">Dataset could not be loaded: {propertyDataset.error.message}</p> : <>
        <div className="admin-dataset-summary">{propertyDataset.data?.totalRows.toLocaleString("en-IN") ?? 0} matching records</div>
        <div className="admin-dataset-scroll">
          <table className="admin-dataset-table">
            <thead><tr>
              <th>Property ID</th><th>House No.</th><th>Owner</th><th>Type</th><th>Area (sq ft)</th><th>Age (years)</th><th>Family</th><th>Latitude</th><th>Longitude</th><th>Ward</th><th>Water (L)</th><th>Electricity</th><th>Previous tax</th><th>Current tax</th><th>Payment delay (days)</th><th>Office distance (km)</th><th>Status</th>
            </tr></thead>
            <tbody>{propertyDataset.data?.rows.map((row) => <tr key={row.Property_ID}>
              <td>{row.Property_ID}</td><td>{row.House_No}</td><td>{row.Owner_Name}</td><td>{row.Property_Type}</td><td>{row.Property_Area_sqft.toLocaleString("en-IN")}</td><td>{row.Building_Age_Years}</td><td>{row.Family_Size}</td><td>{row.Latitude.toFixed(6)}</td><td>{row.Longitude.toFixed(6)}</td><td>{row.Ward}</td><td>{row.Water_Usage_Liters.toLocaleString("en-IN")}</td><td>{row.Electricity_Units.toLocaleString("en-IN")}</td><td>₹{row.Previous_Tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>₹{row.Current_Tax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>{row.Previous_Payment_Delay_Days}</td><td>{row.Distance_From_Municipal_Office_km.toFixed(2)}</td><td>{row.Payment_Status}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="admin-dataset-pagination"><span>Page {propertyDataset.data?.page ?? datasetPage} of {Math.max(1, Math.ceil((propertyDataset.data?.totalRows ?? 0) / (propertyDataset.data?.pageSize ?? 50)))} · {propertyDataset.data?.totalRows.toLocaleString("en-IN") ?? 0} records</span><div><button type="button" aria-label="Previous page" disabled={datasetPage <= 1 || propertyDataset.isFetching} onClick={() => setDatasetPage(page => Math.max(1, page - 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Next page" disabled={!propertyDataset.data || datasetPage * propertyDataset.data.pageSize >= propertyDataset.data.totalRows || propertyDataset.isFetching} onClick={() => setDatasetPage(page => page + 1)}><ChevronRight size={16} /></button></div></div>
      </>}
    </section>
  </main>;
}