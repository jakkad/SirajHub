import * as React from "react";
import { Label as LabelNS } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelNS.Root>,
  React.ComponentPropsWithoutRef<typeof LabelNS.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelNS.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = "Label";

export { Label };
