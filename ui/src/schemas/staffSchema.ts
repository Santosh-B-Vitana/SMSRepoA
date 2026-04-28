import { z } from "zod";

// ── India-specific helpers ───────────────────────────────────────────────────

const phoneRegex   = /^[6-9]\d{9}$/;
const aadharRegex  = /^\d{12}$/;
const panRegex     = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const ifscRegex    = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const pfRegex      = /^[A-Z]{2}\/[A-Z]+\/\d+\/\d+\/\d+$/;

// ── Step 0: Basic Information ────────────────────────────────────────────────

export const staffBasicInfoSchema = z.object({
  firstName:   z.string().min(2, "First name must be at least 2 characters"),
  lastName:    z.string().min(1, "Last name is required"),
  designation: z.string().min(2, "Designation is required"),
  department:  z.string().min(2, "Department is required"),
  email:       z.string().email("Enter a valid email address"),
  phone:       z.string().refine((v) => phoneRegex.test(v), {
    message: "Enter a valid 10-digit Indian mobile number",
  }),
  joiningDate: z.string().min(1, "Joining date is required"),
  subjects:    z.array(z.string()).optional(),
  status:      z.enum(["active", "inactive", "on_leave", "probation", "resigned", "terminated"]).default("active"),
  address:     z.string().optional(),
});

// ── Step 1: Personal Information ─────────────────────────────────────────────

export const staffPersonalInfoSchema = z.object({
  dob:           z.string().optional(),
  gender:        z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),
  nationality:   z.string().optional(),
  religion:      z.string().optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed", "Separated"]).optional(),
});

// ── Step 2: Professional Information ────────────────────────────────────────

export const staffProfessionalInfoSchema = z.object({
  experience:       z.number().min(0).optional(),
  confirmationDate: z.string().optional(),
  employmentType:   z
    .enum(["full_time", "part_time", "contract", "guest", "volunteer", "intern"])
    .optional(),
  workingDays:      z.string().optional(),
  leaveEntitlement: z.number().min(0).optional(),
  salary:           z.number().min(0).optional(),
  specialization:   z.string().optional(),
  reportingToId:    z.string().optional(),
  classes:          z.array(z.string()).optional(),
});

// ── Step 3: Identification & Banking ────────────────────────────────────────

export const staffIdentificationSchema = z.object({
  aadharNumber:      z
    .string()
    .optional()
    .refine((v) => !v || aadharRegex.test(v), {
      message: "Aadhar number must be exactly 12 digits",
    }),
  panNumber:         z
    .string()
    .optional()
    .refine((v) => !v || panRegex.test(v), {
      message: "PAN must be in format ABCDE1234F",
    }),
  passportNumber:    z.string().optional(),
  licenseNumber:     z.string().optional(),
  permanentAddress:  z.string().optional(),
  city:              z.string().optional(),
  state:             z.string().optional(),
  pincode:           z.string().optional(),
  bankName:          z.string().optional(),
  bankAccountNumber: z.string().optional(),
  ifscCode:          z
    .string()
    .optional()
    .refine((v) => !v || ifscRegex.test(v), {
      message: "IFSC code format: ABCD0123456",
    }),
  pfNumber:          z
    .string()
    .optional()
    .refine((v) => !v || pfRegex.test(v), {
      message: "PF number format: XX/REGION/EST/001/00001",
    }),
  esiNumber:         z.string().optional(),
  uanNumber:         z.string().optional(),
});

// ── Step 4: Medical Information ──────────────────────────────────────────────

export const staffMedicalInfoSchema = z.object({
  bloodGroup:                   z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"])
    .optional(),
  allergies:                    z.string().optional(),
  chronicConditions:            z.string().optional(),
  emergencyContactName:         z.string().optional(),
  emergencyContactPhone:        z
    .string()
    .optional()
    .refine((v) => !v || phoneRegex.test(v), {
      message: "Enter a valid 10-digit mobile number",
    }),
  emergencyContactRelationship: z.string().optional(),
  doctorName:                   z.string().optional(),
  doctorPhone:                  z
    .string()
    .optional()
    .refine((v) => !v || phoneRegex.test(v), {
      message: "Enter a valid 10-digit mobile number",
    }),
});

// ── Step 5: Compliance & Education ──────────────────────────────────────────

export const staffComplianceSchema = z.object({
  highestQualification: z.string().optional(),
  university:           z.string().optional(),
  passingYear:          z
    .number()
    .min(1950)
    .max(new Date().getFullYear())
    .optional(),
  backgroundVerified:   z.boolean().default(false),
  policeClearance:      z.boolean().default(false),
  medicalCheckup:       z.boolean().default(false),
  documentConsent:      z.boolean().default(false),
});

// ── Full schema ──────────────────────────────────────────────────────────────

export const staffSchema = staffBasicInfoSchema
  .merge(staffPersonalInfoSchema)
  .merge(staffProfessionalInfoSchema)
  .merge(staffIdentificationSchema)
  .merge(staffMedicalInfoSchema)
  .merge(staffComplianceSchema);

export type StaffFormData = z.infer<typeof staffSchema>;

export const STAFF_STEP_SCHEMAS = [
  staffBasicInfoSchema,
  staffPersonalInfoSchema,
  staffProfessionalInfoSchema,
  staffIdentificationSchema,
  staffMedicalInfoSchema,
  staffComplianceSchema,
] as const;

export const STAFF_STEP_LABELS = [
  "Basic Info",
  "Personal",
  "Professional",
  "ID & Banking",
  "Medical",
  "Compliance",
] as const;

export const STAFF_STEPS_COUNT = STAFF_STEP_LABELS.length;
