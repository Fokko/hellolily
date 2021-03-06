angular.module('app.cases').config(caseConfig);

caseConfig.$inject = ['$stateProvider'];
function caseConfig($stateProvider) {
    $stateProvider.state('base.cases.create', {
        url: '/create',
        views: {
            '@': {
                templateUrl: 'cases/controllers/form.html',
                controller: CaseCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Create',
        },
    });

    $stateProvider.state('base.cases.create.fromContact', {
        url: '/contact/{contactId:[0-9]{1,}}',
        views: {
            '@': {
                templateUrl: 'cases/controllers/form.html',
                controller: CaseCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            skip: true,
        },
    });

    $stateProvider.state('base.cases.create.fromAccount', {
        url: '/account/{accountId:[0-9]{1,}}',
        views: {
            '@': {
                templateUrl: 'cases/controllers/form.html',
                controller: CaseCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            skip: true,
        },
    });

    $stateProvider.state('base.cases.detail.edit', {
        url: '/edit',
        views: {
            '@': {
                templateUrl: 'cases/controllers/form.html',
                controller: CaseCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Edit',
        },
    });
}

angular.module('app.cases').controller('CaseCreateUpdateController', CaseCreateUpdateController);

CaseCreateUpdateController.$inject = ['$scope', '$state', '$stateParams', 'Account', 'Case', 'Contact', 'ContactDetail',
    'HLForms', 'HLSearch', 'HLUtils', 'Settings', 'UserTeams', 'User'];
function CaseCreateUpdateController($scope, $state, $stateParams, Account, Case, Contact, ContactDetail, HLForms,
                                    HLSearch, HLUtils, Settings, UserTeams, User) {
    var vm = this;

    vm.case = {};
    vm.teams = [];
    vm.assignOptions = [];
    vm.caseTypes = [];
    vm.caseStatuses = [];
    vm.casePriorities = [];
    vm.datepickerOptions = {
        startingDay: 1,
    };
    vm.configCaseType = 0;

    vm.assignToMe = assignToMe;
    vm.cancelCaseCreation = cancelCaseCreation;
    vm.saveCase = saveCase;
    vm.refreshAccounts = refreshAccounts;
    vm.refreshContacts = refreshContacts;

    activate();

    ////

    function activate() {
        _getAssignOptions();
        _getTeams();

        Case.caseTypes(function(data) {
            vm.caseTypes = data;

            angular.forEach(data, function(caseType) {
                if (caseType.type.indexOf('Config') > -1) {
                    vm.configCaseType = caseType.id;
                }
            });
        });

        Case.caseStatuses(function(data) {
            vm.caseStatuses = data;

            vm.case.status = vm.caseStatuses[0];
        });

        vm.casePriorities = Case.casePriorities;

        //TODO: This should be an API call.
        vm.parcelProviders = [
            {id: 1, name: 'DPD'},
        ];

        _getCase();
    }

    function _getCase() {
        // Fetch the case or create an empty one.
        if ($stateParams.id) {
            Case.get({id: $stateParams.id}).$promise.then(function(lilyCase) {
                vm.case = lilyCase;

                Settings.page.setAllTitles('edit', lilyCase.subject);
            });
        } else {
            Settings.page.setAllTitles('create', 'case');
            vm.case = Case.create();

            if ($stateParams.accountId) {
                Account.get({id: $stateParams.accountId}).$promise.then(function(account) {
                    vm.case.account = account;
                });
            }

            if ($stateParams.contactId) {
                Contact.get({id: $stateParams.contactId}).$promise.then(function(contact) {
                    vm.case.contact = contact;
                    // API returns 'full_name' but ES returns 'name'. So get the full name and set the name.
                    vm.case.contact.name = contact.full_name;

                    if (vm.case.contact.accounts && vm.case.contact.accounts.length === 1) {
                        // Automatically fill in the account the contact works at.
                        vm.case.account = vm.case.contact.accounts[0];
                    }
                });
            }

            if (Settings.email.data && (Settings.email.data.account || Settings.email.data.contact)) {
                // Auto fill data if it's available.
                if (Settings.email.data.contact.id) {
                    if (Settings.email.data && Settings.email.data.account) {
                        var filterquery = 'accounts.id:' + Settings.email.data.account.id;

                        ContactDetail.query({filterquery: filterquery}).$promise.then(function(colleagues) {
                            var colleagueIds = [];
                            angular.forEach(colleagues, function(colleague) {
                                colleagueIds.push(colleague.id);
                            });

                            // Check if the contact actually works at the account.
                            if (colleagueIds.indexOf(Settings.email.data.contact.id) > -1) {
                                vm.case.contact = Settings.email.data.contact.id;
                            }
                        });
                    } else {
                        vm.case.contact = Settings.email.data.contact.id;
                    }
                }

                if (Settings.email.data && Settings.email.data.account) {
                    vm.case.account = Settings.email.data.account.id;
                }
            }

            if (Settings.email.sidebar.form) {
                vm.startsAt = 1;
            } else {
                vm.startsAt = 0;
            }
        }
    }

    $scope.$watch('vm.case.priority', function() {
        var daysToAdd = [5, 3, 1, 0];
        vm.case.expires = HLUtils.addBusinessDays(daysToAdd[vm.case.priority]);
    });

    function _getAssignOptions() {
        var assignOptions = [];

        User.query().$promise.then(function(response) {
            angular.forEach(response.results, function(user) {
                if (user.first_name !== '') {
                    assignOptions.push({
                        id: user.id,
                        // Convert to single string so searching with spaces becomes possible.
                        name: HLUtils.getFullName(user),
                    });
                }
            });

            vm.assignOptions = assignOptions;
        });
    }

    function _getTeams() {
        UserTeams.query().$promise.then(function(response) {
            vm.teams = response.results;
        });
    }

    function assignToMe() {
        vm.case.assigned_to = currentUser.id;
    }

    function cancelCaseCreation() {
        if (Settings.email.sidebar.form === 'cases') {
            Settings.email.sidebar.form = null;
            Settings.email.sidebar.case = false;
        } else {
            $state.go('base.cases');
        }
    }

    function saveCase(form, archive) {
        if (!_caseFormIsValid()) {
            return false;
        }

        HLForms.blockUI();

        if (vm.case.id) {
            // TODO: Hopefully temporary fix to allow clearing these fields.
            // Because the API doesn't see missing fields as cleared.
            if (!vm.case.account) {
                vm.case.account = null;
            }

            if (!vm.case.contact) {
                vm.case.contact = null;
            }

            if (!vm.case.assigned_to) {
                vm.case.assigned_to = null;
            }
        }

        // Clear all errors of the form (in case of new errors).
        angular.forEach(form, function(value, key) {
            if (typeof value === 'object' && value.hasOwnProperty('$modelValue')) {
                form[key].$error = {};
                form[key].$setValidity(key, true);
            }
        });

        if (archive) {
            vm.case.is_archived = true;
        }

        vm.case.expires = moment(vm.case.expires).format('YYYY-MM-DD');

        // clean modifies the object, so preserve the state by copying the object (in case of errors).
        var cleanedCase = HLForms.clean(angular.copy(vm.case));

        if (cleanedCase.id) {
            // If there's an ID set it means we're dealing with an existing contact, so update it.
            cleanedCase.$update(function() {
                toastr.success('I\'ve updated the case for you!', 'Done');
                $state.go('base.cases.detail', {id: cleanedCase.id}, {reload: true});
            }, function(response) {
                _handleBadResponse(response, form);
            });
        } else {
            cleanedCase.$save(function() {
                toastr.success('I\'ve saved the case for you!', 'Yay');

                if (Settings.email.sidebar.form === 'cases') {
                    Settings.email.sidebar.form = null;

                    Metronic.unblockUI();
                } else {
                    $state.go('base.cases.detail', {id: cleanedCase.id});
                }
            }, function(response) {
                _handleBadResponse(response, form);
            });
        }
    }

    function _handleBadResponse(response, form) {
        HLForms.setErrors(form, response.data);

        toastr.error('Uh oh, there seems to be a problem', 'Oops!');
    }

    $scope.$watch('vm.case.account', function() {
        // Get contacts that work for the selected account.
        refreshContacts('');
    });

    $scope.$watch('vm.case.contact', function() {
        if (vm.case.contact && vm.case.contact.accounts && vm.case.contact.accounts.length) {
            // Get accounts that the select contact works for.
            vm.accounts = vm.case.contact.accounts;
        } else {
            // Just get the accounts list.
            vm.accounts = null;
            refreshAccounts('');
        }
    });

    function refreshAccounts(query) {
        // Don't load if we selected a contact.
        // Because we want to display all accounts the contact works for.
        if (!vm.case.contact && (!vm.accounts || query.length)) {
            vm.accounts = HLSearch.refreshList(query, 'Account');
        }
    }

    function refreshContacts(query) {
        var accountQuery = '';

        if (vm.case.account) {
            if (query.length >= 2) {
                accountQuery += ' AND ';
            }

            // Only show contacts of the selected account.
            accountQuery += 'accounts.id:' + vm.case.account.id;
        }

        vm.contacts = HLSearch.refreshList(query, 'Contact', null, accountQuery);
    }

    function _caseFormIsValid() {
        if (!vm.case.account && !vm.case.contact) {
            bootbox.dialog({
                message: 'Please select an account or contact the case belongs to',
                title: 'No account or contact',
                buttons: {
                    success: {
                        label: 'Let me fix that for you',
                        className: 'btn-success',
                    },
                },
            });

            return false;
        } else if ((vm.case.assigned_to_groups && !vm.case.assigned_to_groups.length) && !vm.case.assigned_to) {
            bootbox.dialog({
                message: 'Please select a colleague or team to assign the case to',
                title: 'No assignee set',
                buttons: {
                    success: {
                        label: 'Let me fix that for you',
                        className: 'btn-success',
                    },
                },
            });

            return false;
        }

        return true;
    }
}
