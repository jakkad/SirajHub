import * as React from "react";
import { Slot as SlotNS } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 border-[hsl(var(--border-strong))] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--shadow-ink))] hover:-translate-y-0.5 hover:bg-primary/95",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[4px_4px_0_hsl(var(--shadow-ink))] hover:-translate-y-0.5 hover:bg-destructive/95",
        outline:
          "bg-card text-card-foreground shadow-[4px_4px_0_hsl(var(--shadow-ink))] hover:-translate-y-0.5 hover:bg-secondary",
        secondary:
          "bg-accent text-accent-foreground shadow-[4px_4px_0_hsl(var(--shadow-ink))] hover:-translate-y-0.5 hover:bg-accent/90",
        ghost:
          "border-transparent bg-transparent shadow-none hover:border-[hsl(var(--border-strong))] hover:bg-secondary/60",
        link: "border-transparent bg-transparent p-0 text-primary shadow-none hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? SlotNS.Root : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
