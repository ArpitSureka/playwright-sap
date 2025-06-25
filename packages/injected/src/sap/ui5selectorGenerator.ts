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
import { buildUI5TreeModel, checkSAPUI5, UI5errorMessage, UI5Node } from '@sap/common';


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
        ui5SelectorMap_element = buildUI5TreeModel(currentElement, win, 2);
        if (ui5SelectorMap_element.length === 0 || ui5SelectorMap_element.length > 1) {
          currentElement = currentElement.parentElement;
          if (!currentElement)
            return [];
        }
      }

      if (ui5SelectorMap_element.length === 1 && ui5SelectorMap_element[0].id)
        candidates.push([{ engine: 'ui5:role', selector: `${ui5SelectorMap_element[0].name}[id=${ui5SelectorMap_element[0].id}]`, score: 1 }]);
      else
        UI5errorMessage(win, 'Error in makeUI5XpathSelector: ');

      return candidates;
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in makeUI5XpathSelector: ' + error);
  }

  return candidates;
}
