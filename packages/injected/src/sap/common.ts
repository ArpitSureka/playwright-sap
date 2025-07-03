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

// This function is used to check sap selectror, wether result and target element has the same ui5 parent element
export function checkSAPSelector(result: Element, targetElement: Element, window: Window): Boolean {
  let currentElement: Element | null = targetElement;
  let ui5TargetTree: UI5Node[] = [];
  const resultUI5Tree = buildUI5TreeModel(result, window, 1);
  while (ui5TargetTree.length === 0 && currentElement){
    ui5TargetTree = buildUI5TreeModel(currentElement, window, 1);
    currentElement = currentElement.parentElement;
  }
  if (currentElement && resultUI5Tree && ui5TargetTree.length === 1 && resultUI5Tree.length === 1 && resultUI5Tree[0].id === ui5TargetTree[0].id && resultUI5Tree[0].name === ui5TargetTree[0].name)
    return true;

  return false;
}

// Inspired from packages/injected/src/injectedScript.ts - createTextMatcher
export function createPropertyValueMatcher(propertyValue: string, propertyName: string, propertyRole: string, exact: boolean = false): (text: string) => boolean {


  // Cases added corresponding to the code in checkAndMakeSelectorTokens - packages/injected/src/sap/common.ts
  if (propertyName.toLowerCase() === 'icon' || (propertyRole.toLowerCase() === 'icon' && propertyName.toLowerCase() === 'src'))
    return (elementValue: string) => elementValue.includes(propertyValue);

  if (propertyName.toLowerCase() !== 'text') {
    if (exact)
      return (elementValue: string) => elementValue === propertyValue;
    else
      return (elementValue: string) => elementValue.toLowerCase() === propertyValue.toLowerCase();
  }

  // This is a regex checker in case propertyName. regex wont come from codegen but if the user explicitly tries to use regex in code.
  if (propertyValue[0] === '/' && propertyValue.lastIndexOf('/') > 0) {
    const lastSlash = propertyValue.lastIndexOf('/');
    const re = new RegExp(propertyValue.substring(1, lastSlash), propertyValue.substring(lastSlash + 1));
    return  (elementValue: string) => re.test(elementValue);
  }

  // In case the user explicitly adds exact = true - will only work when propertyName is text.
  // Exact = true dosnt come directly from codegen.
  if (exact)
    return  (elementValue: string) => elementValue === propertyValue ;

  // Currently i mode is the default if present or not prosent
  return (elementValue: string) => elementValue.toLowerCase().includes(propertyValue.toLowerCase()) ;
}
