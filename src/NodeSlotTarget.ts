import { ResolvedValue } from './ValueResolver';

export interface NodeSlotTarget {
  readonly type: 'node';
  readonly startNode: Node;
  readonly endNode: Node;
}

export function nodeApplyValues(part: NodeSlotTarget, resolved: ResolvedValue) {
  let node = part.startNode.nextSibling!;
  const endNode = part.endNode;
  const container = node.parentNode!;

  for (let i = 0; i !== resolved.length; i++) {
    const newItem = resolved[i];
    const oldNode = node === endNode ? null : node;
    if (oldNode) {
      node = node.nextSibling!;
    }

    let newNode;
    switch (newItem.type) {
      default:
        newNode = null;
        break;
      case 'text':
        if (oldNode && oldNode.nodeType === Node.TEXT_NODE) {
          oldNode.textContent = newItem.text;
          newNode = oldNode;
        } else {
          newNode = document.createTextNode(newItem.text);
        }
        break;
      case 'node':
        newNode = newItem.node;
        break;
      case 'template': {
        newNode = newItem.instance!.fragment;
        break;
      }
    }

    if (oldNode !== newNode) {
      if (oldNode) {
        if (newNode) {
          container.replaceChild(newNode, oldNode);
        } else {
          container.removeChild(oldNode);
        }
      } else {
        if (newNode) {
          container.insertBefore(newNode, node);
        }
      }
    }
  }

  // Remove remaining
  while (node !== endNode) {
    const n = node.nextSibling!;
    container.removeChild(node);
    node = n;
  }
}
//
// function setText(
//   part: NodeSlotTarget,
//   value: string,
//   asyncValue: AsyncPartValue | null,
// ) {
//   const node = part.startNode.nextSibling!;
//   if (
//     node === part.endNode.previousSibling &&
//     node.nodeType === Node.TEXT_NODE
//   ) {
//     // If we only have a single text node between the markers, we can just
//     // set its value, rather than replacing it.
//     // TODO(justinfagnani): Can we just check if _previousValue is
//     // primitive?
//     node.textContent = value;
//   } else {
//     setNode(part, document.createTextNode(value), asyncValue);
//   }
//   updatePartValue(part.slot, value, asyncValue);
// }
//
// function setNode(
//   part: NodeSlotTarget,
//   value: Node,
//   asyncValue: AsyncPartValue | null,
// ) {
//   clear(part);
//   insert(part, value);
//   updatePartValue(part.slot, value, asyncValue);
// }
//
// function setTemplateResult(
//   part: NodeSlotTarget,
//   value: TemplateResult,
//   asyncValue: AsyncPartValue | null,
// ) {
//   const template = getTemplateForResult(value);
//   let instance: Instance;
//   if (
//     part.slot.rendered &&
//     'template' in part.slot.rendered &&
//     part.slot.rendered.template === template
//   ) {
//     instance = part.slot.rendered;
//   } else {
//     instance = createInstance(template);
//     setNode(part, instance.fragment, asyncValue);
//     updatePartValueWithInstance(part.slot, value, asyncValue, instance);
//   }
//   update(instance, value.values);
// }
//
// function setIterable(
//   part: NodeSlotTarget,
//   value: ArrayPartValue | IterablePartValue,
//   asyncValue: AsyncPartValue | null,
// ) {
//   // For an Iterable, we create a new InstancePart per item, then set its
//   // value to the item. This is a little bit of overhead for every item in
//   // an Iterable, but it lets us recurse easily and efficiently update Arrays
//   // of TemplateResults that will be commonly returned from expressions like:
//   // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
//
//   // If _previousValue is an array, then the previous render was of an
//   // iterable and _previousValue will contain the NodeParts from the previous
//   // render. If _previousValue is not an array, clear this part and make a new
//   // array for NodeParts.
//   if (!part.slot.nodeParts) {
//     clear(part);
//   }
//
//   const itemParts = updatePartValueForIterable(part.slot, value, asyncValue);
//
//   // Lets us keep track of how many items we stamped so we can clear leftover
//   // items from a previous render
//   let partIndex = 0;
//
//   for (const item of value) {
//     // Try to reuse an existing part
//     let itemPart = itemParts[partIndex];
//
//     // If no existing part, create a new one
//     if (!itemPart) {
//       // If we're creating the first item part, it's startNode should be the
//       // container's startNode
//       let itemStart = part.startNode;
//
//       // If we're not creating the first part, create a new separator marker
//       // node, and fix up the previous part's endNode to point to it
//       if (partIndex > 0) {
//         const previousPart = itemParts[partIndex - 1];
//         itemStart = previousPart.endNode = document.createTextNode('');
//         insert(part, itemStart);
//       }
//       itemPart = {
//         type: 'node',
//         template: part.template,
//         startNode: itemStart,
//         endNode: part.endNode,
//         valueInstance: createValueSlot(),
//       };
//       itemParts.push(itemPart);
//     }
//     updateSlot(itemPart, item);
//     partIndex++;
//   }
//
//   if (partIndex === 0) {
//     clear(part);
//   } else if (partIndex < itemParts.length) {
//     const lastPart = itemParts[partIndex - 1];
//     // Truncate the slots array so _previousValue reflects the current state
//     itemParts.length = partIndex;
//     clear(part, lastPart.endNode.previousSibling!);
//     lastPart.endNode = part.endNode;
//   }
// }
//
// function setPromise(part: NodeSlotTarget, value: PromiseLike<SyncPartValue>) {
//   updatePartValueForAsync(part.slot, value);
//   value.then(syncValue => {
//     if (part.slot.value === value) {
//       updateSlot(part, syncValue, value);
//     }
//   });
// }
//
// function setObservable(part: NodeSlotTarget, value: Subscribable<SyncPartValue>) {
//   updatePartValueForAsync(part.slot, value);
//   part.slot.cleanup = value.subscribe(syncValue => {
//     updateSlot(part, syncValue, value);
//   });
// }
//
// function insert(part: NodeSlotTarget, node: Node) {
//   part.endNode.parentNode!.insertBefore(node, part.endNode);
// }
//
// function clear(part: NodeSlotTarget, startNode: Node = part.startNode) {
//   removeNodes(part.startNode.parentNode!, startNode.nextSibling!, part.endNode);
// }
//
// function removeNodes(
//   container: Node,
//   startNode: Node | null,
//   endNode: Node | null = null,
// ): void {
//   let node = startNode;
//   while (node !== endNode) {
//     const n = node!.nextSibling;
//     container.removeChild(node!);
//     node = n;
//   }
// }
