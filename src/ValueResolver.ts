import { AnonymousSubscription, Observer, Subscribable } from './Subscribable';
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

export type ResolvedValue = ReadonlyArray<ItemResolvedValue>;

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

export type ValueResolver = Subscribable<ResolvedValue>;

export function getValueResolver(source: PartValue): ValueResolver {
  if (source && typeof source === 'object') {
    if ('then' in source) {
      return createSubscribable(({ next }) => {
        source.then(resolveSyncValue).then(next);
      });
    } else if ('subscribe' in source) {
      return createSubscribable(({ next, error, complete }) => {
        const observer: Observer<SyncPartValue> = {
          next(value) {
            next(resolveSyncValue(value));
          },
          error,
          complete,
        };
        return source.subscribe(observer);
      });
    }
  }

  const syncValue = resolveSyncValue(source);
  return createSubscribable(({ next, complete }) => {
    next(syncValue);
    complete();
  });
}

type SubscribeFunction<T> = (
  observer: Observer<T>,
) => AnonymousSubscription | (() => void) | null | void;

function createSubscribable<T>(
  subscribeFunction: SubscribeFunction<T>,
): Subscribable<T> {
  return {
    subscribe(nextOrObserver, error, complete) {
      let unsafeObserver: null | Partial<Observer<T>> =
        typeof nextOrObserver === 'object' && nextOrObserver
          ? nextOrObserver
          : { next: nextOrObserver, error, complete };

      const safeObserver: Observer<T> = {
        next(value) {
          if (unsafeObserver && unsafeObserver.next) {
            unsafeObserver.next(value);
          }
        },
        error(error) {
          if (unsafeObserver && unsafeObserver.error) {
            unsafeObserver.error(error);
          }
          unsafeObserver = null;
        },
        complete() {
          if (unsafeObserver && unsafeObserver.complete) {
            unsafeObserver.complete();
          }
          unsafeObserver = null;
        },
      };

      let teardown = subscribeFunction(safeObserver);

      return {
        unsubscribe() {
          unsafeObserver = null;
          if (teardown) {
            if (typeof teardown === 'function') {
              teardown();
            } else {
              teardown.unsubscribe();
            }
          }
          teardown = null;
        },
      };
    },
  };
}
