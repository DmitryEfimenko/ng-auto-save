'use strict';

/*
  * Source: https://github.com/DmitryEfimenko/ng-auto-save
  * 
*/

angular.module('ng-auto-save', [])
    .directive('autoSave', [
    function () {
        var savingEls = [];
        var savedEls = [];
        
        return {
            restrict: 'A',
            require: 'form',
            controller: function ($scope, $element, $attrs) {
                var self = this;
                self.key = $scope.$eval($attrs.autoSaveKey);
                self.autoSaveFnName = $attrs.autoSave;
                self.debounce = $attrs.autoSaveDebounce;
                
                self.registerSavingEl = function (col, el) {
                    savingEls.push({ col: col, key: self.key, el: el });
                };
                self.registerSavedEl = function (col, el) {
                    savedEls.push({ col: col, key: self.key, el: el });
                };
                self.changeSavingVisibility = function (col, shouldShow) {
                    changeVisibility(savingEls, col, shouldShow);
                };
                self.changeSavedVisibility = function (col, shouldShow) {
                    changeVisibility(savedEls, col, shouldShow);
                };
                
                function changeVisibility(elArr, col, shouldShow) {
                    for (var j = 0, jl = elArr.length; j < jl; j++) {
                        if (elArr[j].col == col && elArr[j].key == self.key) {
                            if (shouldShow)
                                elArr[j].el.removeClass('ng-hide');
                            else
                                elArr[j].el.addClass('ng-hide');
                            break;
                        }
                    }
                }

            },
            link: function ($scope) {
                $scope.$on('$destroy', function () {
                    savingEls.length = 0;
                    savedEls.length = 0;
                });
            }
        };
    }
])
    .directive('autoSaveField', [
    '$timeout',
    function ($timeout) {
        return {
            restrict: 'A',
            require: ['^autoSave', '^form', 'ngModel'],
            link: function ($scope, $elem, $attrs, $ctrls) {
                var autoSaveCtrl = $ctrls[0];
                var form = $ctrls[1];
                var lastValidVal = undefined;
                var ngModel = $attrs.ngModel;
                var field = $attrs.autoSaveField;
                var timeout = null;
                var autoSaveFnName = autoSaveCtrl.autoSaveFnName;
                var debounce = autoSaveCtrl.debounce;
                var key = autoSaveCtrl.key;
                var queue = [];
                
                if (!$scope.autoSaving) $scope.autoSaving = {};
                if (!$scope.autoSaving[field]) $scope.autoSaving[field] = {};
                if (!$scope.autoSaving[field][key]) $scope.autoSaving[field][key] = false;
                
                if (!$scope.autoSaved) $scope.autoSaved = {};
                if (!$scope.autoSaved[field]) $scope.autoSaved[field] = {};
                if (!$scope.autoSaved[field][key]) $scope.autoSaved[field][key] = false;
                
                if (key) {
                    $scope.$watch(ngModel, function (newVal, oldVal) {
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
                        timeout = $timeout(function () {
                            queue.push({ col: col, value: value });
                            runQueue();
                        }, debounce);
                    } else {
                        queue.push({ col: col, value: value });
                        runQueue();
                    }
                }
                
                function runQueue() {
                    if (!getSaving()) {
                        var args = queue.shift();
                        if (args)
                            save(args.col, args.value, runQueue);
                    }
                }
                
                function getSaving() {
                    return $scope.autoSaving[field][key];
                }
                
                function setSaving(val) {
                    $scope.autoSaving[field][key] = val;
                }
                
                function setSaved(val) {
                    $scope.autoSaved[field][key] = val;
                }
                
                function save(col, value, cb) {
                    if (form.$valid) {
                        setSaving(true);
                        autoSaveCtrl.changeSavingVisibility(col, true);
                        autoSaveCtrl.changeSavedVisibility(col, false);
                        
                        $scope[autoSaveFnName](col, value, key).then(
                            function () {
                                autoSaveCtrl.changeSavingVisibility(col, false);
                                autoSaveCtrl.changeSavedVisibility(col, true);
                                setSaving(false);
                                setSaved(true);
                                $timeout(function () {
                                    setSaved(false);
                                }, 3000);
                                cb();
                            },
                                function (error) {
                                console.log(error);
                                autoSaveCtrl.changeSavingVisibility(col, false);
                                setSaving(false);
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
    function () {
        return {
            restrict: 'A',
            require: '^autoSave',
            link: function ($scope, $elem, $attrs, autoSaveCtrl) {
                $elem.addClass('ng-hide');
                autoSaveCtrl.registerSavingEl($attrs.autoSaving, $elem);
            }
        };
    }
])
    .directive('autoSaved', [
    function () {
        return {
            restrict: 'A',
            require: '^autoSave',
            link: function ($scope, $elem, $attrs, autoSaveCtrl) {
                $elem.addClass('ng-hide');
                autoSaveCtrl.registerSavedEl($attrs.autoSaved, $elem);
            }
        };
    }
]);
