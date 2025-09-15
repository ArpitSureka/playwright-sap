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
import { SelectorToken } from '@injected/selectorGenerator';
import { escapeForAttributeSelector } from '@isomorphic/stringUtils';
import { checkSAPUI5, getClosestUI5ElementFromCurrentElement, getPropertiesUsingControlId, UI5errorMessage } from '@sap/common';

import { checkIfRoleAllowed, checkIfRoleAllowedWithoutProperties, getAllowedProperties, obviousTextProperties } from './allowedRolesAndProperties';
import { cosineSimilarity, suitableTextAlternatives_sap } from './common';

import type { UI5properties } from '@sap/types/properties';

// Score for UI5 selectors
const ui5BasicScore = 30;
const ui5TextScore = 220;

// Builds UI5 Selectors
// Add no text option in buildUI5Selectors to work with expect text feature.
export function buildUI5RoleSelectors(injectedScript: InjectedScript, element: Element, allowText: boolean = true): SelectorToken[][] {

  const candidates: SelectorToken[][] = [];
  const win = injectedScript.window;

  try {
    if (checkSAPUI5(win)) {

      // ui5_element is from UI5 XML DOM.
      const ui5_element = getClosestUI5ElementFromCurrentElement(element, win);
      if (ui5_element) {
        let ui5_element_textContent: string | undefined;
        if (!allowText)
          ui5_element_textContent = win.document.getElementById(ui5_element.id)?.textContent || undefined;// Dont use the textContent of element use of ui5_element;
        const roleSelectors = makeRoleUI5Selectors(ui5_element, win, ui5_element_textContent);
        if (roleSelectors) {
          roleSelectors.forEach(token => {
            candidates.push([token]);
          });
        }
      }
      return candidates;
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in making UI5 Role Selector: ' + error);
  }

  return candidates;
}

function makeRoleUI5Selectors(ui5_element: Element, win: Window, innerText?: string): SelectorToken[] | null {
  if (!ui5_element)
    return null;

  const properties = getPropertiesUsingControlId(ui5_element.id, win);
  const selectorTokens: SelectorToken[] = [];

  if (properties && checkIfRoleAllowed(ui5_element.nodeName)) {
    const selectors = makeSelectorFromProperties(properties, ui5_element.nodeName, innerText);
    selectorTokens.push(...selectors);
  }

  // Some UI5 controls like SearchField, StandardListItem, etc. dont have any properties but still can be selected by their role.
  if (selectorTokens.length === 0 && checkIfRoleAllowedWithoutProperties(ui5_element.nodeName)) {
    selectorTokens.push({
      engine: 'ui5:role',
      selector: ui5_element.nodeName,
      score: ui5BasicScore
    });
  }

  selectorTokens.sort((a, b) => a.score - b.score);

  return selectorTokens;
}

function makeSelectorFromProperties(properties: UI5properties, elementRole: string, innerText?: string): SelectorToken[] {
  const selectorTokensData: selectorTokensData[] = [];

  // console.log('hi');
  if (elementRole === '' || !checkIfRoleAllowed(elementRole))
    return [];
  const allowedProperties = getAllowedProperties(elementRole);
  for (const propertyName of properties.keys()) {
    if (allowedProperties.includes(propertyName)) {
      const propertyValue = properties.get(propertyName);
      if (propertyValue && typeof(propertyValue) === 'string' && propertyValue.length > 0)
        selectorTokensData.push({ propertyRole: elementRole, propertyName, propertyValue, score: allowedProperties.indexOf(propertyName) });
    }
  }

  return checkAndMakeSelectorTokens(selectorTokensData, innerText);
}


function checkAndMakeSelectorTokens(selectorTokens: selectorTokensData[], innerText?: string) {
  const result: SelectorToken[] = [];
  selectorTokens.sort((a, b) => a.score - b.score);
  selectorTokens.forEach(selectorToken => {

    let propertyValue = selectorToken.propertyValue;

    if (innerText) {
      if (obviousTextProperties.includes(selectorToken.propertyName))
        return;

      // Removing in case obviousTextProperties misses few properties.
      if (cosineSimilarity(innerText, selectorToken.propertyValue) > 0.2)
        return;
    }

    // Changing text if it is too long. Currently dont have {exact: true} support in getByRoleUI5.
    // This feature needs to be devloped further. Not ready right now.
    if (selectorToken.propertyName.toLowerCase() === 'text' && propertyValue.length > 70)
      propertyValue = suitableTextAlternatives_sap(propertyValue).sort((a, b) => b.scoreBonus - a.scoreBonus)[0].text;

    // Incase any more edge cases are added here add the corresponding code in createPropertyValueMatcher - packages/injected/src/sap/common.ts

    // If Both propertyName and propertyRole are text then preferabely use getByTextLocator.
    // Shift this Later to the part where we rearrange priorities of the locators when UI5 locators are present.
    // Upcoming feature in the next version from 1.2.0
    if (selectorToken.propertyName.toLowerCase() === 'text' && selectorToken.propertyRole.toLowerCase() === 'text'){
      result.push({
        engine: 'ui5:role',
        selector: `${selectorToken.propertyRole}[${selectorToken.propertyName}=${escapeForAttributeSelector(propertyValue, false)}]`,
        score: ui5TextScore
      });
    } else {
      result.push({
        engine: 'ui5:role',
        selector: `${selectorToken.propertyRole}[${selectorToken.propertyName}=${escapeForAttributeSelector(propertyValue, false)}]`,
        score: ui5BasicScore + Math.trunc((selectorToken.score ? selectorToken.score : 0) / 10)
      });
    }

  });
  return result;
}

type selectorTokensData  = {propertyRole: string, propertyName: string, propertyValue: string, score: number};
