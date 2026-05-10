import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import AppShell from "./pages/AppShell";
import AdminDashboard from "./pages/AdminDashboard";
import TeamPage from "./pages/TeamPage";
import JoinPage from "./pages/JoinPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

function Router() {
  return (
    <Switch>
      {/* Public landing page */}
      <Route path={"/"} component={Landing} />
      {/* Email/password auth */}
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />
      {/* Auth-gated drawing app */}
      <Route path={"/app"} component={AppShell} />
      {/* Admin-only dashboard */}
      <Route path={"/admin"} component={AdminDashboard} />
      {/* Team management */}
      <Route path={"/team"} component={TeamPage} />
      {/* Invite accept */}
      <Route path={"/join"} component={JoinPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
