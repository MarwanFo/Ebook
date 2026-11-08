import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { ExtractedBookMetadata } from './epub-parser.service';

export interface PdfParseResult {
  metadata: ExtractedBookMetadata;
  pageCount: number;
}

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async parse(buffer: Buffer, fallbackTitle: string): Promise<PdfParseResult> {
    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });

      const title = pdfDoc.getTitle()?.trim() || fallbackTitle;
      const author = pdfDoc.getAuthor()?.trim() || null;
      const description = pdfDoc.getSubject()?.trim() || null;
      const publishedAt = pdfDoc.getCreationDate() || null;
      const pageCount = pdfDoc.getPageCount();

      return {
        metadata: {
          title,
          author,
          description,
          language: null,
          publisher: null,
          publishedAt,
          isbn: null,
        },
        pageCount,
      };
    } catch (err) {
      this.logger.warn(`Failed to parse PDF metadata: ${(err as Error).message}`);
      return {
        metadata: {
          title: fallbackTitle,
          author: null,
          description: null,
          language: null,
          publisher: null,
          publishedAt: null,
          isbn: null,
        },
        pageCount: 1,
      };
    }
  }
}
