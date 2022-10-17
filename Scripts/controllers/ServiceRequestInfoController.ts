module Controllers {
    export interface IServiceRequestInfoController extends ng.IScope {
        ok();
        cancel();


        loadData();
    }

    export class ServiceRequestInfoController {
        static $inject = ['$scope', '$modalInstance', 'fhirService'];
        private _fhirService: FhirService;

        constructor($scope: IServiceRequestInfoController, $modalInstance, fhirService: FhirService) {
            this._fhirService = fhirService;

            $scope.loadData = function () {
                fhirService.search("ImagingStudy").then(resuls => {
                    console.log(resuls);
                })
            }
            $scope.loadData();

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}