declare enum Environment {
    Development = "development",
    Production = "production",
    Test = "test"
}
declare enum StorageDriver {
    Local = "local",
    S3 = "s3",
    R2 = "r2",
    Cloudinary = "cloudinary"
}
export declare class EnvironmentVariables {
    NODE_ENV: Environment;
    PORT: number;
    DATABASE_URL: string;
    WEB_ORIGIN: string;
    JWT_ACCESS_SECRET: string;
    JWT_ACCESS_EXPIRES_IN: string;
    JWT_ISSUER: string;
    JWT_AUDIENCE: string;
    REFRESH_COOKIE_NAME: string;
    REFRESH_EXPIRATION_DAYS: number;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER?: string;
    SMTP_PASSWORD?: string;
    SMTP_FROM: string;
    RATE_LIMIT_LOGIN_PER_MIN: number;
    RATE_LIMIT_REGISTER_PER_MIN: number;
    RATE_LIMIT_FORGOT_PW_PER_MIN: number;
    STORAGE_DRIVER: StorageDriver;
    LOCAL_STORAGE_PATH: string;
    MAX_BOOK_FILE_SIZE_MB: number;
    S3_ENDPOINT?: string;
    S3_REGION?: string;
    S3_BUCKET?: string;
    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    CLOUDINARY_URL?: string;
    TURNSTILE_SECRET_KEY?: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
export {};
//# sourceMappingURL=env.validation.d.ts.map