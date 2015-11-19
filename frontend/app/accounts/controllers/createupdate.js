/**
 * Router definition.
 */
angular.module('app.accounts').config(accountConfig);

accountConfig.$inject = ['$stateProvider'];
function accountConfig($stateProvider) {
    $stateProvider.state('base.accounts.create', {
        url: '/create',
        views: {
            '@': {
                templateUrl: 'accounts/controllers/form_outer.html',
                controller: AccountCreateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Create',
        },
    });

    $stateProvider.state('base.accounts.detail.edit', {
        url: '/edit',
        views: {
            '@': {
                templateUrl: 'accounts/controllers/form_outer.html',
                controller: AccountCreateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Edit',
        },
    });
}

/**
 * Controller to create a new account.
 */
angular.module('app.accounts').controller('AccountCreateController', AccountCreateController);

AccountCreateController.$inject = ['$scope', '$state', '$stateParams', 'Account', 'User', 'HLFields', 'HLForms'];
function AccountCreateController($scope, $state, $stateParams, Account, User, HLFields, HLForms) {
    var vm = this;
    vm.account = {};
    vm.people = [];
    vm.tags = [];
    vm.errors = {
        name: [],
    };
    vm.useDuplicateWebsite = false;


    vm.checkDomainForDuplicates = checkDomainForDuplicates;
    vm.loadDataproviderData = loadDataproviderData;
    vm.saveAccount = saveAccount;
    vm.cancelAccountCreation = cancelAccountCreation;
    vm.addRelatedField = addRelatedField;
    vm.removeRelatedField = removeRelatedField;

    activate();

    ////

    function activate() {
        User.query().$promise.then(function(userList) {
            angular.forEach(userList, function(user) {
                vm.people.push({
                    id: user.id,
                    // Convert to single string so searching with spaces becomes possible
                    name: _getFullName(user),
                });
            });
        });

        $scope.conf.pageTitleSmall = 'change is natural';

        _getAccount();
    }

    function _getAccount() {
        // Fetch the account or create empty account
        if ($stateParams.id) {
            $scope.conf.pageTitleBig = 'Edit account';
            Account.get({id: $stateParams.id}).$promise.then(function(account) {
                vm.account = account;
                angular.forEach(account.websites, function(website) {
                    if (website.is_primary) {
                        vm.account.primaryWebsite = website.website;
                    }
                });
                if (!vm.account.primaryWebsite || vm.account.primaryWebsite === '') {
                    vm.account.primaryWebsite = '';
                }

                if (vm.account.tags.length) {
                    var tags = [];
                    angular.forEach(account.tags, function(tag) {
                        tags.push(tag.name);
                    });
                    vm.account.tags = tags;
                }

                vm.account.assigned_to = vm.account.assigned_to.id;

                $scope.conf.pageTitleBig = vm.account.name;
            });
        } else {
            $scope.conf.pageTitleBig = 'New account';
            vm.account = Account.create();
            User.me().$promise.then(function(user) {
                vm.account.assigned_to = user.id;
            });

            if ($scope.emailSettings) {
                if ($scope.emailSettings.website) {
                    vm.account.primaryWebsite = $scope.emailSettings.website;

                    vm.account.getDataproviderInfo($scope.emailSettings.website).then(function() {
                        if (!vm.account.name) {
                            var company = $scope.emailSettings.website.split('.').slice(0, -1).join(' ');
                            vm.account.name = company.charAt(0).toUpperCase() + company.slice(1);
                        }
                    });
                }
            }
        }
    }

    function _getFullName(user) {
        // $.grep removes values that are empty so the .join doesn't have double spaces
        return $.grep([user.first_name, user.preposition, user.last_name], Boolean).join(' ');
    }

    function checkDomainForDuplicates(form) {
        var website = vm.account.primaryWebsite;
        var domain;

        if (website) {
            domain = getDomain(website);

            if (vm.useDuplicateWebsite) {
                if (form) {
                    vm.saveAccount(form);
                } else {
                    vm.loadDataproviderData();
                }
            } else {
                Account.searchByWebsite({website: domain}).$promise.then(function(result) {
                    if (result.data && result.data.id != $stateParams.id) {
                        bootbox.dialog({
                            message: 'This website has already been added to an existing account: <br />' +
                            result.data.name + '<br />' +
                            'Are you sure you want to use: <br />' +
                            website,
                            title: 'Website already exists',
                            buttons: {
                                danger: {
                                    label: 'No, clear the field.',
                                    className: 'btn-danger',
                                    callback: function() {
                                        vm.account.primaryWebsite = null;
                                        vm.useDuplicateWebsite = false;
                                        $scope.$apply();
                                    },
                                },
                                success: {
                                    label: 'Yes',
                                    className: 'btn-success',
                                    callback: function() {
                                        if (form) {
                                            vm.saveAccount(form);
                                        } else {
                                            vm.loadDataproviderData();
                                            vm.useDuplicateWebsite = true;
                                        }
                                    },
                                },
                            },
                        });
                    } else {
                        if (form) {
                            vm.saveAccount(form);
                        } else {
                            vm.loadDataproviderData();
                        }
                    }
                });
            }
        }
    }

    function loadDataproviderData() {
        toastr.info('Running around the world to fetch info', 'Here we go');
        vm.account.getDataproviderInfo(vm.account.primaryWebsite).then(function() {
            toastr.success('Got it!', 'Whoohoo');
        }, function() {
            toastr.error('I couldn\'t find any data', 'Sorry');
        });
    }

    function addRelatedField(field) {
        HLFields.addRelatedField(vm.account, field);
    }

    function removeRelatedField(field, index, remove) {
        HLFields.removeRelatedField(vm.account, field, index, remove);
    }

    function cancelAccountCreation() {
        if ($scope.emailSettings.sidebar.form === 'createAccount') {
            $scope.emailSettings.sidebar.form = null;
            $scope.emailSettings.sidebar.account = false;
        } else {
            $state.go('base.accounts');
        }
    }

    function saveAccount(form) {
        HLForms.blockUI();

        var primaryWebsite = vm.account.primaryWebsite;
        // Make sure it's not an empty website being added
        if (primaryWebsite && primaryWebsite !== 'http://' && primaryWebsite !== 'https://') {
            var exists = false;
            angular.forEach(vm.account.websites, function(website) {
                if (website.is_primary) {
                    website.website = primaryWebsite;
                    exists = true;
                }
            });

            if (!exists) {
                vm.account.websites.unshift({website: primaryWebsite, is_primary: true});
            }
        }

        // If the account is edited and the assigned to isn't changed, it's an object
        // So if that's the case get the id and set 'assigned_to' to that value
        if (typeof vm.account.assigned_to === 'object' && vm.account.assigned_to && vm.account.assigned_to.id) {
            vm.account.assigned_to = vm.account.assigned_to.id;
        }

        if (vm.account.tags && vm.account.tags.length) {
            var tags = [];
            angular.forEach(vm.account.tags, function(tag) {
                if (tag) {
                    tags.push({name: (tag.name) ? tag.name : tag});
                }
                vm.account.tags = tags;
            });
        }

        // Clear all errors of the form (in case of new errors)
        angular.forEach(form, function(value, key) {
            if (typeof value === 'object' && value.hasOwnProperty('$modelValue')) {
                form[key].$error = {};
                form[key].$setValidity(key, true);
            }
        });

        vm.account = HLFields.cleanRelatedFields(vm.account, 'account');

        if (vm.account.id) {
            // If there's an ID set it means we're dealing with an existing account, so update it
            vm.account.$update(function() {
                toastr.success('I\'ve updated the account for you!', 'Done');
                $state.go('base.accounts.detail', {id: vm.account.id}, {reload: true});
            }, function(response) {
                _handleBadResponse(response, form);
            });
        } else {
            vm.account.$save(function() {
                toastr.success('I\'ve saved the account for you!', 'Yay');
                if ($scope.emailSettings.sidebar.form === 'createAccount') {
                    if (!$scope.emailSettings.contactId) {
                        $scope.emailSettings.sidebar.form = 'createContact';
                        $scope.emailSettings.account = vm.account;
                    } else {
                        $scope.emailSettings.sidebar.account = true;
                        $scope.emailSettings.sidebar.form = null;
                    }

                    $scope.emailSettings.accountId = vm.account.id;
                } else {
                    $state.go('base.accounts.detail', {id: vm.account.id});
                }
            }, function(response) {
                _handleBadResponse(response, form);
            });
        }
    }

    function _handleBadResponse(response, form) {
        // Set error of the first website as the primary website error
        if (vm.account.primaryWebsite && response.data.websites && response.data.websites.length) {
            response.data.primaryWebsite = response.data.websites.shift()['website'];
        }

        HLForms.setErrors(form, response.data);

        toastr.error('Uh oh, there seems to be a problem', 'Oops!');
    }

    function getHostName(url) {
        var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);

        if (match !== null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
            return match[2];
        } else {
            return url;
        }
    }

    function getDomain(url) {
        var hostName = getHostName(url);
        var domain = hostName;
        var parts;

        if (hostName !== null) {
            parts = hostName.split('.').reverse();

            if (parts !== null && parts.length > 1) {
                domain = parts[1] + '.' + parts[0];

                if (hostName.toLowerCase().indexOf('.co.uk') !== -1 && parts.length > 2) {
                    domain = parts[2] + '.' + domain;
                }
            }
        }

        return domain;
    }
}
