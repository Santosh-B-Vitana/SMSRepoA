import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, FileText } from "lucide-react";
import { CCEGradingSystem } from "@/components/examinations/CCEGradingSystem";
import { CBSEReportCard } from "@/components/examinations/CBSEReportCard";
import { ICSEReportCard } from "@/components/examinations/ICSEReportCard";

export default function CCEManagement() {
  // Sample data for preview
  const sampleCBSEData = {
    studentName: "Priya Sharma",
    rollNo: "2024001",
    class: "10",
    section: "A",
    fatherName: "Rajesh Sharma",
    motherName: "Sunita Sharma",
    dob: "15/05/2009",
    admissionNo: "ADM2019001",
    academicYear: "2024-25",
    subjects: [
      { subject: 'English', fa1: 9, fa2: 8.5, sa1: 72, fa3: 9, fa4: 8, sa2: 75, term1Total: 89.5, term2Total: 92, annualTotal: 91, grade: 'A1', gradePoint: 10 },
      { subject: 'Hindi', fa1: 8.5, fa2: 9, sa1: 70, fa3: 8, fa4: 9, sa2: 73, term1Total: 87.5, term2Total: 90, annualTotal: 88, grade: 'A2', gradePoint: 9 },
      { subject: 'Mathematics', fa1: 10, fa2: 9.5, sa1: 78, fa3: 10, fa4: 9, sa2: 80, term1Total: 97.5, term2Total: 99, annualTotal: 98, grade: 'A1', gradePoint: 10 },
      { subject: 'Science', fa1: 9, fa2: 8.5, sa1: 74, fa3: 9.5, fa4: 9, sa2: 76, term1Total: 91.5, term2Total: 94.5, annualTotal: 93, grade: 'A1', gradePoint: 10 },
      { subject: 'Social Science', fa1: 8, fa2: 9, sa1: 68, fa3: 8.5, fa4: 9, sa2: 71, term1Total: 85, term2Total: 88.5, annualTotal: 87, grade: 'A2', gradePoint: 9 }
    ],
    coScholastic: [
      { area: 'Work Education', term1: 'A', term2: 'A' },
      { area: 'Art Education', term1: 'B', term2: 'A' },
      { area: 'Health & Physical Education', term1: 'A', term2: 'A' },
      { area: 'Life Skills', term1: 'B', term2: 'B' },
      { area: 'Attitude & Values', term1: 'A', term2: 'A' },
      { area: 'Co-Curricular Activities', term1: 'A', term2: 'A' }
    ],
    attendance: { term1: 95, term2: 97 },
    cgpa: 9.6,
    remarks: "Priya is an excellent student with strong academic performance. She actively participates in class discussions and shows great enthusiasm for learning. Keep up the good work!",
    height: "155",
    weight: "48"
  };

  const sampleICSEData = {
    studentName: "Arjun Patel",
    rollNo: "2024015",
    class: "12",
    section: "B",
    fatherName: "Vikram Patel",
    motherName: "Meena Patel",
    dob: "22/08/2007",
    admissionNo: "ADM2017015",
    examName: "ICSE Examination",
    examYear: "2024",
    subjects: [
      { subject: 'English', theory: 82, practical: 0, internal: 18, total: 100, grade: '1' },
      { subject: 'Hindi', theory: 75, practical: 0, internal: 16, total: 91, grade: '1' },
      { subject: 'Mathematics', theory: 88, practical: 0, internal: 19, total: 107, grade: '1' },
      { subject: 'Physics', theory: 68, practical: 25, internal: 17, total: 110, grade: '2' },
      { subject: 'Chemistry', theory: 70, practical: 24, internal: 18, total: 112, grade: '2' },
      { subject: 'Computer Science', theory: 85, practical: 28, internal: 19, total: 132, grade: '1' }
    ],
    attendance: 96,
    conduct: "Excellent",
    remarks: "Arjun has shown outstanding performance in academics. He demonstrates strong analytical skills and actively participates in all school activities. Well done!",
    percentage: 92.5,
    result: 'Pass' as const
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            CCE & Board Examination Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cce" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cce">
                <BookOpen className="h-4 w-4 mr-2" />
                CCE Grading
              </TabsTrigger>
              <TabsTrigger value="cbse">
                <GraduationCap className="h-4 w-4 mr-2" />
                CBSE Report Card
              </TabsTrigger>
              <TabsTrigger value="icse">
                <FileText className="h-4 w-4 mr-2" />
                ICSE Report Card
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cce" className="space-y-4">
              <CCEGradingSystem />
            </TabsContent>

            <TabsContent value="cbse" className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">CBSE Report Card Template</h3>
                <p className="text-sm text-muted-foreground">
                  This template follows CBSE's CCE pattern with FA (Formative Assessment) and SA (Summative Assessment) structure.
                  Includes co-scholastic areas and 9-point grading scale (A1-E2).
                </p>
              </div>
              <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[800px]">
                <CBSEReportCard {...sampleCBSEData} />
              </div>
            </TabsContent>

            <TabsContent value="icse" className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">ICSE Report Card Template</h3>
                <p className="text-sm text-muted-foreground">
                  This template follows ICSE/ISC examination pattern with Theory, Practical, and Internal Assessment components.
                  Includes 7-point grading scale and detailed subject-wise breakdown.
                </p>
              </div>
              <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[800px]">
                <ICSEReportCard {...sampleICSEData} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
