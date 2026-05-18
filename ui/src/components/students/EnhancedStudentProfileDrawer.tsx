import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentApi, type Student } from "@/services/api/studentApi";
import placeholderImg from '/placeholder.svg';
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Phone, Mail, MapPin, Heart, FileText, Shield } from "lucide-react";

function SiblingInfo({ siblingId }: { siblingId: string }) {
  const [sibling, setSibling] = useState<Student | null>(null);
  
  useEffect(() => {
    studentApi.getById(siblingId).then(setSibling).catch(() => setSibling(null));
  }, [siblingId]);
  
  if (!sibling) return null;
  
  return (
    <div className="flex items-center gap-3 p-2 bg-background rounded border">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-medium text-sm">{sibling.name}</div>
        <div className="text-xs text-muted-foreground">
          Class {sibling.class}-{sibling.section} • Roll No: {sibling.rollNumber}
        </div>
      </div>
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}

function InfoField({ label, value, icon }: InfoFieldProps) {
  if (!value) return null;
  
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function EnhancedStudentProfileDrawer({ studentId, open, onClose }: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (open && studentId) {
      setLoading(true);
      studentApi.getById(studentId).then(setStudent).finally(() => setLoading(false));
    }
  }, [open, studentId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>
        <div className="p-6">
          {loading || !student ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Header with Photo */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <span className="inline-block w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-border">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={placeholderImg} alt="No photo" className="w-full h-full object-cover opacity-60" />
                    )}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold">{student.name}</div>
                  {student.preferredName && (
                    <div className="text-sm text-muted-foreground">"{student.preferredName}"</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                      {student.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Class {student.class}-{student.section} • Roll {student.rollNo}
                    </span>
                    {student.admissionNo && (
                      <span className="text-sm text-muted-foreground">• Adm. No: {student.admissionNo}</span>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="contact">Contact</TabsTrigger>
                  <TabsTrigger value="guardian">Guardian</TabsTrigger>
                  <TabsTrigger value="academic">Academic</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                </TabsList>

                {/* Basic Information */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <InfoField label="Date of Birth" value={student.dob} />
                    <InfoField label="Place of Birth" value={student.placeOfBirth} />
                    <InfoField label="Gender" value={student.gender} />
                    <InfoField label="Nationality" value={student.nationality?.[0]} />
                    <InfoField label="Category" value={student.category} />
                    <InfoField label="Admission Date" value={student.admissionDate} />
                  </div>

                  {/* Identification */}
                  {(student.aadharNumber || student.passportNumber || student.panNumber) && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Identification Documents
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <InfoField label="Aadhar Number" value={student.aadharNumber} />
                        <InfoField label="PAN Number" value={student.panNumber} />
                        <InfoField label="Passport Number" value={student.passportNumber} />
                        <InfoField label="Visa Type" value={student.visaType} />
                        <InfoField label="Visa Expiry" value={student.visaExpiry} />
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Contact Information */}
                <TabsContent value="contact" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <InfoField 
                      label="Current Address" 
                      value={student.address} 
                      icon={<MapPin className="h-3 w-3" />}
                    />
                    <InfoField 
                      label="Permanent Address" 
                      value={student.permanentAddress} 
                      icon={<MapPin className="h-3 w-3" />}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField 
                        label="Primary Phone" 
                        value={student.primaryPhone} 
                        icon={<Phone className="h-3 w-3" />}
                      />
                      <InfoField 
                        label="Secondary Phone" 
                        value={student.secondaryPhone} 
                        icon={<Phone className="h-3 w-3" />}
                      />
                      <InfoField 
                        label="Email" 
                        value={student.email} 
                        icon={<Mail className="h-3 w-3" />}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Guardian Information */}
                <TabsContent value="guardian" className="space-y-4 mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-3">Primary Guardian</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Name" value={student.guardianName} />
                      <InfoField label="Phone" value={student.guardianPhone} />
                      {student.guardians?.[0] && (
                        <>
                          <InfoField label="Email" value={student.guardians[0].email} />
                          <InfoField label="Occupation" value={student.guardians[0].occupation} />
                          <InfoField label="Aadhar" value={student.guardians[0].aadharNumber} />
                          <InfoField label="PAN" value={student.guardians[0].panNumber} />
                        </>
                      )}
                    </div>
                  </div>

                  {student.emergencyContact && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Emergency Contact
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoField label="Name" value={student.emergencyContact} />
                        <InfoField label="Phone" value={student.emergencyPhone} />
                      </div>
                    </div>
                  )}

                  {/* Siblings */}
                  {student.siblings && student.siblings.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Siblings in School
                      </h4>
                      <div className="space-y-2">
                        {student.siblings.map(siblingId => (
                          <SiblingInfo key={siblingId} siblingId={siblingId} />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Academic Information */}
                <TabsContent value="academic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Previous School" value={student.previousSchool} />
                    <InfoField label="Previous Class" value={student.previousClass} />
                    <InfoField label="Transfer Reason" value={student.transferReason} />
                    <InfoField 
                      label="Language Proficiency" 
                      value={student.languageProficiency?.join(", ")} 
                    />
                    <InfoField label="Special Needs" value={student.specialNeeds} />
                  </div>

                  <div className="flex gap-4 mt-4">
                    {student.transportRequired && (
                      <Badge variant="outline">Transport Required</Badge>
                    )}
                    {student.hostelRequired && (
                      <Badge variant="outline">Hostel Required</Badge>
                    )}
                  </div>
                </TabsContent>

                {/* Medical Information */}
                <TabsContent value="medical" className="space-y-4 mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Medical Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Blood Group" value={student.bloodGroup} />
                      <InfoField label="Allergies" value={student.allergies} />
                      <InfoField label="Chronic Conditions" value={student.chronicConditions} />
                      <InfoField label="Regular Medications" value={student.medications} />
                      <InfoField label="Family Doctor" value={student.doctorName} />
                      <InfoField label="Doctor Phone" value={student.doctorPhone} />
                    </div>
                  </div>

                  {/* Consent Status */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-3">Consent & Permissions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={student.photoConsent ? "default" : "secondary"}>
                          {student.photoConsent ? "✓" : "✗"}
                        </Badge>
                        <span className="text-sm">Photo/Video Consent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.mediaConsent ? "default" : "secondary"}>
                          {student.mediaConsent ? "✓" : "✗"}
                        </Badge>
                        <span className="text-sm">Media Publication Consent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.medicalConsent ? "default" : "secondary"}>
                          {student.medicalConsent ? "✓" : "✗"}
                        </Badge>
                        <span className="text-sm">Medical Emergency Consent</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <Button
                  variant="default"
                  disabled={actionLoading}
                  onClick={() => {
                    if (student) navigate(`/students/${student.id}/edit`);
                  }}
                >Edit</Button>
                {student.status === 'active' ? (
                  <Button
                    variant="destructive"
                    disabled={actionLoading}
                    onClick={async () => {
                      if (!student) return;
                      setActionLoading(true);
                      await studentApi.update(student.id, { status: 'inactive' });
                      setStudent({ ...student, status: 'inactive' });
                      setActionLoading(false);
                    }}
                  >Deactivate</Button>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => setShowReactivateDialog(true)}
                  >Reactivate</Button>
                )}
                <Button
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => alert('TC generated (mock)!')}
                >Generate TC</Button>
                <Button
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => alert('Report card generated (mock)!')}
                >Report Card</Button>
              </div>

              {/* Reactivate Warning Dialog */}
              <RadixDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
                <DialogContent className="max-w-sm w-full">
                  <DialogHeader>
                    <DialogTitle>Warning</DialogTitle>
                  </DialogHeader>
                  <div className="mb-4 text-yellow-700 font-semibold">
                    Reactivating this student will restore their access to the system.
                  </div>
                  <div className="flex gap-4 justify-end">
                    <Button variant="outline" onClick={() => setShowReactivateDialog(false)}>Cancel</Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (!student) return;
                        setActionLoading(true);
                        await studentApi.update(student.id, { status: 'active' });
                        setStudent({ ...student, status: 'active' });
                        setActionLoading(false);
                        setShowReactivateDialog(false);
                      }}
                    >Reactivate</Button>
                  </div>
                </DialogContent>
              </RadixDialog>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
