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

import { LRUCache2 } from './utils/LRUCache';

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

// Assume each map element is taking 0.02 MB of storage. Total space now taken by cache is approx 40 mb.
// Current caching algo is very bad. There is a lot of repitative data in cache. as i am storing again and again same thing in children.
/**
Parent1
  |- SubParent
        |-Child - This is stored 3 times 1st time is child, then in subparent, then in Parent 1
 */
const cache_ui5Tree = new LRUCache2<string, UI5Node[]>(2000);

const generateHash = function(str: string): string {
  let hash = 0;
  for (const char of str) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash.toString();
};

function hashElement(el: Element, depth?: number | null): string {
  if (depth)
    return generateHash(depth.toString() + el.outerHTML + depth.toString());
  return generateHash(el.outerHTML);
}

export function buildUI5TreeModel(nodeElement: Element, win: Window, depth: number | null = null): UI5Node[] {

  if (depth !== null && depth <= 0)
    return [];

  const children: UI5Node[] = [];
  let child = nodeElement.firstElementChild;

  const decreaseDepth = (nodeElement.getAttribute('data-sap-ui') || nodeElement.getAttribute('data-sap-ui-area')) ? 1 : 0;

  while (child) {
    const key = hashElement(child, depth);
    const cachedResult = cache_ui5Tree.get(key);
    if (cachedResult) {
      children.push(...cachedResult);
    } else {
      const childNodes = buildUI5TreeModel(child, win, depth ? depth - decreaseDepth : null);
      children.push(...childNodes);
      cache_ui5Tree.set(key, childNodes);
    }
    child = child.nextElementSibling;
  }

  const control = _getElementById(nodeElement.id, win);

  if (nodeElement.getAttribute('data-sap-ui') && control) {
    return [{
      id: control.getId(),
      role: control.getMetadata().getName().split('.').pop() || '',
      type: 'sap-ui-control',
      content: children,
    }];
  } else if (nodeElement.getAttribute('data-sap-ui-area')) {
    return [{
      id: nodeElement.id,
      role: 'sap-ui-area',
      type: 'data-sap-ui',
      content: children,
    }];
  }

  return children;
}

export const checkOverlap = function(ui5SelectorMap_element: UI5Node[], targetElement: Element): UI5Node | null {

  for (const item of ui5SelectorMap_element) {
    const container = document.getElementById(item.id);
    if (!container || !targetElement)
      continue;

    if (container.contains(targetElement))
      return item;
  }
  return null;
};

export const getPropertiesUsingControlId = properites.getPropertiesUsingControlId;
