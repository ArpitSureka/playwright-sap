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

import { AttributeSelectorPart } from '@isomorphic/selectorParser';
import { checkOverlap, checkSAPUI5, getClosestUI5ElementFromCurrentElement } from '@sap/common';
import { UI5properties } from '@sap/types/properties';

export type UI5PropertyType = {
  propertyValue: string,
  propertyName: string
};

// This function is used to check sap selectror, wether result and target element has the same ui5 parent element
export function checkSAPSelector(result: Element, targetElement: Element, window: Window): Boolean {
  if (!checkSAPUI5(window))
    return false;

  const resultEle = getClosestUI5ElementFromCurrentElement(result, window);
  const targetEle = getClosestUI5ElementFromCurrentElement(targetElement, window);

  if (resultEle && targetEle && resultEle === targetEle && checkOverlap(resultEle, targetElement))
    return true;

  return false;
}

// Inspired from packages/injected/src/injectedScript.ts - createTextMatcher
export function createPropertyValueMatcher(propertyRole: string, properties?: AttributeSelectorPart[]): ((_properties: UI5properties) => boolean) | undefined {

  if (!properties)
    return undefined;


  return (_properties: UI5properties): boolean => {

    let matched = true;

    // Update this function to make it work incase name is not an exact match. case sensative issue. PropertyName always start with small case - backgroundColorSet
    const findPropertyValue = (name: string): string | undefined => {

      if (_properties.get(name)) {
        const val = _properties.get(name);
        if (typeof(val) === 'string')
          return val;
        else if (val)
          return val.toString();
      }

      return undefined;
    };

    for (const property of properties) {

      const propertyName = property.name;
      const propertyValue = property.value;
      const exact = property.caseSensitive;

      const elementValue = findPropertyValue(propertyName);

      if (!elementValue)
        return false;

      if (propertyName.toLowerCase() !== 'text') {
        if (exact) {
          matched &&= elementValue === propertyValue;
        } else {
          if (elementValue.length > 70)
            matched &&= propertyValue.toLowerCase() === suitableTextAlternatives_sap(elementValue).sort((a, b) => b.scoreBonus - a.scoreBonus)[0].text.toLowerCase();
          matched &&= elementValue.toLowerCase() === propertyValue.toLowerCase();
        }
      }

      //  Testing is Pending.
      // This is a regex checker in case propertyName. regex wont come from codegen but if the user explicitly tries to use regex in code.
      if (propertyValue[0] === '/' && propertyValue.lastIndexOf('/') > 0) {
        const lastSlash = propertyValue.lastIndexOf('/');
        const re = new RegExp(propertyValue.substring(1, lastSlash), propertyValue.substring(lastSlash + 1));
        matched &&= re.test(elementValue);
      }

      // In case the user explicitly adds exact = true - will only work when propertyName is text.
      // Exact = true dosnt come directly from codegen.
      if (exact)
        matched &&= elementValue === propertyValue ;

      // Currently i mode is the default if present or not prosent
      matched &&=  elementValue.toLowerCase().includes(propertyValue.toLowerCase()) ;

      if (!matched)
        return matched;

    }

    return matched;

  };

}

// ----------------------------------------------------
// Copied fron packages/injected/src/selectorGenerator.ts

export function suitableTextAlternatives_sap(text: string) {
  let result: { text: string, scoreBonus: number }[] = [];

  {
    const match = text.match(/^([\d.,]+)[^.,\w]/);
    const leadingNumberLength = match ? match[1].length : 0;
    if (leadingNumberLength) {
      const alt = trimWordBoundary(text.substring(leadingNumberLength).trimStart(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }

  {
    const match = text.match(/[^.,\w]([\d.,]+)$/);
    const trailingNumberLength = match ? match[1].length : 0;
    if (trailingNumberLength) {
      const alt = trimWordBoundary(text.substring(0, text.length - trailingNumberLength).trimEnd(), 80);
      result.push({ text: alt, scoreBonus: alt.length <= 30 ? 2 : 1 });
    }
  }

  if (text.length <= 30) {
    result.push({ text, scoreBonus: 0 });
  } else {
    result.push({ text: trimWordBoundary(text, 80), scoreBonus: 0 });
    result.push({ text: trimWordBoundary(text, 30), scoreBonus: 1 });
  }

  result = result.filter(r => r.text);
  if (!result.length)
    result.push({ text: text.substring(0, 80), scoreBonus: 0 });

  return result;
}

function trimWordBoundary(text: string, maxLength: number) {
  if (text.length <= maxLength)
    return text;
  text = text.substring(0, maxLength);
  // Find last word boundary in the text.
  const match = text.match(/^(.*)\b(.+?)$/);
  if (!match)
    return '';
  return match[1].trimEnd();
}

// To compare closeness of 2 strings.
export function cosineSimilarity(a: string, b: string): number {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);

  const allWords = Array.from(new Set([...wordsA, ...wordsB]));
  const vecA = allWords.map(w => wordsA.filter(x => x === w).length);
  const vecB = allWords.map(w => wordsB.filter(x => x === w).length);

  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));

  return dot / (magA * magB || 1);
}
