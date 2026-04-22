import React from 'react';
import { cn } from '@/lib/utils';

// Mobile-responsive container component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}

export function ResponsiveContainer({ 
  children, 
  className,
  spacing = 'normal'
}: ResponsiveContainerProps) {
  const spacingClasses = {
    tight: 'space-y-2 sm:space-y-3',
    normal: 'space-y-3 sm:space-y-4 lg:space-y-6',
    loose: 'space-y-4 sm:space-y-6 lg:space-y-8'
  };

  return (
    <div className={cn(
      'w-full',
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8'
  };

  const gridCols = `grid-cols-${cols.mobile} sm:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`;

  return (
    <div className={cn(
      'grid',
      gridCols,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive card component
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function ResponsiveCard({ 
  children, 
  className,
  padding = 'md'
}: ResponsiveCardProps) {
  const paddingClasses = {
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4 lg:p-6',
    lg: 'p-4 sm:p-6 lg:p-8'
  };

  return (
    <div className={cn(
      'bg-card text-card-foreground rounded-lg border border-border shadow-sm',
      paddingClasses[padding],
      'transition-colors hover:bg-accent/5',
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive text component
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'display' | 'heading' | 'subheading' | 'body' | 'caption';
}

export function ResponsiveText({ 
  children, 
  className,
  variant = 'body'
}: ResponsiveTextProps) {
  const variantClasses = {
    display: 'text-lg sm:text-xl lg:text-3xl font-bold',
    heading: 'text-base sm:text-lg lg:text-xl font-semibold',
    subheading: 'text-sm sm:text-base lg:text-lg font-medium',
    body: 'text-xs sm:text-sm lg:text-base',
    caption: 'text-xs text-muted-foreground'
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
}

// Mobile-responsive button grid for quick actions
interface MobileActionGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function MobileActionGrid({ 
  children, 
  className,
  columns = 2
}: MobileActionGridProps) {
  const colsClass = `grid-cols-${columns} sm:grid-cols-${Math.min(columns + 1, 4)}`;

  return (
    <div className={cn(
      'grid gap-2 sm:gap-3',
      colsClass,
      className
    )}>
      {children}
    </div>
  );
}