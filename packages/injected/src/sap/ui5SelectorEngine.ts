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

import { SelectorEngine, SelectorRoot } from '@injected/selectorEngine';
import { AttributeSelectorPart, parseAttributeSelector } from '@isomorphic/selectorParser';
import { checkSAPUI5, getPropertiesUsingControlId } from '@sap/common';
import { buildUI5XmlTree } from '@sap/src/UI5XML';
import { findElementsUsingXpath } from '@sap/src/UI5Xpath';
import { UI5properties } from '@sap/types/properties';

import { createPropertyValueMatcher } from './common';
import { isElementVisible } from './domUtils';

export function ui5XpathEngine(): SelectorEngine {
  return {
    queryAll: (scope: SelectorRoot, selector: string): Element[] => {

      const document = scope.ownerDocument || scope;
      const window = document?.defaultView;

      if (!window)
        throw new Error(`Window missing error UI5 Selector Engine`);
      if (!checkSAPUI5(window))
        throw new Error(`SAP UI5 not found in page.`);

      const UI5XmlDom = buildUI5XmlTree(document, window);
      const result: Element[] = [];

      findElementsUsingXpath(UI5XmlDom, selector).forEach(node => {
        const ele = document.getElementById(node.id); // Need to do this because node coming from here belongs to a different dom structure.
        if (ele)
          result.push(ele);
      });

      return getUniqueInteractableHTMLElements(result);
    }
  };
}

export function ui5RoleEngine(): SelectorEngine {
  return {
    queryAll: (scope: SelectorRoot, selector: string): Element[] => {

      // https://chatgpt.com/share/68c85a01-dbec-800a-83f6-895d6994bd68
      const parsed = parseAttributeSelector(selector, true);
      const role = parsed.name;

      if (!role)
        throw new Error(`Role must not be empty`);

      const document = scope.ownerDocument || scope;
      const window = document?.defaultView;

      if (!window)
        throw new Error(`Window missing error UI5 Selector Engine`);
      if (!checkSAPUI5(window))
        throw new Error(`SAP UI5 not found in page.`);

      const UI5XmlDom = buildUI5XmlTree(document, window);
      const result = ui5IdSelectorEngineForProperty(UI5XmlDom, role, window, parsed.attributes);

      return getUniqueInteractableHTMLElements(result);
    }
  };
}

function ui5IdSelectorEngineForProperty(UI5XmlDom: XMLDocument, role: string, window: Window, property: AttributeSelectorPart[]): Element[] {
  // Depth-first search for nodes matching id and role
  const result: Element[] = [];

  // Currenlty we are not checking if the role is allowed or not, allowing everything.
  // if (!getAllowedProperties(role).includes(propertyName))
  //   throw new Error(`Property ${propertyName} is not supported.`);

  const propertyValueMatcher = createPropertyValueMatcher(role, property);

  function dfs(node: Element) {

    // This search can be optimized currently this function builds both properites inherited and own. We can optimize it to first fetch own properties and then check inherited properties only if own properties are not found.  -- Need to implement.
    if (checkIfNodeContainsProperty(node, role, window, property, propertyValueMatcher)) {
      const ele = window.document.getElementById(node.id);
      if (ele)
        result.push(ele);
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children)
        dfs(child);
    }
  }

  for (const childNode of UI5XmlDom.children)
    dfs(childNode);

  return result;
}

// propertyName is case-sensative
// propertyValue is neither case sensative nor exact match if the string contains that string it will still be a match
function checkIfNodeContainsProperty(node: Element, role: string,  window: Window, property_node:  AttributeSelectorPart[], propertyValueMatcher?: ((_properties: UI5properties) => boolean)): boolean {

  if (node.nodeName.toLowerCase() !== role.toLowerCase() || node.nodeName === '')
    return false;

  if (!(property_node.length && propertyValueMatcher))
    return true;

  const properties = getPropertiesUsingControlId(node.id, window);
  if (!properties)
    return false;

  if (propertyValueMatcher(properties))
    return true;

  return false;
}

function getUniqueInteractableHTMLElements(result: Element[]): Element[] {
  const resultSet = new Set<Element>();
  result.forEach(ele => {
    // If the element is not a direct child of the scope, we can ignore it.
    const match = ele.querySelector('button,select,input,[role=button],[role=checkbox],[role=radio],a,[role=link]');
    if (match && isElementVisible(match))
      resultSet.add(match);
    else
      resultSet.add(ele);
  });
  return Array.from(resultSet);
}
