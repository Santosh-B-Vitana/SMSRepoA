
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, Settings } from "lucide-react";
import { PrintableIdCard } from "./PrintableIdCard";
import { useToast } from "@/hooks/use-toast";

interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Student extends Person {
  rollNo: string;
  class: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
}

interface Staff extends Person {
  designation: string;
  department: string;
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

interface IdCardPrintManagerProps {
  idCards: IdCardRecord[];
  students: Student[];
  staff: Staff[];
  onClose: () => void;
}

export function IdCardPrintManager({ idCards, students, staff, onClose }: IdCardPrintManagerProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [printSettings, setPrintSettings] = useState({
    layout: 'single', // single, double, grid
    quality: 'high',
    includeBack: true
  });
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const handleSelectCard = (cardId: string, selected: boolean) => {
    if (selected) {
      setSelectedCards(prev => [...prev, cardId]);
    } else {
      setSelectedCards(prev => prev.filter(id => id !== cardId));
    }
  };

  const handleSelectAll = () => {
    if (selectedCards.length === idCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(idCards.map(card => card.id));
    }
  };

  const getPersonData = (card: IdCardRecord): Student | Staff | null => {
    if (card.personType === 'student') {
      return students.find(s => s.id === card.personId) || null;
    } else {
      return staff.find(s => s.id === card.personId) || null;
    }
  };

  const handlePrint = () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No Cards Selected",
        description: "Please select at least one ID card to print",
        variant: "destructive"
      });
      return;
    }

    setShowPreview(true);
  };

  const handleDownloadPDF = () => {
    if (selectedCards.length === 0) {
      toast({
        title: "No Cards Selected",
        description: "Please select at least one ID card to download",
        variant: "destructive"
      });
      return;
    }

    // Mock PDF download
    toast({
      title: "PDF Generated",
      description: `Downloading ${selectedCards.length} ID cards as PDF`
    });
  };

  const executePrint = () => {
    window.print();
    setShowPreview(false);
  };

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print ID Cards
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Print Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium">Layout</label>
              <Select value={printSettings.layout} onValueChange={(value) => 
                setPrintSettings(prev => ({ ...prev, layout: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Card per Page</SelectItem>
                  <SelectItem value="double">Two Cards per Page</SelectItem>
                  <SelectItem value="grid">Grid Layout (4 per page)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Quality</label>
              <Select value={printSettings.quality} onValueChange={(value) => 
                setPrintSettings(prev => ({ ...prev, quality: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="includeBack"
                checked={printSettings.includeBack}
                onCheckedChange={(checked) => 
                  setPrintSettings(prev => ({ ...prev, includeBack: checked as boolean }))
                }
              />
              <label htmlFor="includeBack" className="text-sm">Include back side</label>
            </div>
          </div>

          {/* Card Selection */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select ID Cards to Print</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedCards.length === idCards.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-muted-foreground flex items-center">
                  {selectedCards.length} of {idCards.length} selected
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {idCards.map((card) => {
                const person = getPersonData(card);
                const isSelected = selectedCards.includes(card.id);
                
                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectCard(card.id, !isSelected)}
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{card.personName}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.personType === 'student' ? 
                            `Class ${(person as Student)?.class}-${(person as Student)?.section}` :
                            (person as Staff)?.designation
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">ID: {card.idNumber}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Print Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCards.map(cardId => {
              const card = idCards.find(c => c.id === cardId);
              const person = card ? getPersonData(card) : null;
              
              if (!card || !person) return null;
              
              return (
                <PrintableIdCard
                  key={card.id}
                  person={person}
                  type={card.personType}
                />
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t print:hidden">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Settings
            </Button>
            <Button onClick={executePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
