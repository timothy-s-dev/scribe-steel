import { useState } from 'react';
import { compilePdf } from '@/typst/compiler';
import { Button } from '@/components/ui/button';

interface ToolbarProps {
  content: string;
  template: string;
}

export function Toolbar({ content, template }: ToolbarProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    setExporting(true);
    try {
      const pdfBytes = await compilePdf(template + content);
      if (!pdfBytes) return;
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
      <span className="text-sm font-semibold text-foreground">Typst Editor</span>
      <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export PDF'}
      </Button>
    </div>
  );
}
