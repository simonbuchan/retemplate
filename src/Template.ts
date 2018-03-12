import {
  AttributeTemplateSlotTarget,
  AttributeValueSlotTarget,
} from './AttributeSlotTarget';
import { Instance } from './Instance';
import { InstanceSlot } from './InstanceSlot';
import { NodeSlotTarget } from './NodeSlotTarget';
import { TemplateResult } from './TemplateResult';

export interface TemplateAttributePart {
  readonly type: 'attribute';
  readonly index: number;
  readonly name: string;
  readonly rawName: string;
  readonly strings: ReadonlyArray<string>;
}

export interface TemplateNodePart {
  readonly type: 'node';
  readonly index: number;
}

export type TemplateSlot = TemplateAttributePart | TemplateNodePart;

let lastTemplateId = 0;

export interface Template {
  readonly id: number;
  readonly element: HTMLTemplateElement;
  readonly slots: ReadonlyArray<TemplateSlot>;
}

type TemplateCache = Map<TemplateStringsArray, Template>;
const templateCaches = new Map<TemplateResult['type'], TemplateCache>();

export function getTemplateForResult(result: TemplateResult) {
  let templateCache = templateCaches.get(result.type);
  if (!templateCache) {
    templateCache = new Map();
    templateCaches.set(result.type, templateCache);
  }
  let template = templateCache.get(result.strings);
  if (!template) {
    template = createTemplate(result);
    templateCache.set(result.strings, template);
  }
  return template;
}

/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;

/**
 * An expression marker used text-posisitions, not attribute positions,
 * in template.
 */
const nodeMarker = `<!--${marker}-->`;

const markerRegex = new RegExp(`${marker}|${nodeMarker}`);

/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#attributes-0
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-character
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = /[ \x09\x0a\x0c\x0d]([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)[ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*)$/;

/**
 * Finds the closing index of the last closed HTML tag.
 * This has 3 possible return values:
 *   - `-1`, meaning there is no tag in str.
 *   - `string.length`, meaning the last opened tag is unclosed.
 *   - Some positive number < str.length, meaning the index of the closing '>'.
 */
function findTagClose(str: string): number {
  const close = str.lastIndexOf('>');
  const open = str.indexOf('<', close + 1);
  return open > -1 ? str.length : close;
}

const whatToShow =
  NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT;

function createTemplate(result: TemplateResult): Template {
  const id = ++lastTemplateId;
  const element = document.createElement('template');

  const l = result.strings.length - 1;
  let html = '';
  let isTextBinding = true;
  for (let i = 0; i < l; i++) {
    const s = result.strings[i];
    html += s;
    // We're in a text position if the previous string closed its tags.
    // If it doesn't have any tags, then we use the previous text position
    // state.
    const closing = findTagClose(s);
    isTextBinding = closing > -1 ? closing < s.length : isTextBinding;
    html += isTextBinding ? nodeMarker : marker;
  }
  html += result.strings[l];

  element.innerHTML = html;

  const { content } = element;

  const parts: TemplateSlot[] = [];

  // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
  const walker = document.createTreeWalker(
    content,
    whatToShow,
    null as any,
    false,
  );

  let index = -1;
  let partIndex = 0;
  const nodesToRemove: Node[] = [];

  // The actual previous node, accounting for removals: if a node is removed
  // it will never be the previousNode.
  let previousNode: Node | undefined;
  // Used to set previousNode at the top of the loop.
  let currentNode: Node | undefined;

  while (walker.nextNode()) {
    index++;
    previousNode = currentNode;
    const node = (currentNode = walker.currentNode as Element);
    if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
      if (!node.hasAttributes()) {
        continue;
      }
      const attributes = node.attributes;
      // Per https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
      // attributes are not guaranteed to be returned in document order. In
      // particular, Edge/IE can return them out of order, so we cannot assume
      // a correspondance between part index and attribute index.
      let count = 0;
      for (let i = 0; i < attributes.length; i++) {
        if (attributes[i].value.indexOf(marker) >= 0) {
          count++;
        }
      }
      while (count-- > 0) {
        // Get the template literal section leading up to the first
        // expression in this attribute attribute
        const stringForPart = result.strings[partIndex];
        // Find the attribute name
        const attributeNameInPart = lastAttributeNameRegex.exec(
          stringForPart,
        )![1];
        // Find the corresponding attribute
        const attribute = attributes.getNamedItem(attributeNameInPart);
        const stringsForAttributeValue = attribute.value.split(markerRegex);
        parts.push({
          type: 'attribute',
          index,
          name: attribute.name,
          rawName: attributeNameInPart,
          strings: stringsForAttributeValue,
        });
        node.removeAttribute(attribute.name);
        partIndex += stringsForAttributeValue.length - 1;
      }
    } else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
      const nodeValue = node.nodeValue!;
      if (nodeValue.indexOf(marker) < 0) {
        continue;
      }

      const parent = node.parentNode!;
      const strings = nodeValue.split(markerRegex);
      const lastIndex = strings.length - 1;

      // We have a part for each match found
      partIndex += lastIndex;

      // We keep this current node, but reset its content to the last
      // literal part. We insert new literal nodes before this so that the
      // tree walker keeps its position correctly.
      node.textContent = strings[lastIndex];

      // Generate a new text node for each literal section
      // These nodes are also used as the markers for node slots
      for (let i = 0; i < lastIndex; i++) {
        parent.insertBefore(document.createTextNode(strings[i]), node);
        parts.push({ type: 'node', index: index++ });
      }
    } else if (
      node.nodeType === 8 /* Node.COMMENT_NODE */ &&
      node.nodeValue === marker
    ) {
      const parent = node.parentNode!;
      // Add a new marker node to be the startNode of the Part if any of the
      // following are true:
      //  * We don't have a previousSibling
      //  * previousSibling is being removed (thus it's not the
      //    `previousNode`)
      //  * previousSibling is not a Text node
      //
      // TODO(justinfagnani): We should be able to use the previousNode here
      // as the marker node and reduce the number of extra nodes we add to a
      // template. See https://github.com/PolymerLabs/lit-html/issues/147
      const previousSibling = node.previousSibling;
      if (
        previousSibling === null ||
        previousSibling !== previousNode ||
        previousSibling.nodeType !== Node.TEXT_NODE
      ) {
        parent.insertBefore(document.createTextNode(''), node);
      } else {
        index--;
      }
      parts.push({ type: 'node', index: index++ });
      nodesToRemove.push(node);
      // If we don't have a nextSibling add a marker node.
      // We don't have to check if the next node is going to be removed,
      // because that node will induce a new marker if so.
      if (node.nextSibling === null) {
        parent.insertBefore(document.createTextNode(''), node);
      } else {
        index--;
      }
      currentNode = previousNode;
      partIndex++;
    }
  }

  // Remove text binding nodes after the walk to not disturb the TreeWalker
  for (const n of nodesToRemove) {
    n.parentNode!.removeChild(n);
  }

  return { id, element, slots: parts };
}

export function createInstance(template: Template): Instance {
  const fragment = document.importNode(template.element.content, true);
  const instanceSlots: InstanceSlot[] = [];
  const templateSlots = template.slots;

  if (templateSlots.length > 0) {
    // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
    // null
    const walker = document.createTreeWalker(
      fragment,
      whatToShow,
      null as any,
      false,
    );

    let index = -1;
    for (let i = 0; i < templateSlots.length; i++) {
      const part = templateSlots[i];
      while (index < part.index) {
        index++;
        walker.nextNode();
      }

      instanceSlots.push({
        template,
        index: i,
        target: createSlotTarget(template, part, walker.currentNode),
        value: undefined,
        subscription: null,
        resolved: [],
      });
    }
  }

  return { template, slots: instanceSlots, fragment };
}

function createSlotTarget(
  template: Template,
  templateSlot: TemplateSlot,
  node: Node,
): NodeSlotTarget | AttributeValueSlotTarget | AttributeTemplateSlotTarget {
  if (templateSlot.type === 'attribute') {
    // An expression that occupies the whole attribute slot will leave
    // leading and trailing empty strings.
    if (
      templateSlot.strings.length === 2 &&
      templateSlot.strings[0] === '' &&
      templateSlot.strings[1] === ''
    ) {
      return {
        type: 'attribute-value',
        element: node as Element,
        name: templateSlot.name,
      };
    }

    return {
      type: 'attribute-template',
      element: node as Element,
      name: templateSlot.name,
      strings: templateSlot.strings,
    };
  } else if (templateSlot.type === 'node') {
    return {
      type: 'node',
      startNode: node,
      endNode: node.nextSibling!,
    };
  }
  throw new Error(`Unknown part type ${(templateSlot as any).type}`);
}
