import mammoth from 'mammoth';
import { ResumeFileType } from '../models/resume.model';
import { AppError } from '../utils/AppError';

// pdf-parse's package entry runs debug code on import; the lib file is the safe entry point.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (data: Uint8Array) => Promise<{ text: string }>;

const PDF_MAGIC = Buffer.from('%PDF-');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const EXTENSIONS: Record<string, ResumeFileType> = { '.pdf': 'pdf', '.docx': 'docx' };

/** Determines the real type from the extension AND the file's leading bytes. Rejects everything else. */
export function detectResumeFileType(fileName: string, buffer: Buffer): ResumeFileType {
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  const declared = EXTENSIONS[ext];
  const looksPdf = buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
  const looksZip = buffer.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);
  if ((declared === 'pdf' && looksPdf) || (declared === 'docx' && looksZip)) return declared;
  throw new AppError(415, 'Unsupported file type. Please upload a PDF or DOCX resume.');
}

// pdf.js is handed a standalone copy: it can misread Node Buffers that are slices of the shared pool.
export async function extractText(buffer: Buffer, fileType: ResumeFileType): Promise<string> {
  const raw =
    fileType === 'pdf' ? (await pdfParse(new Uint8Array(buffer))).text : (await mammoth.extractRawText({ buffer })).value;
  return raw.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
