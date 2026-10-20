import { startLogin } from "@/const";
import { isDemoMode } from "@/lib/runtime";
import { ArrowRight, MapPinned, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function Register() {
  const authConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);
  const canContinue = authConfigured || isDemoMode;

  return <main className="auth-page"><div className="auth-shell"><Link href="/" className="public-brand"><span><MapPinned size={18} /></span>Civic<span>Atlas</span></Link><div className="auth-card"><div className="auth-heading"><p className="eyebrow">Citizen registration</p><h1>Create your account.</h1><p>Civic Atlas uses its secure identity provider for sign-in and account creation.</p></div><div className="auth-success"><ShieldCheck size={22} /><h2>{authConfigured ? "Continue with secure sign in" : isDemoMode ? "Local demo access" : "Registration unavailable"}</h2><p>{authConfigured ? "Your account will be created after your identity provider verifies you." : isDemoMode ? "Demo access is enabled for this development build. No account or property changes are stored." : "Account registration is unavailable because secure sign-in is not configured."}</p>{canContinue && <button className="auth-submit" onClick={() => authConfigured ? startLogin() : window.location.assign("/dashboard")}>{authConfigured ? "Continue" : "Open demo"} <ArrowRight size={16} /></button>}</div><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div></div></main>;
}