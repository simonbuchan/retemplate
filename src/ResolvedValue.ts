import { Observable } from 'rxjs';
import { getTemplateForResult, Template } from './Template';
import { Instance } from './Instance';
import {
  ArrayPartValue,
  ItemPartValue,
  IterablePartValue,
  PartValue,
  SyncPartValue,
  TemplateResult,
} from './TemplateResult';

export interface ResolvedEmpty {
  readonly type: 'empty';
}

export interface ResolvedText {
  readonly type: 'text';
  readonly text: string;
}

export interface ResolvedNode {
  readonly type: 'node';
  readonly node: Node;
}

export interface ResolvedTemplate {
  readonly type: 'template';
  readonly result: TemplateResult;
  readonly template: Template;
  instance: null | Instance;
}

export type ItemResolvedValue =
  | ResolvedEmpty
  | ResolvedText
  | ResolvedNode
  | ResolvedTemplate;

export const resolvedEmpty: ResolvedEmpty = { type: 'empty' };

export function resolveItemValue(source: ItemPartValue): ItemResolvedValue {
  if (typeof source === 'undefined') {
    return resolvedEmpty;
  } else if (typeof source === 'boolean') {
    if (source === false) {
      return resolvedEmpty;
    }
  } else if (typeof source === 'number') {
    return { type: 'text', text: String(source) };
  } else if (typeof source === 'string') {
    return { type: 'text', text: source };
  } else if (typeof source === 'object') {
    if (source === null) {
      return resolvedEmpty;
    }
    if ('type' in source) {
      return {
        type: 'template',
        result: source,
        template: getTemplateForResult(source),
        instance: null,
      };
    }
    if (source instanceof Node) {
      return { type: 'node', node: source };
    }
  }
  throw new Error(`Invalid template value: ${source}`);
}

function isIterableValue(
  value: SyncPartValue,
): value is ArrayPartValue | IterablePartValue {
  return !!value && typeof value === 'object' && Symbol.iterator in value;
}

export function resolveSyncValue(
  source: SyncPartValue,
  result: ItemResolvedValue[] = [],
): ItemResolvedValue[] {
  if (isIterableValue(source)) {
    for (const item of source) {
      resolveSyncValue(item, result);
    }
  } else {
    result.push(resolveItemValue(source));
  }
  return result;
}

export function resolveValue(
  source: PartValue,
): Observable<ItemResolvedValue[]> {
  if (source && typeof source === 'object') {
    if ('then' in source || 'subscribe' in source) {
      return Observable.from(source).map(syncValue =>
        resolveSyncValue(syncValue),
      );
    }
  }
  return Observable.of(resolveSyncValue(source));
}