import apiClient from './apiClient';

const BASE = '/staff-tax';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StaffTaxDeclaration {
  id: string;
  schoolId: string;
  staffId: string;
  staffName?: string;
  employeeCode?: string;
  financialYear: string;
  taxRegime: 'old' | 'new';
  basicSalary: number;
  hra: number;
  lta: number;
  medical: number;
  otherAllowances: number;
  grossSalary: number;
  hraExemption: number;
  ltaExemption: number;
  section80C: number;
  section80D: number;
  section80G: number;
  section80E: number;
  homeLoanInterest: number;
  professionalTax: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforecess: number;
  educationCess: number;
  totalTaxPayable: number;
  tdsDeducted: number;
  balanceTax: number;
  status: 'draft' | 'submitted' | 'approved' | 'finalized';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxDeclarationDto {
  staffId: string;
  financialYear: string;
  taxRegime: 'old' | 'new';
  basicSalary: number;
  hra: number;
  lta: number;
  medical: number;
  otherAllowances: number;
  hraExemption: number;
  ltaExemption: number;
  section80C: number;
  section80D: number;
  section80G: number;
  section80E: number;
  homeLoanInterest: number;
  professionalTax: number;
  tdsDeducted: number;
}

export interface UpdateTaxStatusDto {
  status: 'submitted' | 'approved' | 'finalized';
  remarks?: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const getTaxDeclarations = async (params?: { staffId?: string; financialYear?: string; status?: string }): Promise<StaffTaxDeclaration[]> => {
  const q = new URLSearchParams();
  if (params?.staffId) q.set('staffId', params.staffId);
  if (params?.financialYear) q.set('financialYear', params.financialYear);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  const r = await apiClient.get<StaffTaxDeclaration[]>(`${BASE}?${q}`);
  return r.data;
};

export const getTaxDeclarationById = async (id: string): Promise<StaffTaxDeclaration> => {
  const r = await apiClient.get<StaffTaxDeclaration>(`${BASE}/${id}`);
  return r.data;
};

export const getTaxDeclarationByStaff = async (staffId: string, financialYear: string): Promise<StaffTaxDeclaration> => {
  const r = await apiClient.get<StaffTaxDeclaration>(`${BASE}/staff/${staffId}?financialYear=${financialYear}`);
  return r.data;
};

export const createOrUpdateTaxDeclaration = async (dto: CreateTaxDeclarationDto): Promise<StaffTaxDeclaration> => {
  const r = await apiClient.post<StaffTaxDeclaration>(`${BASE}`, dto);
  return r.data;
};

export const updateTaxStatus = async (id: string, dto: UpdateTaxStatusDto): Promise<StaffTaxDeclaration> => {
  const r = await apiClient.put<StaffTaxDeclaration>(`${BASE}/${id}/status`, dto);
  return r.data;
};

export const deleteTaxDeclaration = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/${id}`);
};
