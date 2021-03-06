/**
 * Router definition.
 */
angular.module('app.contacts').config(contactConfig);

contactConfig.$inject = ['$stateProvider'];
function contactConfig($stateProvider) {
    $stateProvider.state('base.contacts.create', {
        url: '/create',
        views: {
            '@': {
                templateUrl: 'contacts/controllers/form.html',
                controller: ContactCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Create',
        },
    });

    $stateProvider.state('base.contacts.detail.edit', {
        url: '/edit',
        views: {
            '@': {
                templateUrl: 'contacts/controllers/form.html',
                controller: ContactCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            label: 'Edit',
        },
    });

    $stateProvider.state('base.contacts.create.fromAccount', {
        url: '/account/{accountId:[0-9]{1,}}',
        views: {
            '@': {
                templateUrl: 'contacts/controllers/form.html',
                controller: ContactCreateUpdateController,
                controllerAs: 'vm',
            },
        },
        ncyBreadcrumb: {
            skip: true,
        },
    });
}

/**
 * Controller to create a new contact.
 */
angular.module('app.contacts').controller('ContactCreateUpdateController', ContactCreateUpdateController);

ContactCreateUpdateController.$inject = ['$state', '$stateParams', 'Settings', 'Account', 'Contact', 'Tag',
    'HLFields', 'HLForms'];
function ContactCreateUpdateController($state, $stateParams, Settings, Account, Contact, Tag, HLFields, HLForms) {
    var vm = this;
    vm.contact = {};
    vm.tags = [];
    vm.errors = {
        name: [],
    };
    vm.accounts = [];
    vm.tag_choices = [];

    vm.saveContact = saveContact;
    vm.cancelContactCreation = cancelContactCreation;
    vm.addRelatedField = addRelatedField;
    vm.removeRelatedField = removeRelatedField;
    vm.refreshAccounts = refreshAccounts;
    vm.refreshTags = refreshTags;
    vm.addTagChoice = addTagChoice;

    activate();

    ////

    function activate() {
        _getContact();
    }

    function _getContact() {
        // Fetch the contact or create empty contact
        if ($stateParams.id) {
            Contact.get({id: $stateParams.id}).$promise.then(function(contact) {
                vm.contact = contact;
                Settings.page.setAllTitles('edit', contact.full_name);

                if (vm.contact.hasOwnProperty('social_media') && vm.contact.social_media.length) {
                    angular.forEach(vm.contact.social_media, function(profile) {
                        vm.contact[profile.name] = profile.username;
                    });
                }
            });
        } else {
            Settings.page.setAllTitles('create', 'contact');
            vm.contact = Contact.create();

            if ($stateParams.accountId) {
                var account = Account.get({id: $stateParams.accountId});
                vm.contact.accounts.push(account);
            }

            if (Settings.email.data) {
                // Auto fill data if it's available
                if (Settings.email.data.contact) {
                    if (Settings.email.data.contact.firstName) {
                        vm.contact.first_name = Settings.email.data.contact.firstName;
                    }

                    if (Settings.email.data.contact.preposition) {
                        vm.contact.preposition = Settings.email.data.contact.preposition;
                    }

                    if (Settings.email.data.contact.lastName) {
                        vm.contact.last_name = Settings.email.data.contact.lastName;
                    }

                    if (Settings.email.data.contact.emailAddress) {
                        vm.contact.email_addresses.push({
                            email_address: Settings.email.data.contact.emailAddress,
                            status: 2,
                        });
                    }
                }

                if (Settings.email.data.account) {
                    vm.contact.accounts.push(Settings.email.data.account);
                }
            }
        }
    }

    function addRelatedField(field) {
        HLFields.addRelatedField(vm.contact, field);
    }

    function removeRelatedField(field, index, remove) {
        HLFields.removeRelatedField(vm.contact, field, index, remove);
    }

    function cancelContactCreation() {
        if (Settings.email.sidebar.form === 'contact') {
            Settings.email.sidebar.form = null;
            Settings.email.sidebar.contact = false;
        } else {
            $state.go('base.contacts');
        }
    }

    function saveContact(form) {
        HLForms.blockUI();

        if (vm.contact.accounts && vm.contact.accounts.length) {
            var accounts = [];

            angular.forEach(vm.contact.accounts, function(account) {
                if (account) {
                    accounts.push({id: account.id});
                }
            });
        }

        // Clear all errors of the form (in case of new errors)
        angular.forEach(form, function(value, key) {
            if (typeof value === 'object' && value.hasOwnProperty('$modelValue')) {
                form[key].$error = {};
                form[key].$setValidity(key, true);
            }
        });

        vm.contact.social_media = [];

        if (vm.contact.twitter) {
            vm.contact.social_media.push({
                name: 'twitter',
                username: vm.contact.twitter,
            });
        }

        if (vm.contact.linkedin) {
            vm.contact.social_media.push({
                name: 'linkedin',
                username: vm.contact.linkedin,
            });
        }

        vm.contact = HLFields.cleanRelatedFields(vm.contact, 'contact');

        if (vm.contact.id) {
            // If there's an ID set it means we're dealing with an existing contact, so update it
            vm.contact.$update(function() {
                toastr.success('I\'ve updated the contact for you!', 'Done');
                $state.go('base.contacts.detail', {id: vm.contact.id}, {reload: true});
            }, function(response) {
                _handleBadResponse(response, form);
            });
        } else {
            vm.contact.$save(function() {
                toastr.success('I\'ve saved the contact for you!', 'Yay');

                if (Settings.email.sidebar.form === 'contact') {
                    Settings.email.sidebar.form = null;
                    Settings.email.sidebar.contact = true;
                    Settings.email.data.contact = vm.contact;
                } else {
                    $state.go('base.contacts.detail', {id: vm.contact.id});
                }
            }, function(response) {
                _handleBadResponse(response, form);
            });
        }
    }

    function refreshAccounts(query) {
        if (query.length >= 2) {
            var exclude = '';

            // Exclude accounts already selected
            angular.forEach(vm.contact.accounts, function(account) {
                exclude += ' AND NOT id:' + account.id;
            });

            vm.accounts = Account.search({filterquery: 'name:(' + query + ')' + exclude, size: 60, sort: '-modified'});
        }
    }

    function refreshTags(query) {
        if (query.length >= 1) {
            var exclude = '';

            // Exclude accounts already selected
            angular.forEach(vm.contact.tags, function(tag) {
                exclude += ' AND NOT name_flat:' + tag.name;
            });

            Tag.search({query: query + exclude}, function(response) {
                vm.tag_choices = response;
            });
        }
    }

    function addTagChoice(tag) {
        return {
            'name': tag,
        };
    }

    function _handleBadResponse(response, form) {
        HLForms.setErrors(form, response.data);

        toastr.error('Uh oh, there seems to be a problem', 'Oops!');
    }
}
