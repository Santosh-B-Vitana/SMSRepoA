import { z } from "zod";

// ── Hostel / Dormitory Schema ───────────────────────────────────────────────
export const hostelSchema = z.object({
  name: z.string().min(2, "Hostel name is required").max(100),
  type: z.enum(["boys", "girls", "mixed"], { required_error: "Hostel type is required" }),
  totalRooms: z.coerce
    .number()
    .int()
    .min(1, "At least 1 room required")
    .max(500),
  totalCapacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(2000),
  wardenName: z.string().min(2, "Warden name is required").max(100),
  wardenPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  wardenEmail: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  address: z.string().min(5, "Address is required").max(300),
  monthlyFee: z.coerce.number().min(0, "Monthly fee cannot be negative"),
  securityDeposit: z.coerce.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  rules: z.string().max(2000).optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "full"]).default("active"),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

// ── Room Schema ─────────────────────────────────────────────────────────────
export const hostelRoomSchema = z.object({
  hostelId: z.string().uuid("Invalid hostel"),
  roomNumber: z.string().min(1, "Room number is required").max(20),
  floor: z.coerce.number().int().min(0).max(50),
  type: z.enum(["single", "double", "triple", "quad", "dormitory"], {
    required_error: "Room type is required",
  }),
  capacity: z.coerce.number().int().min(1).max(20),
  monthlyFee: z.coerce.number().min(0),
  hasAttachedBathroom: z.boolean().default(false),
  hasAC: z.boolean().default(false),
  status: z.enum(["available", "occupied", "maintenance", "reserved"]).default("available"),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

// ── Student Hostel Allocation ───────────────────────────────────────────────
export const hostelAllocationSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  roomId: z.string().uuid("Room is required"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().optional().or(z.literal("")),
  monthlyFee: z.coerce.number().min(0, "Monthly fee cannot be negative"),
  securityDeposit: z.coerce.number().min(0).default(0),
  depositPaid: z.boolean().default(false),
  guardianContactAtCheckIn: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  remarks: z.string().max(500).optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.checkOutDate) {
      return new Date(data.checkOutDate) > new Date(data.checkInDate);
    }
    return true;
  },
  { message: "Check-out date must be after check-in date", path: ["checkOutDate"] }
);

export type HostelFormData = z.infer<typeof hostelSchema>;
export type HostelRoomFormData = z.infer<typeof hostelRoomSchema>;
export type HostelAllocationFormData = z.infer<typeof hostelAllocationSchema>;
