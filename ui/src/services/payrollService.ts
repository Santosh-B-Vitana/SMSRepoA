import { rateLimiter } from './rateLimiter';

export interface PayrollRecord {
  id: string;
  schoolId: string;
  staffId: string;
  staffName: string;
  designation: string;
  month: string;
  year: number;
  basicSalary: number;
  allowances: {
    hra: number;
    da: number;
    ta: number;
    other: number;
  };
  deductions: {
    pf: number;
    tax: number;
    insurance: number;
    other: number;
  };
  grossSalary: number;
  netSalary: number;
  paymentDate?: string;
  paymentMethod?: 'bank_transfer' | 'cash' | 'cheque';
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollFilters {
  month?: string;
  year?: number;
  status?: PayrollRecord['status'];
  searchQuery?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasMore: boolean;
}

function generateMockPayroll(schoolId: string): PayrollRecord[] {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const statuses: PayrollRecord['status'][] = ['draft', 'approved', 'paid', 'cancelled'];
  
  return Array.from({ length: 100 }, (_, i) => {
    const basicSalary = 30000 + (i * 1000);
    const hra = basicSalary * 0.3;
    const da = basicSalary * 0.2;
    const ta = 2000;
    const other = 1000;
    const totalAllowances = hra + da + ta + other;
    
    const pf = basicSalary * 0.12;
    const tax = basicSalary * 0.1;
    const insurance = 500;
    const otherDeductions = 200;
    const totalDeductions = pf + tax + insurance + otherDeductions;
    
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;
    
    return {
      id: `payroll-${schoolId}-${i + 1}`,
      schoolId,
      staffId: `staff-${(i % 50) + 1}`,
      staffName: `Staff ${(i % 50) + 1}`,
      designation: ['Teacher', 'Admin', 'Peon', 'Librarian'][i % 4],
      month: months[i % 12],
      year: 2024,
      basicSalary,
      allowances: {
        hra,
        da,
        ta,
        other
      },
      deductions: {
        pf,
        tax,
        insurance,
        other: otherDeductions
      },
      grossSalary,
      netSalary,
      paymentDate: i % 2 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      paymentMethod: i % 2 === 0 ? 'bank_transfer' : undefined,
      status: statuses[i % statuses.length],
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

export const payrollService = {
  async getPayrollRecords(
    schoolId: string,
    filters?: PayrollFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<PayrollRecord>> {
    await rateLimiter.checkLimitAsync(`payroll:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockPayroll(schoolId);

    if (filters?.month) {
      data = data.filter(p => p.month === filters.month);
    }
    if (filters?.year) {
      data = data.filter(p => p.year === filters.year);
    }
    if (filters?.status) {
      data = data.filter(p => p.status === filters.status);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(p => p.staffName.toLowerCase().includes(query));
    }

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedData = data.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize)
    };
  },

  async createPayrollRecord(
    schoolId: string,
    record: Omit<PayrollRecord, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<PayrollRecord> {
    await rateLimiter.checkLimitAsync(`payroll:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `payroll-${schoolId}-${Date.now()}`,
      schoolId,
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async updatePayrollRecord(
    schoolId: string,
    recordId: string,
    updates: Partial<Omit<PayrollRecord, 'id' | 'schoolId' | 'createdAt'>>
  ): Promise<PayrollRecord> {
    await rateLimiter.checkLimitAsync(`payroll:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const basicSalary = 30000;
    const grossSalary = basicSalary * 1.5;
    const netSalary = grossSalary * 0.8;

    return {
      id: recordId,
      schoolId,
      staffId: 'staff-1',
      staffName: 'Staff 1',
      designation: 'Teacher',
      month: 'January',
      year: 2024,
      basicSalary,
      allowances: { hra: 9000, da: 6000, ta: 2000, other: 1000 },
      deductions: { pf: 3600, tax: 3000, insurance: 500, other: 200 },
      grossSalary,
      netSalary,
      status: 'draft',
      ...updates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async deletePayrollRecord(schoolId: string, recordId: string): Promise<void> {
    await rateLimiter.checkLimitAsync(`payroll:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
  },

  async getPayrollStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`payroll:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalRecords: 100,
      paidRecords: 60,
      pendingRecords: 25,
      totalPayroll: 3500000,
      avgSalary: 45000,
      totalDeductions: 500000
    };
  }
};
