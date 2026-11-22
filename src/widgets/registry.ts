import type { WidgetDefinition } from './types';

const registry = new Map<string, WidgetDefinition>();

/** Register (or replace) a widget definition. Re-registering is allowed for hot reloads. */
export function registerWidget(definition: WidgetDefinition): void {
  registry.set(definition.id, definition);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return registry.get(id);
}

export function listWidgets(): WidgetDefinition[] {
  return [...registry.values()];
}
