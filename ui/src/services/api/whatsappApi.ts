import apiClient from './apiClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  metaTemplateId?: string;
  bodyText: string;
  headerType: string;
  headerValue?: string;
  footerText?: string;
  hasButtons: boolean;
  eventCategory?: string;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface WhatsAppUsageSummary {
  quota: number;
  used: number;
  remaining: number;
  carryForward: number;
  plan: string;
  overagePolicy: string;
  usedPct: number;
  sentToday: number;
  deliveredToday: number;
  failedToday: number;
}

export interface WhatsAppMessageLog {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  templateName?: string;
  status: string;
  eventKey?: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
}

export interface WhatsAppSettings {
  isEnabled: boolean;
  autoSendOnEvents: boolean;
  defaultLanguage: string;
  crmAccountId?: number;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  entityType: string;
  isOptedIn: boolean;
  isOptedOut: boolean;
  isBlacklisted: boolean;
  optInAt?: string;
  optOutAt?: string;
}

export interface WhatsAppTemplateMapping {
  id: string;
  eventKey: string;
  templateId: string;
  isEnabled: boolean;
  audienceType: string;
}

// ── Super Admin Types ─────────────────────────────────────────────────────────

export interface WhatsAppHubDashboard {
  totalActiveSchools: number;
  totalMessagesMtd: number;
  totalRevenueMtd: number;
  totalProviderCostMtd: number;
  grossProfitMtd: number;
  grossMarginPct: number;
  pendingRenewals: number;
  exhaustedQuota: number;
  failedMessages24h: number;
  topConsumers: SchoolUsageSummary[];
}

export interface SchoolUsageSummary {
  schoolId: number;
  schoolName: string;
  messagesSent: number;
  revenue: number;
  cost: number;
  margin: number;
}

export interface WhatsAppPlan {
  id: number;
  planName: string;
  monthlyQuota: number;
  baseMonthlyPriceInr: number;
  overageAllowed: boolean;
  overageChargePerMessageInr: number;
  isActive: boolean;
}

export interface SchoolAccount {
  id: number;
  schoolId: number;
  schoolName: string;
  mode: string;
  displayPhoneNumber?: string;
  isActive: boolean;
  status: string;
}

export interface SchoolSubscription {
  id: number;
  schoolId: number;
  schoolName: string;
  planName: string;
  status: string;
  messagesUsed: number;
  messagesQuota: number;
  currentPeriodEnd: string;
}

export interface WhatsAppCostDashboard {
  totalProviderCostInr: number;
  totalRevenueInr: number;
  grossProfit: number;
  grossMarginPct: number;
  monthlyRevenue: MonthlyRevenue[];
  schoolCosts: SchoolCost[];
  expectedNextMonthRevenue: number;
  expectedNextMonthCost: number;
}

export interface MonthlyRevenue {
  period: string;
  providerCost: number;
  revenue: number;
  profit: number;
}

export interface SchoolCost {
  schoolId: number;
  schoolName: string;
  providerCost: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

export interface PricingConfig {
  id: number;
  markupPct: number;
  serviceChargeInr: number;
  platformFeeInr: number;
  gstPct: number;
  effectiveFrom: string;
}

export interface BillingInvoice {
  id: string;
  schoolId: number;
  schoolName: string;
  periodStart: string;
  periodEnd: string;
  totalAmountInr: number;
  status: string;
}

export interface UpcomingRenewal {
  subscriptionId: number;
  schoolId: number;
  schoolName: string;
  renewalDate: string;
  planName: string;
  amount: number;
}

// ── School Admin API ──────────────────────────────────────────────────────────

export const getTemplates = (status?: string) =>
  apiClient.get<WhatsAppTemplate[]>('/api/whatsapp/templates', { params: { status } }).then(r => r.data);

export const getTemplate = (id: string) =>
  apiClient.get<WhatsAppTemplate>(`/api/whatsapp/templates/${id}`).then(r => r.data);

export const createTemplate = (data: Partial<WhatsAppTemplate>) =>
  apiClient.post<WhatsAppTemplate>('/api/whatsapp/templates', data).then(r => r.data);

export const updateTemplate = (id: string, data: Partial<WhatsAppTemplate>) =>
  apiClient.put<WhatsAppTemplate>(`/api/whatsapp/templates/${id}`, data).then(r => r.data);

export const deleteTemplate = (id: string) =>
  apiClient.delete(`/api/whatsapp/templates/${id}`);

export const submitTemplate = (id: string) =>
  apiClient.post(`/api/whatsapp/templates/${id}/submit`).then(r => r.data);

export const previewTemplate = (id: string, sampleData: Record<string, string>) =>
  apiClient.get<{ preview: string }>(`/api/whatsapp/templates/${id}/preview`, {
    params: { sampleData: JSON.stringify(sampleData) }
  }).then(r => r.data.preview);

export const getTemplateMappings = () =>
  apiClient.get<WhatsAppTemplateMapping[]>('/api/whatsapp/template-mappings').then(r => r.data);

export const updateTemplateMapping = (eventKey: string, data: { templateId: string; isEnabled: boolean; audienceType?: string }) =>
  apiClient.put(`/api/whatsapp/template-mappings/${eventKey}`, data).then(r => r.data);

export const getMessages = (params?: { page?: number; pageSize?: number; status?: string; from?: string; to?: string }) =>
  apiClient.get<WhatsAppMessageLog[]>('/api/whatsapp/messages', { params }).then(r => r.data);

export const sendTestMessage = (data: { templateName: string; recipientPhone: string; placeholders: Record<string, string> }) =>
  apiClient.post('/api/whatsapp/messages/test', data).then(r => r.data);

export const getUsage = () =>
  apiClient.get<WhatsAppUsageSummary>('/api/whatsapp/usage').then(r => r.data);

export const getUsageHistory = () =>
  apiClient.get('/api/whatsapp/usage/history').then(r => r.data);

export const getContacts = (params?: { page?: number; pageSize?: number }) =>
  apiClient.get<WhatsAppContact[]>('/api/whatsapp/contacts', { params }).then(r => r.data);

export const optOutContact = (id: string) =>
  apiClient.put(`/api/whatsapp/contacts/${id}/opt-out`);

export const optInContact = (id: string) =>
  apiClient.put(`/api/whatsapp/contacts/${id}/opt-in`);

export const blacklistContact = (id: string, reason: string) =>
  apiClient.put(`/api/whatsapp/contacts/${id}/blacklist`, { reason });

export const getSettings = () =>
  apiClient.get<WhatsAppSettings>('/api/whatsapp/settings').then(r => r.data);

export const updateSettings = (data: Partial<WhatsAppSettings>) =>
  apiClient.put<WhatsAppSettings>('/api/whatsapp/settings', data).then(r => r.data);

export const getAnalytics = () =>
  apiClient.get('/api/whatsapp/analytics/dashboard').then(r => r.data);

// ── Super Admin API ───────────────────────────────────────────────────────────

export const getHubDashboard = () =>
  apiClient.get<WhatsAppHubDashboard>('/api/super-admin/whatsapp/dashboard').then(r => r.data);

export const getProviders = () =>
  apiClient.get('/api/super-admin/whatsapp/providers').then(r => r.data);

export const createProvider = (data: { name: string; apiBaseUrl: string; apiVersion?: string; webhookVerifyToken?: string }) =>
  apiClient.post('/api/super-admin/whatsapp/providers', data).then(r => r.data);

export const getSchoolAccounts = (params?: { page?: number; pageSize?: number }) =>
  apiClient.get<SchoolAccount[]>('/api/super-admin/whatsapp/accounts', { params }).then(r => r.data);

export const getPlans = () =>
  apiClient.get<WhatsAppPlan[]>('/api/super-admin/whatsapp/plans').then(r => r.data);

export const createPlan = (data: Partial<WhatsAppPlan>) =>
  apiClient.post<WhatsAppPlan>('/api/super-admin/whatsapp/plans', data).then(r => r.data);

export const getSubscriptions = () =>
  apiClient.get<SchoolSubscription[]>('/api/super-admin/whatsapp/subscriptions').then(r => r.data);

export const assignPlan = (data: { accountId: number; planId: number; renewalPolicy?: string; overagePolicy?: string; autoRenew?: boolean }) =>
  apiClient.post('/api/super-admin/whatsapp/subscriptions', data).then(r => r.data);

export const getCostDashboard = () =>
  apiClient.get<WhatsAppCostDashboard>('/api/super-admin/whatsapp/costs').then(r => r.data);

export const getInvoices = (params?: { page?: number; pageSize?: number }) =>
  apiClient.get<BillingInvoice[]>('/api/super-admin/whatsapp/billing/invoices', { params }).then(r => r.data);

export const getUpcomingRenewals = (days?: number) =>
  apiClient.get<UpcomingRenewal[]>('/api/super-admin/whatsapp/renewals/upcoming', { params: { days } }).then(r => r.data);

export const getPricingConfig = () =>
  apiClient.get<PricingConfig>('/api/super-admin/whatsapp/pricing-config').then(r => r.data);

export const updatePricingConfig = (data: Omit<PricingConfig, 'id' | 'effectiveFrom'> & { updatedBy: number }) =>
  apiClient.put<PricingConfig>('/api/super-admin/whatsapp/pricing-config', data).then(r => r.data);
