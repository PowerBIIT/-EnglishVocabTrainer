const { PrismaClient } = require('@prisma/client');
const { execSync } = require('node:child_process');

const BASELINE_MIGRATION = '20251222183904_baseline';

const prisma = new PrismaClient();

const tableExists = async (tableName) => {
  const result = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) as "exists";
  `;
  return Boolean(result?.[0]?.exists);
};

const ensureMigrations = async () => {
  const hasMigrationsTable = await tableExists('_prisma_migrations');
  if (hasMigrationsTable) {
    return;
  }

  const hasUserTable = await tableExists('User');
  if (!hasUserTable) {
    return;
  }

  execSync(`npx prisma migrate resolve --applied ${BASELINE_MIGRATION}`, {
    stdio: 'inherit',
  });
};

ensureMigrations()
  .catch((error) => {
    console.error('Failed to ensure Prisma migrations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
