// ============================================================
// SECURITY & COMPLIANCE — RBAC / MFA / LGPD / Audit
// ============================================================

export type Permission = "read" | "write" | "admin" | "alert" | "mission" | "report" | "api" | "audit" | "export";
export type Role = "super_admin" | "admin" | "commander" | "analyst" | "operator" | "viewer" | "api_user";

export interface SecurityPolicy {
  id: string;
  name: string;
  mfaRequired: boolean;
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSpecial: boolean;
  };
  ipWhitelist: string[];
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  auditRetention: number; // days
}

export interface RolePermission {
  role: Role;
  permissions: Permission[];
  description: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  result: "success" | "failure" | "denied";
}

export interface ComplianceReport {
  id: string;
  type: "lgpd" | "soc2" | "iso27001" | "custom";
  generatedAt: string;
  period: { from: string; to: string };
  findings: {
    category: string;
    status: "compliant" | "non_compliant" | "partial";
    details: string;
  }[];
  score: number;
}

// ─── DEFAULT SECURITY POLICY ───────────────────────────────

const defaultPolicy: SecurityPolicy = {
  id: "POL-DEFAULT",
  name: "Default Security Policy",
  mfaRequired: true,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true,
  },
  ipWhitelist: [],
  encryptionAtRest: true,
  encryptionInTransit: true,
  auditRetention: 365,
};

// ─── ROLE PERMISSIONS MAP ──────────────────────────────────

const rolePermissions: RolePermission[] = [
  {
    role: "super_admin",
    permissions: ["read", "write", "admin", "alert", "mission", "report", "api", "audit", "export"],
    description: "Full system access. Manages all roles, policies, and system configuration.",
  },
  {
    role: "admin",
    permissions: ["read", "write", "admin", "alert", "mission", "report", "api", "audit"],
    description: "Administrative access. Manages users, roles, alerts, and audit logs. Cannot export.",
  },
  {
    role: "commander",
    permissions: ["read", "write", "alert", "mission", "report"],
    description: "Operational command. Creates missions, manages alerts, and generates reports.",
  },
  {
    role: "analyst",
    permissions: ["read", "write", "report"],
    description: "Intelligence analysis. Reads/writes data and generates analytical reports.",
  },
  {
    role: "operator",
    permissions: ["read", "alert", "mission"],
    description: "Field operations. Reads data, triggers alerts, and participates in missions.",
  },
  {
    role: "viewer",
    permissions: ["read"],
    description: "Read-only access. Views dashboards, reports, and alerts.",
  },
  {
    role: "api_user",
    permissions: ["read", "api"],
    description: "Programmatic access. Reads data via API. No write or alert capabilities.",
  },
];

// ─── IN-MEMORY AUDIT LOG ──────────────────────────────────

const auditLog: AuditEntry[] = [];
let auditCounter = 0;

// ─── SECURITY FUNCTIONS ────────────────────────────────────

export function getSecurityPolicy(): SecurityPolicy {
  return { ...defaultPolicy };
}

export function getRolePermissions(role: Role): Permission[] {
  const roleConfig = rolePermissions.find((r) => r.role === role);
  return roleConfig ? [...roleConfig.permissions] : [];
}

export function checkPermission(role: Role, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

export function logAuditEntry(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  result: "success" | "failure" | "denied";
}): AuditEntry {
  const entry: AuditEntry = {
    id: `AUD-${Date.now()}-${++auditCounter}`,
    timestamp: new Date().toISOString(),
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    details: params.details ?? {},
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    result: params.result,
  };
  auditLog.push(entry);
  return entry;
}

export function getAuditLog(filters?: {
  userId?: string;
  action?: string;
  resource?: string;
  result?: "success" | "failure" | "denied";
  since?: string;
  limit?: number;
}): AuditEntry[] {
  let log = [...auditLog];

  if (filters) {
    if (filters.userId) log = log.filter((e) => e.userId === filters.userId);
    if (filters.action) log = log.filter((e) => e.action === filters.action);
    if (filters.resource) log = log.filter((e) => e.resource === filters.resource);
    if (filters.result) log = log.filter((e) => e.result === filters.result);
    if (filters.since) {
      const sinceMs = new Date(filters.since).getTime();
      log = log.filter((e) => new Date(e.timestamp).getTime() >= sinceMs);
    }
    if (filters.limit) log = log.slice(-filters.limit);
  }

  return log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateComplianceReport(type: "lgpd" | "soc2" | "iso27001" | "custom"): ComplianceReport {
  const policy = getSecurityPolicy();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 86400000).toISOString(); // last 30 days

  const findings: ComplianceReport["findings"] = [];

  // Encryption at rest
  findings.push({
    category: "Encryption at Rest",
    status: policy.encryptionAtRest ? "compliant" : "non_compliant",
    details: policy.encryptionAtRest ? "Data encryption at rest is enabled." : "Data encryption at rest is disabled.",
  });

  // Encryption in transit
  findings.push({
    category: "Encryption in Transit",
    status: policy.encryptionInTransit ? "compliant" : "non_compliant",
    details: policy.encryptionInTransit ? "TLS/SSL is enforced for all connections." : "Unencrypted connections may be allowed.",
  });

  // MFA
  findings.push({
    category: "Multi-Factor Authentication",
    status: policy.mfaRequired ? "compliant" : "non_compliant",
    details: policy.mfaRequired ? "MFA is required for all users." : "MFA is not enforced.",
  });

  // Password Policy
  const pp = policy.passwordPolicy;
  const passwordCompliant = pp.minLength >= 12 && pp.requireUppercase && pp.requireNumbers && pp.requireSpecial;
  findings.push({
    category: "Password Policy",
    status: passwordCompliant ? "compliant" : "partial",
    details: `Minimum length: ${pp.minLength}. Uppercase: ${pp.requireUppercase}. Numbers: ${pp.requireNumbers}. Special: ${pp.requireSpecial}.`,
  });

  // Session Timeout
  findings.push({
    category: "Session Management",
    status: policy.sessionTimeout <= 60 ? "compliant" : "partial",
    details: `Session timeout set to ${policy.sessionTimeout} minutes.`,
  });

  // Audit Retention
  findings.push({
    category: "Audit Log Retention",
    status: policy.auditRetention >= 90 ? "compliant" : "partial",
    details: `Audit logs retained for ${policy.auditRetention} days.`,
  });

  // Login Attempts
  findings.push({
    category: "Account Lockout",
    status: policy.maxLoginAttempts <= 10 ? "compliant" : "non_compliant",
    details: `Account locks after ${policy.maxLoginAttempts} failed login attempts.`,
  });

  // Calculate score
  const compliantCount = findings.filter((f) => f.status === "compliant").length;
  const partialCount = findings.filter((f) => f.status === "partial").length;
  const score = Math.round(((compliantCount + partialCount * 0.5) / findings.length) * 100);

  // Type-specific additions
  if (type === "lgpd") {
    findings.push({
      category: "Data Subject Rights",
      status: "compliant",
      details: "Data export and deletion capabilities are available via API.",
    });
    findings.push({
      category: "Data Processing Consent",
      status: "partial",
      details: "Consent tracking is implemented but requires periodic re-validation.",
    });
  }

  return {
    id: `COMP-${Date.now()}`,
    type,
    generatedAt: now.toISOString(),
    period: { from: periodStart, to: now.toISOString() },
    findings,
    score: Math.min(score, 100),
  };
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const policy = defaultPolicy.passwordPolicy;
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateMFASetup(userId: string): { configured: boolean; backupCodes: number } {
  // In production, this would check a real MFA provider
  // For now, return a simulated response
  const hasMFA = auditLog.some(
    (e) => e.userId === userId && e.action === "mfa_setup" && e.result === "success"
  );
  return {
    configured: hasMFA,
    backupCodes: hasMFA ? 8 : 0,
  };
}

export function getSecurityDashboard(): {
  totalLogins: number;
  failedAttempts: number;
  activeSessions: number;
  auditEvents: number;
} {
  const totalLogins = auditLog.filter((e) => e.action === "login").length;
  const failedAttempts = auditLog.filter((e) => e.action === "login" && e.result === "failure").length;
  const activeSessions = auditLog.filter(
    (e) => e.action === "login" && e.result === "success"
  ).length - auditLog.filter((e) => e.action === "logout").length;

  return {
    totalLogins,
    failedAttempts,
    activeSessions: Math.max(0, activeSessions),
    auditEvents: auditLog.length,
  };
}

export function getAllRolePermissions(): RolePermission[] {
  return rolePermissions.map((rp) => ({
    ...rp,
    permissions: [...rp.permissions],
  }));
}
