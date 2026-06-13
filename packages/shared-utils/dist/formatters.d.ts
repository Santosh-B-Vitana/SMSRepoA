export declare function formatINR(amount: number): string;
export declare function formatDate(iso: string): string;
export declare function formatDateIST(iso: string): string;
export declare function formatAttendancePercent(present: number, total: number): string;
export declare function maskAadhaar(aadhaarNumber: string): string;
export declare function formatAcademicYear(year: string): string;
export declare function formatPhoneIN(phone: string): string;
export declare function formatFileSize(bytes: number): string;
export declare function formatRelativeTime(iso: string): string;
/**
 * Returns true if semantic version `a` is strictly less than `b`.
 * Supports MAJOR.MINOR.PATCH format (e.g. "1.2.3").
 */
export declare function semverLt(a: string, b: string): boolean;
//# sourceMappingURL=formatters.d.ts.map