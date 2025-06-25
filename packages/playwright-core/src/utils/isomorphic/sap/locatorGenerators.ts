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

import { LocatorBase, LocatorFactory, LocatorOptions } from '../locatorGenerators';
import { parseAttributeSelector, ParsedSelectorPart } from '../selectorParser';

export type LocatorTypeSAP = 'ui5:role';

export function innerAsLocatorsSAP(part: ParsedSelectorPart, base: LocatorBase, factory: LocatorFactory): string[] | null {
  if (part.name === 'ui5:role') {
    const attrSelector = parseAttributeSelector(part.body as string, true);
    const options: LocatorOptions = { attrs: [] };
    for (const attr of attrSelector.attributes) {
      if (attr.name === 'id') {
        options.exact = attr.caseSensitive;
        options.name = attr.value;
      }
    }
    return [factory.generateLocator(base, 'ui5:role', attrSelector.name, options)];
  }
  return null;
}
