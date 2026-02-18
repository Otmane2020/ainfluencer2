import { cn } from "@/lib/utils";

interface AnchoringLabelProps {
  planId: string;
  credits: number;
  price: number;
}

export const AnchoringLabel = ({ planId, credits, price }: AnchoringLabelProps) => {
  const perCredit = (price / credits).toFixed(2);
  const standardPerCredit = 0.65;
  const savings = ((1 - parseFloat(perCredit) / standardPerCredit) * 100).toFixed(0);

  return (
    <div className="text-center space-y-1">
      <div className="text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">${perCredit}</span> per credit
        {planId !== "starter" && (
          <span className={cn(
            "ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            planId === "pro" ? "bg-primary/10 text-primary" : "bg-purple-500/10 text-purple-400"
          )}>
            Save {savings}%
          </span>
        )}
      </div>
      {planId === "starter" && (
        <p className="text-[10px] text-muted-foreground/70">
          vs $0.65/credit pay-as-you-go
        </p>
      )}
    </div>
  );
};
