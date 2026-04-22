// Fee Module Service Layer - Multi-tenant Ready
// Provides abstraction for fee-related data operations
// Easy to replace with real API calls later

export interface FeeRecord {
  id: string;
  schoolId: string; // Multi-tenancy support
  studentId: string;
  studentName: string;
  class: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  dueDate: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  lastPaymentDate?: string;
  siblings?: {
    id: string;
    name: string;
    class: string;
    pendingAmount: number;
  }[];
}

export interface PaymentTransaction {
  id: string;
  schoolId: string; // Multi-tenancy support
  studentId: string;
  studentName?: string;
  amount: number;
  method: 'cash' | 'card' | 'online' | 'cheque' | 'razorpay' | 'payu';
  status: 'success' | 'pending' | 'failed' | 'completed';
  date: string;
  receiptNumber?: string;
  createdAt: string;
  timestamp?: string;
  gatewayRef?: string;
  academicYear?: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string; // Multi-tenancy support
  name: string;
  class: string;
  academicYear: string;
  amount: number;
  totalAmount: number;
  description?: string;
  components: {
    tuition?: number;
    tuitionFee?: number;
    books?: number;
    uniform?: number;
    transport?: number;
    other?: number;
    admissionFee?: number;
    examFee?: number;
    libraryFee?: number;
    labFee?: number;
    sportsFee?: number;
    miscellaneous?: number;
  };
  installments?: {
    count: number;
    amounts: number[];
    dueDates: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPlan {
  id: string;
  schoolId: string; // Multi-tenancy support
  studentId: string;
  studentName: string;
  totalAmount: number;
  totalFee: number;
  installments: {
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    paidAmount?: number;
    paidDate?: string;
    lateFee?: number;
  }[];
  academicYear: string;
  createdAt: string;
}

export interface FeeFilters {
  schoolId?: string; // Multi-tenancy support
  status?: 'paid' | 'pending' | 'overdue' | 'partial';
  class?: string;
  section?: string;
  academicYear?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  studentIds?: string[]; // Bulk filtering
}

// Cursor-based pagination for better performance at scale
export interface CursorPaginationParams {
  cursor?: string; // Last record ID from previous page
  limit: number;
  direction?: 'forward' | 'backward';
}

// Keep offset pagination for backward compatibility
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasMore: boolean;
  total?: number; // Optional, can be expensive to calculate
}

// Mock data generator for multi-tenant simulation
function generateMockFeeRecords(schoolId: string, count: number = 50): FeeRecord[] {
  const records: FeeRecord[] = [];
  const classes = ['10-A', '9-B', '11-C', '8-A', '12-B'];
  const statuses: Array<'paid' | 'pending' | 'overdue' | 'partial'> = ['paid', 'pending', 'overdue', 'partial'];
  
  for (let i = 1; i <= count; i++) {
    const totalAmount = 40000 + Math.random() * 30000;
    const paidAmount = statuses[i % statuses.length] === 'paid' ? totalAmount : 
                       statuses[i % statuses.length] === 'partial' ? totalAmount * 0.5 : 0;
    
    records.push({
      id: `${schoolId}-fee-${i}`,
      schoolId,
      studentId: `${schoolId}-S${String(i).padStart(4, '0')}`,
      studentName: `Student ${i}`,
      class: classes[i % classes.length],
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      status: statuses[i % statuses.length],
      dueDate: new Date(2024, (i % 12), 28).toISOString().split('T')[0],
      academicYear: '2024-25',
      createdAt: new Date(2023, 6, i).toISOString(),
      updatedAt: new Date().toISOString(),
      lastPaymentDate: paidAmount > 0 ? new Date(2024, 2, i).toISOString().split('T')[0] : undefined
    });
  }
  
  return records;
}

// In-memory cache simulating database with multi-tenancy
const schoolFeeRecordsCache = new Map<string, FeeRecord[]>();
const schoolTransactionsCache = new Map<string, PaymentTransaction[]>();
const schoolFeeStructuresCache = new Map<string, FeeStructure[]>();
const schoolInstallmentPlansCache = new Map<string, InstallmentPlan[]>();

// Helper to get or create school data
function getSchoolFeeRecords(schoolId: string): FeeRecord[] {
  if (!schoolFeeRecordsCache.has(schoolId)) {
    schoolFeeRecordsCache.set(schoolId, generateMockFeeRecords(schoolId, 50));
  }
  return schoolFeeRecordsCache.get(schoolId)!;
}

function getSchoolTransactions(schoolId: string): PaymentTransaction[] {
  if (!schoolTransactionsCache.has(schoolId)) {
    const records = getSchoolFeeRecords(schoolId);
    const transactions: PaymentTransaction[] = records
      .filter(r => r.paidAmount > 0)
      .map((r, i) => ({
        id: `${schoolId}-txn-${i + 1}`,
        schoolId,
        studentId: r.studentId,
        studentName: r.studentName,
        amount: r.paidAmount,
        method: (['cash', 'card', 'online', 'cheque'] as const)[i % 4],
        status: 'success' as const,
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        receiptNumber: `RCP-${schoolId}-${String(i + 1).padStart(6, '0')}`,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        timestamp: new Date(2024, 0, i + 1).toISOString(),
        gatewayRef: `pay_${Math.random().toString(36).substr(2, 9)}`,
        academicYear: r.academicYear
      }));
    schoolTransactionsCache.set(schoolId, transactions);
  }
  return schoolTransactionsCache.get(schoolId)!;
}

function getSchoolFeeStructures(schoolId: string): FeeStructure[] {
  if (!schoolFeeStructuresCache.has(schoolId)) {
    const structures: FeeStructure[] = [
      {
        id: `${schoolId}-struct-1`,
        schoolId,
        name: 'Class 10 - Academic Year 2024-25',
        class: '10',
        academicYear: '2024-25',
        amount: 50000,
        totalAmount: 50000,
        description: 'Annual fee for Class 10',
        components: {
          tuition: 30000,
          tuitionFee: 30000,
          books: 5000,
          uniform: 3000,
          transport: 10000,
          other: 2000,
          admissionFee: 5000,
          examFee: 2000,
          libraryFee: 1000,
          labFee: 3000,
          sportsFee: 1500,
          miscellaneous: 2500
        },
        installments: {
          count: 4,
          amounts: [12500, 12500, 12500, 12500],
          dueDates: ['2024-04-15', '2024-07-15', '2024-10-15', '2025-01-15']
        },
        createdAt: new Date(2023, 3, 1).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: `${schoolId}-struct-2`,
        schoolId,
        name: 'Class 9 - Academic Year 2024-25',
        class: '9',
        academicYear: '2024-25',
        amount: 45000,
        totalAmount: 45000,
        description: 'Annual fee for Class 9',
        components: {
          tuition: 28000,
          tuitionFee: 28000,
          books: 4500,
          uniform: 2500,
          transport: 9000,
          other: 1000,
          admissionFee: 4500,
          examFee: 1800,
          libraryFee: 900,
          labFee: 2700,
          sportsFee: 1400,
          miscellaneous: 2200
        },
        createdAt: new Date(2023, 3, 1).toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    schoolFeeStructuresCache.set(schoolId, structures);
  }
  return schoolFeeStructuresCache.get(schoolId)!;
}

class FeeService {
  // Simulate network delay
  private async delay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get fee records with filtering and pagination (MULTI-TENANT)
  async getFeeRecords(
    schoolId: string, // REQUIRED for multi-tenancy
    filters?: FeeFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<FeeRecord>> {
    await this.delay(300);

    // Get school-specific records
    let filtered = getSchoolFeeRecords(schoolId);

    // Apply filters with optimized search
    if (filters?.status) {
      filtered = filtered.filter(record => record.status === filters.status);
    }

    if (filters?.class) {
      filtered = filtered.filter(record => record.class.startsWith(filters.class!));
    }

    if (filters?.academicYear) {
      filtered = filtered.filter(record => record.academicYear === filters.academicYear);
    }

    if (filters?.studentIds && filters.studentIds.length > 0) {
      const studentIdSet = new Set(filters.studentIds);
      filtered = filtered.filter(record => studentIdSet.has(record.studentId));
    }

    // Full-text search simulation
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(record =>
        record.studentName.toLowerCase().includes(searchLower) ||
        record.studentId.toLowerCase().includes(searchLower) ||
        record.class.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.dateFrom) {
      filtered = filtered.filter(record => record.dueDate >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      filtered = filtered.filter(record => record.dueDate <= filters.dateTo!);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const paginatedData = filtered.slice(start, end);
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  // Cursor-based pagination for better performance at scale
  async getFeeRecordsCursor(
    schoolId: string,
    filters?: FeeFilters,
    pagination?: CursorPaginationParams
  ): Promise<CursorPaginatedResponse<FeeRecord>> {
    await this.delay();

    let filtered = getSchoolFeeRecords(schoolId);

    // Apply same filters as above
    if (filters?.status) {
      filtered = filtered.filter(record => record.status === filters.status);
    }
    if (filters?.class) {
      filtered = filtered.filter(record => record.class.startsWith(filters.class!));
    }
    if (filters?.academicYear) {
      filtered = filtered.filter(record => record.academicYear === filters.academicYear);
    }
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(record =>
        record.studentName.toLowerCase().includes(searchLower) ||
        record.studentId.toLowerCase().includes(searchLower)
      );
    }

    // Sort by ID for cursor pagination
    filtered.sort((a, b) => a.id.localeCompare(b.id));

    const limit = pagination?.limit || 20;
    const cursor = pagination?.cursor;

    let startIndex = 0;
    if (cursor) {
      startIndex = filtered.findIndex(r => r.id === cursor);
      if (startIndex === -1) startIndex = 0;
      else startIndex += 1; // Start after cursor
    }

    const data = filtered.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filtered.length;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;
    const previousCursor = startIndex > 0 ? filtered[Math.max(0, startIndex - 1)].id : undefined;

    return {
      data,
      nextCursor,
      previousCursor,
      hasMore,
      total: filtered.length
    };
  }

  // Get single fee record by student ID (MULTI-TENANT)
  async getFeeRecordByStudentId(schoolId: string, studentId: string): Promise<FeeRecord | null> {
    await this.delay(200);
    
    const records = getSchoolFeeRecords(schoolId);
    const record = records.find(r => r.studentId === studentId);
    return record || null;
  }

  // Get payment transactions with filtering (MULTI-TENANT)
  async getTransactions(
    schoolId: string,
    filters?: FeeFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<PaymentTransaction>> {
    await this.delay(300);

    let filtered = getSchoolTransactions(schoolId);

    if (filters?.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        txn =>
          txn.studentName?.toLowerCase().includes(search) ||
          txn.studentId.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;

    if (pagination) {
      const { page, pageSize } = pagination;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      filtered = filtered.slice(start, end);
    }

    return {
      data: filtered,
      total,
      page: pagination?.page || 1,
      pageSize: pagination?.pageSize || total,
      totalPages: pagination ? Math.ceil(total / pagination.pageSize) : 1
    };
  }

  // Process payment (MULTI-TENANT)
  async processPayment(
    schoolId: string,
    studentId: string,
    amount: number,
    method: string
  ): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    await this.delay(300);

    // Validate payment
    if (amount <= 0) {
      return { success: false, error: 'Invalid amount' };
    }

    const records = getSchoolFeeRecords(schoolId);
    const feeRecord = records.find(r => r.studentId === studentId);
    
    if (!feeRecord) {
      return { success: false, error: 'Student not found' };
    }

    if (amount > feeRecord.pendingAmount) {
      return { success: false, error: 'Amount exceeds pending balance' };
    }

    // Create transaction
    const transaction: PaymentTransaction = {
      id: `${schoolId}-txn-${Date.now()}`,
      schoolId,
      studentId,
      studentName: feeRecord.studentName,
      amount,
      method: method as PaymentTransaction['method'],
      status: 'success',
      date: new Date().toISOString().split('T')[0],
      receiptNumber: `RCP-${schoolId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      gatewayRef: `pay_${Math.random().toString(36).substr(2, 9)}`,
      academicYear: feeRecord.academicYear
    };

    // Update caches
    const transactions = getSchoolTransactions(schoolId);
    transactions.unshift(transaction);

    // Update fee record
    feeRecord.paidAmount += amount;
    feeRecord.pendingAmount -= amount;
    feeRecord.updatedAt = new Date().toISOString();
    feeRecord.lastPaymentDate = transaction.date;
    
    if (feeRecord.pendingAmount <= 0) {
      feeRecord.status = 'paid';
      feeRecord.pendingAmount = 0;
    } else if (feeRecord.paidAmount > 0) {
      feeRecord.status = 'partial';
    }

    return { success: true, transaction };
  }

  // Get fee structures (MULTI-TENANT)
  async getFeeStructures(schoolId: string, filters?: FeeFilters): Promise<FeeStructure[]> {
    await this.delay(300);

    let filtered = getSchoolFeeStructures(schoolId);

    if (filters?.class) {
      filtered = filtered.filter(s => s.class.includes(filters.class!));
    }

    if (filters?.academicYear) {
      filtered = filtered.filter(s => s.academicYear === filters.academicYear);
    }

    if (filters?.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        structure =>
          structure.name.toLowerCase().includes(search) ||
          structure.class.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  // Add new fee structure (MULTI-TENANT)
  async addFeeStructure(
    schoolId: string,
    structure: Omit<FeeStructure, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<FeeStructure> {
    await this.delay(500);

    const newStructure: FeeStructure = {
      ...structure,
      id: `${schoolId}-struct-${Date.now()}`,
      schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const structures = getSchoolFeeStructures(schoolId);
    structures.push(newStructure);
    
    return newStructure;
  }

  // Get installment plans (MULTI-TENANT)
  async getInstallmentPlans(schoolId: string, studentId?: string): Promise<InstallmentPlan[]> {
    await this.delay(300);

    // Generate mock installment plans for students with partial payments
    const records = getSchoolFeeRecords(schoolId);
    const partialRecords = studentId 
      ? records.filter(r => r.studentId === studentId)
      : records.filter(r => r.status === 'partial' || r.status === 'pending');

    return partialRecords.map(record => ({
      id: `${schoolId}-plan-${record.studentId}`,
      schoolId,
      studentId: record.studentId,
      studentName: record.studentName,
      totalAmount: record.totalAmount,
      totalFee: record.totalAmount,
      academicYear: record.academicYear,
      installments: [
        {
          id: `${record.id}-inst-1`,
          installmentNumber: 1,
          amount: record.totalAmount * 0.5,
          dueDate: new Date(2024, 5, 30).toISOString().split('T')[0],
          status: record.paidAmount >= record.totalAmount * 0.5 ? 'paid' : 'pending',
          paidAmount: Math.min(record.paidAmount, record.totalAmount * 0.5),
          paidDate: record.paidAmount >= record.totalAmount * 0.5 ? record.lastPaymentDate : undefined,
          lateFee: 0
        },
        {
          id: `${record.id}-inst-2`,
          installmentNumber: 2,
          amount: record.totalAmount * 0.5,
          dueDate: new Date(2024, 11, 31).toISOString().split('T')[0],
          status: record.paidAmount >= record.totalAmount ? 'paid' : 'pending',
          paidAmount: Math.max(0, record.paidAmount - record.totalAmount * 0.5),
          paidDate: record.paidAmount >= record.totalAmount ? record.lastPaymentDate : undefined,
          lateFee: 0
        }
      ],
      createdAt: record.createdAt
    }));
  }

  // Get dashboard statistics (MULTI-TENANT)
  async getDashboardStats(schoolId: string): Promise<{
    totalPending: number;
    overdueCount: number;
    monthlyCollection: number;
    onlinePaymentPercentage: number;
    totalStudents: number;
    totalCollected: number;
  }> {
    await this.delay(200);

    const records = getSchoolFeeRecords(schoolId);
    const transactions = getSchoolTransactions(schoolId);

    const totalPending = records.reduce((sum, record) => sum + record.pendingAmount, 0);
    const overdueCount = records.filter(r => r.status === 'overdue').length;
    
    const currentMonth = new Date().getMonth();
    const monthlyTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth;
    });
    
    const monthlyCollection = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCollected = records.reduce((sum, record) => sum + record.paidAmount, 0);
    
    const onlineTransactions = transactions.filter(t => 
      t.method === 'online' || t.method === 'razorpay' || t.method === 'payu'
    ).length;
    const onlinePaymentPercentage = transactions.length > 0 
      ? (onlineTransactions / transactions.length) * 100 
      : 0;

    return {
      totalPending,
      overdueCount,
      monthlyCollection,
      onlinePaymentPercentage,
      totalStudents: records.length,
      totalCollected
    };
  }

  // Bulk operations for scale
  async bulkProcessPayments(
    schoolId: string,
    payments: Array<{ studentId: string; amount: number; method: string }>
  ): Promise<{ success: boolean; processed: number; failed: number; errors: string[] }> {
    await this.delay(500);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const payment of payments) {
      const result = await this.processPayment(
        schoolId,
        payment.studentId,
        payment.amount,
        payment.method
      );

      if (result.success) {
        processed++;
      } else {
        failed++;
        errors.push(`${payment.studentId}: ${result.error}`);
      }
    }

    return { success: failed === 0, processed, failed, errors };
  }

  // Clear school cache (useful for testing/development)
  clearSchoolCache(schoolId: string): void {
    schoolFeeRecordsCache.delete(schoolId);
    schoolTransactionsCache.delete(schoolId);
    schoolFeeStructuresCache.delete(schoolId);
    schoolInstallmentPlansCache.delete(schoolId);
  }
}

// Export singleton instance
export const feeService = new FeeService();
