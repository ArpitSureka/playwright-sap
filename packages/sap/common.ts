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
import * as properites from '@sap/src/properties';

import { buildUI5XmlTree } from './src/UI5XML';

export type UI5Node = {
  id: string;
  role: string;
  type: string;
  content: UI5Node[];
};

// Checks if the window is SAP UI5 window
export function checkSAPUI5(win: Window): boolean {
  return !!(win.sap && win.sap.ui && win.sap.ui.getCore && typeof win.sap.ui.getCore().byId === 'function');
}

/**
 * Returns the UI5 control by its ID.
 * @param sId - The ID of the UI5 control.
 * @param win - The window object where the UI5 control is located.
 * @returns The UI5 control if found, otherwise undefined.
 */
export const _getElementById = function(sId: string, win: Window): any {
  if (typeof win.sap.ui.getCore().getElementById === 'function')
    return win.sap.ui.getCore().getElementById(sId);

  return win.sap.ui.getCore().byId(sId);
};

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

// Note that this returns element from UI5 Dom and not the website dom.
export function getClosestUI5ElementFromCurrentElement(element: Element, window: Window): Element | null {

  let currentElement: Element | null = element;
  const UI5XmlDom = buildUI5XmlTree(window.document, window);

  while (1) {
    if (!currentElement || currentElement === element.getRootNode() || currentElement === element.ownerDocument.body)
      return null;
    if (_getElementById(currentElement.id, window)) { // _getElementById can be replaced by UI5XmlDom.getElementById
      const ui5Elem = UI5XmlDom.getElementById(currentElement.id);
      if (ui5Elem && checkOverlapXML(ui5Elem, element))
        break;
    }
    currentElement = currentElement.parentElement;
  }

  if (!currentElement || currentElement === (window.document.body as Element))
    return null; // This line should not be reachable

  const ui5Elem = UI5XmlDom.getElementById(currentElement.id);
  if (ui5Elem)
    return ui5Elem;

  return null; // This line should not be reachable
}

export const checkOverlapXML = function(UI5XmlEle: Element, targetElement: Element): boolean {

  if (UI5XmlEle.id === '')
    return false;

  const container = document.getElementById(UI5XmlEle.id);

  if (container && targetElement && container.contains(targetElement))
    return true;

  return false;

};

export const getPropertiesUsingControlId = properites.getPropertiesUsingControlId;
