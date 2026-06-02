import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Plus, Pencil, Trash2, Loader2, Search, Activity, Syringe, AlertTriangle, BarChart3, Eye, CheckCircle2 } from "lucide-react";
import {
  healthApi,
  HealthRecordBasic, HealthRecordFull,
  HealthAlertDto, HealthStatsDto,
  CreateHealthRecordDto, UpdateHealthRecordDto, CreateVaccinationDto, CreateHealthAlertDto,
} from "@/services/api/healthApi";
import { studentApi, StudentBasic } from "@/services/api/studentApi";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { academicApi } from "@/services/api/academicApi";

const STATUS_COLOR: Record<string, string> = {
  normal: "bg-green-100 text-green-800",
  attention_required: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
  follow_up: "bg-blue-100 text-blue-800",
};

const BMI_COLOR: Record<string, string> = {
  Underweight: "text-amber-600",
  Normal: "text-green-600",
  Overweight: "text-orange-600",
  Obese: "text-red-600",
};

// ─── Health Record Form ───────────────────────────────────────────────────────

function RecordFormDialog({ record, onClose, onSaved, allowedClasses }: { record?: HealthRecordFull; onClose: () => void; onSaved: () => void; allowedClasses?: Array<{ className: string; sectionName?: string }> | null }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const isEdit = !!record;
  const [form, setForm] = useState<CreateHealthRecordDto>({
    studentId: record?.studentId ?? "",
    checkupDate: record?.checkupDate?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    height: record?.height ?? 0,
    weight: record?.weight ?? 0,
    bloodPressureSystolic: record?.bloodPressureSystolic,
    bloodPressureDiastolic: record?.bloodPressureDiastolic,
    heartRate: record?.heartRate,
    temperature: record?.temperature,
    bloodGroup: record?.bloodGroup ?? "",
    allergies: record?.allergies ?? [],
    medicalConditions: record?.medicalConditions ?? [],
    currentMedications: record?.currentMedications ?? [],
    visionLeft: record?.visionLeft ?? "",
    visionRight: record?.visionRight ?? "",
    hearingLeft: record?.hearingLeft ?? "",
    hearingRight: record?.hearingRight ?? "",
    dentalStatus: record?.dentalStatus ?? "",
    dentalRemarks: record?.dentalRemarks ?? "",
    doctorName: record?.doctorName ?? "",
    doctorNotes: record?.doctorNotes ?? "",
    recommendations: record?.recommendations ?? "",
    nextCheckupDate: record?.nextCheckupDate?.split("T")[0] ?? "",
    status: record?.status ?? "normal",
  });
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (isEdit) return;
    if (allowedClasses !== null && allowedClasses !== undefined && allowedClasses.length > 0) {
      Promise.all(allowedClasses.map(a => studentApi.list({ classFilter: a.className, sectionFilter: a.sectionName, pageSize: 200 })))
        .then(results => setStudents(results.flatMap(r => r.students ?? [])))
        .catch(() => {});
    } else if (allowedClasses === null || allowedClasses === undefined) {
      studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
    }
    // allowedClasses.length === 0 means no class teacher assignments — leave students empty
  }, [isEdit, allowedClasses]);

  function set(k: keyof CreateHealthRecordDto, v: unknown) { setForm(p => ({ ...p, [k]: v })); }
  function setNum(k: keyof CreateHealthRecordDto, v: string) { set(k, v ? parseFloat(v) : undefined); }

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.admissionNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && !form.studentId) { toast.error("Select a student"); return; }
    if (!form.height || !form.weight) { toast.error("Height and weight are required"); return; }
    if (!form.doctorName) { toast.error("Doctor name is required"); return; }
    setSaving(true);
    try {
      if (isEdit && record) {
        const upd: UpdateHealthRecordDto = { ...form };
        await healthApi.updateRecord(record.id, upd);
        toast.success(t('health.toast.recordUpdated'));
      } else {
        await healthApi.createRecord(form);
        toast.success(t('health.toast.recordCreated'));
      }
      onSaved(); onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('health.toast.failedSaveRecord'));
    } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? t('health.recordForm.titleEdit') : t('health.recordForm.titleNew')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isEdit && (
            <div className="space-y-2">
              <Label>{t('health.recordForm.searchStudent')}</Label>
              <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder={t('health.recordForm.searchPlaceholder')} />
              <Select value={form.studentId} onValueChange={v => set("studentId", v)}>
                <SelectTrigger><SelectValue placeholder={t('health.recordForm.selectStudent')} /></SelectTrigger>
                <SelectContent>
                  {filteredStudents.slice(0, 50).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.class} {s.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.checkupDate')} *</Label>
              <Input type="date" value={form.checkupDate} onChange={e => set("checkupDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.height')} *</Label>
              <Input type="number" step="0.1" value={form.height || ""} onChange={e => setNum("height", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.weight')} *</Label>
              <Input type="number" step="0.1" value={form.weight || ""} onChange={e => setNum("weight", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.bpSystolic')}</Label>
              <Input type="number" value={form.bloodPressureSystolic ?? ""} onChange={e => setNum("bloodPressureSystolic", e.target.value)} placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.bpDiastolic')}</Label>
              <Input type="number" value={form.bloodPressureDiastolic ?? ""} onChange={e => setNum("bloodPressureDiastolic", e.target.value)} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.heartRate')}</Label>
              <Input type="number" value={form.heartRate ?? ""} onChange={e => setNum("heartRate", e.target.value)} placeholder="72" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.temperature')}</Label>
              <Input type="number" step="0.1" value={form.temperature ?? ""} onChange={e => setNum("temperature", e.target.value)} placeholder="98.6" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.bloodGroup')}</Label>
              <Select value={form.bloodGroup ?? ""} onValueChange={v => set("bloodGroup", v)}>
                <SelectTrigger><SelectValue placeholder={t('health.recordForm.selectBloodGroup')} /></SelectTrigger>
                <SelectContent>
                  {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.visionLeft')}</Label>
              <Input value={form.visionLeft ?? ""} onChange={e => set("visionLeft", e.target.value)} placeholder="6/6" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.visionRight')}</Label>
              <Input value={form.visionRight ?? ""} onChange={e => set("visionRight", e.target.value)} placeholder="6/6" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('health.recordForm.allergies')}</Label>
            <Input value={(form.allergies ?? []).join(", ")} onChange={e => set("allergies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Peanuts, Dust" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.doctorName')} *</Label>
              <Input value={form.doctorName} onChange={e => set("doctorName", e.target.value)} placeholder="Dr. Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.status')}</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('health.status.normal')}</SelectItem>
                  <SelectItem value="attention_required">{t('health.status.attentionRequired')}</SelectItem>
                  <SelectItem value="critical">{t('health.status.critical')}</SelectItem>
                  <SelectItem value="follow_up">{t('health.status.followUp')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('health.recordForm.doctorNotes')}</Label>
            <Textarea value={form.doctorNotes ?? ""} onChange={e => set("doctorNotes", e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.recommendations')}</Label>
              <Textarea value={form.recommendations ?? ""} onChange={e => set("recommendations", e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.recordForm.nextCheckupDate')}</Label>
              <Input type="date" value={form.nextCheckupDate ?? ""} onChange={e => set("nextCheckupDate", e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('health.recordForm.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t('health.recordForm.updateRecord') : t('health.recordForm.createRecord')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Record Dialog ───────────────────────────────────────────────────────

function ViewRecordDialog({ recordId, onClose, onEdit }: { recordId: string; onClose: () => void; onEdit: (r: HealthRecordFull) => void }) {
  const [record, setRecord] = useState<HealthRecordFull | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    healthApi.getRecordById(recordId)
      .then(r => setRecord(r))
      .catch(() => toast.error("Failed to load record"))
      .finally(() => setLoading(false));
  }, [recordId]);

  if (loading) return <Dialog open onOpenChange={onClose}><DialogContent><Skeleton className="h-60 w-full" /></DialogContent></Dialog>;
  if (!record) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{record.studentName} — Health Record</span>
            <Badge className={STATUS_COLOR[record.status] ?? ""}>{record.status.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">{t('health.viewRecord.class')}:</span> {record.class} {record.section}</div>
            <div><span className="text-muted-foreground">{t('health.viewRecord.date')}:</span> {new Date(record.checkupDate).toLocaleDateString("en-IN")}</div>
            <div><span className="text-muted-foreground">{t('health.viewRecord.bloodGroup')}:</span> {record.bloodGroup ?? "—"}</div>
            <div><span className="text-muted-foreground">{t('health.viewRecord.doctor')}:</span> {record.doctorName}</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{t('health.viewRecord.height')}</p><p className="text-lg font-bold">{record.height} cm</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{t('health.viewRecord.weight')}</p><p className="text-lg font-bold">{record.weight} kg</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{t('health.viewRecord.bmi')}</p><p className={`text-lg font-bold ${BMI_COLOR[record.bmiCategory] ?? ""}`}>{record.bmi?.toFixed(1)}</p><p className="text-xs">{record.bmiCategory}</p></CardContent></Card>
            <Card><CardContent className="pt-3 text-center"><p className="text-xs text-muted-foreground">{t('health.viewRecord.bp')}</p><p className="text-lg font-bold">{record.bloodPressureSystolic ?? "—"}/{record.bloodPressureDiastolic ?? "—"}</p></CardContent></Card>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">{t('health.viewRecord.vision')}:</span> L: {record.visionLeft ?? "—"} R: {record.visionRight ?? "—"}</div>
            <div><span className="text-muted-foreground">{t('health.viewRecord.heartRate')}:</span> {record.heartRate ?? "—"} bpm</div>
          </div>
          {(record.allergies?.length > 0) && (
            <div><span className="text-sm text-muted-foreground">{t('health.viewRecord.allergies')}:</span> <div className="flex flex-wrap gap-1 mt-1">{record.allergies.map(a => <Badge key={a} variant="outline" className="text-red-600">{a}</Badge>)}</div></div>
          )}
          {record.doctorNotes && <div><span className="text-sm text-muted-foreground">{t('health.viewRecord.notes')}:</span><p className="text-sm mt-1">{record.doctorNotes}</p></div>}
          {record.recommendations && <div><span className="text-sm text-muted-foreground">{t('health.viewRecord.recommendations')}:</span><p className="text-sm mt-1">{record.recommendations}</p></div>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t('health.viewRecord.close')}</Button>
          <Button onClick={() => { onEdit(record); onClose(); }} className="gap-1"><Pencil className="h-4 w-4" />{t('health.viewRecord.edit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Vaccination Dialog ───────────────────────────────────────────────────

function VaccinationDialog({ onClose, onSaved, allowedClasses }: { onClose: () => void; onSaved: () => void; allowedClasses?: Array<{ className: string; sectionName?: string }> | null }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateVaccinationDto>({
    studentId: "", vaccineName: "", vaccinationDate: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (allowedClasses !== null && allowedClasses !== undefined && allowedClasses.length > 0) {
      Promise.all(allowedClasses.map(a => studentApi.list({ classFilter: a.className, sectionFilter: a.sectionName, pageSize: 200 })))
        .then(results => setStudents(results.flatMap(r => r.students ?? [])))
        .catch(() => {});
    } else if (allowedClasses === null || allowedClasses === undefined) {
      studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
    }
  }, [allowedClasses]);

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.vaccineName) { toast.error("Student and vaccine name required"); return; }
    setSaving(true);
    try {
      await healthApi.addVaccination(form);
      toast.success(t('health.toast.vaccinationRecorded'));
      onSaved(); onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('health.vaccination.title')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('health.vaccination.searchStudent')}</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('health.search.placeholder')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('health.vaccination.student')} *</Label>
            <Select value={form.studentId} onValueChange={v => setForm(p => ({ ...p, studentId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('health.recordForm.selectStudent')} /></SelectTrigger>
              <SelectContent>{filtered.slice(0, 50).map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.class}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('health.vaccination.vaccineName')} *</Label>
            <Select value={form.vaccineName} onValueChange={v => setForm(p => ({ ...p, vaccineName: v }))}>
              <SelectTrigger><SelectValue placeholder="Select vaccine" /></SelectTrigger>
              <SelectContent>
                {["BCG","OPV","DPT","Hepatitis B","MMR","Typhoid","Varicella","HPV","Tdap","COVID-19","Influenza"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.vaccination.dateAdministered')} *</Label>
              <Input type="date" value={form.vaccinationDate} onChange={e => setForm(p => ({ ...p, vaccinationDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.vaccination.nextDueDate')}</Label>
              <Input type="date" value={form.nextDueDate ?? ""} onChange={e => setForm(p => ({ ...p, nextDueDate: e.target.value || undefined }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('health.vaccination.administeredBy')}</Label>
            <Input value={form.administeredBy ?? ""} onChange={e => setForm(p => ({ ...p, administeredBy: e.target.value }))} placeholder="Dr. Sharma" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('health.vaccination.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('health.vaccination.title')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Alert Dialog ──────────────────────────────────────────────────────

function AlertFormDialog({ onClose, onSaved, allowedClasses }: { onClose: () => void; onSaved: () => void; allowedClasses?: Array<{ className: string; sectionName?: string }> | null }) {
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CreateHealthAlertDto>({ studentId: "", alertType: "follow_up", severity: "medium", description: "" });
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (allowedClasses !== null && allowedClasses !== undefined && allowedClasses.length > 0) {
      Promise.all(allowedClasses.map(a => studentApi.list({ classFilter: a.className, sectionFilter: a.sectionName, pageSize: 200 })))
        .then(results => setStudents(results.flatMap(r => r.students ?? [])))
        .catch(() => {});
    } else if (allowedClasses === null || allowedClasses === undefined) {
      studentApi.list({ page: 1, pageSize: 200 }).then(r => setStudents(r.students ?? [])).catch(() => {});
    }
  }, [allowedClasses]);
  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId || !form.description) { toast.error("Student and description required"); return; }
    setSaving(true);
    try {
      await healthApi.createAlert(form);
      toast.success(t('health.toast.alertCreated'));
      onSaved(); onClose();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('health.alertForm.title')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('health.alertForm.searchStudent')}</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('health.search.placeholder')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('health.alertForm.student')} *</Label>
            <Select value={form.studentId} onValueChange={v => setForm(p => ({ ...p, studentId: v }))}>
              <SelectTrigger><SelectValue placeholder={t('health.recordForm.selectStudent')} /></SelectTrigger>
              <SelectContent>{filtered.slice(0, 50).map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.class}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('health.alertForm.alertType')}</Label>
              <Select value={form.alertType} onValueChange={v => setForm(p => ({ ...p, alertType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allergy">{t('health.alertForm.alertType.allergy')}</SelectItem>
                  <SelectItem value="medical_condition">{t('health.alertForm.alertType.medicalCondition')}</SelectItem>
                  <SelectItem value="medication">{t('health.alertForm.alertType.medication')}</SelectItem>
                  <SelectItem value="vaccination_due">{t('health.alertForm.alertType.vaccinationDue')}</SelectItem>
                  <SelectItem value="follow_up">{t('health.alertForm.alertType.followUp')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('health.alertForm.severity')}</Label>
              <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('health.alertForm.severity.low')}</SelectItem>
                  <SelectItem value="medium">{t('health.alertForm.severity.medium')}</SelectItem>
                  <SelectItem value="high">{t('health.alertForm.severity.high')}</SelectItem>
                  <SelectItem value="critical">{t('health.alertForm.severity.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('health.alertForm.description')} *</Label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the health concern..." />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('health.alertForm.cancel')}</Button>
            <Button type="submit" disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('health.alertForm.createAlert')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HealthManager() {
  const { user } = useAuth();
  const { t } = useLanguage();
  // null = no restriction (admin / counselor / hostel warden)
  // Array = only show records for these class+section assignments (class teacher staff)
  const [classTeacherClasses, setClassTeacherClasses] = useState<Array<{ className: string; sectionName?: string }> | null>(null);

  useEffect(() => {
    if (user?.role === 'staff') {
      academicApi.getMyClassAssignments()
        .then(assignments => {
          const ctClasses = assignments
            .filter(a => a.isClassTeacher)
            .map(a => ({ className: a.className, sectionName: a.sectionName }));
          setClassTeacherClasses(ctClasses);
        })
        .catch(() => setClassTeacherClasses([]));
    }
    // Non-staff roles (admin, super_admin) keep null → no restriction
  }, [user?.role]);

  const [records, setRecords] = useState<HealthRecordBasic[]>([]);
  const [alerts, setAlerts] = useState<HealthAlertDto[]>([]);
  const [stats, setStats] = useState<HealthStatsDto | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("records");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Dialog states
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editRecord, setEditRecord] = useState<HealthRecordFull | undefined>();
  const [viewRecordId, setViewRecordId] = useState<string | undefined>();
  const [showVaccination, setShowVaccination] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const loadRecords = useCallback(async (p: number) => {
    setRecordsLoading(true);
    try {
      const r = await healthApi.getRecords({ page: p, pageSize: PAGE_SIZE, searchQuery: search || undefined });
      const items = r.items ?? [];
      const count = r.totalCount ?? 0;
      // Backend already handles class-teacher section filtering via JWT designation claim
      setRecords(items);
      setTotal(count);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load records");
    } finally { setRecordsLoading(false); }
  }, [search]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const a = await healthApi.getAlerts();
      setAlerts(a ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load alerts");
    } finally { setAlertsLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await healthApi.getStats();
      setStats(s);
    } catch { /* stats are non-critical */ }
  }, []);

  useEffect(() => { loadRecords(1); loadStats(); }, [loadRecords, loadStats]);

  function handleTabChange(v: string) {
    setTab(v);
    if (v === "alerts" && alerts.length === 0) loadAlerts();
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm(t('health.confirm.deleteRecord'))) return;
    try {
      await healthApi.deleteRecord(id);
      toast.success(t('health.toast.recordDeleted'));
      loadRecords(page);
      loadStats();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  async function handleAcknowledgeAlert(id: string) {
    try {
      await healthApi.acknowledgeAlert(id);
      toast.success(t('health.toast.alertAcknowledged'));
      loadAlerts();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  function handlePageChange(p: number) {
    setPage(p);
    loadRecords(p);
  }

  const filteredRecords = records.filter(r =>
    r.studentName.toLowerCase().includes(search.toLowerCase()) ||
    (r.bloodGroup ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SEVERITY_COLOR: Record<string, string> = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6 text-red-500" />{t('health.title')}</h1>
          <p className="text-muted-foreground">{t('health.subtitle')}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('health.stats.totalRecords')}</p>
            <p className="text-2xl font-bold">{stats.totalRecords}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('health.stats.normal')}</p>
            <p className="text-2xl font-bold text-green-600">{stats.normalStatus}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('health.stats.attentionRequired')}</p>
            <p className="text-2xl font-bold text-amber-600">{stats.attentionRequired}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('health.stats.critical')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{t('health.stats.avgBmi')}</p>
            <p className="text-2xl font-bold">{stats.avgBMI?.toFixed(1) ?? "—"}</p>
          </CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="records" className="gap-1.5"><Activity className="h-4 w-4" />{t('health.tabs.records')}</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />{t('health.tabs.alerts')}
              {alerts.filter(a => !a.isAcknowledged).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full">
                  {alerts.filter(a => !a.isAcknowledged).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-4 w-4" />{t('health.tabs.analytics')}</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 w-64" placeholder={t('health.search.placeholder')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === "records" && (
              <>
                <Button variant="outline" onClick={() => setShowVaccination(true)} className="gap-1"><Syringe className="h-4 w-4" />{t('health.button.vaccination')}</Button>
                <Button onClick={() => setShowAddRecord(true)} className="gap-1"><Plus className="h-4 w-4" />{t('health.button.newCheckup')}</Button>
              </>
            )}
            {tab === "alerts" && <Button onClick={() => setShowAlert(true)} className="gap-1"><Plus className="h-4 w-4" />{t('health.button.createAlert')}</Button>}
          </div>
        </div>

        {/* Records Tab */}
        <TabsContent value="records">
          {recordsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filteredRecords.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('health.empty.noRecords')}</p>
              <p className="text-sm">{t('health.empty.noRecordsHint')}</p>
              <Button className="mt-4 gap-1" onClick={() => setShowAddRecord(true)}><Plus className="h-4 w-4" />{t('health.button.newCheckup')}</Button>
            </CardContent></Card>
          ) : (
            <>
              <div className="rounded-lg overflow-hidden border border-border dark:border-slate-700 bg-card dark:text-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-slate-800 hover:bg-muted/50">
                      <TableHead className="font-semibold text-foreground">{t('health.table.student')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('health.table.class')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('health.table.checkupDate')}</TableHead>
                      <TableHead className="text-center font-semibold text-foreground">{t('health.table.heightWeight')}</TableHead>
                      <TableHead className="text-center font-semibold text-foreground">{t('health.table.bmi')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('health.table.bloodGroup')}</TableHead>
                      <TableHead className="font-semibold text-foreground">{t('health.table.status')}</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">{t('health.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:[&>tr]:border-slate-600/70">
                    {filteredRecords.map(r => (
                      <TableRow key={r.id} className="dark:border-slate-600/70 dark:hover:bg-slate-700/40">
                        <TableCell className="font-medium dark:text-white">{r.studentName}</TableCell>
                        <TableCell className="dark:text-slate-200">{r.class} {r.section}</TableCell>
                        <TableCell className="dark:text-slate-200">{new Date(r.checkupDate).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell className="text-center dark:text-slate-200">{r.height}cm / {r.weight}kg</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${BMI_COLOR[r.bmiCategory] ?? ""}`}>{r.bmi?.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground dark:text-slate-400 ml-1">({r.bmiCategory})</span>
                        </TableCell>
                        <TableCell className="dark:text-slate-200">{r.bloodGroup ?? "—"}</TableCell>
                        <TableCell><Badge className={STATUS_COLOR[r.status] ?? ""}>{r.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setViewRecordId(r.id)}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRecord(r.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} records)</p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>{t('health.pagination.previous')}</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>{t('health.pagination.next')}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          {alertsLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : alerts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t('health.empty.noAlerts')}</p>
              <p className="text-sm">{t('health.empty.noAlertsHint')}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {alerts.map(a => (
                <Card key={a.id} className={a.isAcknowledged ? "opacity-60" : ""}>
                  <CardContent className="pt-4 flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.studentName}</span>
                        <Badge className={SEVERITY_COLOR[a.severity] ?? ""}>{a.severity}</Badge>
                        <Badge variant="outline">{a.alertType.replace("_", " ")}</Badge>
                        {a.isAcknowledged && <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" />{t('health.alert.acknowledged')}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    {!a.isAcknowledged && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => handleAcknowledgeAlert(a.id)}>
                        <CheckCircle2 className="h-3 w-3" />{t('health.button.acknowledge')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          {stats ? (
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">{t('health.stats.bmiDistribution')}</h3>
                  <div className="space-y-3">
                    {[
                      { label: t('health.bmi.underweight'), value: stats.bmiDistribution.underweight, color: "bg-amber-500" },
                      { label: t('health.bmi.normal'), value: stats.bmiDistribution.normal, color: "bg-green-500" },
                      { label: t('health.bmi.overweight'), value: stats.bmiDistribution.overweight, color: "bg-orange-500" },
                      { label: t('health.bmi.obese'), value: stats.bmiDistribution.obese, color: "bg-red-500" },
                    ].map(item => {
                      const pct = stats.totalRecords > 0 ? Math.round((item.value / stats.totalRecords) * 100) : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">{t('health.stats.statusOverview')}</h3>
                  <div className="space-y-3">
                    {[
                      { label: t('health.status.normal'), value: stats.normalStatus, color: "bg-green-500" },
                      { label: t('health.status.attentionRequired'), value: stats.attentionRequired, color: "bg-amber-500" },
                      { label: t('health.status.critical'), value: stats.critical, color: "bg-red-500" },
                      { label: t('health.status.followUp'), value: stats.followUp, color: "bg-blue-500" },
                    ].map(item => {
                      const pct = stats.totalRecords > 0 ? Math.round((item.value / stats.totalRecords) * 100) : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">{t('health.stats.quickStats')}</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div><p className="text-3xl font-bold text-blue-600">{stats.upcomingCheckups}</p><p className="text-sm text-muted-foreground">{t('health.stats.upcomingCheckups')}</p></div>
                    <div><p className="text-3xl font-bold text-purple-600">{stats.vaccinationsDue}</p><p className="text-sm text-muted-foreground">{t('health.stats.vaccinationsDue')}</p></div>
                    <div><p className="text-3xl font-bold">{stats.avgBMI?.toFixed(1) ?? "—"}</p><p className="text-sm text-muted-foreground">{t('health.stats.averageBmi')}</p></div>
                    <div><p className="text-3xl font-bold">{stats.totalRecords}</p><p className="text-sm text-muted-foreground">{t('health.stats.totalRecords')}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {(showAddRecord || editRecord) && (
        <RecordFormDialog record={editRecord} onClose={() => { setShowAddRecord(false); setEditRecord(undefined); }} onSaved={() => { loadRecords(page); loadStats(); }} allowedClasses={classTeacherClasses} />
      )}
      {viewRecordId && (
        <ViewRecordDialog recordId={viewRecordId} onClose={() => setViewRecordId(undefined)} onEdit={r => { setEditRecord(r); setViewRecordId(undefined); }} />
      )}
      {showVaccination && <VaccinationDialog onClose={() => setShowVaccination(false)} onSaved={() => { loadRecords(page); }} allowedClasses={classTeacherClasses} />}
      {showAlert && <AlertFormDialog onClose={() => setShowAlert(false)} onSaved={loadAlerts} allowedClasses={classTeacherClasses} />}
    </div>
  );
}
