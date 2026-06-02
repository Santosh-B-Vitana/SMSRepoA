import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Tags, Info } from "lucide-react";
import { toast } from "sonner";
import { feeApi, FeeHead, CreateFeeHeadDto } from "@/services/api/feeApi";



export function FeeHeadsManager() {
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFeeHeadDto>({
    name: "",
    code: "",
    description: "",
  });

  const loadHeads = async () => {
    setLoading(true);
    try {
      const data = await feeApi.getFeeHeads();
      setHeads(data);
    } catch {
      toast.error("Failed to load fee heads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHeads(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (h: FeeHead) => {
    setEditing(h);
    setForm({ name: h.name, code: h.code, description: h.description ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await feeApi.updateFeeHead(editing.id, form);
        toast.success("Fee head updated");
      } else {
        await feeApi.createFeeHead(form);
        toast.success("Fee head created");
      }
      setDialogOpen(false);
      await loadHeads();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee head?")) return;
    try {
      await feeApi.deleteFeeHead(id);
      toast.success("Fee head deleted");
      await loadHeads();
    } catch {
      toast.error("Delete failed");
    }
  };

  const toggleActive = async (h: FeeHead) => {
    try {
      await feeApi.updateFeeHead(h.id, { isActive: !h.isActive });
      setHeads(prev => prev.map(x => x.id === h.id ? { ...x, isActive: !h.isActive } : x));
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Fee Types
              </CardTitle>
              <CardDescription>Manage fee type labels used across structures</CardDescription>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2 flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                Transport and Hostel fees are automatically added to student fee records at payment time — no setup required here.
              </p>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Fee Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No fee types yet. Add one to get started.</TableCell></TableRow>
                )}
                {heads.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell><Badge variant="outline">{h.code}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.description ?? "—"}</TableCell>
                    <TableCell>
                      <Switch checked={h.isActive} onCheckedChange={() => toggleActive(h)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
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
            <DialogTitle>{editing ? "Edit Fee Type" : "New Fee Type"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tuition Fee" />
              </div>
              <div className="space-y-1">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. TF" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
