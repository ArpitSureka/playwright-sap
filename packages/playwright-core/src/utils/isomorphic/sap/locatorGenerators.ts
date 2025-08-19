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

// import { allowedProperties } from '@injected/sap/ui5selectorGenerator';

import { LocatorBase, LocatorFactory, LocatorOptions } from '../locatorGenerators';
import { parseAttributeSelector, ParsedSelectorPart } from '../selectorParser';
import { sidPrefixMapping } from './sidPrefixMapping';

export type LocatorTypeSAP = 'ui5:role' | 'sid';

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
  if (part.name === 'sid' && typeof part.body === 'string')
    return [factory.generateLocator(base, 'sid', part.body as string)];

  return null;
}

export function javascriptSIDLocatorGenerator(sid: string): string {

  // Add code to handle the SID Role locator generation
  if (sid.split('/').length === 3) {
    const [wnd, usr, type] = sid.replace("'", '').replace('"', '').split('/');
    if (!wnd.includes('[') || !wnd.includes(']'))
      return `locateSID(${sid})`;

    let prefixPart: string | undefined;
    let namePart: string | undefined;
    let wndPart: number | undefined;
    let posPart: number | undefined;
    let usrPart: string | undefined;

    // wndNum = '1'
    const wndNum = wnd.split('[')[1].split(']').filter(val => val !== '');
    if (Number(wndNum[0]) !== 0)
      wndPart = Number(wndNum[0]);

    if (usr !== 'usr')
      usrPart = usr;

    // for cases like type = lblCOCD
    const typeSplit = type.replace("'", '').replace('"', '').match(/^([^A-Z]*)(.*)$/);
    if (wnd.split('[')[0] === 'wnd' && typeSplit && typeSplit.length === 3 && !typeSplit.includes(':') && !typeSplit.includes('/')) {
      if (Object.keys(sidPrefixMapping).includes(typeSplit[1]) && wndNum.length === 1 && Number.isInteger(Number(wndNum))) {
        prefixPart = sidPrefixMapping[typeSplit[1]];
        namePart = typeSplit[2];
      }
    }

    // for cases like type = btn[12]
    if (!prefixPart && !namePart && type.replace("'", '').replace('"', '').includes('[') && type.replace("'", '').replace('"', '').includes(']') && type.replace("'", '').replace('"', '').split(']').filter(val => val !== '').length === 1) {
      const typeName = type.replace("'", '').replace('"', '').split('[')[0];
      const typeIndex = type.replace("'", '').replace('"', '').match(/\[(.*?)\]/);
      if (Object.keys(sidPrefixMapping).includes(typeName) && typeIndex && typeIndex.length === 2 && Number.isInteger(Number(typeIndex[1]))) {
        prefixPart = sidPrefixMapping[typeName];
        posPart = Number(typeIndex[1]);
      }
    }

    const options: string[] = [];
    let optionsPart: string = '';

    // This should not happen. Some bug if this is reached.
    if ((posPart !== undefined && namePart) || prefixPart === undefined)
      return `locateSID(${sid})`;

    // postPart can be 0 so dont use it like this if(posPart)
    if (posPart !== undefined)
      options.push(`pos: ${posPart}`);

    if (namePart)
      options.push(`name: '${namePart}'`);

    if (usrPart)
      options.push(`sub: '${usrPart}'`);

    if (wndPart !== undefined)
      options.push(`wnd: ${wndPart}`);

    if (options.length !== 0)
      optionsPart = `, { ${options.join(', ')} }`;

    return `getByRoleSID('${prefixPart}'${optionsPart})`;

  }

  return `locateSID(${sid})`;
}
