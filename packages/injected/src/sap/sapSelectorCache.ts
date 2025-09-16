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
import { cyrb53 } from '@sap/utils/hashing';
import { LRUCache2 } from '@sap/utils/LRUCache';

const sapSelectorCache = new LRUCache2<number, SelectorToken[][]>(100);
let currentUrl: string = '';

export function checkIfCacheContainsSAPSelector(injectedScript: InjectedScript, element: Element, allowText: boolean = true): SelectorToken[][] | undefined {
  if (currentUrl !== injectedScript.document.URL) {
    currentUrl = injectedScript.document.URL;
    sapSelectorCache.clear();
    return undefined;
  }

  const hashKey = cyrb53(element.outerHTML + (allowText ? 'true' : 'false'));

  return sapSelectorCache.get(hashKey);
}

export function addSAPSelectorInCache(injectedScript: InjectedScript, element: Element, allowText: boolean = true, selectorTokens: SelectorToken[][]) {
  if (currentUrl !== injectedScript.document.URL) {
    currentUrl = injectedScript.document.URL;
    sapSelectorCache.clear();
  }

  const hashKey = cyrb53(element.outerHTML + (allowText ? 'true' : 'false'));
  sapSelectorCache.set(hashKey, selectorTokens);
  return;
}
