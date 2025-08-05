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

import { UI5properties } from './types/properties';

export type UI5Node = {
  id: string;
  role: string;
  type: string;
  content: UI5Node[];
};

export function buildUI5TreeModel(nodeElement: Element, win: Window, depth: number | null = null): UI5Node[] {
  const resultArray: UI5Node[] = [];
  _createUI5TreeModel(nodeElement, resultArray, win, depth);
  return resultArray;
}

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
const _getElementById = function(sId: string, win: Window): any {
  if (typeof win.sap.ui.getCore().getElementById === 'function')
    return win.sap.ui.getCore().getElementById(sId);

  return win.sap.ui.getCore().byId(sId);
};

export const getElementFromUI5Id = function(id: string, window: Window): Element | null {
  try {
    const oControl = window.sap.ui.getCore().byId(id);
    if (!oControl)
      return null;
    return oControl?.getDomRef();
  } catch (error) {
    return null;
  }
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

// Need to add caching for performance
const _createUI5TreeModel = function(nodeElement: Element, resultArray: UI5Node[], win: Window, depth: number | null = null): void {

  if (depth !== null && depth <= 0)
    return;
  const node = nodeElement;
  let childNode = node.firstElementChild;
  const results = resultArray;
  let subResult = results;
  const control = _getElementById(node.id, win);
  let childDepth = depth;

  if (node.getAttribute('data-sap-ui') && control) {

    results.push({
      id: control.getId(),
      role: control.getMetadata().getName().split('.').pop(),
      type: 'sap-ui-control',
      content: [],
    });
    if (depth !== null)
      childDepth = depth - 1;
    subResult = results[results.length - 1].content;
  } else if (node.getAttribute('data-sap-ui-area')) {

    results.push({
      id: node.id,
      role: 'sap-ui-area',
      type: 'data-sap-ui',
      content: [],
    });
    if (depth !== null)
      childDepth = depth - 1;
    subResult = results[results.length - 1].content;
  }

  if (childDepth && childDepth <= 0)
    return;

  while (childNode) {
    _createUI5TreeModel(childNode, subResult, win, childDepth);
    childNode = childNode.nextElementSibling;
  }
};

// Control Properties Info
// ================================================================================
// Copied from chrome ui5 inspector extension

/**
 * Creates an object with all control properties.
 * @param {string} controlId
 * @returns {Object}
 * @private
 */
// Caching is not implemented yet, so this function will always return fresh data. -- Need to implement.
export const getPropertiesUsingControlId = function(controlId: string, win: Window): UI5properties | undefined {
  const control = _getElementById(controlId, win);
  let properties: UI5properties | undefined;

  try {
    if (control) {
      const inheritedProperties = _getInheritedProperties(control, win) || [];
      const ownProperties = _getOwnProperties(control);
      if (inheritedProperties && ownProperties) {
        properties = {
          own: ownProperties,
          inherited: inheritedProperties,
        };
      }
    }
  } catch (error) {
    throw new Error(`Error in getPropertiesUsingControlId: ${error}`);
  }
  return properties;
};

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

/**
 * Creates an object with the control properties that are not inherited.
 * @param {Object} control - UI5 control.
 * @returns {Object}
 * @private
 */
// This function can be optimized it is giving a lot of data about properties which are not being used. --- Need to implement.
const _getOwnProperties = function(control: any) {
  const result = Object.create(null);
  const controlPropertiesFromMetadata = control.getMetadata().getProperties();

  result.meta = Object.create(null);
  result.meta.controlName = control.getMetadata().getName();

  result.properties = Object.create(null);
  Object.keys(controlPropertiesFromMetadata).forEach(function(key) {
    result.properties[key] = Object.create(null);
    result.properties[key].value = control.getProperty(key);
    result.properties[key].type = controlPropertiesFromMetadata[key].getType().getName ? controlPropertiesFromMetadata[key].getType().getName() : '';
    result.properties[key].isDefault = _getDefaultValueForProperty(control, key) === control.getProperty(key);
  });

  return result;
};

/**
 * Creates an array with the control properties that are inherited.
 * @param {Object} control - UI5 control.
 * @returns {Array}
 * @private
 */
const _getInheritedProperties = function(control: any, win: Window): any[] {
  const result: any[] = [];
  let inheritedMetadata = control.getMetadata().getParent();

  while (inheritedMetadata instanceof win.sap.ui.core.ElementMetadata) {
    result.push(_copyInheritedProperties(control, inheritedMetadata));
    inheritedMetadata = inheritedMetadata.getParent();
  }

  return result;
};

/**
 * Copies the inherited properties of a UI5 control from the metadata.
 * @param {Object} control - UI5 Control.
 * @param {Object} inheritedMetadata - UI5 control metadata.
 * @returns {Object}
 * @private
 */
const _copyInheritedProperties = function(control: any, inheritedMetadata: any) {
  const inheritedMetadataProperties = inheritedMetadata.getProperties();
  const result = Object.create(null);

  result.meta = Object.create(null);
  result.meta.controlName = inheritedMetadata.getName();

  result.properties = Object.create(null);
  Object.keys(inheritedMetadataProperties).forEach(function(key) {
    result.properties[key] = Object.create(null);
    result.properties[key].value = inheritedMetadataProperties[key].get(control);
    result.properties[key].type = inheritedMetadataProperties[key].getType().getName ? inheritedMetadataProperties[key].getType().getName() : '';
    result.properties[key].isDefault = _getDefaultValueForProperty(control, key) === control.getProperty(key);
  });

  return result;
};

/**
 * Returns the default value for the given property.
 * @param {sap.ui.core.Element} oControl
 * @param {string} sPropertyName
 * @returns {*} The default value for the given property
 */
function _getDefaultValueForProperty(oControl: any, sPropertyName: any): string {
  const oProperty = oControl.getMetadata().getProperty(sPropertyName);
  if (typeof oProperty.getDefaultValue === 'function')
    return oProperty.getDefaultValue();
  return oProperty.defaultValue;
}
