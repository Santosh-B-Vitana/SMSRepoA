// Common components barrel export
export { GlobalErrorBoundary } from './GlobalErrorBoundary';
export { ErrorBoundary } from './ErrorBoundary';
export { LoadingState } from './LoadingState';
export { EmptyState, EmptyStates } from './EmptyState';
export { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';
export { ResponsiveTable, CellRenderers } from './ResponsiveTable';
export { NetworkErrorHandler, useNetworkStatus, networkAwareFetch } from './NetworkErrorHandler';
export { SEO, SEOConfig } from './SEO';
export { AdvancedFilters, useAdvancedFilters } from './AdvancedFilters';
export { BulkActionsToolbar, useBulkSelection } from './BulkActionsToolbar';
export { FileUpload } from './FileUpload';
export { DataTable } from './DataTable';
export { ExportButton } from './ExportButton';
export { ImportButton } from './ImportButton';
export { AdvancedPagination, usePagination, InfiniteScroll } from './AdvancedPagination';
export { DateRangePicker, DateRangePresets, useDateRange } from './DateRangePicker';
export { PermissionGate, withPermission, usePermissionGate } from './PermissionGate';
export { AuditTrail, useAuditTrail } from './AuditTrail';
export { HelpButton } from './HelpButton';
export { OfflineIndicator, useOnlineStatus } from './OfflineIndicator';
export { OnboardingTour, useResetOnboarding } from './OnboardingTour';
export { UndoRedoToolbar, useUndoRedo } from './UndoRedoManager';

// 🎨 Modern UI Components
export { ModernCard, GlassCard, GradientCard } from './ModernCard';
export { 
  AnimatedWrapper, 
  StaggerContainer, 
  StaggerItem, 
  HoverScale,
  fadeInUp,
  fadeInScale,
  staggerContainer,
  slideInLeft,
  slideInRight,
  bounceIn,
  zoomIn
} from './AnimatedWrapper';
export { AnimatedBackground, GridBackground, DotPattern } from './AnimatedBackground';
export { PremiumBadge, StatusBadge } from './PremiumBadge';
export { ProgressIndicator, CircularProgress } from './ProgressIndicator';
export { TableSkeleton } from './TableSkeleton';
export { SuccessAnimation } from './SuccessAnimation';

// 🔒 Security Components
export { SecureInput, SecureOtpInput } from './SecureInput';
export { SessionTimeoutDialog, useIdleDetection } from './SessionTimeoutDialog';
export { SecurityDashboard, SecurityStatusBadge } from './SecurityDashboard';

// Re-export types
export type { FilterField, FilterValues, SavedFilter } from './AdvancedFilters';
