#!/bin/bash

# Set environment variables for testing
export NODE_ENV=test
export JWT_SECRET=test_secret_key_123
export DATABASE_URL=file:./test.db
export REDIS_URL=redis://localhost:6379

# Create test database if it doesn't exist
if [ ! -f "./prisma/test.db" ]; then
  echo "Creating test database..."
  mkdir -p prisma
  touch prisma/test.db
  npx prisma migrate deploy
fi

# Run tests
npx jest --config=jest.config.js --runInBand --detectOpenHandles

# Clean up test database
echo "Cleaning up..."
rm -f prisma/test.db
