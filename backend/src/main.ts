// src/main.ts
//
// Purpose: Bootstraps the NestJS Platform Core HTTP server with security headers, CORS, validation, and global error handling.
//
// Context: Enforces the versioned /api/v1/core prefix, allowed RLS context headers, and RFC 9457 error formatting on every endpoint.
//
// Implementation Specs: NestJS 12 NestFactory entrypoint configuring helmet, CORS, ValidationPipe, ProblemDetailsFilter, and graceful shutdown hooks.

import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('PlatformCoreBootstrap');

  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1/core');
  const port = config.get<number>('PORT', 4001);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Tenant-Id', 'X-Organization-Id', 'X-Trace-Id', 'X-API-Key'],
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Platform Core Service listening on http://localhost:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  console.error('Fatal NestJS bootstrap error:', err);
  process.exit(1);
});
