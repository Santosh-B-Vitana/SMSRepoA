import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, Plus } from "lucide-react";

interface FeeEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function FeeEmptyState({
  title = "No records found",
  description = "There are no fee records to display. Try adjusting your filters or add new records.",
  actionLabel,
  onAction,
  icon
}: FeeEmptyStateProps) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon || <FileX className="h-16 w-16 text-muted-foreground mb-4" />}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
