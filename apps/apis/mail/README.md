# Mail Service (`@LCArena/mail`)

Internal SMTP microservice. It renders transactional emails and dispatches them
through any SMTP relay using [nodemailer](https://nodemailer.com/). The gateway
calls it to deliver login/registration OTPs.

- **Port:** `3003` (internal only)
- **Endpoints:**
  - `GET /health` — liveness.
  - `POST /otp` — body `{ email, otp }`; renders and sends the verification email.

The OTP is never logged. Delivery failures are returned as errors to the caller;
the gateway treats them as best-effort so `/auth/send-otp` cannot be used to
probe provider health or account existence.

## Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3003` | HTTP port. |
| `MAIL_HOST` | `localhost` | SMTP relay host. |
| `MAIL_PORT` | `587` | SMTP port (`465` with `MAIL_SECURE=true`, `25`/`1025` plain). |
| `MAIL_SECURE` | `false` | `true` = implicit TLS; `false` = STARTTLS/plain. |
| `MAIL_USER` | — | SMTP username (omit for anonymous relays). |
| `MAIL_PASSWORD` | — | SMTP password / API key. |
| `MAIL_FROM` | `LCArena <no-reply@lcarena.local>` | `From` header. |
| `MAIL_CONNECTION_TIMEOUT_MS` | `10000` | Connect/greeting timeout. |
| `MAIL_SERVICE_TOKEN` | — | Shared secret required in `x-mail-service-token`. **Set this** whenever the service is reachable beyond the gateway, otherwise `/otp` is an open email sender. |

Any SMTP relay works — Gmail (`smtp.gmail.com:587`, app password), Mailtrap,
Brevo, Postmark, SendGrid, Mailgun, or a local catcher. See `.env.example`.

## Scripts

```sh
npm run dev      # tsx watch
npm run build    # tsc -> dist
npm start        # node dist/index.js
npm test         # unit tests, including a real SMTP round-trip on a local sink
```

The test suite starts an in-process SMTP server (`smtp-server`) and sends a real
message through it, so the SMTP path is exercised without external services.
