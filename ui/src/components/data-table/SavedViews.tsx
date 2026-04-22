import { useState } from 'react';
import { Save, Bookmark, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  columns: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAt: Date;
}

interface SavedViewsProps {
  views: SavedView[];
  onSave: (view: Omit<SavedView, 'id' | 'createdAt'>) => void;
  onLoad: (view: SavedView) => void;
  onDelete: (id: string) => void;
  currentFilters: Record<string, any>;
  currentColumns: string[];
}

export function SavedViews({
  views,
  onSave,
  onLoad,
  onDelete,
  currentFilters,
  currentColumns,
}: SavedViewsProps) {
  const [open, setOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [selectedView, setSelectedView] = useState<string>('');
  const { toast } = useToast();

  const handleSave = () => {
    if (!viewName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a view name',
        variant: 'destructive',
      });
      return;
    }

    onSave({
      name: viewName,
      filters: currentFilters,
      columns: currentColumns,
    });

    toast({
      title: 'Success',
      description: 'View saved successfully',
    });

    setViewName('');
    setOpen(false);
  };

  const handleLoad = (viewId: string) => {
    const view = views.find((v) => v.id === viewId);
    if (view) {
      onLoad(view);
      setSelectedView(viewId);
      toast({
        title: 'View Loaded',
        description: `Loaded view: ${view.name}`,
      });
    }
  };

  const handleDelete = (viewId: string) => {
    onDelete(viewId);
    if (selectedView === viewId) {
      setSelectedView('');
    }
    toast({
      title: 'View Deleted',
      description: 'View deleted successfully',
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedView} onValueChange={handleLoad}>
        <SelectTrigger className="w-[200px]">
          <Bookmark className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Load saved view" />
        </SelectTrigger>
        <SelectContent>
          {views.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              No saved views
            </div>
          ) : (
            views.map((view) => (
              <div
                key={view.id}
                className="flex items-center justify-between px-2 py-1 hover:bg-muted rounded-sm"
              >
                <SelectItem value={view.id} className="flex-1">
                  {view.name}
                </SelectItem>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(view.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save View
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                placeholder="e.g., Active Students"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Plus className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Hook for managing saved views
export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);

  const saveView = (view: Omit<SavedView, 'id' | 'createdAt'>) => {
    const newView: SavedView = {
      ...view,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    };
    setViews((prev) => [...prev, newView]);
    return newView;
  };

  const deleteView = (id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
  };

  return {
    views,
    saveView,
    deleteView,
  };
}
