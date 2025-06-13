const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Create Prisma client instance
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Database Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database Error:', e);
});

// Log database info
prisma.$on('info', (e) => {
  logger.info('Database Info:', e);
});

// Log database warnings
prisma.$on('warn', (e) => {
  logger.warn('Database Warning:', e);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
});

module.exports = prisma;
