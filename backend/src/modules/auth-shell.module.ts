// backend/src/modules/auth-shell.module.ts
//
// Purpose: NestJS feature module bundling delegated OIDC authentication,
// session guard, executive dashboard, and unified App Shell controllers.
//
// Context: Allows clean single-line registration inside src/app.module.ts
// without modifying existing HealthController or ConfigModule imports.
//
// Implementation Specs: Exports AuthService and OidcSessionGuard for reuse by
// subsequent Platform Core domain modules.

import { Module } from "@nestjs/common";
import { OidcSessionGuard } from "../common/guards/oidc-session.guard";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AppShellController } from "./shell/app-shell.controller";

@Module({
  controllers: [AuthController, AppShellController],
  providers: [AuthService, OidcSessionGuard],
  exports: [AuthService, OidcSessionGuard],
})
export class AuthShellModule {}
