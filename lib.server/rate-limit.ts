/**
 * Simple in-memory rate limiter for API endpoints
 */

import { CLEANUP_INTERVAL } from "@/lib/constants";
import { logger } from "./logger";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup interval to prevent memory leaks
let lastCleanup = Date.now();

function cleanupExpiredRecords() {
  const now = Date.now();

  // Only run cleanup periodically
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;
  const expiredKeys: string[] = [];

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt < now) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    rateLimitMap.delete(key);
  }

  if (expiredKeys.length > 0) {
    logger.info(
      `[rate-limit] Cleaned up ${expiredKeys.length} expired records`,
    );
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  resetIn: number; // seconds until reset
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address)
 * @param maxRequests - Maximum requests allowed in the time window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = CLEANUP_INTERVAL, // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Periodic cleanup of expired entries
  cleanupExpiredRecords();

  // No record or expired record - create new
  if (!record || record.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      resetIn: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  // Increment count
  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
    resetIn: Math.ceil((record.resetAt - now) / 1000),
  };
}

/**
 * Get client identifier from request headers
 * Checks common proxy headers for real IP address
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP (common in proxies/load balancers)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return xForwardedFor.split(",")[0].trim();
  }

  // Check for real IP header
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  // Check for Cloudflare connecting IP
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to "unknown" - in development this will be the same for all requests
  // In production with proper proxy setup, this should rarely be used
  return "unknown";
}

/**
 * Get current rate limit stats for debugging
 */
export function getRateLimitStats() {
  return {
    totalClients: rateLimitMap.size,
    records: Array.from(rateLimitMap.entries()).map(([id, record]) => ({
      identifier: id.substring(0, 20) + "...", // Truncate for privacy
      count: record.count,
      resetIn: Math.ceil((record.resetAt - Date.now()) / 1000),
    })),
  };
}
