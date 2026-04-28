// Hooks barrel export
export { useDebounce } from './useDebounce';
export { useIsMobile } from './use-mobile';
export { useKeyboardShortcuts, CommonShortcuts, useShortcutHelp } from './useKeyboardShortcuts';
export { useVirtualScroll } from './useVirtualScroll';
export { useAutoSave } from './useAutoSave';
export { useSessionTimeout } from './useSessionTimeout';
export { useUserPreferences } from './useUserPreferences';
export { useBaseCRUD } from './useBaseCRUD';
export { usePagination } from './usePagination';

export type { KeyboardShortcut, UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';
export type { CRUDService, UseBaseCRUDOptions } from './useBaseCRUD';
export type { PaginationState, PaginationControls, UsePaginationOptions } from './usePagination';
