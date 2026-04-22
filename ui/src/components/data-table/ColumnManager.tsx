import { useState } from 'react';
import { Settings2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Column {
  id: string;
  label: string;
  visible: boolean;
  fixed?: boolean;
}

interface ColumnManagerProps {
  columns: Column[];
  onColumnChange: (columns: Column[]) => void;
}

export function ColumnManager({ columns, onColumnChange }: ColumnManagerProps) {
  const [open, setOpen] = useState(false);

  const toggleColumn = (columnId: string) => {
    const updated = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnChange(updated);
  };

  const toggleAll = () => {
    const allVisible = columns.every((col) => col.visible || col.fixed);
    const updated = columns.map((col) =>
      col.fixed ? col : { ...col, visible: !allVisible }
    );
    onColumnChange(updated);
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Columns ({visibleCount}/{columns.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Manage Columns</h4>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {columns.every((col) => col.visible || col.fixed) ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide All
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Show All
                </>
              )}
            </Button>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center space-x-2 py-1"
                >
                  <Checkbox
                    id={column.id}
                    checked={column.visible}
                    disabled={column.fixed}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <Label
                    htmlFor={column.id}
                    className={`flex-1 cursor-pointer ${
                      column.fixed ? 'text-muted-foreground' : ''
                    }`}
                  >
                    {column.label}
                    {column.fixed && (
                      <span className="text-xs ml-2">(Fixed)</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing column visibility
export function useColumnVisibility(initialColumns: Column[]) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);

  const getVisibleColumns = () => columns.filter((col) => col.visible);

  const resetColumns = () => {
    setColumns(initialColumns);
  };

  return {
    columns,
    setColumns,
    getVisibleColumns,
    resetColumns,
  };
}
