import { forwardRef } from "react";
import { Award, Star, Medal } from "lucide-react";

interface AwardCertificateProps {
  recipientName: string;
  recipientType: 'student' | 'staff';
  awardTitle: string;
  awardCategory: string;
  awardDescription: string;
  achievementDetails: string;
  academicYear?: string;
  class?: string;
  department?: string;
  schoolName?: string;
  issuedDate: string;
  certificateNumber: string;
  principalName: string;
  eventDate?: string;
  additionalNotes?: string;
}

export const AwardCertificateTemplate = forwardRef<HTMLDivElement, AwardCertificateProps>(
  ({ 
    recipientName,
    recipientType,
    awardTitle,
    awardCategory,
    awardDescription,
    achievementDetails,
    academicYear,
    class: studentClass,
    department,
    schoolName = "Chandrakant Patkar Vidyalaya",
    issuedDate,
    certificateNumber,
    principalName,
    eventDate,
    additionalNotes
  }, ref) => {
    return (
      <div ref={ref} className="max-w-4xl mx-auto bg-gradient-to-br from-yellow-50 to-orange-50 p-8 print:p-4 border-4 border-yellow-400 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 left-4 w-16 h-16 bg-yellow-200 rounded-full opacity-30"></div>
        <div className="absolute bottom-4 right-4 w-20 h-20 bg-orange-200 rounded-full opacity-30"></div>
        <div className="absolute top-1/2 right-8 w-12 h-12 bg-yellow-300 rounded-full opacity-20"></div>

        {/* Header */}
        <div className="text-center border-b-4 border-yellow-500 pb-6 mb-6 relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mr-4 shadow-lg">
              <Award className="h-12 w-12 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-yellow-800">{schoolName}</h1>
              <p className="text-sm text-gray-600">Excellence in Education</p>
              <p className="text-xs text-gray-500">Affiliated to CBSE, New Delhi</p>
            </div>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center ml-4 shadow-lg">
              <Medal className="h-12 w-12 text-yellow-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-yellow-700 mt-4">CERTIFICATE OF ACHIEVEMENT</h2>
          <p className="text-sm text-gray-600 mt-2">Certificate No: {certificateNumber}</p>
        </div>

        {/* Award Content */}
        <div className="text-center space-y-6 mb-8 relative z-10">
          <div className="flex justify-center">
            <Star className="h-8 w-8 text-yellow-500 mr-2" />
            <h3 className="text-xl font-bold text-yellow-700">This is to certify that</h3>
            <Star className="h-8 w-8 text-yellow-500 ml-2" />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-yellow-300">
            <h1 className="text-4xl font-bold text-yellow-800 mb-2">{recipientName}</h1>
            {recipientType === 'student' && studentClass && (
              <p className="text-lg text-gray-600">Student of Class {studentClass}</p>
            )}
            {recipientType === 'staff' && department && (
              <p className="text-lg text-gray-600">{department} Department</p>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xl text-gray-800">
              has been awarded the
            </p>
            
            <div className="bg-yellow-100 p-4 rounded-lg border-2 border-yellow-400">
              <h2 className="text-2xl font-bold text-yellow-800">{awardTitle}</h2>
              <p className="text-lg text-yellow-700 mt-1">{awardCategory}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <p className="text-lg text-gray-800 font-medium mb-3">{awardDescription}</p>
              <p className="text-base text-gray-700 leading-relaxed">{achievementDetails}</p>
            </div>
          </div>

          {additionalNotes && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">{additionalNotes}</p>
            </div>
          )}
        </div>

        {/* Award Details */}
        <div className="mb-8 relative z-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Award Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{awardCategory}</span>
                </div>
                {academicYear && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Academic Year:</span>
                    <span className="font-medium">{academicYear}</span>
                  </div>
                )}
                {eventDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event Date:</span>
                    <span className="font-medium">{eventDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Issue Date:</span>
                  <span className="font-medium">{issuedDate}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Recognition</h3>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="h-10 w-10 text-white" />
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  In recognition of outstanding achievement and dedication to excellence
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-12 relative z-10">
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t-2 border-gray-400 pt-2 w-32">
              <p className="font-semibold">Date</p>
              <p className="text-sm text-gray-600">{issuedDate}</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="w-24 h-24 border-2 border-yellow-400 rounded-full mx-auto mb-2 flex items-center justify-center bg-yellow-100">
              <span className="text-xs text-yellow-700 font-bold">SCHOOL<br/>SEAL</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="mb-16"></div>
            <div className="border-t-2 border-gray-400 pt-2 w-40">
              <p className="font-bold text-lg">{principalName}</p>
              <p className="text-sm text-gray-600">Principal</p>
              <p className="text-xs text-gray-500">{schoolName}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-yellow-400 text-center text-xs text-gray-500 relative z-10">
          <p className="font-medium">★ Excellence is not a skill, it's an attitude ★</p>
          <p className="mt-1">This certificate is awarded in recognition of exceptional achievement and dedication.</p>
        </div>
      </div>
    );
  }
);

AwardCertificateTemplate.displayName = "AwardCertificateTemplate";