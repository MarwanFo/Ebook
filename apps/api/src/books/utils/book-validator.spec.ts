import { BadRequestException } from '@nestjs/common';
import { BookFormat } from '@bookflow/shared-types';
import { detectBookFormat, validateBookBuffer } from './book-validator';
import AdmZip from 'adm-zip';

describe('BookValidator', () => {
  const createMockPdfBuffer = (): Buffer => {
    return Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  };

  const createMockEpubBuffer = (): Buffer => {
    const zip = new AdmZip();
    zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf8'));
    zip.addFile(
      'META-INF/container.xml',
      Buffer.from(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        'utf8',
      ),
    );
    return zip.toBuffer();
  };

  it('should detect valid PDF format from magic bytes', () => {
    const pdfBuf = createMockPdfBuffer();
    const result = detectBookFormat(pdfBuf);
    expect(result).not.toBeNull();
    expect(result?.format).toBe(BookFormat.PDF);
    expect(result?.mimeType).toBe('application/pdf');
  });

  it('should detect valid EPUB format from magic bytes and mimetype entry', () => {
    const epubBuf = createMockEpubBuffer();
    const result = detectBookFormat(epubBuf);
    expect(result).not.toBeNull();
    expect(result?.format).toBe(BookFormat.EPUB);
    expect(result?.mimeType).toBe('application/epub+zip');
  });

  it('should return null for non-book binary formats (e.g. JPEG, PNG, TXT)', () => {
    expect(detectBookFormat(Buffer.from('Hello world plain text'))).toBeNull();
    expect(
      detectBookFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBeNull(); // PNG magic bytes
  });

  it('should validate PDF buffer and return metadata and SHA-256 checksum', () => {
    const pdfBuf = createMockPdfBuffer();
    const validated = validateBookBuffer(pdfBuf, 10 * 1024 * 1024);
    expect(validated.format).toBe(BookFormat.PDF);
    expect(validated.mimeType).toBe('application/pdf');
    expect(validated.sizeBytes).toBe(pdfBuf.length);
    expect(validated.checksum).toHaveLength(64);
  });

  it('should reject files exceeding the maximum size limit', () => {
    const pdfBuf = createMockPdfBuffer();
    expect(() => validateBookBuffer(pdfBuf, 10)).toThrow(BadRequestException);
  });

  it('should reject empty files', () => {
    expect(() => validateBookBuffer(Buffer.alloc(0))).toThrow(BadRequestException);
  });
});
