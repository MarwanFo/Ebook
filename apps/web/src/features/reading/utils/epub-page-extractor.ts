import type { Book, NavItem } from 'epubjs';
import type { FlipPageData } from '../components/FlipBookView';

export interface ExtractedEpubPage extends FlipPageData {
  chapterTitle?: string;
  href?: string;
}

/**
 * Extracts and paginates chapter content from an EPUB into discrete FlipBook pages.
 * Resolves images into blob URLs, strips boilerplate, and chunks text into book-sized pages (~220 words).
 */
export async function extractEpubPages(
  book: Book,
  cleanTitle: string,
  author?: string | null,
): Promise<ExtractedEpubPage[]> {
  const pages: ExtractedEpubPage[] = [];

  try {
    await book.ready;
    const loadedObj = book.loaded as unknown as {
      spine?: Promise<unknown>;
      navigation?: Promise<unknown>;
    };
    if (loadedObj?.spine) await loadedObj.spine;
    if (loadedObj?.navigation) await loadedObj.navigation;

    // 1. Build a TOC lookup map: cleanHref -> chapter label
    const tocMap = new Map<string, string>();
    try {
      const navObj = (book.loaded as unknown as { navigation?: Promise<{ toc?: NavItem[] }> })
        ?.navigation;
      const nav = navObj ? await navObj : null;
      if (nav && nav.toc) {
        const mapTocItems = (items: NavItem[]) => {
          for (const item of items) {
            if (item.href && item.label) {
              const cleanHref =
                (item.href || '').split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';
              if (cleanHref) tocMap.set(cleanHref, item.label.trim());
            }
            if (item.subitems && item.subitems.length > 0) {
              mapTocItems(item.subitems);
            }
          }
        };
        mapTocItems(nav.toc);
      }
    } catch {
      // TOC mapping optional
    }

    // 2. Access spine items in reading order
    const spine = (
      book as unknown as {
        spine?: {
          spineItems?: Array<{
            href?: string;
            idref?: string;
            linear?: string | boolean;
          }>;
        };
      }
    )?.spine;
    const spineItems = spine?.spineItems || [];

    // Helper to resolve an image src from epub archive into an object URL
    const resolveImageSrc = async (src: string, chapterHref: string): Promise<string> => {
      if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) {
        return src;
      }
      try {
        const dir = chapterHref.includes('/')
          ? chapterHref.slice(0, chapterHref.lastIndexOf('/') + 1)
          : '';
        const rawPath = dir + src.replace(/^\.\//, '');
        const parts = rawPath.split('/');
        const normalized: string[] = [];
        for (const p of parts) {
          if (p === '..') normalized.pop();
          else if (p !== '.') normalized.push(p);
        }
        const fullPath = normalized.join('/');

        const archive = (
          book as unknown as {
            archive?: {
              createUrl?: (p: string, o?: { base64: boolean }) => Promise<string>;
            };
          }
        )?.archive;
        if (archive && typeof archive.createUrl === 'function') {
          const url = await archive.createUrl(fullPath, { base64: true });
          if (url) return url;
        }
      } catch {
        // fallback
      }
      return src;
    };

    // Helper to recursively collect leaf content blocks (p, headings, blockquotes, lists, tables, img)
    const extractBlocks = (container: Element): Element[] => {
      const blocks: Element[] = [];
      const walk = (node: Element) => {
        const tag = node.tagName.toLowerCase();
        if (
          [
            'p',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'blockquote',
            'ul',
            'ol',
            'table',
            'img',
            'figure',
            'pre',
            'hr',
          ].includes(tag)
        ) {
          blocks.push(node);
          return;
        }
        if (node.children.length > 0) {
          for (const child of Array.from(node.children)) {
            walk(child);
          }
        } else if (node.textContent && node.textContent.trim().length > 0) {
          blocks.push(node);
        }
      };
      walk(container);
      return blocks;
    };

    // 3. Process each spine item
    for (const item of spineItems) {
      const href = item.href;
      if (!href) continue;

      const cleanHref = (href || '').split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';

      // Load chapter document: book.load returns Document or XMLDocument; archive fallback returns string
      let doc: Document | null = null;
      try {
        const loaded = await (book as unknown as { load: (u: string) => Promise<unknown> }).load(
          href,
        );
        if (typeof loaded === 'string') {
          doc = new DOMParser().parseFromString(loaded, 'text/html');
        } else if (loaded && typeof loaded === 'object') {
          doc = (loaded as { ownerDocument?: Document }).ownerDocument || (loaded as Document);
        }
      } catch {
        // fallback to archive.getText
      }

      if (!doc) {
        try {
          const archive = (
            book as unknown as { archive?: { getText?: (u: string) => Promise<string> } }
          )?.archive;
          if (archive && typeof archive.getText === 'function') {
            const rawText = await archive.getText(href);
            if (rawText && typeof rawText === 'string') {
              doc = new DOMParser().parseFromString(rawText, 'text/html');
            }
          }
        } catch {
          // archive fallback
        }
      }

      if (!doc) continue;

      // Strip scripts, styles, link, meta, and Gutenberg boilerplate
      doc
        .querySelectorAll(
          'script, style, link, meta, .pg-boilerplate, #pg-header, #pg-footer, .header, .footer',
        )
        .forEach((el) => el.remove());

      // Resolve images to blob/data URLs
      const images = Array.from(doc.querySelectorAll('img'));
      for (const img of images) {
        const origSrc = img.getAttribute('src');
        if (origSrc) {
          const resolvedSrc = await resolveImageSrc(origSrc, href);
          img.setAttribute('src', resolvedSrc);
          img.setAttribute(
            'class',
            'max-h-[520px] max-w-full object-contain mx-auto my-3 rounded-xs shadow-md border border-amber-900/10',
          );
        }
      }

      const body = doc.body || doc.documentElement;
      if (!body) continue;

      // If it's an isolated cover wrapper (e.g. wrap0000.html) with a single cover image
      const isWrapCover = cleanHref.includes('wrap') || cleanHref.includes('cover');
      if (isWrapCover && images.length === 1 && (body.textContent || '').trim().length < 50) {
        const coverImg = images[0];
        const coverSrc = coverImg?.getAttribute('src');
        if (coverSrc) {
          pages.push({
            pageNumber: pages.length + 1,
            content: `<div class="flex flex-col items-center justify-center h-full w-full py-4"><img src="${coverSrc}" class="max-h-[620px] max-w-full object-contain rounded-xs shadow-xl border border-amber-900/30" alt="${cleanTitle} Cover" /></div>`,
            title: cleanTitle,
            chapterTitle: 'Cover',
            href,
          });
          continue;
        }
      }

      // Determine chapter title
      let chapterTitle = tocMap.get(cleanHref) || '';
      if (!chapterTitle) {
        const h = doc.querySelector('h1, h2, h3');
        if (h && h.textContent) {
          chapterTitle = h.textContent.trim();
        }
      }

      // Find top-level content elements in body
      const blocks = extractBlocks(body);

      // If no blocks but body has content, wrap in single page
      if (blocks.length === 0 && (body.innerHTML || '').trim().length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          content: body.innerHTML,
          title: cleanTitle,
          chapterTitle,
          href,
        });
        continue;
      }

      // Chunk elements into page-sized blocks (~200 to 260 words)
      let currentPageHtml = '';
      let currentWordCount = 0;

      for (const el of blocks) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent || '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;

        // If it's a major heading and page already has content, start a new page
        if ((tag === 'h1' || tag === 'h2') && currentWordCount > 40) {
          pages.push({
            pageNumber: pages.length + 1,
            content: currentPageHtml,
            title: cleanTitle,
            chapterTitle,
            href,
          });
          currentPageHtml = '';
          currentWordCount = 0;
        }

        // Long paragraphs (> 320 words): split into sentence chunks
        if (words > 320 && tag === 'p') {
          const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
          let subHtml = '<p>';
          let subWords = 0;
          for (const s of sentences) {
            const sWords = s.trim().split(/\s+/).filter(Boolean).length;
            if (currentWordCount + subWords + sWords > 240 && currentWordCount + subWords > 50) {
              subHtml += '</p>';
              currentPageHtml += subHtml;
              pages.push({
                pageNumber: pages.length + 1,
                content: currentPageHtml,
                title: cleanTitle,
                chapterTitle,
                href,
              });
              currentPageHtml = '';
              currentWordCount = 0;
              subHtml = '<p>';
              subWords = 0;
            }
            subHtml += s;
            subWords += sWords;
          }
          if (subWords > 0) {
            subHtml += '</p>';
            currentPageHtml += subHtml;
            currentWordCount += subWords;
          }
          continue;
        }

        currentPageHtml += el.outerHTML;
        currentWordCount += words;

        if (currentWordCount >= 220) {
          pages.push({
            pageNumber: pages.length + 1,
            content: currentPageHtml,
            title: cleanTitle,
            chapterTitle,
            href,
          });
          currentPageHtml = '';
          currentWordCount = 0;
        }
      }

      if (currentPageHtml.trim().length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          content: currentPageHtml,
          title: cleanTitle,
          chapterTitle,
          href,
        });
      }
    }
  } catch (err) {
    console.error('Failed to extract EPUB pages for FlipBook:', err);
  }

  // Fallback: If no pages extracted, create initial title page
  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      content: `<div class="p-8 text-center font-serif"><h2 class="text-xl font-bold mb-4">${cleanTitle}</h2>${
        author ? `<p class="italic mb-6">by ${author}</p>` : ''
      }<p>Opening chapter...</p></div>`,
      title: cleanTitle,
    });
  }

  return pages;
}
