import { z } from "zod";

// ── Attendance Record Schema ─────────────────────────────────────────────────
export const attendanceRecordSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  classId: z.string().uuid("Class is required"),
  sectionId: z.string().uuid("Section is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "late", "half_day", "excused"], {
    required_error: "Attendance status is required",
  }),
  remarks: z.string().max(500).optional().or(z.literal("")),
  markedBy: z.string().uuid("Invalid teacher").optional(),
});

// ── Bulk Attendance Schema (what a teacher submits for a class) ─────────────
export const bulkAttendanceSchema = z.object({
  classId: z.string().uuid("Class is required"),
  sectionId: z.string().uuid("Section is required"),
  academicYearId: z.string().uuid("Academic year is required"),
  date: z.string().min(1, "Date is required").refine(
    (d) => !isNaN(Date.parse(d)),
    "Invalid date"
  ),
  session: z.enum(["morning", "afternoon", "full_day"]).default("full_day"),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid("Invalid student"),
        status: z.enum(["present", "absent", "late", "half_day", "excused"]),
        remarks: z.string().max(200).optional().or(z.literal("")),
      })
    )
    .min(1, "At least one attendance record is required"),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

// ── Leave Request Schema ────────────────────────────────────────────────────
export const studentLeaveSchema = z
  .object({
    studentId: z.string().uuid("Invalid student"),
    leaveType: z.enum(
      ["sick", "family", "religious", "sports", "accident", "other"],
      { required_error: "Leave type is required" }
    ),
    fromDate: z.string().min(1, "From date is required"),
    toDate: z.string().min(1, "To date is required"),
    reason: z
      .string()
      .min(10, "Reason must be at least 10 characters")
      .max(1000),
    parentApproval: z.boolean().default(false),
    attachmentUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => new Date(data.toDate) >= new Date(data.fromDate),
    { message: "To date must be on or after from date", path: ["toDate"] }
  );

// ── Staff Attendance Schema ─────────────────────────────────────────────────
export const staffAttendanceSchema = z.object({
  staffId: z.string().uuid("Invalid staff member"),
  date: z.string().min(1, "Date is required"),
  checkIn: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
  checkOut: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
  status: z.enum(["present", "absent", "half_day", "on_leave", "holiday"]),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

export type AttendanceRecordFormData = z.infer<typeof attendanceRecordSchema>;
export type BulkAttendanceFormData = z.infer<typeof bulkAttendanceSchema>;
export type StudentLeaveFormData = z.infer<typeof studentLeaveSchema>;
export type StaffAttendanceFormData = z.infer<typeof staffAttendanceSchema>;
