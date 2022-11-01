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
        goals: any[];
        detailGridDatas: any[];
        selectedCodes: any[];
        carePlan: any;
        observationCodeCodeSystem: any;
        observationDropdownOptions: any;
        observationCodeCodeSystemData: any;

        onChangeObservation(goalIndex: number, index: number, event: any)
        onSelectObservation(e);
        getObservationCodes();
        procedureCodes: any;
        bodyStructure: any;
        codeChanged(index: number);
        addGoal(activity: any, index: number);
        goalSetting(activity, $index);
        removeGoal(activityIndex: number, index: number);
        addTarget(activityIndex: number, index: number);
        detailTarget(goalindex: number, index: number);
    }

    export class CreateUpdateCarePlanController {

        private _fhirService: FhirService;
        static $inject = ['$scope', '$modal', '$modalInstance', 'fhirService', '_carePlan'];


        constructor($scope: ICreateUpdateCarePlanController, $modal, $modalInstance, fhirService: FhirService, carePlan) {
            this._fhirService = fhirService;

            $scope.carePlan = carePlan;

            $scope.selectedCodes = [];
            $scope.goals = [{
                target: []
            }];

            if (carePlan.id == null) {
                $scope.carePlan = {
                    activity: [{
                        detail: {
                            kind: "ServiceRequest",
                            code: {},
                            goal: []
                        }
                    }]
                }

            }

            $scope.observationDropdownOptions = {};
            $scope.observationCodeCodeSystemData = {};


            $scope.getObservationCodes = function () {
                fhirService.read("CodeSystem/observation-codes").then(result => {
                    $scope.observationCodeCodeSystem = result.data;
                    //$scope.concepts = result.data.concept;
                    $scope.observationCodeCodeSystemData = new kendo.data.DataSource({
                        data: result.data.concept,
                        schema: {
                            model: {
                                id: "code"
                            }
                        }
                    });
                    $scope.observationDropdownOptions = {
                        dataSource: $scope.observationCodeCodeSystemData,
                        dataTextField: "display",
                        dataValueField: "code",
                    }
                }).catch(reason => {
                    if (reason.status == 404) {

                    }
                });
            };

            $scope.getBodyStructure = function () {
                fhirService.read("CodeSystem/body-structure").then(result => {
                    $scope.bodyStructure = result.data
                });
            }

            $scope.getProcedureCodes = function () {
                fhirService.read("CodeSystem/procedure-code").then(result => {
                    $scope.procedureCodes = result.data;
                });
            }

            $scope.onChangeObservation = function (goalIndex: number, index: number, e) {
                var selectedIndex: number = e.sender.selectedIndex;
                var concept = $scope.observationCodeCodeSystem.concept[selectedIndex];
                $scope.goals[goalIndex].target[index].measure = {
                    coding: [
                        { code: concept.code, display: concept.display },
                    ],
                    text: concept.display
                }
                console.log($scope.goals);
            }

            $scope.detailTarget = function (goalIndex: number, index: number) {
                var modalInstance = $modal.open({
                    templateUrl: 'views/dialogs/TargetDetail.html',
                    controller: TargetDetailController,
                    backdrop: 'static',
                    resolve: {
                        _target: function () {
                            return $scope.goals[goalIndex].target[index];
                        }
                    }
                });
                modalInstance.result.then(function (target: any) {
                    console.log(target);
                });
            }


            $scope.onSelectObservation = function (e) {
                console.log(e.dataItem);
            }

            $scope.goalSetting = function (activity: any, index: number) {

            }

            $scope.removeGoal = function (parentIndex: number, index: number) {
                $scope.goals.splice(index, 1);
            }

            $scope.addTarget = function (parentIndex: number, index: number) {
                //$scope.carePlan.activity[parentIndex].detail.goal[index].target.push({});
                $scope.goals[index].target.push({});
            }


            $scope.addActivity = function () {
                $scope.carePlan.activity.push({
                    detail: {
                        kind: "ServiceRequest",
                        code: {},
                        goal: []
                    }
                });
                $scope.selectedCodes.push({});
            }

            $scope.addGoal = function (activity, index: number) {
                //$scope.carePlan.activity[index].detail.goal.push({ target: [] });
                $scope.goals.push({ target: [] });
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
            $scope.getObservationCodes();
        }
    }
}