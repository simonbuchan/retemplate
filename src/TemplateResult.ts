import { Subscribable } from './Subscribable';

export type PrimitivePartValue = undefined | null | false | number | string;
export type ItemPartValue = PrimitivePartValue | TemplateResult | Node;
export type SyncPartValue = ItemPartValue | ArrayPartValue | IterablePartValue;

export interface ArrayPartValue extends ReadonlyArray<SyncPartValue> {}
export interface IterablePartValue extends Iterable<SyncPartValue> {}

export type AsyncPartValue =
  | PromiseLike<SyncPartValue>
  | Subscribable<SyncPartValue>;

export type PartValue = SyncPartValue | AsyncPartValue;

export function isPrimitivePartValue(
  value: PartValue,
): value is PrimitivePartValue {
  return (
    value === null ||
    !(typeof value === 'object' || typeof value === 'function')
  );
}

export function isArrayOrIterablePartValue(
  value: PartValue,
): value is ArrayPartValue | IterablePartValue {
  return Array.isArray(value) || (value && typeof value === 'object')
    ? Symbol.iterator in value
    : false;
}

export interface TemplateResult {
  strings: TemplateStringsArray;
  values: ReadonlyArray<PartValue>;
  type: 'html';
}

export function html(
  strings: TemplateStringsArray,
  ...values: PartValue[]
): TemplateResult {
  return { strings, values, type: 'html' };
}
