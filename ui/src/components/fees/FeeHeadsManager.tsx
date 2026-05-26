import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Tags } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, FeeHead, CreateFeeHeadDto } from "@/services/api/feeApi";

export function FeeHeadsManager() {
  const { toast } = useToast();
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFeeHeadDto>({
    name: "",
    code: "",
    description: "",
    isVisibleOnReceipt: true,
    isMandatory: false,
    displayOrder: 0,
  });

  const loadHeads = async () => {
    setLoading(true);
    try {
      const data = await feeApi.getFeeHeads();
      console.log('Loaded fee heads:', data);
      setHeads(data || []);
    } catch (e: any) {
      console.error('Error loading fee heads:', e?.response?.data || e?.message || e);
      toast({ title: "Failed to load fee heads", description: e?.response?.data?.message || e?.message || "Unknown error", variant: "destructive" });
      setHeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHeads(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "", isVisibleOnReceipt: true, isMandatory: false, displayOrder: heads.length });
    setDialogOpen(true);
  };

  const openEdit = (h: FeeHead) => {
    setEditing(h);
    setForm({ name: h.name, code: h.code, description: h.description ?? "", isVisibleOnReceipt: h.isVisibleOnReceipt, isMandatory: h.isMandatory, displayOrder: h.displayOrder });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ title: "Name and Code are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await feeApi.updateFeeHead(editing.id, form);
        toast({ title: "Fee head updated" });
      } else {
        await feeApi.createFeeHead(form);
        toast({ title: "Fee head created" });
      }
      setDialogOpen(false);
      await loadHeads();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee head?")) return;
    try {
      await feeApi.deleteFeeHead(id);
      toast({ title: "Fee head deleted" });
      await loadHeads();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const toggleActive = async (h: FeeHead) => {
    try {
      await feeApi.updateFeeHead(h.id, { isActive: !h.isActive });
      setHeads(prev => prev.map(x => x.id === h.id ? { ...x, isActive: !h.isActive } : x));
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
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
                Fee Heads
              </CardTitle>
              <CardDescription>Manage normalized fee type labels used across structures</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Fee Head
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
                  <TableHead>Order</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>On Receipt</TableHead>
                  <TableHead>Mandatory</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heads.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No fee heads yet. Add one to get started.</TableCell></TableRow>
                )}
                {heads.map(h => (
                  <TableRow key={h.id}>
                    <TableCell className="text-muted-foreground">{h.displayOrder}</TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell><Badge variant="outline">{h.code}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.description ?? "—"}</TableCell>
                    <TableCell>{h.isVisibleOnReceipt ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell>{h.isMandatory ? <Badge>Required</Badge> : <Badge variant="outline">Optional</Badge>}</TableCell>
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
            <DialogTitle>{editing ? "Edit Fee Head" : "New Fee Head"}</DialogTitle>
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
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.isVisibleOnReceipt} onCheckedChange={v => setForm(f => ({ ...f, isVisibleOnReceipt: v }))} />
                <Label>Show on Receipt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isMandatory} onCheckedChange={v => setForm(f => ({ ...f, isMandatory: v }))} />
                <Label>Mandatory</Label>
              </div>
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
