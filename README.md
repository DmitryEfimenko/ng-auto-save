ng-auto-save
====================

Set of directives to save inputs' values as user types

Installation:
-------------
*Reference module in your app*
```
angular.module('app', ['ng-auto-save']);
```

Demo:
-------------
TODO

Example:
-------------

**index.js - inside Controller:**
```
// function that is used by auto-save directive. It must return a promise and it takes two arguments:
// field - corresponds to the column in the table in database that will be updated
// val - new value to save
// it's assumed that the key for the "where" clause is available in controller
$scope.updateField = function (field, val) {
	var deferred = $q.defer();

	if ($scope.article.id) {
		return $http.post('/api/article/update', { id: $scope.article.id, field: field, val: val })
			.success(function () {
				articleRef[field] = $scope.article[field];
			})
			.error(function(error) {
				console.log(error);
			});
	} 
	deferred.reject();
	return deferred.promise;
};
```

**index.html:** Example using anuglar-material
```
<form name="formEditArticle" novalidate auto-save="updateField" auto-save-debounce="1000">
	<md-content layout="column">
		<div layout="row" layout-align="start center">
			<md-input-container>
				<label>Name</label>
				<input ng-model="article.name" required auto-save-field="name" name="article.name">
			</md-input-container>
			<span class="fa fa-gear fa-spin" auto-saving="article.name"></span>
			<span class="fa fa-check-square-o" auto-saved="article.name"></span>
		</div>

		<div ng-messages for="formEditArticle['article.name'].$error">
			<span ng-message when="required">Name is required</span>
		</div>
	</md-content>
</form>
```
**Explanation of directives used:
* `auto-save="updateField"` - must be applied to the `<form>`. It takes the name of the function used to save record.
* `auto-save-debounce="1000"` - specify how long to wait for input before saving
* `auto-save-field="name"` - must be applied to an input with attribute `ng-model`. The "name" here is the name of the column in the table to be updated.
* `auto-saving="article.name"` - apply this directive to an element that you want to show up when saving is in progress. The value of the attribute must be set to the value of 'ng-model' applied to the corresponding input
* `auto-saved="article.name"` - apply this directive to an element that you want to show up when saving is in complete successfully. The value of the attribute must be set to the value of 'ng-model' applied to the corresponding input

Credits
-------------
Inspired by an article written by Adam Albrecht: ["How to Auto-Save your model in Angular.js using $watch and a Debounce function."](http://adamalbrecht.com/2013/10/30/auto-save-your-model-in-angular-js-with-watch-and-debounce/)
