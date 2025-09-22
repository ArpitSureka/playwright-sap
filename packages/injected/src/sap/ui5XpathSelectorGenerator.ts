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
import { checkSAPUI5, getClosestUI5ElementFromCurrentElement, UI5errorMessage } from '@sap/common';
import { buildUI5XmlTree } from '@sap/src/UI5XML';
import { getXpathById } from '@sap/src/UI5Xpath';


// Score for UI5 Xpath selectors - Kept greater than getBytext selector.
// Not satisfied with the UI5 Xpath Performance. Kepping it Somewhat high only.
const ui5XpathBasicScore = 200;

// Builds UI5 Selectors
// Add no text option in buildUI5Selectors to work with expect text feature.
export function buildUI5XpathSelectors(injectedScript: InjectedScript, element: Element): SelectorToken[][] {

  const candidates: SelectorToken[][] = [];
  const win = injectedScript.window;

  try {
    if (checkSAPUI5(win)) {

      const UI5XmlDom = buildUI5XmlTree(injectedScript.document, win);
      const ui5_element = getClosestUI5ElementFromCurrentElement(element, win);
      if (!ui5_element)
        return [];

      const shortXpath = getXpathById(UI5XmlDom, ui5_element.id);
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
