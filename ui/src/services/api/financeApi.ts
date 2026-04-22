import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinanceAccountDto {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentAccountId?: string;
  balance: number;
  isActive: boolean;
}

export interface CreateFinanceAccountDto {
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentAccountId?: string;
  description?: string;
}

export interface FinanceTransactionDto {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  categoryId: string;
  categoryName: string;
  date: string;
  description: string;
  source: 'FEE' | 'STORE' | 'PETTY_CASH' | 'DONATION' | 'OTHER';
  receiptUrl?: string;
  createdAt: string;
}

export interface TransactionFiltersDto {
  accountId?: string;
  categoryId?: string;
  type?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface AddIncomeDto {
  accountId: string;
  categoryId: string;
  source: 'FEE' | 'STORE' | 'DONATION' | 'OTHER';
  amount: number;
  date: string;
  description: string;
}

export interface AddExpenseDto {
  accountId: string;
  categoryId: string;
  source: 'FEE' | 'STORE' | 'PETTY_CASH' | 'DONATION' | 'OTHER';
  amount: number;
  date: string;
  description: string;
}

export interface AddStoreIncomeDto {
  accountId: string;
  categoryId: string;
  amount: number;
  date: string;
  description: string;
}

export interface FinanceCategoryDto {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  budget?: number;
  actualAmount: number;
  isActive: boolean;
}

export interface CreateFinanceCategoryDto {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  budget?: number;
  description?: string;
}

export interface UpdateFinanceCategoryDto {
  name?: string;
  budget?: number;
}

export interface PettyCashEntryDto {
  id: string;
  date: string;
  amount: number;
  purpose: string;
  requestedByName: string;
  approvedByName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  receiptUrl?: string;
  approvalRemarks?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface CreatePettyCashEntryDto {
  date: string;
  amount: number;
  purpose: string;
  receiptUrl?: string;
}

export interface ApprovePettyCashDto {
  status: 'APPROVED' | 'REJECTED';
  approvalRemarks?: string;
}

export interface StoreSaleDto {
  id: string;
  date: string;
  amount: number;
  itemsCount: number;
  paymentMethod: string;
  invoiceNumber?: string;
  processedByName?: string;
  createdAt: string;
}

export interface CreateStoreSaleDto {
  date: string;
  amount: number;
  itemsCount: number;
  paymentMethod: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface FinanceStatsDto {
  cashOnHand: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  todayIncome: number;
  todayExpenses: number;
  pendingPettyCash: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
}

export interface MonthlyTrendDto {
  month: string;
  year: number;
  monthNumber: number;
  income: number;
  expenses: number;
  net: number;
}

export interface BudgetSummaryDto {
  categoryName: string;
  categoryType: string;
  budget: number;
  actual: number;
  variance: number;
  utilizationPct: number;
}

export interface FinanceReportDto {
  dateFrom: string;
  dateTo: string;
  totalIncome: number;
  totalExpenses: number;
  netSurplus: number;
  storeSalesTotal: number;
  pettyCashTotal: number;
  monthlyTrend: MonthlyTrendDto[];
  budgetSummary: BudgetSummaryDto[];
}

export interface IncomeSourceDto {
  sourceName: string;
  sourceCategory: string;
  thisMonth: number;
  lastMonth: number;
  yearToDate: number;
  pending: number;
  transactionCount: number;
  lastTransactionDate?: string;
}

export interface AggregatedIncomeDto {
  sources: IncomeSourceDto[];
  totalThisMonth: number;
  totalLastMonth: number;
  totalYearToDate: number;
  totalPending: number;
  totalTransactions: number;
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const BASE = '/finance';

export const financeApi = {
  // Stats
  getStats: (filters?: { dateFrom?: string; dateTo?: string }) =>
    apiClient.get<FinanceStatsDto>(`${BASE}/stats`, { params: filters }).then(r => r.data),

  // Report
  getReport: (dateFrom?: string, dateTo?: string) =>
    apiClient
      .get<FinanceReportDto>(`${BASE}/report`, { params: { dateFrom, dateTo } })
      .then(r => r.data),

  // Aggregated Income Sources
  getIncomeSources: () =>
    apiClient.get<AggregatedIncomeDto>(`${BASE}/income-sources`).then(r => r.data),

  // Accounts
  getAccounts: () =>
    apiClient.get<FinanceAccountDto[]>(`${BASE}/accounts`).then(r => r.data),
  createAccount: (dto: CreateFinanceAccountDto) =>
    apiClient.post<FinanceAccountDto>(`${BASE}/accounts`, dto).then(r => r.data),

  // Transactions
  getTransactions: (filters: TransactionFiltersDto, page = 1, pageSize = 20) =>
    apiClient
      .get<PaginatedResponse<FinanceTransactionDto>>(`${BASE}/transactions`, {
        params: { ...filters, page, pageSize },
      })
      .then(r => r.data),

  addIncome: (dto: AddIncomeDto) =>
    apiClient.post<FinanceTransactionDto>(`${BASE}/income`, dto).then(r => r.data),

  addExpense: (dto: AddExpenseDto) =>
    apiClient.post<FinanceTransactionDto>(`${BASE}/expenses`, dto).then(r => r.data),

  addStoreIncome: (dto: AddStoreIncomeDto) =>
    apiClient.post<FinanceTransactionDto>(`${BASE}/store-income`, dto).then(r => r.data),

  // Categories
  getCategories: (type?: 'INCOME' | 'EXPENSE') =>
    apiClient
      .get<FinanceCategoryDto[]>(`${BASE}/categories`, { params: type ? { type } : undefined })
      .then(r => r.data),
  createCategory: (dto: CreateFinanceCategoryDto) =>
    apiClient.post<FinanceCategoryDto>(`${BASE}/categories`, dto).then(r => r.data),
  updateCategory: (id: string, dto: UpdateFinanceCategoryDto) =>
    apiClient.put<FinanceCategoryDto>(`${BASE}/categories/${id}`, dto).then(r => r.data),

  // Petty Cash
  getPettyCash: (page = 1, pageSize = 20) =>
    apiClient
      .get<PaginatedResponse<PettyCashEntryDto>>(`${BASE}/petty-cash`, {
        params: { page, pageSize },
      })
      .then(r => r.data),
  createPettyCash: (dto: CreatePettyCashEntryDto) =>
    apiClient.post<PettyCashEntryDto>(`${BASE}/petty-cash`, dto).then(r => r.data),
  approvePettyCash: (entryId: string, dto: ApprovePettyCashDto) =>
    apiClient
      .put<PettyCashEntryDto>(`${BASE}/petty-cash/${entryId}/approve`, dto)
      .then(r => r.data),

  // Store Sales
  getStoreSales: (page = 1, pageSize = 20) =>
    apiClient
      .get<PaginatedResponse<StoreSaleDto>>(`${BASE}/store-sales`, {
        params: { page, pageSize },
      })
      .then(r => r.data),
  createStoreSale: (dto: CreateStoreSaleDto) =>
    apiClient.post<StoreSaleDto>(`${BASE}/store-sales`, dto).then(r => r.data),
};
