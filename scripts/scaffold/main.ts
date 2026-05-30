import { parseCli } from './cli';
import { planCreateApp } from './app-plan';
import { planCreateModule } from './module-plan';
import { applyPlan, printPlan, validatePlan } from './fs-plan';

export async function main(): Promise<void> {
  const cli = await parseCli();
  const plan = cli.command === 'create-module' ? planCreateModule(cli) : planCreateApp(cli);
  validatePlan(plan);
  printPlan(plan, cli.json);

  if (!cli.dryRun) {
    applyPlan(plan);
    if (!cli.json) {
      console.log('[scaffold] Done. Run npm run prebuild:checks before committing.');
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
