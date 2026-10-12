# Deploying the LCArena Frontend to S3 + CloudFront

How to build `apps/frontend` (React 19 + Vite) and serve it from a **private S3
bucket behind CloudFront over HTTPS**. Every step is copy-pasteable with the AWS
CLI v2; the console route is summarised in [section 8](#8-console-route-instead-of-cli).

> **Frontend only.** This serves a static bundle. `apps/frontend` calls `/auth`,
> `/api`, `/health` (gateway) and `/suggestions` (AI service) on **its own
> origin**, so those paths need another origin attached in CloudFront before the
> deployed app can log in or submit code — see [section 9](#9-routing-the-api-through-cloudfront).

## 1. The shape of the deployment

```text
Browser ──HTTPS──> CloudFront (dxxxxxxxx.cloudfront.net)
                        │  signed request (SigV4) via Origin Access Control
                        ▼
                   S3 bucket (private, no public access, Block Public Access on)
                   index.html · favicon.svg · icons.svg · assets/*.js|css
```

Three things make this secure and are the whole point of the design:

- The bucket is **private**. No static website hosting, no public ACLs, no public
  bucket policy. CloudFront is the only reader.
- CloudFront authenticates to S3 with **Origin Access Control (OAC)**, the
  current AWS recommendation. The older Origin Access Identity (OAI) is legacy.
- Viewers get **HTTPS on the `*.cloudfront.net` domain with no certificate of
  your own** — CloudFront's default certificate covers it.

## 2. Prerequisites

| Requirement | Notes |
| :--- | :--- |
| Node.js ≥ 24, npm ≥ 11 | see the root `package.json` `engines` |
| AWS CLI v2, configured | `aws sts get-caller-identity` must succeed |
| Region | the bucket's region; this project uses `ap-south-1` |
| IAM permissions | `s3:CreateBucket`, `s3:PutObject`, `s3:PutBucketPolicy`, `s3:PutBucketEncryption`, `s3:PutPublicAccessBlock`, `cloudfront:CreateDistribution`, `cloudfront:CreateOriginAccessControl`, `cloudfront:CreateInvalidation` |

> **This account cannot create buckets.** In account `808644003350` the action
> `s3:CreateBucket` is explicitly denied for every name and region by AWS
> Organizations service control policy `p-7i3xfto1` (org `o-crddxzlun1`, managed
> by account `738385003481`). SCPs can only deny, so the fix is to edit that
> policy in the **management account** — either remove `s3:CreateBucket` from its
> deny statement, or narrow the statement with
> `"Condition": {"StringNotEquals": {"aws:PrincipalArn": "arn:aws:iam::<ACCOUNT_ID>:user/<USER>"}}`
> so only your deploy principal is exempt. CloudFront and OAC calls are already
> permitted in this account.

Set shell variables once per session:

```bash
export AWS_PROFILE=lcarena          # or whichever profile holds your keys
export AWS_REGION=ap-south-1
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export BUCKET="lcarena-frontend-${ACCOUNT_ID}"
export OAC_NAME="lcarena-frontend-oac"
```

> If `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are exported in your shell,
> they **override** `--profile` and any credentials file. `unset` them if calls
> fail with `InvalidClientTokenId`.

## 3. Step 1 — Build the bundle

From `apps/frontend`:

```bash
cd apps/frontend
npm run build          # tsc -b && vite build  ->  dist/
ls dist                # index.html  favicon.svg  icons.svg  assets/
```

`dist/` is the only thing that gets uploaded. Never upload the source, `node_modules`,
or `.env` files.

## 4. Step 2 — Create the private bucket

```bash
aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"

# Refuse all public access (this is the default, make it explicit)
aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Encrypt at rest
aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
```

Do **not** run `aws s3 website`. A website endpoint would force CloudFront to use
a custom origin, cannot be protected by OAC, and cannot use HTTPS to the origin.

## 5. Step 3 — Upload `dist/`

Vite fingerprints every file under `assets/`, so those can be cached forever,
while `index.html` must always be revalidated.

```bash
cd apps/frontend

# Hashed assets: immutable for a year; --delete prunes bundles from old builds
aws s3 sync dist/assets/ "s3://$BUCKET/assets/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable"

# Everything else (index.html, favicon.svg, icons.svg): never cache
aws s3 sync dist/ "s3://$BUCKET/" \
  --delete --exclude "assets/*" \
  --cache-control "no-cache,must-revalidate"
```

The two commands are ordered so the root sync's `--exclude "assets/*"` cannot
delete assets that were just uploaded, and so old hashed bundles are pruned by
the first command. `aws s3 sync` sets `Content-Type` per file automatically.

## 6. Step 4 — Create the distribution

**4a. Create the Origin Access Control** and keep the returned `Id`:

```bash
aws cloudfront create-origin-access-control \
  --origin-access-control-config \
    "Name=$OAC_NAME,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3"
```

**4b. Write the distribution config.** Replace `BUCKET_DOMAIN`, `OAC_ID` and the
comment as needed. The origin must be the **regional REST endpoint**, not a
website endpoint.

```bash
cat > /tmp/distribution-config.json <<'JSON'
{
  "CallerReference": "lcarena-frontend-1",
  "Comment": "LCArena frontend (S3 + OAC)",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-lcarena-frontend",
        "DomainName": "BUCKET_DOMAIN",
        "OriginAccessControlId": "OAC_ID",
        "S3OriginConfig": { "OriginAccessIdentity": "" }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-lcarena-frontend",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 },
      { "ErrorCode": 404, "ResponsePagePath": "/index.html", "ResponseCode": "200", "ErrorCachingMinTTL": 0 }
    ]
  },
  "ViewerCertificate": { "CloudFrontDefaultCertificate": true },
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "PriceClass": "PriceClass_200"
}
JSON
```

Notes on the values:

- `BUCKET_DOMAIN` is `<bucket>.s3.<region>.amazonaws.com`.
- `658327ea-f89d-4fab-a63d-7e88639e58f6` is the managed **CachingOptimized**
  policy. It caches on path only (no cookies, no query strings) and enforces a
  **1-second minimum TTL**, so `no-cache` from S3 still permits brief caching.
  `4135ea2d-6df8-44a3-9df3-4b5a84be39ad` is **CachingDisabled** if you want a
  behavior that never caches.
- `ViewerCertificate.CloudFrontDefaultCertificate` gives HTTPS on the
  `*.cloudfront.net` domain with no ACM certificate. AWS also pins the security
  policy to `TLSv1` for the default certificate regardless of any minimum-version
  setting — attach an ACM certificate (which must live in `us-east-1`) when you
  move to a custom domain.
- `PriceClass_200` keeps edge locations in Asia, which matters for
  `ap-south-1`-centric traffic. `PriceClass_100` is cheaper but serves India from
  US/Europe edges.
- The `CustomErrorResponses` block makes client-side routing work
  ([section 11](#optional-cloudfront-function-for-spa-routing) covers a more selective
  alternative). It is **not** offered by the console's create wizard.

**4c. Create it**, then wait and capture the domain:

```bash
aws cloudfront create-distribution \
  --distribution-config file:///tmp/distribution-config.json

export DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='LCArena frontend (S3 + OAC)'].Id" \
  --output text)

aws cloudfront wait distribution-deployed --id "$DIST_ID"
export DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.DomainName' --output text)
echo "https://$DOMAIN"
```

**4d. Grant that distribution read access** — until this policy exists CloudFront
returns 403 for every object:

```bash
cat > /tmp/bucket-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"
        }
      }
    }
  ]
}
JSON

aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/bucket-policy.json
```

The `AWS:SourceArn` condition scopes the grant to this one distribution, so a
bucket policy listing cannot be reused by a distribution you do not control. Keep
Block Public Access enabled — this policy does **not** make objects public.

## 7. Step 5 — Verify

Never trust the console's "Deployed" badge or a 200 alone. Check the shell, a
hashed asset, a deep route, and the content types:

```bash
curl -sS -o /dev/null -w 'shell      %{http_code}  %{content_type}\n' "https://$DOMAIN/"
curl -sS -o /dev/null -w 'deep route %{http_code}  %{content_type}\n' "https://$DOMAIN/problems"
curl -sS -o /dev/null -w 'favicon    %{http_code}  %{content_type}\n' "https://$DOMAIN/favicon.svg"

# the JS bundle referenced by index.html, with cache status
JS=$(curl -sS "https://$DOMAIN/" | grep -o '/assets/[^"]*\.js' | head -1)
curl -sSI "https://$DOMAIN$JS" | grep -Ei '^(HTTP|x-cache|content-type|cache-control)'
```

Expected: `200` and `text/html` for `/` and the deep route, `200` and
`image/svg+xml` for the favicon, `200` and a `javascript` content type for the
bundle. `x-cache: Miss from cloudfront` on the first request and `Hit` after the
second is proof caching is wired up. Load `https://$DOMAIN` in a browser too and
confirm the app renders without console errors — an HTTP 200 does not prove the
page painted.

## 8. Console route instead of CLI

1. **S3 → Create bucket** — name it, pick the region, leave *Block all public
   access* **on**.
2. Upload the contents of `dist/` (`assets/` must land as a folder at the root).
3. **CloudFront → Create distribution** → choose **Single website or app** →
   select the bucket as the *Amazon S3* origin → **Use recommended origin
   settings** (this configures OAC and offers to update the bucket policy for you
   — accept it).
4. **Default root object**: `index.html` (no leading slash).
5. **Viewer protocol policy**: *Redirect HTTP to HTTPS*.
6. After creation, edit the distribution and add the two **Custom error
   responses** (403 and 404 → `/index.html`, response code 200) if the wizard did
   not apply them.
7. Under **Behaviors**, confirm the **CachingOptimized** cache policy.

## 9. Routing the API through CloudFront

`apps/frontend` requests `/auth`, `/api`, `/health` and `/suggestions` relative to
its own origin (see `src/services/apiClient.ts` and `vite.config.ts`, where the
dev server proxies them to the gateway on `:3000` and the AI service on `:8000`).
On a bare CloudFront distribution those paths hit S3 and 403.

Attaching the gateway as a second origin is what makes the deployed app actually
usable:

1. **Origins** → create an origin for your gateway host (an ALB, App Runner
   service, or EC2/Nginx with TLS) — protocol *HTTPS only* if the gateway
   terminates TLS.
2. **Behaviors** → add ordered behaviors for the path patterns `/auth/*`,
   `/api/*`, `/health`, `/suggestions*` pointing at that origin, with
   **CachingDisabled** (`4135ea2d-6df8-44a3-9df3-4b5a84be39ad`) and an
   **AllViewer** origin request policy so `Authorization`, cookies and query
   strings reach the gateway untouched.
3. Keep the default behavior on the S3 origin.

Routing through CloudFront is preferable to calling the gateway from a different
hostname: the refresh-token cookie set by `/auth/refresh` is `httpOnly`,
`sameSite: lax`, `path: /auth`, and every request is sent `withCredentials`. On a
single origin those attributes just work; across origins you would need CORS with
credentials, a `SameSite=None; Secure` cookie, and `Access-Control-Allow-Origin`
on the gateway — a bigger change than one extra behavior.

Also remember the API gateway's `authenticate` middleware strips client
`x-user-id`, so never hardcode one into the bundle.

### 9.1 Backend still running locally in Docker

If the backend stays on your machine (`docker compose up`), **no CloudFront
behavior alone can reach it**: `docker-compose.yml` binds the gateway to
`127.0.0.1:3000`, which is loopback-only, and the browser on a CloudFront page
cannot resolve your machine's `localhost`. Symptoms: the deployed app loads but
login/API calls fail, because without `VITE_API_URL` the bundle sends
`/auth/*` and `/api/*` requests to the **CloudFront origin itself** (S3),
returning the SPA fallback HTML or a 405 — the gateway is never contacted. The
local `npm run dev` frontend works only because the Vite dev server proxies
those paths to `:3000`.

Two ways out:

1. **Tunnel the gateway and point the bundle at it (cross-origin).** Expose the
   gateway over public HTTPS, e.g. with a [cloudflared quick
   tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/use-cases/tunnel-for-examples/):
   ```bash
   cloudflared tunnel --url http://127.0.0.1:3000   # prints an https:// trycloudflare.com URL
   ```
   Then bake that URL into the build — `VITE_*` variables are inlined at build
   time, not runtime:
   ```bash
   cd apps/frontend
   VITE_API_URL=https://<tunnel-host> npm run build
   ```
   The gateway's CORS already reflects any origin with credentials
   (`CORS_ORIGIN=*` → `origin: true`), so credentialed requests are accepted.
   The `sameSite: lax` refresh cookie is **not** sent cross-site, but the
   frontend's refresh interceptor already falls back to the refresh token in
   the request body, so session renewal still works. The AI suggestion service
   (`:8000`, also loopback-bound) needs its own tunnel and `VITE_AI_URL`; if
   unset, `/suggestions` follows `VITE_API_URL`.
2. **Tunnel the gateway and proxy through CloudFront (same-origin, cleanest).**
   Use the tunnel's HTTPS URL as the second origin from section 9 and add the
   `/auth/*`, `/api/*`, `/health`, `/suggestions*` behaviors. No build-time env
   var needed, and the refresh cookie keeps working as first-party.

Either way, remember that a quick tunnel's URL changes every restart — use a
named cloudflared tunnel (or ngrok's fixed domain) if you want a stable
frontend-to-backend wiring.

## 10. Redeploying

```bash
cd apps/frontend && npm run build

aws s3 sync dist/assets/ "s3://$BUCKET/assets/" --delete \
  --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/ "s3://$BUCKET/" --delete --exclude "assets/*" \
  --cache-control "no-cache,must-revalidate"

aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/" "/index.html"
```

Because assets are content-hashed, only `index.html` (and the root) needs
invalidating; deleting stale bundles is handled by `--delete`. Invalidating `/*`
works but is slower and costs more than necessary.

## 11. Gotchas and troubleshooting

| Symptom | Cause / fix |
| :--- | :--- |
| `403 AccessDenied` from CloudFront on every object | Bucket policy missing, stale, or its `AWS:SourceArn` names a different distribution. Re-run step 4d with the current `$DIST_ID`. |
| `InvalidClientTokenId` from the CLI | Stale `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` exported in the shell override the profile. `unset` them. |
| `AccessDenied ... explicit deny in a service control policy` | An Organizations SCP (this account: `p-7i3xfto1`) blocks the action. It can only be changed from the management account. |
| Deep link works in dev, 404/blank on refresh | SPA fallback missing. Add the 403/404 → `/index.html` error responses, or a viewer-request CloudFront Function. |
| A missing asset returns the app shell with `200` | Expected side effect of the 403/404 fallback — check `content-type` when debugging missing files. |
| Old page after a deploy | `index.html` cached (or a stale service worker). Invalidate it; keep `no-cache` on the root sync. |
| Site slow for Indian users | Use `PriceClass_200` or `PriceClass_All` rather than `PriceClass_100`. |
| Bucket not readable by OAC with SSE-KMS objects | The KMS key policy must also allow CloudFront. AES256 (step 2) needs no extra grant. |

### Optional: CloudFront Function for SPA routing

An alternative to the error-response trick, which rewrites only extensionless
paths and leaves real files alone:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.startsWith('/assets/') || uri.startsWith('/api/') ||
      uri.startsWith('/auth/') || uri.includes('.')) {
    return request;
  }
  request.uri = '/index.html';
  return request;
}
```

Associate it on the **viewer request** of the default behavior. Note that
changing `request.uri` does not change which cache behavior or origin serves the
request, so API prefixes still need their own behaviors.

## 12. Values used for this project

| Item | Value |
| :--- | :--- |
| AWS account | `808644003350` (`arn:aws:iam::808644003350:user/Admin`) |
| Region / bucket | `ap-south-1`, `lcarena-frontend-808644003350` |
| Build output | `apps/frontend/dist` — 5 files, ~572 KB |
| Entry point | `index.html` (references `/assets/index-*.js` and `/assets/index-*.css`) |
| Blocking SCP | `p-7i3xfto1` in org `o-crddxzlun1` — denies `s3:CreateBucket` |
