/**
 * Decorator to bypass the standard ApiResponse { data, meta } envelope.
 * Used for file streaming, raw downloads, redirects, or non-JSON responses.
 */
export declare const BypassTransform: () => import("@nestjs/common").CustomDecorator<string>;
//# sourceMappingURL=bypass-transform.decorator.d.ts.map