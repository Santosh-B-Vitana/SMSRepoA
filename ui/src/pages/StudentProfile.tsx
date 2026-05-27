import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { ParentPortalAccountSection } from "@/components/parent/ParentPortalAccountSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  FileText, 
  CreditCard, 
  Users, 
  Calendar,
  Phone,
  MapPin,
  User,
  GraduationCap,
  RotateCcw,
  Award,
  ArrowUp,
  MoreVertical,
  Trophy,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ParentFeePayment } from "@/components/fees/ParentFeePayment";
import { SiblingFeeInfoPanel } from "@/components/students/SiblingFeeInfoPanel";
import { Student, StudentBasic, StudentProfileSummary, studentApi, GuardianStaffDto, StudentExitResponse } from "@/services/api/studentApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentExitDialog } from "@/components/students/StudentExitDialog";
import { StudentDetainDialog } from "@/components/students/StudentDetainDialog";
import { gradesApi, type StudentGradeResponse } from "@/services/api/gradesApi";
import StudentAttendanceView from "@/components/attendance/StudentAttendanceView";
import { StudentLeaveRequests } from "@/components/leave-management/StudentLeaveRequests";
import { getIssues, type BookIssue } from "@/services/api/libraryApi";
import { applyStaffDiscount } from "@/services/api/feeApi";

import { Input } from "@/components/ui/input";
import { ProfessionalCertificateDialog, CertificateType } from "@/components/documents/ProfessionalCertificateDialog";
import { ProfessionalIdCardDialog } from "@/components/documents/ProfessionalIdCardDialog";
import { ReportCardTemplate } from "@/components/examinations/ReportCardTemplate";
import { useToast } from "@/hooks/use-toast";
import placeholderImg from '/placeholder.svg';
import { useLanguage } from "@/contexts/LanguageContext";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";
import { generateProfessionalReportCard, SchoolInfo } from "@/utils/professionalPdfGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { StudentDocumentUpload } from "@/components/students/StudentDocumentUpload";
import { getExamSetups, getStudentExamSetupResult, type ExamSetupBasicDto, type StudentExamResultSummaryDto } from "@/services/api/examSetupApi";

export default function StudentProfile() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { academicYear: contextYear } = useAcademicYear();
  const { schoolInfo } = useSchool();
  // Photo upload state
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await studentApi.uploadPhoto(id as string, file);
      setPhotoPreview(result.photoUrl);
      if (student) {
        setStudent({ ...student, photoUrl: result.photoUrl });
      }
      toast({ title: t('studentProfilePage.photoUpdated'), description: t('studentProfilePage.photoSavedSuccess') });
    } catch (err) {
      console.error(err);
      toast({ title: t('studentProfilePage.uploadFailed'), description: t('studentProfilePage.couldNotSavePhoto'), variant: "destructive" });
    }
  };
  // Awards & Achievements dialog state
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [awardTitle, setAwardTitle] = useState("");
  const [awardDesc, setAwardDesc] = useState("");
  const [awardDate, setAwardDate] = useState("");
  const [awards, setAwards] = useState<Array<{ title: string; desc: string; date: string }>>([]);

  const handlePrintAward = () => {
    const printContent = `Award/Achievement\nTitle: ${awardTitle}\nDescription: ${awardDesc}\nDate: ${awardDate}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre>${printContent}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
    setShowAwardDialog(false);
    setAwardTitle("");
    setAwardDesc("");
    setAwardDate("");
  };

  const handleSaveAward = () => {
    setAwards(prev => [...prev, { title: awardTitle, desc: awardDesc, date: awardDate }]);
    setShowAwardDialog(false);
    setAwardTitle("");
    setAwardDesc("");
    setAwardDate("");
  };
  const [showIdCardDialog, setShowIdCardDialog] = useState(false);
  // State for manual add dialog
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualType, setManualType] = useState("SMS");
  const [manualMessage, setManualMessage] = useState("");
  const [manualStatus, setManualStatus] = useState("Sent");
  // State for parent communication dialog
  const [showCommDialog, setShowCommDialog] = useState(false);
  const [commType, setCommType] = useState("SMS");
  const [commMessage, setCommMessage] = useState("");
  const [communications, setCommunications] = useState<Array<{ date: string; type: string; message: string; status: string }>>([]);
  // Marks tab filter state
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [siblings, setSiblings] = useState<StudentBasic[]>([]);
  const [showSiblingsExpanded, setShowSiblingsExpanded] = useState(false);
  const [guardianStaff, setGuardianStaff] = useState<GuardianStaffDto | null>(null);
  const [libraryIssues, setLibraryIssues] = useState<BookIssue[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryStatusFilter, setLibraryStatusFilter] = useState('all');
  const [staffDiscountType, setStaffDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [staffDiscountValue, setStaffDiscountValue] = useState('');
  const [staffDiscountLoading, setStaffDiscountLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentBasic[]>([]);
  const [profileSummary, setProfileSummary] = useState<StudentProfileSummary | null>(null);
  const [studentGrades, setStudentGrades] = useState<StudentGradeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAllDetailsExpanded, setShowAllDetailsExpanded] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitType, setExitType] = useState<'dropout' | 'passout'>('dropout');
  const [showDetainDialog, setShowDetainDialog] = useState(false);
  const [promoteData, setPromoteData] = useState({
    newClass: student?.class || '',
    newSection: student?.section || '',
    resetRollNumber: false,
    remarks: ''
  });
  const { toast } = useToast();
  const { t } = useLanguage();

  // Published exam setup results (new exam workflow)
  const [publishedExamResults, setPublishedExamResults] = useState<Array<{ setup: ExamSetupBasicDto; result: StudentExamResultSummaryDto }>>([]);
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [downloadingExamId, setDownloadingExamId] = useState<string | null>(null);

  const loadPublishedExamResults = async (studentId: string) => {
    setExamResultsLoading(true);
    try {
      // Admin view: fetch ALL exam setups regardless of status, then try to get results for each
      const page = await getExamSetups({ pageSize: 100, page: 1 });
      const setups: ExamSetupBasicDto[] = page.items ?? [];

      const entries: Array<{ setup: ExamSetupBasicDto; result: StudentExamResultSummaryDto }> = [];
      await Promise.allSettled(setups.map(async (setup) => {
        try {
          const result = await getStudentExamSetupResult(setup.id, studentId);
          if (result) entries.push({ setup, result });
        } catch { /* student might not be in every exam */ }
      }));
      entries.sort((a, b) => new Date(b.setup.createdAt ?? 0).getTime() - new Date(a.setup.createdAt ?? 0).getTime());
      setPublishedExamResults(entries);
    } catch (e) {
      console.error('Failed to load exam results', e);
    } finally {
      setExamResultsLoading(false);
    }
  };

  const handleDownloadExamReportCard = async (setup: ExamSetupBasicDto, result: StudentExamResultSummaryDto) => {
    if (!schoolInfo) { toast({ title: "Error", description: "School info not loaded", variant: "destructive" }); return; }
    setDownloadingExamId(setup.id);
    try {
      const schoolData: SchoolInfo = {
        name: schoolInfo.name,
        address: schoolInfo.address ?? '',
        phone: schoolInfo.phone ?? '',
        email: schoolInfo.email ?? '',
        principalName: schoolInfo.principalName ?? undefined,
      };
      const reportCardData = {
        studentName: result.studentName,
        studentId: result.studentId,
        class: setup.className,
        section: setup.sectionName ?? '',
        academicYear: setup.academicYear,
        examName: setup.name,
        rollNo: result.rollNumber ?? '',
        subjects: (result.subjects ?? []).map(s => ({
          name: s.subjectName,
          marks: Number(s.obtainedMarks),
          maxMarks: Number(s.maxMarks),
          grade: s.grade ?? '',
        })),
        totalMarks: Number(result.totalObtained),
        totalMaxMarks: Number(result.totalMax),
        percentage: Number(result.percentage),
        overallGrade: result.overallGrade ?? '',
        rank: result.rank,
        remarks: result.isPass ? 'Pass' : 'Fail',
      };
      const doc = generateProfessionalReportCard(schoolData, reportCardData);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `ReportCard_${result.studentName.replace(/\s+/g, '_')}_${setup.name.replace(/\s+/g, '_')}.pdf`;
      setPdfUrl(blobUrl);
      setPdfFileName(fileName);
      setPdfPreviewOpen(true);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate report card", variant: "destructive" });
    } finally {
      setDownloadingExamId(null);
    }
  };

  useEffect(() => {
    if (id) {
      setStudent(null);
      setLoading(true);
      fetchStudent();
      fetchAllStudents();
    }
  }, [id]);

  const fetchStudent = async () => {
    if (!id) return;
    try {
      const data = await studentApi.getById(id);
      setStudent(data);
      // Load siblings from dedicated endpoint
      try {
        const sibs = await studentApi.getSiblings(id);
        setSiblings(Array.isArray(sibs) ? sibs : []);
      } catch {
        // Siblings not available
        setSiblings([]);
      }
      // Load guardian staff link
      try {
        const gs = await studentApi.getGuardianStaff(id);
        setGuardianStaff(gs);
      } catch {
        setGuardianStaff(null);
      }
      // Load cross-module summary in parallel
      try {
        const summary = await studentApi.profileSummary(id);
        setProfileSummary(summary);
      } catch {
        // Summary is supplementary — don't fail if unavailable
      }
      // Load teacher-entered grades from the grades module
      try {
        const gradesResult = await gradesApi.getStudentGrades(undefined, id);
        setStudentGrades(gradesResult.studentGrades ?? []);
      } catch {
        // Grades are supplementary
      }
      // Load published exam setup results
      loadPublishedExamResults(id);
    } catch (error) {
      console.error("Failed to fetch student:", error);
      toast({
        title: t('studentProfilePage.errorTitle'),
        description: t('studentProfilePage.failedToLoad'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await studentApi.list({});
      setAllStudents(res.students ?? []);
    } catch {
      // ignore
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!student) return;
    setActionLoading(true);
    try {
      await studentApi.update(student.id, { status: newStatus });
      setStudent({ ...student, status: newStatus });
      toast({
        title: t('studentProfilePage.successTitle'),
        description: newStatus === 'active' ? t('studentProfilePage.reactivatedSuccess') : t('studentProfilePage.deactivatedSuccess'),
      });
    } catch (error) {
      toast({
        title: t('studentProfilePage.errorTitle'),
        description: t('studentProfilePage.failedToUpdate'),
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteStudent = async () => {
    if (!student || !promoteData.newClass) return;
    setActionLoading(true);
    try {
      // Call API to promote student
      await studentApi.update(student.id, {
        class: promoteData.newClass,
        section: promoteData.newSection || student.section,
        rollNumber: promoteData.resetRollNumber ? '' : student.rollNumber,
      });
      setStudent({ ...student, class: promoteData.newClass, section: promoteData.newSection || student.section });
      setShowPromoteDialog(false);
      toast({
        title: 'Success',
        description: `${student.name} has been promoted to ${promoteData.newClass} ${promoteData.newSection}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to promote student',
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchLibraryIssues = async (studentId: string) => {
    setLibraryLoading(true);
    try {
      const res = await getIssues({ studentId, pageSize: 50 });
      setLibraryIssues(res.issues ?? []);
    } catch {
      setLibraryIssues([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleApplyStaffDiscount = async () => {
    if (!student || !staffDiscountValue) return;
    const val = parseFloat(staffDiscountValue);
    if (isNaN(val) || val <= 0) {
      toast({ title: 'Invalid value', description: 'Enter a valid positive discount amount.', variant: 'destructive' });
      return;
    }
    setStaffDiscountLoading(true);
    try {
      const res = await applyStaffDiscount({
        studentId: student.id,
        discountType: staffDiscountType,
        discountValue: val,
        reason: 'Staff child discount applied from student profile',
      });
      toast({
        title: 'Discount applied',
        description: `${res.message} — ₹${res.totalSaved.toLocaleString()} saved across ${res.applied} record(s).`,
      });
      setStaffDiscountValue('');
      // Refresh fee summary
      if (id) {
        try {
          const summary = await studentApi.profileSummary(id);
          setProfileSummary(summary);
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to apply staff discount.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setStaffDiscountLoading(false);
    }
  };

  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [certificateType, setCertificateType] = useState<string>("");
  const [showReportCardDialog, setShowReportCardDialog] = useState(false);
  
  // PDF Preview Modal state for report card
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");

  const handleDocumentGeneration = (type: string) => {
    if (type === "ID Card") {
      setShowIdCardDialog(true);
      return;
    }
    
    if (["Bonafide Certificate", "Conduct Certificate", "Character Certificate", "Transfer Certificate"].includes(type)) {
      setCertificateType(type);
      setShowCertificateDialog(true);
      return;
    }
    
    // For other types like Report Card — PDF generation not yet supported
    toast({
      title: `${type}`,
      description: `${type} generation is not yet available. Please use the Reports module.`,
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('studentProfilePage.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-red-500 mb-4">{t('studentProfilePage.studentNotFound')}</div>
        <Button onClick={() => navigate("/students")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('studentProfilePage.backToStudents')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate("/students")} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('studentProfilePage.back')}
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{t('studentProfilePage.title')}</h1>
            <p className="text-muted-foreground">{t('studentProfilePage.completeInfo')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Edit Profile — always visible */}
          <Button
            onClick={() => navigate(`/students/${student.id}/edit`)}
            variant="default"
            size="sm"
            className="whitespace-nowrap"
          >
            <Edit className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{t('studentProfilePage.editProfile')}</span>
          </Button>

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {student.status === 'active' && (
                <>
                  <DropdownMenuItem
                    onSelect={() => {
                      setPromoteData({
                        newClass: '',
                        newSection: student.section || '',
                        resetRollNumber: false,
                        remarks: ''
                      });
                      setShowPromoteDialog(true);
                    }}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Promote
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-orange-600 focus:text-orange-600"
                    onSelect={() => { setExitType('dropout'); setShowExitDialog(true); }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Drop Out (Transfer)
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-amber-600 focus:text-amber-600"
                    onSelect={() => setShowDetainDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Detain in Same Class
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="text-blue-600 focus:text-blue-600"
                    onSelect={() => { setExitType('passout'); setShowExitDialog(true); }}
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Passed Out
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={actionLoading}
                    onSelect={() => handleStatusChange('inactive')}
                  >
                    {t('studentProfilePage.deactivate')}
                  </DropdownMenuItem>
                </>
              )}

              {student.status !== 'active' && (
                <DropdownMenuItem
                  disabled={actionLoading}
                  onSelect={() => handleStatusChange('active')}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('studentProfilePage.reactivate')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inactive student banner */}
      {student.status !== 'active' && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="font-medium">This student is currently <span className="font-bold capitalize">{student.status}</span>. They are hidden from all class lists and their parent portal access is revoked.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-orange-400 text-orange-700 hover:bg-orange-100"
            disabled={actionLoading}
            onClick={() => handleStatusChange('active')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reactivate Student
          </Button>
        </div>
      )}

      {/* Student Basic Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border border-gray-300 mb-2 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student" className="w-full h-full object-cover" />
                ) : student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                )}
              </div>
              {/* Always visible upload button below photo circle */}
              <label htmlFor="student-photo-upload" className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer font-semibold text-base block border-2 border-blue-800">
                {t('studentProfilePage.uploadPhoto')}
                <input
                  id="student-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              <Badge variant={student.status === 'active' ? 'default' : 'secondary'} className="mt-2 mb-2">
                {student.status === 'active' ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    {t('studentProfilePage.personalDetails')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-lg">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{t('studentProfilePage.rollNo')}: {student.rollNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('studentProfilePage.dateOfBirth')}</div>
                      <div className="text-sm">{student.dateOfBirth?.split('T')[0]}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('studentProfilePage.category')}</div>
                      <div className="text-sm">{student.category}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <GraduationCap className="h-4 w-4" />
                    {t('studentProfilePage.academicDetails')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">{t('studentProfilePage.classSection')}</div>
                      <div className="text-sm">{student.class}-{student.section}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('studentProfilePage.admissionDate')}</div>
                      <div className="text-sm">{student.admissionDate?.split('T')[0]}</div>
                    </div>
                    {student.previousSchool && (
                      <div>
                        <div className="text-sm font-medium">{t('studentProfilePage.previousSchool')}</div>
                        <div className="text-sm">{student.previousSchool}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    {t('studentProfilePage.guardianDetails')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">{t('studentProfilePage.guardianName')}</div>
                      <div className="text-sm">{student.guardianName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <div className="text-sm">{student.guardianPhone}</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                      <div className="text-sm">{student.address}</div>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View All Details Expandable Section - Only Additional Fields */}
      <Card className="mb-6">
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowAllDetailsExpanded(!showAllDetailsExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <svg className={`h-5 w-5 flex-shrink-0 transition-transform ${showAllDetailsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="truncate">Additional Information</span>
            </CardTitle>
            <Badge variant="secondary" className="flex-shrink-0 text-xs">
              {showAllDetailsExpanded ? 'Hide' : 'Show'}
            </Badge>
          </div>
        </CardHeader>
        {showAllDetailsExpanded && (
          <CardContent className="p-6 border-t space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Medical Details - Only if has medical info */}
              {(student.bloodGroup || student.allergies || student.chronicConditions || student.medications || student.doctorName) && (
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-100">
                  <h3 className="font-semibold flex items-center gap-2 text-red-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Medical
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.bloodGroup && <div><span className="font-medium">Blood Group:</span> <span className="text-red-600 font-semibold">{student.bloodGroup}</span></div>}
                    {student.allergies && <div><span className="font-medium">Allergies:</span> {student.allergies}</div>}
                    {student.chronicConditions && <div><span className="font-medium">Conditions:</span> {student.chronicConditions}</div>}
                    {student.medications && <div><span className="font-medium">Medications:</span> {student.medications}</div>}
                    {student.doctorName && <div><span className="font-medium">Doctor:</span> {student.doctorName}{student.doctorPhone ? ` (${student.doctorPhone})` : ''}</div>}
                  </div>
                </div>
              )}

              {/* Identification Details - Only if has ID info */}
              {(student.aadharNumber || student.panNumber || student.passportNumber || student.visaType) && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h5m4 0h5a2 2 0 002-2V8a2 2 0 00-2-2h-5m4 0V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v1" /></svg>
                    Identification
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.aadharNumber && <div><span className="font-medium">Aadhar:</span> ****{student.aadharNumber.slice(-4)}</div>}
                    {student.panNumber && <div><span className="font-medium">PAN:</span> {student.panNumber}</div>}
                    {student.passportNumber && <div><span className="font-medium">Passport:</span> {student.passportNumber}</div>}
                    {student.visaType && <div><span className="font-medium">Visa:</span> {student.visaType}{student.visaExpiry ? ` (Exp: ${student.visaExpiry})` : ''}</div>}
                  </div>
                </div>
              )}

              {/* Extended Contact - Only if has secondary phone, email, or permanent address */}
              {(student.secondaryPhone || student.email || student.permanentAddress || student.primaryPhone) && (
                <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                  <h3 className="font-semibold flex items-center gap-2 text-green-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Extended Contact
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.primaryPhone && <div><span className="font-medium">Mobile:</span> {student.primaryPhone}</div>}
                    {student.secondaryPhone && <div><span className="font-medium">Alternate:</span> {student.secondaryPhone}</div>}
                    {student.email && <div><span className="font-medium">Email:</span> <a href={`mailto:${student.email}`} className="text-blue-600 hover:underline truncate">{student.email}</a></div>}
                    {student.permanentAddress && <div><span className="font-medium">Permanent:</span> {student.permanentAddress}</div>}
                  </div>
                </div>
              )}

              {/* Personal Details - Only if has additional info */}
              {(student.placeOfBirth || student.nationality || student.languageProficiency || student.specialNeeds) && (
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h3 className="font-semibold flex items-center gap-2 text-purple-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" /></svg>
                    Personal Details
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.placeOfBirth && <div><span className="font-medium">Place of Birth:</span> {student.placeOfBirth}</div>}
                    {student.nationality && <div><span className="font-medium">Nationality:</span> {student.nationality}</div>}
                    {student.languageProficiency && <div><span className="font-medium">Languages:</span> {student.languageProficiency}</div>}
                    {student.specialNeeds && <div><span className="font-medium">Special Needs:</span> <span className="text-orange-600">{student.specialNeeds}</span></div>}
                  </div>
                </div>
              )}

              {/* Facilities & Consents - Only if any are true */}
              {(student.transportRequired || student.hostelRequired || student.photoConsent || student.mediaConsent || student.medicalConsent) && (
                <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h3 className="font-semibold flex items-center gap-2 text-orange-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Facilities
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.transportRequired && <div className="flex items-center gap-2"><span className="text-orange-600">✓</span> <span>Transport Arranged</span></div>}
                    {student.hostelRequired && <div className="flex items-center gap-2"><span className="text-orange-600">✓</span> <span>Hostel Required</span></div>}
                    {(student.photoConsent || student.mediaConsent || student.medicalConsent) && (
                      <div className="pt-1 border-t border-orange-200">
                        <div className="font-medium text-orange-700 mb-1 text-xs">Consents:</div>
                        {student.photoConsent && <div className="text-xs flex items-center gap-2"><span className="text-green-600">✓</span> <span>Photo</span></div>}
                        {student.mediaConsent && <div className="text-xs flex items-center gap-2"><span className="text-green-600">✓</span> <span>Media</span></div>}
                        {student.medicalConsent && <div className="text-xs flex items-center gap-2"><span className="text-green-600">✓</span> <span>Medical</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Emergency Contact - Only if provided */}
              {(student.emergencyContact || student.emergencyPhone) && (
                <div className="space-y-3 p-4 bg-pink-50 rounded-lg border border-pink-100">
                  <h3 className="font-semibold flex items-center gap-2 text-pink-700">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Emergency
                  </h3>
                  <div className="text-sm space-y-2">
                    {student.emergencyContact && <div><span className="font-medium">Contact:</span> {student.emergencyContact}</div>}
                    {student.emergencyPhone && <div><span className="font-medium">Phone:</span> <span className="text-pink-600 font-semibold">{student.emergencyPhone}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Show message if no additional details */}
            {!((student.bloodGroup || student.allergies || student.chronicConditions || student.medications || student.doctorName) ||
                (student.aadharNumber || student.panNumber || student.passportNumber || student.visaType) ||
                (student.secondaryPhone || student.email || student.permanentAddress || student.primaryPhone) ||
                (student.placeOfBirth || student.nationality || student.languageProficiency || student.specialNeeds) ||
                (student.transportRequired || student.hostelRequired || student.photoConsent || student.mediaConsent || student.medicalConsent) ||
                (student.emergencyContact || student.emergencyPhone)) && (
              <div className="text-center py-8 text-muted-foreground">
                <svg className="h-8 w-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                <p>No additional information provided</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Siblings in School — dropdown, only shown when siblings exist */}
      {siblings.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowSiblingsExpanded(!showSiblingsExpanded)}
          >
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 flex-shrink-0 text-pink-600" />
                <span className="truncate">Siblings in School</span>
                <Badge variant="secondary" className="ml-1">{siblings.length}</Badge>
              </CardTitle>
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {showSiblingsExpanded ? 'Hide' : 'Show'}
              </Badge>
            </div>
          </CardHeader>
          {showSiblingsExpanded && (
            <CardContent className="border-t pt-4">
              <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-pink-50 border border-pink-200">
                <Users className="h-4 w-4 text-pink-600 shrink-0" />
                <p className="text-sm text-pink-800">
                  <span className="font-semibold">{siblings.length} sibling{siblings.length > 1 ? 's' : ''}</span> studying in this school. Same parent/guardian is responsible for fees.
                </p>
              </div>
              <div className="grid gap-3">
                {siblings.map(sib => (
                  <div key={sib.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-sm flex-shrink-0">
                        {sib.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{sib.name}</p>
                        <p className="text-xs text-muted-foreground">{sib.admissionNumber} • Class {sib.class}-{sib.section} • Roll: {sib.rollNumber || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sib.status === 'active' ? 'default' : 'secondary'} className="text-xs">{sib.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${sib.id}`)}>View →</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Guardian Staff Link — shown only when linked */}
      {guardianStaff && (
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold flex-shrink-0">
              {guardianStaff.name?.charAt(0) || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Parent / Guardian — Staff Member</span>
              </div>
              <p className="font-semibold truncate">{guardianStaff.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {guardianStaff.designation}{guardianStaff.department ? ` · ${guardianStaff.department}` : ''}
                {guardianStaff.phone ? ` · ${guardianStaff.phone}` : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/staff/${guardianStaff.id}`)}>
              Staff Profile →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
          <TabsList className="inline-flex h-10 items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground w-max">
            <TabsTrigger value="attendance" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">{t('studentProfilePage.attendance')}</TabsTrigger>
            <TabsTrigger value="academic" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">Academic</TabsTrigger>
            <TabsTrigger value="library" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium" onClick={() => { if (id && libraryIssues.length === 0) fetchLibraryIssues(id); }}>Library</TabsTrigger>
            <TabsTrigger value="fee" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">{t('studentProfilePage.fee')}</TabsTrigger>
            <TabsTrigger value="transport" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium" onClick={() => { if (id) studentApi.profileSummary(id).then(setProfileSummary).catch(() => {}); }}>Transport</TabsTrigger>
            <TabsTrigger value="hostel" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium" onClick={() => { if (id) studentApi.profileSummary(id).then(setProfileSummary).catch(() => {}); }}>Hostel</TabsTrigger>
            <TabsTrigger value="health" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">Health</TabsTrigger>
            <TabsTrigger value="visitors" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">Visitors</TabsTrigger>
            <TabsTrigger value="communication" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">{t('studentProfilePage.communication')}</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">Documents</TabsTrigger>
            {isAdmin && <TabsTrigger value="portal" className="whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium">Portal</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="fee">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Fee Information & Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileSummary?.fee && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold">₹{profileSummary.fee.totalAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Fees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">₹{profileSummary.fee.paidAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Paid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-500">₹{profileSummary.fee.pendingAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={profileSummary.fee.status === 'paid' ? 'default' : profileSummary.fee.status === 'overdue' ? 'destructive' : 'secondary'}>
                      {profileSummary.fee.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">{profileSummary.fee.academicYear}</div>
                  </div>
                </div>
              )}
              <ParentFeePayment studentId={student?.id || ""} />

              {/* Staff Child Discount Panel — only for Admin/Principal when guardian is a staff member */}
              {guardianStaff && isAdmin && (
                <div className="mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Staff Child Discount
                  </h3>
                  <p className="text-xs text-blue-700 mb-3">
                    Parent <strong>{guardianStaff.name}</strong> is a staff member. Apply a staff-child concession to all pending fee records (max 75% total stacking).
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Type</label>
                      <select
                        className="border rounded px-2 py-1.5 text-sm"
                        value={staffDiscountType}
                        onChange={e => setStaffDiscountType(e.target.value as 'percentage' | 'flat')}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Value {staffDiscountType === 'percentage' ? '(%)' : '(₹)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={staffDiscountType === 'percentage' ? 100 : undefined}
                        className="border rounded px-2 py-1.5 text-sm w-32"
                        placeholder={staffDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                        value={staffDiscountValue}
                        onChange={e => setStaffDiscountValue(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleApplyStaffDiscount}
                      disabled={staffDiscountLoading || !staffDiscountValue}
                    >
                      {staffDiscountLoading ? 'Applying…' : 'Apply Discount'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transport">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm9 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM3 8l1.5-5h15L21 8M3 8h18M3 8v9h18V8" /></svg>
                Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileSummary?.transport ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <h3 className="font-semibold text-blue-700">Route Details</h3>
                    <div><span className="font-medium">Route:</span> {profileSummary.transport.routeName} ({profileSummary.transport.routeNumber})</div>
                    <div><span className="font-medium">Pickup:</span> {profileSummary.transport.pickupPoint ?? '—'}</div>
                    <div><span className="font-medium">Drop:</span> {profileSummary.transport.dropPoint ?? '—'}</div>
                    <div><span className="font-medium">Monthly Fee:</span> ₹{profileSummary.transport.monthlyFee.toLocaleString()}</div>
                    <div><span className="font-medium">Status:</span> <Badge variant={profileSummary.transport.status === 'active' ? 'default' : 'secondary'}>{profileSummary.transport.status}</Badge></div>
                  </div>
                  {(profileSummary.transport.vehicleNumber || profileSummary.transport.driverName) && (
                    <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
                      <h3 className="font-semibold">Vehicle & Driver</h3>
                      {profileSummary.transport.vehicleNumber && <div><span className="font-medium">Vehicle:</span> {profileSummary.transport.vehicleNumber}</div>}
                      {profileSummary.transport.driverName && <div><span className="font-medium">Driver:</span> {profileSummary.transport.driverName}</div>}
                      {profileSummary.transport.driverPhone && <div><span className="font-medium">Driver Phone:</span> {profileSummary.transport.driverPhone}</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <svg className="h-12 w-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zm9 0a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM3 8l1.5-5h15L21 8M3 8h18M3 8v9h18V8" /></svg>
                  <p>No transport assignment for this student</p>
                  <p className="text-sm mt-1">Assign transport from the Transport module</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hostel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Hostel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileSummary?.hostel ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                    <h3 className="font-semibold text-purple-700">Room Details</h3>
                    <div><span className="font-medium">Room Number:</span> {profileSummary.hostel.roomNumber}</div>
                    <div><span className="font-medium">Room Type:</span> {profileSummary.hostel.roomType ?? '—'}</div>
                    <div><span className="font-medium">Floor:</span> {profileSummary.hostel.floor ?? '—'}</div>
                    <div><span className="font-medium">Monthly Fee:</span> ₹{profileSummary.hostel.monthlyFee.toLocaleString()}</div>
                    <div><span className="font-medium">Status:</span> <Badge variant={profileSummary.hostel.status === 'active' ? 'default' : 'secondary'}>{profileSummary.hostel.status}</Badge></div>
                  </div>
                  <div className="space-y-3 p-4 bg-gray-50 border rounded-lg">
                    <h3 className="font-semibold">Stay Duration</h3>
                    <div><span className="font-medium">Check-in:</span> {profileSummary.hostel.checkInDate.split('T')[0]}</div>
                    {profileSummary.hostel.checkOutDate && (
                      <div><span className="font-medium">Check-out:</span> {profileSummary.hostel.checkOutDate.split('T')[0]}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <svg className="h-12 w-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <p>No hostel assignment for this student</p>
                  <p className="text-sm mt-1">Assign hostel from the Hostel module</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Health Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileSummary?.healthRecords && profileSummary.healthRecords.length > 0 ? (
                <div className="space-y-4">
                  {profileSummary.healthRecords.map((record, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="font-semibold">{record.checkupDate.split('T')[0]}</div>
                        {record.checkedBy && <div className="text-sm text-muted-foreground">By: {record.checkedBy}</div>}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {record.bloodGroup && <div><span className="font-medium">Blood Group:</span> <span className="text-red-600 font-semibold">{record.bloodGroup}</span></div>}
                        {record.height && <div><span className="font-medium">Height:</span> {record.height} cm</div>}
                        {record.weight && <div><span className="font-medium">Weight:</span> {record.weight} kg</div>}
                        {record.bmi && <div><span className="font-medium">BMI:</span> {record.bmi}</div>}
                        {record.visionLeft && <div><span className="font-medium">Vision L:</span> {record.visionLeft}</div>}
                        {record.visionRight && <div><span className="font-medium">Vision R:</span> {record.visionRight}</div>}
                      </div>
                      {(record.allergies || record.chronicConditions || record.medications) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm pt-2 border-t">
                          {record.allergies && <div><span className="font-medium text-orange-600">Allergies:</span> {record.allergies}</div>}
                          {record.chronicConditions && <div><span className="font-medium">Conditions:</span> {record.chronicConditions}</div>}
                          {record.medications && <div><span className="font-medium">Medications:</span> {record.medications}</div>}
                        </div>
                      )}
                      {record.vaccinations && <div className="text-sm"><span className="font-medium">Vaccinations:</span> {record.vaccinations}</div>}
                      {record.notes && <div className="text-sm text-muted-foreground italic">{record.notes}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <svg className="h-12 w-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <p>No health records for this student</p>
                  <p className="text-sm mt-1">Add health checkup records from the Health module</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Visitor History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileSummary?.visitorHistory && profileSummary.visitorHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>Check-Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profileSummary.visitorHistory.map((visit, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{visit.visitorName}</TableCell>
                          <TableCell>{visit.visitorPhone ?? '—'}</TableCell>
                          <TableCell>{visit.purpose}</TableCell>
                          <TableCell>{new Date(visit.checkInTime).toLocaleString()}</TableCell>
                          <TableCell>{visit.checkOutTime ? new Date(visit.checkOutTime).toLocaleString() : '—'}</TableCell>
                          <TableCell>
                            <Badge variant={visit.status === 'CheckedOut' ? 'default' : visit.status === 'Overstayed' ? 'destructive' : 'secondary'}>
                              {visit.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No visitor records for this student</p>
                  <p className="text-sm mt-1">When visitors check in for this student, records will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="space-y-6">
            {/* Attendance Records */}
            <StudentAttendanceView studentId={student?.id || ""} />
            {/* Student Leave Requests — visible to admin/staff for approval */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Leave Requests
              </h3>
              <StudentLeaveRequests studentId={student?.id} compact />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Library Books
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={libraryStatusFilter}
                    onChange={e => setLibraryStatusFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="issued">Issued</option>
                    <option value="overdue">Overdue</option>
                    <option value="returned">Returned</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => id && fetchLibraryIssues(id)} disabled={libraryLoading}>
                    {libraryLoading ? 'Loading…' : 'Refresh'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {libraryLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading library records…</div>
              ) : (() => {
                const filtered = libraryIssues.filter(i => libraryStatusFilter === 'all' || i.status === libraryStatusFilter);
                const totalFine = libraryIssues.reduce((s, i) => s + (i.fine ?? 0), 0);
                const unpaidFine = libraryIssues.filter(i => !i.finePaid).reduce((s, i) => s + (i.fine ?? 0), 0);
                const currentIssued = libraryIssues.filter(i => i.status === 'issued' || i.status === 'overdue').length;
                return (
                  <>
                    {/* Summary bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold">{libraryIssues.length}</div>
                        <div className="text-xs text-muted-foreground">Total Issued</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-amber-600">{currentIssued}</div>
                        <div className="text-xs text-muted-foreground">Currently with Student</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">₹{totalFine.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total Fine</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-bold ${unpaidFine > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{unpaidFine.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Unpaid Fine</div>
                      </div>
                    </div>

                    {filtered.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <svg className="h-12 w-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        <p>No library records found</p>
                        <p className="text-sm mt-1">Books issued to this student will appear here</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Book</TableHead>
                              <TableHead>ISBN</TableHead>
                              <TableHead>Issue Date</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Return Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Fine</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map(issue => (
                              <TableRow key={issue.id}>
                                <TableCell className="font-medium">{issue.bookTitle}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{issue.bookIsbn ?? '—'}</TableCell>
                                <TableCell className="text-sm">{issue.issueDate.split('T')[0]}</TableCell>
                                <TableCell className="text-sm">{issue.dueDate.split('T')[0]}</TableCell>
                                <TableCell className="text-sm">{issue.returnDate ? issue.returnDate.split('T')[0] : '—'}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    issue.status === 'returned' ? 'default' :
                                    issue.status === 'overdue' ? 'destructive' : 'secondary'
                                  }>
                                    {issue.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {issue.fine > 0 ? (
                                    <div className="flex flex-col items-end">
                                      <span className="font-semibold text-red-600">₹{issue.fine}</span>
                                      <span className={`text-xs ${issue.finePaid ? 'text-green-600' : 'text-red-500'}`}>
                                        {issue.finePaid ? 'Paid' : 'Unpaid'}
                                      </span>
                                    </div>
                                  ) : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

  <TabsContent value="academic">
          <div className="space-y-6">
          {/* ── Summary Stats ── */}
          {!examResultsLoading && publishedExamResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">{publishedExamResults.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Exams Taken</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {(publishedExamResults.reduce((s, e) => s + e.result.percentage, 0) / publishedExamResults.length).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Average Score</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {publishedExamResults.filter(e => e.result.isPass).length}/{publishedExamResults.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Passed</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {publishedExamResults.reduce((best, e) => e.result.percentage > best ? e.result.percentage : best, 0).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Best Score</p>
              </div>
            </div>
          )}

          {/* ── Unified Academic Card ── */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" />
                Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y">

              {/* ── Section 1: Exam Results (new workflow) ── */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Exam Results &amp; Report Cards
                  </h3>
                </div>
                {examResultsLoading ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}</div>
                ) : publishedExamResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No exam results found for this student.</p>
                ) : (
                  <div className="space-y-2">
                    {publishedExamResults.map(({ setup, result }) => (
                      <div key={setup.id} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20"
                          onClick={() => setExpandedExamId(expandedExamId === setup.id ? null : setup.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              result.percentage >= 75 ? 'bg-green-100 text-green-700' :
                              result.percentage >= 50 ? 'bg-blue-100 text-blue-700' :
                              result.percentage >= 33 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {result.overallGrade ?? (result.isPass ? '✓' : '✗')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{setup.name}</p>
                              <p className="text-xs text-muted-foreground">{setup.academicYear} · {setup.className}{setup.sectionName ? ` ${setup.sectionName}` : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className={`font-bold text-sm ${result.isPass ? 'text-green-600' : 'text-red-600'}`}>{Number(result.percentage).toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">{Number(result.totalObtained)}/{Number(result.totalMax)}</p>
                            </div>
                            <Badge variant={result.isPass ? "default" : "destructive"} className="text-xs hidden sm:flex">{result.isPass ? 'Pass' : 'Fail'}</Badge>
                            <Button
                              size="sm" variant="outline" className="gap-1 text-xs h-7 shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleDownloadExamReportCard(setup, result); }}
                              disabled={downloadingExamId === setup.id}
                            >
                              {downloadingExamId === setup.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                              <span className="hidden sm:inline">Report Card</span>
                            </Button>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedExamId === setup.id ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                        {expandedExamId === setup.id && (
                          <div className="px-4 py-3 border-t bg-muted/10 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Subject</TableHead>
                                  <TableHead className="text-xs text-right">Marks</TableHead>
                                  <TableHead className="text-xs text-right">%</TableHead>
                                  <TableHead className="text-xs text-center">Grade</TableHead>
                                  <TableHead className="text-xs text-center">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(result.subjects ?? []).map((s, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-sm py-1.5 font-medium">
                                      {s.subjectName}
                                      {s.isElective && <Badge variant="outline" className="ml-2 text-xs">Elective</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right text-sm py-1.5">
                                      {s.isAbsent ? <span className="text-red-500">Absent</span> : `${Number(s.obtainedMarks)}/${Number(s.maxMarks)}`}
                                    </TableCell>
                                    <TableCell className="text-right text-sm py-1.5">{s.isAbsent ? '—' : `${Number(s.percentage).toFixed(1)}%`}</TableCell>
                                    <TableCell className="text-center py-1.5">{s.grade ? <Badge variant="outline" className="text-xs">{s.grade}</Badge> : '—'}</TableCell>
                                    <TableCell className="text-center py-1.5">
                                      <Badge variant={s.isPass ? "default" : "destructive"} className="text-xs">{s.isAbsent ? 'Absent' : s.isPass ? 'Pass' : 'Fail'}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Section 2: Assessment History (legacy) — only shown when data exists ── */}
              {(profileSummary?.exams?.results ?? []).length > 0 && (
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-blue-500" />
                      Assessment History
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select className="border rounded px-2 py-1 text-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                        <option value="">All years</option>
                        {Array.from(new Set((profileSummary?.exams?.results ?? []).map(r => r.examDate?.substring(0, 4)).filter(Boolean))).sort().reverse().map(year => (
                          <option key={year} value={year as string}>{year}</option>
                        ))}
                      </select>
                      <select className="border rounded px-2 py-1 text-sm" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                        <option value="">All exams</option>
                        {Array.from(new Set((profileSummary?.exams?.results ?? []).map(r => r.examName))).map(exam => (
                          <option key={exam} value={exam}>{exam}</option>
                        ))}
                      </select>
                      <Button variant="outline" size="sm" className="gap-1.5 h-8"
                        onClick={() => {
                          if (!student) return;
                          const results = profileSummary?.exams?.results ?? [];
                          const marksData = selectedExam ? results.filter(r => r.examName === selectedExam) : results;
                          if (marksData.length === 0) { toast({ title: "No Data", description: "No marks available.", variant: "destructive" }); return; }
                          const schoolData: SchoolInfo = { name: schoolInfo?.name ?? "School", address: schoolInfo?.address ?? "", phone: schoolInfo?.phone ?? "", email: schoolInfo?.email ?? "", principalName: schoolInfo?.principalName ?? undefined };
                          const pdfDoc = generateProfessionalReportCard(schoolData, { reportCardNumber: `RC${Date.now().toString().slice(-6)}`, studentId: student.id, studentName: student.name, class: student.class, section: student.section, rollNo: student.rollNumber, admissionNo: student.admissionNumber, examName: selectedExam || "All Exams", term: selectedExam || "All", academicYear: selectedYear || new Date().getFullYear().toString(), subjects: marksData.map(r => ({ name: r.subject, marks: r.marksObtained, maxMarks: r.totalMarks, grade: r.grade ?? '' })), totalMaxMarks: marksData.reduce((sum, r) => sum + r.totalMarks, 0), totalMarks: marksData.reduce((sum, r) => sum + r.totalMarks, 0), marksObtained: marksData.reduce((sum, r) => sum + r.marksObtained, 0), percentage: marksData.length > 0 ? Math.round(marksData.reduce((sum, r) => sum + r.percentage, 0) / marksData.length * 10) / 10 : 0, overallGrade: "A", grade: "A", attendance: profileSummary?.attendance ? `${profileSummary.attendance.attendancePercent}%` : "—", remarks: "Generated from live exam data.", issueDate: new Date().toLocaleDateString() });
                          const blobUrl = URL.createObjectURL(pdfDoc.output('blob'));
                          setPdfUrl(blobUrl); setPdfFileName(`ReportCard_${student.name.replace(/\s+/g, '_')}_${selectedExam || 'All'}.pdf`); setPdfPreviewOpen(true);
                          toast({ title: "Report Card Generated" });
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />Report Card
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exam</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead>
                          <TableHead>Total</TableHead><TableHead>%</TableHead><TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const results = profileSummary?.exams?.results ?? [];
                          const filtered = selectedExam ? results.filter(r => r.examName === selectedExam) : selectedYear ? results.filter(r => r.examDate?.startsWith(selectedYear)) : results;
                          if (filtered.length === 0) return <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No exam results found</TableCell></TableRow>;
                          return filtered.map((result, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{result.examName}</TableCell>
                              <TableCell>{result.subject}</TableCell>
                              <TableCell>{result.isAbsent ? <span className="text-red-500">Absent</span> : result.marksObtained}</TableCell>
                              <TableCell>{result.totalMarks}</TableCell>
                              <TableCell>{result.isAbsent ? '—' : `${result.percentage.toFixed(1)}%`}</TableCell>
                              <TableCell>{result.grade ? <Badge variant="outline">{result.grade}</Badge> : '—'}</TableCell>
                            </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* ── Section 4: Formative Grades — only shown when data exists ── */}
              {studentGrades.length > 0 && (
                <div className="p-5">
                  <h3 className="font-semibold flex items-center gap-2 text-sm mb-4">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Formative Grades
                  </h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assessment</TableHead><TableHead>Marks</TableHead><TableHead>Grade</TableHead>
                          <TableHead>Status</TableHead><TableHead>Remarks</TableHead><TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentGrades.map(g => (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{g.gradeItemName ?? "—"}</TableCell>
                            <TableCell>{g.marksObtained}{g.maxMarks ? <span className="text-muted-foreground text-xs"> / {g.maxMarks}</span> : ""}</TableCell>
                            <TableCell>{g.grade ? <Badge variant="outline">{g.grade}</Badge> : "—"}</TableCell>
                            <TableCell><Badge variant={g.status === "pass" ? "default" : g.status === "fail" ? "destructive" : "secondary"}>{g.status}</Badge></TableCell>
                            <TableCell className="max-w-xs truncate">{g.remarks ?? "—"}</TableCell>
                            <TableCell>{new Date(g.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        {/* ── Communication Tab ── */}
        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Parent Communication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-end mb-4">
                <Button variant="default" onClick={() => setShowCommDialog(true)}>Reach Parent</Button>
              </div>
              {showManualDialog && (
                <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Manual Add Communication</DialogTitle></DialogHeader>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Date</label><input type="date" className="border rounded px-2 py-1 w-full" value={manualDate} onChange={e => setManualDate(e.target.value)} /></div>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Type</label><select className="border rounded px-2 py-1 w-full" value={manualType} onChange={e => setManualType(e.target.value)}><option>SMS</option><option>Email</option><option>Phone</option></select></div>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Message</label><textarea className="border rounded px-2 py-1 w-full" rows={3} value={manualMessage} onChange={e => setManualMessage(e.target.value)} placeholder="Enter your message..." /></div>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Status</label><select className="border rounded px-2 py-1 w-full" value={manualStatus} onChange={e => setManualStatus(e.target.value)}><option>Sent</option><option>Delivered</option><option>Completed</option></select></div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowManualDialog(false)}>Cancel</Button>
                      <Button onClick={() => { setCommunications(prev => [...prev, { date: manualDate || new Date().toISOString().split('T')[0], type: manualType, message: manualMessage, status: manualStatus }]); setManualDate(""); setManualType("SMS"); setManualMessage(""); setManualStatus("Sent"); setShowManualDialog(false); }}>Add</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No communications logged yet.</TableCell></TableRow>
                    ) : communications.map((comm, index) => (
                      <TableRow key={index}>
                        <TableCell>{comm.date}</TableCell><TableCell>{comm.type}</TableCell>
                        <TableCell>{comm.message}</TableCell><TableCell><Badge variant="outline">{comm.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {showCommDialog && (
                <Dialog open={showCommDialog} onOpenChange={setShowCommDialog}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Reach Parent</DialogTitle></DialogHeader>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Type</label><select className="border rounded px-2 py-1 w-full" value={commType} onChange={e => setCommType(e.target.value)}><option>SMS</option><option>Email</option></select></div>
                    <div className="mb-2"><label className="block text-sm font-medium mb-1">Message</label><textarea className="border rounded px-2 py-1 w-full" rows={3} value={commMessage} onChange={e => setCommMessage(e.target.value)} placeholder="Enter your message..." /></div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCommDialog(false)}>Cancel</Button>
                      <Button onClick={() => { setCommunications(prev => [...prev, { date: new Date().toISOString().split('T')[0], type: commType, message: commMessage, status: 'Sent' }]); setCommMessage(""); setCommType("SMS"); setShowCommDialog(false); }}>Send</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="documents">
          {/* Professional ID Card Dialog */}
          {showIdCardDialog && student && (
            <ProfessionalIdCardDialog
              open={showIdCardDialog}
              onOpenChange={setShowIdCardDialog}
              personType="student"
              personData={{
                name: student.name,
                admissionNumber: student.admissionNumber,
                rollNumber: student.rollNumber,
                className: student.class,
                section: student.section,
                dateOfBirth: student.dateOfBirth?.split('T')[0],
                bloodGroup: student.bloodGroup,
                parentName: student.guardianName,
                parentPhone: student.guardianPhone,
                photoUrl: student.photoUrl,
              }}
              schoolInfo={{
                name: schoolInfo?.name || "",
                address: schoolInfo?.address,
                phone: schoolInfo?.phone,
                email: schoolInfo?.email,
                logoUrl: schoolInfo?.logoUrl,
              }}
            />
          )}

          {/* Certificate Generation Dialog — professional multi-template */}
          {showCertificateDialog && student && (
            <ProfessionalCertificateDialog
              open={showCertificateDialog}
              onOpenChange={setShowCertificateDialog}
              certType={
                certificateType === "Bonafide Certificate" ? "bonafide"
                : certificateType === "Conduct Certificate" ? "conduct"
                : certificateType === "Character Certificate" ? "character"
                : "transfer"
              }
              personData={{
                studentName: student.name,
                admissionNumber: student.admissionNumber,
                rollNumber: student.rollNumber,
                className: student.class,
                section: student.section,
                dateOfBirth: student.dateOfBirth?.split('T')[0],
                fatherName: student.guardianName,
                academicYear: contextYear || "2024-25",
                gender: student.gender,
              }}
              schoolInfo={{
                name: schoolInfo?.name || "",
                address: schoolInfo?.address,
                phone: schoolInfo?.phone,
                email: schoolInfo?.email,
                logoUrl: schoolInfo?.logoUrl,
                principalName: schoolInfo?.principalName,
              }}
            />
          )}

          {/* Report Card Generation Dialog */}
          {showReportCardDialog && student && (
            <Dialog open={showReportCardDialog} onOpenChange={setShowReportCardDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Student Report Card</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <ReportCardTemplate
                    reportCard={{
                      id: `RC${Date.now()}`,
                      studentId: student.id,
                      studentName: student.name,
                      class: student.class,
                      section: student.section,
                      term: selectedExam,
                      subjects: (profileSummary?.exams?.results ?? [])
                        .filter(r => !selectedExam || r.examName === selectedExam)
                        .map(r => ({
                          name: r.subject,
                          marksObtained: r.marksObtained,
                          totalMarks: r.totalMarks,
                          grade: r.grade ?? ''
                        })),
                      totalMarks: (profileSummary?.exams?.results ?? []).filter(r => !selectedExam || r.examName === selectedExam).reduce((sum, r) => sum + r.totalMarks, 0),
                      totalObtained: (profileSummary?.exams?.results ?? []).filter(r => !selectedExam || r.examName === selectedExam).reduce((sum, r) => sum + r.marksObtained, 0),
                      percentage: (() => {
                        const rs = (profileSummary?.exams?.results ?? []).filter(r => !selectedExam || r.examName === selectedExam);
                        const tot = rs.reduce((s, r) => s + r.totalMarks, 0);
                        const obt = rs.reduce((s, r) => s + r.marksObtained, 0);
                        return tot > 0 ? (obt / tot) * 100 : 0;
                      })(),
                      grade: "A",
                      attendance: profileSummary?.attendance?.attendancePercent ?? 0,
                      rank: 0,
                      remarks: "Generated from live exam data.",
                      generatedDate: new Date().toISOString()
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4 print:hidden">
                  <Button variant="outline" onClick={() => setShowReportCardDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    window.print();
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center"
                  onClick={() => handleDocumentGeneration("ID Card")}
                >
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Generate ID Card</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center"
                  onClick={() => handleDocumentGeneration("Transfer Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Transfer Certificate</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center"
                  onClick={() => handleDocumentGeneration("Bonafide Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Bonafide Certificate</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center"
                  onClick={() => handleDocumentGeneration("Conduct Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Conduct Certificate</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center"
                  onClick={() => handleDocumentGeneration("Character Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Character Certificate</span>
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Live document upload/management */}
          {student?.id && (
            <StudentDocumentUpload
              studentId={student.id}
              studentName={student.name}
              showRequiredChecklist
            />
          )}
        </TabsContent>

        <TabsContent value="awards">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Awards & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button className="mb-4" onClick={() => setShowAwardDialog(true)}>
                Add New Award/Achievement
              </Button>
              {awards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No awards or achievements available</p>
                  <p className="text-sm">Awards and achievements will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {awards.map((award, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="font-semibold text-lg">{award.title}</div>
                      <div className="text-muted-foreground mb-2">{award.date}</div>
                      <div>{award.desc}</div>
                    </div>
                  ))}
                </div>
              )}
              <Dialog open={showAwardDialog} onOpenChange={setShowAwardDialog}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Award / Achievement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input placeholder="Award or Achievement Title" value={awardTitle} onChange={e => setAwardTitle(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input placeholder="Description" value={awardDesc} onChange={e => setAwardDesc(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <Input type="date" value={awardDate} onChange={e => setAwardDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button onClick={handleSaveAward} disabled={!awardTitle || !awardDate}>Save</Button>
                    <Button variant="outline" onClick={() => setShowAwardDialog(false)}>Cancel</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && student?.id && (
          <TabsContent value="portal">
            <ParentPortalAccountSection
              studentId={student.id}
              guardianName={student.guardianName}
              guardianPhone={student.guardianPhone}
            />
          </TabsContent>
        )}

      </Tabs>
      
      {/* Promote Student Dialog */}
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-green-600" />
              Promote Student
            </DialogTitle>
            <DialogDescription>
              Promote {student?.name} from {student?.class}-{student?.section} to next class/section
            </DialogDescription>
          </DialogHeader>
          
          {/* Promotion Criteria Check */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-medium text-blue-900 mb-2">Promotion Criteria:</div>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Student must have 75% attendance</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>No pending fee payments</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Academic performance meets minimum standards</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Current Class & Section</label>
              <div className="px-3 py-2 bg-gray-100 rounded-md border text-sm">
                {student?.class}-{student?.section} | Roll No: {student?.rollNumber}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">New Class *</label>
              <Input 
                placeholder="e.g., 6, 7, 8" 
                value={promoteData.newClass}
                onChange={(e) => setPromoteData({...promoteData, newClass: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">New Section</label>
              <select 
                value={promoteData.newSection}
                onChange={(e) => setPromoteData({...promoteData, newSection: e.target.value})}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Select Section</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="resetRollNumber"
                checked={promoteData.resetRollNumber}
                onChange={(e) => setPromoteData({...promoteData, resetRollNumber: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="resetRollNumber" className="text-sm font-medium">Reset Roll Number</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Remarks (Optional)</label>
              <Input 
                placeholder="Add any remarks about the promotion"
                value={promoteData.remarks}
                onChange={(e) => setPromoteData({...promoteData, remarks: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePromoteStudent} 
              disabled={actionLoading || !promoteData.newClass}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? 'Promoting...' : 'Confirm Promotion'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* PDF Preview Modal for Report Card */}
      <PdfPreviewModal
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
      />

      {/* Student Exit Dialog (Dropout / Passout) */}
      {student && (
        <StudentExitDialog
          student={student}
          exitType={exitType}
          open={showExitDialog}
          onClose={() => setShowExitDialog(false)}
          onComplete={(_result: StudentExitResponse) => {
            setShowExitDialog(false);
            // Refresh student data so status badge updates
            void studentApi.getById(student.id).then((s) => setStudent(s));
          }}
        />
      )}

      {/* Student Detain Dialog — student stays active in same class */}
      {student && (
        <StudentDetainDialog
          student={student}
          open={showDetainDialog}
          onClose={() => setShowDetainDialog(false)}
          onComplete={(_result: StudentExitResponse) => {
            setShowDetainDialog(false);
            // Refresh student data (status remains active)
            void studentApi.getById(student.id).then((s) => setStudent(s));
          }}
        />
      )}
    </div>
  );
}
