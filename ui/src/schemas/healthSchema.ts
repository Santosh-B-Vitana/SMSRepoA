import { z } from "zod";

// ── Health Record Schema ────────────────────────────────────────────────────
export const healthRecordSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  recordType: z.enum(
    ["checkup", "vaccination", "illness", "injury", "allergy", "dental", "vision"],
    { required_error: "Record type is required" }
  ),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(5, "Description is required").max(1000),
  treatedBy: z.string().min(2, "Treated/examined by is required").max(100),
  medication: z.string().max(500).optional().or(z.literal("")),
  dosage: z.string().max(200).optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "resolved", "ongoing", "referred"]).default("active"),
  priority: z.enum(["low", "medium", "high", "emergency"]).default("medium"),
  parentNotified: z.boolean().default(false),
  notes: z.string().max(1000).optional().or(z.literal("")),
  attachmentUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

// ── Vaccination Schema ──────────────────────────────────────────────────────
export const vaccinationSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  vaccineName: z.string().min(2, "Vaccine name is required").max(100),
  date: z.string().min(1, "Date is required"),
  nextDueDate: z.string().optional().or(z.literal("")),
  batchNumber: z.string().max(50).optional().or(z.literal("")),
  administeredBy: z.string().min(2, "Administered by is required").max(100),
  location: z.string().max(100).optional().or(z.literal("")),
  sideEffects: z.string().max(500).optional().or(z.literal("")),
  status: z.enum(["completed", "due", "overdue", "waived"]).default("completed"),
  parentConsent: z.boolean().default(false),
});

// ── Medical Profile Schema ──────────────────────────────────────────────────
export const medicalProfileSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"])
    .optional(),
  height: z.coerce.number().min(50).max(250).optional(),
  weight: z.coerce.number().min(2).max(200).optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  emergencyContactName: z.string().min(2, "Emergency contact name is required").max(100),
  emergencyContactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  doctorName: z.string().max(100).optional().or(z.literal("")),
  doctorPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  insuranceProvider: z.string().max(100).optional().or(z.literal("")),
  insuranceNumber: z.string().max(50).optional().or(z.literal("")),
  specialNeeds: z.string().max(1000).optional().or(z.literal("")),
  dietaryRestrictions: z.string().max(500).optional().or(z.literal("")),
  photoConsent: z.boolean().default(false),
  medicalConsent: z.boolean().default(false),
});

export type HealthRecordFormData = z.infer<typeof healthRecordSchema>;
export type VaccinationFormData = z.infer<typeof vaccinationSchema>;
export type MedicalProfileFormData = z.infer<typeof medicalProfileSchema>;
