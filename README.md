# securenotes.me

A secure, self-destructing message tool with 100% encrypted SQLite storage and optional password protection.

## Features

- **100% Encrypted Database**: SQLCipher provides 256-bit AES encryption at rest
- **Self-Destructing Messages**: Auto-deletes after viewing or expiration
- **Optional Password Protection**: Extra layer of encryption per message
- **Zero Logging**: No IP tracking, no analytics, complete privacy
- **Self-Hostable**: Deploy on your own VPS with Coolify

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
   node -e "console.log('ENCRYPTION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Run the app:
   ```bash
   npm run dev
   ```

## Deploy with Coolify

1. Set environment variables in Coolify:
   - `DB_ENCRYPTION_KEY` - Generate a 64-character hex key
   - `ENCRYPTION_SECRET` - Generate another 64-character hex key
   - `NODE_ENV=production`

2. Map persistent storage to `/app/data`

3. Deploy using the included `docker-compose.yml`

## Security

- Database file is encrypted with SQLCipher (256-bit AES)
- Message content is encrypted with CryptoJS before storage
- Optional password adds additional encryption layer
- Messages auto-delete after max views or expiration
- No logs, no tracking, zero knowledge architecture

