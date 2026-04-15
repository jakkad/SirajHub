import * as React from "react";
import { DropdownMenu as DropdownNS } from "radix-ui";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownNS.Root;
const DropdownMenuTrigger = DropdownNS.Trigger;
const DropdownMenuGroup = DropdownNS.Group;
const DropdownMenuPortal = DropdownNS.Portal;
const DropdownMenuSub = DropdownNS.Sub;
const DropdownMenuRadioGroup = DropdownNS.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownNS.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownNS.SubTrigger
    ref={ref}
    className={cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownNS.SubTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownNS.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownNS.SubContent
    ref={ref}
    className={cn("z-50 min-w-[12rem] overflow-hidden rounded-[20px] border-2 border-[hsl(var(--border-strong))] bg-popover p-1.5 text-popover-foreground shadow-[6px_6px_0_hsl(var(--shadow-ink))] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)}
    {...props}
  />
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownNS.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownNS.Portal>
    <DropdownNS.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)}
      {...props}
    />
  </DropdownNS.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownNS.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownNS.Item
    ref={ref}
    className={cn("relative flex cursor-default select-none items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownNS.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownNS.CheckboxItem ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} checked={checked} {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownNS.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownNS.ItemIndicator>
    </span>
    {children}
  </DropdownNS.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownNS.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownNS.RadioItem ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownNS.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownNS.ItemIndicator>
    </span>
    {children}
  </DropdownNS.RadioItem>
));
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownNS.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownNS.Label ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold", inset && "pl-8", className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownNS.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownNS.Separator>
>(({ className, ...props }, ref) => (
  <DropdownNS.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
);
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem,
  DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
  DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuRadioGroup,
};
