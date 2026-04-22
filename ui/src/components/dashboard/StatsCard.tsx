import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  className = "",
  onClick
}: StatsCardProps) {
  return (
    <div 
      className={`
        glass-card hover-lift animate-bounce-in group cursor-pointer
        transition-all duration-300 
        hover:border-primary/30 hover:shadow-xl
        ${className} 
        ${onClick ? 'active:scale-95' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="mobile-text font-medium text-muted-foreground truncate transition-colors group-hover:text-foreground/80">
            {title}
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground transition-all group-hover:text-primary group-hover:scale-105">
            {value}
          </p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1 transition-opacity group-hover:opacity-100">
              <span className={trend.value > 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                {trend.value > 0 ? '↗' : '↘'} {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="ml-1">{trend.label}</span>
            </p>
          )}
        </div>
        <div className="p-3 sm:p-4 gradient-primary rounded-xl flex-shrink-0 transition-all duration-150 group-hover:scale-110 group-hover:rotate-3 shadow-lg">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white transition-transform group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
}
