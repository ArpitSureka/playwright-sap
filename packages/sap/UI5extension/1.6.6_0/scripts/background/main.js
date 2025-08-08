(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function () {
    'use strict';
    var utils = require('../modules/utils/utils.js');
    var ContextMenu = require('../modules/background/ContextMenu.js');
    var pageAction = require('../modules/background/pageAction.js');
    var contextMenu = new ContextMenu({
        title: 'Inspect UI5 control',
        id: 'context-menu',
        contexts: ['all']
    });
    /**
     * This method will be fired when an instance is clicked. The idea is to be overwritten from the instance.
     * @param {Object} info - Information sent when a context menu item is clicked. Check chrome.contextMenus.onClicked.
     * @param {Object} tab - The details of the tab where the click took place.
     */
    contextMenu.onClicked = function (info, tab) {
        utils.sendToAll({
            action: 'do-context-menu-control-select',
            target: contextMenu._rightClickTarget,
            // specify the frame in which the user clicked
            frameId: info.frameId
        });
    };
    // Name space for message handler functions.
    var messageHandler = {
        /**
         * Create an icons with hover information inside the address bar.
         * @param {Object} message
         * @param {Object} messageSender
         */
        'on-ui5-detected': function (message, messageSender) {
            var framework = message.framework;
            if (message.isVersionSupported === true) {
                pageAction.create({
                    version: framework.version,
                    framework: framework.name,
                    tabId: messageSender.tab.id
                });
                pageAction.enable();
            }
        },
        /**
         * Handler for UI5 none detection on the current inspected page.
         * @param {Object} message
         */
        'on-ui5-not-detected': function (message) {
            pageAction.disable();
        },
        /**
         * Inject script into the inspected page.
         * @param {Object} message
         */
        'do-script-injection': function (message) {
            const frameId = message.frameId;
            chrome.windows.getCurrent().then(w => {
                chrome.tabs.query({ active: true, windowId: w.id }).then(tabs => {
                    const target = {
                        tabId: tabs[0].id
                    };
                    // inject the script only into the frame
                    // specified in the request from the devTools UI5 panel script;
                    // If no frameId specified, the script will be injected into the main frame
                    if (frameId !== undefined) {
                        target.frameIds = [message.frameId];
                    }
                    chrome.scripting.executeScript({
                        target,
                        files: [message.file]
                    });
                });
            });
        },
        /**
         * Set the element that was clicked with the right button of the mouse.
         * @param {Object} message
         */
        'on-right-click': function (message) {
            contextMenu.setRightClickTarget(message.target);
        },
        /**
         * Create the button for the context menu, when the user switches to the "UI5" panel.
         * @param {Object} message
         */
        'on-ui5-devtool-show': function (message) {
            contextMenu.create();
        },
        /**
         * Delete the button for the context menu, when the user switches away to the "UI5" panel.
         * @param {Object} message
         */
        'on-ui5-devtool-hide': function (message) {
            contextMenu.removeAll();
        },
        'do-ping-frames': function (message, messageSender) {
            var frameIds = message.frameIds;
            var liveFrameIds = [];
            var pingFrame = function (i) {
                if (i >= frameIds.length) {
                    // no more frameId to ping
                    // => done with pinging each frame
                    // => send a message [to the devTools UI5 panel]
                    // with the updated list of 'live' frame ids
                    chrome.runtime.sendMessage(messageSender.id, {
                        action: 'on-ping-frames',
                        frameIds: liveFrameIds
                    });
                    return;
                }
                var frameId = frameIds[i];
                // ping the next frame
                // from the <code>frameIds</code> list
                utils.sendToAll({
                    action: 'do-ping',
                    frameId: frameId
                }, function (isAlive) {
                    if (isAlive) {
                        liveFrameIds.push(frameId);
                    }
                    pingFrame(i + 1);
                });
            };
            pingFrame(0);
        }
    };
    chrome.runtime.onMessage.addListener(function (request, messageSender, sendResponse) {
        // Resolve incoming messages
        utils.resolveMessage({
            message: request,
            messageSender: messageSender,
            sendResponse: sendResponse,
            actions: messageHandler
        });
        utils.sendToAll(request);
    });
    chrome.runtime.onInstalled.addListener(() => {
        // Page actions are disabled by default and enabled on select tabs
        chrome.action.disable();
    });
}());

},{"../modules/background/ContextMenu.js":2,"../modules/background/pageAction.js":3,"../modules/utils/utils.js":4}],2:[function(require,module,exports){
'use strict';
var oContextMenusCreated = {};
/**
 * Context menu.
 * @param {Object} options
 * @constructor
 */
function ContextMenu(options) {
    this._title = options.title;
    this._id = options.id;
    this._contexts = options.contexts;
    /**
     * This method will be fired when an instanced is clicked. The idea is to be overwritten from the instance.
     * @param {Object} info - Information sent when a context menu item is clicked.
     * @param {Object} tab - The details of the tab where the click took place. If the click did not take place in a tab,
     * this parameter will be missing.
     */
    this.onClicked = function (info, tab) {
    };
}
/**
 * Create context menu item.
 */
ContextMenu.prototype.create = function () {
    var that = this;
    if (!oContextMenusCreated[that._id]) {
        chrome.contextMenus.create({
            title: that._title,
            id: that._id,
            contexts: that._contexts
        });
        chrome.contextMenus.onClicked.addListener(that._onClickHandler.bind(that));
        oContextMenusCreated[that._id] = true;
    }
};
/**
 * Delete all context menu items.
 */
ContextMenu.prototype.removeAll = function () {
    chrome.contextMenus.removeAll();
    oContextMenusCreated = {};
};
/**
 * Set right clicked element.
 * @param {string} target
 */
ContextMenu.prototype.setRightClickTarget = function (target) {
    this._rightClickTarget = target;
};
/**
 * Click handler.
 * @param {Object} info - Information sent when a context menu item is clicked.
 * @param {Object} tabs - The details of the tab where the click took place. If the click did not take place in a tab,
 * this parameter will be missing.
 */
ContextMenu.prototype._onClickHandler = function (info, tabs) {
    if (info.menuItemId === this._id) {
        this.onClicked(info, tabs);
    }
};
module.exports = ContextMenu;

},{}],3:[function(require,module,exports){
'use strict';
/**
 * Page action.
 * @type {{create: Function}}
 */
var pageAction = {
    /**
     * Create page action.
     * @param {Object} options
     */
    create: function (options) {
        var framework = options.framework;
        var version = options.version;
        var tabId = options.tabId;
        chrome.action.setTitle({
            tabId: tabId,
            title: 'This page is using ' + framework + ' v' + version
        });
    },
    /**
     * Disable page action.
     *
     */
    disable: function () {
        chrome.action.disable();
    },
    /**
     * Enable page action.
     *
     */
    enable: function () {
        chrome.action.enable();
    }
};
module.exports = pageAction;

},{}],4:[function(require,module,exports){
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
