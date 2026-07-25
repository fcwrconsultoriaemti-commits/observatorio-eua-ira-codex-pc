// ============================================================
// MULTI-TENANCY — Organization & Access Control
// ============================================================

import type { RiskCategory, RiskLevel } from "../types";

export type OrgType = "defesa_civil" | "prefeitura" | "governo_estadual" | "governo_federal" | "empresa" | "universidade" | "seguradora" | "energia" | "telecom";
export type Permission = "read" | "write" | "admin" | "alert" | "mission" | "report" | "api";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  country: string;
  state?: string;
  city?: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  permissions: Permission[];
  modules: RiskCategory[];
  alertChannels: string[];
  apiKeys: string[];
  createdAt: string;
  settings: OrgSettings;
}

export interface OrgSettings {
  maxEvents: number;
  maxAlerts: number;
  refreshInterval: number;
  language: string;
  timezone: string;
  dashboardLayout: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    webhook: boolean;
    telegram: boolean;
  };
}

export interface User {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: "admin" | "viewer" | "operator" | "analyst";
  permissions: Permission[];
  lastLogin: string;
  createdAt: string;
}

// ─── STORE ─────────────────────────────────────────────────

const orgs: Map<string, Organization> = new Map();
const users: Map<string, User> = new Map();
let orgCounter = 0;
let userCounter = 0;

// ─── ORGANIZATION CRUD ─────────────────────────────────────

export function createOrganization(params: {
  name: string;
  type: OrgType;
  country: string;
  state?: string;
  city?: string;
  plan?: Organization["plan"];
}): Organization {
  const id = `ORG-${Date.now()}-${++orgCounter}`;
  const now = new Date().toISOString();

  const planConfig: Record<string, { maxEvents: number; maxAlerts: number; refreshInterval: number; permissions: Permission[] }> = {
    free: { maxEvents: 100, maxAlerts: 10, refreshInterval: 300000, permissions: ["read"] },
    basic: { maxEvents: 500, maxAlerts: 50, refreshInterval: 120000, permissions: ["read", "alert"] },
    pro: { maxEvents: 2000, maxAlerts: 200, refreshInterval: 60000, permissions: ["read", "write", "alert", "mission", "report"] },
    enterprise: { maxEvents: 10000, maxAlerts: 1000, refreshInterval: 30000, permissions: ["read", "write", "admin", "alert", "mission", "report", "api"] },
  };

  const plan = params.plan || "free";
  const config = planConfig[plan];

  const org: Organization = {
    id,
    name: params.name,
    type: params.type,
    country: params.country,
    state: params.state,
    city: params.city,
    plan,
    permissions: config.permissions,
    modules: getDefaultModules(params.type),
    alertChannels: getDefaultChannels(params.type),
    apiKeys: [],
    createdAt: now,
    settings: {
      maxEvents: config.maxEvents,
      maxAlerts: config.maxAlerts,
      refreshInterval: config.refreshInterval,
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      dashboardLayout: "default",
      notificationPreferences: { email: true, push: true, webhook: false, telegram: false },
    },
  };

  orgs.set(id, org);
  return org;
}

export function getOrganization(id: string): Organization | undefined {
  return orgs.get(id);
}

export function getAllOrganizations(): Organization[] {
  return Array.from(orgs.values());
}

export function updateOrganization(id: string, updates: Partial<Organization>): boolean {
  const org = orgs.get(id);
  if (!org) return false;
  Object.assign(org, updates);
  return true;
}

export function deleteOrganization(id: string): boolean {
  return orgs.delete(id);
}

// ─── USER CRUD ─────────────────────────────────────────────

export function createUser(params: {
  orgId: string;
  name: string;
  email: string;
  role: User["role"];
}): User {
  const id = `USR-${Date.now()}-${++userCounter}`;
  const now = new Date().toISOString();

  const rolePermissions: Record<User["role"], Permission[]> = {
    admin: ["read", "write", "admin", "alert", "mission", "report", "api"],
    analyst: ["read", "write", "alert", "mission", "report"],
    operator: ["read", "alert", "mission"],
    viewer: ["read"],
  };

  const user: User = {
    id,
    orgId: params.orgId,
    name: params.name,
    email: params.email,
    role: params.role,
    permissions: rolePermissions[params.role],
    lastLogin: now,
    createdAt: now,
  };

  users.set(id, user);
  return user;
}

export function getUser(id: string): User | undefined {
  return users.get(id);
}

export function getUsersByOrg(orgId: string): User[] {
  return Array.from(users.values()).filter(u => u.orgId === orgId);
}

export function authenticateUser(email: string): User | undefined {
  return Array.from(users.values()).find(u => u.email === email);
}

// ─── PERMISSIONS ───────────────────────────────────────────

export function hasPermission(userId: string, permission: Permission): boolean {
  const user = users.get(userId);
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function canAccessModule(userId: string, module: RiskCategory): boolean {
  const user = users.get(userId);
  if (!user) return false;
  const org = orgs.get(user.orgId);
  if (!org) return false;
  return org.modules.includes(module);
}

// ─── DEFAULT CONFIGS ───────────────────────────────────────

function getDefaultModules(type: OrgType): RiskCategory[] {
  const base: RiskCategory[] = ["terremoto", "furacao", "enchente", "incendio"];
  const typeModules: Record<OrgType, RiskCategory[]> = {
    defesa_civil: [...base, "vulcao", "tornado", "clima_severo", "seca", "infraestrutura"],
    prefeitura: [...base, "tornado", "clima_severo", "infraestrutura", "energia"],
    governo_estadual: [...base, "vulcao", "tornado", "clima_severo", "seca", "infraestrutura", "energia"],
    governo_federal: ["terremoto", "vulcao", "furacao", "tornado", "clima_severo", "incendio", "enchente", "seca", "espacial", "neo", "saude", "cibernetico", "energia", "maritimo", "aereo", "economico", "infraestrutura", "conflito"],
    empresa: ["economico", "cibernetico", "infraestrutura", "maritimo", "aereo"],
    universidade: ["terremoto", "vulcao", "espacial", "neo", "incendio"],
    seguradora: ["terremoto", "furacao", "enchente", "incendio", "tornado", "economico"],
    energia: ["terremoto", "furacao", "clima_severo", "enchente", "cibernetico", "infraestrutura"],
    telecom: ["cibernetico", "espacial", "furacao", "infraestrutura"],
  };
  return typeModules[type] || base;
}

function getDefaultChannels(type: OrgType): string[] {
  const base = ["webhook"];
  const channels: Record<OrgType, string[]> = {
    defesa_civil: ["webhook", "telegram", "email"],
    prefeitura: ["webhook", "email"],
    governo_estadual: ["webhook", "telegram", "email"],
    governo_federal: ["webhook", "telegram", "email", "sms"],
    empresa: ["webhook", "email"],
    universidade: ["email"],
    seguradora: ["webhook", "email"],
    energia: ["webhook", "telegram", "email"],
    telecom: ["webhook", "email"],
  };
  return channels[type] || base;
}

// ─── SEED DATA ─────────────────────────────────────────────

export function seedOrganizations(): void {
  if (orgs.size > 0) return;

  const defesaCivil = createOrganization({
    name: "Defesa Civil Nacional",
    type: "defesa_civil",
    country: "Brasil",
    plan: "enterprise",
  });

  const prefeitura = createOrganization({
    name: "Prefeitura de São Paulo",
    type: "prefeitura",
    country: "Brasil",
    state: "São Paulo",
    city: "São Paulo",
    plan: "pro",
  });

  createUser({ orgId: defesaCivil.id, name: "Admin DC", email: "admin@defesacivil.gov.br", role: "admin" });
  createUser({ orgId: defesaCivil.id, name: "Operador DC", email: "operador@defesacivil.gov.br", role: "operator" });
  createUser({ orgId: prefeitura.id, name: "Admin Pref", email: "admin@prefeitura.sp.gov.br", role: "admin" });
}
