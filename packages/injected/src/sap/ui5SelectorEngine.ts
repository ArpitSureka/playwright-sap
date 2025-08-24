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
import { parseAttributeSelector } from '@isomorphic/selectorParser';
import { buildUI5TreeModel, checkSAPUI5, getElementFromUI5Id, getPropertiesUsingControlId, UI5Node } from '@sap/common';

import { createPropertyValueMatcher, findByXPathInUI5Tree, UI5PropertyType } from './common';
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

      const ui5DocumentTree = buildUI5TreeModel(document.body, window);
      const result: Element[] = [];

      findByXPathInUI5Tree(ui5DocumentTree, selector).forEach(node => {
        const ele = getElementFromUI5Id(node.id, window);
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

      const ui5DocumentTree = buildUI5TreeModel(document.body, window);
      let result: Element[] = [];
      if (parsed.attributes.length === 0)
        result = ui5IdSelectorEngineForProperty(ui5DocumentTree, role, window);
      if (parsed.attributes.length === 1 && parsed.attributes[0].name)
        result = ui5IdSelectorEngineForProperty(ui5DocumentTree, role, window, { propertyName: parsed.attributes[0].name, propertyValue: parsed.attributes[0].value }, parsed.attributes[0].caseSensitive);
      else if (parsed.attributes.length > 1)
        throw new Error(`Not supported multiple attributes in UI5 selector: ${selector}`);

      return getUniqueInteractableHTMLElements(result);
    }
  };
}

function ui5IdSelectorEngineForProperty(ui5Tree: UI5Node[], role: string, window: Window, property?: UI5PropertyType, exact?: boolean): Element[] {
  // Depth-first search for nodes matching id and role
  const result: Element[] = [];

  // Currenlty we are not checking if the role is allowed or not, allowing everything.
  // if (!getAllowedProperties(role).includes(propertyName))
  //   throw new Error(`Property ${propertyName} is not supported.`);

  const propertyValueMatcher = createPropertyValueMatcher(role, property ? [property] : undefined, exact);

  function dfs(node: UI5Node) {

    // This search can be optimized currently this function builds both properites inherited and own. We can optimize it to first fetch own properties and then check inherited properties only if own properties are not found.  -- Need to implement.
    if (checkIfNodeContainsProperty(node, role, window, property, propertyValueMatcher)) {
      const ele = getElementFromUI5Id(node.id, window);
      if (ele)
        result.push(ele);
    }

    if (node.content && node.content.length > 0) {
      for (const child of node.content)
        dfs(child);
    }
  }

  for (const rootNode of ui5Tree)
    dfs(rootNode);

  return result;
}

// propertyName is case-sensative
// propertyValue is neither case sensative nor exact match if the string contains that string it will still be a match
function checkIfNodeContainsProperty(node: UI5Node, role: string,  window: Window, property_node?: UI5PropertyType, propertyValueMatcher?: (text: string) => boolean): boolean {

  if (node.role.toLowerCase() !== role.toLowerCase())
    return false;

  if (!(property_node && propertyValueMatcher))
    return true;

  const properties = getPropertiesUsingControlId(node.id, window);
  if (!properties)
    return false;

  const property = properties.own.properties[property_node.propertyName];
  if (property && property.value && propertyValueMatcher(property.value))
    return true;


  if (properties.inherited.length) {
    for (const inherited of properties.inherited) {
      const inheritedProperty = inherited.properties[property_node.propertyName];
      if (inheritedProperty && inheritedProperty.value && propertyValueMatcher(inheritedProperty.value))
        return true;
    }
  }
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
