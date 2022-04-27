/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../controls/OverflowManager.ts" />

module Controllers {   
    export interface IDentalViewerControllerScope extends ng.IScope {
        toolbars: Array<Models.Toolbar>;
        query: Models.QueryOptions;
        searchInfo: any;
        config: any;
        series: Array<any>;
        gridapi: any;
        viewerapi: any;
        layoutApi: any;
        layoutConfig: any;
        viewerConfig: MedicalViewerConfig;
        onlayoutnorthresize: Function;
        tabId: string;       
        seriesList: Array<MedicalViewerSeries>;
        viewerId: string;
        overflowId: string;
        autoHideEW: boolean;
        hideTimeline: boolean;        
        
        previousImage();
        isOverflowItemValid(seriesManagerService : SeriesManagerService, seriesInstanceUID : string);
        nextImage();  
        setListController: Function;
        getListController: Function;      
        InitializeOverflowManager: Function;
    }

    export class DentalViewerController {
        static $inject = [
            '$rootScope', '$scope', 'eventService', 'toolbarService', 'optionsService', 'seriesManagerService',
            'objectRetrieveService', 'dataService', 'tabService', 'dicomLoaderService', 'hotkeys', 'templateService', 'authenticationService', 'queryArchiveService'
        ];

        private _listController = null;  
        private _objectRetrieveService = null; 
        private _scope: IDentalViewerControllerScope;  
        private _overflowManager: OverflowManager; 

        // this is a timer to keep trying to see if the layout is ready for the overflow manager to be created.
        private _overflowTimerId: number = -1;
        // this is the list for the items to be added to the overflow manager when the overflow manager is not ready yet.
        private _overflowManagerReadyList: any = [];

        private _viewerApi: Directives.MedicalViewerApi;
        private _toolbarService;
        private _tabService;
        private _templateService;

        constructor($rootScope, $scope: IDentalViewerControllerScope, eventService: EventService, toolbarService: ToolbarService, optionsService: OptionsService, seriesManagerService: SeriesManagerService, objectRetrieveService: ObjectRetrieveService, dataService: DataService, tabService: TabService, dicomLoaderService: DicomLoaderService, hotkeys, templateService: TemplateService, authenticationService: AuthenticationService, queryArchiveService: QueryArchiveService) {
            var dateFormat = optionsService.get(OptionNames.DateFormat); 
            var singleSeries:boolean = optionsService.get(OptionNames.SingleSeriesMode); 
            var __this = this;   
            var spacingSize = Utils.get_spacingSize();  
            var overflowSize = optionsService.get(OptionNames.SeriesThumbnailWidth) * 2;
            __this._templateService = templateService;

            if (overflowSize > 150)
                overflowSize = 150;     


            this._toolbarService = toolbarService;
            this._tabService = tabService;

            $scope.layoutConfig = {
                autoBindCustomButtons: true,
                scrollToBookmarkOnLoad: false,
                applyDemoStyles: true,
                spacing_closed: spacingSize*2,
                spacing_open: spacingSize*2,
                livePaneResizing: false,
                west__size: $(window).width() * (Utils.isTabletOrMobile()? .25 : .25),
                west__resizable: true,
                west__togglerLength_closed: 21,                
                south__resizable: false,
                south__initHidden: true,                
                south__togglerContent_open: "<span style='vertical-align:top; color:white; vertical-align:middle'>Overflow</span>",
                south__togglerLength_open: 64,
                south__togglerContent_closed: "<span style='vertical-align:top; color:white'>Overflow</span>",
                south__togglerLength_closed: 64,                
                south__size: overflowSize,
                east__initHidden: true,
                east__resizable: true,
                east__size: $(window).width() * (Utils.isTabletOrMobile() ? .25 : .25),                
                north__size: "auto",
                north__resizable: false,
                north__showOverflowOnHover: true
            }
            
            $scope.toolbars = toolbarService.getToolbars();  
            $scope.query = new Models.QueryOptions();   
            $scope.tabId = '';
            $scope.viewerId = UUID.generate();  
            $scope.overflowId = UUID.generate();          

            $scope.viewerConfig = new MedicalViewerConfig();
            $scope.viewerConfig.rows = 1;
            $scope.viewerConfig.columns = 1;
            $scope.viewerConfig.splitterSize = Utils.get_splitterSize();
            $scope.viewerConfig.studyLayout = templateService.currentStudyLayout;
            $scope.viewerapi = {};
            $scope.viewerConfig.OnApiReady = function (viewerApi: Directives.MedicalViewerApi) {
                __this._viewerApi = viewerApi;
                __this._toolbarService.enable("DeleteStudyStructuredDisplay" + __this._tabService.selectedTab.id, function () {
                    return viewerApi.hasLayout;
                });
            };
            $scope.layoutApi = {};
            $scope.seriesList = new Array<MedicalViewerSeries>(); 
            $scope.autoHideEW = false;


            this._objectRetrieveService = objectRetrieveService;
            this._scope = $scope;
            this._overflowManager = null;            

            var deregister = $scope.$watch('tabId', function (newValue, oldValue) {
                var unsubscribe;

                tabService.set_tabData($scope.tabId, TabDataKeys.ViewController, __this);
                tabService.set_tabData($scope.tabId, TabDataKeys.Linked, true);
                deregister();

                unsubscribe = eventService.subscribe(EventNames.ToolbarCreated, function (event, data) {
                    if (data.args == $scope.tabId) {
                        var cell:lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();

                        var linked = optionsService.get(OptionNames.LinkImages); 

                        var cell: lt.Controls.Medical.Cell = data.args.cell;

                        toolbarService.disable("PopupCapture" + $scope.tabId);

                        toolbarService.updateClass('LinkImages' + $scope.tabId, 'Linked', 'UnLinked', function () { return linked; });
                        eventService.publish(EventNames.RefreshToolbar, { cell: cell, tab: null, viewer: cell ? cell.viewer : null });
                        unsubscribe();
                        if (angular.isDefined($scope.layoutApi.refresh)) {
                            setTimeout(function () {
                                $scope.layoutApi.openPane('north');
                                $scope.layoutApi.refresh();
                            }, 900);
                        }
                    }
                });

                eventService.subscribe(EventNames.LoadSeries + $scope.tabId, function (event, data) {
                    var series: MedicalViewerSeries = new MedicalViewerSeries(data.args.series.InstanceUID, data.args.series.Patient.ID);
                    var patientSeries: Array<any> = seriesManagerService.currentLoadingSeries.Patient.ID;

                    series.template = data.args.template;
                    series.dislaySetNumber = data.args.displaySetNumber;
                    series.type = data.args.isSTL ? "stl" : "dicom";
                    series.modality = data.args.series.Modality;

                    (<any>series).mrtiCell = data.args.series.mrtiCell;
                    if (singleSeries) {
                        $scope.seriesList.length = 0;
                    }
                    else {
                        var cellCount = 1;
                        var s = data.args.series;
                        var result = $.grep($scope.seriesList, function (e, index) {
                            return s.Patient.ID != e.patientID;
                        });

                        if (angular.isDefined($scope.viewerapi.get_cellCount)) {
                            cellCount = $scope.viewerapi.get_cellCount();
                        }
                        else {
                            cellCount = $scope.viewerConfig.columns * $scope.viewerConfig.rows;
                        }

                        if (result.length != 0 || cellCount<=1) {
                            $scope.seriesList.length = 0;
                        }
                    }

                    if (__this._overflowManager != null) {
                        __this._overflowManager.clear();
                    }
                                       
                    series.link = optionsService.get(OptionNames.LinkImages);
                    $scope.seriesList.push(series);
                    $scope.autoHideEW = (patientSeries.length < 2) || (lt.LTHelper.device == lt.LTDevice.mobile);                    
                    $scope.$apply();

                    if(angular.isDefined($scope.layoutApi.closePane)) {
                        $scope.layoutApi.closePane('south');
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
                    if ($scope.layoutApi && $scope.layoutApi.closePane) {
                        $scope.layoutApi.closePane('east');
                    }
                });
            });

            $scope.setListController = function (listController) {
                __this._listController = listController;
            };

            $scope.getListController = function () {
                return __this._listController;
            };                                   

            $scope.InitializeOverflowManager = function (tab) {

                if (tab != null) {
                    $scope.layoutApi.openPane('south');
                    if (__this._overflowManager == null) {
                        __this._overflowManager = new OverflowManager("#" + $scope.overflowId, dicomLoaderService.get_newLoader(), { api: __this._scope.layoutApi, direction: 'south' }, tabService, tab, eventService);

                        if (!$("#" + $scope.overflowId)[0]) {
                            __this._overflowManager = null;
                        }
                    }
                }

                if (__this._overflowManager) {
                    $scope.layoutApi.openPane('south');




                    for (var index = 0; index < __this._overflowManagerReadyList.length; index++) {
                        __this._overflowManager.add(__this._overflowManagerReadyList[index].instance);

                        // set the seriesInstance for the overflow manager.
                        if (index == 0)
                            __this._overflowManager.set_seriesInstanceUID(__this._overflowManagerReadyList[index].instance.SeriesInstanceUID);
                    }


                    

                    __this._overflowManager.filterOutInvalidOverflow(seriesManagerService);



                    __this._overflowManagerReadyList = [];
                    return true;
                }

                return false;

            };

            eventService.subscribe(EventNames.InstanceOverflow, function (event, data) {

                if (!$scope.isOverflowItemValid(seriesManagerService, data.args.instance.SeriesInstanceUID))
                    return;

                // add the data to the rady list so when the layout is ready, creat the overflow and add them.
                __this._overflowManagerReadyList.add(data.args);

                var tab = seriesManagerService.get_seriesTab(data.args.instance.SeriesInstanceUID); 
                if (!tab)
                    return;

                // the layout is not ready yet, for some fucking reason, we need to keep looping and try until it is.
                if (!$scope.layoutApi.openPane) {

                    // keep trying every 500 millisecond until the data is ready.
                    if (__this._overflowTimerId == -1) {
                        __this._overflowTimerId = window.setInterval(function (e) {

                            // the layout is ready, initialize now.
                            if ($scope.layoutApi.openPane)

                                if ($scope.InitializeOverflowManager(tab)) {

                                    // initializtion is a success, clear the timer now and rest the variables.
                                    window.clearInterval(__this._overflowTimerId);
                                    __this._overflowTimerId = -1;
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

                    
                    if (__this._templateService.currentStudyLayout.LoadedBoxes == 0) {

                        __this._toolbarService.disable("PopupCapture" + tab.id);
                    }

                    if (__this._overflowManager != null) {
                        __this._overflowManager.clear();
                    }
                }
            }); 

            eventService.subscribe(EventNames.InstanceOverflowClose, function (event, data) {
                var tab = seriesManagerService.get_seriesTab(data.args.seriesInstanceUID);

                if (!tab)
                    tab = data.args.tab;

                if (tab != null && tab.id == $scope.tabId) {
                    $scope.layoutApi.closePane('south');
                }
            });  

            $scope.previousImage = function () {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                var current = cell.currentOffset;

                if (current != 0 && current >= 1) {
                    cell.currentOffset = current - 1;
                    //$scope.currentPosition = current - 1;
                }
            }

            $scope.isOverflowItemValid = function (seriesManagerService: SeriesManagerService, seriesInstanceUID: string) {

                // we assume it's valid... if there is no information at all
                var valid = true;
               
                // if there is a currentloadingSeries, then we check if the series matches the seriesInstanceUID in question.
                if (seriesManagerService.currentLoadingSeries) {
                    valid = false;
                    if (seriesManagerService.currentLoadingSeries.InstanceUID == seriesInstanceUID)
                        return true;
                }


                // if there is a structured display, then we check if there is any reference in the SeriesInstanceUID in the structured display.
                if (seriesManagerService.currentStructuredDisplay) {
                    valid = false;
                    if (seriesManagerService.currentStructuredDisplay.Series) {
                        var index = 0;
                        var length = seriesManagerService.currentStructuredDisplay.Series.length;

                        for (index = 0; index < length; index++) {

                            if (seriesManagerService.currentStructuredDisplay.Series[index].SeriesInstanceUID == seriesInstanceUID)
                                return true;
                        }
                    }
                }

                return false;
            }


            $scope.nextImage = function () {
                var cell: lt.Controls.Medical.Cell = seriesManagerService.get_activeCell();
                var seriesInstanceUID = cell.seriesInstanceUID;
                var max = seriesManagerService.get_maxAllowedStackIndex(cell);
                var current = cell.currentOffset;

                if (current != -1 && current < max) {
                    cell.currentOffset = current + 1;
                    //$scope.currentPosition = current + 2;
                }
            } 
            
            hotkeys.bindTo($scope)
                .add({
                    combo: ['+', 'down'],
                    description: 'Next Image',
                    callback: $scope.nextImage
                })
                .add({
                    combo: ['-', 'up'],
                    description: 'Previous Image',
                    callback: $scope.previousImage
                });                                                                                                                                                                               
        } 

        public getListController() {
            return this._listController;
        }

        public getViewer() {
            return this._scope.viewerapi.getMedicalViewer();
        } 

        public getOverflowManager() {
            return this._overflowManager;
        }

        public showTimeLine() {
        }

        public isTimeLineShowing() {
            return false;
        }

        public hideTimeLine() {
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



    }
}
