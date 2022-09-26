/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="Scopes.ts" />
/// <reference path="../Services/QueryArchiveService.ts" />

declare var uiGridConstants;

module Controllers {
    export interface IViewerSearchControllerScope extends ISearchControllerScope {
        config: any;
        studies: Array<any>;
        resultButtons: Array<any>;

        layoutConfig: any;
        layoutApi: any;
        outPanel();

        gridOptions: any;
        gridOptionsSeries: any;

        DateTypeChanged(dateType: string);
        selectedDateType: any;

        OnStudySearchError: Function;
        OnStudySearchSuccess: Function;
        patientids(value: string);
        patientNames(value: string);
        onClickRow(row: any);
        onViewStudy(row: any);
        resize();
        hpContextMenu(data: any): void;
        handleCellClicked(data: any): void;

        queryModel: any;
        showStudies();
    }

    export class SearchViewController extends SearchController {
        static $inject = ['$rootScope', '$scope', '$modal', 'eventService', 'queryArchiveService', 'optionsService', 'dataService', 'queryPacsService', 'authenticationService', 'tabService', 'seriesManagerService', 'objectStoreService', 'templateService', 'templateEditorService', '$translate', 'objectRetrieveService', 'dataCache'];

        private _$scope: IViewerSearchControllerScope;
        private _queryPacsService: QueryPacsService;
        private _objectStoreService: ObjectStoreService;
        private _objectRetrieveService: ObjectRetrieveService;
        private _dataService: DataService;
        private _optionsService: OptionsService;
        private _eventService: EventService;
        private _tabService: TabService;
        private _seriesManagerService: SeriesManagerService;
        private _selectedStudy;
        private _selectedSeries;
        private _selectedPatient;
        private _viewStudy: boolean;
        private _dataCache: any;
        private _localStructuredDisplay: Array<Models.HangingProtocolQueryResult>;
        private _hpOpenWith: string;
        private _sdOpenWith: string;
        private _loadingStudySeries: boolean;
        private _loadingHangingProtocols: boolean;
        private _hangingProtocols: Array<Models.HangingProtocolQueryResult>;
        private _rowIndexPrevious: number;
        private _patientSelected: boolean;


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


        constructor($rootScope, $scope: IViewerSearchControllerScope, $modal, eventService: EventService, queryArchiveService: QueryArchiveService, optionsService: OptionsService, dataService: DataService, queryPacsService: QueryPacsService, authenticationService: AuthenticationService, tabService: TabService, seriesManagerService: SeriesManagerService, objectStoreService: ObjectStoreService, templateService: TemplateService, templateEditorService: TemplateEditorService, $translate, objectRetrieveService: ObjectRetrieveService, dataCache) {
            var __this;
            var dateFormat = optionsService.get(OptionNames.DateFormat);
            var timeFormat = optionsService.get(OptionNames.TimeFormat);
            var maxStudyResults: string = optionsService.get(OptionNames.MaxStudyResults);
            var previous = UUID.generate();
            var next = UUID.generate();
            var selection;
            var studiesGroup = "Studies";
            var seriesGroup = "Series";

            super($rootScope, $scope, queryArchiveService, optionsService, authenticationService, queryPacsService, tabService, eventService, templateService, templateEditorService, $translate);

            __this = this;

            var spacingSize = Utils.get_spacingSize();
            var overflowSize = optionsService.get(OptionNames.SeriesThumbnailWidth) * 3;

            this._$scope = $scope;
            this._queryArchiveService = queryArchiveService;
            this._queryPacsService = queryPacsService;
            this._dataService = dataService;
            this._optionsService = optionsService;
            this._eventService = eventService;
            this._tabService = tabService;
            this._seriesManagerService = seriesManagerService;
            this._objectStoreService = objectStoreService;
            this._objectRetrieveService = objectRetrieveService;
            this._viewStudy = false;
            this._dataCache = dataCache;
            this._hpOpenWith = "Hanging Protocol";
            this._sdOpenWith = "Structured Display";
            this._rowIndexPrevious = -1;
            this._tabService.set_tabData(this._tabService.tabs[0].id, TabDataKeys.searchViewerController, this);
            this._patientSelected = false;

            $scope.hpContextMenu = this.hpContextMenu.bind(this);
            $scope.handleCellClicked = this.handleCellClicked.bind(this);



            $scope.queryModel = {
                toDate: new Date(),
            }

            //$scope.queryModel.toDate = new Date();
            $scope.queryModel.fromDate = this.addDays($scope.queryModel.toDate, -1);

            $scope.DateTypeChanged = function (dateType: string) {
                switch (dateType) {
                    case 'D':
                        $scope.queryModel.fromDate = __this.addDays($scope.queryModel.toDate, -1);
                        break;
                    case '3D':
                        $scope.queryModel.fromDate = __this.addDays($scope.queryModel.toDate, -3);
                        break;
                    case 'W':
                        $scope.queryModel.fromDate = __this.addDays($scope.queryModel.toDate, -7);
                        break;
                    case '2W':
                        $scope.queryModel.fromDate = __this.addDays($scope.queryModel.toDate, -14);
                        break;
                    case 'M':
                        $scope.queryModel.fromDate = __this.addMonths($scope.queryModel.toDate, -1);
                        break;
                }
            }

            $scope.layoutConfig = {
                applyDemoStyles: true,
                scrollToBookmarkOnLoad: false,
                spacing_closed: spacingSize,
                spacing_open: spacingSize,
                livePaneResizing: false,

                //center: {
                //    pacing_open: 6,
                //    spacing_closed: 8,
                //},

                //east: {
                //    spacing_open: 6,
                //    spacing_closed: 8,
                //    //initClosed: true,
                //    east__size: 300,
                //    east__resizable: true,
                //},

                east__spacing_open: 6,
                east__spacing_closed: 8,
                //initClosed: true,
                east__size: 770,
                east__resizable: true,
                east__initHidden: true,

                onopen: this.onOpenPane.bind(this)

            }

            $scope.layoutApi = {};

            $(document).on("click", "#searchResults .ag-body-viewport-wrapper", function (e) {
                if ($(e.target).is(".target_class") === false) {
                    $scope.layoutApi.closePane('east');
                }
            });

            $scope.gridOptions = {
                rowSelection: 'single',
                suppressNoRowsOverlay: true,
                groupHeaders: true,
                enableSorting: true,
                rowClass: 'studyContext',
                angularCompileRows: true,

                enableColResize: true,

                columnDefs: [
                    {
                        headerName: studiesGroup,
                        children: [
                            {
                                headerName: "",
                                cellRenderer: Utils.countRenderer,
                                width: 35,
                                suppressSizeToFit: true,
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this)
                            },
                            {
                                headerName: "Patient ID",
                                valueGetter: function (params) {
                                    return Utils.nameFormatter(params.data.Patient.ID);
                                },
                                cellRenderer: Utils.hyperlinkPatientIdRenderer,
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this),
                            },
                            {
                                headerName: "Name", valueGetter: function (params) {
                                    return Utils.nameFormatter(params.data.Patient.Name);
                                },
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this),
                                //cellStyle: { color: 'red', 'background-color': 'green' },
                                cellClass: 'target_class',
                                onCellDoubleClicked: function () {
                                    $scope.layoutApi.openPane('east');
                                }
                            },
                            {
                                headerName: "Accession #",
                                field: "AccessionNumber",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this)

                            },
                            {
                                headerName: "Study Date",
                                field: "Date",
                                cellRenderer: Utils.dateRenderer,
                                comparator: Utils.dateComparator,
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this)
                            },
                            {
                                headerName: "Refer Dr Name", valueGetter: function (params) {
                                    return Utils.nameFormatter(params.data.ReferringPhysiciansName);
                                },
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this)
                            },
                            {
                                headerName: "Description",
                                field: "Description",
                                onCellContextMenu: this.hpContextMenu.bind(this),
                                onCellClicked: this.handleCellClicked.bind(this)
                            }
                        ]
                    }
                ],
                onRowSelected: this.studySelected.bind(this),
                rowData: null,
                onGridReady: function () {
                    $scope.gridOptions.api.hideOverlay();
                    setTimeout(function () {
                        $scope.gridOptions.api.sizeColumnsToFit();
                    }, 500);

                    $.contextMenu({
                        selector: '.studyContext',
                        trigger: 'none',
                        className: 'data-title',
                        build: function ($trigger, e) {
                            var options = {
                                callback: function (key, options) {
                                    var selectedNodes: Array<any> = __this._$scope.gridOptions.api.getSelectedNodes();
                                    if (key == "NoHangingProtocolFound_407B6C09-83C2-4A7F-9643-AA4301F6A67A") {
                                        return;
                                    }

                                    __this.viewHangingProtocol(selectedNodes[0], key);
                                },
                                // items: __this.get_hangingProtocols_test()
                                items: __this.get_hangingProtocols()
                            }

                            return options;
                        }
                    });
                }
            }

            $scope.gridOptionsSeries = {
                rowSelection: 'single',
                suppressNoRowsOverlay: true,
                enableSorting: true,
                rowClass: 'seriesContext',
                groupHeaders: true,
                rowHeight: parseInt(optionsService.get(OptionNames.SeriesThumbnailHeight)),
                columnDefs: [
                    {
                        headerName: seriesGroup,
                        children: [
                            {
                                headerName: "",
                                cellRenderer: Utils.has_mrtiRenderer,
                                width: 29,
                                suppressSizeToFit: true,
                                onCellContextMenu: this.contextMenu.bind(this),
                                suppressSorting: true
                            },
                            {
                                headerName: "",
                                cellRenderer: Utils.thumbnailRenderer,
                                hide: !optionsService.get(OptionNames.ShowSearchThumbnails),
                                width: parseInt(optionsService.get(OptionNames.SeriesThumbnailWidth)),
                                onCellContextMenu: this.contextMenu.bind(this),
                                suppressSorting: true
                            },
                            {
                                headerName: 'Number', field: 'Number',
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Series Date', field: 'Date',
                                cellRenderer: Utils.dateRenderer,
                                onCellContextMenu: this.contextMenu.bind(this),
                                comparator: Utils.dateComparator
                            },
                            {
                                headerName: 'Description', field: 'Description',
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Modality', field: 'Modality',
                                onCellContextMenu: this.contextMenu.bind(this)
                            },
                            {
                                headerName: 'Instances', field: 'NumberOfRelatedInstances',
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
                },
            }

            $scope.queryOptions = new Models.QueryOptions();
            $scope.studies = new Array<any>();
            $scope.pacsConnections = queryPacsService.remoteConnections;

            selection = $scope.pacsConnections.filter(function (connection: Models.PACSConnection, index: number, array) {
                return connection.isDefault;
            });

            if (selection.length > 0) {
                $scope.querySource.pacs = selection[0];
            }

            $scope.doSearch = function () {
                __this.set_patientSelected(false);
                this._rowIndexPrevious = -1;

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

                if (angular.isDefined(queryOptions.StudiesOptions.ReferDoctorName)) {
                    var m = queryOptions.StudiesOptions.ReferDoctorName.match(/"(.*?)"/);

                    if (m == null) {
                        queryOptions.StudiesOptions.ReferDoctorName = queryOptions.StudiesOptions.ReferDoctorName.replace(' ', '^');
                    }
                    else {
                        queryOptions.StudiesOptions.ReferDoctorName = m[1].replace(/"/g, '');
                    }
                }

                if (angular.isDefined(queryOptions.StudiesOptions.ModalitiesInStudy)) {
                    if (queryOptions.StudiesOptions.ModalitiesInStudy.length > 0) {
                        var modality: string = (<any>queryOptions.StudiesOptions.ModalitiesInStudy);

                        queryOptions.StudiesOptions.ModalitiesInStudy = [];
                        queryOptions.StudiesOptions.ModalitiesInStudy.push(modality);
                    }
                }
                __this._selectedStudy = null;
                __this._selectedSeries = null;
                $scope.gridOptions.api.setRowData([]);
                $scope.gridOptionsSeries.api.setRowData([]);
                $scope.gridOptionsSeries.api.hideOverlay();
                switch ($scope.querySource.name) {
                    case 'database':
                        queryArchiveService.FindStudies(queryOptions, maxStudyResults).then(function (result) {
                            eventService.publish("Search/Study/Success", result.data);
                            $scope.gridOptions.api.setRowData(result.data);
                        }, function (error) {
                            eventService.publish("Search/Study/Failure", { error: error });
                        });
                        break;
                    case 'pacs':
                        queryPacsService.FindStudies($scope.querySource.pacs, queryPacsService.clientAETitle, queryOptions).then(function (result) {
                            eventService.publish("Search/Study/Success", result.data);
                            $scope.gridOptions.api.setRowData(result.data);
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
                $scope.gridOptions.api.setRowData([]);
                $scope.gridOptionsSeries.api.setRowData([]);

                __this._selectedStudy = null;
                __this._selectedSeries = null;
            }

            $scope.queryModeChanged = function () {
                $scope.studies.length = 0;
            }

            $scope.patientids = $.proxy(this.patientids, this);
            $scope.patientNames = $.proxy(this.patientNames, this);

            $scope.onLayoutChanged = function (newValue, oldValue) {
                setTimeout(function () {
                    if ($scope.gridOptions.api)
                        $scope.gridOptions.api.sizeColumnsToFit();
                    if ($scope.gridOptionsSeries.api)
                        $scope.gridOptionsSeries.api.sizeColumnsToFit();
                }, 250);
            }

            $scope.onSearchTabSelected = function () {
                setTimeout(function () {
                    var studyNodes = $scope.gridOptions.api.getSelectedNodes();
                    var seriesNodes = $scope.gridOptions.api.getSelectedNodes();

                    $scope.gridOptions.api.refreshView();
                    $scope.gridOptionsSeries.api.refreshView();
                    $scope.gridOptions.api.sizeColumnsToFit();
                    $scope.gridOptionsSeries.api.sizeColumnsToFit();

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


            eventService.subscribe(EventNames.LoadSelectedSeries, function (event, data) {
                var input: any = {};
                input.node = {};
                input.node.data = data.args.data;
                __this._seriesManagerService.currentLoadingSeries = data.args.data;
                __this._seriesManagerService.currentPatientSeries = data.args.study;
                __this._selectedSeries = data.args.data;
                if (__this._selectedSeries.Boxes != undefined) {
                }

                if (__this.isAnyTemplateAutoMatch()) {
                    __this.matchTemplateForSeries(input, input.node.data.Patient);
                }
                else {
                    __this._eventService.publish(EventNames.SeriesSelected, {
                        study: input.node.data.Patient,
                        series: input.node.data,
                        remote: __this._$scope.querySource.name == 'pacs',
                    });
                }
            });

            $scope.onViewStudy = this.onViewStudy.bind(this);

        }

        private onViewStudy(data: any) {
            this._viewStudy = true;
        }

        private viewHangingProtocol(data, sopInstanceUID: string) {
            var self = this;

            this._objectRetrieveService.GetHangingProtocol(sopInstanceUID).then(function (result) {
                var hp: Models.HangingProtocol = result.data;

                self._templateService.currentStudyLayout = null;
                self._templateService.currentHangingProtocol = hp;
                self._objectRetrieveService.GetHangingProtocolInstances(sopInstanceUID, self._selectedStudy.Patient.ID, self._selectedStudy.InstanceUID, self._selectedStudy.Date).then(function (result) {
                    self.loadHangingProtocol(result.data, hp);
                }, function (error) {
                });
            });
        }



        private getSelectedSeries(structureDisplay, usedList: boolean) {
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

        private loadSeriesFromData(data, seriesInstanceUID, imageBoxNumber, sopInstanceList, loadstructureDisplay, sdID: string, templateItem) {
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
                    this.loadSeries({ InstanceUID: seriesData.StudyInstanceUID, sdID: sdID, templateItem: templateItem }, seriesData, loadstructureDisplay);
                }
            }
        }


        private matchItemToTemplate(series, studyInstanceUID, seriesInstanceUID, structuredDisplay) {
            var __this = this;
            var sopInstanceUID = series.SOPInstanceUID;
            // load the json for every frame and see where it fits in the viewer.
            this._objectRetrieveService.GetDicomJSON(studyInstanceUID, seriesInstanceUID, sopInstanceUID).then(function (result: any) {

                var json = JSON.parse(result.data);
                var loaded = false;
                var length = structuredDisplay.Boxes.length;
                for (var index = 0; index < length; index++) {

                    var box = structuredDisplay.Boxes[index];

                    if (Utils.isInstanceOfSOP(box, json, sopInstanceUID, DicomHelper.getDicomTagValue(json, DicomTag.InstanceNumber, 0))) {

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

                        __this._eventService.publish(EventNames.InstanceOverflowClose, { seriesInstanceUID: seriesInstanceUID, tab: tab });
                    }
                }
            });

        }


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
                self._eventService.publish(EventNames.InstanceOverflowClear, { seriesInstanceUID: seriesInstanceUID, tab: tab });
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

        private studySelected(data, hpSopInstanceUID?: string) {
            this.set_patientSelected(true);
            var selectedNodes: Array<any> = this._$scope.gridOptions.api.getSelectedNodes();
            var viewStudy = this._viewStudy;

            this._viewStudy = false;
            this._loadingStudySeries = true;
            if (selectedNodes.length == 1 && selectedNodes[0].data != this._selectedStudy) {
                var query: Models.QueryOptions = new Models.QueryOptions;
                var maxSeriesResults: string = this._optionsService.get(OptionNames.MaxSeriesResults);
                var __this = this;
                var modalitiesInStudy = this._$scope.queryOptions.StudiesOptions.ModalitiesInStudy;
                this._selectedPatient = data.node.data.Patient;
                this._selectedStudy = data.node.data;
                this._$scope.gridOptionsSeries.api.setRowData(undefined);
                query.StudiesOptions = new Models.StudyQueryOptions();
                query.StudiesOptions.StudyInstanceUID = data.node.data.InstanceUID;
                if (angular.isDefined(modalitiesInStudy)) {
                    if (modalitiesInStudy.length > 0) {
                        var modality: string = (<any>modalitiesInStudy);

                        query.StudiesOptions.ModalitiesInStudy = [];
                        query.StudiesOptions.ModalitiesInStudy.push(modality);
                    }
                }

                switch (this._$scope.querySource.name) {
                    case 'database':
                        this._queryArchiveService.FindSeries(query, maxSeriesResults).then(function (result) {
                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    __this._$scope.gridOptionsSeries.api.hideOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {
                                __this._dataService.set_Series(result.data);
                                __this._queryArchiveService._currentPatientSeries = result.data;
                                __this._queryArchiveService.set_CurrentPatientSeries(result.data[0].Patient.ID, result.data);
                                if (__this._selectedStudy.InstanceUID == result.data[0].StudyInstanceUID) {
                                    __this._$scope.gridOptionsSeries.api.setRowData(result.data);
                                    if (viewStudy) {
                                        __this.loadStudy();
                                    }

                                }
                            }
                            __this._loadingStudySeries = false;
                        });
                        break;
                    case 'pacs':
                        this._queryPacsService.FindSeries(this._$scope.querySource.pacs, this._queryPacsService.clientAETitle, query).then(function (result) {
                            if (result.data["FaultType"]) {
                                if (result.data["Message"]) {
                                    __this._$scope.gridOptionsSeries.api.hideLoadingOverlay();
                                    alert(result.data["Message"]);
                                }
                            }
                            else {
                                __this._dataService.set_Series(result.data);
                                __this._queryArchiveService._currentPatientSeries = result.data;
                                __this._queryArchiveService.set_CurrentPatientSeries(result.data[0].Patient.ID, result.data);

                                if (__this._selectedStudy.InstanceUID == result.data[0].StudyInstanceUID) {
                                    __this._$scope.gridOptionsSeries.api.setRowData(result.data);
                                    if (viewStudy) {
                                        __this.loadStudy();
                                    }
                                }
                            }
                            __this._loadingStudySeries = false;
                        });
                        break;
                }
            }
            else {
                this._loadingStudySeries = false;
                if (viewStudy) {
                    this.loadStudy();
                }
            }
        }

        private loadHangingProtocol(views: Array<any>, hp: Models.HangingProtocol) {
            var self = this;

            angular.forEach(views, function (value, key) {
                var study = {
                    InstanceUID: value.Series.StudyInstanceUID,
                    Patient: value.Series.Patient
                };

                self.loadHangingProtocolSeries(study, value.Series, value);
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


        private getPatientTab(patientid: string, tabService: TabService): Models.Tab {
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
                        self._eventService.publish(EventNames.InstanceOverflowClear, { seriesInstanceUID: studyLayout.Series[0].SeriesInstanceUID, tab: tab });
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
        //private queryForSeries(self, seriesInstanceUID: string, imageBoxNumber: number, sopInstanceUidList: string[]) {
        //    var query: Models.QueryOptions = new Models.QueryOptions;

        //    var _seriesInstanceUID = seriesInstanceUID;
        //    var _imageBoxNumber = imageBoxNumber;
        //    var _sopInstanceList = sopInstanceUidList;

        //    query.SeriesOptions.SeriesInstanceUID = _seriesInstanceUID;
        //    switch (self._$scope.querySource.name) {
        //        case 'database':
        //            self._queryArchiveService.FindSeries(query, 1).then(function (result) {
        //                if (result.data["FaultType"]) {
        //                    if (result.data["Message"]) {
        //                        alert(result.data["Message"]);
        //                    }
        //                }
        //                else {
        //                    if (result.data && result.data.length > 0) {
        //                        result.data[0].ImageBoxNumber = _imageBoxNumber; // studyLayout.ImageBoxNumber;
        //                        result.data[0].SopInstanceUIDs = _sopInstanceList;
        //                        self.loadSeries({ InstanceUID: result.data[0].StudyInstanceUI}, result.data[0]
        //                        );
        //                    }
        //                }
        //            });
        //            break;
        //        case 'pacs':
        //            self._queryPacsService.FindSeries(self._$scope.querySource.pacs, self._queryPacsService.clientAETitle, query).then(function (result) {
        //                if (result.data["FaultType"]) {
        //                    if (result.data["Message"]) {
        //                        alert(result.data["Message"]);
        //                    }
        //                }
        //                else {
        //                    if (result.data && result.data.length > 0) {
        //                        result.data[0].SopInstanceUIDs = _sopInstanceList;
        //                        self.loadSeries({ InstanceUID: result.data[0].StudyInstanceUID}, result.data[0]);
        //                    }
        //                }
        //            });
        //            break;
        //    }
        //}


        private getImageBox(imageBoxNumber: number, boxes) {

            var index = 0;
            var length = boxes.length;

            for (index = 0; index < length; index++) {
                if (boxes[index].ImageBoxNumber == imageBoxNumber)
                    return index;
            }

            return -1;
        }

        private loadStudy(checkHangingProtocol?: boolean) {
            var self = this;

            //eventService.subscribe(EventNames.SelectedTabChanged, function (event, data) {
            //}.bind(this));

            this._dataCache['StudyInstanceUID'] = this._selectedStudy.InstanceUID;
            var studyLayout: Models.StudyLayout = null;
            this._objectRetrieveService.GetStudyLayout(<any>(this._selectedStudy.InstanceUID)).then(function (result) {
                studyLayout = result.data;

                self._templateService.currentHangingProtocol = null;

                if (result.data == "") {

                    var counter = 0;
                    var index = 0;
                    var length = self._$scope.gridOptionsSeries.rowData.length;
                    for (index = 0; index < length; index++) {
                        if (self._$scope.gridOptionsSeries.rowData[index].CompleteMRTI) {
                            counter++;
                        }
                    }
                }

                self._templateService.currentStudyLayout = studyLayout;

                if (!angular.isDefined(studyLayout["Series"])) {
                    self.loadSeries(self._selectedStudy, self._$scope.gridOptionsSeries.rowData[0], false);

                }
                else {
                    studyLayout['studyInstanceUID'] = self._selectedStudy.InstanceUID;
                    $.each(studyLayout.Series, function (index: number, item: Models.SeriesInfo) {
                        var series = self._seriesManagerService.get_seriesInfo(item.SeriesInstanceUID);

                        if (!series) {
                            self.queryForSeries(self, item.SeriesInstanceUID, item.ImageBoxNumber, studyLayout.Boxes[self.getImageBox(item.ImageBoxNumber, studyLayout.Boxes)].referencedSOPInstanceUID, false, "");
                        }
                    });

                    $.each(studyLayout.OtherStudies, function (index: number, study: Models.OtherStudies) {
                        $.each(study.Series, function (index: number, item: Models.SeriesInfo) {
                            var series = self._seriesManagerService.get_seriesInfo(item.SeriesInstanceUID);

                            if (!series) {
                                self.queryForSeries(self, item.SeriesInstanceUID, item.ImageBoxNumber, studyLayout.Boxes[self.getImageBox(item.ImageBoxNumber, studyLayout.Boxes)].referencedSOPInstanceUID, false, "");
                            }
                        });
                    });
                }
            });

            this._viewStudy = false;
        }

        private autoLoadWithHangingProtocol() {
            var nodes = this._$scope.gridOptions.api.getSelectedNodes();

            this.studySelected(nodes[0]);
            this.waitForSeries(nodes[0], true);
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

        private loadHangingProtocolSeries(study, series, view) {
            this._eventService.publish(EventNames.SeriesSelected, {
                study: study,
                series: series,
                view: view,
                remote: this._$scope.querySource.name == 'pacs',
                displaySetNumber: view.DisplaySetNumber
            });
        }

        private matchTemplateForSeries(data) {
            var StudyInstanceUID = data.node.data.StudyInstanceUID;
            var SeriesInstanceUID = data.node.data.InstanceUID;

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


                    //use template (if any) to view
                    this._eventService.publish(EventNames.SeriesSelected, {
                        study: this._selectedStudy,
                        series: data.node.data,
                        remote: this._$scope.querySource.name == 'pacs',
                        template: _template
                    });

                }.bind(this));

                //on error - default to no template - continue loading
                promise.error(function (e) {
                    console.log(e);

                    this._eventService.publish(EventNames.SeriesSelected, {
                        study: this._selectedStudy,
                        series: data.node.data,
                        remote: this._$scope.querySource.name == 'pacs'
                    });
                });

            }
            else {
                console.log('failed to read study/series id');

                //default to no template - continue loading
                this._eventService.publish(EventNames.SeriesSelected, {
                    study: this._selectedStudy,
                    series: data.node.data,
                    remote: this._$scope.querySource.name == 'pacs'
                });
            }
        }

        private addDays(date, days) {
            var result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }

        private addMonths(date, months) {
            var result = new Date(date);
            result.setMonth(result.getMonth() + months);
            return result;
        }

        private addYears(date, years) {
            var result = new Date(date);
            result.setFullYear(result.getFullYear() + years);
            return result;
        }

        private seriesSelected(data) {
            var selectedNodes: Array<any> = this._$scope.gridOptionsSeries.api.getSelectedNodes();

            this._templateService.currentStudyLayout = null;

            if (selectedNodes.length == 1) {
                if (selectedNodes[0].data != this._selectedSeries) {
                    this._selectedSeries = data.node.data;
                    if (this.isAnyTemplateAutoMatch()) {
                        this.matchTemplateForSeries(data);
                    }
                    else {
                        this._eventService.publish(EventNames.SeriesSelected, {
                            study: this._selectedStudy,
                            series: data.node.data,
                            remote: this._$scope.querySource.name == 'pacs'
                        });
                    }
                }
                else if (selectedNodes[0].data == this._selectedSeries) {
                    var tab: Models.Tab = this._seriesManagerService.get_seriesTab(data.node.data.InstanceUID);

                    if (tab != null) {
                        this._tabService.select_tab(tab.id);
                    }
                    else {
                        if (this.isAnyTemplateAutoMatch()) {
                            this.matchTemplateForSeries(data);
                        }
                        else {
                            this._eventService.publish(EventNames.SeriesSelected, {
                                study: this._selectedStudy,
                                series: data.node.data,
                                remote: this._$scope.querySource.name == 'pacs'
                            });
                        }
                    }
                }
            }
        }

        private contextMenu(data) {
            this._selectedSeries = data.data;
            this._$scope.gridOptionsSeries.api.selectNode(data.node, false, true);
            $('.seriesContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
            if (this._openWith.length > 0) {
                $('.data-title').attr('data-menutitle', this._openWith);
            }
        }

        private hpContextMenu(data): void {
            this._$scope.gridOptions.api.selectNode(data.node, false, true);
            this.studySelected(data);
            this.waitForSeries(data);
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

        private waitForSeries(data, loadBest?: boolean) {
            var self = this;

            if (this._loadingStudySeries == true) {
                setTimeout(function () {
                    self.waitForSeries(data);
                }, 100);
            }
            else {
                var query: Models.HangingProtocolQuery = new Models.HangingProtocolQuery();
                var modalites: Array<string> = this.get_ModalitesInActiveStudy();

                this._loadingHangingProtocols = true;
                this._hangingProtocols = new Array<Models.HangingProtocolQueryResult>();
                var isDental: boolean = this._optionsService.isSeriesView();

                this.waitForHangingProtocols(data, loadBest);

                this._queryArchiveService.FindHangingProtocols(data.data.InstanceUID).then(function (result) {
                    self._hangingProtocols = result.data;
                    self._loadingHangingProtocols = false;
                });
            }
        }


        private showStructuredDisplayMenu(data, loadBest?: boolean) {
            var self = this;
            if (this._loadingHangingProtocols == true) {
                setTimeout(function () {
                    self.showStructuredDisplayMenu(data, loadBest);
                }, 100);
            }
            else {
                $('.studyContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
                if (this._sdOpenWith.length > 0) {
                    $('.data-title').attr('data-menutitle', this._sdOpenWith);
                }
            }
        }

        //
        // Waits for all the hanging protocols to be loaded.  If load best is true then the
        // best matched hanging protocol will be loaded. 
        //
        private waitForHangingProtocols(data, loadBest?: boolean) {
            var self = this;

            if (this._loadingHangingProtocols == true) {
                setTimeout(function () {
                    self.waitForHangingProtocols(data, loadBest);
                }, 100);
            }
            else {
                if (this._hangingProtocols && this._hangingProtocols.length >= 0) {
                    if (!loadBest) {
                        $('.studyContext').contextMenu({ x: data.event.pageX, y: data.event.pageY });
                        if (this._hpOpenWith.length > 0) {
                            $('.data-title').attr('data-menutitle', this._hpOpenWith);
                        }
                    }
                    else {
                        if (this._hangingProtocols.length == 0) {
                            this._objectRetrieveService.GetHangingProtocol(self._hangingProtocols[0].SOPInstanceUID).then(function (result) {
                                var hp: Models.HangingProtocol = result.data;

                                self._templateService.currentStudyLayout = null;
                                self._templateService.currentHangingProtocol = hp;
                                self._objectRetrieveService.GetHangingProtocolInstances(self._hangingProtocols[0].SOPInstanceUID, self._selectedStudy.Patient.ID, self._selectedStudy.InstanceUID, null).then(function (result) {
                                    self.loadHangingProtocol(result.data, hp);
                                }, function (error) {
                                });
                            });
                        }
                    }
                }
                //else {
                //    self.loadStudy(false);
                //}
            }
        }

        private get_ModalitesInActiveStudy(): Array<string> {
            var modalities: Array<string> = new Array<string>();
            var count: number = this._$scope.gridOptionsSeries.rowData.length;

            for (var i = 0; i < count; i++) {
                var series = this._$scope.gridOptionsSeries.rowData[i];

                if (modalities.indexOf(series.Modality) == -1)
                    modalities.push(series.Modality);
            }

            return modalities;
        }


        public get_hangingProtocolsType(level: Models.HangingProtocolLevel) {
            var menuItems = {};
            var isEmpty: boolean = true;

            var iconName: string = "";
            switch (level) {
                case Models.HangingProtocolLevel.Manufacturer:
                    iconName = "fa-gear";
                    break;
                case Models.HangingProtocolLevel.Site:
                    iconName = "fa-institution";
                    break;
                case Models.HangingProtocolLevel.UserGroup:
                    iconName = "fa-group";
                    break;

                case Models.HangingProtocolLevel.SingleUser:
                    iconName = "fa-user";
                    break;
            }

            for (var i = 0; i < this._hangingProtocols.length; i++) {
                var protocolResult: Models.HangingProtocolQueryResult = this._hangingProtocols[i];
                if (protocolResult.Level == level) {
                    isEmpty = false;
                    menuItems[protocolResult.SOPInstanceUID] = {
                        name: protocolResult.Name,
                        icon: iconName
                    };
                }
            }

            if (isEmpty) {
                menuItems = null;
            }
            return menuItems;
        }

        public addSeparator(menuItems, needsSeparator: boolean, separatorName: string) {
            if (needsSeparator)
                menuItems[separatorName] = "---------";
        }

        public get_hangingProtocols() {
            var menuItems = {};

            var manufacturerItems = this.get_hangingProtocolsType(Models.HangingProtocolLevel.Manufacturer);
            var siteItems = this.get_hangingProtocolsType(Models.HangingProtocolLevel.Site);
            var userGroupItems = this.get_hangingProtocolsType(Models.HangingProtocolLevel.UserGroup);
            var singleUserItems = this.get_hangingProtocolsType(Models.HangingProtocolLevel.SingleUser);

            var needsSeparator: boolean = false;

            // Manufacturer Items
            if (manufacturerItems != null) {
                menuItems = jQuery.extend(menuItems, manufacturerItems);
                needsSeparator = true;
            }

            // Site
            if (siteItems != null) {
                this.addSeparator(menuItems, needsSeparator, "sepSite");
                menuItems = jQuery.extend(menuItems, siteItems);
                needsSeparator = true;
            }

            // User Group
            if (userGroupItems != null) {
                this.addSeparator(menuItems, needsSeparator, "sepUserGroup");
                menuItems = jQuery.extend(menuItems, userGroupItems);
                needsSeparator = true;
            }

            // Single User
            if (singleUserItems != null) {
                this.addSeparator(menuItems, needsSeparator, "sepSingleUser");
                menuItems = jQuery.extend(menuItems, singleUserItems);
                needsSeparator = true;
            }

            // No Hanging Protocols found, so create a menu that indicates this
            if (needsSeparator == false) {
                menuItems = {
                    "NoHangingProtocolFound_407B6C09-83C2-4A7F-9643-AA4301F6A67A":
                    {
                        name: "No Hanging Protocols",
                        // disabled: true,
                        icon: "fa-exclamation-triangle",
                        className: "context-menu-red-message"
                    },
                };
            }

            return menuItems;
        }

        private get_hangingProtocols_test() {
            var items = {
                "Manufacturer": { name: "Manufacturer", disabled: true },
                "edit": { name: "Edit", icon: "edit" },
                "cut": { name: "Cut", icon: "fa-gear" },

                "sepSite": "---------",
                "Site": { name: "Site", disabled: true },

                "copy": { name: "Copy", icon: "copy" },
                "paste": { name: "Paste", icon: "paste" },
                "stayOpen": { name: "StayOpen", icon: "paste", callback: function () { return false; } },

                "sepUserGroup": "---------",
                "UserGroup": { name: "User Group", disabled: true },
            }

            return items;
        }

        private onOpenPane(pane: string, item, state) {
            //if (pane == 'east' && this._overflowManager != null) {
            //var seriesInstanceUID = this._seriesManagerService.activeSeriesInstanceUID;
            //var overflowInstances: Array<any> = this._seriesManagerService.get_seriesOverflow(seriesInstanceUID);

            //if (overflowInstances.length > 0) {
            //    this._overflowManager.clear();
            //    this._overflowManager.addInstances(overflowInstances);
            //}                
            //}
        }


    }



    //export class SearchViewController extends SearchController {
    //}

}