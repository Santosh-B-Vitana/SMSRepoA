import { z } from "zod";

// ── Transport Route Schema ──────────────────────────────────────────────────
export const transportRouteSchema = z.object({
  routeName: z.string().min(2, "Route name must be at least 2 characters").max(100),
  routeCode: z.string().min(1, "Route code is required").max(20),
  busNumber: z.string().min(1, "Bus number is required").max(20),
  busCapacity: z.coerce
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(100, "Capacity cannot exceed 100"),
  driverName: z.string().min(2, "Driver name is required").max(100),
  driverPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  driverLicense: z.string().max(20).optional().or(z.literal("")),
  conductorName: z.string().max(100).optional().or(z.literal("")),
  conductorPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  startPoint: z.string().min(1, "Start point is required").max(100),
  endPoint: z.string().min(1, "End point is required").max(100),
  morningDeparture: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
  afternoonDeparture: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
  monthlyFee: z.coerce.number().min(0, "Monthly fee cannot be negative"),
  gpsEnabled: z.boolean().default(false),
  status: z.enum(["active", "inactive", "maintenance"]).default("active"),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

// ── Stop/Pickup Point Schema ────────────────────────────────────────────────
export const transportStopSchema = z.object({
  routeId: z.string().uuid("Invalid route"),
  stopName: z.string().min(1, "Stop name is required").max(100),
  stopOrder: z.coerce.number().int().min(1),
  landmark: z.string().max(200).optional().or(z.literal("")),
  estimatedArrivalTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)")
    .optional()
    .or(z.literal("")),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// ── Student Transport Assignment ─────────────────────────────────────────────
export const transportAssignmentSchema = z.object({
  studentId: z.string().uuid("Invalid student"),
  routeId: z.string().uuid("Route is required"),
  stopId: z.string().uuid("Pickup stop is required"),
  pickupTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:MM)"),
  guardianPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
  effectiveTo: z.string().optional().or(z.literal("")),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

export type TransportRouteFormData = z.infer<typeof transportRouteSchema>;
export type TransportStopFormData = z.infer<typeof transportStopSchema>;
export type TransportAssignmentFormData = z.infer<typeof transportAssignmentSchema>;
