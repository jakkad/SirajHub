import * as React from "react";
import { Select as SelectNS } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectNS.Root;
const SelectGroup = SelectNS.Group;
const SelectValue = SelectNS.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectNS.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectNS.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectNS.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectNS.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectNS.Icon>
  </SelectNS.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectNS.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectNS.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectNS.ScrollUpButton ref={ref} className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectNS.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectNS.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectNS.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectNS.ScrollDownButton ref={ref} className={cn("flex cursor-default items-center justify-center py-1", className)} {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectNS.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectNS.Content>,
  React.ComponentPropsWithoutRef<typeof SelectNS.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectNS.Portal>
    <SelectNS.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectNS.Viewport
        className={cn(
          "p-1",
          position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectNS.Viewport>
      <SelectScrollDownButton />
    </SelectNS.Content>
  </SelectNS.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectNS.Label>,
  React.ComponentPropsWithoutRef<typeof SelectNS.Label>
>(({ className, ...props }, ref) => (
  <SelectNS.Label ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectNS.Item>,
  React.ComponentPropsWithoutRef<typeof SelectNS.Item>
>(({ className, children, ...props }, ref) => (
  <SelectNS.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectNS.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectNS.ItemIndicator>
    </span>
    <SelectNS.ItemText>{children}</SelectNS.ItemText>
  </SelectNS.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectNS.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectNS.Separator>
>(({ className, ...props }, ref) => (
  <SelectNS.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel,
  SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton,
};
