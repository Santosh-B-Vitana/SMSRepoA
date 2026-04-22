
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Book, BookOpen, Users, Clock, Search, Plus, ArrowUpDown, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockApi, Student } from "../../services/mockApi";

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  publicationYear: number;
  totalCopies: number;
  availableCopies: number;
  location: string;
  status: 'available' | 'maintenance' | 'lost';
}

interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  studentName: string;
  bookTitle: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue';
  fine: number;
}

const mockBooks: LibraryBook[] = [
  {
    id: "BOOK001",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "978-0-06-112008-4",
    category: "Fiction",
    publisher: "J.B. Lippincott & Co.",
    publicationYear: 1960,
    totalCopies: 5,
    availableCopies: 3,
    location: "A-1-01",
    status: "available"
  },
  {
    id: "BOOK002",
    title: "1984",
    author: "George Orwell",
    isbn: "978-0-452-28423-4",
    category: "Fiction",
    publisher: "Secker & Warburg",
    publicationYear: 1949,
    totalCopies: 4,
    availableCopies: 1,
    location: "A-1-02",
    status: "available"
  },
  {
    id: "BOOK003",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    isbn: "978-0-7432-7356-5",
    category: "Fiction",
    publisher: "Charles Scribner's Sons",
    publicationYear: 1925,
    totalCopies: 6,
    availableCopies: 4,
    location: "A-1-03",
    status: "available"
  }
];

export function LibraryManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>(mockBooks);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showIssueBook, setShowIssueBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentsData = await mockApi.getStudents();
        setStudents(studentsData);
        
        // Generate mock issues
        const mockIssues: BookIssue[] = [
          {
            id: "ISS001",
            bookId: "BOOK001",
            studentId: "STU001",
            studentName: "Alice Johnson",
            bookTitle: "To Kill a Mockingbird",
            issueDate: "2024-01-15",
            dueDate: "2024-02-15",
            status: "issued",
            fine: 0
          },
          {
            id: "ISS002",
            bookId: "BOOK002",
            studentId: "STU002",
            studentName: "David Chen",
            bookTitle: "1984",
            issueDate: "2024-01-10",
            dueDate: "2024-02-10",
            returnDate: "2024-02-08",
            status: "returned",
            fine: 0
          }
        ];
        setIssues(mockIssues);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast({
          title: "Error",
          description: "Failed to load library data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.isbn.includes(searchTerm);
    const matchesCategory = categoryFilter === "all" || book.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(books.map(book => book.category))];
  const currentIssues = issues.filter(issue => issue.status === 'issued');
  const overdueIssues = issues.filter(issue => {
    if (issue.status !== 'issued') return false;
    return new Date(issue.dueDate) < new Date();
  });

  const issueBook = async (bookId: string, studentId: string) => {
    try {
      const book = books.find(b => b.id === bookId);
      const student = students.find(s => s.id === studentId);
      
      if (!book || !student || book.availableCopies <= 0) {
        throw new Error("Invalid selection or no copies available");
      }

      const newIssue: BookIssue = {
        id: `ISS${String(issues.length + 1).padStart(3, '0')}`,
        bookId,
        studentId,
        studentName: student.name,
        bookTitle: book.title,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'issued',
        fine: 0
      };

      setIssues(prev => [...prev, newIssue]);
      setBooks(prev => prev.map(b => 
        b.id === bookId 
          ? { ...b, availableCopies: b.availableCopies - 1 }
          : b
      ));

      toast({
        title: "Success",
        description: `Book issued to ${student.name}`
      });
      setShowIssueBook(false);
      setSelectedBook(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to issue book",
        variant: "destructive"
      });
    }
  };

  const returnBook = async (issueId: string) => {
    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) throw new Error("Issue not found");

      const isOverdue = new Date(issue.dueDate) < new Date();
      const fine = isOverdue ? Math.ceil((Date.now() - new Date(issue.dueDate).getTime()) / (1000 * 60 * 60 * 24)) * 2 : 0;

      setIssues(prev => prev.map(i => 
        i.id === issueId 
          ? { ...i, status: 'returned' as const, returnDate: new Date().toISOString().split('T')[0], fine }
          : i
      ));

      setBooks(prev => prev.map(b => 
        b.id === issue.bookId 
          ? { ...b, availableCopies: b.availableCopies + 1 }
          : b
      ));

      toast({
        title: "Success",
        description: `Book returned${fine > 0 ? ` with $${fine} fine` : ''}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to return book",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Library Management</h1>
          <p className="text-muted-foreground">Manage books, issues, and returns</p>
        </div>
        <Button onClick={() => setShowAddBook(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                <p className="text-2xl font-bold">{books.reduce((sum, book) => sum + book.totalCopies, 0)}</p>
              </div>
              <Book className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{books.reduce((sum, book) => sum + book.availableCopies, 0)}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Issued</p>
                <p className="text-2xl font-bold">{currentIssues.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{overdueIssues.length}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Library Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="books" className="space-y-4">
            <TabsList className="w-full h-auto flex flex-wrap sm:flex-nowrap gap-1 p-1">
              <TabsTrigger value="books" className="flex-1 min-w-[80px] text-xs sm:text-sm">Books</TabsTrigger>
              <TabsTrigger value="issues" className="flex-1 min-w-[90px] text-xs sm:text-sm">Current Issues</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 min-w-[90px] text-xs sm:text-sm">Issue History</TabsTrigger>
            </TabsList>

            <TabsContent value="books" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search books by title, author, or ISBN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total/Available</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{book.category}</Badge>
                      </TableCell>
                      <TableCell>{book.totalCopies}/{book.availableCopies}</TableCell>
                      <TableCell>{book.location}</TableCell>
                      <TableCell>
                        <Badge variant={book.status === 'available' ? 'default' : 'destructive'}>
                          {book.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={book.availableCopies === 0}
                          onClick={() => {
                            setSelectedBook(book);
                            setShowIssueBook(true);
                          }}
                        >
                          Issue
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentIssues.map((issue) => {
                    const isOverdue = new Date(issue.dueDate) < new Date();
                    return (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">{issue.studentName}</TableCell>
                        <TableCell>{issue.bookTitle}</TableCell>
                        <TableCell>{new Date(issue.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          {new Date(issue.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isOverdue ? 'destructive' : 'default'}>
                            {isOverdue ? 'Overdue' : 'Issued'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => returnBook(issue.id)}
                          >
                            Return
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.filter(issue => issue.status === 'returned').map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.studentName}</TableCell>
                      <TableCell>{issue.bookTitle}</TableCell>
                      <TableCell>{new Date(issue.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>${issue.fine}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Returned</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Issue Book Dialog */}
      <Dialog open={showIssueBook} onOpenChange={setShowIssueBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book: {selectedBook?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Student</Label>
              <Select onValueChange={(studentId) => {
                if (selectedBook) {
                  issueBook(selectedBook.id, studentId);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - Class {student.class}-{student.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
