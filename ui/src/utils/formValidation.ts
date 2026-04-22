import { z } from 'zod';

// Common validation schemas
export const validationSchemas = {
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Invalid phone number'),
  required: (fieldName: string) => z.string().min(1, `${fieldName} is required`),
  minLength: (fieldName: string, min: number) => 
    z.string().min(min, `${fieldName} must be at least ${min} characters`),
  maxLength: (fieldName: string, max: number) => 
    z.string().max(max, `${fieldName} must not exceed ${max} characters`),
  number: (fieldName: string) => 
    z.number({ required_error: `${fieldName} is required` }),
  positiveNumber: (fieldName: string) => 
    z.number().positive(`${fieldName} must be positive`),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  url: z.string().url('Invalid URL'),
  alphanumeric: (fieldName: string) =>
    z.string().regex(/^[a-zA-Z0-9]+$/, `${fieldName} must contain only letters and numbers`),
};

// Student form validation
export const studentFormSchema = z.object({
  firstName: validationSchemas.required('First name'),
  lastName: validationSchemas.required('Last name'),
  email: validationSchemas.email.optional().or(z.literal('')),
  phone: validationSchemas.phone.optional().or(z.literal('')),
  dateOfBirth: validationSchemas.date,
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  class: validationSchemas.required('Class'),
  section: validationSchemas.required('Section'),
  rollNumber: validationSchemas.required('Roll number'),
  admissionDate: validationSchemas.date,
  address: validationSchemas.required('Address'),
  guardianName: validationSchemas.required('Guardian name'),
  guardianPhone: validationSchemas.phone,
  guardianEmail: validationSchemas.email.optional().or(z.literal('')),
});

// Staff form validation
export const staffFormSchema = z.object({
  firstName: validationSchemas.required('First name'),
  lastName: validationSchemas.required('Last name'),
  email: validationSchemas.email,
  phone: validationSchemas.phone,
  dateOfBirth: validationSchemas.date,
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  designation: validationSchemas.required('Designation'),
  department: validationSchemas.required('Department'),
  joiningDate: validationSchemas.date,
  salary: validationSchemas.positiveNumber('Salary'),
  address: validationSchemas.required('Address'),
  qualification: validationSchemas.required('Qualification'),
  experience: validationSchemas.number('Experience'),
});

// Fee structure validation
export const feeStructureSchema = z.object({
  name: validationSchemas.required('Fee name'),
  amount: validationSchemas.positiveNumber('Amount'),
  class: validationSchemas.required('Class'),
  term: z.enum(['monthly', 'quarterly', 'half-yearly', 'yearly'], { 
    required_error: 'Term is required' 
  }),
  dueDate: validationSchemas.date,
  description: z.string().optional(),
});

// Exam form validation
export const examFormSchema = z.object({
  name: validationSchemas.required('Exam name'),
  class: validationSchemas.required('Class'),
  subject: validationSchemas.required('Subject'),
  date: validationSchemas.date,
  time: validationSchemas.required('Time'),
  duration: validationSchemas.positiveNumber('Duration'),
  maxMarks: validationSchemas.positiveNumber('Maximum marks'),
  passingMarks: validationSchemas.positiveNumber('Passing marks'),
}).refine((data) => data.passingMarks <= data.maxMarks, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passingMarks'],
});

// Book form validation
export const bookFormSchema = z.object({
  title: validationSchemas.required('Title'),
  author: validationSchemas.required('Author'),
  isbn: validationSchemas.required('ISBN').regex(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, 'Invalid ISBN'),
  publisher: validationSchemas.required('Publisher'),
  category: validationSchemas.required('Category'),
  totalCopies: validationSchemas.positiveNumber('Total copies'),
  availableCopies: validationSchemas.number('Available copies'),
  publicationYear: z.number().min(1900).max(new Date().getFullYear()),
}).refine((data) => data.availableCopies <= data.totalCopies, {
  message: 'Available copies cannot exceed total copies',
  path: ['availableCopies'],
});

// Announcement form validation
export const announcementFormSchema = z.object({
  title: validationSchemas.required('Title'),
  content: validationSchemas.required('Content'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    required_error: 'Priority is required'
  }),
  targetAudience: z.array(z.string()).min(1, 'Select at least one audience'),
  scheduledDate: validationSchemas.date.optional(),
  expiryDate: validationSchemas.date.optional(),
}).refine((data) => {
  if (data.scheduledDate && data.expiryDate) {
    return new Date(data.scheduledDate) < new Date(data.expiryDate);
  }
  return true;
}, {
  message: 'Expiry date must be after scheduled date',
  path: ['expiryDate'],
});

// Transport route validation
export const transportRouteSchema = z.object({
  routeName: validationSchemas.required('Route name'),
  routeNumber: validationSchemas.required('Route number'),
  vehicleNumber: validationSchemas.required('Vehicle number'),
  driverName: validationSchemas.required('Driver name'),
  driverPhone: validationSchemas.phone,
  capacity: validationSchemas.positiveNumber('Capacity'),
  fare: validationSchemas.positiveNumber('Fare'),
  stops: z.array(z.object({
    name: z.string(),
    time: z.string()
  })).min(2, 'Route must have at least 2 stops'),
});

// Validation error formatter
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

// Generic form validator
export async function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatZodErrors(error) };
    }
    throw error;
  }
}
