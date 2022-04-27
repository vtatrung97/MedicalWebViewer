/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/LEADTOOLS/jquery/jquery.d.ts" />
/// <reference path="../../lib/custom.d.ts" />
/// <reference path="Scopes.ts" />
/// <reference path="SearchController.ts" />

module Controllers {   
    export interface IDentalSearchControllerScope extends ISearchControllerScope {
        openDateStart: Function;
        openDateEnd: Function;
        dateStartOpened: boolean;
        dateEndOpened: boolean;
        config: any;              
        virtualgridapi: any;
        dateFormat: string;
        dateOptions: any;

        patient_data_from: number;
        patient_data_to: number;
        patient_data_total: number;
        patient_data_page_from: number;
        patient_data_page_total: number;
        toolbar_height: string;
        datePicker: any;  
        gridOptions: any; 
        gridOptionsSeries: any; 
                         
        patientids(value: string);
        patientNames(value: string);

        hpContextMenu(data: any): void;
        handleCellClicked(data: any): void;

        enableSendURL: boolean;


        resize();
    }    

    export class DentalSearchViewController extends SearchController {
        static $inject = ['$rootScope', '$scope', '$modal', 'uiGridConstants', 'eventService', 'queryArchiveService', 'optionsService', 'dataService', 'authenticationService', 'queryPacsService', 'seriesManagerService', 'tabService', 'templateService', 'templateEditorService', 'objectRetrieveService', '$translate', 'toolbarService'];            

        private _$scope: IDentalSearchControllerScope;
        private _objectRetrieveService: ObjectRetrieveService;
        private _seriesManagerService: SeriesManagerService;
        private _eventService: EventService;
        private _queryPacsService: QueryPacsService;
        private _optionsService: OptionsService;
        private _tabService: TabService;
        private _dataService: DataService;
        private _selectedSeries;
        public _selectedStudy;
        private _selectedPatient;
        private _sdOpenWith: string;
        private _viewStudy: boolean;
        private _rowIndexPrevious: number;
        private _loadingStructuredDisplay: boolean;
        private _loadingPatientSeries: boolean;
        private _localStructuredDisplay: Array<Models.HangingProtocolQueryResult>;
        private _toolbarService;
        private _patientSelected: boolean;
        private _patientData;
        private _patientDataRange_from;
        private _patientDataRange_pageSize;

        public get_patientSelected() {
            return this._patientSelected;
        }

        public set_patientSelected(value) {
            this._patientSelected = value;
        }


        public get_selectedSeries() {
            return this._selectedSeries;
        }

        public set_selectedSeries(series) {
            this._selectedSeries = series;
        }


        public get_selectedPatient() {
            return this._selectedPatient;
        }
            

        constructor($rootScope, $scope: IDentalSearchControllerScope, $modal, uiGridConstants, eventService: EventService, queryArchiveService: QueryArchiveService, optionsService: OptionsService, dataService: DataService, authenticationService: AuthenticationService, queryPacsService: QueryPacsService, seriesManagerService: SeriesManagerService, tabService: TabService, templateService: TemplateService, templateEditorService: TemplateEditorService, objectRetrieveService: ObjectRetrieveService, $translate, toolbarService) {
            var __this;
            var selection;
            var patientGroup = "Patients";
            var seriesGroup = "Series";
            var dateFormat = optionsService.get(OptionNames.DateFormat);
            var timeFormat = optionsService.get(OptionNames.TimeFormat);

            super($rootScope, $scope, queryArchiveService, optionsService, authenticationService, queryPacsService, tabService, eventService, templateService, templateEditorService, $translate);

            __this = this;
            this._$scope = $scope;
            this._seriesManagerService = seriesManagerService;
            this._eventService = eventService;
            this._queryArchiveService = queryArchiveService;
            this._queryPacsService = queryPacsService;
            this._optionsService = optionsService;
            this._tabService = tabService;
            this._dataService = dataService;
            this._objectRetrieveService = objectRetrieveService;
            this._viewStudy = false;
            this._rowIndexPrevious = -1;
            this._toolbarService = toolbarService;
            this._patientDataRange_from = 0;
            this._patientDataRange_pageSize = parseInt(optionsService.get(OptionNames.SearchPageSize));

            $scope.hpContextMenu = this.hpContextMenu.bind(this);
            $scope.handleCellClicked = this.handleCellClicked.bind(this);
            $scope.patientids = $.proxy(this.patientids, this);
            $scope.patientNames = $.proxy(this.patientNames, this);

            this._tabService.set_tabData(this._tabService.tabs[0].id, TabDataKeys.searchViewerController, this);
            this._patientSelected = false;
            $scope.gridOptions = {
                rowSelection: 'single',
                rowClass: 'patientContext',
                groupHeaders: true,
                suppressNoRowsOverlay: true,
                columnDefs: [
                    {
                        headerName: patientGroup,
                        children: [
                            {
                                headerName: "",
                                cellRenderer: Utils.countRenderer,
                                width: 29,
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                suppressSizeToFit: true
                            },
                            {
                                headerName: "Patient ID",
                                field: "ID",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                            },
                            {
                                headerName: "Name",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                valueGetter: function (params) {
                                    return Utils.nameFormatter(params.data.Name);
                                }
                            },
                            {
                                headerName: "Sex",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                field: "Sex"
                            },
                            {
                                headerName: "Birth Date",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                field: "BirthDate",
                                cellRenderer: Utils.dateRenderer
                            }
                        ]
                    }
                ],
                onRowSelected: this.patientSelected.bind(this),
                rowData: null,
                onGridReady: function () {
                    $scope.gridOptions.api.hideOverlay();
                    setTimeout(function () {
                        $scope.gridOptions.api.sizeColumnsToFit();
                    }, 500);

                    $.contextMenu({
                        selector: '.patientContext',
                        trigger: 'none',
                        className: 'data-title',
                        build: function ($trigger, e) {
                            return {
                                callback: function (key, options) {

                                    __this._seriesManagerService.currentPatientSeries = __this._$scope.gridOptionsSeries.rowData;

                                    var index = 0;
                                    var length = __this._localStructuredDisplay.length;
                                    for (index = 0; index < length; index++) {
                                        if (__this._localStructuredDisplay[index].SeriesInstanceUID == key) {
                                            __this._seriesManagerService.currentLoadingSeries = __this.getSelectedSeries(__this._localStructuredDisplay[index]);
                                            __this._seriesManagerService.structuredDisplayList = __this._localStructuredDisplay;

                                            __this._seriesManagerService._currentStructuredDisplay = __this._localStructuredDisplay[index];

                                            __this.loadselectedStructureDisplay(__this._localStructuredDisplay[index]);
                                            return;
                                        }
                                    }
                                },
                                items: __this.get_PatientStructuredDisplayItems()
                            }
                        }
                    });
                }
            }

            $scope.gridOptionsSeries = {
                rowSelection: 'single',
                suppressNoRowsOverlay: true,
                suppressLoadingOverlay: false,
                groupHeaders: true,
                rowClass: 'seriesContext',
                rowHeight: parseInt(optionsService.get(OptionNames.SeriesThumbnailHeight)),
                overlayNoRowsTemplate: '<span style="padding: 10px; border: 2px solid #444; background: lightgoldenrodyellow;">No Series Found</span>',
                overlayLoadingTemplate:'<span class="ag-overlay-loading-center">Loading Series...</span>',
                columnDefs: [
                    {
                        headerName: seriesGroup,
                        children: [
                            {
                                headerName: "",
                                cellRenderer: Utils.has_mrtiRenderer,
                                width: 29,
                                suppressSizeToFit: true,
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: "",
                                cellRenderer: Utils.thumbnailRenderer,
                                hide: !optionsService.get(OptionNames.ShowSearchThumbnails),
                                width: parseInt(optionsService.get(OptionNames.SeriesThumbnailWidth)),
                                onCellContextMenu: this.contextMenu.bind(this),
                            },
                            {
                                headerName: 'Number', field: 'Number',
                                onCellContextMenu: this.contextMenu.bind(this)},
                            {
                                headerName: 'Series Date', field: 'Date',
                                cellRenderer: Utils.dateRenderer,
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Description',
                                field: 'Description',
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Modality',
                                field: 'Modality',
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Instances',
                                field: 'NumberOfRelatedInstances',
                                onCellContextMenu: this.contextMenu.bind(this)
                            }
                        ]
                    }
                ],
                onRowSelected: this.seriesSelected.bind(this),
                rowData: null,
                onGridReady: function () {
                    $scope.gridOptionsSeries.api.hideOverlay();

                    $.contextMenu({
                        selector: '.seriesContext',
                        trigger: 'none',
                        className: 'data-title',
                        build: function ($trigger, e) {
                            return {
                                callback: function (key, options) {
                                    var rawData = __this._$scope.gridOptionsSeries.rowData[0];

                                    __this.loadStructuredDisplayFromTemplate(__this.getTemplate(key), rawData.InstanceUID, rawData.StudyInstanceUID);
                                    return;
                                },
                                items: __this.getTemplateMenu(__this._selectedSeries.Modality)
                            }
                        }
                    });

                    setTimeout(function () {
                        $scope.gridOptionsSeries.api.sizeColumnsToFit();
                    }, 500);
                }
            }

            $scope.queryOptions = new Models.QueryOptions();
            $scope.queryOptions.PatientsOptions.PatientID = '';


            $scope.pacsConnections = queryPacsService.remoteConnections;  
            $scope.dateFormat = dateFormat; 
            $scope.patient_data_from = 0;
            $scope.toolbar_height = "100%";
            $scope.patient_data_to = 0;
            $scope.patient_data_total = 0;
            $scope.patient_data_page_from = 0;
            $scope.patient_data_page_total = 0;

            $scope.dateOptions = {
                'show-weeks': false
            };       
            $scope.datePicker = {};
            $scope.datePicker.dateStartOpened = false;   
            $scope.datePicker.dateEndOpened = false; 

            selection = $scope.pacsConnections.filter(function (connection: Models.PACSConnection, index: number, array) {
                return connection.isDefault;
            });
            $scope.textFocused = function (event) {
                event.currentTarget.placeholder = dateFormat;
            }
            $scope.seriesToChanged = function (event) {
                if (event.currentTarget)
                    $scope.queryOptions.SeriesOptions.SeriesDateEnd = event.currentTarget.value;
            }
            $scope.seriesFromChanged = function (event) {
                if (event.currentTarget)
                    $scope.queryOptions.SeriesOptions.SeriesDateStart = event.currentTarget.value;
            }



            window.addEventListener('keydown', function (e) {
                if (e.keyCode == 34) {
                    $scope.nextPage();
                } else if (e.keyCode == 33) {
                    $scope.previousPage();
                }
                else if (e.keyCode == 35) {
                    $scope.lastPage();
                }
                else if (e.keyCode == 36) {
                    $scope.firstPage();
                }
            }, false);


            if (selection.length > 0) {
                $scope.querySource.pacs = selection[0];
            }                              

            $scope.updatePatientDataList = function () {

                var rangedPatientData = $scope.getPatientDataRange();
                $scope.gridOptions.api.setRowData(rangedPatientData);
            }

            $scope.nextPage = function () {
                if ((__this._patientDataRange_from + __this._patientDataRange_pageSize) > __this._patientData.length)
                    return;
                __this._patientDataRange_from += __this._patientDataRange_pageSize;

                $scope.updatePatientDataList();
            }

            $scope.lastPage = function () {
                __this._patientDataRange_from = Math.floor(__this._patientData.length / __this._patientDataRange_pageSize) * __this._patientDataRange_pageSize;

                $scope.updatePatientDataList();
            }

            $scope.firstPage = function () {
                if (__this._patientDataRange_from <= 0)
                    return;
                __this._patientDataRange_from = 0;

                $scope.updatePatientDataList();
            }

            $scope.previousPage = function () {
                if (__this._patientDataRange_from <= 0)
                    return;
                __this._patientDataRange_from -= __this._patientDataRange_pageSize;

                $scope.updatePatientDataList();
            }

            $scope.cantPageForward = function () {
                if (!__this._patientData)
                    return true;
                return (__this._patientDataRange_from + __this._patientDataRange_pageSize) >= __this._patientData.length;
            }

            $scope.cantPageBackward = function () {
                if (!__this._patientData)
                    return true;
                return __this._patientDataRange_from <= 0;
            }

            $scope.updatePagingToolbar = function () {
                Utils.countRenderer_StartIndex = __this._patientDataRange_from;

                $scope.patient_data_from = __this._patientDataRange_from + 1;
                $scope.patient_data_to = Math.min(__this._patientData.length, __this._patientDataRange_from + __this._patientDataRange_pageSize);
                $scope.patient_data_total = __this._patientData.length;
                $scope.patient_data_page_from = Math.floor(__this._patientDataRange_from / __this._patientDataRange_pageSize) + 1;
                $scope.patient_data_page_total = Math.ceil(__this._patientData.length / __this._patientDataRange_pageSize);

            }

            $scope.showPagingTool = function () {
                if (__this._patientData) {
                    var show: boolean = __this._patientDataRange_pageSize < __this._patientData.length;
                    $scope.toolbar_height = show ? "calc(100% - 40px)" : "100%";
                    return show;

                }
                $scope.toolbar_height = "100%";
                return false;
            }

            $scope.getPatientDataRange = function () {

                var index = __this._patientDataRange_from;
                var length = index + __this._patientDataRange_pageSize;
                length = Math.min(__this._patientData.length, length);

                var counter = 0;
                var output: any[] = [];

                for (; index < length; index++) {
                    output[counter++] = __this._patientData[index];
                }

                $scope.updatePagingToolbar();

                return output;
            }
            
            $scope.doSearch = function () {
                __this.set_patientSelected(false);
                var queryOptions: Models.QueryOptions = angular.copy($scope.queryOptions);

                if (angular.isDefined(queryOptions.PatientsOptions.PatientName)) {
                    var m = queryOptions.PatientsOptions.PatientName.match(/"(.*?)"/);

                    if (m == null) {
                        queryOptions.PatientsOptions.PatientName = queryOptions.PatientsOptions.PatientName.replace(' ', '^');
                    }
                    else {
                        queryOptions.PatientsOptions.PatientName = m[1].replace(/"/g, '');
                    }
                }

                __this._selectedSeries = null;
                this.gridOptions.api.setRowData([]);
                this.gridOptionsSeries.api.setRowData([]); 
                this.gridOptionsSeries.api.hideOverlay();  
                switch ($scope.querySource.name) {
                    case 'database':                        
                        queryArchiveService.FindPatients(queryOptions, "10000").then(function (result) {
                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    __this._$scope.gridOptionsSeries.api.hideOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {                                
                                eventService.publish(EventNames.SearchPatientsSuccess, result.data);                                
                                __this._patientDataRange_from = 0;
                                __this._patientData = result.data;
                                var rangedPatientData = $scope.getPatientDataRange();
                                
                                $scope.gridOptions.api.setRowData(rangedPatientData);
                            }
                        }, function (error) {
                            });
                        break;
                    case 'pacs':
                        queryPacsService.FindPatients($scope.querySource.pacs, queryPacsService.clientAETitle, queryOptions).then(function (result) {
                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    __this._$scope.gridOptionsSeries.api.hideOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {                                
                                eventService.publish(EventNames.SearchPatientsSuccess, result.data);                                
                                __this._patientData = result.data;

                                var rangedPatientData = $scope.getPatientDataRange();

                                $scope.gridOptions.api.setRowData(rangedPatientData);
                            }
                        }, function (error) {
                                eventService.publish("Search/Study/Failure", { error: error });
                            });
                        break;
                }
            }


            $scope.clear = function () {
                $scope.queryOptions = new Models.QueryOptions();
                $scope.queryOptions.SeriesOptions.SeriesDateStart = null;
                $scope.queryOptions.SeriesOptions.SeriesDateEnd = null;
                this.gridOptions.api.setRowData([]);    
                this.gridOptionsSeries.api.setRowData([]);   
                this._selectedSeries = null;         
                __this._patientData = null;
            }
           
            $scope.OnSeriesSearchError = function (data, status) {
                eventService.publish(EventNames.SearchSeriesFailure, { data: data, status: status });
            }                     

            $scope.openDateStart = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();

                $scope.datePicker.dateStartOpened = !$scope.datePicker.dateStartOpened;
            } 

            $scope.openDateEnd = function ($event) {
                $event.preventDefault();
                $event.stopPropagation();

                $scope.datePicker.dateEndOpened = !$scope.datePicker.dateEndOpened;
            }

            $scope.queryModeChanged = function () {
                $scope.clear();
            }  
            
            $scope.onLayoutChanged = function (newValue, oldValue) {
                setTimeout(function () {
                    try {
                        $scope.gridOptions.api.sizeColumnsToFit();
                        $scope.gridOptionsSeries.api.sizeColumnsToFit();                    
                    }
                    catch (e) {
                    }
                }, 250);
            }  
            
            $scope.onSearchTabSelected = function () {
                setTimeout(function () {
                    var studyNodes = $scope.gridOptions.api.getSelectedNodes();
                    var seriesNodes = $scope.gridOptions.api.getSelectedNodes();

                    $scope.gridOptions.api.sizeColumnsToFit();
                    $scope.gridOptionsSeries.api.sizeColumnsToFit();
                    $scope.gridOptions.api.refreshView();
                    $scope.gridOptionsSeries.api.refreshView();

                    if (studyNodes.length > 0) {
                        $scope.gridOptions.api.ensureNodeVisible(studyNodes[0]);
                    }

                    if (seriesNodes.length > 0) {
                        $scope.gridOptionsSeries.api.ensureNodeVisible(seriesNodes[0]);
                    }
                }, 225);
            }                                                                                                  

            $scope.$watch('windowDimensions', function (newValue, oldValue) {
                if ($scope.gridOptions.api) {
                    setTimeout(function () {
                        $scope.gridOptions.api.sizeColumnsToFit();
                        $scope.gridOptionsSeries.api.sizeColumnsToFit();
                    }, 500);
                }
            });   


            // when the first frame is loaded, then you can removing the loading background from the series list in the search tab.
            eventService.subscribe(EventNames.SeriesLoading, function (event, data) {
                if (__this._$scope != null) {
                    if (__this._$scope.gridOptionsSeries != null) {
                        if (__this._$scope.gridOptionsSeries.api != null) {
                            __this._$scope.gridOptionsSeries.api.hideOverlay();
                        }
                    }
                }
            });

            eventService.subscribe(EventNames.LoadSelectedSeries, function (event, data) {
                var input : any = {};
                input.node = {};
                input.node.data = data.args.data;

                var study = [];
                study[0] = {};
                study[0].data = input.node.data.Patient;

                __this._seriesManagerService.currentLoadingSeries = data.args.data;
                __this._seriesManagerService.currentPatientSeries = data.args.study;
                __this._selectedSeries = data.args.data;
                __this._selectedStudy = input.node.data.Patient;

                if (__this._selectedSeries.Boxes != undefined) {

                    __this._seriesManagerService.currentPatientSeries = data.args.study;

                    __this._seriesManagerService.currentLoadingSeries = data.args.data;

                    __this._seriesManagerService.currentStructuredDisplay = __this._selectedSeries;
                    __this._templateService.currentStudyLayout = __this._selectedSeries;

                    __this.loadselectedStructureDisplay(__this._selectedSeries);

                    __this._eventService.publish(EventNames.StructuredDisplaySelected, {
                        structureDisplay: __this._selectedSeries,
                    });
                }
                else {
                        __this.matchTemplateForSeries(input, study);
                }
            });


            eventService.subscribe(EventNames.LoadFromOverflow, function (event, data) {

                var cell: lt.Controls.Medical.Cell = data.args.cell;

                // delete the cell that we are dragging, then load the newly dragged cell.
                if (cell) {
                    cell.viewer.layout.get_items().remove(cell);
                    if (cell.get_automation) {
                        Utils.disposeAutomation(cell.get_automation());
                    }
                    __this._seriesManagerService.remove_cell(cell);
                    __this._seriesManagerService.set_activeCell(cell.divID);
                    cell.dispose();
                }

                __this.queryForSeries(__this, data.args.SeriesInstanceUID, data.args.ImageBoxNumber, data.args.SopInstanceUID, true /*data.args.structuredDisplay*/, __this._templateService.currentStudyLayoutID);
                
            }.bind(this));



            eventService.subscribe(EventNames.MrtiInfoReady, function (event, data) {
                if (this._$scope && this._$scope.gridOptionsSeries) {
                    Utils.clearMrti(this._$scope.gridOptionsSeries.api, this._$scope.gridOptionsSeries.rowData, data.args.seriesInstanceUID);
                }
            }.bind(this));

            eventService.subscribe(EventNames.OnFrameLoaded, function (event, data) {

                var cell: lt.Controls.Medical.Cell = data.args.cell;
                var patient = __this._queryArchiveService.get_PatientData(cell.seriesInstanceUID);

                if (__this._templateService.currentStudyLayout) {
                    patient.LoadedBoxes--;

                    var tab: Models.Tab = __this.getPatientTab(patient[0].Patient.ID, __this._tabService);

                    if (patient.LoadedBoxes < 1) {

                        if (authenticationService.hasPermission(PermissionNames.CanExport))
                            __this._toolbarService.enable("PopupCapture" + tab.id);

                    }
                }
                else {
                    eventService.publish(EventNames.RefreshToolbar, {
                        cell: null,
                        tab: tab,
                        viewer: null
                    });
                }

            });

            eventService.subscribe(EventNames.ToolbarCreated, function (event, data) {
                //var cell: lt.Controls.Medical.Cell = data.args.cell;
                //var patient = __this._queryArchiveService.get_PatientData(cell.seriesInstanceUID);
                //if (__this._templateService.currentStudyLayout) {
                //    patient.LoadedBoxes = 0;

                //    var tab: Models.Tab = __this.getPatientTab(patient[0].Patient.ID, __this._tabService);

                //    __this._toolbarService.disable("PopupCapture" + tab.id);
                //}
                //else {
                //    eventService.publish(EventNames.RefreshToolbar, {
                //        cell: null,
                //        tab: tab,
                //        viewer: null
                //    });
                //}
            });

        }

        private getSelectedSeries(structureDisplay, usedList: boolean)
        {
            var seriesInstanceUID = structureDisplay.Series[0].SeriesInstanceUID;
            var studyInstanceUID = structureDisplay.Series[0].StudyInstanceUID;

            var index = 0;
            var seriesArray = usedList ? this._queryArchiveService._currentPatientSeries : this._$scope.gridOptionsSeries.rowData;
            if (!seriesArray) {
                seriesArray = this._seriesManagerService.currentPatientSeries;
            }
            var length = seriesArray.length;

            for (index = 0; index < length; index++) {
                if (seriesArray[index].InstanceUID) {
                    if (seriesArray[index].InstanceUID == seriesInstanceUID)
                        return seriesArray[index];
                }
                else {
                    if (seriesArray[index].StudyInstanceUID == studyInstanceUID)
                        return seriesArray[index];
                }
            }
        }

        private get_PatientStructuredDisplayItems() {
            var menuItems = {};

            for (var i = 0; i < this._localStructuredDisplay.length; i++) {
                var protocolResult: Models.HangingProtocolQueryResult = this._localStructuredDisplay[i];
                menuItems[protocolResult.Name] = {
                    name: protocolResult.Name
                }
            }

            return menuItems;
        }


        private handleCellClicked(params) {
            if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.desktop) {
                if (this._rowIndexPrevious == params.rowIndex) {
                    if (this._viewStudy == false) {
                        this._$scope.hpContextMenu(params)
                    }
                }
                this._rowIndexPrevious = params.rowIndex;
            }
        }

        // get the data, find if the series {seriesInstanceUID} is in there, and load it.
        private loadSeriesFromData(data, seriesInstanceUID, imageBoxNumber, sopInstanceList, loadstructureDisplay, sdID : string, templateItem) {
            if (data["FaultType"]) {
                if (data["Message"]) {
                    alert(data["Message"]);
                }
            }
            else {

                var index = 0;
                var length = data.length;
                var seriesData = null;
                var item = data.get_PatientData(seriesInstanceUID);

                length = item.length;
                for (index = 0; index < length; index++) {
                    if (item[index].InstanceUID == seriesInstanceUID) {
                        seriesData = JSON.parse(JSON.stringify(item[index]));

                        break;
                    }
                }


                if (seriesData) {
                    // if this is not an over flow image, then add it to the list of loaded boxes of the structured display.
                    if (imageBoxNumber != -1)
                        item.LoadedBoxes++;
                    seriesData.ImageBoxNumber = imageBoxNumber; // studyLayout.ImageBoxNumber;
                    seriesData.SopInstanceUIDs = sopInstanceList;
                    this.loadSeries({ InstanceUID: seriesData.StudyInstanceUID, sdID: sdID, templateItem: templateItem}, seriesData, loadstructureDisplay);
                }
            }
        }

        private queryForSeries(self, seriesInstanceUID: string, imageBoxNumber: number, sopInstanceUidList: string[], loadstructureDisplay: boolean, sdID: string, templateItem?) {
            var query: Models.QueryOptions = new Models.QueryOptions;

            var _seriesInstanceUID = seriesInstanceUID;
            var _imageBoxNumber = imageBoxNumber;
            var _sopInstanceList = sopInstanceUidList;

            query.SeriesOptions.SeriesInstanceUID = _seriesInstanceUID;

            // optimizing the speed, we just got the series information when we clicked on the patient for the first time, so we saved the results for this.
            if (self._queryArchiveService._currentPatientSeries != null) {
                setTimeout(function () {
                    var data = self._queryArchiveService._currentPatientSeries;

                    self.loadSeriesFromData(self._queryArchiveService, _seriesInstanceUID, _imageBoxNumber, _sopInstanceList, loadstructureDisplay, sdID, templateItem);
                }, 1);
            }
            else {

                switch (self._$scope.querySource.name) {
                    case 'database':
                        self._queryArchiveService.FindSeries(query, 1).then(function (result) {

                            var imageData = result.data;

                            if (imageData.length)
                                imageData = result.data[0];

                            self._queryArchiveService._currentPatientSeriesArray[imageData.Patient.ID] = result.data;

                            self.loadSeriesFromData(self._queryArchiveService, _seriesInstanceUID, _imageBoxNumber, _sopInstanceList, loadstructureDisplay, sdID);
                        });
                        break;
                    case 'pacs':
                        self._queryPacsService.FindSeries(self._$scope.querySource.pacs, self._queryPacsService.clientAETitle, query).then(function (result) {
                            var imageData = result.data;

                            if (imageData.length)
                                imageData = result.data[0];

                            self._queryArchiveService._currentPatientSeriesArray[imageData.Patient.ID] = result.data;

                            self.loadSeriesFromData(self._queryArchiveService, _seriesInstanceUID, _imageBoxNumber, _sopInstanceList, loadstructureDisplay, sdID);
                        });
                        break;
                }
            }
        }

        private loadSeries(study, series, loadstructureDisplay) {
            this._eventService.publish(EventNames.SeriesSelected, {
                study: study,
                series: series,
                remote: this._$scope.querySource.name == 'pacs',
                structureDisplay: loadstructureDisplay, 
                templateItem: study.templateItem,
                studyLoad: true,
                dentalSearchController: this
            });
        }

        public getStructredDisplayInstancesInfo(data): ng.IPromise<any> {

            var seriesList: any = [];
            var self = this;

            var index = 0;
            var length = data.Series.length;

            for (index = 0; index < length; index++) {
                if (seriesList.indexOf(data.Series[index].SeriesInstanceUID) == -1)
                    seriesList.add(data.Series[index].SeriesInstanceUID);
            }

            //console.clear();

            //Utils.debug_timer = (new Date()).getTime();
            return this._queryArchiveService.FindSeriesArrayInstances(seriesList).then(function (result) {

                var output = {};

                var data = result.data;
                var seriesInstanceUID;

                if (data == null)
                    return;

                index = 0;
                length = data.length;

                for (index = 0; index < length; index++) {
                    seriesInstanceUID = data[index].SeriesInstanceUID;
                    if (!output[seriesInstanceUID]) {
                        output[seriesInstanceUID] = [];
                    }
                    output[seriesInstanceUID].add(data[index]);
                }
                  

                self._seriesManagerService.SeriesInstancesList = output;
                //alert(((new Date()).getTime() - Utils.debug_timer).toString());
                return;
            });
        }

        private matchItemToTemplate(series, studyInstanceUID, seriesInstanceUID, structuredDisplay) {
            var __this = this;
            var sopInstanceUID = series.SOPInstanceUID;
            // load the json for every frame and see where it fits in the viewer.
            this._objectRetrieveService.GetDicomJSON(studyInstanceUID, seriesInstanceUID, sopInstanceUID).then(function (result : any) {

                var json = JSON.parse(result.data);
                var loaded = false;
                var length = structuredDisplay.Boxes.length;
                for (var index = 0; index < length; index++) {

                    var box = structuredDisplay.Boxes[index];

                    if (Utils.isInstanceOfSOP(box, json, sopInstanceUID, DicomHelper.getDicomTagValue(json, DicomTag.InstanceNumber, 0))) 
                    {

                        var frameOFRefrences = [];
                        if (box && !box.IsMapped) {

                            box.IsMapped = true;


                            // workaround for the overflow, if any of boxes them doesn't have a valid width or height, then consider it overflow.
                            var width = box.Position.rightBottom.x - box.Position.leftTop.x;
                            var height = box.Position.rightBottom.y - box.Position.leftTop.y;

                            if (width != 0 && height != 0) {
                                // array of 1 item.
                                frameOFRefrences = [sopInstanceUID];

                                // load the frame on a seprate cell.
                                __this.queryForSeries(__this, seriesInstanceUID, box.ImageBoxNumber, frameOFRefrences, true, structuredDisplay.ID, box);
                                loaded = true;
                                structuredDisplay.LoadedItems++;
                            }
                        }
                    }
                }

                if (!loaded) {

                    __this.queryForSeries(__this, seriesInstanceUID, -1, series, true, structuredDisplay.ID);
                    structuredDisplay.LoadedItems++;
                    structuredDisplay.OverflowItems++;
                }

                // if we load all the images but found out that none of them was overflow image, then we need to close the overflow window.
                if (structuredDisplay.TotalNumber == structuredDisplay.LoadedItems) {
                    if (structuredDisplay.OverflowItems == 0) {
                        var tab: Models.Tab = __this.getPatientTab(structuredDisplay.PatientID, __this._tabService);

                        __this._eventService.publish(EventNames.InstanceOverflowClose, { seriesInstanceUID: seriesInstanceUID, tab: tab});
                    }
                }
            });
        }

        public createStructuredDisplayFromTemplate(template: any, studyInstanceUID, seriesInstanceUID) {
            var output: any = {};

            var input = template.Frames ? template.Frames : template.Boxes;
            var index = 0;
            var length = input.length;
            var box;
            var frame;
            output.Boxes = [];


            output.Rows = -1;
            output.Columns = -1;
            output.Name = template.Name;
            output.OtherStudies = [];
            output.Series = [];


            for (index = 0; index < length; index++) {
                frame = input[index];
                box = {};

                box.ColumnPosition = frame.ColumnPosition ? frame.ColumnPosition : -1;
                box.FirstFrame = frame.FirstFrame ? frame.FirstFrame : {};
                box.HorizontalJustification = frame.HorizontalJustification;
                box.VerticalJustification = frame.VerticalJustification;
                box.ImageBoxLargeScrollAmount = frame.ImageBoxLargeScrollAmount;
                box.ImageBoxLargeScrollType = frame.ImageBoxLargeScrollType ? frame.ImageBoxLargeScrollType : 0;
                box.ImageBoxLayoutType = frame.ImageBoxLayoutType ? frame.ImageBoxLayoutType : 4;
                box.ImageBoxNumber = frame.FrameNumber ? frame.FrameNumber : index + 1;
                box.ImageBoxScrollDirection = frame.ImageBoxScrollDirection;
                box.ImageBoxSmallScrollAmount = frame.ImageBoxSmallScrollAmount;
                box.ImageBoxSmallScrollType = frame.ImageBoxSmallScrollType;
                box.ImageBoxTileHorizontalDimension = frame.ImageBoxTileHorizontalDimension ? frame.ImageBoxTileHorizontalDimension : 1;
                box.ImageBoxTileVerticalDimension = frame.ImageBoxTileVerticalDimension ? frame.ImageBoxTileVerticalDimension : 1;
                box.NumberOfColumns = frame.NumberOfColumns ? frame.NumberOfColumns : 0;
                box.NumberOfRows = frame.NumberOfRows ? frame.NumberOfRows : 0;
                box.Position = {
                    leftTop: { x: frame.Position.leftTop.x, y: frame.Position.leftTop.y }, rightBottom: { x: frame.Position.rightBottom.x, y: frame.Position.rightBottom.y }
                }

                // to handle the case where the y is calculate from top left or bottom left;
                if (box.Position.rightBottom.y < box.Position.leftTop.y) {
                    var temp = box.Position.rightBottom.y;
                    box.Position.rightBottom.y = box.Position.leftTop.y;
                    box.Position.leftTop.y = temp;
                }

                box.PreferredPlaybackSequencing = frame.PreferredPlaybackSequencing;
                box.RecommendedDisplayFrameRate = frame.RecommendedDisplayFrameRate;
                box.ReferencedPresentationStateSOP = frame.ReferencedPresentationStateSOP ? frame.ReferencedPresentationStateSOP : ""
                box.RowPosition = frame.RowPosition ? frame.RowPosition : -1;
                box.WindowCenter = frame.WindowWidth ? frame.WindowWidth : -1;
                box.WindowWidth = frame.WindowCenter ? frame.WindowCenter : -1;
                box.referencedSOPInstanceUID = frame.referencedSOPInstanceUID;

                box.FrameNumber = frame.FrameNumber;
                box.SequenceNumber = frame.SequenceNumber;
                box.Rotation = frame.Rotation;
                box.PresentationSizeMode = frame.PresentationSizeMode;
                box.Magnification = frame.Magnification;
                box.ImageComments = frame.ImageComments;
                box.AnatomicDescription = frame.AnatomicDescription;
                box.Script = frame.Script;
                box.Flip = frame.Flip;
                box.Reverse = frame.Reverse;
                box.Invert = frame.Invert;



                output.Boxes[index] = box;
            }

            output.Series[0] = { StudyInstanceUID: studyInstanceUID, SeriesInstanceUID: seriesInstanceUID };


            return output;
        }

        // when you get a template, convert the template value into a structred display format.
        public loadStructuredDisplayFromTemplate(template, seriesInstanceUID, studyInstanceUID) {

            var structuredDisplay = this.createStructuredDisplayFromTemplate(template, studyInstanceUID, seriesInstanceUID);
            // converted structured display (structuredDisplay)

            var self = this;

            this._seriesManagerService.currentLoadingSeries = this.getSelectedSeries(structuredDisplay, false);
            this._seriesManagerService.structuredDisplayList = this._localStructuredDisplay;
            this._seriesManagerService.currentStructuredDisplay = structuredDisplay;
            this._templateService.currentStudyLayout = structuredDisplay;
            structuredDisplay.PatientID = this._seriesManagerService.currentLoadingSeries.Patient.ID;
            structuredDisplay.LoadedItems = 0;
            structuredDisplay.OverflowItems = 0;

            this._templateService.currentStudyLayoutID = UUID.genV4().toString();
            structuredDisplay.ID = this._templateService.currentStudyLayoutID;
            var self = this;

            // clear the overflow everytime you load a new structured display.
            if (structuredDisplay.Series.length != 0) {
                var tab: Models.Tab = self.getPatientTab(structuredDisplay.PatientID, self._tabService);
                self._eventService.publish(EventNames.InstanceOverflowClear, { seriesInstanceUID: seriesInstanceUID, tab: tab});
            }

            // load the jason of every frame and display them according to the json data matching the template value.
            this.getStructredDisplayInstancesInfo(structuredDisplay).then(function (result) {

                var index = 0;
                var seriesList: any = self._seriesManagerService.SeriesInstancesList[seriesInstanceUID];
                var length = seriesList.length;

                structuredDisplay.TotalNumber = length;

                for (index = 0; index < length; index++) {

                    self.matchItemToTemplate(seriesList[index], studyInstanceUID, seriesInstanceUID, structuredDisplay);
                }
            });


            // reset the viewer, so we can load the next template.
            this._eventService.publish(EventNames.StructuredDisplaySelected, {
                structureDisplay: structuredDisplay,
            });

            return structuredDisplay;
        }

        public loadselectedStructureDisplay(data) {

            // 
            this._templateService.currentStudyLayoutID = UUID.genV4().toString();
            data.ID = this._templateService.currentStudyLayoutID;
            var self = this;
            this.getStructredDisplayInstancesInfo(data).then(function () {

                //Utils.debug_counter = 0;
                //Utils.debug_timer = (new Date()).getTime();

                //eventService.subscribe(EventNames.SelectedTabChanged, function (event, data) {
                //}.bind(this));



                var loadstructureDisplay: boolean = true;

                //this._dataCache['StudyInstanceUID'] = this._selectedStudy.InstanceUID;
                var studyLayout: Models.StudyLayout = null;
                //this._objectRetrieveService.GetStudyLayout(<any>(this._selectedStudy.InstanceUID)).then(function (result) {
                studyLayout = data;

                self._templateService.currentHangingProtocol = null;

                if (data == "") {

                    var counter = 0;
                    var index = 0;
                    var length = self._$scope.gridOptionsSeries.rowData.length;
                    for (index = 0; index < length; index++) {
                        if (self._$scope.gridOptionsSeries.rowData[index].CompleteMRTI) {
                            counter++;
                        }
                    }
                }


                if (self._templateService.currentStudyLayoutID != data.ID)
                    return;

                self._templateService.currentStudyLayout = studyLayout;


                // when you load the structured display, remove any previous series loaded on that tab, this value will become false after clearing the series.
                self._seriesManagerService.cleanupSeries = true;

                if (!angular.isDefined(studyLayout["Series"])) {
                    self.loadSeries(self._selectedStudy, self._$scope.gridOptionsSeries.rowData[0], loadstructureDisplay);

                }
                else {

                    var tab: Models.Tab = self.getPatientTab(data.Patient.ID, self._tabService);

                    var usedSOP: any = [];

                    var frameOFRefrences = null;

                    self._templateService.currentStudyLayout.LoadedBoxes = 0;

                    // clear the overflow everytime you load a new structured display.
                    if (studyLayout.Series.length != 0) {
                        self._eventService.publish(EventNames.InstanceOverflowClear, { seriesInstanceUID: studyLayout.Series[0].SeriesInstanceUID, tab: tab});
                    }




                    studyLayout['studyInstanceUID'] = self._selectedStudy.InstanceUID;
                    $.each(studyLayout.Series, function (index: number, item: Models.SeriesInfo) {
                        var series = self._seriesManagerService.get_seriesInfo(item.SeriesInstanceUID);
                        var box = studyLayout.Boxes[self.getImageBox(item.ImageBoxNumber, studyLayout.Boxes)];
                        if (box) {

                            // workaround for the overflow, if any of boxes them doesn't have a valid width or height, then consider it overflow.
                            var width = box.Position.rightBottom.x - box.Position.leftTop.x;
                            var height = box.Position.rightBottom.y - box.Position.leftTop.y;

                            if (width != 0 && height != 0) {
                                frameOFRefrences = box.referencedSOPInstanceUID;
                                self.queryForSeries(self, item.SeriesInstanceUID, item.ImageBoxNumber, frameOFRefrences, loadstructureDisplay, data.ID);

                                usedSOP.add(frameOFRefrences[0]);
                            }
                        }
                    });


                    $.each(studyLayout.OtherStudies, function (index: number, study: Models.OtherStudies) {
                        $.each(study.Series, function (index: number, item: Models.SeriesInfo) {
                            var series = self._seriesManagerService.get_seriesInfo(item.SeriesInstanceUID);

                            var box = studyLayout.Boxes[self.getImageBox(item.ImageBoxNumber, studyLayout.Boxes)];

                            // workaround for the overflow, if any of boxes them doesn't have a valid width or height, then consider it overflow.
                            var width = box.Position.rightBottom.x - box.Position.leftTop.x;
                            var height = box.Position.rightBottom.y - box.Position.leftTop.y;

                            if (width != 0 && height != 0) {
                                frameOFRefrences = box.referencedSOPInstanceUID;
                                self.queryForSeries(self, item.SeriesInstanceUID, item.ImageBoxNumber, frameOFRefrences, loadstructureDisplay, data.ID);

                                usedSOP.add(frameOFRefrences[0]);
                            }
                        });
                    });


                    // go through all the images in the selected study, and see if it's used in the strcutured, display, if not, then it belongs to the overflow.
                    for (var seriesInstanceUID in self._seriesManagerService.SeriesInstancesList) {

                        var index = 0;
                        var length = self._seriesManagerService.SeriesInstancesList[seriesInstanceUID].length;
                        var sop;
                        var foundOne: boolean = false;
                        for (index = 0; index < length; index++) {

                            // if the frame is not used, then use it here.
                            if (usedSOP.indexOf(self._seriesManagerService.SeriesInstancesList[seriesInstanceUID][index].SOPInstanceUID) == -1) {
                                self.queryForSeries(self, seriesInstanceUID, -1, self._seriesManagerService.SeriesInstancesList[seriesInstanceUID][index], loadstructureDisplay, data.ID);
                                foundOne = true;
                            }
                        }
                    }

                    /// mock overflow display for testing, comment this out.
                    //for (var seriesInstanceUID in self._seriesManagerService.SeriesInstancesList) {

                    //    self.queryForSeries(self, seriesInstanceUID, -1, self._seriesManagerService.SeriesInstancesList[seriesInstanceUID][0]/*studyLayout.Boxes[self.getImageBox(item.ImageBoxNumber, studyLayout.Boxes)].referencedSOPInstanceUID*/, loadstructureDisplay, data.ID);
                    //        }


                    // close the overflow if you can't find a single overflow image.
                    if (!foundOne) {
                        self._eventService.publish(EventNames.InstanceOverflowClose, { seriesInstanceUID: studyLayout.Series[0].SeriesInstanceUID, tab: tab });
                    }
  

                    


                }
                //});

                self._viewStudy = false;
            });
        }

        private getImageBox(imageBoxNumber: number, boxes) {

            var index = 0;
            var length = boxes.length;

            for (index = 0; index < length; index++) {
                if (boxes[index].ImageBoxNumber == imageBoxNumber)
                    return index;
            }

            return -1;
        }


        private waitForStructuredDisplayData(data, loadBest?: boolean) {
            var self = this;

            // if we are still loading the patient series, then keep trying until we are done loading (the flag will be false by then).
            if (self._loadingPatientSeries == true) {
                setTimeout(function () {
                    self.waitForStructuredDisplayData(data);
                }, 100);
            }
            else {
                var query: Models.HangingProtocolQuery = new Models.HangingProtocolQuery();

                this._loadingStructuredDisplay = true;
                this._localStructuredDisplay = new Array<Models.HangingProtocolQueryResult>();

                // show the structured display once we done loading them.
                 this.showStructuredDisplayMenu(data, loadBest);

                this._objectRetrieveService.GetPatientStructuredDisplay(data.data.ID).then(function (result) {
                    self._localStructuredDisplay = result.data;
                    self.set_structuredDisplay(result.data);
                    self._loadingStructuredDisplay = false;

                });
            }
        }


        private showStructuredDisplayMenu(data, loadBest?: boolean) {
            var self = this;
            if (this._loadingStructuredDisplay == true) {
                setTimeout(function () {
                    self.showStructuredDisplayMenu(data, loadBest);
                }, 100);
            }
            else {
                try
                {
                    if (this._localStructuredDisplay != null) {
                        if (this._localStructuredDisplay.length != 0) {
                            $('.patientContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
                        }
                    }
                }
                catch { }
                if (this._sdOpenWith.length > 0) {
                    $('.data-title').attr('data-menutitle', this._sdOpenWith);
                }
            }
        }

        private getModality(data  :[]) {
            var index = 0;
            var length = data.length;
            var series;


            for (index = 0; index < length; index++) {

                series = data[index];
                series.Modaa
            }

        }

        // series is temp until we get the correct data.



        private patientSelected(evt) {
            this.set_patientSelected(true);
            var selectedNodes: Array<any> = this._$scope.gridOptions.api.getSelectedNodes();
            var self = this;

            if (selectedNodes.length == 1 && selectedNodes[0].data != this._selectedPatient) {
                var queryOptions: Models.QueryOptions = new Models.QueryOptions();
                var maxSeriesResults: string = this._optionsService.get(OptionNames.MaxSeriesResults);
                
                queryOptions.PatientsOptions.PatientID = evt.node.data.ID;
                this._selectedPatient = evt.node.data;

                if (angular.isDefined(this._$scope.queryOptions.SeriesOptions.SeriesDateStart)) {
                    queryOptions.SeriesOptions.SeriesDateStart = this._$scope.queryOptions.SeriesOptions.SeriesDateStart;
                }

                if (angular.isDefined(this._$scope.queryOptions.SeriesOptions.SeriesDateEnd)) {
                    queryOptions.SeriesOptions.SeriesDateEnd = this._$scope.queryOptions.SeriesOptions.SeriesDateEnd;
                }

                if (angular.isDefined(this._$scope.queryOptions.SeriesOptions.SeriesDescription)) {
                    queryOptions.SeriesOptions.SeriesDescription = this._$scope.queryOptions.SeriesOptions.SeriesDescription;
                }

                // status is.... we are loading the patient series now.
                self._loadingPatientSeries = true;
                var patientID = evt.node.data.ID;

                this._$scope.gridOptionsSeries.api.setRowData([]);    
                this._$scope.gridOptionsSeries.api.hideOverlay();           
                switch (this._$scope.querySource.name) {
                    case 'database':
                        this._queryArchiveService.FindSeries(queryOptions, maxSeriesResults).then(function (result) {

                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    self._$scope.gridOptionsSeries.api.hideOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {

                                var nodes = self._$scope.gridOptions.api.getSelectedNodes();

                                if (nodes && nodes.length > 0) {
                                    patientID = nodes[0].data.ID;
                                }

                                if (result.data.length > 0) {
                                    if (patientID != result.data[0].Patient.ID) {
                                        return;
                                    }
                                }


                                if (self._optionsService.get(OptionNames.SearchStructuredDisplay)) {

                                    self._objectRetrieveService.GetPatientStructuredDisplay(queryOptions.PatientsOptions.PatientID).then(function (sdResult) {

                                        var nodes = self._$scope.gridOptions.api.getSelectedNodes();

                                        if (nodes && nodes.length > 0) {
                                            patientID = nodes[0].data.ID;
                                        }

                                        if (result.data.length > 0) {
                                            if (patientID != result.data[0].Patient.ID) {
                                                return;
                                            }
                                        }


                                        Utils.prepareDataForSeriesDisplay(sdResult.data, result.data[0], result.data[0].Patient);

                                        self._localStructuredDisplay = sdResult.data;

                                        // filtering out the strcutrued display that doesn't meet the search criteria.
                                        Utils.filterOutStructuredDisplay(self._localStructuredDisplay, result.data);
                                        Utils.findSeriesNotUsedByStructuredDisplay(self._localStructuredDisplay, self._localStructuredDisplay, result.data, false);

                                        self._dataService.set_Series(self._localStructuredDisplay);

                                        // sort data based on the date.
                                        Utils.SortData(sdResult.data);

                                        self._$scope.gridOptionsSeries.api.setRowData(sdResult.data);
                                        if (sdResult.data.length == 0) {
                                            self._$scope.gridOptionsSeries.suppressNoRowsOverlay = false;
                                            self._$scope.gridOptionsSeries.api.showNoRowsOverlay()
                                        }

                                        self._loadingPatientSeries = false;
                                        self._queryArchiveService._currentPatientSeries = result.data; 

                                        self._queryArchiveService.set_CurrentPatientSeries(patientID, result.data);

                                    });

                                }
                                else {
                                    // sort data based on the date.
                                    Utils.SortData(result.data);

                                    self._dataService.set_Series(result.data);
                                    self._$scope.gridOptionsSeries.api.setRowData(result.data);
                                    if (result.data.length == 0) {
                                        self._$scope.gridOptionsSeries.suppressNoRowsOverlay = false;
                                        self._$scope.gridOptionsSeries.api.showNoRowsOverlay()
                                    }

                                    self._loadingPatientSeries = false;

                                    self._queryArchiveService._currentPatientSeries = result.data; 
                                    self._queryArchiveService.set_CurrentPatientSeries(patientID, result.data);

                                }
                            }

                        });
                        break;
                    case 'pacs':
                        self._queryPacsService.FindSeries(this._$scope.querySource.pacs, self._queryPacsService.clientAETitle, queryOptions).then(function (result) {
                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    self._$scope.gridOptionsSeries.api.hideLoadingOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {
                                self._dataService.set_Series(result.data);
                                self._$scope.gridOptionsSeries.api.setRowData(result.data);
                                if (result.data.length == 0) {
                                    self._$scope.gridOptionsSeries.suppressNoRowsOverlay = false;
                                    self._$scope.gridOptionsSeries.api.showNoRowsOverlay()
                                }
                            }

                            self._loadingPatientSeries = false;
                            self._queryArchiveService._currentPatientSeries = result.data; 
                            self._queryArchiveService.set_CurrentPatientSeries(patientID, result.data);

                        });
                        break;
                }
            }
            
            this._selectedSeries = null;
            this._selectedStudy = evt.node.data;
        }

        private matchTemplateForSeries(data, selectedStudies: Array<any>) {
            var StudyInstanceUID = data.node.data.StudyInstanceUID;
            var SeriesInstanceUID = data.node.data.InstanceUID;

            var _this = this;
            if (StudyInstanceUID && SeriesInstanceUID) {

                //read first instance's json
                var promise = this._objectRetrieveService.GetDicomJSON(StudyInstanceUID, SeriesInstanceUID, '');

                //on success
                promise.success(function (json) {

                    var _template = null;

                    this.getAutoMatchTemplates().some((template: Models.Template) => {

                        //parse the json and see if we have a match
                        try {
                            if (!_template) {
                                if (Utils.executeScript(template.AutoMatching, json)) {
                                    console.log('template auto-match found');
                                    _template = template;
                                    return true;//break;
                                }
                            }
                        }
                        catch (e) {
                            console.log(e);
                        }
                        return false;//continue
                    });

                    // is there a template that matchs the series so we could load it
                    if (_template) {
                        var searchController: DentalSearchViewController = this._tabService.get_tabData(this._tabService.tabs[0].id, TabDataKeys.searchViewerController);
                        searchController.loadStructuredDisplayFromTemplate(_template, SeriesInstanceUID, StudyInstanceUID);
                    }
                    else {

                        json = JSON.parse(json);

                        
                        var isStl = Utils.containsSTLData(json);




                        // last try, try to see if the SD creator has a layout that can be used to display the series.
                        return this._objectRetrieveService.GetSeriesLayout(SeriesInstanceUID, StudyInstanceUID).then(function (layout) {
                            if (layout) {
                                _template = layout.data;
                            }

                            if (_template) {
                                var searchController: DentalSearchViewController = _this._tabService.get_tabData(_this._tabService.tabs[0].id, TabDataKeys.searchViewerController);
                                searchController.loadStructuredDisplayFromTemplate(_template, SeriesInstanceUID, StudyInstanceUID);
                            }
                            else {
                                // oh for god sake, just load the series normally.
                                _this._eventService.publish(EventNames.SeriesSelected, {
                                    study: selectedStudies[0].data,
                                    series: data.node.data,
                                    remote: _this._$scope.querySource.name == 'pacs',
                                    template: _template,
                                    isSTL: isStl,
                                    dentalSearchController: _this,
                                    resetLayout: true
                                });
                            }
                        });
                    }
                }.bind(this));

                //on error - default to no template - continue loading
                promise.error(function (e) {
                    console.log(e);

                    this._eventService.publish(EventNames.SeriesSelected, {
                        study: selectedStudies[0].data,
                        series: data.node.data,
                        remote: this._$scope.querySource.name == 'pacs'
                    });
                });

            }
            else {
                console.log('failed to read study/series id');

                //default to no template - continue loading
                this._eventService.publish(EventNames.SeriesSelected, {
                    study: selectedStudies[0].data,
                    series: data.node.data,
                    remote: this._$scope.querySource.name == 'pacs'
                });
            }
        }

        private getPatientTab(patientid: string, tabService: TabService): Models.Tab {

            var tab = tabService.findTabByKey(TabDataKeys.PatientId, patientid);
            if (tab)
                return tab;

            var seriesList: Array<string> = this._seriesManagerService.get_allSeries();

            for (var i = 0; i < seriesList.length; i++) {
                var series = this._seriesManagerService.get_seriesInfo(seriesList[i]);

                if (series && (patientid == series.Patient.ID)) {
                    var tab: Models.Tab = this._seriesManagerService.get_seriesTab(seriesList[i]);

                    return tab;
                }
            }
            return null;
        }


        private seriesSelected(data) {
            this._$scope.gridOptionsSeries.api.showLoadingOverlay();

            var selectedStudies: Array<any> = this._$scope.gridOptions.api.getSelectedNodes();

            if (selectedStudies.length == 1) {
                var selectedSeries: Array < any > = this._$scope.gridOptionsSeries.api.getSelectedNodes();

                if (selectedSeries.length == 1) {

                    if ((selectedSeries[0].data != this._selectedSeries) || true) {
                        this._selectedSeries = data.node.data;

                        var tab: Models.Tab = this.getPatientTab(this._selectedSeries.Patient.ID, this._tabService);

                        if (tab != null) {
                            var controller = this._tabService.get_tabData(tab.id, TabDataKeys.ViewController);
                            controller = controller;
                        }

                        this._seriesManagerService.structuredDisplayList = this._localStructuredDisplay;

                        // is this a structured display that we are loading?
                        if (this._selectedSeries.Boxes != undefined) {

                            this._seriesManagerService.currentPatientSeries = this._queryArchiveService._currentPatientSeries;

                            this._seriesManagerService.currentLoadingSeries = this.getSelectedSeries(this._selectedSeries, true);

                            this._seriesManagerService.currentStructuredDisplay = this._selectedSeries;
                            this._templateService.currentStudyLayout = this._selectedSeries;

                            this.loadselectedStructureDisplay(this._selectedSeries);

                            this._eventService.publish(EventNames.StructuredDisplaySelected, {
                                structureDisplay: this._selectedSeries,
                            });

                        }
                        else {
                            this._seriesManagerService.currentLoadingSeries = data.node.data;
                            this._seriesManagerService.currentPatientSeries = this._queryArchiveService._currentPatientSeries;

                            this._seriesManagerService.currentStructuredDisplay = null;
                            this._templateService.currentStudyLayout = null;

                            this.matchTemplateForSeries(data, selectedStudies);
                        }
                    }
                }
            }
        }

        private hpContextMenu(data): void {
            this._$scope.gridOptions.api.selectNode(data.node, false, true);

            //$('.patientContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
            //if (this._sdOpenWith.length > 0) {
            //    $('.data-title').attr('data-menutitle', this._sdOpenWith);
            //}

            this.patientSelected(data);
            //this.waitForStructuredDisplayData(data);
        }


        private contextMenu(data) {
            this._selectedSeries = data.data;
            this._$scope.gridOptionsSeries.api.selectNode(data.node, false, true);
            $('.seriesContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
            if (this._openWith.length > 0) {
                $('.data-title').attr('data-menutitle', this._openWith);
            }
        }
    }

}