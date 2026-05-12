import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CalendarDays, Loader2, IndianRupee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, FeeTerm, CreateFeeTermDto, FeeStructureBasic } from "@/services/api/feeApi";

interface Props {
  structures: FeeStructureBasic[];
}

export function FeeTermsPanel({ structures }: Props) {
  const { toast } = useToast();
  const [selectedStructureId, setSelectedStructureId] = useState<string>("");
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFeeTermDto>({
    name: "",
    termNumber: 1,
    amount: 0,
    dueDate: "",
    remarks: "",
  });

  const loadTerms = async (structureId: string) => {
    if (!structureId) return;
    setLoading(true);
    try {
      const data = await feeApi.getFeeTerms(structureId);
      setTerms(data);
    } catch {
      toast({ title: "Failed to load fee terms", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStructureId) loadTerms(selectedStructureId);
    else setTerms([]);
  }, [selectedStructureId]);

  const openCreate = () => {
    setForm({
      name: `Term ${terms.length + 1}`,
      termNumber: terms.length + 1,
      amount: 0,
      dueDate: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.dueDate || form.amount <= 0) {
      toast({ title: "Name, amount and due date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await feeApi.createFeeTerm(selectedStructureId, form);
      toast({ title: "Fee term created" });
      setDialogOpen(false);
      await loadTerms(selectedStructureId);
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "paid") return "default";
    if (status === "overdue") return "destructive";
    return "secondary";
  };

  const selectedStructure = structures.find(s => s.id === selectedStructureId);
  const totalTermAmount = terms.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Fee Terms (Installments)
              </CardTitle>
              <CardDescription>Define installment schedule for each fee structure</CardDescription>
            </div>
            {selectedStructureId && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Add Term
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Fee Structure</Label>
            <Select value={selectedStructureId} onValueChange={setSelectedStructureId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a fee structure" />
              </SelectTrigger>
              <SelectContent>
                {structures.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.class} ({s.academicYear})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStructure && (
            <div className="text-sm text-muted-foreground">
              Structure total: <span className="font-semibold text-foreground">₹{selectedStructure.totalAmount.toLocaleString("en-IN")}</span>
              {terms.length > 0 && (
                <> &bull; Terms sum: <span className={`font-semibold ${totalTermAmount !== selectedStructure.totalAmount ? "text-destructive" : "text-green-600"}`}>₹{totalTermAmount.toLocaleString("en-IN")}</span></>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !selectedStructureId ? (
            <div className="text-center text-muted-foreground py-12">Select a fee structure to view or add installment terms</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Term Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No terms defined. Add installments to set up a payment schedule.</TableCell></TableRow>
                )}
                {terms.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-muted-foreground">{t.termNumber}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3 text-muted-foreground" />
                        {t.amount.toLocaleString("en-IN")}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(t.dueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.remarks ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee Term</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Term Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. First Installment" />
              </div>
              <div className="space-y-1">
                <Label>Term Number</Label>
                <Input type="number" min={1} value={form.termNumber} onChange={e => setForm(f => ({ ...f, termNumber: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
