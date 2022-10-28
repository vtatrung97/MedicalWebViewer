module Controllers {
    export interface ICarePlansManagementController extends ng.IScope {
        carePlans: any[];
        gridCarePlanOptions: any;
        carePlansGridData: any;

        ok();
        cancel();
        getCarePlans();
        createCarePlan();
    }

    export class CarePlansManagementController {
        private _scope: ICarePlansManagementController
        private _fhirService: FhirService;
        static $inject = ['$scope','$modal', '$modalInstance','fhirService'];


        constructor($scope: ICarePlansManagementController, $modal, $modalInstance, fhirService: FhirService) {
            this._scope = $scope;
            this._fhirService = fhirService;

            $scope.gridCarePlanOptions = {
                dataSource: $scope.carePlansGridData,
                sortable: true,
                pageable: false,
                scrollable: true,
                filterable: true,
                resizable: true,
                toolbar: [{ text: "Thêm quy trình mới", className: "k-grid-addEmail", imageClass: "k-add", template: '<a ng-click="createCarePlan()" class="k-button k-button-icontext k-grid-upload" >Thêm mới</a>' }],
                change: function (e) {
                    var selectedTypes: string[] = this.selectedKeyNames();
                    var rows = e.sender.select();
                    //$scope.selectedTypes = [];
                },
                height: 550,
                dataBound: function (e) {
                    //this.expandRow(this.tbody.find("tr.k-master-row").first());
                },
                page: function (e) {
                    var pageIndex = e.page;
                },
                columns: [
                    {
                        field: "title",
                        title: "Tiêu đề",
                        width: "120px",
                        attributes: {
                            style: "text-align: center; font-size: 14px;"
                        }
                    },
                    {
                        field: "description",
                        title: "Mô tả",
                        width: "120px"
                    }]
            }


            $scope.createCarePlan = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'views/dialogs/CreateUpdateCarePlan.html',
                    controller: CreateUpdateCarePlanController,
                    backdrop: 'static',
                    size: 'ep',
                    resolve: {
                        _carePlan: function () {
                            return {};
                        },
                    }
                });
                modalInstance.result.then(function (result) {
                    $scope.getCarePlans();
                })
            }


            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.getCarePlans = function () {
                fhirService.search("CarePlan").then(result => {
                    console.log(result);
                    if (result.data.total > 0) {
                        var entries= result.data.entry;
                        var data = new kendo.data.ObservableArray(entries);
                        $scope.carePlansGridData = new kendo.data.DataSource({
                            data: data,
                            schema: {
                                model: {
                                    id: "id"
                                }
                            }
                        })
                    }
                });
            }

            $scope.getCarePlans();

        }
    
    }
}