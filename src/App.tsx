import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import PublicHome from "./pages/PublicHome";
import Register from "./pages/Register";
import { About, Contact } from "./pages/InfoPages";
import { BillDetails, CitizenDashboard, MyBills, MyProperty, Payment, PaymentHistory, PaymentReceipt, PaymentSuccess, Profile, PropertyMap } from "./pages/CitizenPages";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={PublicHome} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/about"} component={About} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/dashboard"} component={Home} />
      <Route path={"/dashboard/legacy"} component={CitizenDashboard} />
      <Route path={"/my-property"} component={MyProperty} />
      <Route path={"/property-map"} component={PropertyMap} />
      <Route path={"/my-bills"} component={MyBills} />
      <Route path={"/bill/:id"}>{(params) => <BillDetails id={params.id} />}</Route>
      <Route path={"/payment/:id"}>{(params) => <Payment id={params.id} />}</Route>
      <Route path={"/payment-success"} component={PaymentSuccess} />
      <Route path={"/receipt/:reference"}>{(params) => <PaymentReceipt reference={params.reference} />}</Route>
      <Route path={"/payment-history"} component={PaymentHistory} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/login"} component={Login} />
      <Route path={"/admin/dashboard"} component={Admin} />
      <Route path={"/admin/users"} component={Admin} />
      <Route path={"/admin/properties"} component={Admin} />
      <Route path={"/admin/bills"} component={Admin} />
      <Route path={"/admin/reports"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
