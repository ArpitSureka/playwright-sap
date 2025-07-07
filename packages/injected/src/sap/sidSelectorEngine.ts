/**
 * Copyright (c) Arpit Sureka.
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

import { SelectorEngine, SelectorRoot } from '@injected/selectorEngine';

export const SIDSelectorEngine: SelectorEngine = {
  queryAll(root: SelectorRoot, selector: string): Element[] {
    const document = root.ownerDocument || root;
    if (!document)
      return [];
    return _getAllNodesContainingLSdata(document, selector);
  }
};

function _getAllNodesContainingLSdata(document: Document, sid: string): Element[] {
  const lsdataNodes = document.querySelectorAll('[lsdata]');
  const elementsFound: Element[] = [];
  for (const lsdataNode of lsdataNodes){
    try {
      const lsData = getElementIfValidLsDataWithSid(lsdataNode);
      if (lsData && lsData.SID === sid)
        elementsFound.push(lsData.element);
    } catch (error) {
    }
  }
  return elementsFound;
}

export function getElementIfValidLsDataWithSid(element: Element): {SID: string, element: Element} | null | undefined {
  if (element.hasAttribute('lsdata')) {
    const lsDataAttributeValue = element.getAttribute('lsdata');
    if (lsDataAttributeValue) {
      try {
        const unescapedLsData = unescapeHtml(lsDataAttributeValue);
        const parsedData = eval('(' + unescapedLsData + ')');
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)){
          const sid = findSid(parsedData);
          // Return null when lsdata is there but SID is not found
          return sid ? { SID: sid, element } : null;
        }
      } catch (error) {
        return null;
      }
    }
  }
  return undefined;
}

function unescapeHtml(html: string): string {
  // Using DOMParser to unescape HTML is a robust way to handle various entities
  // in a browser environment.
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
  } catch (e) {
    // Basic fallback if DOMParser fails or is unavailable (less likely in modern browsers)
    // console.warn("DOMParser unescaping failed, using fallback:", e);
    // const tempElement = document.createElement('textarea');
    // tempElement.innerHTML = html;
    const unescaped = html
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    return unescaped;
  }
}

function findSid(obj: Record<string, any>): string | undefined {
  if ('SID' in obj)
    return obj['SID'];


  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if ('SID' in obj[key])
        return obj[key]['SID'];

    }
  }

  return undefined;
}

export function findClosestElementWithSidAndReturnSid(startNode: Node): {SID: string, element: Element} | null {
  let searchRootElement: Element | null;

  // Determine the effective starting element for the search
  if (startNode.nodeType === Node.ELEMENT_NODE)
    searchRootElement = startNode as Element;
  else
    searchRootElement = startNode.parentElement;


  if (!searchRootElement)
    return null; // No valid starting point for the search


  // 1. Check the starting element itself (distance 0)
  let LsDataCheck = getElementIfValidLsDataWithSid(searchRootElement);
  if (LsDataCheck !== undefined)
    return LsDataCheck;


  let currentAncestor: Element | null = searchRootElement.parentElement;
  let count = 0;
  // let currentChildrenGeneration: Element[] = Array.from(searchRootElement.children);

  // Loop outward, level by level (distance 1, then 2, and so on)
  while (currentAncestor && count < 4) {
    // Check ancestor at the current distance
    if (currentAncestor) {
      LsDataCheck = getElementIfValidLsDataWithSid(currentAncestor);
      if (LsDataCheck !== undefined)
        return LsDataCheck;

    }
    count++;
    // Check all children in the current generation (at the current distance)
    // const nextGenerationOfChildren: Element[] = [];
    // for (const child of currentChildrenGeneration) {
    //   LsDataCheck = getElementIfValidLsDataWithSid(child);
    //   if (LsDataCheck)
    //     return LsDataCheck;

    //   nextGenerationOfChildren.push(...Array.from(child.children));
    // }

    // Move to the next level for the next iteration
    if (currentAncestor)
      currentAncestor = currentAncestor.parentElement; // Move one level up

    // currentChildrenGeneration = nextGenerationOfChildren; // Move one generation down
  }

  return null; // No matching element found
}
