// backend/src/app.module.ts
//
// Purpose: Root NestJS application module wiring environment configuration,
// database health probes (with HealthController DI providers), and Epic 1
// OIDC auth & App Shell modules.
//
// Context: Mounts all 11 Epic 1 Platform Core routes under the global
// /api/v1/core prefix defined in src/main.ts while preserving HealthController
// dependencies such as RlsContextService.
//
// Implementation Specs: Registers ConfigModule, HealthController, its reflected
// constructor providers (RlsContextService), and AuthShellModule.

import "reflect-metadata";
import { Module, type Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.schema";
import { HealthController } from "./health/health.controller";
import { AuthShellModule } from "./modules/auth-shell.module";

const healthControllerProviders = (
  (Reflect.getMetadata("design:paramtypes", HealthController) as
    | Provider[]
    | undefined) ?? []
).filter(Boolean);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    AuthShellModule,
  ],
  controllers: [HealthController],
  providers: [...healthControllerProviders],
})
export class AppModule {}
