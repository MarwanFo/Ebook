"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding demo database...');
    const passwordHash = await argon2.hash('BookFlowDemo2026!', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        hashLength: 32,
    });
    const demoUser = await prisma.user.upsert({
        where: { email: 'demo@bookflow.io' },
        update: {
            passwordHash,
            displayName: 'Demo Reader',
        },
        create: {
            email: 'demo@bookflow.io',
            passwordHash,
            displayName: 'Demo Reader',
            role: client_1.UserRole.USER,
        },
    });
    console.log(`Demo user created/updated: ${demoUser.email} (id: ${demoUser.id})`);
    // Create sample books if user doesn't already have books
    const existingBooks = await prisma.book.findMany({
        where: { ownerId: demoUser.id },
    });
    if (existingBooks.length === 0) {
        const book1 = await prisma.book.create({
            data: {
                ownerId: demoUser.id,
                title: 'Alice in Wonderland',
                author: 'Lewis Carroll',
                format: client_1.BookFormat.EPUB,
                status: client_1.BookStatus.READING,
                language: 'en',
                description: 'A classic tale of fantasy, curious logic, and whimsical creatures.',
                lastOpenedAt: new Date(),
                files: {
                    create: {
                        storageKey: 'sample-alice.epub',
                        originalFilename: 'alice-in-wonderland.epub',
                        mimeType: 'application/epub+zip',
                        sizeBytes: BigInt(154200),
                    },
                },
                readingProgress: {
                    create: {
                        userId: demoUser.id,
                        locationType: client_1.LocationType.EPUB_CFI,
                        locationValue: 'epubcfi(/6/4[chap01]!/4/2/10/1:0)',
                        progressPercentage: 35.5,
                    },
                },
                bookmarks: {
                    create: [
                        {
                            userId: demoUser.id,
                            locationType: client_1.LocationType.EPUB_CFI,
                            locationValue: 'epubcfi(/6/4[chap01]!/4/2/4/1:0)',
                            title: 'Down the Rabbit Hole',
                            note: 'Memorable beginning with the White Rabbit checking his watch.',
                            progressPercentage: 5.0,
                        },
                        {
                            userId: demoUser.id,
                            locationType: client_1.LocationType.EPUB_CFI,
                            locationValue: 'epubcfi(/6/4[chap01]!/4/2/10/1:0)',
                            title: 'Drink Me Bottle',
                            note: 'Curious advice about reading labels carefully.',
                            progressPercentage: 35.5,
                        },
                    ],
                },
            },
        });
        const book2 = await prisma.book.create({
            data: {
                ownerId: demoUser.id,
                title: 'Frankenstein; or, The Modern Prometheus',
                author: 'Mary Wollstonecraft Shelley',
                format: client_1.BookFormat.PDF,
                status: client_1.BookStatus.UNREAD,
                language: 'en',
                description: 'A masterpiece of gothic science fiction exploring creation, ambition, and humanity.',
                files: {
                    create: {
                        storageKey: 'sample-frankenstein.pdf',
                        originalFilename: 'frankenstein.pdf',
                        mimeType: 'application/pdf',
                        sizeBytes: BigInt(420800),
                    },
                },
            },
        });
        const book3 = await prisma.book.create({
            data: {
                ownerId: demoUser.id,
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                format: client_1.BookFormat.EPUB,
                status: client_1.BookStatus.COMPLETED,
                language: 'en',
                description: 'The story of the fabulously wealthy Jay Gatsby and his new love for the beautiful Daisy Buchanan.',
                lastOpenedAt: new Date(Date.now() - 86400000 * 2),
                files: {
                    create: {
                        storageKey: 'sample-gatsby.epub',
                        originalFilename: 'great-gatsby.epub',
                        mimeType: 'application/epub+zip',
                        sizeBytes: BigInt(220400),
                    },
                },
                readingProgress: {
                    create: {
                        userId: demoUser.id,
                        locationType: client_1.LocationType.EPUB_CFI,
                        locationValue: 'epubcfi(/6/18[chap09]!/4/2/20/1:0)',
                        progressPercentage: 100.0,
                    },
                },
            },
        });
        console.log(`Seeded 3 demo books: ${book1.title}, ${book2.title}, ${book3.title}`);
    }
    console.log('Database seeding completed successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
