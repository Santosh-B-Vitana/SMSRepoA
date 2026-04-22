import { forwardRef } from "react";
import { Award, Stamp } from "lucide-react";

interface ExperienceCertificateProps {
  staffName: string;
  designation: string;
  department: string;
  employeeId: string;
  joiningDate: string;
  leavingDate: string;
  workPeriod: string;
  schoolName?: string;
  schoolAddress?: string;
  performanceRating: string;
  responsibilities: string[];
  achievements: string[];
  issuedDate: string;
  certificateNumber: string;
  principalName: string;
  principalSignature?: string;
}

export const ExperienceCertificateTemplate = forwardRef<HTMLDivElement, ExperienceCertificateProps>(
  ({ 
    staffName,
    designation,
    department,
    employeeId,
    joiningDate,
    leavingDate,
    workPeriod,
    schoolName = "Chandrakant Patkar Vidyalaya",
    schoolAddress = "Dombivli (E), Maharashtra - 421201",
    performanceRating,
    responsibilities,
    achievements,
    issuedDate,
    certificateNumber,
    principalName
  }, ref) => {
    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-white p-8 print:p-4">
        {/* Header */}
        <div className="text-center border-b-4 border-blue-600 pb-6 mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <Award className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-800">{schoolName}</h1>
              <p className="text-sm text-gray-600">Affiliated to CBSE, New Delhi</p>
              <p className="text-xs text-gray-500">{schoolAddress}</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-blue-600 mt-4">EXPERIENCE CERTIFICATE</h2>
          <p className="text-sm text-gray-600 mt-2">Certificate No: {certificateNumber}</p>
        </div>

        {/* Certificate Content */}
        <div className="space-y-6 mb-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800 mb-4">TO WHOM IT MAY CONCERN</p>
          </div>

          <div className="text-justify leading-relaxed space-y-4">
            <p className="text-base">
              This is to certify that <strong className="text-blue-800 text-lg">{staffName}</strong> 
              was employed with our institution as <strong>{designation}</strong> in the {department} Department 
              from <strong>{joiningDate}</strong> to <strong>{leavingDate}</strong>, 
              for a period of <strong>{workPeriod}</strong>.
            </p>

            <p className="text-base">
              During the tenure of employment, {staffName.split(' ')[0]} served with 
              dedication and maintained <strong>{performanceRating}</strong> performance standards. 
              The employee ID assigned was <strong>{employeeId}</strong>.
            </p>
          </div>

          {/* Responsibilities */}
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
            <h3 className="text-lg font-bold text-blue-800 mb-3">KEY RESPONSIBILITIES</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {responsibilities.map((responsibility, index) => (
                <li key={index} className="text-gray-700">{responsibility}</li>
              ))}
            </ul>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
              <h3 className="text-lg font-bold text-green-800 mb-3">NOTABLE ACHIEVEMENTS</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {achievements.map((achievement, index) => (
                  <li key={index} className="text-gray-700">{achievement}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-justify leading-relaxed">
            <p className="text-base">
              {staffName.split(' ')[0]} was found to be sincere, hardworking, and maintained excellent 
              professional conduct throughout the employment period. We found {staffName.split(' ')[0].toLowerCase()} 
              to be reliable and dedicated to educational excellence.
            </p>

            <p className="text-base mt-4">
              We wish {staffName.split(' ')[0]} all the best in future endeavors and recommend 
              {staffName.split(' ')[0].toLowerCase()} for any position that matches the qualifications and experience.
            </p>
          </div>
        </div>

        {/* Employee Details Table */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-blue-600 mb-3">EMPLOYMENT DETAILS</h3>
          <table className="w-full border border-gray-300">
            <tbody>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-3 font-semibold w-1/3">Employee Name</td>
                <td className="border border-gray-300 p-3">{staffName}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold">Designation</td>
                <td className="border border-gray-300 p-3">{designation}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-3 font-semibold">Department</td>
                <td className="border border-gray-300 p-3">{department}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold">Employee ID</td>
                <td className="border border-gray-300 p-3">{employeeId}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 p-3 font-semibold">Period of Employment</td>
                <td className="border border-gray-300 p-3">{joiningDate} to {leavingDate} ({workPeriod})</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-semibold">Performance Rating</td>
                <td className="border border-gray-300 p-3 font-bold text-green-600">{performanceRating}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Issue Details */}
        <div className="text-right mb-8">
          <p className="text-sm text-gray-600">Date of Issue: <strong>{issuedDate}</strong></p>
          <p className="text-sm text-gray-600">Place of Issue: {schoolAddress}</p>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-12">
          <div className="text-left">
            <div className="w-24 h-24 border-2 border-gray-400 rounded mx-auto mb-2 flex items-center justify-center">
              <Stamp className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-center text-sm font-semibold">Official Seal</p>
          </div>
          
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t-2 border-gray-400 pt-2 w-48">
              <p className="font-bold text-lg">{principalName}</p>
              <p className="text-sm text-gray-600">Principal</p>
              <p className="text-xs text-gray-500">{schoolName}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated certificate. For verification, please contact the school administration.</p>
          <p className="mt-1">Phone: +91-XXXX-XXXXXX | Email: info@cpvidyalaya.edu.in</p>
        </div>
      </div>
    );
  }
);

ExperienceCertificateTemplate.displayName = "ExperienceCertificateTemplate";