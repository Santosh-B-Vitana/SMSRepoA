import { z } from "zod";

// ── Assignment Schema ───────────────────────────────────────────────────────
export const assignmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  subjectId: z.string().uuid("Subject is required"),
  classId: z.string().uuid("Class is required"),
  sectionId: z.string().uuid("Invalid section").optional().or(z.literal("")),
  assignedDate: z.string().min(1, "Assigned date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z.coerce
    .number()
    .min(0, "Max marks cannot be negative")
    .max(1000)
    .optional(),
  assignmentType: z
    .enum(["homework", "project", "quiz", "test", "practicals", "other"])
    .default("homework"),
  instructions: z.string().max(2000).optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  allowLateSubmission: z.boolean().default(false),
  latePenaltyPercent: z.coerce.number().min(0).max(100).optional(),
  attachments: z.array(z.string()).optional(),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.assignedDate),
  { message: "Due date must be on or after assigned date", path: ["dueDate"] }
);

// ── Assignment Submission Schema ─────────────────────────────────────────────
export const assignmentSubmissionSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment"),
  studentId: z.string().uuid("Invalid student"),
  submissionText: z.string().max(5000).optional().or(z.literal("")),
  attachments: z.array(z.string()).optional(),
  submittedAt: z.string().min(1, "Submission date is required"),
  status: z
    .enum(["pending", "submitted", "graded", "returned", "late"])
    .default("submitted"),
});

// ── Assignment Grading Schema ────────────────────────────────────────────────
export const assignmentGradingSchema = z.object({
  submissionId: z.string().uuid("Invalid submission"),
  marksObtained: z.coerce
    .number()
    .min(0, "Marks cannot be negative"),
  feedback: z.string().max(1000).optional().or(z.literal("")),
  gradedAt: z.string().min(1, "Graded date is required"),
  returnToStudent: z.boolean().default(true),
});

export type AssignmentFormData = z.infer<typeof assignmentSchema>;
export type AssignmentSubmissionFormData = z.infer<typeof assignmentSubmissionSchema>;
export type AssignmentGradingFormData = z.infer<typeof assignmentGradingSchema>;
