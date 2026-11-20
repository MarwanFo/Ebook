"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_bookmark_dto_1 = require("./dto/create-bookmark.dto");
const update_bookmark_dto_1 = require("./dto/update-bookmark.dto");
const update_progress_dto_1 = require("./dto/update-progress.dto");
const reading_service_1 = require("./reading.service");
let ReadingController = class ReadingController {
    readingService;
    constructor(readingService) {
        this.readingService = readingService;
    }
    async getLibraryStats(userId) {
        return this.readingService.getLibraryStats(userId);
    }
    async getProgress(userId, bookId) {
        return this.readingService.getProgress(userId, bookId);
    }
    async updateProgress(userId, bookId, dto) {
        return this.readingService.updateProgress(userId, bookId, dto);
    }
    async getBookmarks(userId, bookId) {
        return this.readingService.getBookmarks(userId, bookId);
    }
    async createBookmark(userId, bookId, dto) {
        return this.readingService.createBookmark(userId, bookId, dto);
    }
    async updateBookmark(userId, bookmarkId, dto) {
        return this.readingService.updateBookmark(userId, bookmarkId, dto);
    }
    async deleteBookmark(userId, bookmarkId) {
        await this.readingService.deleteBookmark(userId, bookmarkId);
    }
};
exports.ReadingController = ReadingController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reading statistics and counts across entire library' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "getLibraryStats", null);
__decorate([
    (0, common_1.Get)(':bookId/progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current reading progress and saved CFI/page for a book' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "getProgress", null);
__decorate([
    (0, common_1.Put)(':bookId/progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Update reading progress, CFI/page location, and reader settings' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_progress_dto_1.UpdateProgressDto]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "updateProgress", null);
__decorate([
    (0, common_1.Get)(':bookId/bookmarks'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookmarks and annotations for a book' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "getBookmarks", null);
__decorate([
    (0, common_1.Post)(':bookId/bookmarks'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new bookmark or annotation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_bookmark_dto_1.CreateBookmarkDto]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "createBookmark", null);
__decorate([
    (0, common_1.Patch)('bookmarks/:bookmarkId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update title or note of an existing bookmark' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookmarkId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_bookmark_dto_1.UpdateBookmarkDto]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "updateBookmark", null);
__decorate([
    (0, common_1.Delete)('bookmarks/:bookmarkId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a bookmark or annotation' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('bookmarkId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReadingController.prototype, "deleteBookmark", null);
exports.ReadingController = ReadingController = __decorate([
    (0, swagger_1.ApiTags)('Reading'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('reading'),
    __metadata("design:paramtypes", [reading_service_1.ReadingService])
], ReadingController);
