import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, FileText, CheckCircle, Loader2, Save, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as taxApi from "@/services/api/staffTaxApi";
import type { StaffTaxDeclaration, CreateTaxDeclarationDto, UpdateTaxStatusDto } from "@/services/api/staffTaxApi";

// ─── Tax Summary Card ────────────────────────────────────────────────────────

function TaxSummaryCard({ decl }: { decl: StaffTaxDeclaration }) {
  const rows = [
    { label: "Gross Salary", value: decl.grossSalary ?? 0 },
    { label: "HRA Exemption", value: -(decl.hraExemption ?? 0) },
    { label: "LTA Exemption", value: -(decl.ltaExemption ?? 0) },
    { label: "Section 80C", value: -(decl.section80C ?? 0) },
    { label: "Section 80D", value: -(decl.section80D ?? 0) },
    { label: "Section 80G", value: -(decl.section80G ?? 0) },
    { label: "Section 80E", value: -(decl.section80E ?? 0) },
    { label: "Home Loan Interest", value: -(decl.homeLoanInterest ?? 0) },
    { label: "Professional Tax", value: -(decl.professionalTax ?? 0) },
    { label: "Total Deductions", value: -(decl.totalDeductions ?? 0), bold: true },
    { label: "Taxable Income", value: decl.taxableIncome ?? 0, bold: true },
    { label: "Tax Before Cess", value: decl.taxBeforecess ?? 0 },
    { label: "Education Cess (4%)", value: decl.educationCess ?? 0 },
    { label: "Total Tax Payable", value: decl.totalTaxPayable ?? 0, bold: true },
    { label: "TDS Deducted", value: -(decl.tdsDeducted ?? 0) },
    { label: "Balance Tax", value: decl.balanceTax ?? 0, bold: true, highlight: true },
  ];

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Tax Computation — {decl.financialYear} ({decl.taxRegime === "old" ? "Old Regime" : "New Regime"})
      </h4>
      {rows.map(r => (
        <div key={r.label} className={`flex justify-between text-sm py-0.5 ${r.bold ? "font-semibold border-t mt-1 pt-1" : ""} ${r.highlight ? "text-blue-700 text-base" : ""}`}>
          <span>{r.label}</span>
          <span className={r.value < 0 ? "text-red-600" : ""}>₹{Math.abs(r.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── NumField — module-level so React never remounts it on parent re-render ──

function NumField({
  label, value, onChange, max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div>
      <Label>{label}{max ? ` (max ₹${max.toLocaleString()})` : ""}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ─── Declaration Form ────────────────────────────────────────────────────────

function DeclarationForm({ initial, onSaved }: { initial?: StaffTaxDeclaration | null; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTaxDeclarationDto>({
    staffId: initial?.staffId ?? "",
    financialYear: initial?.financialYear ?? "2024-25",
    taxRegime: initial?.taxRegime ?? "old",
    basicSalary: initial?.basicSalary ?? 0,
    hra: initial?.hra ?? 0,
    lta: initial?.lta ?? 0,
    medical: initial?.medical ?? 0,
    otherAllowances: initial?.otherAllowances ?? 0,
    hraExemption: initial?.hraExemption ?? 0,
    ltaExemption: initial?.ltaExemption ?? 0,
    section80C: initial?.section80C ?? 0,
    section80D: initial?.section80D ?? 0,
    section80G: initial?.section80G ?? 0,
    section80E: initial?.section80E ?? 0,
    homeLoanInterest: initial?.homeLoanInterest ?? 0,
    professionalTax: initial?.professionalTax ?? 0,
    tdsDeducted: initial?.tdsDeducted ?? 0,
  });

  const setN = (field: keyof CreateTaxDeclarationDto) => (v: number) =>
    setForm(p => ({ ...p, [field]: v }));

  const save = async () => {
    try {
      setSaving(true);
      await taxApi.createOrUpdateTaxDeclaration(form);
      toast({ title: "Declaration saved" });
      onSaved();
    } catch {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Staff ID *</Label>
          <Input value={form.staffId} onChange={e => setForm(p => ({ ...p, staffId: e.target.value }))} disabled={!!initial} />
        </div>
        <div>
          <Label>Financial Year *</Label>
          <Input value={form.financialYear} onChange={e => setForm(p => ({ ...p, financialYear: e.target.value }))} placeholder="2024-25" />
        </div>
        <div>
          <Label>Tax Regime</Label>
          <Select value={form.taxRegime} onValueChange={v => setForm(p => ({ ...p, taxRegime: v as "old" | "new" }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="old">Old Regime</SelectItem>
              <SelectItem value="new">New Regime</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Salary */}
      <div>
        <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Salary Components</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Basic Salary" value={form.basicSalary} onChange={setN("basicSalary")} />
          <NumField label="HRA Received" value={form.hra} onChange={setN("hra")} />
          <NumField label="LTA Received" value={form.lta} onChange={setN("lta")} />
          <NumField label="Medical Allowance" value={form.medical} onChange={setN("medical")} />
          <NumField label="Other Allowances" value={form.otherAllowances} onChange={setN("otherAllowances")} />
        </div>
      </div>

      {/* Exemptions */}
      <div>
        <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Exemptions</h4>
        <div className="grid grid-cols-2 gap-4">
          <NumField label="HRA Exemption (u/s 10)" value={form.hraExemption} onChange={setN("hraExemption")} />
          <NumField label="LTA Exemption (u/s 10)" value={form.ltaExemption} onChange={setN("ltaExemption")} />
        </div>
      </div>

      {/* Deductions */}
      <div>
        <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">Deductions</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Section 80C" value={form.section80C} onChange={setN("section80C")} max={150000} />
          <NumField label="Section 80D (Health Ins.)" value={form.section80D} onChange={setN("section80D")} max={25000} />
          <NumField label="Section 80G (Donations)" value={form.section80G} onChange={setN("section80G")} />
          <NumField label="Section 80E (Edu. Loan)" value={form.section80E} onChange={setN("section80E")} />
          <NumField label="Home Loan Interest (24b)" value={form.homeLoanInterest} onChange={setN("homeLoanInterest")} max={200000} />
          <NumField label="Professional Tax" value={form.professionalTax} onChange={setN("professionalTax")} max={2400} />
        </div>
      </div>

      {/* TDS */}
      <div>
        <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">TDS</h4>
        <div className="max-w-xs">
          <NumField label="TDS Already Deducted" value={form.tdsDeducted} onChange={setN("tdsDeducted")} />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Declaration & Compute Tax
      </Button>
    </div>
  );
}

// ─── Declaration List Tab ────────────────────────────────────────────────────

function DeclarationListTab({ onEdit, staffId }: { onEdit: (d: StaffTaxDeclaration) => void; staffId?: string }) {
  const { toast } = useToast();
  const [declarations, setDeclarations] = useState<StaffTaxDeclaration[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<StaffTaxDeclaration | null>(null);
  const [statusForm, setStatusForm] = useState<UpdateTaxStatusDto>({ status: "submitted", remarks: "" });

  useEffect(() => { load(); }, [statusFilter, yearFilter]);

  const load = async () => {
    try {
      setLoading(true);
      setDeclarations(await taxApi.getTaxDeclarations({
        staffId: staffId || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        financialYear: yearFilter || undefined,
      }));
    } catch {
      toast({ title: "Error", description: "Failed to load declarations", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openStatus = (d: StaffTaxDeclaration) => {
    setSelected(d);
    setStatusForm({ status: "submitted", remarks: "" });
    setStatusOpen(true);
  };

  const submitStatus = async () => {
    if (!selected) return;
    try {
      await taxApi.updateTaxStatus(selected.id, statusForm);
      toast({ title: `Status updated to ${statusForm.status}` });
      setStatusOpen(false); load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: "secondary", submitted: "outline", approved: "default", finalized: "default" };
    const colorClass: Record<string, string> = { finalized: "bg-green-100 text-green-800" };
    return <Badge variant={(map[s] ?? "outline") as any} className={colorClass[s] ?? ""}>{s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
          </SelectContent>
        </Select>
        <Input value={yearFilter} onChange={e => setYearFilter(e.target.value)} placeholder="FY e.g. 2024-25" className="w-32" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>FY</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead>Gross Salary</TableHead>
              <TableHead>Taxable Income</TableHead>
              <TableHead>Total Tax</TableHead>
              <TableHead>Balance Tax</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {declarations.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No declarations</TableCell></TableRow>
            ) : declarations.map(d => (
              <TableRow key={d.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{d.staffName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.employeeCode}</p>
                  </div>
                </TableCell>
                <TableCell>{d.financialYear}</TableCell>
                <TableCell><Badge variant="outline">{d.taxRegime}</Badge></TableCell>
                <TableCell>₹{(d.grossSalary ?? 0).toLocaleString()}</TableCell>
                <TableCell>₹{(d.taxableIncome ?? 0).toLocaleString()}</TableCell>
                <TableCell>₹{(d.totalTaxPayable ?? 0).toLocaleString()}</TableCell>
                <TableCell className={(d.balanceTax ?? 0) > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                  ₹{(d.balanceTax ?? 0).toLocaleString()}
                </TableCell>
                <TableCell>{statusBadge(d.status)}</TableCell>
                <TableCell className="space-x-1">
                  <Button size="sm" variant="outline" onClick={() => onEdit(d)}>Edit</Button>
                  {d.status !== "finalized" && (
                    <Button size="sm" onClick={() => openStatus(d)}>Status</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={statusForm.status} onValueChange={v => setStatusForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Remarks</Label>
              <Input value={statusForm.remarks ?? ""} onChange={e => setStatusForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
              <Button onClick={submitStatus}><CheckCircle className="w-4 h-4 mr-1" />Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Form16Manager({ staffId }: { staffId?: string } = {}) {
  const [editTarget, setEditTarget] = useState<StaffTaxDeclaration | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (d: StaffTaxDeclaration) => {
    setEditTarget(d);
    setActiveTab("declare");
  };

  const handleSaved = () => {
    setEditTarget(null);
    setRefreshKey(k => k + 1);
    setActiveTab("list");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Form 16 / Income Tax Computation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="list"><FileText className="w-4 h-4 mr-1" />Declarations</TabsTrigger>
            <TabsTrigger value="declare"><Receipt className="w-4 h-4 mr-1" />{editTarget ? "Edit" : "New"} Declaration</TabsTrigger>
            <TabsTrigger value="summary" disabled={!editTarget}><BarChart3 className="w-4 h-4 mr-1" />Tax Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <DeclarationListTab key={refreshKey} onEdit={handleEdit} staffId={staffId} />
          </TabsContent>
          <TabsContent value="declare" className="mt-4">
            <DeclarationForm initial={editTarget ?? (staffId ? { staffId } as any : null)} onSaved={handleSaved} />
          </TabsContent>
          <TabsContent value="summary" className="mt-4">
            {editTarget && <TaxSummaryCard decl={editTarget} />}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
