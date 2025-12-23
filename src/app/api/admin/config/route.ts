import { NextResponse } from 'next/server';
import { ADMIN_CONFIG_FIELDS } from '@/lib/adminConfig';
import { deleteAppConfig, getAllAppConfig, setAppConfig } from '@/lib/config';
import { requireAdmin } from '@/middleware/adminAuth';

const readEnvValue = (key: string) => {
  const value = process.env[key];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isValidNumberValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (['unlimited', 'infinity', 'inf', '-1'].includes(normalized)) return true;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0;
};

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stored = await getAllAppConfig();

  const config = ADMIN_CONFIG_FIELDS.map((field) => {
    const dbValue = stored.get(field.key) ?? null;
    const envValue = readEnvValue(field.key);
    const value = dbValue ?? envValue ?? field.defaultValue;
    const source = dbValue ? 'db' : envValue ? 'env' : 'default';

    return {
      ...field,
      value,
      source,
    };
  });

  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updates = Array.isArray(body?.updates) ? body.updates : [];

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const allowed = new Map(ADMIN_CONFIG_FIELDS.map((field) => [field.key, field]));

  for (const update of updates) {
    const key = typeof update?.key === 'string' ? update.key : '';
    const field = allowed.get(key);
    if (!field) {
      return NextResponse.json({ error: `Unsupported key: ${key}` }, { status: 400 });
    }
    if (typeof update?.value !== 'string') {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
    }
    if (field.dataType === 'number' && !isValidNumberValue(update.value)) {
      return NextResponse.json({ error: `Invalid numeric value for ${key}` }, { status: 400 });
    }
  }

  await Promise.all(
    updates.map(async (update: { key: string; value: string }) => {
      const field = allowed.get(update.key);
      if (!field) return;
      const trimmedValue = update.value.trim();

      if (!trimmedValue) {
        await deleteAppConfig({ key: update.key, updatedBy: session.user.id });
        return;
      }

      await setAppConfig({
        key: update.key,
        value: trimmedValue,
        updatedBy: session.user.id,
        dataType: field.dataType,
      });
    })
  );

  return NextResponse.json({ success: true });
}
