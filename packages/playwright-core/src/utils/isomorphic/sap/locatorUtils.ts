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

import { escapeForAttributeSelector } from '@isomorphic/stringUtils';

export type ByRoleUI5Options = Record<string, string>;

export function getByRoleUI5Selector(role: string, options: ByRoleUI5Options = {}, exact: boolean = false): string {
  const optionsString: string[] = [];

  if (Object.entries(options).length > 1)
    throw new Error('Support for multiple properties have not been added yet.');

  for (const [key, value] of Object.entries(options))
    optionsString.push(`[${key}=${escapeForAttributeSelector(value, exact)}]`);

  return `internal:role=${role}${optionsString.join('')}`;
}
