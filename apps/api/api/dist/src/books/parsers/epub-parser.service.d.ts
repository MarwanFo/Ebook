export interface ExtractedBookMetadata {
    title: string;
    author: string | null;
    description: string | null;
    language: string | null;
    publisher: string | null;
    publishedAt: Date | null;
    isbn: string | null;
}
export interface ExtractedCoverImage {
    buffer: Buffer;
    mimeType: string;
    extension: string;
}
export interface EpubParseResult {
    metadata: ExtractedBookMetadata;
    cover: ExtractedCoverImage | null;
}
export declare class EpubParserService {
    private readonly logger;
    private readonly xmlParser;
    parse(buffer: Buffer, fallbackTitle: string): Promise<EpubParseResult>;
    private extractString;
    private extractCover;
}
//# sourceMappingURL=epub-parser.service.d.ts.map