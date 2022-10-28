module Controllers {
    export interface ICreateUpdateCarePlanController extends ng.IScope {
        ok();
        cancel();
        createActivity();
        addActivity();

        gridActivityOptions: any;
        gridActivitiesGridData: any;
        activityDefinition: any;
        carePlan: any;
    }

    export class CreateUpdateCarePlanController {
        static $inject = ['$scope', '$modalInstance','_carePlan'];


        constructor($scope: ICreateUpdateCarePlanController, $modalInstance, carePlan) {
            $scope.carePlan = carePlan;
            if (carePlan.id == null) {
                $scope.carePlan = {
                    activity:[]
                }
            }


            $scope.gridActivityOptions = {
                dataSource: $scope.gridActivitiesGridData,
                sortable: true,
                pageable: false,
                scrollable: true,
                filterable: true,
                resizable: true,
                toolbar: [{ text: "Thêm danh mục đi kèm", className: "k-grid-addEmail", imageClass: "k-add", template: '<a ng-click="createActivity()" class="k-button k-button-icontext k-grid-upload" >Thêm mới</a>' }],
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
                detailExpand: function (e) {
                    e.sender.tbody.find('.k-detail-row').each(function (idx, item) {
                        if (item !== e.detailRow[0]) {
                            e.sender.collapseRow($(item).prev());
                        }
                    })
                },
                columns: [
                    {
                        field: "status",
                        title: "Trạng thái",
                        width: "120px",
                        attributes: {
                            style: "text-align: center; font-size: 14px;"
                        }
                    }]
            }


            $scope.addActivity = function () {
                $scope.carePlan.activity.push({});
            }

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}