import { useState } from 'react';
import { z } from 'zod';
import { formatZodErrors } from '@/utils/formValidation';

export function useFormValidation<T extends z.ZodType>(schema: T) {
  type FormData = z.infer<T>;
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validate = async (data: unknown): Promise<{ success: boolean; data?: FormData }> => {
    setIsValidating(true);
    setErrors({});

    try {
      const validated = await schema.parseAsync(data);
      setIsValidating(false);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatZodErrors(error);
        setErrors(formattedErrors);
        setIsValidating(false);
        return { success: false };
      }
      setIsValidating(false);
      throw error;
    }
  };

  const validateField = async (fieldName: string, value: unknown): Promise<boolean> => {
    try {
      // Try to validate just this field if it's an object schema
      if (schema instanceof z.ZodObject) {
        const shape = schema.shape as Record<string, z.ZodTypeAny>;
        const fieldSchema = shape[fieldName];
        if (fieldSchema) {
          await fieldSchema.parseAsync(value);
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldName];
            return newErrors;
          });
          return true;
        }
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: error.errors[0].message
        }));
        return false;
      }
      return false;
    }
  };

  const clearErrors = () => {
    setErrors({});
  };

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  return {
    errors,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0
  };
}
