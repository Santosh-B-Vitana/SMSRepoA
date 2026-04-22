import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoreItemResponse {
  id: string;
  schoolId: string;
  name: string;
  itemCode?: string;
  description?: string;
  category: string;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  unit?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreItemListResponse {
  items: StoreItemResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateStoreItemDto {
  name: string;
  itemCode?: string;
  description?: string;
  category: string;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  unit?: string;
  imageUrl?: string;
}

export interface UpdateStoreItemDto {
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  isAvailable: boolean;
  isActive: boolean;
}

export interface AdjustStockDto {
  transactionType: 'Purchase' | 'Adjustment' | 'Return' | 'Damage';
  quantity: number;           // positive = add, negative = deduct
  remarks?: string;
  reference?: string;
}

export interface StoreOrderItemResponse {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  remarks?: string;
}

export interface StoreOrderResponse {
  id: string;
  schoolId: string;
  orderNumber: string;
  customerId: string;
  customerType: string;
  customerName?: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentDate?: string;
  paymentReference?: string;
  deliveryDate?: string;
  processedByStaffId?: string;
  processedByStaffName?: string;
  remarks?: string;
  items: StoreOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreOrderListResponse {
  items: StoreOrderResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderItemDto {
  itemId: string;
  quantity: number;
}

export interface CreateStoreOrderDto {
  customerId?: string;
  customerName?: string;
  customerType: string;
  items: OrderItemDto[];
  paymentMethod?: string;
  paymentReference?: string;
  globalDiscount: number;
  markAsPaid: boolean;
  remarks?: string;
}

export interface UpdateOrderStatusDto {
  status: string;
  deliveryDate?: string;
  remarks?: string;
}

export interface MarkOrderPaidDto {
  paymentMethod: string;
  paymentReference?: string;
}

export interface InventoryLogResponse {
  id: string;
  itemId: string;
  itemName: string;
  transactionType: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reference?: string;
  remarks?: string;
  processedByStaffId?: string;
  processedByStaffName?: string;
  createdAt: string;
}

export interface InventoryLogListResponse {
  items: InventoryLogResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StoreStatsDto {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  thisMonthRevenue: number;
  totalRevenue: number;
  todayOrders: number;
  revenueByCategory: Record<string, number>;
  lowStockAlerts: StoreItemResponse[];
}

// ─── API Client ───────────────────────────────────────────────────────────────

const BASE = '/store';

export const storeApi = {
  // Stats
  getStats: () =>
    apiClient.get<StoreStatsDto>(`${BASE}/stats`).then(r => r.data),

  // Items
  getItems: (params?: { page?: number; pageSize?: number; category?: string; searchTerm?: string }) =>
    apiClient.get<StoreItemListResponse>(`${BASE}/items`, { params }).then(r => r.data),

  getItemById: (id: string) =>
    apiClient.get<StoreItemResponse>(`${BASE}/items/${id}`).then(r => r.data),

  createItem: (dto: CreateStoreItemDto) =>
    apiClient.post<StoreItemResponse>(`${BASE}/items`, dto).then(r => r.data),

  updateItem: (id: string, dto: UpdateStoreItemDto) =>
    apiClient.put<StoreItemResponse>(`${BASE}/items/${id}`, dto).then(r => r.data),

  deleteItem: (id: string) =>
    apiClient.delete(`${BASE}/items/${id}`),

  adjustStock: (id: string, dto: AdjustStockDto) =>
    apiClient.post<StoreItemResponse>(`${BASE}/items/${id}/adjust-stock`, dto).then(r => r.data),

  // Orders
  getOrders: (params?: { page?: number; pageSize?: number; status?: string; customerId?: string }) =>
    apiClient.get<StoreOrderListResponse>(`${BASE}/orders`, { params }).then(r => r.data),

  getOrderById: (id: string) =>
    apiClient.get<StoreOrderResponse>(`${BASE}/orders/${id}`).then(r => r.data),

  createOrder: (dto: CreateStoreOrderDto) =>
    apiClient.post<StoreOrderResponse>(`${BASE}/orders`, dto).then(r => r.data),

  updateOrderStatus: (id: string, dto: UpdateOrderStatusDto) =>
    apiClient.put<StoreOrderResponse>(`${BASE}/orders/${id}/status`, dto).then(r => r.data),

  markOrderPaid: (id: string, dto: MarkOrderPaidDto) =>
    apiClient.put<StoreOrderResponse>(`${BASE}/orders/${id}/payment`, dto).then(r => r.data),

  // Inventory logs
  getInventoryLogs: (itemId: string, params?: { page?: number; pageSize?: number }) =>
    apiClient.get<InventoryLogListResponse>(`${BASE}/inventory/${itemId}`, { params }).then(r => r.data),
};
