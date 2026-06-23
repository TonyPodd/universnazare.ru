import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Public endpoints can still receive stale/invalid tokens from the browser.
  // Treat auth failures as guest access, but keep the user when token is valid.
  handleRequest(err, user) {
    return err ? null : user || null;
  }
}
