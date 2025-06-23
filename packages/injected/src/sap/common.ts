/**
 * Copyright (c) Arpit Sureka.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type UI5Node = {
  id: string;
  name: string;
  type: string;
  content: UI5Node[];
};

export function buildUI5TreeModel(nodeElement: Element, win: Window): UI5Node[] {
  const resultArray: UI5Node[] = [];
  _createUI5TreeModel(nodeElement, resultArray, win);

  function dfs(node: UI5Node) {
    if (node.name)
      node.name = node.name.split('.').pop() || node.name;
    if (node.content && node.content.length > 0) {
      for (const child of node.content)
        dfs(child);
    }
  }

  for (const rootNode of resultArray)
    dfs(rootNode);
  return resultArray;
}

export function checkSAPUI5(win: Window): boolean {
  return !!(win.sap && win.sap.ui && win.sap.ui.getCore && typeof win.sap.ui.getCore().byId === 'function');
}

/**
 * Returns the UI5 control by its ID.
 * @param sId - The ID of the UI5 control.
 * @param win - The window object where the UI5 control is located.
 * @returns The UI5 control if found, otherwise undefined.
 */
const _getElementById = function(sId: string, win: Window): any {
  if (typeof win.sap.ui.getCore().getElementById === 'function')
    return win.sap.ui.getCore().getElementById(sId);

  return win.sap.ui.getCore().byId(sId);
};

export const getElementFromUI5Id = function(id: string, window: Window): Element {
  try {
    const oControl = window.sap.ui.getCore().byId(id);
    return oControl?.getDomRef();
  } catch (error) {
    throw new Error(error);
  }
};

export function makeUI5XpathSelector(win: Window, nodeElement: Element): string | null {

  try {
    if (win.sap && win.sap.ui && win.sap.ui.getCore() && typeof win.sap.ui.getCore().byId === 'function') {
      let ui5SelectorMap_element: UI5Node[] = [];
      let currentElement: Element | null = nodeElement;
      while (ui5SelectorMap_element.length === 0 || ui5SelectorMap_element.length > 1) {
        if (currentElement === nodeElement.getRootNode() || currentElement === nodeElement.ownerDocument.body)
          return null;
        ui5SelectorMap_element = [];
        _createUI5TreeModel(currentElement, ui5SelectorMap_element, win);
        if (ui5SelectorMap_element.length === 0 || ui5SelectorMap_element.length > 1) {
          currentElement = currentElement.parentElement;
          if (!currentElement)
            return null;
        }
      }

      if (ui5SelectorMap_element.length > 1)
        UI5errorMessage(win, 'Multiple UI5 Controls found under the same element unable to make XPATH' + nodeElement.id);
      else if (ui5SelectorMap_element.length === 1 && ui5SelectorMap_element[0].id && /\d/.test(ui5SelectorMap_element[0].id))
        return null;
      else if (ui5SelectorMap_element.length === 1 && ui5SelectorMap_element[0].id)
        return `//*[@id="${ui5SelectorMap_element[0].id}"]`;
      // return getUI5XPathShort(ui5SelectorMap_element[0]);
      else
        UI5errorMessage(win, 'Error in makeUI5XpathSelector: ');

      return null;
    }
  } catch (error) {
    UI5errorMessage(win, 'Error in makeUI5XpathSelector: ' + error);
  }

  return null;
}

export function UI5errorMessage(win: Window, message: string): void {
  win.sap.ui.require(['sap/m/MessageBox'], function(MessageBox) {
    MessageBox.show(
        `Error Found Please raise error with SAP-Playwright team.\n + ${message}`, {
          icon: MessageBox.Icon.INFORMATION,
          title: 'SAP Playwright Error',
          actions: [MessageBox.Action.YES, MessageBox.Action.NO],
          emphasizedAction: MessageBox.Action.YES,
        }
    );
  });
}


const _createUI5TreeModel = function(nodeElement: Element, resultArray: UI5Node[], win: Window) {
  const node = nodeElement;
  let childNode = node.firstElementChild;
  const results = resultArray;
  let subResult = results;
  const control = _getElementById(node.id, win);

  if (node.getAttribute('data-sap-ui') && control) {

    results.push({
      id: control.getId(),
      name: control.getMetadata().getName(),
      type: 'sap-ui-control',
      content: [],
    });

    subResult = results[results.length - 1].content;
  } else if (node.getAttribute('data-sap-ui-area')) {

    results.push({
      id: node.id,
      name: 'sap-ui-area',
      type: 'data-sap-ui',
      content: [],
    });

    subResult = results[results.length - 1].content;
  }

  while (childNode) {
    _createUI5TreeModel(childNode, subResult, win);
    childNode = childNode.nextElementSibling;
  }
};
