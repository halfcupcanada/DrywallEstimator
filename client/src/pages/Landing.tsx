import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Layers,
  Ruler,
  FileText,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Users,
  BarChart3,
} from "lucide-react";
import { PLANS } from "../../../server/products";

// ── HalfCup logo mark ──────────────────────────────────────────────────────
function HalfCupLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="oklch(0.60 0.19 38)" />
      <path d="M8 20 C8 13 14 8 20 8 C26 8 32 13 32 20" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="8" y="20" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────
function Nav() {
  const { user, isAuthenticated } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <HalfCupLogo size={34} />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-gray-900 text-base tracking-tight">DrywallPro</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">by HalfCup</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">Pricing</a>
          {isAuthenticated ? (
            <Link href="/app">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                Open App <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl("/app")}>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                Sign In
              </Button>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="max-w-4xl mx-auto text-center">
        <Badge className="mb-5 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Built for Canadian drywall companies
        </Badge>
        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
          Estimate drywall<br />
          <span className="text-orange-600">in minutes,</span> not hours
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Draw your floor plan, close the room, and get an instant material list — sheets, screws, tape, and mud — with one click. No spreadsheets required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href={getLoginUrl("/app")}>
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white text-base px-8 h-12 w-full sm:w-auto">
              Start Free Trial <ArrowRight size={16} className="ml-2" />
            </Button>
          </a>
          <a href="#pricing">
            <Button size="lg" variant="outline" className="text-base px-8 h-12 w-full sm:w-auto border-gray-300">
              See Pricing
            </Button>
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">No credit card required · 14-day free trial</p>
      </div>
    </section>
  );
}

// ── Features ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Layers className="text-orange-500" size={22} />,
    title: "Interactive floor plan canvas",
    desc: "Draw walls with click-drag precision. Snap to endpoints, lock orthogonal angles, and upload a blueprint as an underlay.",
  },
  {
    icon: <Ruler className="text-orange-500" size={22} />,
    title: "Automatic room detection",
    desc: "Close a loop of walls and instantly see perimeter, floor area, wall area, and a full material breakdown.",
  },
  {
    icon: <FileText className="text-orange-500" size={22} />,
    title: "Door & window deductions",
    desc: "Place openings on any wall. Sheet counts automatically subtract door and window areas.",
  },
  {
    icon: <Zap className="text-orange-500" size={22} />,
    title: "Real-time estimate",
    desc: "Choose 4×8, 4×10, or 4×12 sheets. Adjust waste factor. See screws, tape rolls, and mud buckets update instantly.",
  },
  {
    icon: <Shield className="text-orange-500" size={22} />,
    title: "Scale calibration",
    desc: "Click two known points on your blueprint and enter the real distance to calibrate pixel-to-foot scale.",
  },
  {
    icon: <BarChart3 className="text-orange-500" size={22} />,
    title: "Multi-room totals",
    desc: "Draw multiple rooms and see a grand total across all rooms in the Estimate panel.",
  },
];

function Features() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Everything you need to bid faster</h2>
          <p className="text-gray-500 text-lg">Purpose-built for drywall estimators, not generic construction software.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all bg-white">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ────────────────────────────────────────────────────────────────
function PricingCard({ plan, onSubscribe }: { plan: typeof PLANS[0]; onSubscribe: (slug: string) => void }) {
  return (
    <div className={`relative rounded-2xl p-8 flex flex-col border transition-all ${
      plan.highlighted
        ? "border-orange-400 shadow-xl shadow-orange-100 bg-white scale-[1.02]"
        : "border-gray-200 bg-white hover:border-orange-200 hover:shadow-md"
    }`}>
      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-orange-600 text-white border-0 px-3 py-1 text-xs font-semibold">Most Popular</Badge>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
        <p className="text-sm text-gray-500">{plan.tagline}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-black text-gray-900">${plan.priceMonthlyCAD}</span>
        <span className="text-gray-400 text-sm ml-1">CAD/mo</span>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
            <CheckCircle2 size={15} className="text-orange-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button
        onClick={() => onSubscribe(plan.slug)}
        className={plan.highlighted
          ? "bg-orange-600 hover:bg-orange-700 text-white w-full"
          : "w-full border-gray-300"
        }
        variant={plan.highlighted ? "default" : "outline"}
      >
        Get started
      </Button>
    </div>
  );
}

function Pricing() {
  const { isAuthenticated } = useAuth();
  const createCheckout = trpc.subscription.createCheckout.useMutation();

  const handleSubscribe = async (slug: string) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/app");
      return;
    }
    toast.loading("Redirecting to checkout…");
    try {
      const result = await createCheckout.mutateAsync({
        plan: slug as "starter" | "pro" | "enterprise",
        origin: window.location.origin,
      });
      if (result.url) window.open(result.url, "_blank");
    } catch {
      toast.error("Could not create checkout session. Please try again.");
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
          <p className="text-gray-500 text-lg">All plans include a 14-day free trial. No credit card required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <PricingCard key={plan.slug} plan={plan} onSubscribe={handleSubscribe} />
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">
          All prices in Canadian dollars. Cancel anytime. HST/GST may apply.
        </p>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 px-4 bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <HalfCupLogo size={28} />
          <span className="text-white font-semibold text-sm">DrywallPro</span>
          <span className="text-gray-600 text-xs">by HalfCup</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <a href="https://halfcup.ca" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">halfcup.ca</a>
          <a href="mailto:hello@halfcup.ca" className="hover:text-white transition-colors">hello@halfcup.ca</a>
        </div>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} HalfCup. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}
