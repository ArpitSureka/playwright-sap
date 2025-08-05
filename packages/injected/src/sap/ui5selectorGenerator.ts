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
import { buildUI5TreeModel, checkOverlap, checkSAPUI5, getPropertiesUsingControlId, UI5errorMessage, UI5Node } from '@sap/common';

import { checkIfRoleAllowed, checkIfRoleAllowedWithoutProperties, getAllowedProperties } from './allowedRolesAndProperties';

import type { UI5Property } from '@sap/types/properties';

// Score for UI5 selectors
const ui5BasicScore = 30;

// Builds UI5 Selectors
// Add no text option in buildUI5Selectors to work with expect text feature.
export function buildUI5Selectors(injectedScript: InjectedScript, element: Element): SelectorToken[][] {

  const candidates: SelectorToken[][] = [];
  const win = injectedScript.window;

  try {
    if (checkSAPUI5(win)) {

      let ui5SelectorMap_element: UI5Node[] = [];
      let currentElement: Element | null = element;

      while (currentElement && (ui5SelectorMap_element.length === 0 || !checkOverlap(ui5SelectorMap_element, element))) {
        if (currentElement === element.getRootNode() || currentElement === element.ownerDocument.body)
          return [];
        ui5SelectorMap_element = buildUI5TreeModel(currentElement, win, 1);
        currentElement = currentElement.parentElement;
      }

      if (!currentElement || currentElement === (injectedScript.document.body as Element))
        return [];

      const ui5_element = checkOverlap(ui5SelectorMap_element, element);

      if (ui5_element) {
        const roleSelectors = makeRoleUI5Selectors(ui5_element, win);
        if (roleSelectors && roleSelectors.length)
          // Currently directly taking first role selector randomly can improve this by giving each propertyRole and PropertyName different scores.
          candidates.push([roleSelectors[0]]);
      } else {
        // console.log('error is here');
        UI5errorMessage(win, 'Error in makeUI5XpathSelector: ');
      }
      return candidates;
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in making UI5 Selector: ' + error);
  }

  return candidates;
}

function makeRoleUI5Selectors(ui5Node: UI5Node, win: Window): SelectorToken[] | null {
  if (!ui5Node)
    return null;

  const element = ui5Node;

  const properties = getPropertiesUsingControlId(element.id, win);
  const selectorTokens: SelectorToken[] = [];

  if (properties && checkIfRoleAllowed(element.role)) {
    const ownPropertySelectors = makeSelectorFromOwnProperties(properties.own, element.role);
    selectorTokens.push(...ownPropertySelectors);
  }

  if (properties && properties.inherited.length && checkIfRoleAllowed(element.role)) {
    const inheritedPropertySelectors = makeSelectorFromInheritedProperties(properties.inherited, element.role);
    selectorTokens.push(...inheritedPropertySelectors);
  }

  // Some UI5 controls like SearchField, StandardListItem, etc. dont have any properties but still can be selected by their role.
  if (selectorTokens.length === 0 && checkIfRoleAllowedWithoutProperties(element.role)) {
    selectorTokens.push({
      engine: 'ui5:role',
      selector: element.role,
      score: ui5BasicScore
    });
  }

  selectorTokens.sort((a, b) => a.score - b.score);

  return selectorTokens;
}


function makeSelectorFromOwnProperties(ownProperties: UI5Property, elementRole: string): SelectorToken[] {
  // const selectorTokens: SelectorToken[] = [];
  const selectorTokensData: selectorTokensData[] = [];
  const propertyRole: string | undefined = ownProperties.meta?.controlName?.split('.').pop();
  if (!propertyRole || propertyRole !== elementRole || !checkIfRoleAllowed(propertyRole))
    return [];
  const allowedProperties = getAllowedProperties(propertyRole);
  if (ownProperties && ownProperties.properties && propertyRole.length > 0) {
    for (const propertyName in ownProperties.properties) {
      if (allowedProperties.includes(propertyName)) {
        const propertyValue: string = ownProperties.properties[propertyName].value;
        if (propertyValue && propertyValue.length > 0)
          selectorTokensData.push({ propertyRole, propertyName, propertyValue, score: allowedProperties.indexOf(propertyName) });
      }
    }
  }

  return checkAndMakeSelectorTokens(selectorTokensData);
}

function makeSelectorFromInheritedProperties(inheritedProperties: UI5Property[], elementRole: string): SelectorToken[] {
  const selectorTokensData: selectorTokensData[] = [];
  if (!inheritedProperties)
    return [];
  for (const inheritedProperty of inheritedProperties) {
    if (!elementRole || elementRole.length === 0 || !checkIfRoleAllowed(elementRole))
      continue;
    const allowedProperties = getAllowedProperties(elementRole);
    for (const propertyName in inheritedProperty.properties) {
      if (allowedProperties.includes(propertyName)){
        const propertyValue: string = inheritedProperty.properties[propertyName].value;
        if (propertyValue && propertyValue.length > 0)
          selectorTokensData.push({ propertyRole: elementRole, propertyName, propertyValue, score: allowedProperties.indexOf(propertyName) });
      }
    }
  }

  return checkAndMakeSelectorTokens(selectorTokensData);
}

function checkAndMakeSelectorTokens(selectorTokens: selectorTokensData[]) {
  const result: SelectorToken[] = [];
  selectorTokens.forEach(selectorToken => {
    // Both propertyName and propertyRole shoudnt be text if they are use playwright default getByText Locator
    if (!(selectorToken.propertyName.toLowerCase() === 'text' && selectorToken.propertyRole.toLowerCase() === 'text')){

      let propertyValue = selectorToken.propertyValue;

      // Changing text if it is too long. Currently dont have {exact: true} support in getByRoleUI5.
      // This feature needs to be devloped further. Not ready right now.
      if (selectorToken.propertyName.toLowerCase() === 'text' && propertyValue.length > 70)
        propertyValue = suitableTextAlternatives(propertyValue).sort((a, b) => b.scoreBonus - a.scoreBonus)[0].text;

      // sometimes button(propertyRole) dont have text and have icon(propertyName) in that case
      // if (selectorToken.propertyName.toLowerCase() === 'icon' && propertyValue.includes('sap-icon://') && propertyValue.indexOf('sap-icon://') === 0)
      //   propertyValue = propertyValue.replace('sap-icon://', '');

      // // sometimes icon(propertyRole) have src(propertyName) which is an icon
      // if (selectorToken.propertyRole.toLowerCase() === 'icon' && selectorToken.propertyName.toLowerCase() === 'src' && propertyValue.includes('sap-icon://') && propertyValue.indexOf('sap-icon://') === 0)
      //   propertyValue = propertyValue.replace('sap-icon://', '');

      // Incase any more edge cases are added here add the corresponding code in createPropertyValueMatcher - packages/injected/src/sap/common.ts

      result.push({
        engine: 'ui5:role',
        selector: `${selectorToken.propertyRole}[${selectorToken.propertyName}=${escapeForAttributeSelector(propertyValue, false)}]`,
        score: ui5BasicScore + Math.trunc((selectorToken.score ? selectorToken.score : 0) / 10)
      });
    }
  });
  return result;
}

type selectorTokensData  = {propertyRole: string, propertyName: string, propertyValue: string, score?: number};

// ----------------------------------------------------
// Copied fron packages/injected/src/selectorGenerator.ts

function suitableTextAlternatives(text: string) {
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
