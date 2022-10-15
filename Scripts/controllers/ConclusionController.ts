module Controllers {
    export interface IConclusionController extends ng.IScope {
        ok();
        cancel();
    }

    export class ConclusionController {
        static $inject = ['$scope', '$modalInstance'];


        constructor($scope: IConclusionController, $modalInstance) {

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}