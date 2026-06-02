import { useEffect, useState } from "react";
import { Plus, KeyRound, Power, PowerOff, Users, Search, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as superAdminApi from "@/services/api/superAdminApi";
import type { PlatformUser, SchoolListItem } from "@/services/api/superAdminApi";

const ROLES = ["SuperAdmin", "Admin", "Staff", "Parent"];

const roleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
  if (role === "SuperAdmin") return "default";
  if (role === "Admin") return "secondary";
  return "outline";
};

export default function UserManagement() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ username: "", email: "", password: "", role: "Admin", schoolId: "" });
  const [resetDialog, setResetDialog] = useState<PlatformUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    superAdminApi.getAllSchools().then(setSchools).catch(() => {});
  }, []);

  const fetchUsers = async (role?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (role && role !== "all") params.role = role;
      if (search) params.search = search;
      const data = await superAdminApi.getAllUsers(params);
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    fetchUsers(role);
  };

  const handleCreateUser = async () => {
    if (!addForm.username || !addForm.email || !addForm.password || !addForm.schoolId) return;
    try {
      setSubmitting(true);
      await superAdminApi.createUser({
        username: addForm.username,
        email: addForm.email,
        password: addForm.password,
        role: addForm.role,
        schoolId: addForm.schoolId,
      });
      toast.success("User created successfully");
      setAddDialog(false);
      setAddForm({ username: "", email: "", password: "", role: "Admin", schoolId: "" });
      await fetchUsers(roleFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: PlatformUser) => {
    try {
      await superAdminApi.toggleUserStatus(user.id);
      toast.success(user.status === "active" ? "User suspended" : "User reactivated");
      await fetchUsers(roleFilter);
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleResetPassword = async () => {
    if (!resetDialog || !newPassword.trim()) return;
    try {
      setSubmitting(true);
      await superAdminApi.resetUserPassword(resetDialog.id, newPassword);
      toast.success("Password reset successfully");
      setResetDialog(null);
      setNewPassword("");
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u =>
    (u.username.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container-academic py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage platform users across all schools</p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users", value: users.length, color: "" },
          { label: "Active", value: users.filter(u => u.status === "active").length, color: "text-green-600" },
          { label: "Suspended", value: users.filter(u => u.status !== "active").length, color: "text-red-500" },
          { label: "Admins", value: users.filter(u => u.role === "Admin" || u.role === "SuperAdmin").length, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} onKeyUp={() => fetchUsers(roleFilter)} className="max-w-xs" />
            <div className="flex items-center gap-1">
              {["all", ...ROLES].map(r => (
                <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => handleRoleFilter(r)} className="capitalize">
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No users found.</TableCell></TableRow>
                ) : filtered.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit">
                        <Shield className="h-3 w-3" />{user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user.schoolName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "destructive"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setResetDialog(user); setNewPassword(""); }} title="Reset Password">
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(user)}
                          className={user.status === "active" ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}
                          title={user.status === "active" ? "Suspend" : "Activate"}>
                          {user.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Platform User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Username *</Label><Input value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Email *</Label><Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Password *</Label><Input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>School *</Label>
                <Select value={addForm.schoolId} onValueChange={v => setAddForm(f => ({ ...f, schoolId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={submitting || !addForm.username || !addForm.email || !addForm.password || !addForm.schoolId}>
              {submitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetDialog} onOpenChange={() => setResetDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Resetting password for <span className="font-medium">{resetDialog?.username}</span></p>
          <div className="space-y-1">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={submitting || newPassword.length < 8}>
              {submitting ? "Resetting…" : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
