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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentVariables = void 0;
exports.validate = validate;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var Environment;
(function (Environment) {
    Environment["Development"] = "development";
    Environment["Production"] = "production";
    Environment["Test"] = "test";
})(Environment || (Environment = {}));
var StorageDriver;
(function (StorageDriver) {
    StorageDriver["Local"] = "local";
    StorageDriver["S3"] = "s3";
    StorageDriver["R2"] = "r2";
    StorageDriver["Cloudinary"] = "cloudinary";
})(StorageDriver || (StorageDriver = {}));
class EnvironmentVariables {
    NODE_ENV = Environment.Development;
    PORT = 3000;
    DATABASE_URL;
    WEB_ORIGIN = 'http://localhost:5173';
    JWT_ACCESS_SECRET;
    JWT_ACCESS_EXPIRES_IN = '15m';
    JWT_ISSUER = 'bookflow-api';
    JWT_AUDIENCE = 'bookflow-client';
    REFRESH_COOKIE_NAME = 'bookflow_refresh';
    REFRESH_EXPIRATION_DAYS = 7;
    SMTP_HOST = 'localhost';
    SMTP_PORT = 1025;
    SMTP_USER;
    SMTP_PASSWORD;
    SMTP_FROM = 'BookFlow <noreply@bookflow.local>';
    RATE_LIMIT_LOGIN_PER_MIN = 10;
    RATE_LIMIT_REGISTER_PER_MIN = 5;
    RATE_LIMIT_FORGOT_PW_PER_MIN = 5;
    STORAGE_DRIVER = StorageDriver.Local;
    LOCAL_STORAGE_PATH = './storage';
    MAX_BOOK_FILE_SIZE_MB = 100;
    S3_ENDPOINT;
    S3_REGION = 'us-east-1';
    S3_BUCKET;
    S3_ACCESS_KEY_ID;
    S3_SECRET_ACCESS_KEY;
    CLOUDINARY_CLOUD_NAME;
    CLOUDINARY_API_KEY;
    CLOUDINARY_API_SECRET;
    CLOUDINARY_URL;
    TURNSTILE_SECRET_KEY;
}
exports.EnvironmentVariables = EnvironmentVariables;
__decorate([
    (0, class_validator_1.IsEnum)(Environment),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "DATABASE_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "WEB_ORIGIN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32, {
        message: 'JWT_ACCESS_SECRET must be at least 32 characters long for security',
    }),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_ACCESS_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_ACCESS_EXPIRES_IN", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_ISSUER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "JWT_AUDIENCE", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "REFRESH_COOKIE_NAME", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "REFRESH_EXPIRATION_DAYS", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_HOST", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "SMTP_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_USER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "SMTP_FROM", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RATE_LIMIT_LOGIN_PER_MIN", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RATE_LIMIT_REGISTER_PER_MIN", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "RATE_LIMIT_FORGOT_PW_PER_MIN", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(StorageDriver),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "STORAGE_DRIVER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "LOCAL_STORAGE_PATH", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnvironmentVariables.prototype, "MAX_BOOK_FILE_SIZE_MB", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_ENDPOINT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_REGION", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_BUCKET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_ACCESS_KEY_ID", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "S3_SECRET_ACCESS_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "CLOUDINARY_CLOUD_NAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "CLOUDINARY_API_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "CLOUDINARY_API_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "CLOUDINARY_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EnvironmentVariables.prototype, "TURNSTILE_SECRET_KEY", void 0);
function validate(config) {
    const validatedConfig = (0, class_transformer_1.plainToInstance)(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });
    const errors = (0, class_validator_1.validateSync)(validatedConfig, {
        skipMissingProperties: false,
    });
    if (errors.length > 0) {
        const formattedErrors = errors
            .map((err) => Object.values(err.constraints || {}).join(', '))
            .join('; ');
        throw new Error(`Environment configuration error: ${formattedErrors}`);
    }
    return validatedConfig;
}
