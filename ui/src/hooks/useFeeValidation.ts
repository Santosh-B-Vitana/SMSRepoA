import { useState } from 'react';
import { ZodSchema, ZodError } from 'zod';

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Custom hook for form validation using Zod schemas
 */
export function useFeeValidation<T>(schema: ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const validate = (data: unknown): ValidationResult<T> => {
    try {
      const validatedData = schema.parse(data);
      setErrors({});
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }
          formattedErrors[path].push(err.message);
        });
        
        setErrors(formattedErrors);
        return { success: false, errors: formattedErrors };
      }
      
      return { 
        success: false, 
        errors: { _general: ['Validation failed'] } 
      };
    }
  };

  const clearErrors = () => {
    setErrors({});
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return {
    validate,
    errors,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}
