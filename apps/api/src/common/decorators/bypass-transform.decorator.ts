import { SetMetadata } from '@nestjs/common';
import { BYPASS_TRANSFORM_KEY } from '../constants';

/**
 * Decorator to bypass the standard ApiResponse { data, meta } envelope.
 * Used for file streaming, raw downloads, redirects, or non-JSON responses.
 */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
