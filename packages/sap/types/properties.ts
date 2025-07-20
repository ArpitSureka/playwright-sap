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


// {
//     "own": {
//         "meta": {
//             "controlName": "sap.m.Link"
//         },
//         "properties": {
//             "text": {
//                 "value": "Terms of Use",
//                 "type": "string",
//                 "isDefault": false
//             }
//         }
//     },
//     "inherited": [
//         {
//             "meta": {
//                 "controlName": "sap.ui.core.Control"
//             },
//             "properties": {
//                 "blocked": {
//                     "value": false,
//                     "type": "boolean",
//                     "isDefault": true
//                 },
//             }
//         },
//         {
//             "meta": {
//                 "controlName": "sap.ui.core.Element"
//             },
//             "properties": {}
//         }
//     ],
//     "isPropertiesData": true
// };
export type UI5properties = {
    own: UI5Property;
    inherited: UI5Property[];
    // isPropertiesData: boolean; // Uncomment if needed
};


// {
//     "meta": {
//         "controlName": "sap.m.Link"
//     },
//     "properties": {
//         "text": {
//             "value": "Terms of Use",
//             "type": "string",
//             "isDefault": false
//         },
//         ...other properties
//     }
// }
export type UI5Property = {
    meta: {
        controlName: string;// Also known as role
    },
    properties: {
        [key: string]: { // key is the propertyName
            value: string; // value of the propertyValue
            // type: string; // Uncomment if needed
            // isDefault: boolean; // Uncomment if needed
        };
    };
};
