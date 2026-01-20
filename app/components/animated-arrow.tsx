import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export function AnimatedChevronArrow({
  isExpanded,
  className,
}: {
  isExpanded: boolean;
  className?: string;
}) {
  return (
    <ChevronDown
      className={cn(
        "size-4 shrink-0 text-gray-500 transition-transform",
        className,
        isExpanded && "rotate-180",
      )}
    />
  );
}
