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

import { xpath } from '../bundles/utilsBundleImpl';


export function getXpathById(doc: Document, id: string, returnFullXpath: boolean = false): string | null {
  const fullXpath = getFullXPathById(doc, id);
  if (returnFullXpath || !fullXpath)
    return fullXpath;

  const shortXpath = getShortestXPath(doc, fullXpath);
  if (shortXpath === fullXpath)
    return null; // This line should be reached.

  return shortXpath;
}

export function findElementsUsingXpath(doc: Document, shortxpath: string): Element[] {
  const result = xpath.select(shortxpath, doc);

  if (!Array.isArray(result))
    throw new Error('Expected node-set but got scalar: ' + result);

  const matches = result.filter((r): r is Node => typeof r !== 'string' && typeof r !== 'number' && typeof r !== 'boolean');

  return matches as Element[];
}

function getFullXPathById(doc: Document, id: string): string | null {
  const element = doc.getElementById(id);
  if (!element)
    return null;

  return getElementXPath(element);
}

function getShortestXPath(doc: Document, fullXPath: string): string {
  const node = xpath.select1(fullXPath, doc) as Node | null;
  if (!node)
    throw new Error('Node not found for full XPath');

  // Remove leading '/' and split
  const parts = fullXPath.replace(/^\/+/, '').split('/');

  for (let i = parts.length - 1; i > 0; i--) {
    const candidate = '//' + parts.slice(i).join('/');

    const matches = findElementsUsingXpath(doc, candidate);

    // If this candidate uniquely points to the same node → done
    if (matches.length === 1 && matches[0].isSameNode(node))
      return candidate;
  }

  // Fallback: return the fullXPath
  return fullXPath;
}

function getElementXPath(el: Element): string {
  if (el.nodeType !== Node.ELEMENT_NODE)
    return '';

  if (!el.parentNode || el.parentNode.nodeType === Node.DOCUMENT_NODE)
    return `/${el.nodeName}`;

  let index = 1;
  let sibling = el.previousSibling;
  while (sibling) {
    if (sibling.nodeType === Node.ELEMENT_NODE && (sibling as Element).nodeName === el.nodeName)
      index++;
    sibling = sibling.previousSibling;
  }

  return `${getElementXPath(el.parentNode as Element)}/${el.nodeName}[${index}]`;
}
