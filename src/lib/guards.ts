/**
 * Use in any debug or internal-only route. In production returns 404.
 * Ensures "生产环境关闭调试接口" (doc 4.3).
 */
export function requireDevelopment(): void {
  const env =
    process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? "development";
  if (env === "production") {
    throw new Response(null, { status: 404 });
  }
}
