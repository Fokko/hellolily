/**
 * contactControllers is a container for all contact related Controllers
 */
var dashboard = angular.module('dashboardControllers', [
    'dashboardDirectives',
    'ui.slimscroll',
    'userServices'
]);

dashboard.controller('DashboardController', ['$scope', function ($scope) {

}]);

dashboard.controller('UnreadEmailController', [
    '$scope',
    'EmailAccount',
    'EmailMessage',
    function($scope, EmailAccount, EmailMessage) {

        var filterquery = ['read:false AND label_id:INBOX'];

        EmailMessage.SEARCH.get({
            filterquery: filterquery
        }, function (data) {
            $scope.emailMessages = data.hits;
            //$scope.table.totalItems = data.total;
        });
    }
]);

dashboard.controller('MyCasesController', ['$scope', 'Case', function ($scope, Case) {
    Case.getMyCasesWidget().then(function (data) {
        $scope.mycases = data;
    });
}]);

dashboard.controller('CallbackRequestsController', [
    '$scope',
    'Case',
    function ($scope, Case) {
        Case.getCallbackRequests().then(function (data) {
            $scope.callbackRequests = data.callbackRequests;
        });
    }
]);

/**
 * Controller for the UnassignedCases dashboard widget(s), which shows
 * a widget per team for unassigned cases.
 */
dashboard.controller('UnassignedCasesController', [
    '$scope',
    'UserTeams',
    'UnassignedTeamCases',
    function($scope, UserTeams, UnassignedTeamCases) {

        UserTeams.query(function(teams) {
            $scope.teams = teams;

            teams.forEach(function(team, i) {
                UnassignedTeamCases.query({teamId: team.id}, function(cases) {
                    teams[i].cases = cases;
                })
            })
        })

    }
]);
