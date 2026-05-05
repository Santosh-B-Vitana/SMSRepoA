import { StaffLeaveManagerEnhanced } from "../components/leave/StaffLeaveManagerEnhanced";

/**
 * Staff Leave Management Page
 * 
 * Allows staff members to:
 * - View leave balance for all leave types
 * - Apply for leave with date selection
 * - Track leave request status
 * - View historical leave data
 * - Receive approval/rejection notifications
 */
export default function LeaveManagement() {
  return <StaffLeaveManagerEnhanced />;
}