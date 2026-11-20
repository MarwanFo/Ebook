import { ExtractedBookMetadata } from './epub-parser.service';
export interface PdfParseResult {
    metadata: ExtractedBookMetadata;
    pageCount: number;
}
export declare class PdfParserService {
    private readonly logger;
    parse(buffer: Buffer, fallbackTitle: string): Promise<PdfParseResult>;
}
//# sourceMappingURL=pdf-parser.service.d.ts.map