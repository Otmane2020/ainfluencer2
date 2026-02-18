import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface Step {
  id: string;
  label: string;
  done: boolean;
  link: string;
}

export const OnboardingProgress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkSteps();
  }, [user]);

  const checkSteps = async () => {
    if (!user) return;

    const { count: projectCount } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: genCount } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: campaignCount } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: postCount } = await supabase
      .from("scheduled_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "published");

    setSteps([
      { id: "project", label: "Create your first project", done: (projectCount || 0) > 0, link: "/projects/new" },
      { id: "generate", label: "Generate your first content", done: (genCount || 0) > 0, link: "/images" },
      { id: "campaign", label: "Launch a campaign", done: (campaignCount || 0) > 0, link: "/campaigns" },
      { id: "publish", label: "Publish your first post", done: (postCount || 0) > 0, link: "/calendar" },
    ]);
  };

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const percentage = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const nextStep = steps.find((s) => !s.done);

  if (dismissed || allDone || steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Get started — {percentage}% complete</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      <Progress value={percentage} className="h-2 mb-3" />

      <div className="space-y-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
            onClick={() => !step.done && navigate(step.link)}
          >
            <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
              step.done ? "bg-primary text-white" : "border border-muted-foreground/30"
            }`}>
              {step.done && <Check className="h-3 w-3" />}
            </div>
            <span className={step.done ? "line-through text-muted-foreground" : ""}>{step.label}</span>
          </div>
        ))}
      </div>

      {nextStep && (
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={() => navigate(nextStep.link)}
        >
          {nextStep.label}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </motion.div>
  );
};
