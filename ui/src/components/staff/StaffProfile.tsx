import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { staffApi, Staff } from "@/services/api/staffApi";
import { StaffChildDto } from "@/services/api/studentApi";
import { payrollApi, PayrollRecordBasic } from "@/services/api/payrollApi";
import { useToast } from "@/hooks/use-toast";
import { StaffForm } from "./StaffForm"; // Import StaffForm
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, User, Briefcase, CalendarDays, Star, Trash2 } from "lucide-react";

// Local types for sub-sections
interface StaffLeave { id: string; type: string; from: string; to: string; days: number; status: string; reason: string; }
interface StaffPerformance { id: string; year: string; rating: number; feedback: string; reviewer: string; }

export default function StaffProfile() {
  const { id } = useParams();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [payroll, setPayroll] = useState<PayrollRecordBasic[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecordBasic | null>(null);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkedChildren, setLinkedChildren] = useState<StaffChildDto[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Add local state for edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [status, setStatus] = useState(staff ? staff.status : 'active');
  useEffect(() => {
    if (staff) setStatus(staff.status);
  }, [staff]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Dialog states for add/edit actions
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPerformanceDialog, setShowPerformanceDialog] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      if (!id) return;
      setLoading(true);
      try {
        const staffData = await staffApi.getById(id);
        setStaff(staffData);
        setStatus(staffData.status);
        // No backend endpoints for leaves/performance — show empty state
        setLeaves([]);
        setPerformance([]);
        // Load linked children
        try {
          const children = await staffApi.getChildren(id);
          setLinkedChildren(children);
        } catch {
          setLinkedChildren([]);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load staff member", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  const loadPayroll = async (staffId: string) => {
    setPayrollLoading(true);
    try {
      const result = await payrollApi.getRecords({ staffId }, 1, 50);
      setPayroll(result.items);
    } catch {
      // silently ignore — show empty state
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPayroll(id);
  }, [id]);

  // Functions from StaffList
  const handleEdit = () => setShowEdit(true);
  const handleDelete = async () => {
    if (!staff) return;
    try {
      await staffApi.delete(staff.id);
      toast({ title: "Success", description: "Staff member deleted successfully" });
      window.location.assign('/staff');
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete staff member", variant: "destructive" });
    }
  };
  const toggleStatus = async () => {
    if (!staff) return;
    try {
      const newStatus = status === 'active' ? 'inactive' : 'active';
      await staffApi.update(staff.id, { status: newStatus });
      setStatus(newStatus);
      setStaff({ ...staff, status: newStatus });
      toast({ title: "Success", description: `Staff status updated to ${newStatus}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update staff status", variant: "destructive" });
    }
  };

  // Payroll Form — create OR edit
  function PayrollForm({ staffId, onClose, onSuccess, record }: {
    staffId: string;
    onClose: () => void;
    onSuccess: () => void;
    record?: PayrollRecordBasic; // present = edit mode
  }) {
    const isEdit = !!record;
    const [form, setForm] = useState({
      month: record?.month ?? '',
      year: record?.year ? String(record.year) : String(new Date().getFullYear()),
      basicSalary: '',
      hra: '', da: '', ta: '', otherAllowances: '',
      pf: '', esi: '', otherDeductions: '',
      status: record?.status ?? 'pending',
      paymentDate: record?.paymentDate ? record.paymentDate.slice(0, 10) : '',
      remarks: '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (isEdit && record) {
          await payrollApi.update(record.id, {
            allowances: {
              hra: form.hra ? Number(form.hra) : undefined,
              da: form.da ? Number(form.da) : undefined,
              ta: form.ta ? Number(form.ta) : undefined,
              other: form.otherAllowances ? Number(form.otherAllowances) : undefined,
            },
            deductions: {
              pf: form.pf ? Number(form.pf) : undefined,
              esi: form.esi ? Number(form.esi) : undefined,
              other: form.otherDeductions ? Number(form.otherDeductions) : undefined,
            },
            status: form.status || undefined,
            paymentDate: form.paymentDate || undefined,
            remarks: form.remarks || undefined,
          });
        } else {
          const yearNum = form.month.length >= 7 ? parseInt(form.month.slice(0, 4)) : parseInt(form.year);
          await payrollApi.create({
            staffId,
            month: form.month,
            year: yearNum,
            basicSalary: Number(form.basicSalary),
            allowances: {
              hra: Number(form.hra) || 0,
              da: Number(form.da) || 0,
              ta: Number(form.ta) || 0,
              other: Number(form.otherAllowances) || 0,
            },
            deductions: {
              pf: Number(form.pf) || 0,
              esi: Number(form.esi) || 0,
              other: Number(form.otherDeductions) || 0,
            },
            remarks: form.remarks || undefined,
          });
        }
        onSuccess();
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast({ title: "Error", description: msg || "Failed to save payroll record", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Month (YYYY-MM) *</label>
              <input className="border rounded px-2 py-1 w-full" placeholder="e.g. 2025-05"
                value={form.month} onChange={e => set('month', e.target.value)} required pattern="\d{4}-\d{2}" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Basic Salary (₹) *</label>
              <input className="border rounded px-2 py-1 w-full" placeholder="0.00" type="number" min="0" step="0.01"
                value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} required />
            </div>
          </div>
        )}
        {isEdit && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
            Editing: <strong>{record?.month}/{record?.year}</strong> — Basic salary cannot be changed after creation.
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Allowances</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">HRA</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.hra} onChange={e => set('hra', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">DA</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.da} onChange={e => set('da', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">TA</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.ta} onChange={e => set('ta', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Other Allowances</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.otherAllowances} onChange={e => set('otherAllowances', e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Deductions</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">PF</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.pf} onChange={e => set('pf', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500">ESI</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.esi} onChange={e => set('esi', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500">Other Deductions</label>
              <input className="border rounded px-2 py-1 w-full" type="number" min="0" step="0.01"
                placeholder="0.00" value={form.otherDeductions} onChange={e => set('otherDeductions', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select className="border rounded px-2 py-1 w-full" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Payment Date</label>
            <input className="border rounded px-2 py-1 w-full" type="date"
              value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Remarks</label>
          <input className="border rounded px-2 py-1 w-full" placeholder="Optional remarks"
            value={form.remarks} onChange={e => set('remarks', e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    );
  }
  }
  // Leave Form
  function LeaveForm({ staffId, onClose, onSuccess }: { staffId: string, onClose: () => void, onSuccess: () => void }) {
    const [form, setForm] = useState({ type: '', from: '', to: '', status: 'pending', reason: '' });
    const [loading, setLoading] = useState(false);
    return (
      <form onSubmit={async e => {
        e.preventDefault();
        setLoading(true);
        // Add to local state (no backend endpoint for staff leaves)
        const days = form.from && form.to ? Math.ceil((new Date(form.to).getTime() - new Date(form.from).getTime()) / 86400000) + 1 : 0;
        const entry: StaffLeave = { id: Date.now().toString(), type: form.type, from: form.from, to: form.to, days, status: form.status, reason: form.reason };
        setLeaves(prev => [...prev, entry]);
        setLoading(false);
        onSuccess();
      }}>
        <div className="grid gap-2 mb-2">
          <input className="border rounded px-2 py-1" placeholder="Type (Sick, Casual, etc.)" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required />
          <input className="border rounded px-2 py-1" placeholder="From (YYYY-MM-DD)" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} required />
          <input className="border rounded px-2 py-1" placeholder="To (YYYY-MM-DD)" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} required />
          <select className="border rounded px-2 py-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input className="border rounded px-2 py-1" placeholder="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    );
  }
  // Performance Form
  function PerformanceForm({ staffId, onClose, onSuccess }: { staffId: string, onClose: () => void, onSuccess: () => void }) {
    const [form, setForm] = useState({ year: '', rating: '', remarks: '' });
    const [loading, setLoading] = useState(false);
    return (
      <form onSubmit={async e => {
        e.preventDefault();
        setLoading(true);
        // Add to local state (no backend endpoint for staff performance)
        const entry: StaffPerformance = { id: Date.now().toString(), year: form.year, rating: Number(form.rating), feedback: form.remarks, reviewer: 'Admin' };
        setPerformance(prev => [...prev, entry]);
        setLoading(false);
        onSuccess();
      }}>
        <div className="grid gap-2 mb-2">
          <input className="border rounded px-2 py-1" placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} required />
          <input className="border rounded px-2 py-1" placeholder="Rating (1-5)" type="number" min="1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} required />
          <input className="border rounded px-2 py-1" placeholder="Remarks" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} required />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button type="button" className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 bg-yellow-500 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    );
  }

  if (loading) return <div className="p-8 text-center">Loading staff profile...</div>;
  if (!staff) return <div className="p-8 text-center text-red-500">Staff not found.</div>;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <Card className="mb-6 shadow-lg border-2 border-gray-100">
        <CardHeader>
          <button
            className="mb-4 px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
            onClick={() => navigate(-1)}
          >← Back</button>
          <div className="flex items-center gap-4 mb-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                {staff.profilePhoto ? (
                  <img src={staff.profilePhoto} alt={staff.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <label 
                htmlFor={`staff-photo-upload-${staff.id}`} 
                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
                title="Upload Photo"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </label>
              <input
                id={`staff-photo-upload-${staff.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && staff) {
                    try {
                      const reader = new FileReader();
                      reader.onload = () => setStaff({ ...staff, profilePhoto: reader.result as string });
                      reader.readAsDataURL(file);
                    } catch (error) {
                      console.error('Failed to upload photo:', error);
                    }
                  }
                }}
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">{staff.name}</CardTitle>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded flex items-center gap-1"
              onClick={handleEdit}
            ><Pencil className="h-4 w-4" /> Manage</button>
            <button
              className={`px-3 py-1 rounded flex items-center gap-1 ${status === 'active' ? 'bg-red-600 text-white' : 'bg-green-700 text-white'}`}
              onClick={toggleStatus}
            >{status === 'active' ? <User className="h-4 w-4" /> : <User className="h-4 w-4" />} {status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
            <button
              className="px-3 py-1 bg-gray-600 text-white rounded flex items-center gap-1"
              onClick={() => setShowDeleteDialog(true)}
            ><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
          {status === 'inactive' && (
            <div className="mt-2 text-red-600 font-semibold">This staff member is currently inactive.</div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="font-semibold mb-2 text-lg flex items-center gap-2"><Briefcase className="h-5 w-5 text-gray-500" /> Designation</h2>
              <div className="mb-1"><b>Designation:</b> {staff.designation}</div>
              <div className="mb-1"><b>Department:</b> {staff.department}</div>
              <div className="mb-1"><b>Subjects:</b> {staff.subjects || "-"}</div>
              <div className="mb-1"><b>Joining Date:</b> {staff.joiningDate}</div>
            </div>
            <div>
              <h2 className="font-semibold mb-2 text-lg flex items-center gap-2"><User className="h-5 w-5 text-gray-500" /> Contact</h2>
              <div className="mb-1"><b>Phone:</b> {staff.phone}</div>
              <div className="mb-1"><b>Email:</b> {staff.email}</div>
              <div className="mb-1"><b>Address:</b> {staff.address}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Payroll Section */}
      <Card className="mb-6 shadow border border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-600" /><CardTitle>Payroll</CardTitle></div>
          <button className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1"
            onClick={() => { setEditingPayroll(null); setShowPayrollDialog(true); }}>
            <Plus className="h-4 w-4" /> Add Record
          </button>
        </CardHeader>
        <CardContent>
          {payrollLoading ? (
            <div className="text-muted-foreground text-sm">Loading payroll...</div>
          ) : payroll.length === 0 ? (
            <div className="text-muted-foreground">No payroll records.</div>
          ) : (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-2 py-1">Month</th>
                  <th className="text-right px-2 py-1">Gross</th>
                  <th className="text-right px-2 py-1">Deductions</th>
                  <th className="text-right px-2 py-1">Net Pay</th>
                  <th className="text-center px-2 py-1">Status</th>
                  <th className="text-center px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50 border-t">
                    <td className="text-left px-2 py-1">{p.month}/{p.year}</td>
                    <td className="text-right px-2 py-1">₹{p.grossSalary?.toLocaleString()}</td>
                    <td className="text-right px-2 py-1">₹{p.totalDeductions?.toLocaleString()}</td>
                    <td className="text-right px-2 py-1 font-semibold">₹{p.netSalary?.toLocaleString()}</td>
                    <td className="text-center px-2 py-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                    </td>
                    <td className="text-center px-2 py-1">
                      <div className="flex justify-center gap-1">
                        <button
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                          title="Edit"
                          onClick={() => { setEditingPayroll(p); setShowPayrollDialog(true); }}
                        ><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          className="p-1 rounded hover:bg-red-100 text-red-500"
                          title="Delete"
                          onClick={async () => {
                            if (!window.confirm('Delete this payroll record?')) return;
                            try {
                              await payrollApi.delete(p.id);
                              setPayroll(prev => prev.filter(r => r.id !== p.id));
                              toast({ title: "Deleted", description: "Payroll record removed" });
                            } catch {
                              toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
                            }
                          }}
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {/* Children in School Section */}
      {linkedChildren.length > 0 && (
        <Card className="mb-6 shadow border border-gray-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <CardTitle>Children in School</CardTitle>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">{linkedChildren.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedChildren.map(child => (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center flex-shrink-0">
                      {child.photoUrl
                        ? <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                        : <span className="text-purple-700 font-bold text-sm">{child.name?.charAt(0) || '?'}</span>
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{child.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {child.admissionNumber ? `${child.admissionNumber} · ` : ''}
                        Class {child.class}-{child.section}
                        {child.rollNumber ? ` · Roll ${child.rollNumber}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      child.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>{child.status}</span>
                    <button
                      className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                      onClick={() => navigate(`/students/${child.id}`)}
                    >View →</button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Management Section */}
      <Card className="mb-6 shadow border border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-green-600" /><CardTitle>Leave Management</CardTitle></div>
          <button className="px-2 py-1 bg-green-100 text-green-700 rounded flex items-center gap-1" onClick={() => setShowLeaveDialog(true)}><Pencil className="h-4 w-4" /> Manage</button>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? <div className="text-muted-foreground">No leave records.</div> : (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left">Type</th><th className="text-left">From</th><th className="text-left">To</th><th className="text-center">Status</th><th className="text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-green-50">
                    <td className="text-left">{l.type}</td><td className="text-left">{l.from}</td><td className="text-left">{l.to}</td><td className="text-center">{l.status}</td><td className="text-left">{l.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {/* Performance Tracking Section */}
      <Card className="mb-6 shadow border border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500" /><CardTitle>Performance Tracking</CardTitle></div>
          <button className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded flex items-center gap-1" onClick={() => setShowPerformanceDialog(true)}><Pencil className="h-4 w-4" /> Manage</button>
        </CardHeader>
        <CardContent>
          {performance.length === 0 ? <div className="text-muted-foreground">No performance records.</div> : (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left">Year</th><th className="text-right">Rating</th><th className="text-left">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {performance.map(p => (
                  <tr key={p.id} className="hover:bg-yellow-50">
                    <td className="text-left">{p.year}</td><td className="text-right">{p.rating}</td><td className="text-left">{p.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Classes Assigned Section */}
      <Card className="mb-6 shadow border border-gray-100">
        <CardHeader>
          <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-600" /><CardTitle>Classes Assigned</CardTitle></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { subject: "Mathematics", class: "10-A", period: "1st Period", room: "Room 101" },
              { subject: "Mathematics", class: "10-B", period: "2nd Period", room: "Room 102" },
              { subject: "Algebra", class: "9-A", period: "3rd Period", room: "Room 103" },
              { subject: "Mathematics", class: "8-C", period: "5th Period", room: "Room 104" }
            ].map((assignment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{assignment.subject}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      Class {assignment.class}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{assignment.period}</span>
                    <span>{assignment.room}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Dialogs for Add/Edit actions */}
      {showPayrollDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingPayroll ? 'Edit Payroll Record' : 'Add Payroll Record'}</h2>
            <PayrollForm
              staffId={staff.id}
              record={editingPayroll ?? undefined}
              onClose={() => { setShowPayrollDialog(false); setEditingPayroll(null); }}
              onSuccess={() => {
                setShowPayrollDialog(false);
                setEditingPayroll(null);
                loadPayroll(staff.id);
              }}
            />
          </div>
        </div>
      )}
      {showLeaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Add/Edit Leave</h2>
            <LeaveForm staffId={staff.id} onClose={() => setShowLeaveDialog(false)} onSuccess={() => setShowLeaveDialog(false)} />
          </div>
        </div>
      )}
      {showPerformanceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Add/Edit Performance</h2>
            <PerformanceForm staffId={staff.id} onClose={() => setShowPerformanceDialog(false)} onSuccess={() => setShowPerformanceDialog(false)} />
          </div>
        </div>
      )}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Edit Staff</h2>
            <StaffForm
              staff={staff}
              onClose={() => setShowEdit(false)}
              onSuccess={() => {
                setShowEdit(false);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
      {showDeleteDialog && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="mb-4 text-red-600 font-semibold">Are you sure you want to permanently delete this staff member? This action cannot be undone.</div>
            <div className="flex gap-4 justify-end">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={async () => { await handleDelete(); setShowDeleteDialog(false); }}>Delete</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
