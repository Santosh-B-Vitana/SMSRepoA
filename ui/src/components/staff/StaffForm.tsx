
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staffApi } from "@/services/api/staffApi";
import { useToast } from "@/hooks/use-toast";

// Local form state shape (UI-friendly, mapped to API on submit)
interface StaffFormData {
  name?: string; id?: string; designation?: string; department?: string;
  subjects?: string[]; phone?: string; email?: string; address?: string;
  joiningDate?: string; status?: 'active' | 'inactive'; dob?: string;
  gender?: string; nationality?: string; religion?: string; maritalStatus?: string;
  experience?: number; confirmationDate?: string; employmentType?: string;
  workingDays?: string; leaveEntitlement?: number; salary?: number;
  aadharNumber?: string; panNumber?: string; passportNumber?: string; licenseNumber?: string;
  bloodGroup?: string; allergies?: string; chronicConditions?: string;
  emergencyContact?: string; emergencyContactPhone?: string;
  doctorName?: string; doctorPhone?: string;
  highestQualification?: string; university?: string; passingYear?: number;
  backgroundVerified?: boolean; policeClearance?: boolean;
  medicalCheckup?: boolean; documentConsent?: boolean;
  photoUrl?: string;
}

interface StaffFormProps {
  staff?: StaffFormData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffForm({ staff, onClose, onSuccess }: StaffFormProps) {
  const [formData, setFormData] = useState<StaffFormData>({
    // Basic Info
    name: staff?.name || "",
    designation: staff?.designation || "",
    department: staff?.department || "",
    subjects: staff?.subjects || [],
    phone: staff?.phone || "",
    email: staff?.email || "",
    address: staff?.address || "",
    joiningDate: staff?.joiningDate || "",
    status: staff?.status || "active",
    // Personal Info
    dob: staff?.dob || "",
    gender: staff?.gender || "",
    nationality: staff?.nationality || "",
    religion: staff?.religion || "",
    maritalStatus: staff?.maritalStatus || "",
    // Professional Info
    experience: staff?.experience || 0,
    confirmationDate: staff?.confirmationDate || "",
    employmentType: staff?.employmentType || "",
    workingDays: staff?.workingDays || "",
    leaveEntitlement: staff?.leaveEntitlement || 0,
    salary: staff?.salary || 0,
    // Identification
    aadharNumber: staff?.aadharNumber || "",
    panNumber: staff?.panNumber || "",
    passportNumber: staff?.passportNumber || "",
    licenseNumber: staff?.licenseNumber || "",
    // Medical Info
    bloodGroup: staff?.bloodGroup || "",
    allergies: staff?.allergies || "",
    chronicConditions: staff?.chronicConditions || "",
    emergencyContact: staff?.emergencyContact || "",
    emergencyContactPhone: staff?.emergencyContactPhone || "",
    doctorName: staff?.doctorName || "",
    doctorPhone: staff?.doctorPhone || "",
    // Additional Education
    highestQualification: staff?.highestQualification || "",
    university: staff?.university || "",
    passingYear: staff?.passingYear ? Number(staff.passingYear) : undefined,
    // Compliance
    backgroundVerified: staff?.backgroundVerified || false,
    policeClearance: staff?.policeClearance || false,
    medicalCheckup: staff?.medicalCheckup || false,
    documentConsent: staff?.documentConsent || false,
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(staff?.photoUrl || null);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();

  const handleChange = (field: keyof StaffFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (value: string) => {
    const subjects = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, subjects }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const nameParts = (formData.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;
      const payload = {
        firstName,
        lastName,
        gender: formData.gender || 'Male',
        dateOfBirth: formData.dob || new Date().toISOString().split('T')[0],
        designation: formData.designation || '',
        department: formData.department || '',
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        phone: formData.phone || '',
        email: formData.email || '',
        qualification: formData.highestQualification,
        experience: formData.experience,
        address: formData.address,
        aadharNumber: formData.aadharNumber,
        panNumber: formData.panNumber,
        passportNumber: formData.passportNumber,
        employmentType: formData.employmentType,
        subjects: formData.subjects?.join(','),
        bankAccountNumber: formData.phone, // placeholder
        emergencyContactName: formData.emergencyContact,
        emergencyContactPhone: formData.emergencyContactPhone,
        status: formData.status || 'active',
        salary: formData.salary,
      };
      if (staff?.id) {
        await staffApi.update(staff.id, payload);
        toast({ title: "Success", description: "Staff member updated successfully" });
      } else {
        await staffApi.create(payload);
        toast({ title: "Success", description: "Staff member added successfully" });
      }
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save staff member", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-6">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10">
          <CardTitle>
            {staff ? "Edit Staff Member" : "Add New Staff Member"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo Upload */}
            <div className="mb-6">
              <Label htmlFor="photo">Photo</Label>
              <div className="flex items-center gap-4 mt-2">
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
                    } else {
                      setPhotoPreview(null);
                    }
                  }}
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="overflow-x-auto">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 min-w-fit">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="identification">Identification</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>
              </div>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input 
                      id="name"
                      placeholder="Full Name"
                      value={formData.name || ""}
                      onChange={e => handleChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation *</Label>
                    <Input 
                      id="designation"
                      placeholder="Job Title"
                      value={formData.designation || ""}
                      onChange={e => handleChange("designation", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={formData.department || ""} onValueChange={value => handleChange("department", value)}>
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
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={formData.email || ""}
                      onChange={e => handleChange("email", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input 
                      id="phone"
                      placeholder="Phone Number"
                      value={formData.phone || ""}
                      onChange={e => handleChange("phone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Joining Date</Label>
                    <Input 
                      id="joiningDate"
                      type="date"
                      value={formData.joiningDate || ""}
                      onChange={e => handleChange("joiningDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                    <Input 
                      id="subjects"
                      placeholder="e.g., Math, Physics, Chemistry"
                      value={formData.subjects?.join(', ') || ""}
                      onChange={e => handleArrayChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status || "active"} onValueChange={value => handleChange("status", value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Full Address"
                    value={formData.address || ""}
                    onChange={e => handleChange("address", e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input 
                      id="dob"
                      type="date"
                      value={formData.dob || ""}
                      onChange={e => handleChange("dob", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender || ""} onValueChange={value => handleChange("gender", value)}>
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
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input 
                      id="nationality"
                      placeholder="Nationality"
                      value={formData.nationality || ""}
                      onChange={e => handleChange("nationality", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <Input 
                      id="religion"
                      placeholder="Religion"
                      value={formData.religion || ""}
                      onChange={e => handleChange("religion", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Select value={formData.maritalStatus || ""} onValueChange={value => handleChange("maritalStatus", value)}>
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
              </TabsContent>

              {/* Professional Tab */}
              <TabsContent value="professional" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (Years)</Label>
                    <Input 
                      id="experience"
                      type="number"
                      placeholder="Years of Experience"
                      value={formData.experience || ""}
                      onChange={e => handleChange("experience", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmationDate">Confirmation Date</Label>
                    <Input 
                      id="confirmationDate"
                      type="date"
                      value={formData.confirmationDate || ""}
                      onChange={e => handleChange("confirmationDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select value={formData.employmentType || ""} onValueChange={value => handleChange("employmentType", value)}>
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
                    <Label htmlFor="workingDays">Working Days</Label>
                    <Input 
                      id="workingDays"
                      placeholder="e.g., Monday to Friday"
                      value={formData.workingDays || ""}
                      onChange={e => handleChange("workingDays", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leaveEntitlement">Leave Entitlement (Days/Year)</Label>
                    <Input 
                      id="leaveEntitlement"
                      type="number"
                      placeholder="Leave Entitlement"
                      value={formData.leaveEntitlement || ""}
                      onChange={e => handleChange("leaveEntitlement", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salary</Label>
                    <Input 
                      id="salary"
                      type="number"
                      placeholder="Monthly Salary"
                      value={formData.salary || ""}
                      onChange={e => handleChange("salary", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Identification Tab */}
              <TabsContent value="identification" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aadhar">Aadhar Number</Label>
                    <Input 
                      id="aadhar"
                      placeholder="Aadhar Number"
                      value={formData.aadharNumber || ""}
                      onChange={e => handleChange("aadharNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input 
                      id="pan"
                      placeholder="PAN Number"
                      value={formData.panNumber || ""}
                      onChange={e => handleChange("panNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport">Passport Number</Label>
                    <Input 
                      id="passport"
                      placeholder="Passport Number"
                      value={formData.passportNumber || ""}
                      onChange={e => handleChange("passportNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license">License Number</Label>
                    <Input 
                      id="license"
                      placeholder="License Number"
                      value={formData.licenseNumber || ""}
                      onChange={e => handleChange("licenseNumber", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Medical Tab */}
              <TabsContent value="medical" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Input 
                      id="bloodGroup"
                      placeholder="Blood Group"
                      value={formData.bloodGroup || ""}
                      onChange={e => handleChange("bloodGroup", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input 
                      id="emergencyContact"
                      placeholder="Contact Name"
                      value={formData.emergencyContact || ""}
                      onChange={e => handleChange("emergencyContact", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input 
                      id="emergencyPhone"
                      placeholder="Phone Number"
                      value={formData.emergencyContactPhone || ""}
                      onChange={e => handleChange("emergencyContactPhone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Doctor Name</Label>
                    <Input 
                      id="doctor"
                      placeholder="Doctor Name"
                      value={formData.doctorName || ""}
                      onChange={e => handleChange("doctorName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctorPhone">Doctor Phone</Label>
                    <Input 
                      id="doctorPhone"
                      placeholder="Doctor Phone"
                      value={formData.doctorPhone || ""}
                      onChange={e => handleChange("doctorPhone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    placeholder="List any allergies"
                    value={formData.allergies || ""}
                    onChange={e => handleChange("allergies", e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                  <Textarea
                    id="chronicConditions"
                    placeholder="List any chronic conditions"
                    value={formData.chronicConditions || ""}
                    onChange={e => handleChange("chronicConditions", e.target.value)}
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="highestQualification">Highest Qualification</Label>
                    <Input 
                      id="highestQualification"
                      placeholder="e.g., B.Tech, M.Sc"
                      value={formData.highestQualification || ""}
                      onChange={e => handleChange("highestQualification", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="university">University</Label>
                    <Input 
                      id="university"
                      placeholder="University Name"
                      value={formData.university || ""}
                      onChange={e => handleChange("university", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passingYear">Passing Year</Label>
                    <Input 
                      id="passingYear"
                      placeholder="Year"
                      value={formData.passingYear || ""}
                      onChange={e => handleChange("passingYear", e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Compliance Status</h4>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={formData.backgroundVerified || false}
                      onChange={e => handleChange("backgroundVerified", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Background Verified</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={formData.policeClearance || false}
                      onChange={e => handleChange("policeClearance", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Police Clearance</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={formData.medicalCheckup || false}
                      onChange={e => handleChange("medicalCheckup", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Medical Checkup Done</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={formData.documentConsent || false}
                      onChange={e => handleChange("documentConsent", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Document Consent</span>
                  </label>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : staff ? "Update" : "Add"} Staff
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

