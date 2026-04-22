import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Plus, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeeComponent {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
}

interface FeeStructure {
  id: string;
  name: string;
  class: string;
  academicYear: string;
  components: FeeComponent[];
  totalAmount: number;
  createdAt: string;
}

export function ImprovedFeesManager() {
  const { t } = useLanguage();
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([
    {
      id: "FS001",
      name: "Class 10 Fee Structure",
      class: "10",
      academicYear: "2024-25",
      components: [
        { id: "FC001", name: "Tuition Fee", amount: 25000, dueDate: "2024-04-15" },
        { id: "FC002", name: "Admission Fee", amount: 5000, dueDate: "2024-04-15" },
        { id: "FC003", name: "Exam Fee", amount: 2000, dueDate: "2024-07-15" }
      ],
      totalAmount: 32000,
      createdAt: "2024-01-15"
    }
  ]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStructure, setNewStructure] = useState({
    name: "",
    class: "",
    academicYear: "",
    components: [] as FeeComponent[]
  });

  const [currentFeeType, setCurrentFeeType] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [currentDueDate, setCurrentDueDate] = useState("");

  const { toast } = useToast();

  const getFeeTypes = () => [
    t('fees.tuitionFee'),
    t('fees.admissionFee'), 
    t('fees.examFee'),
    t('fees.libraryFee'),
    t('fees.labFee'),
    t('fees.sportsFee'),
    t('fees.transportFee'),
    t('fees.hostelFee'),
    t('fees.annualFunctionFee'),
    t('fees.computerFee'),
    t('fees.activityFee'),
    t('fees.others')
  ];

  const addFeeComponent = () => {
    if (!currentFeeType || !currentAmount || !currentDueDate) {
      toast({
        title: t('common.error'),
        description: t('fees.errorFillAllFields'),
        variant: "destructive"
      });
      return;
    }

    const newComponent: FeeComponent = {
      id: `FC${Date.now()}`,
      name: currentFeeType,
      amount: Number(currentAmount),
      dueDate: currentDueDate
    };

    setNewStructure(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));

    setCurrentFeeType("");
    setCurrentAmount("");
    setCurrentDueDate("");
  };

  const removeFeeComponent = (componentId: string) => {
    setNewStructure(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId)
    }));
  };

  const handleAddStructure = () => {
    if (!newStructure.name || !newStructure.class || !newStructure.academicYear || newStructure.components.length === 0) {
      toast({
        title: t('common.error'),
        description: t('fees.errorAddAtLeastOne'),
        variant: "destructive"
      });
      return;
    }

    const totalAmount = newStructure.components.reduce((sum, comp) => sum + comp.amount, 0);

    const structure: FeeStructure = {
      id: `FS${Date.now()}`,
      name: newStructure.name,
      class: newStructure.class,
      academicYear: newStructure.academicYear,
      components: newStructure.components,
      totalAmount,
      createdAt: new Date().toISOString()
    };

    setFeeStructures(prev => [...prev, structure]);
    setNewStructure({
      name: "",
      class: "",
      academicYear: "",
      components: []
    });
    setShowAddDialog(false);

    toast({
      title: t('common.success'),
      description: t('fees.feeStructureAdded')
    });
  };

  const refreshData = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="structure">
        <TabsList className="w-full flex">
          <TabsTrigger value="structure">{t('fees.feeStructure')}</TabsTrigger>
          <TabsTrigger value="receipts">{t('fees.receipts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('fees.feeStructureManagement')}</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={refreshData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('common.refresh')}
                  </Button>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('fees.addFeeStructure')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{t('fees.addNewFeeStructure')}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                          <div>
                            <Label>{t('fees.structureName')}</Label>
                            <Input
                              value={newStructure.name}
                              onChange={(e) => setNewStructure(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., Class 10 Fee Structure"
                            />
                          </div>
                          <div>
                            <Label>{t('fees.class')}</Label>
                            <Input
                              value={newStructure.class}
                              onChange={(e) => setNewStructure(prev => ({ ...prev, class: e.target.value }))}
                              placeholder="10"
                            />
                          </div>
                          <div>
                            <Label>{t('fees.academicYear')}</Label>
                            <Input
                              value={newStructure.academicYear}
                              onChange={(e) => setNewStructure(prev => ({ ...prev, academicYear: e.target.value }))}
                              placeholder="2024-25"
                            />
                          </div>

                          {/* Add Fee Component Section */}
                          <div className="space-y-3 border-t pt-4">
                            <Label className="text-lg font-semibold">{t('fees.addFeeComponents')}</Label>
                            
                            <div>
                              <Label>{t('fees.feeType')}</Label>
                              <Select value={currentFeeType} onValueChange={setCurrentFeeType}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fee type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFeeTypes().map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label>{t('fees.amount')} (₹)</Label>
                              <Input
                                type="number"
                                value={currentAmount}
                                onChange={(e) => setCurrentAmount(e.target.value)}
                                placeholder="5000"
                              />
                            </div>

                            <div>
                              <Label>{t('fees.dueDate')}</Label>
                              <Input
                                type="date"
                                value={currentDueDate}
                                onChange={(e) => setCurrentDueDate(e.target.value)}
                              />
                            </div>

                            <Button onClick={addFeeComponent} className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              {t('fees.addComponent')}
                            </Button>
                          </div>
                        </div>

                        {/* Fee Components List */}
                        <div className="space-y-4">
                          <Label className="text-lg font-semibold">{t('fees.feeComponentsAdded')}</Label>
                          
                          {newStructure.components.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>{t('fees.noComponentsAdded')}</p>
                              <p className="text-sm">{t('fees.addComponentsLeft')}</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {newStructure.components.map((component) => (
                                <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <div className="font-medium">{component.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      ₹{component.amount.toLocaleString()} • Due: {component.dueDate}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFeeComponent(component.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              
                              <div className="border-t pt-2 mt-4">
                                <div className="flex justify-between font-semibold">
                                  <span>{t('fees.totalAmount')}:</span>
                                  <span>₹{newStructure.components.reduce((sum, comp) => sum + comp.amount, 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-6">
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={handleAddStructure}>
                          {t('fees.saveFeeStructure')}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fees.structureName')}</TableHead>
                    <TableHead>{t('fees.class')}</TableHead>
                    <TableHead>{t('fees.academicYear')}</TableHead>
                    <TableHead>{t('fees.components')}</TableHead>
                    <TableHead>{t('fees.totalAmount')}</TableHead>
                    <TableHead>{t('fees.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.map((structure) => (
                    <TableRow key={structure.id}>
                      <TableCell className="font-medium">{structure.name}</TableCell>
                      <TableCell>{structure.class}</TableCell>
                      <TableCell>{structure.academicYear}</TableCell>
                      <TableCell>{structure.components.length}</TableCell>
                      <TableCell>₹{structure.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">{t('common.edit')}</Button>
                          <Button variant="outline" size="sm">{t('common.view')}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('fees.receipts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('fees.noReceiptsGenerated')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}