# securenotes.me

A client-side encrypted, self-destructing message service with honest privacy protection.

## Features

- **Client-Side Encryption**: Messages are encrypted in your browser before upload
- **AES-256 Encryption**: Strong encryption for message content
- **Encrypted Database**: SQLCipher provides 256-bit AES encryption at rest
- **Self-Destructing Messages**: Auto-deletes after viewing or expiration
- **Optional Password Protection**: Password-derived keys processed locally in browser
- **Minimal Logging**: Application does not log message content or routine request data
- **Self-Hostable**: Deploy on your own infrastructure

## How It Works

1. **Create Message**: Content is encrypted in your browser using AES-256
2. **Server Storage**: Only encrypted ciphertext is stored on the server
3. **Key Delivery**: 
   - Link mode: Key embedded in URL fragment (never sent to server)
   - Password mode: Salt in URL, key derived locally from password
4. **Decryption**: Happens locally in the recipient's browser
5. **Self-Destruct**: Messages deleted after configured view limit or expiration

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set your encryption keys:
   ```bash
   cp .env.example .env
   ```

3. Generate secure keys:
   ```bash
   node -e "console.log('DB_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

## Deploy with Coolify

1. Set environment variables in Coolify:
   - `DB_ENCRYPTION_KEY` - Generate a 64-character hex key
   - `NODE_ENV=production`

2. Map persistent storage to `/app/data`

3. Deploy using the included `docker-compose.yml`

## Security Model

### What's Encrypted
- **Message Content**: AES-256 encrypted in browser before upload
- **Database**: SQLCipher encryption at rest
- **Keys**: 
  - Link mode: Key stays in URL fragment only
  - Password mode: Key derived locally, never sent to server

### What Server Receives
- Encrypted ciphertext only
- Boolean flag indicating password protection (no password hash)
- Expiration and view limit settings

### What Server Does NOT Receive
- Decryption keys
- Passwords or password hashes
- Plain text message content
- Routine request data (in production)

### Logging
- **Development**: Full logging for debugging
- **Production**: Only fatal startup errors logged
- **No request logging** or routine activity logging

## Technical Details

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: SQLite with SQLCipher encryption
- **Encryption**: CryptoJS (AES-256), PBKDF2 for password derivation
- **Key Management**: Client-side generation and URL fragment delivery

## Privacy Claims

This application provides:
- ✅ Client-side encryption before upload
- ✅ Server stores only encrypted content
- ✅ Decryption happens locally in browser
- ✅ Application does not log message content or routine request data

Note: Infrastructure (Docker, hosting providers, reverse proxies) may still log at their level.

## License

MIT
