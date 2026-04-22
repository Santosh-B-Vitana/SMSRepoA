import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";

interface MarkSheetProps {
  studentName: string;
  studentId: string;
  class: string;
  section: string;
  rollNumber: string;
  academicYear: string;
  examination: string;
  schoolName?: string;
  subjects: Array<{
    name: string;
    theory: number;
    practical: number;
    total: number;
    grade: string;
    status: 'Pass' | 'Fail';
  }>;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  result: 'Pass' | 'Fail';
  division: string;
  issueDate: string;
  certificateNumber: string;
}

export const MarkSheetTemplate = forwardRef<HTMLDivElement, MarkSheetProps>(
  ({ 
    studentName, 
    studentId, 
    class: studentClass, 
    section,
    rollNumber,
    academicYear,
    examination,
    schoolName = "Chandrakant Patkar Vidyalaya",
    subjects,
    totalMarks,
    obtainedMarks,
    percentage,
    result,
    division,
    issueDate,
    certificateNumber
  }, ref) => {
    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-white p-8 print:p-4">
        {/* Header */}
        <div className="text-center border-2 border-blue-600 p-4 mb-6">
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
          <h2 className="text-xl font-bold text-blue-600 mt-4">MARK SHEET</h2>
          <p className="text-sm text-gray-600">{examination} - {academicYear}</p>
          <p className="text-xs text-gray-500 mt-2">Certificate No: {certificateNumber}</p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-2 gap-6 mb-6 bg-gray-50 p-4 rounded">
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
              <span className="font-semibold w-32">Roll Number:</span>
              <span>{rollNumber}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-32">Class & Section:</span>
              <span>{studentClass} - {section}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Academic Year:</span>
              <span>{academicYear}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Examination:</span>
              <span>{examination}</span>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-blue-600 mb-3">MARKS OBTAINED</h3>
          <table className="w-full border-collapse border-2 border-gray-400">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="border border-gray-400 p-3 text-left">Subject</th>
                <th className="border border-gray-400 p-3 text-center">Theory<br/>(Max 80)</th>
                <th className="border border-gray-400 p-3 text-center">Practical<br/>(Max 20)</th>
                <th className="border border-gray-400 p-3 text-center">Total<br/>(Max 100)</th>
                <th className="border border-gray-400 p-3 text-center">Grade</th>
                <th className="border border-gray-400 p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border border-gray-400 p-3 font-medium">{subject.name}</td>
                  <td className="border border-gray-400 p-3 text-center font-bold">{subject.theory}</td>
                  <td className="border border-gray-400 p-3 text-center font-bold">{subject.practical}</td>
                  <td className="border border-gray-400 p-3 text-center font-bold text-lg">{subject.total}</td>
                  <td className="border border-gray-400 p-3 text-center">
                    <Badge variant={subject.grade === 'A+' || subject.grade === 'A' ? 'default' : 
                                  subject.grade === 'B+' || subject.grade === 'B' ? 'secondary' : 'destructive'}>
                      {subject.grade}
                    </Badge>
                  </td>
                  <td className="border border-gray-400 p-3 text-center">
                    <Badge variant={subject.status === 'Pass' ? 'default' : 'destructive'}>
                      {subject.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded">
            <h3 className="text-lg font-bold text-blue-600 mb-3">SUMMARY</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total Marks:</span>
                <span className="font-bold text-lg">{totalMarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Marks Obtained:</span>
                <span className="font-bold text-lg">{obtainedMarks}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Percentage:</span>
                <span className="font-bold text-lg">{percentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Division:</span>
                <Badge variant="secondary" className="font-bold">{division}</Badge>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 p-4 rounded">
            <h3 className="text-lg font-bold text-green-600 mb-3">RESULT</h3>
            <div className="text-center">
              <Badge 
                variant={result === 'Pass' ? 'default' : 'destructive'} 
                className="text-2xl font-bold px-6 py-2"
              >
                {result}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">
                Date of Issue: {issueDate}
              </p>
            </div>
          </div>
        </div>

        {/* Grading Scale */}
        <div className="mb-6 bg-gray-50 p-4 rounded">
          <h3 className="text-lg font-bold text-blue-600 mb-3">GRADING SCALE</h3>
          <div className="grid grid-cols-6 gap-4 text-sm">
            <div className="text-center"><strong>A+:</strong> 91-100</div>
            <div className="text-center"><strong>A:</strong> 81-90</div>
            <div className="text-center"><strong>B+:</strong> 71-80</div>
            <div className="text-center"><strong>B:</strong> 61-70</div>
            <div className="text-center"><strong>C:</strong> 51-60</div>
            <div className="text-center"><strong>D:</strong> 33-50</div>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-12">
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t-2 border-gray-400 pt-2 w-32">
              <p className="font-semibold">Class Teacher</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 border-2 border-gray-400 rounded-full mx-auto mb-2 flex items-center justify-center">
              <span className="text-xs text-gray-500">SCHOOL<br/>SEAL</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t-2 border-gray-400 pt-2 w-32">
              <p className="font-semibold">Principal</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated mark sheet. Any alteration or tampering will make it invalid.</p>
          <p className="mt-1">For verification, please contact the school administration.</p>
        </div>
      </div>
    );
  }
);

MarkSheetTemplate.displayName = "MarkSheetTemplate";