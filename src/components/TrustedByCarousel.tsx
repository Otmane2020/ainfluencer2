const audiences = [
  "E-commerce brands",
  "Content creators",
  "Creative teams",
  "Social media teams",
  "Agencies",
];

export const TrustedByCarousel = () => {
  return (
    <section className="overflow-hidden border-y border-border/30 bg-muted/20 py-8 md:py-10">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">Built for product-led creative workflows</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {audiences.map((audience) => (
            <span
              key={audience}
              className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground md:text-sm"
            >
              {audience}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
