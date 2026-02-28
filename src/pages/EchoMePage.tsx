import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCircle2, MessageCircle, Save, Sparkles } from "lucide-react";

interface EchomeProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  tone: string;
  traits: string | null;
  sample_phrases: string | null;
  language: string;
  updated_at: string;
}

const TONES = [
  { value: "friendly", label: "Amical" },
  { value: "pro", label: "Pro" },
  { value: "casual", label: "Décontracté" },
  { value: "formal", label: "Formel" },
];

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

export default function EchoMePage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [echome, setEchome] = useState<EchomeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reacting, setReacting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [tone, setTone] = useState("friendly");
  const [traits, setTraits] = useState("");
  const [samplePhrases, setSamplePhrases] = useState("");
  const [language, setLanguage] = useState("fr");

  const [situation, setSituation] = useState("");
  const [context, setContext] = useState("");
  const [reply, setReply] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("echome_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setEchome(data as EchomeProfile);
        setDisplayName(data.display_name ?? "");
        setTone(data.tone ?? "friendly");
        setTraits(data.traits ?? "");
        setSamplePhrases(data.sample_phrases ?? "");
        setLanguage(data.language ?? "fr");
      } else {
        setDisplayName(profile?.display_name ?? "");
      }
      setLoading(false);
    })();
  }, [user?.id, profile?.display_name]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        display_name: displayName || null,
        tone,
        traits: traits.trim() || null,
        sample_phrases: samplePhrases.trim() || null,
        language,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("echome_profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      setEchome((prev) => (prev ? { ...prev, ...payload } : null));
      toast({ title: "Profil EchoMe enregistré", description: "Ton double te connaît mieux." });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReact = async () => {
    if (!situation.trim()) {
      toast({ title: "Indique une situation", variant: "destructive" });
      return;
    }
    setReacting(true);
    setReply(null);
    try {
      const { data, error } = await supabase.functions.invoke("echome-react", {
        body: { situation: situation.trim(), context: context.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReply(data?.reply ?? "Pas de réponse.");
    } catch (e) {
      toast({ title: "EchoMe indisponible", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReacting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
          EchoMe
        </h1>
        <p className="text-muted-foreground mt-1">
          Ton avatar double qui te connaît par cœur et réagit à ta place.
        </p>
      </div>

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-violet-500" />
            Configure ton double
          </CardTitle>
          <CardDescription>
            Plus tu remplis, plus EchoMe te ressemble dans ses réponses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nom affiché (pour EchoMe)</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={profile?.display_name ?? "Mon nom"}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Langue par défaut</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Traits de caractère (séparés par des virgules)</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              placeholder="ex: direct, créatif, concis, bienveillant"
            />
          </div>
          <div className="grid gap-2">
            <Label>Exemples de réponses que tu pourrais faire (une par ligne)</Label>
            <Textarea
              className="min-h-[100px]"
              value={samplePhrases}
              onChange={(e) => setSamplePhrases(e.target.value)}
              placeholder={"Ex: \"Merci, je regarde et je te redis !\"\n\"Top, on en parle demain.\""}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer mon profil EchoMe
          </Button>
        </CardContent>
      </Card>

      <Card className="border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 to-pink-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-fuchsia-500" />
            Réagir à ma place
          </CardTitle>
          <CardDescription>
            Décris une situation (message reçu, question, contexte) et EchoMe répond comme toi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Situation</Label>
            <Textarea
              className="min-h-[80px]"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Ex: Un client te demande si tu peux livrer le projet demain."
            />
          </div>
          <div className="grid gap-2">
            <Label>Contexte (optionnel)</Label>
            <Textarea
              className="min-h-[60px]"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Tu es très chargé cette semaine."
            />
          </div>
          <Button onClick={handleReact} disabled={reacting} className="gap-2">
            {reacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            EchoMe répond
          </Button>
          {reply !== null && (
            <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 p-4">
              <p className="text-sm font-medium text-fuchsia-600 dark:text-fuchsia-400 mb-1">Réponse EchoMe (à ta place)</p>
              <p className="text-foreground whitespace-pre-wrap">{reply}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
