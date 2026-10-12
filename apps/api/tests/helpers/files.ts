import { Document, Packer, Paragraph } from 'docx';

export const RESUME_LINES = [
  'Asha Rao',
  'asha@example.com | +91 98765 43210',
  'Backend Engineer with experience in Node.js and MongoDB.',
  'Skills: TypeScript, Node.js, MongoDB',
];

/**
 * Builds a minimal, valid single-page text PDF by hand. (pdfkit output intermittently trips pdf.js
 * with "bad XRef entry", which made tests flaky; this is deterministic.)
 */
export function makePdf(lines: string[] = RESUME_LINES): Promise<Buffer> {
  const esc = (t: string) => t.replace(/[\\()]/g, '\\$&');
  const content = `BT /F1 12 Tf 14 TL 50 740 Td ${lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = Buffer.byteLength(pdf);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Promise.resolve(Buffer.from(pdf, 'latin1'));
}

export async function makeDocx(lines: string[] = RESUME_LINES): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: lines.map((text) => new Paragraph(text)) }] });
  return Packer.toBuffer(doc);
}
