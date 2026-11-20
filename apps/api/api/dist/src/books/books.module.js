"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooksModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../database/prisma.module");
const storage_module_1 = require("../storage/storage.module");
const books_controller_1 = require("./books.controller");
const books_service_1 = require("./books.service");
const epub_parser_service_1 = require("./parsers/epub-parser.service");
const pdf_parser_service_1 = require("./parsers/pdf-parser.service");
let BooksModule = class BooksModule {
};
exports.BooksModule = BooksModule;
exports.BooksModule = BooksModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, storage_module_1.StorageModule, config_1.ConfigModule],
        controllers: [books_controller_1.BooksController],
        providers: [books_service_1.BooksService, epub_parser_service_1.EpubParserService, pdf_parser_service_1.PdfParserService],
        exports: [books_service_1.BooksService],
    })
], BooksModule);
