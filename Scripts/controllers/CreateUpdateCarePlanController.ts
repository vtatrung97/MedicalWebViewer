module Controllers {
    export interface ICreateUpdateCarePlanController extends ng.IScope {
        ok();
        cancel();
        createActivity();
        addActivity();
        getProcedureCodes();
        getBodyStructure();
        gridActivityOptions: any;
        //gridActivitiesGridData: any;
        //activityDefinition: any;
        selectedCodes: any[];
        carePlan: any;

        procedureCodes: any;
        bodyStructure: any;
        codeChanged(index: number);
        addGoal(activity: any, index: number);
        goalSetting(activity, $index);
    }

    export class CreateUpdateCarePlanController {

        private _fhirService: FhirService;
        static $inject = ['$scope', '$modalInstance','fhirService','_carePlan'];


        constructor($scope: ICreateUpdateCarePlanController, $modalInstance, fhirService: FhirService, carePlan) {
            this._fhirService = fhirService;

            $scope.carePlan = carePlan;

            $scope.selectedCodes = [];

            if (carePlan.id == null) {
                $scope.carePlan = {
                    activity:[]
                }
            }

            $scope.getBodyStructure = function () {
                fhirService.read("CodeSystem/body-structure").then(result => {
                    $scope.bodyStructure=result.data
                });
            }

            $scope.getProcedureCodes = function () {
                fhirService.read("CodeSystem/procedure-code").then(result => {
                    $scope.procedureCodes = result.data;
                });
            }


            //$scope.gridActivityOptions = {
            //    dataSource: $scope.gridActivitiesGridData,
            //    sortable: true,
            //    pageable: false,
            //    scrollable: true,
            //    filterable: true,
            //    resizable: true,
            //    toolbar: [{ text: "Thêm danh mục đi kèm", className: "k-grid-addEmail", imageClass: "k-add", template: '<a ng-click="createActivity()" class="k-button k-button-icontext k-grid-upload" >Thêm mới</a>' }],
            //    change: function (e) {
            //        var selectedTypes: string[] = this.selectedKeyNames();
            //        var rows = e.sender.select();
            //        //$scope.selectedTypes = [];
            //    },
            //    height: 550,
            //    dataBound: function (e) {
            //        //this.expandRow(this.tbody.find("tr.k-master-row").first());
            //    },
            //    page: function (e) {
            //        var pageIndex = e.page;
            //    },
            //    detailExpand: function (e) {
            //        e.sender.tbody.find('.k-detail-row').each(function (idx, item) {
            //            if (item !== e.detailRow[0]) {
            //                e.sender.collapseRow($(item).prev());
            //            }
            //        })
            //    },
            //    columns: [
            //        {
            //            field: "status",
            //            title: "Trạng thái",
            //            width: "120px",
            //            attributes: {
            //                style: "text-align: center; font-size: 14px;"
            //            }
            //        }]
            //}

            $scope.goalSetting = function (activity: any, index: number) {

            }


            $scope.addActivity = function () {
                $scope.carePlan.activity.push({
                    detail: {
                        kind:"ServiceRequest",
                        code: {},
                        goal:[]
                    }
                });
                $scope.selectedCodes.push({});
            }

            $scope.addGoal = function (activity, index: number) {
                $scope.carePlan.activity[index].detail.goal.push({})
            }

            $scope.codeChanged = function (index: number) {
                var concept = $scope.selectedCodes[index];
                var code = {
                    coding: [{ code: concept.code, display: concept.display }],
                    text: concept.display
                };
                $scope.carePlan.activity[index].detail.code = code;
               
            }

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.getBodyStructure();
            $scope.getProcedureCodes();
        }
    }
}