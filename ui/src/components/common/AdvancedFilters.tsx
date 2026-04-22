import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';

export type FilterType = 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'multiSelect';

export interface FilterField {
  key: string;
  label: string;
  type: FilterType;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface FilterValues {
  [key: string]: any;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterValues;
}

interface AdvancedFiltersProps {
  fields: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onReset?: () => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: FilterValues) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
}

export function AdvancedFilters({
  fields,
  values,
  onChange,
  onReset,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const activeFiltersCount = Object.keys(values).filter(
    key => values[key] !== undefined && values[key] !== null && values[key] !== ''
  ).length;

  const handleClear = () => {
    onChange({});
    if (onReset) onReset();
  };

  const handleSaveFilter = () => {
    if (filterName && onSaveFilter) {
      onSaveFilter(filterName, values);
      setFilterName('');
    }
  };

  const renderFilterField = (field: FilterField) => {
    const value = values[field.key];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange({ ...values, [field.key]: e.target.value })}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => onChange({ ...values, [field.key]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiSelect':
        const selectedValues = value || [];
        return (
          <div className="space-y-2">
            <Select
              onValueChange={(val) => {
                const newValues = selectedValues.includes(val)
                  ? selectedValues.filter((v: string) => v !== val)
                  : [...selectedValues, val];
                onChange({ ...values, [field.key]: newValues });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedValues.map((val: string) => (
                  <Badge key={val} variant="secondary">
                    {field.options?.find(o => o.value === val)?.label || val}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer"
                      onClick={() => {
                        const newValues = selectedValues.filter((v: string) => v !== val);
                        onChange({ ...values, [field.key]: newValues });
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : field.placeholder || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onChange({ ...values, [field.key]: date?.toISOString() })}
              />
            </PopoverContent>
          </Popover>
        );

      case 'dateRange':
        const [startDate, endDate] = value || [null, null];
        return (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(new Date(startDate), 'PPP') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) => onChange({ ...values, [field.key]: [date?.toISOString(), endDate] })}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(new Date(endDate), 'PPP') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(date) => onChange({ ...values, [field.key]: [startDate, date?.toISOString()] })}
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="space-y-2">
              <Label>Saved Filters</Label>
              <div className="space-y-2">
                {savedFilters.map(filter => (
                  <div key={filter.id} className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onLoadFilter?.(filter)}
                    >
                      {filter.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteFilter?.(filter.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Fields */}
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label>{field.label}</Label>
              {renderFilterField(field)}
            </div>
          ))}

          {/* Save Current Filter */}
          {onSaveFilter && activeFiltersCount > 0 && (
            <div className="space-y-2">
              <Label>Save Current Filter</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Filter name"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                />
                <Button onClick={handleSaveFilter} disabled={!filterName}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleClear} variant="outline" className="flex-1">
              Clear All
            </Button>
            <Button onClick={() => setOpen(false)} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Hook for managing filter state
export function useAdvancedFilters(initialValues: FilterValues = {}) {
  const [filters, setFilters] = useState<FilterValues>(initialValues);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  const saveFilter = (name: string, filterValues: FilterValues) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters: filterValues
    };
    setSavedFilters(prev => [...prev, newFilter]);
  };

  const loadFilter = (filter: SavedFilter) => {
    setFilters(filter.filters);
  };

  const deleteFilter = (id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  };

  const resetFilters = () => {
    setFilters({});
  };

  return {
    filters,
    setFilters,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    resetFilters
  };
}
