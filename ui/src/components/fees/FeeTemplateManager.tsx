import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, FileText } from "lucide-react";

interface FeeTemplate {
  id: string;
  name: string;
  class: string;
  tuitionFee: number;
  labFee: number;
  libraryFee: number;
  sportsFee: number;
  examFee: number;
  total: number;
  academicYear: string;
}

export function FeeTemplateManager() {
  const [templates, setTemplates] = useState<FeeTemplate[]>([
    {
      id: "TPL001",
      name: "Class 10 Standard Fee",
      class: "10",
      tuitionFee: 25000,
      labFee: 3000,
      libraryFee: 2000,
      sportsFee: 1500,
      examFee: 2500,
      total: 34000,
      academicYear: "2024-25"
    },
    {
      id: "TPL002",
      name: "Class 9 Standard Fee",
      class: "9",
      tuitionFee: 22000,
      labFee: 2500,
      libraryFee: 2000,
      sportsFee: 1500,
      examFee: 2000,
      total: 30000,
      academicYear: "2024-25"
    }
  ]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<FeeTemplate>>({});
  const { toast } = useToast();

  const handleSave = () => {
    const total = (formData.tuitionFee || 0) + 
                  (formData.labFee || 0) + 
                  (formData.libraryFee || 0) + 
                  (formData.sportsFee || 0) + 
                  (formData.examFee || 0);

    const newTemplate: FeeTemplate = {
      id: `TPL${Date.now()}`,
      name: formData.name || "",
      class: formData.class || "",
      tuitionFee: formData.tuitionFee || 0,
      labFee: formData.labFee || 0,
      libraryFee: formData.libraryFee || 0,
      sportsFee: formData.sportsFee || 0,
      examFee: formData.examFee || 0,
      total,
      academicYear: formData.academicYear || "2024-25"
    };

    setTemplates([...templates, newTemplate]);
    setDialogOpen(false);
    setFormData({});
    toast({
      title: "Success",
      description: "Fee template created successfully"
    });
  };

  const handleDuplicate = (template: FeeTemplate) => {
    const newTemplate = {
      ...template,
      id: `TPL${Date.now()}`,
      name: `${template.name} (Copy)`
    };
    setTemplates([...templates, newTemplate]);
    toast({
      title: "Success",
      description: "Template duplicated successfully"
    });
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: "Success",
      description: "Template deleted successfully"
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fee Structure Templates
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Fee Template</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input 
                      value={formData.name || ""} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., Class 10 Standard Fee"
                    />
                  </div>
                  <div>
                    <Label>Class</Label>
                    <Input 
                      value={formData.class || ""} 
                      onChange={(e) => setFormData({...formData, class: e.target.value})}
                      placeholder="e.g., 10"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tuition Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={formData.tuitionFee || ""} 
                      onChange={(e) => setFormData({...formData, tuitionFee: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Lab Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={formData.labFee || ""} 
                      onChange={(e) => setFormData({...formData, labFee: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Library Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={formData.libraryFee || ""} 
                      onChange={(e) => setFormData({...formData, libraryFee: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Sports Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={formData.sportsFee || ""} 
                      onChange={(e) => setFormData({...formData, sportsFee: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Exam Fee (₹)</Label>
                    <Input 
                      type="number" 
                      value={formData.examFee || ""} 
                      onChange={(e) => setFormData({...formData, examFee: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label>Academic Year</Label>
                    <Input 
                      value={formData.academicYear || "2024-25"} 
                      onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">Save Template</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Tuition</TableHead>
              <TableHead>Lab</TableHead>
              <TableHead>Library</TableHead>
              <TableHead>Sports</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell><Badge variant="outline">Class {template.class}</Badge></TableCell>
                <TableCell>₹{template.tuitionFee.toLocaleString()}</TableCell>
                <TableCell>₹{template.labFee.toLocaleString()}</TableCell>
                <TableCell>₹{template.libraryFee.toLocaleString()}</TableCell>
                <TableCell>₹{template.sportsFee.toLocaleString()}</TableCell>
                <TableCell>₹{template.examFee.toLocaleString()}</TableCell>
                <TableCell className="font-bold">₹{template.total.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(template)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
