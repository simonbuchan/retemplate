import { createInstance, getTemplateForResult } from './Template';
import { cleanupInstance, Instance, update } from './Instance';
import { TemplateResult } from './TemplateResult';

export const containerKey = '__templateInstance';

export default function render(
  result: TemplateResult,
  container: Element | DocumentFragment,
) {
  const template = getTemplateForResult(result);

  let instance: undefined | Instance = (container as any)[containerKey];
  if (instance && instance.template === template) {
    update(instance, result.values);
  } else {
    if (instance) {
      cleanupInstance(instance);
    }
    instance = createInstance(template);
    (container as any)[containerKey] = instance;

    update(instance, result.values);

    container.appendChild(instance.fragment);
  }
}

function removeNodes(
  container: Node,
  startNode: Node | null,
  endNode: Node | null = null,
): void {
  let node = startNode;
  while (node !== endNode) {
    const n = node!.nextSibling;
    container.removeChild(node!);
    node = n;
  }
}
