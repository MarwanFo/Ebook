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

    // 3. Process each spine item
    for (const item of spineItems) {
      const href = item.href;
      if (!href) continue;

      const cleanHref = (href || '').split('#')[0]?.replace(/^\/+/g, '').toLowerCase() || '';

      // Retrieve raw text from archive or book.load
      let rawHtml = '';
      try {
        const archive = (
          book as unknown as { archive?: { getText?: (u: string) => Promise<string> } }
        )?.archive;
        if (archive && typeof archive.getText === 'function') {
          rawHtml = await archive.getText(href);
        }
      } catch {
        // archive fallback
      }
      if (
        !rawHtml &&
        typeof (book as unknown as { load?: (u: string) => Promise<string> }).load === 'function'
      ) {
        try {
          rawHtml = await (book as unknown as { load: (u: string) => Promise<string> }).load(href);
        } catch {
          // load fallback
        }
      }
      if (!rawHtml || typeof rawHtml !== 'string') continue;

      // Parse with browser DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');

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
            'max-h-[560px] max-w-full object-contain mx-auto my-3 rounded-xs shadow-md border border-amber-900/10',
          );
        }
      }

      // If it's an isolated cover wrapper (e.g. wrap0000.html) with a single cover image
      const isWrapCover = cleanHref.includes('wrap') || cleanHref.includes('cover');
      if (isWrapCover && images.length === 1 && (doc.body.textContent || '').trim().length < 50) {
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
      const root = doc.body.querySelector('.chapter, article, main, section') || doc.body;
      const elements = Array.from(root.children);

      // If root has no children but body has text, wrap in single page
      if (elements.length === 0 && (doc.body.innerHTML || '').trim().length > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          content: doc.body.innerHTML,
          title: cleanTitle,
          chapterTitle,
          href,
        });
        continue;
      }

      // Chunk elements into page-sized blocks (~200 to 260 words)
      let currentPageHtml = '';
      let currentWordCount = 0;

      for (const el of elements) {
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
