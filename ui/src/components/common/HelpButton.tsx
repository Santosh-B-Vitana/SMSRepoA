import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface HelpButtonProps {
  title?: string;
  content: string | React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
}

export function HelpButton({ title, content, size = 'sm' }: HelpButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : 'default'}
          className="h-auto p-1"
        >
          <HelpCircle className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {title && <h4 className="font-medium mb-2">{title}</h4>}
        {typeof content === 'string' ? (
          <p className="text-sm text-muted-foreground">{content}</p>
        ) : (
          content
        )}
      </PopoverContent>
    </Popover>
  );
}
