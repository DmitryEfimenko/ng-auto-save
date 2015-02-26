'use strict';

/*
  * Source: https://github.com/DmitryEfimenko/ng-auto-save
  * 
*/

angular.module('ng-auto-save', [])
    .service('autoSaveService', [
        function() {
            var self = this;
            self.autoSaveFnName = undefined;
            self.key = undefined;
            self.debounce = undefined;

            self.setAutoSaveFnName = function(name) {
                self.autoSaveFnName = name;
            };
            self.getAutoSaveFnName = function() {
                return self.autoSaveFnName;
            };
            self.setKey = function(k) {
                self.key = k;
            };
            self.getKey = function() {
                return self.key;
            };
            self.setDebounce = function(d) {
                self.debounce = d;
            };
            self.getDebounce = function() {
                return self.debounce;
            };
        }
    ])
    .directive('autoSave', [
        'autoSaveService',
        function(autoSaveService) {
            var savingEls = [];
            var savedEls = [];

            return {
                restrict: 'A',
                require: 'form',
                controller: function($scope, $element, $attrs) {
                    autoSaveService.setAutoSaveFnName($attrs.autoSave);
                    autoSaveService.setKey($scope.$eval($attrs.autoSaveKey));
                    autoSaveService.setDebounce($attrs.autoSaveDebounce);

                    this.registerSavingEl = function(col, el) {
                        savingEls.push({ col: col, el: el });
                    };
                    this.registerSavedEl = function(col, el) {
                        savedEls.push({ col: col, el: el });
                    };
                    this.changeSavingVisibility = function(col, shouldShow) {
                        changeVisibility(savingEls, col, shouldShow);
                    };
                    this.changeSavedVisibility = function(col, shouldShow) {
                        changeVisibility(savedEls, col, shouldShow);
                    };

                    function changeVisibility(elArr, col, shouldShow) {
                        for (var j = 0, jl = elArr.length; j < jl; j++) {
                            if (elArr[j].col == col) {
                                if (shouldShow)
                                    elArr[j].el.removeClass('ng-hide');
                                else
                                    elArr[j].el.addClass('ng-hide');
                                break;
                            }
                        }
                    }

                },
                link: function($scope) {
                    $scope.$on('$destroy', function() {
                        savingEls.length = 0;
                        savedEls.length = 0;
                    });
                }
            };
        }
    ])
    .directive('autoSaveField', [
        '$timeout', 'autoSaveService',
        function($timeout, autoSaveService) {
            return {
                restrict: 'A',
                require: ['^autoSave', '^form', 'ngModel'],
                link: function($scope, $elem, $attrs, $ctrls) {
                    var autoSaveCtrl = $ctrls[0];
                    var form = $ctrls[1];
                    var lastValidVal = undefined;
                    var ngModel = $attrs.ngModel;
                    var field = $attrs.autoSaveField;
                    var timeout = null;
                    var autoSaveFnName = autoSaveService.getAutoSaveFnName();
                    var debounce = autoSaveService.getDebounce();
                    var key = autoSaveService.getKey();
                    var queue = [];
                    var saving = false;

                    if (key) {
                        $scope.$watch(ngModel, function(newVal, oldVal) {
                            if (newVal != oldVal && (lastValidVal || newVal != lastValidVal)) {
                                if (form.$valid) lastValidVal = newVal;
                                debounceSave(field, newVal);
                            }
                        });
                    }

                    function debounceSave(col, value) {
                        if (debounce) {
                            if (timeout) {
                                $timeout.cancel(timeout);
                            }
                            timeout = $timeout(function() {
                                queue.push({ col: col, value: value });
                                runQueue();
                            }, debounce);
                        } else {
                            save(col, value);
                        }
                    }

                    function runQueue() {
                        if (!saving) {
                            var args = queue.shift();
                            if (args)
                                save(args.col, args.value, runQueue);
                        }
                    }

                    function save(col, value, cb) {
                        if (form.$valid) {
                            saving = true;
                            autoSaveCtrl.changeSavingVisibility(col, true);
                            autoSaveCtrl.changeSavedVisibility(col, false);

                            $scope[autoSaveFnName](col, value, key).then(
                                function() {
                                    autoSaveCtrl.changeSavingVisibility(col, false);
                                    autoSaveCtrl.changeSavedVisibility(col, true);
                                    saving = false;
                                    cb();
                                },
                                function(error) {
                                    console.log(error);
                                    autoSaveCtrl.changeSavingVisibility(col, false);
                                    saving = false;
                                    cb();
                                }
                            );
                        } else {
                            autoSaveCtrl.changeSavedVisibility(col, false);
                            cb();
                        }
                    }

                }
            };
        }
    ])
    .directive('autoSaving', [
        function() {
            return {
                restrict: 'A',
                require: '^autoSave',
                link: function($scope, $elem, $attrs, autoSaveCtrl) {
                    $elem.addClass('ng-hide');
                    autoSaveCtrl.registerSavingEl($attrs.autoSaving, $elem);
                }
            };
        }
    ])
    .directive('autoSaved', [
        function() {
            return {
                restrict: 'A',
                require: '^autoSave',
                link: function($scope, $elem, $attrs, autoSaveCtrl) {
                    $elem.addClass('ng-hide');
                    autoSaveCtrl.registerSavedEl($attrs.autoSaved, $elem);
                }
            };
        }
    ]);
