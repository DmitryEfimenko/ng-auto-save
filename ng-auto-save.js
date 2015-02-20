'use strict';

/*
  * Source: https://github.com/DmitryEfimenko/ng-auto-save
*/

angular.module('ng-auto-save', [])
    .directive('autoSave', ['$timeout',
        function ($timeout) {
            var fields = [];
            var savingEls = [];
            var savedEls = [];

            return {
                restrict: 'A',
                require: 'form',
                controller: function() {
                    this.registerField = function(ngModel, field, el) {
                        fields.push({ ngModel: ngModel, field: field, el: el });
                    };
                    this.registerSavingEl = function(key, el) {
                        savingEls.push({ key: key, el: el });
                    };
                    this.registerSavedEl = function(key, el) {
                        savedEls.push({ key: key, el: el });
                    };
                },
                link: function ($scope, $elem, $attrs, $form) {
                    var debounce = $attrs.autoSaveDebounce;
                    var timeout = null;

                    for (var i = 0, l = fields.length; i < l; i++) {
                        var field = fields[i];
                        
                        $scope.$watch(field.ngModel, function(newVal, oldVal) {
                            if (newVal != oldVal && (!field.lastValidVal || newVal != field.lastValidVal )) {
                                if ($form.$valid) field.lastValidVal = newVal;
                                debounceSave(field.field, newVal, field.ngModel);
                            }
                        });
                    }
                
                    function debounceSave(prop, value, key) {
                        if (debounce) {
                            if (timeout) {
                                $timeout.cancel(timeout);
                            }
                            timeout = $timeout(function() {
                                save(prop, value, key);
                            }, debounce);
                        } else {
                            save(prop, value, key);
                        }
                    }

                    function save(prop, value, key) {
                        if ($form.$valid) {
                            changeVisibility(savingEls, key, true);
                            changeVisibility(savedEls, key, false);
                            changeEnabled(fields, key, false);

                            $scope[$attrs.autoSave](prop, value).then(
                                function() {
                                    changeVisibility(savingEls, key, false);
                                    changeVisibility(savedEls, key, true);
                                    changeEnabled(fields, key, true);
                                },
                                function(error) {
                                    console.log(error);
                                    changeVisibility(savingEls, key, false);
                                    changeEnabled(fields, key, true);
                                }
                            );
                        } else {
                            changeVisibility(savedEls, key, false);
                            changeEnabled(fields, key, true);
                        }
                    }

                    function changeVisibility(elArr, key, shouldShow) {
                        for (var j = 0, jl = elArr.length; j < jl; j++) {
                            if (elArr[j].key == key) {
                                if(shouldShow)
                                    elArr[j].el.removeClass('ng-hide');
                                else
                                    elArr[j].el.addClass('ng-hide');
                                break;
                            }
                        }
                    }

                    function changeEnabled(elArr, key, shouldEnable) {
                        for (var j = 0, jl = elArr.length; j < jl; j++) {
                            if (elArr[j].ngModel == key) {
                                if(shouldEnable)
                                    elArr[j].el.removeAttr('disabled');
                                else
                                    elArr[j].el.attr('disabled', 'disabled');
                                break;
                            }
                        }
                    }
                }
            };
        }
    ])
    .directive('autoSaveField', [
        function () {
            return {
                restrict: 'A',
                require: ['^autoSave', 'ngModel'],
                link: function ($scope, $elem, $attrs, $ctrls) {
                    var autoSaveCtrl = $ctrls[0];
                    autoSaveCtrl.registerField($attrs.ngModel, $attrs.autoSaveField, $elem);
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
