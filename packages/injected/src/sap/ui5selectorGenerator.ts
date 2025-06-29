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

import { InjectedScript } from '@injected/injectedScript';
import { SelectorToken } from '@injected/selectorGenerator';
// import { escapeForAttributeSelector } from '@isomorphic/stringUtils';
import { buildUI5TreeModel, checkSAPUI5, getPropertiesUsingControlId, UI5errorMessage, UI5Node } from '@sap/common';

// Score for UI5 selectors
const UI5idScore = 10;

// This list is case-sensitive and should match the UI5 control properties. UI5 properties follow camelCase. Also this is ordered by priority.
export const allowedProperties = ['text', 'label', 'value', 'title', 'name', 'placeholder', 'ariaLabelledBy'];

// Builds UI5 Selectors
export function buildUI5Selectors(injectedScript: InjectedScript, element: Element): SelectorToken[][] {

  const candidates: SelectorToken[][] = [];
  const win = injectedScript.window;

  try {
    if (checkSAPUI5(win)) {

      let ui5SelectorMap_element: UI5Node[] = [];
      let currentElement: Element | null = element;

      while (ui5SelectorMap_element.length === 0 || ui5SelectorMap_element.length > 1) {
        if (currentElement === element.getRootNode() || currentElement === element.ownerDocument.body)
          return [];
        ui5SelectorMap_element = buildUI5TreeModel(currentElement, win, 1);
        if (ui5SelectorMap_element.length === 0 || ui5SelectorMap_element.length > 1) {
          currentElement = currentElement.parentElement;
          if (!currentElement)
            return [];
        }
      }

      if (ui5SelectorMap_element.length === 1 && ui5SelectorMap_element[0].id) {
        const roleSelector = makeRoleUI5Selector(ui5SelectorMap_element, win);
        if (roleSelector)
          candidates.push([roleSelector]);
      } else {
        UI5errorMessage(win, 'Error in makeUI5XpathSelector: ');
      }

      return candidates;
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in making UI5 Selector: ' + error);
  }

  return candidates;
}

function makeRoleUI5Selector(ui5Nodes: UI5Node[], win: Window): SelectorToken | null {
  if (!ui5Nodes || ui5Nodes.length === 0)
    return null;

  const element = ui5Nodes[0];
  if (!element || !element.id)
    return null;

  const properties = getPropertiesUsingControlId(element.id, win);
  if (!properties)
    return null;

  for (const propertyName of allowedProperties) {
    const selector = checkForPropertyAndMakeSelector(properties, propertyName);
    if (selector)
      return selector;
  }

  return null;
}

function checkForPropertyAndMakeSelector(allProperties: any, propertyName: string): SelectorToken | null {

  if (allProperties && allProperties.own && allProperties.own.properties && allProperties.own.properties[propertyName]) {
    const propertyValue = allProperties.own.properties[propertyName].value;
    const propertyRole = allProperties.own.meta?.controlName?.split('.').pop().toLowerCase();
    if (propertyValue && propertyRole && propertyRole.length > 0 && allowedProperties.includes(propertyName) && propertyValue.length > 0) {
      return {
        engine: 'ui5:role',
        selector: `${propertyRole}[${propertyName}="${propertyValue}"]`,
        score: UI5idScore
      };
    }
  }

  if (allProperties && allProperties.inherited) {
    for (const inherited of allProperties.inherited) {
      if (inherited.properties && inherited.properties[propertyName]) {
        const propertyValue = inherited.properties[propertyName].value;
        const propertyRole = inherited.meta?.controlName?.split('.').pop().toLowerCase();
        if (propertyValue && propertyRole && propertyRole.length > 0 && allowedProperties.includes(propertyName) && propertyValue.length > 0) {
          return {
            engine: 'ui5:role',
            selector: `${propertyRole}[${propertyName}="${propertyValue}"]`,
            score: UI5idScore
          };
        }
      }
    }
  }

  return null;
}
