import type { ComponentType } from 'preact';
import type { Placement } from '../dashboard/types';

/** A size a widget can be rendered in. The first entry is the default. */
export interface WidgetVariant {
  /** e.g. "3x2" */
  name: string;
  w: number;
  h: number;
  /** Optional human label, e.g. "Groß". */
  label?: string;
}

export interface WidgetRenderProps {
  placement: Placement;
  title: string;
  size: { w: number; h: number };
  /** True once the edit mode is active; widgets can show resize handles etc. */
  editing: boolean;
}

/**
 * Every widget lives in its own file and exports one of these. Adding a widget = create the file,
 * declare the variants it supports, and register it in `widgets/register.ts`.
 */
export interface WidgetDefinition {
  id: string;
  title: string;
  icon?: string;
  variants: WidgetVariant[];
  Component: ComponentType<WidgetRenderProps>;
}
