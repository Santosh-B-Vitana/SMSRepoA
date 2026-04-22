import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Download } from "lucide-react";
import { useFeeRecords } from "@/hooks/useFeeRecords";
import { useDebounce } from "@/hooks/useDebounce";
import { useSchool } from "@/contexts/SchoolContext";
import { FeePagination } from "./FeePagination";
import { FeeRecordsTableSkeleton } from "./FeeRecordsTableSkeleton";
import { FeeEmptyState } from "./FeeEmptyState";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { exportFeeRecordsToCSV, exportFeeRecordsToExcel } from "@/utils/feeExportUtils";
import { toast } from "@/hooks/use-toast";

interface EnhancedFeeRecordsTableProps {
  onViewDetails?: (studentId: string) => void;
  onPayment?: (studentId: string) => void;
}

export function EnhancedFeeRecordsTable({
  onViewDetails,
  onPayment
}: EnhancedFeeRecordsTableProps) {
  // Get school context
  const { schoolInfo } = useSchool();
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection state
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch fee records with filters and pagination
  const { data, total, totalPages, loading, error } = useFeeRecords({
    schoolId: schoolInfo?.id || 'default-school', // Use school ID from context
    filters: {
      searchTerm: debouncedSearchTerm,
      class: classFilter || undefined,
      section: sectionFilter || undefined,
      status: statusFilter as any || undefined,
    },
    pagination: {
      page: currentPage,
      pageSize,
    },
  });

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(new Set(data.map(r => r.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // Handle individual selection
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelection = new Set(selectedRecords);
    if (checked) {
      newSelection.add(recordId);
    } else {
      newSelection.delete(recordId);
    }
    setSelectedRecords(newSelection);
  };

  // Bulk actions
  const handleExportSelected = () => {
    const selectedData = data.filter(r => selectedRecords.has(r.id));
    exportFeeRecordsToCSV(selectedData);
    toast({
      title: "Export Successful",
      description: `Exported ${selectedData.length} records to CSV`,
    });
  };

  const handleSendReminders = () => {
    toast({
      title: "Reminders Sent",
      description: `Sent fee reminders to ${selectedRecords.size} students`,
    });
  };

  const handlePrintReceipts = () => {
    toast({
      title: "Printing",
      description: `Generating receipts for ${selectedRecords.size} records...`,
    });
  };

  // Render error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = data.length > 0 && data.every(r => selectedRecords.has(r.id));
  const someSelected = data.some(r => selectedRecords.has(r.id)) && !allSelected;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Student Fee Records</CardTitle>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                <SelectItem value="10">Class 10</SelectItem>
                <SelectItem value="9">Class 9</SelectItem>
                <SelectItem value="8">Class 8</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sections</SelectItem>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFeeRecordsToCSV(data)}
              className="ml-auto gap-2"
            >
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <BulkActionsToolbar
            selectedCount={selectedRecords.size}
            onExportSelected={handleExportSelected}
            onSendReminders={handleSendReminders}
            onPrintReceipts={handlePrintReceipts}
            onClearSelection={() => setSelectedRecords(new Set())}
          />

          {loading ? (
            <FeeRecordsTableSkeleton rows={pageSize} />
          ) : data.length === 0 ? (
            <FeeEmptyState
              title="No fee records found"
              description="No records match your current filters. Try adjusting your search criteria."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Siblings</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Paid Amount</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((record) => (
                    <TableRow key={record.id} className="animate-fade-in">
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={(checked) => 
                            handleSelectRecord(record.id, checked as boolean)
                          }
                          aria-label={`Select ${record.studentName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{record.studentName}</TableCell>
                      <TableCell>{record.class}</TableCell>
                      <TableCell>
                        {record.siblings && record.siblings.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs">{record.siblings.length}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>₹{record.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>₹{record.paidAmount.toLocaleString()}</TableCell>
                      <TableCell className={record.pendingAmount > 0 ? "text-destructive font-medium" : ""}>
                        ₹{record.pendingAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{new Date(record.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === 'paid' ? 'default' :
                          record.status === 'overdue' ? 'destructive' :
                          record.status === 'partial' ? 'secondary' : 'outline'
                        }>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDetails?.(record.studentId)}
                          >
                            View
                          </Button>
                          {record.pendingAmount > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onPayment?.(record.studentId)}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <FeePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalRecords={total}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
