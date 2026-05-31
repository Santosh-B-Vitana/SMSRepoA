import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { feeApi, FeeTerm, CreateFeeTermDto } from "@/services/api/feeApi";

export function FeeTermsManager() {
  const [terms, setTerms] = useState<FeeTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeeTerm | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFeeTermDto>({
    name: "",
    termNumber: 1,
    dueDate: "",
    remarks: "",
  });

  const loadTerms = async () => {
    setLoading(true);
    try {
      // Fetch all school-level fee terms (not tied to a specific structure)
      const data = await feeApi.getFeeTerms();
      setTerms(data);
    } catch {
      toast.error("Failed to load fee terms");
      setTerms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, []);

  const openCreate = () => {
    setEditing(null);
    const nextTermNumber = (terms.length > 0 ? Math.max(...terms.map(t => t.termNumber)) : 0) + 1;
    setForm({
      name: `Term ${nextTermNumber}`,
      termNumber: nextTermNumber,
      dueDate: "",
      remarks: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (t: FeeTerm) => {
    setEditing(t);
    setForm({
      name: t.name,
      termNumber: t.termNumber,
      dueDate: t.dueDate,
      remarks: t.remarks ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.dueDate) {
      toast.error("Name and Due Date are required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await feeApi.updateFeeTerm(undefined, editing.id, form);
        toast.success("Fee term updated");
      } else {
        await feeApi.createFeeTerm(undefined, form);
        toast.success("Fee term created");
      }
      setDialogOpen(false);
      await loadTerms();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee term? This action cannot be undone.")) return;
    try {
      await feeApi.deleteFeeTerm(undefined, id);
      toast.success("Fee term deleted");
      await loadTerms();
    } catch (e: any) {
      const message = e?.response?.data?.message ?? e?.message ?? "Delete failed";
      toast.error(message);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fee Terms
              </CardTitle>
              <CardDescription>Define school term periods with their due dates</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Term
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No fee terms defined yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell className="font-medium">{term.termNumber}</TableCell>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>
                      {new Date(term.dueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{term.remarks ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(term)}
                          title="Edit term"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(term.id)}
                          title="Delete term"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Fee Term" : "New Fee Term"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Term Number <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  value={form.termNumber}
                  onChange={(e) => setForm((f) => ({ ...f, termNumber: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
              <div className="space-y-1">
                <Label>Term Name <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Term 1, Q1, Semester 1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Due Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Additional notes (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

