"use client";
import { useState, useEffect } from "react";
import { Check, X, Loader2, AlertCircle, Clock } from "lucide-react";
import { schoolDisplayName } from "@/lib/schoolData";
import { ROLE_OPTIONS } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

interface SignupRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  school: string;
  wallet_address: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SignupRequestsSection() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveModal, setApproveModal] = useState<SignupRequest | null>(null);
  const [approveRole, setApproveRole] = useState<string>("member");
  const [approving, setApproving] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SignupRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/signup-requests");
      const data = await res.json() as { requests: SignupRequest[] };
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const pending = requests.filter((r) => r.status === "pending");

  async function handleApprove() {
    if (!approveModal) return;
    setApproving(true);
    setError(null);
    try {
      const addRes = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: [{
            name: approveModal.name,
            email: approveModal.email,
            walletAddress: approveModal.wallet_address ?? "",
            school: approveModal.school,
            votingUnits: 10,
            role: approveRole,
          }],
        }),
      });
      const addData = await addRes.json() as { added: number; errors: string[]; error?: string };
      if (!addRes.ok) throw new Error(addData.error ?? "Failed to add member");
      if (addData.errors?.length) throw new Error(addData.errors[0]);

      await fetch("/api/signup-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: approveModal.id, action: "approve" }),
      });

      setRequests((prev) => prev.map((r) => r.id === approveModal.id ? { ...r, status: "approved" as const } : r));
      setApproveModal(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    setError(null);
    try {
      await fetch("/api/signup-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectTarget.id, action: "reject" }),
      });
      setRequests((prev) => prev.map((r) => r.id === rejectTarget.id ? { ...r, status: "rejected" as const } : r));
      setRejectTarget(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Signup Requests</h2>
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
              <Clock className="w-3 h-3" />
              {pending.length} Pending
            </span>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400 dark:text-gray-600 text-sm">No signup requests yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((r) => (
              <div key={r.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{r.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{schoolDisplayName(r.school)}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-medium",
                      r.status === "pending"  ? "bg-yellow-400/15 text-yellow-600 dark:text-yellow-400" :
                      r.status === "approved" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                                                "bg-red-500/15 text-red-500"
                    )}>
                      {r.status}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.email}</p>
                  {r.message && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic line-clamp-2">&ldquo;{r.message}&rdquo;</p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setApproveModal(r); setApproveRole("member"); setError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => { setRejectTarget(r); setError(null); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApproveModal(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Approve Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Adding <strong className="text-gray-900 dark:text-white">{approveModal.name}</strong> ({schoolDisplayName(approveModal.school)})
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Role</label>
              <select
                value={approveRole}
                onChange={(e) => setApproveRole(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
              >
                {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setApproveModal(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
              <button onClick={handleApprove} disabled={approving}
                className="flex-1 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-sm font-medium hover:bg-primary/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {approving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Approve & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Reject Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              Reject <strong className="text-gray-900 dark:text-white">{rejectTarget.name}</strong>&apos;s request? They&apos;ll receive a rejection email.
            </p>
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={rejecting}
                className="flex-1 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {rejecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
