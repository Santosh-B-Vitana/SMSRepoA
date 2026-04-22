import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, X } from 'lucide-react';

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: (selectedIds: string[]) => void;
}

interface BulkActionsToolbarProps {
  totalCount: number;
  selectedIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: BulkAction[];
  selectAllLabel?: string;
}

export function BulkActionsToolbar({
  totalCount,
  selectedIds,
  onSelectAll,
  onDeselectAll,
  actions,
  selectAllLabel = 'Select all'
}: BulkActionsToolbarProps) {
  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
        <Checkbox
          checked={false}
          onCheckedChange={onSelectAll}
          aria-label="Select all items"
        />
        <span className="text-sm text-muted-foreground">
          {selectAllLabel} ({totalCount})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 border-b bg-primary/10">
      <Checkbox
        checked={allSelected}
        onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
        aria-label="Toggle select all"
      />
      
      <Badge variant="secondary" className="font-semibold">
        {selectedCount} selected
      </Badge>

      <div className="flex-1 flex items-center gap-2">
        {actions.length <= 3 ? (
          // Show actions as buttons if 3 or fewer
          actions.map(action => (
            <Button
              key={action.key}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={() => action.onClick(selectedIds)}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))
        ) : (
          // Show as dropdown if more than 3
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {actions.map(action => (
                <DropdownMenuItem
                  key={action.key}
                  onClick={() => action.onClick(selectedIds)}
                  className="gap-2"
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselectAll}
        className="gap-2"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  );
}

// Hook for managing bulk selection
export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectAll = () => {
    setSelectedIds(items.map(item => item.id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return {
    selectedIds,
    setSelectedIds,
    selectAll,
    deselectAll,
    toggleSelection,
    isSelected,
    selectedCount: selectedIds.length
  };
}
