"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mail_interface_1 = require("./mail.interface");
const smtp_mail_service_1 = require("./smtp-mail.service");
const test_mail_service_1 = require("./test-mail.service");
let MailModule = class MailModule {
};
exports.MailModule = MailModule;
exports.MailModule = MailModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: mail_interface_1.MAIL_SERVICE,
                useFactory: (configService) => {
                    const nodeEnv = configService.get('env') || process.env.NODE_ENV;
                    if (nodeEnv === 'test') {
                        return new test_mail_service_1.TestMailService();
                    }
                    return new smtp_mail_service_1.SmtpMailService(configService);
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [mail_interface_1.MAIL_SERVICE],
    })
], MailModule);
