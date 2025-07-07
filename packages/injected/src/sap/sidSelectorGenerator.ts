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

import { SelectorToken } from '@injected/selectorGenerator';


export function sidSelectorGenerator(targetNode: Node): SelectorToken[][] {
  let searchRootElement: Element | null;

  // Determine the effective starting element for the search
  if (targetNode.nodeType === Node.ELEMENT_NODE)
    searchRootElement = targetNode as Element;
  else
    searchRootElement = targetNode.parentElement;

  if (!searchRootElement)
    return []; // No valid starting point for the search

  let sid = undefined;
  let currentAncestor: Element | null = searchRootElement;
  let count = 0;
  const selectorToken: SelectorToken[][] = [];

  // Loop outward, level by level (distance 1, then 2, and so on)
  while (currentAncestor && count < 4) {
    // Check ancestor at the current distance
    if (currentAncestor) {
      sid = getSIDfromElement(currentAncestor);
      if (sid !== undefined){
        selectorToken.push([{
          engine: 'sid',
          selector: `sid=${sid}`,
          score: 1
        }]);
      }

      // If sid is null there is a problem. either that node has lsData and it dosnt have sid or an error has been caught
      if (sid === null)
        break;
    }
    count++;

    // Move to the next level for the next iteration
    if (currentAncestor)
      currentAncestor = currentAncestor.parentElement; // Move one level up

  }

  return selectorToken; // No matching element found
}

function getSIDfromElement(element: Element): string | null | undefined {
  if (element.hasAttribute('lsdata')) {
    const lsDataAttributeValue = element.getAttribute('lsdata');
    if (lsDataAttributeValue) {
      try {
        const unescapedLsData = unescapeHtml(lsDataAttributeValue);
        const parsedData = eval('(' + unescapedLsData + ')');
        if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)){
          const sid = findSid(parsedData);
          // Return null when lsdata is there but SID is not found
          return sid ? sid : null;
        }
      } catch (error) {
        return null;
      }
    }
  }
  return undefined;
}

function unescapeHtml(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.documentElement.textContent || '';
  } catch (e) {
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
