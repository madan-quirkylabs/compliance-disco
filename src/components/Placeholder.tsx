import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";
import type { ReactNode } from "react";

export function Placeholder({
  title,
  description,
  phase = "Phase 2",
  children,
}: {
  title: string;
  description?: string;
  phase?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[900px] p-6">
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <Construction className="h-3.5 w-3.5" aria-hidden /> Coming in {phase}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
