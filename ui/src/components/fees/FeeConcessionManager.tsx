import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Concession {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  concessionType: 'merit' | 'financial' | 'sibling' | 'staff-ward' | 'special';
  percentage: number;
  amount: number;
  academicYear: string;
  validFrom: string;
  validUntil: string;
  reason: string;
  status: 'active' | 'expired' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
}

export default function FeeConcessionManager() {
  const { t } = useLanguage();
  const [concessions, setConcessions] = useState<Concession[]>([
    {
      id: "CON001",
      studentId: "STU001",
      studentName: "Aarav Sharma",
      class: "Class 10 A",
      concessionType: "merit",
      percentage: 50,
      amount: 15000,
      academicYear: "2024-25",
      validFrom: "2024-04-01",
      validUntil: "2025-03-31",
      reason: "Secured first rank in class",
      status: "active",
      approvedBy: "Principal",
      approvedAt: "2024-03-25"
    }
  ]);

  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedConcession, setSelectedConcession] = useState<Concession | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState<Partial<Concession>>({
    academicYear: "2024-25",
    concessionType: "merit",
    status: "active"
  });

  const concessionTypes = [
    { value: "merit", label: t('feeConcession.typeMerit'), color: "bg-green-500" },
    { value: "financial", label: t('feeConcession.typeFinancial'), color: "bg-blue-500" },
    { value: "sibling", label: t('feeConcession.typeSibling'), color: "bg-purple-500" },
    { value: "staff-ward", label: t('feeConcession.typeStaffWard'), color: "bg-orange-500" },
    { value: "special", label: t('feeConcession.typeSpecial'), color: "bg-pink-500" }
  ];

  const academicYears = ["2023-24", "2024-25", "2025-26"];
  const classes = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

  const filteredConcessions = concessions.filter(con => 
    con.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    con.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (!formData.studentName || !formData.class || !formData.percentage) {
      toast.error(t('feeConcession.validationError'));
      return;
    }

    if (editMode && selectedConcession) {
      setConcessions(prev => prev.map(con => 
        con.id === selectedConcession.id ? { ...con, ...formData } as Concession : con
      ));
      toast.success(t('feeConcession.updateSuccess'));
    } else {
      const newConcession: Concession = {
        id: `CON${Date.now()}`,
        studentId: formData.studentId || `STU${Date.now()}`,
        studentName: formData.studentName!,
        class: formData.class!,
        concessionType: formData.concessionType as any,
        percentage: formData.percentage!,
        amount: formData.amount || 0,
        academicYear: formData.academicYear!,
        validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
        validUntil: formData.validUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        reason: formData.reason || "",
        status: "active",
        approvedBy: "Admin",
        approvedAt: new Date().toISOString()
      };
      setConcessions(prev => [...prev, newConcession]);
      toast.success(t('feeConcession.addSuccess'));
    }

    resetForm();
  };

  const handleEdit = (concession: Concession) => {
    setSelectedConcession(concession);
    setFormData(concession);
    setEditMode(true);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('feeConcession.deleteConfirm'))) {
      setConcessions(prev => prev.filter(con => con.id !== id));
      toast.success(t('feeConcession.deleteSuccess'));
    }
  };

  const handleCancel = (id: string) => {
    setConcessions(prev => prev.map(con => 
      con.id === id ? { ...con, status: "cancelled" } : con
    ));
    toast.success(t('feeConcession.cancelSuccess'));
  };

  const resetForm = () => {
    setFormData({
      academicYear: "2024-25",
      concessionType: "merit",
      status: "active"
    });
    setSelectedConcession(null);
    setEditMode(false);
    setShowDialog(false);
  };

  const getConcessionTypeColor = (type: string) => {
    return concessionTypes.find(t => t.value === type)?.color || "bg-muted text-muted-foreground";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">{t('feeConcession.statusActive')}</Badge>;
      case "expired":
        return <Badge variant="outline">{t('feeConcession.statusExpired')}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t('feeConcession.statusCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('feeConcession.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('feeConcession.subtitle')}
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditMode(false)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Concession
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editMode ? t('feeConcession.editTitle') : t('feeConcession.addTitle')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('feeConcession.studentNameLabel')}</Label>
                <Input
                  value={formData.studentName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                  placeholder={t('feeConcession.studentNamePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('feeConcession.studentIdLabel')}</Label>
                <Input
                  value={formData.studentId || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                  placeholder={t('feeConcession.studentIdPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('common.class')}</Label>
                <Select 
                  value={formData.class} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('feeConcession.selectClassPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('feeConcession.academicYearLabel')}</Label>
                <Select 
                  value={formData.academicYear} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, academicYear: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('feeConcession.typeLabel')}</Label>
                <Select 
                  value={formData.concessionType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, concessionType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {concessionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('feeConcession.percentageLabel')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentage || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, percentage: parseFloat(e.target.value) }))}
                  placeholder="0-100"
                />
              </div>

              <div>
                <Label>{t('feeConcession.fixedAmountLabel')}</Label>
                <Input
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  placeholder={t('feeConcession.amountPlaceholder')}
                />
              </div>

              <div>
                <Label>{t('feeConcession.validFromLabel')}</Label>
                <Input
                  type="date"
                  value={formData.validFrom || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                />
              </div>

              <div>
                <Label>{t('feeConcession.validUntilLabel')}</Label>
                <Input
                  type="date"
                  value={formData.validUntil || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('feeConcession.reasonLabel')}</Label>
                <Textarea
                  value={formData.reason || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={t('feeConcession.reasonPlaceholder')}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={resetForm}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {editMode ? t('feeConcession.updateBtn') : t('feeConcession.submitBtn')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('feeConcession.activeTitle')}</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('feeConcession.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('feeConcession.colStudent')}</TableHead>
                <TableHead>{t('common.class')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead>{t('feeConcession.colDiscount')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('feeConcession.colValidPeriod')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConcessions.map((concession) => (
                <TableRow key={concession.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{concession.studentName}</p>
                      <p className="text-sm text-muted-foreground">{concession.studentId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{concession.class}</TableCell>
                  <TableCell>
                    <Badge className={getConcessionTypeColor(concession.concessionType)}>
                      {concessionTypes.find(t => t.value === concession.concessionType)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{concession.percentage}%</TableCell>
                  <TableCell>₹{concession.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(concession.validFrom).toLocaleDateString()} - {new Date(concession.validUntil).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(concession.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(concession)}
                        disabled={concession.status !== 'active'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {concession.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(concession.id)}
                        >
                          <XCircle className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(concession.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredConcessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('feeConcession.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {concessionTypes.map(type => {
          const count = concessions.filter(c => c.concessionType === type.value && c.status === 'active').length;
          const total = concessions
            .filter(c => c.concessionType === type.value && c.status === 'active')
            .reduce((sum, c) => sum + c.amount, 0);
          
          return (
            <Card key={type.value}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{type.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">₹{total.toLocaleString()}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full ${type.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
