import * as React from "react";
import { Tabs as TabsNS } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsNS.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsNS.List>,
  React.ComponentPropsWithoutRef<typeof TabsNS.List>
>(({ className, ...props }, ref) => (
  <TabsNS.List
    ref={ref}
    className={cn(
      "inline-flex h-auto items-center justify-center rounded-full border-2 border-[hsl(var(--border-strong))] bg-card p-1.5 text-muted-foreground shadow-[4px_4px_0_hsl(var(--shadow-ink))]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsNS.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsNS.Trigger>
>(({ className, ...props }, ref) => (
  <TabsNS.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-2 data-[state=active]:border-[hsl(var(--border-strong))] data-[state=active]:bg-accent data-[state=active]:text-foreground data-[state=active]:shadow-[2px_2px_0_hsl(var(--shadow-ink))]",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsNS.Content>,
  React.ComponentPropsWithoutRef<typeof TabsNS.Content>
>(({ className, ...props }, ref) => (
  <TabsNS.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
