import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient' | 'glow';
  className?: string;
  showIcon?: boolean;
}

export function PremiumBadge({ 
  children, 
  variant = 'default', 
  className = '',
  showIcon = true 
}: PremiumBadgeProps) {
  const variants = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    gradient: 'gradient-primary text-white border-0 shadow-lg',
    glow: 'bg-primary/10 text-primary border border-primary/20 pulse-glow',
  };

  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150',
        variants[variant],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {showIcon && <Sparkles className="h-3 w-3" />}
      {children}
    </motion.div>
  );
}

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, children, className = '', pulse = false }: StatusBadgeProps) {
  const statusStyles = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200',
        statusStyles[status],
        pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </div>
  );
}
