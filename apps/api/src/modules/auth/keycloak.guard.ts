import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class KeycloakGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: unknown;
    }>();

    const token = request.headers.authorization?.replace(/^Bearer /, '');
    const issuer = process.env.KEYCLOAK_ISSUER;

    if (!token || !issuer) {
      throw new UnauthorizedException('Keycloak bearer token required');
    }

    const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer });

    request.user = payload;
    return true;
  }
}
