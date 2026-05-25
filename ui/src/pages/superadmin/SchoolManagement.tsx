import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Eye, PowerOff, Power, Building2, Search, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import * as superAdminApi from "@/services/api/superAdminApi";
import type { SchoolListItem, SchoolDetail } from "@/services/api/superAdminApi";

interface SchoolForm {
  name: string;
  schoolCode: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

const emptyForm: SchoolForm = { name: "", schoolCode: "", address: "", phone: "", email: "", logo: "" };

export default function SchoolManagement() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewSchool, setViewSchool] = useState<SchoolListItem | null>(null);
  const [editSchool, setEditSchool] = useState<SchoolDetail | null>(null);
  const [editForm, setEditForm] = useState<SchoolForm>(emptyForm);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<SchoolForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchSchools(); }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getAllSchools();
      setSchools(data);
    } catch {
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = async () => {
    if (!addForm.name.trim() || !addForm.schoolCode.trim()) return;
    try {
      setSubmitting(true);
      await superAdminApi.createSchool({
        name: addForm.name,
        schoolCode: addForm.schoolCode,
        address: addForm.address || undefined,
        phone: addForm.phone || undefined,
        email: addForm.email || undefined,
        logo: addForm.logo || undefined,
      });
      toast.success("School created successfully");
      setAddDialog(false);
      setAddForm(emptyForm);
      await fetchSchools();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create school");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (school: SchoolListItem) => {
    setEditSchool(school as unknown as SchoolDetail);
    setEditForm({ name: school.name, schoolCode: school.schoolCode, address: school.address ?? "", phone: school.phone ?? "", email: school.email ?? "", logo: school.logo ?? "" });
    setEditLogoFile(null);
  };

  const handleEditSchool = async () => {
    if (!editSchool) return;
    try {
      setSubmitting(true);
      let logoUrl = editForm.logo || undefined;

      if (editLogoFile) {
        const upload = await superAdminApi.uploadSchoolLogo(editSchool.id, editLogoFile);
        logoUrl = upload.logoUrl;
      }

      await superAdminApi.updateSchool(editSchool.id, {
        name: editForm.name || undefined,
        address: editForm.address || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        logo: logoUrl,
      });
      toast.success("School updated");
      setEditSchool(null);
      setEditLogoFile(null);
      await fetchSchools();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update school");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (school: SchoolListItem) => {
    try {
      await superAdminApi.toggleSchoolStatus(school.id);
      toast.success(school.isActive ? "School deactivated" : "School activated");
      await fetchSchools();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.schoolCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-academic py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" /> School Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage all registered schools on the Vitana platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/superadmin/onboard")} className="gap-2">
            <Rocket className="h-4 w-4" />
            Onboard School
          </Button>
          <Button onClick={() => { setAddForm(emptyForm); setAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add School
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: schools.length, color: "" },
          { label: "Active", value: schools.filter(s => s.isActive).length, color: "text-green-600" },
          { label: "Inactive", value: schools.filter(s => !s.isActive).length, color: "text-red-500" },
          { label: "Modules On", value: schools.reduce((a, s) => a + s.enabledModulesCount, 0), color: "text-blue-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loadingâ€¦</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No schools found.</TableCell></TableRow>
                ) : filtered.map(school => (
                  <TableRow key={school.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {school.logo
                          ? <img src={school.logo} alt="" className="h-8 w-8 rounded object-cover border" />
                          : <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div>
                        }
                        <div className="flex flex-col">
                          <span className="font-medium">{school.name}</span>
                          {school.isOnboarded && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 w-fit mt-0.5">
                              <Rocket className="h-3 w-3" /> Onboarded
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{school.schoolCode}</TableCell>
                    <TableCell>
                      <div className="text-sm">{school.email || "â€”"}</div>
                      <div className="text-xs text-muted-foreground">{school.phone}</div>
                    </TableCell>
                    <TableCell><span className="font-medium">{school.enabledModulesCount}</span><span className="text-muted-foreground text-xs"> / {school.totalModulesCount}</span></TableCell>
                    <TableCell><Badge variant={school.isActive ? "default" : "secondary"}>{school.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewSchool(school)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(school)}><Edit className="h-4 w-4" /></Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={school.isOnboarded ? "Already onboarded via wizard" : "Run onboarding wizard"}
                          disabled={school.isOnboarded}
                          onClick={() => !school.isOnboarded && navigate("/superadmin/onboard")}
                          className={school.isOnboarded ? "opacity-40 cursor-not-allowed" : "text-indigo-600 hover:text-indigo-800"}
                        >
                          <Rocket className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(school)}
                          className={school.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}>
                          {school.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
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

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New School</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>School Name *</Label><Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>School Code *</Label><Input value={addForm.schoolCode} onChange={e => setAddForm(f => ({ ...f, schoolCode: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Textarea value={addForm.address} onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Phone</Label><Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Logo URL</Label><Input value={addForm.logo} onChange={e => setAddForm(f => ({ ...f, logo: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSchool} disabled={submitting || !addForm.name.trim() || !addForm.schoolCode.trim()}>{submitting ? "Creatingâ€¦" : "Create School"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewSchool} onOpenChange={() => setViewSchool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>School Details</DialogTitle></DialogHeader>
          {viewSchool && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {viewSchool.logo
                  ? <img src={viewSchool.logo} alt="" className="h-14 w-14 rounded object-cover border" />
                  : <div className="h-14 w-14 rounded bg-primary/10 flex items-center justify-center"><Building2 className="h-7 w-7 text-primary" /></div>
                }
                <div>
                  <p className="font-semibold text-lg">{viewSchool.name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{viewSchool.schoolCode}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Status: </span><Badge variant={viewSchool.isActive ? "default" : "secondary"}>{viewSchool.isActive ? "Active" : "Inactive"}</Badge></div>
                <div><span className="font-medium">Modules: </span>{viewSchool.enabledModulesCount} / {viewSchool.totalModulesCount}</div>
                {viewSchool.email && <div><span className="font-medium">Email: </span>{viewSchool.email}</div>}
                {viewSchool.phone && <div><span className="font-medium">Phone: </span>{viewSchool.phone}</div>}
                {viewSchool.address && <div className="col-span-2"><span className="font-medium">Address: </span>{viewSchool.address}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSchool} onOpenChange={() => { setEditSchool(null); setEditLogoFile(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit School</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>School Logo</Label>
              <div className="flex items-center gap-3">
                {editForm.logo
                  ? <img src={editForm.logo} alt="School logo" className="h-14 w-14 rounded object-cover border" />
                  : <div className="h-14 w-14 rounded bg-primary/10 flex items-center justify-center"><Building2 className="h-7 w-7 text-primary" /></div>
                }
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    onChange={e => {
                      const file = e.target.files?.[0] ?? null;
                      setEditLogoFile(file);
                      if (file) {
                        setEditForm(f => ({ ...f, logo: URL.createObjectURL(file) }));
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Upload a new image to replace existing logo in storage.</p>
                </div>
              </div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Textarea value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchool(null)}>Cancel</Button>
            <Button onClick={handleEditSchool} disabled={submitting}>{submitting ? "Savingâ€¦" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
