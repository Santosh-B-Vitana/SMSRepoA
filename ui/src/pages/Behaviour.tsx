import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Star, Users, CheckCircle, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/apiClient";

const CATEGORIES = [
  "Academic Excellence", "Sports Achievement", "Community Service",
  "Bullying", "Violence", "Tardiness", "Disruptive Behaviour",
  "Property Damage", "Dress Code Violation", "Mobile Phone Violation", "Other",
];

interface BehaviourRecord {
  id: string;
  incidentType: "positive" | "negative";
  category: string;
  incidentDate: string;
  description: string;
  actionTaken?: string;
  points: number;
  status: string;
  studentName?: string;
  studentAdmissionNumber?: string;
  reportedBy?: string;
  parentNotified: boolean;
}

function LogIncidentDialog({ onLogged }: { onLogged: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    studentId: "",
    incidentType: "negative",
    category: "Other",
    incidentDate: new Date().toISOString().split("T")[0],
    description: "",
    actionTaken: "",
    points: 0,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiPost("/behaviour", {
        ...data,
        incidentDate: new Date(data.incidentDate).toISOString(),
        points: form.incidentType === "positive" ? Math.abs(Number(form.points)) : -Math.abs(Number(form.points)),
      }),
    onSuccess: () => {
      toast({ title: "Incident logged successfully." });
      setOpen(false);
      onLogged();
    },
    onError: () => toast({ title: "Failed to log incident.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Log Incident</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Behaviour Incident</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Student ID / Name *</Label>
            <Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              placeholder="Student ID" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.incidentType} onValueChange={(v) => setForm({ ...form, incidentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Merit (Positive)</SelectItem>
                  <SelectItem value="negative">Demerit (Negative)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.incidentDate}
                onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the incident in detail…" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Action Taken</Label>
              <Input value={form.actionTaken}
                onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                placeholder="e.g. Warning issued" />
            </div>
            <div>
              <Label>Points</Label>
              <Input type="number" value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} min={0} />
            </div>
          </div>
          <Button className="w-full"
            disabled={mutation.isPending || !form.studentId || !form.description}
            onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "Logging…" : "Log Incident"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Behaviour() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<{ items: BehaviourRecord[]; totalCount: number }>({
    queryKey: ["behaviour-records", typeFilter, statusFilter],
    queryFn: () =>
      apiGet<{ items: BehaviourRecord[]; totalCount: number }>("/behaviour", {
        incidentType: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        pageSize: 50,
      }),
    staleTime: 60_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["behaviour-analytics"],
    queryFn: () => apiGet<Record<string, number>>("/behaviour/analytics", { days: 30 }),
    staleTime: 5 * 60_000,
  });

  const records = data?.items ?? [];
  const ana = analytics as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Behaviour & Discipline</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage student behaviour incidents and merits.</p>
        </div>
        <LogIncidentDialog onLogged={() => queryClient.invalidateQueries({ queryKey: ["behaviour-records"] })} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: ana?.totalRecords ?? 0, icon: Users },
          { label: "Merits", value: ana?.merits ?? 0, icon: Star, color: "text-green-600" },
          { label: "Demerits", value: ana?.demerits ?? 0, icon: AlertTriangle, color: "text-red-600" },
          { label: "Open Cases", value: ana?.open ?? 0, icon: TrendingUp },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Icon className={`h-5 w-5 ${color ?? "text-blue-600"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { key: "type", options: [{ v: "all", l: "All Types" }, { v: "positive", l: "Merits" }, { v: "negative", l: "Demerits" }], value: typeFilter, onChange: setTypeFilter },
          { key: "status", options: [{ v: "all", l: "All Status" }, { v: "open", l: "Open" }, { v: "resolved", l: "Resolved" }], value: statusFilter, onChange: setStatusFilter },
        ].map(({ key, options, value, onChange }) => (
          <Select key={key} value={value} onValueChange={onChange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(({ v, l }) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              No behaviour records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.studentName ?? "—"}</div>
                      {r.studentAdmissionNumber && (
                        <div className="text-xs text-gray-400">{r.studentAdmissionNumber}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.incidentType === "positive" ? "default" : "destructive"}>
                        {r.incidentType === "positive" ? "Merit" : "Demerit"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.category}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(r.incidentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className={r.points >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {r.points >= 0 ? `+${r.points}` : r.points}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "resolved" ? "secondary" : "outline"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{r.reportedBy ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
