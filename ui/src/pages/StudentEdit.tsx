import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Student, CreateStudentRequest, studentApi, GuardianStaffDto, StudentBasic } from "@/services/api/studentApi";
import { staffApi, type StaffBasic } from "@/services/api/staffApi";

/** Convert ISO datetime string from backend to YYYY-MM-DD for date inputs */
function toDateInput(iso?: string): string {
  if (!iso) return "";
  return iso.split("T")[0];
}

export default function StudentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Guardian email (stored in StudentGuardians table, not directly on student)
  const [guardianEmail, setGuardianEmail] = useState("");

  // Siblings state
  const [siblings, setSiblings] = useState<StudentBasic[]>([]);
  const [siblingSearch, setSiblingSearch] = useState("");
  const [siblingResults, setSiblingResults] = useState<StudentBasic[]>([]);
  const [siblingSearching, setSiblingSearching] = useState(false);
  const [siblingWorking, setSiblingWorking] = useState(false);

  const searchSiblings = async (q: string) => {
    if (!q.trim()) { setSiblingResults([]); return; }
    setSiblingSearching(true);
    try {
      const res = await studentApi.list({ search: q, pageSize: 10 });
      const currentSiblingIds = new Set(siblings.map(s => s.id));
      setSiblingResults((res.students || []).filter(s => s.id !== id && !currentSiblingIds.has(s.id)));
    } catch {
      setSiblingResults([]);
    } finally {
      setSiblingSearching(false);
    }
  };

  const handleAddSibling = async (sib: StudentBasic) => {
    if (!id) return;
    setSiblingWorking(true);
    try {
      await studentApi.addSibling(id, sib.id);
      setSiblings(prev => [...prev, sib]);
      setSiblingSearch("");
      setSiblingResults([]);
      toast.success(`${sib.name} linked as sibling`);
    } catch {
      toast.error("Failed to link sibling");
    } finally {
      setSiblingWorking(false);
    }
  };

  const handleRemoveSibling = async (sibId: string, sibName: string) => {
    if (!id) return;
    setSiblingWorking(true);
    try {
      await studentApi.removeSibling(id, sibId);
      setSiblings(prev => prev.filter(s => s.id !== sibId));
      toast.success(`${sibName} unlinked`);
    } catch {
      toast.error("Failed to unlink sibling");
    } finally {
      setSiblingWorking(false);
    }
  };

  // Guardian staff link state
  const [guardianStaff, setGuardianStaff] = useState<GuardianStaffDto | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffResults, setStaffResults] = useState<StaffBasic[]>([]);
  const [staffSearching, setStaffSearching] = useState(false);
  const [linkingStaff, setLinkingStaff] = useState(false);

  const searchStaff = async (q: string) => {
    if (!q.trim()) { setStaffResults([]); return; }
    setStaffSearching(true);
    try {
      const res = await staffApi.list({ search: q, pageSize: 10 });
      setStaffResults(res.staff || []);
    } catch {
      setStaffResults([]);
    } finally {
      setStaffSearching(false);
    }
  };

  const handleLinkStaff = async (s: StaffBasic) => {
    if (!id) return;
    setLinkingStaff(true);
    try {
      await studentApi.setGuardianStaff(id, s.id);
      setGuardianStaff({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim(), designation: s.designation, department: s.department });
      setStaffSearch("");
      setStaffResults([]);
      toast.success(`${s.firstName} ${s.lastName} linked as guardian`);
    } catch {
      toast.error("Failed to link staff");
    } finally {
      setLinkingStaff(false);
    }
  };

  const handleUnlinkStaff = async () => {
    if (!id) return;
    setLinkingStaff(true);
    try {
      await studentApi.setGuardianStaff(id, null);
      setGuardianStaff(null);
      toast.success("Guardian staff removed");
    } catch {
      toast.error("Failed to unlink staff");
    } finally {
      setLinkingStaff(false);
    }
  };

  useEffect(() => {
    async function fetchStudent() {
      if (!id) return;
      try {
        const data = await studentApi.getById(id);
        setStudent(data);
        // Pre-fill guardian email from the guardians relation
        if (data.guardians && data.guardians.length > 0) {
          setGuardianEmail(data.guardians[0].email || "");
        }
        // Load sibling list
        try { const sibs = await studentApi.getSiblings(id); setSiblings(sibs); } catch { /* ok */ }
        // Load current guardian staff
        try { const gs = await studentApi.getGuardianStaff(id); setGuardianStaff(gs); } catch { /* ok */ }
      } catch {
        toast.error("Failed to load student");
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id, toast]);

  const handleChange = <K extends keyof Student>(field: K, value: Student[K]) => {
    if (!student) return;
    setStudent({ ...student, [field]: value });
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const payload: Partial<CreateStudentRequest> = {
        name: student.name,
        preferredName: student.preferredName || undefined,
        admissionNumber: student.admissionNumber,
        class: student.class,
        section: student.section,
        rollNumber: student.rollNumber || undefined,
        dateOfBirth: toDateInput(student.dateOfBirth),
        placeOfBirth: student.placeOfBirth || undefined,
        gender: student.gender || undefined,
        nationality: student.nationality || undefined,
        status: student.status,
        admissionDate: toDateInput(student.admissionDate),
        address: student.address,
        permanentAddress: student.permanentAddress || undefined,
        primaryPhone: student.primaryPhone || undefined,
        secondaryPhone: student.secondaryPhone || undefined,
        email: student.email || undefined,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        guardianEmail: guardianEmail || undefined,
        previousSchool: student.previousSchool || undefined,
        previousClass: student.previousClass || undefined,
        transferReason: student.transferReason || undefined,
        category: student.category,
        aadharNumber: student.aadharNumber || undefined,
        panNumber: student.panNumber || undefined,
        passportNumber: student.passportNumber || undefined,
        visaType: student.visaType || undefined,
        visaExpiry: student.visaExpiry || undefined,
        bloodGroup: student.bloodGroup || undefined,
        allergies: student.allergies || undefined,
        chronicConditions: student.chronicConditions || undefined,
        medications: student.medications || undefined,
        emergencyContact: student.emergencyContact || undefined,
        emergencyPhone: student.emergencyPhone || undefined,
        doctorName: student.doctorName || undefined,
        doctorPhone: student.doctorPhone || undefined,
        photoConsent: student.photoConsent,
        mediaConsent: student.mediaConsent,
        medicalConsent: student.medicalConsent,
        languageProficiency: student.languageProficiency || undefined,
        specialNeeds: student.specialNeeds || undefined,
        transportRequired: student.transportRequired,
        hostelRequired: student.hostelRequired,
      };
      await studentApi.update(student.id, payload);
      toast.success("Student updated successfully");
      navigate(`/students/${student.id}`);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };;

  if (loading) {
    return <div className="p-8 text-center">Loading student...</div>;
  }
  if (!student) {
    return <div className="p-8 text-center text-red-500">Student not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <Button variant="ghost" className="mb-4 flex items-center" onClick={() => navigate(-1)}>
        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Student — {student.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="guardian">Guardian</TabsTrigger>
              <TabsTrigger value="siblings">Siblings</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="staff-parent">Staff Parent</TabsTrigger>
            </TabsList>

            {/* Personal */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input value={student.name} onChange={e => handleChange("name", e.target.value)} placeholder="Full Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Name</label>
                  <Input value={student.preferredName || ""} onChange={e => handleChange("preferredName", e.target.value)} placeholder="Preferred Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admission Number</label>
                  <Input value={student.admissionNumber || ""} onChange={e => handleChange("admissionNumber", e.target.value)} placeholder="Admission Number" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth *</label>
                  <Input type="date" value={toDateInput(student.dateOfBirth)} onChange={e => handleChange("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Place of Birth</label>
                  <Input value={student.placeOfBirth || ""} onChange={e => handleChange("placeOfBirth", e.target.value)} placeholder="Place of Birth" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select value={student.gender || ""} onChange={e => handleChange("gender", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nationality</label>
                  <Input value={student.nationality || ""} onChange={e => handleChange("nationality", e.target.value)} placeholder="e.g. Indian" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={student.status} onChange={e => handleChange("status", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Academic */}
            <TabsContent value="academic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class *</label>
                  <Input value={student.class} onChange={e => handleChange("class", e.target.value)} placeholder="Class" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Section *</label>
                  <Input value={student.section} onChange={e => handleChange("section", e.target.value)} placeholder="Section" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Roll Number *</label>
                  <Input value={student.rollNumber || ""} onChange={e => handleChange("rollNumber", e.target.value)} placeholder="Roll Number" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <Input value={student.category} onChange={e => handleChange("category", e.target.value)} placeholder="Category" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Admission Date *</label>
                  <Input type="date" value={toDateInput(student.admissionDate)} onChange={e => handleChange("admissionDate", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Previous School</label>
                  <Input value={student.previousSchool || ""} onChange={e => handleChange("previousSchool", e.target.value)} placeholder="Previous School" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Previous Class</label>
                  <Input value={student.previousClass || ""} onChange={e => handleChange("previousClass", e.target.value)} placeholder="Previous Class" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Transfer Reason</label>
                  <Input value={student.transferReason || ""} onChange={e => handleChange("transferReason", e.target.value)} placeholder="Transfer Reason" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Language Proficiency</label>
                  <Input value={student.languageProficiency || ""} onChange={e => handleChange("languageProficiency", e.target.value)} placeholder="Languages (comma-separated)" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Special Needs</label>
                  <Input value={student.specialNeeds || ""} onChange={e => handleChange("specialNeeds", e.target.value)} placeholder="Special Needs" />
                </div>
              </div>
            </TabsContent>

            {/* Guardian */}
            <TabsContent value="guardian" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Guardian Name *</label>
                  <Input value={student.guardianName} onChange={e => handleChange("guardianName", e.target.value)} placeholder="Guardian Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guardian Phone *</label>
                  <Input value={student.guardianPhone} onChange={e => handleChange("guardianPhone", e.target.value)} placeholder="Guardian Phone" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Parent Portal Login Email *</label>
                  <Input
                    type="email"
                    value={guardianEmail}
                    onChange={e => setGuardianEmail(e.target.value)}
                    placeholder="parent@example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This email is used as the parent&apos;s username for the Parent Portal.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address (Local/Current) *</label>
                  <Input value={student.address} onChange={e => handleChange("address", e.target.value)} placeholder="Address" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Permanent Address</label>
                  <Input value={student.permanentAddress || ""} onChange={e => handleChange("permanentAddress", e.target.value)} placeholder="Permanent Address" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Primary Phone</label>
                  <Input value={student.primaryPhone || ""} onChange={e => handleChange("primaryPhone", e.target.value)} placeholder="Primary Phone" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secondary Phone</label>
                  <Input value={student.secondaryPhone || ""} onChange={e => handleChange("secondaryPhone", e.target.value)} placeholder="Secondary Phone" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input type="email" value={student.email || ""} onChange={e => handleChange("email", e.target.value)} placeholder="Email" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                  <Input value={student.emergencyContact || ""} onChange={e => handleChange("emergencyContact", e.target.value)} placeholder="Emergency Contact Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emergency Phone</label>
                  <Input value={student.emergencyPhone || ""} onChange={e => handleChange("emergencyPhone", e.target.value)} placeholder="Emergency Phone" />
                </div>
              </div>
            </TabsContent>

            {/* Siblings */}
            <TabsContent value="siblings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Siblings in School</h4>
                  <p className="text-sm text-muted-foreground">
                    Link brothers or sisters of this student who are also enrolled in the school.
                  </p>
                </div>

                {siblings.length > 0 ? (
                  <div className="space-y-2">
                    {siblings.map(sib => (
                      <div key={sib.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{sib.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sib.class} – {sib.section}
                            {sib.rollNumber ? ` · Roll ${sib.rollNumber}` : ""}
                            {sib.admissionNumber ? ` · Adm# ${sib.admissionNumber}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                          disabled={siblingWorking}
                          onClick={() => handleRemoveSibling(sib.id, sib.name)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No siblings linked yet.</p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <label className="block text-sm font-medium">Search &amp; Link Sibling</label>
                  <Input
                    placeholder="Type student name…"
                    value={siblingSearch}
                    onChange={e => { setSiblingSearch(e.target.value); searchSiblings(e.target.value); }}
                  />
                  {siblingSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
                  {siblingResults.length > 0 && (
                    <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto">
                      {siblingResults.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent text-sm">
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.class} – {s.section} · Adm# {s.admissionNumber}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={siblingWorking}
                            onClick={() => handleAddSibling(s)}
                          >
                            {siblingWorking ? "Linking…" : "Link as Sibling"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Medical */}
            <TabsContent value="medical" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Group</label>
                  <select value={student.bloodGroup || ""} onChange={e => handleChange("bloodGroup", e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="">Select Blood Group</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Allergies</label>
                  <Input value={student.allergies || ""} onChange={e => handleChange("allergies", e.target.value)} placeholder="Allergies" /></div>
                <div><label className="block text-sm font-medium mb-1">Chronic Conditions</label>
                  <Input value={student.chronicConditions || ""} onChange={e => handleChange("chronicConditions", e.target.value)} placeholder="Chronic Conditions" /></div>
                <div><label className="block text-sm font-medium mb-1">Current Medications</label>
                  <Input value={student.medications || ""} onChange={e => handleChange("medications", e.target.value)} placeholder="Medications" /></div>
                <div><label className="block text-sm font-medium mb-1">Doctor Name</label>
                  <Input value={student.doctorName || ""} onChange={e => handleChange("doctorName", e.target.value)} placeholder="Doctor Name" /></div>
                <div><label className="block text-sm font-medium mb-1">Doctor Phone</label>
                  <Input value={student.doctorPhone || ""} onChange={e => handleChange("doctorPhone", e.target.value)} placeholder="Doctor Phone" /></div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Consents</h4>
                {(["photoConsent","mediaConsent","medicalConsent"] as const).map(key => (
                  <div key={key} className="flex items-center space-x-2">
                    <input type="checkbox" id={key} checked={student[key] as boolean}
                      onChange={e => handleChange(key, e.target.checked)} className="w-4 h-4" />
                    <label htmlFor={key} className="text-sm capitalize">{key.replace("Consent"," Consent")}</label>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Documents / IDs */}
            <TabsContent value="documents" className="space-y-4">
              <h4 className="font-medium">Identification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Aadhar Number</label>
                  <Input value={student.aadharNumber || ""} onChange={e => handleChange("aadharNumber", e.target.value)} placeholder="XXXX-XXXX-XXXX" /></div>
                <div><label className="block text-sm font-medium mb-1">PAN Number</label>
                  <Input value={student.panNumber || ""} onChange={e => handleChange("panNumber", e.target.value)} placeholder="ABCDE1234F" /></div>
                <div><label className="block text-sm font-medium mb-1">Passport Number</label>
                  <Input value={student.passportNumber || ""} onChange={e => handleChange("passportNumber", e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Visa Type</label>
                  <Input value={student.visaType || ""} onChange={e => handleChange("visaType", e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-1">Visa Expiry Date</label>
                  <Input type="date" value={toDateInput(student.visaExpiry)} onChange={e => handleChange("visaExpiry", e.target.value)} /></div>
              </div>
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Facilities</h4>
                {(["transportRequired","hostelRequired"] as const).map(key => (
                  <div key={key} className="flex items-center space-x-2">
                    <input type="checkbox" id={key} checked={student[key] as boolean}
                      onChange={e => handleChange(key, e.target.checked)} className="w-4 h-4" />
                    <label htmlFor={key} className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</label>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Staff Parent Link */}
            <TabsContent value="staff-parent" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Parent / Guardian — Staff Member Link</h4>
                  <p className="text-sm text-muted-foreground">
                    If this student's parent is a staff member at the school, link them here to enable staff-child fee concessions.
                  </p>
                </div>

                {guardianStaff ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700">
                        {guardianStaff.name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="font-semibold">{guardianStaff.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {guardianStaff.designation}{guardianStaff.department ? ` · ${guardianStaff.department}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="default">Linked</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                        disabled={linkingStaff}
                        onClick={handleUnlinkStaff}
                      >
                        {linkingStaff ? "Unlinking…" : "Unlink"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No staff member linked as guardian.</p>
                )}

                {/* Search for staff */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Search Staff Member</label>
                  <Input
                    placeholder="Type staff name…"
                    value={staffSearch}
                    onChange={e => { setStaffSearch(e.target.value); searchStaff(e.target.value); }}
                  />
                  {staffSearching && <p className="text-xs text-muted-foreground">Searching…</p>}
                  {staffResults.length > 0 && (
                    <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto">
                      {staffResults.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent text-sm">
                          <div>
                            <p className="font-medium">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-muted-foreground">{s.designation} · {s.department}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={linkingStaff || guardianStaff?.id === s.id}
                            onClick={() => handleLinkStaff(s)}
                          >
                            {guardianStaff?.id === s.id ? "Current" : linkingStaff ? "Linking…" : "Link as Guardian"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-8">
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
