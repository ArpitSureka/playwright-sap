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
import { parseAttributeSelector } from '@isomorphic/selectorParser';

import { buildUI5TreeModel, checkSAPUI5, getElementFromUI5Id, UI5Node } from './common';

export function ui5RoleEngine(): SelectorEngine {
  return {
    queryAll: (scope: SelectorRoot, selector: string): Element[] => {

      const parsed = parseAttributeSelector(selector, true);
      const role = parsed.name.toLowerCase();

      if (!role)
        throw new Error(`Role must not be empty`);

      const document = scope.ownerDocument || scope;
      const window = document?.defaultView;

      if (!window)
        throw new Error(`Window error UI5 Selector Engine`);
      if (!checkSAPUI5(window))
        throw new Error(`Window error UI5 Selector Engine`);

      const ui5DocumentTree = buildUI5TreeModel(document.body, window);

      if (parsed.attributes[0].name === 'id')
        return ui5IdSelectorEngine(ui5DocumentTree, role, parsed.attributes[0].value, window);
      else
        throw new Error(`Role ${role} is not supported by UI5 Selector Engine`);
    }
  };
}

export function ui5IdSelectorEngine(ui5Tree: UI5Node[], role: string, id: string, window: Window): Element[] {
  // Depth-first search for nodes matching id and role
  const result: Element[] = [];

  function dfs(node: UI5Node) {
    if (node.id === id && node.name === role && node.id === id)
      result.push(getElementFromUI5Id(node.id, window));

    if (node.content && node.content.length > 0) {
      for (const child of node.content)
        dfs(child);
    }
  }

  for (const rootNode of ui5Tree)
    dfs(rootNode);

  return result;
}
