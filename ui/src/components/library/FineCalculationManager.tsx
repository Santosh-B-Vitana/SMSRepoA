import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Settings } from "lucide-react";

interface OverdueBook {
  id: string;
  studentName: string;
  bookTitle: string;
  issuedDate: string;
  dueDate: string;
  daysOverdue: number;
  fineAmount: number;
  status: 'unpaid' | 'paid';
}

export function FineCalculationManager() {
  const [finePerDay, setFinePerDay] = useState(5);
  const [overdueBooks, setOverdueBooks] = useState<OverdueBook[]>([
    {
      id: "OD001",
      studentName: "Aarav Gupta",
      bookTitle: "Introduction to Physics",
      issuedDate: "2024-03-01",
      dueDate: "2024-03-15",
      daysOverdue: 10,
      fineAmount: 50,
      status: "unpaid"
    },
    {
      id: "OD002",
      studentName: "Ananya Sharma",
      bookTitle: "Mathematics Grade 10",
      issuedDate: "2024-03-10",
      dueDate: "2024-03-24",
      daysOverdue: 5,
      fineAmount: 25,
      status: "unpaid"
    }
  ]);
  const { toast } = useToast();

  const markAsPaid = (id: string) => {
    setOverdueBooks(books =>
      books.map(book =>
        book.id === id ? { ...book, status: 'paid' as const } : book
      )
    );
    toast({
      title: "Success",
      description: "Fine payment recorded"
    });
  };

  const recalculateFines = () => {
    setOverdueBooks(books =>
      books.map(book => ({
        ...book,
        fineAmount: book.daysOverdue * finePerDay
      }))
    );
    toast({
      title: "Success",
      description: "Fines recalculated based on new rate"
    });
  };

  const totalFines = overdueBooks
    .filter(b => b.status === 'unpaid')
    .reduce((sum, book) => sum + book.fineAmount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Fine Calculation & Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <Label>Fine Per Day (₹)</Label>
            <Input
              type="number"
              value={finePerDay}
              onChange={(e) => setFinePerDay(Number(e.target.value))}
            />
          </div>
          <Button onClick={recalculateFines}>
            <Settings className="h-4 w-4 mr-2" />
            Recalculate Fines
          </Button>
        </div>

        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Unpaid Fines</span>
            <span className="text-2xl font-bold">₹{totalFines}</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Book Title</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead>Fine Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overdueBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.studentName}</TableCell>
                <TableCell>{book.bookTitle}</TableCell>
                <TableCell>{book.dueDate}</TableCell>
                <TableCell className="text-red-600 font-medium">{book.daysOverdue} days</TableCell>
                <TableCell className="font-bold">₹{book.fineAmount}</TableCell>
                <TableCell>
                  <Badge variant={book.status === 'paid' ? 'default' : 'destructive'}>
                    {book.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {book.status === 'unpaid' && (
                    <Button size="sm" onClick={() => markAsPaid(book.id)}>
                      Mark as Paid
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
