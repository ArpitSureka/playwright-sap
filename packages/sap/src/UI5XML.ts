/**
 * Copyright (c) Arpit Sureka.
 * Orignal Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// import { createHash } from 'crypto';

import { _getElementById, cyrb53 } from '@sap/common';
import { LRUCache2 } from '@sap/utils/LRUCache';


/**
 * Caching logic in this code is a little bit complex. there are 2 types of caching cases here.
 *  1. (Simple One) use the cached xmlDom whenever there is no change in the DOM.
 *  2. Want to share elements between xmlDoms even when the dom has changed. suppose the user interacts with page lets take clicking on a dropdown.
 *     in clicking of dropdown most of the dom has not changed there has been a little change in the dom. We want to build only that part of the dom
 *     which has changed. This is difficult.
 *
 *  1st one is done inside buildUI5XmlTree function both getter and setter are present there.
 *  2nd one we are storing key of xmlDom cache in elementCache as value. this acts as a refrence to xmlDom which contains that Element cache.
 *    setter functions in elementCache are only used when there is a single element to cache. collections of multiple elements are not cached together.
 *
 *
 * Earlier versions of the cache has a depth feature but it was useless as the whole tree was getting built anyways when the selector was getting validated
 * Two elements which are part of different xmlDOMs cannot be direclty merged.
 */


const ui5XmlTreeCache = new LRUCache2<number, XMLDocument>(5);
const elementCache = new LRUCache2<number, number>(5000);


function checkIfCacheHasXMLDocument(el: Element): { key: number, doc: XMLDocument | undefined } {
  const key = cyrb53(el.outerHTML);
  const xmlDoc = ui5XmlTreeCache.get(key);
  if (xmlDoc)
    return { key, doc: xmlDoc };

  return { key, doc: undefined };
}

export function buildUI5XmlTree(rootElement: Document, win: any): XMLDocument {

  // Only Build XML Tree when complete Document is given removed support for depth.

  const xmlDocCache = checkIfCacheHasXMLDocument(rootElement.body);
  if (xmlDocCache.doc)
    return xmlDocCache.doc;

  const xmlDoc = rootElement.implementation.createDocument(null, 'UI5Tree', null);
  const topLevelNodes = _buildUI5Xml(rootElement.body, xmlDoc, win, xmlDocCache.key);
  topLevelNodes.forEach(node => xmlDoc.documentElement.appendChild(node));

  if (xmlDocCache)
    ui5XmlTreeCache.set(xmlDocCache.key, xmlDoc);

  return xmlDoc;
}


function checkIfCacheHasElement(el: Element, cacheKey: number): { key: number, el: Element[] | undefined } {

  const key = cyrb53(el.outerHTML);
  const result: { key: number, el: Element[] | undefined } = { key, el: undefined };

  if (el.id === '')
    return result;

  const xmlDoc_key = elementCache.get(key);
  if (!xmlDoc_key)
    return result;

  const xmlDoc = ui5XmlTreeCache.get(xmlDoc_key);
  if (!xmlDoc)
    return result;

  const element = xmlDoc.getElementById(el.id);
  if (!element)
    return result; // This line of code should not be reachable.

  elementCache.set(key, cacheKey); // Doing this so that LRU Cache has a newer xmlDom in its reference. Helps as the older one will get removed first.
  // So the cache will be pointing towards the newer one.

  return { key, el: [element] };
}

/**
 * Recursively traverses a DOM tree and builds an XML representation of UI5 controls.
 * This is the converted version of the original function.
 *
 * @param nodeElement The current HTML DOM Element to process.
 * @param xmlDoc The XML Document object from xmldom, used to create new XML elements.
 * @param win The window object of the target application.
 * @returns An array of XML Elements representing the processed node and its children.
 */
function _buildUI5Xml(nodeElement: Element, xmlDoc: Document, win: any, cacheKey: number): Element[] {

  const childrenXml: Element[] = [];
  let child = nodeElement.firstElementChild;

  const cachedElement = checkIfCacheHasElement(nodeElement, cacheKey);
  if (cachedElement.el)
    return cachedElement.el;

  while (child) {
    const childXmlNodes = _buildUI5Xml(child, xmlDoc, win, cacheKey);
    childrenXml.push(...childXmlNodes);
    child = child.nextElementSibling;
  }

  // I didnt understood how the code is working where id === ''. a lot of times HTML Elements dont have id then js assigns them id = ''.
  // Maybe UI5 HTML Doc will always have id of html elements. copied from UI5 inspector code there id == '' was not handled so not adding that.
  const control = _getElementById(nodeElement.id, win);

  if (nodeElement.getAttribute('data-sap-ui') && control) {
    const controlElement = xmlDoc.createElement(control.getMetadata().getName().split('.').pop() as string || '') as Element;
    controlElement.setAttribute('id', control.getId());
    controlElement.setAttribute('role', control.getMetadata().getName() || '');
    controlElement.setAttribute('type', 'sap-ui-control');

    childrenXml.forEach(childNode => appendAcrossDocuments(controlElement, childNode));

    elementCache.set(cachedElement.key, cacheKey);
    return [controlElement];

  } else if (nodeElement.getAttribute('data-sap-ui-area')) {
    const uiAreaElement = xmlDoc.createElement('data-sap-ui-area') as Element;
    uiAreaElement.setAttribute('id', nodeElement.id);
    uiAreaElement.setAttribute('role', 'sap-ui-area');
    uiAreaElement.setAttribute('type', 'data-sap-ui-area');

    if (nodeElement.id.length) // Precaution against id === '' dont want unknown behavior.
      childrenXml.forEach(childNode => appendAcrossDocuments(uiAreaElement, childNode));

    elementCache.set(cachedElement.key, cacheKey);
    return [uiAreaElement];
  }

  return childrenXml;
}

/**
 * Checks if two DOM nodes belong to different Document instances.
 * @param {Node} nodeA The first node.
 * @param {Node} nodeB The second node.
 * @returns {boolean} True if the nodes belong to different documents, otherwise false.
 */
function areFromDifferentDocuments(nodeA: Element, nodeB: Element): boolean {
  // The ownerDocument property of the document itself is null.
  // We handle this by checking against the node itself if it's a document.
  const docA = nodeA.nodeType === 9 ? nodeA : nodeA.ownerDocument;
  const docB = nodeB.nodeType === 9 ? nodeB : nodeB.ownerDocument;
  return docA !== docB;
}

/**
 * Appends a child node to a parent node, even if the child
 * belongs to a different Document instance.
 * @param {Element} parentNode The parent element in the target document.
 * @param {Element} childNode The child element from any document.
 * @returns {Node} The newly appended child node that is now part of the parent's document.
 */
function appendAcrossDocuments(parentNode: Element, childNode: Element): Element {
  const targetDoc = parentNode.ownerDocument;

  // Check if an import is even necessary.
  if (areFromDifferentDocuments(parentNode, childNode)) {
    // Import the childNode into the parent's document.
    // The 'true' argument makes it a deep clone (imports all descendants).
    const importedNode = targetDoc.importNode(childNode, true);
    return parentNode.appendChild(importedNode);
  }

  // If they are from the same document, just append directly.
  return parentNode.appendChild(childNode);
}
