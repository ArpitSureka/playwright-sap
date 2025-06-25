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

import { buildUI5Selectors } from './ui5selectorGenerator';
import { checkSAPSelector } from './common';

export function buildSAPSelectors(injectedScript: InjectedScript, element: Element): SelectorToken[][] {
  return buildUI5Selectors(injectedScript, element);
}

export function chooseFirstSelectorSAP(window: Window, tokens: SelectorToken[], targetElement: Element, result: Element[]): SelectorToken[] | null {
  let sapSelector = false;
  tokens.forEach(selector => sapSelector = selector.engine === 'ui5:role' || sapSelector);
  // Not written case for nth selector
  if (sapSelector && result.length === 1) {
    if (checkSAPSelector(result, targetElement, window))
      return tokens;
  }
  return [];
}
