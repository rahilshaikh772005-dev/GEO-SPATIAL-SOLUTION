import { useAuth } from "@/_core/hooks/useAuth";
import "@/civic-workflows.css";
import { trpc } from "@/lib/trpc";
import { isDemoMode } from "@/lib/runtime";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Download, FileText, MapPinned, Receipt, Search, UserRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

type RazorpayCheckoutResponse = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
	key: string;
	amount: number;
	currency: string;
	name: string;
	description: string;
	order_id: string;
	prefill: { name?: string; email?: string };
	notes: { reference: string };
	theme: { color: string };
	handler: (response: RazorpayCheckoutResponse) => void;
};

declare global {
	interface Window {
		Razorpay?: new (options: RazorpayCheckoutOptions) => {
			open: () => void;
			on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
		};
	}
}

function loadRazorpayCheckout(): Promise<void> {
	if (window.Razorpay) return Promise.resolve();
	const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
	return new Promise((resolve, reject) => {
		const script = existingScript ?? document.createElement("script");
		script.onload = () => window.Razorpay ? resolve() : reject(new Error("Payment checkout did not load"));
		script.onerror = () => reject(new Error("Could not load secure payment checkout"));
		if (!existingScript) {
			script.src = "https://checkout.razorpay.com/v1/checkout.js";
			script.async = true;
			document.body.appendChild(script);
		}
	});
}

const DEMO_PROPERTY = { id: 1, propertyNo: "P-1024", houseNo: "12-4-88", ownerName: "Demo Administrator", address: "Powai Lakeview, Mumbai", latitude: 19.1176, longitude: 72.906 };
const DEMO_BILLS = [
	{ id: 1, propertyId: 1, billType: "property_tax" as const, amount: 4500, dueDate: new Date("2026-09-30"), status: "unpaid" as const },
	{ id: 2, propertyId: 1, billType: "water" as const, amount: 1200, dueDate: new Date("2026-09-15"), status: "paid" as const },
	{ id: 3, propertyId: 1, billType: "electricity" as const, amount: 2500, dueDate: new Date("2026-09-20"), status: "unpaid" as const },
];

function CitizenFrame({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) { const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID); const { user } = useAuth({ redirectOnUnauthenticated: authConfigured, redirectPath: "/login" }); return <main className="citizen-page"><header className="citizen-header"><Link href="/dashboard" className="public-brand"><span><MapPinned size={16} /></span>Civic<span>Atlas</span></Link><nav><Link href="/dashboard">Dashboard</Link><Link href="/my-property">Property</Link><Link href="/my-bills">Bills</Link><Link href="/payment-history">Payments</Link><Link href="/profile"><UserRound size={15} /> {user?.name?.split(" ")[0] || "Profile"}</Link></nav></header><div className="citizen-content"><Link href="/dashboard" className="info-back"><ArrowLeft size={14} /> Citizen workspace</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</div></main>; }

export function CitizenDashboard() { return <CitizenFrame eyebrow="Overview" title="Your civic workspace"><div className="citizen-actions"><Link href="/my-property" className="info-cta">View property <ArrowRight size={15} /></Link><Link href="/my-bills" className="info-cta secondary">View bills <ArrowRight size={15} /></Link></div><DashboardData /></CitizenFrame>; }

function DashboardData() { const query = trpc.citizen.dashboard.useQuery(undefined, { retry: false }); const bills = query.data?.bills ?? (isDemoMode ? DEMO_BILLS : []); const payments = query.data?.payments ?? []; const total = bills.filter((bill) => bill.status !== "paid").reduce((sum, bill) => sum + bill.amount, 0); return <><section className="citizen-stat-grid"><div><LandmarkIcon /><span>Property tax</span><strong>₹{(bills.find((bill) => bill.billType === "property_tax")?.amount ?? 0).toLocaleString("en-IN")}</strong><small>Unpaid / current record</small></div><div><WalletCards /><span>Water bill</span><strong>₹{(bills.find((bill) => bill.billType === "water")?.amount ?? 0).toLocaleString("en-IN")}</strong><small>Monthly service</small></div><div><Receipt /><span>Electricity</span><strong>₹{(bills.find((bill) => bill.billType === "electricity")?.amount ?? 0).toLocaleString("en-IN")}</strong><small>Utility record</small></div><div className="stat-highlight"><span>Total outstanding</span><strong>₹{total.toLocaleString("en-IN")}</strong><small>{bills.filter((bill) => bill.status !== "paid").length} unpaid records</small></div></section><section className="citizen-section"><div className="section-title"><div><p className="eyebrow">Recent payments</p><h2>Keep every transaction visible.</h2></div><Link href="/payment-history">View history <ArrowRight size={14} /></Link></div>{payments.map((payment) => <div className="payment-row" key={payment.id}><span><Check size={15} /></span><strong>{payment.reference}</strong><small>₹{payment.amount.toLocaleString("en-IN")}</small><time>{payment.status === "success" && payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : `Initiated ${new Date(payment.createdAt).toLocaleDateString()}`}</time></div>)}{payments.length === 0 && <div className="empty-state">Payment records will appear here when the server reports them.</div>}</section></>; }

function LandmarkIcon() { return <MapPinned size={19} />; }

export function MyProperty() { const { user } = useAuth(); const query = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false }); const property = query.data?.properties[0] ?? (isDemoMode && !user ? DEMO_PROPERTY : undefined); return <CitizenFrame eyebrow="My property" title="Property information">{query.isLoading ? <div className="empty-state">Loading your property records…</div> : query.error ? <div className="empty-state" role="alert">Could not load property records: {query.error.message}</div> : property ? <section className="detail-card"><div className="detail-card-top"><span className="detail-icon"><MapPinned size={20} /></span><div><p className="eyebrow">{user ? "Linked property" : "Sample property · demo"}</p><h2>{property.propertyNo}</h2></div></div><dl><dt>House number</dt><dd>{property.houseNo}</dd><dt>Owner</dt><dd>{property.ownerName}</dd><dt>Address</dt><dd>{property.address}</dd><dt>Coordinates</dt><dd>{property.latitude}, {property.longitude}</dd></dl><Link href="/property-map" className="info-cta">Open property map <MapPinned size={15} /></Link></section> : <div className="empty-state">No property is linked to this account. Submit a claim for an existing property from your dashboard.</div>}</CitizenFrame>; }

export function PropertyMap() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const searchTerm = new URLSearchParams(location.split("?")[1] ?? "").get("q")?.trim() ?? "";
  const [searchValue, setSearchValue] = useState(searchTerm);
  const dashboard = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const search = trpc.citizen.search.useQuery({ query: searchTerm }, { enabled: Boolean(user && searchTerm), retry: false });
  const property = searchTerm
    ? search.data?.[0]
    : dashboard.data?.properties[0] ?? (isDemoMode && !user ? DEMO_PROPERTY : undefined);
  const hasCoordinates = property
    && Number.isFinite(property.latitude)
    && Number.isFinite(property.longitude)
    && property.latitude >= -90
    && property.latitude <= 90
    && property.longitude >= -180
    && property.longitude <= 180;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.03}%2C${property.latitude - 0.035}%2C${property.longitude + 0.03}%2C${property.latitude + 0.035}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`
    : undefined;

  useEffect(() => setSearchValue(searchTerm), [searchTerm]);

  return <CitizenFrame eyebrow="Geo-spatial search" title="Property map">
    <form className="map-search" onSubmit={(event) => {
      event.preventDefault();
      const value = searchValue.trim();
      setLocation(value ? `/property-map?q=${encodeURIComponent(value)}` : "/property-map");
    }}>
      <Search size={16} /><input name="query" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="House no., property no., or owner name" /><button className="info-cta" type="submit">Search</button>
    </form>
    {search.isLoading || dashboard.isLoading ? <div className="empty-state">Loading property location…</div>
      : search.error || dashboard.error ? <div className="empty-state" role="alert">Could not load property records: {search.error?.message ?? dashboard.error?.message}</div>
      : searchTerm && !property ? <div className="empty-state">No matching property was found in your linked records.</div>
      : property && mapUrl ? <div className="large-map"><iframe title={`OpenStreetMap location for ${property.propertyNo}`} src={mapUrl} /><div className="map-result"><MapPinned size={17} /><strong>{property.propertyNo}</strong><span>{property.ownerName} · {property.address}</span></div></div>
      : <div className="empty-state">No property with valid coordinates is linked to this account.</div>}
  </CitizenFrame>;
}

export function MyBills() { const { user } = useAuth(); const query = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false }); const bills = query.data?.bills ?? (isDemoMode && !user ? DEMO_BILLS : []); const [filter, setFilter] = useState<"all" | "property_tax" | "water" | "electricity">("all"); const filteredBills = bills.filter((bill) => filter === "all" || bill.billType === filter); const filters = [{ value: "all" as const, label: "All records" }, { value: "property_tax" as const, label: "Property tax" }, { value: "water" as const, label: "Water" }, { value: "electricity" as const, label: "Electricity" }]; return <CitizenFrame eyebrow="Bills and payments" title="Your bills">{query.error && <div className="empty-state" role="alert">Could not load bills: {query.error.message}</div>}<div className="bill-filter-row">{filters.map((item) => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div><section className="citizen-table">{filteredBills.map((bill) => <Link href={`/bill/${bill.id}`} className="bill-table-row" key={bill.id}><FileText size={17} /><strong>{bill.billType.replace("_", " ")}</strong><span>₹{bill.amount.toLocaleString("en-IN")}</span><span>{new Date(bill.dueDate).toLocaleDateString()}</span><b className={`bill-status ${bill.status}`}>{bill.status}</b><ArrowRight size={15} /></Link>)}{query.isLoading && <div className="empty-state">Loading bills…</div>}{!query.isLoading && !query.error && filteredBills.length === 0 && <div className="empty-state">{bills.length ? "No bills match this filter." : "No bills found for this account."}</div>}</section></CitizenFrame>; }

export function BillDetails({ id }: { id: string }) { const { user } = useAuth(); const query = trpc.citizen.dashboard.useQuery(undefined, { enabled: Boolean(user), retry: false }); const bill = query.data?.bills.find((item) => item.id === Number(id)) ?? (isDemoMode && !user ? DEMO_BILLS.find((item) => item.id === Number(id)) : undefined); return <CitizenFrame eyebrow="Bill details" title={bill ? bill.billType.replace("_", " ") : "Bill record"}>{query.error ? <div className="empty-state" role="alert">Could not load bill: {query.error.message}</div> : query.isLoading ? <div className="empty-state">Loading bill details…</div> : bill ? <section className="detail-card"><p className="eyebrow">Bill ID</p><h2>{bill.id}</h2><dl><dt>Amount</dt><dd>₹{bill.amount.toLocaleString("en-IN")}</dd><dt>Due date</dt><dd>{new Date(bill.dueDate).toLocaleDateString()}</dd><dt>Status</dt><dd className={`bill-status ${bill.status}`}>{bill.status}</dd></dl>{bill.status !== "paid" && <Link href={`/payment/${id}`} className="info-cta"><WalletCards size={15} /> Review payment</Link>}</section> : <div className="empty-state">Bill record not found.</div>}</CitizenFrame>; }

export function PaymentHistory() { const query = trpc.citizen.dashboard.useQuery(undefined, { retry: false }); const payments = query.data?.payments ?? []; return <CitizenFrame eyebrow="Payments" title="Payment history">{query.error ? <div className="empty-state" role="alert">Could not load payment history: {query.error.message}</div> : query.isLoading ? <div className="empty-state">Loading payment history…</div> : <section className="citizen-table">{payments.map((payment) => <div className="bill-table-row" key={payment.id}><Check size={17} /><strong>{payment.reference}</strong><span>₹{payment.amount.toLocaleString("en-IN")}</span><span>{new Date(payment.paidAt ?? payment.createdAt).toLocaleDateString()}</span><b className={`bill-status ${payment.status === "success" ? "paid" : payment.status}`}>{payment.status}</b>{payment.status === "success" && <Link href={`/receipt/${encodeURIComponent(payment.reference)}`} aria-label={`View receipt ${payment.reference}`}><Receipt size={15} /></Link>}<Link href={`/bill/${payment.billId}`} aria-label={`View bill ${payment.billId}`}><ArrowRight size={15} /></Link></div>)}{payments.length === 0 && <div className="empty-state">No payment history yet.</div>}</section>}</CitizenFrame>; }

export function Payment({ id }: { id: string }) {
	const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
	const { user } = useAuth();
	const query = trpc.citizen.dashboard.useQuery(undefined, { retry: false, enabled: Boolean(user) });
	const bill = query.data?.bills.find((item) => item.id === Number(id)) ?? (isDemoMode && !user ? DEMO_BILLS.find((item) => item.id === Number(id)) : undefined);
	const pay = trpc.citizen.initiatePayment.useMutation();
	const verify = trpc.citizen.verifyPayment.useMutation();
	const [, setLocation] = useLocation();
	const [paymentError, setPaymentError] = useState("");
	const completePayment = async () => {
		if (!authConfigured || !bill) return;
		setPaymentError("");
		try {
			const order = await pay.mutateAsync({ billId: Number(id) });
			await loadRazorpayCheckout();
			if (!window.Razorpay) throw new Error("Secure payment checkout is unavailable");
			const checkout = new window.Razorpay({
				key: order.keyId,
				amount: order.amount,
				currency: order.currency,
				name: "Civic Atlas",
				description: `Bill #${bill.id}`,
				order_id: order.orderId,
				prefill: { name: user?.name ?? undefined, email: user?.email ?? undefined },
				notes: { reference: order.reference },
				theme: { color: "#176f67" },
				handler: async (response) => {
					try {
						await verify.mutateAsync({
							reference: order.reference,
							orderId: response.razorpay_order_id,
							paymentId: response.razorpay_payment_id,
							signature: response.razorpay_signature,
						});
						await query.refetch();
						setLocation(`/payment-success?reference=${encodeURIComponent(order.reference)}`);
					} catch (error) {
						setPaymentError(error instanceof Error ? error.message : "Payment confirmation could not be verified. Check payment history before retrying.");
					}
				},
			});
			checkout.on("payment.failed", (response) => {
				setPaymentError(response.error?.description ?? "Payment did not complete. You can retry securely.");
			});
			checkout.open();
		} catch (error) {
			setPaymentError(error instanceof Error ? error.message : "Could not start secure checkout");
		}
	};
	return <CitizenFrame eyebrow="Secure payment" title="Review payment"><section className="detail-card payment-card">{query.error ? <p role="alert">Could not load bill details: {query.error.message}</p> : query.isLoading ? <p>Loading bill details…</p> : bill ? <><p>Payment summary · Bill #{bill.id}</p><strong>₹{bill.amount.toLocaleString("en-IN")}</strong><span>{bill.status === "paid" ? "This bill is already paid." : "Continue to Razorpay secure checkout. The bill will be marked paid only after the payment is verified with the provider."}</span>{(pay.error || paymentError) && <p role="alert">{paymentError || pay.error?.message}</p>}{bill.status !== "paid" && <button className="info-cta" onClick={completePayment} disabled={!authConfigured || !user || pay.isPending}>{pay.isPending ? "Preparing secure checkout…" : !authConfigured ? "Payments unavailable" : "Continue to secure checkout"} <ArrowRight size={15} /></button>}</> : <p role="alert">Bill record not found or is not accessible by this account.</p>}</section></CitizenFrame>;
}

export function PaymentSuccess() {
	const [location] = useLocation();
	const reference = new URLSearchParams(location.split("?")[1] ?? "").get("reference") ?? "";
	const receipt = trpc.citizen.receipt.useQuery({ reference }, { enabled: Boolean(reference), retry: false });
	const receiptData = receipt.data;
	return <CitizenFrame eyebrow="Payment status" title="Payment status"><section className="detail-card success-card">
		{!reference ? <p role="alert">Payment reference is missing. Check payment history for the latest status.</p> : receipt.isLoading ? <p>Confirming your receipt…</p> : receipt.error || !receiptData ? <><h2>Payment confirmation is still pending.</h2><p>The bill will not be marked paid until the provider confirms settlement. Check payment history before retrying.</p><Link href="/payment-history" className="info-cta"><Receipt size={15} /> View payment history</Link></> : <><Check size={29} /><h2>Payment verified.</h2><p>Reference: {receiptData.reference}</p><Link href={`/receipt/${encodeURIComponent(receiptData.reference)}`} className="info-cta"><Download size={15} /> View receipt</Link></>}
	</section></CitizenFrame>;
}

export function PaymentReceipt({ reference }: { reference: string }) {
	const query = trpc.citizen.receipt.useQuery({ reference }, { retry: false });
	const receipt = query.data;
	return <CitizenFrame eyebrow="Payment record" title="Payment receipt">{query.isLoading ? <div className="empty-state">Loading confirmed receipt…</div> : query.error ? <div className="empty-state" role="alert">Could not load receipt: {query.error.message}</div> : receipt ? <section className="detail-card receipt-card">
		<div className="receipt-heading"><span className="detail-icon"><Receipt size={20} /></span><div><p className="eyebrow">Civic Atlas · confirmed payment</p><h2>Official receipt</h2></div></div>
		<dl><dt>Payment reference</dt><dd>{receipt.reference}</dd><dt>Provider payment ID</dt><dd>{receipt.providerPaymentId}</dd><dt>Citizen</dt><dd>{receipt.citizenName ?? receipt.citizenEmail ?? "Account holder"}</dd><dt>Property</dt><dd>{receipt.propertyNo} · {receipt.houseNo}</dd><dt>Address</dt><dd>{receipt.address}</dd><dt>Bill type</dt><dd>{receipt.billType.replace("_", " ")}</dd><dt>Amount paid</dt><dd>₹{receipt.amount.toLocaleString("en-IN")}</dd><dt>Paid at</dt><dd>{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : "Confirmed"}</dd><dt>Status</dt><dd>{receipt.paymentStatus}</dd></dl>
		<div className="receipt-actions"><button className="info-cta" type="button" onClick={() => window.print()}><Download size={15} /> Print / Save as PDF</button><Link href="/payment-history">Payment history <ArrowRight size={15} /></Link></div>
	</section> : <div className="empty-state">Receipt not found.</div>}</CitizenFrame>;
}

export function Profile() { const { user } = useAuth({ redirectOnUnauthenticated: !isDemoMode, redirectPath: "/login" }); return <CitizenFrame eyebrow="Account" title="Profile"><form className="profile-form" onSubmit={(event) => event.preventDefault()}><label>Name<input defaultValue={user?.name ?? (isDemoMode ? "Demo Administrator" : "")} /></label><label>Email<input defaultValue={user?.email ?? (isDemoMode ? "citizen@example.com" : "")} type="email" /></label><label>Address<textarea placeholder="Your address" /></label><button className="info-cta" type="submit">Update profile <Check size={15} /></button></form></CitizenFrame>; }
