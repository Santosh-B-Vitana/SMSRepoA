
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IdCard, Printer, Download, Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PrintableIdCard } from "./PrintableIdCard";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Staff {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface IdCardRecord {
  id: string;
  personId: string;
  personName: string;
  personType: 'student' | 'staff';
  idNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

interface IndividualIdCardGeneratorProps {
  students: Student[];
  staff: Staff[];
}

export function IndividualIdCardGenerator({ students, staff }: IndividualIdCardGeneratorProps) {
  const [personType, setPersonType] = useState<'student' | 'staff'>('student');
  const [selectedPerson, setSelectedPerson] = useState("");
  const [idCards, setIdCards] = useState<IdCardRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPerson, setPreviewPerson] = useState<Student | Staff | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing ID card records (mock data)
    const mockIdCards: IdCardRecord[] = [];
    setIdCards(mockIdCards);
  }, []);

  const generateIdCard = () => {
    if (!selectedPerson) {
      toast({
        title: "Error",
        description: "Please select a person",
        variant: "destructive"
      });
      return;
    }

    const person = personType === 'student' 
      ? students.find(s => s.id === selectedPerson)
      : staff.find(s => s.id === selectedPerson);

    if (!person) return;

    // Check if ID card already exists
    const existingCard = idCards.find(card => card.personId === selectedPerson);
    if (existingCard) {
      toast({
        title: "ID Card Exists",
        description: "An ID card for this person already exists",
        variant: "destructive"
      });
      return;
    }

    const newIdCard: IdCardRecord = {
      id: `IDC${String(idCards.length + 1).padStart(3, '0')}`,
      personId: person.id,
      personName: person.name,
      personType,
      idNumber: personType === 'student' ? 
        `STU${(person as Student).rollNo}${new Date().getFullYear()}` :
        `EMP${person.id.slice(-3)}${new Date().getFullYear()}`,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: personType === 'student' ? 
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
        new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active'
    };

    setIdCards(prev => [...prev, newIdCard]);
    toast({
      title: "Success",
      description: `ID card generated for ${person.name}`
    });
  };

  const previewIdCard = () => {
    if (!selectedPerson) {
      toast({
        title: "Error",
        description: "Please select a person first",
        variant: "destructive"
      });
      return;
    }

    const person = personType === 'student' 
      ? students.find(s => s.id === selectedPerson)
      : staff.find(s => s.id === selectedPerson);

    if (person) {
      setPreviewPerson(person);
      setShowPreview(true);
    }
  };

  const downloadIdCard = () => {
    if (previewPerson) {
      toast({
        title: "Download Started",
        description: `Downloading ID card for ${previewPerson.name}`
      });
    }
  };

  const currentPersons = personType === 'student' ? students : staff;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5" />
            Generate Individual ID Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Person Type</label>
              <Select value={personType} onValueChange={(value: 'student' | 'staff') => {
                setPersonType(value);
                setSelectedPerson("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Select {personType === 'student' ? 'Student' : 'Staff Member'}</label>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${personType}`} />
                </SelectTrigger>
                <SelectContent>
                  {currentPersons.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} {personType === 'student' && `(Class ${(person as Student).class}-${(person as Student).section})`}
                      {personType === 'staff' && `(${(person as Staff).designation})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={previewIdCard} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={generateIdCard}>
                <Plus className="h-4 w-4 mr-2" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated ID Cards List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated ID Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {idCards.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No ID cards generated yet</p>
            ) : (
              idCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{card.personName}</p>
                    <p className="text-sm text-muted-foreground">
                      {card.idNumber} • {card.personType} • 
                      <Badge variant={card.status === 'active' ? 'default' : 'destructive'} className="ml-2">
                        {card.status}
                      </Badge>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ID Card Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          {previewPerson && (
            <div>
              <PrintableIdCard 
                person={previewPerson}
                type={personType}
              />
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t print:hidden">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button onClick={downloadIdCard}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
