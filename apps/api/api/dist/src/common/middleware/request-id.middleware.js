"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIdMiddleware = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const constants_1 = require("../constants");
let RequestIdMiddleware = class RequestIdMiddleware {
    use(req, res, next) {
        const rawHeader = req.headers[constants_1.REQUEST_ID_HEADER];
        const incomingId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
        // Validate incoming ID format or generate a new UUID v4
        const requestId = incomingId &&
            typeof incomingId === 'string' &&
            ((0, uuid_1.validate)(incomingId) || /^[a-zA-Z0-9_-]{8,64}$/.test(incomingId))
            ? incomingId
            : (0, uuid_1.v4)();
        req.id = requestId;
        res.setHeader(constants_1.REQUEST_ID_HEADER, requestId);
        next();
    }
};
exports.RequestIdMiddleware = RequestIdMiddleware;
exports.RequestIdMiddleware = RequestIdMiddleware = __decorate([
    (0, common_1.Injectable)()
], RequestIdMiddleware);
