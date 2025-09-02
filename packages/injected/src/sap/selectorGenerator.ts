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
import { checkSAPUI5 } from '@sap/common';

import { buildUI5RoleSelectors } from './ui5RoleSelectorGenerator';
import { checkSAPSelector } from './common';
import { getSIDandElementFromElement, sidSelectorGenerator } from './sidSelectorGenerator';
import { buildUI5XpathSelectors } from './ui5XpathSelectorGenerator';

const kNthScoreUI5 = 10;

export function buildSAPSelectors(injectedScript: InjectedScript, element: Element, allowText: boolean = true): SelectorToken[][] {

  // console.log('Hello');
  if (checkSAPUI5(injectedScript.window)) {
    const ui5RoleSelector = buildUI5RoleSelectors(injectedScript, element, allowText);
    if (ui5RoleSelector.length)
      return ui5RoleSelector;
    const ui5XpathSelector = buildUI5XpathSelectors(injectedScript, element);
    if (ui5XpathSelector.length)
      return ui5XpathSelector;
  }

  return sidSelectorGenerator(element);
}

// Only UI5 Selectors require this function sid based selectors would automatically work with existing chooseFirstSelector function.
export function chooseFirstSelectorSAP(window: Window, tokens: SelectorToken[], targetElement: Element, result: Element[]): SelectorToken[] | null {

  let ui5Selector: string | undefined;
  tokens.forEach(selector => ui5Selector = ['ui5:role', 'ui5:xpath'].includes(selector.engine) ?  selector.engine : ui5Selector);

  if (ui5Selector && result.length === 1) {
    if (checkSAPSelector(result[0], targetElement, window))
      return tokens;
  } else if (ui5Selector && result.length > 1) {
    for (let index = 0; index < result.length; index++) {
      if (checkSAPSelector(result[index], targetElement, window)){
        const nth: SelectorToken = { engine: 'nth', selector: String(index), score: kNthScoreUI5 };
        return [...tokens, nth];
      }
    }
  }

  let sidSelector = false;
  tokens.forEach(selector => sidSelector = selector.engine === 'sid' || sidSelector);
  if (sidSelector) {
    const sidAndElementFromElement = getSIDandElementFromElement(targetElement);
    if (result.length === 1 && sidAndElementFromElement) {
      if (result[0] === sidAndElementFromElement.element)
        return tokens;
    } else if (result.length > 1 && sidAndElementFromElement) {
      for (let index = 0; index < result.length; index++) {
        if (result[index] === sidAndElementFromElement.element) {
          const nth: SelectorToken = { engine: 'nth', selector: String(index), score: kNthScoreUI5 };
          return [...tokens, nth];
        }
      }
    }
  }


  return [];
}
