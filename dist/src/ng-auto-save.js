var autoSaveModule = angular.module('ng-auto-save', []);
function autoSaveDirective() {
    return {
        restrict: 'A',
        controller: AutoSaveController,
        scope: false
    };
}
var AutoSaveController = (function () {
    function AutoSaveController($scope, $element, $attrs) {
        var _this = this;
        this.$scope = $scope;
        this.$attrs = $attrs;
        this.savingEls = [];
        this.savedEls = [];
        this.key = undefined;
        if ($element[0].tagName.toLowerCase() !== 'form') {
            throw Error('directive auto-save must be applied on tag <form>');
        }
        if (!$attrs.autoSave) {
            throw Error('attribute auto-save of such directive must have a value - the name of the saving function');
        }
        this.autoSaveFnName = this.$attrs.autoSave;
        this.key = $scope.$eval($attrs.autoSaveKey);
        this.debounce = $attrs.autoSaveDebounce;
        this.getAutoSaveFunction();
        if (!this.key) {
            $scope.$watch($attrs.autoSaveKey, function (newVal, oldVal) {
                if (newVal) {
                    _this.key = $scope.$eval($attrs.autoSaveKey);
                    _this.keyReady();
                }
            });
        }
        else {
            this.keyReady();
        }
    }
    AutoSaveController.prototype.registerSavingEl = function (col, el) {
        this.savingEls.push({ col: col, key: this.key, el: el });
    };
    AutoSaveController.prototype.registerSavedEl = function (col, el) {
        this.savedEls.push({ col: col, key: this.key, el: el });
    };
    AutoSaveController.prototype.changeSavingVisibility = function (col, shouldShow) {
        this.changeVisibility(this.savingEls, col, shouldShow);
    };
    AutoSaveController.prototype.changeSavedVisibility = function (col, shouldShow) {
        this.changeVisibility(this.savedEls, col, shouldShow);
    };
    AutoSaveController.prototype.changeVisibility = function (elArr, col, shouldShow) {
        for (var j = 0, jl = elArr.length; j < jl; j++) {
            if (elArr[j].col === col && elArr[j].key === this.key) {
                if (shouldShow) {
                    elArr[j].el.removeClass('ng-hide');
                }
                else {
                    elArr[j].el.addClass('ng-hide');
                }
                break;
            }
        }
    };
    AutoSaveController.prototype.getAutoSaveFunction = function () {
        var parts = this.$attrs.autoSave.split('.');
        var bindingContext = this.$scope;
        this.autoSaveFn = this.$scope[parts[0]];
        if (parts.length > 1) {
            for (var i = 1, l = parts.length; i < l; i++) {
                this.autoSaveFn = this.autoSaveFn[parts[i]];
                bindingContext = bindingContext[parts[i - 1]];
            }
        }
        if (this.autoSaveFn) {
            this.autoSaveFn = this.autoSaveFn.bind(bindingContext);
        }
        else {
            console.error('could not find auto-saving function', this.$attrs.autoSave, 'on the scope');
        }
    };
    AutoSaveController.prototype.keyReady = function () {
        this.$scope.$broadcast('ngAutoSave.keyReady');
    };
    AutoSaveController.$inject = ['$scope', '$element', '$attrs'];
    return AutoSaveController;
}());
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
            var debounce = autoSaveCtrl.debounce;
            var key = undefined;
            var queue = [];
            if (autoSaveCtrl.key === undefined) {
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
                    if (newVal !== oldVal && (lastValidVal || newVal !== lastValidVal)) {
                        if (form.$valid) {
                            lastValidVal = newVal;
                        }
                        debounceSave(field, newVal);
                    }
                });
                if (!$scope.autoSaving) {
                    $scope.autoSaving = {};
                }
                if (!$scope.autoSaving[field]) {
                    $scope.autoSaving[field] = {};
                }
                if (!$scope.autoSaving[field][key]) {
                    $scope.autoSaving[field][key] = false;
                }
                if (!$scope.autoSaved) {
                    $scope.autoSaved = {};
                }
                if (!$scope.autoSaved[field]) {
                    $scope.autoSaved[field] = {};
                }
                if (!$scope.autoSaved[field][key]) {
                    $scope.autoSaved[field][key] = false;
                }
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
                    if (args) {
                        save(args.col, args.value, runQueue);
                    }
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
                        autoSaveCtrl.autoSaveFn(col, value, key).then(function () {
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
                        console.log('error in auto-save. col:', col, '; value:', value, '; key:', key);
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
            $scope.$on('ngAutoSave.keyReady', function () {
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
            $scope.$on('ngAutoSave.keyReady', function () {
                autoSaveCtrl.registerSavedEl($attrs.autoSaved, $elem);
            });
        }
    };
}
autoSaveModule.directive('autoSave', autoSaveDirective);
autoSaveModule.directive('autoSaveField', autoSaveFieldDirective);
autoSaveModule.directive('autoSaving', autoSavingDirective);
autoSaveModule.directive('autoSaved', autoSavedDirective);
