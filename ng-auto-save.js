
    var autoSaveModule = angular.module('ng-auto-save', []);
    function autoSaveDirective() {
        var savingEls = [];
        var savedEls = [];
        return {
            restrict: 'A',
            controller: function ($scope, $element, $attrs) {
                if ($element[0].tagName.toLowerCase() != 'form')
                    throw Error('directive auto-save must be applied on tag <form>');
                var self = this;
                self.key = undefined;
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
            link: function ($scope, $elem, $attrs, $ctrl) {
                var key = $scope.$eval($attrs.autoSaveKey);
                if (!key) {
                    $scope.$watch($attrs.autoSaveKey, function (newVal, oldVal) {
                        console.log(newVal, oldVal)
                        if (newVal) {
                            
                            $ctrl.key = $scope.$eval($attrs.autoSaveKey);
                            keyReady();
                        }
                    });
                }
                else {
                    $ctrl.key = key;
                    keyReady();
                }
                function keyReady() {
                    $scope.$broadcast('ngAutoSave.keyReady');
                }
                $scope.$on('$destroy', function () {
                    savingEls.length = 0;
                    savedEls.length = 0;
                });
            }
        };
    }
    
    autoSaveFieldDirective.$inject = ['$timeout'];
    function autoSaveFieldDirective($timeout) {
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
                var key = undefined;
                var queue = [];
                if (autoSaveCtrl.key == undefined) {
                    $scope.$on('ngAutoSave.keyReady', function () {
                        init();
                    });
                }
                else {
                    init();
                }
                function init() {
                    key = autoSaveCtrl.key;
                    $scope.$watch(ngModel, function (newVal, oldVal) {
                        //console.log(ngModel, ': newVal', newVal, '; oldVal', oldVal);
                        if (newVal != oldVal && (lastValidVal || newVal != lastValidVal)) {
                            if (form.$valid)
                                lastValidVal = newVal;
                            debounceSave(field, newVal);
                        }
                    });
                    if (!$scope.autoSaving)
                        $scope.autoSaving = {};
                    if (!$scope.autoSaving[field])
                        $scope.autoSaving[field] = {};
                    if (!$scope.autoSaving[field][key])
                        $scope.autoSaving[field][key] = false;
                    if (!$scope.autoSaved)
                        $scope.autoSaved = {};
                    if (!$scope.autoSaved[field])
                        $scope.autoSaved[field] = {};
                    if (!$scope.autoSaved[field][key])
                        $scope.autoSaved[field][key] = false;
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
                    }
                    else {
                        queue.push({ col: col, value: value });
                        runQueue();
                    }
                }
                function runQueue() {
                    var isSaving = getSaving();
                    if (!isSaving) {
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
                        try {
                            $scope[autoSaveFnName](col, value, key).then(function () {
                                autoSaveCtrl.changeSavingVisibility(col, false);
                                autoSaveCtrl.changeSavedVisibility(col, true);
                                setSaving(false);
                                setSaved(true);
                                $timeout(function () {
                                    setSaved(false);
                                }, 3000);
                                cb();
                            }, function (error) {
                                console.log(error);
                                autoSaveCtrl.changeSavingVisibility(col, false);
                                setSaving(false);
                                cb();
                            });
                        }
                        catch (e) {
                            console.log('$scope[autoSaveFnName]:', $scope[autoSaveFnName], '; autoSaveFnName:', autoSaveFnName, '; col:', col, '; value:', value, '; key:', key);
                            console.log(e.stack);
                        }
                    }
                    else {
                        autoSaveCtrl.changeSavedVisibility(col, false);
                        cb();
                    }
                }
            }
        };
    }
    
    function autoSavingDirective() {
        return {
            restrict: 'A',
            require: '^autoSave',
            link: function ($scope, $elem, $attrs, autoSaveCtrl) {
                $elem.addClass('ng-hide');
                $scope.$on('ngAutoSave.keyReady', function() {
                    autoSaveCtrl.registerSavingEl($attrs.autoSaving, $elem);
                });
            }
        };
    }
    
    function autoSavedDirective() {
        return {
            restrict: 'A',
            require: '^autoSave',
            link: function ($scope, $elem, $attrs, autoSaveCtrl) {
                $elem.addClass('ng-hide');
                $scope.$on('ngAutoSave.keyReady', function() {
                    autoSaveCtrl.registerSavedEl($attrs.autoSaved, $elem);
                });
            }
        };
    }
    
    autoSaveModule.directive('autoSave', autoSaveDirective);
    autoSaveModule.directive('autoSaveField', autoSaveFieldDirective);
    autoSaveModule.directive('autoSaving', autoSavingDirective);
    autoSaveModule.directive('autoSaved', autoSavedDirective);
