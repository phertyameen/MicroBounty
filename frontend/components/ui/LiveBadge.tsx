import { Badge } from "@/components/ui/badge";

export function LiveBadge() {
  return (
    <Badge variant="outline" className="text-xs gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      Live
    </Badge>
  );
}