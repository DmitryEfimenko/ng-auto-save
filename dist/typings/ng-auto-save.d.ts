declare var autoSaveModule: ng.IModule;
declare function autoSaveDirective(): angular.IDirective;
declare class AutoSaveController {
    private $scope;
    private $attrs;
    private savingEls;
    private savedEls;
    key: string;
    autoSaveFnName: string;
    autoSaveFn: (col: string, value: any, key: any) => ng.IPromise<any>;
    debounce: number;
    static $inject: string[];
    constructor($scope: any, $element: any, $attrs: any);
    registerSavingEl(col: any, el: any): void;
    registerSavedEl(col: any, el: any): void;
    changeSavingVisibility(col: any, shouldShow: any): void;
    changeSavedVisibility(col: any, shouldShow: any): void;
    private changeVisibility(elArr, col, shouldShow);
    private getAutoSaveFunction();
    private keyReady();
}
declare function autoSaveFieldDirective($timeout: any): angular.IDirective;
declare function autoSavingDirective(): angular.IDirective;
declare function autoSavedDirective(): angular.IDirective;
