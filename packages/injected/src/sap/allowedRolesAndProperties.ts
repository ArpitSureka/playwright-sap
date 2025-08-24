/**
 * Copyright (c) Arpit Sureka.
 * Orignal Copyright (c) Microsoft Corporation.
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

// This list is case-sensitive and should match the UI5 control properties. UI5 properties follow camelCase. Also this is ordered by priority.
// All other properties are implicitly denied.
// Created via test project via analytics - mongobb - ui5 table analyticsClean
const implicitlyAllowedProperties: string[] = [
  'text', 'title', 'viewName', 'value', 'src', 'key',
  'icon', 'number', 'description', 'headerText', 'href', 'label',
  'selectedKey', 'placeholder', 'target', 'selectedItemId', 'd', 'group',
  'name', 'to', 'header', 'definition', 'alt', 'shapeId',
  'sortProperty', 'filterProperty', 'htmlText', 'from', 'groupName', 'total',
  'state', 'userName', 'footer', 'titleAbbreviation', 'percentage', 'displayValue',
  'subheader', 'info', 'defaultSpan', 'value2', 'iconSrc', 'initials',
  'value1', 'parentGroupKey', 'valueStateText', 'targetValue', 'userPicture', 'filterValue',
  'threshold', 'entitySet', 'objectTitle', 'actualValueLabel', 'propertyKey', 'persistencyKey',
  'noDataText', 'count', 'position', 'stringValue', 'mask', 'laneId', 'type',
  'stateText', 'subtitle', 'displayValue1', 'fraction', 'design', 'backgroundImage',
  'displayFormat', 'centerPosition', 'deltaDisplayValue', 'status', 'valueFormat', 'forecastValue',
  'displayValue2', 'ariaLabelledBy', 'objectSubtitle', 'tooltipLabel', 'dateTime', 'source',
  'pickerText', 'visibleRowCount', 'badgeIcon', 'currency', 'contentText', 'chartBindingPath',
  'title2', 'leftTopLabel', 'viewBox', 'percentValue', 'titleStyle', 'unit',
  'rows', 'targetValueLabel', 'title1', 'rightTopLabel', 'leftBottomLabel', 'authorPicture',
  'currentLocationText', 'level', 'homeIcon', 'layout', 'columns', 'iconAlt',
  'intro', 'groupTitle', 'fieldName', 'authorInitials', 'numberUnit', 'manifest',
  'backgroundDesign', 'styleClass', 'selectedIndex', 'valueHelpIconSrc', 'defaultIndent', 'ariaLabel',
  'ariaLabelButton1', 'entitySetName', 'display', 'textLabel', 'semanticObject', 'timestamp',
  'authorName', 'dialogTitle', 'intervals', 'ariaHasPopup', 'accessibleRole', 'lifecycle',
  'style', 'stateAnnouncementText', 'selectionBehavior', 'buttonText', 'fallbackIcon', 'badgeTooltip',
  'uploadUrl', 'noDataDescription', 'cols', 'set', 'media', 'defaultKey',
  'textButton1', 'textButton2', 'labelTooltip', 'controlTooltip', 'systemInfo', 'basicSearchFieldName',
  'rightBottomLabel', 'additionalText', 'shape', 'gridTemplateColumns', 'datetime', 'serviceUrl',
  'url', 'justifyContent', 'wrap', 'importance', 'defaultFilterOperator', 'headerSpan',
  'headerDesign', 'titleLevel', 'enteredValue', 'defaultTransitionName', 'subSectionLayout', 'menuPosition',
  'displayShape', 'popoverTitle', 'statusText', 'iconDisplayShape', 'imageShape', 'finishButtonText',
  'secondTitle', 'priority', 'appShortcut', 'indicator', 'scale', 'headerIcon',
  'objectImageURI', 'objectImageShape', 'displayTime', 'searchPlaceholder', 'noDataTitle', 'controlContext',
  'headerCheckBoxState', 'totalScale', 'expression', 'sender', 'groupBy', 'valueStatus',
  'sideContentVisibility', 'sideContentFallDown', 'gridTemplateRows', 'gridAutoFlow', 'toolbarTitle', 'bindingContextPath',
  'months', 'days', 'items', 'viewKey', 'startHour', 'endHour'
];

export const obviousTextProperties = ['text', 'title', 'value', 'description', 'headerText', 'header', 'htmlText', 'noDataText'];

const allowedWithoutProperties: string[] = [
  'TablePopin', 'Row', 'ColumnListItem', 'InfoButton', 'SmartToggle', 'CustomListItem', 'GridListItem', 'ToolbarSeparator',
  'GroupElement', 'ColumnHeaderLabel', 'SemanticPage', 'AssociativeSplitter', 'ResponsiveSplitterPage', 'ResponsiveSplitter',
  'ToolPage', 'WizardProgressNavigator', 'DrawerToolbar', 'SelectionDetails', 'FacetFilter', 'AlignedFlowLayout', 'QuickViewCard',
  'SemanticGroupElement', 'TabStrip', 'AvatarGroup', 'Search', 'CustomTreeItem', 'SidePane', 'ToolArea', 'MessageView', 'SubHeader'
];

// This config is case-sensitive and should match the UI5 control properties. UI5 properties follow camelCase. Also this is ordered by priority.
const propertiesConfig: PropertiesConfig = {
  'Icon': {
    explicitlyAllowed: ['src'],
  },
  'SearchField': {
    explicitlyAllowed: ['*'], // This means role is allowed without any properties
  },
  'PullToRefresh': {
    explicitlyAllowed: ['*'], // This means role is allowed without any properties
  },
  'Column': { // want to allow this with getByRoleUI5('Column').nth(3)
    explicitlyAllowed: ['*'], // This combination together insures that the role can be used but has to be used without properties.
    explicitlyDenied: ['*'],  // see the getAllowedProperties, checkIfRoleAllowed, checkIfRoleAllowedWithoutProperties functions to understand its usage.
  },
  'ColumnListItem': { // want to allow this with getByRoleUI5('ColumnListItem').nth(3)
    explicitlyAllowed: ['*'], // This combination together insures that the role can be used but has to be used without properties.
    explicitlyDenied: ['*'],  // see the getAllowedProperties, checkIfRoleAllowed, checkIfRoleAllowedWithoutProperties functions to understand its usage.
  }
  // 'StandardListItem': {
  //   explicitlyDenied: ['*'] // This means role is never allowed
  // },
};

export function getAllowedProperties(propertyRole: string): string[] {
  let allowedProperties = structuredClone(implicitlyAllowedProperties);

  if (propertyRole in propertiesConfig) {
    const { explicitlyAllowed, explicitlyDenied } = propertiesConfig[propertyRole];

    if (explicitlyDenied && explicitlyDenied.includes('*'))
      return [];

    if (explicitlyAllowed) {
      allowedProperties.push(...explicitlyAllowed);
      allowedProperties = removeItems(allowedProperties, ['*']); // Remove '*' in case it is explicitly allowed property
    }

    if (explicitlyDenied)
      allowedProperties = removeItems(allowedProperties, explicitlyDenied); // Remove explicitly denied properties from the allowed list

  }
  return allowedProperties;
}

export function checkIfRoleAllowed(propertyRole: string): boolean {

  if (propertyRole in propertiesConfig) {
    const { explicitlyDenied } = propertiesConfig[propertyRole];
    if (explicitlyDenied && explicitlyDenied.includes('*'))
      return false;
  } // If '*' is explicitly denied, then it is not allowed

  return true;
}

export function checkIfRoleAllowedWithoutProperties(propertyRole: string): boolean {

  if (propertyRole in propertiesConfig) {
    const { explicitlyAllowed } = propertiesConfig[propertyRole];
    if (explicitlyAllowed && explicitlyAllowed.includes('*'))
      return true; // If '*' is explicitly allowed, then all properties are allowed for this role
  }

  if (allowedWithoutProperties.includes(propertyRole))
    return true;

  return false;
}

// Define the shape of a single property config
type PropertyConfigRules = {
  explicitlyAllowed?: string[];
  explicitlyDenied?: string[];
};

// Make the outer object type, where keys are strings (like "Icon")
type PropertiesConfig = Record<string, PropertyConfigRules>;

function removeItems(list1: string[], list2: string[]): string[] {
  return list1.filter(item => !list2.includes(item));
}
