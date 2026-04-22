import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';
import { toast } from 'sonner';

interface Action<T = any> {
  type: string;
  data: T;
  timestamp: Date;
}

interface UndoRedoState<T = any> {
  past: Action<T>[];
  present: Action<T> | null;
  future: Action<T>[];
}

export function useUndoRedo<T = any>(initialState?: Action<T>) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState || null,
    future: []
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const performAction = useCallback((action: Action<T>) => {
    setState(prevState => ({
      past: prevState.present ? [...prevState.past, prevState.present] : prevState.past,
      present: action,
      future: []
    }));
  }, []);

  const undo = useCallback(() => {
    if (!canUndo) return;

    setState(prevState => {
      const previous = prevState.past[prevState.past.length - 1];
      const newPast = prevState.past.slice(0, prevState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: prevState.present ? [prevState.present, ...prevState.future] : prevState.future
      };
    });

    toast.info('Action undone');
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    setState(prevState => {
      const next = prevState.future[0];
      const newFuture = prevState.future.slice(1);

      return {
        past: prevState.present ? [...prevState.past, prevState.present] : prevState.past,
        present: next,
        future: newFuture
      };
    });

    toast.info('Action redone');
  }, [canRedo]);

  const reset = useCallback(() => {
    setState({
      past: [],
      present: initialState || null,
      future: []
    });
  }, [initialState]);

  return {
    state: state.present,
    performAction,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    history: {
      past: state.past,
      future: state.future
    }
  };
}

interface UndoRedoToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function UndoRedoToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: UndoRedoToolbarProps) {
  return (
    <div className="flex gap-1 border rounded-lg p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
