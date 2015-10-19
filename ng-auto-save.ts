import angular = require('angular');

var autoSaveModule = angular.module('ng-auto-save', []);



export function autoSaveDirective(): angular.IDirective {
    return {
        restrict: 'A',
        controller: AutoSaveController,
        scope: false
    }
}

class AutoSaveController {
    private savingEls = [];
    private savedEls = [];
    key: string = undefined;
    autoSaveFnName: string;
    autoSaveFn: (col: string, value: any, key: any)=> ng.IPromise<any>;
    debounce: number;

    static $inject = ['$scope', '$element', '$attrs'];
    constructor(private $scope, $element, private $attrs) {
        if ($element[0].tagName.toLowerCase() != 'form') throw Error('directive auto-save must be applied on tag <form>');
        if (!$attrs.autoSave) throw Error('attribute auto-save of such directive must have a value - the name of the saving function');

        this.autoSaveFnName = this.$attrs.autoSave;
        this.key = $scope.$eval($attrs.autoSaveKey);
        this.debounce = $attrs.autoSaveDebounce;
        this.getAutoSaveFunction();

        if (!this.key) {
            $scope.$watch($attrs.autoSaveKey, (newVal, oldVal) => {
                if (newVal) {
                    this.key = $scope.$eval($attrs.autoSaveKey);
                    this.keyReady();
                }
            })
        } else {
            this.keyReady();
        }
    }

    registerSavingEl(col, el) {
        this.savingEls.push({ col: col, key: this.key, el: el });
    }

    registerSavedEl(col, el) {
        this.savedEls.push({ col: col, key: this.key, el: el });
    }

    changeSavingVisibility(col, shouldShow) {
        this.changeVisibility(this.savingEls, col, shouldShow);
    }

    changeSavedVisibility(col, shouldShow) {
        this.changeVisibility(this.savedEls, col, shouldShow);
    }

    private changeVisibility(elArr, col, shouldShow) {
        for (var j = 0, jl = elArr.length; j < jl; j++) {
            if (elArr[j].col == col && elArr[j].key == this.key) {
                if (shouldShow)
                    elArr[j].el.removeClass('ng-hide');
                else
                    elArr[j].el.addClass('ng-hide');
                break;
            }
        }
    }

    private getAutoSaveFunction() {
        var parts = this.$attrs.autoSave.split('.');
        var bindingContext = this.$scope;
        this.autoSaveFn = this.$scope[parts[0]];
        if (parts.length > 1) {
            for (var i = 1, l = parts.length; i < l; i++) {
                this.autoSaveFn = this.autoSaveFn[parts[i]];
                bindingContext = bindingContext[parts[i - 1]];
            }
        }
        if (this.autoSaveFn)
            this.autoSaveFn = this.autoSaveFn.bind(bindingContext);
        else
            console.error('could not find auto-saving function', this.$attrs.autoSave, 'on the scope');
    }

    private keyReady() {
        this.$scope.$broadcast('ngAutoSave.keyReady');
    }
}

autoSaveFieldDirective.$inject = ['$timeout'];
export function autoSaveFieldDirective($timeout): angular.IDirective {
    return {
        restrict: 'A',
        require: ['^autoSave', '^form', 'ngModel'],
        link: function ($scope, $elem, $attrs: any, $ctrls) {
            var autoSaveCtrl: AutoSaveController = $ctrls[0];
            var form = $ctrls[1];
            var lastValidVal = undefined;
            var ngModel = $attrs.ngModel;
            var field = $attrs.autoSaveField;
            var timeout = null;
            var debounce = autoSaveCtrl.debounce;
            var key = undefined;
            var queue = [];

            if (autoSaveCtrl.key == undefined) {
                $scope.$on('ngAutoSave.keyReady', () => {
                    init();
                });
            } else {
                init();
            }

            function init() {
                //console.log(autoSaveCtrl.key, autoSaveCtrl.autoSaveFn);
                
                key = autoSaveCtrl.key;
                $scope.$watch(ngModel, function (newVal, oldVal) {
                    //console.log(ngModel, ': newVal', newVal, '; oldVal', oldVal);
                    if (newVal != oldVal && (lastValidVal || newVal != lastValidVal)) {
                        if (form.$valid) lastValidVal = newVal;
                        debounceSave(field, newVal);
                    }
                });

                if (!$scope.autoSaving) $scope.autoSaving = {};
                if (!$scope.autoSaving[field]) $scope.autoSaving[field] = {};
                if (!$scope.autoSaving[field][key]) $scope.autoSaving[field][key] = false;

                if (!$scope.autoSaved) $scope.autoSaved = {};
                if (!$scope.autoSaved[field]) $scope.autoSaved[field] = {};
                if (!$scope.autoSaved[field][key]) $scope.autoSaved[field][key] = false;
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
                        //console.log(autoSaveCtrl.autoSaveFn);
                        autoSaveCtrl.autoSaveFn(col, value, key).then(
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
                    } catch (e) {
                        console.log('error in auto-save. col:', col, '; value:', value, '; key:', key);
                        console.log(e.stack);
                    }
                } else {
                    autoSaveCtrl.changeSavedVisibility(col, false);
                    cb();
                }
            }

        }
    }
}

export function autoSavingDirective(): angular.IDirective {
    return {
        restrict: 'A',
        require: '^autoSave',
        link: function ($scope, $elem, $attrs: any, autoSaveCtrl: AutoSaveController) {
            $elem.addClass('ng-hide');
            autoSaveCtrl.registerSavingEl($attrs.autoSaving, $elem);
        }
    }
}

export function autoSavedDirective(): angular.IDirective {
    return {
        restrict: 'A',
        require: '^autoSave',
        link: function ($scope, $elem, $attrs: any, autoSaveCtrl: AutoSaveController) {
            $elem.addClass('ng-hide');
            autoSaveCtrl.registerSavedEl($attrs.autoSaved, $elem);
        }
    }
}

autoSaveModule.directive('autoSave', autoSaveDirective);
autoSaveModule.directive('autoSaveField', autoSaveFieldDirective);
autoSaveModule.directive('autoSaving', autoSavingDirective);
autoSaveModule.directive('autoSaved', autoSavedDirective);
