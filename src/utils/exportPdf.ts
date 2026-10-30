import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DownloadTask } from '../types';

export function exportLibraryToPdf(library: DownloadTask[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner
  doc.setFillColor(11, 12, 16);
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Downloader - Library Summary', 14, 18);

  // Subtitle / generated timestamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  const nowStr = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Exported on ${nowStr} · Total Records: ${library.length}`, 14, 28);

  // Stats Box summary
  const videoCount = library.filter((t) => t.type === 'video').length;
  const audioCount = library.filter((t) => t.type === 'audio').length;
  const otherCount = library.length - videoCount - audioCount;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, 182, 16, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`Total: ${library.length} items`, 20, 54);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`Videos: ${videoCount}`, 75, 54);
  doc.text(`Audio: ${audioCount}`, 120, 54);
  doc.text(`Other: ${otherCount}`, 165, 54);

  // Table Data
  const tableData = library.map((item, idx) => {
    const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return [
      idx + 1,
      item.title || 'Untitled Media',
      item.author || item.platform?.name || 'Unknown',
      item.platform?.name || 'Web',
      (item.format || 'MP4').toUpperCase(),
      item.resolution || item.format || 'Standard',
      item.size || 'N/A',
      dateStr,
    ];
  });

  autoTable(doc, {
    startY: 66,
    head: [['#', 'Media Title', 'Creator / Artist', 'Platform', 'Format', 'Quality', 'Size', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
      overflow: 'ellipsize',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15 },
      7: { cellWidth: 15 },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Downloader · Page ${data.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    },
  });

  // Save PDF file
  const dateTag = new Date().toISOString().slice(0, 10);
  doc.save(`Downloader_Library_Summary_${dateTag}.pdf`);
}
