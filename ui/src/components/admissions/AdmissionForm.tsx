
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdmissionFormData {
  // Student Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  aadharNumber: string;
  
  // Contact Information
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  
  // Academic Information
  previousSchool: string;
  classAppliedFor: string;
  previousClass: string;
  previousPercentage: string;
  
  // Parent Information
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  
  // Documents
  documents: {
    birthCertificate: File | null;
    marksheet: File | null;
    transferCertificate: File | null;
    aadharCard: File | null;
    passport: File | null;
  };
  
  // Additional Information
  hasSpecialNeeds: boolean;
  specialNeedsDetails: string;
  extracurricular: string;
  medicalConditions: string;
}

export function AdmissionForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AdmissionFormData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    aadharNumber: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    previousSchool: "",
    classAppliedFor: "",
    previousClass: "",
    previousPercentage: "",
    fatherName: "",
    fatherOccupation: "",
    fatherPhone: "",
    motherName: "",
    motherOccupation: "",
    motherPhone: "",
    documents: {
      birthCertificate: null,
      marksheet: null,
      transferCertificate: null,
      aadharCard: null,
      passport: null
    },
    hasSpecialNeeds: false,
    specialNeedsDetails: "",
    extracurricular: "",
    medicalConditions: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (documentType: keyof typeof formData.documents, file: File) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: file
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    
    // Mock submission process
    setTimeout(() => {
      toast({
        title: "Application Submitted Successfully!",
        description: "Your admission application has been received. You will receive a confirmation email shortly."
      });
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        bloodGroup: "",
        aadharNumber: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        previousSchool: "",
        classAppliedFor: "",
        previousClass: "",
        previousPercentage: "",
        fatherName: "",
        fatherOccupation: "",
        fatherPhone: "",
        motherName: "",
        motherOccupation: "",
        motherPhone: "",
        documents: {
          birthCertificate: null,
          marksheet: null,
          transferCertificate: null,
          aadharCard: null,
          passport: null
        },
        hasSpecialNeeds: false,
        specialNeedsDetails: "",
        extracurricular: "",
        medicalConditions: ""
      });
      
      setCurrentStep(1);
      setIsSubmitting(false);
    }, 2000);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Student Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input 
                  value={formData.firstName}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input 
                  value={formData.lastName}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <Input 
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => updateFormData('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <Select value={formData.bloodGroup} onValueChange={(value) => updateFormData('bloodGroup', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aadhar Number</Label>
                <Input 
                  value={formData.aadharNumber}
                  onChange={(e) => updateFormData('aadharNumber', e.target.value)}
                  placeholder="Enter 12-digit Aadhar number"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address *</Label>
                <Textarea 
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>City *</Label>
                <Input 
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input 
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Pincode *</Label>
                <Input 
                  value={formData.pincode}
                  onChange={(e) => updateFormData('pincode', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Class Applied For *</Label>
                <Select value={formData.classAppliedFor} onValueChange={(value) => updateFormData('classAppliedFor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="lkg">LKG</SelectItem>
                    <SelectItem value="ukg">UKG</SelectItem>
                    <SelectItem value="1">Class 1</SelectItem>
                    <SelectItem value="2">Class 2</SelectItem>
                    <SelectItem value="3">Class 3</SelectItem>
                    <SelectItem value="4">Class 4</SelectItem>
                    <SelectItem value="5">Class 5</SelectItem>
                    <SelectItem value="6">Class 6</SelectItem>
                    <SelectItem value="7">Class 7</SelectItem>
                    <SelectItem value="8">Class 8</SelectItem>
                    <SelectItem value="9">Class 9</SelectItem>
                    <SelectItem value="10">Class 10</SelectItem>
                    <SelectItem value="11">Class 11</SelectItem>
                    <SelectItem value="12">Class 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Previous Class</Label>
                <Input 
                  value={formData.previousClass}
                  onChange={(e) => updateFormData('previousClass', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Previous School</Label>
                <Input 
                  value={formData.previousSchool}
                  onChange={(e) => updateFormData('previousSchool', e.target.value)}
                />
              </div>
              <div>
                <Label>Previous Class Percentage</Label>
                <Input 
                  value={formData.previousPercentage}
                  onChange={(e) => updateFormData('previousPercentage', e.target.value)}
                  placeholder="Enter percentage"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Parent Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Father's Name *</Label>
                <Input 
                  value={formData.fatherName}
                  onChange={(e) => updateFormData('fatherName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Father's Occupation</Label>
                <Input 
                  value={formData.fatherOccupation}
                  onChange={(e) => updateFormData('fatherOccupation', e.target.value)}
                />
              </div>
              <div>
                <Label>Father's Phone</Label>
                <Input 
                  value={formData.fatherPhone}
                  onChange={(e) => updateFormData('fatherPhone', e.target.value)}
                />
              </div>
              <div>
                <Label>Mother's Name *</Label>
                <Input 
                  value={formData.motherName}
                  onChange={(e) => updateFormData('motherName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Mother's Occupation</Label>
                <Input 
                  value={formData.motherOccupation}
                  onChange={(e) => updateFormData('motherOccupation', e.target.value)}
                />
              </div>
              <div>
                <Label>Mother's Phone</Label>
                <Input 
                  value={formData.motherPhone}
                  onChange={(e) => updateFormData('motherPhone', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Documents & Additional Information</h3>
            
            <div className="space-y-4">
              <h4 className="font-medium">Required Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(formData.documents).map(([docType, file]) => (
                  <div key={docType} className="border rounded-lg p-4">
                    <Label className="block mb-2">
                      {docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      {['birthCertificate', 'marksheet'].includes(docType) && ' *'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) {
                            handleFileUpload(docType as keyof typeof formData.documents, selectedFile);
                          }
                        }}
                        className="hidden"
                        id={`file-${docType}`}
                      />
                      <label htmlFor={`file-${docType}`} className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </span>
                        </Button>
                      </label>
                      {file && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="special-needs"
                  checked={formData.hasSpecialNeeds}
                  onCheckedChange={(checked) => updateFormData('hasSpecialNeeds', !!checked)}
                />
                <Label htmlFor="special-needs">Student has special needs</Label>
              </div>
              
              {formData.hasSpecialNeeds && (
                <div>
                  <Label>Special Needs Details</Label>
                  <Textarea 
                    value={formData.specialNeedsDetails}
                    onChange={(e) => updateFormData('specialNeedsDetails', e.target.value)}
                    placeholder="Please describe the special needs..."
                  />
                </div>
              )}
              
              <div>
                <Label>Extracurricular Activities</Label>
                <Textarea 
                  value={formData.extracurricular}
                  onChange={(e) => updateFormData('extracurricular', e.target.value)}
                  placeholder="List any sports, hobbies, or activities the student is interested in..."
                />
              </div>
              
              <div>
                <Label>Medical Conditions</Label>
                <Textarea 
                  value={formData.medicalConditions}
                  onChange={(e) => updateFormData('medicalConditions', e.target.value)}
                  placeholder="List any medical conditions, allergies, or medications..."
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Admission Application Form</CardTitle>
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            {currentStep === totalSteps ? (
              <Button 
                type="button" 
                onClick={submitApplication}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </Button>
            ) : (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
