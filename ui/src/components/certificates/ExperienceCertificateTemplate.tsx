import React, { forwardRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generateExperienceCertificate } from "@/utils/professionalCertificateGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";

interface ExperienceCertificateProps {
  staffName: string;
  designation: string;
  department: string;
  employeeId: string;
  joiningDate: string;
  relievingDate?: string;
  workDuration: string;
  responsibilities: string[];
  performance: string;
  schoolName?: string;
  schoolAddress?: string;
  principalName?: string;
  issueDate: string;
  certificateNumber: string;
}

export const ExperienceCertificateTemplate = forwardRef<HTMLDivElement, ExperienceCertificateProps>(({
  staffName,
  designation,
  department,
  employeeId,
  joiningDate,
  relievingDate,
  workDuration,
  responsibilities,
  performance,
  schoolName = "St. Mary's Senior Secondary School",
  schoolAddress = "123 Education Street, New Delhi - 110001",
  principalName = "Dr. John Smith",
  issueDate,
  certificateNumber
}, ref) => {
  const { schoolInfo } = useSchool();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const handlePreview = () => {
    if (!schoolInfo) {
      toast.error("School information not available");
      return;
    }
    
    const url = generateExperienceCertificate(schoolInfo, {
      certificateNumber,
      staffName,
      designation,
      department,
      joiningDate,
      relievingDate: relievingDate || new Date().toLocaleDateString('en-IN'),
      conduct: performance,
      issueDate
    });
    
    setPreviewUrl(url);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 justify-end mb-4 print:hidden">
          <Button onClick={handlePreview}>
            <Printer className="h-4 w-4 mr-2" />
            Preview & Print
          </Button>
        </div>

        <Card id="experience-certificate" ref={ref} className="max-w-4xl mx-auto bg-white print:shadow-none">
          <CardContent className="p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs">LOGO</span>
              </div>
              <h1 className="text-3xl font-bold text-blue-800 mb-2">{schoolName}</h1>
              <p className="text-lg text-gray-600 mb-1">{schoolAddress}</p>
              <p className="text-xl font-semibold text-gray-800 mt-4">EXPERIENCE CERTIFICATE</p>
            </div>

            {/* Certificate Body */}
            <div className="space-y-6 text-justify leading-relaxed">
              <div className="text-right text-sm text-gray-600">
                <p>Certificate No: {certificateNumber}</p>
                <p>Date: {issueDate}</p>
              </div>

              <div className="space-y-4">
                <p className="text-lg">
                  <strong>TO WHOM IT MAY CONCERN</strong>
                </p>

                <p>
                  This is to certify that <strong>Mr./Ms. {staffName}</strong> worked as{" "}
                  <strong>{designation}</strong> in the <strong>{department}</strong> department of this institution 
                  from <strong>{joiningDate}</strong> {relievingDate && `to ${relievingDate}`}, 
                  a total period of <strong>{workDuration}</strong>.
                </p>

                <p>
                  During his/her tenure with us, he/she was responsible for the following duties:
                </p>

                <ul className="list-disc ml-8 space-y-1">
                  {responsibilities.map((responsibility, index) => (
                    <li key={index}>{responsibility}</li>
                  ))}
                </ul>

                <p>
                  His/her <strong>CONDUCT</strong> and <strong>CHARACTER</strong> was found to be{" "}
                  <strong>{performance.toUpperCase()}</strong> throughout his/her service period.
                </p>

                <p>
                  We found him/her to be sincere, hardworking, and dedicated to his/her duties.
                  We wish him/her all success in his/her future endeavors.
                </p>
              </div>

              {/* Employment Details Table */}
              <div className="border border-gray-300 my-6">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-r border-gray-300 p-3 text-left font-semibold" colSpan={2}>
                        Employment Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-t border-gray-300 p-3 font-medium">Employee ID</td>
                      <td className="border-t border-gray-300 p-3">{employeeId}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-t border-gray-300 p-3 font-medium">Designation</td>
                      <td className="border-t border-gray-300 p-3">{designation}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-t border-gray-300 p-3 font-medium">Department</td>
                      <td className="border-t border-gray-300 p-3">{department}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-t border-gray-300 p-3 font-medium">Period of Service</td>
                      <td className="border-t border-gray-300 p-3">
                        {joiningDate} {relievingDate && `to ${relievingDate}`} ({workDuration})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature Section */}
              <div className="flex justify-between items-end mt-16 pt-8">
                <div className="text-center">
                  <div className="h-16 w-48 border-b border-gray-300 mb-2"></div>
                  <p className="text-sm font-medium">HR Manager</p>
                </div>
                
                <div className="text-center">
                  <div className="w-24 h-24 border border-gray-300 mb-2 mx-auto">
                    <p className="text-xs text-gray-500 mt-8">School Seal</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="h-16 w-48 border-b border-gray-300 mb-2"></div>
                  <p className="text-sm font-medium">Principal</p>
                  <p className="text-sm text-gray-600">{principalName}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This is a computer generated certificate and does not require signature
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <PdfPreviewModal
        open={!!previewUrl}
        onClose={() => setPreviewUrl("")}
        pdfUrl={previewUrl}
        fileName={`Experience_Certificate_${staffName.replace(/\s+/g, '_')}.pdf`}
      />
    </>
  );
});

ExperienceCertificateTemplate.displayName = "ExperienceCertificateTemplate";
