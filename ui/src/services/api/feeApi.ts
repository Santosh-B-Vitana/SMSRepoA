import apiClient from './apiClient';

// ========== TYPE DEFINITIONS ==========

export interface FeeStructureBasic {
  id: string;
  name: string;
  class: string;
  academicYear: string;
  totalAmount: number;
  installmentCount: number;
  status: string;
}

/** Represents one term/installment window in a payment schedule */
export interface TermSchedule {
  termNumber: number;
  name: string;
  fromDate: string;  // YYYY-MM-DD
  toDate: string;    // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  amount: number;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  name: string;
  class: string;
  academicYear: string;
  tuitionFee: number;
  admissionFee: number;
  examFee: number;
  libraryFee: number;
  labFee: number;
  sportsFee: number;
  transportFee: number;
  hostelFee: number;
  uniformFee: number;
  booksFee: number;
  developmentFee: number;
  miscellaneous: number;
  totalAmount: number;
  installmentCount: number;
  installmentAmounts?: string;
  installmentDueDates?: string;  // JSON: TermSchedule[] when rich, string[] when legacy
  description?: string;
  createdAt: string;
  updatedAt: string;
  /** Number of student fee records linked to this structure. 0 = not yet assigned to any student. */
  assignedStudentCount?: number;
}

export interface CreateFeeStructureDto {
  schoolId?: string; // omitted: backend injects from tenant context
  name: string;
  class: string;
  academicYear: string;
  tuitionFee?: number;
  admissionFee?: number;
  examFee?: number;
  libraryFee?: number;
  labFee?: number;
  sportsFee?: number;
  transportFee?: number;
  hostelFee?: number;
  uniformFee?: number;
  booksFee?: number;
  developmentFee?: number;
  miscellaneous?: number;
  installmentCount?: number;
  installmentAmounts?: string;
  installmentDueDates?: string;  // JSON: TermSchedule[] rich format
  description?: string;
}

export interface FeeRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  class: string;
  feeStructureId?: string;
  feeStructureName?: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  pendingAmount: number;
  lastPaymentDate?: string;
  academicYear: string;
  status: string;
  payments: PaymentTransaction[];
  createdAt: string;
  updatedAt: string;
  // Transport & Hostel breakdown (populated by backend on single-record fetch)
  transportFee?: number;
  transportMonthlyFee?: number;
  transportRoute?: string;
  transportPickup?: string;
  hostelFee?: number;
  hostelMonthlyFee?: number;
  hostelRoom?: string;
  /** Per-student fee head overrides (JSON dict). NOT a concession — structural exemptions only. */
  feeHeadOverrides?: string | null;
}

export interface CreateFeeRecordDto {
  schoolId: string;
  studentId: string;
  feeStructureId?: string;
  dueDate: string;
  totalAmount: number;
  paidAmount?: number;
  discountAmount?: number;
  lateFeeAmount?: number;
  academicYear: string;
  status?: string;
}

export interface PaymentTransaction {
  id: string;
  feeRecordId?: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  receiptNumber?: string;
  gatewayRef?: string;
  gatewayOrderId?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  processedBy?: string;
  remarks?: string;
  createdAt: string;
}

export interface CreatePaymentDto {
  schoolId?: string;
  studentId: string;
  feeRecordId: string;
  amount: number;
  method: string;
  date: string;
  receiptNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  processedBy?: string;
  remarks?: string;
  academicYear?: string;
  gatewayRef?: string;
}

export interface PaymentResponse {
  id: string;
  schoolId: string;
  studentId: string;
  feeRecordId: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  receiptNumber: string;
  gatewayRef?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  processedBy?: string;
  academicYear?: string;
  remarks?: string;
  createdAt: string;
}

export interface LateFeeConfig {
  id: string;
  schoolId: string;
  amount: number;
  frequency: string;
  maxAmount?: number;
  gracePeriodDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLateFeeConfigDto {
  schoolId: string;
  amount: number;
  frequency: string;
  maxAmount?: number;
  gracePeriodDays: number;
  isActive: boolean;
}

export interface PaymentGatewayResponse {
  orderId: string;
  gateway: string;
  amount: number;
  currency: string;
  gatewayKey?: string;
  checkoutUrl?: string;
  metadata: Record<string, string>;
}

export interface InitiatePaymentDto {
  amount: number;
  gateway: string;
  currency: string;
}

export interface VerifyPaymentDto {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface RefundResponse {
  refundId: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: string;
  gatewayRefundId?: string;
  processedAt?: string;
  createdAt: string;
}

export interface CreateRefundDto {
  amount: number;
  reason: string;
}

export interface ReminderResult {
  totalRecords: number;
  sentSuccessfully: number;
  failed: number;
  errors: string[];
}

/** Matches backend SendRemindersDto */
export interface SendRemindersDto {
  /** 0 = all overdue; positive = due within X days */
  daysBefore: number;
  /** "sms" | "email" | "whatsapp" | "push_notification" | "all" */
  channel?: string;
  customMessage?: string;
}

export interface OverdueFeeRecord {
  feeRecordId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  class: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  calculatedLateFee: number;
  guardianPhone?: string;
  guardianEmail?: string;
}

export interface FeeStats {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalDiscount: number;
  totalLateFee: number;
  collectionRate: number;
  monthlyCollection: Record<string, number>;
  classwiseCollection: Record<string, number>;
}

export interface PaginatedResponse<T> {
  feeRecords?: T[];
  items?: T[];
  total?: number;
  totalCount?: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

// ========== API FUNCTIONS ==========

const BASE_PATH = '/fees';

/**
 * Get all fee structures with optional class filter
 */
export const getFeeStructures = async (classFilter?: string, academicYear?: string): Promise<FeeStructure[]> => {
  const p = new URLSearchParams();
  if (classFilter) p.append('class', classFilter);
  if (academicYear) p.append('academicYear', academicYear);
  const qs = p.toString();
  const response = await apiClient.get(`${BASE_PATH}/structures${qs ? '?' + qs : ''}`);
  return response.data;
};

/**
 * Get fee structure by ID
 */
export const getFeeStructureById = async (structureId: string): Promise<FeeStructure> => {
  const response = await apiClient.get(`${BASE_PATH}/structures/${structureId}`);
  return response.data;
};

/**
 * Create a new fee structure.
 * The backend auto-assigns the structure to all active students in the class.
 * The response is { structure, autoAssigned, autoSkipped }; we return the wrapped
 * object so callers can surface the assignment count.
 */
export const createFeeStructure = async (data: CreateFeeStructureDto): Promise<FeeStructure & { autoAssigned?: number; autoSkipped?: number }> => {
  const response = await apiClient.post(`${BASE_PATH}/structures`, data);
  // Backend returns { structure, autoAssigned, autoSkipped }
  const body = response.data;
  if (body && body.structure) {
    return { ...body.structure, autoAssigned: body.autoAssigned, autoSkipped: body.autoSkipped };
  }
  return body;
};

/**
 * Update an existing fee structure
 */
export const updateFeeStructure = async (
  structureId: string,
  data: Partial<CreateFeeStructureDto>
): Promise<FeeStructure> => {
  const response = await apiClient.put(`${BASE_PATH}/structures/${structureId}`, data);
  return response.data;
};

/**
 * Delete a fee structure
 */
export const deleteFeeStructure = async (structureId: string): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/structures/${structureId}`);
};

/**
 * Get paginated fee records with filters
 */
export const getFeeRecords = async (
  page: number = 1,
  pageSize: number = 10,
  studentId?: string,
  status?: string,
  academicYear?: string
): Promise<PaginatedResponse<FeeRecord>> => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (studentId) params.append('studentId', studentId);
  if (status) params.append('status', status);
  if (academicYear) params.append('academicYear', academicYear);

  const response = await apiClient.get(`${BASE_PATH}/records?${params.toString()}`);
  return response.data;
};

/**
 * Get fee record by ID
 */
export const getFeeRecordById = async (recordId: string): Promise<FeeRecord> => {
  const response = await apiClient.get(`${BASE_PATH}/records/${recordId}`);
  return response.data;
};

/**
 * Create a new fee record
 */
export const createFeeRecord = async (data: CreateFeeRecordDto): Promise<FeeRecord> => {
  const response = await apiClient.post(`${BASE_PATH}/records`, data);
  return response.data;
};

/**
 * Update an existing fee record
 */
export const updateFeeRecord = async (
  recordId: string,
  data: Partial<CreateFeeRecordDto>
): Promise<FeeRecord> => {
  const response = await apiClient.put(`${BASE_PATH}/records/${recordId}`, data);
  return response.data;
};

/**
 * Patch module (transport/hostel) monthly fees for a fee record.
 * Updates the monthly rate on the student's transport/hostel assignment,
 * which recalculates the pro-rata amount.
 */
export const patchModuleFees = async (
  recordId: string,
  data: { transportMonthlyFee?: number; hostelMonthlyFee?: number }
): Promise<FeeRecord> => {
  const response = await apiClient.patch(`${BASE_PATH}/records/${recordId}/module-fees`, data);
  return response.data;
};

/**
 * Delete a fee record
 */
export const deleteFeeRecord = async (recordId: string): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/records/${recordId}`);
};

/**
 * Apply per-student fee head overrides (e.g. Library Fee → ₹0 because student didn't use it).
 * Reduces TotalAmount directly; does NOT affect DiscountAmount/concessions.
 */
export const applyFeeHeadOverrides = async (
  recordId: string,
  overrides: Record<string, number>,
  appliedBy?: string
): Promise<{ newTotalAmount: number; newPendingAmount: number; feeHeadOverrides: string; status: string }> => {
  const response = await apiClient.patch(`${BASE_PATH}/records/${recordId}/fee-head-overrides`, { overrides, appliedBy });
  return response.data;
};

/**
 * Remove the active concession (DiscountAmount) from a fee record.
 * Restores PendingAmount to TotalAmount - PaidAmount.
 */
export const removeDiscount = async (
  recordId: string,
  reason?: string,
  removedBy?: string
): Promise<{ removedAmount: number; newPendingAmount: number; status: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/records/${recordId}/remove-discount`, { reason, removedBy });
  return response.data;
};

/**
 * Create a payment transaction
 */
export const createPayment = async (data: CreatePaymentDto): Promise<PaymentResponse> => {
  const response = await apiClient.post(`${BASE_PATH}/payments`, data);
  return response.data;
};

/**
 * Get late fee configuration
 */
export const getLateFeeConfig = async (): Promise<LateFeeConfig> => {
  const response = await apiClient.get(`${BASE_PATH}/late-fee/config`);
  return response.data;
};

/**
 * Create or update late fee configuration
 */
export const createOrUpdateLateFeeConfig = async (
  data: CreateLateFeeConfigDto
): Promise<LateFeeConfig> => {
  const response = await apiClient.post(`${BASE_PATH}/late-fee/config`, data);
  return response.data;
};

/**
 * Calculate late fee for a specific fee record
 */
export const calculateLateFee = async (feeRecordId: string): Promise<number> => {
  const response = await apiClient.get(`${BASE_PATH}/late-fee/calculate/${feeRecordId}`);
  return response.data;
};

/**
 * Initiate payment gateway transaction
 */
export const initiatePayment = async (
  feeRecordId: string,
  data: InitiatePaymentDto
): Promise<PaymentGatewayResponse> => {
  const response = await apiClient.post(
    `${BASE_PATH}/payment-gateway/initiate/${feeRecordId}`,
    data
  );
  return response.data;
};

/**
 * Verify payment gateway transaction
 */
export const verifyPayment = async (
  transactionId: string,
  data: VerifyPaymentDto
): Promise<boolean> => {
  const response = await apiClient.post(
    `${BASE_PATH}/payment-gateway/verify/${transactionId}`,
    data
  );
  return response.data;
};

/**
 * Generate receipt HTML (fetch for browser print)
 */
export const generateReceipt = async (transactionId: string): Promise<string> => {
  const response = await apiClient.get(`${BASE_PATH}/payments/${transactionId}/receipt`, {
    responseType: 'text',
  });
  return response.data;
};

/**
 * Send receipt via email
 */
export const sendReceiptEmail = async (transactionId: string, email: string): Promise<string> => {
  const response = await apiClient.post(`${BASE_PATH}/receipts/${transactionId}/send`, {
    email,
  });
  return response.data;
};

/**
 * Send fee reminders
 */
export const sendFeeReminders = async (data: SendRemindersDto): Promise<ReminderResult> => {
  const response = await apiClient.post(`${BASE_PATH}/send-reminders`, data);
  return response.data;
};

/**
 * Get overdue fee records
 */
export const getOverdueFees = async (): Promise<OverdueFeeRecord[]> => {
  const response = await apiClient.get(`${BASE_PATH}/overdue`);
  return response.data;
};

/**
 * Bulk-assign a fee structure to all students in its class (auto-creates fee records).
 * Returns { assigned, skipped, message }.
 */
export const bulkAssignStructure = async (structureId: string): Promise<{ assigned: number; skipped: number; message: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/structures/${structureId}/assign`);
  return response.data;
};

/**
 * Seed default fee structures for every class that has no structure for the given academic year.
 * Creates 3-term schedules with tiered tuition fees. Safe to call multiple times.
 */
export const seedFeeStructures = async (academicYear?: string): Promise<{ created: number; skipped: number; academicYear: string; message: string }> => {
  const params = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : "";
  const response = await apiClient.post(`${BASE_PATH}/structures/seed${params}`);
  return response.data;
};

/**
 * Increases the outstanding balance so the admin can collect the full amount in one transaction.
 */
export const addExtraCharges = async (
  recordId: string,
  charges: Array<{ label: string; amount: number }>,
  reason?: string,
  addedBy?: string
): Promise<{ feeRecordId: string; previousTotalAmount: number; chargesAdded: number; newTotalAmount: number; newPendingAmount: number; message: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/records/${recordId}/add-charges`, {
    charges,
    reason,
    addedBy,
  });
  return response.data;
};

/**
 * Edit an existing payment transaction to correct a mistake.
 * Adjusts the fee record balance and writes an audit log entry. editReason is required.
 */
export const editPayment = async (
  paymentId: string,
  data: {
    amount?: number;
    method?: string;
    date?: string;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    gatewayRef?: string;
    processedBy?: string;
    remarks?: string;
    editReason: string;
  }
): Promise<PaymentResponse> => {
  const response = await apiClient.patch(`${BASE_PATH}/payments/${paymentId}`, data);
  return response.data;
};

/**
 * Auto-link the default fee structure for the student's class to a fee record
 * that currently shows "No structure linked".
 */
export const linkStructure = async (
  recordId: string
): Promise<{ feeRecordId: string; structureId: string; structureName: string; message: string }> => {
  const response = await apiClient.post(`${BASE_PATH}/records/${recordId}/link-structure`);
  return response.data;
};

/**
 * Get fee statistics
 */
export const getFeeStats = async (academicYear?: string): Promise<FeeStats> => {
  const params = academicYear ? `?academicYear=${academicYear}` : '';
  const response = await apiClient.get(`${BASE_PATH}/stats${params}`);
  const d = response.data ?? {};
  // Normalize: backend returns collectedFees/pendingFees/overdueFees; map to expected shape
  const totalCollected = d.totalCollected ?? d.collectedFees ?? 0;
  const totalFees = d.totalFees ?? 0;
  return {
    totalCollected,
    totalPending: d.totalPending ?? d.pendingFees ?? 0,
    totalOverdue: d.totalOverdue ?? d.overdueFees ?? 0,
    totalDiscount: d.totalDiscount ?? d.discountGiven ?? 0,
    totalLateFee: d.totalLateFee ?? d.lateFeeCollected ?? 0,
    collectionRate: totalFees > 0 ? (totalCollected / totalFees) * 100 : 0,
    monthlyCollection: d.monthlyCollection ?? {},
    classwiseCollection: d.classwiseCollection ?? d.byClass ?? {},
  };
};

export interface RecentPayment {
  id: string;
  studentName: string;
  class: string;
  amount: number;
  date: string;
  method: string;
  receiptNumber: string;
  status: string;
}

export const getRecentPayments = async (date?: string): Promise<RecentPayment[]> => {
  const params = date ? `?date=${date}` : '';
  const response = await apiClient.get(`${BASE_PATH}/payments/recent${params}`);
  return response.data ?? [];
};

/**
 * Process refund for a transaction
 */
export const processRefund = async (
  transactionId: string,
  data: CreateRefundDto
): Promise<RefundResponse> => {
  const response = await apiClient.post(`${BASE_PATH}/transactions/${transactionId}/refund`, data);
  return response.data;
};

/**
 * Get refund status
 */
export const getRefundStatus = async (refundId: string): Promise<RefundResponse> => {
  const response = await apiClient.get(`${BASE_PATH}/refunds/${refundId}/status`);
  return response.data;
};

// ========== INVOICE / CALCULATION ENGINE TYPES ==========

export interface FeeLineItem {
  component: string;
  grossAmount: number;
  concessionAmount: number;
  netAmount: number;
  concessions: ConcessionBreakdown[];
}

export interface ConcessionBreakdown {
  concessionTypeId: string;
  concessionTypeName: string;
  category: string;
  discountType: string;
  discountValue: number;
  calculatedAmount: number;
  priority: number;
}

export interface InstallmentDetail {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  lateFee: number;
  status: string;
}

export interface AgingBucket {
  current: number;
  days0To30: number;
  days31To60: number;
  days61To90: number;
  days90Plus: number;
  totalOutstanding: number;
  studentCount: number;
}

export interface InvoiceBreakdown {
  studentId: string;
  feeStructureId: string;
  feeStructureName: string;
  className: string;
  academicYear: string;
  lineItems: FeeLineItem[];
  grossTotal: number;
  totalConcession: number;
  netTotal: number;
  lateFeeTotal: number;
  grandTotal: number;
  totalPaid: number;
  balanceDue: number;
  concessionPercentage: number;
  installments: InstallmentDetail[];
  aging: AgingBucket;
  appliedConcessions: ConcessionBreakdown[];
}

export interface FeeAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  feeRecordId?: string;
  paymentTransactionId?: string;
  studentId?: string;
  amount?: number;
  performedByUserId?: string;
  performedByName?: string;
  remarks?: string;
  timestamp: string;
  oldValues?: string;
  newValues?: string;
}

export interface AuditTrailResponse {
  logs: FeeAuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== INVOICE / CALCULATION ENGINE API ==========

/**
 * Get full invoice breakdown for a student: line items, overlapping concessions, late fees, installments, aging.
 */
export const getInvoice = async (studentId: string, feeStructureId: string): Promise<InvoiceBreakdown> => {
  const response = await apiClient.get(`${BASE_PATH}/invoice/${studentId}/${feeStructureId}`);
  return response.data;
};

/**
 * Preview what the fee would look like with a set of concession types applied (before approval).
 */
export const previewConcessions = async (
  studentId: string,
  feeStructureId: string,
  concessionTypeIds: string[]
): Promise<InvoiceBreakdown> => {
  const response = await apiClient.post(`${BASE_PATH}/invoice/preview`, {
    studentId,
    feeStructureId,
    concessionTypeIds,
  });
  return response.data;
};

/**
 * Get school-wide aging analysis (Current, 0-30, 31-60, 61-90, 90+ day buckets).
 */
export const getSchoolAging = async (): Promise<AgingBucket> => {
  const response = await apiClient.get(`${BASE_PATH}/aging`);
  return response.data;
};

/**
 * Get immutable audit trail with filters.
 */
export const getAuditTrail = async (params: {
  studentId?: string;
  feeRecordId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditTrailResponse> => {
  const response = await apiClient.get(`${BASE_PATH}/audit-trail`, { params });
  return response.data;
};

// ========== SIBLING DISCOUNT ==========

export interface SiblingInstallment {
  number: number;
  label: string;       // "Term 1", "Q2", "Annual", etc.
  amount: number;
  paidInInstallment: number;   // portion of student's total paid that covers this installment
  dueInInstallment: number;    // amount still outstanding for this installment
  dueDate?: string;
  status: 'paid' | 'current' | 'upcoming';
}

export interface SiblingFeeInfo {
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  isAnchor: boolean;
  totalFee: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  feeRecordId?: string;
  academicYear: string;
  structureName?: string;
  installmentPlan: string;  // "Annual" | "Half-Yearly" | "Term-wise (3)" | "Quarterly" | "Monthly"
  installments: SiblingInstallment[];
}

export const getSiblingInfo = async (studentId: string, academicYear?: string): Promise<SiblingFeeInfo[]> => {
  const params = new URLSearchParams({ studentId });
  if (academicYear) params.append('academicYear', academicYear);
  const response = await apiClient.get(`${BASE_PATH}/sibling-info?${params.toString()}`);
  return response.data ?? [];
};

export interface SiblingDiscountRequest {
  studentId: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  reason?: string;
  appliedBy?: string;
}

export interface SiblingDiscountResponse {
  message: string;
  applied: number;
  totalSaved: number;
  siblings: { id: string; name: string; class: string; section: string }[];
  discountType: string;
  discountValue: number;
}

export const applySiblingDiscount = async (data: SiblingDiscountRequest): Promise<SiblingDiscountResponse> => {
  const response = await apiClient.post(`${BASE_PATH}/sibling-discount`, data);
  return response.data;
};

export interface StaffDiscountRequest {
  studentId: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  reason?: string;
}

export interface StaffDiscountResponse {
  message: string;
  applied: number;
  totalSaved: number;
  studentName: string;
  discountType: string;
  discountValue: number;
}

export const applyStaffDiscount = async (data: StaffDiscountRequest): Promise<StaffDiscountResponse> => {
  const response = await apiClient.post(`${BASE_PATH}/staff-discount`, data);
  return response.data;
};

// ========== FEE HEADS ==========

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  description?: string;
  isVisibleOnReceipt: boolean;
  isMandatory: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateFeeHeadDto {
  name: string;
  code: string;
  description?: string;
  isVisibleOnReceipt?: boolean;
  isMandatory?: boolean;
  displayOrder?: number;
}

export const getFeeHeads = async (): Promise<FeeHead[]> => {
  const response = await apiClient.get(`${BASE_PATH}/heads`);
  return response.data;
};

export const createFeeHead = async (data: CreateFeeHeadDto): Promise<FeeHead> => {
  const response = await apiClient.post(`${BASE_PATH}/heads`, data);
  return response.data;
};

export const updateFeeHead = async (id: string, data: Partial<CreateFeeHeadDto> & { isActive?: boolean }): Promise<FeeHead> => {
  const response = await apiClient.put(`${BASE_PATH}/heads/${id}`, data);
  return response.data;
};

export const deleteFeeHead = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_PATH}/heads/${id}`);
};

// ========== FEE TERMS ==========

export interface FeeTerm {
  id: string;
  feeStructureId: string;
  name: string;
  termNumber: number;
  amount: number;
  dueDate: string;
  status: string;
  remarks?: string;
}

export interface CreateFeeTermDto {
  name: string;
  termNumber: number;
  amount: number;
  dueDate: string;
  remarks?: string;
}

export const getFeeTerms = async (feeStructureId: string): Promise<FeeTerm[]> => {
  const response = await apiClient.get(`${BASE_PATH}/structures/${feeStructureId}/terms`);
  return response.data;
};

export const createFeeTerm = async (feeStructureId: string, data: CreateFeeTermDto): Promise<FeeTerm> => {
  const response = await apiClient.post(`${BASE_PATH}/structures/${feeStructureId}/terms`, data);
  return response.data;
};

// ========== RECEIPT TEMPLATES ==========

export interface ReceiptTemplate {
  id: string;
  name: string;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
  primaryColor?: string;
  columnConfigJson?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreateReceiptTemplateDto {
  name: string;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
  primaryColor?: string;
  columnConfigJson?: string;
  isDefault?: boolean;
}

export const getReceiptTemplates = async (): Promise<ReceiptTemplate[]> => {
  const response = await apiClient.get(`${BASE_PATH}/receipt-templates`);
  return response.data;
};

export const createReceiptTemplate = async (data: CreateReceiptTemplateDto): Promise<ReceiptTemplate> => {
  const response = await apiClient.post(`${BASE_PATH}/receipt-templates`, data);
  return response.data;
};

export const updateReceiptTemplate = async (id: string, data: Partial<CreateReceiptTemplateDto> & { isActive?: boolean }): Promise<ReceiptTemplate> => {
  const response = await apiClient.put(`${BASE_PATH}/receipt-templates/${id}`, data);
  return response.data;
};

// ========== PROMOTE FEES ==========

export interface PromoteFeesDto {
  sourceFeeStructureId: string;
  targetAcademicYear: string;
  incrementPercent?: number;
}

export const promoteFeeStructure = async (feeStructureId: string, data: { targetAcademicYear: string; incrementPercent?: number }): Promise<FeeStructure> => {
  const response = await apiClient.post(`${BASE_PATH}/structures/${feeStructureId}/promote`, data);
  return response.data;
};

// ========== BULK PAYMENT UPLOAD ==========

export interface BulkFeePaymentRow {
  admissionNumber: string;
  studentName?: string;
  amountPaid: number;
  paymentDate: string;      // ISO date: YYYY-MM-DD
  paymentMethod: string;    // cash | online | cheque | dd | neft | upi
  receiptNumber?: string;
  remarks?: string;
}

export interface BulkPaymentResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: string[];  // format: "ADM001: reason"
}

export const bulkUploadPayments = async (rows: BulkFeePaymentRow[]): Promise<BulkPaymentResult> => {
  // Send array directly — backend expects List<BulkFeePaymentRow> (not wrapped)
  const response = await apiClient.post(`${BASE_PATH}/payments/bulk-upload`, rows);
  return response.data;
};

// ========== DELETED TRANSACTIONS AUDIT ==========

export interface DeletedTransaction {
  id: string;
  studentName: string;
  amount: number;
  paymentDate: string;
  deletedAt?: string;
  deletedBy?: string;
}

export const getDeletedTransactions = async (from?: string, to?: string): Promise<DeletedTransaction[]> => {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const response = await apiClient.get(`${BASE_PATH}/deleted-transactions?${params.toString()}`);
  return response.data;
};

// ─── Concession Types CRUD ───────────────────────────────
export interface ConcessionType {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  discountType: string; // "Percentage" | "Fixed"
  discountValue: number;
  maxDiscountAmount?: number;
  applicableFor?: string;
  requiresDocuments: boolean;
  requiresApproval: boolean;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConcessionTypeDto {
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number;
  applicableFor?: string;
  requiresDocuments?: boolean;
  requiresApproval?: boolean;
  validFrom?: string;
  validTo?: string;
}

const CONCESSION_TYPES_PATH = '/FeeConcession/types';

export const getConcessionTypes = async (): Promise<ConcessionType[]> => {
  const response = await apiClient.get(CONCESSION_TYPES_PATH);
  const data = response.data;
  // Backend now returns a plain array; keep fallbacks for any legacy wrapper shape
  if (Array.isArray(data)) return data as ConcessionType[];
  if (Array.isArray(data?.concessionTypes) && (data.concessionTypes as unknown[]).length > 0) return data.concessionTypes as ConcessionType[];
  if (Array.isArray(data?.items) && (data.items as unknown[]).length > 0) return data.items as ConcessionType[];
  return [];
};

export const createConcessionType = async (dto: CreateConcessionTypeDto): Promise<ConcessionType> => {
  const response = await apiClient.post(CONCESSION_TYPES_PATH, dto);
  return response.data;
};

export const updateConcessionType = async (id: string, dto: Partial<CreateConcessionTypeDto> & { isActive?: boolean }): Promise<ConcessionType> => {
  const response = await apiClient.put(`${CONCESSION_TYPES_PATH}/${id}`, dto);
  return response.data;
};

export const deleteConcessionType = async (id: string): Promise<void> => {
  await apiClient.delete(`${CONCESSION_TYPES_PATH}/${id}`);
};

// Export all functions as a single object for convenience
export const feeApi = {
  getFeeStructures,
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeRecords,
  getFeeRecordById,
  createFeeRecord,
  updateFeeRecord,
  patchModuleFees,
  deleteFeeRecord,
  createPayment,
  getLateFeeConfig,
  createOrUpdateLateFeeConfig,
  calculateLateFee,
  initiatePayment,
  verifyPayment,
  generateReceipt,
  sendReceiptEmail,
  sendFeeReminders,
  getOverdueFees,
  getFeeStats,
  processRefund,
  getRefundStatus,
  getInvoice,
  previewConcessions,
  getSchoolAging,
  getAuditTrail,
  addExtraCharges,
  editPayment,
  linkStructure,
  applySiblingDiscount,
  applyStaffDiscount,
  // New
  getFeeHeads,
  createFeeHead,
  updateFeeHead,
  deleteFeeHead,
  getFeeTerms,
  createFeeTerm,
  getReceiptTemplates,
  createReceiptTemplate,
  updateReceiptTemplate,
  promoteFeeStructure,
  bulkUploadPayments,
  getDeletedTransactions,
  getRecentPayments,
  getSiblingInfo,
  getConcessionTypes,
  createConcessionType,
  updateConcessionType,
  deleteConcessionType,
  seedFeeStructures,
  applyFeeHeadOverrides,
  removeDiscount,
};

export default feeApi;
