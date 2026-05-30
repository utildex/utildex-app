import * as fs from 'fs';
import * as path from 'path';
import { absolute } from './constants';
import type { PlanOperation, PublicPlanOperation, ScaffoldPlan } from './types';

export function publicOperations(plan: ScaffoldPlan): PublicPlanOperation[] {
  return plan.operations.map((operation) => ({
    action: operation.action,
    filePath: operation.filePath,
    description: operation.description,
  }));
}

export function printPlan(plan: ScaffoldPlan, json: boolean): void {
  if (json) {
    console.log(
      JSON.stringify(
        {
          command: plan.command,
          dryRun: plan.dryRun,
          operations: publicOperations(plan),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`[scaffold] ${plan.dryRun ? 'Dry run' : 'Applying'} ${plan.command}`);
  for (const operation of plan.operations) {
    console.log(
      `  ${operation.action.toUpperCase()} ${operation.filePath} - ${operation.description}`,
    );
  }
}

export function readText(filePath: string): string {
  return fs.readFileSync(absolute(filePath), 'utf-8');
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(absolute(filePath));
}

export function createOperation(
  filePath: string,
  description: string,
  content: string,
): PlanOperation {
  if (fileExists(filePath)) {
    throw new Error(`[scaffold] Refusing to overwrite existing file: ${filePath}`);
  }
  return { action: 'create', filePath, description, content };
}

export function updateOperation(
  filePath: string,
  description: string,
  content: string,
): PlanOperation {
  if (!fileExists(filePath)) {
    throw new Error(`[scaffold] Cannot update missing file: ${filePath}`);
  }
  if (readText(filePath) === content) {
    throw new Error(`[scaffold] Planned update would not change ${filePath}.`);
  }
  return { action: 'update', filePath, description, content };
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

export function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function validatePlan(plan: ScaffoldPlan): void {
  const seen = new Set<string>();
  for (const operation of plan.operations) {
    if (seen.has(operation.filePath)) {
      throw new Error(`[scaffold] Duplicate planned operation for ${operation.filePath}.`);
    }
    seen.add(operation.filePath);
  }
}

export function applyPlan(plan: ScaffoldPlan): void {
  const backups = new Map<string, string | null>();

  try {
    for (const operation of plan.operations) {
      const target = absolute(operation.filePath);
      backups.set(
        operation.filePath,
        fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : null,
      );
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, operation.content);
    }
  } catch (error) {
    for (const [filePath, original] of [...backups.entries()].reverse()) {
      const target = absolute(filePath);
      if (original === null) {
        fs.rmSync(target, { force: true });
      } else {
        fs.writeFileSync(target, original);
      }
    }
    throw error;
  }
}
