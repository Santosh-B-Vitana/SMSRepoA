import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileQuestion, 
  Users, 
  BookOpen, 
  Calendar,
  DollarSign,
  Bus,
  Home,
  FileText,
  GraduationCap,
  UserPlus,
  Plus
} from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  variant?: 'default' | 'compact';
}

const iconMap = {
  students: Users,
  staff: UserPlus,
  books: BookOpen,
  attendance: Calendar,
  fees: DollarSign,
  transport: Bus,
  hostel: Home,
  documents: FileText,
  exams: GraduationCap,
  default: FileQuestion
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  variant = 'default' 
}: EmptyStateProps) {
  const Icon = icon || FileQuestion;

  if (variant === 'compact') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          {typeof Icon === 'function' ? <Icon className="h-6 w-6 text-muted-foreground" /> : Icon}
        </div>
        <p className="text-sm text-muted-foreground mb-3">{title}</p>
        {action && (
          <Button onClick={action.onClick} size="sm" variant="outline">
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
          {typeof Icon === 'function' ? <Icon className="h-10 w-10 text-muted-foreground" /> : Icon}
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        
        {description && (
          <p className="text-muted-foreground text-center max-w-md mb-6">
            {description}
          </p>
        )}
        
        {action && (
          <Button onClick={action.onClick} size="lg">
            {action.icon || <Plus className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Preset empty states for common scenarios
export const EmptyStates = {
  Students: (onAdd?: () => void) => (
    <EmptyState
      icon={<Users className="h-10 w-10 text-muted-foreground" />}
      title="No students found"
      description="Start by adding your first student to the system"
      action={onAdd ? {
        label: 'Add Student',
        onClick: onAdd,
        icon: <Plus className="h-4 w-4 mr-2" />
      } : undefined}
    />
  ),
  
  Staff: (onAdd?: () => void) => (
    <EmptyState
      icon={<UserPlus className="h-10 w-10 text-muted-foreground" />}
      title="No staff members found"
      description="Add staff members to manage your school operations"
      action={onAdd ? {
        label: 'Add Staff',
        onClick: onAdd,
        icon: <Plus className="h-4 w-4 mr-2" />
      } : undefined}
    />
  ),
  
  NoResults: () => (
    <EmptyState
      icon={<FileQuestion className="h-10 w-10 text-muted-foreground" />}
      title="No results found"
      description="Try adjusting your filters or search terms"
      variant="compact"
    />
  ),
  
  NoData: (entityName: string) => (
    <EmptyState
      icon={<FileQuestion className="h-10 w-10 text-muted-foreground" />}
      title={`No ${entityName} found`}
      description={`There are no ${entityName} to display at this time`}
      variant="compact"
    />
  )
};
