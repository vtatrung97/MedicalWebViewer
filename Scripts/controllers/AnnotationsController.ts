/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/datejs.d.ts" />

module Controllers {
    export interface IAnnotationsControllerScope extends ng.IScope {
        config: any;       
        windowDimensions: any;
        annotations: Array<any>;        
        selectedAnnotation: any;
        gridOptions: any;
        gridApi: any;

        ok();
        cancel();
        delete();
        canDeleteAnnotations(); 
        onSelectRow(rowid, data);              
    }

    export class AnnotationsController {
        static $inject = ['$scope', '$modalInstance', 'optionsService', 'eventService', 'annotations', 'authenticationService','objectStoreService', 'seriesManagerService','seriesInstanceUID'];       

        constructor($scope: IAnnotationsControllerScope, $modalInstance, optionsService: OptionsService, eventService: EventService, annotations,
            authenticationService: AuthenticationService, objectStoreService: ObjectStoreService, seriesManagerService: SeriesManagerService, seriesInstanceUID: string) {
            var dateFormat = optionsService.get(OptionNames.DateFormat);

            $scope.gridOptions = {
                enableSorting: true,
                enableRowSelection: true,
                enableRowHeaderSelection: lt.LTHelper.device == lt.LTDevice.mobile || lt.LTHelper.device == lt.LTDevice.tablet,
                noUnselect: false,
                multiSelect: false,                                                                             
                onRegisterApi: function (gridApi) {
                    
                    gridApi.selection.on.rowSelectionChanged($scope, function (selectedRow) {
                        $scope.selectedAnnotation = selectedRow.entity;                       
                    });
                    $scope.gridApi = gridApi;

                    // select first item in the grid.
                    if ($scope.gridOptions.data && $scope.gridOptions.data.length > 0) {
                        $scope.gridApi.grid.modifyRows($scope.gridOptions.data);
                        $scope.gridApi.selection.selectRow($scope.gridOptions.data[0]);
                    }
                },
                columnDefs: [                    
                    { name: "Description", field: "ContentDescription", enableHiding: false },
                    { name: "Create Date", field: "CreationDate", enableHiding: false },
                    { name: "Creator Name", field: "ContentCreatorName", enableHiding: false },
                ],
                data: annotations
            };

                              
            $scope.selectedAnnotation = null;                       

            $scope.ok = function () {        
                var sopInstanceUid : string = "";
                if ($scope.selectedAnnotation != null) {
                    sopInstanceUid = $scope.selectedAnnotation.SOPInstanceUID;
                }      
                $modalInstance.close($scope.selectedAnnotation);
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope['delete'] = function () {                
                objectStoreService.DeleteAnnotations($scope.selectedAnnotation.SOPInstanceUID).then(function () {                    
                    var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                    seriesManagerService.remove_annotationID(seriesInstanceUID, cell.divID, $scope.selectedAnnotation.SOPInstanceUID);  
                    $scope.selectedAnnotation = null;                                                  
                }, function (error) {
                    }); 
            }

            $scope.canDeleteAnnotations = function () {
                return authenticationService.hasPermission(PermissionNames.CanDeleteAnnotations) && ($scope.selectedAnnotation != null);
            } 

            $scope.onSelectRow = function (rowid, data) {
                $scope.selectedAnnotation = data;
                $scope.$apply();
            };
            
          $scope.annotations = annotations;                       
        }        
    }
}