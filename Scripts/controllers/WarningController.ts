/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {

    export interface IWarningControllerScope extends ng.IScope {
        export(): void;
        cancel(): void;
        warning: any;
    }

    export class WarningController {
        private $scope: IWarningControllerScope;
        private externalApplicationsService: ExternalApplicationsService;

        static $inject = ["$scope", "$modalInstance"];
        constructor($scope: IWarningControllerScope, $modalInstance) {

            $scope.warning = {};
            $scope.warning.DontAskAgain = false;

            $scope.export = () => {

                window.localStorage.setItem("Export.DontAskAgain", $scope.warning.DontAskAgain.toString());

                $modalInstance.close('export');
            };

            $scope.cancel = () => {
                $modalInstance.dismiss("cancel");
            };
        }
    }
}