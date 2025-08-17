(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
sap.ui.require(['ToolsAPI'], function (ToolsAPI) {
    'use strict';
    var ui5inspector = require('../modules/injected/ui5inspector.js');
    var message = require('../modules/injected/message.js');
    var controlUtils = require('../modules/injected/controlUtils.js');
    var rightClickHandler = require('../modules/injected/rightClickHandler.js');
    var applicationUtils = require('../modules/injected/applicationUtils');
    var ui5TempName = 'ui5$temp';
    var ui5Temp = window[ui5TempName] = {}; // Container for all temp. variables
    var tempVarCount = 0;
    const log = (m, options) => console.log(`ui5-inspector: ${m}`, options ? options : false);
    // Create global reference for the extension.
    ui5inspector.createReferences();
    /**
     * Mutation observer for DOM elements
     * @type {{init: Function, _observer: MutationObserver, _options: {subtree: boolean, childList: boolean, attributes: boolean}}}
     */
    var mutation = {
        /**
         * Initialize the observer.
         */
        init: function () {
            this._observer.observe(document.body, this._options);
        },
        /**
         * Create an observer instance.
         */
        _observer: new MutationObserver(function (mutations) {
            var isMutationValid = true;
            var controlTreeModel;
            var commonInformation;
            mutations.forEach(function (mutation) {
                if (mutation.target.id === 'ui5-highlighter' || mutation.target.id === 'ui5-highlighter-container') {
                    isMutationValid = false;
                    return;
                }
            });
            if (isMutationValid === true) {
                controlTreeModel = ToolsAPI.getRenderedControlTree();
                ToolsAPI.getFrameworkInformation().then(function (frameworkInformation) {
                    commonInformation = frameworkInformation.commonInformation;
                    message.send({
                        action: 'on-application-dom-update',
                        controlTree: controlUtils.getControlTreeModel(controlTreeModel, commonInformation)
                    });
                });
            }
        }),
        // Configuration of the observer
        _options: {
            subtree: true,
            childList: true,
            // If this is set to true, some controls will trigger mutation(example: newsTile changing active tile)
            attributes: false
        }
    };
    // Initialize
    mutation.init();
    /**
     * Sets control's property.
     * @param {Object} oControl
     * @param {Object} oData - property's data
     * @private
     */
    function _setControlProperties(oControl, oData) {
        var sProperty = oData.property;
        var oNewValue = oData.value;
        try {
            // Change the property through its setter
            oControl['set' + sProperty](oNewValue);
        }
        catch (error) {
            console.warn(error);
        }
    }
    // Name space for message handler functions.
    var messageHandler = {
        /**
         * Send message with the needed initial information for the extension.
         */
        'get-initial-information': function () {
            var controlTreeModel = ToolsAPI.getRenderedControlTree();
            ToolsAPI.getFrameworkInformation().then(function (frameworkInformation) {
                message.send({
                    action: 'on-receiving-initial-data',
                    applicationInformation: applicationUtils.getApplicationInfo(frameworkInformation),
                    controlTree: controlUtils.getControlTreeModel(controlTreeModel, frameworkInformation.commonInformation),
                    elementRegistry: ToolsAPI.getRegisteredElements()
                });
            });
        },
        /**
         * Send framework information.
         */
        'get-framework-information': function () {
            ToolsAPI.getFrameworkInformation().then(function (frameworkInformation) {
                message.send({
                    action: 'on-framework-information',
                    frameworkInformation: applicationUtils.getInformationForPopUp(frameworkInformation)
                });
            });
        },
        /**
         * Handler for logging event listener fucntion.
         * @param {Object} event
         */
        'do-console-log-event-listener': function (event) {
            var evtData = event.detail.data;
            console.log(controlUtils.getElementById(evtData.controlId).mEventRegistry[evtData.eventName][evtData.listenerIndex].fFunction);
        },
        /**
         * Handler for element selection in the ControlTree.
         * @param {Object} event
         */
        'do-control-select': function (event) {
            var controlId = event.detail.target;
            var controlProperties = ToolsAPI.getControlProperties(controlId);
            var controlBindings = ToolsAPI.getControlBindings(controlId);
            var controlAggregations = ToolsAPI.getControlAggregations(controlId);
            var controlEvents = ToolsAPI.getControlEvents(controlId);
            message.send({
                action: 'on-control-select',
                controlProperties: controlUtils.getControlPropertiesFormattedForDataView(controlId, controlProperties),
                controlBindings: controlUtils.getControlBindingsFormattedForDataView(controlBindings),
                controlAggregations: controlUtils.getControlAggregationsFormattedForDataView(controlId, controlAggregations),
                controlEvents: controlUtils.getControlEventsFormattedForDataView(controlId, controlEvents),
                controlActions: controlUtils.getControlActionsFormattedForDataView(controlId)
            });
        },
        /**
         * Handler for element selection in the Elements Registry.
         * @param {Object} event
         */
        'do-control-select-elements-registry': function (event) {
            var controlId = event.detail.target;
            var controlProperties = ToolsAPI.getControlProperties(controlId);
            var controlBindings = ToolsAPI.getControlBindings(controlId);
            var controlAggregations = ToolsAPI.getControlAggregations(controlId);
            var controlEvents = ToolsAPI.getControlEvents(controlId);
            message.send({
                action: 'on-control-select-elements-registry',
                controlProperties: controlUtils.getControlPropertiesFormattedForDataView(controlId, controlProperties),
                controlBindings: controlUtils.getControlBindingsFormattedForDataView(controlBindings),
                controlAggregations: controlUtils.getControlAggregationsFormattedForDataView(controlId, controlAggregations),
                controlEvents: controlUtils.getControlEventsFormattedForDataView(controlId, controlEvents)
            });
        },
        /**
         * Handler for refreshing elements in Elements Registry.
         */
        'do-elements-registry-refresh': function () {
            message.send({
                action: 'on-receiving-elements-registry-refresh-data',
                elementRegistry: ToolsAPI.getRegisteredElements()
            });
        },
        /**
         * Send message with the inspected UI5 control, from the context menu.
         * @param {Object} event
         */
        'select-control-tree-element-event': function (event) {
            var portMessage = event.detail;
            message.send({
                action: 'on-contextMenu-control-select',
                target: portMessage.target,
                frameId: event.detail.frameId
            });
        },
        /**
         * Change control property, based on editing in the DataView.
         * @param {Object} event
         */
        'do-control-property-change': function (event) {
            var oData = event.detail.data;
            var sControlId = oData.controlId;
            var oControl = controlUtils.getElementById(sControlId);
            if (!oControl) {
                return;
            }
            _setControlProperties(oControl, oData);
            // Update the DevTools with the actual property value of the control
            this['do-control-select']({
                detail: {
                    target: sControlId
                }
            });
        },
        'do-control-invalidate': function (event) {
            var oData = event.detail.data;
            var sControlId = oData.controlId;
            var oControl = controlUtils.getElementById(sControlId);
            if (!oControl) {
                return;
            }
            oControl.invalidate();
            // Update the DevTools with the actual property value of the control
            this['do-control-select']({
                detail: {
                    target: sControlId
                }
            });
        },
        'do-control-focus': function (event) {
            var oData = event.detail.data;
            var sControlId = oData.controlId;
            var oControl = controlUtils.getElementById(sControlId);
            if (!oControl) {
                return;
            }
            oControl.focus();
        },
        /**
         * Change control property, based on editing in the DataView.
         * @param {Object} event
         */
        'do-control-property-change-elements-registry': function (event) {
            var oData = event.detail.data;
            var sControlId = oData.controlId;
            var oControl = controlUtils.getElementById(sControlId);
            if (!oControl) {
                return;
            }
            _setControlProperties(oControl, oData);
            // Update the DevTools with the actual property value of the control
            this['do-control-select-elements-registry']({
                detail: {
                    target: sControlId
                }
            });
        },
        /**
         * Selects Control with context menu click.
         * @param {Object} event
         */
        'do-context-menu-control-select': function (event) {
            message.send({
                action: 'on-contextMenu-control-select',
                target: event.detail.target,
                frameId: event.detail.frameId
            });
        },
        /**
         * Copies HTML of Control to Console.
         * @param {Object} event
         */
        'do-control-copy-html': function (event) {
            var elementID = event.detail.target;
            var selectedElement;
            if (typeof elementID !== 'string') {
                console.warn('Please use a valid string parameter');
                return;
            }
            selectedElement = document.getElementById(elementID);
            log('\n' + '%cCopy HTML ⬇️', 'color:#12b1eb; font-size:12px');
            console.log(selectedElement);
        },
        /**
         * Handler to copy the element into a temp variable on the console
         * @param {Object} event
         */
        'do-copy-control-to-console': function (event) {
            var oData = event.detail.data;
            var sControlId = oData.controlId;
            const control = controlUtils.getElementById(sControlId);
            if (control) {
                try {
                    const tempVarName = ui5Temp[sControlId] && ui5Temp[sControlId].savedAs || `ui5$${tempVarCount++}`;
                    const instance = window[tempVarName] = ui5Temp[sControlId] = {
                        control: control,
                        isA: control.getMetadata().getName(),
                        savedAs: tempVarName
                    };
                    log(`Control copied to global var ${tempVarName}, all vars are collected in global var ${ui5TempName}`);
                    console.log(instance);
                }
                catch (exc) {
                    // Ignore errors gracefully
                }
            }
            else {
                log(`No Control with id ${sControlId} exists`);
            }
        }
    };
    /**
     * Register mousedown event.
     */
    ui5inspector.registerEventListener('mousedown', function rightClickTarget(event) {
        if (event.button === 2) {
            rightClickHandler.setClickedElementId(event.target);
            message.send({
                action: 'on-right-click',
                target: rightClickHandler.getClickedElementId()
            });
        }
    });
    /**
     * Register custom event for communication with the injected.
     */
    ui5inspector.registerEventListener('ui5-communication-with-injected-script', function communicationWithContentScript(event) {
        var action = event.detail.action;
        if (messageHandler[action]) {
            messageHandler[action](event);
        }
    });
});

},{"../modules/injected/applicationUtils":2,"../modules/injected/controlUtils.js":3,"../modules/injected/message.js":4,"../modules/injected/rightClickHandler.js":5,"../modules/injected/ui5inspector.js":6}],2:[function(require,module,exports){
'use strict';
var utils = require('../utils/utils.js');
/**
 * Get common application information.
 * @returns {Object} commonInformation - commonInformation property from ToolsAPI.getFrameworkInformation()
 * @private
 */
function _getCommonInformation(commonInformation) {
    var frameworkName = commonInformation.frameworkName;
    var buildTime = utils.formatter.convertUI5TimeStampToHumanReadableFormat(commonInformation.buildTime);
    var result = {};
    result[frameworkName] = commonInformation.version + ' (built at ' + buildTime + ')';
    result['User Agent'] = commonInformation.userAgent;
    result.Application = commonInformation.applicationHREF;
    return result;
}
/**
 * Get bootstrap configuration information.
 * @returns {Object} configurationBootstrap - configurationBootstrap property from ToolsAPI.getFrameworkInformation()
 * @private
 */
function _getConfigurationBootstrap(configurationBootstrap) {
    var bootConfigurationResult = {};
    for (var key in configurationBootstrap) {
        if (configurationBootstrap[key] instanceof Object === true) {
            bootConfigurationResult[key] = JSON.stringify(configurationBootstrap[key]);
        }
        else {
            bootConfigurationResult[key] = configurationBootstrap[key];
        }
    }
    return bootConfigurationResult;
}
/**
 * Get loaded modules application information.
 * @returns {Object} loadedModules - loadedModules property from ToolsAPI.getFrameworkInformation()
 * @private
 */
function _getLoadedModules(loadedModules) {
    var loadedModulesResult = {};
    for (var i = 0; i < loadedModules.length; i++) {
        loadedModulesResult[i + 1] = loadedModules[i];
    }
    return loadedModulesResult;
}
/**
 * Get application URL parameters.
 * @returns {Object} URLParameters - URLParameters property from ToolsAPI.getFrameworkInformation()
 * @private
 */
function _getURLParameters(URLParameters) {
    var urlParametersResult = {};
    for (var key in URLParameters) {
        urlParametersResult[key] = URLParameters[key].join(', ');
    }
    return urlParametersResult;
}
// Public API
module.exports = {
    /**
     * Get UI5 information for the current inspected page.
     * @param {Object} frameworkInformation - frameworkInformation property from ToolsAPI.getFrameworkInformation()
     * @returns {Object}
     */
    getApplicationInfo: function (frameworkInformation) {
        return {
            common: {
                options: {
                    title: 'General',
                    expandable: true,
                    expanded: true
                },
                data: _getCommonInformation(frameworkInformation.commonInformation)
            },
            configurationBootstrap: {
                options: {
                    title: 'Configuration (bootstrap)',
                    expandable: true,
                    expanded: true
                },
                data: _getConfigurationBootstrap(frameworkInformation.configurationBootstrap)
            },
            configurationComputed: {
                options: {
                    title: 'Configuration (computed)',
                    expandable: true,
                    expanded: true
                },
                data: frameworkInformation.configurationComputed
            },
            urlParameters: {
                options: {
                    title: 'URL Parameters',
                    expandable: true,
                    expanded: true
                },
                data: _getURLParameters(frameworkInformation.URLParameters)
            },
            loadedLibraries: {
                options: {
                    title: 'Libraries (loaded)',
                    expandable: true,
                    expanded: true
                },
                data: frameworkInformation.loadedLibraries
            },
            libraries: {
                options: {
                    title: 'Libraries (all)',
                    expandable: true
                },
                data: frameworkInformation.libraries
            },
            loadedModules: {
                options: {
                    title: 'Modules (loaded)',
                    expandable: true
                },
                data: _getLoadedModules(frameworkInformation.loadedModules)
            }
        };
    },
    /**
     * Get the needed information for the popup.
     * @param {Object} frameworkInformation - frameworkInformation property from ToolsAPI.getFrameworkInformation();
     * @returns {Object}
     */
    getInformationForPopUp: function (frameworkInformation) {
        return _getCommonInformation(frameworkInformation.commonInformation);
    }
};

},{"../utils/utils.js":7}],3:[function(require,module,exports){
'use strict';
/**
 * Create data object for the DataView to consume.
 * @param {Object} options - settings
 * @returns {Object}
 * @private
 */
function _assembleDataToView(options) {
    var object = Object.create(null);
    object.data = options.data ? options.data : Object.create(null);
    object.options = {
        controlId: options.controlId !== undefined ? options.controlId : undefined,
        expandable: options.expandable !== undefined ? options.expandable : true,
        expanded: options.expanded !== undefined ? options.expanded : true,
        hideTitle: options.hideTitle !== undefined ? options.hideTitle : false,
        showTypeInfo: !!options.showTypeInfo,
        title: options.title !== undefined ? options.title : '',
        editableValues: options.editableValues !== undefined ? options.editableValues : true,
        editModel: options.editModel !== undefined ? options.editModel : undefined,
        editModelPath: options.editModelPath !== undefined ? options.editModelPath : undefined
    };
    return object;
}
/**
 * Returns the registered element with the given ID, if any.
 * @param {sap.ui.core.ID|null|undefined} sId ID of the element to search for
 * @returns {sap.ui.core.Element|undefined} Element with the given ID or <code>undefined</code>
 */
function _getElementById(sId) {
    var Element = sap.ui.require('sap/ui/core/Element');
    if (typeof Element.getElementById === 'function') {
        return Element.getElementById(sId);
    }
    if (typeof sap.ui.getCore === 'function' && typeof sap.ui.getCore().byId === 'function') {
        return sap.ui.getCore().byId(sId);
    }
}
/**
 * Create a clickable value for the DataView.
 * @param {Object} options
 * @constructor
 */
function ClickableValue(options) {
    // This is used for checking in the dataView
    this._isClickableValueForDataView = true;
    // This is shown in the data view
    this.value = '<clickable-value key="' + options.key + '" parent="' + options.parent + '">' + (options.value || '') + '</clickable-value>';
    // This data is attached in the click event of the dataview
    this.eventData = options.eventData || {};
}
/**
 * Copies the properties of the sourceObject into the targetObject.
 *
 * Remark: This is a simple alternative to jQuery.Extend.
 * @private
 */
function _extendObject() {
    if (arguments.length === 0) {
        return undefined;
    }
    var targetObject = arguments[0] || {};
    var sourceObject;
    for (var i = 1; i < arguments.length; ++i) {
        sourceObject = arguments[i];
        if (sourceObject) {
            for (var key in sourceObject) {
                targetObject[key] = sourceObject[key];
            }
        }
    }
    return targetObject;
}
/**
 * Extends options with model-dataview specific data.
 * Functions returns a new object, the original object is not subject of change.
 * @param {Object} options
 * @param {Object} modelInfo
 * @returns {Object}
 * @private
 */
function _extendOptionsForModelDataview(options, modelInfo) {
    var additionalOptions = {};
    if (modelInfo && modelInfo.mode === 'TwoWay' && options.showValue) {
        additionalOptions.editableValues = ['value'];
        additionalOptions.editModel = modelInfo.modelName;
        additionalOptions.editModelPath = modelInfo.fullPath;
    }
    return _extendObject({}, options, additionalOptions);
}
/**
 * Create a reference to model information consisting of a reference to the model itself and
 * a path property for the concrete value at the defined path.
 * @param {Object} options
 * @param {Object} modelInfo
 * @param {string} key - optional
 * @returns {Object}
 * @private
 */
function _assembleModelReferences(options, modelInfo, key) {
    // Do not print null or undefined
    if (key === undefined || key === null) {
        key = '';
    }
    var modelName = modelInfo.modelName || '';
    var data = {
        model: new ClickableValue({
            value: modelName + ' (' + (modelInfo.type ? modelInfo.type.split('.').pop() : '<unknown>') + ')',
            eventData: {
                name: modelName,
                type: modelInfo.type,
                mode: modelInfo.mode,
                data: modelInfo.modelData
            },
            parent: options.parent,
            key: key + '/model'
        }),
        path: new ClickableValue({
            value: modelInfo.path,
            eventData: {
                name: modelName,
                type: modelInfo.type,
                mode: modelInfo.mode,
                path: modelInfo.path,
                data: modelInfo.pathData
            },
            parent: options.parent,
            key: key + '/path'
        })
    };
    if (options.showValue) { // && typeof modelInfo.pathData !== "object"
        data.value = modelInfo.pathData;
    }
    return data;
}
/**
 * Create a reference to model information consisting of a reference to the model itself and
 * a path property for the concrete value at the defined path.
 *
 * Options object
 * {
 *      parent: 'string', the name of the parent section to pass as parameter to clickable values
 *      showValue: 'boolean', if true the concrete value in the model is added as property
 *      collection: 'string', name of the nesting key, default is 'parts'
 *      controlId: 'string', id of inspected control to enable editing
 * }
 * @param {Object} options
 * @param {Object} modelInfo
 * @returns {Object|null}
 * @private
 */
function _assembleModelInfoDataview(options, modelInfo) {
    if (!modelInfo) {
        return null;
    }
    if (modelInfo.parts) {
        modelInfo.parts = modelInfo.parts.filter(partModelInfo => partModelInfo !== null);
    }
    options.data = options.data || Object.create(null);
    if (modelInfo.parts && modelInfo.parts.length > 1) {
        // Add multiple model entries for properties with multiple bindings
        var collectionName = options.collection || 'parts';
        options.data[collectionName] = _assembleDataToView({
            title: 'parts',
            expandable: true,
            expanded: true,
            showTypeInfo: true,
            editableValues: false,
            data: modelInfo.parts.map(function (partModelInfo, index) {
                var partOptions = _extendObject(_extendOptionsForModelDataview(options, partModelInfo), {
                    expandable: false,
                    expanded: true,
                    hideTitle: true,
                    showTypeInfo: true,
                    data: _assembleModelReferences(options, partModelInfo, collectionName + '/data/' + index + '/data')
                });
                return _assembleDataToView(partOptions);
            })
        });
    }
    else {
        // Add a single model entry
        modelInfo = modelInfo.parts && modelInfo.parts[0] || modelInfo;
        _extendObject(options.data, _assembleModelReferences(options, modelInfo));
        options = _extendOptionsForModelDataview(options, modelInfo);
    }
    return _assembleDataToView(options);
}
// ================================================================================
// Control Properties Info
// ================================================================================
var controlProperties = (function () {
    var OWN = 'own';
    var INHERITED = 'inherited';
    /**
     * Formatter for global namespaced enum objects.
     * @param {string | Object} type
     * @private
     */
    function _transformStringTypeToObject(type) {
        var parts = type.split('.');
        var obj = window;
        var i;
        for (i = 0; i < parts.length; i++) {
            obj = obj[parts[i]] ? obj[parts[i]] : '';
        }
        return obj;
    }
    /**
     * Formatter for the type enums.
     * @param {string | Object} type
     * @private
     */
    function _formatTypes(type) {
        var objectType;
        if (type.startsWith('sap.') && sap.ui.require('sap/ui/base/DataType').getType(type).getDefaultValue()) {
            objectType = _transformStringTypeToObject(type);
        }
        else {
            objectType = type;
        }
        return objectType;
    }
    /**
     * Formatter for the inherited properties.
     * @param {string} controlId
     * @param {Object} properties - UI5 control properties
     * @private
     */
    function _formatInheritedProperties(controlId, properties) {
        if (!properties[INHERITED]) {
            return;
        }
        for (var i = 0; i < properties[INHERITED].length; i++) {
            var parent = properties[INHERITED][i];
            var title = parent.meta.controlName;
            var props = parent.properties;
            var formatedProps = {};
            parent = _assembleDataToView({
                controlId: controlId,
                expandable: false,
                title: title
            });
            parent.types = {};
            for (var key in props) {
                formatedProps[key] = Object.create(null);
                parent.types[key] = props[key].type ? _formatTypes(props[key].type) : '';
                formatedProps[key].value = props[key].value;
                formatedProps[key].isDefault = props[key].isDefault && props[key].value !== '';
                parent.data[key] = formatedProps[key];
            }
            var parentTitle = '<span gray>Inherits from</span>';
            parentTitle += ' (' + title + ')';
            parent.options.title = parentTitle;
            properties[INHERITED + i] = parent;
        }
        delete properties[INHERITED];
    }
    /**
     * Formatter for nested properties.
     * @param {Object} propertyObj
     * @param {string} title
     * @returns {Object}
     * @private
     */
    function _formatNestedProperties(propertyObj, title) {
        var nestedProperties = propertyObj.value;
        var props = _assembleDataToView({
            title: title,
            expandable: false,
            showTypeInfo: true
        });
        for (var key in nestedProperties) {
            props.data[key] = nestedProperties[key];
        }
        return props;
    }
    /**
     * Getter for the properties' associations.
     * @param {string} controlId
     * @param {Object} properties
     * @private
     */
    function _getControlPropertiesAssociations(controlId, properties) {
        var control = _getElementById(controlId);
        if (!control) {
            return;
        }
        properties.associations = Object.create(null);
        var controlAssociations = control.getMetadata().getAssociations();
        var genericObject = Object.create(null);
        Object.keys(controlAssociations).forEach(function (key) {
            var associationElement = control.getAssociation(key);
            if (associationElement && associationElement.length) {
                genericObject.name = associationElement;
            }
            genericObject.type = controlAssociations[key].type;
            properties.associations[key] = genericObject;
        });
    }
    /**
     * Formatter for the associations.
     * @param {Object} properties
     * @private
     */
    function _formatAssociations(properties) {
        var associations = properties.associations;
        for (var assoc in associations) {
            var associationsValue = '';
            if (associations[assoc].name) {
                associationsValue += associations[assoc].name + ' ';
            }
            associationsValue += associations[assoc].type;
            associationsValue += ' (associations)';
            associations[assoc] = associationsValue;
        }
    }
    /**
     * Formatter function for the control properties data.
     * @param {string} controlId
     * @param {Object} properties
     * @returns {Object}
     * @private
     */
    var _formatControlProperties = function (controlId, properties) {
        if (Object.keys(properties).length === 0) {
            return properties;
        }
        var title = properties[OWN].meta.controlName;
        var props = properties[OWN].properties;
        var types = {};
        var formatedProps = {};
        for (var key in props) {
            formatedProps[key] = Object.create(null);
            if (props[key].type === 'object') {
                props[key] = _formatNestedProperties(props[key], key);
                continue;
            }
            types[key] = props[key].type ? _formatTypes(props[key].type) : '';
            formatedProps[key].value = props[key].value;
            formatedProps[key].isDefault = props[key].isDefault && props[key].value !== '';
        }
        properties[OWN] = _assembleDataToView({
            controlId: controlId,
            expandable: false,
            title: title
        });
        properties[OWN].data = formatedProps;
        properties[OWN].types = types;
        properties[OWN].options.title = '#<span class="controlId" data-control-id="' + controlId + '" title="Click to copy control to console">' + controlId + '</span><span gray>(' + title + ')</span>';
        _formatInheritedProperties(controlId, properties);
        _getControlPropertiesAssociations(controlId, properties[OWN]);
        _formatAssociations(properties[OWN]);
        return properties;
    };
    return {
        formatControlProperties: _formatControlProperties
    };
}());
/**
 * Helper function for building listener's path in the data.
 * @param {Array} pathArr
 * @returns {string}
 * @private
 */
var _buildStringPathForListener = function (pathArr) {
    var path = '';
    pathArr.forEach(function (pathQuery) {
        path += pathQuery + '/data/';
    });
    return path;
};
// ================================================================================
// Control Events Info
// ================================================================================
var controlEvents = (function () {
    var OWN = 'own';
    var INHERITED = 'inherited';
    /**
     * Formatter function for a given control event.
     * @param {string} eventName
     * @param {string} eventParamsType
     * @param {Object} listenerConfig
     * @returns {Object}
     * @private
     */
    var _formatEventValues = function (eventName, eventParamsType, listenerConfig) {
        var listenersString = 'listeners';
        var listenerBodyString = 'function';
        var isParamsEmpty = Object.keys(eventParamsType).length === 0;
        var evtRegistry = listenerConfig.eventRegistry;
        var isRegistryPopulatedArray = Array.isArray(evtRegistry) && evtRegistry.length > 0;
        var evt;
        // If there are no meta parameteres and no listeners, no further operations are needed
        if (isParamsEmpty && !isRegistryPopulatedArray) {
            return Object.create(null);
        }
        evt = _assembleDataToView({
            title: eventName,
            expandable: true,
            expanded: true,
            editableValues: false,
            showTypeInfo: true,
        });
        evt.data.parameters = isParamsEmpty ? eventParamsType :
            _assembleDataToView({
                expandable: true,
                expanded: true,
                editableValues: false,
                showTypeInfo: true,
                data: eventParamsType
            });
        evt.data[listenersString] = !isRegistryPopulatedArray ? [] :
            _assembleDataToView({
                expandable: true,
                expanded: true,
                editableValues: false,
                showTypeInfo: true,
                data: evtRegistry.map(function (listener, index) {
                    var curr = _assembleDataToView({
                        title: listener.name,
                        expandable: true,
                        expanded: true,
                        editableValues: false,
                        showTypeInfo: true
                    });
                    curr.data['view id'] = listener.viewId;
                    curr.data['controller name'] = listener.controllerName;
                    curr.data[listenerBodyString] = new ClickableValue({
                        value: 'Log in DevTools Console',
                        eventData: {
                            controlId: listenerConfig.controlId,
                            eventName: eventName,
                            listenerIndex: index
                        },
                        key: listenerBodyString,
                        parent: _buildStringPathForListener([listenerConfig.rootObjectName, eventName, listenersString, index])
                    });
                    return curr;
                })
            });
        return evt;
    };
    /**
     * Formatter for the inherited events.
     * @param {string} controlId
     * @param {Object} events - UI5 control events
     * @private
     */
    var _formatInheritedEvents = function (controlId, events) {
        if (!events[INHERITED]) {
            return;
        }
        for (var i = 0; i < events[INHERITED].length; i++) {
            var parent = events[INHERITED][i];
            var title = parent.meta.controlName;
            var evts = parent.events;
            var inheritedIncremented = INHERITED + i;
            var listenerConfig;
            parent = _assembleDataToView({
                controlId: controlId,
                expandable: false,
                title: title,
                editableValues: false
            });
            for (var key in evts) {
                listenerConfig = Object.create(null);
                listenerConfig.eventRegistry = evts[key].registry;
                listenerConfig.rootObjectName = inheritedIncremented;
                listenerConfig.controlId = controlId;
                parent.data[key] = _formatEventValues(key, evts[key].paramsType, listenerConfig);
            }
            var parentTitle = '<span gray>Inherits from</span>';
            parentTitle += ' (' + title + ')';
            parent.options.title = parentTitle;
            events[inheritedIncremented] = parent;
        }
        delete events[INHERITED];
    };
    /**
     * Formatter function for the control events data.
     * @param {string} controlId
     * @param {Object} events
     * @returns {Object}
     * @private
     */
    var _formatControlEvents = function (controlId, events) {
        if (Object.keys(events).length === 0) {
            return events;
        }
        var title = events[OWN].meta.controlName;
        var evts = events[OWN].events;
        var listenerConfig;
        for (var key in evts) {
            listenerConfig = Object.create(null);
            listenerConfig.eventRegistry = evts[key].registry;
            listenerConfig.rootObjectName = OWN;
            listenerConfig.controlId = controlId;
            evts[key] = _formatEventValues(key, evts[key].paramsType, listenerConfig);
        }
        events[OWN] = _assembleDataToView({
            controlId: controlId,
            expandable: false,
            title: title,
            editableValues: false
        });
        events[OWN].data = evts;
        events[OWN].options.title = '#<span class="controlId" data-control-id="' + controlId + '" title="Click to copy control to console">' + controlId + '</span><span gray>(' + title + ')</span>';
        _formatInheritedEvents(controlId, events);
        return events;
    };
    return {
        formatControlEvents: _formatControlEvents
    };
}());
// ================================================================================
// Binding Info
// ================================================================================
var controlBindings = (function () {
    /**
     *
     * @param {Object} initialControlBindingData - ToolsAPI.getControlBindings()
     * @param {Object} resultControlBindingData
     * @private
     */
    var _getControlContextPathFormattedForDataView = function (initialControlBindingData, resultControlBindingData) {
        if (initialControlBindingData.context) {
            resultControlBindingData.context = _assembleModelInfoDataview({
                title: 'Binding context',
                expandable: false,
                editableValues: false,
                parent: 'context'
            }, initialControlBindingData.context);
        }
    };
    /**
     *
     * @param {Object} initialControlBindingData - ToolsAPI.getControlBindings()
     * @param {Object} resultControlBindingData
     * @private
     */
    var _getControlPropertiesFormattedForDataView = function (initialControlBindingData, resultControlBindingData) {
        if (!initialControlBindingData.properties) {
            return;
        }
        for (var key in initialControlBindingData.properties) {
            var model = initialControlBindingData.properties[key].model;
            var properties = initialControlBindingData.properties[key];
            var options = {
                title: key + ' <opaque>(property)</opaque>',
                expandable: false,
                editableValues: false,
                data: {
                    type: properties.type,
                    mode: properties.mode
                },
                parent: key,
                showValue: true,
                controlId: initialControlBindingData.meta.controlId
            };
            resultControlBindingData[key] = _assembleModelInfoDataview(options, model);
            // Add the formatted data at the very end
            if (properties.formattedValue !== properties.value) {
                resultControlBindingData[key].data.formatted = properties.formattedValue;
            }
        }
    };
    /**
     *
     * @param {Object} initialControlBindingData - ToolsAPI.getControlBindingData()
     * @param {Object} resultControlBindingData
     * @private
     */
    var _getControlAggregationsFormattedForDataView = function (initialControlBindingData, resultControlBindingData) {
        if (!initialControlBindingData.aggregations) {
            return;
        }
        for (var index in initialControlBindingData.aggregations) {
            var model = initialControlBindingData.aggregations[index].model;
            resultControlBindingData[index] = _assembleModelInfoDataview({
                title: index + ' <opaque>(aggregation)</opaque>',
                expandable: false,
                editableValues: false,
                parent: index,
                data: {
                    mode: model.mode
                }
            }, model);
        }
    };
    return {
        getControlContextPathFormattedForDataView: _getControlContextPathFormattedForDataView,
        getControlPropertiesFormattedForDataView: _getControlPropertiesFormattedForDataView,
        getControlAggregationsFormattedForDataView: _getControlAggregationsFormattedForDataView
    };
}());
/**
 * Formatter function for each of the control's aggregations.
 * @param {string} aggregationName
 * @param {Array} aggregationValue
 * @param {string} aggregationType
 * @returns {Object}
 * @private
 */
var _formatAggregationValues = function (aggregationName, aggregationValue, aggregationType) {
    var isAggrPopulatedArr = Array.isArray(aggregationValue) && aggregationValue.length > 0;
    var idString = 'content (id)';
    var aggrTypeString = 'aggregation type';
    var aggr = _assembleDataToView({
        title: aggregationName,
        expandable: true,
        expanded: typeof aggregationValue === 'string' || isAggrPopulatedArr,
        editableValues: false,
        showTypeInfo: true,
    });
    if (isAggrPopulatedArr) {
        aggr.data[idString] = _assembleDataToView({
            expandable: true,
            expanded: false,
            editableValues: false,
            showTypeInfo: true,
            data: aggregationValue
        });
    }
    else {
        aggr.data[idString] = aggregationValue;
    }
    aggr.data[aggrTypeString] = aggregationType;
    return aggr;
};
// ================================================================================
// Control Aggregations Info
// ================================================================================
var controlAggregations = (function () {
    var OWN = 'own';
    var INHERITED = 'inherited';
    /**
     * Formatter for the inherited aggregations.
     * @param {string} controlId
     * @param {Object} aggregations - UI5 control aggregations
     * @private
     */
    var _formatInheritedAggregations = function (controlId, aggregations) {
        if (!aggregations[INHERITED]) {
            return;
        }
        for (var i = 0; i < aggregations[INHERITED].length; i++) {
            var parent = aggregations[INHERITED][i];
            var title = parent.meta.controlName;
            var aggrs = parent.aggregations;
            parent = _assembleDataToView({
                controlId: controlId,
                expandable: false,
                title: title,
                editableValues: false
            });
            for (var key in aggrs) {
                parent.data[key] = _formatAggregationValues(key, aggrs[key].value, aggrs[key].type);
            }
            var parentTitle = '<span gray>Inherits from</span>';
            parentTitle += ' (' + title + ')';
            parent.options.title = parentTitle;
            aggregations[INHERITED + i] = parent;
        }
        delete aggregations[INHERITED];
    };
    /**
     * Formatter function for the control aggregations data.
     * @param {string} controlId
     * @param {Object} aggregations
     * @returns {Object}
     * @private
     */
    var _formatControlAggregations = function (controlId, aggregations) {
        if (Object.keys(aggregations).length === 0) {
            return aggregations;
        }
        var title = aggregations[OWN].meta.controlName;
        var aggrs = aggregations[OWN].aggregations;
        for (var key in aggrs) {
            aggrs[key] = _formatAggregationValues(key, aggrs[key].value, aggrs[key].type);
        }
        aggregations[OWN] = _assembleDataToView({
            controlId: controlId,
            expandable: false,
            title: title,
            editableValues: false
        });
        aggregations[OWN].data = aggrs;
        aggregations[OWN].options.title = '#<span class="controlId" data-control-id="' + controlId + '" title="Click to copy control to console">' + controlId + '</span><span gray>(' + title + ')</span>';
        _formatInheritedAggregations(controlId, aggregations);
        return aggregations;
    };
    return {
        formatControlAggregations: _formatControlAggregations
    };
}());
// ================================================================================
// Public API
// ================================================================================
module.exports = {
    /**
     * Returns the entire control tree model.
     * @param {Array} controlTreeModel - ToolsAPI.getRenderedControlTree()
     * @param {Object} commonInformation - commonInformation property from ToolsAPI.getFrameworkInformation()
     * @returns {{versionInfo: {version: (string|*), framework: (*|string)}, controls: *}}
     */
    getControlTreeModel: function (controlTreeModel, commonInformation) {
        return {
            versionInfo: {
                version: commonInformation.version,
                framework: commonInformation.frameworkName
            },
            controls: controlTreeModel
        };
    },
    /**
     * Returns properties for control in a formatted way.
     * @param {string} controlId
     * @param {Object} properties
     * @returns {Object}
     */
    getControlPropertiesFormattedForDataView: function (controlId, properties) {
        return controlProperties.formatControlProperties(controlId, properties);
    },
    /**
     * Returns aggregations for control in a formatted way.
     * @param {string} controlId
     * @param {Object} aggregations
     * @returns {Object}
     */
    getControlAggregationsFormattedForDataView: function (controlId, aggregations) {
        return controlAggregations.formatControlAggregations(controlId, aggregations);
    },
    /**
     * Reformat all information needed for visualizing the control bindings.
     * @param {Object} controlBindingData - ToolsAPI.getControlBindingData()
     * @returns {Object}
     */
    getControlBindingsFormattedForDataView: function (controlBindingData) {
        var resultControlBindingData = Object.create(null);
        controlBindings.getControlContextPathFormattedForDataView(controlBindingData, resultControlBindingData);
        controlBindings.getControlPropertiesFormattedForDataView(controlBindingData, resultControlBindingData);
        controlBindings.getControlAggregationsFormattedForDataView(controlBindingData, resultControlBindingData);
        return resultControlBindingData;
    },
    /**
     * Returns events for control in a formatted way.
     * @param {string} controlId
     * @param {Object} events
     * @returns {Object}
     */
    getControlEventsFormattedForDataView: function (controlId, events) {
        return controlEvents.formatControlEvents(controlId, events);
    },
    /**
     * Returns actions for control.
     * @param {string} controlId
     * @returns {Object}
     */
    getControlActionsFormattedForDataView: function (controlId) {
        return {
            actions: {
                data: ['Focus', 'Invalidate', 'Copy to Console', 'Copy HTML to Console']
            },
            own: {
                options: {
                    controlId: controlId
                }
            }
        };
    },
    /**
     * Returns UI5 element, given its id.
     * @param {string} sId
     * @returns {Object}
     */
    getElementById: _getElementById
};

},{}],4:[function(require,module,exports){
'use strict';
/**
 * Creates a parser that simplifies complex objects by removing non-serializable functions and complex instances.
 * @constructor
 */
function ObjectParser() {
}
/**
 * Checks whether a given object is a simple/plain object.
 * @param {Object} object - input object, must not be null
 * @returns {boolean} true if simple object, false else
 * @private
 */
ObjectParser.prototype._isSimpleObject = function (object) {
    // Check if toString output indicates object
    if (typeof object.toString === 'function' && object.toString() !== '[object Object]') {
        return false;
    }
    var proto = object.prototype;
    // Check if prototype is missing
    if (!proto) {
        return true;
    }
    // Check if constructed by a global object function
    var Ctor = proto.hasOwnProperty('constructor') && proto.constructor;
    return typeof Ctor === 'function' && Ctor.toString() === 'function() {}';
};
/**
 * Deep copies an object.
 * @param {Object} object - the object, must not be null
 * @param {Array} predecessors - list of predecessors to detect circular references
 * @returns {Array|Object} the deep copied object
 * @private
 */
ObjectParser.prototype._deepCopy = function (object, predecessors) {
    this.visitedObjects.push(object);
    var targetObject = Array.isArray(object) ? [] : {};
    this.createdObjects.push(targetObject);
    var currentPredecessors = predecessors.slice(0);
    currentPredecessors.push(object);
    for (var sKey in object) {
        // Ignore undefined and functions (similar to JSON.stringify)
        if (object[sKey] !== undefined && typeof object[sKey] !== 'function') {
            // Recursive call
            targetObject[sKey] = this._parseObject(object[sKey], currentPredecessors);
        }
    }
    return targetObject;
};
/**
 * Parses an object recursively.
 * @param {*} object - the object to parse, can be a simple type
 * @param {Array} predecessors - list of predecessors to detect circular references
 * @returns {*} returns the parsed object
 * @private
 */
ObjectParser.prototype._parseObject = function (object, predecessors) {
    // Resolve simple type
    if (object === null || typeof object === 'number' || typeof object === 'boolean' || typeof object === 'string') {
        return object;
    }
    // Ignore complex types
    if (!Array.isArray(object) && !this._isSimpleObject(object)) {
        return '<OBJECT>';
    }
    // Ignore & mark circular reference
    if (predecessors.indexOf(object) !== -1) {
        return '<CIRCULAR REFERENCE>';
    }
    // Resolve simple reference
    var referenceIndex = this.visitedObjects.indexOf(object);
    if (referenceIndex !== -1) {
        return this.createdObjects[referenceIndex];
    }
    // Handle object by deep copy
    return this._deepCopy(object, predecessors);
};
/**
 * Parses given object into a JSON object removing all functions and remove circular references.
 * @param {Object} object - input object
 * @returns {Object} JSON object
 */
ObjectParser.prototype.parse = function (object) {
    this.visitedObjects = [];
    this.createdObjects = [];
    return this._parseObject(object, []);
};
var messageParser = new ObjectParser();
module.exports = {
    /**
     * Send message to content script.
     * @param {Object} object
     */
    send: function (object) {
        var message = {
            detail: messageParser.parse(object)
        };
        document.dispatchEvent(new CustomEvent('ui5-communication-with-content-script', message));
    }
};

},{}],5:[function(require,module,exports){
'use strict';
module.exports = {
    // Reference for the ID of the last click UI5 control.
    _clickedElementId: null,
    /**
     * Return the ID of the UI5 control that was clicked.
     * @returns {string}
     */
    getClickedElementId: function () {
        return this._clickedElementId;
    },
    /**
     * Set the ID of the UI5 control that was clicked.
     * @param {Element} target
     * @returns {string}
     */
    setClickedElementId: function (target) {
        while (target && !target.getAttribute('data-sap-ui')) {
            if (target.nodeName === 'BODY') {
                break;
            }
            target = target.parentNode;
        }
        this._clickedElementId = target.id;
        return this;
    }
};

},{}],6:[function(require,module,exports){
'use strict';
/**
 * Create global reference for the extension.
 * @private
 */
function _createReferences() {
    if (window.ui5inspector === undefined) {
        window.ui5inspector = {
            events: Object.create(null)
        };
    }
}
/**
 * Register event listener if is not already registered.
 * @param {string} eventName - the name of the event that will be register
 * @callback
 * @private
 */
function _registerEventListener(eventName, callback) {
    if (window.ui5inspector.events[eventName] === undefined) {
        // Register reference
        window.ui5inspector.events[eventName] = {
            callback: callback.name,
            state: 'registered'
        };
        document.addEventListener(eventName, callback, false);
    }
}
module.exports = {
    createReferences: _createReferences,
    registerEventListener: _registerEventListener
};

},{}],7:[function(require,module,exports){
'use strict';
/**
 * @typedef {Object} resolveMessageOptions
 * @property {Object} message - port.onMessage.addListener parameter
 * @property {Object} messageSender - port.onMessage.addListener parameter
 * @property {Object} sendResponse - port.onMessage.addListener parameter
 * @property {Object} actions - Object with all the needed actions as methods
 */
/**
 * Calls the needed message action.
 * @param {resolveMessageOptions} options
 * @private
 */
function _resolveMessage(options) {
    if (!options) {
        return;
    }
    var message = options.message;
    var messageSender = options.messageSender;
    var sendResponse = options.sendResponse;
    var actions = options.actions;
    var messageHandlerFunction = actions[message.action];
    if (messageHandlerFunction) {
        messageHandlerFunction(message, messageSender, sendResponse);
    }
}
/**
 * Convert UI5 timestamp to readable date.
 * @param {string} timeStamp  - timestamp in UI5 format ("20150427-1201")
 * @returns {string|undefined}
 * @private
 */
function _convertUI5TimeStampToHumanReadableFormat(timeStamp) {
    var formattedTime = '';
    if (!timeStamp) {
        return;
    }
    timeStamp = timeStamp.replace(/-/g, '');
    // Year
    formattedTime += timeStamp.substr(0, 4) + '/';
    // Month
    formattedTime += timeStamp.substr(4, 2) + '/';
    // Date
    formattedTime += timeStamp.substr(6, 2);
    formattedTime += ' ';
    // Hour
    formattedTime += timeStamp.substr(8, 2) + ':';
    // Minutes
    formattedTime += timeStamp.substr(10, 2) + 'h';
    return formattedTime;
}
/**
 * Set specific class for each OS.
 * @private
 */
function _setOSClassNameToBody() {
    // Set a body attribute for detecting and styling according the OS
    var osName = '';
    if (navigator.appVersion.indexOf('Win') !== -1) {
        osName = 'windows';
    }
    if (navigator.appVersion.indexOf('Mac') !== -1) {
        osName = 'mac';
    }
    if (navigator.appVersion.indexOf('Linux') !== -1) {
        osName = 'linux';
    }
    document.querySelector('body').setAttribute('os', osName);
}
/**
 * Applies the theme. Default is light.
 * @private
 */
function _applyTheme(theme) {
    var oldLink = document.getElementById('ui5inspector-theme');
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    var url = '/styles/themes/light/light.css';
    if (oldLink) {
        oldLink.remove();
    }
    if (theme === 'dark') {
        url = '/styles/themes/dark/dark.css';
    }
    link.id = 'ui5inspector-theme';
    link.rel = 'stylesheet';
    link.href = url;
    head.appendChild(link);
}
function _isObjectEmpty(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}
function _getPort() {
    return {
        postMessage: function (message, callback) {
            chrome.runtime.sendMessage(message, callback);
        },
        onMessage: function (callback) {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                callback(request, sender, sendResponse);
            });
        }
    };
}
/**
 * Send message to all ports listening.
 * @param {Object} message
 */
function _sendToAll(message, callback) {
    var frameId = message.frameId;
    var options;
    chrome.windows.getCurrent().then(w => {
        chrome.tabs.query({ active: true, windowId: w.id }).then(tabs => {
            // options.frameId allows to send the message to
            // a specific frame instead of all frames in the tab
            if (frameId !== undefined) {
                options = { frameId };
            }
            chrome.tabs.sendMessage(tabs[0].id, message, options, callback);
        });
    });
}
module.exports = {
    formatter: {
        convertUI5TimeStampToHumanReadableFormat: _convertUI5TimeStampToHumanReadableFormat
    },
    resolveMessage: _resolveMessage,
    setOSClassName: _setOSClassNameToBody,
    applyTheme: _applyTheme,
    isObjectEmpty: _isObjectEmpty,
    getPort: _getPort,
    sendToAll: _sendToAll
};

},{}]},{},[1]);
