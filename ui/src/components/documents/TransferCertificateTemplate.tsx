import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generateTransferCertificate } from "@/utils/professionalCertificateGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";

interface TransferCertificateProps {
  studentName: string;
  fatherName: string;
  motherName: string;
  className: string;
  schoolName: string;
  principalName: string;
  academicYear: string;
  dateOfBirth: string;
  dateOfAdmission: string;
  dateOfLeaving: string;
  reasonForLeaving: string;
  conduct: string;
  certificateNumber: string;
  issueDate: string;
}

export function TransferCertificateTemplate({
  studentName,
  fatherName,
  motherName,
  className,
  schoolName,
  principalName,
  academicYear,
  dateOfBirth,
  dateOfAdmission,
  dateOfLeaving,
  reasonForLeaving,
  conduct,
  certificateNumber,
  issueDate
}: TransferCertificateProps) {
  const { schoolInfo, loading } = useSchool();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const handlePreview = () => {
    if (!schoolInfo) {
      toast.error("School information not available");
      return;
    }
    
    const url = generateTransferCertificate(schoolInfo, {
      certificateNumber,
      studentName,
      fatherName,
      motherName,
      nationality: "Indian",
      class: className,
      dateOfBirth,
      admissionDate: dateOfAdmission,
      dateOfLeaving,
      classAtLeaving: className,
      conduct,
      reasonForLeaving,
      issueDate
    });
    
    setPreviewUrl(url);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 justify-end mb-4">
          <Button onClick={handlePreview} disabled={loading || !schoolInfo} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Preview & Print
          </Button>
        </div>

      <Card id="transfer-certificate" className="max-w-4xl mx-auto bg-white">
        <CardContent className="p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs">LOGO</span>
            </div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">{schoolName}</h1>
            <p className="text-lg text-gray-600">SCHOOL LEAVING CERTIFICATE / TRANSFER CERTIFICATE</p>
          </div>

          {/* Certificate Details */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between">
              <p><strong>Certificate No:</strong> {certificateNumber}</p>
              <p><strong>Date:</strong> {issueDate}</p>
            </div>
          </div>

          {/* Student Details Table */}
          <div className="space-y-4">
            <table className="w-full border border-gray-300">
              <tbody>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50 w-1/3">1. Name of Student</td>
                  <td className="p-3">{studentName}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">2. Father's Name</td>
                  <td className="p-3">{fatherName}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">3. Mother's Name</td>
                  <td className="p-3">{motherName}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">4. Date of Birth</td>
                  <td className="p-3">{dateOfBirth}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">5. Class in which student was studying</td>
                  <td className="p-3">{className}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">6. Date of Admission</td>
                  <td className="p-3">{dateOfAdmission}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">7. Date of Leaving School</td>
                  <td className="p-3">{dateOfLeaving}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">8. Reason for leaving</td>
                  <td className="p-3">{reasonForLeaving}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">9. Character and Conduct</td>
                  <td className="p-3">{conduct}</td>
                </tr>
                <tr className="border-b">
                  <td className="border-r p-3 font-medium bg-gray-50">10. Academic Year</td>
                  <td className="p-3">{academicYear}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          <div className="mt-8 space-y-4">
            <p className="text-sm">
              <strong>Remarks:</strong> The student has completed his/her studies satisfactorily 
              and is eligible for admission to the next higher class/course.
            </p>
          </div>

          {/* Signature Section */}
          <div className="flex justify-between items-end mt-12 pt-8">
            <div className="text-center">
              <div className="h-16 w-48 border-b border-gray-300 mb-2"></div>
              <p className="text-sm font-medium">Class Teacher</p>
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

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This certificate is issued on the basis of school records
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      
      <PdfPreviewModal
        open={!!previewUrl}
        onClose={() => setPreviewUrl("")}
        pdfUrl={previewUrl}
        fileName={`Transfer_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`}
      />
    </>
  );
}