import { isDeepStrictEqual } from 'node:util';

export interface ManagedField {
  path: string[];
  value: unknown;
}

export function reconcileManagedFields(config: Record<string, unknown>, previous: ManagedField[], desired: ManagedField[]): void {
  const desiredKeys = new Set(desired.map((field) => pathKey(field.path)));
  for (const field of previous) {
    if (desiredKeys.has(pathKey(field.path))) {
      continue;
    }
    const current = getPath(config, field.path);
    if (current.exists && isDeepStrictEqual(current.value, field.value)) {
      deletePath(config, field.path);
    }
  }
  for (const field of desired) {
    setPath(config, field.path, field.value);
  }
}

export function displayPath(path: string[]): string {
  return path.map((segment) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(segment) ? segment : JSON.stringify(segment)).join('.');
}

export function currentManagedPaths(config: Record<string, unknown>, fields: ManagedField[]): string[] {
  return fields.flatMap((field) => {
    const current = getPath(config, field.path);
    return current.exists && isDeepStrictEqual(current.value, field.value) ? [displayPath(field.path)] : [];
  });
}

function pathKey(path: string[]): string {
  return JSON.stringify(path);
}

function getPath(config: Record<string, unknown>, path: string[]): { exists: boolean; value?: unknown } {
  let current: unknown = config;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)
      || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { exists: false };
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return { exists: true, value: current };
}

function setPath(config: Record<string, unknown>, path: string[], value: unknown): void {
  if (!path.length) {
    return;
  }
  let current = config;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const child = current[segment];
    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }
  current[path[path.length - 1]] = cloneValue(value);
}

function deletePath(config: Record<string, unknown>, path: string[]): void {
  if (!path.length) {
    return;
  }
  const parents: Array<{ parent: Record<string, unknown>; key: string }> = [];
  let current = config;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index];
    const child = current[segment];
    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      return;
    }
    parents.push({ parent: current, key: segment });
    current = child as Record<string, unknown>;
  }
  delete current[path[path.length - 1]];
  for (let index = parents.length - 1; index >= 0; index -= 1) {
    const { parent, key } = parents[index];
    const child = parent[key];
    if (child && typeof child === 'object' && !Array.isArray(child) && Object.keys(child).length === 0) {
      delete parent[key];
    } else {
      break;
    }
  }
}

function cloneValue(value: unknown): unknown {
  if (value === undefined || value === null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as unknown;
}
