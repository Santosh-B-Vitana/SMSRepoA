import { AdminLeaveManagementEnhanced } from "../components/leave/AdminLeaveManagementEnhanced";

/**
 * Admin Leave Management Page
 * 
 * Provides comprehensive leave management for:
 * - Staff leave requests (approval workflow)
 * - Student leave requests (parent-initiated)
 * - Direct leave marking for digital illiterate staff
 * - Analytics and reporting
 */
export default function AdminLeaveManagementPage() {
  return <AdminLeaveManagementEnhanced />;
}
