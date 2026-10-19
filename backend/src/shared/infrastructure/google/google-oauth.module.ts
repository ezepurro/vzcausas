import { Global, Module } from "@nestjs/common";
import { GoogleOAuthClientService } from "./google-oauth-client.service";

/**
 * Not yet imported from `app.module.ts` — see the note on
 * {@link GoogleOAuthClientService}. Wire it in alongside whichever module
 * first consumes it.
 */
@Global()
@Module({
  providers: [GoogleOAuthClientService],
  exports: [GoogleOAuthClientService],
})
export class GoogleOAuthModule {}
