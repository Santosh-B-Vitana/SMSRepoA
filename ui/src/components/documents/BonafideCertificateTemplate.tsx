import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { generateBonafideCertificate } from "@/utils/professionalCertificateGenerator";
import { useSchool } from "@/contexts/SchoolContext";
import { toast } from "sonner";
import { PdfPreviewModal } from "@/components/common/PdfPreviewModal";

interface BonafideCertificateProps {
  studentName: string;
  fatherName: string;
  className: string;
  schoolName: string;
  principalName: string;
  academicYear: string;
  rollNumber: string;
  purpose: string;
  certificateNumber: string;
  issueDate: string;
}

export function BonafideCertificateTemplate({
  studentName,
  fatherName,
  className,
  schoolName,
  principalName,
  academicYear,
  rollNumber,
  purpose,
  certificateNumber,
  issueDate
}: BonafideCertificateProps) {
  const { schoolInfo, loading } = useSchool();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  const handlePreview = () => {
    if (!schoolInfo) {
      toast.error("School information not available");
      return;
    }
    
    const [classNum, section] = className.split('-');
    const url = generateBonafideCertificate(schoolInfo, {
      certificateNumber,
      studentName,
      fatherName,
      class: classNum || className,
      section: section || '',
      studentId: rollNumber,
      academicYear,
      purpose,
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

      <Card id="bonafide-certificate" className="max-w-4xl mx-auto bg-white">
        <CardContent className="p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-xs">LOGO</span>
            </div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">{schoolName}</h1>
            <p className="text-lg text-gray-600">BONAFIDE CERTIFICATE</p>
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
                This is to certify that <strong>Mr./Ms. {studentName}</strong>, 
                Son/Daughter of <strong>{fatherName}</strong> is a bonafide student of this school.
              </p>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="space-y-2">
                  <p><strong>Class/Standard:</strong> {className}</p>
                  <p><strong>Roll Number:</strong> {rollNumber}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Academic Year:</strong> {academicYear}</p>
                  <p><strong>Purpose:</strong> {purpose}</p>
                </div>
              </div>

              <p>
                He/She bears a good moral character and is regular in attendance. 
                This certificate is issued on his/her request for the purpose of <strong>{purpose}</strong>.
              </p>

              <p>
                I wish him/her all success in his/her endeavors.
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
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This certificate is issued based on school records and is valid for official purposes
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
      
      <PdfPreviewModal
        open={!!previewUrl}
        onClose={() => setPreviewUrl("")}
        pdfUrl={previewUrl}
        fileName={`Bonafide_Certificate_${studentName.replace(/\s+/g, '_')}.pdf`}
      />
    </>
  );
}