/**
 * Real Payroll API — connects to sms-api backend at /api/payroll
 */
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

// ---------------------------------------------------------------------------
// Types — match backend PayrollDTOs (camelCase JSON)
// ---------------------------------------------------------------------------

export interface AllowanceBreakdown {
  hra: number;
  da: number;
  ta: number;
  ma: number;
  specialAllowance: number;
  overtimePay: number;
  bonus: number;
  other: number;
}

export interface DeductionBreakdown {
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  tds: number;
  loanRecovery: number;
  advance: number;
  leaveDeduction: number;
  other: number;
}

/** Lightweight record returned in paginated list */
export interface PayrollRecordBasic {
  id: string;
  staffId: string;
  staffName: string;
  employeeId: string;
  designation: string;
  department: string;
  month: string;
  year: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  paymentDate?: string;
}

/** Full payroll record — includes breakdown of allowances and deductions */
export interface PayrollRecordFull extends PayrollRecordBasic {
  schoolId: string;
  basicSalary: number;
  allowances: AllowanceBreakdown;
  deductions: DeductionBreakdown;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollFilters {
  staffId?: string;
  month?: string;
  year?: number;
  status?: string;
  department?: string;
  designation?: string;
  searchQuery?: string;
}

export interface CreateAllowanceInput {
  hra?: number;
  da?: number;
  ta?: number;
  ma?: number;
  specialAllowance?: number;
  overtimePay?: number;
  bonus?: number;
  other?: number;
}

export interface CreateDeductionInput {
  pf?: number;
  esi?: number;
  professionalTax?: number;
  incomeTax?: number;
  tds?: number;
  loanRecovery?: number;
  advance?: number;
  leaveDeduction?: number;
  other?: number;
}

export interface CreatePayrollInput {
  staffId: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances?: CreateAllowanceInput;
  deductions?: CreateDeductionInput;
  remarks?: string;
}

export interface UpdatePayrollInput {
  allowances?: Partial<CreateAllowanceInput>;
  deductions?: Partial<CreateDeductionInput>;
  status?: string;
  paymentDate?: string;
  paymentMethod?: string;
  remarks?: string;
}

export interface PaginatedPayroll {
  items: PayrollRecordBasic[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const payrollApi = {
  /** Get paginated payroll records with optional filters */
  getRecords: (
    filters?: PayrollFilters,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedPayroll> => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filters?.staffId) params.set('staffId', filters.staffId);
    if (filters?.month) params.set('month', filters.month);
    if (filters?.year) params.set('year', String(filters.year));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.department) params.set('department', filters.department);
    if (filters?.designation) params.set('designation', filters.designation);
    if (filters?.searchQuery) params.set('searchQuery', filters.searchQuery);
    return apiGet<PaginatedPayroll>(`/payroll/records?${params.toString()}`);
  },

  /** Get a single payroll record by ID */
  getById: (id: string): Promise<PayrollRecordFull> =>
    apiGet<PayrollRecordFull>(`/payroll/records/${id}`),

  /** Create a new payroll record */
  create: (data: CreatePayrollInput): Promise<PayrollRecordFull> =>
    apiPost<PayrollRecordFull>('/payroll/records', data),

  /** Update an existing payroll record */
  update: (id: string, data: UpdatePayrollInput): Promise<PayrollRecordFull> =>
    apiPut<PayrollRecordFull>(`/payroll/records/${id}`, data),
};
