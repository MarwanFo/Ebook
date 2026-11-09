import { PrismaClient, BookFormat, BookStatus, UserRole, LocationType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

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
      role: UserRole.USER,
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
        format: BookFormat.EPUB,
        status: BookStatus.READING,
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
            locationType: LocationType.EPUB_CFI,
            locationValue: 'epubcfi(/6/4[chap01]!/4/2/10/1:0)',
            progressPercentage: 35.5,
          },
        },
        bookmarks: {
          create: [
            {
              userId: demoUser.id,
              locationType: LocationType.EPUB_CFI,
              locationValue: 'epubcfi(/6/4[chap01]!/4/2/4/1:0)',
              title: 'Down the Rabbit Hole',
              note: 'Memorable beginning with the White Rabbit checking his watch.',
              progressPercentage: 5.0,
            },
            {
              userId: demoUser.id,
              locationType: LocationType.EPUB_CFI,
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
        format: BookFormat.PDF,
        status: BookStatus.UNREAD,
        language: 'en',
        description:
          'A masterpiece of gothic science fiction exploring creation, ambition, and humanity.',
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
        format: BookFormat.EPUB,
        status: BookStatus.COMPLETED,
        language: 'en',
        description:
          'The story of the fabulously wealthy Jay Gatsby and his new love for the beautiful Daisy Buchanan.',
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
            locationType: LocationType.EPUB_CFI,
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
