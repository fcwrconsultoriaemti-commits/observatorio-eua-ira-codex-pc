// ============================================================
// SEGURANÇA E CONFORMIDADE — RBAC / MFA / LGPD / Auditoria
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

// ─── POLÍTICA DE SEGURANÇA PADRÃO ──────────────────────────

const defaultPolicy: SecurityPolicy = {
  id: "POL-DEFAULT",
  name: "Política de Segurança Padrão",
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

// ─── MAPA DE PERMISSÕES DE FUNÇÃO ──────────────────────────

const rolePermissions: RolePermission[] = [
  {
    role: "super_admin",
    permissions: ["read", "write", "admin", "alert", "mission", "report", "api", "audit", "export"],
    description: "Acesso total ao sistema. Gerencia todas as funções, políticas e configuração do sistema.",
  },
  {
    role: "admin",
    permissions: ["read", "write", "admin", "alert", "mission", "report", "api", "audit"],
    description: "Acesso administrativo. Gerencia usuários, funções, alertas e logs de auditoria. Não pode exportar.",
  },
  {
    role: "commander",
    permissions: ["read", "write", "alert", "mission", "report"],
    description: "Comando operacional. Cria missões, gerencia alertas e gera relatórios.",
  },
  {
    role: "analyst",
    permissions: ["read", "write", "report"],
    description: "Análise de inteligência. Lê/escreve dados e gera relatórios analíticos.",
  },
  {
    role: "operator",
    permissions: ["read", "alert", "mission"],
    description: "Operações de campo. Lê dados, dispara alertas e participa de missões.",
  },
  {
    role: "viewer",
    permissions: ["read"],
    description: "Acesso somente leitura. Visualiza painéis, relatórios e alertas.",
  },
  {
    role: "api_user",
    permissions: ["read", "api"],
    description: "Acesso programático. Lê dados via API. Sem capacidades de escrita ou alerta.",
  },
];

// ─── LOG DE AUDITORIA EM MEMÓRIA ───────────────────────────

const auditLog: AuditEntry[] = [];
let auditCounter = 0;

// ─── FUNÇÕES DE SEGURANÇA ──────────────────────────────────

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

  // Criptografia em repouso
  findings.push({
    category: "Criptografia em Repouso",
    status: policy.encryptionAtRest ? "compliant" : "non_compliant",
    details: policy.encryptionAtRest ? "Criptografia de dados em repouso está habilitada." : "Criptografia de dados em repouso está desabilitada.",
  });

  // Criptografia em trânsito
  findings.push({
    category: "Criptografia em Trânsito",
    status: policy.encryptionInTransit ? "compliant" : "non_compliant",
    details: policy.encryptionInTransit ? "TLS/SSL é obrigatório para todas as conexões." : "Conexões não criptografadas podem ser permitidas.",
  });

  // MFA
  findings.push({
    category: "Autenticação Multifator",
    status: policy.mfaRequired ? "compliant" : "non_compliant",
    details: policy.mfaRequired ? "MFA é obrigatório para todos os usuários." : "MFA não é obrigatório.",
  });

  // Política de Senha
  const pp = policy.passwordPolicy;
  const passwordCompliant = pp.minLength >= 12 && pp.requireUppercase && pp.requireNumbers && pp.requireSpecial;
  findings.push({
    category: "Política de Senha",
    status: passwordCompliant ? "compliant" : "partial",
    details: `Comprimento mínimo: ${pp.minLength}. Maiúsculas: ${pp.requireUppercase}. Números: ${pp.requireNumbers}. Especiais: ${pp.requireSpecial}.`,
  });

  // Gerenciamento de Sessão
  findings.push({
    category: "Gerenciamento de Sessão",
    status: policy.sessionTimeout <= 60 ? "compliant" : "partial",
    details: `Tempo limite de sessão definido para ${policy.sessionTimeout} minutos.`,
  });

  // Retenção de Auditoria
  findings.push({
    category: "Retenção de Logs de Auditoria",
    status: policy.auditRetention >= 90 ? "compliant" : "partial",
    details: `Logs de auditoria retidos por ${policy.auditRetention} dias.`,
  });

  // Tentativas de Login
  findings.push({
    category: "Bloqueio de Conta",
    status: policy.maxLoginAttempts <= 10 ? "compliant" : "non_compliant",
    details: `Conta é bloqueada após ${policy.maxLoginAttempts} tentativas de login falhas.`,
  });

  // Calcular pontuação
  const compliantCount = findings.filter((f) => f.status === "compliant").length;
  const partialCount = findings.filter((f) => f.status === "partial").length;
  const score = Math.round(((compliantCount + partialCount * 0.5) / findings.length) * 100);

  // Adições específicas por tipo
  if (type === "lgpd") {
    findings.push({
      category: "Direitos do Titular dos Dados",
      status: "compliant",
      details: "Capacidades de exportação e exclusão de dados estão disponíveis via API.",
    });
    findings.push({
      category: "Consentimento de Processamento de Dados",
      status: "partial",
      details: "Rastreamento de consentimento está implementado, mas requer revalidação periódica.",
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
    errors.push(`A senha deve ter pelo menos ${policy.minLength} caracteres.`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("A senha deve conter pelo menos uma letra maiúscula.");
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("A senha deve conter pelo menos um número.");
  }
  if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("A senha deve conter pelo menos um caractere especial.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateMFASetup(userId: string): { configured: boolean; backupCodes: number } {
  // Em produção, isso verificaria um provedor MFA real
  // Por enquanto, retorna uma resposta simulada
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
