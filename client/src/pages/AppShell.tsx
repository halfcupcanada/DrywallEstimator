/**
 * AppShell — auth-gated wrapper around the drawing tool.
 * Redirects to login if unauthenticated.
 * Shows upgrade prompt if subscription is inactive.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Lock } from "lucide-react";
import Home from "./Home";

function HalfCupLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="oklch(0.60 0.19 38)" />
      <path d="M8 20 C8 13 14 8 20 8 C26 8 32 13 32 20" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="8" y="20" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <HalfCupLogo size={40} />
        <Loader2 className="animate-spin text-orange-500" size={22} />
        <p className="text-sm text-gray-400">Loading DrywallPro…</p>
      </div>
    </div>
  );
}

function SubscribePrompt({ status }: { status?: string | null }) {
  const createCheckout = trpc.subscription.createCheckout.useMutation();
  const createPortal = trpc.subscription.createPortal.useMutation();

  const handleSubscribe = async () => {
    try {
      const result = await createCheckout.mutateAsync({
        plan: "starter",
        origin: window.location.origin,
      });
      // Use location.href instead of window.open to avoid mobile popup blockers
      if (result.url) window.location.href = result.url;
    } catch {
      // ignore
    }
  };

  const handleManageBilling = async () => {
    try {
      const result = await createPortal.mutateAsync({ origin: window.location.origin });
      if (result.url) window.location.href = result.url;
    } catch {
      // ignore
    }
  };

  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
          isPastDue ? "bg-red-50" : "bg-orange-50"
        }`}>
          <Lock className={isPastDue ? "text-red-500" : "text-orange-500"} size={26} />
        </div>
        {isPastDue ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment failed</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Your last payment didn’t go through. Update your billing details to restore access.
            </p>
            <Button
              onClick={handleManageBilling}
              disabled={createPortal.isPending}
              className="bg-red-600 hover:bg-red-700 text-white w-full h-11"
            >
              {createPortal.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <ArrowRight size={16} className="mr-2" />}
              Update Payment Method
            </Button>
          </>
        ) : isCanceled ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription ended</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Your subscription has been cancelled. Resubscribe to regain access.
            </p>
            <Button
              onClick={handleSubscribe}
              disabled={createCheckout.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full h-11"
            >
              {createCheckout.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <ArrowRight size={16} className="mr-2" />}
              Resubscribe
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscription required</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Start a 14-day free trial to access DrywallPro. No credit card required.
            </p>
            <Button
              onClick={handleSubscribe}
              disabled={createCheckout.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full h-11"
            >
              {createCheckout.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <ArrowRight size={16} className="mr-2" />}
              Start Free Trial
            </Button>
          </>
        )}
        <p className="text-xs text-gray-400 mt-4">
          <a href="/" className="text-orange-600 hover:underline">Back to home</a>
        </p>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: subscription, isLoading: subLoading } = trpc.subscription.mySubscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Check if user is a member of a company with an active Enterprise subscription
  const { data: teamData, isLoading: teamLoading } = trpc.team.myCompany.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: false }
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl("/app");
    }
  }, [loading, isAuthenticated]);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoadingScreen />;

  // Allow owner (admin) to bypass subscription check immediately — no need to wait for sub data
  const isOwner = user?.role === "admin";
  if (isOwner) return <Home />;

  // Still loading subscription/team data for non-admins
  if (subLoading || teamLoading) return <LoadingScreen />;

  const hasPersonalSub =
    subscription && (subscription.status === "active" || subscription.status === "trialing");
  // Allow accepted company members (company owner handles billing)
  const isCompanyMember = teamData !== null && teamData !== undefined;
  const hasActiveSubscription = hasPersonalSub || isCompanyMember;

  if (!hasActiveSubscription) return <SubscribePrompt status={subscription?.status} />;

  return <Home />;
}
