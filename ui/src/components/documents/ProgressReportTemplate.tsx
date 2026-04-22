import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ProgressReportProps {
  studentName: string;
  studentId: string;
  class: string;
  section: string;
  academicYear: string;
  term: string;
  schoolName?: string;
  subjects: Array<{
    name: string;
    totalMarks: number;
    obtainedMarks: number;
    grade: string;
    remarks: string;
  }>;
  attendance: {
    totalDays: number;
    presentDays: number;
    percentage: number;
  };
  generalRemarks: string;
  teacherName: string;
  principalName: string;
  issueDate: string;
}

export const ProgressReportTemplate = forwardRef<HTMLDivElement, ProgressReportProps>(
  ({ 
    studentName, 
    studentId, 
    class: studentClass, 
    section,
    academicYear,
    term,
    schoolName = "Chandrakant Patkar Vidyalaya",
    subjects,
    attendance,
    generalRemarks,
    teacherName,
    principalName,
    issueDate 
  }, ref) => {
    const totalMarks = subjects.reduce((sum, subject) => sum + subject.totalMarks, 0);
    const obtainedMarks = subjects.reduce((sum, subject) => sum + subject.obtainedMarks, 0);
    const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : "0";

    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-white p-8 print:p-4">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-blue-800">{schoolName}</h1>
              <p className="text-sm text-gray-600">Affiliated to CBSE, New Delhi</p>
              <p className="text-xs text-gray-500">School Code: 12345</p>
            </div>
          </div>
          <h2 className="text-xl font-bold text-blue-600 mt-4">PROGRESS REPORT</h2>
          <p className="text-sm text-gray-600">Academic Year: {academicYear} | Term: {term}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-32">Student Name:</span>
              <span className="uppercase font-bold">{studentName}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Student ID:</span>
              <span>{studentId}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Class & Section:</span>
              <span>{studentClass} - {section}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-32">Academic Year:</span>
              <span>{academicYear}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Term:</span>
              <span>{term}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Issue Date:</span>
              <span>{issueDate}</span>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-600 mb-3">ACADEMIC PERFORMANCE</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 p-2 text-left">Subject</th>
                <th className="border border-gray-300 p-2 text-center">Total Marks</th>
                <th className="border border-gray-300 p-2 text-center">Marks Obtained</th>
                <th className="border border-gray-300 p-2 text-center">Grade</th>
                <th className="border border-gray-300 p-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 font-medium">{subject.name}</td>
                  <td className="border border-gray-300 p-2 text-center">{subject.totalMarks}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold">{subject.obtainedMarks}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <Badge variant={subject.grade === 'A+' || subject.grade === 'A' ? 'default' : 
                                  subject.grade === 'B+' || subject.grade === 'B' ? 'secondary' : 'destructive'}>
                      {subject.grade}
                    </Badge>
                  </td>
                  <td className="border border-gray-300 p-2 text-sm">{subject.remarks}</td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold">
                <td className="border border-gray-300 p-2">TOTAL</td>
                <td className="border border-gray-300 p-2 text-center">{totalMarks}</td>
                <td className="border border-gray-300 p-2 text-center">{obtainedMarks}</td>
                <td className="border border-gray-300 p-2 text-center">{percentage}%</td>
                <td className="border border-gray-300 p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Attendance */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card className="p-4">
            <h3 className="text-lg font-bold text-blue-600 mb-3">ATTENDANCE</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Working Days:</span>
                <span className="font-bold">{attendance.totalDays}</span>
              </div>
              <div className="flex justify-between">
                <span>Days Present:</span>
                <span className="font-bold">{attendance.presentDays}</span>
              </div>
              <div className="flex justify-between">
                <span>Attendance Percentage:</span>
                <Badge variant={attendance.percentage >= 75 ? 'default' : 'destructive'}>
                  {attendance.percentage}%
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-lg font-bold text-blue-600 mb-3">GRADING SCALE</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>A+:</span><span>91-100</span></div>
              <div className="flex justify-between"><span>A:</span><span>81-90</span></div>
              <div className="flex justify-between"><span>B+:</span><span>71-80</span></div>
              <div className="flex justify-between"><span>B:</span><span>61-70</span></div>
              <div className="flex justify-between"><span>C:</span><span>51-60</span></div>
              <div className="flex justify-between"><span>D:</span><span>33-50</span></div>
            </div>
          </Card>
        </div>

        {/* General Remarks */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-600 mb-3">TEACHER'S REMARKS</h3>
          <div className="border border-gray-300 p-4 bg-gray-50 min-h-20">
            <p className="text-sm">{generalRemarks}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-8">
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-semibold">{teacherName}</p>
              <p className="text-sm text-gray-600">Class Teacher</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t border-gray-400 pt-2">
              <p className="font-semibold">{principalName}</p>
              <p className="text-sm text-gray-600">Principal</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated document. For any queries, please contact the school office.</p>
        </div>
      </div>
    );
  }
);

ProgressReportTemplate.displayName = "ProgressReportTemplate";