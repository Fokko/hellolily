(function() {
    'use strict';

    /**
     * MyFollowups Widget
     */
    angular.module('app.dashboard.directives').directive('followUp', followUp);

    function followUp (){
        return {
            templateUrl: 'dashboard/followup.html',
            controller: FollowUp,
            controllerAs: 'fu'
        }
    }

    FollowUp.$inject = ['$modal', '$scope', 'Deal', 'Cookie'];
    function FollowUp($modal, $scope, Deal, Cookie){

        Cookie.prefix = 'followupWidget';

        var vm = this;
        vm.table = {
            order: Cookie.getCookieValue('order', {
                ascending: true,
                column: 'created'
            }),
            items: []
        };

        vm.openFollowUpWidgetModal = openFollowUpWidgetModal;
        activate();

        function activate(){
            _watchTable();
        }

        function _getFollowUp(){
            Deal.getFollowUpWidgetData(
                vm.table.order.column,
                vm.table.order.ascending
            ).then(function (data){
                vm.table.items = data;
            });
        }

        function openFollowUpWidgetModal(followUp){
            var modalInstance = $modal.open({
                templateUrl: 'deals/followup_widget_modal.html',
                controller: 'FollowUpWidgetModal',
                controllerAs: 'vm',
                size: 'md',
                resolve: {
                    followUp: function(){
                        return followUp;
                    }
                }
            });

            modalInstance.result.then(function() {
                _getFollowUp();
            });
        }

        function _watchTable(){
            $scope.$watchGroup(['fu.table.order.ascending', 'fu.table.order.column'], function() {
                _getFollowUp();
            })
        }
    }

})();