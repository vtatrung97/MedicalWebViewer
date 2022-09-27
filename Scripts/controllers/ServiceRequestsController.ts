/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IServiceRequestsControllerScope extends ng.IScope {

        ok();
        cancel();
    }

    export class ServiceRequestsController {
        static $inject = ['$scope', 'optionsService', '$modalInstance'];

        private _overlayManagerService: OverlayManagerService;

        constructor($scope: IServiceRequestsControllerScope, optionsService: OptionsService, $modalInstance) {

            $scope.ok = function () {
            
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}