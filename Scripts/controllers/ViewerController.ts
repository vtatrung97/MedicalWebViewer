/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IViewerControllerScope extends ng.IScope {
        toolbars: Array<Models.Toolbar>;
        seriesList: Array<MedicalViewerSeries>;
        query: Models.QueryOptions;
        searchInfo: any;
        layoutConfig: any;
        viewerId: string;
        overflowId: string;
        viewerConfig: MedicalViewerConfig;
        tabId: string;
        viewerapi: any;
        layoutApi: any;
        postion: number;
        numberOfFrames: number;
        currentPosition: number;
        hideTimeline: boolean;
        retrieveUrl: string;
        timelineApi: any;
        replaceCell: any;
        appendCell: any;
        seriesDropped: any;
        bottomToolBarApi: any;

        positionChanged(position: number);
        previousImage();
        nextImage();
        ondelete();
        stackChanged(sender, e);
        InitializeOverflowManager: Function;
        getCurrentImage: Function;
        studyInstanceUID: string;
    }


    export class ViewerController {
        static $inject = ['$scope', 'eventService', 'toolbarService', '$modal', 'tabService', 'optionsService', 'dataService',
            'seriesManagerService', 'safeApply', 'app.config', 'hotkeys', '$timeout', '$commangular', 'auditLogService',
            'objectRetrieveService', 'dicomLoaderService', 'templateService', 'exportManagerService'];

        private _scope: IViewerControllerScope;
        private _seriesManagerService: SeriesManagerService;
        private _dataService: DataService;
        private _tabService: TabService;
        private _timeoutService: ng.ITimeoutService;
        private _eventService: EventService;
        private _auditLogService: AuditLogService;
        private _objectRetrieveService: ObjectRetrieveService;
        private _overflowManager: OverflowManager;
        private _viewerApi: Directives.MedicalViewerApi;
        private _toolbarService: ToolbarService;
        private _exportManagerService: ExportManagerService;
        private _templateService;

        // this is a timer to keep trying to see if the layout is ready for the overflow manager to be created.
        private _overflowTimerId: number = -1;
        // this is the list for the items to be added to the overflow manager when the overflow manager is not ready yet.
        private _overflowManagerReadyList: any = [];

        private _isComposing: boolean;

        public get isComposing(): boolean {
            return this._isComposing;
        }

        public set isComposing(value: boolean) {
            this._isComposing = value;
        }

        constructor($scope: IViewerControllerScope, eventService: EventService, toolbarService: ToolbarService, $modal, tabService: TabService,
            optionsService: OptionsService, dataService: DataService, seriesManagerService: SeriesManagerService,
            safeApply, config, hotkeys, $timeout: ng.ITimeoutService, $commangular, auditLogService: AuditLogService,
            objectRetrieveService: ObjectRetrieveService, dicomLoaderService: DicomLoaderService,
            templateService: TemplateService, exportManagerService: ExportManagerService) {
            var spacingSize = Utils.get_spacingSize();
            var singleSeries: boolean = optionsService.get(OptionNames.SingleSeriesMode);
            var rows: number = optionsService.get(OptionNames.DefaultSeriesRowCount);
            var columns: number = optionsService.get(OptionNames.DefaultSeriesColumnCount);
            var overflowSize = optionsService.get(OptionNames.SeriesThumbnailWidth) * 3;
            var self = this;

            this._scope = $scope;
            this._seriesManagerService = seriesManagerService;
            this._dataService = dataService;
            this._tabService = tabService;
            this._timeoutService = $timeout;
            this._eventService = eventService;
            this._auditLogService = auditLogService;
            this._objectRetrieveService = objectRetrieveService;
            this._toolbarService = toolbarService;
            this._templateService = templateService;
            this._exportManagerService = exportManagerService;

            $scope.query = new Models.QueryOptions();
            $scope.retrieveUrl = config.urls.serviceUrl + config.urls.objectRetrieveLocalServiceName;
            $scope.timelineApi = {}
            $scope.bottomToolBarApi = {}
            var consultationConnection = new signalR.HubConnectionBuilder().withUrl("https://localhost:44301/conclusion-realtime").build();
            consultationConnection.on("ReceiveMessage", function (text) {
                console.log(text);

            })


            consultationConnection.start().then(function () {
                consultationConnection.invoke("SendMessage", "test").catch(function (err) {
                    return console.error(err.toString());
                });
            })


            $scope.getCurrentImage = function () {
               
                var cell = seriesManagerService.get_activeCell();

                //if ($scope.consultationComment.consultationCommentImages == null)
                //    $scope.consultationComment.consultationCommentImages = [];

                var cellFrame = seriesManagerService.get_activeCellFrame();
                if (cell instanceof lt.Controls.Medical.Cell3D) {

                    var cell3D: lt.Controls.Medical.Cell3D = <lt.Controls.Medical.Cell3D>cell;

                    //window.location.href = cell3D.image.src + ".jpg";

                    var image = {
                        sOPInstanceUID: DicomHelper.getDicomTagValue(cellFrame.metadata, DicomTag.SOPInstanceUID),
                        imageurl: cell3D.image.src + ".jpg",
                        note: ''
                    }
                    //var url = document.location.protocol + "//" + document.location.host + "/MedicalViewerServiceAsp20/" + result;

                    //$scope.consultationComment.consultationCommentImages.push(image);
                    //self.UpdateImageGrid();
                }
                var automation;
                var subCell;
                var viewer;
                var annotationsData = "";
                var codecs = new lt.Annotations.Engine.AnnCodecs();
                var annFound = false;
                var container;
                var newTab = null; //iPad workaround
                var __this = this;
                var res;
                var loader: DicomLoader;
                var ipArray: Array<any> = exportManagerService.buildIpArray(cellFrame);

                if (cellFrame == null) {
                    return;
                }
                loader = seriesManagerService.get_seriesLoaderById(cell);
                automation = cell.get_automation();
                subCell = cell.get_selectedItem();
                viewer = subCell.get_imageViewer();
                res = viewer.get_imageResolution();

                if (lt.LTHelper.OS == lt.LTOS.android && lt.LTHelper.browser == lt.LTBrowser.android) {
                    //secondaryCapturer.PopupCapturedData(cellframe, viewer, automation, subCell.get_overlayCanvas(), OnPostRenderImage);
                    return;
                }

                container = automation.get_container();
                if (container.get_children().get_count() > 0) {
                    annFound = true;
                    annotationsData = codecs.save(container, 1, null, length + 1);
                }

                if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.mobile) {
                    newTab = window.open("", "_blank");
                    window.focus();
                }

                if (annFound) {
                    objectRetrieveService.UploadAnnotations(annotationsData)
                        .then(function (result) {
                            var data: string = result.data.replace(/"/g, "");

                            var xDpi = 254;
                            var yDpi = 254;

                            if (cellFrame.columnSpacing > 0)
                                xDpi = 25.4 / cellFrame.columnSpacing;
                            if (cellFrame.rowSpacing > 0)
                                yDpi = 25.4 / cellFrame.rowSpacing;

                            var downloadImageUrl = objectRetrieveService.GetConclusionImage(cellFrame, data.replace('\"', ''), 0, 0, xDpi, yDpi, JSON.stringify(ipArray))
                                .success(result => {
                                    //var image = {
                                    //    instanceUID: DicomHelper.getDicomTagValue(cellFrame.metadata, DicomTag.SOPInstanceUID),
                                    //    imageUrl: config.urls.baseServiceUrl + result,
                                    //    note: ''
                                    //}
                                    console.log(result);
                                    consultationConnection.invoke("SendMessage", result).catch(function (err) {
                                        return console.error(err.toString());
                                    });
                                    //var url = document.location.protocol + "//" + document.location.host + "/MedicalViewerServiceAsp20/" + result;
                                    //    $scope.consultationComment.consultationCommentImages.push(image);
                                    //    self.UpdateImageGrid();
                                    //    $scope.consultationComment.comment += '?nh s? ' + cellFrame.Instance.InstanceNumber + ':\r\n';
                                })
                            if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.mobile) {
                                //newTab.location.href = downloadImageUrl;
                                //newTab.focus();
                            } else {
                                //window.location.href = downloadImageUrl;
                            }
                        }, function (error) {
                        });
                }
                else {
                    var downloadImageUrl = objectRetrieveService.GetConclusionImage(cellFrame, null, 0, 0, 150, 150, JSON.stringify(ipArray))
                        .success(result => {
                            //var image = {
                            //    instanceUID: DicomHelper.getDicomTagValue(cellFrame.metadata, DicomTag.SOPInstanceUID),
                            //    imageUrl: config.urls.baseServiceUrl + result,
                            //    note: ''
                            //}
                            consultationConnection.invoke("SendMessage", result).catch(function (err) {
                                return console.error(err.toString());
                            });
                        });

                    if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.mobile) {
                        //newTab.location.href = downloadImageUrl;
                        //newTab.focus();
                    }
                    else {
                        //window.location.href = downloadImageUrl;
                    }
                }
            }

            if (overflowSize > 150)
                overflowSize = 150;

            $scope.layoutConfig = {
                applyDemoStyles: true,
                scrollToBookmarkOnLoad: false,
                spacing_closed: spacingSize,
                spacing_open: spacingSize,
                livePaneResizing: false,
                north__size: lt.LTHelper.device == lt.LTDevice.mobile ? "25" : "auto",
                north__resizable: false,
                north__initHidden: false,
                north__showOverflowOnHover: true,
                south__resizable: false,
                south__initHidden: false,
                south__size: 100,
                south__resizerToggle: false,
                south__spacing_closed: 0,
                south__spacing_open: 0,
                east__initHidden: true,
                east__size: overflowSize,
                east__maxSize: overflowSize,
                east__minSize: overflowSize,
                east__resizable: false,
                onopen: this.onOpenPane.bind(this)
            }

            $scope.toolbars = toolbarService.getToolbars();
            $scope.tabId = '';
            $scope.viewerId = UUID.generate();
            $scope.postion = 15;
            $scope.numberOfFrames = 0;
            $scope.currentPosition = 0;
            $scope.hideTimeline = true;
            $scope.overflowId = UUID.generate();

            $scope.viewerConfig = new MedicalViewerConfig();
            $scope.viewerConfig.rows = singleSeries ? 1 : rows;
            $scope.viewerConfig.columns = singleSeries ? 1 : columns;
            $scope.viewerConfig.splitterSize = Utils.get_splitterSize();
            $scope.viewerConfig.OnApiReady = function (viewerApi: Directives.MedicalViewerApi) {
                self._viewerApi = viewerApi;
                self._toolbarService.enable("DeleteStudyStructuredDisplay" + self._tabService.selectedTab.id, function () {
                    return viewerApi.hasLayout;
                });
            };
            $scope.viewerConfig.OnSelectionChanged = this.selectionChanged.bind(this);
            $scope.viewerConfig.studyLayout = templateService.currentStudyLayout;
            $scope.viewerConfig.hangingProtocol = templateService.currentHangingProtocol;

            templateService.currentHangingProtocol = null;

            $scope.viewerConfig.customLayout = optionsService.get(OptionNames.CustomStudyLayout);

            $scope.viewerapi = {};
            $scope.layoutApi = {};
            $scope.seriesList = new Array<MedicalViewerSeries>();

            var deregister = $scope.$watch('tabId', function (newValue, oldValue) {
                var unsubscribe;

                tabService.set_tabData($scope.tabId, TabDataKeys.ViewController, self);
                tabService.set_tabData($scope.tabId, TabDataKeys.Linked, true);
                deregister();

                unsubscribe = eventService.subscribe(EventNames.ToolbarCreated, function (event, data) {

                    if (self._templateService.currentStudyLayout) {
                        self._templateService.currentStudyLayout.LoadedBoxes = 0;

                        var tab: Models.Tab = self.getPatientTab(self._templateService.currentStudyLayout.PatientID, self._tabService);

                        self._toolbarService.disable("PopupCapture" + tab.id);
                    }
                    else {
                        eventService.publish(EventNames.RefreshToolbar, {
                            cell: null,
                            tab: tab,
                            viewer: null
                        });
                    }


                    var linked = optionsService.get(OptionNames.LinkImages);

                    toolbarService.updateClass('LinkImages' + $scope.tabId, 'Linked', 'UnLinked', function () { return linked; });

                    unsubscribe();
                    if (angular.isDefined($scope.layoutApi.refresh)) {
                        setTimeout(function () {
                            $scope.layoutApi.openPane('north');
                            $scope.layoutApi.refresh();
                        }, 900);
                    }
                });

                function updateGridLayoutSize(viewer: lt.Controls.Medical.MedicalViewer, cellCount: number) {
                    if (viewer == null)
                        return;
                    if (viewer.gridLayout.rows * viewer.gridLayout.columns < cellCount) {
                        var sq = Math.sqrt(cellCount);

                        if (viewer.cellsArrangement == lt.Controls.Medical.CellsArrangement.grid) {
                            viewer.layout.beginUpdate();
                            viewer.gridLayout.rows = Math.floor(sq + 0.1);
                            viewer.gridLayout.columns = Math.ceil(cellCount / viewer.gridLayout.rows);
                            viewer.layout.endUpdate();
                        }
                    }
                }

                eventService.subscribe(EventNames.LoadSeries + $scope.tabId, function (event, data) {
                    var tab = seriesManagerService.get_seriesTab(data.args.series.InstanceUID);

                    if (tab != null && tab.id == $scope.tabId) {
                        var series: MedicalViewerSeries = new MedicalViewerSeries(data.args.series.InstanceUID, data.args.series.Patient.ID);

                        // series.sopInstanceUIDS: null or empty if all instances in the series should be loaded
                        //                       : contains a list of SOPInstanceUids
                        series.sopInstanceUIDS = data.args.series.SopInstanceUIDs; //new Array<string>(2);
                        series.modality = data.args.series.Modality;

                        series.template = data.args.template;
                        series.dislaySetNumber = data.args.displaySetNumber;
                        if (data.args != null)
                            series.view = data.args.view;
                        (<any>series).mrtiCell = data.args.series.mrtiCell;
                        if (self._overflowManager != null) {
                            self._overflowManager.clear();
                        }
                        console.log(data.args.study);
                        $scope.studyInstanceUID = data.args.study.InstanceUID;
                        if (singleSeries) {
                            $scope.seriesList.length = 0;
                        }
                        else {
                            var s = data.args.series;
                            var result = $.grep($scope.seriesList, function (e, index) {
                                return s.Patient.ID != e.patientID;
                            });

                            if (result.length != 0) {
                                $scope.seriesList.length = 0;
                            }
                        }


                        series.link = optionsService.get(OptionNames.LinkImages);

                        if (data.args.series.Modality == "CT") {
                            if ($scope.viewerapi != null) {
                                if ($scope.viewerapi.getMedicalViewer != null) {
                                    var viewer: lt.Controls.Medical.MedicalViewer = $scope.viewerapi.getMedicalViewer();
                                    tab.itemCount++;
                                    updateGridLayoutSize(viewer, tab.itemCount);
                                }
                            }

                            $scope.seriesList.push(series);
                        }
                        else {
                            if (!angular.isDefined(series.dislaySetNumber)) {
                                objectRetrieveService.GetSeriesStacks(data.args.series.InstanceUID).then(function (result) {
                                    var stacks: Array<any> = result.data;

                                    if (stacks.length > 1)
                                        series.sopInstanceUIDS = stacks[0].SopInstanceUIDs;

                                    tab.itemCount += (stacks.length != 0) ? stacks.length : 1;

                                    var cellCount = tab.itemCount;

                                    if (!cellCount)
                                        cellCount = 0;

                                    if ($scope.viewerapi != null) {
                                        var viewer: lt.Controls.Medical.MedicalViewer = $scope.viewerapi.getMedicalViewer();
                                        updateGridLayoutSize(viewer, cellCount);
                                    }

                                    $scope.seriesList.push(series);

                                    if (stacks.length > 1 && !singleSeries) {
                                        for (var i = 1; i < stacks.length; i++) {
                                            var stackSeries: MedicalViewerSeries;


                                            stackSeries = angular.copy(series);

                                            //Add the parent display number
                                            if (data.args != null)
                                                stackSeries.view = data.args.view;

                                            stackSeries.id = UUID.genV4().toString();
                                            stackSeries.sopInstanceUIDS = stacks[i].SopInstanceUIDs;
                                            $scope.seriesList.push(stackSeries);
                                        }
                                    }
                                }.bind(this));
                            }
                            else {

                                if ($scope.viewerapi != null) {
                                    if ($scope.viewerapi.getMedicalViewer != null) {
                                        var viewer: lt.Controls.Medical.MedicalViewer = $scope.viewerapi.getMedicalViewer();
                                        tab.itemCount++;
                                        updateGridLayoutSize(viewer, tab.itemCount);
                                    }
                                }

                                $scope.seriesList.push(series);
                            }
                        }
                    }
                    if ($scope.layoutApi && $scope.layoutApi.closePane) {
                        $scope.layoutApi.closePane('east');
                    }
                });


                eventService.subscribe(EventNames.LoadStructuredDisplay + $scope.tabId, function (event, data) {




                    var tab = seriesManagerService.get_seriesTab(data.args.series.InstanceUID);

                    if (tab != null && tab.id == $scope.tabId) {
                        var series: MedicalViewerSeries = new MedicalViewerSeries(data.args.series.InstanceUID, data.args.series.Patient.ID, data.args.sdID);
                        series.templateItem = data.args.templateItem;


                        // don't load series layout when you load the structured display
                        series.loadSeriesLayout = false;

                        // series.sopInstanceUIDS: null or empty if all instances in the series should be loaded
                        //                       : contains a list of SOPInstanceUids
                        series.sopInstanceUIDS = data.args.series.SopInstanceUIDs; //new Array<string>(2);


                        series.template = data.args.template;
                        series.dislaySetNumber = data.args.displaySetNumber;
                        (<any>series).mrtiCell = data.args.series.mrtiCell;



                        if (seriesManagerService.cleanupSeries) {
                            $scope.seriesList.length = 0;
                            seriesManagerService.cleanupSeries = false;
                        }

                        {
                            var s = data.args.series;
                            var result = $.grep($scope.seriesList, function (e, index) {
                                return s.Patient.ID != e.patientID;
                            });

                            if (result.length != 0) {
                                $scope.seriesList.length = 0;
                            }
                        }
                        if (!angular.isDefined(series.dislaySetNumber)) {
                            objectRetrieveService.GetSeriesStacks(data.args.series.InstanceUID).then(function (result) {
                                var stacks: Array<any> = result.data;

                                series.link = optionsService.get(OptionNames.LinkImages);

                                if (stacks.length > 1)
                                    series.sopInstanceUIDS = stacks[0].SopInstanceUIDs;

                                tab.itemCount += (stacks.length != 0) ? stacks.length : 1;

                                var cellCount = tab.itemCount;

                                if (!cellCount)
                                    cellCount = 0;

                                if ($scope.viewerapi != null) {
                                    var viewer: lt.Controls.Medical.MedicalViewer = $scope.viewerapi.getMedicalViewer();
                                    //updateGridLayoutSize(viewer, cellCount);
                                }

                                if (data.args.series.ImageBoxNumber == -1) {
                                    eventService.publish(EventNames.InstanceOverflow,
                                        {
                                            instance: data.args.series.SopInstanceUIDs,
                                            metadata: 0,
                                            frame: 0,
                                            parentCell: null,
                                            parentViewer: viewer
                                        });
                                }
                                else {

                                    $scope.seriesList.push(series);

                                    if (stacks.length > 1) {
                                        for (var i = 1; i < stacks.length; i++) {
                                            var stackSeries: MedicalViewerSeries;

                                            stackSeries = angular.copy(series);

                                            //Add the parent display number
                                            if (data.args != null)
                                                stackSeries.view = data.args.view;

                                            stackSeries.id = UUID.genV4().toString();
                                            stackSeries.sopInstanceUIDS = stacks[i].SopInstanceUIDs;
                                            $scope.seriesList.push(stackSeries);
                                        }
                                    }
                                }
                            }.bind(this));
                        }
                        else {

                            if (data.args.series.ImageBoxNumber == -1) {
                                eventService.publish(EventNames.InstanceOverflow,
                                    {
                                        instance: data.args.series.SopInstanceUIDs,
                                        metadata: 0,
                                        frame: 0,
                                        parentCell: null,
                                        parentViewer: viewer
                                    });
                            }
                            else {

                                if ($scope.viewerapi != null) {
                                    if ($scope.viewerapi.getMedicalViewer != null) {
                                        var viewer: lt.Controls.Medical.MedicalViewer = $scope.viewerapi.getMedicalViewer();
                                        tab.itemCount++;
                                        //updateGridLayoutSize(viewer, tab.itemCount);
                                    }
                                }

                                $scope.seriesList.push(series);
                            }
                        }
                    }
                });
            });


            $scope.replaceCell = $.proxy(this.replaceCell, this);
            $scope.appendCell = $.proxy(this.appendCell, this);
            $scope.seriesDropped = $.proxy(this.seriesDropped, this);

            eventService.subscribe(EventNames.LoadingSeriesFrames, function (event, data) {
                var tab = seriesManagerService.get_seriesTab(data.args.seriesInstanceUID);
                if (tab != null && tab.id == $scope.tabId) {
                    self.initializeSlider($scope, seriesManagerService, data.args.seriesInstanceUID, data.args.id);
                    self.refreshTimeline(data.args.seriesInstanceUID);
                }
            });

            eventService.subscribe(EventNames.ActiveSeriesChanged, function (event, data) {
                var tab = seriesManagerService.get_seriesTab(data.args.seriesInstanceUID);
                var overflowInstances: Array<any> = seriesManagerService.get_seriesOverflow(data.args.seriesInstanceUID);
                var cell = seriesManagerService.get_seriesCellById(data.args.id);

                if (tab != null && tab.id == $scope.tabId) {
                    self.initializeSlider($scope, seriesManagerService, data.args.seriesInstanceUID, data.args.id);
                    self.refreshTimeline(data.args.seriesInstanceUID);
                }

                if (self._overflowManager) {

                    if (self._overflowManager.get_seriesInstanceUID() != data.args.seriesInstanceUID) {
                        self._overflowManager.clear();
                        if (overflowInstances.length > 0 && self._overflowManager != null) {
                            self._overflowManager.addInstances(overflowInstances);
                        }
                    }
                }
            });

            eventService.subscribe(EventNames.OpenStudyTimeLine, function (event, data) {

                var showStudyTimeLine = optionsService.get(OptionNames.ShowStudyTimeLine);
                if (data.args.show || showStudyTimeLine) {
                    self.showTimeLine();

                    setTimeout(function () {
                        $scope.layoutApi.openPane('north');
                        $scope.layoutApi.refresh();
                    }, 900);

                }
                else {

                    setTimeout(function () {
                        $scope.layoutApi.closePane('south');
                        $scope.layoutApi.refresh();
                    }, 900);

                }
            });


            $scope.InitializeOverflowManager = function (tab) {

                if (tab != null) {
                    $scope.layoutApi.openPane('east');
                    if (self._overflowManager == null) {
                        self._overflowManager = new OverflowManager("#" + $scope.overflowId, dicomLoaderService.get_newLoader(), { api: self._scope.layoutApi, direction: 'south' }, tabService, tab, eventService, false);

                        if (!$("#" + $scope.overflowId)[0]) {
                            self._overflowManager = null;
                        }
                    }
                }

                if (self._overflowManager) {
                    $scope.layoutApi.openPane('east');

                    for (var index = 0; index < self._overflowManagerReadyList.length; index++) {
                        self._overflowManager.add(self._overflowManagerReadyList[index].instance);
                        // set the seriesInstance for the overflow manager.
                        if (index == 0)
                            self._overflowManager.set_seriesInstanceUID(self._overflowManagerReadyList[index].instance.SeriesInstanceUID);
                    }

                    self._overflowManagerReadyList = [];
                    return true;
                }

                return false;

            };

            eventService.subscribe(EventNames.InstanceOverflow, function (event, data) {
                // add the data to the rady list so when the layout is ready, creat the overflow and add them.
                self._overflowManagerReadyList.add(data.args);

                var tab = seriesManagerService.get_seriesTab(data.args.instance.SeriesInstanceUID);

                if (!tab)
                    return;

                // the layout is not ready yet, for some fucking reason, we need to keep looping and try until it is.
                if (!$scope.layoutApi.openPane) {

                    // keep trying every 500 millisecond until the data is ready.
                    if (self._overflowTimerId == -1) {
                        self._overflowTimerId = window.setInterval(function (e) {

                            // the layout is ready, initialize now.
                            if ($scope.layoutApi.openPane)

                                if ($scope.InitializeOverflowManager(tab)) {

                                    // initializtion is a success, clear the timer now and rest the variables.
                                    window.clearInterval(self._overflowTimerId);
                                    self._overflowTimerId = -1;
                                }


                        }, 500);
                    }
                }
                else
                    $scope.InitializeOverflowManager(tab);
            });

            eventService.subscribe(EventNames.InstanceOverflowClear, function (event, data) {
                var tab = seriesManagerService.get_seriesTab(data.args.seriesInstanceUID);

                if (!tab)
                    tab = data.args.tab;

                if (tab != null && tab.id == $scope.tabId) {


                    if (self._templateService.currentStudyLayout.LoadedBoxes == 0) {

                        self._toolbarService.disable("PopupCapture" + tab.id);
                    }

                    if (self._overflowManager != null) {
                        self._overflowManager.clear();
                    }
                }
            });

            eventService.subscribe(EventNames.InstanceOverflowClose, function (event, data) {
                var tab = seriesManagerService.get_seriesTab(data.args.seriesInstanceUID);

                if (tab != null && tab.id == $scope.tabId) {
                    $scope.layoutApi.closePane('east');
                }
            });

            $scope.positionChanged = function (position: number) {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                cell.currentOffset = position;
            }

            $scope.previousImage = function () {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                var current = cell.currentOffset;

                if (current != 0 && current >= 1) {
                    cell.currentOffset = current - 1;
                    $scope.currentPosition = current - 1;
                }
            }

            $scope.nextImage = function () {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                var max = seriesManagerService.get_maxAllowedStackIndex(cell);
                var current = cell.currentOffset;

                if (current != -1 && ((current + 1) < max)) {
                    cell.currentOffset = current + 1;
                    $scope.currentPosition = current + 2;
                }
            }

            $scope.ondelete = function () {
                $commangular.dispatch('DeleteCell');
            }

            $scope.stackChanged = function (sender, e) {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                if (cell) {
                    var current = cell.currentOffset;

                    safeApply($scope, function () {
                        $scope.currentPosition = current + 1;
                    });
                }
            }

            hotkeys.bindTo($scope)
                .add({
                    combo: 'space',
                    description: 'Get current image',
                    callback: $scope.getCurrentImage
                })
                .add({
                    combo: ['+', 'down'],
                    description: 'Next Image',
                    callback: $scope.nextImage
                })
                .add({
                    combo: ['-', 'up'],
                    description: 'Previous Image',
                    callback: $scope.previousImage
                })
                .add({
                    combo: 'left',
                    description: 'Align Left',
                    callback: function () {
                        var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                    }
                })
                .add({
                    combo: 'right',
                    description: 'Align Right',
                    callback: function () {
                        var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                    }
                })
                .add({
                    combo: 'top',
                    description: 'Align Top',
                    callback: function () {
                        var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                    }
                })
                .add({
                    combo: 'bottom',
                    description: 'Align Bottom',
                    callback: function () {
                        var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                    }
                });;
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


        public selectionChanged(count: number) {
            if (this.isComposing) {
                var self = this;

                this._toolbarService.enable('MergeCells' + this._scope.tabId, function () {
                    return self._viewerApi.canMerge && (count > 1);
                });
            }
        }

        public refreshTimeline(seriesInstanceUID: string) {
            if (this._scope.timelineApi.refresh) {
                var series = this._seriesManagerService.get_seriesInfo(seriesInstanceUID);
                var state = this._scope.layoutApi.get_state('south');

                if (series == null) {
                    series = this._dataService.get_Series(seriesInstanceUID);
                }

                if (state.isVisible) {

                    this._scope.timelineApi.refresh(series.Patient.ID, series.StudyInstanceUID, seriesInstanceUID);
                }
            }
        }

        public getViewer() {
            if (!this._scope.viewerapi.getMedicalViewer)
                return null;
            return this._scope.viewerapi.getMedicalViewer();
        }

        public getOverflowManager() {
            return this._overflowManager;
        }

        public refreshLayout() {
            this._scope.layoutApi.refresh();
        }

        public initializeSlider(scope: IViewerControllerScope, seriesManagerService: SeriesManagerService, seriesInstanceUID: string, id: string) {
            var tab: Models.Tab = seriesManagerService.get_seriesTab(seriesInstanceUID);

            if (tab && tab.id == scope.tabId) {
                var cell = seriesManagerService.get_seriesCellById(id);

                if (cell) {
                    scope.numberOfFrames = seriesManagerService.get_maxAllowedStackIndex(cell);
                }
            }
        }

        public toggleView(panel: string, toggle: boolean, show: boolean) {
            switch (panel) {
                case 'south':
                    var seriesInstanceUID = this._seriesManagerService.activeSeriesInstanceUID;

                    if (seriesInstanceUID && seriesInstanceUID.length > 0) {
                        var series = this._seriesManagerService.get_seriesInfo(seriesInstanceUID);

                        if (series != null) {
                            var __this = this;

                            this._timeoutService(function () {
                                __this._scope.hideTimeline = toggle ? !__this._scope.hideTimeline : !show;
                                __this._scope.$apply();
                                __this._scope.timelineApi.toggle(series.StudyInstanceUID, series.Patient.ID, __this._scope.hideTimeline);
                            });
                        }
                    }
                    break;
            }
        }

        public showTimeLine() {
            if (this._scope.hideTimeline) {
                this.toggleView('south', false, true);
            }
        }

        public isTimeLineShowing() {
            return !this._scope.hideTimeline;
        }

        public hideTimeLine() {
            if (!this._scope.hideTimeline) {
                var seriesInstanceUID = this._seriesManagerService.activeSeriesInstanceUID;
                var series = this._seriesManagerService.get_seriesInfo(seriesInstanceUID);

                var __this = this;

                this._timeoutService(function () {
                    __this._scope.hideTimeline = !__this._scope.hideTimeline;
                    __this._scope.$apply();
                    __this._scope.timelineApi.toggle(series.StudyInstanceUID, series.Patient.ID, __this._scope.hideTimeline);
                });
            }
        }

        public mergeSelectedCells() {
            if (this.isComposing) {
                this._viewerApi.mergeSelectedCells();
            }
        }

        public hasLayout(): boolean {
            return this._viewerApi.hasLayout;
        }

        public getStudyLayout() {
            return this._viewerApi.studyLayout;
        }

        public clearLayout() {
            this._viewerApi.clearLayout();
        }

        public setStudyLayout(layout: Models.StudyLayout) {
            this._viewerApi.studyLayout = layout;
        }

        public replaceCell(seriesInstanceUID: string) {
            var viewer: lt.Controls.Medical.MedicalViewer = this.getViewer();
            var cell: any = viewer.layout.get_selectedItem();
            var item, emptyItems;
            var position, rowPosition;
            var colPosition, bounds = null;
            var length: number;
            var series = this._dataService.get_Series(seriesInstanceUID);
            var newSeries: MedicalViewerSeries = new MedicalViewerSeries(seriesInstanceUID, series.Patient.ID);
            var tab: Models.Tab = this._tabService.find_tab(this._scope.tabId);

            if (viewer.exploded) {
                viewer.explode(<lt.Controls.Medical.Cell>viewer.explodedCell, false);
            }

            if (cell != null) {
                if (seriesInstanceUID == cell.get_seriesInstanceUID()) {
                    return;
                }

                position = cell.get_position();
                rowPosition = cell.get_rowPosition();
                colPosition = cell.get_columnsPosition();
                bounds = cell.get_bounds();
            }

            item = viewer.get_emptyDivs().get_selectedItem();
            if (item != null) {
                position = item.get_position();
                rowPosition = item.get_rowPosition();
                colPosition = item.get_columnsPosition();
                bounds = item.get_bounds();
            }

            emptyItems = viewer.get_emptyDivs().get_items();
            length = emptyItems.get_count();
            for (var index = 0; index < length; index++) {
                var cellDiv: HTMLDivElement;

                item = emptyItems.get_item(index);
                cellDiv = <HTMLDivElement>document.getElementById(item.get_divID());

                if (<any>cellDiv == this) {
                    position = item.get_position();
                    rowPosition = item.get_rowPosition();
                    colPosition = item.get_columnsPosition();
                    bounds = item.get_bounds();

                    item.dispose();
                    break;
                }
            }

            if (bounds == null)
                return;

            this._seriesManagerService.set_seriesTab(seriesInstanceUID, tab);
            this._objectRetrieveService.GetSeriesStacks(newSeries.seriesInstanceUID).then(function (result) {
                var stacks: Array<any> = result.data;
                var frame: lt.Controls.Medical.Frame = this._seriesManagerService.get_activeCellFrame();

                if (stacks.length > 1)
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;

                this._scope.viewerapi.replaceSeries(cell.get_seriesInstanceUID(), (<any>frame).Instance.SOPInstanceUID, newSeries, position, rowPosition, colPosition, bounds);

                if (stacks.length > 1) {
                    for (var i = 1; i < stacks.length; i++) {
                        var stackSeries: MedicalViewerSeries;

                        stackSeries = angular.copy(newSeries);
                        stackSeries.id = UUID.genV4().toString();
                        stackSeries.sopInstanceUIDS = stacks[i].SopInstanceUIDs;
                        this._scope.seriesList.push(stackSeries);
                    }
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;
                }
            }.bind(this));
        }

        public appendCell(seriesInstanceUID: string) {
            var __this = this;
            var series = this._dataService.get_Series(seriesInstanceUID);
            var newSeries: MedicalViewerSeries = new MedicalViewerSeries(seriesInstanceUID, series.Patient.ID);
            var tab: Models.Tab = this._tabService.find_tab(this._scope.tabId);
            var addCell = this._eventService.subscribe(EventNames.NewCellsAdded, function (event, data) {
                if (data.args.cells && data.args.cells.length == 1) {
                    var cell: lt.Controls.Medical.Cell = data.args.cells[0];

                    if (cell.get_seriesInstanceUID() == seriesInstanceUID) {
                        __this._seriesManagerService.set_seriesInfo(seriesInstanceUID, series);
                    }
                }
                addCell();
            });

            this._seriesManagerService.set_seriesTab(seriesInstanceUID, tab);
            this._objectRetrieveService.GetSeriesStacks(newSeries.seriesInstanceUID).then(function (result) {
                var stacks: Array<any> = result.data;

                if (stacks.length > 1)
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;

                this._scope.seriesList.push(newSeries);

                if (stacks.length > 1) {
                    for (var i = 1; i < stacks.length; i++) {
                        var stackSeries: MedicalViewerSeries;

                        stackSeries = angular.copy(newSeries);
                        stackSeries.id = UUID.genV4().toString();
                        stackSeries.sopInstanceUIDS = stacks[i].SopInstanceUIDs;
                        this._scope.seriesList.push(stackSeries);
                    }
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;
                }
            }.bind(this));
        }

        public seriesDropped(viewer, oldSeriesInstanceUID: string, seriesInstanceUID: string, position: number, rowPosition: number, colPosition: number, bounds) {
            var series = this._dataService.get_Series(seriesInstanceUID);
            var newSeries: MedicalViewerSeries = new MedicalViewerSeries(seriesInstanceUID, series.Patient.ID);
            var tab: Models.Tab = this._tabService.find_tab(this._scope.tabId);

            this._auditLogService.log_showSeries(series);
            this._seriesManagerService.set_seriesTab(seriesInstanceUID, tab);
            this._seriesManagerService.set_seriesInfo(seriesInstanceUID, series);
            this._objectRetrieveService.GetSeriesStacks(newSeries.seriesInstanceUID).then(function (result) {
                var stacks: Array<any> = result.data;

                if (stacks.length > 1)
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;

                this._scope.viewerapi.replaceSeries(oldSeriesInstanceUID, '', newSeries, position, rowPosition, colPosition, bounds);

                if (stacks.length > 1) {
                    for (var i = 1; i < stacks.length; i++) {
                        var stackSeries: MedicalViewerSeries;

                        stackSeries = angular.copy(newSeries);
                        stackSeries.id = UUID.genV4().toString();
                        stackSeries.sopInstanceUIDS = stacks[i].SopInstanceUIDs;
                        this._scope.seriesList.push(stackSeries);
                    }
                    newSeries.sopInstanceUIDS = stacks[0].SopInstanceUIDs;
                }
            }.bind(this));
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
}
