import { rateLimiter } from './rateLimiter';

export interface Book {
  id: string;
  schoolId: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher?: string;
  publishedYear?: number;
  totalCopies: number;
  availableCopies: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookIssue {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue';
  fine?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryFilters {
  category?: string;
  searchQuery?: string;
  status?: 'issued' | 'returned' | 'overdue';
  studentId?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const booksCache = new Map<string, { data: Book[]; timestamp: number }>();
const issuesCache = new Map<string, { data: BookIssue[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function generateMockBooks(schoolId: string): Book[] {
  const categories = ['Fiction', 'Science', 'History', 'Mathematics', 'Literature'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `book-${schoolId}-${i + 1}`,
    schoolId,
    title: `Book Title ${i + 1}`,
    author: `Author ${i + 1}`,
    isbn: `ISBN-${1000 + i}`,
    category: categories[i % categories.length],
    publisher: `Publisher ${i % 10}`,
    publishedYear: 2000 + (i % 24),
    totalCopies: 5 + (i % 10),
    availableCopies: 1 + (i % 5),
    location: `Shelf ${String.fromCharCode(65 + (i % 10))}-${i % 20}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function generateMockIssues(schoolId: string): BookIssue[] {
  const statuses: BookIssue['status'][] = ['issued', 'returned', 'overdue'];
  
  return Array.from({ length: 30 }, (_, i) => ({
    id: `issue-${schoolId}-${i + 1}`,
    schoolId,
    bookId: `book-${schoolId}-${i + 1}`,
    bookTitle: `Book Title ${i + 1}`,
    studentId: `stu-${i + 1}`,
    studentName: `Student ${i + 1}`,
    issueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    returnDate: i % 3 === 0 ? new Date().toISOString().split('T')[0] : undefined,
    status: statuses[i % statuses.length],
    fine: i % 5 === 0 ? 50 : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

export const libraryService = {
  async getBooks(
    schoolId: string,
    filters?: LibraryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Book>> {
    await rateLimiter.checkLimitAsync(`library:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockBooks(schoolId);

    if (filters?.category) {
      data = data.filter(b => b.category === filters.category);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      data = data.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query) ||
        b.isbn.toLowerCase().includes(query)
      );
    }

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedData = data.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize)
    };
  },

  async getBookIssues(
    schoolId: string,
    filters?: LibraryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<BookIssue>> {
    await rateLimiter.checkLimitAsync(`library:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    let data = generateMockIssues(schoolId);

    if (filters?.status) {
      data = data.filter(i => i.status === filters.status);
    }
    if (filters?.studentId) {
      data = data.filter(i => i.studentId === filters.studentId);
    }

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedData = data.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize)
    };
  },

  async addBook(schoolId: string, book: Omit<Book, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    await rateLimiter.checkLimitAsync(`library:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newBook: Book = {
      id: `book-${schoolId}-${Date.now()}`,
      schoolId,
      ...book,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    booksCache.clear();
    return newBook;
  },

  async issueBook(
    schoolId: string,
    issue: Omit<BookIssue, 'id' | 'schoolId' | 'createdAt' | 'updatedAt'>
  ): Promise<BookIssue> {
    await rateLimiter.checkLimitAsync(`library:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const newIssue: BookIssue = {
      id: `issue-${schoolId}-${Date.now()}`,
      schoolId,
      ...issue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    issuesCache.clear();
    return newIssue;
  },

  async returnBook(schoolId: string, issueId: string): Promise<BookIssue> {
    await rateLimiter.checkLimitAsync(`library:${schoolId}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    const returnedIssue: BookIssue = {
      id: issueId,
      schoolId,
      bookId: 'book-1',
      bookTitle: 'Sample Book',
      studentId: 'stu-1',
      studentName: 'Sample Student',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      returnDate: new Date().toISOString().split('T')[0],
      status: 'returned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    issuesCache.clear();
    return returnedIssue;
  }
};
