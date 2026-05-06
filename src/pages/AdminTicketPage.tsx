import { useEffect, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, ArrowLeft, Send, Forward, Reply, Mail, User as UserIcon,
  Clock, CheckCircle2, Archive,
} from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string; subject: string; email: string; status: string; priority: string;
  last_message_at: string; created_at: string; user_id: string | null;
}
interface Message {
  id: string; ticket_id: string; direction: "inbound" | "outbound";
  from_email: string | null; to_email: string | null; from_name: string | null;
  subject?: string | null; body_text: string | null; body_html: string | null;
  created_at: string;
}

export default function AdminTicketPage() {
  const { id } = useParams();
  const { isAdmin, loading } = useIsAdmin();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [reply, setReply] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardBody, setForwardBody] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"reply" | "forward">("reply");

  useEffect(() => {
    if (isAdmin && id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, id]);

  const load = async () => {
    setLoadingData(true);
    const [t, m] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("id", id!).single(),
      supabase.from("support_messages").select("*").eq("ticket_id", id!).order("created_at"),
    ]);
    if (t.data) setTicket(t.data as Ticket);
    if (m.data) setMessages(m.data as unknown as Message[]);
    setLoadingData(false);
  };

  const send = async (mode: "reply" | "forward") => {
    const body = mode === "reply" ? reply : forwardBody;
    if (!body.trim()) return toast.error("Message body required");
    if (mode === "forward" && !forwardTo.trim()) return toast.error("Recipient required");
    setSending(true);
    const { error } = await supabase.functions.invoke("support-send-reply", {
      body: { ticket_id: id, body, mode, forward_to: mode === "forward" ? forwardTo : undefined },
    });
    setSending(false);
    if (error) return toast.error("Send failed");
    toast.success(mode === "reply" ? "Reply sent" : "Forwarded");
    setReply(""); setForwardBody(""); setForwardTo("");
    load();
  };

  const updateStatus = async (status: string) => {
    await supabase.from("support_tickets").update({ status }).eq("id", id!);
    toast.success(`Marked as ${status}`);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loadingData) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  if (!ticket) return <div className="container mx-auto p-6">Ticket not found</div>;

  return (
    <div className="container mx-auto p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link to="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back to Inbox</Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => updateStatus("resolved")}>
            <CheckCircle2 className="h-4 w-4 mr-1" />Resolve
          </Button>
          <Button variant="outline" size="sm" onClick={() => updateStatus("closed")}>
            <Archive className="h-4 w-4 mr-1" />Close
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />{ticket.email}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={ticket.status === "open" ? "default" : "secondary"}>{ticket.status}</Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {messages.map((m) => (
          <Card key={m.id} className={`p-4 ${m.direction === "outbound" ? "ml-8 bg-primary/5 border-primary/20" : "mr-8"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {(m.from_email || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {m.from_name || m.from_email}
                    {m.direction === "outbound" && <Badge variant="outline" className="ml-2 text-xs">Support</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">to {m.to_email}</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            {m.body_html ? (
              <div className="prose prose-sm max-w-none mt-2 text-sm" dangerouslySetInnerHTML={{ __html: m.body_html }} />
            ) : (
              <p className="text-sm whitespace-pre-wrap mt-2">{m.body_text}</p>
            )}
          </Card>
        ))}
        {messages.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No messages yet
          </Card>
        )}
      </div>

      <Card className="p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="reply"><Reply className="h-3.5 w-3.5 mr-1" />Reply</TabsTrigger>
            <TabsTrigger value="forward"><Forward className="h-3.5 w-3.5 mr-1" />Forward</TabsTrigger>
          </TabsList>
          <TabsContent value="reply" className="space-y-3 pt-3">
            <div className="text-xs text-muted-foreground">To: <span className="font-mono">{ticket.email}</span></div>
            <Textarea
              placeholder="Type your reply..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
            />
            <Button onClick={() => send("reply")} disabled={sending || !reply.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Reply
            </Button>
          </TabsContent>
          <TabsContent value="forward" className="space-y-3 pt-3">
            <Input
              type="email"
              placeholder="forward-to@example.com"
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
            />
            <Textarea
              placeholder="Add a note (forwarded conversation will be included)..."
              value={forwardBody}
              onChange={(e) => setForwardBody(e.target.value)}
              rows={6}
            />
            <Button onClick={() => send("forward")} disabled={sending || !forwardBody.trim() || !forwardTo.trim()}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Forward className="h-4 w-4 mr-2" />}
              Forward
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
