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

import { InjectedScript } from '@injected/injectedScript';
import { buildUI5TreeModel, checkOverlap, checkSAPUI5, UI5Node } from '@sap/common';

export type UI5PropertyType = {
  propertyValue: string,
  propertyName: string
};

// This function is used to check sap selectror, wether result and target element has the same ui5 parent element
export function checkSAPSelector(result: Element, targetElement: Element, window: Window): Boolean {
  let currentElement: Element | null = targetElement;
  let ui5TargetTree: UI5Node[] = [];
  if (!checkSAPUI5(window))
    return false;

  while (currentElement && (ui5TargetTree.length === 0 || !checkOverlap(ui5TargetTree, targetElement))){
    ui5TargetTree = buildUI5TreeModel(currentElement, window, 1);
    currentElement = currentElement.parentElement;
  }
  let resultUI5Tree: UI5Node[] = [];
  let resultElement: Element = result;
  while ((resultUI5Tree.length === 0 || !checkOverlap(resultUI5Tree, result)) && resultElement){
    resultUI5Tree = buildUI5TreeModel(resultElement, window, 1);
    if (resultElement.parentElement)
      resultElement = resultElement.parentElement;
    else
      return false;
  }

  //
  if (ui5TargetTree.length && resultUI5Tree.length &&  resultUI5Tree[0].id === ui5TargetTree[0].id && resultUI5Tree[0].role === ui5TargetTree[0].role)
    return true;

  return false;
}

// Inspired from packages/injected/src/injectedScript.ts - createTextMatcher
export function createPropertyValueMatcher(propertyRole: string, properties?: UI5PropertyType[],  exact: boolean = false): ((elementValue: string) => boolean) | undefined {

  if (!properties)
    return undefined;

  if (properties?.length > 1)
    throw new Error('Multiple Properties not supported currenlty');

  const { propertyValue, propertyName } = properties[0];

  if (propertyName.toLowerCase() !== 'text') {
    if (exact) {
      return (elementValue: string) => elementValue === propertyValue;
    } else {
      return (elementValue: string): boolean => {
        if (elementValue.length > 70)
          return propertyValue.toLowerCase() === suitableTextAlternatives_sap(elementValue).sort((a, b) => b.scoreBonus - a.scoreBonus)[0].text.toLowerCase();
        return elementValue.toLowerCase() === propertyValue.toLowerCase();
      };
    }
  }

  //  Testing is Pending.
  // This is a regex checker in case propertyName. regex wont come from codegen but if the user explicitly tries to use regex in code.
  if (propertyValue[0] === '/' && propertyValue.lastIndexOf('/') > 0) {
    const lastSlash = propertyValue.lastIndexOf('/');
    const re = new RegExp(propertyValue.substring(1, lastSlash), propertyValue.substring(lastSlash + 1));
    return  (elementValue: string) => re.test(elementValue);
  }

  // In case the user explicitly adds exact = true - will only work when propertyName is text.
  // Exact = true dosnt come directly from codegen.
  if (exact)
    return  (elementValue: string) => elementValue === propertyValue ;

  // Currently i mode is the default if present or not prosent
  return (elementValue: string) => elementValue.toLowerCase().includes(propertyValue.toLowerCase()) ;
}

export function getClosestUI5ElementFromCurrentElement(element: Element, injectedScript: InjectedScript): UI5Node | null {

  let ui5SelectorMap_element: UI5Node[] = [];
  let currentElement: Element | null = element;

  while (currentElement && (ui5SelectorMap_element.length === 0 || !checkOverlap(ui5SelectorMap_element, element))) {
    if (currentElement === element.getRootNode() || currentElement === element.ownerDocument.body)
      return null;
    ui5SelectorMap_element = buildUI5TreeModel(currentElement, injectedScript.window, 1);
    currentElement = currentElement.parentElement;
  }

  if (!currentElement || currentElement === (injectedScript.document.body as Element))
    return null;

  const ui5_element = checkOverlap(ui5SelectorMap_element, element);

  if (ui5_element)
    return ui5_element;

  return null;
}


// ----------------------------------------------------
// Copied fron packages/injected/src/selectorGenerator.ts

export function suitableTextAlternatives_sap(text: string) {
  let result: { text: string, scoreBonus: number }[] = [];

  {
    const match = text.match(/^([\d.,]+)[^.,\w]/);
    const leadingNumberLength = match ? match[1].length : 0;
    if (leadingNumberLength) {
      const alt = trimWordBoundary(text.substring(leadingNumberLength).trimStart(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }

  {
    const match = text.match(/[^.,\w]([\d.,]+)$/);
    const trailingNumberLength = match ? match[1].length : 0;
    if (trailingNumberLength) {
      const alt = trimWordBoundary(text.substring(0, text.length - trailingNumberLength).trimEnd(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }

  if (text.length <= 30) {
    result.push({ text, scoreBonus: 0 });
  } else {
    result.push({ text: trimWordBoundary(text, 80), scoreBonus: 0 });
    result.push({ text: trimWordBoundary(text, 30), scoreBonus: 1 });
  }

  result = result.filter(r => r.text);
  if (!result.length)
    result.push({ text: text.substring(0, 80), scoreBonus: 0 });

  return result;
}

function trimWordBoundary(text: string, maxLength: number) {
  if (text.length <= maxLength)
    return text;
  text = text.substring(0, maxLength);
  // Find last word boundary in the text.
  const match = text.match(/^(.*)\b(.+?)$/);
  if (!match)
    return '';
  return match[1].trimEnd();
}

/**
 * Generates the shortest unique XPath for a node with a given ID in a UI5-like DOM.
 * The XPath does not use the node's ID.
 *
 * @param dom The root of the UI5 DOM structure.
 * @param targetId The ID of the node for which to generate the XPath.
 * @returns The shortest, unique XPath string, or null if the node isn't found.
 */
/** ## Time Complexity -  O(P * N) - Quite High. Cannot use for cacheing feature.
      N: The total number of nodes in the DOM tree.
      P: The depth of the target node (i.e., the number of its ancestors).
 */
export function getShortestUniqueXPathInUI5DOM(dom: UI5Node[], targetId: string): string | null {
  // 1. Find the target node and its path of ancestors
  const nodePath = findNodePath(dom, targetId);
  if (!nodePath) {
    // console.error(`Node with id "${targetId}" not found.`);
    return null;
  }

  // 2. Generate the XPath segments for each node in the path
  const pathSegments = nodePath.map(({ node, siblings }) => {
    const index = getNodeIndex(node, siblings);

    // Checking if siblings contains the same node.role.
    let sameNodeRole = false;
    siblings.filter(sibling => sibling.id !== node.id).forEach(sibling => sameNodeRole = sibling.role === node.role || sameNodeRole);

    if (sameNodeRole)
      return `${node.role}[${index}]`;

    return node.role;
  });

  // 3. Find the shortest unique path by starting from the target and moving up
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const relativeSegments = pathSegments.slice(i);
    const candidateXpath = `//${relativeSegments.join('/')}`;

    // Check for uniqueness. The path starts with //, so search is always relative.
    const matches = findByXPathInUI5Tree(dom, candidateXpath);

    if (matches.length === 1 && matches[0].id === targetId)
      return candidateXpath; // Found the shortest unique relative path
  }

  // 4. As a fallback, return the full absolute path (though the loop above should always succeed)
  return `/${pathSegments.join('/')}`;
}

/**
 * A recursive helper to find nodes matching a sequence of XPath segments.
 * @param nodes The current list of nodes to search within.
 * @param segments The remaining XPath segments to match.
 * @param isRelativeSearch If true, the first segment can match any descendant.
 * @returns An array of matching UI5Nodes.
 */
const findNodesRecursive = (nodes: UI5Node[], segments: string[], isRelativeSearch: boolean): UI5Node[] => {
  if (!segments.length)
    return []; // Should not happen if called correctly

  const [currentSegment, ...remainingSegments] = segments;
  const parsedSegment = parseSegment(currentSegment);
  if (!parsedSegment)
    return []; // Invalid segment stops the search

  const matchedNodes: UI5Node[] = [];
  const roleCounter: { [key: string]: number } = {};

  // Find nodes at the current level that match the first segment
  for (const node of nodes) {
    // Increment the counter for the current node's role
    roleCounter[node.role] = (roleCounter[node.role] || 0) + 1;

    // Check if the current node is a match for the segment
    if (node.role === parsedSegment.role && parsedSegment.index && roleCounter[node.role] === parsedSegment.index) {
      if (remainingSegments.length === 0) {
        // This is the last segment, so this node is a final match
        matchedNodes.push(node);
      } else {
        // Match found, continue searching in its children (now a direct search)
        matchedNodes.push(...findNodesRecursive(node.content, remainingSegments, false));
      }
    }
  }

  if (!parsedSegment.index) {
    for (const node of nodes) {
      // Check if the current node is a match for the segment
      if (node.role === parsedSegment.role && roleCounter[node.role] === 1) {
        if (remainingSegments.length === 0) {
          // This is the last segment, so this node is a final match
          matchedNodes.push(node);
        } else {
          // Match found, continue searching in its children (now a direct search)
          matchedNodes.push(...findNodesRecursive(node.content, remainingSegments, false));
        }
      }
    }
  }

  // If it's a relative search, we must also search deeper in the hierarchy
  // for the *current* segment, in case it wasn't found at this level.
  if (isRelativeSearch) {
    for (const node of nodes)
      matchedNodes.push(...findNodesRecursive(node.content, segments, true));
  }

  return matchedNodes;
};

/**
 * Finds all UI5Node elements in a DOM structure that match a given XPath string.
 * Supports absolute ('/...') and relative ('//...') paths.
 *
 * @param dom The root of the UI5 DOM structure.
 * @param xpath The XPath string to evaluate.
 * @returns An array of matching UI5Node elements.
 */
/** ## Time Complexity -  O(N) - Okayish High. Not high but getShortestUniqueXPathInUI5DOM has high Time Complexity.
      N: The total number of nodes in the DOM tree.
 */
export function findByXPathInUI5Tree(dom: UI5Node[], xpath: string): UI5Node[] {
  if (!xpath)
    return [];

  const isRelative = xpath.startsWith('//');
  const isAbsolute = xpath.startsWith('/');

  if (!isRelative && !isAbsolute) {
    // console.error('XPath must start with "/" or "//".');
    return [];
  }

  // Clean up the path and split into segments
  const cleanedPath = xpath.substring(isRelative ? 2 : 1);
  const segments = cleanedPath.split('/').filter(s => s.length > 0);

  if (segments.length === 0)
    return [];

  return findNodesRecursive(dom, segments, isRelative);
}


/**
 * Parses an XPath segment string like "role[1]" into its constituent parts.
 * @param segment The XPath segment string.
 * @returns An object with role and index, or null if parsing fails.
 */
const parseSegment = (segment: string): { role: string; index?: number } | null => {
  const match = segment.match(/^(\w+)(?:\[(\d+)\])?$/);
  if (!match)
    return null;
  if (match.length === 1)
    return { role: match[1] };
  return { role: match[1], index: parseInt(match[2], 10) };
};

/**
 * Gets the positional index of a node among its siblings with the same role.
 * e.g., if it's the 2nd 'div' among its siblings, its index is 2.
 * @param targetNode The node to get the index for.
 * @param siblings The array of siblings containing the target node.
 * @returns The positional index (1-based).
 */
const getNodeIndex = (targetNode: UI5Node, siblings: UI5Node[]): number => {
  let index = 1;
  for (const sibling of siblings) {
    if (sibling.id === targetNode.id)
      break;
    if (sibling.role === targetNode.role)
      index++;
  }
  return index;
};

/** This is a very very shitty function remove this immideately. Takes up a lot of RAM. */
/**
 * Finds the target node by its ID and returns its ancestor path. - Returns Full Xpath.
 * @param dom The root nodes of the DOM.
 * @param targetId The ID of the node to find.
 * @returns An array of nodes representing the path from root to target, or null.
 */
const findNodePath = (dom: UI5Node[], targetId: string): { node: UI5Node; siblings: UI5Node[] }[] | null => {
  const search = (nodes: UI5Node[], id: string, ancestors: { node: UI5Node; siblings: UI5Node[] }[]): { node: UI5Node; siblings: UI5Node[] }[] | null => {
    for (const node of nodes) {
      const currentPath = [...ancestors, { node, siblings: nodes }];
      if (node.id === id)
        return currentPath;
      if (node.content && node.content.length > 0) {
        const result = search(node.content, id, currentPath);
        if (result)
          return result;
      }
    }
    return null;
  };
  return search(dom, targetId, []);
};

// To compare closeness of 2 strings.
export function cosineSimilarity(a: string, b: string): number {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);

  const allWords = Array.from(new Set([...wordsA, ...wordsB]));
  const vecA = allWords.map(w => wordsA.filter(x => x === w).length);
  const vecB = allWords.map(w => wordsB.filter(x => x === w).length);

  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));

  return dot / (magA * magB || 1);
}
