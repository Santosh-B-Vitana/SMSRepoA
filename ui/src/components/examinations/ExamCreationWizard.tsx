/**
 * ExamCreationWizard
 * A multi-step dialog for creating a structured multi-subject exam setup.
 *
 * Step 1 — Basic Info
 *   • Exam type (pre-defined or Custom with text input)
 *   • Academic year, Class, Board (shown only when class has multiple boards), Section
 *   • Live auto-generated exam name preview
 *
 * Step 2 — Subjects
 *   • Subjects filtered by class + board from Academic Setup
 *   • Split into Core and Elective sections
 *   • Per-subject: marks config (theory/practical/internal/passing), assigned staff, exam date/time
 *
 * Step 3 — Review & Create
 *   • Shows full summary and calls createExamSetup API
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronRight, ChevronLeft, Check, BookOpen, GraduationCap, AlertCircle, Calendar } from 'lucide-react';
import {
  previewExamName, getClassBoards, getClassSubjectsForExam, createExamSetup,
  type ClassBoardDto, type ClassSubjectForExamDto, type CreateExamSetupDto,
  type CreateExamSetupSubjectDto, type ExamSetupDetailDto,
} from '@/services/api/examSetupApi';
import { academicApi, type ClassResponse, type SectionResponse, type AcademicYearResponse } from '@/services/api/academicApi';
import { staffApi, type Staff } from '@/services/api/staffApi';
import { apiGet } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamTypeOption {
  id: string;
  name: string;
  defaultMaxMarks: number;
}

interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  isElective: boolean;
  selected: boolean;
  maxTheoryMarks: number;
  maxPracticalMarks: number;
  maxInternalMarks: number;
  passingMarks: number;
  assignedStaffId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  venue: string;
}

interface WizardState {
  // Step 1
  examTypeId: string;
  isCustomType: boolean;
  customTypeName: string;
  academicYear: string;
  classId: string;
  sectionId: string;
  boardConfigurationId: string;
  term: string;
  startDate: string;
  endDate: string;
  // derived
  suggestedName: string;
  // Step 2
  subjects: SubjectConfig[];
}

const WIZARD_STEPS = ['Basic Info', 'Subjects', 'Review & Create'];

/** Map UI term label → backend int (0=Annual, 1=Term1, 2=Term2, 3=Term3) */
function termLabelToInt(label: string): number | undefined {
  if (!label) return undefined;
  if (label === 'Annual') return 0;
  if (label === 'Term 1' || label === 'Semester 1') return 1;
  if (label === 'Term 2' || label === 'Semester 2') return 2;
  if (label === 'Term 3') return 3;
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExamCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (setup: ExamSetupDetailDto) => void;
  /** When set, pre-filters the Class dropdown to classes belonging to this board */
  boardConfigurationId?: string;
}

export function ExamCreationWizard({ open, onOpenChange, onCreated, boardConfigurationId: propBoardId }: ExamCreationWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Reference data ───────────────────────────────────────────────────────

  const [examTypes, setExamTypes] = useState<ExamTypeOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [boards, setBoards] = useState<ClassBoardDto[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<ClassSubjectForExamDto[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  // ─── Form state ───────────────────────────────────────────────────────────

  const [form, setForm] = useState<WizardState>({
    examTypeId: '',
    isCustomType: false,
    customTypeName: '',
    academicYear: '',
    classId: '',
    sectionId: '',
    boardConfigurationId: '',
    term: '',
    startDate: '',
    endDate: '',
    suggestedName: '',
    subjects: [],
  });

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  // ─── Load reference data on open ─────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setErrors({});
    setForm({
      examTypeId: '', isCustomType: false, customTypeName: '',
      academicYear: '', classId: '', sectionId: '', boardConfigurationId: propBoardId ?? '',
      term: '', startDate: '', endDate: '', suggestedName: '', subjects: [],
    });
    setAvailableSubjects([]);
    setBoards([]);
    setSections([]);

    // Load exam types, academic years, classes and staff in parallel
    setLoading(true);
    Promise.all([
      apiGet<{ examTypes: ExamTypeOption[]; total: number }>('/academics/exam-types'),
      academicApi.listAcademicYears(1, 100),
      academicApi.listClasses(1, 200),
      staffApi.list({ pageSize: 200 }),
    ])
      .then(([etRes, ayRes, clRes, stRes]) => {
        setExamTypes(etRes.examTypes ?? []);
        setAcademicYears(ayRes.academicYears ?? []);
        setClasses(clRes.classes ?? []);
        setStaffList((stRes.staff ?? []).filter(s => s.status === 'active'));

        // Pre-select current academic year if available
        const current = (ayRes.academicYears ?? []).find(a => a.isCurrent);
        if (current) update('academicYear', current.name);
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load reference data.', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch sections when class changes ────────────────────────────────────

  useEffect(() => {
    if (!form.classId) { setSections([]); setBoards([]); return; }

    // Load sections for this class
    academicApi.listSections(form.classId, 1, 100)
      .then(res => setSections(res.sections ?? []))
      .catch(() => setSections([]));

    // Check boards for this class
    getClassBoards(form.classId)
      .then(bds => {
        setBoards(bds);
        if (bds.length === 1) {
          update('boardConfigurationId', bds[0].boardConfigurationId);
        } else {
          update('boardConfigurationId', '');
        }
      })
      .catch(() => setBoards([]));
  }, [form.classId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-generate exam name when key fields change ───────────────────────

  useEffect(() => {
    if (!form.classId || !form.academicYear) { update('suggestedName', ''); return; }
    const params = {
      classId: form.classId,
      sectionId: form.sectionId || undefined,
      academicYear: form.academicYear,
      examTypeId: (!form.isCustomType && form.examTypeId) ? form.examTypeId : undefined,
      isCustomType: form.isCustomType,
      customTypeName: form.isCustomType ? form.customTypeName : undefined,
    };
    previewExamName(params)
      .then(res => update('suggestedName', res.suggestedName))
      .catch(() => {});
  }, [form.examTypeId, form.isCustomType, form.customTypeName, form.classId, form.sectionId, form.academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load subjects when moving to Step 2 ─────────────────────────────────

  const loadSubjects = useCallback(async () => {
    if (!form.classId) return;
    setLoading(true);
    try {
      const subs = await getClassSubjectsForExam({
        classId: form.classId,
        boardConfigurationId: form.boardConfigurationId || undefined,
        academicYear: form.academicYear || undefined,
      });

      const selectedType = examTypes.find(et => et.id === form.examTypeId);
      const defaultMax = selectedType?.defaultMaxMarks ?? 100;

      setAvailableSubjects(subs);
      setForm(prev => ({
        ...prev,
        subjects: subs.map((s): SubjectConfig => ({
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          isElective: s.isElective,
          selected: !s.isElective,              // core subjects selected by default
          maxTheoryMarks: defaultMax,
          maxPracticalMarks: 0,
          maxInternalMarks: 0,
          passingMarks: Math.round(defaultMax * 0.33),
          assignedStaffId: s.defaultStaffId ?? '',
          examDate: '',
          startTime: '',
          endTime: '',
          venue: '',
        })),
      }));
    } catch {
      toast({ title: 'Error', description: 'Failed to load subjects for this class.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [form.classId, form.boardConfigurationId, form.academicYear, form.examTypeId, examTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.isCustomType && !form.examTypeId) e.examTypeId = 'Select an exam type.';
    if (form.isCustomType && !form.customTypeName.trim()) e.customTypeName = 'Enter a custom type name.';
    if (!form.academicYear) e.academicYear = 'Select an academic year.';
    if (!form.classId) e.classId = 'Select a class.';
    if (boards.length > 1 && !form.boardConfigurationId) e.boardConfigurationId = 'Select a board.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = 'End date must be after start date.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    const selected = form.subjects.filter(s => s.selected);
    if (selected.length === 0) { e.subjects = 'Select at least one subject.'; }
    selected.forEach(s => {
      if ((s.maxTheoryMarks + s.maxPracticalMarks + s.maxInternalMarks) === 0)
        e[`marks_${s.subjectId}`] = `${s.subjectName}: Total marks must be > 0`;
      if (s.examDate && form.startDate && s.examDate < form.startDate)
        e[`examDate_${s.subjectId}`] = `${s.subjectName}: Exam date is before the exam start date.`;
      if (s.examDate && form.endDate && s.examDate > form.endDate)
        e[`examDate_${s.subjectId}`] = `${s.subjectName}: Exam date is after the exam end date.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Navigation ───────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return;
      await loadSubjects();
      setStep(1);
    } else if (step === 1) {
      if (!validateStep2()) return;
      setStep(2);
    }
  };

  const handleBack = () => setStep(prev => Math.max(0, prev - 1));

  // ─── Suggest Dates ────────────────────────────────────────────────────────

  const handleSuggestDates = () => {
    const selected = form.subjects.filter(s => s.selected);
    if (!form.startDate || selected.length === 0) return;
    const start = new Date(form.startDate);
    const end = form.endDate ? new Date(form.endDate) : start;
    const totalDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const step = selected.length > 1 ? totalDays / (selected.length - 1) : 0;
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => {
        if (!s.selected) return s;
        const idx = selected.findIndex(sel => sel.subjectId === s.subjectId);
        const d = new Date(start.getTime() + Math.round(idx * step) * 24 * 60 * 60 * 1000);
        return { ...s, examDate: d.toISOString().split('T')[0] };
      }),
    }));
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep2()) { setStep(1); return; }
    setSubmitting(true);
    try {
      const payload: CreateExamSetupDto = {
        examTypeId: (!form.isCustomType && form.examTypeId) ? form.examTypeId : undefined,
        isCustomType: form.isCustomType,
        customTypeName: form.isCustomType ? form.customTypeName : undefined,
        classId: form.classId,
        sectionId: form.sectionId || undefined,
        boardConfigurationId: form.boardConfigurationId || undefined,
        academicYear: form.academicYear,
        term: termLabelToInt(form.term),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        subjects: form.subjects
          .filter(s => s.selected)
          .map((s, i): CreateExamSetupSubjectDto => ({
            subjectId: s.subjectId,
            isElective: s.isElective,
            maxTheoryMarks: s.maxTheoryMarks,
            maxPracticalMarks: s.maxPracticalMarks,
            maxInternalMarks: s.maxInternalMarks,
            passingMarks: s.passingMarks,
            assignedStaffId: s.assignedStaffId || undefined,
            examDate: s.examDate || undefined,
            startTime: s.startTime || undefined,
            endTime: s.endTime || undefined,
            venue: s.venue || undefined,
            subjectOrder: i + 1,
          })),
      };

      const result = await createExamSetup(payload);
      toast({ title: 'Exam Setup Created', description: `"${result.name}" has been created successfully.` });
      onCreated?.(result);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to create exam setup.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Helpers for Step 2 ───────────────────────────────────────────────────

  const coreSubjects = useMemo(() => form.subjects.filter(s => !s.isElective), [form.subjects]);
  const electiveSubjects = useMemo(() => form.subjects.filter(s => s.isElective), [form.subjects]);

  const updateSubject = (subjectId: string, field: keyof SubjectConfig, value: string | number | boolean) => {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.subjectId === subjectId ? { ...s, [field]: value } : s),
    }));
  };

  const selectedCount = form.subjects.filter(s => s.selected).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            New Exam Setup
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-3">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                  i < step ? 'bg-primary text-primary-foreground' :
                  i === step ? 'bg-primary/10 text-primary border border-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-xs ${i === step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {s}
                </span>
                {i < WIZARD_STEPS.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ── STEP 1: BASIC INFO ── */}
              {step === 0 && (
                <div className="space-y-4">
                  {/* Exam type */}
                  <div className="flex items-center gap-3 mb-2">
                    <Checkbox
                      id="customType"
                      checked={form.isCustomType}
                      onCheckedChange={v => update('isCustomType', Boolean(v))}
                    />
                    <Label htmlFor="customType" className="cursor-pointer">Use Custom Exam Type</Label>
                  </div>

                  {form.isCustomType ? (
                    <div>
                      <Label>Custom Type Name *</Label>
                      <Input
                        placeholder="e.g. Weekly Quiz, Oral Exam"
                        value={form.customTypeName}
                        onChange={e => update('customTypeName', e.target.value)}
                        className={errors.customTypeName ? 'border-destructive' : ''}
                      />
                      {errors.customTypeName && <p className="text-xs text-destructive mt-1">{errors.customTypeName}</p>}
                    </div>
                  ) : (
                    <div>
                      <Label>Exam Type *</Label>
                      <Select value={form.examTypeId} onValueChange={v => update('examTypeId', v)}>
                        <SelectTrigger className={errors.examTypeId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select exam type" />
                        </SelectTrigger>
                        <SelectContent>
                          {examTypes.map(et => (
                            <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.examTypeId && <p className="text-xs text-destructive mt-1">{errors.examTypeId}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Academic Year */}
                    <div>
                      <Label>Academic Year *</Label>
                      <Select value={form.academicYear} onValueChange={v => update('academicYear', v)}>
                        <SelectTrigger className={errors.academicYear ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map(ay => (
                            <SelectItem key={ay.id} value={ay.name}>{ay.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.academicYear && <p className="text-xs text-destructive mt-1">{errors.academicYear}</p>}
                    </div>

                    {/* Term */}
                    <div>
                      <Label>Term <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Select value={form.term} onValueChange={v => update('term', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="e.g. Term 1" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Term 1', 'Term 2', 'Term 3', 'Semester 1', 'Semester 2', 'Annual'].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Class */}
                    <div>
                      <Label>Class *</Label>
                      <Select value={form.classId} onValueChange={v => { update('classId', v); update('sectionId', ''); update('boardConfigurationId', ''); }}>
                        <SelectTrigger className={errors.classId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes
                            .filter(c => !propBoardId || c.boardConfigurationId === propBoardId)
                            .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx)
                            .map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {errors.classId && <p className="text-xs text-destructive mt-1">{errors.classId}</p>}
                    </div>

                    {/* Board — only shown when class has multiple boards */}
                    {boards.length > 1 && (
                      <div>
                        <Label>Board *</Label>
                        <Select value={form.boardConfigurationId} onValueChange={v => update('boardConfigurationId', v)}>
                          <SelectTrigger className={errors.boardConfigurationId ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select board" />
                          </SelectTrigger>
                          <SelectContent>
                            {boards.map(b => (
                              <SelectItem key={b.boardConfigurationId} value={b.boardConfigurationId}>{b.boardName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.boardConfigurationId && <p className="text-xs text-destructive mt-1">{errors.boardConfigurationId}</p>}
                      </div>
                    )}

                    {/* Section */}
                    <div>
                      <Label>Section <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Select value={form.sectionId || '__none__'} onValueChange={v => update('sectionId', v === '__none__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All sections" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">All Sections</SelectItem>
                          {sections.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <Label>Start Date *</Label>
                      <Input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={errors.startDate ? 'border-destructive' : ''} />
                      {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
                    </div>

                    {/* End Date */}
                    <div>
                      <Label>End Date *</Label>
                      <Input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} min={form.startDate || undefined} className={errors.endDate ? 'border-destructive' : ''} />
                      {errors.endDate && <p className="text-xs text-destructive mt-1">{errors.endDate}</p>}
                    </div>
                  </div>

                  {/* Auto-generated name preview */}
                  {form.suggestedName && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Auto-generated exam name:</p>
                      <p className="font-semibold text-primary">{form.suggestedName}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: SUBJECTS ── */}
              {step === 1 && (
                <div className="space-y-4">
                  {errors.subjects && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errors.subjects}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{selectedCount} subject{selectedCount !== 1 ? 's' : ''} selected</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs hidden sm:inline">Configure marks and staff for each subject</span>
                      {form.startDate && (
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSuggestDates}>
                          <Calendar className="h-3 w-3" /> Suggest Dates
                        </Button>
                      )}
                    </div>
                  </div>

                  <Accordion type="multiple" defaultValue={['core', 'elective']} className="space-y-2">

                    {/* Core Subjects */}
                    {coreSubjects.length > 0 && (
                      <AccordionItem value="core" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-medium">Core Subjects</span>
                            <Badge variant="secondary">{coreSubjects.filter(s => s.selected).length} / {coreSubjects.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pb-2">
                            {coreSubjects.map(sub => (
                              <SubjectRow
                                key={sub.subjectId}
                                sub={sub}
                                staffList={staffList}
                                onChange={updateSubject}
                                error={errors[`marks_${sub.subjectId}`]}
                                dateError={errors[`examDate_${sub.subjectId}`]}
                                startDate={form.startDate || undefined}
                                endDate={form.endDate || undefined}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Elective Subjects */}
                    {electiveSubjects.length > 0 && (
                      <AccordionItem value="elective" className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-amber-600" />
                            <span className="font-medium">Elective Subjects</span>
                            <Badge variant="outline" className="text-amber-700 border-amber-300">{electiveSubjects.filter(s => s.selected).length} / {electiveSubjects.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pb-2">
                            {electiveSubjects.map(sub => (
                              <SubjectRow
                                key={sub.subjectId}
                                sub={sub}
                                staffList={staffList}
                                onChange={updateSubject}
                                error={errors[`marks_${sub.subjectId}`]}
                                dateError={errors[`examDate_${sub.subjectId}`]}
                                startDate={form.startDate || undefined}
                                endDate={form.endDate || undefined}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>

                  {availableSubjects.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No subjects configured for this class. Please set up subjects in Academic Setup first.
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 3: REVIEW ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Exam Name</p>
                      <p className="font-semibold text-lg">{form.suggestedName}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Exam Type</p>
                        <p className="font-medium">
                          {form.isCustomType ? `Custom: ${form.customTypeName}` : (examTypes.find(e => e.id === form.examTypeId)?.name ?? '—')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Academic Year</p>
                        <p className="font-medium">{form.academicYear}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Class</p>
                        <p className="font-medium">{classes.find(c => c.id === form.classId)?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Section</p>
                        <p className="font-medium">{sections.find(s => s.id === form.sectionId)?.name ?? 'All Sections'}</p>
                      </div>
                      {form.term && (
                        <div>
                          <p className="text-muted-foreground">Term</p>
                          <p className="font-medium">{form.term}</p>
                        </div>
                      )}
                      {(form.startDate || form.endDate) && (
                        <div>
                          <p className="text-muted-foreground">Dates</p>
                          <p className="font-medium">{form.startDate || '—'} → {form.endDate || '—'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Selected Subjects ({selectedCount})</p>
                    <div className="space-y-1.5">
                      {form.subjects.filter(s => s.selected).map(sub => (
                        <div key={sub.subjectId} className="flex items-center justify-between bg-muted/40 rounded px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sub.subjectName}</span>
                            {sub.isElective && <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">Elective</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground text-xs">
                            <span>Max: {sub.maxTheoryMarks + sub.maxPracticalMarks + sub.maxInternalMarks}</span>
                            <span>Pass: {sub.passingMarks}</span>
                            {sub.assignedStaffId && (
                              <span>Staff: {staffList.find(st => st.id === sub.assignedStaffId)?.name ?? '—'}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex justify-between gap-2">
          <Button variant="outline" onClick={step === 0 ? () => onOpenChange(false) : handleBack}>
            {step === 0 ? 'Cancel' : <><ChevronLeft className="h-4 w-4 mr-1" /> Back</>}
          </Button>
          {step < 2 ? (
            <Button onClick={handleNext} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Create Exam Setup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SubjectRow Sub-component ─────────────────────────────────────────────────

interface SubjectRowProps {
  sub: SubjectConfig;
  staffList: Staff[];
  onChange: (subjectId: string, field: keyof SubjectConfig, value: string | number | boolean) => void;
  error?: string;
  dateError?: string;
  startDate?: string;
  endDate?: string;
}

function SubjectRow({ sub, staffList, onChange, error, dateError, startDate, endDate }: SubjectRowProps) {
  return (
    <div className={`rounded-lg border p-3 space-y-3 ${!sub.selected ? 'opacity-60' : ''} ${error || dateError ? 'border-destructive/50 bg-destructive/5' : ''}`}>
      {/* Header row: checkbox + name */}
      <div className="flex items-center gap-3">
        <Checkbox
          id={`sub_${sub.subjectId}`}
          checked={sub.selected}
          onCheckedChange={v => onChange(sub.subjectId, 'selected', Boolean(v))}
        />
        <Label htmlFor={`sub_${sub.subjectId}`} className="font-medium cursor-pointer flex-1">
          {sub.subjectName}
        </Label>
        {error && <span className="text-xs text-destructive">{error}</span>}
        {dateError && <span className="text-xs text-destructive">{dateError}</span>}
      </div>

      {sub.selected && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-7">
          {/* Marks config */}
          <div>
            <Label className="text-xs">Theory Marks</Label>
            <Input
              type="number" min={0} max={500}
              value={sub.maxTheoryMarks}
              onChange={e => onChange(sub.subjectId, 'maxTheoryMarks', Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Practical Marks</Label>
            <Input
              type="number" min={0} max={500}
              value={sub.maxPracticalMarks}
              onChange={e => onChange(sub.subjectId, 'maxPracticalMarks', Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Internal/CCE</Label>
            <Input
              type="number" min={0} max={500}
              value={sub.maxInternalMarks}
              onChange={e => onChange(sub.subjectId, 'maxInternalMarks', Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Passing Marks</Label>
            <Input
              type="number" min={0} max={500}
              value={sub.passingMarks}
              onChange={e => onChange(sub.subjectId, 'passingMarks', Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>

          {/* Assign staff */}
          <div className="col-span-2">
            <Label className="text-xs">Assigned Staff</Label>
            <Select value={sub.assignedStaffId || '__none__'} onValueChange={v => onChange(sub.subjectId, 'assignedStaffId', v === '__none__' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Not assigned —</SelectItem>
                {staffList.map(st => (
                  <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam date */}
          <div>
            <Label className="text-xs">Exam Date</Label>
            <Input
              type="date"
              value={sub.examDate}
              min={startDate || undefined}
              max={endDate || undefined}
              onChange={e => onChange(sub.subjectId, 'examDate', e.target.value)}
              className={`h-8 text-sm ${dateError ? 'border-destructive' : ''}`}
            />
          </div>

          <div>
            <Label className="text-xs">Venue</Label>
            <Input
              placeholder="Room no."
              value={sub.venue}
              onChange={e => onChange(sub.subjectId, 'venue', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
