// src/health/health.module.ts
//
// Purpose: Encapsulates and registers the Platform Core health probe controller.
//
// Context: Keeps operational readiness endpoints decoupled from domain feature modules.
//
// Implementation Specs: NestJS @Module registering HealthController.

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
