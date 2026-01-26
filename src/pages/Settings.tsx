import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Bell,
  Shield,
  LogOut,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SocialConnections } from "@/components/SocialConnections";

const Settings = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });

  // Social connections state
  const [connections, setConnections] = useState([
    { platform: "instagram" as const, connected: false },
    { platform: "facebook" as const, connected: false },
    { platform: "linkedin" as const, connected: false },
    { platform: "tiktok" as const, connected: false },
  ]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (platform: "instagram" | "facebook" | "linkedin" | "tiktok") => {
    if (platform === "linkedin") {
      toast({
        title: "LinkedIn",
        description: "La connexion LinkedIn sera disponible prochainement",
      });
    } else if (platform === "tiktok") {
      toast({
        title: "TikTok",
        description: "La connexion TikTok sera disponible prochainement",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et vos préférences
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full gradient-primary p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
                <span className="text-xl font-bold text-gradient">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Sauvegarder"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            Comptes connectés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SocialConnections 
            connections={connections} 
            onConnect={handleConnect}
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifications email</p>
              <p className="text-sm text-muted-foreground">
                Recevoir des emails sur vos publications
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rapport hebdomadaire</p>
              <p className="text-sm text-muted-foreground">
                Résumé de vos performances chaque semaine
              </p>
            </div>
            <Switch
              checked={notifications.weekly}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, weekly: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
