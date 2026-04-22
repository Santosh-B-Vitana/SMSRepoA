import jsPDF from 'jspdf';

/**
 * Opens a new window that shows the generated PDF inside an iframe with a built-in toolbar
 * and triggers the browser print dialog automatically. Also provides a visible Print button.
 */
export function openPdfInPreview(doc: jsPDF, filename: string, autoPrint: boolean = true) {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    const preview = window.open('', '_blank');
    if (!preview) {
      // Fallback when popups are blocked
      doc.save(filename);
      return;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${filename}</title>
  <style>
    :root {
      --bg: #0b0f19; /* dark primary background for toolbar */
      --bg-subtle: #111827;
      --text: #e5e7eb;
      --accent: #2563eb;
      --accent-2: #10b981;
      --border: rgba(255,255,255,0.12);
    }
    html, body { height: 100%; margin: 0; background: #f3f4f6; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; background: var(--bg); color: var(--text); border-bottom: 1px solid var(--border);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;
    }
    .title { margin-right: auto; font-weight: 600; opacity: .9; font-size: 14px; }
    .btn { appearance: none; border: 1px solid var(--border); color: var(--text); background: transparent; cursor: pointer;
      border-radius: 8px; padding: 8px 12px; font-size: 14px; transition: background .2s, border-color .2s; }
    .btn:hover { background: var(--bg-subtle); border-color: rgba(255,255,255,0.2); }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
    .btn.primary:hover { filter: brightness(0.95); }
    .btn.success { background: var(--accent-2); border-color: var(--accent-2); color: white; }
    .viewer { height: calc(100% - 52px); }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="title">${filename}</div>
    <button id="printBtn" class="btn primary">Print</button>
    <a id="downloadBtn" class="btn" href="${url}" download="${filename}">Download PDF</a>
    <button id="closeBtn" class="btn">Close</button>
  </div>
  <div class="viewer">
    <iframe id="pdfFrame" src="${url}" title="${filename}"></iframe>
  </div>
  <script>
    const iframe = document.getElementById('pdfFrame');
    const printBtn = document.getElementById('printBtn');
    const closeBtn = document.getElementById('closeBtn');

    printBtn.addEventListener('click', () => {
      try { iframe.contentWindow && iframe.contentWindow.focus(); iframe.contentWindow && iframe.contentWindow.print(); } catch (e) { window.print(); }
    });
    closeBtn.addEventListener('click', () => window.close());

    // Auto-print once the PDF is fully loaded
    ${autoPrint ? `iframe.addEventListener('load', () => { setTimeout(() => { try { iframe.contentWindow && iframe.contentWindow.focus(); iframe.contentWindow && iframe.contentWindow.print(); } catch (e) { /* ignore */ } }, 300); });` : ''}
  </script>
</body>
</html>`;

    preview.document.open();
    preview.document.write(html);
    preview.document.close();
  } catch (e) {
    // Last-resort fallback
    doc.save(filename);
  }
}
