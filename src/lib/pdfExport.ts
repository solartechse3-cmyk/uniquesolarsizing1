import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Helper to convert any modern CSS color functions (like oklch, oklab, lch, lab, color-mix)
 * into standard rgb/rgba/hex using a temporary canvas context or fallback hex.
 */
export function convertModernColorsToRgb(str: string, ctx?: CanvasRenderingContext2D | null): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('lch') && !str.includes('lab') && !str.includes('color-mix')) {
    return str;
  }
  // Matches oklch(...), oklab(...), lch(...), lab(...), color-mix(...) including nested parens
  const modernColorRegex = /(?:oklch|oklab|lch|lab|color-mix)\s*\((?:[^()]+|\([^()]*\))*\)/gi;
  return str.replace(modernColorRegex, (match) => {
    if (ctx) {
      try {
        ctx.fillStyle = match;
        const resolved = ctx.fillStyle;
        if (resolved) {
          return resolved;
        }
      } catch {}
    }
    return '#1e293b';
  });
}

/**
 * Sanitizes an element by resolving any modern CSS color functions (like oklch)
 * into standard rgb/rgba/hex using a temporary 2D canvas context.
 */
export function sanitizeColorsForCanvas(rootEl: HTMLElement) {
  try {
    const helperCanvas = document.createElement('canvas');
    helperCanvas.width = 1;
    helperCanvas.height = 1;
    const ctx = helperCanvas.getContext('2d', { willReadFrequently: true });

    const allElements = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))] as HTMLElement[];

    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);
      
      const colorProps = [
        'color',
        'backgroundColor',
        'borderColor',
        'borderTopColor',
        'borderBottomColor',
        'borderLeftColor',
        'borderRightColor',
        'outlineColor',
        'boxShadow',
        'textDecorationColor',
        'accentColor',
        'caretColor'
      ] as const;

      colorProps.forEach((prop) => {
        try {
          const val = computed[prop as any] || (el.style && (el.style as any)[prop]);
          if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('lch') || val.includes('lab') || val.includes('color-mix'))) {
            el.style[prop as any] = convertModernColorsToRgb(val, ctx);
          }
        } catch (e) {
          if (prop === 'color') el.style.color = '#0f172a';
          if (prop === 'backgroundColor') el.style.backgroundColor = '#ffffff';
          if (prop.includes('Border') || prop.includes('border')) el.style[prop as any] = '#e2e8f0';
          if (prop === 'boxShadow') el.style.boxShadow = 'none';
        }
      });

      // Also sanitize SVG attributes and inline styles for fill and stroke if present
      ['fill', 'stroke'].forEach((attr) => {
        try {
          const attrVal = el.getAttribute(attr);
          if (attrVal && (attrVal.includes('oklch') || attrVal.includes('oklab') || attrVal.includes('lch') || attrVal.includes('lab'))) {
            el.setAttribute(attr, convertModernColorsToRgb(attrVal, ctx));
          }
          const compVal = computed[attr as any];
          if (compVal && typeof compVal === 'string' && (compVal.includes('oklch') || compVal.includes('oklab') || compVal.includes('lch') || compVal.includes('lab'))) {
            (el.style as any)[attr] = convertModernColorsToRgb(compVal, ctx);
          }
        } catch {}
      });
    });
  } catch (err) {
    console.warn('Color sanitization notice:', err);
  }
}

/**
 * Universal document sanitizer before html2canvas render to eliminate all oklch errors
 */
export function sanitizeDocumentForCanvas(clonedDoc: Document, clonedEl?: HTMLElement) {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const helperCanvas = document.createElement('canvas');
    helperCanvas.width = 1;
    helperCanvas.height = 1;
    ctx = helperCanvas.getContext('2d', { willReadFrequently: true });
  } catch {}

  if (clonedEl) {
    sanitizeColorsForCanvas(clonedEl);
  }

  try {
    clonedDoc.querySelectorAll('style').forEach((styleTag) => {
      if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab') || styleTag.textContent.includes('lch') || styleTag.textContent.includes('lab') || styleTag.textContent.includes('color-mix'))) {
        styleTag.textContent = convertModernColorsToRgb(styleTag.textContent, ctx);
      }
    });
  } catch (e) {
    // Non-blocking fallback
  }
}

/**
 * Builds a standalone, self-contained HTML string of the printable A4 document
 * with all Tailwind CSS styles and print media rules.
 */
function buildPrintableHtml(elementHtml: string, title = 'Solar Engineering Report'): string {
  // Collect all existing stylesheets from the document
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleTag) => {
    stylesHtml += styleTag.outerHTML;
  });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${stylesHtml}
    <style>
      @page {
        size: A4 portrait;
        margin: 6mm 8mm 6mm 8mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        width: 100% !important;
        height: auto !important;
      }
      .a4-page-container {
        width: 100% !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }
      .no-print-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
        color: #f8fafc;
        padding: 12px 24px;
        position: sticky;
        top: 0;
        z-index: 9999;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      @media print {
        .no-print-bar {
          display: none !important;
        }
        body {
          padding: 0 !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="no-print-bar">
      <div style="font-weight: bold; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <span>🖨️ ${title} (Local Printer Integration)</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button onclick="window.print()" style="background: #f59e0b; color: #000; font-weight: bold; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 13px;">
          🖨️ ပရင်တာသို့ တိုက်ရိုက် Print ထုတ်မည် (Print Now)
        </button>
        <button onclick="window.close()" style="background: #334155; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 13px;">
          ပိတ်မည် (Close)
        </button>
      </div>
    </div>
    <div style="width: 100%; max-width: 210mm; margin: 15px auto; padding: 0 10px;">
      ${elementHtml}
    </div>
    <script>
      // Auto-trigger native OS printer dialog for local printer connection
      window.onload = function() {
        setTimeout(function() {
          try {
            window.focus();
            window.print();
          } catch(e) {
            console.error('Auto print error:', e);
          }
        }, 500);
      };
    </script>
  </body>
</html>`;
}

/**
 * Exports any DOM element to a professional, high-resolution A4 PDF file
 * Handles single-page and multi-page documents seamlessly without squishing.
 * @param element The HTML element containing the A4 document layout
 * @param filename The desired filename (e.g. 'DC_Breaker_Protection_Report.pdf')
 */
export async function exportElementToA4Pdf(
  element: HTMLElement,
  filename: string
): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2.0,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc, clonedElement) => {
        sanitizeDocumentForCanvas(clonedDoc, clonedElement as HTMLElement);
        
        const clonedA4 = clonedDoc.getElementById(element.id) || clonedDoc.querySelector('.a4-page-container');
        if (clonedA4) {
          (clonedA4 as HTMLElement).style.borderRadius = '0px';
          (clonedA4 as HTMLElement).style.boxShadow = 'none';
          (clonedA4 as HTMLElement).style.border = 'none';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfPageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    // Calculate total height of the canvas rendered at 210mm width
    const totalImgHeightMm = (canvas.height * pdfPageWidth) / canvas.width;

    if (totalImgHeightMm <= pdfPageHeight + 2) {
      // Single page document
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, totalImgHeightMm, undefined, 'FAST');
    } else {
      // Multi-page document: slice page-by-page cleanly
      let heightLeftMm = totalImgHeightMm;
      let positionMm = 0;

      pdf.addImage(imgData, 'JPEG', 0, positionMm, pdfPageWidth, totalImgHeightMm, undefined, 'FAST');
      heightLeftMm -= pdfPageHeight;

      while (heightLeftMm > 3) {
        positionMm -= pdfPageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, positionMm, pdfPageWidth, totalImgHeightMm, undefined, 'FAST');
        heightLeftMm -= pdfPageHeight;
      }
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_\u1000-\u109F-]/g, '_');
    pdf.save(safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating A4 PDF export:', error);
    printA4Element(element, filename);
    return false;
  }
}

/**
 * Universal Local Printer Integration:
 * Triggers the computer's OS print dialog (Canon, Epson, HP, Brother, USB/Wi-Fi)
 * using a multi-strategy approach (Popup Window -> Hidden Iframe -> Window Print).
 */
export function printA4Element(element: HTMLElement, title = 'Solar Engineering Report'): boolean {
  try {
    const htmlContent = buildPrintableHtml(element.outerHTML, title);

    // Strategy 1: Open a dedicated Print Window / Tab (Directly connects to Computer's Local Printer)
    try {
      const printWindow = window.open('', '_blank', 'width=950,height=1000,menubar=yes,toolbar=yes,status=yes');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        return true;
      }
    } catch (popupErr) {
      console.warn('Popup window blocked, trying Blob URL / Iframe fallback...', popupErr);
    }

    // Strategy 2: Blob URL popup (bypasses cross-origin iframe restrictions in some browsers)
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const blobWin = window.open(blobUrl, '_blank');
      if (blobWin) {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return true;
      }
    } catch (blobErr) {
      console.warn('Blob window fallback failed:', blobErr);
    }

    // Strategy 3: Hidden iframe printing
    const existingFrame = document.getElementById('solar-print-iframe');
    if (existingFrame) existingFrame.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'solar-print-iframe';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (printErr) {
          console.warn('Iframe print failed, executing direct window.print:', printErr);
          document.body.classList.add('printing-site-survey');
          window.print();
          setTimeout(() => document.body.classList.remove('printing-site-survey'), 1200);
        }
      }, 400);

      return true;
    }
  } catch (err) {
    console.warn('Fallback to standard window.print due to:', err);
  }

  // Strategy 4: Fallback standard window.print with CSS isolation
  document.body.classList.add('printing-site-survey');
  try {
    window.print();
  } catch (e) {
    console.error('Window print error:', e);
  }
  setTimeout(() => {
    document.body.classList.remove('printing-site-survey');
  }, 1200);
  return true;
}
