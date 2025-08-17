(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function () {
    'use strict';
    var utils = require('../modules/utils/utils.js');
    var highLighter = require('../modules/content/highLighter.js');
    var port = utils.getPort();
    function confirmScriptInjectionDone() {
        // Add this action to the Q
        // This is needed when the devtools are undocked from the current inspected window
        setTimeout(function () {
            port.postMessage({
                action: 'on-main-script-injection'
            });
        }, 0);
    }
    var DONE_FLAG = 'MAIN_SCRIPT_INJECTION_DONE';
    if (window[DONE_FLAG] === true) {
        confirmScriptInjectionDone();
        return;
    }
    // Inject needed scripts into the inspected page
    // ================================================================================
    /**
     * Inject javascript file into the page.
     * @param {string} source - file path
     * @callback
     */
    var injectScript = function (source, callback) {
        var script = document.createElement('script');
        script.src = chrome.runtime.getURL(source);
        document.head.appendChild(script);
        /**
         * Delete the injected file, when it is loaded.
         */
        script.onload = function () {
            script.parentNode.removeChild(script);
            if (callback) {
                callback();
            }
        };
    };
    injectScript('vendor/ToolsAPI.js', function () {
        injectScript('scripts/injected/main.js', function () {
            window[DONE_FLAG] = true;
            confirmScriptInjectionDone();
        });
    });
    // ================================================================================
    // Communication
    // ================================================================================
    /**
     * Send message to injected script.
     * @param {Object} message
     */
    var sendCustomMessageToInjectedScript = function (message) {
        document.dispatchEvent(new CustomEvent('ui5-communication-with-injected-script', {
            detail: message
        }));
    };
    // Name space for message handler functions.
    var messageHandler = {
        /**
         * Changes the highlighter position and size,
         * when an element from the ControlTree is hovered.
         * @param {Object} message
         */
        'on-control-tree-hover': function (message) {
            highLighter.setDimensions(message.target);
        },
        'on-hide-highlight': function () {
            highLighter.hide();
        },
        'do-ping': function (message, messageSender, sendResponse) {
            // respond to ping
            sendResponse(true /* alive status */);
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
        // Send events to injected script
        sendCustomMessageToInjectedScript(message);
    });
    /**
     * Listener for messages from the injected script.
     */
    document.addEventListener('ui5-communication-with-content-script', function sendEvent(detectEvent) {
        // Send the received event detail object to background page
        port.postMessage(detectEvent.detail);
    }, false);
}());

},{"../modules/content/highLighter.js":2,"../modules/utils/utils.js":3}],2:[function(require,module,exports){
'use strict';
/**
 * Singleton helper to highlight controls DOM elements
 */
var Highlighter = {
    // Reference for the highlighter DOM element
    _highLighterDomEl: null,
    /**
     * Hide the highlighter.
     * @public
     */
    hide: function () {
        this._highLighterDomEl && (this._highLighterDomEl.style.display = 'none');
    },
    /**
     * Show the highlighter.
     * @private
     */
    _show: function () {
        this._highLighterDomEl && (this._highLighterDomEl.style.display = 'block');
    },
    /**
     * Create DOM element for visual highlighting.
     * @private
     */
    _create: function () {
        var highLighter = document.createElement('div');
        highLighter.style.cssText = 'box-sizing: border-box;border:1px solid blue;background: rgba(20, 20, 200, 0.4);position: absolute';
        var highLighterWrapper = document.createElement('div');
        highLighterWrapper.id = 'ui5-highlighter';
        highLighterWrapper.style.cssText = 'position: fixed;top:0;right:0;bottom:0;left:0;z-index: 1000;overflow: hidden;';
        highLighterWrapper.appendChild(highLighter);
        document.body.appendChild(highLighterWrapper);
        // Save reference for later usage
        this._highLighterDomEl = document.getElementById('ui5-highlighter');
        // Add event handler
        this._highLighterDomEl.onmouseover = this.hide.bind(this);
    },
    /**
     * Set the position of the visual highlighter.
     * @param {string} elementId - The id of the DOM element that need to be highlighted
     * @returns {exports}
     */
    setDimensions: function (elementId) {
        var highlighter;
        var targetDomElement;
        var targetRect;
        // the hightlighter DOM element may already have been created in a previous DevTools session
        // (followed by closing and reopening the DevTools)
        this._highLighterDomEl || (this._highLighterDomEl = document.getElementById('ui5-highlighter'));
        if (!this._highLighterDomEl) {
            this._create();
        }
        else {
            this._show();
        }
        highlighter = this._highLighterDomEl.firstElementChild;
        targetDomElement = document.getElementById(elementId);
        if (targetDomElement) {
            targetRect = targetDomElement.getBoundingClientRect();
            highlighter.style.top = targetRect.top + 'px';
            highlighter.style.left = targetRect.left + 'px';
            highlighter.style.height = targetRect.height + 'px';
            highlighter.style.width = targetRect.width + 'px';
        }
        return this;
    }
};
module.exports = Highlighter;

},{}],3:[function(require,module,exports){
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
