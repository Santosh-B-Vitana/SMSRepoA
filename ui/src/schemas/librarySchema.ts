import { z } from "zod";

// ── Book / Catalogue Schema ─────────────────────────────────────────────────
export const libraryBookSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  author: z.string().min(2, "Author name is required").max(200),
  isbn: z
    .string()
    .regex(/^(97[89])?\d{9}[\dX]$/, "Invalid ISBN (10 or 13 digits)")
    .optional()
    .or(z.literal("")),
  publisher: z.string().max(100).optional().or(z.literal("")),
  publicationYear: z.coerce
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .optional(),
  edition: z.string().max(20).optional().or(z.literal("")),
  category: z.string().min(1, "Category is required").max(100),
  subject: z.string().max(100).optional().or(z.literal("")),
  language: z.string().max(50).default("English"),
  totalCopies: z.coerce
    .number()
    .int("Must be a whole number")
    .min(1, "At least 1 copy required")
    .max(1000),
  shelfNumber: z.string().max(20).optional().or(z.literal("")),
  rackNumber: z.string().max(20).optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchasePrice: z.coerce.number().min(0).optional(),
  condition: z.enum(["new", "good", "fair", "poor"]).default("good"),
  description: z.string().max(1000).optional().or(z.literal("")),
  coverImageUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  status: z.enum(["available", "archived"]).default("available"),
});

// ── Book Issue Schema ───────────────────────────────────────────────────────
export const bookIssueSchema = z.object({
  bookId: z.string().uuid("Invalid book"),
  borrowerType: z.enum(["student", "staff"], { required_error: "Borrower type is required" }),
  borrowerId: z.string().uuid("Borrower is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  remarks: z.string().max(500).optional().or(z.literal("")),
}).refine(
  (data) => new Date(data.dueDate) > new Date(data.issueDate),
  { message: "Due date must be after issue date", path: ["dueDate"] }
);

// ── Book Return Schema ──────────────────────────────────────────────────────
export const bookReturnSchema = z.object({
  issueId: z.string().uuid("Invalid issue record"),
  returnDate: z.string().min(1, "Return date is required"),
  condition: z.enum(["good", "damaged", "lost"]).default("good"),
  fineAmount: z.coerce.number().min(0).default(0),
  finePaid: z.boolean().default(false),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

// ── Book Reservation Schema ─────────────────────────────────────────────────
export const bookReservationSchema = z.object({
  bookId: z.string().uuid("Invalid book"),
  borrowerType: z.enum(["student", "staff"], { required_error: "Borrower type is required" }),
  borrowerId: z.string().uuid("Borrower is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type LibraryBookFormData = z.infer<typeof libraryBookSchema>;
export type BookIssueFormData = z.infer<typeof bookIssueSchema>;
export type BookReturnFormData = z.infer<typeof bookReturnSchema>;
export type BookReservationFormData = z.infer<typeof bookReservationSchema>;
