declare const _default: () => {
    env: string;
    port: number;
    database: {
        url: string | undefined;
    };
    cors: {
        origin: string;
    };
    jwt: {
        accessSecret: string | undefined;
        accessExpiresIn: string;
        issuer: string;
        audience: string;
    };
    cookie: {
        refreshCookieName: string;
        refreshExpirationDays: number;
    };
    smtp: {
        host: string;
        port: number;
        user: string | undefined;
        password: string | undefined;
        from: string;
    };
    throttler: {
        loginPerMin: number;
        registerPerMin: number;
        forgotPwPerMin: number;
    };
    storage: {
        driver: string;
        localPath: string;
        maxFileSizeMb: number;
        s3: {
            endpoint: string | undefined;
            region: string;
            bucket: string | undefined;
            accessKeyId: string | undefined;
            secretAccessKey: string | undefined;
        };
        cloudinary: {
            cloudName: string | undefined;
            apiKey: string | undefined;
            apiSecret: string | undefined;
            url: string | undefined;
        };
    };
    turnstile: {
        secretKey: string | undefined;
    };
};
export default _default;
//# sourceMappingURL=configuration.d.ts.map