import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import leaveManagementApi, { LeaveType } from "@/services/api/leaveManagementApi";
import { useToast } from "@/hooks/use-toast";

interface LeaveTypeFormValues {
  name: string;
  description: string;
  applicableTo: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minNoticeDays: number;
  isCarryForward: boolean;
  maxCarryForwardDays: number | null;
  isPaid: boolean;
  isActive: boolean;
}

const EMPTY_FORM: LeaveTypeFormValues = {
  name: "",
  description: "",
  applicableTo: "Staff",
  maxDaysPerYear: 12,
  requiresApproval: true,
  requiresDocument: false,
  minNoticeDays: 0,
  isCarryForward: false,
  maxCarryForwardDays: null,
  isPaid: true,
  isActive: true,
};

export function LeaveManagementSettings() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveTypeFormValues>(EMPTY_FORM);
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const types = await leaveManagementApi.getLeaveTypes();
      setLeaveTypes(types);
    } catch {
      toast({ title: "Error", description: "Failed to load leave types", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditingId(lt.id);
    setForm({
      name: lt.name,
      description: lt.description ?? "",
      applicableTo: lt.applicableTo,
      maxDaysPerYear: lt.maxDaysPerYear,
      requiresApproval: lt.requiresApproval,
      requiresDocument: lt.requiresDocument,
      minNoticeDays: lt.minNoticeDays,
      isCarryForward: lt.isCarryForward,
      maxCarryForwardDays: lt.maxCarryForwardDays ?? null,
      isPaid: lt.isPaid,
      isActive: lt.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Leave type name is required", variant: "destructive" });
      return;
    }
    if (form.maxDaysPerYear < 1 || form.maxDaysPerYear > 365) {
      toast({ title: "Validation", description: "Days per year must be between 1 and 365", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await leaveManagementApi.updateLeaveType(editingId, {
          name: form.name.trim(),
          description: form.description || undefined,
          maxDaysPerYear: form.maxDaysPerYear,
          requiresApproval: form.requiresApproval,
          requiresDocument: form.requiresDocument,
          minNoticeDays: form.minNoticeDays,
          isCarryForward: form.isCarryForward,
          maxCarryForwardDays: form.isCarryForward ? form.maxCarryForwardDays : null,
          isPaid: form.isPaid,
          isActive: form.isActive,
        });
        toast({ title: "Saved", description: "Leave type updated successfully." });
      } else {
        await leaveManagementApi.createLeaveType({
          name: form.name.trim(),
          description: form.description || undefined,
          applicableTo: form.applicableTo,
          maxDaysPerYear: form.maxDaysPerYear,
          requiresApproval: form.requiresApproval,
          requiresDocument: form.requiresDocument,
          minNoticeDays: form.minNoticeDays,
          isCarryForward: form.isCarryForward,
          maxCarryForwardDays: form.isCarryForward ? form.maxCarryForwardDays : null,
          isPaid: form.isPaid,
        });
        toast({ title: "Created", description: "Leave type added successfully." });
      }
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message ?? "Failed to save leave type",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSaving(true);
      await leaveManagementApi.deleteLeaveType(deleteId);
      toast({ title: "Deleted", description: "Leave type removed." });
      setDeleteId(null);
      await load();
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.response?.data?.message ?? "Failed to delete leave type",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof LeaveTypeFormValues>(key: K, value: LeaveTypeFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Leave Types & Quotas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define leave categories and default annual quotas for staff. Changes to days are automatically applied to all staff for the current year.
            </p>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Leave Type
          </Button>
        </CardHeader>
        <CardContent>
          {leaveTypes.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No leave types configured yet. Click &ldquo;Add Leave Type&rdquo; to get started.
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Applicable To</TableHead>
                    <TableHead className="text-center">Days/Year</TableHead>
                    <TableHead className="text-center">Paid</TableHead>
                    <TableHead className="text-center">Carry Forward</TableHead>
                    <TableHead className="text-center">Approval</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((lt) => (
                    <TableRow key={lt.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lt.name}</p>
                          {lt.description && (
                            <p className="text-xs text-muted-foreground">{lt.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{lt.applicableTo}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{lt.maxDaysPerYear}</TableCell>
                      <TableCell className="text-center">
                        {lt.isPaid ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lt.isCarryForward
                          ? lt.maxCarryForwardDays
                            ? `Up to ${lt.maxCarryForwardDays}d`
                            : "All unused"
                          : "No"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {lt.requiresApproval ? "Required" : "Auto"}
                      </TableCell>
                      <TableCell className="text-center">
                        {lt.isActive ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(lt)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(lt.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Leave Type Name *</Label>
              <Input
                placeholder="e.g. Casual Leave"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Optional short description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Applicable To</Label>
                <Select
                  value={form.applicableTo}
                  onValueChange={(v) => set("applicableTo", v)}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Days Per Year *</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.maxDaysPerYear}
                  onChange={(e) => set("maxDaysPerYear", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Minimum Notice Days</Label>
              <Input
                type="number"
                min={0}
                value={form.minNoticeDays}
                onChange={(e) => set("minNoticeDays", parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="isPaid"
                  checked={form.isPaid}
                  onCheckedChange={(v) => set("isPaid", v)}
                />
                <Label htmlFor="isPaid" className="cursor-pointer">Paid Leave</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requiresApproval"
                  checked={form.requiresApproval}
                  onCheckedChange={(v) => set("requiresApproval", v)}
                />
                <Label htmlFor="requiresApproval" className="cursor-pointer">Requires Approval</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="requiresDocument"
                  checked={form.requiresDocument}
                  onCheckedChange={(v) => set("requiresDocument", v)}
                />
                <Label htmlFor="requiresDocument" className="cursor-pointer">Requires Document</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isCarryForward"
                  checked={form.isCarryForward}
                  onCheckedChange={(v) => {
                    set("isCarryForward", v);
                    if (!v) set("maxCarryForwardDays", null);
                  }}
                />
                <Label htmlFor="isCarryForward" className="cursor-pointer">Carry Forward</Label>
              </div>

              {editingId && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(v) => set("isActive", v)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              )}
            </div>

            {form.isCarryForward && (
              <div className="space-y-1.5">
                <Label>
                  Max Carry-Forward Days
                  <span className="text-muted-foreground font-normal ml-1">(leave blank for unlimited)</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="e.g. 15 — or blank for all unused days"
                  value={form.maxCarryForwardDays ?? ""}
                  onChange={(e) =>
                    set("maxCarryForwardDays", e.target.value === "" ? null : parseInt(e.target.value) || null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {form.maxCarryForwardDays
                    ? `At year-end, staff can carry forward up to ${form.maxCarryForwardDays} unused days.`
                    : "All unused days will be carried forward to the next year."}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Leave Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the leave type for all staff. Existing leave requests and balances are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
