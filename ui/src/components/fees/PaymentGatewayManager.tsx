import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getGatewayConfigs,
  getTransactions,
  getRefunds,
  getPaymentStats,
  initiateRefund,
  deleteGatewayConfig,
  type PaymentTransaction,
  type PaymentRefund,
  type InitiateRefundRequest,
} from "@/services/api/paymentGatewayApi";

const statusColor: Record<string, string> = {
  Success: "bg-green-100 text-green-800",
  Failed: "bg-red-100 text-red-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Initiated: "bg-blue-100 text-blue-800",
  Refunded: "bg-purple-100 text-purple-800",
  Cancelled: "bg-gray-100 text-gray-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${statusColor[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function fmt(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function RefundDialog({ transaction, onClose }: { transaction: PaymentTransaction; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const refundMut = useMutation({
    mutationFn: (req: InitiateRefundRequest) => initiateRefund(req),
    onSuccess: () => {
      toast.success("Refund initiated successfully");
      queryClient.invalidateQueries({ queryKey: ["pg-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pg-refunds"] });
      queryClient.invalidateQueries({ queryKey: ["pg-stats"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Refund failed"),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid refund amount"); return; }
    refundMut.mutate({ paymentTransactionId: transaction.id, refundAmount: parsed, reason });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">Initiate Refund</h3>
        <p className="text-sm text-gray-600 mb-4">Transaction: <span className="font-mono">{transaction.transactionId}</span> | Original: {fmt(transaction.amount, transaction.currency)}</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Refund Amount (Rs.)</label>
            <input type="number" step="0.01" max={transaction.amount} min="1" className="w-full border rounded px-3 py-2 text-sm" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Customer requested refund" required />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={refundMut.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
              {refundMut.isPending ? "Processing..." : "Initiate Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type Tab = "overview" | "configs" | "transactions" | "refunds";

export function PaymentGatewayManager() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [txPage, setTxPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [txStatus, setTxStatus] = useState("");
  const [txPurpose, setTxPurpose] = useState("");
  const [refundTarget, setRefundTarget] = useState<PaymentTransaction | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["pg-stats"], queryFn: getPaymentStats });
  const { data: configs, isLoading: configsLoading } = useQuery({ queryKey: ["pg-configs"], queryFn: () => getGatewayConfigs(1, 20) });
  const { data: transactions, isLoading: txLoading } = useQuery({ queryKey: ["pg-transactions", txPage, txStatus, txPurpose], queryFn: () => getTransactions({ page: txPage, pageSize: 20, status: txStatus || undefined, purpose: txPurpose || undefined }) });
  const { data: refunds, isLoading: refundsLoading } = useQuery({ queryKey: ["pg-refunds", refundPage], queryFn: () => getRefunds(refundPage, 20) });

  const deleteMut = useMutation({
    mutationFn: deleteGatewayConfig,
    onSuccess: () => { toast.success("Gateway configuration deleted"); queryClient.invalidateQueries({ queryKey: ["pg-configs"] }); },
    onError: () => toast.error("Failed to delete gateway configuration"),
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "configs", label: "Gateway Config" },
    { id: "transactions", label: "Transactions" },
    { id: "refunds", label: "Refunds" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Gateway</h1>
          <p className="text-sm text-gray-500 mt-0.5">Powered by <span className="font-semibold text-blue-600">Cashfree Payments</span> — India&apos;s fastest payment gateway</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {statsLoading ? <p className="text-gray-400 text-sm">Loading stats...</p> : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Collected", value: fmt(stats.totalAmountCollected), sub: `${stats.successfulTransactions} successful` },
                  { label: "Net Amount", value: fmt(stats.netAmountCollected), sub: "After fees and refunds" },
                  { label: "Success Rate", value: `${stats.successRate.toFixed(1)}%`, sub: `${stats.totalTransactions} total` },
                  { label: "Total Refunded", value: fmt(stats.totalRefundedAmount), sub: `${stats.totalRefunds} refunds` },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border rounded-lg p-4 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Last 7 Days", value: stats.transactionsLast7Days },
                  { label: "Last 30 Days", value: stats.transactionsLast30Days },
                  { label: "Failed", value: stats.failedTransactions },
                  { label: "Pending / Initiated", value: stats.pendingTransactions },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 border rounded-lg p-3">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-xl font-semibold text-gray-800 mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
              {Object.keys(stats.byPurpose).length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">By Purpose</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.byPurpose).map(([purpose, count]) => (
                      <div key={purpose} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5">
                        <span className="text-sm font-medium text-gray-700">{purpose}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : <p className="text-gray-400 text-sm">No statistics available yet.</p>}
        </div>
      )}

      {activeTab === "configs" && (
        <div className="space-y-4">
          {configsLoading ? <p className="text-gray-400 text-sm">Loading...</p> : configs && configs.configs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>{["Gateway","Merchant ID","Mode","Currency","Fee %","Active","Default",""].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {configs.configs.map(cfg => (
                    <tr key={cfg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{cfg.gatewayName}</td>
                      <td className="px-4 py-3 font-mono text-gray-600 text-xs">{cfg.merchantId}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded font-semibold ${cfg.mode === "Production" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{cfg.mode}</span></td>
                      <td className="px-4 py-3 text-gray-600">{cfg.currency}</td>
                      <td className="px-4 py-3 text-gray-600">{cfg.transactionFeePercentage != null ? `${cfg.transactionFeePercentage}%` : "-"}</td>
                      <td className="px-4 py-3">{cfg.isActive ? <span className="text-green-600 font-semibold">Yes</span> : <span className="text-gray-400">No</span>}</td>
                      <td className="px-4 py-3">{cfg.isDefault ? <span className="text-blue-600 font-semibold">Yes</span> : "-"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => { if (confirm(`Delete ${cfg.gatewayName} configuration?`)) deleteMut.mutate(cfg.id); }} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No gateway configurations found.</p>
              <p className="text-sm mt-1">Configure Cashfree Payments to start accepting payments.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={txStatus} onChange={e => { setTxStatus(e.target.value); setTxPage(1); }} className="border rounded px-3 py-1.5 text-sm">
              <option value="">All Statuses</option>
              {["Initiated","Pending","Success","Failed","Refunded","Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={txPurpose} onChange={e => { setTxPurpose(e.target.value); setTxPage(1); }} className="border rounded px-3 py-1.5 text-sm">
              <option value="">All Purposes</option>
              {["FeePayment","WalletTopup","StorePayment","Donation"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {txLoading ? <p className="text-gray-400 text-sm">Loading transactions...</p> : transactions && transactions.transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>{["Transaction ID","Gateway","Amount","Fee","Purpose","Payer","Status","Date",""].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {transactions.transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{tx.transactionId}</td>
                        <td className="px-4 py-3 text-gray-600">{tx.gatewayName}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(tx.amount, tx.currency)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.transactionFee != null ? fmt(tx.transactionFee, tx.currency) : "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{tx.purpose}</td>
                        <td className="px-4 py-3 text-gray-600">{tx.payerType}</td>
                        <td className="px-4 py-3"><StatusBadge status={tx.status} /></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(tx.createdAt)}</td>
                        <td className="px-4 py-3">{tx.status === "Success" && <button onClick={() => setRefundTarget(tx)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Refund</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{transactions.totalCount} total transactions</span>
                <div className="flex gap-2">
                  <button onClick={() => setTxPage(p => Math.max(1,p-1))} disabled={txPage===1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
                  <span className="px-2 py-1">{txPage} / {transactions.totalPages}</span>
                  <button onClick={() => setTxPage(p => Math.min(transactions.totalPages,p+1))} disabled={txPage>=transactions.totalPages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            </>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No transactions found.</p>}
        </div>
      )}

      {activeTab === "refunds" && (
        <div className="space-y-4">
          {refundsLoading ? <p className="text-gray-400 text-sm">Loading refunds...</p> : refunds && refunds.refunds.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>{["Refund ID","Amount","Reason","Status","Gateway Refund ID","Date"].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {refunds.refunds.map((r: PaymentRefund) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.refundId}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(r.refundAmount)}</td>
                        <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.gatewayRefundId ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{refunds.totalCount} total refunds</span>
                <div className="flex gap-2">
                  <button onClick={() => setRefundPage(p => Math.max(1,p-1))} disabled={refundPage===1} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
                  <span className="px-2 py-1">{refundPage} / {refunds.totalPages}</span>
                  <button onClick={() => setRefundPage(p => Math.min(refunds.totalPages,p+1))} disabled={refundPage>=refunds.totalPages} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
                </div>
              </div>
            </>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No refunds yet.</p>}
        </div>
      )}

      {refundTarget && <RefundDialog transaction={refundTarget} onClose={() => setRefundTarget(null)} />}
    </div>
  );
}
