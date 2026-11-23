// src/db/database.module.ts
//
// Purpose: Registers and globally exports the RlsContextService database provider across all NestJS feature modules.
//
// Context: Centralizes pooled PostgreSQL lifecycle management and consistent RLS transaction access across the microservice.
//
// Implementation Specs: NestJS @Global() @Module wrapping RlsContextService.

import { Global, Module } from '@nestjs/common';
import { RlsContextService } from './rls-context.service';

@Global()
@Module({
  providers: [RlsContextService],
  exports: [RlsContextService],
})
export class DatabaseModule {}
