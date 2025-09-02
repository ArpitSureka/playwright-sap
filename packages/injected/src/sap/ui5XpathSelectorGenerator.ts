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
import { buildUI5TreeModel, checkSAPUI5, UI5errorMessage } from '@sap/common';


import { getShortestUniqueXPathInUI5DOM, getClosestUI5ElementFromCurrentElement } from './common';

// Score for UI5 Xpath selectors - Kept greater than getBytext selector
const ui5XpathBasicScore = 150;

// Builds UI5 Selectors
// Add no text option in buildUI5Selectors to work with expect text feature.
export function buildUI5XpathSelectors(injectedScript: InjectedScript, element: Element): SelectorToken[][] {

  const candidates: SelectorToken[][] = [];
  const win = injectedScript.window;

  try {
    if (checkSAPUI5(win)) {

      const ui5SelectorMap_element = buildUI5TreeModel(injectedScript.document.body, win);

      const ui5_element = getClosestUI5ElementFromCurrentElement(element, injectedScript);
      if (!ui5_element)
        return [];

      const shortXpath = getShortestUniqueXPathInUI5DOM(ui5SelectorMap_element, ui5_element.id);
      if (!shortXpath)
        return [];

      return [[{
        engine: 'ui5:xpath',
        selector: shortXpath,
        score: ui5XpathBasicScore
      }]];
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in making UI5 Xpath Selector: ' + error);
  }

  return candidates;
}
