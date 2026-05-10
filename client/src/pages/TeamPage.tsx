/**
 * TeamPage — Manage company, invite team members, accept invites.
 * Accessible from the app header for Enterprise subscribers.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  Building2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const utils = trpc.useUtils();

  const { data: teamData, isLoading } = trpc.team.myCompany.useQuery(undefined, { retry: false });

  const createCompany = trpc.team.createCompany.useMutation({
    onSuccess: () => {
      utils.team.myCompany.invalidate();
      setShowCreateForm(false);
      toast.success("Company created!");
    },
    onError: (err) => toast.error(err.message),
  });

  const inviteMember = trpc.team.inviteMember.useMutation({
    onSuccess: (data) => {
      utils.team.myCompany.invalidate();
      setInviteEmail("");
      toast.success("Invite sent!");
      // Copy invite link to clipboard
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      setCopiedToken(data.inviteUrl);
      setTimeout(() => setCopiedToken(null), 3000);
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMember = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      utils.team.myCompany.invalidate();
      toast.success("Member removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMember.mutate({ email: inviteEmail.trim(), origin: window.location.origin });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <Link href="/app">
          <button className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm">
            <ArrowLeft size={14} /> Back to App
          </button>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <span className="text-sm text-slate-300">{user?.name ?? user?.email}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Users size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Team Management</h1>
            <p className="text-sm text-slate-400">Invite estimators to your company workspace</p>
          </div>
        </div>

        {/* No company yet */}
        {!teamData && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
            <Building2 size={36} className="text-slate-600 mx-auto mb-3" />
            <h2 className="font-semibold text-lg mb-1">No Company Yet</h2>
            <p className="text-slate-400 text-sm mb-6">
              Create a company workspace to invite your team. Available on the Enterprise plan.
            </p>
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
              >
                Create Company
              </button>
            ) : (
              <div className="text-left max-w-sm mx-auto">
                <label className="text-xs text-slate-400 font-medium block mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Smith Drywall Inc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createCompany.mutate({ name: companyName.trim(), seats: 5 })}
                    disabled={!companyName.trim() || createCompany.isPending}
                    className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {createCompany.isPending ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Company found */}
        {teamData && (
          <>
            {/* Company card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 mb-6">
              <div className="flex items-center gap-3 mb-1">
                <Building2 size={18} className="text-orange-400" />
                <h2 className="font-bold text-lg">{teamData.company.name}</h2>
                {teamData.isOwner && (
                  <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                    <Crown size={10} /> Owner
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {teamData.isOwner
                  ? `${teamData.members.filter((m) => m.status === "accepted").length} / ${teamData.company.seats} seats used`
                  : "You are a member of this workspace"}
              </p>
            </div>

            {/* Invite form (owner only) */}
            {teamData.isOwner && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 mb-6">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Mail size={14} className="text-orange-400" /> Invite a Team Member
                </h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviteMember.isPending}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {inviteMember.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Invite
                  </button>
                </div>
                {copiedToken && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                    <Check size={12} /> Invite link copied to clipboard
                  </div>
                )}
              </div>
            )}

            {/* Members list (owner only) */}
            {teamData.isOwner && teamData.members.length > 0 && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold">Members</span>
                </div>
                <ul className="divide-y divide-slate-800">
                  {teamData.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {(m.name ?? m.inviteEmail ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name ?? m.inviteEmail}</p>
                        {m.name && m.inviteEmail && (
                          <p className="text-xs text-slate-500 truncate">{m.inviteEmail}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          m.status === "accepted"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {m.status === "accepted" ? "Active" : "Pending"}
                      </span>
                      {m.role !== "owner" && (
                        <button
                          onClick={() => {
                            if (confirm("Remove this member?")) {
                              removeMember.mutate({ memberId: m.id });
                            }
                          }}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
