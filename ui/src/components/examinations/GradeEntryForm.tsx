
import { useState, useEffect } from "react";
import { Award, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

interface GradeEntry {
  studentId: string;
  marks: number;
  grade: string;
}

interface Exam {
  id: string;
  name: string;
  class: string;
  subject: string;
  maxMarks: number;
}

interface GradeEntryFormProps {
  exam: Exam;
  students: Student[];
  onSaveGrades: (examId: string, grades: GradeEntry[]) => void;
}

export function GradeEntryForm({ exam, students, onSaveGrades }: GradeEntryFormProps) {
  const [grades, setGrades] = useState<Record<string, GradeEntry>>({});
  const { toast } = useToast();

  useEffect(() => {
    // Initialize grades for all students
    const initialGrades: Record<string, GradeEntry> = {};
    students.forEach(student => {
      initialGrades[student.id] = {
        studentId: student.id,
        marks: 0,
        grade: ''
      };
    });
    setGrades(initialGrades);
  }, [students]);

  const calculateGrade = (marks: number, maxMarks: number): string => {
    const percentage = (marks / maxMarks) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const updateMarks = (studentId: string, marks: number) => {
    const grade = calculateGrade(marks, exam.maxMarks);
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks,
        grade
      }
    }));
  };

  const handleSave = () => {
    const gradeEntries = Object.values(grades);
    const hasInvalidMarks = gradeEntries.some(entry => 
      entry.marks < 0 || entry.marks > exam.maxMarks
    );

    if (hasInvalidMarks) {
      toast({
        title: "Invalid Marks",
        description: `Marks should be between 0 and ${exam.maxMarks}.`,
        variant: "destructive"
      });
      return;
    }

    onSaveGrades(exam.id, gradeEntries);
    toast({
      title: "Grades Saved",
      description: "All grades have been saved successfully."
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-orange-100 text-orange-800';
      case 'F':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Enter Marks - {exam.subject} ({exam.name})
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Class {exam.class} • Maximum Marks: {exam.maxMarks}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Marks Obtained</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const studentGrade = grades[student.id];
                const percentage = studentGrade ? 
                  ((studentGrade.marks / exam.maxMarks) * 100).toFixed(1) : '0.0';
                
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.rollNo}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={exam.maxMarks}
                          value={studentGrade?.marks || 0}
                          onChange={(e) => updateMarks(student.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">/ {exam.maxMarks}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {studentGrade?.grade && (
                        <Badge className={getGradeColor(studentGrade.grade)}>
                          {studentGrade.grade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{percentage}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save All Grades
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
