"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PdfParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParserService = void 0;
const common_1 = require("@nestjs/common");
const pdf_lib_1 = require("pdf-lib");
let PdfParserService = PdfParserService_1 = class PdfParserService {
    logger = new common_1.Logger(PdfParserService_1.name);
    async parse(buffer, fallbackTitle) {
        try {
            const pdfDoc = await pdf_lib_1.PDFDocument.load(buffer, {
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
        }
        catch (err) {
            this.logger.warn(`Failed to parse PDF metadata: ${err.message}`);
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
};
exports.PdfParserService = PdfParserService;
exports.PdfParserService = PdfParserService = PdfParserService_1 = __decorate([
    (0, common_1.Injectable)()
], PdfParserService);
