import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    document.title = "Unsubscribe – ClipMotion";
    if (!token) {
      setState("invalid");
      setMessage("Missing unsubscribe token.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else {
          setState("invalid");
          setMessage(data?.error ?? "Invalid or expired link.");
        }
      } catch {
        setState("error");
        setMessage("Could not validate the unsubscribe link.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success || (data as any)?.reason === "already_unsubscribed") {
        setState("done");
      } else {
        setState("error");
        setMessage("Could not process unsubscribe.");
      }
    } catch {
      setState("error");
      setMessage("Could not process unsubscribe.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 space-y-5 text-center">
        <h1 className="text-2xl font-bold">Unsubscribe</h1>

        {state === "loading" && (
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Validating link…
          </p>
        )}

        {state === "valid" && (
          <>
            <p className="text-muted-foreground">
              Click below to confirm you no longer want to receive emails from ClipMotion.
            </p>
            <Button onClick={confirm} className="w-full gradient-primary">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state === "submitting" && (
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </p>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p>You've been unsubscribed. We're sorry to see you go.</p>
          </>
        )}

        {state === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p>You're already unsubscribed. No further action is needed.</p>
          </>
        )}

        {(state === "invalid" || state === "error") && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        <Link to="/" className="text-sm text-primary hover:underline inline-block">
          ← Back to ClipMotion
        </Link>
      </Card>
    </main>
  );
}
