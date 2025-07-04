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

// import { allowedProperties } from '@injected/sap/ui5selectorGenerator';

import { LocatorBase, LocatorFactory, LocatorOptions } from '../locatorGenerators';
import { parseAttributeSelector, ParsedSelectorPart } from '../selectorParser';

export type LocatorTypeSAP = 'ui5:role';

// Return example for getByRoleUI5('grid', {text: 'My Grid', exact: true})
// options = {
//   name: 'grid',
//   attrs: [
//     { name: 'text', value: 'My Grid' },
//   ],
//   exact: true
// }
// attrSelector.name = 'grid'
export function innerAsLocatorsSAP(part: ParsedSelectorPart, base: LocatorBase, factory: LocatorFactory): string[] | null {
  if (part.name === 'ui5:role') {
    const attrSelector = parseAttributeSelector(part.body as string, true);
    const options: LocatorOptions = { attrs: [] };
    options.exact = false;
    options.name = attrSelector.name;
    options.attrs = attrSelector.attributes.map(attr => {
      options.exact = options.exact || attr.caseSensitive;
      return {
        name: attr.name,
        value: attr.value,
      };
    });
    return [factory.generateLocator(base, 'ui5:role', attrSelector.name, options)];
  }
  return null;
}
