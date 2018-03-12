import { ItemResolvedValue, ResolvedText } from './ResolvedValue';

export interface AttributeValueSlotTarget {
  readonly type: 'attribute-value';
  readonly element: Element;
  readonly name: string;
}

export function attributeValueApplyValues(
  slotTarget: AttributeValueSlotTarget,
  resolved: ItemResolvedValue[],
) {
  const attributeValue = resolved
    .filter(item => item.type === 'text')
    .map(item => (item as ResolvedText).text)
    .join('');
  slotTarget.element.setAttribute(slotTarget.name, attributeValue);
}

export interface AttributeTemplateSlotTarget {
  readonly type: 'attribute-template';
  readonly element: Element;
  readonly name: string;
  readonly strings: ReadonlyArray<string>;
}

export function attributeTemplateApplyValues(
  slotTarget: AttributeTemplateSlotTarget,
  resolved: ItemResolvedValue[],
) {
  const size = slotTarget.strings.length - 1;
  const strings = [];

  for (let i = 0; i < size; i++) {
    strings.push(slotTarget.strings[i]);
    const value = resolved[i];
    if (value.type === 'text') {
      strings.push(value.text);
    }
  }
  strings.push(slotTarget.strings[size]);
  const attributeValue = strings.join('');
  slotTarget.element.setAttribute(slotTarget.name, attributeValue);
}
