import { Button } from "@/components/ui/button";
import { 
  Download, 
  Mail, 
  Printer, 
  Trash2, 
  CheckCircle2,
  FileDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onExportSelected: () => void;
  onSendReminders: () => void;
  onPrintReceipts: () => void;
  onMarkAsPaid?: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onExportSelected,
  onSendReminders,
  onPrintReceipts,
  onMarkAsPaid,
  onDelete,
  onClearSelection
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border animate-fade-in">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <span className="font-medium">
          {selectedCount} record{selectedCount > 1 ? 's' : ''} selected
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearSelection}
          className="text-xs"
        >
          Clear selection
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportSelected}>
              <FileDown className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportSelected}>
              <FileDown className="h-4 w-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportSelected}>
              <FileDown className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          size="sm"
          onClick={onSendReminders}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Send Reminders
        </Button>

        <Button 
          variant="outline" 
          size="sm"
          onClick={onPrintReceipts}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Receipts
        </Button>

        {onMarkAsPaid && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onMarkAsPaid}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark as Paid
          </Button>
        )}

        {onDelete && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
