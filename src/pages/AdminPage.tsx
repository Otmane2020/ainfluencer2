import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn, XCircle, Plus, Mail, Search } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  plan_id?: string | null;
  status?: string | null;
  credits?: number;
}

interface Ticket {
  id: string;
  subject: string;
  email: string;
  status: string;
  priority: string;
  last_message_at: string;
  created_at: string;
}

export default function AdminPage() {
  const { isAdmin, loading } = useIsAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoadingData(true);
    try {
      const [u, t] = await Promise.all([
        supabase.functions.invoke("admin-list-users"),
        supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false }).limit(100),
      ]);
      if (u.data?.users) setUsers(u.data.users);
      if (t.data) setTickets(t.data as Ticket[]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load admin data");
    } finally {
      setLoadingData(false);
    }
  };

  const impersonate = async (userId: string, email: string) => {
    const { data, error } = await supabase.functions.invoke("admin-impersonate", {
      body: { target_user_id: userId },
    });
    if (error) return toast.error("Impersonation failed");
    if (data?.action_link) {
      window.open(data.action_link, "_blank");
      toast.success(`Login link opened for ${email}`);
    }
  };

  const cancelSub = async (userId: string) => {
    if (!confirm("Cancel subscription for this user?")) return;
    const { error } = await supabase.functions.invoke("admin-cancel-subscription", {
      body: { target_user_id: userId, immediate: false },
    });
    if (error) return toast.error("Cancel failed");
    toast.success("Subscription cancelled");
    loadAll();
  };

  const adjustCredits = async (userId: string) => {
    const amountStr = prompt("Credits to add (negative to deduct):");
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (Number.isNaN(amount)) return toast.error("Invalid number");
    const reason = prompt("Reason:") || "Admin adjustment";
    const { error } = await supabase.functions.invoke("admin-adjust-credits", {
      body: { target_user_id: userId, amount, reason },
    });
    if (error) return toast.error("Adjust failed");
    toast.success(`${amount > 0 ? "+" : ""}${amount} credits applied`);
    loadAll();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filteredUsers = users.filter((u) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>

      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, subscriptions, and support tickets</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="tickets">Tickets ({tickets.filter(t => t.status === "open").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2 items-center">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={loadAll} disabled={loadingData}>
                {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Plan</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Credits</th>
                      <th className="text-left p-3">Joined</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3 font-mono text-xs">{u.email}</td>
                        <td className="p-3"><Badge variant="outline">{u.plan_id || "free"}</Badge></td>
                        <td className="p-3">
                          <Badge variant={u.status === "active" ? "default" : "secondary"}>
                            {u.status || "—"}
                          </Badge>
                        </td>
                        <td className="p-3">{u.credits ?? 0}</td>
                        <td className="p-3 text-muted-foreground">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => impersonate(u.id, u.email)} title="Login as user">
                            <LogIn className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => adjustCredits(u.id)} title="Adjust credits">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelSub(u.id)} title="Cancel subscription">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Subject</th>
                      <th className="text-left p-3">From</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Priority</th>
                      <th className="text-left p-3">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => window.open(`/superadmin/tickets/${t.id}`, "_self")}>
                        <td className="p-3 font-medium flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{t.subject}</td>
                        <td className="p-3 text-xs">{t.email}</td>
                        <td className="p-3"><Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge></td>
                        <td className="p-3"><Badge variant="outline">{t.priority}</Badge></td>
                        <td className="p-3 text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No tickets yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
