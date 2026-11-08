import AdmZip from 'adm-zip';
import { PDFDocument } from 'pdf-lib';
import { EpubParserService } from './epub-parser.service';
import { PdfParserService } from './pdf-parser.service';

describe('Document Parsers', () => {
  describe('EpubParserService', () => {
    let service: EpubParserService;

    beforeEach(() => {
      service = new EpubParserService();
    });

    it('should extract Dublin Core metadata and cover image from valid EPUB archive', async () => {
      const zip = new AdmZip();
      zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf8'));

      const containerXml = `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`;
      zip.addFile('META-INF/container.xml', Buffer.from(containerXml, 'utf8'));

      const opfXml = `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>The Great Novel</dc:title>
          <dc:creator>Jane Doe</dc:creator>
          <dc:description>An epic journey through time.</dc:description>
          <dc:language>en</dc:language>
          <dc:publisher>Acme Publishing</dc:publisher>
          <dc:date>2024-01-15T00:00:00Z</dc:date>
          <dc:identifier id="BookId">urn:isbn:9780123456789</dc:identifier>
        </metadata>
        <manifest>
          <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image" />
          <item id="chapter1" href="text/ch1.xhtml" media-type="application/xhtml+xml" />
        </manifest>
      </package>`;
      zip.addFile('OEBPS/content.opf', Buffer.from(opfXml, 'utf8'));

      const mockCoverJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      zip.addFile('OEBPS/images/cover.jpg', mockCoverJpg);

      const buffer = zip.toBuffer();
      const result = await service.parse(buffer, 'Fallback Filename');

      expect(result.metadata.title).toBe('The Great Novel');
      expect(result.metadata.author).toBe('Jane Doe');
      expect(result.metadata.description).toBe('An epic journey through time.');
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.publisher).toBe('Acme Publishing');
      expect(result.metadata.publishedAt?.toISOString()).toBe('2024-01-15T00:00:00.000Z');
      expect(result.metadata.isbn).toBe('urn:isbn:9780123456789');

      expect(result.cover).not.toBeNull();
      expect(result.cover?.mimeType).toBe('image/jpeg');
      expect(result.cover?.extension).toBe('jpg');
      expect(result.cover?.buffer).toEqual(mockCoverJpg);
    });

    it('should use fallback title and handle missing metadata gracefully', async () => {
      const zip = new AdmZip();
      zip.addFile('mimetype', Buffer.from('application/epub+zip', 'utf8'));
      const buffer = zip.toBuffer();

      const result = await service.parse(buffer, 'Default Title');
      expect(result.metadata.title).toBe('Default Title');
      expect(result.metadata.author).toBeNull();
      expect(result.cover).toBeNull();
    });
  });

  describe('PdfParserService', () => {
    let service: PdfParserService;

    beforeEach(() => {
      service = new PdfParserService();
    });

    it('should extract title, author, subject, and page count from valid PDF document', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle('Clean Code Fundamentals');
      pdfDoc.setAuthor('Robert Martin');
      pdfDoc.setSubject('Software Engineering Principles');

      // Add 3 sample pages
      pdfDoc.addPage([400, 600]);
      pdfDoc.addPage([400, 600]);
      pdfDoc.addPage([400, 600]);

      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);

      const result = await service.parse(buffer, 'Default PDF Title');
      expect(result.metadata.title).toBe('Clean Code Fundamentals');
      expect(result.metadata.author).toBe('Robert Martin');
      expect(result.metadata.description).toBe('Software Engineering Principles');
      expect(result.pageCount).toBe(3);
    });

    it('should fall back to provided filename if PDF has no title metadata', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage();
      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);

      const result = await service.parse(buffer, 'Fallback Book');
      expect(result.metadata.title).toBe('Fallback Book');
      expect(result.metadata.author).toBeNull();
      expect(result.pageCount).toBe(1);
    });
  });
});
