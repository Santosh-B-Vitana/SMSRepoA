import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Award, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface SubjectGrade {
  subject: string;
  fa1: number;
  fa2: number;
  sa1: number;
  fa3: number;
  fa4: number;
  sa2: number;
  total: number;
  grade: string;
}

interface CoScholasticArea {
  area: string;
  grade: string;
}

const GRADE_SCALE = [
  { grade: 'A1', min: 91, max: 100, points: 10 },
  { grade: 'A2', min: 81, max: 90, points: 9 },
  { grade: 'B1', min: 71, max: 80, points: 8 },
  { grade: 'B2', min: 61, max: 70, points: 7 },
  { grade: 'C1', min: 51, max: 60, points: 6 },
  { grade: 'C2', min: 41, max: 50, points: 5 },
  { grade: 'D', min: 33, max: 40, points: 4 },
  { grade: 'E1', min: 21, max: 32, points: 0 },
  { grade: 'E2', min: 0, max: 20, points: 0 }
];

const CO_SCHOLASTIC_AREAS = [
  'Work Education',
  'Art Education',
  'Health & Physical Education',
  'Life Skills',
  'Attitude & Values',
  'Co-Curricular Activities'
];

export function CCEGradingSystem() {
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState<"term1" | "term2">("term1");
  const [subjects, setSubjects] = useState<SubjectGrade[]>([
    { subject: 'Mathematics', fa1: 0, fa2: 0, sa1: 0, fa3: 0, fa4: 0, sa2: 0, total: 0, grade: '' },
    { subject: 'Science', fa1: 0, fa2: 0, sa1: 0, fa3: 0, fa4: 0, sa2: 0, total: 0, grade: '' },
    { subject: 'Social Science', fa1: 0, fa2: 0, sa1: 0, fa3: 0, fa4: 0, sa2: 0, total: 0, grade: '' },
    { subject: 'English', fa1: 0, fa2: 0, sa1: 0, fa3: 0, fa4: 0, sa2: 0, total: 0, grade: '' },
    { subject: 'Hindi', fa1: 0, fa2: 0, sa1: 0, fa3: 0, fa4: 0, sa2: 0, total: 0, grade: '' }
  ]);
  const [coScholastic, setCoScholastic] = useState<CoScholasticArea[]>(
    CO_SCHOLASTIC_AREAS.map(area => ({ area, grade: 'A' }))
  );

  const calculateGrade = (percentage: number): string => {
    const gradeInfo = GRADE_SCALE.find(g => percentage >= g.min && percentage <= g.max);
    return gradeInfo?.grade || 'E2';
  };

  const calculateTotal = (subject: SubjectGrade): number => {
    if (term === "term1") {
      // Term 1: FA1(10) + FA2(10) + SA1(80) = 100
      return subject.fa1 + subject.fa2 + subject.sa1;
    } else {
      // Term 2: FA3(10) + FA4(10) + SA2(80) = 100
      return subject.fa3 + subject.fa4 + subject.sa2;
    }
  };

  const handleMarksChange = (index: number, field: keyof SubjectGrade, value: string) => {
    const newSubjects = [...subjects];
    const numValue = parseFloat(value) || 0;
    
    // Validate based on assessment type
    const maxMarks = field.startsWith('fa') ? 10 : 80;
    if (numValue > maxMarks) {
      toast.error(`Maximum marks for ${field.toUpperCase()} is ${maxMarks}`);
      return;
    }
    
    newSubjects[index] = { ...newSubjects[index], [field]: numValue };
    const total = calculateTotal(newSubjects[index]);
    newSubjects[index].total = total;
    newSubjects[index].grade = calculateGrade(total);
    
    setSubjects(newSubjects);
  };

  const handleCoScholasticChange = (index: number, grade: string) => {
    const newCoScholastic = [...coScholastic];
    newCoScholastic[index] = { ...newCoScholastic[index], grade };
    setCoScholastic(newCoScholastic);
  };

  const calculateCGPA = (): number => {
    const validGrades = subjects.filter(s => s.grade);
    if (validGrades.length === 0) return 0;
    
    const totalPoints = validGrades.reduce((sum, subject) => {
      const gradeInfo = GRADE_SCALE.find(g => g.grade === subject.grade);
      return sum + (gradeInfo?.points || 0);
    }, 0);
    
    return totalPoints / validGrades.length;
  };

  const handleSave = () => {
    if (!studentId) {
      toast.error("Please enter student ID");
      return;
    }
    
    const cgpa = calculateCGPA();
    toast.success(`CCE Assessment saved successfully! CGPA: ${cgpa.toFixed(2)}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            CCE Grading System (CBSE Pattern)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Student ID</Label>
              <Input
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div>
              <Label>Assessment Term</Label>
              <Select value={term} onValueChange={(v: "term1" | "term2") => setTerm(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term1">Term 1 (FA1, FA2, SA1)</SelectItem>
                  <SelectItem value="term2">Term 2 (FA3, FA4, SA2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="scholastic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scholastic">Scholastic Areas</TabsTrigger>
              <TabsTrigger value="coscholastic">Co-Scholastic Areas</TabsTrigger>
            </TabsList>

            <TabsContent value="scholastic" className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Subject</th>
                      {term === "term1" ? (
                        <>
                          <th className="border p-2 text-center">FA1 (10)</th>
                          <th className="border p-2 text-center">FA2 (10)</th>
                          <th className="border p-2 text-center">SA1 (80)</th>
                        </>
                      ) : (
                        <>
                          <th className="border p-2 text-center">FA3 (10)</th>
                          <th className="border p-2 text-center">FA4 (10)</th>
                          <th className="border p-2 text-center">SA2 (80)</th>
                        </>
                      )}
                      <th className="border p-2 text-center">Total (100)</th>
                      <th className="border p-2 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject, index) => (
                      <tr key={index}>
                        <td className="border p-2 font-medium">{subject.subject}</td>
                        {term === "term1" ? (
                          <>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={subject.fa1 || ''}
                                onChange={(e) => handleMarksChange(index, 'fa1', e.target.value)}
                                className="text-center"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={subject.fa2 || ''}
                                onChange={(e) => handleMarksChange(index, 'fa2', e.target.value)}
                                className="text-center"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="80"
                                value={subject.sa1 || ''}
                                onChange={(e) => handleMarksChange(index, 'sa1', e.target.value)}
                                className="text-center"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={subject.fa3 || ''}
                                onChange={(e) => handleMarksChange(index, 'fa3', e.target.value)}
                                className="text-center"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={subject.fa4 || ''}
                                onChange={(e) => handleMarksChange(index, 'fa4', e.target.value)}
                                className="text-center"
                              />
                            </td>
                            <td className="border p-2">
                              <Input
                                type="number"
                                min="0"
                                max="80"
                                value={subject.sa2 || ''}
                                onChange={(e) => handleMarksChange(index, 'sa2', e.target.value)}
                                className="text-center"
                              />
                            </td>
                          </>
                        )}
                        <td className="border p-2 text-center font-bold">{subject.total}</td>
                        <td className="border p-2 text-center">
                          <span className={`font-bold ${
                            subject.grade.startsWith('A') ? 'text-success' :
                            subject.grade.startsWith('B') ? 'text-primary' :
                            subject.grade.startsWith('C') ? 'text-warning' :
                            'text-destructive'
                          }`}>
                            {subject.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CGPA Display */}
              <Card className="bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Cumulative Grade Point Average (CGPA)</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{calculateCGPA().toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coscholastic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coScholastic.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="font-medium">{item.area}</span>
                        </div>
                        <Select 
                          value={item.grade} 
                          onValueChange={(v) => handleCoScholasticChange(index, v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A - Outstanding</SelectItem>
                            <SelectItem value="B">B - Very Good</SelectItem>
                            <SelectItem value="C">C - Good</SelectItem>
                            <SelectItem value="D">D - Fair</SelectItem>
                            <SelectItem value="E">E - Needs Improvement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Co-Scholastic Grade Descriptors:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li><strong>A (Outstanding):</strong> The student demonstrates exceptional understanding and performance</li>
                  <li><strong>B (Very Good):</strong> The student shows very good understanding and performance</li>
                  <li><strong>C (Good):</strong> The student displays good understanding and performance</li>
                  <li><strong>D (Fair):</strong> The student shows fair understanding and needs guidance</li>
                  <li><strong>E (Needs Improvement):</strong> The student requires significant support</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Reset</Button>
            <Button onClick={handleSave}>Save Assessment</Button>
          </div>
        </CardContent>
      </Card>

      {/* Grade Scale Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CBSE 9-Point Grading Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {GRADE_SCALE.map((scale) => (
              <div key={scale.grade} className="text-center p-2 bg-muted/50 rounded">
                <div className="font-bold text-sm">{scale.grade}</div>
                <div className="text-xs text-muted-foreground">{scale.min}-{scale.max}</div>
                <div className="text-xs font-medium">{scale.points} pts</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
