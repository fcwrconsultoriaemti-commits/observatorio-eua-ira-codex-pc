import { NextRequest, NextResponse } from "next/server";
import { getSecurityPolicy, getSecurityDashboard, getAuditLog, logAuditEntry, checkPermission, validatePassword, generateComplianceReport } from "../../../lib/security/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "dashboard";

    switch (action) {
      case "dashboard":
        return NextResponse.json({ success: true, data: getSecurityDashboard() });

      case "policy":
        return NextResponse.json({ success: true, data: getSecurityPolicy() });

      case "audit_log": {
        const filters: Record<string, unknown> = {};
        const userId = url.searchParams.get("userId");
        const actionFilter = url.searchParams.get("actionFilter");
        const limit = url.searchParams.get("limit");
        const since = url.searchParams.get("since");
        if (userId) filters.userId = userId;
        if (actionFilter) filters.action = actionFilter;
        if (limit) filters.limit = parseInt(limit);
        if (since) filters.since = since;
        return NextResponse.json({ success: true, data: getAuditLog(filters as Parameters<typeof getAuditLog>[0]) });
      }

      case "check_permission": {
        const role = url.searchParams.get("role") as Parameters<typeof checkPermission>[0] | undefined;
        const permission = url.searchParams.get("permission") as Parameters<typeof checkPermission>[1] | undefined;
        if (!role || !permission) return NextResponse.json({ success: false, error: "role e permissão são obrigatórios" }, { status: 400 });
        return NextResponse.json({ success: true, data: { allowed: checkPermission(role, permission) } });
      }

      case "compliance": {
        const type = (url.searchParams.get("type") || "lgpd") as Parameters<typeof generateComplianceReport>[0];
        return NextResponse.json({ success: true, data: generateComplianceReport(type) });
      }

      default:
        return NextResponse.json({ success: false, error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action?: string; [key: string]: unknown };
    const action = body.action || "log_audit";

    switch (action) {
      case "log_audit": {
        const entry = logAuditEntry(body as Parameters<typeof logAuditEntry>[0]);
        return NextResponse.json({ success: true, data: entry });
      }

      case "validate_password": {
        const password = body.password as string;
        if (!password) return NextResponse.json({ success: false, error: "senha é obrigatória" }, { status: 400 });
        return NextResponse.json({ success: true, data: validatePassword(password) });
      }

      case "check_permission": {
        const role = body.role as Parameters<typeof checkPermission>[0];
        const permission = body.permission as Parameters<typeof checkPermission>[1];
        if (!role || !permission) return NextResponse.json({ success: false, error: "role e permissão são obrigatórios" }, { status: 400 });
        return NextResponse.json({ success: true, data: { allowed: checkPermission(role, permission) } });
      }

      default:
        return NextResponse.json({ success: false, error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
