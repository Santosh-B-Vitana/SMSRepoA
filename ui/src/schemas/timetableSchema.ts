import { z } from "zod";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// ── Timetable (header) Schema ───────────────────────────────────────────────
export const timetableSchema = z.object({
  classId: z.string().uuid("Class is required"),
  sectionId: z.string().uuid("Section is required"),
  academicYearId: z.string().uuid("Academic year is required"),
  name: z.string().min(2, "Timetable name is required").max(100),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  description: z.string().max(500).optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.effectiveTo) {
      return new Date(data.effectiveTo) > new Date(data.effectiveFrom);
    }
    return true;
  },
  { message: "Effective to date must be after effective from date", path: ["effectiveTo"] }
);

// ── Period Schema ───────────────────────────────────────────────────────────
export const timetablePeriodSchema = z
  .object({
    timetableId: z.string().uuid("Timetable is required"),
    dayOfWeek: z.enum(
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      { required_error: "Day of week is required" }
    ),
    periodNumber: z.coerce.number().int().min(1).max(12),
    startTime: z.string().regex(TIME_REGEX, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(TIME_REGEX, "Invalid time format (HH:MM)"),
    type: z.enum(["class", "break", "activity", "assembly"], {
      required_error: "Period type is required",
    }),
    subjectId: z.string().uuid("Invalid subject").optional().or(z.literal("")),
    teacherId: z.string().uuid("Invalid teacher").optional().or(z.literal("")),
    room: z.string().max(50).optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      return eh * 60 + em > sh * 60 + sm;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  )
  .refine(
    (data) => {
      if (data.type === "class") {
        return !!data.subjectId && !!data.teacherId;
      }
      return true;
    },
    { message: "Subject and teacher are required for class periods", path: ["subjectId"] }
  );

// ── Working Day Configuration ───────────────────────────────────────────────
export const workingDayConfigSchema = z.object({
  academicYearId: z.string().uuid("Academic year is required"),
  workingDays: z
    .array(
      z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
    )
    .min(1, "Select at least one working day"),
  periodsPerDay: z.coerce.number().int().min(1).max(12),
  schoolStartTime: z.string().regex(TIME_REGEX, "Invalid time format (HH:MM)"),
  schoolEndTime: z.string().regex(TIME_REGEX, "Invalid time format (HH:MM)"),
  periodDurationMinutes: z.coerce.number().int().min(10).max(120),
  breakDurationMinutes: z.coerce.number().int().min(0).max(60).default(10),
});

export type TimetableFormData = z.infer<typeof timetableSchema>;
export type TimetablePeriodFormData = z.infer<typeof timetablePeriodSchema>;
export type WorkingDayConfigFormData = z.infer<typeof workingDayConfigSchema>;
