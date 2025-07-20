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

import { SelectorEngine, SelectorRoot } from '@injected/selectorEngine';

export const SIDSelectorEngine: SelectorEngine = {
  queryAll(root: SelectorRoot, selector: string): Element[] {
    const document = root.ownerDocument || root;
    if (!document)
      return [];
    const result: Element[] = [];
    const sid_xpath =  `//*[contains(@lsdata, '${selector}')]`;
    const it = document.evaluate(sid_xpath, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
    for (let node = it.iterateNext(); node; node = it.iterateNext()) {
      if (node.nodeType === Node.ELEMENT_NODE)
        result.push(node as Element);
    }
    return result;
  }
};
