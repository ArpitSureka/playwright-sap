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

import { buildUI5TreeModel, UI5Node } from '@sap/common';

export function checkSAPSelector(results: Element[], targetElement: Element, window: Window): Boolean {
  let currentElement: Element | null = targetElement;
  if (results.length !== 1)
    return false;
  let ui5TargetTree: UI5Node[] = [];
  const resultUI5Tree = buildUI5TreeModel(results[0], window, 1);
  while (ui5TargetTree.length === 0 && currentElement){
    ui5TargetTree = buildUI5TreeModel(currentElement, window, 1);
    currentElement = currentElement.parentElement;
  }
  if (currentElement && resultUI5Tree && ui5TargetTree.length === 1 && resultUI5Tree.length === 1 && resultUI5Tree[0].id === ui5TargetTree[0].id && resultUI5Tree[0].name === ui5TargetTree[0].name)
    return true;

  return false;
}
