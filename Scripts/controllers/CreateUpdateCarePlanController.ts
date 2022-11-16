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
        activityDefinition: any;
        goals: any[];
        detailGridDatas: any[];
        selectedCodes: any[];
        carePlan: any;
        observationCodeCodeSystem: any;
        observationDropdownOptions: any;
        bodyStructureDropdownOptions: any;
        bodyStructureCodeSystemData: any;
        observationCodeCodeSystemData: any;

        selectedObservation: any;
        onChangeObservation(goalIndex: number, index: number, event: any);
        onChangeBodyStructure(e);

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
            $scope.goals = [];

            if (carePlan.id == null) {
                $scope.carePlan = {
                    resourceType: "CarePlan",
                    activity: [{
                        detail: {
                            kind: "ServiceRequest",
                            code: {},
                            goal: []
                        }
                    }]
                }
                $scope.goals = [{
                    resourceType: 'Goal',
                    lifecycleStatus: 'active',
                    target: []
                }];

                $scope.activityDefinition = {
                    resourceType: "ActivityDefinition",
                    name: "",
                    title: "",
                    status: "active",
                    kind: "CarePlan",
                    bodySite:[]
                }

            } else {
                if ($scope.carePlan.activity.length > 0) {
                    for (var i = 0; i < $scope.carePlan.activity.length; i++) {
                        if ($scope.carePlan.activity[i].detail.goal.length > 0) {
                            var goal = $scope.carePlan.activity[i].detail.goal;

                            if (goal != null && goal.length > 0) {
                                for (var goalIndex = 0; goalIndex < goal.length; goalIndex++) {
                                    fhirService.read(goal[goalIndex].reference).then(result => {
                                        $scope.goals.push(result.data);
                                    })
                                }
                            }
                        }
                    }
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
                    $scope.bodyStructureCodeSystemData = new kendo.data.DataSource({
                        data: result.data.concept,
                        schema: {
                            model: {
                                id: "code"
                            }
                        }
                    });
                    $scope.bodyStructureDropdownOptions = {
                        dataSource: $scope.bodyStructureCodeSystemData,
                        dataTextField: "display",
                        dataValueField: "code",
                    }
                });
            }

            $scope.getProcedureCodes = function () {
                fhirService.read("CodeSystem/procedure-code").then(result => {
                    $scope.procedureCodes = result.data;

                    if ($scope.carePlan.id != null) {
                        var selectedConcept = $scope.procedureCodes.concept.filter(x => x.code == $scope.carePlan.activity[0].detail.code.coding[0].code)[0];
                        $scope.selectedCodes[0] = selectedConcept;
                    }
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
            }

            $scope.onChangeBodyStructure = function (e) {
                var selectedIndex: number = e.sender.selectedIndex;
                var concept = $scope.bodyStructure.concept[selectedIndex];
                $scope.activityDefinition.bodySite[0] = {
                    coding: [
                        {
                            code: concept.code, display: concept.display
                        }
                    ],
                    text:concept.display
                }
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
                    $scope.goals[goalIndex].target[index] = target;
                });
            }


            $scope.onSelectObservation = function (e) {
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
                $scope.goals.push({
                    resourceType: 'Goal',
                    lifecycleStatus: 'active',
                    target: []
                });
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
                var goals = [];
                console.log($scope.activityDefinition);
                $scope.activityDefinition.name = $scope.carePlan.title;
                $scope.activityDefinition.title = $scope.carePlan.title;

                fhirService.create("ActivityDefinition", $scope.activityDefinition).then(result => {

                })
                //$scope.goals.forEach((goal, index: number) => {
                //    fhirService.create("Goal", goal).then(resultGoal => {
                //        goals.push({ reference: "Goal/" + resultGoal.data.id });

                //    }).finally(() => {
                //        goals.forEach((goalReference, goalIndex: number) => {
                //            $scope.carePlan.activity[0].detail.goal.push(goalReference);
                //        });
                //        fhirService.create("CarePlan", $scope.carePlan).then(resul => {
                //            $modalInstance.close('cancel');

                //        })

                //    });

                //});

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