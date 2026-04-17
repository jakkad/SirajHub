import { Check } from "lucide-react";

export function SelectionOverlay({ 
  isSelected, 
  onClick 
}: { 
  isSelected: boolean; 
  onClick: (e: React.MouseEvent) => void 
}) {
  return (
    <div
      onClick={onClick}
      className={`absolute inset-0 z-20 transition-all duration-200 cursor-pointer ${
        isSelected ? 'bg-black/30 backdrop-blur-[1px]' : 'hover:bg-black/10'
      }`}
    >
      <div 
        className={`absolute top-2 right-2 size-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${
          isSelected 
            ? 'bg-white border-white scale-100' 
            : 'bg-black/40 border-white/70 scale-90 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check className="size-3.5 text-black stroke-[4]" />}
      </div>
    </div>
  );
}
