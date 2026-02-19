const AUDIT_RETENTION_DAYS = 180;

type AuditActorRole = "COMPANY" | "ADMIN" | "EMPLOYEE";
type AuditAction = "CREATE" | "UPDATE" | "DELETE";
type AuditEntityType = "CARD" | "TRANSACTION" | "TIER" | "PROMOTION";

type SessionUserLike = {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
};

type SerializableObject = Record<string, unknown>;

type WriteAuditLogInput = {
  companyId: string;
  actorId: string;
  actorRole: AuditActorRole;
  actorName?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel?: string | null;
  summary: string;
  changes?: SerializableObject | null;
};

function toSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pickAllowedFields(
  source: Record<string, unknown> | null | undefined,
  allowedFields: string[]
): Record<string, unknown> | null {
  if (!source) return null;
  const out: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      out[field] = source[field];
    }
  }

  return out;
}

export function buildAuditActor(sessionUser: SessionUserLike) {
  const role = sessionUser?.role;
  const actorRole: AuditActorRole =
    role === "COMPANY" || role === "ADMIN" || role === "EMPLOYEE" ? role : "EMPLOYEE";

  return {
    actorId: sessionUser?.id || "unknown",
    actorRole,
    actorName: sessionUser?.name ?? null,
    actorEmail: sessionUser?.email ?? null,
  };
}

export function buildChanges(
  beforeRaw: Record<string, unknown> | null,
  afterRaw: Record<string, unknown> | null,
  allowedFields: string[]
): SerializableObject | null {
  const before = pickAllowedFields(beforeRaw, allowedFields);
  const after = pickAllowedFields(afterRaw, allowedFields);

  if (before && after) {
    const changedFields = allowedFields.filter((field) => {
      return JSON.stringify(before[field]) !== JSON.stringify(after[field]);
    });

    return toSerializable({ before, after, changedFields });
  }

  if (after) {
    return toSerializable({ after });
  }

  if (before) {
    return toSerializable({ before });
  }

  return null;
}

export async function writeAuditLog(tx: any, input: WriteAuditLogInput) {
  await tx.auditLog.create({
    data: {
      companyId: input.companyId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorName: input.actorName ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary,
      changes: input.changes ?? undefined,
    },
  });
}

export async function enforceAuditRetention(tx: any, companyId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUDIT_RETENTION_DAYS);

  await tx.auditLog.deleteMany({
    where: {
      companyId,
      createdAt: {
        lt: cutoff,
      },
    },
  });
}
