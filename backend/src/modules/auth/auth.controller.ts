// backend/src/modules/auth/auth.controller.ts
//
// Purpose: Exposes delegated OIDC discovery, callback, workspace listing, and
// logout endpoints under /api/v1/core/auth/*.
//
// Context: Implements Journey 1 / US-01.1 REST routes from
// openapi-platform-core-v1.yaml.
//
// Implementation Specs: Public routes for discover/callback; OidcSessionGuard
// for workspaces and logout.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  OidcSessionGuard,
  type AuthenticatedRequest,
} from "../../common/guards/oidc-session.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @Post("oidc/discover")
  @HttpCode(HttpStatus.OK)
  public discover(
    @Body() body: { workspaceSlug?: string; email?: string }
  ) {
    return this.authService.discoverOidc(body ?? {});
  }

  @Post("oidc/callback")
  @HttpCode(HttpStatus.OK)
  public callback(
    @Body() body: { code: string; state: string; codeVerifier: string }
  ) {
    return this.authService.completeCallback(body);
  }

  @Get("workspaces")
  @UseGuards(OidcSessionGuard)
  public workspaces(@Req() req: AuthenticatedRequest) {
    return this.authService.listWorkspaces(req.authUser.userId);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OidcSessionGuard)
  public logout(@Req() req: AuthenticatedRequest) {
    return this.authService.logout(req.authUser.sessionId, req.authUser.userId);
  }
}
