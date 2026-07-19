"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SCHOOL_NAMES, schoolDisplayName } from "@/lib/schoolData";

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR + i);

export default function JoinPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [major, setMajor] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [telegram, setTelegram] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, school,
          wallet_address: wallet || undefined,
          message: message || undefined,
          grad_year: gradYear ? parseInt(gradYear, 10) : undefined,
          major: major || undefined,
          linkedin: linkedin || undefined,
          telegram: telegram || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setSuccess(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-5">
            <Image src="/logo.jpg" width={52} height={52} alt="DormDAO" className="rounded-xl mx-auto" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Request Access</h1>
          <p className="text-sm text-gray-500">DormDAO is invitation-only. Submit a request and we'll review your application.</p>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Request submitted!</h2>
              <p className="text-sm text-gray-500">
                We'll review your application and send you an invite email when approved.
              </p>
              <Link href="/" className="inline-block mt-5 text-sm text-primary hover:underline">← Back to home</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@university.edu" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  School <span className="text-red-500">*</span>
                </label>
                <select required value={school} onChange={(e) => setSchool(e.target.value)} className={inputClass}>
                  <option value="">— Select your school —</option>
                  {SCHOOL_NAMES.map((s) => (
                    <option key={s} value={s}>{schoolDisplayName(s)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Grad Year <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select value={gradYear} onChange={(e) => setGradYear(e.target.value)} className={inputClass}>
                    <option value="">— Year —</option>
                    {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Major <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input value={major} onChange={(e) => setMajor(e.target.value)}
                    placeholder="e.g. Finance" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    LinkedIn <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/…" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Telegram <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input value={telegram} onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Wallet Address <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={wallet} onChange={(e) => setWallet(e.target.value)}
                  placeholder="0x…" className={inputClass + " font-mono"} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Why do you want to join? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                  rows={3} maxLength={500}
                  placeholder="Tell us about your interest in crypto investing and DormDAO…"
                  className={inputClass + " resize-none"} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {submitting ? "Submitting…" : "Request Access"}
              </button>

              <p className="text-xs text-center text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">Sign in →</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
