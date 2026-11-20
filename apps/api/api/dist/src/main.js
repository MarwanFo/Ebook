"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('port', 3000);
    const webOrigin = configService.get('cors.origin', 'http://localhost:5173');
    // Trust first proxy hop in production deployment
    const expressApp = app.getHttpAdapter().getInstance();
    if (typeof expressApp.set === 'function') {
        expressApp.set('trust proxy', 1);
    }
    // Security headers with Helmet
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // Cookie parser middleware
    app.use((0, cookie_parser_1.default)());
    // CORS configuration
    app.enableCors({
        origin: webOrigin.split(',').map((o) => o.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Accept', 'Origin'],
        exposedHeaders: ['x-request-id'],
    });
    // Global routing prefix
    app.setGlobalPrefix('api/v1');
    // Global Validation Pipe
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    // Global Interceptors
    const reflector = app.get(core_1.Reflector);
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor(), new transform_interceptor_1.TransformInterceptor(reflector));
    // Global Exception Filter
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    // Swagger / OpenAPI documentation
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle('BookFlow API')
        .setDescription('REST API documentation for BookFlow - Realistic Ebook Reader Application')
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
    }, 'JWT-auth')
        .addTag('Operations', 'Health and readiness monitoring')
        .addTag('auth', 'Authentication and session management')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    await app.listen(port);
    logger.log(`🚀 BookFlow API running on: http://localhost:${port}/api/v1`);
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
