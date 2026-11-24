// backend/src/common/decorators/require-permission.decorator.ts
//
// Purpose: Attaches required RBAC permission metadata to NestJS route handlers and controllers.
//
// Context: Binds OpenAPI x-required-permission scopes directly to runtime authorization enforcement by RlsTenantContextGuard.
//
// Implementation Specs: NestJS SetMetadata decorator exporting REQUIRED_PERMISSION_KEY and RequirePermission().

import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_KEY = 'metrix:required_permission';

export const RequirePermission = (permissionCode: string) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissionCode);
