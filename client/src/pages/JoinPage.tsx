/**
 * JoinPage — Accepts a team invite token from the URL.
 * Route: /join?token=xxx
 */
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function JoinPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const acceptInvite = trpc.team.acceptInvite.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => navigate("/app"), 2000);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message);
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Redirect to login, then come back
      window.location.href = getLoginUrl(`/join?token=${token}`);
      return;
    }
    if (!token) {
      setStatus("error");
      setErrorMsg("Invalid invite link");
      return;
    }
    if (status === "idle") {
      setStatus("loading");
      acceptInvite.mutate({ token });
    }
  }, [isAuthenticated, loading, token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center max-w-sm w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="9" fill="oklch(0.60 0.19 38)" />
            <path d="M8 20 C8 13 14 8 20 8 C26 8 32 13 32 20" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="8" y="20" width="24" height="3" rx="1.5" fill="white" opacity="0.6" />
          </svg>
          <span className="text-white font-bold text-lg">DrywallPro</span>
        </div>

        {(status === "idle" || status === "loading") && (
          <>
            <Loader2 size={36} className="animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-slate-300 text-sm">Accepting your invite…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle size={36} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-1">You're in!</h2>
            <p className="text-slate-400 text-sm">Redirecting to the app…</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={36} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-1">Invite Failed</h2>
            <p className="text-slate-400 text-sm mb-4">{errorMsg}</p>
            <a href="/" className="text-orange-400 hover:text-orange-300 text-sm underline">
              Return to home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
