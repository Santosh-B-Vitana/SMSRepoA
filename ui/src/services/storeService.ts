import { rateLimiter } from './rateLimiter';

export interface StoreItem {
  id: string;
  schoolId: string;
  name: string;
  category: 'uniform' | 'books' | 'stationery' | 'sports' | 'other';
  description?: string;
  price: number;
  stock: number;
  minStock: number;
  supplier?: string;
  status: 'available' | 'low_stock' | 'out_of_stock';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSale {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'wallet';
  transactionId?: string;
  saleDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreFilters {
  category?: StoreItem['category'];
  status?: StoreItem['status'];
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

function generateMockItems(schoolId: string): StoreItem[] {
  const categories: StoreItem['category'][] = ['uniform', 'books', 'stationery', 'sports', 'other'];
  const statuses: StoreItem['status'][] = ['available', 'low_stock', 'out_of_stock'];
  
  return Array.from({ length: 100 }, (_, i) => ({
    id: `item-${schoolId}-${i + 1}`,
    schoolId,
    name: `Item ${i + 1}`,
    category: categories[i % categories.length],
    description: `Description for item ${i + 1}`,
    price: 100 + (i * 50),
    stock: i % 10 === 0 ? 0 : 50 - (i % 50),
    minStock: 10,
    supplier: `Supplier ${(i % 5) + 1}`,
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockSales(schoolId: string): StoreSale[] {
  const paymentMethods: StoreSale['paymentMethod'][] = ['cash', 'card', 'upi', 'wallet'];
  
  return Array.from({ length: 200 }, (_, i) => ({
    id: `sale-${schoolId}-${i + 1}`,
    schoolId,
    studentId: `stu-${(i % 50) + 1}`,
    studentName: `Student ${(i % 50) + 1}`,
    items: [
      {
        itemId: `item-${schoolId}-${(i % 100) + 1}`,
        itemName: `Item ${(i % 100) + 1}`,
        quantity: (i % 3) + 1,
        price: 100 + ((i % 100) * 50),
        total: (100 + ((i % 100) * 50)) * ((i % 3) + 1)
      }
    ],
    totalAmount: (100 + ((i % 100) * 50)) * ((i % 3) + 1),
    paymentMethod: paymentMethods[i % paymentMethods.length],
    transactionId: `TXN${Date.now()}-${i}`,
    saleDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const storeService = {
  async getItems(
    schoolId: string,
    filters?: StoreFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<StoreItem>> {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockItems(schoolId);

    if (filters?.category) {
      data = data.filter(i => i.category === filters.category);
    }
    if (filters?.status) {
      data = data.filter(i => i.status === filters.status);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(i => i.name.toLowerCase().includes(query));
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

  async getSales(
    schoolId: string,
    filters?: StoreFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<StoreSale>> {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockSales(schoolId);

    if (filters?.dateFrom) {
      data = data.filter(s => s.saleDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      data = data.filter(s => s.saleDate <= filters.dateTo!);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(s => s.studentName.toLowerCase().includes(query));
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

  async createItem(
    schoolId: string,
    item: Omit<StoreItem, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<StoreItem> {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `item-${schoolId}-${Date.now()}`,
      schoolId,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async createSale(
    schoolId: string,
    sale: Omit<StoreSale, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<StoreSale> {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      id: `sale-${schoolId}-${Date.now()}`,
      schoolId,
      ...sale,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async updateStock(
    schoolId: string,
    itemId: string,
    quantity: number
  ): Promise<StoreItem> {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const currentStock = 50;
    const newStock = currentStock + quantity;

    return {
      id: itemId,
      schoolId,
      name: 'Item',
      category: 'uniform',
      price: 100,
      stock: newStock,
      minStock: 10,
      status: newStock === 0 ? 'out_of_stock' : newStock < 10 ? 'low_stock' : 'available',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async getStoreStats(schoolId: string) {
    await rateLimiter.checkLimitAsync(`store:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      totalItems: 100,
      lowStockItems: 15,
      outOfStockItems: 10,
      totalSales: 200,
      monthlyRevenue: 150000,
      topSellingItems: 5
    };
  }
};
