import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Download, FileText, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PFRecord {
  id: string;
  staffName: string;
  staffId: string;
  pfNumber: string;
  basicSalary: number;
  employeeContribution: number;
  employerContribution: number;
  month: string;
  year: string;
}

interface ESIRecord {
  id: string;
  staffName: string;
  staffId: string;
  esiNumber: string;
  grossSalary: number;
  employeeContribution: number;
  employerContribution: number;
  month: string;
  year: string;
}

export function PFESIManager() {
  const { t } = useLanguage();
  const [pfRecords] = useState<PFRecord[]>([
    {
      id: '1',
      staffName: 'Rajesh Kumar',
      staffId: 'STF001',
      pfNumber: 'PF12345678',
      basicSalary: 40000,
      employeeContribution: 4800,
      employerContribution: 4800,
      month: 'November',
      year: '2024'
    }
  ]);

  const [esiRecords] = useState<ESIRecord[]>([
    {
      id: '1',
      staffName: 'Priya Sharma',
      staffId: 'STF002',
      esiNumber: 'ESI87654321',
      grossSalary: 20000,
      employeeContribution: 150,
      employerContribution: 525,
      month: 'November',
      year: '2024'
    }
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const calculateTotalPF = () => {
    return pfRecords.reduce((sum, record) => 
      sum + record.employeeContribution + record.employerContribution, 0
    );
  };

  const calculateTotalESI = () => {
    return esiRecords.reduce((sum, record) => 
      sum + record.employeeContribution + record.employerContribution, 0
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('pfesi.title')}</h2>
          <p className="text-muted-foreground">{t('pfesi.subtitle')}</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('pfesi.addRecord')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('pfesi.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('pfesi.dialogDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('pfesi.recordTypeLabel')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('pfesi.selectTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">{t('pfesi.optionPF')}</SelectItem>
                    <SelectItem value="esi">{t('pfesi.optionESI')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('pfesi.staffNameLabel')}</Label>
                  <Input placeholder={t('pfesi.staffPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('pfesi.monthYearLabel')}</Label>
                  <Input type="month" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => { toast.success(t('pfesi.addSuccess')); setIsOpen(false); }}>{t('pfesi.addRecord')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('pfesi.statTotalPF')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{calculateTotalPF().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('pfesi.statThisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('pfesi.statTotalESI')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{calculateTotalESI().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('pfesi.statThisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('pfesi.statPFEmployees')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pfRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('pfesi.statActive')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('pfesi.statESIEmployees')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{esiRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('pfesi.statActive')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('pfesi.contributionTitle')}</CardTitle>
              <CardDescription>{t('pfesi.contributionDesc')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('pfesi.exportChallan')}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                {t('pfesi.generateReport')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pf" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pf">{t('pfesi.tabPF')}</TabsTrigger>
              <TabsTrigger value="esi">{t('pfesi.tabESI')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pf">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pfesi.colStaffDetails')}</TableHead>
                    <TableHead>{t('pfesi.colPFNumber')}</TableHead>
                    <TableHead>{t('pfesi.colBasicSalary')}</TableHead>
                    <TableHead>{t('pfesi.colEmployee12')}</TableHead>
                    <TableHead>{t('pfesi.colEmployer12')}</TableHead>
                    <TableHead>{t('common.period')}</TableHead>
                    <TableHead>{t('common.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{record.staffName}</div>
                          <div className="text-sm text-muted-foreground">{record.staffId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.pfNumber}</TableCell>
                      <TableCell className="font-medium text-foreground">₹{record.basicSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">₹{record.employeeContribution.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">₹{record.employerContribution.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{record.month} {record.year}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          ₹{(record.employeeContribution + record.employerContribution).toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="esi">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pfesi.colStaffDetails')}</TableHead>
                    <TableHead>{t('pfesi.colESINumber')}</TableHead>
                    <TableHead>{t('pfesi.colGrossSalary')}</TableHead>
                    <TableHead>{t('pfesi.colEmployee075')}</TableHead>
                    <TableHead>{t('pfesi.colEmployer325')}</TableHead>
                    <TableHead>{t('common.period')}</TableHead>
                    <TableHead>{t('common.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {esiRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">{record.staffName}</div>
                          <div className="text-sm text-muted-foreground">{record.staffId}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{record.esiNumber}</TableCell>
                      <TableCell className="font-medium text-foreground">₹{record.grossSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">₹{record.employeeContribution.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">₹{record.employerContribution.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">{record.month} {record.year}</TableCell>
                      <TableCell>
                        <Badge variant="default">
                          ₹{(record.employeeContribution + record.employerContribution).toLocaleString()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
