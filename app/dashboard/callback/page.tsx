"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BrainCircuit, CheckCircle2, XCircle } from "lucide-react";
import { Suspense } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function CallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const storedState = sessionStorage.getItem("oauth_state");
    const env = localStorage.getItem("aiet_pending_env") ?? "paper";

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received.");
      return;
    }
    if (state !== storedState) {
      setStatus("error");
      setMessage("Invalid state — possible CSRF. Please try again.");
      return;
    }

    fetch(`${BACKEND}/auth/alpaca/callback?code=${code}&state=${state}&env=${env}`)
      .then(r => r.json())
      .then(data => {
        if (data.user_id) {
          localStorage.setItem("aiet_user_id", String(data.user_id));
          localStorage.setItem("aiet_env", data.environment);
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 1500);
        } else {
          setStatus("error");
          setMessage(data.detail ?? "Unknown error");
        }
      })
      .catch(e => {
        setStatus("error");
        setMessage(String(e));
      });
  }, [params, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      {status === "loading" && (
        <>
          <BrainCircuit className="w-8 h-8 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Connecting your Alpaca account…</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <p className="text-sm font-medium">Connected! Redirecting…</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-medium text-red-400">Connection failed</p>
          <p className="text-xs text-muted-foreground max-w-xs text-center">{message}</p>
        </>
      )}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
