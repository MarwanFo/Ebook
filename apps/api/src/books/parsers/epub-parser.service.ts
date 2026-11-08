import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

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

@Injectable()
export class EpubParserService {
  private readonly logger = new Logger(EpubParserService.name);
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  });

  async parse(buffer: Buffer, fallbackTitle: string): Promise<EpubParseResult> {
    try {
      const zip = new AdmZip(buffer);

      // 1. Locate rootfile via META-INF/container.xml
      const containerEntry = zip.getEntry('META-INF/container.xml');
      let opfPath = 'content.opf';

      if (containerEntry) {
        const containerXml = containerEntry.getData().toString('utf8');
        const containerObj = this.xmlParser.parse(containerXml);
        const rootfiles =
          containerObj?.container?.rootfiles?.rootfile || containerObj?.container?.rootfiles;

        if (Array.isArray(rootfiles)) {
          opfPath = rootfiles[0]?.['@_full-path'] || opfPath;
        } else if (rootfiles?.['@_full-path']) {
          opfPath = rootfiles['@_full-path'];
        }
      }

      // 2. Parse OPF file
      const opfEntry = zip.getEntry(opfPath);
      if (!opfEntry) {
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
          cover: null,
        };
      }

      const opfXml = opfEntry.getData().toString('utf8');
      const opfObj = this.xmlParser.parse(opfXml);
      const pkg = opfObj?.package || opfObj;
      const metadataNode = pkg?.metadata || {};
      const manifestNode = pkg?.manifest?.item || [];
      const manifestItems = Array.isArray(manifestNode) ? manifestNode : [manifestNode];

      // 3. Extract Dublin Core Metadata
      const title = this.extractString(metadataNode.title) || fallbackTitle;
      const author = this.extractString(metadataNode.creator);
      const description = this.extractString(metadataNode.description);
      const language = this.extractString(metadataNode.language);
      const publisher = this.extractString(metadataNode.publisher);
      const isbn = this.extractString(metadataNode.identifier);

      let publishedAt: Date | null = null;
      const rawDate = this.extractString(metadataNode.date);
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          publishedAt = parsed;
        }
      }

      // 4. Extract Cover Image
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';
      const cover = this.extractCover(zip, metadataNode, manifestItems, opfDir);

      return {
        metadata: {
          title,
          author,
          description,
          language,
          publisher,
          publishedAt,
          isbn,
        },
        cover,
      };
    } catch (err) {
      this.logger.warn(`Failed to parse EPUB metadata: ${(err as Error).message}`);
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
        cover: null,
      };
    }
  }

  private extractString(val: unknown): string | null {
    if (!val) return null;
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>;
      if ('#text' in obj && typeof obj['#text'] === 'string') {
        return obj['#text'].trim();
      }
    }
    return null;
  }

  private extractCover(
    zip: AdmZip,
    metadataNode: Record<string, unknown>,
    manifestItems: Array<Record<string, unknown>>,
    opfDir: string,
  ): ExtractedCoverImage | null {
    let coverHref: string | null = null;
    let coverMime: string = 'image/jpeg';

    // Strategy A: EPUB 3 properties="cover-image"
    const epub3Cover = manifestItems.find((item) => item['@_properties'] === 'cover-image');
    if (epub3Cover && epub3Cover['@_href']) {
      coverHref = String(epub3Cover['@_href']);
      coverMime = String(epub3Cover['@_media-type'] || 'image/jpeg');
    }

    // Strategy B: EPUB 2 <meta name="cover" content="item-id" />
    if (!coverHref) {
      const metaNodes = Array.isArray(metadataNode.meta) ? metadataNode.meta : [metadataNode.meta];
      const coverMeta = metaNodes.find((m) => m && m['@_name'] === 'cover');
      if (coverMeta && coverMeta['@_content']) {
        const coverId = String(coverMeta['@_content']);
        const matchedItem = manifestItems.find((item) => item['@_id'] === coverId);
        if (matchedItem && matchedItem['@_href']) {
          coverHref = String(matchedItem['@_href']);
          coverMime = String(matchedItem['@_media-type'] || 'image/jpeg');
        }
      }
    }

    // Strategy C: Fallback to item where id or href contains "cover" and media-type is an image
    if (!coverHref) {
      const fallbackItem = manifestItems.find((item) => {
        const mediaType = String(item['@_media-type'] || '');
        const id = String(item['@_id'] || '').toLowerCase();
        const href = String(item['@_href'] || '').toLowerCase();
        return mediaType.startsWith('image/') && (id.includes('cover') || href.includes('cover'));
      });
      if (fallbackItem && fallbackItem['@_href']) {
        coverHref = String(fallbackItem['@_href']);
        coverMime = String(fallbackItem['@_media-type'] || 'image/jpeg');
      }
    }

    if (!coverHref) {
      return null;
    }

    // Resolve cover path relative to opf directory
    const resolvedPath = opfDir ? `${opfDir}/${coverHref}`.replace(/^\//, '') : coverHref;
    const coverEntry = zip.getEntry(resolvedPath) || zip.getEntry(coverHref);

    if (!coverEntry) {
      return null;
    }

    const buffer = coverEntry.getData();
    let extension = 'jpg';
    if (coverMime.includes('png')) extension = 'png';
    else if (coverMime.includes('webp')) extension = 'webp';

    return {
      buffer,
      mimeType: coverMime,
      extension,
    };
  }
}
