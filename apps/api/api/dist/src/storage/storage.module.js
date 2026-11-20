"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const local_storage_service_1 = require("./local-storage.service");
const s3_storage_service_1 = require("./s3-storage.service");
const cloudinary_storage_service_1 = require("./cloudinary-storage.service");
const storage_interface_1 = require("./storage.interface");
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            local_storage_service_1.LocalStorageService,
            s3_storage_service_1.S3StorageService,
            cloudinary_storage_service_1.CloudinaryStorageService,
            {
                provide: storage_interface_1.STORAGE_SERVICE,
                useFactory: (configService, localStorage, s3Storage, cloudinaryStorage) => {
                    const driver = configService.get('storage.driver')?.toLowerCase();
                    if (driver === 'cloudinary') {
                        return cloudinaryStorage;
                    }
                    if (driver === 's3' || driver === 'r2') {
                        return s3Storage;
                    }
                    return localStorage;
                },
                inject: [config_1.ConfigService, local_storage_service_1.LocalStorageService, s3_storage_service_1.S3StorageService, cloudinary_storage_service_1.CloudinaryStorageService],
            },
        ],
        exports: [storage_interface_1.STORAGE_SERVICE, local_storage_service_1.LocalStorageService, s3_storage_service_1.S3StorageService, cloudinary_storage_service_1.CloudinaryStorageService],
    })
], StorageModule);
