"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BypassTransform = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../constants");
/**
 * Decorator to bypass the standard ApiResponse { data, meta } envelope.
 * Used for file streaming, raw downloads, redirects, or non-JSON responses.
 */
const BypassTransform = () => (0, common_1.SetMetadata)(constants_1.BYPASS_TRANSFORM_KEY, true);
exports.BypassTransform = BypassTransform;
