import Papa from 'papaparse';
import { z } from 'zod';

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  transform?: (value: string) => any;
  validate?: (value: any) => boolean;
}

export interface ImportOptions {
  columns: ImportColumn[];
  schema?: z.ZodSchema;
  skipEmptyRows?: boolean;
  maxRows?: number;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: ImportError[];
  stats: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: any;
}

export async function importFromCSV<T>(
  file: File,
  options: ImportOptions
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const { columns, schema, skipEmptyRows = true, maxRows } = options;
    const errors: ImportError[] = [];
    const data: T[] = [];
    let rowCount = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: skipEmptyRows,
      complete: (results) => {
        const rows = maxRows ? results.data.slice(0, maxRows) : results.data;

        rows.forEach((row: any, index: number) => {
          rowCount++;
          const rowNum = index + 2; // +2 for header row and 1-based indexing
          const processedRow: any = {};
          let hasError = false;

          // Process each column
          columns.forEach(col => {
            const value = row[col.label] || row[col.key];

            // Check required fields
            if (col.required && (!value || value.trim() === '')) {
              errors.push({
                row: rowNum,
                field: col.key,
                message: `${col.label} is required`,
                value
              });
              hasError = true;
              return;
            }

            // Transform value
            let transformedValue = value;
            if (col.transform && value) {
              try {
                transformedValue = col.transform(value);
              } catch (error) {
                errors.push({
                  row: rowNum,
                  field: col.key,
                  message: `Invalid format for ${col.label}`,
                  value
                });
                hasError = true;
                return;
              }
            }

            // Validate value
            if (col.validate && !col.validate(transformedValue)) {
              errors.push({
                row: rowNum,
                field: col.key,
                message: `Invalid value for ${col.label}`,
                value: transformedValue
              });
              hasError = true;
              return;
            }

            processedRow[col.key] = transformedValue;
          });

          // Schema validation
          if (!hasError && schema) {
            const result = schema.safeParse(processedRow);
            if (!result.success) {
              result.error.errors.forEach(err => {
                errors.push({
                  row: rowNum,
                  field: err.path.join('.'),
                  message: err.message,
                  value: processedRow[err.path[0]]
                });
              });
              hasError = true;
            }
          }

          if (!hasError) {
            data.push(processedRow as T);
          }
        });

        resolve({
          success: errors.length === 0,
          data,
          errors,
          stats: {
            total: rowCount,
            successful: data.length,
            failed: rowCount - data.length
          }
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, message: `Parse error: ${error.message}` }],
          stats: { total: 0, successful: 0, failed: 0 }
        });
      }
    });
  });
}

// Transform helpers
export const Transformers = {
  date: (value: string) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    return date.toISOString();
  },
  number: (value: string) => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) throw new Error('Invalid number');
    return num;
  },
  boolean: (value: string) => {
    const lower = value.toLowerCase().trim();
    if (['true', 'yes', '1', 'y'].includes(lower)) return true;
    if (['false', 'no', '0', 'n'].includes(lower)) return false;
    throw new Error('Invalid boolean');
  },
  email: (value: string) => value.toLowerCase().trim(),
  phone: (value: string) => value.replace(/\D/g, ''),
  uppercase: (value: string) => value.toUpperCase().trim(),
  lowercase: (value: string) => value.toLowerCase().trim(),
  trim: (value: string) => value.trim()
};

// Validators
export const Validators = {
  email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value: string) => /^\d{10}$/.test(value),
  notEmpty: (value: any) => value !== null && value !== undefined && value !== '',
  minLength: (min: number) => (value: string) => value.length >= min,
  maxLength: (max: number) => (value: string) => value.length <= max,
  pattern: (regex: RegExp) => (value: string) => regex.test(value),
  inRange: (min: number, max: number) => (value: number) => value >= min && value <= max
};
