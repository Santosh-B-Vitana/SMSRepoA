import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  keyExtractor: (row: T) => string;
}

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyState,
  keyExtractor
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row) => (
          <Card
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          >
            <CardContent className="p-4 space-y-3">
              {columns
                .filter(col => !col.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                      {column.mobileLabel || column.label}:
                    </span>
                    <span className="text-sm text-right flex-1">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// Utility function to render common cell types
export const CellRenderers = {
  Badge: (value: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default') => (
    <Badge variant={variant}>{value}</Badge>
  ),
  
  Date: (value: string) => (
    <span>{new Date(value).toLocaleDateString()}</span>
  ),
  
  DateTime: (value: string) => (
    <span>{new Date(value).toLocaleString()}</span>
  ),
  
  Currency: (value: number, currency: string = 'INR') => (
    <span>
      {new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency
      }).format(value)}
    </span>
  ),
  
  Boolean: (value: boolean, trueText: string = 'Yes', falseText: string = 'No') => (
    <Badge variant={value ? 'default' : 'secondary'}>
      {value ? trueText : falseText}
    </Badge>
  )
};
