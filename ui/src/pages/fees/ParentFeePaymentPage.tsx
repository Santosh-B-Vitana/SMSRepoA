import { useParams } from "react-router-dom";
import StudentFeePaymentPage from "./StudentFeePaymentPage";

/**
 * Parent-portal variant of the fee payment page.
 * Uses the same UI as the admin/staff view but:
 *  - reads childId from the route param (not :studentId)
 *  - concessions are view-only (parents cannot add or change them)
 */
export default function ParentFeePaymentPage() {
  const { childId } = useParams<{ childId: string }>();
  return <StudentFeePaymentPage studentIdOverride={childId} viewOnlyConcessions />;
}
