﻿/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IProcedureCodesControllerScope extends ng.IScope {
        gridConceptOptions: any;
        conceptGridData: any;
        codeSystem: any;
        concepts: any[];

        ok();
        cancel();
        getProcedureCodes();
    }

    export class ProcedureCodesController {
        static $inject = ['$scope', '$modal', '$modalInstance','dialogs', 'fhirService'];


        constructor($scope: IProcedureCodesControllerScope, $modal, $modalInstance, dialogs, fhirService: FhirService) {

            $scope.getProcedureCodes = function () {
                fhirService.read("CodeSystem/procedure-code").then(result => {
                    $scope.codeSystem = result.data;
                    $scope.concepts = result.data.concept;
                    $scope.conceptGridData = new kendo.data.DataSource({
                        data: result.data.concept,
                        schema: {
                            model: {
                                id: "code"
                            }
                        }
                    })
                });
            };

            $scope.gridConceptOptions = {
                dataSource: $scope.conceptGridData,
                sortable: true,
                pageable: false,
                scrollable: true,
                filterable: true,
                resizable: true,
                //toolbar: [{ text: "Thêm quy trình mới", className: "k-grid-addEmail", imageClass: "k-add", template: '<a ng-click="createCarePlan()" class="k-button k-button-icontext k-grid-upload" >Thêm mới</a>' }],
                toolbar: ["create"],
                remove: function (e) {
                    console.log("Removing", e.model.display);
                    var index = $scope.codeSystem.concept.map(e => e.code).indexOf(e.model.id);
                    $scope.codeSystem.concept.splice(index, 1);
                    fhirService.put("CodeSystem", $scope.codeSystem).then(result => {
                        dialogs.notify("Cập nhật", "Danh mục đã được xóa");
                    });

                },
                change: function (e) {
                    console.log(e);
                    var selectedTypes: string[] = this.selectedKeyNames();
                    var rows = e.sender.select();
                    //$scope.selectedTypes = [];
                },
                save: function (e) {
                    if (e.model.code !== "") {
                        if (e.model.id === "") {
                            var newConcept = { code: e.model.code, display: e.model.display, definition: e.model.definition };
                            //$scope.concepts.push(newConcept);
                            $scope.codeSystem.concept.push(newConcept);
                        }
                        else {
                            var index = $scope.codeSystem.concept.map(e => e.code).indexOf(e.model.id);
                            var concept = { code: e.model.code, display: e.model.display, definition: e.model.definition };
                            if (index > -1) {
                                $scope.codeSystem.concept[index] = concept;
                            }
                        }
                    } else {
                        e.preventDefault();
                    }
                    fhirService.put("CodeSystem", $scope.codeSystem).then(result => {
                        dialogs.notify("Cập nhật","Danh mục đã được cập nhật");
                    });
                    //if (e.values.code !== "") {
                    //    // the user changed the name field
                    //    if (e.values.name !== e.model.name) {
                    //        /* The result can be observed in the DevTools(F12) console of the browser. */
                    //        console.log("code is modified");
                    //    }
                    //} else {
                    //    e.preventDefault();
                    //    /* The result can be observed in the DevTools(F12) console of the browser. */
                    //    console.log("code cannot be empty");
                    //}
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
                        field: "code",
                        title: "Mã",
                        width: "120px",
                        attributes: {
                            style: "text-align: center; font-size: 14px;"
                        }
                    },
                    {
                        field: "display",
                        title: "Hiển thị",
                        attributes: {
                            style: "text-align: center; font-size: 14px;"
                        }
                    },
                    {
                        field: "definition",
                        title: "Định nghĩa"
                    },
                    { command: ["edit", "destroy"], title: "&nbsp;", width: "250px" }
                ],
                editable: "inline"
            }

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.getProcedureCodes();
        }
    }
}