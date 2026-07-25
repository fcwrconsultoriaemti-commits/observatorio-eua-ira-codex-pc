import { createSSEResponse, getClientCount } from "../../../lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") || undefined;
  const riskLevel = url.searchParams.get("riskLevel") || undefined;

  return createSSEResponse({ category, riskLevel });
}
