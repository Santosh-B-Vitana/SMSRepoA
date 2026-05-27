import { UserCheck, Clock, ChevronDown, ChevronUp, CheckCircle2, XCircle, CalendarOff, TrendingUp, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayrollManager } from "@/components/payroll/PayrollManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  FileText, 
  CreditCard, 
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  GraduationCap,
  RotateCcw
} from "lucide-react";
import { staffApi, Staff as RealStaff, StaffBasic } from "@/services/api/staffApi";
import { StaffDeactivateDialog } from "@/components/staff/StaffDeactivateDialog";
import { StaffChildDto } from "@/services/api/studentApi";
import { academicApi, MyClassAssignment, TeacherAssignmentResponse } from "@/services/api/academicApi";
import { attendanceApi, StaffAttendanceResponse, CreateStaffAttendanceRequest, StaffAttendanceStatus, UpdateStaffAttendanceRequest } from "@/services/api/attendanceApi";
import { StaffLeaveSection } from "@/components/leave-management/StaffLeaveSection";
import leaveManagementApi, { LeaveType } from "@/services/api/leaveManagementApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffPortalAccountSection } from "@/components/staff/StaffPortalAccountSection";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/contexts/SchoolContext";

// Extended type that merges real API Staff with legacy mockApi fields still rendered in the template
type Staff = RealStaff & {
  photoUrl?: string;      // real API uses profilePhoto; mapped below
  dob?: string;          // real API uses dateOfBirth; mapped below
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContact?: string;
  doctorName?: string;
  doctorPhone?: string;
  licenseNumber?: string;
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  personalEmail?: string;
  accountHolderName?: string;
};
import { ProfessionalCertificateDialog } from "@/components/documents/ProfessionalCertificateDialog";
import { ProfessionalIdCardDialog } from "@/components/documents/ProfessionalIdCardDialog";
import { useToast } from "@/hooks/use-toast";
import placeholderImg from '/placeholder.svg';
import { useLanguage } from "@/contexts/LanguageContext";

const STAFF_DOCUMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "contract", label: "Contract" },
  { value: "resume", label: "Resume" },
  { value: "id_proof", label: "ID Proof" },
  { value: "address_proof", label: "Address Proof" },
  { value: "aadhar", label: "Aadhar" },
  { value: "pan", label: "PAN" },
  { value: "passport", label: "Passport" },
  { value: "degree_certificate", label: "Degree Certificate" },
  { value: "experience_certificate", label: "Experience Certificate" },
  { value: "salary_slip", label: "Salary Slip" },
  { value: "joining_report", label: "Joining Report" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "background_check", label: "Background Check" },
  { value: "other", label: "Other" },
];

const STAFF_CERTIFICATE_TYPES: Array<{ value: string; label: string }> = [
  { value: "degree_certificate", label: "Degree Certificate" },
  { value: "experience_certificate", label: "Experience Certificate" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "background_check", label: "Background Check Certificate" },
  { value: "other", label: "Other Certificate" },
];

const CERTIFICATE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  STAFF_CERTIFICATE_TYPES.map((t) => [t.value, t.label])
);

const isCertificateType = (type?: string) => {
  if (!type) return false;
  const certificateTypes = new Set([
    "degree_certificate",
    "experience_certificate",
    "medical_certificate",
    "background_check",
  ]);
  return certificateTypes.has(type) || type.includes("certificate");
};

export default function StaffProfile() {
  const { user } = useAuth();
  const { schoolInfo } = useSchool();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  // Late dialog state
  const [lateDialog, setLateDialog] = useState<{ open: boolean; index?: number }>({ open: false });
  const [lateReason, setLateReason] = useState("");
  // Leave dialog calendar state
  const [leaveEndDate, setLeaveEndDate] = useState<Date | null>(null);
  const [leaveStartDate, setLeaveStartDate] = useState<Date | null>(null);
  const [leaveDates, setLeaveDates] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  // Leave dialog state
  const [leaveDialog, setLeaveDialog] = useState<{ open: boolean; index?: number }>({ open: false });
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState("");
  // Attendance tab state
  const [calendarDate, setCalendarDate] = useState("");
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceResponse[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  // Mark today's attendance dialog
  const [markTodayOpen, setMarkTodayOpen] = useState(false);
  const [markTodayStatus, setMarkTodayStatus] = useState<StaffAttendanceStatus>('present');
  const [markTodaySaving, setMarkTodaySaving] = useState(false);
  const [markTodayLeaveTypeId, setMarkTodayLeaveTypeId] = useState<string>("");
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffBasic | null>(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [childrenInSchool, setChildrenInSchool] = useState<StaffChildDto[]>([]);
  const [showChildrenExpanded, setShowChildrenExpanded] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<TeacherAssignmentResponse[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff) return;
    try {
      const result = await staffApi.uploadPhoto(staff.id, file);
      setStaff({ ...staff, photoUrl: result.photoUrl, profilePhoto: result.photoUrl });
      toast({ title: t('staffProfilePage.photoUpdated'), description: t('staffProfilePage.photoSavedSuccess') });
    } catch (err) {
      console.error(err);
      toast({ title: t('staffProfilePage.uploadFailed'), description: t('staffProfilePage.couldNotSavePhoto'), variant: "destructive" });
    }
  };

  // State for document dialogs
  const [showIdCardDialog, setShowIdCardDialog] = useState(false);
  const [showExperienceCertDialog, setShowExperienceCertDialog] = useState(false);
  const [showSalaryCertDialog, setShowSalaryCertDialog] = useState(false);
  const [staffDocuments, setStaffDocuments] = useState<RealStaff["documents"]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("other");
  const [selectedCertificateType, setSelectedCertificateType] = useState<string>("degree_certificate");

  const handleDocumentGeneration = (type: string) => {
    if (type === "ID Card") {
      setShowIdCardDialog(true);
    } else if (type === "Experience Certificate") {
      setShowExperienceCertDialog(true);
    } else if (type === "Salary Certificate") {
      setShowSalaryCertDialog(true);
    }
  };

  useEffect(() => {
    if (id) {
      fetchStaff();
      fetchStaffDocuments();
      fetchAssignedClasses();
      fetchStaffAttendance();
      fetchChildrenInSchool();
    }
    // Load leave types once
    leaveManagementApi.getLeaveTypes("Staff").then(types => setLeaveTypes(types ?? [])).catch(() => {});
  }, [id]);

  const fetchStaffAttendance = async () => {
    if (!id) return;
    setAttendanceLoading(true);
    try {
      const records = await attendanceApi.getStaffAttendances({ staffId: id });
      setStaffAttendance(Array.isArray(records) ? records : []);
    } catch {
      setStaffAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleMarkToday = async () => {
    if (!id || !user?.schoolId) return;
    setMarkTodaySaving(true);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = staffAttendance.find(r => r.date?.startsWith(today));
    try {
      if (todayRecord) {
        await attendanceApi.updateStaffAttendance(todayRecord.id, {
          status: markTodayStatus,
          leaveTypeId: markTodayStatus === 'leave' ? markTodayLeaveTypeId || undefined : undefined,
        } as UpdateStaffAttendanceRequest);
        toast({ title: "Attendance updated", description: `Updated to ${markTodayStatus} for ${today}` });
      } else {
        await attendanceApi.createStaffAttendance({
          schoolId: user.schoolId,
          staffId: id,
          date: today,
          status: markTodayStatus,
          leaveTypeId: markTodayStatus === 'leave' ? markTodayLeaveTypeId || undefined : undefined,
        } as CreateStaffAttendanceRequest);
        toast({ title: "Attendance marked", description: `Marked as ${markTodayStatus} for ${today}` });
      }
      setMarkTodayOpen(false);
      fetchStaffAttendance();
    } catch {
      toast({ title: "Failed to save attendance", description: "Could not save the attendance record.", variant: "destructive" });
    } finally {
      setMarkTodaySaving(false);
    }
  };

  const fetchChildrenInSchool = async () => {
    if (!id) return;
    try {
      const children = await staffApi.getChildren(id);
      setChildrenInSchool(Array.isArray(children) ? children : []);
    } catch {
      setChildrenInSchool([]);
    }
  };

  const fetchAssignedClasses = async () => {
    if (!id) return;
    setClassesLoading(true);
    try {
      const result = await academicApi.getTeacherAssignmentsForStaff(id);
      const all = result.assignments ?? [];

      // Valid academic year pattern: "2024-2025" or "2024-25" — filters out integration-test garbage like "AY-20260419190735"
      const validYear = /^\d{4}-\d{2,4}$/;
      // Filter to only real records: active status, valid year, and real class name (not INT- test runs)
      const real = all.filter(a =>
        a.status === 'active' &&
        validYear.test(a.academicYear ?? '') &&
        !!a.className &&
        !a.className.startsWith('INT-')
      );

      // Deduplicate: keep only the most recent record per (classId, subjectId) pair.
      const sorted = [...real].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const seen = new Set<string>();
      const deduped = sorted.filter(a => {
        const key = `${a.classId}||${a.subjectId ?? 'none'}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setAssignedClasses(deduped);
    } catch {
      // Non-fatal: classes tab will show empty state
    } finally {
      setClassesLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!id) return;
    try {
      const staffMember = await staffApi.getById(id);
      // Map real-API fields to legacy template field names so the template renders correctly
      setStaff({
        ...staffMember,
        photoUrl: staffMember.profilePhoto,
        dob: staffMember.dateOfBirth,
      });
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      toast({
        title: t('staffProfilePage.errorTitle'),
        description: t('staffProfilePage.failedToLoad'),
        variant: "destructive"
      });
      setStaff(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffDocuments = async () => {
    if (!id) return;
    try {
      const docs = await staffApi.getDocuments(id);
      setStaffDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      setStaffDocuments([]);
    }
  };

  const handleStaffDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingDocument(true);
    try {
      const uploaded = await staffApi.uploadDocument(id, selectedDocumentType, file);
      setStaffDocuments((prev) => [uploaded, ...(prev ?? [])]);
      toast({ title: "Document uploaded", description: "Staff document saved to S3 successfully." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload staff document.", variant: "destructive" });
    } finally {
      setUploadingDocument(false);
      e.target.value = "";
    }
  };

  const handleStaffDocumentDelete = async (documentId: string) => {
    if (!confirm("Delete this document?")) return;
    setDeletingDocumentId(documentId);
    try {
      await staffApi.deleteDocument(documentId);
      setStaffDocuments((prev) => (prev ?? []).filter((d) => d.id !== documentId));
      toast({ title: "Document deleted" });
    } catch {
      toast({ title: "Delete failed", description: "Could not delete document.", variant: "destructive" });
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingCertificate(true);
    try {
      const uploaded = await staffApi.uploadDocument(id, selectedCertificateType, file);
      setStaffDocuments((prev) => [uploaded, ...(prev ?? [])]);
      toast({ title: "Certificate uploaded", description: "Staff certificate saved to S3 successfully." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload certificate.", variant: "destructive" });
    } finally {
      setUploadingCertificate(false);
      e.target.value = "";
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'inactive') => {
    if (!staff) return;
    setActionLoading(true);
    try {
      await staffApi.update(staff.id, { status: newStatus });
      setStaff({ ...staff, status: newStatus });
      toast({
        title: t('staffProfilePage.successTitle'),
        description: newStatus === 'active' ? t('staffProfilePage.reactivatedSuccess') : t('staffProfilePage.deactivatedSuccess'),
      });
    } catch (error) {
      toast({
        title: t('staffProfilePage.errorTitle'),
        description: t('staffProfilePage.failedToUpdate'),
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('staffProfilePage.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-red-500 mb-4">{t('staffProfilePage.staffNotFound')}</div>
        <Button onClick={() => navigate("/staff")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('staffProfilePage.backToStaff')}
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
            onClick={() => navigate("/staff")} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('staffProfilePage.back')}
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{t('staffProfilePage.title')}</h1>
            <p className="text-muted-foreground">{t('staffProfilePage.completeInfo')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => navigate(`/staff/${staff.id}/edit`)}
            variant="default"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('staffProfilePage.editProfile')}
          </Button>
          
          {staff.status === 'active' ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeactivateTarget(staff as StaffBasic)}
            >
              {t('staffProfilePage.deactivate')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={actionLoading}
              onClick={() => handleStatusChange('active')}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('staffProfilePage.reactivate')}
            </Button>
          )}
        </div>
      </div>

      {/* Staff Basic Info Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border border-gray-300 mb-2 flex items-center justify-center">
                {staff.photoUrl ? (
                  <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                )}
              </div>
              <label htmlFor="staff-photo-upload" className="mt-2 px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer font-semibold text-base block border-2 border-blue-800">
                {t('staffProfilePage.uploadPhoto')}
                <input
                  id="staff-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              <Badge variant={staff.status === 'active' ? 'default' : 'secondary'} className="mt-2 mb-2">
                {staff.status === 'active' ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    {t('staffProfilePage.personalDetails')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-lg">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {staff.id}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.phone')}</div>
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {staff.phone}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.email')}</div>
                      <div className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {staff.email}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Briefcase className="h-4 w-4" />
                    {t('staffProfilePage.professionalDetails')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.designation')}</div>
                      <div className="text-sm">{staff.designation}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.department')}</div>
                      <div className="text-sm">{staff.department}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.experience')}</div>
                      <div className="text-sm">{staff.experience} {t('staffProfilePage.years')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    {t('staffProfilePage.contactInfo')}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.address')}</div>
                      <div className="text-sm">{staff.address}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('staffProfilePage.emergencyContact')}</div>
                      <div className="text-sm">{staff.phone}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information Section */}
      <Card className="mb-6">
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {showAdditionalInfo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              Additional Information
            </CardTitle>
          </div>
        </CardHeader>
        
        {showAdditionalInfo && (
          <CardContent className="space-y-6 border-t pt-6">
            {/* Medical Information */}
            {(staff?.bloodGroup || staff?.allergies || staff?.chronicConditions || staff?.emergencyContact || staff?.emergencyContactPhone || staff?.doctorName || staff?.doctorPhone) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Medical Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.bloodGroup && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Blood Group</div>
                      <div className="text-sm font-semibold">{staff.bloodGroup}</div>
                    </div>
                  )}
                  {staff.allergies && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Allergies</div>
                      <div className="text-sm">{staff.allergies}</div>
                    </div>
                  )}
                  {staff.chronicConditions && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Chronic Conditions</div>
                      <div className="text-sm">{staff.chronicConditions}</div>
                    </div>
                  )}
                  {staff.emergencyContact && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Emergency Contact</div>
                      <div className="text-sm">{staff.emergencyContact}</div>
                    </div>
                  )}
                  {staff.emergencyContactPhone && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Emergency Contact Phone</div>
                      <div className="text-sm">{staff.emergencyContactPhone}</div>
                    </div>
                  )}
                  {staff.doctorName && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Doctor Name</div>
                      <div className="text-sm">{staff.doctorName}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Identification Information */}
            {(staff.aadharNumber || staff.panNumber || staff.passportNumber || staff.licenseNumber) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Identification Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.aadharNumber && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Aadhar Number</div>
                      <div className="text-sm">{staff.aadharNumber}</div>
                    </div>
                  )}
                  {staff.panNumber && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">PAN Number</div>
                      <div className="text-sm">{staff.panNumber}</div>
                    </div>
                  )}
                  {staff.passportNumber && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Passport Number</div>
                      <div className="text-sm">{staff.passportNumber}</div>
                    </div>
                  )}
                  {staff.licenseNumber && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">License Number</div>
                      <div className="text-sm">{staff.licenseNumber}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personal Information */}
            {(staff.dob || staff.gender || staff.nationality || staff.religion || staff.maritalStatus) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.dob && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                      <div className="text-sm">{new Date(staff.dob).toLocaleDateString()}</div>
                    </div>
                  )}
                  {staff.gender && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Gender</div>
                      <div className="text-sm">{staff.gender}</div>
                    </div>
                  )}
                  {staff.nationality && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Nationality</div>
                      <div className="text-sm">{staff.nationality}</div>
                    </div>
                  )}
                  {staff.religion && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Religion</div>
                      <div className="text-sm">{staff.religion}</div>
                    </div>
                  )}
                  {staff.maritalStatus && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Marital Status</div>
                      <div className="text-sm">{staff.maritalStatus}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Information */}
            {(staff.primaryPhone || staff.secondaryPhone || staff.personalEmail || staff.permanentAddress) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.primaryPhone && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Primary Phone</div>
                      <div className="text-sm">{staff.primaryPhone}</div>
                    </div>
                  )}
                  {staff.secondaryPhone && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Secondary Phone</div>
                      <div className="text-sm">{staff.secondaryPhone}</div>
                    </div>
                  )}
                  {staff.personalEmail && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Personal Email</div>
                      <div className="text-sm">{staff.personalEmail}</div>
                    </div>
                  )}
                  {staff.permanentAddress && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">Permanent Address</div>
                      <div className="text-sm">{staff.permanentAddress}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Professional Information */}
            {(staff.bankAccountNumber || staff.bankName || staff.ifscCode || staff.accountHolderName) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Professional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.bankAccountNumber && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Bank Account Number</div>
                      <div className="text-sm">****{staff.bankAccountNumber.slice(-4)}</div>
                    </div>
                  )}
                  {staff.bankName && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Bank Name</div>
                      <div className="text-sm">{staff.bankName}</div>
                    </div>
                  )}
                  {staff.ifscCode && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">IFSC Code</div>
                      <div className="text-sm">{staff.ifscCode}</div>
                    </div>
                  )}
                  {staff.accountHolderName && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Account Holder Name</div>
                      <div className="text-sm">{staff.accountHolderName}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Qualification Information */}
            {(staff.highestQualification || staff.university || staff.passingYear || staff.additionalCertifications) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Qualification Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.highestQualification && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Highest Qualification</div>
                      <div className="text-sm">{staff.highestQualification}</div>
                    </div>
                  )}
                  {staff.university && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">University</div>
                      <div className="text-sm">{staff.university}</div>
                    </div>
                  )}
                  {staff.passingYear && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Passing Year</div>
                      <div className="text-sm">{staff.passingYear}</div>
                    </div>
                  )}
                  {staff.additionalCertifications && staff.additionalCertifications.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-muted-foreground">Additional Certifications</div>
                      <div className="text-sm">
                        {staff.additionalCertifications.map((cert, idx) => (
                          <div key={idx} className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Employment Information */}
            {(staff.employmentType || staff.confirmationDate || staff.workingDays || staff.leaveEntitlement) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Employment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.employmentType && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Employment Type</div>
                      <div className="text-sm">{staff.employmentType}</div>
                    </div>
                  )}
                  {staff.confirmationDate && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Confirmation Date</div>
                      <div className="text-sm">{new Date(staff.confirmationDate).toLocaleDateString()}</div>
                    </div>
                  )}
                  {staff.workingDays && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Working Days</div>
                      <div className="text-sm">{staff.workingDays}</div>
                    </div>
                  )}
                  {staff.leaveEntitlement && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Leave Entitlement</div>
                      <div className="text-sm">{staff.leaveEntitlement} days/year</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compliance Information */}
            {(staff.backgroundVerified || staff.policeClearance || staff.medicalCheckup || staff.documentConsent) && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Compliance & Documentation
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  {staff.backgroundVerified !== undefined && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Background Verified</div>
                      <Badge variant={staff.backgroundVerified ? 'default' : 'secondary'}>
                        {staff.backgroundVerified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  )}
                  {staff.policeClearance !== undefined && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Police Clearance</div>
                      <Badge variant={staff.policeClearance ? 'default' : 'secondary'}>
                        {staff.policeClearance ? 'Obtained' : 'Pending'}
                      </Badge>
                    </div>
                  )}
                  {staff.medicalCheckup !== undefined && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Medical Checkup</div>
                      <Badge variant={staff.medicalCheckup ? 'default' : 'secondary'}>
                        {staff.medicalCheckup ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  )}
                  {staff.documentConsent !== undefined && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Document Consent</div>
                      <Badge variant={staff.documentConsent ? 'default' : 'secondary'}>
                        {staff.documentConsent ? 'Consented' : 'Not Consented'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state - no additional info */}
            {!(staff?.bloodGroup || staff?.allergies || staff?.chronicConditions || staff?.emergencyContact || staff?.emergencyContactPhone || staff?.doctorName || staff?.doctorPhone || staff.aadharNumber || staff.panNumber || staff.passportNumber || staff.licenseNumber || staff.dob || staff.gender || staff.nationality || staff.religion || staff.maritalStatus || staff.highestQualification || staff.university || staff.passingYear || staff.additionalCertifications || staff.employmentType || staff.confirmationDate || staff.workingDays || staff.leaveEntitlement || staff.backgroundVerified || staff.policeClearance || staff.medicalCheckup || staff.documentConsent) && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No additional details added yet</p>
                <Button 
                  onClick={() => navigate(`/staff/${staff?.id}/edit`)}
                  variant="outline"
                  className="gap-2"
                >
                  <span>➕</span> Add More Details
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Children in School — dropdown, shown only when staff has linked students */}
      {childrenInSchool.length > 0 && (
        <Card className="mb-6">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowChildrenExpanded(!showChildrenExpanded)}
          >
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <span className="truncate">Children in School</span>
                <Badge variant="secondary" className="ml-1">{childrenInSchool.length}</Badge>
              </CardTitle>
              <Badge variant="outline" className="flex-shrink-0 text-xs">
                {showChildrenExpanded ? 'Hide' : 'Show'}
              </Badge>
            </div>
          </CardHeader>
          {showChildrenExpanded && (
            <CardContent className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                {childrenInSchool.length === 1 ? 'This staff member has 1 child' : `This staff member has ${childrenInSchool.length} children`} studying in this school.
              </p>
              <div className="grid gap-3">
                {childrenInSchool.map(child => (
                  <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {child.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{child.name}</p>
                        <p className="text-xs text-muted-foreground">{child.admissionNumber} • Class {child.class}-{child.section} • Roll: {child.rollNumber || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={child.status === 'active' ? 'default' : 'secondary'} className="text-xs">{child.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${child.id}`)}>View →</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="classes" className="space-y-4">
        <div className="tabs-list-container overflow-x-auto">
            <TabsList className="tabs-list grid w-full min-w-[700px] md:min-w-[840px]" style={{ gridTemplateColumns: isAdmin ? 'repeat(7, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))' }}>
            <TabsTrigger value="classes" className="tabs-trigger">{t('staffProfilePage.classes')}</TabsTrigger>
            <TabsTrigger value="attendance" className="tabs-trigger">{t('staffProfilePage.attendance')}</TabsTrigger>
            <TabsTrigger value="payroll" className="tabs-trigger">{t('staffProfilePage.payroll')}</TabsTrigger>
            <TabsTrigger value="leaves" className="tabs-trigger">Leaves</TabsTrigger>
            <TabsTrigger value="documents" className="tabs-trigger">{t('staffProfilePage.documents')}</TabsTrigger>
            <TabsTrigger value="certificates" className="tabs-trigger">{t('staffProfilePage.certificates')}</TabsTrigger>
            {isAdmin && <TabsTrigger value="portal" className="tabs-trigger">Portal</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                {t('staffProfilePage.assignedClasses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading classes…</div>
              ) : assignedClasses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No class assignments found for this staff member.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('staffProfilePage.class')}</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>{t('staffProfilePage.subject')}</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Academic Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedClasses.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.className || '—'}</TableCell>
                          <TableCell>{a.sectionName || '—'}</TableCell>
                          <TableCell>{a.subjectName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={a.isClassTeacher ? 'default' : 'secondary'}>
                              {a.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                            </Badge>
                          </TableCell>
                          <TableCell>{a.academicYear}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          {/* ── Attendance Summary Stats ─────────────────────────────────── */}
          {!attendanceLoading && staffAttendance.length > 0 && (() => {
            const total = staffAttendance.length;
            const presentCount = staffAttendance.filter(r => r.status === 'present').length;
            const absentCount  = staffAttendance.filter(r => r.status === 'absent').length;
            const lateCount    = staffAttendance.filter(r => r.status === 'late').length;
            const leaveCount   = staffAttendance.filter(r => r.status === 'leave').length;
            const pct = Math.round((presentCount / total) * 100);
            return (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Present</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{lateCount}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500">Late</p>
                  </div>
                </div>
                <div className="rounded-xl border bg-violet-50 dark:bg-violet-950/30 p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
                    <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-violet-700 dark:text-violet-400">{pct}%</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-500">Attendance</p>
                  </div>
                </div>
                {leaveCount > 0 && (
                  <div className="rounded-xl border bg-blue-50 dark:bg-blue-950/30 p-3 flex items-center gap-3 col-span-2 sm:col-span-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                      <CalendarOff className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{leaveCount}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-500">On Leave</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Attendance Records Table ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Attendance Record
                </CardTitle>
                {isAdmin && (() => {
                  const todayISO = new Date().toISOString().split('T')[0];
                  const todayRecord = staffAttendance.find(r => r.date?.startsWith(todayISO));
                  return (
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                      onClick={() => {
                        setMarkTodayStatus((todayRecord?.status as StaffAttendanceStatus) ?? 'present');
                        setMarkTodayOpen(true);
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {todayRecord ? "Edit Today's Attendance" : "Mark Today"}
                    </Button>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading attendance…</div>
              ) : staffAttendance.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">No attendance records found.</p>
                  {isAdmin && (
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                      onClick={() => { setMarkTodayStatus('present'); setMarkTodayOpen(true); }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark Attendance
                    </Button>
                  )}
                </div>
              ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...staffAttendance]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 capitalize'
                                : record.status === 'late'
                                ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 capitalize'
                                : record.status === 'leave'
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 capitalize'
                                : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 capitalize'
                            }
                            variant="outline"
                          >
                            {record.status === 'present' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {record.status === 'absent'  && <XCircle className="h-3 w-3 mr-1" />}
                            {record.status === 'late'    && <Clock className="h-3 w-3 mr-1" />}
                            {record.status === 'leave'   && <CalendarOff className="h-3 w-3 mr-1" />}
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.checkInTime ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{record.checkOutTime ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{record.remarks ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>

          {/* ── Mark Today Dialog ──────────────────────────────────────── */}
          <Dialog open={markTodayOpen} onOpenChange={setMarkTodayOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-violet-600" />
                  Mark Attendance — Today
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{staff?.name}</p>
                  <p className="text-xs text-muted-foreground">{staff?.designation} · {staff?.department}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {((['present', 'late', 'leave'] as StaffAttendanceStatus[]).map(s => {
                    const icons: Record<StaffAttendanceStatus, ReactNode> = {
                      present: <CheckCircle2 className="h-4 w-4" />,
                      absent:  <XCircle className="h-4 w-4" />,
                      late:    <Clock className="h-4 w-4" />,
                      leave:   <CalendarOff className="h-4 w-4" />,
                    };
                    const colors: Record<StaffAttendanceStatus, string> = {
                      present: 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                      absent:  'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                      late:    'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                      leave:   'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                    };
                    const active = markTodayStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setMarkTodayStatus(s)}
                        className={[
                          'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all capitalize',
                          active ? `${colors[s]} shadow-sm` : 'border-border text-muted-foreground hover:bg-muted',
                        ].join(' ')}
                      >
                        {icons[s]}
                        {s}
                      </button>
                    );
                  }))}
                </div>
                {markTodayStatus === 'leave' && leaveTypes.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Leave Type</p>
                    <Select value={markTodayLeaveTypeId} onValueChange={setMarkTodayLeaveTypeId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select leave type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map(lt => (
                          <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setMarkTodayOpen(false)} disabled={markTodaySaving}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                    onClick={handleMarkToday}
                    disabled={markTodaySaving}
                  >
                    {markTodaySaving ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                    ) : (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Save</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="documents">
          {/* Professional Staff ID Card Dialog */}
          {showIdCardDialog && staff && (
            <ProfessionalIdCardDialog
              open={showIdCardDialog}
              onOpenChange={setShowIdCardDialog}
              personType="staff"
              personData={{
                name: staff.name,
                employeeId: staff.id,
                designation: staff.designation,
                department: staff.department,
                phone: staff.phone,
                email: staff.email,
                bloodGroup: staff.bloodGroup,
                photoUrl: staff.profilePhoto,
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

          {/* Professional Experience Certificate Dialog */}
          {showExperienceCertDialog && staff && (
            <ProfessionalCertificateDialog
              open={showExperienceCertDialog}
              onOpenChange={setShowExperienceCertDialog}
              certType="experience"
              personData={{
                staffName: staff.name,
                employeeId: staff.id,
                designation: staff.designation,
                department: staff.department,
                joiningDate: staff.joiningDate,
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

          {/* Professional Salary Certificate Dialog */}
          {showSalaryCertDialog && staff && (
            <ProfessionalCertificateDialog
              open={showSalaryCertDialog}
              onOpenChange={setShowSalaryCertDialog}
              certType="salary"
              personData={{
                staffName: staff.name,
                employeeId: staff.id,
                designation: staff.designation,
                department: staff.department,
                joiningDate: staff.joiningDate,
                grossSalary: staff.salary != null ? String(staff.salary) : undefined,
                bankName: staff.bankName,
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 document-grid">
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center document-button"
                  onClick={() => handleDocumentGeneration("ID Card")}
                >
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Generate ID Card</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center document-button"
                  onClick={() => handleDocumentGeneration("Experience Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Experience Certificate</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 sm:h-20 flex-col justify-center document-button"
                  onClick={() => handleDocumentGeneration("Salary Certificate")}
                >
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm">Salary Certificate</span>
                </Button>
              </div>

              {/* Uploaded Documents Section */}
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h4 className="font-medium">Uploaded Documents</h4>
                  <div className="flex items-center gap-2">
                    <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                      <SelectTrigger className="w-[190px] h-8 text-xs">
                        <SelectValue placeholder="Document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="cursor-pointer inline-flex items-center px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                      {uploadingDocument ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleStaffDocumentUpload}
                        disabled={uploadingDocument}
                      />
                    </label>
                  </div>
                </div>
                {(staffDocuments ?? []).length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">No documents uploaded yet.</div>
                ) : (
                <div className="space-y-2">
                  {(staffDocuments ?? []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Download">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingDocumentId === doc.id}
                          onClick={() => handleStaffDocumentDelete(doc.id)}
                          title="Delete"
                        >
                          {deletingDocumentId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Certificates & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Upload and manage staff certificates (stored in S3).
                </p>
                <div className="flex items-center gap-2">
                  <Select value={selectedCertificateType} onValueChange={setSelectedCertificateType}>
                    <SelectTrigger className="w-[220px] h-8 text-xs">
                      <SelectValue placeholder="Certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_CERTIFICATE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="cursor-pointer inline-flex items-center px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                    {uploadingCertificate ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleCertificateUpload}
                      disabled={uploadingCertificate}
                    />
                  </label>
                </div>
              </div>

              {(staffDocuments ?? []).filter((d) => isCertificateType(d.type)).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No certificates uploaded yet</p>
                  <p className="text-sm">Use the upload option above to add certificates</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(staffDocuments ?? [])
                    .filter((d) => isCertificateType(d.type))
                    .map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {CERTIFICATE_TYPE_LABEL[doc.type] ?? doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Download">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deletingDocumentId === doc.id}
                            onClick={() => handleStaffDocumentDelete(doc.id)}
                            title="Delete"
                          >
                            {deletingDocumentId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollManager staffId={staff?.id} />
        </TabsContent>

        <TabsContent value="leaves">
          <StaffLeaveSection staffId={staff?.id || ""} staffName={staff?.name || ""} userLoginId={staff?.userLoginId} canApprove={true} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="portal">
            <div className="space-y-4">
              {staff?.id && <StaffPortalAccountSection staffId={staff.id} />}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Deactivate dialog — shows class reassignment flow before deactivating */}
      <StaffDeactivateDialog
        staff={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onSuccess={() => {
          setDeactivateTarget(null);
          fetchStaff();
        }}
      />
    </div>
  );
}