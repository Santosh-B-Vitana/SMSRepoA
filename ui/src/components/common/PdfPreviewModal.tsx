import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useMemo } from "react";
import { PdfCanvasViewer } from "./PdfCanvasViewer";

interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  fileName: string;
}

export function PdfPreviewModal({ open, onClose, pdfUrl, fileName }: PdfPreviewModalProps) {
  const { t } = useLanguage();

  const iframeSrc = useMemo(() => {
    if (!pdfUrl) return '';
    const isBlobOrData = pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:');
    return isBlobOrData ? pdfUrl : `${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`;
  }, [pdfUrl]);

  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(pdfUrl); } catch {}
      }
    };
  }, [pdfUrl]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Certificate</title>
            <style>
              body { margin: 0; padding: 0; }
              embed { width: 100%; height: 100vh; }
            </style>
          </head>
          <body>
            <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%" />
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const handleDownload = async () => {
    try {
      const isBlobOrData = pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:');
      if (isBlobOrData) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">{t('common.preview') || 'Preview'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('common.previewDesc') || 'Preview the document before printing or downloading'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden bg-muted/20 p-4">
          <div className="w-full h-full bg-background rounded-lg shadow-lg overflow-hidden border-2 border-border flex flex-col">
            <div className="flex justify-end gap-2 p-2 border-b bg-muted/50">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                {t('common.download')}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                {t('common.print')}
              </Button>
            </div>
            <div className="flex-1 relative">
              <PdfCanvasViewer pdfUrl={pdfUrl} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-card">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
