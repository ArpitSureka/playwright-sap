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
const implicitlyAllowedProperties: string[] = ['name', 'label', 'title', 'text', 'icon', 'placeholder', 'subTitle', 'value', 'description', 'header', 'key'];

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
  'Select': {
    explicitlyAllowed: ['selectedKey']
  },
  'ComboBox': {
    explicitlyAllowed: ['selectedKey']
  },
  'Switch': {
    explicitlyAllowed: ['state']
  },
  'ObjectNumber': {
    explicitlyAllowed: ['number']
  },
  'Illustration': {
    explicitlyAllowed: ['media', 'type', 'set']
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
