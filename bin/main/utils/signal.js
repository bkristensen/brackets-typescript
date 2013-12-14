//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
'use strict';
define(["require", "exports"], function(require, exports) {
    var Signal = (function () {
        function Signal() {
            this.listeners = [];
            this.priorities = [];
        }
        Signal.prototype.add = function (listener, priority) {
            if (typeof priority === "undefined") { priority = 0; }
            var index = this.listeners.indexOf(listener);
            if (index !== -1) {
                this.priorities[index] = priority;
                return;
            }
            for (var i = 0, l = this.priorities.length; i < l; i++) {
                if (this.priorities[i] < priority) {
                    this.priorities.splice(i, 0, priority);
                    this.listeners.splice(i, 0, listener);
                    return;
                }
            }
            this.priorities.push(priority);
            this.listeners.push(listener);
        };

        Signal.prototype.remove = function (listener) {
            var index = this.listeners.indexOf(listener);
            if (index >= 0) {
                this.priorities.splice(index, 1);
                this.listeners.splice(index, 1);
            }
        };

        Signal.prototype.dispatch = function (parameter) {
            var indexesToRemove;
            var hasBeenCanceled = this.listeners.every(function (listener) {
                var result = listener(parameter);
                return result !== false;
            });

            return hasBeenCanceled;
        };

        Signal.prototype.clear = function () {
            this.listeners = [];
            this.priorities = [];
        };

        Signal.prototype.hasListeners = function () {
            return this.listeners.length > 0;
        };
        return Signal;
    })();
    exports.Signal = Signal;

    var JQuerySignalWrapper = (function () {
        function JQuerySignalWrapper(target, event) {
            var _this = this;
            this.target = target;
            this.event = event;
            this.signal = new Signal();
            this.jqueryEventHandler = function (parameter) {
                _this.signal.dispatch(parameter);
            };
        }
        JQuerySignalWrapper.prototype.add = function (listener, priority) {
            this.signal.add(listener, priority);
            this.target.on(this.event, this.jqueryEventHandler);
        };

        JQuerySignalWrapper.prototype.remove = function (listener) {
            this.signal.remove(listener);
            if (!this.hasListeners()) {
                this.removeJQueryEventListener();
            }
        };

        JQuerySignalWrapper.prototype.dispatch = function (parameter) {
            return this.signal.dispatch(parameter);
        };

        JQuerySignalWrapper.prototype.clear = function () {
            this.signal.clear();
            this.removeJQueryEventListener();
        };

        JQuerySignalWrapper.prototype.hasListeners = function () {
            return this.signal.hasListeners();
        };

        JQuerySignalWrapper.prototype.removeJQueryEventListener = function () {
            this.target.off(this.event, this.jqueryEventHandler);
        };
        return JQuerySignalWrapper;
    })();
    exports.JQuerySignalWrapper = JQuerySignalWrapper;

    var DomSignalWrapper = (function () {
        function DomSignalWrapper(target, event, capture) {
            var _this = this;
            this.target = target;
            this.event = event;
            this.capture = capture;
            this.signal = new Signal();
            this.eventHandler = function (parameter) {
                _this.signal.dispatch(parameter);
            };
        }
        DomSignalWrapper.prototype.add = function (listener, priority) {
            this.signal.add(listener, priority);
            this.target.addEventListener(this.event, this.eventHandler, this.capture);
        };

        DomSignalWrapper.prototype.remove = function (listener) {
            this.signal.remove(listener);
            if (!this.hasListeners()) {
                this.removeEventListener();
            }
        };

        DomSignalWrapper.prototype.dispatch = function (parameter) {
            return this.signal.dispatch(parameter);
        };

        DomSignalWrapper.prototype.clear = function () {
            this.signal.clear();
            this.removeEventListener();
        };

        DomSignalWrapper.prototype.hasListeners = function () {
            return this.signal.hasListeners();
        };

        DomSignalWrapper.prototype.removeEventListener = function () {
            this.target.removeEventListener(this.event, this.eventHandler, this.capture);
        };
        return DomSignalWrapper;
    })();
    exports.DomSignalWrapper = DomSignalWrapper;
});
