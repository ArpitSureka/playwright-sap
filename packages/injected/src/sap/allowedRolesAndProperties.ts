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

// This list is case-sensitive and should match the UI5 control properties. UI5 properties follow camelCase. Also this is ordered by priority.
// All other properties are implicitly denied.
const implicitlyAllowedProperties = ['text', 'label', 'value', 'title', 'name', 'placeholder', 'ariaLabelledBy', 'icon'];

// This config is case-sensitive and should match the UI5 control properties. UI5 properties follow camelCase. Also this is ordered by priority.
const propertiesConfig: PropertiesConfig = {
  'Icon': {
    explicitlyAllowed: ['src'],
    explicitlyDenied: []
  },
};

export function getAllowedProperties(propertyRole: string): string[] {
  let allowedProperties = implicitlyAllowedProperties;

  if (propertyRole in propertiesConfig){
    const { explicitlyAllowed, explicitlyDenied } = propertiesConfig[propertyRole];

    allowedProperties.push(...explicitlyAllowed);

    // Remove explicitly denied properties from the allowed list
    allowedProperties = removeItems(allowedProperties, explicitlyDenied);
  }

  return allowedProperties;
}

// This list is case-sensitive
const explicitDeniedRoles = ['StandardListItem'];
const rolesAllowedWithoutProperties = ['SearchField'];

export function checkIfRoleAllowed(propertyRole: string): boolean {

  if (explicitDeniedRoles.includes(propertyRole))
    return false;

  return true;
}

export function checkIfRoleAllowedWithoutProperties(propertyRole: string): boolean {

  if (rolesAllowedWithoutProperties.includes(propertyRole))
    return true;

  return false;
}

// Define the shape of a single property config
type PropertyConfigRules = {
  explicitlyAllowed: string[];
  explicitlyDenied: string[];
};

// Make the outer object type, where keys are strings (like "Icon")
type PropertiesConfig = Record<string, PropertyConfigRules>;

function removeItems(list1: string[], list2: string[]): string[] {
  return list1.filter(item => !list2.includes(item));
}
