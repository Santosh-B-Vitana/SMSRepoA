import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Pencil, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { feeApi, ReceiptTemplate, CreateReceiptTemplateDto } from "@/services/api/feeApi";

export function ReceiptTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateReceiptTemplateDto>({
    name: "",
    headerText: "",
    footerText: "",
    logoUrl: "",
    primaryColor: "#2563eb",
    isDefault: false,
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await feeApi.getReceiptTemplates();
      setTemplates(data);
    } catch {
      toast({ title: "Failed to load receipt templates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", headerText: "", footerText: "", logoUrl: "", primaryColor: "#2563eb", isDefault: false });
    setDialogOpen(true);
  };

  const openEdit = (t: ReceiptTemplate) => {
    setEditing(t);
    setForm({ name: t.name, headerText: t.headerText ?? "", footerText: t.footerText ?? "", logoUrl: t.logoUrl ?? "", primaryColor: t.primaryColor ?? "#2563eb", isDefault: t.isDefault });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await feeApi.updateReceiptTemplate(editing.id, form);
        toast({ title: "Receipt template updated" });
      } else {
        await feeApi.createReceiptTemplate(form);
        toast({ title: "Receipt template created" });
      }
      setDialogOpen(false);
      await loadTemplates();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: ReceiptTemplate) => {
    try {
      await feeApi.updateReceiptTemplate(t.id, { isActive: !t.isActive });
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isActive: !t.isActive } : x));
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
                <FileText className="h-5 w-5" />
                Receipt Templates
              </CardTitle>
              <CardDescription>Configure school branding for fee receipts (header, footer, colors)</CardDescription>
            </div>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New Template
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
                  <TableHead>Header</TableHead>
                  <TableHead>Primary Color</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No receipt templates yet.</TableCell></TableRow>
                )}
                {templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{t.headerText ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded border" style={{ backgroundColor: t.primaryColor ?? "#2563eb" }} />
                        <span className="text-xs font-mono text-muted-foreground">{t.primaryColor ?? "#2563eb"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {t.isDefault && <Badge className="gap-1"><Star className="h-3 w-3" /> Default</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Receipt Template" : "New Receipt Template"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Template Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Receipt" />
              </div>
              <div className="space-y-1">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="w-12 p-1 h-9 cursor-pointer" />
                  <Input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} placeholder="#2563eb" className="font-mono" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Header Text</Label>
              <Textarea rows={2} value={form.headerText} onChange={e => setForm(f => ({ ...f, headerText: e.target.value }))} placeholder="School name, address, contact info..." />
            </div>
            <div className="space-y-1">
              <Label>Footer Text</Label>
              <Textarea rows={2} value={form.footerText} onChange={e => setForm(f => ({ ...f, footerText: e.target.value }))} placeholder="Terms, signature line, etc..." />
            </div>
            <div className="space-y-1">
              <Label>Logo URL</Label>
              <Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
              <Label>Set as default template</Label>
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
