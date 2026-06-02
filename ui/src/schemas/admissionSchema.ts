import { z } from "zod";

// ── India-specific helpers ───────────────────────────────────────────────────

const aadharRegex = /^\d{12}$/;
const phoneRegex  = /^[6-9]\d{9}$/;
const pincodeRegex = /^\d{6}$/;

// ── Step schemas (validated individually on each step) ──────────────────────

export const admissionStudentInfoSchema = z.object({
  firstName:    z.string().min(2, "First name must be at least 2 characters"),
  lastName:     z.string().min(1, "Last name is required"),
  dateOfBirth:  z.string().min(1, "Date of birth is required"),
  gender:       z.enum(["Male", "Female", "Other", "Prefer not to say"], {
    errorMap: () => ({ message: "Please select a gender" }),
  }),
  bloodGroup:   z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]).optional(),
  aadharNumber: z.string().optional().refine(
    (v) => !v || aadharRegex.test(v),
    { message: "Aadhar number must be exactly 12 digits" }
  ),
  nationality:  z.string().optional(),
  religion:     z.string().optional(),
  category:     z.enum(["General", "OBC", "SC", "ST", "EWS", "Other"]).optional(),
});

export const admissionContactSchema = z.object({
  email:   z.string().email("Enter a valid email address"),
  phone:   z.string().refine((v) => phoneRegex.test(v), {
    message: "Enter a valid 10-digit Indian mobile number",
  }),
  address: z.string().min(5, "Address is required"),
  city:    z.string().min(2, "City is required"),
  state:   z.string().min(2, "State is required"),
  pincode: z.string().refine((v) => pincodeRegex.test(v), {
    message: "Pincode must be 6 digits",
  }),
});

export const admissionAcademicSchema = z.object({
  classAppliedFor:    z.string().min(1, "Class is required"),
  academicYearId:     z
    .string()
    .min(1, "Academic year is required")
    .regex(/^\d{4}(-\d{2,4})?$/, "Format: YYYY or YYYY-YY (e.g. 2025-26)"),
  previousSchool:     z.string().optional(),
  previousClass:      z.string().optional(),
  previousPercentage: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), {
      message: "Percentage must be between 0 and 100",
    }),
  transferCertificateNo: z.string().optional(),
});

export const admissionParentSchema = z.object({
  fatherName:       z.string().min(2, "Father's name is required"),
  fatherOccupation: z.string().optional(),
  fatherPhone:      z
    .string()
    .optional()
    .refine((v) => !v || phoneRegex.test(v), {
      message: "Enter a valid 10-digit mobile number",
    }),
  motherName:       z.string().optional(),
  motherOccupation: z.string().optional(),
  motherPhone:      z
    .string()
    .optional()
    .refine((v) => !v || phoneRegex.test(v), {
      message: "Enter a valid 10-digit mobile number",
    }),
  guardianPhone:    z.string().optional(),
  annualIncome:     z.string().optional(),
});

export const admissionAdditionalSchema = z.object({
  hasSpecialNeeds:    z.boolean().default(false),
  specialNeedsDetails: z.string().optional(),
  extracurricular:    z.string().optional(),
  medicalConditions:  z.string().optional(),
  remarks:            z.string().optional(),
});

// ── Full schema (used on final submit) ──────────────────────────────────────

export const admissionSchema = admissionStudentInfoSchema
  .merge(admissionContactSchema)
  .merge(admissionAcademicSchema)
  .merge(admissionParentSchema)
  .merge(admissionAdditionalSchema);

export type AdmissionFormData = z.infer<typeof admissionSchema>;

export const STEP_SCHEMAS = [
  admissionStudentInfoSchema,
  admissionContactSchema,
  admissionAcademicSchema,
  admissionParentSchema,
  admissionAdditionalSchema,
] as const;

export const STEP_LABELS = [
  "Student Info",
  "Contact",
  "Academic",
  "Parents",
  "Additional",
] as const;

export const STEPS_COUNT = STEP_LABELS.length;
