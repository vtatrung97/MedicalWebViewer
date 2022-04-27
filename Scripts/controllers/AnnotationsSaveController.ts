/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/angular/angular.d.ts" />

module Controllers {
    export interface IAnnotationsSaveControllerScope extends ng.IScope {
        info: any;

        ok();
        cancel();
        enableDerived();
    }

    export class AnnotationsSaveController {

        static $inject = ['$scope', '$modalInstance', 'showDerived', 'seriesDescription'];

        constructor($scope: IAnnotationsSaveControllerScope, $modalInstance, showDerived, seriesDescription) {  
            $scope.info = {};
            $scope.info.description = "";            
            $scope.info.saveAsDerived = false;
            $scope.info.derivedSeriesNumber = "";
            $scope.info.derivedSeriesDescription = seriesDescription;
            $scope.info.derivedProtocol = "";


            $scope.enableDerived = function () {
                return showDerived;
            }

            $scope.ok = function () {
                if ($scope.info.description && $scope.info.description.length != 0) {
                    if (showDerived && !$scope.info.saveAsDerived)
                    {
                        alert("Cannot save calibrated annotation, you can only save it to a copy of the series");
                        return;
                    }

                    $modalInstance.close($scope.info);
                }
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            }
        }
    }
}