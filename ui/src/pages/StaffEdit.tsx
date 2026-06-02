import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { staffApi } from "@/services/api/staffApi";
import type { Staff as RealStaff, CreateStaffRequest } from "@/services/api/staffApi";
import { studentApi, StaffChildDto } from "@/services/api/studentApi";
import type { StudentBasic } from "@/services/api/studentApi";

// Extended local state — includes real API fields plus UI-only fields (bloodGroup etc.) kept only in memory
type Staff = RealStaff & {
  name?: string;
  dob?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  personalEmail?: string;
  emergencyContact?: string; // alias for emergencyContactName
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  doctorName?: string;
  doctorPhone?: string;
  highestQualification?: string;
  university?: string;
  passingYear?: number;
  additionalCertifications?: string | string[];
  licenseNumber?: string;
  accountHolderName?: string;
  workingDays?: string;
  leaveEntitlement?: number;
  confirmationDate?: string;
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
};
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StaffEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStaff() {
      if (!id) return;
      try {
        const s = await staffApi.getById(id);
        setStaff({
          ...s,
          name: `${s.firstName} ${s.lastName}`.trim(),
          dob: s.dateOfBirth,
          primaryPhone: s.phone,
          emergencyContact: s.emergencyContactName,
        });
      } catch (err) {
        console.error('Failed to fetch staff:', err);
        setStaff(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, [id]);

  const handleChange = (field: string, value: unknown) => {
    if (!staff) return;
    setStaff({ ...staff, [field]: value });
  };

  const handleArrayChange = (field: string, value: string) => {
    if (!staff) return;
    // Store as comma-separated string (real API expects string for subjects/classes)
    setStaff({ ...staff, [field]: value });
  };

  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    try {
      const payload: Partial<CreateStaffRequest> & { status?: string } = {
        firstName: staff.firstName,
        lastName: staff.lastName,
        gender: staff.gender,
        dateOfBirth: staff.dob || staff.dateOfBirth,
        designation: staff.designation,
        department: staff.department,
        joiningDate: staff.joiningDate,
        phone: staff.primaryPhone || staff.phone,
        email: staff.email,
        address: staff.address,
        permanentAddress: staff.permanentAddress,
        city: staff.city,
        state: staff.state,
        pincode: staff.pincode,
        qualification: staff.qualification,
        experience: staff.experience,
        specialization: staff.specialization,
        employmentType: staff.employmentType,
        subjects: typeof staff.subjects === 'string'
          ? staff.subjects
          : (staff.subjects as string[] | undefined)?.join(', '),
        classes: typeof staff.classes === 'string'
          ? staff.classes
          : (staff.classes as string[] | undefined)?.join(', '),
        aadharNumber: staff.aadharNumber,
        panNumber: staff.panNumber,
        passportNumber: staff.passportNumber,
        bankName: staff.bankName,
        bankAccountNumber: staff.bankAccountNumber,
        ifscCode: staff.ifscCode,
        emergencyContactName: staff.emergencyContact || staff.emergencyContactName,
        emergencyContactPhone: staff.emergencyContactPhone,
        emergencyContactRelationship: staff.emergencyContactRelationship,
        status: staff.status,
        salary: staff.salary,
      };
      await staffApi.update(staff.id, payload);
      toast({
        title: "Success",
        description: "Staff profile updated successfully",
      });
      navigate(`/staff/${staff.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update staff profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading staff...</div>;
  }
  
  if (!staff) {
    return <div className="p-8 text-center text-red-500">Staff member not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Button 
          onClick={() => navigate(`/staff/${staff.id}`)} 
          variant="outline" 
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Edit Staff Profile</h1>
          <p className="text-muted-foreground">Update staff member information</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 min-w-[500px]">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="identification">Identification</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
          </TabsList>
        </div>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name *</label>
                  <Input 
                    placeholder="First Name" 
                    value={staff.firstName || ""} 
                    onChange={e => handleChange("firstName", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name *</label>
                  <Input 
                    placeholder="Last Name" 
                    value={staff.lastName || ""} 
                    onChange={e => handleChange("lastName", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input 
                    type="date" 
                    value={staff.dob || staff.dateOfBirth || ""} 
                    onChange={e => { handleChange("dob", e.target.value); handleChange("dateOfBirth", e.target.value); }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gender</label>
                  <Select value={staff.gender || ""} onValueChange={value => handleChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nationality</label>
                  <Input 
                    placeholder="Nationality" 
                    value={staff.nationality || ""} 
                    onChange={e => handleChange("nationality", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Religion</label>
                  <Input 
                    placeholder="Religion" 
                    value={staff.religion || ""} 
                    onChange={e => handleChange("religion", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marital Status</label>
                  <Select value={staff.maritalStatus || ""} onValueChange={value => handleChange("maritalStatus", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unmarried">Unmarried</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/staff/${staff.id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Tab */}
        <TabsContent value="professional">
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Designation *</label>
                  <Input 
                    placeholder="Job Title" 
                    value={staff.designation} 
                    onChange={e => handleChange("designation", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department *</label>
                  <Select value={staff.department} onValueChange={value => handleChange("department", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Physical Education">Physical Education</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                      <SelectItem value="Support Staff">Support Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subjects (comma-separated)</label>
                  <Input 
                    placeholder="e.g., Algebra, Geometry, Calculus" 
                    value={typeof staff.subjects === 'string' ? staff.subjects : staff.subjects?.join(', ') || ""} 
                    onChange={e => handleArrayChange("subjects", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience (Years)</label>
                  <Input 
                    type="number" 
                    placeholder="Years of Experience" 
                    value={staff.experience || ""} 
                    onChange={e => handleChange("experience", parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Joining Date</label>
                  <Input 
                    type="date" 
                    value={staff.joiningDate} 
                    onChange={e => handleChange("joiningDate", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmation Date</label>
                  <Input 
                    type="date" 
                    value={staff.confirmationDate || ""} 
                    onChange={e => handleChange("confirmationDate", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employment Type</label>
                  <Select value={staff.employmentType || ""} onValueChange={value => handleChange("employmentType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time Permanent">Full-time Permanent</SelectItem>
                      <SelectItem value="Full-time Contract">Full-time Contract</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Working Days</label>
                  <Input 
                    placeholder="e.g., Monday to Friday" 
                    value={staff.workingDays || ""} 
                    onChange={e => handleChange("workingDays", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Entitlement (Days/Year)</label>
                  <Input 
                    type="number" 
                    placeholder="Leave Entitlement" 
                    value={staff.leaveEntitlement || ""} 
                    onChange={e => handleChange("leaveEntitlement", parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Salary</label>
                  <Input 
                    type="number" 
                    placeholder="Monthly Salary" 
                    value={staff.salary || ""} 
                    onChange={e => handleChange("salary", parseInt(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={staff.status} onValueChange={value => handleChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/staff/${staff.id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary Phone *</label>
                  <Input 
                    placeholder="Phone Number" 
                    value={staff.primaryPhone || staff.phone || ""} 
                    onChange={e => handleChange("primaryPhone", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secondary Phone</label>
                  <Input 
                    placeholder="Secondary Phone" 
                    value={staff.secondaryPhone || ""} 
                    onChange={e => handleChange("secondaryPhone", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Official Email *</label>
                  <Input 
                    placeholder="Official Email" 
                    value={staff.email} 
                    onChange={e => handleChange("email", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Personal Email</label>
                  <Input 
                    placeholder="Personal Email" 
                    value={staff.personalEmail || ""} 
                    onChange={e => handleChange("personalEmail", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Address *</label>
                  <Input 
                    placeholder="Current Address" 
                    value={staff.address} 
                    onChange={e => handleChange("address", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Permanent Address</label>
                  <Input 
                    placeholder="Permanent Address" 
                    value={staff.permanentAddress || ""} 
                    onChange={e => handleChange("permanentAddress", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact Name</label>
                  <Input 
                    placeholder="Emergency Contact Name" 
                    value={staff.emergencyContact || ""} 
                    onChange={e => handleChange("emergencyContact", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact Phone</label>
                  <Input 
                    placeholder="Emergency Contact Phone" 
                    value={staff.emergencyContactPhone || ""} 
                    onChange={e => handleChange("emergencyContactPhone", e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/staff/${staff.id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Identification Tab */}
        <TabsContent value="identification">
          <Card>
            <CardHeader>
              <CardTitle>Identification Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aadhar Number</label>
                  <Input 
                    placeholder="e.g., 1234-5678-9012" 
                    value={staff.aadharNumber || ""} 
                    onChange={e => handleChange("aadharNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PAN Number</label>
                  <Input 
                    placeholder="e.g., ABCD1234E" 
                    value={staff.panNumber || ""} 
                    onChange={e => handleChange("panNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Passport Number</label>
                  <Input 
                    placeholder="Passport Number" 
                    value={staff.passportNumber || ""} 
                    onChange={e => handleChange("passportNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">License Number</label>
                  <Input 
                    placeholder="License Number" 
                    value={staff.licenseNumber || ""} 
                    onChange={e => handleChange("licenseNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <h3 className="font-semibold text-sm mt-4 mb-3">Bank Details</h3>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Account Number</label>
                  <Input 
                    placeholder="Account Number" 
                    value={staff.bankAccountNumber || ""} 
                    onChange={e => handleChange("bankAccountNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bank Name</label>
                  <Input 
                    placeholder="Bank Name" 
                    value={staff.bankName || ""} 
                    onChange={e => handleChange("bankName", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">IFSC Code</label>
                  <Input 
                    placeholder="IFSC Code" 
                    value={staff.ifscCode || ""} 
                    onChange={e => handleChange("ifscCode", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account Holder Name</label>
                  <Input 
                    placeholder="Account Holder Name" 
                    value={staff.accountHolderName || ""} 
                    onChange={e => handleChange("accountHolderName", e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/staff/${staff.id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical">
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Blood Group</label>
                  <Select value={staff.bloodGroup || ""} onValueChange={value => handleChange("bloodGroup", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Allergies</label>
                  <Input 
                    placeholder="Any allergies" 
                    value={staff.allergies || ""} 
                    onChange={e => handleChange("allergies", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chronic Conditions</label>
                  <Input 
                    placeholder="Any chronic conditions" 
                    value={staff.chronicConditions || ""} 
                    onChange={e => handleChange("chronicConditions", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Doctor Name</label>
                  <Input 
                    placeholder="Doctor Name" 
                    value={staff.doctorName || ""} 
                    onChange={e => handleChange("doctorName", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Doctor Phone</label>
                  <Input 
                    placeholder="Doctor Phone" 
                    value={staff.doctorPhone || ""} 
                    onChange={e => handleChange("doctorPhone", e.target.value)} 
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-4">Qualifications & Certifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Highest Qualification</label>
                    <Input 
                      placeholder="e.g., M.Sc, M.A" 
                      value={staff.highestQualification || ""} 
                      onChange={e => handleChange("highestQualification", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">University</label>
                    <Input 
                      placeholder="University Name" 
                      value={staff.university || ""} 
                      onChange={e => handleChange("university", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Passing Year</label>
                    <Input 
                      type="number" 
                      placeholder="e.g., 2014" 
                      value={staff.passingYear || ""} 
                      onChange={e => handleChange("passingYear", parseInt(e.target.value) || undefined)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Qualification</label>
                    <Input 
                      placeholder="e.g., M.Ed, Ph.D" 
                      value={staff.qualification || ""} 
                      onChange={e => handleChange("qualification", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Additional Certifications (comma-separated)</label>
                    <Input 
                      placeholder="e.g., Certified Trainer, Quality Manager" 
                    value={typeof staff.additionalCertifications === 'string' ? staff.additionalCertifications : staff.additionalCertifications?.join(', ') || ""} 
                      onChange={e => handleArrayChange("additionalCertifications", e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/staff/${staff.id}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Children Tab */}
        <ChildrenTab staffId={id!} />
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Children Tab — Link enrolled students who are children of this staff member
// ---------------------------------------------------------------------------
function ChildrenTab({ staffId }: { staffId: string }) {
  const [linkedChildren, setLinkedChildren] = useState<StaffChildDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentBasic[]>([]);
  const [searching, setSearching] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    staffApi.getChildren(staffId)
      .then(c => setLinkedChildren(Array.isArray(c) ? c : []))
      .catch(() => setLinkedChildren([]))
      .finally(() => setLoading(false));
  }, [staffId]);

  const searchStudents = async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await studentApi.list({ search: q, pageSize: 10 });
      setResults(res.students || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLink = async (student: StudentBasic) => {
    setWorking(student.id);
    try {
      await studentApi.setGuardianStaff(student.id, staffId);
      setLinkedChildren(prev => [...prev, {
        id: student.id as unknown as import('@/services/api/studentApi').StaffChildDto['id'],
        name: student.name,
        admissionNumber: student.admissionNumber,
        class: student.class,
        section: student.section,
        status: student.status,
      } as StaffChildDto]);
      setResults(prev => prev.filter(s => s.id !== student.id));
      toast.success(`${student.name} linked as child`);
    } catch {
      toast.error("Failed to link student");
    } finally {
      setWorking(null);
    }
  };

  const handleUnlink = async (child: StaffChildDto) => {
    setWorking(String(child.id));
    try {
      await studentApi.setGuardianStaff(String(child.id), null);
      setLinkedChildren(prev => prev.filter(c => c.id !== child.id));
      toast.success(`${child.name} unlinked`);
    } catch {
      toast.error("Failed to unlink student");
    } finally {
      setWorking(null);
    }
  };

  return (
    <TabsContent value="children">
      <Card>
        <CardHeader>
          <CardTitle>Children in School</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Link enrolled students who are children of this staff member. Enables staff-child fee concessions.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Linked children list */}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : linkedChildren.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No students linked yet.</p>
          ) : (
            <div className="space-y-2">
              {linkedChildren.map(child => (
                <div key={String(child.id)} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{child.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {child.admissionNumber ? `${child.admissionNumber} · ` : ''}Class {child.class}-{child.section}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                    disabled={working === String(child.id)}
                    onClick={() => handleUnlink(child)}
                  >
                    {working === String(child.id) ? '…' : 'Unlink'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Search & link */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Search &amp; Link Student</Label>
            <Input
              placeholder="Type student name…"
              value={search}
              onChange={e => { setSearch(e.target.value); searchStudents(e.target.value); }}
            />
            {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
            {results.length > 0 && (
              <div className="border rounded-md overflow-hidden max-h-56 overflow-y-auto">
                {results
                  .filter(s => !linkedChildren.find(c => String(c.id) === s.id))
                  .map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent text-sm">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">Class {s.class}-{s.section}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working === s.id}
                        onClick={() => { handleLink(s); setSearch(''); setResults([]); }}
                      >
                        {working === s.id ? 'Linking…' : 'Link as Child'}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}