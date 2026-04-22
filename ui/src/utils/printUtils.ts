// Print utilities for various components

export interface PrintOptions {
  title?: string;
  styles?: string;
  beforePrint?: () => void;
  afterPrint?: () => void;
}

/**
 * Print a specific element by its ID
 */
export function printElement(elementId: string, options?: PrintOptions): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID "${elementId}" not found`);
    return;
  }

  printContent(element.innerHTML, options);
}

/**
 * Print HTML content
 */
export function printContent(html: string, options?: PrintOptions): void {
  const { title = 'Print', styles = '', beforePrint, afterPrint } = options || {};

  // Create print window
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  // Write HTML to print window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
            color: #000;
            background: #fff;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .no-print {
              display: none !important;
            }
            
            .page-break {
              page-break-after: always;
            }
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f4f4f4;
            font-weight: bold;
          }
          
          h1, h2, h3 {
            margin: 10px 0;
          }
          
          ${styles}
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load
  printWindow.onload = () => {
    beforePrint?.();
    printWindow.focus();
    printWindow.print();
    afterPrint?.();
    printWindow.close();
  };
}

/**
 * Export table data to printable format
 */
export function printTable<T extends Record<string, any>>(
  data: T[],
  columns: Array<{ key: keyof T; label: string }>,
  options?: PrintOptions & { tableTitle?: string }
): void {
  const { tableTitle, ...printOptions } = options || {};

  const html = `
    ${tableTitle ? `<h2>${tableTitle}</h2>` : ''}
    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${col.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${columns
              .map((col) => {
                const value = row[col.key];
                return `<td>${value !== null && value !== undefined ? String(value) : ''}</td>`;
              })
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  printContent(html, printOptions);
}

/**
 * Print report with header and footer
 */
export function printReport(
  content: string,
  options?: PrintOptions & {
    header?: string;
    footer?: string;
    orientation?: 'portrait' | 'landscape';
  }
): void {
  const { header, footer, orientation = 'portrait', ...printOptions } = options || {};

  const orientationStyles =
    orientation === 'landscape'
      ? `
    @page {
      size: landscape;
    }
  `
      : '';

  const html = `
    ${header ? `<div class="report-header">${header}</div>` : ''}
    <div class="report-content">${content}</div>
    ${footer ? `<div class="report-footer">${footer}</div>` : ''}
  `;

  const styles = `
    .report-header {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .report-footer {
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
    
    ${orientationStyles}
    ${printOptions.styles || ''}
  `;

  printContent(html, { ...printOptions, styles });
}

/**
 * Hook for print functionality
 */
export function usePrint() {
  const handlePrint = (
    content: string | (() => string),
    options?: PrintOptions
  ) => {
    const html = typeof content === 'function' ? content() : content;
    printContent(html, options);
  };

  const handlePrintElement = (elementId: string, options?: PrintOptions) => {
    printElement(elementId, options);
  };

  return {
    print: handlePrint,
    printElement: handlePrintElement,
  };
}
