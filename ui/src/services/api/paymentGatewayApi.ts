import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentGatewayConfig {
  id: string;
  schoolId: string;
  gatewayName: string;
  merchantId: string;
  mode: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  transactionFeePercentage?: number;
  transactionFeeFixed?: number;
  webhookUrl?: string;
  returnUrl?: string;
  callbackUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentGatewayConfigListResponse {
  configs: PaymentGatewayConfig[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentTransaction {
  id: string;
  schoolId: string;
  transactionId: string;
  gatewayName: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  payerId: string;
  payerType: string;
  amount: number;
  transactionFee?: number;
  netAmount?: number;
  currency: string;
  purpose: string;
  referenceId?: string;
  referenceType?: string;
  status: string;
  paymentMethod?: string;
  paymentDate?: string;
  paymentSessionId?: string;
  paymentLink?: string;
  customerEmail?: string;
  customerPhone?: string;
  bankTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentTransactionListResponse {
  transactions: PaymentTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentRefund {
  id: string;
  schoolId: string;
  refundId: string;
  paymentTransactionId: string;
  gatewayRefundId?: string;
  refundAmount: number;
  reason: string;
  status: string;
  initiatedByStaffId?: string;
  processedDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRefundListResponse {
  refunds: PaymentRefund[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentGatewayStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalRefunds: number;
  totalAmountCollected: number;
  totalRefundedAmount: number;
  totalFeesCharged: number;
  netAmountCollected: number;
  transactionsLast7Days: number;
  transactionsLast30Days: number;
  successRate: number;
  byStatus: Record<string, number>;
  byGateway: Record<string, number>;
  byPurpose: Record<string, number>;
  amountByGateway: Record<string, number>;
}

export interface InitiatePaymentRequest {
  payerId: string;
  payerType: string;
  amount: number;
  purpose: string;
  gatewayName?: string;
  currency?: string;
  referenceId?: string;
  referenceType?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
  additionalData?: string;
}

export interface InitiatePaymentResponse {
  id: string;
  transactionId: string;
  status: string;
  paymentSessionId?: string;
  paymentLink?: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  createdAt: string;
}

export interface CreateGatewayConfigRequest {
  gatewayName: string;
  merchantId: string;
  apiKey: string;
  apiSecret?: string;
  mode: string;
  currency?: string;
  isActive: boolean;
  isDefault: boolean;
  transactionFeePercentage?: number;
  transactionFeeFixed?: number;
  webhookUrl?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface UpdateGatewayConfigRequest {
  apiKey?: string;
  apiSecret?: string;
  mode?: string;
  isActive: boolean;
  isDefault: boolean;
  transactionFeePercentage?: number;
  transactionFeeFixed?: number;
  webhookUrl?: string;
  returnUrl?: string;
  callbackUrl?: string;
}

export interface InitiateRefundRequest {
  paymentTransactionId: string;
  refundAmount: number;
  reason: string;
  remarks?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getGatewayConfigs = (page = 1, pageSize = 10) =>
  apiGet<PaymentGatewayConfigListResponse>(
    `/api/payment-gateway/configs?page=${page}&pageSize=${pageSize}`
  );

export const getGatewayConfigById = (id: string) =>
  apiGet<PaymentGatewayConfig>(`/api/payment-gateway/configs/${id}`);

export const createGatewayConfig = (data: CreateGatewayConfigRequest) =>
  apiPost<PaymentGatewayConfig>(`/api/payment-gateway/configs`, data);

export const updateGatewayConfig = (
  id: string,
  data: UpdateGatewayConfigRequest
) => apiPut<PaymentGatewayConfig>(`/api/payment-gateway/configs/${id}`, data);

export const deleteGatewayConfig = (id: string) =>
  apiDelete<{ success: boolean; message: string }>(
    `/api/payment-gateway/configs/${id}`
  );

export const initiatePayment = (data: InitiatePaymentRequest) =>
  apiPost<InitiatePaymentResponse>(
    `/api/payment-gateway/transactions/initiate`,
    data
  );

export const getTransactions = (params: {
  page?: number;
  pageSize?: number;
  payerId?: string;
  status?: string;
  purpose?: string;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.payerId) q.set("payerId", params.payerId);
  if (params.status) q.set("status", params.status);
  if (params.purpose) q.set("purpose", params.purpose);
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  return apiGet<PaymentTransactionListResponse>(
    `/api/payment-gateway/transactions?${q.toString()}`
  );
};

export const getTransactionById = (id: string) =>
  apiGet<PaymentTransaction>(`/api/payment-gateway/transactions/${id}`);

export const initiateRefund = (data: InitiateRefundRequest) =>
  apiPost<PaymentRefund>(`/api/payment-gateway/refunds`, data);

export const getRefunds = (page = 1, pageSize = 20) =>
  apiGet<PaymentRefundListResponse>(
    `/api/payment-gateway/refunds?page=${page}&pageSize=${pageSize}`
  );

export const getRefundById = (id: string) =>
  apiGet<PaymentRefund>(`/api/payment-gateway/refunds/${id}`);

export const getPaymentStats = () =>
  apiGet<PaymentGatewayStats>(`/api/payment-gateway/stats`);
