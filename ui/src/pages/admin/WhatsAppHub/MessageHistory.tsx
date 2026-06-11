import { useEffect, useState } from "react";
import { Search, RefreshCw, CheckCircle, XCircle, Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppMessageLog } from "@/services/api/whatsappApi";

const statusConfig: Record<string, { color: string; icon: JSX.Element }> = {
  Sent: { color: "text-blue-600", icon: <Clock className="h-3 w-3" /> },
  Delivered: { color: "text-emerald-600", icon: <CheckCircle className="h-3 w-3" /> },
  Read: { color: "text-green-700", icon: <CheckCircle className="h-3 w-3" /> },
  Failed: { color: "text-red-600", icon: <XCircle className="h-3 w-3" /> },
  Queued: { color: "text-gray-500", icon: <Clock className="h-3 w-3" /> },
  Blocked: { color: "text-amber-600", icon: <XCircle className="h-3 w-3" /> },
};

export default function WhatsAppMessageHistory() {
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<WhatsAppMessageLog | null>(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await waApi.getMessages({
        page,
        pageSize: 25,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setMessages(data);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, [page, statusFilter]);

  const filtered = search
    ? messages.filter(m =>
        m.recipientPhone.includes(search) ||
        (m.recipientName?.toLowerCase().includes(search.toLowerCase())) ||
        (m.eventKey?.toLowerCase().includes(search.toLowerCase()))
      )
    : messages;

  const deliveryRate = messages.length > 0
    ? Math.round(messages.filter(m => m.status === "Delivered" || m.status === "Read").length / messages.length * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message History</h1>
          <p className="text-gray-500 text-sm mt-1">Track all outbound WhatsApp messages</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Delivery Rate Card */}
      {messages.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-lg font-bold text-green-900">{deliveryRate}% Delivery Rate</p>
            <p className="text-xs text-green-700">Based on last {messages.length} messages shown</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search phone, name, event..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Queued">Queued</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Read">Read</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading messages...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No messages found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Read</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(msg => {
                  const sc = statusConfig[msg.status] ?? { color: "text-gray-500", icon: <Clock className="h-3 w-3" /> };
                  return (
                    <TableRow
                      key={msg.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setDetail(msg)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">{msg.recipientName ?? "—"}</p>
                        <p className="text-xs text-gray-400">{msg.recipientPhone}</p>
                      </TableCell>
                      <TableCell className="text-sm">{msg.templateName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{msg.eventKey ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-sm font-medium ${sc.color}`}>
                          {sc.icon} {msg.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {new Date(msg.createdAt).toLocaleString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleTimeString("en-IN", { hour12: false }) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {msg.readAt ? new Date(msg.readAt).toLocaleTimeString("en-IN", { hour12: false }) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-gray-500 self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={filtered.length < 25} onClick={() => setPage(p => p + 1)}>
          Next
        </Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              {[
                ["Recipient", `${detail.recipientName ?? "—"} (${detail.recipientPhone})`],
                ["Template", detail.templateName ?? "—"],
                ["Event", detail.eventKey ?? "—"],
                ["Status", detail.status],
                ["Queued", new Date(detail.createdAt).toLocaleString("en-IN")],
                detail.deliveredAt && ["Delivered", new Date(detail.deliveredAt).toLocaleString("en-IN")],
                detail.readAt && ["Read", new Date(detail.readAt).toLocaleString("en-IN")],
                detail.errorMessage && ["Error", detail.errorMessage],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-gray-500 shrink-0 w-24">{k}</span>
                  <span className="font-medium text-right break-all">{v as string}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
