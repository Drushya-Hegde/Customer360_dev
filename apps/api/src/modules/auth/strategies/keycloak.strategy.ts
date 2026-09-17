import { Injectable } from '@nestjs/common';

@Injectable()
export class KeycloakStrategy {
  validate(token: string): unknown {
    return { token };
  }
}
