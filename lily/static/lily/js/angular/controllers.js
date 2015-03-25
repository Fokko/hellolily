/**
 * caseControllers is a container for all case related Controllers
 */
var lilyControllers = angular.module('lilyControllers', []);

lilyControllers.config(['$stateProvider', function($stateProvider) {
    $stateProvider.state('base', {
        abstract: true,
        controller: 'baseController'
    });
}]);

/**
 * BaseController is the controller where all the default things are loaded
 *
 */
lilyControllers.controller('baseController', [
    '$scope',

    function($scope) {
        $scope.conf = {
            pageTitleBig: 'HelloLily',
            pageTitleSmall: 'welcome to my humble abode!'
        };

        //$scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        //    console.log('Starting the state change');
        //});
        //
        //$scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        //    console.log('The state has been changed');
        //});

        $scope.$on('$viewContentLoaded', function() {
            Metronic.initComponents(); // init core components
            HLSelect2.init();
            HLFormsets.init();
            HLShowAndHide.init();
        });
    }
]);

lilyControllers.controller('headerController', [
    '$scope',

    function($scope) {
        $scope.$on('$includeContentLoaded', function() {
            Layout.initHeader(); // init header
        });
    }
]);

lilyControllers.controller('sidebarController', [
    '$scope',

    function($scope) {
        $scope.$on('$includeContentLoaded', function() {
            Layout.initSidebar(); // init sidebar
        });
    }
]);
