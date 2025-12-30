#!/bin/bash
set -e

echo "Starting application..."

# Ensure Prisma migrations are applied
echo "Running migration checks..."
node scripts/ensure-migrations.js

echo "Applying pending migrations..."
npx prisma migrate deploy

echo "Starting Next.js server..."
npm start
