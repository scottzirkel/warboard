/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers environment bindings
// Used by @opennextjs/cloudflare's getCloudflareContext()
interface CloudflareEnv {
  DB: D1Database;
  NEXT_TAG_CACHE_D1: D1Database;
  WORKER_SELF_REFERENCE: Fetcher;
  ASSETS: Fetcher;
}
