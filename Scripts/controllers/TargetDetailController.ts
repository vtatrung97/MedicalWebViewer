module Controllers {
    export interface ITargetDetailController extends ng.IScope {
        ok();
        cancel();
        onChangedDetailType(value);


        detailType: any;
        detailQuantity: any;
        detailRange: any;
        detailString: any;
        target: any;
    }

    export class TargetDetailController {
        static $inject = ['$scope', '$modalInstance','_target'];


        constructor($scope: ITargetDetailController, $modalInstance, _target) {
            $scope.target = _target;

            $scope.detailType = {
                name:''
            };

            if (_target.detailQuantity != null) {
                $scope.detailQuantity = _target.detailQuantity;
                $scope.detailType.name = "Quantity";
            }
            else if (_target.detailRange != null) {
                $scope.detailRange = _target.detailRange;
                $scope.detailType.name = "Range";
            }
            else if (_target.detailString != null) {
                $scope.detailString = _target.detailString;
                $scope.detailType.name = "string";
            }
            else {
                $scope.detailType = {
                    name: ''
                };
            }


            $scope.onChangedDetailType = function (value: string) {
            }

            $scope.ok = function () {
                $modalInstance.close($scope.target);
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}