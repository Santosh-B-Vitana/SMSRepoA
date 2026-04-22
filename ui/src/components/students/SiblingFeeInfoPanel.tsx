// SiblingFeeInfoPanel.tsx
import { Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SiblingFeeInfoPanel({ siblings, allStudents, onSiblingClick }) {
  if (!siblings || siblings.length === 0) return null;
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Siblings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {siblings.map(siblingId => {
            const sibling = allStudents.find(s => s.id === siblingId);
            if (!sibling) return null;
            return (
              <div key={sibling.id} className="flex items-center justify-between p-3 bg-background rounded border">
                <div>
                  <p className="font-medium">{sibling.name}</p>
                  <p className="text-sm text-muted-foreground">Class {sibling.class}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onSiblingClick(sibling.id)}>
                  View Profile
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
