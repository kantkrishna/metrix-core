// src/app.module.ts
//
// Purpose: Assembles the root NestJS application module graph with validated configuration, database, and health modules.
//
// Context: Blocks startup immediately via validateEnv when required OIDC, PostgreSQL, or encryption environment variables are missing or invalid.
//
// Implementation Specs: NestJS @Module importing ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), DatabaseModule, and HealthModule.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
