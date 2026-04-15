import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 border-[hsl(var(--border-strong))] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--shadow-ink))]",
        secondary: "bg-accent text-accent-foreground shadow-[2px_2px_0_hsl(var(--shadow-ink))]",
        destructive: "bg-destructive text-destructive-foreground shadow-[2px_2px_0_hsl(var(--shadow-ink))]",
        outline: "bg-card text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
