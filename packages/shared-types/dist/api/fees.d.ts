export type FeeStatus = 'Pending' | 'Paid' | 'Overdue' | 'PartiallyPaid' | 'Waived';
export type PaymentMethod = 'Online' | 'Cash' | 'Cheque' | 'DD' | 'UPI' | 'NEFT' | 'RTGS';
export interface FeeRecord {
    id: string;
    studentId: string;
    studentName: string;
    feeType: string;
    amount: number;
    dueDate: string;
    status: FeeStatus;
    paidAmount: number;
    balanceAmount: number;
    academicYear: string;
    term?: string;
    description?: string;
}
export interface PaymentRecord {
    id: string;
    feeRecordId: string;
    studentId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    receiptNumber: string;
    transactionId?: string;
    remarks?: string;
    collectedBy?: string;
}
export interface FeePaymentRequest {
    feeRecordIds: string[];
    amount: number;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    remarks?: string;
}
export interface FeePaymentResponse {
    paymentId: string;
    receiptNumber: string;
    paymentDate: string;
    totalAmount: number;
    status: 'Success' | 'Failed' | 'Pending';
    gatewayOrderId?: string;
    gatewayPaymentUrl?: string;
}
//# sourceMappingURL=fees.d.ts.map