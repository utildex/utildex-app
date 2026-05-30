import type { AppId, ModuleKind } from '../../src/core/app-catalog';

export type ScaffoldCommand = 'create-module' | 'create-app';
export type PlanAction = 'create' | 'update';

export interface CliOptions {
  command: ScaffoldCommand;
  flags: Map<string, string | boolean>;
  dryRun: boolean;
  json: boolean;
}

export interface PlanOperation {
  action: PlanAction;
  filePath: string;
  description: string;
  content: string;
}

export interface PublicPlanOperation {
  action: PlanAction;
  filePath: string;
  description: string;
}

export interface ScaffoldPlan {
  command: ScaffoldCommand;
  dryRun: boolean;
  operations: PlanOperation[];
}

export interface ModuleScaffoldOptions {
  appId: AppId;
  id: string;
  kind: ModuleKind;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  tags: string[];
  contentRoot: string;
}

export interface AppScaffoldOptions {
  id: string;
  name: string;
  kind: ModuleKind;
  route: string;
  port: number;
  publicBaseUrl: string;
  githubUrl: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  contentRoot: string;
}

export interface PackageJsonLike {
  scripts?: Record<string, string>;
}

export interface TsConfigLike {
  files?: string[];
}
