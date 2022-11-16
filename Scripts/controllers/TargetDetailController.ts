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
                    name: 'Quantity'
                };
                $scope.detailQuantity = {
                    comparator: ''
                };
            }


            $scope.onChangedDetailType = function (value: string) {
                switch ($scope.detailType.name) {
                    case 'Quantity':
                        $scope.detailQuantity = {
                            comparator: ''
                        };
                        break;
                    case 'Range':
                        $scope.detailRange = {
                            low: {
                                value: 0
                            },
                            high: {
                                value: 10
                            }
                        };
                        break;
                    case 'string':
                        $scope.detailString = {
                            value:''
                        }
                        break;
                }
            }

            $scope.ok = function () {
                switch ($scope.detailType.name) {
                    case 'Quantity':
                        $scope.target.detailQuantity = $scope.detailQuantity;
                        break;
                    case 'Range':
                        $scope.target.detailRange = $scope.detailRange;

                        break;
                    case 'string':
                        $scope.target.detailString = $scope.detailString.value;
                        break;
                }
                $modalInstance.close($scope.target);
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}