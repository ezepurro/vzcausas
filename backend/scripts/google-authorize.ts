// backend/scripts/google-authorize.ts
// Se corre UNA VEZ a mano para obtener el refresh token (ADR-004 §2.1).
// No es parte de la app: no lo importa ningún módulo.
import { google } from 'googleapis';
import * as http from 'http';
import { URL } from 'url';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send',
];

async function main() {
  const client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\nAbrí esta URL y autorizá con la cuenta que corresponda:\n');
  console.log(authUrl, '\n');

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, REDIRECT_URI);
      const code = url.searchParams.get('code');
      res.end('Listo, podés cerrar esta pestaña.');
      server.close();
      if (code) resolve(code);
      else reject(new Error('No llegó el código de autorización'));
    });
    server.listen(PORT);
  });

  const { tokens } = await client.getToken(code);

  console.log('\nGuardá esto en tu .env:\n');
  console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});