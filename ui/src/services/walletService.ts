import { rateLimiter } from './rateLimiter';

export interface WalletTransaction {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  category: 'fee_payment' | 'store_purchase' | 'refund' | 'topup' | 'other';
  description: string;
  paymentMethod?: 'cash' | 'card' | 'upi' | 'bank_transfer';
  transactionId?: string;
  status: 'completed' | 'pending' | 'failed';
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  balance: number;
  lastTransactionDate: string;
  status: 'active' | 'blocked' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface WalletFilters {
  studentId?: string;
  type?: WalletTransaction['type'];
  category?: WalletTransaction['category'];
  status?: WalletTransaction['status'];
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
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

function generateMockTransactions(schoolId: string): WalletTransaction[] {
  const types: WalletTransaction['type'][] = ['credit', 'debit'];
  const categories: WalletTransaction['category'][] = ['fee_payment', 'store_purchase', 'refund', 'topup', 'other'];
  const statuses: WalletTransaction['status'][] = ['completed', 'pending', 'failed'];
  const paymentMethods: WalletTransaction['paymentMethod'][] = ['cash', 'card', 'upi', 'bank_transfer'];
  
  return Array.from({ length: 200 }, (_, i) => {
    const type = types[i % types.length];
    const amount = 100 + (i * 50);
    
    return {
      id: `txn-${schoolId}-${i + 1}`,
      schoolId,
      studentId: `stu-${(i % 50) + 1}`,
      studentName: `Student ${(i % 50) + 1}`,
      type,
      amount,
      balance: 5000 + (type === 'credit' ? amount : -amount),
      category: categories[i % categories.length],
      description: `${categories[i % categories.length].replace('_', ' ')} transaction`,
      paymentMethod: paymentMethods[i % paymentMethods.length],
      transactionId: `TXN${Date.now()}-${i}`,
      status: statuses[i % statuses.length],
      transactionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}

function generateMockBalances(schoolId: string): WalletBalance[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: `balance-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    balance: 5000 + (i * 100),
    lastTransactionDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: i % 20 === 0 ? 'blocked' : 'active',
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const walletService = {
  async getTransactions(
    schoolId: string,
    filters?: WalletFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<WalletTransaction>> {
    await rateLimiter.checkLimitAsync(`wallet:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockTransactions(schoolId);

    if (filters?.studentId) {
      data = data.filter(t => t.studentId === filters.studentId);
    }
    if (filters?.type) {
      data = data.filter(t => t.type === filters.type);
    }
    if (filters?.category) {
      data = data.filter(t => t.category === filters.category);
    }
    if (filters?.status) {
      data = data.filter(t => t.status === filters.status);
    }
    if (filters?.dateFrom) {
      data = data.filter(t => t.transactionDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      data = data.filter(t => t.transactionDate <= filters.dateTo!);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(t => t.studentName.toLowerCase().includes(query));
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

  async getBalances(
    schoolId: string,
    filters?: WalletFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<WalletBalance>> {
    await rateLimiter.checkLimitAsync(`wallet:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockBalances(schoolId);

    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(b => b.studentName.toLowerCase().includes(query));
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

  async createTransaction(
    schoolId: string,
    transaction: Omit<WalletTransaction, 'id' | 'schoolId' | 'balance' | 'createdAt' | 'updatedAt'>
  ): Promise<WalletTransaction> {
    await rateLimiter.checkLimitAsync(`wallet:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const currentBalance = 5000;
    const newBalance = transaction.type === 'credit' 
      ? currentBalance + transaction.amount 
      : currentBalance - transaction.amount;

    return {
      id: `txn-${schoolId}-${Date.now()}`,
      schoolId,
      balance: newBalance,
      ...transaction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getWalletStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`wallet:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalBalance: 250000,
      totalStudents: 50,
      avgBalance: 5000,
      totalCredits: 150000,
      totalDebits: 100000,
      pendingTransactions: 5
    };
  }
};
