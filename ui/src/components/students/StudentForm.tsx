
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Student, studentApi } from "@/services/api/studentApi";
import { academicApi, ClassResponse, AcademicYearResponse } from "@/services/api/academicApi";
import { useToast } from "@/hooks/use-toast";
import { DOCUMENT_TYPES } from "./StudentDocumentUpload";
import { Upload, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudentFormProps {
  student?: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

/** Convert ISO datetime string from backend to YYYY-MM-DD for date inputs */
function toDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

export function StudentForm({ student, onClose, onSuccess }: StudentFormProps) {
  const [formData, setFormData] = useState({
    // Basic Info
    name: student?.name || "",
    preferredName: student?.preferredName || "",
    admissionNumber: student?.admissionNumber || "",
    class: student?.class || "",
    section: student?.section || "",
    rollNumber: student?.rollNumber || "",
    dateOfBirth: toDateInput(student?.dateOfBirth),
    placeOfBirth: student?.placeOfBirth || "",
    gender: student?.gender || "",
    nationality: student?.nationality || "",
    status: student?.status || "active",
    admissionDate: toDateInput(student?.admissionDate),
    
    // Identification
    aadharNumber: student?.aadharNumber || "",
    panNumber: student?.panNumber || "",
    passportNumber: student?.passportNumber || "",
    visaType: student?.visaType || "",
    visaExpiry: student?.visaExpiry || "",
    
    // Contact
    address: student?.address || "",
    permanentAddress: student?.permanentAddress || "",
    primaryPhone: student?.primaryPhone || "",
    secondaryPhone: student?.secondaryPhone || "",
    email: student?.email || "",
    
    // Guardian (backward compatibility)
    guardianName: student?.guardianName || "",
    guardianPhone: student?.guardianPhone || "",
    guardianOccupation: student?.guardians?.[0]?.occupation || "",
    guardianEmail: student?.guardians?.[0]?.email || "",
    guardianAadhar: student?.guardians?.[0]?.aadharNumber || "",
    guardianPan: student?.guardians?.[0]?.panNumber || "",
    
    // Academic
    previousSchool: student?.previousSchool || "",
    previousClass: student?.previousClass || "",
    transferReason: student?.transferReason || "",
    category: student?.category || "General",
    
    // Medical
    bloodGroup: student?.bloodGroup || "",
    allergies: student?.allergies || "",
    chronicConditions: student?.chronicConditions || "",
    medications: student?.medications || "",
    emergencyContact: student?.emergencyContact || "",
    emergencyPhone: student?.emergencyPhone || "",
    doctorName: student?.doctorName || "",
    doctorPhone: student?.doctorPhone || "",
    
    // Consent
    photoConsent: student?.photoConsent || false,
    mediaConsent: student?.mediaConsent || false,
    medicalConsent: student?.medicalConsent || false,
    
    // Additional
    languageProficiency: student?.languageProficiency?.join(", ") || "",
    specialNeeds: student?.specialNeeds || "",
    transportRequired: student?.transportRequired || false,
    hostelRequired: student?.hostelRequired || false,
    
    siblings: student?.siblingIds ? JSON.parse(student.siblingIds) : [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photoUrl || null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allClasses, setAllClasses] = useState<ClassResponse[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearResponse[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    studentApi.list({ pageSize: 1000 }).then((result) => {
      const all = result.students || [];
      const filtered = student ? all.filter((s) => s.id !== student.id) : all;
      setAllStudents(filtered as any);
    }).catch((err) => {
      console.error("Failed to load students:", err);
    });

    // Load classes and academic years from academics API
    academicApi.listClasses(1, 500).then((res) => {
      setAllClasses(res.classes || []);
    }).catch(() => {});

    academicApi.listAcademicYears(1, 50).then((res) => {
      setAcademicYears(res.academicYears || []);
    }).catch(() => {});
  }, [student]);

  // Derive unique standards (filtered by selected academic year)
  const filteredClasses = selectedAcademicYear === "all"
    ? allClasses
    : allClasses.filter((c) => c.academicYear === selectedAcademicYear);

  const availableStandards = Array.from(new Set(filteredClasses.map((c) => c.standard))).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, "")) || 0;
    const bNum = parseInt(b.replace(/\D/g, "")) || 0;
    return aNum - bNum;
  });

  const availableSections = formData.class
    ? filteredClasses.filter((c) => c.standard === formData.class).map((c) => c.section).sort()
    : [];

  const handleClassChange = (value: string) => {
    setFormData({ ...formData, class: value, section: "" });
  };

  // ── Admission document state ─────────────────────────────────────────────
  interface PendingDoc { docType: string; file: File; }
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState("");

  const handleAddPendingDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingDocType) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Max 10 MB per document.", variant: "destructive" }); return; }
    setPendingDocs((prev) => [...prev, { docType: pendingDocType, file }]);
    setPendingDocType("");
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const removePendingDoc = (idx: number) =>
    setPendingDocs((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        preferredName: formData.preferredName || undefined,
        admissionNumber: formData.admissionNumber || undefined,
        class: formData.class,
        section: formData.section,
        rollNumber: formData.rollNumber || undefined,
        dateOfBirth: formData.dateOfBirth,
        placeOfBirth: formData.placeOfBirth || undefined,
        gender: formData.gender || undefined,
        nationality: formData.nationality || undefined,
        status: formData.status,
        admissionDate: formData.admissionDate,
        address: formData.address,
        permanentAddress: formData.permanentAddress || undefined,
        primaryPhone: formData.primaryPhone || undefined,
        secondaryPhone: formData.secondaryPhone || undefined,
        email: formData.email || undefined,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        previousSchool: formData.previousSchool || undefined,
        previousClass: formData.previousClass || undefined,
        transferReason: formData.transferReason || undefined,
        category: formData.category,
        aadharNumber: formData.aadharNumber || undefined,
        panNumber: formData.panNumber || undefined,
        passportNumber: formData.passportNumber || undefined,
        visaType: formData.visaType || undefined,
        visaExpiry: formData.visaExpiry || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        allergies: formData.allergies || undefined,
        chronicConditions: formData.chronicConditions || undefined,
        medications: formData.medications || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        doctorName: formData.doctorName || undefined,
        doctorPhone: formData.doctorPhone || undefined,
        photoConsent: formData.photoConsent,
        mediaConsent: formData.mediaConsent,
        medicalConsent: formData.medicalConsent,
        languageProficiency: formData.languageProficiency || undefined,
        specialNeeds: formData.specialNeeds || undefined,
        transportRequired: formData.transportRequired,
        hostelRequired: formData.hostelRequired,
        siblingIds: formData.siblings.length > 0 ? JSON.stringify(formData.siblings) : undefined,
      };

      if (student) {
        await studentApi.update(student.id, payload);
        // Upload any pending docs against existing student
        for (const pd of pendingDocs) {
          await studentApi.uploadDocument(student.id, pd.docType, pd.file).catch(() => {});
        }
        toast({ title: "Success", description: "Student updated successfully" });
      } else {
        const created = await studentApi.create(payload);
        // Upload admission docs right after creation
        if (created?.id && pendingDocs.length > 0) {
          for (const pd of pendingDocs) {
            await studentApi.uploadDocument(created.id, pd.docType, pd.file).catch(() => {});
          }
        }
        toast({ title: "Success", description: `Student added successfully${pendingDocs.length > 0 ? ` with ${pendingDocs.length} document(s)` : ''}` });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save student",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="identification">ID</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="guardian">Guardian</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="medical">Medical</TabsTrigger>
                <TabsTrigger value="documents" className="relative">
                  Documents
                  {pendingDocs.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">{pendingDocs.length}</span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="photo">Photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-muted border">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/placeholder.svg" alt="No photo" className="w-full h-full object-cover opacity-60" />
                      )}
                    </div>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setPhotoFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setPhotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredName">Preferred Name</Label>
                    <Input
                      id="preferredName"
                      value={formData.preferredName}
                      onChange={(e) => setFormData({...formData, preferredName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="admissionNumber">Admission Number</Label>
                    <Input
                      id="admissionNumber"
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({...formData, admissionNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="placeOfBirth">Place of Birth</Label>
                    <Input
                      id="placeOfBirth"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({...formData, placeOfBirth: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                      placeholder="e.g., Indian"
                    />
                  </div>
                  <div>
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="All academic years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All academic years</SelectItem>
                        {academicYears.map((ay) => (
                          <SelectItem key={ay.id} value={ay.name}>{ay.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="class">Class *</Label>
                    <Select value={formData.class} onValueChange={handleClassChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={availableStandards.length === 0 ? "No classes — add in Academics" : "Select class"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStandards.length === 0 ? (
                          <SelectItem value="_none" disabled>No classes configured yet</SelectItem>
                        ) : (
                          availableStandards.map((standard) => (
                            <SelectItem key={standard} value={standard}>{standard}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="section">Section *</Label>
                    <Select
                      value={formData.section}
                      onValueChange={(value) => setFormData({ ...formData, section: value })}
                      disabled={!formData.class || availableSections.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!formData.class ? "Select class first" : availableSections.length === 0 ? "No sections available" : "Select section"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSections.map((section) => (
                          <SelectItem key={section} value={section}>{section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rollNumber">Roll Number *</Label>
                    <Input
                      id="rollNumber"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({...formData, rollNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admissionDate">Admission Date *</Label>
                    <Input
                      id="admissionDate"
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="OBC">OBC</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Identification Tab */}
              <TabsContent value="identification" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="aadharNumber">Aadhar Number (Student)</Label>
                    <Input
                      id="aadharNumber"
                      value={formData.aadharNumber}
                      onChange={(e) => setFormData({...formData, aadharNumber: e.target.value})}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label htmlFor="panNumber">PAN Number (If applicable)</Label>
                    <Input
                      id="panNumber"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({...formData, panNumber: e.target.value})}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="passportNumber">Passport Number</Label>
                    <Input
                      id="passportNumber"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({...formData, passportNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="visaType">Visa Type (for international students)</Label>
                    <Input
                      id="visaType"
                      value={formData.visaType}
                      onChange={(e) => setFormData({...formData, visaType: e.target.value})}
                      placeholder="e.g., Student Visa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="visaExpiry">Visa Expiry Date</Label>
                    <Input
                      id="visaExpiry"
                      type="date"
                      value={formData.visaExpiry}
                      onChange={(e) => setFormData({...formData, visaExpiry: e.target.value})}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="address">Current/Local Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="permanentAddress">Permanent Address</Label>
                  <Textarea
                    id="permanentAddress"
                    value={formData.permanentAddress}
                    onChange={(e) => setFormData({...formData, permanentAddress: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryPhone">Primary Phone</Label>
                    <Input
                      id="primaryPhone"
                      type="tel"
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData({...formData, primaryPhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                    <Input
                      id="secondaryPhone"
                      type="tel"
                      value={formData.secondaryPhone}
                      onChange={(e) => setFormData({...formData, secondaryPhone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Guardian Tab */}
              <TabsContent value="guardian" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="guardianName">Guardian Name *</Label>
                    <Input
                      id="guardianName"
                      value={formData.guardianName}
                      onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianPhone">Guardian Phone *</Label>
                    <Input
                      id="guardianPhone"
                      type="tel"
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianEmail">Guardian Email</Label>
                    <Input
                      id="guardianEmail"
                      type="email"
                      value={formData.guardianEmail}
                      onChange={(e) => setFormData({...formData, guardianEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianOccupation">Occupation</Label>
                    <Input
                      id="guardianOccupation"
                      value={formData.guardianOccupation}
                      onChange={(e) => setFormData({...formData, guardianOccupation: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianAadhar">Guardian Aadhar Number</Label>
                    <Input
                      id="guardianAadhar"
                      value={formData.guardianAadhar}
                      onChange={(e) => setFormData({...formData, guardianAadhar: e.target.value})}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label htmlFor="guardianPan">Guardian PAN Number</Label>
                    <Input
                      id="guardianPan"
                      value={formData.guardianPan}
                      onChange={(e) => setFormData({...formData, guardianPan: e.target.value})}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="siblings">Siblings in School</Label>
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !formData.siblings?.includes(value)) {
                        setFormData({...formData, siblings: [...(formData.siblings || []), value]});
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sibling (if any)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(allStudents as any[])
                        .filter((s: any) => !formData.siblings?.includes(s.id))
                        .map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} - Class {s.class}-{s.section}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {formData.siblings && formData.siblings.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {formData.siblings.map(siblingId => {
                        const sibling = (allStudents as any[]).find((s: any) => s.id === siblingId);
                        return sibling ? (
                          <div key={siblingId} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{sibling.name} - Class {sibling.class}-{sibling.section}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFormData({
                                ...formData, 
                                siblings: formData.siblings?.filter(id => id !== siblingId)
                              })}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Academic Tab */}
              <TabsContent value="academic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="previousSchool">Previous School</Label>
                    <Input
                      id="previousSchool"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({...formData, previousSchool: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="previousClass">Previous Class/Grade</Label>
                    <Input
                      id="previousClass"
                      value={formData.previousClass}
                      onChange={(e) => setFormData({...formData, previousClass: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="transferReason">Transfer Reason</Label>
                    <Textarea
                      id="transferReason"
                      value={formData.transferReason}
                      onChange={(e) => setFormData({...formData, transferReason: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="languageProficiency">Language Proficiency</Label>
                    <Input
                      id="languageProficiency"
                      value={formData.languageProficiency}
                      onChange={(e) => setFormData({...formData, languageProficiency: e.target.value})}
                      placeholder="e.g., English, Hindi, Tamil (comma separated)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialNeeds">Special Educational Needs</Label>
                    <Input
                      id="specialNeeds"
                      value={formData.specialNeeds}
                      onChange={(e) => setFormData({...formData, specialNeeds: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transportRequired"
                      checked={formData.transportRequired}
                      onCheckedChange={(checked) => setFormData({...formData, transportRequired: checked as boolean})}
                    />
                    <Label htmlFor="transportRequired">Transport Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hostelRequired"
                      checked={formData.hostelRequired}
                      onCheckedChange={(checked) => setFormData({...formData, hostelRequired: checked as boolean})}
                    />
                    <Label htmlFor="hostelRequired">Hostel Required</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Medical Tab */}
              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select value={formData.bloodGroup} onValueChange={(value) => setFormData({...formData, bloodGroup: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="allergies">Allergies</Label>
                    <Input
                      id="allergies"
                      value={formData.allergies}
                      onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                      placeholder="e.g., Peanuts, Dust"
                    />
                  </div>
                  <div>
                    <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                    <Input
                      id="chronicConditions"
                      value={formData.chronicConditions}
                      onChange={(e) => setFormData({...formData, chronicConditions: e.target.value})}
                      placeholder="e.g., Asthma, Diabetes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="medications">Regular Medications</Label>
                    <Input
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => setFormData({...formData, medications: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctorName">Family Doctor Name</Label>
                    <Input
                      id="doctorName"
                      value={formData.doctorName}
                      onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="doctorPhone">Doctor Phone</Label>
                    <Input
                      id="doctorPhone"
                      type="tel"
                      value={formData.doctorPhone}
                      onChange={(e) => setFormData({...formData, doctorPhone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-3 mt-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold">Consent & Permissions</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="photoConsent"
                      checked={formData.photoConsent}
                      onCheckedChange={(checked) => setFormData({...formData, photoConsent: checked as boolean})}
                    />
                    <Label htmlFor="photoConsent">Photo/Video Consent (for school use)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mediaConsent"
                      checked={formData.mediaConsent}
                      onCheckedChange={(checked) => setFormData({...formData, mediaConsent: checked as boolean})}
                    />
                    <Label htmlFor="mediaConsent">Media Consent (for publication/social media)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medicalConsent"
                      checked={formData.medicalConsent}
                      onCheckedChange={(checked) => setFormData({...formData, medicalConsent: checked as boolean})}
                    />
                    <Label htmlFor="medicalConsent">Medical Emergency Consent</Label>
                  </div>
                </div>
              </TabsContent>

              {/* ── Admission Documents Tab ───────────────────────────────── */}
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Attach supporting documents required for admission (Birth Certificate, Aadhar, Transfer Certificate, etc.).
                    These will be uploaded automatically when you save the student.
                  </p>
                </div>

                {/* Required document checklist */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Required Documents</h4>
                  {DOCUMENT_TYPES.filter((t) => t.required).map((t) => {
                    const uploaded = pendingDocs.some((d) => d.docType === t.value);
                    return (
                      <div key={t.value} className="flex items-center gap-2 text-sm">
                        <span className={uploaded ? "text-green-600" : "text-amber-600"}>
                          {uploaded ? "✓" : "○"}
                        </span>
                        <span className={uploaded ? "text-green-700 font-medium" : "text-muted-foreground"}>
                          {t.label}
                        </span>
                        {uploaded && <Badge variant="secondary" className="text-[10px] h-4">Attached</Badge>}
                      </div>
                    );
                  })}
                </div>

                {/* Pending docs list */}
                {pendingDocs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Attached Documents ({pendingDocs.length})</h4>
                    {pendingDocs.map((pd, idx) => {
                      const label = DOCUMENT_TYPES.find((t) => t.value === pd.docType)?.label ?? pd.docType;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-lg bg-white">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{pd.file.name}</p>
                              <p className="text-xs text-muted-foreground">{label} · {(pd.file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removePendingDoc(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add document row */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Add Document</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Document Type</Label>
                      <Select value={pendingDocType} onValueChange={setPendingDocType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                              {t.required && <span className="ml-1.5 text-xs text-amber-600">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>File (PDF / JPG / PNG, max 10 MB)</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={!pendingDocType}
                          onClick={() => docFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Browse File
                        </Button>
                        <input
                          ref={docFileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleAddPendingDoc}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : student ? "Update" : "Add"} Student
              </Button>
            </div>
          </form>
    </div>
  );
}
