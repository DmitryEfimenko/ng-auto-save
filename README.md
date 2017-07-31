ng-auto-save
====================

Set of angularjs directives to save inputs' values as user types

Installation:
-------------
via NPM: `npm install ng-auto-save`

*Reference module in your app*
```javascript
angular.module('app', ['ng-auto-save']);
```

Demo:
-------------
[Plunker Live Demo](https://plnkr.co/edit/XrDKGgWtUjgR2XEG28Wx?p=preview) - Exchange with the database is imitated.

Example:
-------------
All you have to do in the controller is to provide a function to save record. This must return a promise and it takes three arguments:
* **`field`** - corresponds to the column in the table in database that will be updated
* **`val`** - new value to save
* **`key`** - the constraint that usually goes in the the `where` clause of the sql update statement

**index.js - inside Controller:**
```javascript
$scope.updateField = function (field, val, key) {
    return $http.post('/api/article/update', { id: key, field: field, val: val })
        .success(function () {
            articleRef[field] = $scope.article[field];
        })
        .error(function(error) {
            console.log(error);
        });
};
```

**index.html:**
Example uses [angular-material](https://material.angularjs.org/#/), [ng-messages](https://docs.angularjs.org/api/ngMessages/directive/ngMessages), [font-awesome](http://fortawesome.github.io/Font-Awesome/)
```html
<form name="formEditArticle" novalidate auto-save="updateField" auto-save-key="article.id" auto-save-debounce="1000">
    <md-content layout="column">
        <div layout="row" layout-align="start center">
            <md-input-container>
                <label>Name</label>
                <input ng-model="article.name" required auto-save-field="name" name="article.name">
            </md-input-container>
            <span class="fa fa-gear fa-spin" auto-saving="name"></span>
            <span class="fa fa-check-square-o" auto-saved="name"></span>
        </div>

        <div ng-messages for="formEditArticle['article.name'].$error">
            <span ng-message when="required">Name is required</span>
        </div>
    </md-content>
</form>
```
**Explanation of directives used:**
* **`auto-save="updateField"`** - must be applied to the `<form>`. It takes the name of the function used to save record.
* **`auto-save-key="article.id"`** - `article.id` here is the primary key in the table Articles. If it is undefined, the `auto-save` function will not execute (thus making it easy to customize insert functionality).
* **`auto-save-debounce="1000"`** - specify how long to wait for input before saving
* **`auto-save-field="name"`** - must be applied to an input with attribute `ng-model`. The "name" here is the name of the column in the table to be updated.
* **`auto-saving="name"`** - apply this directive to an element that you want to show up when saving is in progress. The value of the attribute must be set to the value of 'auto-save-field' applied to the corresponding input
* **`auto-saved="name"`** - apply this directive to an element that you want to show up when saving is in complete successfully. The value of the attribute must be set to the value of 'auto-save-field' applied to the corresponding input

**Server side implementation**
Example for [NodeJs](http://nodejs.org/) as a web server using [express.js](http://expressjs.com/) and [PostgreSql](http://www.postgresql.org/) as a database.

Set Route:
```javascript
router.post('/api/article/update', routes.api.articleUpdateField);
```
Implementation for route:
```javascript
var query = require('pg-query');
var squel = require("squel");
squel.useFlavour('postgres');
var sqlOptions = { autoQuoteAliasNames: false };
query.connectionParameters = 'postgres://postgres:mypassword@localhost:5432/Articles'; // example connection

exports.articleUpdateField = function (req, res) {
    var id = parseInt(req.body.id);

    if (id) {
        var sql = squel.update()
            .table('tblArticles')
            .set(req.body.field, req.body.val)
            .where('id = ?', id)
            .toParam();

        query(sql.text, sql.values, function(err, rows, result) {
            if (err) {
                console.log(err);
                res.status(500).end();
            } else {
                res.end();
            }
        });
    } else {
        res.status(500).end();
    }
};
```

Credits
-------------
Inspired by an article written by Adam Albrecht: "[How to Auto-Save your model in Angular.js using $watch and a Debounce function.](http://adamalbrecht.com/2013/10/30/auto-save-your-model-in-angular-js-with-watch-and-debounce/)"
