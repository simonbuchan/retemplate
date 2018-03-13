import {
  attributeTemplateApplyValues,
  AttributeTemplateSlotTarget,
  attributeValueApplyValues,
  AttributeValueSlotTarget,
} from './AttributeSlotTarget';
import { cleanupInstance, update } from './Instance';
import { nodeApplyValues, NodeSlotTarget } from './NodeSlotTarget';
import { AnonymousSubscription } from './Subscribable';
import { createInstance, Template } from './Template';
import { PartValue } from './TemplateResult';
import { getValueResolver, resolvedEmpty, ResolvedValue } from './ValueResolver';

export interface InstanceSlot {
  readonly template: Template;
  readonly index: number;
  readonly target:
    | NodeSlotTarget
    | AttributeValueSlotTarget
    | AttributeTemplateSlotTarget;
  value: PartValue;
  subscription: null | AnonymousSubscription;
  resolved: ResolvedValue;
}

export function updateSlot(slot: InstanceSlot, value: PartValue) {
  console.log('updateSlot', slot.template.id, slot.index, value);
  // If the value didn't change, do nothing
  if (slot.value === value) {
    return;
  }
  cleanupSlot(slot);
  slot.value = value;
  slot.subscription = getValueResolver(value).subscribe(resolved => {
    const oldResolved = slot.resolved;
    slot.resolved = resolved;

    for (let i = 0; i !== resolved.length; i++) {
      const newItem = resolved[i];
      if (newItem.type === 'template') {
        const oldItem = oldResolved[i] || resolvedEmpty;
        if (
          oldItem.type === 'template' &&
          newItem.template === oldItem.template
        ) {
          newItem.instance = oldItem.instance!;
          oldItem.instance = null;
        } else {
          newItem.instance = createInstance(newItem.template);
        }
      }
    }

    switch (slot.target.type) {
      case 'node':
        nodeApplyValues(slot.target, resolved);
        break;
      case 'attribute-value':
        attributeValueApplyValues(slot.target, resolved);
        break;
      case 'attribute-template':
        attributeTemplateApplyValues(slot.target, resolved);
        break;
    }

    for (const newItem of resolved) {
      if (newItem.type === 'template') {
        update(newItem.instance!, newItem.result.values);
      }
    }

    for (const oldItem of oldResolved) {
      if (oldItem.type === 'template' && oldItem.instance) {
        cleanupInstance(oldItem.instance);
      }
    }
  });
}

export function cleanupSlot(slot: InstanceSlot) {
  if (slot.subscription) {
    slot.subscription.unsubscribe();
    slot.subscription = null;
  }
  slot.value = undefined;
  const oldResolved = slot.resolved;
  slot.resolved = [];

  for (const oldItem of oldResolved) {
    if (oldItem.type === 'template' && oldItem.instance) {
      cleanupInstance(oldItem.instance);
    }
  }
}
