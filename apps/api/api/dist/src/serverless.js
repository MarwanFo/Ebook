"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApp = getApp;
exports.default = handler;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
let appInstance;
async function getApp() {
    if (appInstance) {
        return appInstance;
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const expressApp = app.getHttpAdapter().getInstance();
    if (typeof expressApp.set === 'function') {
        expressApp.set('trust proxy', 1);
    }
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Accept', 'Origin'],
        exposedHeaders: ['x-request-id'],
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const reflector = app.get(core_1.Reflector);
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor(), new transform_interceptor_1.TransformInterceptor(reflector));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
    await app.init();
    appInstance = app;
    return appInstance;
}
async function handler(req, res) {
    // Ensure req.socket and req.ip are present in serverless environments
    if (!req.socket) {
        req.socket = {};
    }
    if (!req.socket.remoteAddress) {
        req.socket.remoteAddress =
            req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers?.['x-real-ip'] ||
                '127.0.0.1';
    }
    if (!req.ip) {
        req.ip = req.socket.remoteAddress;
    }
    // Defensive header wrappers for serverless runtimes
    res._headers = res._headers || {};
    const origGetHeader = typeof res.getHeader === 'function' ? res.getHeader.bind(res) : null;
    res.getHeader = function (name) {
        try {
            if (origGetHeader) {
                const val = origGetHeader(name);
                if (val !== undefined)
                    return val;
            }
        }
        catch {
            // Ignore internal Node symbol errors
        }
        return res._headers[name.toLowerCase()] || res._headers[name];
    };
    const origRemoveHeader = typeof res.removeHeader === 'function' ? res.removeHeader.bind(res) : null;
    res.removeHeader = function (name) {
        try {
            if (origRemoveHeader)
                origRemoveHeader(name);
        }
        catch {
            // Ignore
        }
        delete res._headers[name.toLowerCase()];
        delete res._headers[name];
    };
    const origSetHeader = typeof res.setHeader === 'function' ? res.setHeader.bind(res) : null;
    res.setHeader = function (name, value) {
        res._headers[name.toLowerCase()] = value;
        res._headers[name] = value;
        try {
            if (origSetHeader)
                origSetHeader(name, value);
        }
        catch {
            // Ignore
        }
        return this;
    };
    const origin = req.headers?.origin || 'https://ebook-olive-one.vercel.app';
    // Always set full CORS headers on every response
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-request-id,Accept,Origin,X-Requested-With');
    // Handle CORS preflight immediately
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.end();
    }
    try {
        const app = await getApp();
        const instance = app.getHttpAdapter().getInstance();
        if (res.writableEnded) {
            return;
        }
        return new Promise((resolve, reject) => {
            res.on('finish', resolve);
            res.on('close', resolve);
            res.on('error', reject);
            instance(req, res);
        });
    }
    catch (err) {
        console.error('Serverless bootstrap error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            error: 'SERVERLESS_BOOTSTRAP_ERROR',
            message: err?.message || String(err),
            stack: err?.stack,
        }));
    }
}
