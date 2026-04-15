import * as React from "react";
import { RadioGroup as RadioGroupNS } from "radix-ui";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupNS.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupNS.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupNS.Root className={cn("grid gap-2", className)} {...props} ref={ref} />
));
RadioGroup.displayName = "RadioGroup";

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupNS.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupNS.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupNS.Item
    ref={ref}
    className={cn(
      "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <RadioGroupNS.Indicator className="flex items-center justify-center">
      <Circle className="h-3.5 w-3.5 fill-primary" />
    </RadioGroupNS.Indicator>
  </RadioGroupNS.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
