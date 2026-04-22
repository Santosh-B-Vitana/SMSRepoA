import { format } from 'date-fns';
import { Clock, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

export interface AuditTrailProps {
  entries: AuditEntry[];
  maxHeight?: number;
  showChanges?: boolean;
  title?: string;
}

export function AuditTrail({
  entries,
  maxHeight = 400,
  showChanges = true,
  title = 'Activity Log',
}: AuditTrailProps) {
  const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
      return 'destructive';
    }
    if (lowerAction.includes('create') || lowerAction.includes('add')) {
      return 'default';
    }
    return 'secondary';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return format(value, 'PPp');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }}>
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-2 border-primary/20 pl-4 pb-4 last:pb-0"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionBadgeVariant(entry.action)}>
                        {entry.action}
                      </Badge>
                      <span className="text-sm font-medium">
                        {entry.entityType} #{entry.entityId}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{entry.userName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(entry.timestamp, 'PPp')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {showChanges && entry.changes && Object.keys(entry.changes).length > 0 && (
                  <div className="mt-2 text-sm">
                    <p className="text-muted-foreground mb-1">Changes:</p>
                    <div className="bg-muted/50 rounded-md p-2 space-y-1">
                      {Object.entries(entry.changes).map(([field, { old, new: newValue }]) => (
                        <div key={field} className="flex items-start gap-2">
                          <span className="font-medium min-w-[100px]">{field}:</span>
                          <div className="flex-1">
                            <span className="line-through text-muted-foreground">
                              {formatValue(old)}
                            </span>
                            <span className="mx-2">→</span>
                            <span className="text-foreground">
                              {formatValue(newValue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {Object.entries(entry.metadata).map(([key, value]) => (
                      <div key={key}>
                        {key}: {formatValue(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Hook for managing audit trail data
export function useAuditTrail(entityType: string, entityId: string) {
  // This would typically fetch from an API
  // For now, returning a stub implementation
  const entries: AuditEntry[] = [];
  const isLoading = false;
  const error = null;

  const addEntry = (action: string, changes?: Record<string, { old: any; new: any }>) => {
    // Implementation would POST to API
    console.log('Adding audit entry:', { action, changes });
  };

  return {
    entries,
    isLoading,
    error,
    addEntry,
  };
}
