import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Staff } from "../../services/mockApi";
import { QrCode } from "lucide-react";

interface StaffIdCardTemplateProps {
  staff: Staff;
}

export function StaffIdCardTemplate({ staff }: StaffIdCardTemplateProps) {
  return (
    <div className="id-card-container" style={{ pageBreakAfter: 'always' }}>
      {/* Front of Staff ID Card - based on reference image */}
      <Card className="w-80 h-96 mx-auto bg-white border-2 border-gray-800 relative overflow-hidden print:shadow-none">
        {/* Header with diagonal pattern */}
        <div className="bg-green-800 text-white p-2 text-center relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10" 
               style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%)' }}></div>
          <h3 className="font-bold text-xs">INDIAN EDUCATION SOCIETY</h3>
          <h2 className="font-bold text-sm">CHANDRAKANT PATKAR VIDYALAYA</h2>
          <p className="text-xs">ENGLISH MEDIUM, DOMBIVLI (E), Tel.: 025-6464468</p>
          <p className="text-xs font-bold mt-1">ACADEMIC YEAR 2024-2025</p>
        </div>

        {/* Content Section */}
        <div className="flex p-3 bg-white">
          {/* Left side - Information */}
          <div className="flex-1 space-y-1">
            <div className="space-y-1 text-xs">
              <div className="flex">
                <span className="w-14 font-medium">NAME :</span>
                <span className="font-bold uppercase">{staff.name}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">DESIG. :</span>
                <span className="font-bold">{staff.designation}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">DEPT. :</span>
                <span className="font-bold">{staff.department}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">EMP.ID :</span>
                <span className="font-bold">{staff.id}</span>
              </div>
              <div className="flex">
                <span className="w-14 font-medium">ADD. :</span>
                <div className="font-bold text-xs leading-tight">
                  {staff.address || "16&17, GANESH PRASAD BLDG.,\nOPP.OM BUNGLOW, AYARE RD.,\nDOMBIVLI(E)"}
                </div>
              </div>
              <div className="flex mt-2">
                <span className="w-14 font-medium">PHONE :</span>
                <span className="font-bold">{staff.phone || "2883033 / 9821463433"}</span>
              </div>
            </div>
            
            {/* Footer note */}
            <div className="mt-4 text-xs text-red-600">
              <p>This card is not transferrable. Loss of card to be reported</p>
              <p>to issuing authority. Duplicate card will be charged extra.</p>
              <p>Misuse in any form invite disciplinary action.</p>
            </div>
            
            {/* Signatures */}
            <div className="flex justify-between mt-3 text-xs">
              <div className="text-center">
                <div className="font-bold">Principal</div>
              </div>
              <div className="text-center">
                <div className="font-bold">Hon.Secretary & IT CEO</div>
              </div>
            </div>
          </div>

          {/* Right side - Photo */}
          <div className="ml-3">
            <div className="w-20 h-24 bg-white border-2 border-gray-800 overflow-hidden">
              <img
                src={`https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=96&fit=crop&crop=center`}
                alt={staff.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Back of the card */}
      <Card className="w-80 h-96 mx-auto mt-4 bg-white border-2 border-gray-300 relative overflow-hidden print:shadow-none">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-green-800 text-white p-3 text-center">
            <h4 className="font-bold text-sm">INSTRUCTIONS & EMERGENCY CONTACT</h4>
          </div>

          <div className="p-4 flex-1">
            <div className="space-y-3">
              <div>
                <h5 className="font-bold text-xs text-green-600 mb-2">INSTRUCTIONS:</h5>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>• This card must be carried at all times on school premises</li>
                  <li>• Loss of card should be reported immediately</li>
                  <li>• Card is not transferable</li>
                  <li>• Present this card when requested by school authorities</li>
                  <li>• Maintain professional conduct while representing the school</li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <h5 className="font-bold text-xs text-green-600 mb-2">EMERGENCY CONTACT:</h5>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{staff.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-xs">{staff.email}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600">Address:</span>
                    <p className="text-xs mt-1 font-medium">{staff.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-100 p-3 border-t">
            <p className="text-xs text-center text-gray-600 font-medium">
              If found, please return to Chandrakant Patkar Vidyalaya
            </p>
            <p className="text-xs text-center text-gray-600 mt-1">
              Dombivli (E), Maharashtra | Phone: 025-6464468
            </p>
            <p className="text-xs text-center text-gray-500 mt-1">
              Email: info@cpvidyalaya.edu.in | www.cpvidyalaya.edu.in
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}