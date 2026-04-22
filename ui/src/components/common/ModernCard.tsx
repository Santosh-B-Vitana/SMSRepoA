import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModernCardProps {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'outlined';
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function ModernCard({ 
  children, 
  variant = 'default', 
  className = '',
  hover = true,
  onClick
}: ModernCardProps) {
  const variantClasses = {
    default: 'bg-card border border-border shadow-lg',
    glass: 'glass-card',
    gradient: 'gradient-primary text-white shadow-xl',
    outlined: 'bg-transparent border-2 border-primary/30 shadow-md'
  };

  return (
    <motion.div
      className={cn(
        'rounded-xl p-6 transition-all duration-150',
        variantClasses[variant],
        hover && 'hover-lift cursor-pointer',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={hover ? { y: -4 } : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Glass card with custom blur
export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn('glass-card p-6 rounded-xl', className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  );
}

// Gradient card with animation
export function GradientCard({ 
  children, 
  gradient = 'primary',
  className = '' 
}: { 
  children: ReactNode; 
  gradient?: 'primary' | 'accent';
  className?: string;
}) {
  const gradientClass = gradient === 'primary' ? 'gradient-primary' : 'gradient-accent';
  
  return (
    <motion.div
      className={cn(
        'rounded-xl p-6 text-white shadow-2xl',
        gradientClass,
        className
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.05, rotate: 1 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
}
