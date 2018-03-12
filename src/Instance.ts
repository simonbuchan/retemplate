import { Template } from './Template';
import { PartValue } from './TemplateResult';
import { cleanupSlot, InstanceSlot, updateSlot } from './InstanceSlot';

export interface Instance {
  readonly template: Template,
  readonly slots: ReadonlyArray<InstanceSlot>,
  readonly fragment: Node,
}

export function update(
  instance: Instance,
  values: ReadonlyArray<PartValue>,
) {
  let valueIndex = 0;
  for (const slot of instance.slots) {
    switch (slot.target.type) {
      case 'node':
      case 'attribute-value':
        updateSlot(slot, values[valueIndex]);
        valueIndex++;
        break;
      case 'attribute-template':
        // FIXME
        const endIndex = valueIndex + slot.target.strings.length - 1;
        updateSlot(slot, values.slice(valueIndex, endIndex));
        valueIndex = endIndex;
        break;
    }
  }
}

export function cleanupInstance(instance: Instance) {
  for (const slot of instance.slots) {
    cleanupSlot(slot);
  }
}
