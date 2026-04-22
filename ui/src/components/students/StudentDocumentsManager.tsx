import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/common/FileUpload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Trash2, Upload } from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  url?: string;
}

interface StudentDocumentsManagerProps {
  studentId: string;
  studentName: string;
}

export function StudentDocumentsManager({ studentId, studentName }: StudentDocumentsManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "DOC001",
      name: "Birth Certificate",
      type: "PDF",
      uploadDate: "2024-01-15",
      size: "2.5 MB"
    }
  ]);
  const { toast } = useToast();

  const handleFileUpload = (files: File[]) => {
    const newDocs = files.map((file, index) => ({
      id: `DOC${Date.now()}_${index}`,
      name: file.name,
      type: file.type.split('/')[1].toUpperCase(),
      uploadDate: new Date().toISOString().split('T')[0],
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    }));
    
    setDocuments([...documents, ...newDocs]);
    toast({
      title: "Success",
      description: `${files.length} document(s) uploaded successfully`
    });
  };

  const handleDelete = (docId: string) => {
    setDocuments(documents.filter(doc => doc.id !== docId));
    toast({
      title: "Success",
      description: "Document deleted successfully"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Student Documents - {studentName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          onUpload={async (files) => handleFileUpload(files)}
          accept=".pdf,.jpg,.jpeg,.png"
          maxSize={10}
          multiple
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                <TableCell>{doc.uploadDate}</TableCell>
                <TableCell>{doc.size}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)}>
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
