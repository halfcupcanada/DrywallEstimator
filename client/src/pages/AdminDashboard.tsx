/**
 * Admin Dashboard — owner-only view of users, subscriptions, and revenue.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Users, DollarSign, TrendingUp, ArrowLeft, Building2, Mail, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    trialing: "bg-blue-100 text-blue-700 border-blue-200",
    past_due: "bg-yellow-100 text-yellow-700 border-yellow-200",
    canceled: "bg-gray-100 text-gray-500 border-gray-200",
    incomplete: "bg-red-100 text-red-600 border-red-200",
  };
  return (
    <Badge className={`text-xs font-medium ${map[status] ?? map.incomplete}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    starter: "bg-gray-100 text-gray-600",
    pro: "bg-orange-100 text-orange-700",
    enterprise: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[plan] ?? map.starter}`}>
      {plan}
    </span>
  );
}

export default function AdminDashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  const users = data?.users ?? [];
  const subs = data?.subscriptions ?? [];

  const activeCount = subs.filter((s) => s.status === "active" || s.status === "trialing").length;
  const mrr = subs
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((acc, s) => {
      const prices: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
      return acc + (prices[s.plan] ?? 0);
    }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
              <ArrowLeft size={16} className="mr-1" /> App
            </Button>
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
          <span className="text-gray-300">|</span>
          <Link href="/team">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
              <Building2 size={16} className="mr-1" /> Teams
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
          <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Users size={20} className="text-orange-500" />}
            label="Total Users"
            value={users.length.toString()}
          />
          <StatCard
            icon={<TrendingUp size={20} className="text-green-500" />}
            label="Active Subscriptions"
            value={activeCount.toString()}
          />
          <StatCard
            icon={<DollarSign size={20} className="text-blue-500" />}
            label="Est. MRR"
            value={`$${mrr} CAD`}
          />
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Users & Subscriptions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Renews</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const sub = subs.find((s) => s.userId === u.id);
                  return (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-xs shrink-0">
                            {u.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.name ?? "—"}</p>
                            {u.role === "admin" && (
                              <span className="text-[10px] text-orange-600 font-semibold">ADMIN</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 hidden sm:table-cell">{u.email ?? "—"}</td>
                      <td className="px-6 py-4">
                        {sub ? <PlanBadge plan={sub.plan} /> : <span className="text-gray-400 text-xs">None</span>}
                      </td>
                      <td className="px-6 py-4">
                        {sub ? <StatusBadge status={sub.status} /> : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                        {sub?.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-500 hidden lg:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Settings / Resend Domain Guide */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail className="text-blue-500" size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Email Delivery Setup</h3>
              <p className="text-xs text-gray-500">Verify halfcup.ca in Resend to send invite emails from your own domain</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-semibold text-amber-800">Domain not yet verified</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Team invite emails currently send from Resend's shared domain. Add these DNS records to send from <strong>noreply@halfcup.ca</strong>.
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Step 1 — Add halfcup.ca in Resend</p>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>Go to <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">resend.com/domains</a></li>
                <li>Click <strong>Add Domain</strong> and enter <code className="bg-gray-100 px-1 rounded text-xs">halfcup.ca</code></li>
                <li>Copy the 3 DNS records Resend provides (SPF, DKIM, DMARC)</li>
              </ol>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Step 2 — Add DNS records at your registrar</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Type</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-3 py-2 font-mono text-blue-600">TXT</td>
                      <td className="px-3 py-2 font-mono">@</td>
                      <td className="px-3 py-2 text-gray-500">v=spf1 include:amazonses.com ~all <span className="text-gray-400">(exact value from Resend)</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-blue-600">TXT</td>
                      <td className="px-3 py-2 font-mono">resend._domainkey</td>
                      <td className="px-3 py-2 text-gray-500">DKIM public key <span className="text-gray-400">(exact value from Resend)</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-blue-600">TXT</td>
                      <td className="px-3 py-2 font-mono">_dmarc</td>
                      <td className="px-3 py-2 text-gray-500">v=DMARC1; p=none; <span className="text-gray-400">(exact value from Resend)</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Step 3 — Update EMAIL_FROM secret</p>
              <p className="text-sm text-gray-600">
                Once verified, go to <strong>Settings → Secrets</strong> in the Manus Management UI and update:
              </p>
              <code className="block mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg font-mono">
                EMAIL_FROM = noreply@halfcup.ca
              </code>
            </div>

            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
              Open Resend Domains
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
