import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  enableInInputs?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options?: UseKeyboardShortcutsOptions
) {
  const { enabled = true, enableInInputs = false } = options || {};
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if in input field unless explicitly enabled
      if (!enableInInputs) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;
        if (isInput) return;
      }

      // Check each shortcut
      shortcutsRef.current.forEach((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback(event);
        }
      });
    },
    [enabled, enableInInputs]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts presets
 */
export const CommonShortcuts = {
  save: (callback: () => void): KeyboardShortcut => ({
    key: 's',
    ctrlKey: true,
    callback,
    description: 'Save',
  }),
  search: (callback: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    callback,
    description: 'Search',
  }),
  escape: (callback: () => void): KeyboardShortcut => ({
    key: 'Escape',
    callback,
    description: 'Close/Cancel',
  }),
  delete: (callback: () => void): KeyboardShortcut => ({
    key: 'Delete',
    callback,
    description: 'Delete',
  }),
  refresh: (callback: () => void): KeyboardShortcut => ({
    key: 'r',
    ctrlKey: true,
    callback,
    description: 'Refresh',
  }),
  new: (callback: () => void): KeyboardShortcut => ({
    key: 'n',
    ctrlKey: true,
    callback,
    description: 'New',
  }),
  print: (callback: () => void): KeyboardShortcut => ({
    key: 'p',
    ctrlKey: true,
    callback,
    description: 'Print',
  }),
  help: (callback: () => void): KeyboardShortcut => ({
    key: '?',
    shiftKey: true,
    callback,
    description: 'Help',
  }),
};

/**
 * Hook for displaying active shortcuts
 */
export function useShortcutHelp(shortcuts: KeyboardShortcut[]) {
  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const keys: string[] = [];
    
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.metaKey) keys.push('Cmd');
    keys.push(shortcut.key.toUpperCase());
    
    return keys.join(' + ');
  };

  const shortcutList = shortcuts
    .filter((s) => s.description)
    .map((s) => ({
      keys: formatShortcut(s),
      description: s.description!,
    }));

  return shortcutList;
}
