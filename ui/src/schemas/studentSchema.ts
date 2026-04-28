import { z } from "zod";

// ── India-specific enums ────────────────────────────────────────────────────
export const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
export const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] as const;
export const CATEGORY_OPTIONS = ["General", "OBC", "SC", "ST", "EWS", "Other"] as const;
export const STUDENT_STATUS_OPTIONS = ["active", "inactive", "alumni", "suspended", "transferred"] as const;

// ── Step 0: Basic Info ──────────────────────────────────────────────────────
export const studentBasicInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  middleName: z.string().max(50).optional().or(z.literal("")),
  lastName: z.string().min(1, "Last name is required").max(50),
  admissionNumber: z.string().min(1, "Admission number is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(GENDER_OPTIONS, { required_error: "Gender is required" }),
  category: z.enum(CATEGORY_OPTIONS).default("General"),
  academicYearId: z.string().uuid("Invalid academic year"),
  currentClassId: z.string().uuid("Invalid class"),
  currentSectionId: z.string().uuid("Invalid section"),
  admissionDate: z.string().min(1, "Admission date is required"),
  status: z.enum(STUDENT_STATUS_OPTIONS).default("active"),
  nationality: z.string().max(50).optional().or(z.literal("")),
  religion: z.string().max(50).optional().or(z.literal("")),
  caste: z.string().max(50).optional().or(z.literal("")),
  motherTongue: z.string().max(50).optional().or(z.literal("")),
});

// ── Step 1: Contact & Address ───────────────────────────────────────────────
export const studentContactSchema = z.object({
  address: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required").max(50),
  state: z.string().min(1, "State is required").max(50),
  pinCode: z
    .string()
    .regex(/^\d{6}$/, "PIN code must be 6 digits")
    .optional()
    .or(z.literal("")),
  permanentAddress: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
});

// ── Step 2: Guardian ────────────────────────────────────────────────────────
export const studentGuardianSchema = z.object({
  fatherName: z.string().min(2, "Father's name is required").max(100),
  fatherPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  fatherOccupation: z.string().max(100).optional().or(z.literal("")),
  fatherEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  motherName: z.string().min(2, "Mother's name is required").max(100),
  motherPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  motherOccupation: z.string().max(100).optional().or(z.literal("")),
  emergencyContactName: z.string().max(100).optional().or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  guardianAadhar: z
    .string()
    .regex(/^\d{12}$/, "Aadhar must be 12 digits")
    .optional()
    .or(z.literal("")),
  parentPortalAccess: z.boolean().default(false),
});

// ── Step 3: Identification ──────────────────────────────────────────────────
export const studentIdentificationSchema = z.object({
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhar must be 12 digits")
    .optional()
    .or(z.literal("")),
  birthCertificateNumber: z.string().max(50).optional().or(z.literal("")),
  previousSchool: z.string().max(200).optional().or(z.literal("")),
  previousClass: z.string().max(20).optional().or(z.literal("")),
  tcNumber: z.string().max(50).optional().or(z.literal("")),
  transportRequired: z.boolean().default(false),
  hostelRequired: z.boolean().default(false),
});

// ── Step 4: Medical ─────────────────────────────────────────────────────────
export const studentMedicalSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUP_OPTIONS).optional(),
  allergies: z.string().max(500).optional().or(z.literal("")),
  chronicConditions: z.string().max(500).optional().or(z.literal("")),
  medications: z.string().max(500).optional().or(z.literal("")),
  doctorName: z.string().max(100).optional().or(z.literal("")),
  doctorPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  specialNeeds: z.string().max(500).optional().or(z.literal("")),
  photoConsent: z.boolean().default(false),
  medicalConsent: z.boolean().default(false),
});

// ── Combined schema ─────────────────────────────────────────────────────────
export const studentSchema = studentBasicInfoSchema
  .merge(studentContactSchema)
  .merge(studentGuardianSchema)
  .merge(studentIdentificationSchema)
  .merge(studentMedicalSchema);

export type StudentFormData = z.infer<typeof studentSchema>;
export type StudentBasicInfoData = z.infer<typeof studentBasicInfoSchema>;
export type StudentContactData = z.infer<typeof studentContactSchema>;
export type StudentGuardianData = z.infer<typeof studentGuardianSchema>;
export type StudentIdentificationData = z.infer<typeof studentIdentificationSchema>;
export type StudentMedicalData = z.infer<typeof studentMedicalSchema>;

export const STUDENT_STEP_SCHEMAS = [
  studentBasicInfoSchema,
  studentContactSchema,
  studentGuardianSchema,
  studentIdentificationSchema,
  studentMedicalSchema,
] as const;

export const STUDENT_STEP_LABELS = [
  "Basic Info",
  "Contact & Address",
  "Guardian Details",
  "ID & Documents",
  "Medical Info",
] as const;
