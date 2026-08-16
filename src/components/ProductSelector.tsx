import { motion } from "framer-motion";
import { Video, Image, User, Check, Award, Star, Wand2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CommercialProduct,
  COMMERCIAL_PRODUCTS,
  getTierColor,
  getCategoryLabel,
} from "@/lib/commercialProducts";

const getCategoryIcon = (category: CommercialProduct["category"]) => {
  switch (category) {
    case "video":
      return Video;
    case "image":
      return Image;
    case "avatar":
      return User;
  }
};

const getTierBadgeIcon = (tier: CommercialProduct["tier"]) => {
  switch (tier) {
    case "cinema":
      return Award;
    case "ultra":
      return Star;
    case "pro":
      return Wand2;
    default:
      return null;
  }
};

interface ProductSelectorProps {
  selectedProduct: CommercialProduct;
  onProductChange: (product: CommercialProduct) => void;
  category?: CommercialProduct["category"];
  categories?: CommercialProduct["category"][];
  showPopularBadge?: boolean;
}

export const ProductSelector = ({
  selectedProduct,
  onProductChange,
  category,
  categories,
  showPopularBadge = true,
}: ProductSelectorProps) => {
  // Filter by single category, multiple categories, or show all
  const filteredProducts = categories
    ? COMMERCIAL_PRODUCTS.filter((p) => categories.includes(p.category))
    : category
    ? COMMERCIAL_PRODUCTS.filter((p) => p.category === category)
    : COMMERCIAL_PRODUCTS;

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, CommercialProduct[]>);

  const categoryOrder = ["video", "avatar", "image"];
  const sortedCategories = Object.entries(groupedProducts).sort(
    ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  return (
    <div className="space-y-6">
      {sortedCategories.map(([cat, products]) => (
        <div key={cat}>
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
            {getCategoryLabel(cat as CommercialProduct["category"])}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const Icon = getCategoryIcon(product.category);
              const BadgeIcon = getTierBadgeIcon(product.tier);
              const isSelected = selectedProduct.id === product.id;

              return (
                <motion.button
                  key={product.id}
                  onClick={() => onProductChange(product)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  {/* Popular badge */}
                  {showPopularBadge && product.popular && (
                    <div className="absolute -right-1 -top-1 flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-secondary px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      POPULAR
                    </div>
                  )}

                  {/* Custom badge */}
                  {!product.popular && product.badge && (
                    <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-xs">
                      {product.badge}
                    </div>
                  )}

                  {/* Selected indicator */}
                  {isSelected && !product.popular && !product.badge && (
                    <div className="absolute right-2 top-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-3 flex items-center gap-3">
                    <div className={cn("rounded-xl p-2.5", getTierColor(product.tier))}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{product.name}</span>
                        {BadgeIcon && product.tier !== "standard" && (
                          <BadgeIcon className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium uppercase",
                        getTierColor(product.tier),
                        "bg-transparent px-0 py-0"
                      )}>
                        {product.tier}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  {/* Features */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {product.features.slice(0, 3).map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* Avatar & Voice indicators */}
                  <div className="mt-2 flex items-center gap-2">
                    {product.needsAvatar && (
                      <div className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                        <User className="h-2.5 w-2.5" />
                        Avatar required
                      </div>
                    )}
                    {product.needsVoice && (
                      <div className="flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        <Mic className="h-2.5 w-2.5" /> AI Voice included
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductSelector;
