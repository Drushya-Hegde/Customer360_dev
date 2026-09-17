import { Module } from '@nestjs/common';
import { KeycloakGuard } from './keycloak.guard';
import { RolesGuard } from './guards/roles.guard';
import { KeycloakStrategy } from './strategies/keycloak.strategy';

@Module({
  providers: [KeycloakGuard, RolesGuard, KeycloakStrategy],
  exports: [KeycloakGuard, RolesGuard, KeycloakStrategy],
})
export class AuthModule {}
