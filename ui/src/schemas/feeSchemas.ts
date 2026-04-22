import { z } from "zod";

/**
 * Fee Structure Schema
 * Validates fee structure creation and updates
 */
export const feeStructureSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  class: z.string()
    .min(1, "Class is required")
    .max(10, "Class must be less than 10 characters"),
  academicYear: z.string()
    .regex(/^\d{4}-\d{2}$/, "Academic year must be in format YYYY-YY (e.g., 2024-25)"),
  components: z.object({
    tuitionFee: z.number()
      .min(0, "Tuition fee cannot be negative")
      .max(1000000, "Tuition fee exceeds maximum limit"),
    admissionFee: z.number()
      .min(0, "Admission fee cannot be negative")
      .max(1000000, "Admission fee exceeds maximum limit"),
    examFee: z.number()
      .min(0, "Exam fee cannot be negative")
      .max(1000000, "Exam fee exceeds maximum limit"),
    libraryFee: z.number()
      .min(0, "Library fee cannot be negative")
      .max(1000000, "Library fee exceeds maximum limit"),
    labFee: z.number()
      .min(0, "Lab fee cannot be negative")
      .max(1000000, "Lab fee exceeds maximum limit"),
    sportsFee: z.number()
      .min(0, "Sports fee cannot be negative")
      .max(1000000, "Sports fee exceeds maximum limit"),
    miscellaneous: z.number()
      .min(0, "Miscellaneous fee cannot be negative")
      .max(1000000, "Miscellaneous fee exceeds maximum limit"),
  }),
  installments: z.object({
    count: z.number()
      .min(1, "At least 1 installment required")
      .max(12, "Maximum 12 installments allowed"),
    amounts: z.array(z.number().min(0)),
    dueDates: z.array(z.string()),
  }).refine(
    (data) => data.amounts.length === data.count && data.dueDates.length === data.count,
    "Installment amounts and due dates must match the count"
  ),
});

/**
 * Payment Schema
 * Validates payment transactions
 */
export const paymentSchema = z.object({
  studentId: z.string()
    .min(1, "Student ID is required")
    .max(50, "Student ID must be less than 50 characters"),
  amount: z.number()
    .min(1, "Payment amount must be at least ₹1")
    .max(10000000, "Payment amount exceeds maximum limit"),
  method: z.enum(["cash", "razorpay", "payu", "phonepe", "googlepay", "bank_transfer", "cheque"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  remarks: z.string()
    .max(500, "Remarks must be less than 500 characters")
    .optional(),
});

/**
 * Fee Record Filter Schema
 * Validates fee record filters
 */
export const feeFilterSchema = z.object({
  searchTerm: z.string()
    .max(100, "Search term must be less than 100 characters")
    .optional(),
  class: z.string()
    .max(10, "Class must be less than 10 characters")
    .optional(),
  section: z.string()
    .max(5, "Section must be less than 5 characters")
    .optional(),
  status: z.enum(["paid", "pending", "overdue", "partial"]).optional(),
  academicYear: z.string()
    .regex(/^\d{4}-\d{2}$/, "Academic year must be in format YYYY-YY")
    .optional(),
});

/**
 * Fee Concession Schema
 * Validates fee concession/discount
 */
export const feeConcessionSchema = z.object({
  studentId: z.string()
    .min(1, "Student ID is required")
    .max(50, "Student ID must be less than 50 characters"),
  concessionType: z.enum(["percentage", "fixed"], {
    errorMap: () => ({ message: "Concession type must be either percentage or fixed" }),
  }),
  amount: z.number()
    .min(0, "Concession amount cannot be negative"),
  reason: z.string()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be less than 500 characters"),
  validFrom: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  validTo: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
}).refine(
  (data) => {
    if (data.concessionType === "percentage") {
      return data.amount <= 100;
    }
    return true;
  },
  {
    message: "Percentage concession cannot exceed 100%",
    path: ["amount"],
  }
);

/**
 * Bulk Payment Schema
 * Validates bulk payment operations
 */
export const bulkPaymentSchema = z.object({
  studentIds: z.array(z.string())
    .min(1, "At least one student must be selected")
    .max(100, "Cannot process more than 100 students at once"),
  amount: z.number()
    .min(1, "Payment amount must be at least ₹1")
    .max(10000000, "Payment amount exceeds maximum limit"),
  method: z.enum(["cash", "razorpay", "payu", "phonepe", "googlepay", "bank_transfer", "cheque"]),
});

// Type exports for use in components
export type FeeStructureInput = z.infer<typeof feeStructureSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type FeeFilterInput = z.infer<typeof feeFilterSchema>;
export type FeeConcessionInput = z.infer<typeof feeConcessionSchema>;
export type BulkPaymentInput = z.infer<typeof bulkPaymentSchema>;
