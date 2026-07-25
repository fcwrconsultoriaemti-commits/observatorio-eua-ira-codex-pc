// ============================================================
// RULES ENGINE — Visual Rule Configuration
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory, GlobalAlert } from "../types";

export type ConditionOperator = "gt" | "lt" | "eq" | "gte" | "lte" | "contains" | "in" | "between";
export type ActionType = "create_mission" | "send_alert" | "send_email" | "send_telegram" | "send_webhook" | "create_incident" | "generate_report" | "update_status" | "tag_event";

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  conditionLogic: "and" | "or";
  actions: RuleAction[];
  cooldown: number; // minutes
  lastTriggered?: string;
  createdAt: string;
  createdBy: string;
  tags: string[];
}

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  category?: RiskCategory;
}

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface RuleExecution {
  ruleId: string;
  ruleName: string;
  eventId: string;
  timestamp: string;
  conditionsMet: string[];
  actionsExecuted: { type: ActionType; success: boolean; result?: string }[];
}

// ─── STORE ─────────────────────────────────────────────────

const rules: Map<string, Rule> = new Map();
const executions: RuleExecution[] = [];
let ruleCounter = 0;

// ─── RULE MANAGEMENT ───────────────────────────────────────

export function createRule(params: {
  name: string;
  description: string;
  conditions: RuleCondition[];
  conditionLogic?: "and" | "or";
  actions: RuleAction[];
  cooldown?: number;
  createdBy: string;
  priority?: number;
}): Rule {
  const id = `RULE-${Date.now()}-${++ruleCounter}`;
  const rule: Rule = {
    id,
    name: params.name,
    description: params.description,
    enabled: true,
    priority: params.priority || 0,
    conditions: params.conditions,
    conditionLogic: params.conditionLogic || "and",
    actions: params.actions,
    cooldown: params.cooldown || 30,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
    tags: [],
  };
  rules.set(id, rule);
  return rule;
}

export function getRule(id: string): Rule | undefined {
  return rules.get(id);
}

export function getAllRules(): Rule[] {
  return Array.from(rules.values()).sort((a, b) => b.priority - a.priority);
}

export function updateRule(id: string, updates: Partial<Rule>): boolean {
  const rule = rules.get(id);
  if (!rule) return false;
  Object.assign(rule, updates);
  return true;
}

export function deleteRule(id: string): boolean {
  return rules.delete(id);
}

export function toggleRule(id: string, enabled: boolean): boolean {
  const rule = rules.get(id);
  if (!rule) return false;
  rule.enabled = enabled;
  return true;
}

// ─── RULE EXECUTION ────────────────────────────────────────

export function evaluateRules(event: GlobalEvent): RuleExecution[] {
  const results: RuleExecution[] = [];
  const activeRules = Array.from(rules.values()).filter(r => r.enabled);

  for (const rule of activeRules) {
    // Check cooldown
    if (rule.lastTriggered) {
      const elapsed = (Date.now() - new Date(rule.lastTriggered).getTime()) / 60000;
      if (elapsed < rule.cooldown) continue;
    }

    // Evaluate conditions
    const metConditions = evaluateConditions(rule, event);

    const conditionsMet = rule.conditionLogic === "and"
      ? metConditions.length === rule.conditions.length
      : metConditions.length > 0;

    if (conditionsMet) {
      const execution = executeRule(rule, event, metConditions);
      results.push(execution);
      rule.lastTriggered = new Date().toISOString();
    }
  }

  return results;
}

function evaluateConditions(rule: Rule, event: GlobalEvent): string[] {
  const met: string[] = [];

  for (const condition of rule.conditions) {
    if (condition.category && condition.category !== event.module) continue;

    const fieldValue = getFieldValue(event, condition.field);
    if (fieldValue === undefined) continue;

    const result = compareValues(fieldValue, condition.operator, condition.value);
    if (result) {
      met.push(`${condition.field} ${condition.operator} ${condition.value}`);
    }
  }

  return met;
}

function getFieldValue(event: GlobalEvent, field: string): unknown {
  const parts = field.split(".");
  let current: any = event;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

function compareValues(fieldValue: unknown, operator: ConditionOperator, conditionValue: unknown): boolean {
  const field = Number(fieldValue);
  const cond = Number(conditionValue);

  switch (operator) {
    case "gt": return field > cond;
    case "lt": return field < cond;
    case "eq": return fieldValue === conditionValue;
    case "gte": return field >= cond;
    case "lte": return field <= cond;
    case "contains": return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    case "in": return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case "between":
      if (Array.isArray(conditionValue) && conditionValue.length === 2) {
        return field >= Number(conditionValue[0]) && field <= Number(conditionValue[1]);
      }
      return false;
    default: return false;
  }
}

function executeRule(rule: Rule, event: GlobalEvent, conditionsMet: string[]): RuleExecution {
  const actionsExecuted: RuleExecution["actionsExecuted"] = [];

  for (const action of rule.actions) {
    try {
      const result = performAction(action, event);
      actionsExecuted.push({ type: action.type, success: true, result });
    } catch (err) {
      actionsExecuted.push({ type: action.type, success: false, result: err instanceof Error ? err.message : String(err) });
    }
  }

  const execution: RuleExecution = {
    ruleId: rule.id,
    ruleName: rule.name,
    eventId: event.id,
    timestamp: new Date().toISOString(),
    conditionsMet,
    actionsExecuted,
  };

  executions.push(execution);
  return execution;
}

function performAction(action: RuleAction, event: GlobalEvent): string {
  switch (action.type) {
    case "create_mission":
      return `Missão criada: ${action.params.title || event.title}`;
    case "send_alert":
      return `Alerta enviado: ${event.riskLevel} - ${event.title}`;
    case "send_email":
      return `Email enviado para: ${action.params.to || "admin"}`;
    case "send_telegram":
      return `Telegram enviado para: ${action.params.chatId || "canal"}`;
    case "send_webhook":
      return `Webhook chamado: ${action.params.url || "configured"}`;
    case "create_incident":
      return `Incidente criado: ${event.title}`;
    case "generate_report":
      return `Relatório gerado: ${action.params.type || "incident"}`;
    case "update_status":
      return `Status atualizado para: ${action.params.status}`;
    case "tag_event":
      return `Tag adicionada: ${action.params.tag}`;
    default:
      return "Ação executada";
  }
}

// ─── EXECUTION HISTORY ─────────────────────────────────────

export function getExecutions(limit: number = 50): RuleExecution[] {
  return executions.slice(-limit);
}

export function getExecutionsByRule(ruleId: string): RuleExecution[] {
  return executions.filter(e => e.ruleId === ruleId);
}

// ─── PRESET RULES ──────────────────────────────────────────

export function getPresetRules(): Omit<Rule, "id" | "createdAt">[] {
  return [
    {
      name: "Terremoto Crítico",
      description: "Criar missão automaticamente para terremotos >= 7.0",
      enabled: true,
      priority: 100,
      conditions: [
        { field: "module", operator: "eq", value: "terremoto" },
        { field: "metadata.magnitude", operator: "gte", value: 7 },
      ],
      conditionLogic: "and",
      actions: [
        { type: "create_mission", params: { title: "Resposta a Terremoto Crítico", priority: "urgente" } },
        { type: "send_alert", params: { level: "emergencia" } },
      ],
      cooldown: 60,
      tags: ["terremoto", "emergência"],
    },
    {
      name: "Furacão Categoria 4+",
      description: "Alerta máximo para furacões de alta categoria",
      enabled: true,
      priority: 90,
      conditions: [
        { field: "module", operator: "eq", value: "furacao" },
        { field: "metadata.category", operator: "gte", value: 4 },
      ],
      conditionLogic: "and",
      actions: [
        { type: "send_alert", params: { level: "emergencia" } },
        { type: "send_telegram", params: { message: "URGENTE: Furacão categoria 4+ detectado" } },
      ],
      cooldown: 30,
      tags: ["furacao", "emergência"],
    },
    {
      name: "Ataque Cibernético Crítico",
      description: "Notificar equipes para ataques cibernéticos de alto impacto",
      enabled: true,
      priority: 85,
      conditions: [
        { field: "module", operator: "eq", value: "cibernetico" },
        { field: "riskLevel", operator: "in", value: ["critico", "emergencia", "extremo"] },
      ],
      conditionLogic: "and",
      actions: [
        { type: "send_alert", params: { level: "critico" } },
        { type: "send_email", params: { to: "security@org.com", subject: "Ataque Cibernético Detectado" } },
      ],
      cooldown: 15,
      tags: ["cibernetico", "segurança"],
    },
    {
      name: "Evento Geopolítico Alto Impacto",
      description: "Monitorar eventos geopolíticos com impacto econômico alto",
      enabled: true,
      priority: 70,
      conditions: [
        { field: "module", operator: "eq", value: "conflito" },
        { field: "impact.economic", operator: "gte", value: 50 },
      ],
      conditionLogic: "and",
      actions: [
        { type: "generate_report", params: { type: "geopolitical" } },
        { type: "tag_event", params: { tag: "high-impact" } },
      ],
      cooldown: 120,
      tags: ["conflito", "economia"],
    },
  ];
}

// ─── SEED ──────────────────────────────────────────────────

export function seedRules(): void {
  if (rules.size > 0) return;
  for (const preset of getPresetRules()) {
    createRule({ ...preset, createdBy: "system" });
  }
}
