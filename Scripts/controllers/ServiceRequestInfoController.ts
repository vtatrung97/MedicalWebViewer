module Controllers {
    export interface IServiceRequestInfoController extends ng.IScope {
        ok();
        cancel();


        loadData();
        imagingServiceBasedOn: any[];
        currentServiceRequest: any;
    }

    export class ServiceRequestInfoController {
        static $inject = ['$scope', '$modalInstance', 'fhirService', 'imagingStudyBasedOn'];
        private _fhirService: FhirService;

        constructor($scope: IServiceRequestInfoController, $modalInstance, fhirService: FhirService, imagingStudyBasedOn: any[]) {
            this._fhirService = fhirService;


            $scope.imagingServiceBasedOn = imagingStudyBasedOn;
            $scope.loadData = function () {

            }
            if (imagingStudyBasedOn.length > 0) {
                //imagingStudyBasedOn.forEach((item, index) => {
                //    fhirService.read(item.reference).then(result => {
                //    })
                //})
                $scope.currentServiceRequest = imagingStudyBasedOn[0];
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