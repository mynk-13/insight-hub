import { AsyncLocalStorage } from "async_hooks";

export const workspaceStorage = new AsyncLocalStorage<string>();

export function runWithWorkspace<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
  return workspaceStorage.run(workspaceId, fn);
}

export function getCurrentWorkspaceId(): string | undefined {
  return workspaceStorage.getStore();
}
