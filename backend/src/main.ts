// src/main.ts
//
// Purpose: Bootstraps the NestJS Platform Core HTTP server with Helmet security headers,
// CORS, strict ValidationPipe, global /api/v1/core prefix, and graceful shutdown hooks.
//
// Context: Binds explicitly to 0.0.0.0 so the service is reachable across Docker bridge networks
// on Windows, macOS, and Linux container runtimes.
//
// Implementation Specs: NestJS 12 Express adapter listening on PORT (default 4001) with
// RFC 9457 ProblemDetailsFilter compatibility and X-Tenant-Id / X-Organization-Id CORS headers.

import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

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
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-API-Key',
      'X-Tenant-Id',
      'X-Organization-Id',
      'X-Trace-Id',
    ],
  });

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`Platform Core Service listening on http://0.0.0.0:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  console.error('Fatal NestJS bootstrap error:', err);
  process.exit(1);
});
