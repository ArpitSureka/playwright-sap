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

import { escapeForAttributeSelector } from '../stringUtils';
import { sidPrefixMapping } from './sidPrefixMapping';

export type ByRoleUI5Properties = Record<string, string>;
export type ByRoleUI5Options = {
  exact?: boolean,
};

export type ByRoleSIDOptions = {
  name: string,
  wnd?: number | undefined
};

export function getByRoleUI5Selector(role: string, properties: ByRoleUI5Properties = {}, options: ByRoleUI5Options = {}): string {
  const optionsString: string[] = [];

  if (Object.entries(properties).length > 1)
    throw new Error('Support for multiple properties have not been added yet.');

  for (const [key, value] of Object.entries(properties))
    optionsString.push(`[${key}=${escapeForAttributeSelector(value, !!options.exact)}]`);

  return `ui5:role=${role}${optionsString.join('')}`;
}

export function locateSIDSelector(sid: string): string {
  return `sid=${sid}`;
}

export function getByRoleSIDSelector(role: string, options: ByRoleSIDOptions): string {
  if (!Object.values(sidPrefixMapping).includes(role))
    throw new Error('Invalid SID role name provided.');

  const prefix = Object.entries(sidPrefixMapping).find(([k, v]) => v === role)?.[0];
  if (!prefix)
    throw new Error(`Invalid SID role name provided: ${role}`);

  const wndPart = options.wnd ? `wnd[${options.wnd}]` : 'wnd[0]';
  return `sid=${wndPart}/usr/${prefix}${options.name}`;

}
