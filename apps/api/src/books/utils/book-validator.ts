import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import { BookFormat } from '@bookflow/shared-types';

export interface ValidatedBookFile {
  format: BookFormat;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

export function detectBookFormat(buffer: Buffer): { format: BookFormat; mimeType: string } | null {
  if (!buffer || buffer.length < 5) {
    return null;
  }

  // Check PDF signature: %PDF-
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return {
      format: BookFormat.PDF,
      mimeType: 'application/pdf',
    };
  }

  // Check EPUB signature: PK\x03\x04 (ZIP container)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    try {
      const zip = new AdmZip(buffer);
      const mimetypeEntry = zip.getEntry('mimetype');
      if (mimetypeEntry) {
        const mimetypeContent = mimetypeEntry.getData().toString('utf8').trim();
        if (mimetypeContent.startsWith('application/epub+zip')) {
          return {
            format: BookFormat.EPUB,
            mimeType: 'application/epub+zip',
          };
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function validateBookBuffer(
  buffer: Buffer,
  maxSizeBytes: number = 100 * 1024 * 1024,
): ValidatedBookFile {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Uploaded file is empty');
  }

  if (buffer.length > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new BadRequestException(`File size exceeds maximum allowed limit of ${maxMb}MB`);
  }

  const detected = detectBookFormat(buffer);
  if (!detected) {
    throw new BadRequestException(
      'Unsupported file format. Only valid EPUB (.epub) and PDF (.pdf) documents are accepted.',
    );
  }

  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    format: detected.format,
    mimeType: detected.mimeType,
    sizeBytes: buffer.length,
    checksum,
  };
}
