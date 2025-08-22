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
export function createPropertyValueMatcher(propertyRole: string, propertyValue?: string, propertyName?: string,  exact: boolean = false): ((elementValue: string) => boolean) | undefined {

  if (!(propertyValue && propertyName))
    return;

  // Cases added corresponding to the code in checkAndMakeSelectorTokens - packages/injected/src/sap/common.ts
  // if (propertyName.toLowerCase() === 'icon' || (propertyRole.toLowerCase() === 'icon' && propertyName.toLowerCase() === 'src'))
  //   return (elementValue: string) => elementValue.includes(propertyValue);

  if (propertyName.toLowerCase() !== 'text') {
    if (exact)
      return (elementValue: string) => elementValue === propertyValue;
    else
      return (elementValue: string) => elementValue.toLowerCase() === propertyValue.toLowerCase();
  }

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
    return `${node.role}[${index}]`;
  });

  // 3. Find the shortest unique path by starting from the target and moving up
  for (let i = pathSegments.length - 1; i >= 0; i--) {
    const relativeSegments = pathSegments.slice(i);
    const candidateXpath = `//${relativeSegments.join('/')}`;

    // Check for uniqueness. The path starts with //, so search is always relative.
    const matches = findNodesByXpath(dom, relativeSegments, true);

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
const findNodesRecursive = (
  nodes: UI5Node[],
  segments: string[],
  isRelativeSearch: boolean
): UI5Node[] => {
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
    if (node.role === parsedSegment.role && roleCounter[node.role] === parsedSegment.index) {
      if (remainingSegments.length === 0) {
        // This is the last segment, so this node is a final match
        matchedNodes.push(node);
      } else {
        // Match found, continue searching in its children (now a direct search)
        matchedNodes.push(...findNodesRecursive(node.content, remainingSegments, false));
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
const parseSegment = (segment: string): { role: string; index: number } | null => {
  const match = segment.match(/^(\w+)\[(\d+)\]$/);
  if (!match)
    return null;
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

/**
 * Finds all nodes in a DOM tree that match a given XPath.
 * This is a simplified evaluator that supports '//' and '/'.
 * @param nodes The current list of nodes to search within.
 * @param segments The remaining XPath segments to match.
 * @param isRelative Whether the search is relative ('//').
 * @returns A list of matching nodes.
 */
const findNodesByXpath = (
  nodes: UI5Node[],
  segments: string[],
  isRelative: boolean
): UI5Node[] => {
  if (!segments.length)
    return [];

  const [currentSegment, ...remainingSegments] = segments;
  const parsedSegment = parseSegment(currentSegment);
  if (!parsedSegment)
    return []; // Invalid segment

  const foundNodes: UI5Node[] = [];

  for (const node of nodes) {
    // Check if the current node matches the segment
    const nodeIndex = getNodeIndex(node, nodes);
    if (node.role === parsedSegment.role && nodeIndex === parsedSegment.index) {
      if (remainingSegments.length === 0) {
        foundNodes.push(node);
      } else {
        // Match found, continue searching in children with a non-relative path
        foundNodes.push(...findNodesByXpath(node.content, remainingSegments, false));
      }
    }

    // If relative, continue searching in children with the same segments
    if (isRelative)
      foundNodes.push(...findNodesByXpath(node.content, segments, true));
  }

  return foundNodes;
};


/**
 * Finds the target node by its ID and returns its ancestor path.
 * @param dom The root nodes of the DOM.
 * @param targetId The ID of the node to find.
 * @returns An array of nodes representing the path from root to target, or null.
 */
const findNodePath = (
  dom: UI5Node[],
  targetId: string
): { node: UI5Node; siblings: UI5Node[] }[] | null => {
  const search = (
    nodes: UI5Node[],
    id: string,
    ancestors: { node: UI5Node; siblings: UI5Node[] }[]
  ): { node: UI5Node; siblings: UI5Node[] }[] | null => {
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
