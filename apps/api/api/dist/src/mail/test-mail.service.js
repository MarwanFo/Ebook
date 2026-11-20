"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestMailService = void 0;
const common_1 = require("@nestjs/common");
let TestMailService = class TestMailService {
    sentEmails = [];
    async sendPasswordReset(input) {
        this.sentEmails.push({
            to: input.email,
            subject: 'Reset your BookFlow password',
            text: `Reset link: ${input.resetUrl}${input.otp ? ` | OTP: ${input.otp}` : ''}`,
            timestamp: new Date(),
        });
    }
    async sendPasswordChanged(input) {
        this.sentEmails.push({
            to: input.email,
            subject: 'Security Alert: Your BookFlow password was changed',
            timestamp: input.timestamp,
        });
    }
    async sendEmailVerification(input) {
        this.sentEmails.push({
            to: input.email,
            subject: 'Verify your BookFlow email address',
            text: `Verification link: ${input.verificationUrl}${input.otp ? ` | OTP: ${input.otp}` : ''}`,
            timestamp: new Date(),
        });
    }
    async sendRegistrationAttemptAlert(input) {
        this.sentEmails.push({
            to: input.email,
            subject: 'Security Notice: Attempted Registration on BookFlow',
            text: `Someone attempted to create an account with your email. Login: ${input.loginUrl}, Reset: ${input.resetUrl}`,
            timestamp: new Date(),
        });
    }
    getSentEmails() {
        return [...this.sentEmails];
    }
    clear() {
        this.sentEmails.length = 0;
    }
};
exports.TestMailService = TestMailService;
exports.TestMailService = TestMailService = __decorate([
    (0, common_1.Injectable)()
], TestMailService);
