import { z } from "zod";

// ── Announcement Enums ──────────────────────────────────────────────────────
export const ANNOUNCEMENT_PRIORITY = ["low", "medium", "high", "urgent"] as const;
export const ANNOUNCEMENT_AUDIENCE = [
  "all", "students", "parents", "staff", "teachers", "management",
] as const;
export const ANNOUNCEMENT_CATEGORY = [
  "general", "academic", "event", "holiday", "exam", "sports",
  "result", "fee", "emergency", "other",
] as const;

// ── Announcement Schema ─────────────────────────────────────────────────────
export const announcementSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title is too long"),
    content: z
      .string()
      .min(10, "Content must be at least 10 characters")
      .max(5000, "Content is too long"),
    priority: z.enum(ANNOUNCEMENT_PRIORITY, {
      required_error: "Priority is required",
    }),
    category: z.enum(ANNOUNCEMENT_CATEGORY, {
      required_error: "Category is required",
    }).default("general"),
    targetAudience: z
      .array(z.enum(ANNOUNCEMENT_AUDIENCE))
      .min(1, "Select at least one target audience"),
    scheduledDate: z.string().optional().or(z.literal("")),
    expiryDate: z.string().optional().or(z.literal("")),
    isPublished: z.boolean().default(false),
    allowComments: z.boolean().default(false),
    sendNotification: z.boolean().default(true),
    sendSms: z.boolean().default(false),
    sendEmail: z.boolean().default(false),
    attachmentUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    classIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      if (data.scheduledDate && data.expiryDate) {
        return new Date(data.expiryDate) > new Date(data.scheduledDate);
      }
      return true;
    },
    {
      message: "Expiry date must be after scheduled date",
      path: ["expiryDate"],
    }
  );

// ── Label maps for UI ───────────────────────────────────────────────────────
export const PRIORITY_LABELS: Record<typeof ANNOUNCEMENT_PRIORITY[number], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const AUDIENCE_LABELS: Record<typeof ANNOUNCEMENT_AUDIENCE[number], string> = {
  all: "Everyone",
  students: "Students",
  parents: "Parents",
  staff: "Staff",
  teachers: "Teachers",
  management: "Management",
};

export const CATEGORY_LABELS: Record<typeof ANNOUNCEMENT_CATEGORY[number], string> = {
  general: "General",
  academic: "Academic",
  event: "Event",
  holiday: "Holiday",
  exam: "Exam",
  sports: "Sports",
  result: "Result",
  fee: "Fee",
  emergency: "Emergency",
  other: "Other",
};

export type AnnouncementFormData = z.infer<typeof announcementSchema>;
