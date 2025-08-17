(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

exports.homedir = function () {
	return '/'
};

},{}],2:[function(require,module,exports){
'use strict';

var _os = require('os');

var stringTimesN = function stringTimesN(n, char) {
  return Array(n + 1).join(char);
};

// Adapted from https://gist.github.com/sente/1083506
function prettifyXml(xmlInput) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _options$indent = options.indent,
      indentOption = _options$indent === undefined ? 2 : _options$indent,
      _options$newline = options.newline,
      newlineOption = _options$newline === undefined ? _os.EOL : _options$newline;

  var indentString = stringTimesN(indentOption, ' ');

  var formatted = '';
  var regex = /(>)(<)(\/*)/g;
  var xml = xmlInput.replace(regex, '$1' + newlineOption + '$2$3');
  var pad = 0;
  xml.split(/\r?\n/).forEach(function (l) {
    var line = l.trim();

    var indent = 0;
    if (line.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (line.match(/^<\/\w/)) {
      // Somehow istanbul doesn't see the else case as covered, although it is. Skip it.
      /* istanbul ignore else  */
      if (pad !== 0) {
        pad -= 1;
      }
    } else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }

    var padding = stringTimesN(pad, indentString);
    formatted += padding + line + newlineOption; // eslint-disable-line prefer-template
    pad += indent;
  });

  return formatted.trim();
}

// For non-es2015 usage
module.exports = prettifyXml;
},{"os":1}],3:[function(require,module,exports){
// jshint maxstatements:52
(function () {
    'use strict';
    // ================================================================================
    // Main controller for 'UI5' tab in devtools
    // ================================================================================
    // ================================================================================
    // Bootstrap
    // ================================================================================
    // Components that need to be required and reference
    // ================================================================================
    var utils = require('../../../modules/utils/utils.js');
    var TabBar = require('../../../modules/ui/TabBar.js');
    var FrameSelect = require('../../../modules/ui/FrameSelect.js');
    var ControlTree = require('../../../modules/ui/ControlTree.js');
    var DataView = require('../../../modules/ui/DataView.js');
    var Splitter = require('../../../modules/ui/SplitContainer.js');
    var ODataDetailView = require('../../../modules/ui/ODataDetailView.js');
    var ODataMasterView = require('../../../modules/ui/ODataMasterView.js');
    var XMLDetailView = require('../../../modules/ui/XMLDetailView.js');
    var ControllerDetailView = require('../../../modules/ui/ControllerDetailView.js');
    var OElementsRegistryMasterView = require('../../../modules/ui/OElementsRegistryMasterView.js');
    // Apply theme
    // ================================================================================
    utils.applyTheme(chrome.devtools.panels.themeName);
    // Create a port with background page for continuous message communication
    // ================================================================================
    var port = Object.assign(utils.getPort(), {
        onMessage: function (callback) {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                // accept only messages from the inspected tab
                // or from the extension's own background script
                if ((sender.tab && sender.tab.id === chrome.devtools.inspectedWindow.tabId) ||
                    (!sender.tab && sender.id === chrome.runtime.id)) {
                    callback(request, sender, sendResponse);
                }
            });
        }
    });
    // Bootstrap for 'Control inspector' tab
    // ================================================================================
    utils.setOSClassName();
    var frameData = {};
    var framesSelect;
    var displayFrameData;
    var updateSupportabilityOverlay;
    var sharedDataViewOptions = {
        /**
         * Send message upon click to copy control to console
         * @param {Object} data
         */
        onCopyControlToConsole: function (data) {
            port.postMessage({
                action: 'do-copy-control-to-console',
                data: data,
                frameId: framesSelect.getSelectedId()
            });
        }
    };
    // Main tabbar inside 'UI5' devtools panel
    var UI5TabBar = new TabBar('ui5-tabbar');
    // Horizontal Splitter for 'Control Inspector' tab
    var controlInspectorHorizontalSplitter = new Splitter('control-inspector-splitter', {
        endContainerWidth: '400px'
    });
    // Control tree
    var controlTree = new ControlTree('control-tree', {
        /**
         * Send message, that the a new element is selected in the ControlTree.
         * @param {string} selectedElementId
         */
        onSelectionChanged: function (selectedElementId) {
            port.postMessage({
                action: 'do-control-select',
                target: selectedElementId,
                frameId: framesSelect.getSelectedId()
            });
            frameData[framesSelect.getSelectedId()].selectedElementId = selectedElementId;
        },
        /**
         * Send message, that the a new element is hovered in the ControlTree.
         * @param {string} hoveredElementId
         */
        onHoverChanged: function (hoveredElementId) {
            port.postMessage({
                action: 'on-control-tree-hover',
                target: hoveredElementId,
                frameId: framesSelect.getSelectedId()
            });
        },
        /**
         * Fired at first rendering of the ControlTree.
         */
        onInitialRendering: function () {
            var controls = this.getData().controls;
            this.setSelectedElement(controls[0].id);
        }
    });
    // Tabbar for Controltree additional information (Properties, Binding and etc)
    var controlTreeTabBar = new TabBar('control-tree-tabbar');
    // Dataview for control properties
    var controlProperties = new DataView('control-properties', Object.assign({
        /**
         * Send message, that an proprety in the DataView is changed.
         * @param {Object} changeData
         */
        onPropertyUpdated: function (changeData) {
            port.postMessage({
                action: 'do-control-property-change',
                data: changeData,
                frameId: framesSelect.getSelectedId()
            });
        }
    }, sharedDataViewOptions));
    // Vertical splitter for 'Bindings' tab
    var controlBindingsSplitter = new Splitter('control-bindings-splitter', {
        hideEndContainer: true,
        isEndContainerClosable: true,
        endContainerTitle: 'Model Information'
    });
    // Dataview for control aggregations
    var controlAggregations = new DataView('control-aggregations', sharedDataViewOptions);
    // Dataview for control binding information
    var controlBindingInfoRightDataView = new DataView('control-bindings-right');
    // Dataview for control binding information - left part
    var controlBindingInfoLeftDataView = new DataView('control-bindings-left', {
        /**
         * Method fired when a clickable element is clicked.
         * @param {Object} event
         */
        onValueClick: function (event) {
            var dataFormatedForDataView = {
                modelInfo: {
                    options: {
                        title: 'Model Information',
                        expandable: false,
                        expanded: true,
                        hideTitle: true
                    },
                    data: event.data
                }
            };
            controlBindingInfoRightDataView.setData(dataFormatedForDataView);
            controlBindingsSplitter.showEndContainer();
        }
    });
    // Dataview for control events
    var controlEvents = new DataView('control-events', Object.assign({
        /**
         * Method fired when a clickable element is clicked.
         * @param {Object} event
         */
        onValueClick: function (event) {
            port.postMessage({
                action: 'do-console-log-event-listener',
                data: event.data,
                frameId: framesSelect.getSelectedId()
            });
        }
    }, sharedDataViewOptions));
    var controlActions = new DataView('control-actions', Object.assign({
        onControlInvalidated: function (changeData) {
            port.postMessage({
                action: 'do-control-invalidate',
                data: changeData
            });
        },
        onControlFocused: function (changeData) {
            port.postMessage({
                action: 'do-control-focus',
                data: changeData
            });
        },
        onCopyControlHTMLToConsole: function (changeData) {
            port.postMessage({
                action: 'do-control-copy-html',
                target: changeData.controlId,
                tabId: chrome.devtools.inspectedWindow.tabId,
                file: '/scripts/background/main.js'
            });
        }
    }, sharedDataViewOptions));
    // Bootstrap for 'Control inspector' tab
    // ================================================================================
    // Dataview for 'Application information' tab
    var appInfo = new DataView('app-info');
    // Bootstrap for 'OData' tab
    // ================================================================================
    var odataHorizontalSplitter = new Splitter('odata-splitter', {
        endContainerWidth: '50%',
        isEndContainerClosable: true,
        hideEndContainer: true
    });
    // Dataview for OData requests
    // ================================================================================
    var oDataDetailView = new ODataDetailView('odata-tab-detail');
    new ODataMasterView('odata-tab-master', {
        /**
         * Method fired when an OData Entry log is selected.
         * @param {Object} data
         */
        onSelectItem: function (data) {
            odataHorizontalSplitter.showEndContainer();
            oDataDetailView.update(data);
        },
        /**
         * Clears all OData Entry log items.
         */
        onClearItems: function () {
            oDataDetailView.clear();
            odataHorizontalSplitter.hideEndContainer();
        }
    });
    // XML visualization for XML Views
    var oXMLDetailView = new XMLDetailView('elements-registry-control-xmlview');
    var oControllerDetailView = new ControllerDetailView('elements-registry-control-controller');
    var oElementsRegistryMasterView = new OElementsRegistryMasterView('elements-registry-tab-master', {
        XMLDetailView: oXMLDetailView,
        ControllerDetailView: oControllerDetailView,
        /**
         * Method fired when a Control is selected.
         * @param {string} sControlId
         */
        onSelectItem: function (sControlId) {
            /**
             * Send message, that the a new element is selected in the ElementsRegistry tab.
             * @param {string} sControlId
             */
            port.postMessage({
                action: 'do-control-select-elements-registry',
                target: sControlId,
                frameId: framesSelect.getSelectedId()
            });
        },
        /**
         * Refresh ElementRegistry tab.
         */
        onRefreshButtonClicked: function () {
            port.postMessage({
                action: 'do-elements-registry-refresh',
                frameId: framesSelect.getSelectedId()
            });
        }
    });
    // Horizontal Splitter for 'Elements Registry' tab
    var controlInspectorHorizontalSplitterElementsRegistry = new Splitter('elements-registry-splitter', {
        endContainerWidth: '400px'
    });
    // Tabbar for Elements Registry additional information (Properties, Binding and etc)
    var elementsRegistryTabBar = new TabBar('elements-registry-tabbar');
    // Dataview for control properties
    var controlPropertiesElementsRegistry = new DataView('elements-registry-control-properties', Object.assign({
        /**
         * Send message, that an proprety in the DataView is changed.
         * @param {Object} changeData
         */
        onPropertyUpdated: function (changeData) {
            port.postMessage({
                action: 'do-control-property-change-elements-registry',
                data: changeData,
                frameId: framesSelect.getSelectedId()
            });
        }
    }, sharedDataViewOptions));
    // Vertical splitter for 'Bindings' tab
    var controlBindingsSplitterElementsRegistry = new Splitter('elements-registry-control-bindings-splitter', {
        hideEndContainer: true,
        isEndContainerClosable: true,
        endContainerTitle: 'Model Information'
    });
    // Dataview for control aggregations
    var controlAggregationsElementsRegistry = new DataView('elements-registry-control-aggregations', sharedDataViewOptions);
    // Dataview for control binding information
    var controlBindingInfoRightDataViewElementsRegistry = new DataView('elements-registry-control-bindings-right');
    // Dataview for control binding information - left part
    var controlBindingInfoLeftDataViewElementsRegistry = new DataView('elements-registry-control-bindings-left', {
        /**
         * Method fired when a clickable element is clicked.
         * @param {Object} event
         */
        onValueClick: function (event) {
            var dataFormatedForDataView = {
                modelInfo: {
                    options: {
                        title: 'Model Information',
                        expandable: false,
                        expanded: true,
                        hideTitle: true
                    },
                    data: event.data
                }
            };
            controlBindingInfoRightDataViewElementsRegistry.setData(dataFormatedForDataView);
            controlBindingsSplitterElementsRegistry.showEndContainer();
        }
    });
    // Dataview for control events
    var controlEventsElementsRegistry = new DataView('elements-registry-control-events', Object.assign({
        /**
         * Method fired when a clickable element is clicked.
         * @param {Object} event
         */
        onValueClick: function (event) {
            port.postMessage({
                action: 'do-console-log-event-listener',
                data: event.data,
                frameId: framesSelect.getSelectedId()
            });
        }
    }, sharedDataViewOptions));
    displayFrameData = function (options) {
        var frameId = options.selectedId;
        var oldFrameId = options.oldSelectedId;
        var UI5Data = frameData[frameId];
        framesSelect.setSelectedId(frameId);
        updateSupportabilityOverlay();
        if (UI5Data) {
            controlTree.setData(UI5Data.controlTree);
            UI5Data.selectedElementId && controlTree.setSelectedElement(UI5Data.selectedElementId);
            appInfo.setData(UI5Data.applicationInformation);
            UI5Data.elementRegistry && oElementsRegistryMasterView.setData(UI5Data.elementRegistry);
            controlProperties.setData(UI5Data.controlProperties || {});
            controlBindingInfoLeftDataView.setData(UI5Data.controlBindings || {});
            controlAggregations.setData(UI5Data.controlAggregations || {});
            controlEvents.setData(UI5Data.controlEvents || {});
            controlPropertiesElementsRegistry.setData({});
            controlBindingInfoLeftDataViewElementsRegistry.setData({});
            controlAggregationsElementsRegistry.setData({});
            controlEventsElementsRegistry.setData({});
            // Set bindings count
            if (UI5Data.controlBindings) {
                document.querySelector('#tab-bindings count').innerHTML = '&nbsp;(' + Object.keys(UI5Data.controlBindings).length + ')';
            }
            controlTree.setSelectedElement(UI5Data.nearestUI5Control);
        }
        // after switching to inspect a new frame,
        // hide any highlights that were needed for
        // the previousy inspected frame
        port.postMessage({
            action: 'on-hide-highlight',
            frameId: oldFrameId
        });
    };
    updateSupportabilityOverlay = function () {
        var currentFrameData = frameData[framesSelect.getSelectedId()];
        if (!currentFrameData) {
            return;
        }
        var overlay = document.getElementById('supportability');
        var overlayNoUI5Section = overlay.querySelector('[no-ui5-version]');
        var overlayUnsupportedVersionSection = overlay.querySelector('[unsupported-version]');
        var showOverlay = !currentFrameData.isUI5Detected || !currentFrameData.isVersionSupported;
        var showNoUI5Overlay = !currentFrameData.isUI5Detected;
        var showUnsupportedVersionOverlay = currentFrameData.isUI5Detected && !currentFrameData.isVersionSupported;
        overlay.hidden = !showOverlay;
        overlayNoUI5Section.style.display = showNoUI5Overlay ? 'block' : 'none';
        overlayUnsupportedVersionSection.style.display = showUnsupportedVersionOverlay ? 'block' : 'none';
    };
    framesSelect = new FrameSelect('frame-select', {
        onSelectionChange: displayFrameData
    });
    // ================================================================================
    // Communication
    // ================================================================================
    // Name space for message handler functions.
    var messageHandler = {
        /**
         * Handler for UI5 detection on the current inspected page.
         * @param {Object} message
         */
        'on-ui5-detected': function (message, messageSender) {
            frameData[messageSender.frameId] = {
                isUI5Detected: true,
                isVersionSupported: message.isVersionSupported,
                url: messageSender.url
            };
            framesSelect.setData(frameData);
            if (framesSelect.getSelectedId() === messageSender.frameId) {
                updateSupportabilityOverlay();
            }
            port.postMessage({
                action: 'do-script-injection',
                tabId: chrome.devtools.inspectedWindow.tabId,
                frameId: messageSender.frameId,
                file: '/scripts/content/main.js'
            });
        },
        /**
         * Get the initial needed information, when the main injected script is available.
         * @param {Object} message
         */
        'on-main-script-injection': function (message, messageSender) {
            port.postMessage({
                action: 'get-initial-information',
                frameId: messageSender.frameId
            });
        },
        /**
         * Visualize the initial needed data for the extension.
         * @param {Object} message
         */
        'on-receiving-initial-data': function (message, messageSender) {
            var frameId = messageSender.frameId;
            frameData[frameId].controlTree = message.controlTree;
            frameData[frameId].applicationInformation = message.applicationInformation;
            frameData[frameId].elementRegistry = message.elementRegistry;
            if (framesSelect.getSelectedId() === frameId) {
                controlTree.setData(message.controlTree);
                appInfo.setData(message.applicationInformation);
                oElementsRegistryMasterView.setData(message.elementRegistry);
            }
        },
        /**
         * Refresh Elements Registry data.
         * @param {Object} message
         */
        'on-receiving-elements-registry-refresh-data': function (message, messageSender) {
            var frameId = messageSender.frameId;
            frameData[frameId].elementRegistry = message.elementRegistry;
            if (framesSelect.getSelectedId() === frameId) {
                oElementsRegistryMasterView.setData(message.elementRegistry);
            }
        },
        /**
         * Updates the ControlTree, when the DOM in the inspected window is changed.
         * @param {Object} message
         */
        'on-application-dom-update': function (message, messageSender) {
            var frameId = messageSender.frameId;
            var frameIds = Object.keys(frameData).map(x => parseInt(x));
            frameData[frameId].controlTree = message.controlTree;
            if (framesSelect.getSelectedId() === frameId) {
                controlTree.setData(message.controlTree);
            }
            if (frameIds.length > 1) {
                // send a request to the background script
                // to ping each of the frame ids listed in <code>aFrameIds</code>
                // The background page will send an "on-ping-frames" async response
                // with the updated list once it pinged all individual frames
                port.postMessage({
                    action: 'do-ping-frames',
                    frameIds: frameIds
                });
            }
        },
        /**
         * Handler for ControlTree element selecting.
         * @param {Object} message
         */
        'on-control-select': function (message, messageSender) {
            var frameId = messageSender.frameId;
            frameData[frameId].controlProperties = message.controlProperties;
            frameData[frameId].controlBindings = message.controlBindings;
            frameData[frameId].controlAggregations = message.controlAggregations;
            frameData[frameId].controlEvents = message.controlEvents;
            if (framesSelect.getSelectedId() === frameId) {
                controlProperties.setData(message.controlProperties);
                controlBindingInfoLeftDataView.setData(message.controlBindings);
                controlAggregations.setData(message.controlAggregations);
                controlEvents.setData(message.controlEvents);
                controlActions.setData(message.controlActions);
                // Set bindings count
                document.querySelector('#tab-bindings count').innerHTML = '&nbsp;(' + Object.keys(message.controlBindings).length + ')';
                // Close possible open binding info and/or methods info
                controlBindingsSplitter.hideEndContainer();
            }
        },
        /**
         * Handler for Elements Registry element selecting.
         * @param {Object} message
         */
        'on-control-select-elements-registry': function (message, messageSender) {
            var frameId = messageSender.frameId;
            frameData[frameId].controlProperties = message.controlProperties;
            frameData[frameId].controlBindings = message.controlBindings;
            frameData[frameId].controlAggregations = message.controlAggregations;
            frameData[frameId].controlEvents = message.controlEvents;
            if (framesSelect.getSelectedId() === frameId) {
                controlPropertiesElementsRegistry.setData(message.controlProperties);
                controlBindingInfoLeftDataViewElementsRegistry.setData(message.controlBindings);
                controlAggregationsElementsRegistry.setData(message.controlAggregations);
                controlEventsElementsRegistry.setData(message.controlEvents);
                // Set bindings count
                document.querySelector('#tab-bindings count').innerHTML = '&nbsp;(' + Object.keys(message.controlBindings).length + ')';
                // Close possible open binding info and/or methods info
                controlBindingsSplitterElementsRegistry.hideEndContainer();
            }
        },
        /**
         * Select ControlTree element, based on selection in the Element panel.
         * @param {Object} message
         */
        'on-select-ui5-control-from-element-tab': function (message, messageSender) {
            var frameId = messageSender.frameId;
            frameData[frameId].nearestUI5Control = message.nearestUI5Control;
            if (framesSelect.getSelectedId() === frameId) {
                controlTree.setSelectedElement(message.nearestUI5Control);
            }
        },
        /**
         * Select ControlTree element, based on right click and context menu.
         * @param {Object} message
         */
        'on-contextMenu-control-select': function (message) {
            displayFrameData({
                selectedId: message.frameId,
                oldSelectedId: framesSelect.getSelectedId()
            });
            controlTree.setSelectedElement(message.target);
        },
        /**
         * Handler for UI5 none detection on the current inspected page.
         * @param {Object} message
         */
        'on-ui5-not-detected': function (message, messageSender) {
            frameData[messageSender.frameId] = {
                isUI5Detected: false,
                url: messageSender.url
            };
            framesSelect.setData(frameData);
            if (framesSelect.getSelectedId() === messageSender.frameId) {
                updateSupportabilityOverlay();
            }
        },
        'on-ping-frames': function (message) {
            var aLatestFrameIds = message.frameIds;
            var aFrameIds = Object.keys(frameData).map(x => parseInt(x));
            var bFrameUpdate = false;
            aFrameIds.forEach(function (iFrameId) {
                if (aLatestFrameIds.indexOf(iFrameId) < 0) {
                    delete frameData[iFrameId];
                    bFrameUpdate = true;
                }
            });
            if (bFrameUpdate) {
                framesSelect.setData(frameData);
            }
        }
    };
    // Listen for messages from the background page
    port.onMessage(function (message, messageSender, sendResponse) {
        // Resolve incoming messages
        utils.resolveMessage({
            message: message,
            messageSender: messageSender,
            sendResponse: sendResponse,
            actions: messageHandler
        });
    });
    port.postMessage({ action: 'do-ui5-detection' });
    // Restart everything when the URL is changed
    chrome.devtools.network.onNavigated.addListener(function () {
        frameData = {};
        framesSelect.setSelectedId(0);
        framesSelect.setData(frameData);
        port.postMessage({ action: 'do-ui5-detection' });
    });
}());

},{"../../../modules/ui/ControlTree.js":4,"../../../modules/ui/ControllerDetailView.js":5,"../../../modules/ui/DataView.js":6,"../../../modules/ui/FrameSelect.js":7,"../../../modules/ui/ODataDetailView.js":9,"../../../modules/ui/ODataMasterView.js":10,"../../../modules/ui/OElementsRegistryMasterView.js":11,"../../../modules/ui/SplitContainer.js":12,"../../../modules/ui/TabBar.js":13,"../../../modules/ui/XMLDetailView.js":14,"../../../modules/utils/utils.js":22}],4:[function(require,module,exports){
'use strict';
/**
 * @typedef {Object} ControlTree
 * @property {Object} data - This property should contain objects described in ControlTreeOptions
 * @function onSelectionChanged
 * @function onHoverChanged

 */
/**
 * @typedef {Object} ControlTreeOptions
 * @property {Object} versionInfo - JSON object with the fowling format:
 *  {
 *      framework: 'string',
 *      version: 'string'
 *  }
 * @property {Object} controls - Array with JSON object in the following format:
 *  [{
 *      id: 'string',
 *      name: 'string',
 *      type: 'string',
 *      content: 'Array'
 *  }]
 */
/**
 * @typedef {Object} controlTreeRenderingOptions
 * @property {string} id - The id of the control.
 * @property {Array} attributes - HTML attributes.
 */
/**
 * Check for JS object.
 * @param {Object} data
 * @returns {boolean}
 * @private
 */
function _isObject(data) {
    return (typeof data === 'object' && !Array.isArray(data) && data !== null);
}
/**
 * Create tree element that shows framework name and version.
 * @param {Object} versionInfo
 * @returns {string}
 * @private
 */
function _createTreeHeader(versionInfo) {
    if (!versionInfo) {
        console.warn('There is no version information in the data model');
        return '';
    }
    return '<ul><li visible><version>&#60;!' + versionInfo.framework + ' v' + versionInfo.version + '&#62;</version></li></ul>';
}
/**
 * @param {controlTreeRenderingOptions} options
 * @returns {string}
 * @private
 */
function _startControlTreeList(options) {
    return '<ul ' + options.attributes.join(' ') + '>';
}
/**
 * @returns {string}
 * @private
 */
function _endControlTreeList() {
    return '</ul>';
}
/**
 * @param {controlTreeRenderingOptions.controls} options
 * @returns {string}
 * @private
 */
function _startControlTreeListItem(options) {
    return '<li id="' + options.id + '">';
}
/**
 * @returns {string}
 * @private
 */
function _endControlTreeListItem() {
    return '</li>';
}
/**
 * Create HTML for the left part of the ControlTree list item.
 * @param {ControlTreeOptions.controls} controls
 * @param {number} paddingLeft
 * @returns {string}
 * @private
 */
function _getControlTreeLeftColumnOfListItem(controls, paddingLeft) {
    var html = '<offset style="padding-left:' + paddingLeft + 'px" >';
    if (controls.content.length > 0) {
        html += '<arrow down="true"></arrow>';
    }
    else {
        html += '<place-holder></place-holder>';
    }
    html += '</offset>';
    return html;
}
/**
 * Create HTML for the right part of the ControlTree list item.
 * @param {Object} control - JSON object form {ControlTreeOptions.controls}
 * @returns {string}
 * @private
 */
function _getControlTreeRightColumnOfListItem(control) {
    var splitControlName = control.name.split('.');
    var name = splitControlName[splitControlName.length - 1];
    var nameSpace = control.name.replace(name, '');
    return '<tag data-search="' + control.name + control.id + '">' +
        '&#60;' +
        '<namespace>' + nameSpace + '</namespace>' +
        name +
        '<attribute>&#32;id="<attribute-value>' + control.id + '</attribute-value>"</attribute>' +
        '&#62;' +
        '</tag>';
}
/**
 * Search for the nearest parent Node.
 * @param {element} element - HTML DOM element that will be the root of the search
 * @param {string} parentNodeName - The desired HTML parent element nodeName
 * @returns {Object} HTML DOM element
 * @private
 */
function _findNearestDOMParent(element, parentNodeName) {
    while (element.nodeName !== parentNodeName) {
        if (element.nodeName === 'CONTROL-TREE') {
            break;
        }
        element = element.parentNode;
    }
    return element;
}
/**
 * ControlTree constructor.
 * @param {string} id - The id of the DOM container
 * @param {ControlTree} instantiationOptions
 * @constructor
 */
function ControlTree(id, instantiationOptions) {
    var areInstantiationOptionsAnObject = _isObject(instantiationOptions);
    var options;
    /**
     * Make sure that the options parameter is Object and
     * that the ControlTree can be instantiate without initial options.
     */
    if (areInstantiationOptionsAnObject) {
        options = instantiationOptions;
    }
    else {
        options = {
            data: {}
        };
    }
    // Save DOM reference
    this._controlTreeContainer = document.getElementById(id);
    /**
     * Method fired when the selected element in the ControlTree is changed.
     * @param {string} selectedElementId - The selected element id
     */
    this.onSelectionChanged = options.onSelectionChanged ? options.onSelectionChanged : function (selectedElementId) {
    };
    /**
     * Method fired when the hovered element in the ControlTree is changed.
     * @param {string} hoveredElementId - The hovered element id
     */
    this.onHoverChanged = options.onHoverChanged ? options.onHoverChanged : function (hoveredElementId) {
    };
    /**
     * Method fired when the initial ControlTree rendering is done.
     */
    this.onInitialRendering = options.onInitialRendering ? options.onInitialRendering : function () {
    };
    // Object with the tree model that will be visualized
    this.setData(options.data);
}
/**
 * Initialize Tree.
 */
ControlTree.prototype.init = function () {
    this._createHTML();
    this._initFocus();
    this._createHandlers();
    // Fire event to notify that the ControlTree is initialized
    this.onInitialRendering();
};
/**
 * Get the data model used for the tree.
 * @returns {ControlTreeOptions} the data that is used for the tree
 */
ControlTree.prototype.getData = function () {
    return this._data;
};
/**
 * Set the data model used for the tree.
 * @param {ControlTreeOptions} data
 * @returns {ControlTree}
 */
ControlTree.prototype.setData = function (data) {
    var oldData = this.getData();
    var isDataAnObject = _isObject(data);
    if (isDataAnObject === false) {
        console.warn('The parameter should be an Object');
        return;
    }
    // Make sure that the new data is different from the old one
    if (JSON.stringify(oldData) === JSON.stringify(data)) {
        return;
    }
    this._data = data;
    // Initialize ControlTree on first rendering
    // If it is a second rendering, render only the tree elements
    if (this._isFirstRendering === undefined) {
        this.init();
        this._isFirstRendering = true;
    }
    else {
        this._createTree();
    }
    return this;
};
/**
 * Returns the selected <li> element of the tree.
 * @returns {Element} HTML DOM element
 */
ControlTree.prototype.getSelectedElement = function () {
    return this._selectedElement;
};
/**
 * Set the selected <li> element of the tree.
 * @param {string} elementID - HTML DOM element id
 * @returns {ControlTree}
 */
ControlTree.prototype.setSelectedElement = function (elementID) {
    var selectedElement;
    if (typeof elementID !== 'string') {
        console.warn('Please use a valid string parameter');
        return;
    }
    selectedElement = this._controlTreeContainer.querySelector(`[id="${elementID}"]`);
    if (selectedElement === null) {
        console.warn('The selected element is not a child of the ControlTree');
        return;
    }
    this._selectedElement = selectedElement;
    this._selectTreeElement(selectedElement);
    return this;
};
/**
 * Create and places the ControlTree HTML.
 * @private
 */
ControlTree.prototype._createHTML = function () {
    var html;
    html = this._createFilter();
    html += this._createTreeContainer();
    this._controlTreeContainer.innerHTML = html;
    // Save reverences for future use
    this._setReferences();
    if (this.getData() !== undefined) {
        this._createTree();
    }
};
/**
 * Sets initial focus.
 * @private
 */
ControlTree.prototype._initFocus = function () {
    var searchInput = document.querySelector('input[type="search"]');
    searchInput && searchInput.focus();
};
/**
 * Create the HTML needed for filtering.
 * @returns {string}
 * @private
 */
ControlTree.prototype._createFilter = function () {
    return '<filter>' +
        '<start>' +
        '<input type="search" placeholder="Search" search/>' +
        '<label><input type="checkbox" filter />Filter results <results>(0)</results></label>' +
        '</start>' +
        '<end>' +
        '<label><input type="checkbox" namespaces checked/>Show Namespace</label>' +
        '<label><input type="checkbox" attributes checked/>Show Attributes</label>' +
        '</end>' +
        '</filter>';
};
/**
 * Create the HTML container for the tree.
 * @returns {string}
 * @private
 */
ControlTree.prototype._createTreeContainer = function () {
    return '<tree show-namespaces show-attributes></tree>';
};
/**
 * Create ControlTree HTML.
 */
ControlTree.prototype._createTree = function () {
    var versionInfo = this.getData().versionInfo;
    var controls = this.getData().controls;
    this._treeContainer.innerHTML = _createTreeHeader(versionInfo) + this._createTreeHTML(controls);
};
/**
 * Create HTML tree from JSON.
 * @param {ControlTreeOptions.controls} controls
 * @param {number} level - nested level
 * @returns {string} HTML ControlTree in form of a string
 * @private
 */
ControlTree.prototype._createTreeHTML = function (controls, level) {
    if (controls === undefined || controls.length === 0) {
        return '';
    }
    var html = '';
    var nestedLevel = level || 0;
    var paddingLeft = ++nestedLevel * 10;
    var that = this;
    controls.forEach(function (control) {
        html += _startControlTreeList({
            attributes: ['expanded="true"']
        });
        html += _startControlTreeListItem({
            id: control.id
        });
        html += _getControlTreeLeftColumnOfListItem(control, paddingLeft);
        html += _getControlTreeRightColumnOfListItem(control);
        html += _endControlTreeListItem();
        html += that._createTreeHTML(control.content, nestedLevel);
        html += _endControlTreeList();
    });
    return html;
};
/**
 * Hide/Show nested "<ul>" in "<li>" elements.
 * @param {Element} target - DOM element
 * @private
 */
ControlTree.prototype._toggleCollapse = function (target) {
    var targetParent = _findNearestDOMParent(target.parentNode, 'UL');
    if (target.getAttribute('right') === 'true') {
        target.removeAttribute('right');
        target.setAttribute('down', 'true');
        targetParent.setAttribute('expanded', 'true');
    }
    else if (target.getAttribute('down') === 'true') {
        target.removeAttribute('down');
        targetParent.removeAttribute('expanded');
        target.setAttribute('right', 'true');
    }
};
/**
 * Add visual selection to clicked "<li>" elements.
 * @param {Element} targetElement - DOM element
 * @private
 */
ControlTree.prototype._selectTreeElement = function (targetElement) {
    var selectedList = this._controlTreeContainer.querySelector('[selected]');
    var target = _findNearestDOMParent(targetElement, 'LI');
    // Prevent tree element selection for allowing proper multiple tree element selection for copy/paste
    if (target.id === this._controlTreeContainer.id) {
        return;
    }
    if (selectedList) {
        selectedList.removeAttribute('selected');
    }
    target.setAttribute('selected', 'true');
    this._scrollToElement(target);
    this.onSelectionChanged(target.id);
};
/**
 * Scroll to element in the ControlTree.
 * @param {Element} target - DOM element to which need to be scrolled
 */
ControlTree.prototype._scrollToElement = function (target) {
    var desiredViewBottomPosition = this._treeContainer.offsetHeight - this._treeContainer.offsetTop + this._treeContainer.scrollTop;
    if (target.offsetTop > desiredViewBottomPosition || target.offsetTop < this._treeContainer.scrollTop) {
        this._treeContainer.scrollTop = target.offsetTop - window.innerHeight / 6;
    }
};
/**
 * Search tree elements that match given criteria.
 * @param {string} userInput - Search criteria
 * @private
 */
ControlTree.prototype._searchInTree = function (userInput) {
    var searchableElements = this._controlTreeContainer.querySelectorAll('[data-search]');
    var searchInput = userInput.toLocaleLowerCase();
    var elementInformation;
    for (var i = 0; i < searchableElements.length; i++) {
        elementInformation = searchableElements[i].getAttribute('data-search').toLocaleLowerCase();
        if (elementInformation.indexOf(searchInput) !== -1) {
            searchableElements[i].parentNode.setAttribute('matching', true);
        }
        else {
            searchableElements[i].parentNode.removeAttribute('matching');
        }
    }
};
/**
 * Remove  "matching" attribute from the search.
 * @private
 */
ControlTree.prototype._removeAttributesFromSearch = function () {
    var elements = this._treeContainer.querySelectorAll('[matching]');
    for (var i = 0; i < elements.length; i++) {
        elements[i].removeAttribute('matching');
    }
};
/**
 * Visualize the number of elements which satisfy the search.
 * @private
 */
ControlTree.prototype._setSearchResultCount = function (count) {
    this._filterContainer.querySelector('results').innerHTML = '(' + count + ')';
};
/**
 * Event handler for mouse click on a tree element arrow.
 * @param {Object} event - click event
 * @private
 */
ControlTree.prototype._onArrowClick = function (event) {
    var target = event.target;
    if (target.nodeName === 'ARROW') {
        this._toggleCollapse(target);
    }
    else {
        this._selectTreeElement(target);
    }
};
/**
 * Event handler for user input in "search" input.
 * @param {Object} event - keyup event
 * @private
 */
ControlTree.prototype._onSearchInput = function (event) {
    var target = event.target;
    var searchResultCount;
    if (target.getAttribute('search') !== null) {
        if (target.value.length !== 0) {
            this._searchInTree(target.value);
        }
        else {
            this._removeAttributesFromSearch('matching');
        }
        searchResultCount = this._treeContainer.querySelectorAll('[matching]').length;
        this._setSearchResultCount(searchResultCount);
    }
};
/**
 * Event handler for onsearch event.
 * @param {Object} event - onsearch event
 * @private
 */
ControlTree.prototype._onSearchEvent = function (event) {
    var searchResultCount;
    if (event.target.value.length === 0) {
        this._removeAttributesFromSearch('matching');
        searchResultCount = this._treeContainer.querySelectorAll('[matching]').length;
        this._setSearchResultCount(searchResultCount);
    }
};
/**
 * Event handler for ControlTree options change.
 * @param {Object} event - click event
 * @private
 */
ControlTree.prototype._onOptionsChange = function (event) {
    var target = event.target;
    if (target.getAttribute('filter') !== null) {
        if (target.checked) {
            this._treeContainer.setAttribute('show-filtered-elements', true);
        }
        else {
            this._treeContainer.removeAttribute('show-filtered-elements');
        }
    }
    if (target.getAttribute('namespaces') !== null) {
        if (target.checked) {
            this._treeContainer.setAttribute('show-namespaces', true);
        }
        else {
            this._treeContainer.removeAttribute('show-namespaces');
        }
    }
    if (target.getAttribute('attributes') !== null) {
        if (target.checked) {
            this._treeContainer.setAttribute('show-attributes', true);
        }
        else {
            this._treeContainer.removeAttribute('show-attributes');
        }
    }
};
/**
 * Event handler for mouse hover on tree element.
 * @param {Object} event - mouse event
 * @private
 */
ControlTree.prototype._onTreeElementMouseHover = function (event) {
    var target = _findNearestDOMParent(event.target, 'LI');
    this.onHoverChanged(target.id);
};
/**
 * Create all event handlers for the ControlTree.
 * @private
 */
ControlTree.prototype._createHandlers = function () {
    this._treeContainer.onclick = this._onArrowClick.bind(this);
    this._filterContainer.onkeyup = this._onSearchInput.bind(this);
    this._filterContainer.onsearch = this._onSearchEvent.bind(this);
    this._filterContainer.onchange = this._onOptionsChange.bind(this);
    this._controlTreeContainer.onmouseover = this._onTreeElementMouseHover.bind(this);
};
/**
 * Save references to ControlTree different sections.
 * @private
 */
ControlTree.prototype._setReferences = function () {
    this._filterContainer = this._controlTreeContainer.querySelector(':scope > filter');
    this._treeContainer = this._controlTreeContainer.querySelector(':scope > tree');
};
module.exports = ControlTree;

},{}],5:[function(require,module,exports){
'use strict';
const NOCONTROLLERMESSAGE = 'Select a \'sap.ui.core.mvc.XMLView\' to see its Controller content. Click to filter on XMLViews';
const CONTROLLERNAME = 'Name:';
const CONTROLLERPATH = 'Relative Path:';
/**
 * @param {string} containerId - id of the DOM container
 * @constructor
 */
function ControllerDetailView(containerId) {
    this.oContainer = document.getElementById(containerId);
    this.oEditorDOM = document.createElement('div');
    this.oEditorDOM.id = 'controllerEditor';
    this.oEditorDOM.classList.toggle('hidden', true);
    this.oContainer.appendChild(this.oEditorDOM);
    this.oNamePlaceholderDOM = document.createElement('div');
    this.oNamePlaceholderDOM.classList.add('longTextReduce');
    this.oNamePlaceholderDOM.onclick = this._selectAllText;
    this.oPathPlaceholderDOM = document.createElement('div');
    this.oPathPlaceholderDOM.classList.add('longTextReduce');
    this.oPathPlaceholderDOM.onclick = this._selectAllText;
    this.oNameDOM = document.createElement('div');
    this.oNameDOM.classList.add('firstColAlignment');
    this.oNameDOM.innerText = CONTROLLERNAME;
    this.oPathDOM = document.createElement('div');
    this.oPathDOM.classList.add('firstColAlignment');
    this.oPathDOM.innerText = CONTROLLERPATH;
    this.oEditorDOM.appendChild(this.oNameDOM);
    this.oEditorDOM.appendChild(this.oNamePlaceholderDOM);
    this.oEditorDOM.appendChild(this.oPathDOM);
    this.oEditorDOM.appendChild(this.oPathPlaceholderDOM);
    this.oEditorAltDOM = document.createElement('div');
    this.oEditorAltDOM.classList.add('editorAlt');
    this.oEditorAltDOM.classList.toggle('hidden', false);
    this.oEditorAltMessageDOM = document.createElement('div');
    this.oEditorAltMessageDOM.innerText = NOCONTROLLERMESSAGE;
    this.oEditorAltMessageDOM.addEventListener('click', function () {
        var searchField = document.getElementById('elementsRegistrySearch');
        var filterCheckbox = document.getElementById('elementsRegistryCheckbox');
        searchField.value = 'sap.ui.core.mvc.XMLView';
        if (!filterCheckbox.checked) {
            filterCheckbox.click();
        }
        return false;
    });
    this.oContainer.appendChild(this.oEditorAltDOM);
    this.oEditorAltDOM.appendChild(this.oEditorAltMessageDOM);
}
/**
 * Updates data.
 * @param {Object} data - object structure as JSON
 */
ControllerDetailView.prototype.update = function (controllerInfo) {
    var bIsDataValid = !!(controllerInfo.sControllerName && controllerInfo.sControllerRelPath);
    this.oEditorDOM.classList.toggle('hidden', !bIsDataValid);
    this.oEditorAltDOM.classList.toggle('hidden', bIsDataValid);
    if (bIsDataValid) {
        this.oNamePlaceholderDOM.innerText = controllerInfo.sControllerName;
        this.oPathPlaceholderDOM.innerText = controllerInfo.sControllerRelPath;
    }
};
ControllerDetailView.prototype._selectAllText = function (oEvent) {
    var range = document.createRange();
    range.selectNode(oEvent.target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
};
module.exports = ControllerDetailView;

},{}],6:[function(require,module,exports){
'use strict';
var JSONFormatter = require('../ui/JSONFormatter');
var DVHelper = require('../ui/helpers/DataViewHelper');
/** @property {Object} data - Object in the following format:
 *  {
 *      object1: {
            associations: 'Object' containing all the associations for the control
            options: 'Object' containing the configuration for dataview
 *                      controlId: 'string'
 *                      expandable:'boolean',
 *                      expanded:'boolean',
 *                      title:'string',
 *                      showTypeInfo:'boolean', default is false
 *                      showTitle: 'boolean' default is true
 *                      editableValues: 'boolean' default is true
 *           data:'Object' with all the data to be represented visually
 *      },
 *  }
 *
 * If there is an object in the data section you have to repeat the object1 structure to be properly represented
 */
/**
 * @param {string} target - id of the DOM container
 * @param {Object} options - initial configuration
 * @constructor
 */
function DataView(target, options) {
    this._DataViewContainer = document.getElementById(target);
    // Initialize event handlers for editable fields
    this._onClickHandler();
    this._onEnterHandler();
    // When the field is editable this flag shows whether the value should be selected
    this._selectValue = true;
    /**
     * Method fired when the clicked element is an editable.
     * @param {Object} changedData - with the id of the selected control, property name and the new value
     */
    this.onPropertyUpdated = function (changedData) {
    };
    /**
     * Method fired when the Focus button is clicked.
     * @param {Object} target - arget control to be focused
     */
    this.onControlFocused = function (target) {
    };
    /**
     * Method fired when the Copy to Console button is clicked.
     * @param {Object} target - arget control to be focused
     */
    this.onCopyControlToConsole = function (target) {
    };
    /**
     * Method fired when the Copy HTML to Console button is clicked.
     * @param {Object} target - arget control to be focused
     */
    this.onCopyControlHTMLToConsole = function (target) {
    };
    /**
     * Method fired when the Invalidate button is clicked.
     * @param {Object} target - target control to be invalidated
     */
    this.onControlInvalidated = function (target) {
    };
    /**
     * Method fired when a clickable element is clicked.
     * @param {Object} event
     */
    this.onValueClick = function (event) {
    };
    if (options) {
        this.onPropertyUpdated = options.onPropertyUpdated || this.onPropertyUpdated;
        this.onControlInvalidated = options.onControlInvalidated || this.onControlInvalidated;
        this.onControlFocused = options.onControlFocused || this.onControlFocused;
        this.onCopyControlToConsole = options.onCopyControlToConsole || this.onCopyControlToConsole;
        this.onCopyControlHTMLToConsole = options.onCopyControlHTMLToConsole || this.onCopyControlHTMLToConsole;
        this.onValueClick = options.onValueClick || this.onValueClick;
        options.data ? this.setData(options.data) : undefined;
    }
}
/**
 * @param {Object} data - object structure as HTML
 */
DataView.prototype.setData = function (data) {
    if (typeof data !== 'object') {
        return;
    }
    this._data = data;
    this._generateHTML();
};
/**
 * Get data model.
 * @returns {Object}
 */
DataView.prototype.getData = function () {
    return this._data;
};
/**
 * Checks if any of the view objects contain any data to present.
 * @returns {boolean}
 * @private
 */
DataView.prototype._isDataEmpty = function () {
    var viewObjects = this.getData();
    var isEmpty = true;
    if (!viewObjects) {
        return isEmpty;
    }
    for (var key in viewObjects) {
        if (DVHelper.getObjectLength(viewObjects[key].data)) {
            isEmpty = false;
            break;
        }
    }
    return isEmpty;
};
/**
 * Generates HTML string from an object.
 * @param {string} key
 * @param {Object|Array} currentElement
 * @returns {string}
 * @private
 */
DataView.prototype._generateHTMLFromObject = function (key, currentElement) {
    var html = '';
    var tag = 'key';
    var options = currentElement.options;
    if (options.title) {
        key = options.title;
        tag = 'section-title';
    }
    if (DVHelper.getObjectLength(currentElement) && options.expandable) {
        html += DVHelper.addArrow(options.expanded);
    }
    html += DVHelper.wrapInTag(tag, key, {});
    if (options.showTypeInfo) {
        if (!options.hideTitle) {
            html += ':&nbsp;';
        }
        html += DVHelper.addKeyTypeInfoBegin(currentElement.data);
    }
    return html;
};
/**
 * Appends or skips the closing bracket for Object type.
 * @param {Object} currentElement - current element to present
 * @returns {string}
 * @private
 */
DataView.prototype._generateHTMLForEndOfObject = function (currentElement) {
    var html = '';
    if (currentElement.options.showTypeInfo) {
        html += DVHelper.addKeyTypeInfoEnd(currentElement.data);
    }
    return html;
};
/**
 * Generates HTML string for a key value pair.
 * @param {string} key
 * @param {Object} currentView
 * @returns {string}
 * @private
 */
DataView.prototype._generateHTMLForKeyValuePair = function (key, currentView) {
    var html = '';
    var oPropInfo;
    var vValue;
    var bDefault;
    var options;
    var type;
    var attributes;
    var valueHTML;
    if (this._data && this._data.isPropertiesData) {
        oPropInfo = currentView.data[key];
        vValue = oPropInfo.value;
        bDefault = oPropInfo.isDefault;
    }
    else {
        vValue = currentView.data[key];
    }
    options = currentView.options;
    type = currentView.types ? currentView.types[key] : '';
    attributes = {};
    valueHTML;
    if (options && options.editableValues) {
        attributes = {
            'contentEditable': options.editableValues,
            'data-control-id': options.controlId,
            'data-property-name': key
        };
    }
    if (vValue && typeof vValue === 'object') {
        valueHTML = JSONFormatter.formatJSONtoHTML(vValue);
    }
    else if (typeof type === 'object') {
        valueHTML = DVHelper.wrapInSelectTag(vValue, attributes, type);
    }
    else if (type === 'boolean') {
        valueHTML = DVHelper.wrapInCheckBox(vValue, attributes);
    }
    else {
        valueHTML = DVHelper.valueNeedsQuotes(vValue, DVHelper.wrapInTag('value', vValue, attributes));
    }
    html += DVHelper.wrapInTag('key', key) + ':&nbsp;' + valueHTML;
    if (bDefault) {
        html += '&nbsp;' + DVHelper.createDefaultSpan();
    }
    return html;
};
/**
 * Generates a HTML string for one of the sections in the supplied object to be viewed.
 * @param {Object} viewObject
 * @returns {string}
 * @private
 */
DataView.prototype._generateHTMLSection = function (viewObject) {
    var data = viewObject.data;
    var associations = viewObject.associations;
    var html = '';
    var options = viewObject.options;
    var isDataArray = Array.isArray(data);
    var lastArrayElement = data.length - 1;
    html += DVHelper.openUL(DVHelper.getULAttributesFromOptions(options));
    for (var key in data) {
        html += DVHelper.openLI();
        var currentElement = data[key];
        // Additional check for currentElement mainly to go around null values errors
        if (currentElement && currentElement.options) {
            html += this._generateHTMLFromObject(key, currentElement);
            html += this._generateHTMLSection(currentElement);
            html += this._generateHTMLForEndOfObject(currentElement);
        }
        else if (currentElement && currentElement._isClickableValueForDataView) {
            html += this._generateHTMLForKeyValuePair(key, DVHelper.formatValueForDataView(key, currentElement));
        }
        else {
            html += this._generateHTMLForKeyValuePair(key, viewObject);
        }
        if (isDataArray && key < lastArrayElement) {
            html += ',';
        }
        html += DVHelper.closeLI();
    }
    for (var name in associations) {
        var currentAssociation = associations[name];
        html += DVHelper.openLI();
        html += DVHelper.wrapInTag('key', name) + ':&nbsp;' + DVHelper.wrapInTag('value', currentAssociation);
        html += DVHelper.closeLI();
    }
    html += DVHelper.closeUL();
    return html;
};
/**
 * Transform predefined Object to HTML.
 * @private
 */
DataView.prototype._generateHTML = function () {
    var viewObjects = this.getData();
    var html = '';
    var noAvailableData = DVHelper.wrapInTag('no-data', 'No Available Data');
    if (this._isDataEmpty()) {
        this._DataViewContainer.innerHTML = noAvailableData;
        return;
    }
    // Go trough all the objects on the top level in the data structure and
    // skip the ones that does not have anything to display
    for (var key in viewObjects) {
        if (key === 'isPropertiesData') {
            continue;
        }
        var currentObject = viewObjects[key];
        if (key === 'actions' && currentObject.data && currentObject.data.length) {
            for (var action = 0; action < currentObject.data.length; action++) {
                var currentAction = currentObject.data[action];
                var disclaimer = currentAction === 'Focus' ? 'When focusing an element, to see the visual focus, you need to close the DevTools panel.' : '';
                html += DVHelper.addDisclaimer(disclaimer);
                html += this._addSectionTitle({ options: { title: currentAction + ' control' } }, DVHelper.addToolsButtons(viewObjects.own ? viewObjects.own.options : {}, currentAction));
            }
            break;
        }
        if (!DVHelper.getObjectLength(currentObject.data)) {
            html += this._addSectionTitle(currentObject, DVHelper.getNoDataHTML(noAvailableData));
            continue;
        }
        html += this._addSectionTitle(currentObject, this._generateHTMLSection(currentObject));
    }
    this._DataViewContainer.innerHTML = html;
};
/**
 * Adds a title to a section from a view object when transformed to HTML.
 * @param {Object} config
 * @param {string} htmlPart
 * @returns {string}
 * @private
 */
DataView.prototype._addSectionTitle = function (config, htmlPart) {
    var html = '';
    var options = config.options;
    if (options.hideTitle) {
        return htmlPart;
    }
    html += DVHelper.openUL(DVHelper.getULAttributesFromOptions(options));
    html += DVHelper.openLI();
    if (config.options.expandable) {
        html += DVHelper.addArrow(options.expanded);
    }
    html += DVHelper.wrapInTag('section-title', options.title);
    html += htmlPart;
    html += DVHelper.closeLI();
    html += DVHelper.closeUL();
    return html;
};
/**
 * @param {HTMLElement} element
 * @returns {boolean} if value is editable
 * @private
 */
DataView.prototype._isEditableValue = function (element) {
    return element.nodeName === 'VALUE' && element.contentEditable === 'true';
};
/**
 * Mouse click event handler for the editable values.
 * @private
 */
DataView.prototype._onClickHandler = function () {
    var that = this;
    /**
     * Handler for mouse click.
     * @param {Object} event
     */
    this._DataViewContainer.onclick = function (event) {
        var targetElement = event.target;
        var target = DVHelper.findNearestDOMElement(targetElement, 'LI');
        if (!target) {
            return;
        }
        DVHelper.toggleCollapse(target);
        if (that._isEditableValue(targetElement)) {
            that._onBlurHandler(targetElement);
            DVHelper.selectEditableContent(targetElement, that._selectValue);
            that._selectValue = false;
        }
        if (targetElement.nodeName === 'CLICKABLE-VALUE') {
            var attributes = event.target.attributes;
            var key = attributes.key.value;
            var parent = attributes.parent.value;
            var currData = that.getData();
            var eventData;
            if (currData[parent]) {
                eventData = DVHelper.getObjectProperty(currData[parent].data, key).eventData;
            }
            else {
                // In case of event listeners
                eventData = DVHelper.getObjectProperty(currData, parent + key).eventData;
            }
            that.onValueClick({
                target: key,
                data: eventData
            });
        }
        if (targetElement.nodeName === 'SELECT') {
            that._onChangeHandler(targetElement);
        }
        if (targetElement.nodeName === 'INPUT') {
            that._onCheckBoxHandler(targetElement);
        }
        if (targetElement.nodeName === 'BUTTON') {
            switch (targetElement.id) {
                case 'control-invalidate':
                    that._onInvalidateElement(targetElement);
                    break;
                case 'control-focus':
                    that._onFocusElement(targetElement);
                    break;
                case 'control-copy to console':
                    that._onCopyElementToConsole(targetElement);
                    break;
                case 'control-copy html to console':
                    that._onCopyElementHTMLToConsole(targetElement);
                    break;
            }
        }
        if (targetElement.nodeName === 'SPAN' && targetElement.classList.contains('controlId')) {
            that._onCopyElementToConsole(targetElement);
        }
    };
};
/**
 * Enter button event handler for the editable values.
 * @private
 */
DataView.prototype._onEnterHandler = function () {
    var that = this;
    /**
     * Handler for key down.
     * @param {Object} e
     */
    this._DataViewContainer.onkeydown = function (e) {
        if (!that._isEditableValue(e.target)) {
            return;
        }
        that._onBlurHandler(e.target);
        DVHelper.selectEditableContent(e.target, that._selectValue);
        that._selectValue = false;
        if (e.keyCode === 13) {
            e.preventDefault();
            document.getSelection().empty();
            e.target.blur();
        }
    };
};
DataView.prototype._onInvalidateElement = function (target) {
    var that = this;
    var propertyData = {};
    propertyData.controlId = target.getAttribute('data-control-id');
    that.onControlInvalidated(propertyData);
};
DataView.prototype._onFocusElement = function (target) {
    var that = this;
    var propertyData = {};
    propertyData.controlId = target.getAttribute('data-control-id');
    that.onControlFocused(propertyData);
};
DataView.prototype._onCopyElementToConsole = function (target) {
    var that = this;
    var propertyData = {};
    propertyData.controlId = target.getAttribute('data-control-id');
    that.onCopyControlToConsole(propertyData);
};
DataView.prototype._onCopyElementHTMLToConsole = function (target) {
    var that = this;
    var propertyData = {};
    propertyData.controlId = target.getAttribute('data-control-id');
    that.onCopyControlHTMLToConsole(propertyData);
};
/**
 * Blur event handler for the editable values.
 * @param {element} target - HTML DOM element
 * @private
 */
DataView.prototype._onBlurHandler = function (target) {
    var that = this;
    if (!target) {
        return;
    }
    /**
     * Handler for blur event.
     * @param {Object} e
     */
    target.onblur = function (e) {
        var propertyData = {};
        var target = e.target;
        var propertyName;
        var value;
        propertyData.controlId = target.getAttribute('data-control-id');
        propertyName = target.getAttribute('data-property-name');
        propertyData.property = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        value = target.textContent.trim();
        propertyData.value = DVHelper.getCorrectedValue(value);
        that.onPropertyUpdated(propertyData);
        target.removeEventListener('onblur', this);
        that._selectValue = true;
    };
};
/**
 * Change event handler for the selectable values.
 * @param {element} target - HTML DOM element
 * @private
 */
DataView.prototype._onChangeHandler = function (target) {
    var that = this;
    if (!target) {
        return;
    }
    /**
     * Handler for change event.
     * @param {Object} e
     */
    target.onchange = function (e) {
        var propertyData = {};
        var target = e.target;
        var propertyName;
        var value;
        propertyData.controlId = target.getAttribute('data-control-id');
        propertyName = target.getAttribute('data-property-name');
        propertyData.property = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        value = target.selectedOptions[0].value;
        propertyData.value = DVHelper.getCorrectedValue(value);
        that.onPropertyUpdated(propertyData);
        target.removeEventListener('onchange', this);
        that._selectValue = true;
    };
};
/**
 * Change event handler for the boolean values.
 * @param {element} target - HTML DOM element
 * @private
 */
DataView.prototype._onCheckBoxHandler = function (target) {
    var that = this;
    if (!target) {
        return;
    }
    /**
     * Handler for change event.
     * @param {Object} e
     */
    target.onchange = function (e) {
        var propertyData = {};
        var propertyName;
        var target = e.target;
        propertyData.controlId = target.getAttribute('data-control-id');
        propertyName = target.getAttribute('data-property-name');
        propertyData.property = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
        propertyData.value = target.checked;
        that.onPropertyUpdated(propertyData);
        target.removeEventListener('onchange', this);
        that._selectValue = true;
    };
};
module.exports = DataView;

},{"../ui/JSONFormatter":8,"../ui/helpers/DataViewHelper":18}],7:[function(require,module,exports){
'use strict';
/**
 * FrameSelect constructor
 * @param {string} id - The id of the DOM container
 * @param {object} options
 * @constructor
 */
function FrameSelect(id, options) {
    this._sltDomRef = document.getElementById(id).querySelector('select');
    // Chrome treats the main window as the default frame with id 0
    this._selectedId = 0;
    this.onSelectionChange = options.onSelectionChange ? options.onSelectionChange : function () { };
    this._sltDomRef.addEventListener('change', function (event) {
        var selectedId = parseInt(event.target.value);
        var oldSelectedId = this._selectedId;
        this._selectedId = selectedId;
        this.onSelectionChange({ selectedId, oldSelectedId });
    }.bind(this));
}
FrameSelect.prototype.getSelectedId = function () {
    return this._selectedId;
};
FrameSelect.prototype.setSelectedId = function (frameId) {
    this._sltDomRef.value = frameId;
    this._selectedId = frameId;
};
FrameSelect.prototype.setData = function (data) {
    var frameIds = Object.keys(data).map(x => parseInt(x));
    var selectedId;
    var oldSelectedId;
    this._sltDomRef.innerHTML = '';
    frameIds.forEach(function (frameId) {
        this._addOption(frameId, data[frameId]);
    }, this);
    if (frameIds.indexOf(this._selectedId) < 0) {
        // the previously selected id is no loger found
        // (e.g. frame deleted)
        // => reset selection to the top frame
        selectedId = 0;
        oldSelectedId = this._selectedId;
        this.setSelectedId(selectedId);
        this.onSelectionChange({ selectedId, oldSelectedId });
    }
    this._sltDomRef.hidden = false;
};
FrameSelect.prototype._addOption = function (frameId, data) {
    var option = document.createElement('option');
    option.value = frameId;
    option.innerText = this._getFrameLabel(frameId, data.url);
    this._sltDomRef.appendChild(option);
};
FrameSelect.prototype._getFrameLabel = function (frameId, frameUrl) {
    if (frameId === 0) {
        return 'top';
    }
    var aUrl = frameUrl.split('/');
    return aUrl[aUrl.length - 1];
};
module.exports = FrameSelect;

},{}],8:[function(require,module,exports){
'use strict';
/**
 * Sample usage
 * JSONView = require('../../../modules/ui/JSONFormatter.js');
 * JSONViewFormater.formatJSONtoHTML(sampleJSONData);
 */
/**
 *
 * @param {Object} json
 * @returns {string|HTML}
 * @private
 */
function _syntaxHighlight(json) {
    json = JSON.stringify(json, undefined, 2);
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var tagName = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                tagName = 'key';
            }
            else {
                tagName = 'string';
            }
        }
        else if (/true|false/.test(match)) {
            tagName = 'boolean';
        }
        else if (/null/.test(match)) {
            tagName = 'null';
        }
        return '<' + tagName + '>' + match + '</' + tagName + '>';
    });
}
module.exports = {
    /**
     * Create HTML from a json object.
     * @param {Object} json
     * @returns {string}
     */
    formatJSONtoHTML: function (json) {
        return '<pre json>' + _syntaxHighlight(json) + '</pre>';
    }
};

},{}],9:[function(require,module,exports){
/* globals ResizeObserver */
'use strict';
/**
 * @param {string} containerId - id of the DOM container
 * @constructor
 */
function ODataDetailView(containerId) {
    this.oContainer = document.getElementById(containerId);
    this.oEditorDOM = document.createElement('div');
    this.oEditorDOM.id = 'editor';
    this.oContainer.appendChild(this.oEditorDOM);
    this.oEditorAltDOM = document.createElement('div');
    this.oEditorAltDOM.classList.add('editorAlt');
    this.oEditorAltMessageDOM = document.createElement('div');
    this.oContainer.appendChild(this.oEditorAltDOM);
    this.oEditorAltDOM.appendChild(this.oEditorAltMessageDOM);
    this.oEditor = ace.edit('editor');
    this.oEditor.getSession().setUseWrapMode(true);
    this._setTheme();
    const oResizeObserver = new ResizeObserver(function () {
        this.oEditor.resize();
    }.bind(this));
    oResizeObserver.observe(this.oEditorDOM);
}
/**
 * Updates data.
 * @param {Object} data - object structure as JSON
 */
ODataDetailView.prototype.update = function (data) {
    const sResponseBody = data.responseBody;
    let sAltMessage;
    this.oEditorDOM.classList.toggle('hidden', !sResponseBody);
    this.oEditorAltDOM.classList.toggle('hidden', !!sResponseBody);
    if (sResponseBody) {
        this.oEditor.session.setMode('ace/mode/' + sResponseBody.type);
        this.oEditor.setValue(sResponseBody.content, 0);
    }
    else {
        sAltMessage = data.altMessage || 'No response body';
        this.oEditorAltMessageDOM.innerText = sAltMessage;
    }
    this.oEditor.clearSelection();
};
/**
 * Clears editor.
 */
ODataDetailView.prototype.clear = function () {
    this.oEditor.setValue('', -1);
};
/**
 * Sets theme.
 */
ODataDetailView.prototype._setTheme = function () {
    var bDarkMode = chrome.devtools.panels.themeName === 'dark';
    this.oEditor.setTheme(bDarkMode ? 'ace/theme/vibrant_ink' : 'ace/theme/chrome');
};
module.exports = ODataDetailView;

},{}],10:[function(require,module,exports){
/* globals ResizeObserver */
'use strict';
const DataGrid = require('./datagrid/DataGrid.js');
const UIUtils = require('./datagrid/UIUtils.js');
const EntriesLog = require('../utils/EntriesLog.js');
const COLUMNS = [{
        id: 'name',
        title: 'Name',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 40,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        disclosure: true,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('name', a, b);
        }
    },
    {
        id: 'method',
        title: 'Method',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 10,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('method', a, b);
        }
    },
    {
        id: 'status',
        title: 'Status',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 10,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.NumericComparator('status', a, b);
        }
    },
    {
        id: 'note',
        title: 'Detail',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 20,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('note', a, b);
        }
    }];
/**
 * @param {string} domId - id of the DOM container
 * @param {Object} options - initial configuration
 * @constructor
 */
function ODataMasterView(domId, options) {
    this.oContainerDOM = document.getElementById(domId);
    this.oEntriesLog = new EntriesLog();
    /**
     * Selects an OData Entry log item.
     * @param {Object} oSelectedData
     */
    this.onSelectItem = function (oSelectedData) { };
    /**
     * Clears all OData Entry log items.
     * @param {Object} oSelectedData
     */
    this.onClearItems = function (oSelectedData) { };
    if (options) {
        this.onSelectItem = options.onSelectItem || this.onSelectItem;
        this.onClearItems = options.onClearItems || this.onClearItems;
    }
    const oClearButton = this._createClearButton();
    this.oContainerDOM.appendChild(oClearButton);
    this.oDataGrid = this._createDataGrid();
    this.oContainerDOM.appendChild(this.oDataGrid.element);
    this._getHAR();
}
/**
 * Logs OData entry.
 * @param {Object} oEntry - Log entry
 * @private
 */
ODataMasterView.prototype._logEntry = function (oEntry) {
    const oNode = this.oEntriesLog.getEntryNode(oEntry);
    if (oNode) {
        this.oDataGrid.insertChild(oNode);
    }
};
/* jshint ignore:start */
/**
 * Gets HTTP Archive request.
 * @private
 */
ODataMasterView.prototype._getHAR = function () {
    /**
     * Processes the HTTP Archive Requests.
     * @param {Object} result
     */
    chrome.devtools.network.getHAR(result => {
        const entries = result.entries;
        if (!entries.length) {
            console.warn('No requests found by now');
        }
        entries.forEach(this._logEntry, this);
        chrome.devtools.network.onRequestFinished.addListener(this._logEntry.bind(this));
    });
};
/* jshint ignore:end */
/**
 * Creates Clear button.
 * @returns {Object} - Clear button Icon
 * @private
 */
ODataMasterView.prototype._createClearButton = function () {
    const oIcon = UIUtils.Icon.create('', 'toolbar-glyph hidden');
    oIcon.setIconType('largeicon-clear');
    /**
     * Clear Icon click handler.
     */
    oIcon.onclick = function () {
        this.oDataGrid.rootNode().removeChildren();
        this.onClearItems();
    }.bind(this);
    return oIcon;
};
/**
 * Creates DataGrid.
 * @returns {Object} - DataGrid
 * @private
 */
ODataMasterView.prototype._createDataGrid = function () {
    const oDataGrid = new DataGrid.SortableDataGrid({
        displayName: 'test',
        columns: COLUMNS
    });
    oDataGrid.addEventListener(DataGrid.Events.SortingChanged, this.sortHandler, this);
    oDataGrid.addEventListener(DataGrid.Events.SelectedNode, this.selectHandler, this);
    /**
     * Resize Handler for DataGrid.
     */
    const oResizeObserver = new ResizeObserver(function () {
        oDataGrid.onResize();
    });
    oResizeObserver.observe(oDataGrid.element);
    return oDataGrid;
};
/**
 * Sorts Columns of the DataGrid.
 */
ODataMasterView.prototype.sortHandler = function () {
    const columnId = this.oDataGrid.sortColumnId();
    /**
     * Finds Column config by Id.
     * @param {Object} columnConfig
     */
    const columnConfig = COLUMNS.find(columnConfig => columnConfig.id === columnId);
    if (!columnConfig || !columnConfig.sortingFunction) {
        return;
    }
    this.oDataGrid.sortNodes(columnConfig.sortingFunction, !this.oDataGrid.isSortOrderAscending());
};
/**
 * Selects clicked log entry.
 * @param {Object} oEvent
 */
ODataMasterView.prototype.selectHandler = function (oEvent) {
    const oSelectedNode = oEvent.data;
    const iSelectedId = oSelectedNode && oSelectedNode.data.id;
    this.onSelectItem({
        responseBody: this.oEntriesLog.getEditorContent(iSelectedId),
        altMessage: this.oEntriesLog.getNoResponseMessage(iSelectedId)
    });
};
module.exports = ODataMasterView;

},{"../utils/EntriesLog.js":19,"./datagrid/DataGrid.js":16,"./datagrid/UIUtils.js":17}],11:[function(require,module,exports){
/* globals ResizeObserver */
'use strict';
const DataGrid = require('./datagrid/DataGrid.js');
const UIUtils = require('./datagrid/UIUtils.js');
const COLUMNS = [{
        id: 'type',
        title: 'TYPE',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 30,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        disclosure: true,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('type', a, b);
        }
    },
    {
        id: 'id',
        title: 'ID',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 20,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('id', a, b);
        }
    },
    {
        id: 'parentId',
        title: 'parentId',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 20,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('parentId', a, b);
        }
    },
    {
        id: 'aggregation',
        title: 'aggregation',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 10,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.StringComparator('aggregation', a, b);
        }
    },
    {
        id: 'isRendered',
        title: 'rendered',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 10,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.NumericComparator('isRendered', a, b);
        }
    },
    {
        id: 'isControl',
        title: 'control',
        sortable: true,
        align: undefined,
        nonSelectable: false,
        weight: 10,
        visible: true,
        allowInSortByEvenWhenHidden: false,
        /**
         * Sorts Items.
         * @param {Object} a
         * @param {Object} b
         */
        sortingFunction: function (a, b) {
            return DataGrid.SortableDataGrid.NumericComparator('isControl', a, b);
        }
    }];
/**
 * @param {string} domId - id of the DOM container
 * @param {Object} options - initial configuration
 * @constructor
 */
function OElementsRegistryMasterView(domId, options) {
    this.oContainerDOM = document.getElementById(domId);
    this.sNotSupportedMessage = '<h1>Current version of OpenUI5/SAPUI5 doesn\'t support element registry</h1>';
    this.XMLDetailView = options.XMLDetailView;
    this.ControllerDetailView = options.ControllerDetailView;
    /**
     * Selects an element.
     * @param {Object} oSelectedData
     */
    this.onSelectItem = function (oSelectedData) { };
    if (options) {
        this.onSelectItem = options.onSelectItem || this.onSelectItem;
        this.onRefreshButtonClicked = options.onRefreshButtonClicked || function () { };
    }
    this.oContainerDOM.appendChild(this._createContent());
    this.oContainerDOM.appendChild(this._createMessage());
    this._setReferences();
    this._createHandlers();
}
/**
 *
 * @returns {HTMLElement} - Container holding the content
 */
OElementsRegistryMasterView.prototype._createContent = function () {
    const oContainer = document.createElement('div');
    oContainer.setAttribute('id', 'elementsRegistryContent');
    oContainer.appendChild(this._createRefreshButton());
    oContainer.innerHTML += this._createFilter();
    this.oDataGrid = this._createDataGrid();
    oContainer.appendChild(this.oDataGrid.element);
    return oContainer;
};
/**
 *
 * @returns {HTMLElement} - Container/placeholder for the ('not supported') message
 */
OElementsRegistryMasterView.prototype._createMessage = function () {
    const oContainer = document.createElement('div');
    oContainer.setAttribute('id', 'elementsRegistryMessage');
    oContainer.style.display = 'none';
    return oContainer;
};
/**
 * Hides the content and displays a message
 * @param {String} sMessage html of the message to be displayed
 */
OElementsRegistryMasterView.prototype._showMessage = function (sMessage) {
    if (this._oMessageContainer && this._oContentContainer) {
        this._oMessageContainer.innerHTML = sMessage;
        this._oContentContainer.style.display = 'none';
        this._oMessageContainer.style.display = 'block';
    }
};
/**
 * Show the content and hides the message
 */
OElementsRegistryMasterView.prototype._showContent = function () {
    if (this._oMessageContainer && this._oContentContainer) {
        this._oMessageContainer.style.display = 'none';
        this._oContentContainer.style.display = 'flex';
    }
};
/**
 * Creates Refresh button.
 * @returns {Object} - Refresh button Icon
 * @private
 */
OElementsRegistryMasterView.prototype._createRefreshButton = function () {
    const oIcon = UIUtils.Icon.create('', 'toolbar-glyph hidden');
    oIcon.setIconType('largeicon-refresh');
    return oIcon;
};
/**
 * Create the HTML needed for filtering.
 * @returns {string}
 * @private
 */
OElementsRegistryMasterView.prototype._createFilter = function () {
    return '<filter>' +
        '<start>' +
        '<input id="elementsRegistrySearch" type="search" placeholder="Search" search/>' +
        '<label><input id="elementsRegistryCheckbox" type="checkbox" filter />Filter results <results id="elementsRegistryResults"></label>' +
        '</start>';
};
/**
 * Create all event handlers for the Search filter.
 * @private
 */
OElementsRegistryMasterView.prototype._createHandlers = function () {
    this._oFilterContainer.onkeyup = this._onSearchInput.bind(this);
    this._oFilterContainer.onsearch = this._onSearchEvent.bind(this);
    this._oFilterCheckBox.onchange = this._onOptionsChange.bind(this);
    this._oRefreshButton.onclick = this._onRefresh.bind(this);
};
/**
 * Save references of the Search filter elements and refresh button.
 * @private
 */
OElementsRegistryMasterView.prototype._setReferences = function () {
    this._oContentContainer = this.oContainerDOM.querySelector('#elementsRegistryContent');
    this._oMessageContainer = this.oContainerDOM.querySelector('#elementsRegistryMessage');
    this._oFilterContainer = this.oContainerDOM.querySelector('#elementsRegistrySearch');
    this._oFilterCheckBox = this.oContainerDOM.querySelector('#elementsRegistryCheckbox');
    this._oFilterResults = this.oContainerDOM.querySelector('#elementsRegistryResults');
    this._oRefreshButton = this.oContainerDOM.querySelector('.largeicon-refresh');
};
/**
 * Event handler for user input in "search" input.
 * @param {Object} event - keyup event
 * @private
 */
OElementsRegistryMasterView.prototype._onSearchInput = function (event) {
    const target = event.target;
    if (target.getAttribute('search') !== null) {
        if (target.value.length !== 0) {
            this._searchElements(target.value);
            if (this._oFilterCheckBox.checked) {
                this._filterResults();
            }
        }
        else {
            this._removeAttributesFromSearch('matching');
        }
    }
};
/**
 * Event handler for Refresh icon clicked.
 * @private
 */
OElementsRegistryMasterView.prototype._onRefresh = function () {
    this.oDataGrid.rootNode().removeChildren();
    this._data = [];
    this.onRefreshButtonClicked();
    this._oFilterCheckBox.checked = false;
    this.oContainerDOM.removeAttribute('show-filtered-elements');
};
/**
 * Event handler for onsearch event.
 * @param {Object} event - onsearch event
 * @private
 */
OElementsRegistryMasterView.prototype._onSearchEvent = function (event) {
    if (event.target.value.length === 0) {
        this._removeAttributesFromSearch('matching');
        this._oFilterResults.innerHTML = '(0)';
    }
};
/**
 * Event handler for options change of Search filter.
 * @param {Object} event - click event
 * @private
 */
OElementsRegistryMasterView.prototype._onOptionsChange = function (event) {
    const target = event.target;
    this._oSelectedNode = this.oDataGrid.selectedNode || this._oSelectedNode;
    if (target.getAttribute('filter') !== null) {
        if (target.checked) {
            this.oContainerDOM.setAttribute('show-filtered-elements', true);
        }
        else {
            this.oContainerDOM.removeAttribute('show-filtered-elements');
        }
    }
    this._filterResults();
};
/**
 * Filters results.
 * @private
 */
OElementsRegistryMasterView.prototype._filterResults = function () {
    const sSearchInput = this._oFilterContainer.value.toLocaleLowerCase();
    const bChecked = this._oFilterCheckBox.checked;
    let sSelectedNodeId;
    let sId;
    let sType;
    sSelectedNodeId = this._oSelectedNode && this._oSelectedNode._data.id.toLocaleLowerCase();
    this.oDataGrid.rootNode().removeChildren();
    if (sSearchInput !== '' && bChecked) {
        this.getData().forEach(function (oElement) {
            sId = oElement.id.toLocaleLowerCase();
            sType = oElement.type.toLocaleLowerCase();
            if ((sId.indexOf(sSearchInput) !== -1 || sType.indexOf(sSearchInput) !== -1)) {
                this._createNode(oElement, sSelectedNodeId);
            }
        }, this);
    }
    else {
        this.getData().forEach(function (oElement) {
            this._createNode(oElement, sSelectedNodeId);
        }, this);
    }
};
/**
 * Creates table Node.
 * @param {Object} oElement
 * @param {string} sSelectedNodeId - Already selected NodeId
 * @private
 */
OElementsRegistryMasterView.prototype._createNode = function (oElement, sSelectedNodeId) {
    const oNode = new DataGrid.SortableDataGridNode(oElement);
    if (oNode) {
        this.oDataGrid.insertChild(oNode);
        if (sSelectedNodeId === oElement.id.toLocaleLowerCase()) {
            oNode.select();
        }
    }
};
/**
 * Search elements that match given criteria.
 * @param {string} sUserInput - Search criteria
 * @private
 */
OElementsRegistryMasterView.prototype._searchElements = function (sUserInput) {
    const aSearchableElements = this.oDataGrid._visibleNodes;
    const sSearchInput = sUserInput.toLocaleLowerCase();
    let sId;
    let sType;
    aSearchableElements.forEach(function (oElement) {
        sId = oElement._data.id.toLocaleLowerCase(),
            sType = oElement._data.type.toLocaleLowerCase();
        if ((sId.indexOf(sSearchInput) !== -1 || sType.indexOf(sSearchInput) !== -1) && sSearchInput !== '') {
            oElement._element.classList.add('matching');
        }
        else {
            oElement._element.classList.remove('matching');
        }
    });
    this._setResultsCount(sSearchInput);
};
/**
 * Sets search results count.
 * @param {string} sSearchInput - Search criteria
 * @private
 */
OElementsRegistryMasterView.prototype._setResultsCount = function (sSearchInput) {
    let iCount;
    if (sSearchInput === '') {
        iCount = 0;
    }
    else {
        iCount = this.getData().filter(function (oElement) {
            const sId = oElement.id.toLocaleLowerCase();
            const sType = oElement.type.toLocaleLowerCase();
            if ((sId.indexOf(sSearchInput) !== -1 || sType.indexOf(sSearchInput) !== -1)) {
                return oElement;
            }
        }).length;
    }
    this._oFilterResults.innerHTML = '(' + iCount + ')';
};
/**
 * Remove  "matching" attribute from the search.
 * @private
 */
OElementsRegistryMasterView.prototype._removeAttributesFromSearch = function () {
    const aElements = this.oContainerDOM.querySelectorAll('.matching');
    aElements.forEach(function (oElement) {
        oElement.classList.remove('matching');
    });
};
/**
 * Event handler when elements table is scrolled up/down.
 * @private
 */
OElementsRegistryMasterView.prototype._onViewPortCalculated = function () {
    const sSearchInput = this._oFilterContainer.value;
    this._searchElements(sSearchInput);
};
/**
 * Returns data.
 * @returns {Array} data - elements registry data
 * @private
 */
OElementsRegistryMasterView.prototype.getData = function () {
    return this._data;
};
/**
 * Sets all registered elements.
 * @param {Array} data - Array with all registered elements
 * @returns {ElementTable}
 */
OElementsRegistryMasterView.prototype.setData = function (data) {
    const oldData = this.getData();
    let aData = data.aRegisteredElements;
    let oNode;
    if (!data.isSupported) {
        this._showMessage(this.sNotSupportedMessage);
        return;
    }
    else {
        this._showContent();
    }
    if (JSON.stringify(oldData) === JSON.stringify(aData)) {
        return;
    }
    this._data = aData;
    this.oDataGrid.rootNode().removeChildren();
    this._data.forEach(function (oElement) {
        oNode = new DataGrid.SortableDataGridNode(oElement);
        if (oNode) {
            this.oDataGrid.insertChild(oNode);
        }
    }, this);
    return this;
};
/**
 * Creates DataGrid.
 * @returns {Object} - DataGrid
 * @private
 */
OElementsRegistryMasterView.prototype._createDataGrid = function () {
    const oDataGrid = new DataGrid.SortableDataGrid({
        displayName: 'test',
        columns: COLUMNS
    });
    oDataGrid.addEventListener(DataGrid.Events.SortingChanged, this.sortHandler, this);
    oDataGrid.addEventListener(DataGrid.Events.SelectedNode, this.selectHandler, this);
    oDataGrid.addEventListener(DataGrid.Events.ViewportCalculated, this._onViewPortCalculated, this);
    /**
     * Resize Handler for DataGrid.
     */
    const oResizeObserver = new ResizeObserver(function (oEntries) {
        oDataGrid.onResize();
    });
    oResizeObserver.observe(oDataGrid.element);
    return oDataGrid;
};
/**
 * Sorts Columns of the DataGrid.
 */
OElementsRegistryMasterView.prototype.sortHandler = function () {
    const columnId = this.oDataGrid.sortColumnId();
    /**
     * Finds Column config by Id.
     * @param {Object} columnConfig
     */
    const columnConfig = COLUMNS.find(columnConfig => columnConfig.id === columnId);
    if (!columnConfig || !columnConfig.sortingFunction) {
        return;
    }
    this.oDataGrid.sortNodes(columnConfig.sortingFunction, !this.oDataGrid.isSortOrderAscending());
};
/**
 * Selects clicked Control.
 * @param {Object} oEvent
 */
OElementsRegistryMasterView.prototype.selectHandler = function (oEvent) {
    this.onSelectItem(oEvent.data._data.id);
    this.XMLDetailView.update(oEvent.data._data);
    this.ControllerDetailView.update(oEvent.data._data.controllerInfo);
    this._sSelectedItem = oEvent.data._data.id;
};
module.exports = OElementsRegistryMasterView;

},{"./datagrid/DataGrid.js":16,"./datagrid/UIUtils.js":17}],12:[function(require,module,exports){
/* globals createElement, ResizeObserver */
'use strict';
require('./datagrid/UIUtils.js');
// adopting the same value that already used in the split
// DevTools panels (e.g. "Elements" and "Sources")
const HORIZONTAL_SPLIT_MIN_WIDTH = 680;
/**
 * Returns the HTML for the divider.
 * @returns {string}
 * @private
 */
function _getResizeHolderHTML() {
    return '<divider><handler class="resize-handler"></handler></divider>';
}
/**
 * Manage the display style of the start container.
 * @param {elements} _splitterInstance
 * @param {boolean} skipSizing
 * @private
 */
function _applyInlineStylesForStartContainer(_splitterInstance, skipSizing) {
    var $start = _splitterInstance.$this.querySelector('start');
    $start.style.display = _splitterInstance._hideStartContainer ? 'none' : '';
    if (!skipSizing) {
        $start.style.width = _splitterInstance._startContainerWidth || undefined;
        $start.style.height = _splitterInstance._startContainerHeight || undefined;
    }
}
/**
 * Manage the display style of the end container.
 * @param {elements} _splitterInstance
 * @param {boolean} skipSizing
 * @private
 */
function _applyInlineStylesForEndContainer(_splitterInstance, skipSizing) {
    var $end = _splitterInstance.$this.querySelector('end');
    $end.style.display = _splitterInstance._hideEndContainer ? 'none' : '';
    _splitterInstance.$this.classList.toggle('endVisible', !_splitterInstance._hideEndContainer);
    if (!skipSizing) {
        $end.style.width = _splitterInstance._endContainerWidth || undefined;
        $end.style.height = _splitterInstance._endContainerHeight || undefined;
    }
}
/**
 * Manage the display style of a close button.
 * @param {element} _splitterInstance
 * @private
 */
function _applyInlineStylesForCloseButton(_splitterInstance) {
    var $closeButton = _splitterInstance.$this.querySelector('.toolbar-item');
    if ($closeButton) {
        if (_splitterInstance._hideEndContainer) {
            $closeButton.style.display = 'none';
        }
        else {
            $closeButton.style.display = 'flex';
        }
    }
}
/**
 *
 * @param {element} _splitterInstance
 * @param {boolean} _skipSizing
 * @private
 */
function _applyInlineStyles(_splitterInstance, _skipSizing) {
    // eslint-disable-next-line consistent-this
    var that = _splitterInstance;
    var $end = that.$this.querySelector('end');
    var skipSizing = _skipSizing || false;
    if (that._isEndContainerClosable) {
        $end.setAttribute('verticalScrolling', 'true');
    }
    if (that._endContainerTitle) {
        $end.setAttribute('withHeader', 'true');
    }
    _applyInlineStylesForStartContainer(_splitterInstance, skipSizing);
    _applyInlineStylesForEndContainer(_splitterInstance, skipSizing);
    _applyInlineStylesForCloseButton(_splitterInstance);
}
/**
 *
 * @param {element} splitterInstance
 * @private
 */
function _createEndContainerHeader(splitterInstance) {
    var endContainerHeader = document.createElement('header');
    endContainerHeader.innerHTML = splitterInstance._endContainerTitle;
    splitterInstance.$this.querySelector('end').appendChild(endContainerHeader);
}
/**
 *
 * @param {element} splitterInstance
 * @private
 */
function _createCloseButton(splitterInstance) {
    var closeButtonElement = createElement('div', 'dt-close-button');
    closeButtonElement.classList.add('toolbar-item');
    splitterInstance.$this.querySelector('end').appendChild(closeButtonElement);
    closeButtonElement.onclick = splitterInstance.hideEndContainer.bind(splitterInstance);
}
/**
 * The complete Splitter Options.
 * @typedef {Object} splitterOptions
 * @property {boolean} hideStartContainer - the start dom element will not be rendered (display: none)
 * @property {boolean} hideEndContainer - the end dom element will not be rendered (display: none)
 * @property {boolean} isEndContainerClosable - additional close-button for closing the end element
 * @property {string} startContainerWidth - custom width of the start element
 * @property {string} startContainerHeight - custom height of the start element
 * @property {string} endContainerWidth - custom width of the end element
 * @property {string} endContainerHeight - custom height of the end element
 */
/**
 * Splitter component.
 * @param {string} domId
 * @param {splitterOptions} options
 * @constructor
 */
function SplitContainer(domId, options) {
    this._setReferences(domId);
    /**
     * If options is given and hideStartContainer is true the start (dom) element of the splitter will be hidden (display: none).
     * @type {boolean}
     * @private
     */
    this._hideStartContainer = options && options.hideStartContainer;
    /**
     * If options is given and hideStartContainer is true the end (dom) element of the splitter will be hidden (display: none).
     * @type {boolean}
     * @private
     */
    this._hideEndContainer = options && options.hideEndContainer;
    /**
     * Shows a close button for the end (dom) element of the splitter.
     * @type {boolean}
     * @private
     */
    this._isEndContainerClosable = options && options.isEndContainerClosable;
    /**
     * Set the width and height of the splitter start and end elements.
     */
    this._startContainerWidth = options && options.startContainerWidth ? options.startContainerWidth : undefined;
    this._startContainerHeight = options && options.startContainerHeight ? options.startContainerHeight : undefined;
    this._endContainerWidth = options && options.endContainerWidth ? options.endContainerWidth : undefined;
    this._endContainerHeight = options && options.endContainerHeight ? options.endContainerHeight : undefined;
    this._endContainerTitle = options && options.endContainerTitle ? options.endContainerTitle : undefined;
    _applyInlineStyles(this);
    if (this._endContainerTitle) {
        _createEndContainerHeader(this);
    }
    if (this._isEndContainerClosable) {
        _createCloseButton(this);
    }
    this._updateOrientation();
    /**
     * Place the resize holder HTML right after the 'start' element
     */
    this.$this.querySelector(':scope > start').insertAdjacentHTML('afterend', _getResizeHolderHTML());
    this.$this.querySelector('handler').onmousedown = this._mouseDownHandler.bind(this);
    const oResizeObserver = new ResizeObserver(this._onResize.bind(this));
    oResizeObserver.observe(this.$this);
}
/**
 * Hide end container.
 */
SplitContainer.prototype.hideEndContainer = function () {
    this._hideEndContainer = true;
    _applyInlineStyles(this, true);
};
/**
 * Show end container.
 */
SplitContainer.prototype.showEndContainer = function () {
    this._hideEndContainer = false;
    _applyInlineStyles(this, true);
};
/**
 * Sets optimal orientation (vertical/horizontal)
 * based on own size
 */
SplitContainer.prototype._updateOrientation = function () {
    var iWidth = this.$this.offsetWidth;
    if (!iWidth) {
        return; // container is hidden
    }
    var bNeedsVerticalSplit = iWidth < HORIZONTAL_SPLIT_MIN_WIDTH || iWidth < this.$this.offsetHeight;
    this._setOrientation(bNeedsVerticalSplit);
};
/**
 * Sets optimal orientation (vertical/horizontal)
 * based on own size
 */
SplitContainer.prototype._setOrientation = function (bNeedsVerticalSplit) {
    if (bNeedsVerticalSplit === this.isVerticalSplitter) {
        return;
    }
    /** @type {boolean}*/
    this.isVerticalSplitter = bNeedsVerticalSplit;
    this.$this.classList.toggle('verticalOrientation', this.isVerticalSplitter);
    if (this.isVerticalSplitter) { // should enable css for vertical split
        this._$endElement.style.height = this._endContainerHeight;
        this._$startElement.style.height = this._startContainerHeight;
        this._$endElement.style.width = ''; // clear opisite mode css
        this._$startElement.style.width = ''; // clear opisite mode css
    }
    else {
        this._$endElement.style.width = this._endContainerWidth;
        this._$startElement.style.width = this._startContainerWidth;
        this._$endElement.style.height = ''; // clear opisite mode css
        this._$startElement.style.height = ''; // clear opisite mode css
    }
};
/**
 * Called wien the window is resized
 */
SplitContainer.prototype._onResize = function () {
    var iOverflowX;
    var iOverflowY;
    if (this.isVerticalSplitter) {
        iOverflowY = Math.floor(this.$this.getBoundingClientRect().height) - window.innerHeight;
        if (iOverflowY > 0 && this._$endElement.style.height) {
            // part of the end container overflowed outside the viewport
            // => update its height to make the end container fit the viewport
            this._endContainerHeight = (this._$endElement.offsetHeight - iOverflowY) + 'px';
            this._$endElement.style.height = this._endContainerHeight;
        }
    }
    else {
        iOverflowX = Math.floor(this.$this.getBoundingClientRect().width) - window.innerWidth;
        if (iOverflowX > 0 && this._$endElement.style.width) {
            // part of the end container overflowed outside the viewport
            // => update its width to make the end container fit the viewport
            this._endContainerWidth = (this._$endElement.offsetWidth - iOverflowX) + 'px';
            this._$endElement.style.width = this._endContainerWidth;
        }
    }
    this._updateOrientation();
};
/**
 * Handler for mousemove.
 * @param {Object} event
 * @private
 */
SplitContainer.prototype._mouseMoveHandler = function (event) {
    var splitContainerRect = this.$this.getBoundingClientRect();
    if (this.isVerticalSplitter) {
        this._endContainerHeight = (splitContainerRect.top + splitContainerRect.height - event.clientY) + 'px';
        this._$endElement.style.height = this._endContainerHeight;
    }
    else {
        this._endContainerWidth = (splitContainerRect.left + splitContainerRect.width - event.clientX) + 'px';
        this._$endElement.style.width = this._endContainerWidth;
    }
};
/**
 * Handler for onmouseup.
 * @private
 */
SplitContainer.prototype._mouseUpHandler = function () {
    this.$this.onmousemove = null;
    document.body.classList.remove('user-is-resizing-vertically');
    document.body.classList.remove('user-is-resizing-horizontally');
};
/**
 * Handler for onmousedown.
 * @param {Object} event
 * @private
 */
SplitContainer.prototype._mouseDownHandler = function (event) {
    var that = this;
    event.preventDefault();
    event.stopPropagation();
    // Add class to disable selection of dom elements while dragging
    if (that.isVerticalSplitter) {
        document.body.classList.add('user-is-resizing-vertically');
    }
    else {
        document.body.classList.add('user-is-resizing-horizontally');
    }
    /**
     * Handler for onmousemove.
     * @param {Object} event
     */
    that.$this.onmousemove = function (event) {
        window.requestAnimationFrame(that._mouseMoveHandler.bind(that, event));
    };
    that.$this.onmouseup = that._mouseUpHandler.bind(that);
};
/**
 * Save references for SplitContainer different HTML elements.
 * @private
 */
SplitContainer.prototype._setReferences = function (domId) {
    this.$this = document.getElementById(domId);
    this._$endElement = this.$this.querySelector(':scope > end');
    this._$startElement = this.$this.querySelector(':scope > start');
};
module.exports = SplitContainer;

},{"./datagrid/UIUtils.js":17}],13:[function(require,module,exports){
'use strict';
/**
 * TabBar.
 * @param {string} containerId
 * @constructor
 */
function TabBar(containerId) {
    this._container = document.getElementById(containerId);
    this._contentsContainer = this._container.querySelector('contents');
    this._tabsContainer = this._container.querySelector('tabs');
    this.init();
}
/**
 * Initialize TabBar.
 */
TabBar.prototype.init = function () {
    this.setActiveTab(this.getActiveTab());
    // Add event handler on the tab container
    this._tabsContainer.onclick = this._onTabsClick.bind(this);
};
/**
 * Get current active tab ID.
 * @returns {string}
 */
TabBar.prototype.getActiveTab = function () {
    return this._activeTabId ? this._activeTabId : this._tabsContainer.querySelector('[selected]').id;
};
/**
 * Set active tab ID.
 * @param {string} newActiveTabId
 * @returns {TabBar}
 */
TabBar.prototype.setActiveTab = function (newActiveTabId) {
    if (!newActiveTabId) {
        return;
    }
    if (typeof newActiveTabId !== 'string') {
        console.warn('parameter error: The parameter must be a string');
        return;
    }
    if (!this._tabsContainer.querySelector('#' + newActiveTabId)) {
        console.warn('parameter error: The parameter must be a valid ID of a child tab element');
        return;
    }
    // Check for double clicking on active tab
    if (newActiveTabId === this.getActiveTab()) {
        var activeContent = this._contentsContainer.querySelector('[for="' + this.getActiveTab() + '"]');
        if (activeContent.getAttribute('selected')) {
            return;
        }
    }
    this._changeActiveTab(newActiveTabId);
    this._activeTabId = newActiveTabId;
    return this;
};
/**
 * Event handler for mouse click on a tabs.
 * @param {Object} event - click event
 * @private
 */
TabBar.prototype._onTabsClick = function (event) {
    var targetID = event.target.id;
    this.setActiveTab(targetID);
};
/**
 * Change visible tab and content.
 * @param {string} tabId - The Id of the desired tab
 */
TabBar.prototype._changeActiveTab = function (tabId) {
    var currentActiveTab = this._tabsContainer.querySelector('[selected]');
    var currentActiveContent = this._contentsContainer.querySelector('[for="' + this.getActiveTab() + '"]');
    var newActiveTab = this._tabsContainer.querySelector('#' + tabId);
    var newActiveContent = this._contentsContainer.querySelector('[for="' + tabId + '"]');
    currentActiveTab.removeAttribute('selected');
    currentActiveContent.removeAttribute('selected');
    newActiveTab.setAttribute('selected', 'true');
    newActiveContent.setAttribute('selected', 'true');
};
module.exports = TabBar;

},{}],14:[function(require,module,exports){
/* globals ResizeObserver */
'use strict';
const formatXML = require('prettify-xml');
const NOXMLVIEWMESSAGE = 'Select a \'sap.ui.core.mvc.XMLView\' to see its XML content. Click to filter on XMLViews';
/**
 * @param {string} containerId - id of the DOM container
 * @constructor
 */
function XMLDetailView(containerId) {
    this.oContainer = document.getElementById(containerId);
    this.oEditorDOM = document.createElement('div');
    this.oEditorDOM.id = 'xmlEditor';
    this.oEditorDOM.classList.toggle('hidden', true);
    this.oContainer.appendChild(this.oEditorDOM);
    this.oEditorAltDOM = document.createElement('div');
    this.oEditorAltDOM.classList.add('editorAlt');
    this.oEditorAltDOM.classList.toggle('hidden', false);
    this.oEditorAltMessageDOM = document.createElement('div');
    this.oEditorAltMessageDOM.innerText = NOXMLVIEWMESSAGE;
    this.oEditorAltMessageDOM.addEventListener('click', function () {
        var searchField = document.getElementById('elementsRegistrySearch');
        var filterCheckbox = document.getElementById('elementsRegistryCheckbox');
        searchField.value = 'sap.ui.core.mvc.XMLView';
        if (!filterCheckbox.checked) {
            filterCheckbox.click();
        }
        return false;
    });
    this.oContainer.appendChild(this.oEditorAltDOM);
    this.oEditorAltDOM.appendChild(this.oEditorAltMessageDOM);
    this.oEditor = ace.edit(this.oEditorDOM.id);
    this.oEditor.getSession().setUseWrapMode(true);
    this._setTheme();
    const oResizeObserver = new ResizeObserver(function () {
        this.oEditor.resize();
    }.bind(this));
    oResizeObserver.observe(this.oEditorDOM);
}
/**
 * Updates data.
 * @param {Object} data - object structure as JSON
 */
XMLDetailView.prototype.update = function (data) {
    const xml = data.xml && formatXML(data.xml);
    let sAltMessage;
    this.oEditorDOM.classList.toggle('hidden', !xml);
    this.oEditorAltDOM.classList.toggle('hidden', !!xml);
    if (xml) {
        this.oEditor.session.setMode('ace/mode/xml');
        this.oEditor.setValue(xml, 0);
    }
    else {
        sAltMessage = data.altMessage || NOXMLVIEWMESSAGE;
        this.oEditorAltMessageDOM.innerText = sAltMessage;
    }
    this.oEditor.clearSelection();
};
/**
 * Clears editor.
 */
XMLDetailView.prototype.clear = function () {
    this.oEditor.setValue('', -1);
};
/**
 * Sets theme.
 */
XMLDetailView.prototype._setTheme = function () {
    var bDarkMode = chrome.devtools.panels.themeName === 'dark';
    this.oEditor.setTheme(bDarkMode ? 'ace/theme/vibrant_ink' : 'ace/theme/chrome');
};
module.exports = XMLDetailView;

},{"prettify-xml":2}],15:[function(require,module,exports){
/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Contains diff method based on Javascript Diff Algorithm By John Resig
 * http://ejohn.org/files/jsdiff.js (released under the MIT license).
 */
/**
 * @param {string} tagName
 * @param {string=} customElementType
 * @return {!Element}
 * @suppress {checkTypes}
 * @suppressGlobalPropertiesCheck
 */
window.createElement = function (tagName, customElementType) {
    return document.createElement(tagName, { is: customElementType });
};
/**
 * @param {string} elementName
 * @param {string=} className
 * @param {string=} customElementType
 * @suppress {checkTypes}
 * @return {!Element}
 */
Document.prototype.createElementWithClass = function (elementName, className, customElementType) {
    const element = this.createElement(elementName, { is: customElementType });
    if (className) {
        element.className = className;
    }
    return element;
};
/**
 * @param {string} elementName
 * @param {string=} className
 * @param {string=} customElementType
 * @return {!Element}
 * @suppressGlobalPropertiesCheck
 */
window.createElementWithClass = function (elementName, className, customElementType) {
    return document.createElementWithClass(elementName, className, customElementType);
};
/**
 * @param {string} elementName
 * @param {string=} className
 * @param {string=} customElementType
 * @return {!Element}
 */
Element.prototype.createChild = function (elementName, className, customElementType) {
    const element = this.ownerDocument.createElementWithClass(elementName, className, customElementType);
    this.appendChild(element);
    return element;
};
Element.prototype.removeChildren = function () {
    if (this.firstChild) {
        this.textContent = '';
    }
};
/**
 * @return {!Window}
 */
Node.prototype.window = function () {
    return /** @type {!Window} */ (this.ownerDocument.defaultView);
};
/**
 * @param {!Array.<string>} nameArray
 * @return {?Node}
 */
Node.prototype.enclosingNodeOrSelfWithNodeNameInArray = function (nameArray) {
    // eslint-disable-next-line consistent-this
    for (let node = this; node && node !== this.ownerDocument; node = node.parentNodeOrShadowHost()) {
        for (let i = 0; i < nameArray.length; ++i) {
            if (node.nodeName.toLowerCase() === nameArray[i].toLowerCase()) {
                return node;
            }
        }
    }
    return null;
};
/**
 * @param {string} nodeName
 * @return {?Node}
 */
Node.prototype.enclosingNodeOrSelfWithNodeName = function (nodeName) {
    return this.enclosingNodeOrSelfWithNodeNameInArray([nodeName]);
};
/**
 * @return {?Node}
 */
Node.prototype.parentNodeOrShadowHost = function () {
    if (this.parentNode) {
        return this.parentNode;
    }
    if (this.nodeType === Node.DOCUMENT_FRAGMENT_NODE && this.host) {
        return this.host;
    }
    return null;
};
/**
 * @return {number}
 */
Element.prototype.totalOffsetLeft = function () {
    return this.totalOffset().left;
};
/**
 * @return {!{left: number, top: number}}
 */
Element.prototype.totalOffset = function () {
    const rect = this.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
};
/**
 * @param {boolean=} preventDefault
 */
Event.prototype.consume = function (preventDefault) {
    this.stopImmediatePropagation();
    if (preventDefault) {
        this.preventDefault();
    }
    this.handled = true;
};
/**
 * @param {!Event} event
 * @return {boolean}
 */
window.isEnterKey = function (event) {
    // Check if in IME.
    return event.keyCode !== 229 && event.key === 'Enter';
};
/**
 * @return {boolean}
 */
Element.prototype.isScrolledToBottom = function () {
    // This code works only for 0-width border.
    // The scrollTop, clientHeight and scrollHeight are computed in double values internally.
    // However, they are exposed to javascript differently, each being either rounded (via
    // round, ceil or floor functions) or left intouch.
    // This adds up a total error up to 2.
    return Math.abs(this.scrollTop + this.clientHeight - this.scrollHeight) <= 2;
};
Object.defineProperty(Array.prototype, 'upperBound', {
    /**
     * Return index of the leftmost element that is greater
     * than the specimen object. If there's no such element (i.e. all
     * elements are smaller or equal to the specimen) returns right bound.
     * The function works for sorted array.
     * When specified, |left| (inclusive) and |right| (exclusive) indices
     * define the search window.
     *
     * @param {!T} object
     * @param {function(!T,!S):number=} comparator
     * @param {number=} left
     * @param {number=} right
     * @return {number}
     * @this {Array.<!S>}
     * @template T,S
     */
    value: function (object, comparator, left, right) {
        function defaultComparator(a, b) {
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        comparator = comparator || defaultComparator;
        let l = left || 0;
        let r = right !== undefined ? right : this.length;
        while (l < r) {
            const m = (l + r) >> 1;
            if (comparator(object, this[m]) >= 0) {
                l = m + 1;
            }
            else {
                r = m;
            }
        }
        return r;
    },
    configurable: true
});
/**
 * @param {number} num
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
Number.constrain = function (num, min, max) {
    if (num < min) {
        num = min;
    }
    else if (num > max) {
        num = max;
    }
    return num;
};

},{}],16:[function(require,module,exports){
/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *        notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *        notice, this list of conditions and the following disclaimer in the
 *        documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.         IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/* eslint-disable consistent-this */
// jshint ignore: start
var UIUtils = require('./UIUtils.js');
require('./DOMExtension.js');
self.DataGrid = self.DataGrid || {};
DataGrid = DataGrid || {};
DataGrid._preferredWidthSymbol = Symbol('preferredWidth');
DataGrid._columnIdSymbol = Symbol('columnId');
DataGrid._sortIconSymbol = Symbol('sortIcon');
DataGrid._longTextSymbol = Symbol('longText');
function ls(strings) {
    return strings;
}
/**
 * @implements {EventTarget}
 * @unrestricted
 */
class ObjectWrapper {
    constructor() {
        /** @type {(!Map<string|symbol, !Array<!_listenerCallbackTuple>>|undefined)} */
        this._listeners;
    }
    /**
     * @override
     * @param {string|symbol} eventType
     * @param {function(!Common.Event)} listener
     * @param {!Object=} thisObject
     * @return {!Common.EventTarget.EventDescriptor}
     */
    addEventListener(eventType, listener, thisObject) {
        if (!listener) {
            console.assert(false);
        }
        if (!this._listeners) {
            this._listeners = new Map();
        }
        if (!this._listeners.has(eventType)) {
            this._listeners.set(eventType, []);
        }
        this._listeners.get(eventType).push({ thisObject: thisObject, listener: listener });
        return { eventTarget: this, eventType: eventType, thisObject: thisObject, listener: listener };
    }
    /**
     * @override
     * @param {symbol} eventType
     * @return {!Promise<*>}
     */
    once(eventType) {
        return new Promise(resolve => {
            const descriptor = this.addEventListener(eventType, event => {
                this.removeEventListener(eventType, descriptor.listener);
                resolve(event.data);
            });
        });
    }
    /**
     * @override
     * @param {string|symbol} eventType
     * @param {function(!Common.Event)} listener
     * @param {!Object=} thisObject
     */
    removeEventListener(eventType, listener, thisObject) {
        console.assert(listener);
        if (!this._listeners || !this._listeners.has(eventType)) {
            return;
        }
        const listeners = this._listeners.get(eventType);
        for (let i = 0; i < listeners.length; ++i) {
            if (listeners[i].listener === listener && listeners[i].thisObject === thisObject) {
                listeners[i].disposed = true;
                listeners.splice(i--, 1);
            }
        }
        if (!listeners.length) {
            this._listeners.delete(eventType);
        }
    }
    /**
     * @override
     * @param {string|symbol} eventType
     * @return {boolean}
     */
    hasEventListeners(eventType) {
        return !!(this._listeners && this._listeners.has(eventType));
    }
    /**
     * @override
     * @param {string|symbol} eventType
     * @param {*=} eventData
     */
    dispatchEventToListeners(eventType, eventData) {
        if (!this._listeners || !this._listeners.has(eventType)) {
            return;
        }
        const event = /** @type {!Common.Event} */ ({ data: eventData });
        const listeners = this._listeners.get(eventType).slice(0);
        for (let i = 0; i < listeners.length; ++i) {
            if (!listeners[i].disposed) {
                listeners[i].listener.call(listeners[i].thisObject, event);
            }
        }
    }
}
/**
 * @unrestricted
 * @template NODE_TYPE
 */
class DataGridImpl extends ObjectWrapper {
    /**
     * @param {!DataGrid.Parameters} dataGridParameters
     */
    constructor(dataGridParameters) {
        super();
        const { displayName, columns: columnsArray, editCallback, deleteCallback, refreshCallback } = dataGridParameters;
        this.element = createElementWithClass('div', 'data-grid');
        this.element.tabIndex = 0;
        this.element.addEventListener('keydown', this._keyDown.bind(this), false);
        // this.element.addEventListener('contextmenu', this._contextMenu.bind(this), true);
        this.element.addEventListener('focusin', event => {
            this.updateGridAccessibleName(/* text */ undefined, /* readGridName */ true);
            event.consume(true);
        });
        this.element.addEventListener('focusout', event => {
            this.updateGridAccessibleName(/* text */ '');
            event.consume(true);
        });
        this._displayName = displayName;
        this._editCallback = editCallback;
        this._deleteCallback = deleteCallback;
        this._refreshCallback = refreshCallback;
        const headerContainer = this.element.createChild('div', 'header-container');
        /** @type {!Element} */
        this._headerTable = headerContainer.createChild('table', 'header');
        // Hide the header table from screen readers since titles are also added to data table.
        /** @type {!Object.<string, !Element>} */
        this._headerTableHeaders = {};
        /** @type {!Element} */
        this._scrollContainer = this.element.createChild('div', 'data-container');
        /** @type {!Element} */
        this._dataTable = this._scrollContainer.createChild('table', 'data');
        /** @type {!Element} */
        this._ariaLiveLabel = this.element.createChild('div', 'aria-live-label');
        // FIXME: Add a createCallback which is different from editCallback and has different
        // behavior when creating a new node.
        if (editCallback) {
            this._dataTable.addEventListener('dblclick', this._ondblclick.bind(this), false);
        }
        this._dataTable.addEventListener('mousedown', this._mouseDownInDataTable.bind(this));
        this._dataTable.addEventListener('click', this._clickInDataTable.bind(this), true);
        /** @type {boolean} */
        this._inline = false;
        /** @type {!Array.<!DataGrid.ColumnDescriptor>} */
        this._columnsArray = [];
        /** @type {!Object.<string, !DataGrid.ColumnDescriptor>} */
        this._columns = {};
        /** @type {!Array.<!DataGrid.ColumnDescriptor>} */
        this.visibleColumnsArray = columnsArray;
        columnsArray.forEach(column => this._innerAddColumn(column));
        /** @type {?string} */
        this._cellClass = null;
        /** @type {!Element} */
        this._headerTableColumnGroup = this._headerTable.createChild('colgroup');
        /** @type {!Element} */
        this._headerTableBody = this._headerTable.createChild('tbody');
        /** @type {!Element} */
        this._headerRow = this._headerTableBody.createChild('tr');
        /** @type {!Element} */
        this._dataTableColumnGroup = this._dataTable.createChild('colgroup');
        /**
         * @protected
         * @type {!Element}
         */
        this.dataTableBody = this._dataTable.createChild('tbody');
        /** @type {!Element} */
        this._topFillerRow = this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed');
        /** @type {!Element} */
        this._bottomFillerRow = this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed');
        this.setVerticalPadding(0, 0);
        this._refreshHeader();
        /** @type {?NODE_TYPE} */
        this.selectedNode = null;
        /** @type {boolean} */
        this.expandNodesWhenArrowing = false;
        this.setRootNode(/** @type {!NODE_TYPE} */ (new DataGridNode()));
        this.setHasSelection(false);
        /** @type {number} */
        this.indentWidth = 15;
        /** @type {!Array.<!Element|{__index: number, __position: number}>} */
        this._resizers = [];
        /** @type {boolean} */
        this._columnWidthsInitialized = false;
        /** @type {number} */
        this._cornerWidth = CornerWidth;
        /** @type {!ResizeMethod} */
        this._resizeMethod = ResizeMethod.Nearest;
    }
    /**
     * @return {!NODE_TYPE}
     */
    _firstSelectableNode() {
        let firstSelectableNode = this._rootNode;
        while (firstSelectableNode && !firstSelectableNode.selectable) {
            firstSelectableNode = firstSelectableNode.traverseNextNode(true);
        }
        return firstSelectableNode;
    }
    /**
     * @return {!NODE_TYPE}
     */
    _lastSelectableNode() {
        let lastSelectableNode = this._rootNode;
        let iterator = this._rootNode;
        while (iterator) {
            if (iterator.selectable) {
                lastSelectableNode = iterator;
            }
            iterator = iterator.traverseNextNode(true);
        }
        return lastSelectableNode;
    }
    /**
     * @param {!Element} element
     * @param {*} value
     */
    setElementContent(element, value) {
        const columnId = this.columnIdFromNode(element);
        if (!columnId) {
            return;
        }
        const column = this._columns[columnId];
        if (column.dataType === DataType.Boolean) {
            DataGridImpl.setElementBoolean(element, /** @type {boolean} */ (!!value));
        }
        else if (value !== null) {
            DataGridImpl.setElementText(element, /** @type {string} */ (value), !!column.longText);
        }
    }
    /**
     * @param {!Element} element
     * @param {string} newText
     * @param {boolean} longText
     */
    static setElementText(element, newText, longText) {
        if (longText && newText.length > 1000) {
            element.textContent = newText.trimEndWithMaxLength(1000);
            element.title = newText;
            element[DataGrid._longTextSymbol] = newText;
        }
        else {
            element.textContent = newText;
            element.title = '';
            element[DataGrid._longTextSymbol] = undefined;
        }
    }
    /**
     * @param {!Element} element
     * @param {boolean} value
     */
    static setElementBoolean(element, value) {
        element.textContent = value ? '\u2713' : '';
        element.title = '';
    }
    /**
     * @param {boolean} isStriped
     */
    setStriped(isStriped) {
        this.element.classList.toggle('striped-data-grid', isStriped);
    }
    /**
     * @param {boolean} focusable
     */
    setFocusable(focusable) {
        this.element.tabIndex = focusable ? 0 : -1;
    }
    /**
     * @param {boolean} hasSelected
     */
    setHasSelection(hasSelected) {
        // 'no-selection' class causes datagrid to have a focus-indicator border
        this.element.classList.toggle('no-selection', !hasSelected);
    }
    /**
     * @param {string=} text
     * @param {boolean=} readGridName
     */
    updateGridAccessibleName(text, readGridName) {
        // If text provided, update and return
        if (typeof text !== 'undefined') {
            this._ariaLiveLabel.textContent = text;
            return;
        }
        // readGridName: When navigating to the grid from a different element,
        // append the displayname of the grid for SR context.
        let accessibleText;
        if (this.selectedNode && this.selectedNode.existingElement()) {
            let expandText = '';
            if (this.selectedNode.hasChildren()) {
                expandText = this.selectedNode.expanded ? ls `expanded` : ls `collapsed`;
            }
            const rowHeader = readGridName ? ls `${this._displayName} Row ${expandText}` : expandText;
            accessibleText = `${rowHeader} ${this.selectedNode.nodeAccessibleText}`;
        }
        else {
            accessibleText = `${this._displayName}, use the up and down arrow keys to navigate and interact with the rows of the table; Use browse mode to read cell by cell.`;
        }
        this._ariaLiveLabel.textContent = accessibleText;
    }
    /**
     * @return {!Element}
     */
    headerTableBody() {
        return this._headerTableBody;
    }
    /**
     * @param {!DataGrid.ColumnDescriptor} column
     * @param {number=} position
     */
    _innerAddColumn(column, position) {
        const columnId = column.id;
        if (columnId in this._columns) {
            this._innerRemoveColumn(columnId);
        }
        if (position === undefined) {
            position = this._columnsArray.length;
        }
        this._columnsArray.splice(position, 0, column);
        this._columns[columnId] = column;
        if (column.disclosure) {
            this.disclosureColumnId = columnId;
        }
        const cell = createElement('th');
        cell.className = columnId + '-column';
        cell[DataGrid._columnIdSymbol] = columnId;
        this._headerTableHeaders[columnId] = cell;
        const div = createElement('div');
        if (column.titleDOMFragment) {
            div.appendChild(column.titleDOMFragment);
        }
        else {
            div.textContent = column.title;
        }
        cell.appendChild(div);
        if (column.sort) {
            cell.classList.add(column.sort);
            this._sortColumnCell = cell;
        }
        if (column.sortable) {
            cell.addEventListener('click', this._clickInHeaderCell.bind(this), false);
            cell.classList.add('sortable');
            const icon = UIUtils.Icon.create('', 'sort-order-icon');
            cell.createChild('div', 'sort-order-icon-container').appendChild(icon);
            cell[DataGrid._sortIconSymbol] = icon;
        }
    }
    /**
     * @param {!DataGrid.ColumnDescriptor} column
     * @param {number=} position
     */
    addColumn(column, position) {
        this._innerAddColumn(column, position);
    }
    /**
     * @param {string} columnId
     */
    _innerRemoveColumn(columnId) {
        const column = this._columns[columnId];
        if (!column) {
            return;
        }
        delete this._columns[columnId];
        const index = this._columnsArray.findIndex(columnConfig => columnConfig.id === columnId);
        this._columnsArray.splice(index, 1);
        const cell = this._headerTableHeaders[columnId];
        if (cell.parentElement) {
            cell.parentElement.removeChild(cell);
        }
        delete this._headerTableHeaders[columnId];
    }
    /**
     * @param {string} columnId
     */
    removeColumn(columnId) {
        this._innerRemoveColumn(columnId);
    }
    /**
     * @param {string} cellClass
     */
    setCellClass(cellClass) {
        this._cellClass = cellClass;
    }
    _refreshHeader() {
        this._headerTableColumnGroup.removeChildren();
        this._dataTableColumnGroup.removeChildren();
        this._headerRow.removeChildren();
        this._topFillerRow.removeChildren();
        this._bottomFillerRow.removeChildren();
        for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
            const column = this.visibleColumnsArray[i];
            const columnId = column.id;
            const headerColumn = this._headerTableColumnGroup.createChild('col');
            const dataColumn = this._dataTableColumnGroup.createChild('col');
            if (column.width) {
                headerColumn.style.width = column.width;
                dataColumn.style.width = column.width;
            }
            this._headerRow.appendChild(this._headerTableHeaders[columnId]);
            const topFillerRowCell = this._topFillerRow.createChild('th', 'top-filler-td');
            topFillerRowCell.textContent = column.title;
            topFillerRowCell.scope = 'col';
            this._bottomFillerRow.createChild('td', 'bottom-filler-td')[DataGrid._columnIdSymbol] = columnId;
        }
        this._headerRow.createChild('th', 'corner');
        const topFillerRowCornerCell = this._topFillerRow.createChild('th', 'corner');
        topFillerRowCornerCell.classList.add('top-filler-td');
        topFillerRowCornerCell.scope = 'col';
        this._bottomFillerRow.createChild('td', 'corner').classList.add('bottom-filler-td');
        this._headerTableColumnGroup.createChild('col', 'corner');
        this._dataTableColumnGroup.createChild('col', 'corner');
    }
    /**
     * @param {number} top
     * @param {number} bottom
     * @protected
     */
    setVerticalPadding(top, bottom) {
        const topPx = top + 'px';
        const bottomPx = (top || bottom) ? bottom + 'px' : 'auto';
        if (this._topFillerRow.style.height === topPx && this._bottomFillerRow.style.height === bottomPx) {
            return;
        }
        this._topFillerRow.style.height = topPx;
        this._bottomFillerRow.style.height = bottomPx;
        this.dispatchEventToListeners(Events.PaddingChanged);
    }
    /**
     * @param {!NODE_TYPE} rootNode
     * @protected
     */
    setRootNode(rootNode) {
        if (this._rootNode) {
            this._rootNode.removeChildren();
            this._rootNode.dataGrid = null;
            this._rootNode._isRoot = false;
        }
        /** @type {!NODE_TYPE} */
        this._rootNode = rootNode;
        rootNode._isRoot = true;
        rootNode.setHasChildren(false);
        rootNode._expanded = true;
        rootNode._revealed = true;
        rootNode.selectable = false;
        rootNode.dataGrid = this;
    }
    /**
     * @return {!NODE_TYPE}
     */
    rootNode() {
        return this._rootNode;
    }
    /**
     * @param {!Event} event
     */
    _ondblclick(event) {
        const columnId = this.columnIdFromNode(/** @type {!Node} */ (event.target));
        if (!columnId || !this._columns[columnId].editable) {
            return;
        }
    }
    renderInline() {
        this.element.classList.add('inline');
        this._cornerWidth = 0;
        this._inline = true;
        this.updateWidths();
    }
    /**
     * @param {number} cellIndex
     * @param {boolean=} moveBackward
     * @return {number}
     */
    _nextEditableColumn(cellIndex, moveBackward) {
        const increment = moveBackward ? -1 : 1;
        const columns = this.visibleColumnsArray;
        for (let i = cellIndex + increment; (i >= 0) && (i < columns.length); i += increment) {
            if (columns[i].editable) {
                return i;
            }
        }
        return -1;
    }
    /**
     * @return {?string}
     */
    sortColumnId() {
        if (!this._sortColumnCell) {
            return null;
        }
        return this._sortColumnCell[DataGrid._columnIdSymbol];
    }
    /**
     * @return {?string}
     */
    sortOrder() {
        if (!this._sortColumnCell || this._sortColumnCell.classList.contains(Order.Ascending)) {
            return Order.Ascending;
        }
        if (this._sortColumnCell.classList.contains(Order.Descending)) {
            return Order.Descending;
        }
        return null;
    }
    /**
     * @return {boolean}
     */
    isSortOrderAscending() {
        return !this._sortColumnCell || this._sortColumnCell.classList.contains(Order.Ascending);
    }
    /**
     * @param {!Array.<number>} widths
     * @param {number} minPercent
     * @param {number=} maxPercent
     * @return {!Array.<number>}
     */
    _autoSizeWidths(widths, minPercent, maxPercent) {
        if (minPercent) {
            minPercent = Math.min(minPercent, Math.floor(100 / widths.length));
        }
        let totalWidth = 0;
        for (let i = 0; i < widths.length; ++i) {
            totalWidth += widths[i];
        }
        let totalPercentWidth = 0;
        for (let i = 0; i < widths.length; ++i) {
            let width = Math.round(100 * widths[i] / totalWidth);
            if (minPercent && width < minPercent) {
                width = minPercent;
            }
            else if (maxPercent && width > maxPercent) {
                width = maxPercent;
            }
            totalPercentWidth += width;
            widths[i] = width;
        }
        let recoupPercent = totalPercentWidth - 100;
        while (minPercent && recoupPercent > 0) {
            for (let i = 0; i < widths.length; ++i) {
                if (widths[i] > minPercent) {
                    --widths[i];
                    --recoupPercent;
                    if (!recoupPercent) {
                        break;
                    }
                }
            }
        }
        while (maxPercent && recoupPercent < 0) {
            for (let i = 0; i < widths.length; ++i) {
                if (widths[i] < maxPercent) {
                    ++widths[i];
                    ++recoupPercent;
                    if (!recoupPercent) {
                        break;
                    }
                }
            }
        }
        return widths;
    }
    /**
     * The range of |minPercent| and |maxPercent| is [0, 100].
     * @param {number} minPercent
     * @param {number=} maxPercent
     * @param {number=} maxDescentLevel
     */
    autoSizeColumns(minPercent, maxPercent, maxDescentLevel) {
        let widths = [];
        for (let i = 0; i < this._columnsArray.length; ++i) {
            widths.push((this._columnsArray[i].title || '').length);
        }
        maxDescentLevel = maxDescentLevel || 0;
        const children = this._enumerateChildren(this._rootNode, [], maxDescentLevel + 1);
        for (let i = 0; i < children.length; ++i) {
            const node = children[i];
            for (let j = 0; j < this._columnsArray.length; ++j) {
                const text = String(node.data[this._columnsArray[j].id]);
                if (text.length > widths[j]) {
                    widths[j] = text.length;
                }
            }
        }
        widths = this._autoSizeWidths(widths, minPercent, maxPercent);
        for (let i = 0; i < this._columnsArray.length; ++i) {
            this._columnsArray[i].weight = widths[i];
        }
        this._columnWidthsInitialized = false;
        this.updateWidths();
    }
    /**
     * @param {!DataGridNode} rootNode
     * @param {!Array<!DataGridNode>} result
     * @param {number} maxLevel
     * @return {!Array<!NODE_TYPE>}
     */
    _enumerateChildren(rootNode, result, maxLevel) {
        if (!rootNode._isRoot) {
            result.push(rootNode);
        }
        if (!maxLevel) {
            return [];
        }
        for (let i = 0; i < rootNode.children.length; ++i) {
            this._enumerateChildren(rootNode.children[i], result, maxLevel - 1);
        }
        return result;
    }
    onResize() {
        this.updateWidths();
    }
    // Updates the widths of the table, including the positions of the column
    // resizers.
    //
    // IMPORTANT: This function MUST be called once after the element of the
    // DataGrid is attached to its parent element and every subsequent time the
    // width of the parent element is changed in order to make it possible to
    // resize the columns.
    //
    // If this function is not called after the DataGrid is attached to its
    // parent element, then the DataGrid's columns will not be resizable.
    updateWidths() {
        // Do not attempt to use offsetes if we're not attached to the document tree yet.
        if (!this._columnWidthsInitialized && this.element.offsetWidth) {
            // Give all the columns initial widths now so that during a resize,
            // when the two columns that get resized get a percent value for
            // their widths, all the other columns already have percent values
            // for their widths.
            // Use container size to avoid changes of table width caused by change of column widths.
            const tableWidth = this.element.offsetWidth - this._cornerWidth;
            const cells = this._headerTableBody.rows[0].cells;
            const numColumns = cells.length - 1; // Do not process corner column.
            for (let i = 0; i < numColumns; i++) {
                const column = this.visibleColumnsArray[i];
                if (!column.weight) {
                    column.weight = 100 * cells[i].offsetWidth / tableWidth || 10;
                }
            }
            this._columnWidthsInitialized = true;
        }
        this._applyColumnWeights();
    }
    /**
     * @param {string} columnId
     * @returns {number}
     */
    indexOfVisibleColumn(columnId) {
        return this.visibleColumnsArray.findIndex(column => column.id === columnId);
    }
    /**
     * @param {string} name
     */
    setName(name) {
        // this._columnWeightsSetting = self.Common.settings.createSetting('dataGrid-' + name + '-columnWeights', {});
        this._loadColumnWeights();
    }
    _loadColumnWeights() {
        if (!this._columnWeightsSetting) {
            return;
        }
        const weights = this._columnWeightsSetting.get();
        for (let i = 0; i < this._columnsArray.length; ++i) {
            const column = this._columnsArray[i];
            const weight = weights[column.id];
            if (weight) {
                column.weight = weight;
            }
        }
        this._applyColumnWeights();
    }
    _saveColumnWeights() {
        if (!this._columnWeightsSetting) {
            return;
        }
        const weights = {};
        for (let i = 0; i < this._columnsArray.length; ++i) {
            const column = this._columnsArray[i];
            weights[column.id] = column.weight;
        }
        this._columnWeightsSetting.set(weights);
    }
    wasShown() {
        this._loadColumnWeights();
    }
    willHide() {
    }
    _applyColumnWeights() {
        let tableWidth = this.element.offsetWidth - this._cornerWidth;
        if (tableWidth <= 0) {
            return;
        }
        let sumOfWeights = 0.0;
        const fixedColumnWidths = [];
        for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
            const column = this.visibleColumnsArray[i];
            if (column.fixedWidth) {
                const width = this._headerTableColumnGroup.children[i][DataGrid._preferredWidthSymbol] ||
                    this._headerTableBody.rows[0].cells[i].offsetWidth;
                fixedColumnWidths[i] = width;
                tableWidth -= width;
            }
            else {
                sumOfWeights += this.visibleColumnsArray[i].weight;
            }
        }
        let sum = 0;
        let lastOffset = 0;
        for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
            const column = this.visibleColumnsArray[i];
            let width;
            if (column.fixedWidth) {
                width = fixedColumnWidths[i];
            }
            else {
                sum += column.weight;
                const offset = (sum * tableWidth / sumOfWeights) | 0;
                width = offset - lastOffset;
                lastOffset = offset;
            }
            this._setPreferredWidth(i, width);
        }
        this._positionResizers();
    }
    /**
     * @param {!Object.<string, boolean>} columnsVisibility
     */
    setColumnsVisiblity(columnsVisibility) {
        this.visibleColumnsArray = [];
        for (let i = 0; i < this._columnsArray.length; ++i) {
            const column = this._columnsArray[i];
            if (columnsVisibility[column.id]) {
                this.visibleColumnsArray.push(column);
            }
        }
        this._refreshHeader();
        this._applyColumnWeights();
        const nodes = this._enumerateChildren(this.rootNode(), [], -1);
        for (let i = 0; i < nodes.length; ++i) {
            nodes[i].refresh();
        }
    }
    get scrollContainer() {
        return this._scrollContainer;
    }
    _positionResizers() {
        const headerTableColumns = this._headerTableColumnGroup.children;
        const numColumns = headerTableColumns.length - 1; // Do not process corner column.
        const left = [];
        const resizers = this._resizers;
        while (resizers.length > numColumns - 1) {
            resizers.pop().remove();
        }
        for (let i = 0; i < numColumns - 1; i++) {
            // Get the width of the cell in the first (and only) row of the
            // header table in order to determine the width of the column, since
            // it is not possible to query a column for its width.
            left[i] = (left[i - 1] || 0) + this._headerTableBody.rows[0].cells[i].offsetWidth;
        }
        // Make n - 1 resizers for n columns.
        for (let i = 0; i < numColumns - 1; i++) {
            let resizer = resizers[i];
            if (!resizer) {
                // This is the first call to updateWidth, so the resizers need
                // to be created.
                resizer = createElement('div');
                resizer.__index = i;
                resizer.classList.add('data-grid-resizer');
                // This resizer is associated with the column to its right.
                UIUtils.installDragHandle(resizer, this._startResizerDragging.bind(this), this._resizerDragging.bind(this), this._endResizerDragging.bind(this), 'col-resize');
                this.element.appendChild(resizer);
                resizers.push(resizer);
            }
            if (resizer.__position !== left[i]) {
                resizer.__position = left[i];
                resizer.style.left = left[i] + 'px';
            }
        }
    }
    addCreationNode(hasChildren) {
        if (this.creationNode) {
            this.creationNode.makeNormal();
        }
        const emptyData = {};
        for (const column in this._columns) {
            emptyData[column] = null;
        }
        this.creationNode = new CreationDataGridNode(emptyData, hasChildren);
        this.rootNode().appendChild(this.creationNode);
    }
    /**
     * @param {!Event} event
     * @suppressGlobalPropertiesCheck
     */
    _keyDown(event) {
        if (event.shiftKey || event.metaKey || event.ctrlKey) {
            return;
        }
        let handled = false;
        let nextSelectedNode;
        if (!this.selectedNode) {
            // Select the first or last node based on the arrow key direction
            if (event.key === 'ArrowUp' && !event.altKey) {
                nextSelectedNode = this._lastSelectableNode();
            }
            else if (event.key === 'ArrowDown' && !event.altKey) {
                nextSelectedNode = this._firstSelectableNode();
            }
            handled = nextSelectedNode ? true : false;
        }
        else if (event.key === 'ArrowUp' && !event.altKey) {
            nextSelectedNode = this.selectedNode.traversePreviousNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable) {
                nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
            }
            handled = nextSelectedNode ? true : false;
        }
        else if (event.key === 'ArrowDown' && !event.altKey) {
            nextSelectedNode = this.selectedNode.traverseNextNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable) {
                nextSelectedNode = nextSelectedNode.traverseNextNode(true);
            }
            handled = nextSelectedNode ? true : false;
        }
        else if (event.key === 'ArrowLeft') {
            if (this.selectedNode.expanded) {
                if (event.altKey) {
                    this.selectedNode.collapseRecursively();
                }
                else {
                    this.selectedNode.collapse();
                }
                handled = true;
            }
            else if (this.selectedNode.parent && !this.selectedNode.parent._isRoot) {
                handled = true;
                if (this.selectedNode.parent.selectable) {
                    nextSelectedNode = this.selectedNode.parent;
                    handled = nextSelectedNode ? true : false;
                }
                else if (this.selectedNode.parent) {
                    this.selectedNode.parent.collapse();
                }
            }
        }
        else if (event.key === 'ArrowRight') {
            if (!this.selectedNode.revealed) {
                this.selectedNode.reveal();
                handled = true;
            }
            else if (this.selectedNode.hasChildren()) {
                handled = true;
                if (this.selectedNode.expanded) {
                    nextSelectedNode = this.selectedNode.children[0];
                    handled = nextSelectedNode ? true : false;
                }
                else {
                    if (event.altKey) {
                        this.selectedNode.expandRecursively();
                    }
                    else {
                        this.selectedNode.expand();
                    }
                }
            }
        }
        else if (event.keyCode === 8 || event.keyCode === 46) {
            if (this._deleteCallback) {
                handled = true;
                this._deleteCallback(this.selectedNode);
            }
        }
        else if (isEnterKey(event)) {
            if (this._editCallback) {
                handled = true;
            }
            else {
                this.dispatchEventToListeners(Events.OpenedNode, this.selectedNode);
            }
        }
        if (nextSelectedNode) {
            nextSelectedNode.reveal();
            nextSelectedNode.select();
        }
        if ((event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' ||
            event.key === 'ArrowRight') &&
            document.activeElement !== this.element) {
            // crbug.com/1005449
            // navigational keys pressed but current DataGrid panel has lost focus;
            // re-focus to ensure subsequent keydowns can be registered within this DataGrid
            this.element.focus();
        }
        if (handled) {
            event.consume(true);
        }
    }
    /**
     * @param {?NODE_TYPE} root
     * @param {boolean} onlyAffectsSubtree
     */
    updateSelectionBeforeRemoval(root, onlyAffectsSubtree) {
        let ancestor = this.selectedNode;
        while (ancestor && ancestor !== root) {
            ancestor = ancestor.parent;
        }
        // Selection is not in the subtree being deleted.
        if (!ancestor) {
            return;
        }
        let nextSelectedNode;
        // Skip subtree being deleted when looking for the next selectable node.
        // eslint-disable-next-line no-empty
        for (ancestor = root; ancestor && !ancestor.nextSibling; ancestor = ancestor.parent) {
        }
        if (ancestor) {
            nextSelectedNode = ancestor.nextSibling;
        }
        while (nextSelectedNode && !nextSelectedNode.selectable) {
            nextSelectedNode = nextSelectedNode.traverseNextNode(true);
        }
        if (!nextSelectedNode || nextSelectedNode.isCreationNode) {
            nextSelectedNode = root.traversePreviousNode(true);
            while (nextSelectedNode && !nextSelectedNode.selectable) {
                nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
            }
        }
        if (nextSelectedNode) {
            nextSelectedNode.reveal();
            nextSelectedNode.select();
        }
        else {
            this.selectedNode.deselect();
        }
    }
    /**
     * @param {!Node} target
     * @return {?NODE_TYPE}
     */
    dataGridNodeFromNode(target) {
        const rowElement = target.enclosingNodeOrSelfWithNodeName('tr');
        return rowElement && rowElement._dataGridNode;
    }
    /**
     * @param {!Node} target
     * @return {?string}
     */
    columnIdFromNode(target) {
        const cellElement = target.enclosingNodeOrSelfWithNodeName('td');
        return cellElement && cellElement[DataGrid._columnIdSymbol];
    }
    /**
     * @param {!Event} event
     */
    _clickInHeaderCell(event) {
        const cell = event.target.enclosingNodeOrSelfWithNodeName('th');
        if (!cell) {
            return;
        }
        this._sortByColumnHeaderCell(cell);
    }
    /**
     * @param {!Node} cell
     */
    _sortByColumnHeaderCell(cell) {
        if ((cell[DataGrid._columnIdSymbol] === undefined) || !cell.classList.contains('sortable')) {
            return;
        }
        let sortOrder = Order.Ascending;
        if ((cell === this._sortColumnCell) && this.isSortOrderAscending()) {
            sortOrder = Order.Descending;
        }
        if (this._sortColumnCell) {
            this._sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
        }
        this._sortColumnCell = cell;
        cell.classList.add(sortOrder);
        const icon = cell[DataGrid._sortIconSymbol];
        icon.setIconType(sortOrder === Order.Ascending ? 'smallicon-triangle-up' : 'smallicon-triangle-down');
        this.dispatchEventToListeners(Events.SortingChanged);
    }
    /**
     * @param {string} columnId
     * @param {!Order} sortOrder
     */
    markColumnAsSortedBy(columnId, sortOrder) {
        if (this._sortColumnCell) {
            this._sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
        }
        this._sortColumnCell = this._headerTableHeaders[columnId];
        this._sortColumnCell.classList.add(sortOrder);
    }
    /**
     * @param {string} columnId
     * @return {!Element}
     */
    headerTableHeader(columnId) {
        return this._headerTableHeaders[columnId];
    }
    /**
     * @param {!Event} event
     */
    _mouseDownInDataTable(event) {
        const target = /** @type {!Node} */ (event.target);
        const gridNode = this.dataGridNodeFromNode(target);
        if (!gridNode || !gridNode.selectable || gridNode.isEventWithinDisclosureTriangle(event)) {
            return;
        }
        const columnId = this.columnIdFromNode(target);
        if (columnId && this._columns[columnId].nonSelectable) {
            return;
        }
        if (event.metaKey) {
            if (gridNode.selected) {
                gridNode.deselect();
            }
            else {
                gridNode.select();
            }
        }
        else {
            gridNode.select();
            this.dispatchEventToListeners(Events.OpenedNode, gridNode);
        }
    }
    /**
     * @param {!Event} event
     */
    _clickInDataTable(event) {
        const gridNode = this.dataGridNodeFromNode(/** @type {!Node} */ (event.target));
        if (!gridNode || !gridNode.hasChildren() || !gridNode.isEventWithinDisclosureTriangle(event)) {
            return;
        }
        if (gridNode.expanded) {
            if (event.altKey) {
                gridNode.collapseRecursively();
            }
            else {
                gridNode.collapse();
            }
        }
        else {
            if (event.altKey) {
                gridNode.expandRecursively();
            }
            else {
                gridNode.expand();
            }
        }
    }
    /**
     * @param {!ResizeMethod} method
     */
    setResizeMethod(method) {
        this._resizeMethod = method;
    }
    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _startResizerDragging(event) {
        this._currentResizer = event.target;
        return true;
    }
    _endResizerDragging() {
        this._currentResizer = null;
        this._saveColumnWeights();
    }
    /**
     * @param {!Event} event
     */
    _resizerDragging(event) {
        const resizer = this._currentResizer;
        if (!resizer) {
            return;
        }
        // Constrain the dragpoint to be within the containing div of the
        // datagrid.
        let dragPoint = event.clientX - this.element.totalOffsetLeft();
        const firstRowCells = this._headerTableBody.rows[0].cells;
        let leftEdgeOfPreviousColumn = 0;
        // Constrain the dragpoint to be within the space made up by the
        // column directly to the left and the column directly to the right.
        let leftCellIndex = resizer.__index;
        let rightCellIndex = leftCellIndex + 1;
        for (let i = 0; i < leftCellIndex; i++) {
            leftEdgeOfPreviousColumn += firstRowCells[i].offsetWidth;
        }
        // Differences for other resize methods
        if (this._resizeMethod === ResizeMethod.Last) {
            rightCellIndex = this._resizers.length;
        }
        else if (this._resizeMethod === ResizeMethod.First) {
            leftEdgeOfPreviousColumn += firstRowCells[leftCellIndex].offsetWidth - firstRowCells[0].offsetWidth;
            leftCellIndex = 0;
        }
        const rightEdgeOfNextColumn = leftEdgeOfPreviousColumn + firstRowCells[leftCellIndex].offsetWidth + firstRowCells[rightCellIndex].offsetWidth;
        // Give each column some padding so that they don't disappear.
        const leftMinimum = leftEdgeOfPreviousColumn + ColumnResizePadding;
        const rightMaximum = rightEdgeOfNextColumn - ColumnResizePadding;
        if (leftMinimum > rightMaximum) {
            return;
        }
        dragPoint = Number.constrain(dragPoint, leftMinimum, rightMaximum);
        const position = (dragPoint - CenterResizerOverBorderAdjustment);
        resizer.__position = position;
        resizer.style.left = position + 'px';
        this._setPreferredWidth(leftCellIndex, dragPoint - leftEdgeOfPreviousColumn);
        this._setPreferredWidth(rightCellIndex, rightEdgeOfNextColumn - dragPoint);
        const leftColumn = this.visibleColumnsArray[leftCellIndex];
        const rightColumn = this.visibleColumnsArray[rightCellIndex];
        if (leftColumn.weight || rightColumn.weight) {
            const sumOfWeights = leftColumn.weight + rightColumn.weight;
            const delta = rightEdgeOfNextColumn - leftEdgeOfPreviousColumn;
            leftColumn.weight = (dragPoint - leftEdgeOfPreviousColumn) * sumOfWeights / delta;
            rightColumn.weight = (rightEdgeOfNextColumn - dragPoint) * sumOfWeights / delta;
        }
        this._positionResizers();
        event.preventDefault();
    }
    /**
     * @param {number} columnIndex
     * @param {number} width
     */
    _setPreferredWidth(columnIndex, width) {
        const pxWidth = width + 'px';
        this._headerTableColumnGroup.children[columnIndex][DataGrid._preferredWidthSymbol] = width;
        this._headerTableColumnGroup.children[columnIndex].style.width = pxWidth;
        this._dataTableColumnGroup.children[columnIndex].style.width = pxWidth;
    }
    /**
     * @param {string} columnId
     * @return {number}
     */
    columnOffset(columnId) {
        if (!this.element.offsetWidth) {
            return 0;
        }
        for (let i = 1; i < this.visibleColumnsArray.length; ++i) {
            if (columnId === this.visibleColumnsArray[i].id) {
                if (this._resizers[i - 1]) {
                    return this._resizers[i - 1].__position;
                }
            }
        }
        return 0;
    }
    topFillerRowElement() {
        return this._topFillerRow;
    }
}
// Keep in sync with .data-grid col.corner style rule.
const CornerWidth = 14;
/** @enum {symbol} */
const Events = {
    SelectedNode: Symbol('SelectedNode'),
    DeselectedNode: Symbol('DeselectedNode'),
    OpenedNode: Symbol('OpenedNode'),
    SortingChanged: Symbol('SortingChanged'),
    PaddingChanged: Symbol('PaddingChanged'),
    ViewportCalculated: Symbol('ViewportCalculated')
};
/** @enum {string} */
const Order = {
    Ascending: 'sort-ascending',
    Descending: 'sort-descending'
};
/** @enum {string} */
const Align = {
    Center: 'center',
    Right: 'right'
};
/** @enum {symbol} */
const DataType = {
    String: Symbol('String'),
    Boolean: Symbol('Boolean'),
};
const ColumnResizePadding = 24;
const CenterResizerOverBorderAdjustment = 3;
/** @enum {string} */
const ResizeMethod = {
    Nearest: 'nearest',
    First: 'first',
    Last: 'last'
};
/**
 * @unrestricted
 * @template NODE_TYPE
 */
class DataGridNode extends ObjectWrapper {
    /**
     * @param {?Object.<string, *>=} data
     * @param {boolean=} hasChildren
     */
    constructor(data, hasChildren) {
        super();
        /** @type {?Element} */
        this._element = null;
        /** @protected @type {boolean} @suppress {accessControls} */
        this._expanded = false;
        /** @type {boolean} */
        this._selected = false;
        /** @type {boolean} */
        this._dirty = false;
        /** @type {boolean} */
        this._inactive = false;
        /** @type {number|undefined} */
        this._depth;
        /** @type {boolean|undefined} */
        this._revealed;
        /** @type {boolean} */
        this._attached = false;
        /** @type {?{parent: !NODE_TYPE, index: number}} */
        this._savedPosition = null;
        /** @type {boolean} */
        this._shouldRefreshChildren = true;
        /** @type {!Object.<string, *>} */
        this._data = data || {};
        /** @type {boolean} */
        this._hasChildren = hasChildren || false;
        /** @type {!Array.<!NODE_TYPE>} */
        this.children = [];
        /** @type {?DataGridImpl} */
        this.dataGrid = null;
        /** @type {?NODE_TYPE} */
        this.parent = null;
        /** @type {?NODE_TYPE} */
        this.previousSibling = null;
        /** @type {?NODE_TYPE} */
        this.nextSibling = null;
        /** @type {number} */
        this.disclosureToggleWidth = 10;
        /** @type {boolean} */
        this.selectable = true;
        /** @type {boolean} */
        this._isRoot = false;
        /** @type {string} */
        this.nodeAccessibleText = '';
        /** @type {!Map<string, string>}} */
        this.cellAccessibleTextMap = new Map();
    }
    /**
     * @return {!Element}
     */
    element() {
        if (!this._element) {
            const element = this.createElement();
            this.createCells(element);
        }
        return /** @type {!Element} */ (this._element);
    }
    /**
     * @protected
     * @return {!Element}
     */
    createElement() {
        this._element = createElementWithClass('tr', 'data-grid-data-grid-node');
        this._element._dataGridNode = this;
        if (this._hasChildren) {
            this._element.classList.add('parent');
        }
        if (this.expanded) {
            this._element.classList.add('expanded');
        }
        if (this.selected) {
            this._element.classList.add('selected');
        }
        if (this.revealed) {
            this._element.classList.add('revealed');
        }
        if (this.dirty) {
            this._element.classList.add('dirty');
        }
        if (this.inactive) {
            this._element.classList.add('inactive');
        }
        return this._element;
    }
    /**
     * @return {?Element}
     */
    existingElement() {
        return this._element || null;
    }
    /**
     * @protected
     */
    resetElement() {
        this._element = null;
    }
    /**
     * @param {!Element} element
     * @protected
     */
    createCells(element) {
        element.removeChildren();
        const columnsArray = this.dataGrid.visibleColumnsArray;
        const accessibleTextArray = [];
        // Add depth if node is part of a tree
        if (this._hasChildren || !this.parent._isRoot) {
            accessibleTextArray.push(ls `level ${this.depth + 1}`);
        }
        for (let i = 0; i < columnsArray.length; ++i) {
            const column = columnsArray[i];
            const cell = element.appendChild(this.createCell(column.id));
            // Add each visibile cell to the node's accessible text by gathering 'Column Title: content'
            const localizedTitle = ls `${column.title}`;
            accessibleTextArray.push(`${localizedTitle}: ${this.cellAccessibleTextMap.get(column.id) || cell.textContent}`);
        }
        this.nodeAccessibleText = accessibleTextArray.join(', ');
        element.appendChild(this._createTDWithClass('corner'));
    }
    /**
     * @return {!Object.<string, *>}
     */
    get data() {
        return this._data;
    }
    /**
     * @param {!Object.<string, *>} x
     */
    set data(x) {
        this._data = x || {};
        this.refresh();
    }
    /**
     * @return {boolean}
     */
    get revealed() {
        if (this._revealed !== undefined) {
            return this._revealed;
        }
        let currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor._isRoot) {
            if (!currentAncestor.expanded) {
                this._revealed = false;
                return false;
            }
            currentAncestor = currentAncestor.parent;
        }
        this.revealed = true;
        return true;
    }
    /**
     * @param {boolean} x
     */
    set revealed(x) {
        if (this._revealed === x) {
            return;
        }
        this._revealed = x;
        if (this._element) {
            this._element.classList.toggle('revealed', this._revealed);
        }
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i].revealed = x && this.expanded;
        }
    }
    /**
     * @return {boolean}
     */
    isDirty() {
        return this._dirty;
    }
    /**
     * @param {boolean} dirty
     */
    setDirty(dirty) {
        if (this._dirty === dirty) {
            return;
        }
        this._dirty = dirty;
        if (!this._element) {
            return;
        }
        if (dirty) {
            this._element.classList.add('dirty');
        }
        else {
            this._element.classList.remove('dirty');
        }
    }
    /**
     * @return {boolean}
     */
    isInactive() {
        return this._inactive;
    }
    /**
     * @param {boolean} inactive
     */
    setInactive(inactive) {
        if (this._inactive === inactive) {
            return;
        }
        this._inactive = inactive;
        if (!this._element) {
            return;
        }
        if (inactive) {
            this._element.classList.add('inactive');
        }
        else {
            this._element.classList.remove('inactive');
        }
    }
    /**
     * @return {boolean}
     */
    hasChildren() {
        return this._hasChildren;
    }
    /**
     * @param {boolean} x
     */
    setHasChildren(x) {
        if (this._hasChildren === x) {
            return;
        }
        this._hasChildren = x;
        if (!this._element) {
            return;
        }
        this._element.classList.toggle('parent', this._hasChildren);
        this._element.classList.toggle('expanded', this._hasChildren && this.expanded);
    }
    /**
     * @return {number}
     */
    get depth() {
        if (this._depth !== undefined) {
            return this._depth;
        }
        if (this.parent && !this.parent._isRoot) {
            this._depth = this.parent.depth + 1;
        }
        else {
            this._depth = 0;
        }
        return this._depth;
    }
    /**
     * @return {number}
     */
    get leftPadding() {
        return this.depth * this.dataGrid.indentWidth;
    }
    /**
     * @return {boolean}
     */
    get shouldRefreshChildren() {
        return this._shouldRefreshChildren;
    }
    /**
     * @param {boolean} x
     */
    set shouldRefreshChildren(x) {
        this._shouldRefreshChildren = x;
        if (x && this.expanded) {
            this.expand();
        }
    }
    /**
     * @return {boolean}
     */
    get selected() {
        return this._selected;
    }
    /**
     * @param {boolean} x
     */
    set selected(x) {
        if (x) {
            this.select();
        }
        else {
            this.deselect();
        }
    }
    /**
     * @return {boolean}
     */
    get expanded() {
        return this._expanded;
    }
    /**
     * @param {boolean} x
     */
    set expanded(x) {
        if (x) {
            this.expand();
        }
        else {
            this.collapse();
        }
    }
    refresh() {
        if (!this.dataGrid) {
            this._element = null;
        }
        if (!this._element) {
            return;
        }
        this.createCells(this._element);
    }
    /**
     * @param {string} className
     * @return {!Element}
     */
    _createTDWithClass(className) {
        const cell = createElementWithClass('td', className);
        const cellClass = this.dataGrid._cellClass;
        if (cellClass) {
            cell.classList.add(cellClass);
        }
        return cell;
    }
    /**
     * @param {string} columnId
     * @return {!Element}
     */
    createTD(columnId) {
        const cell = this._createTDWithClass(columnId + '-column');
        cell[DataGrid._columnIdSymbol] = columnId;
        const alignment = this.dataGrid._columns[columnId].align;
        if (alignment) {
            cell.classList.add(alignment);
        }
        if (columnId === this.dataGrid.disclosureColumnId) {
            cell.classList.add('disclosure');
            if (this.leftPadding) {
                cell.style.setProperty('padding-left', this.leftPadding + 'px');
            }
        }
        return cell;
    }
    /**
     * @param {string} columnId
     * @return {!Element}
     */
    createCell(columnId) {
        const cell = this.createTD(columnId);
        const data = this.data[columnId];
        if (data instanceof Node) {
            cell.appendChild(data);
        }
        else if (data !== null) {
            this.dataGrid.setElementContent(cell, /** @type {string} */ (data));
        }
        return cell;
    }
    /**
     * @return {number}
     */
    nodeSelfHeight() {
        return 20;
    }
    /**
     * @param {!NODE_TYPE} child
     */
    appendChild(child) {
        this.insertChild(child, this.children.length);
    }
    /**
     * @param {boolean=} onlyCaches
     */
    resetNode(onlyCaches) {
        // @TODO(allada) This is a hack to make sure ViewportDataGrid can clean up these caches. Try Not To Use.
        delete this._depth;
        delete this._revealed;
        if (onlyCaches) {
            return;
        }
        if (this.previousSibling) {
            this.previousSibling.nextSibling = this.nextSibling;
        }
        if (this.nextSibling) {
            this.nextSibling.previousSibling = this.previousSibling;
        }
        this.dataGrid = null;
        this.parent = null;
        this.nextSibling = null;
        this.previousSibling = null;
        this._attached = false;
    }
    /**
     * @param {!NODE_TYPE} child
     * @param {number} index
     */
    insertChild(child, index) {
        if (!child) {
            throw 'insertChild: Node can\'t be undefined or null.';
        }
        if (child.parent === this) {
            const currentIndex = this.children.indexOf(child);
            if (currentIndex < 0) {
                console.assert(false, 'Inconsistent DataGrid state');
            }
            if (currentIndex === index) {
                return;
            }
            if (currentIndex < index) {
                --index;
            }
        }
        child.remove();
        this.children.splice(index, 0, child);
        this.setHasChildren(true);
        child.parent = this;
        child.dataGrid = this.dataGrid;
        child.recalculateSiblings(index);
        child._shouldRefreshChildren = true;
        let current = child.children[0];
        while (current) {
            current.resetNode(true);
            current.dataGrid = this.dataGrid;
            current._attached = false;
            current._shouldRefreshChildren = true;
            current = current.traverseNextNode(false, child, true);
        }
        if (this.expanded) {
            child._attach();
        }
        if (!this.revealed) {
            child.revealed = false;
        }
    }
    remove() {
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
    /**
     * @param {!NODE_TYPE} child
     */
    removeChild(child) {
        if (!child) {
            throw 'removeChild: Node can\'t be undefined or null.';
        }
        if (child.parent !== this) {
            throw 'removeChild: Node is not a child of this node.';
        }
        if (this.dataGrid) {
            this.dataGrid.updateSelectionBeforeRemoval(child, false);
        }
        child._detach();
        child.resetNode();
        this.children.remove(child, true);
        if (this.children.length <= 0) {
            this.setHasChildren(false);
        }
    }
    removeChildren() {
        if (this.dataGrid) {
            this.dataGrid.updateSelectionBeforeRemoval(this, true);
        }
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            child._detach();
            child.resetNode();
        }
        this.children = [];
        this.setHasChildren(false);
    }
    /**
     * @param {number} myIndex
     */
    recalculateSiblings(myIndex) {
        if (!this.parent) {
            return;
        }
        const previousChild = this.parent.children[myIndex - 1] || null;
        if (previousChild) {
            previousChild.nextSibling = this;
        }
        this.previousSibling = previousChild;
        const nextChild = this.parent.children[myIndex + 1] || null;
        if (nextChild) {
            nextChild.previousSibling = this;
        }
        this.nextSibling = nextChild;
    }
    collapse() {
        if (this._isRoot) {
            return;
        }
        if (this._element) {
            this._element.classList.remove('expanded');
        }
        this._expanded = false;
        if (this.selected) {
            this.dataGrid.updateGridAccessibleName(/* text */ ls `collapsed`);
        }
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i].revealed = false;
        }
    }
    collapseRecursively() {
        let item = this;
        while (item) {
            if (item.expanded) {
                item.collapse();
            }
            item = item.traverseNextNode(false, this, true);
        }
    }
    populate() {
    }
    expand() {
        if (!this._hasChildren || this.expanded) {
            return;
        }
        if (this._isRoot) {
            return;
        }
        if (this.revealed && !this._shouldRefreshChildren) {
            for (let i = 0; i < this.children.length; ++i) {
                this.children[i].revealed = true;
            }
        }
        if (this._shouldRefreshChildren) {
            for (let i = 0; i < this.children.length; ++i) {
                this.children[i]._detach();
            }
            this.populate();
            if (this._attached) {
                for (let i = 0; i < this.children.length; ++i) {
                    const child = this.children[i];
                    if (this.revealed) {
                        child.revealed = true;
                    }
                    child._attach();
                }
            }
            this._shouldRefreshChildren = false;
        }
        if (this._element) {
            this._element.classList.add('expanded');
        }
        if (this.selected) {
            this.dataGrid.updateGridAccessibleName(/* text */ ls `expanded`);
        }
        this._expanded = true;
    }
    expandRecursively() {
        let item = this;
        while (item) {
            item.expand();
            item = item.traverseNextNode(false, this);
        }
    }
    reveal() {
        if (this._isRoot) {
            return;
        }
        let currentAncestor = this.parent;
        while (currentAncestor && !currentAncestor._isRoot) {
            if (!currentAncestor.expanded) {
                currentAncestor.expand();
            }
            currentAncestor = currentAncestor.parent;
        }
        this.element().scrollIntoViewIfNeeded(false);
    }
    /**
     * @param {boolean=} supressSelectedEvent
     */
    select(supressSelectedEvent) {
        if (!this.dataGrid || !this.selectable || this.selected) {
            return;
        }
        if (this.dataGrid.selectedNode) {
            this.dataGrid.selectedNode.deselect();
        }
        this._selected = true;
        this.dataGrid.selectedNode = this;
        if (this._element) {
            this._element.classList.add('selected');
            this.dataGrid.setHasSelection(true);
            this.dataGrid.updateGridAccessibleName();
        }
        if (!supressSelectedEvent) {
            this.dataGrid.dispatchEventToListeners(Events.SelectedNode, this);
        }
    }
    revealAndSelect() {
        if (this._isRoot) {
            return;
        }
        this.reveal();
        this.select();
    }
    /**
     * @param {boolean=} supressDeselectedEvent
     */
    deselect(supressDeselectedEvent) {
        if (!this.dataGrid || this.dataGrid.selectedNode !== this || !this.selected) {
            return;
        }
        this._selected = false;
        this.dataGrid.selectedNode = null;
        if (this._element) {
            this._element.classList.remove('selected');
            this.dataGrid.setHasSelection(false);
            this.dataGrid.updateGridAccessibleName();
        }
        if (!supressDeselectedEvent) {
            this.dataGrid.dispatchEventToListeners(Events.DeselectedNode);
        }
    }
    /**
     * @param {boolean} skipHidden
     * @param {?NODE_TYPE=} stayWithin
     * @param {boolean=} dontPopulate
     * @param {!Object=} info
     * @return {?NODE_TYPE}
     */
    traverseNextNode(skipHidden, stayWithin, dontPopulate, info) {
        if (!dontPopulate && this._hasChildren) {
            this.populate();
        }
        if (info) {
            info.depthChange = 0;
        }
        let node = (!skipHidden || this.revealed) ? this.children[0] : null;
        if (node && (!skipHidden || this.expanded)) {
            if (info) {
                info.depthChange = 1;
            }
            return node;
        }
        if (this === stayWithin) {
            return null;
        }
        node = (!skipHidden || this.revealed) ? this.nextSibling : null;
        if (node) {
            return node;
        }
        node = this;
        while (node && !node._isRoot && !((!skipHidden || node.revealed) ? node.nextSibling : null) &&
            node.parent !== stayWithin) {
            if (info) {
                info.depthChange -= 1;
            }
            node = node.parent;
        }
        if (!node) {
            return null;
        }
        return (!skipHidden || node.revealed) ? node.nextSibling : null;
    }
    /**
     * @param {boolean} skipHidden
     * @param {boolean=} dontPopulate
     * @return {?NODE_TYPE}
     */
    traversePreviousNode(skipHidden, dontPopulate) {
        let node = (!skipHidden || this.revealed) ? this.previousSibling : null;
        if (!dontPopulate && node && node._hasChildren) {
            node.populate();
        }
        while (node &&
            ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null)) {
            if (!dontPopulate && node._hasChildren) {
                node.populate();
            }
            node = ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null);
        }
        if (node) {
            return node;
        }
        if (!this.parent || this.parent._isRoot) {
            return null;
        }
        return this.parent;
    }
    /**
     * @param {!Event} event
     * @return {boolean}
     */
    isEventWithinDisclosureTriangle(event) {
        if (!this._hasChildren) {
            return false;
        }
        const cell = event.target.enclosingNodeOrSelfWithNodeName('td');
        if (!cell || !cell.classList.contains('disclosure')) {
            return false;
        }
        const left = cell.totalOffsetLeft() + this.leftPadding;
        return event.pageX >= left && event.pageX <= left + this.disclosureToggleWidth;
    }
    _attach() {
        if (!this.dataGrid || this._attached) {
            return;
        }
        this._attached = true;
        const previousNode = this.traversePreviousNode(true, true);
        const previousElement = previousNode ? previousNode.element() : this.dataGrid._topFillerRow;
        this.dataGrid.dataTableBody.insertBefore(this.element(), previousElement.nextSibling);
        if (this.expanded) {
            for (let i = 0; i < this.children.length; ++i) {
                this.children[i]._attach();
            }
        }
    }
    _detach() {
        if (!this._attached) {
            return;
        }
        this._attached = false;
        if (this._element) {
            this._element.remove();
        }
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i]._detach();
        }
    }
    savePosition() {
        if (this._savedPosition) {
            return;
        }
        if (!this.parent) {
            throw 'savePosition: Node must have a parent.';
        }
        this._savedPosition = { parent: this.parent, index: this.parent.children.indexOf(this) };
    }
    restorePosition() {
        if (!this._savedPosition) {
            return;
        }
        if (this.parent !== this._savedPosition.parent) {
            this._savedPosition.parent.insertChild(this, this._savedPosition.index);
        }
        this._savedPosition = null;
    }
}
/**
 * @unrestricted
 * @extends {DataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
class CreationDataGridNode extends DataGridNode {
    constructor(data, hasChildren) {
        super(data, hasChildren);
        /** @type {boolean} */
        this.isCreationNode = true;
    }
    makeNormal() {
        this.isCreationNode = false;
    }
}
/**
 * @unrestricted
 * @extends {DataGridImpl<!NODE_TYPE>}
 * @template NODE_TYPE
 */
class ViewportDataGrid extends DataGridImpl {
    /**
     * @param {!DataGrid.Parameters} dataGridParameters
     */
    constructor(dataGridParameters) {
        super(dataGridParameters);
        this._onScrollBound = this._onScroll.bind(this);
        this.scrollContainer.addEventListener('scroll', this._onScrollBound, true);
        /** @type {!Array.<!ViewportDataGridNode>} */
        this._visibleNodes = [];
        /**
         * @type {boolean}
         */
        this._inline = false;
        this._stickToBottom = false;
        this._updateIsFromUser = false;
        this._lastScrollTop = 0;
        this._firstVisibleIsStriped = false;
        this._isStriped = false;
        this.setRootNode(new ViewportDataGridNode());
    }
    /**
     * @param {boolean} striped
     * @override
     */
    setStriped(striped) {
        this._isStriped = striped;
        let startsWithOdd = true;
        if (this._visibleNodes.length) {
            const allChildren = this.rootNode().flatChildren();
            startsWithOdd = !!(allChildren.indexOf(this._visibleNodes[0]));
        }
        this._updateStripesClass(startsWithOdd);
    }
    /**
     * @param {boolean} startsWithOdd
     */
    _updateStripesClass(startsWithOdd) {
        this.element.classList.toggle('striped-data-grid', !startsWithOdd && this._isStriped);
        this.element.classList.toggle('striped-data-grid-starts-with-odd', startsWithOdd && this._isStriped);
    }
    /**
     * @param {!Element} scrollContainer
     */
    setScrollContainer(scrollContainer) {
        this.scrollContainer.removeEventListener('scroll', this._onScrollBound, true);
        /**
         * @suppress {accessControls}
         */
        this._scrollContainer = scrollContainer;
        this.scrollContainer.addEventListener('scroll', this._onScrollBound, true);
    }
    /**
     * @override
     */
    onResize() {
        if (this._stickToBottom) {
            this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
        }
        this.scheduleUpdate();
        super.onResize();
    }
    /**
     * @param {boolean} stick
     */
    setStickToBottom(stick) {
        this._stickToBottom = stick;
    }
    /**
     * @param {?Event} event
     */
    _onScroll(event) {
        this._stickToBottom = this.scrollContainer.isScrolledToBottom();
        if (this._lastScrollTop !== this.scrollContainer.scrollTop) {
            this.scheduleUpdate(true);
        }
    }
    /**
     * @protected
     */
    scheduleUpdateStructure() {
        this.scheduleUpdate();
    }
    /**
     * @param {boolean=} isFromUser
     */
    scheduleUpdate(isFromUser) {
        if (this._stickToBottom && isFromUser) {
            this._stickToBottom = this.scrollContainer.isScrolledToBottom();
        }
        this._updateIsFromUser = this._updateIsFromUser || isFromUser;
        if (this._updateAnimationFrameId) {
            return;
        }
        this._updateAnimationFrameId = this.element.window().requestAnimationFrame(this._update.bind(this));
    }
    // TODO(allada) This should be fixed to never be needed. It is needed right now for network because removing
    // elements happens followed by a scheduleRefresh() which causes white space to be visible, but the waterfall
    // updates instantly.
    updateInstantly() {
        this._update();
    }
    /**
     * @override
     */
    renderInline() {
        this._inline = true;
        super.renderInline();
        this._update();
    }
    /**
     * @param {number} clientHeight
     * @param {number} scrollTop
     * @return {{topPadding: number, bottomPadding: number, contentHeight: number, visibleNodes: !Array.<!ViewportDataGridNode>, offset: number}}
     */
    _calculateVisibleNodes(clientHeight, scrollTop) {
        const nodes = this.rootNode().flatChildren();
        if (this._inline) {
            return { topPadding: 0, bottomPadding: 0, contentHeight: 0, visibleNodes: nodes, offset: 0 };
        }
        const size = nodes.length;
        let i = 0;
        let y = 0;
        for (; i < size && y + nodes[i].nodeSelfHeight() < scrollTop; ++i) {
            y += nodes[i].nodeSelfHeight();
        }
        const start = i;
        const topPadding = y;
        for (; i < size && y < scrollTop + clientHeight; ++i) {
            y += nodes[i].nodeSelfHeight();
        }
        const end = i;
        let bottomPadding = 0;
        for (; i < size; ++i) {
            bottomPadding += nodes[i].nodeSelfHeight();
        }
        return {
            topPadding: topPadding,
            bottomPadding: bottomPadding,
            contentHeight: y - topPadding,
            visibleNodes: nodes.slice(start, end),
            offset: start
        };
    }
    /**
     * @return {number}
     */
    _contentHeight() {
        const nodes = this.rootNode().flatChildren();
        let result = 0;
        for (let i = 0, size = nodes.length; i < size; ++i) {
            result += nodes[i].nodeSelfHeight();
        }
        return result;
    }
    _update() {
        if (this._updateAnimationFrameId) {
            this.element.window().cancelAnimationFrame(this._updateAnimationFrameId);
            delete this._updateAnimationFrameId;
        }
        const clientHeight = this.scrollContainer.clientHeight;
        let scrollTop = this.scrollContainer.scrollTop;
        const currentScrollTop = scrollTop;
        const maxScrollTop = Math.max(0, this._contentHeight() - clientHeight);
        if (!this._updateIsFromUser && this._stickToBottom) {
            scrollTop = maxScrollTop;
        }
        this._updateIsFromUser = false;
        const viewportState = this._calculateVisibleNodes(clientHeight, scrollTop);
        const visibleNodes = viewportState.visibleNodes;
        const visibleNodesSet = new Set(visibleNodes);
        for (let i = 0; i < this._visibleNodes.length; ++i) {
            const oldNode = this._visibleNodes[i];
            if (!visibleNodesSet.has(oldNode) && oldNode.attached()) {
                const element = oldNode.existingElement();
                element.remove();
            }
        }
        let previousElement = this.topFillerRowElement();
        const tBody = this.dataTableBody;
        let offset = viewportState.offset;
        if (visibleNodes.length) {
            const nodes = this.rootNode().flatChildren();
            const index = nodes.indexOf(visibleNodes[0]);
            this._updateStripesClass(!!(index % 2));
            if (this._stickToBottom && index !== -1 && !!(index % 2) !== this._firstVisibleIsStriped) {
                offset += 1;
            }
        }
        this._firstVisibleIsStriped = !!(offset % 2);
        for (let i = 0; i < visibleNodes.length; ++i) {
            const node = visibleNodes[i];
            const element = node.element();
            node.setStriped((offset + i) % 2 === 0);
            if (element !== previousElement.nextSibling) {
                tBody.insertBefore(element, previousElement.nextSibling);
            }
            node.revealed = true;
            previousElement = element;
        }
        this.setVerticalPadding(viewportState.topPadding, viewportState.bottomPadding);
        this._lastScrollTop = scrollTop;
        if (scrollTop !== currentScrollTop) {
            this.scrollContainer.scrollTop = scrollTop;
        }
        const contentFits = viewportState.contentHeight <= clientHeight && viewportState.topPadding + viewportState.bottomPadding === 0;
        if (contentFits !== this.element.classList.contains('data-grid-fits-viewport')) {
            this.element.classList.toggle('data-grid-fits-viewport', contentFits);
            this.updateWidths();
        }
        this._visibleNodes = visibleNodes;
        this.dispatchEventToListeners(Events.ViewportCalculated);
    }
    /**
     * @param {!ViewportDataGridNode} node
     */
    _revealViewportNode(node) {
        const nodes = this.rootNode().flatChildren();
        const index = nodes.indexOf(node);
        if (index === -1) {
            return;
        }
        let fromY = 0;
        for (let i = 0; i < index; ++i) {
            fromY += nodes[i].nodeSelfHeight();
        }
        const toY = fromY + node.nodeSelfHeight();
        let scrollTop = this.scrollContainer.scrollTop;
        if (scrollTop > fromY) {
            scrollTop = fromY;
            this._stickToBottom = false;
        }
        else if (scrollTop + this.scrollContainer.offsetHeight < toY) {
            scrollTop = toY - this.scrollContainer.offsetHeight;
        }
        this.scrollContainer.scrollTop = scrollTop;
    }
}
/**
 * @override @suppress {checkPrototypalTypes} @enum {symbol}
 */
/* export const Events = {
  ViewportCalculated: Symbol('ViewportCalculated')
}; */
/**
 * @unrestricted
 * @extends {DataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
class ViewportDataGridNode extends DataGridNode {
    /**
     * @param {?Object.<string, *>=} data
     * @param {boolean=} hasChildren
     */
    constructor(data, hasChildren) {
        super(data, hasChildren);
        /** @type {boolean} */
        this._stale = false;
        /** @type {?Array<!ViewportDataGridNode>} */
        this._flatNodes = null;
        this._isStriped = false;
    }
    /**
     * @override
     * @return {!Element}
     */
    element() {
        const existingElement = this.existingElement();
        const element = existingElement || this.createElement();
        if (!existingElement || this._stale) {
            this.createCells(element);
            this._stale = false;
        }
        return element;
    }
    /**
     * @param {boolean} isStriped
     */
    setStriped(isStriped) {
        this._isStriped = isStriped;
        this.element().classList.toggle('odd', isStriped);
    }
    /**
     * @return {boolean}
     */
    isStriped() {
        return this._isStriped;
    }
    /**
     * @protected
     */
    clearFlatNodes() {
        this._flatNodes = null;
        const parent = /** @type {!ViewportDataGridNode} */ (this.parent);
        if (parent) {
            parent.clearFlatNodes();
        }
    }
    /**
     * @return {!Array<!ViewportDataGridNode>}
     */
    flatChildren() {
        if (this._flatNodes) {
            return this._flatNodes;
        }
        /** @type {!Array<!ViewportDataGridNode>} */
        const flatNodes = [];
        /** @type {!Array<!Array<!ViewportDataGridNode>>} */
        const children = [this.children];
        /** @type {!Array<number>} */
        const counters = [0];
        let depth = 0;
        while (depth >= 0) {
            if (children[depth].length <= counters[depth]) {
                depth--;
                continue;
            }
            const node = children[depth][counters[depth]++];
            flatNodes.push(node);
            if (node.expanded && node.children.length) {
                depth++;
                children[depth] = node.children;
                counters[depth] = 0;
            }
        }
        this._flatNodes = flatNodes;
        return flatNodes;
    }
    /**
     * @override
     * @param {!NODE_TYPE} child
     * @param {number} index
     */
    insertChild(child, index) {
        this.clearFlatNodes();
        if (child.parent === this) {
            const currentIndex = this.children.indexOf(child);
            if (currentIndex < 0) {
                console.assert(false, 'Inconsistent DataGrid state');
            }
            if (currentIndex === index) {
                return;
            }
            if (currentIndex < index) {
                --index;
            }
        }
        child.remove();
        child.parent = this;
        child.dataGrid = this.dataGrid;
        if (!this.children.length) {
            this.setHasChildren(true);
        }
        this.children.splice(index, 0, child);
        child.recalculateSiblings(index);
        if (this.expanded) {
            this.dataGrid.scheduleUpdateStructure();
        }
    }
    /**
     * @override
     * @param {!NODE_TYPE} child
     */
    removeChild(child) {
        this.clearFlatNodes();
        if (this.dataGrid) {
            this.dataGrid.updateSelectionBeforeRemoval(child, false);
        }
        if (child.previousSibling) {
            child.previousSibling.nextSibling = child.nextSibling;
        }
        if (child.nextSibling) {
            child.nextSibling.previousSibling = child.previousSibling;
        }
        if (child.parent !== this) {
            throw 'removeChild: Node is not a child of this node.';
        }
        this.children.remove(child, true);
        child._unlink();
        if (!this.children.length) {
            this.setHasChildren(false);
        }
        if (this.expanded) {
            this.dataGrid.scheduleUpdateStructure();
        }
    }
    /**
     * @override
     */
    removeChildren() {
        this.clearFlatNodes();
        if (this.dataGrid) {
            this.dataGrid.updateSelectionBeforeRemoval(this, true);
        }
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i]._unlink();
        }
        this.children = [];
        if (this.expanded) {
            this.dataGrid.scheduleUpdateStructure();
        }
    }
    _unlink() {
        if (this.attached()) {
            this.existingElement().remove();
        }
        this.resetNode();
    }
    /**
     * @override
     */
    collapse() {
        if (!this.expanded) {
            return;
        }
        this.clearFlatNodes();
        /**
         * @suppress {accessControls}
         */
        this._expanded = false;
        if (this.existingElement()) {
            this.existingElement().classList.remove('expanded');
        }
        if (this.selected) {
            // this.dataGrid.updateGridAccessibleName(/* text */ ls`collapsed`);
        }
        this.dataGrid.scheduleUpdateStructure();
    }
    /**
     * @override
     */
    expand() {
        if (this.expanded) {
            return;
        }
        this.dataGrid._stickToBottom = false;
        this.clearFlatNodes();
        super.expand();
        this.dataGrid.scheduleUpdateStructure();
    }
    /**
     * @protected
     * @return {boolean}
     */
    attached() {
        return !!(this.dataGrid && this.existingElement() && this.existingElement().parentElement);
    }
    /**
     * @override
     */
    refresh() {
        if (this.attached()) {
            this._stale = true;
            this.dataGrid.scheduleUpdate();
        }
        else {
            this.resetElement();
        }
    }
    /**
     * @override
     */
    reveal() {
        this.dataGrid._revealViewportNode(this);
    }
    /**
     * @override
     * @param {number} index
     */
    recalculateSiblings(index) {
        this.clearFlatNodes();
        super.recalculateSiblings(index);
    }
}
/**
 * @unrestricted
 * @extends {ViewportDataGrid<!NODE_TYPE>}
 * @template NODE_TYPE
 */
class SortableDataGrid extends ViewportDataGrid {
    /**
     * @param {!DataGrid.Parameters} dataGridParameters
     */
    constructor(dataGridParameters) {
        super(dataGridParameters);
        /** @type {function(!NODE_TYPE, !NODE_TYPE):number} */
        this._sortingFunction = SortableDataGrid.TrivialComparator;
        this.setRootNode(/** @type {!SortableDataGridNode<!NODE_TYPE>} */ (new SortableDataGridNode()));
    }
    /**
     * @param {!SortableDataGridNode} a
     * @param {!DataGrid.SortableDataGridNode} b
     * @return {number}
     */
    static TrivialComparator(a, b) {
        return 0;
    }
    /**
     * @param {string} columnId
     * @param {!SortableDataGridNode} a
     * @param {!DataGrid.SortableDataGridNode} b
     * @return {number}
     */
    static NumericComparator(columnId, a, b) {
        const aValue = a.data[columnId];
        const bValue = b.data[columnId];
        const aNumber = Number(aValue instanceof Node ? aValue.textContent : aValue);
        const bNumber = Number(bValue instanceof Node ? bValue.textContent : bValue);
        return aNumber < bNumber ? -1 : (aNumber > bNumber ? 1 : 0);
    }
    /**
     * @param {string} columnId
     * @param {!SortableDataGridNode} a
     * @param {!DataGrid.SortableDataGridNode} b
     * @return {number}
     */
    static StringComparator(columnId, a, b) {
        const aValue = a.data[columnId];
        const bValue = b.data[columnId];
        const aString = aValue instanceof Node ? aValue.textContent : String(aValue);
        const bString = bValue instanceof Node ? bValue.textContent : String(bValue);
        return aString < bString ? -1 : (aString > bString ? 1 : 0);
    }
    /**
     * @param {function(!NODE_TYPE, !NODE_TYPE):number} comparator
     * @param {boolean} reverseMode
     * @param {!NODE_TYPE} a
     * @param {!NODE_TYPE} b
     * @return {number}
     * @template NODE_TYPE
     */
    static Comparator(comparator, reverseMode, a, b) {
        return reverseMode ? comparator(b, a) : comparator(a, b);
    }
    /**
     * @param {!Array.<string>} columnNames
     * @param {!Array.<string>} values
     * @param {string} displayName
     * @return {?SortableDataGrid<!SortableDataGridNode>}
     */
    static create(columnNames, values, displayName) {
        const numColumns = columnNames.length;
        if (!numColumns) {
            return null;
        }
        const columns = /** @type {!Array<!DataGrid.ColumnDescriptor>} */ ([]);
        for (let i = 0; i < columnNames.length; ++i) {
            columns.push({ id: String(i), title: columnNames[i], width: columnNames[i].length, sortable: true });
        }
        const nodes = [];
        for (let i = 0; i < values.length / numColumns; ++i) {
            const data = {};
            for (let j = 0; j < columnNames.length; ++j) {
                data[j] = values[numColumns * i + j];
            }
            const node = new SortableDataGridNode(data);
            node.selectable = false;
            nodes.push(node);
        }
        const dataGrid = new SortableDataGrid({ displayName, columns });
        const length = nodes.length;
        const rootNode = dataGrid.rootNode();
        for (let i = 0; i < length; ++i) {
            rootNode.appendChild(nodes[i]);
        }
        dataGrid.addEventListener(Events.SortingChanged, sortDataGrid);
        function sortDataGrid() {
            const nodes = dataGrid.rootNode().children;
            const sortColumnId = dataGrid.sortColumnId();
            if (!sortColumnId) {
                return;
            }
            let columnIsNumeric = true;
            for (let i = 0; i < nodes.length; i++) {
                const value = nodes[i].data[sortColumnId];
                if (isNaN(value instanceof Node ? value.textContent : value)) {
                    columnIsNumeric = false;
                    break;
                }
            }
            const comparator = columnIsNumeric ? SortableDataGrid.NumericComparator : SortableDataGrid.StringComparator;
            dataGrid.sortNodes(comparator.bind(null, sortColumnId), !dataGrid.isSortOrderAscending());
        }
        return dataGrid;
    }
    /**
     * @param {!NODE_TYPE} node
     */
    insertChild(node) {
        const root = /** @type {!SortableDataGridNode<!NODE_TYPE>} */ (this.rootNode());
        root.insertChildOrdered(node);
    }
    /**
     * @param {function(!NODE_TYPE, !NODE_TYPE):number} comparator
     * @param {boolean} reverseMode
     */
    sortNodes(comparator, reverseMode) {
        this._sortingFunction = SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
        this.rootNode().recalculateSiblings(0);
        this.rootNode()._sortChildren(reverseMode);
        this.scheduleUpdateStructure();
    }
}
/**
 * @unrestricted
 * @extends {ViewportDataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
class SortableDataGridNode extends ViewportDataGridNode {
    /**
     * @param {?Object.<string, *>=} data
     * @param {boolean=} hasChildren
     */
    constructor(data, hasChildren) {
        super(data, hasChildren);
    }
    /**
     * @param {!NODE_TYPE} node
     */
    insertChildOrdered(node) {
        this.insertChild(node, this.children.upperBound(node, this.dataGrid._sortingFunction));
    }
    _sortChildren() {
        this.children.sort(this.dataGrid._sortingFunction);
        for (let i = 0; i < this.children.length; ++i) {
            this.children[i].recalculateSiblings(i);
        }
        for (const child of this.children) {
            child._sortChildren();
        }
    }
}
exports.Events = Events;
exports.SortableDataGrid = SortableDataGrid;
exports.SortableDataGridNode = SortableDataGridNode;

},{"./DOMExtension.js":15,"./UIUtils.js":17}],17:[function(require,module,exports){
/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// jshint ignore: start
require('./DOMExtension.js');
function _inspectPlatform() {
    let match = navigator.userAgent.match(/Windows NT/);
    if (match) {
        return 'windows';
    }
    match = navigator.userAgent.match(/Mac OS X/);
    if (match) {
        return 'mac';
    }
    return 'linux';
}
let _platform;
/**
 * @return {string}
 */
function platform() {
    if (!_platform) {
        _platform = _inspectPlatform();
    }
    return _platform;
}
let _isMac;
/**
 * @return {boolean}
 */
function isMac() {
    if (typeof _isMac === 'undefined') {
        _isMac = platform() === 'mac';
    }
    return _isMac;
}
let _isWin;
/**
 * @return {boolean}
 */
function isWin() {
    if (typeof _isWin === 'undefined') {
        _isWin = platform() === 'windows';
    }
    return _isWin;
}
/**
 * @param {!Element} element
 * @param {?function(!MouseEvent): boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {?string} cursor
 * @param {?string=} hoverCursor
 * @param {number=} startDelay
 */
function installDragHandle(element, elementDragStart, elementDrag, elementDragEnd, cursor, hoverCursor, startDelay) {
    /**
     * @param {!Event} event
     */
    function onMouseDown(event) {
        const dragHandler = new DragHandler();
        const dragStart = dragHandler.elementDragStart.bind(dragHandler, element, elementDragStart, elementDrag, elementDragEnd, cursor, event);
        if (startDelay) {
            startTimer = setTimeout(dragStart, startDelay);
        }
        else {
            dragStart();
        }
    }
    function onMouseUp() {
        if (startTimer) {
            clearTimeout(startTimer);
        }
        startTimer = null;
    }
    let startTimer;
    element.addEventListener('mousedown', onMouseDown, false);
    if (startDelay) {
        element.addEventListener('mouseup', onMouseUp, false);
    }
    if (hoverCursor !== null) {
        element.style.cursor = hoverCursor || cursor || '';
    }
}
/**
 * @param {!Element} targetElement
 * @param {?function(!MouseEvent):boolean} elementDragStart
 * @param {function(!MouseEvent)} elementDrag
 * @param {?function(!MouseEvent)} elementDragEnd
 * @param {?string} cursor
 * @param {!Event} event
 */
function elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
    const dragHandler = new DragHandler();
    dragHandler.elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event);
}
/**
 * @unrestricted
 */
class DragHandler {
    constructor() {
        this._elementDragMove = this._elementDragMove.bind(this);
        this._elementDragEnd = this._elementDragEnd.bind(this);
        this._mouseOutWhileDragging = this._mouseOutWhileDragging.bind(this);
    }
    /**
     * @param {!Element} targetElement
     * @param {?function(!MouseEvent):boolean} elementDragStart
     * @param {function(!MouseEvent)} elementDrag
     * @param {?function(!MouseEvent)} elementDragEnd
     * @param {?string} cursor
     * @param {!Event} event
     */
    elementDragStart(targetElement, elementDragStart, elementDrag, elementDragEnd, cursor, event) {
        // Only drag upon left button. Right will likely cause a context menu. So will ctrl-click on mac.
        if (event.button || (isMac() && event.ctrlKey)) {
            return;
        }
        if (this._elementDraggingEventListener) {
            return;
        }
        if (elementDragStart && !elementDragStart(/** @type {!MouseEvent} */ (event))) {
            return;
        }
        const targetDocument = event.target.ownerDocument;
        this._elementDraggingEventListener = elementDrag;
        this._elementEndDraggingEventListener = elementDragEnd;
        console.assert((DragHandler._documentForMouseOut || targetDocument) === targetDocument, 'Dragging on multiple documents.');
        DragHandler._documentForMouseOut = targetDocument;
        this._dragEventsTargetDocument = targetDocument;
        try {
            this._dragEventsTargetDocumentTop = targetDocument.defaultView.top.document;
        }
        catch (e) {
            this._dragEventsTargetDocumentTop = this._dragEventsTargetDocument;
        }
        targetDocument.addEventListener('mousemove', this._elementDragMove, true);
        targetDocument.addEventListener('mouseup', this._elementDragEnd, true);
        targetDocument.addEventListener('mouseout', this._mouseOutWhileDragging, true);
        if (targetDocument !== this._dragEventsTargetDocumentTop) {
            this._dragEventsTargetDocumentTop.addEventListener('mouseup', this._elementDragEnd, true);
        }
        if (typeof cursor === 'string') {
            this._restoreCursorAfterDrag = restoreCursor.bind(this, targetElement.style.cursor);
            targetElement.style.cursor = cursor;
            targetDocument.body.style.cursor = cursor;
        }
        /**
         * @param {string} oldCursor
         * @this {DragHandler}
         */
        function restoreCursor(oldCursor) {
            targetDocument.body.style.removeProperty('cursor');
            targetElement.style.cursor = oldCursor;
            this._restoreCursorAfterDrag = null;
        }
        event.preventDefault();
    }
    _mouseOutWhileDragging() {
        this._unregisterMouseOutWhileDragging();
    }
    _unregisterMouseOutWhileDragging() {
        if (!DragHandler._documentForMouseOut) {
            return;
        }
        DragHandler._documentForMouseOut.removeEventListener('mouseout', this._mouseOutWhileDragging, true);
    }
    _unregisterDragEvents() {
        if (!this._dragEventsTargetDocument) {
            return;
        }
        this._dragEventsTargetDocument.removeEventListener('mousemove', this._elementDragMove, true);
        this._dragEventsTargetDocument.removeEventListener('mouseup', this._elementDragEnd, true);
        if (this._dragEventsTargetDocument !== this._dragEventsTargetDocumentTop) {
            this._dragEventsTargetDocumentTop.removeEventListener('mouseup', this._elementDragEnd, true);
        }
        delete this._dragEventsTargetDocument;
        delete this._dragEventsTargetDocumentTop;
    }
    /**
     * @param {!Event} event
     */
    _elementDragMove(event) {
        if (event.buttons !== 1) {
            this._elementDragEnd(event);
            return;
        }
        if (this._elementDraggingEventListener(/** @type {!MouseEvent} */ (event))) {
            this._cancelDragEvents(event);
        }
    }
    /**
     * @param {!Event} event
     */
    _cancelDragEvents(event) {
        this._unregisterDragEvents();
        this._unregisterMouseOutWhileDragging();
        if (this._restoreCursorAfterDrag) {
            this._restoreCursorAfterDrag();
        }
        delete this._elementDraggingEventListener;
        delete this._elementEndDraggingEventListener;
    }
    /**
     * @param {!Event} event
     */
    _elementDragEnd(event) {
        const elementDragEnd = this._elementEndDraggingEventListener;
        this._cancelDragEvents(/** @type {!MouseEvent} */ (event));
        event.preventDefault();
        if (elementDragEnd) {
            elementDragEnd(/** @type {!MouseEvent} */ (event));
        }
    }
}
function registerCustomElement(localName, typeExtension, definition) {
    self.customElements.define(typeExtension, class extends definition {
        constructor() {
            super();
            // TODO(einbinder) convert to classes and custom element tags
            this.setAttribute('is', typeExtension);
        }
    }, { extends: localName });
    return () => createElement(localName, typeExtension);
}
class Icon extends HTMLSpanElement {
    constructor() {
        super();
        /** @type {?Icon.Descriptor} */
        this._descriptor = null;
        /** @type {?Icon.SpriteSheet} */
        this._spriteSheet = null;
        /** @type {string} */
        this._iconType = '';
    }
    /**
     * @param {string=} iconType
     * @param {string=} className
     * @return {!Icon}
     */
    static create(iconType, className) {
        if (!Icon._constructor) {
            Icon._constructor = registerCustomElement('span', 'ui-icon', Icon);
        }
        const icon = /** @type {!Icon} */ (Icon._constructor());
        if (className) {
            icon.className = className;
        }
        if (iconType) {
            icon.setIconType(iconType);
        }
        return icon;
    }
    /**
     * @param {string} iconType
     */
    setIconType(iconType) {
        if (this._descriptor) {
            this.style.removeProperty('--spritesheet-position');
            this.style.removeProperty('width');
            this.style.removeProperty('height');
            this._toggleClasses(false);
            this._iconType = '';
            this._descriptor = null;
            this._spriteSheet = null;
        }
        const descriptor = Descriptors[iconType] || null;
        if (descriptor) {
            this._iconType = iconType;
            this._descriptor = descriptor;
            this._spriteSheet = SpriteSheets[this._descriptor.spritesheet];
            console.assert(this._spriteSheet, `ERROR: icon ${this._iconType} has unknown spritesheet: ${this._descriptor.spritesheet}`);
            this.style.setProperty('--spritesheet-position', this._propertyValue());
            this.style.setProperty('width', this._spriteSheet.cellWidth + 'px');
            this.style.setProperty('height', this._spriteSheet.cellHeight + 'px');
            this._toggleClasses(true);
        }
        else if (iconType) {
            throw new Error(`ERROR: failed to find icon descriptor for type: ${iconType}`);
        }
    }
    /**
     * @param {boolean} value
     */
    _toggleClasses(value) {
        this.classList.toggle('spritesheet-' + this._descriptor.spritesheet, value);
        this.classList.toggle(this._iconType, value);
        this.classList.toggle('icon-mask', value && !!this._descriptor.isMask);
        this.classList.toggle('icon-invert', value && !!this._descriptor.invert);
    }
    /**
     * @return {string}
     */
    _propertyValue() {
        if (!this._descriptor.coordinates) {
            if (!this._descriptor.position || !_positionRegex.test(this._descriptor.position)) {
                throw new Error(`ERROR: icon '${this._iconType}' has malformed position: '${this._descriptor.position}'`);
            }
            const column = this._descriptor.position[0].toLowerCase().charCodeAt(0) - 97;
            const row = parseInt(this._descriptor.position.substring(1), 10) - 1;
            this._descriptor.coordinates = {
                x: -(this._spriteSheet.cellWidth + this._spriteSheet.padding) * column,
                y: (this._spriteSheet.cellHeight + this._spriteSheet.padding) * (row + 1) - this._spriteSheet.padding
            };
        }
        return `${this._descriptor.coordinates.x}px ${this._descriptor.coordinates.y}px`;
    }
}
const _positionRegex = /^[a-z][1-9][0-9]*$/;
/** @enum {!Icon.SpriteSheet} */
const SpriteSheets = {
    'smallicons': { cellWidth: 10, cellHeight: 10, padding: 10 },
    'mediumicons': { cellWidth: 16, cellHeight: 16, padding: 0 },
    'largeicons': { cellWidth: 28, cellHeight: 24, padding: 0 },
    'arrowicons': { cellWidth: 19, cellHeight: 19, padding: 0 }
};
/** @enum {!Icon.Descriptor} */
const Descriptors = {
    'smallicon-triangle-down': { position: 'e2', spritesheet: 'smallicons', isMask: true },
    'smallicon-triangle-right': { position: 'a1', spritesheet: 'smallicons', isMask: true },
    'smallicon-triangle-up': { position: 'b1', spritesheet: 'smallicons', isMask: true },
    'smallicon-cross': { position: 'b4', spritesheet: 'smallicons' },
    'mediumicon-red-cross-active': { position: 'd2', spritesheet: 'mediumicons' },
    'mediumicon-red-cross-hover': { position: 'a1', spritesheet: 'mediumicons' },
    'largeicon-clear': { position: 'a6', spritesheet: 'largeicons', isMask: true },
    'largeicon-refresh': { position: 'd2', spritesheet: 'largeicons', isMask: true }
};
registerCustomElement('div', 'dt-close-button', class extends HTMLDivElement {
    constructor() {
        super();
        // const root = createShadowRootWithCoreStyles(this, 'ui/closeButton.css');
        // this._buttonElement = root.createChild('div', 'close-button');
        this._buttonElement = this.createChild('div', 'close-button');
        // UI.ARIAUtils.setAccessibleName(this._buttonElement, ls`Close`);
        // UI.ARIAUtils.markAsButton(this._buttonElement);
        const regularIcon = Icon.create('smallicon-cross', 'default-icon');
        this._hoverIcon = Icon.create('mediumicon-red-cross-hover', 'hover-icon');
        this._activeIcon = Icon.create('mediumicon-red-cross-active', 'active-icon');
        this._buttonElement.appendChild(regularIcon);
        this._buttonElement.appendChild(this._hoverIcon);
        this._buttonElement.appendChild(this._activeIcon);
    }
    /**
     * @param {boolean} gray
     * @this {Element}
     */
    set gray(gray) {
        if (gray) {
            this._hoverIcon.setIconType('mediumicon-gray-cross-hover');
            this._activeIcon.setIconType('mediumicon-gray-cross-active');
        }
        else {
            this._hoverIcon.setIconType('mediumicon-red-cross-hover');
            this._activeIcon.setIconType('mediumicon-red-cross-active');
        }
    }
    /**
     * @param {string} name
     * @this {Element}
     */
    setAccessibleName(name) {
        UI.ARIAUtils.setAccessibleName(this._buttonElement, name);
    }
    /**
     * @param {boolean} tabbable
     * @this {Element}
     */
    setTabbable(tabbable) {
        if (tabbable) {
            this._buttonElement.tabIndex = 0;
        }
        else {
            this._buttonElement.tabIndex = -1;
        }
    }
});
exports.installDragHandle = installDragHandle;
exports.registerCustomElement = registerCustomElement;
exports.Icon = Icon;

},{"./DOMExtension.js":15}],18:[function(require,module,exports){
'use strict';
/**
 * Generates attributes in HTML.
 * @param {Object} attributes
 * @returns {string}
 * @private
 */
function _generateTagAttributes(attributes) {
    var html = '';
    if (attributes) {
        for (var key in attributes) {
            html += ' ' + key + '="' + attributes[key] + '"';
        }
    }
    return html;
}
/**
 * @param {Object} attributes
 * @returns {string}
 * @private
 */
function _openUL(attributes) {
    var html = '';
    var attributesHTML = _generateTagAttributes(attributes);
    html = '<ul' + attributesHTML + '>';
    return html;
}
/**
 * Create "ul" closing tag.
 * @returns {string}
 * @private
 */
function _closeUL() {
    return '</ul>';
}
/**
 * Create "li" opening tag.
 * @returns {string}
 * @private
 */
function _openLI() {
    return '<li>';
}
/**
 * Create "li" closing tag.
 * @returns {string}
 * @private
 */
function _closeLI() {
    return '</li>';
}
/**
 * Create "invalidate" and "focus" buttons.
 * @returns {string}
 * @private
 */
function _addToolsButtons(options, type) {
    return '<button class="tools-button" id="control-' + type.toLowerCase() + '" data-control-id="' + options.controlId + '">' + type + '</button>';
}
/**
 * Create text line with text, requiring attention.
 * @returns {string}
 * @private
 */
function _addDisclaimer(text) {
    return '<div class="disclaimer">' + text + '</div>';
}
/**
 * @param {Object|Array} element
 * @returns {number}
 * @private
 */
function _getObjectLength(element) {
    if (element && typeof element === 'object') {
        return Object.keys(element).length;
    }
    return 0;
}
/**
 * @param {boolean} isExpanded - configures the direction of the arrow
 * @returns {string}
 * @private
 */
function _addArrow(isExpanded) {
    var direction = isExpanded ? 'down' : 'right';
    return '<arrow ' + direction + '="true"></arrow>';
}
/**
 * Adding 'select' HTML Element options with data for the property variations.
 * @param {string} value
 * @param {Object} type
 * @returns {string}
 * @private
 */
function _generateValueOptions(value, type) {
    var html = '';
    var types;
    var i;
    if (Object.keys(type).length) {
        types = Object.keys(type);
        for (i = 0; i < types.length; i++) {
            html += '<option value="' + type[types[i]] + '"' + (type[types[i]] === value ? ' selected' : '') + '>' +
                types[i] + '</option>';
        }
    }
    return html;
}
/**
 * @param {string} tag - name of HTML tag
 * @param {string|number|boolean} value
 * @param {Object} attributes
 * @returns {string}
 * @private
 */
function _wrapInTag(tag, value, attributes) {
    var html = '';
    if (!tag || typeof tag !== 'string') {
        return html;
    }
    html += '<' + tag;
    html += _generateTagAttributes(attributes);
    html += '>' + value + '</' + tag + '>';
    return html;
}
/**
 * @param {string|number|boolean} value
 * @param {Object} attributes
 * @param {Object} type - predefined type
 * @returns {string}
 * @private
 */
function _wrapInSelectTag(value, attributes, type) {
    var html = '';
    html += '<select';
    html += _generateTagAttributes(attributes);
    html += '>' + (type ? _generateValueOptions(value, type) : value) + '</select>';
    return html;
}
/**
 * @param {boolean} value
 * @param {Object} attributes
 * @returns {string}
 * @private
 */
function _wrapInCheckBox(value, attributes) {
    var html = '';
    attributes.id = attributes['data-property-name'];
    html = '<input verical-aligment type="checkbox"';
    html += _generateTagAttributes(attributes);
    html += value ? ' checked />' : ' />';
    html += '<label verical-aligment for="';
    html += attributes.id;
    html += '" gray>';
    html += value;
    html += '</label>';
    return html;
}
/**
 * Check if property value needs quotes.
 * @param {string|boolean|number|null} value
 * @param {string} valueWrappedInHTML
 * @returns {string|boolean|number|null}
 * @private
 */
function _valueNeedsQuotes(value, valueWrappedInHTML) {
    if (typeof value === 'string') {
        return '&quot;' + valueWrappedInHTML + '&quot;';
    }
    return valueWrappedInHTML;
}
/**
 * Creates span for default value.
 * @returns {string}
 * @private
 */
function _createDefaultSpan() {
    return '<span gray>(default value)</span>';
}
/**
 * @param {Array|Object} element
 * @returns {string}
 * @private
 */
function _addKeyTypeInfoBegin(element) {
    if (Array.isArray(element)) {
        return '[';
    }
    return '{';
}
/**
 * @param {Array|Object} element
 * @returns {string}
 * @private
 */
function _addKeyTypeInfoEnd(element) {
    var html = '';
    var noOfElements = _getObjectLength(element);
    var collapsedInfo = Array.isArray(element) ? noOfElements : '...';
    if (noOfElements) {
        html += _wrapInTag('collapsed-typeinfo', collapsedInfo);
    }
    if (Array.isArray(element)) {
        html += ']';
    }
    else {
        html += '}';
    }
    return html;
}
/**
 * Search for the nearest parent Node within the bounds of the DATA-VIEW parent.
 * @param {element} element - HTML DOM element that will be the root of the search
 * @param {string} targetElementName - The desired HTML parent element nodeName
 * @returns {Object} HTML DOM element
 * @private
 */
function _findNearestDOMElement(element, targetElementName) {
    while (element.nodeName !== targetElementName) {
        if (element.nodeName === 'DATA-VIEW') {
            element = undefined;
            break;
        }
        element = element.parentNode;
    }
    return element;
}
/**
 * @param {element} target - HTML DOM element
 * @returns {boolean}
 * @private
 */
function _toggleCollapse(target) {
    var expandableLIChild = target.querySelector(':scope > ul');
    var arrow = target.querySelector(':scope > arrow');
    if (!arrow) {
        return false;
    }
    if (arrow.getAttribute('right') === 'true') {
        arrow.removeAttribute('right');
        arrow.setAttribute('down', 'true');
        expandableLIChild.setAttribute('expanded', 'true');
    }
    else if (arrow.getAttribute('down') === 'true') {
        arrow.removeAttribute('down');
        arrow.setAttribute('right', 'true');
        expandableLIChild.removeAttribute('expanded');
    }
    return true;
}
/**
 * Get the needed attributes for an opening UL tag.
 * @param {Object} options
 * @returns {Object}
 * @private
 */
function _getULAttributesFromOptions(options) {
    var attributes = {};
    if (options.expandable) {
        attributes.expandable = 'true';
    }
    if (options.expanded) {
        attributes.expanded = 'true';
    }
    return attributes;
}
/**
 * Appropriately wraps in HTML the No Available Data text.
 * @param {string} html
 * @returns {string}
 * @private
 */
function _getNoDataHTML(html) {
    var htmlString = '';
    htmlString += _openUL({
        'expanded': 'true'
    });
    htmlString += _openLI();
    htmlString += html;
    htmlString += _closeLI();
    htmlString += _closeUL();
    return htmlString;
}
/**
 * This function selects the content of an editable value holder.
 * @param {HTMLElement} element
 * @param {boolean} shouldSelect
 * @returns {Range} range the range that is selected
 * @private
 */
function _selectEditableContent(element, shouldSelect) {
    if (shouldSelect) {
        var range = document.createRange();
        range.selectNodeContents(element);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return range;
    }
}
/**
 *
 * @param {string} key
 * @param {Object} currentElement
 * @returns {Object}
 * @private
 */
function _formatValueForDataView(key, currentElement) {
    var requiredFormat = {
        data: {}
    };
    requiredFormat.data[key] = currentElement.value;
    return requiredFormat;
}
/**
 * Determines if value is boolean, number or string.
 * @param {string|number|boolean} value
 * @returns {boolean|string|number}
 * @private
 */
function _getCorrectedValue(value) {
    if (value === 'true' || value === 'false') {
        value = (value === 'true');
    }
    else if (value === '') {
        value = null;
    }
    else if (!isNaN(+value) && value !== null) {
        value = +value;
    }
    return value;
}
/**
 * Access (nested) object properties by a full path similar to.
 * @param {Object} sourceObject
 * @param {string} path
 * @returns {any}
 * @private
 */
function _getObjectProperty(sourceObject, path) {
    if (path === undefined || path === null) {
        return undefined;
    }
    // Strip leading slash.
    path = path.replace(/^\//, '');
    return path.split('/').reduce(function (currentObject, currentPath) {
        return currentObject ? currentObject[currentPath] : undefined;
    }, sourceObject);
}
module.exports = {
    addArrow: _addArrow,
    addToolsButtons: _addToolsButtons,
    addDisclaimer: _addDisclaimer,
    addKeyTypeInfoBegin: _addKeyTypeInfoBegin,
    addKeyTypeInfoEnd: _addKeyTypeInfoEnd,
    closeLI: _closeLI,
    closeUL: _closeUL,
    findNearestDOMElement: _findNearestDOMElement,
    formatValueForDataView: _formatValueForDataView,
    getCorrectedValue: _getCorrectedValue,
    getObjectLength: _getObjectLength,
    getObjectProperty: _getObjectProperty,
    getULAttributesFromOptions: _getULAttributesFromOptions,
    getNoDataHTML: _getNoDataHTML,
    openUL: _openUL,
    openLI: _openLI,
    selectEditableContent: _selectEditableContent,
    toggleCollapse: _toggleCollapse,
    wrapInTag: _wrapInTag,
    wrapInSelectTag: _wrapInSelectTag,
    wrapInCheckBox: _wrapInCheckBox,
    valueNeedsQuotes: _valueNeedsQuotes,
    createDefaultSpan: _createDefaultSpan
};

},{}],19:[function(require,module,exports){
const ODataNode = require('./ODataNode.js');
const multipartmixed2har = require('./multipartmixed2har.js');
const formatXML = require('prettify-xml');
/**
 * @constructor
 */
function EntriesLog() {
    this.oEditorContent = {};
    this.oNoResponseMessage = {};
    this._index = 0;
}
/**
 * Creates Log entry node.
 * @param {Object} entry - OData entry
 * @returns {Object} HTML Node
 */
EntriesLog.prototype.getEntryNode = function (entry) {
    let oNode;
    let aNodes = [];
    /**
     * Finds current OData version.
     * @param {Object} el - headers element
     */
    const odataVersion = entry.response.headers.find(el => el.name.toLowerCase() === 'odata-version' || el.name.toLowerCase() === 'dataserviceversion');
    if (odataVersion && (odataVersion.value === '4.0' ||
        odataVersion.value === '3.0' ||
        odataVersion.value === '2.0')) {
        const contentIndex = this._nextIndex();
        const bIsBatch = entry.response.content.mimeType.includes('multipart/mixed');
        const classes = !(entry.request.method === 'HEAD' ||
            bIsBatch) && 'clickable' || '';
        const options = {
            id: contentIndex,
            classes: classes,
            url: entry.request.url,
            status: entry.response.status,
            method: entry.request.method,
            note: `${this._formatDateTime(entry.startedDateTime)} : ${this._formatDuration(entry.time)} ms`,
            isBatch: bIsBatch
        };
        bIsBatch && (options.classes += ' batch');
        oNode = this._createNode(options);
        if (entry.response.content.mimeType.includes('application/xml')) {
            /**
             * @param {Object} content
             */
            multipartmixed2har.getContent(entry).then(content => {
                this.oEditorContent[contentIndex] = { type: 'xml', content: formatXML(content) };
            });
        }
        else if (bIsBatch) {
            const serviceUrl = entry.request.url.split('$batch')[0];
            /**
             * @param {Array} childEntries
             */
            multipartmixed2har.extractMultipartEntry(entry).then(childEntries => {
                aNodes = this._showEmbeddedRequests(childEntries, serviceUrl);
                this.oNoResponseMessage[contentIndex] = 'See the split responses of this batch request';
                aNodes.forEach(function (oChildNode) {
                    Array.isArray(oChildNode) ? oNode.appendChild(oChildNode[0]) : oNode.appendChild(oChildNode);
                });
            });
        }
        else if (entry.response.content.mimeType.includes('application/json')) {
            delete entry._initiator;
            /**
             * @param {Object} content
             */
            multipartmixed2har.getContent(entry).then(content => {
                entry.response._content = JSON.parse(content || '{}');
                this.oEditorContent[contentIndex] = { type: 'json', content: JSON.stringify(entry, null, 2) };
            });
        }
        else if (entry.response.content.mimeType.includes('text/plain')) {
            /**
             * @param {Object} content
             */
            multipartmixed2har.getContent(entry).then(content => {
                this.oEditorContent[contentIndex] = { type: 'text', content: content };
            });
        }
    }
    else if (entry.response.status > 299 && entry.response.content.mimeType.includes('application/xml')) {
        const contentIndex = this._nextIndex();
        const options = {
            id: contentIndex,
            classes: 'clickable error',
            url: entry.request.url,
            status: entry.response.status,
            method: entry.request.method,
            note: `${entry.startedDateTime}: ${entry.time} ms`
        };
        oNode = this._createNode(options);
        /**
         * @param {Object} content
         */
        multipartmixed2har.getContent(entry).then(content => {
            this.oEditorContent[contentIndex] = { type: 'xml', content: formatXML(content) };
        });
    }
    else if (entry._error === 'net::ERR_CONNECTION_REFUSED') {
        const contentIndex = this._nextIndex();
        const options = {
            classes: 'error',
            url: entry.request.url,
            status: entry.response.status,
            method: entry.request.method
        };
        oNode = this._createNode(options);
        this.oNoResponseMessage[contentIndex] = 'Check if the server went down or the network was interrupted';
    }
    return oNode;
};
/**
 * Shows embedded requests.
 * @param {Array} entries
 * @param {string} serviceUrl
 * @param {string} prefix
 * @returns {Array} mapped entries
 * @private
 */
EntriesLog.prototype._showEmbeddedRequests = function (entries, serviceUrl, prefix) {
    /**
     * Maps entry.
     * @param {Object} entry
     */
    return entries.map(entry => {
        if (entry.children) {
            return this._showEmbeddedRequests(entry.children, serviceUrl, entry.changeset);
        }
        else {
            const contentIndex = this._nextIndex();
            const classes = 'clickable secondLevel' + (!entry.response || entry.response.status === 499) && 'warning' ||
                (entry.response && entry.response.status > 299 && ' error' || '');
            this.oEditorContent[contentIndex] = { type: 'json', content: JSON.stringify(entry, null, 2) };
            const options = {
                id: contentIndex,
                classes: classes,
                url: `${prefix ? prefix + '-> ' : ''} ${entry.request.url}`,
                status: entry.response.status,
                method: entry.request.method,
                note: `${entry.response.headers.location ? '<br/>&nbsp;&nbsp; -> ' + entry.response.headers.location : ''}`
            };
            return this._createNode(options);
        }
    });
};
/**
 * Returns editor content.
 * @param {number} iSelectedId
 * @returns {Object} editor content
 */
EntriesLog.prototype.getEditorContent = function (iSelectedId) {
    return this.oEditorContent[iSelectedId];
};
/**
 * Returns editor content.
 * @param {number} iSelectedId
 * @returns {string} No response message
 */
EntriesLog.prototype.getNoResponseMessage = function (iSelectedId) {
    return this.oNoResponseMessage[iSelectedId];
};
/**
 * Formats Datetime.
 * @param {Object} x - Datetime
 * @returns {Object} Datetime
 * @private
 */
EntriesLog.prototype._formatDateTime = function (x) {
    return x.match(/.+T(.+)Z/).pop();
};
/**
 * Formats Duration.
 * @param {Object} x - Datetime
 * @returns {number} Duration
 * @private
 */
EntriesLog.prototype._formatDuration = function (x) {
    return x.toPrecision(7);
};
/**
 * Return next Entry log index.
 * @returns {number} Index
 * @private
 */
EntriesLog.prototype._nextIndex = function () {
    return this._index++;
};
/**
 * Creates ODataNode.
 * @param {Object} options - settings
 * @returns {Object} ODataNode
 * @private
 */
EntriesLog.prototype._createNode = function (options) {
    options.name = options.url.split('/').pop();
    return new ODataNode(options);
};
module.exports = EntriesLog;

},{"./ODataNode.js":20,"./multipartmixed2har.js":21,"prettify-xml":2}],20:[function(require,module,exports){
/* globals createElementWithClass */
const DataGrid = require('../ui/datagrid/DataGrid.js');
const BATCH_ICON = 128194;
const REQUEST_ICON = 128463;
class ODataNode extends DataGrid.SortableDataGridNode {
    createCell(columnId) {
        const cell = super.createCell(columnId);
        if (columnId === 'name') {
            this._renderPrimaryCell(cell, columnId);
        }
        return cell;
    }
    _renderPrimaryCell(cell) {
        const iconElement = createElementWithClass('span', 'icon');
        const iSymbol = (this.data.isBatch) ? BATCH_ICON : REQUEST_ICON;
        const sClass = (this.data.isBatch) ? 'batchIcon' : 'requestIcon';
        iconElement.classList.add(sClass);
        iconElement.innerHTML = `&#${iSymbol}`;
        cell.prepend(iconElement);
        cell.title = this.data.url;
    }
}
module.exports = ODataNode;

},{"../ui/datagrid/DataGrid.js":16}],21:[function(require,module,exports){
/**
 * Filters lines we are not interested in.
 * @param {Object} line
 */
const unpopularLines = (line) => !(line.includes('application/http') || line === '' || line.includes('Content-Transfer-Encoding'));
/**
 * Creates response.
 * @param {Object} resPart
 */
const createResponse = (resPart) => {
    if (resPart.includes('boundary=')) {
        const sBoundary = resPart.match(/boundary=(.*)/)[1];
        const res = {
            changeset: sBoundary,
            children: resPart.split('--' + sBoundary)
                // jscs:disable
                .filter(line => !line.startsWith('--') && !line.includes(sBoundary))
                .map(createResponse)
            // jscs:enable
        };
        return res;
    }
    else {
        let lines = resPart.split('\n');
        let res = {
            headers: {}
        };
        // jscs:disable
        lines.filter(unpopularLines).forEach(line => {
            // jscs:enable
            line = line.trim();
            if (line.indexOf('HTTP/1.1') === 0) {
                let statusLine = line.substr(9);
                res.status = parseInt(statusLine);
                res.statusText = statusLine.substr(3);
            }
            else if (line.indexOf('{') === 0) {
                try {
                    res.body = JSON.parse(line);
                }
                catch (e) {
                    res.body = { parseError: 'invalid JSON' };
                }
            }
            else if (line) {
                let [name, value] = line.split(/:(.+)/);
                if (name.toLowerCase() === 'sap-messages') {
                    value = value.trim(' ');
                    // Expecting object or array, otherwise use as string
                    if (value.startsWith('{') || value.startsWith('[')) {
                        value = JSON.parse(value);
                    }
                }
                res.headers[name] = value;
            }
        });
        return res;
    }
};
/**
 * Creates request.
 * @param {Object} reqPart
 */
const createRequest = (reqPart) => {
    if (reqPart.includes('boundary=changeset')) {
        const sBoundary = reqPart.match(/boundary=(.*)/)[1];
        const request = {
            changeset: sBoundary,
            children: reqPart.split('--' + sBoundary)
                // jscs:disable
                .filter(line => !line.startsWith('--') && !line.includes(sBoundary))
                .map(createRequest)
            // jscs:enable
        };
        return request;
    }
    else {
        const request = {
            headers: {}
        };
        // jscs:disable
        reqPart.split('\n').filter(unpopularLines).forEach(line => {
            // jscs:enable
            line = line.trim();
            if (line.match('(GET|POST|PATCH|PUT|DELETE).*')) {
                let [method, url, httpVersion] = line.split(' ');
                request.method = method;
                request.url = url;
                request.httpVersion = httpVersion;
            }
            else if (line.indexOf('{') === 0) {
                try {
                    request.body = JSON.parse(line);
                }
                catch (e) {
                    request.body = { parseError: 'invalid JSON' };
                }
            }
            else if (line) {
                let [name, value] = line.split(/:(.+)/);
                if (name.toLowerCase() === 'sap-messages') {
                    value = value.trim(' ');
                    // Expecting object or array, otherwise use as string
                    if (value.startsWith('{') || value.startsWith('[')) {
                        value = JSON.parse(value);
                    }
                }
                request.headers[name] = value;
            }
        });
        return request;
    }
};
/**
 * Transforms request if it has children.
 * @param {Object} entry
 */
const transformIfChildren = (entry) => {
    if (entry.request.children) {
        entry.changeset = entry.request.changeset;
        /**
         * Maps children requests.
         * @param {Object} request
         * @param {number} ind
         */
        entry.children = entry.request.children.map((request, ind) => ({
            request: request,
            response: (entry.response.children && entry.response.children.ind) || {
                status: 499,
                statusText: 'Unexpected use case of the OData Chrome Extension',
                headers: {}
            }
        }));
        delete entry.response;
        delete entry.request;
    }
    return entry;
};
/**
 * Removes empty lines.
 * @param {Object} x
 */
const removeEmptyLinesFilter = (x) => {
    const xm = x.replace(/\s\n/, '');
    return !!xm.length;
};
/**
 * Parses request/responses blocks.
 * @param {Object} requestsRaw
 * @param {Object} responseRaw
 * @returns {Array}
 */
const parseBlock = (requestsRaw, responseRaw) => {
    let responses = responseRaw.map(createResponse);
    /**
     * Maps raw requests.
     * @param {Object} reqPart
     * @param {number} ind
     */
    return requestsRaw.map((reqPart, ind) => transformIfChildren({
        request: createRequest(reqPart),
        response: responses[ind]
    }));
};
/* jshint ignore:start */
/**
 * De-multiparts request/responses.
 * @param {Object} content
 * @param {Object} req
 * @param {Object} res
 */
const deMultipart = (content, req, res) => {
    /**
     * De-multiparts request/responses.
     */
    return Promise.resolve().then(() => {
        /**
         * Finds request content type.
         * @param {Object} header
         */
        let resContentType = res.headers.find(header => header.name.toLowerCase() === 'content-type').value;
        let reqBoundary = '--' + req.postData.mimeType.split('boundary=')[1];
        let resBoundary = '--' + resContentType.split('boundary=')[1];
        // jscs:disable
        let requestsRaw = req.postData.text.split(reqBoundary)
            .filter(line => !line.startsWith('--') && line !== '')
            .filter(removeEmptyLinesFilter);
        let responseRaw = content.split(resBoundary)
            .filter(line => !line.startsWith('--') && line !== '')
            .filter(removeEmptyLinesFilter);
        // jscs:enable
        return parseBlock(requestsRaw, responseRaw);
    });
};
/* jshint ignore:end */
/* jshint ignore:start */
/**
 * Gets content of entry.
 * @param {Object} entry
 */
const getContent = entry => 
/**
 * Resolves Promise.
 * @param {Function} resolve
 */
Promise.resolve(new Promise((resolve) => {
    /**
     * Gets content of an entry.
     * @param {Object} content
     */
    entry.getContent((content, encoding) => {
        const decodedContent = (encoding === 'base64') ? atob(content) : content;
        resolve(decodedContent);
    });
}));
exports.getContent = getContent;
/* jshint ignore:end */
/* jshint ignore:start */
/**
 * Extracts the content of multipart/mixed request response pairs and creates them as childEntries.
 * ChildEntries should follow the har spec of entries as far as possible.
 * @param {Object} entry
 */
exports.extractMultipartEntry = async (entry) => entry.childEntries = await deMultipart(await getContent(entry), entry.request, entry.response);
/* jshint ignore:end */
/* jshint ignore:start */
/**
 * Extracts the content of multipart/mixed request response pairs.
 * @param {Object} entries
 */
exports.extractMultipartEntries = async (entries) => {
    await entries.forEach(extractMultipartEntry);
};
/* jshint ignore:end */

},{}],22:[function(require,module,exports){
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

},{}]},{},[3]);
