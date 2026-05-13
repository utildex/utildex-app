import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';

export async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function createRouteSnapshot(
  params: Record<string, string> = {},
  firstChild: ActivatedRouteSnapshot | null = null,
): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(params),
    firstChild,
  } as ActivatedRouteSnapshot;
}
