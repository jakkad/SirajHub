import * as React from "react";
import { ScrollArea as ScrollAreaNS } from "radix-ui";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaNS.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaNS.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaNS.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaNS.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaNS.Viewport>
    <ScrollBar />
    <ScrollAreaNS.Corner />
  </ScrollAreaNS.Root>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaNS.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaNS.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaNS.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaNS.Thumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaNS.Scrollbar>
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
