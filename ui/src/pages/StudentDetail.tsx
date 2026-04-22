import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParentFeePayment } from "@/components/fees/ParentFeePayment";
import { Student, StudentBasic, studentApi } from "@/services/api/studentApi";
import { Users, ExternalLink } from "lucide-react";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [siblings, setSiblings] = useState<StudentBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudent() {
      if (!id) return;
      try {
        const data = await studentApi.getById(id);
        setStudent(data);
        // Load siblings if the student has sibling IDs
        try {
          const sibs = await studentApi.getSiblings(id);
          setSiblings(Array.isArray(sibs) ? sibs : []);
        } catch { /* no siblings */ }
      } catch {
        setError("Student not found or you don't have permission to view this record.");
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">Loading student profile...</div>;
  }
  if (error || !student) {
    return <div className="p-8 text-center text-red-500">{error ?? "Student not found."}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground text-sm">{student.admissionNumber} • Class {student.class}-{student.section}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/students/${student.id}/edit`)}>
          Edit Profile
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="siblings" className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Siblings {siblings.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{siblings.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="fee">Fees</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h2 className="font-semibold text-base border-b pb-1">Personal Details</h2>
                  <div><b>Name:</b> {student.name}{student.preferredName ? ` (${student.preferredName})` : ""}</div>
                  <div><b>Admission No:</b> {student.admissionNumber}</div>
                  <div><b>Roll No:</b> {student.rollNumber || "—"}</div>
                  <div><b>Class:</b> {student.class}-{student.section}</div>
                  <div><b>Date of Birth:</b> {student.dateOfBirth ? student.dateOfBirth.split("T")[0] : "—"}</div>
                  <div><b>Gender:</b> {student.gender || "—"}</div>
                  <div><b>Blood Group:</b> {student.bloodGroup || "—"}</div>
                  <div><b>Category:</b> {student.category}</div>
                  <div><b>Admission Date:</b> {student.admissionDate ? student.admissionDate.split("T")[0] : "—"}</div>
                  <div className="flex items-center gap-2"><b>Status:</b>
                    <Badge variant={student.status === "active" ? "default" : "secondary"}>{student.status}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="font-semibold text-base border-b pb-1">Guardian & Contact</h2>
                  <div><b>Guardian:</b> {student.guardianName}</div>
                  <div><b>Guardian Phone:</b> {student.guardianPhone}</div>
                  <div><b>Address:</b> {student.address}</div>
                  {student.email && <div><b>Email:</b> {student.email}</div>}
                  {student.primaryPhone && <div><b>Phone:</b> {student.primaryPhone}</div>}
                  {student.previousSchool && <div><b>Previous School:</b> {student.previousSchool}</div>}
                </div>
              </div>
              {/* Siblings info banner in profile */}
              {siblings.length > 0 && (
                <div className="mt-6 p-3 rounded-lg bg-pink-50 border border-pink-200 flex items-center gap-3">
                  <Users className="h-5 w-5 text-pink-600 shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-semibold text-pink-800">Siblings in this school: </span>
                    <span className="text-pink-700">
                      {siblings.map(s => `${s.name} (${s.class}-${s.section})`).join(", ")}
                    </span>
                  </div>
                </div>
              )}
              <div className="mt-6">
                <h2 className="font-semibold mb-2">Academic History</h2>
                <div className="text-muted-foreground text-sm">
                  Attendance, exam results, and grade history will appear here.
                </div>
              </div>
            </TabsContent>

            <TabsContent value="siblings">
              {siblings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No siblings found in this school</p>
                  <p className="text-sm mt-1">This student does not have any linked siblings currently studying in the school.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-pink-50 border border-pink-200">
                    <Users className="h-5 w-5 text-pink-600 shrink-0" />
                    <div className="text-sm text-pink-800">
                      <span className="font-semibold">{siblings.length} sibling{siblings.length > 1 ? "s" : ""}</span> studying in this school.
                      Same parent/guardian is responsible for their fees.
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {siblings.map(sib => (
                      <Card key={sib.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-sm">
                              {sib.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="font-semibold">{sib.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {sib.admissionNumber} &bull; {sib.class}-{sib.section} &bull; Roll: {sib.rollNumber || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={sib.status === "active" ? "default" : "secondary"}>{sib.status}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/students/${sib.id}`)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="medical">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><b>Blood Group:</b> {student.bloodGroup || "—"}</div>
                <div><b>Allergies:</b> {student.allergies || "—"}</div>
                <div><b>Chronic Conditions:</b> {student.chronicConditions || "—"}</div>
                <div><b>Medications:</b> {student.medications || "—"}</div>
                <div><b>Emergency Contact:</b> {student.emergencyContact || "—"}</div>
                <div><b>Emergency Phone:</b> {student.emergencyPhone || "—"}</div>
                <div><b>Doctor:</b> {student.doctorName || "—"}</div>
                <div><b>Doctor Phone:</b> {student.doctorPhone || "—"}</div>
              </div>
            </TabsContent>

            <TabsContent value="fee">
              <ParentFeePayment studentId={student.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
