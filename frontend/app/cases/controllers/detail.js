angular.module('app.cases').config(caseConfig);

caseConfig.$inject = ['$stateProvider'];
function caseConfig($stateProvider) {
    $stateProvider.state('base.cases.detail', {
        url: '/{id:[0-9]{1,}}',
        views: {
            '@': {
                templateUrl: 'cases/controllers/detail.html',
                controller: CaseDetailController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: '{{ case.subject }}',
        },
        resolve: {
            caseItem: ['CaseDetail', '$stateParams', function(CaseDetail, $stateParams) {
                var id = $stateParams.id;
                return CaseDetail.get({id: id}).$promise;
            }],
        },
    });
}

angular.module('app.cases').controller('CaseDetailController', CaseDetailController);

CaseDetailController.$inject = ['$http', '$scope', '$stateParams', 'Settings', 'Account', 'CaseStatuses', 'caseItem', 'Contact', 'UserTeams'];
function CaseDetailController($http, $scope, $stateParams, Settings, Account, CaseStatuses, caseItem, Contact, UserTeams) {
    var vm = this;
    var id = $stateParams.id;

    Settings.page.setAllTitles('detail', caseItem.subject);

    vm.case = caseItem;
    vm.caseStatuses = CaseStatuses.query();

    vm.getPriorityDisplay = getPriorityDisplay;
    vm.changeCaseStatus = changeCaseStatus;
    vm.assignCase = assignCase;
    vm.archive = archive;
    vm.unarchive = unarchive;

    activate();

    //////

    function activate() {
        if (vm.case.account) {
            Account.get({id: vm.case.account}).$promise.then(function(account) {
                vm.account = account;
            });
        }

        if (vm.case.contact) {
            Contact.get({id: vm.case.contact}).$promise.then(function(contact) {
                vm.contact = contact;
            });
        }

        var assignedToGroups = [];

        angular.forEach(vm.case.assigned_to_groups, function(groupId) {
            UserTeams.get({id: groupId}).$promise.then(function(team) {
                assignedToGroups.push(team);
            });
        });

        vm.case.assigned_to_groups = assignedToGroups;
    }

    /**
     *
     * @returns {string}: A string which states what label should be displayed
     */
    function getPriorityDisplay() {
        if (vm.case.is_archived) {
            return 'label-default';
        } else {
            switch (vm.case.priority) {
                case 0:
                    return 'label-success';
                case 1:
                    return 'label-info';
                case 2:
                    return 'label-warning';
                case 3:
                    return 'label-danger';
                default :
                    return 'label-info';
            }
        }
    }

    function changeCaseStatus(status) {
        // TODO: LILY-XXX: Temporary call to change status of a case, will be replaced with an new API call later
        var req = {
            method: 'POST',
            url: '/cases/update/status/' + vm.case.id + '/',
            data: 'status=' + status,
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        };

        $http(req).
            success(function(data, status, headers, config) {
                vm.case.status = data.status;
            }).
            error(function(data, status, headers, config) {
                // Request failed proper error?
            });
    }

    function assignCase() {
        var assignee = '';

        if (vm.case.assigned_to_id !== currentUser.id) {
            assignee = currentUser.id;
        }

        var req = {
            method: 'POST',
            url: '/cases/update/assigned_to/' + vm.case.id + '/',
            data: 'assignee=' + assignee,
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        };

        $http(req).
            success(function(data, status, headers, config) {
                if (data.assignee) {
                    vm.case.assigned_to_id = data.assignee.id;
                    vm.case.assigned_to_name = data.assignee.name;
                } else {
                    vm.case.assigned_to_id = null;
                    vm.case.assigned_to_name = null;
                }

                $scope.loadNotifications();
            }).
            error(function(data, status, headers, config) {
                // Request failed propper error?
            });
    }

    /**
     * Archive a deal.
     * TODO: LILY-XXX: Change to API based archiving
     */
    function archive(id) {
        var req = {
            method: 'POST',
            url: '/cases/archive/',
            data: 'id=' + id,
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        };

        $http(req).
            success(function(data, status, headers, config) {
                vm.case.status = data.status;
                vm.case.archived = true;
            }).
            error(function(data, status, headers, config) {
                // Request failed propper error?
            });
    }

    /**
     * Unarchive a deal.
     * TODO: LILY-XXX: Change to API based unarchiving
     */
    function unarchive(id) {
        var req = {
            method: 'POST',
            url: '/cases/unarchive/',
            data: 'id=' + id,
            headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}
        };

        $http(req).
            success(function(data, status, headers, config) {
                vm.case.archived = false;
            }).
            error(function(data, status, headers, config) {
                // Request failed proper error?
            });
    }
}
