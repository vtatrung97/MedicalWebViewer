﻿/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/angular/angular.d.ts" />

module Directives {
    export class MedicalViewerApi {
        private _viewer: lt.Controls.Medical.MedicalViewer;
        private _config: MedicalViewerConfig;

        public get selectedItems(): lt.LeadCollection {
            return this._viewer.emptyDivs.selectedItems;
        }

        public get cellCount(): number {
            return this._viewer.get_gridLayout().get_rows() * this._viewer.get_gridLayout().get_columns();
        }

        public get canMerge(): boolean {
            return this._viewer.canMerge();
        }

        public get hasLayout(): boolean {
            return !!this._config.studyLayout;
        }

        public get studyLayout(): Models.StudyLayout {
            return this._config.studyLayout;
        }

        public set studyLayout(value: Models.StudyLayout) {
            this._config.studyLayout = value;
        }

        constructor(viewer: lt.Controls.Medical.MedicalViewer, config: MedicalViewerConfig) {
            this._viewer = viewer;
            this._config = config;
        }

        public mergeSelectedCells() {
            this._viewer.mergeSelected();
        }

        public clearLayout() {
            delete this._config["studyLayout"];
        }
    }
}

var MedicalViewerAction = {
    Offset: 0,
    Scale: 1,
    Magnify: 2,
    WindowLevel: 3,
    Stack: 4,
    AnnRectangle: 5,
    AnnEllipse: 6,
    AnnPointer: 7,
    AnnCurve: 8,
    AnnLine: 9,
    AnnText: 10,
    AnnHighlight: 11,
    AnnRuler: 12,
    AnnPolyRuler: 13,
    AnnProtractor: 14,
    AnnSelect: 15,
    AnnFreeHand: 16,
    SpyGlass: 17,
    ProbeTool: 18,
    AnnPoint: 19,
    AnnPolyline: 20,
    AnnPolygon: 21,
    AnnTextPointer: 22,
    AnnNote: 23,
    CrossHair: 24,
    DragItem: 25,
    LineProfile: 26,
    Cursor3D: 27,

    ShutterRect: 28,
    ShutterEllipse: 29,
    ShutterPolygon: 30,
    ShutterFreeHand: 31,

    Rotate3D: 32,
    PanoramicPolygon: 33,
    CTRTool: 34

}

var Spyglass = {
    Default: 0,
    Invert: 1,
    CLAHE: 2,
    Equalization: 3
}

module CommandManager {

    export var LastCommand = { Action: MedicalViewerAction.WindowLevel, ButtonID: "" };
    export var Last3DCommand = { Action: MedicalViewerAction.WindowLevel, ButtonID: "" };

    function AssignAction(cell: any, action, button: lt.Controls.MouseButtons, buttonid) {

        if (cell.getCommand) {

            if (action == MedicalViewerAction.Rotate3D)
                return false;


            var actionCommand: lt.Controls.Medical.ActionCommand;

            actionCommand = cell.getCommand(action);

            var index = 0;
            var length = cell.viewer.layout.items.count;
            var currentCell: lt.Controls.Medical.Cell;
            actionCommand.linked.clear();
            for (index = 0; index < length; index++) {
                currentCell = cell.viewer.layout.items.get_item(index);
                if (currentCell.tickBoxes && currentCell.tickBoxes.length > 0) {
                    if (currentCell.tickBoxes[0].checked)
                        actionCommand.linked.add(currentCell);
                }
            }
            actionCommand.button = button;

            cell.runCommand(action);

            if (button == lt.Controls.MouseButtons.left) {
                LastCommand.ButtonID = buttonid;
                LastCommand.Action = action;
            }
        }
        else {
            var cell3D: lt.Controls.Medical.Cell3D = <lt.Controls.Medical.Cell3D>cell;
            var action3D: lt.Controls.Medical.Interactive3DAction;
            switch (action) {
                case MedicalViewerAction.Offset:
                    action3D = lt.Controls.Medical.Interactive3DAction.offset;
                    break;
                case MedicalViewerAction.WindowLevel:
                    action3D = lt.Controls.Medical.Interactive3DAction.windowLevel;
                    break;
                case MedicalViewerAction.Scale:
                    action3D = lt.Controls.Medical.Interactive3DAction.scale;
                    break;
                case MedicalViewerAction.Rotate3D:
                    action3D = lt.Controls.Medical.Interactive3DAction.rotate3D;
                    break;
                default:
                    return false;
            }
            if (button == lt.Controls.MouseButtons.left) {
                Last3DCommand.ButtonID = buttonid;
                Last3DCommand.Action = action3D;
            }

            cell3D.actions[button] = action3D;
        }

        return true;
    }


    export function RunCommand(cell, commandID: number, buttonID) {
        var assigned: boolean = AssignAction(cell, commandID, lt.Controls.MouseButtons.left, buttonID);
        if (!assigned)
            return;

        switch (commandID) {
            case MedicalViewerAction.WindowLevel:
                AssignAction(cell, MedicalViewerAction.Offset, lt.Controls.MouseButtons.right, buttonID);
                AssignAction(cell, MedicalViewerAction.Scale, lt.Controls.MouseButtons.middle, buttonID);
                break;
            case MedicalViewerAction.Scale:
                AssignAction(cell, MedicalViewerAction.WindowLevel, lt.Controls.MouseButtons.right, buttonID);
                AssignAction(cell, MedicalViewerAction.Offset, lt.Controls.MouseButtons.middle, buttonID);
                break;
            default:
                AssignAction(cell, MedicalViewerAction.WindowLevel, lt.Controls.MouseButtons.right, buttonID);
                AssignAction(cell, MedicalViewerAction.Scale, lt.Controls.MouseButtons.middle, buttonID);
                break;
        }
    }
}


var cellNameCounter = 0;

var SpyglassEffect: number = Spyglass.Default;
var stretchIntensityLow: number = 0;
var stretchIntensityHigh: number = 0;


class MedicalViewerConfig {
    public rows: number;
    public columns: number;
    public studyLayout: Models.StudyLayout;
    public hangingProtocol: Models.HangingProtocol;
    public customLayout: any;
    public splitterSize: number;
    public OnApiReady: any;
    public OnSelectionChanged: (selectionCount: number) => {};

    constructor() {
        this.rows = 1;
        this.columns = 2;
        this.splitterSize = Utils.get_splitterSize();
        this.studyLayout = null;
        this.customLayout = null;
        this.hangingProtocol = null;
    }
}

class MedicalViewerCellConfig {
    public arrangement: number;
    public unselectedBorderColor: string;
    public selectedBorderColor: string;
    public highlightedSubCellBorderColor: string;
}

class MedicalViewerSeries {
    public seriesInstanceUID: string;
    public patientID: string;
    public rows: number;
    public columns: number;
    public forCompare: boolean;
    public link: boolean;
    public id: string;
    public sopInstanceUIDS: Array<string>;
    public template: Models.Template;
    public dislaySetNumber: number;
    public view: any;
    public loadSeriesLayout: boolean;
    public structuredDisplayID: string;
    public templateItem;
    public type;
    public modality;

    constructor(seriesInstanceUID: string, patientID: string, sdID?: string, rows?: number, columns?: number) {
        this.seriesInstanceUID = seriesInstanceUID;
        this.patientID = patientID;
        this.rows = rows || 1;
        this.columns = columns || 1;
        this.forCompare = false;
        this.link = true;
        this.id = UUID.genV4().toString();
        this.sopInstanceUIDS = new Array<string>();
        this.template = null;
        this.dislaySetNumber = undefined;
        this.loadSeriesLayout = true;
        this.structuredDisplayID = sdID;
        this.templateItem;
        this.modality = "";
    }
}


interface FindBoxCallback {
    (box: Models.ImageBox): boolean;
}

directives.directive('medicalviewer', ["eventService", "$timeout", "$parse", "objectRetrieveService", "queryArchiveService", "optionsService", "dicomLoaderService", "seriesManagerService", "overlayManagerService", "dataService", "cinePlayerService", "tabService", "templateService", function (eventService: EventService, $timeout, $parse, objectRetrieveService: ObjectRetrieveService, queryArchiveService: QueryArchiveService, optionsService: OptionsService, dicomLoaderService: DicomLoaderService, seriesManagerService: SeriesManagerService, overlayManagerService: OverlayManagerService, dataService: DataService, cinePlayerService: CinePlayerService, tabService: TabService, templateService: TemplateService): ng.IDirective {
    return {
        restrict: 'A',
        scope: {
            viewerConfig: '=',
            series: '=',
            viewerapi: '=',
            cellClicked: '&',
            stackChanged: '&',
            seriesDropped: '&',
            cellSelected: '&',
        },
        link: function (scope: any, elem: any, attr: any) {
            if (attr.viewerId) {
                elem.attr('id', attr.viewerId);
            }

            // set the licence

            /* License Setup:
             * 
             * When checking for a client license, failure results in an on-screen alert() message.
             * You can set the license in three ways:
             *    - Do nothing, and wait for the default license check in Leadtools.Controls (using LTHelper.licenseDirectory), provided that you set the license and developer key files in the LEADTOOLS folder at the server
             *    - lt.RasterSupport.setLicenseUri(licenseUri, developerKey, callback)
             *       - Allows us to set an absolute or relative path to the license file (makes a GET request)
             *    - lt.RasterSupport.setLicenseText(licenseText, developerKey) or setLicenseBuffer(licenseBuffer, developerKey)
             *       - Allows us to make our own request for the license and just provide the text or byte array buffer
             *
             * See lt.RasterSupport JavaScript documentation for more information.
             *
             * Note: If you choose to comment out this code, know that LEADTOOLS will check for the license
             * using LTHelper.licenseDirectory.
             */

            /*
            if (lt.RasterSupport.kernelExpired) {
                // "null" means to use the LTHelper.licenseDirectory
                lt.RasterSupport.setLicenseUri("https://demo.leadtools.com/licenses/js/LEADTOOLSEVAL.txt", "EVAL", () => {
                    if (!lt.RasterSupport.kernelExpired) {
                        lt.LTHelper.log("LEADTOOLS client license set successfully");
                    } else {
                        var msg = "No LEADTOOLS License\n\nYour license file is missing, invalid or expired. LEADTOOLS will not function. Please contact LEAD Sales for information on obtaining a valid license.";
                        alert(msg);
                    }
                });
            }
            */

            var viewer: lt.Controls.Medical.MedicalViewer = new lt.Controls.Medical.MedicalViewer(elem[0], 0, 0);

            viewer.layout.beginUpdate();

            var divid = viewer.get_divId()
            var config: MedicalViewerConfig = scope.viewerConfig || new MedicalViewerConfig();
            var numInstances = 0;

            //
            // Mobile devices are 1x1
            if (lt.LTHelper.device == lt.LTDevice.mobile && (!config.studyLayout && !config.customLayout)) {
                config.rows = 1;
                config.columns = 1;
            }

            viewer.get_emptyDivs().get_items().add_collectionChanged(emptyDivsCollectionChanged);

            if (config.hangingProtocol) {
                var hangingProtocol: Models.HangingProtocol = Utils.clone(config.hangingProtocol);

                config.hangingProtocol = hangingProtocol;
                if (!set_gridMode(config, hangingProtocol.Rows, hangingProtocol.Columns)) {
                    var boxes: Array<Models.ImageBox> = new Array<Models.ImageBox>();

                    angular.forEach(config.hangingProtocol.DisplaySets, function (displaySet: Models.DisplaySet, key) {
                        angular.forEach(displaySet.Boxes, function (box: Models.ImageBox, key) {
                            box["displaySetNumber"] = displaySet.DisplaySetNumber;
                            boxes.push(box);
                        });
                    });

                    set_randomMode(config, boxes, function (box: Models.ImageBox) {
                        return angular.isDefined(box["displaySetNumber"]) && box["displaySetNumber"] != -1;
                    });
                }
                set_hangingProtocolViewerSettings(viewer, hangingProtocol);
            }
            else if (config.studyLayout) {

                var studylayout: Models.StudyLayout = Utils.clone(config.studyLayout);

                config.studyLayout = studylayout;
                if (config.studyLayout.Boxes) {
                    config.studyLayout.Boxes.sort(function (a: Models.ImageBox, b: Models.ImageBox) {
                        return a.ImageBoxNumber - b.ImageBoxNumber;
                    });
                }

                if (!set_gridMode(config, studylayout.Rows, studylayout.Columns)) {
                    viewer.cellsArrangement = lt.Controls.Medical.CellsArrangement.random;
                    viewer.totalCells = config.studyLayout.Boxes.length;
                    resetSeriesArrangement(config.studyLayout.Boxes);
                    rearrangeSeries(config.studyLayout.Boxes);

                    function resetSeriesArrangement(boxes: Array<Models.ImageBox>) {
                        var cellLength = Math.min(boxes.length, viewer.layout.items.count);
                        var length = viewer.get_emptyDivs().items.count;

                        for (var index = 0; index < length; index++) {
                            viewer.get_emptyDivs().get_items().get_item(index).set_position(index + cellLength);
                        }
                    }

                    function rearrangeSeries(boxes: Array<Models.ImageBox>) {
                        var length = viewer.emptyDivs.items.count;

                        viewer.layout.beginUpdate();
                        for (var index = 0; index < length; index++) {
                            var boxNumber: number = index + 1;
                            var series = $.grep(config.studyLayout.Series, function (series: Models.SeriesInfo) {
                                return series.ImageBoxNumber == boxNumber;
                            });

                            if (series.length == 0) {
                                var item: lt.Controls.Medical.EmptyCell = viewer.emptyDivs.items.item(index);
                                var box: Models.ImageBox = boxes[index];
                                var rect: lt.LeadRectD = Utils.createLeadRect(box.Position.leftTop.x, box.Position.leftTop.y,
                                    box.Position.rightBottom.x, box.Position.rightBottom.y);

                                item.bounds = rect;
                            }
                        }

                        viewer.layout.endUpdate();
                    }

                    $.each(config.studyLayout.Boxes, function (index: number, item: Models.ImageBox) {
                        //if (item.referencedSOPInstanceUID.length == 0) {
                        var cell: lt.Controls.Medical.EmptyCell = viewer.emptyDivs.items.get_item(index); //new lt.Controls.Medical.EmptyCell(viewer.emptyDivs, viewer, UUID.generate(), 1, 1);

                        var rect: lt.LeadRectD = Utils.createLeadRect(item.Position.leftTop.x, item.Position.leftTop.y,
                            item.Position.rightBottom.x, item.Position.rightBottom.y);



                        cell.position = item.ImageBoxNumber;
                        cell.bounds = rect;
                        //}
                    });
                }
            }
            else if (config.customLayout) {
                try {
                    var layout: Array<Array<any>> = JSON.parse(config.customLayout);

                    viewer.cellsArrangement = lt.Controls.Medical.CellsArrangement.random;
                    viewer.layout.beginUpdate();
                    viewer.totalCells = layout.length;
                    Utils.resetSeriesArrangement(viewer, layout);
                    Utils.rearrangeSeries(viewer, layout);
                }
                catch (error) {
                    viewer.cellsArrangement = lt.Controls.Medical.CellsArrangement.grid
                }
                finally {
                    viewer.layout.endUpdate();
                }
            }

            viewer.set_emptyCellColor(optionsService.get(OptionNames.EmptyCellBackgroundColor));

            viewer.set_backgroundColor(optionsService.get(OptionNames.BackgroundColor));
            viewer.get_gridLayout().set_rows(config.rows);
            viewer.get_gridLayout().set_columns(config.columns);
            viewer.get_gridLayout().set_splitterSize(config.splitterSize);
            viewer.layout.selectedItems.add_collectionChanged(function (sender, e: lt.NotifyLeadCollectionChangedEventArgs) {
                if (e.newItems.length == 1 && e.action == lt.NotifyLeadCollectionChangedAction.add) {
                    var cell: lt.Controls.Medical.Cell = e.newItems[0];

                    cell_mousedown(cell, null);
                }
            });

            viewer.layout.endUpdate();

            $(elem).resize(function () {

                // the resize goes into 2 phase, one with the height == 1, which is not a real resize, but a middle phase.
                // so.. we are ingoring that resize because it's expensive to resize.
                if (($(elem).width() < 2) || ($(elem).height() < 2))
                    return;

                // if the size is the same, then don't resize.
                if (($("#" + divid).width() == $(elem).width()) && ($("#" + divid).height() == $(elem).height()))
                    return;


                $("#" + divid).width($(elem).width());
                $("#" + divid).height($(elem).height());
                viewer.onSizeChanged();
                //console.error("viewer size changed");
                $('.btn-group>.dropdown-menu').css('max-height', Math.floor($(window).height() * .75) + "px");
            });

            viewer.add_selectionChanged(function (sender, e) {
                if (config.OnSelectionChanged) {
                    var count: number = viewer.layout.selectedItems.count + viewer.emptyDivs.selectedItems.count;

                    config.OnSelectionChanged(count);
                }
            });

            processEmptyDivs();
            scope.viewerapi = scope.viewerapi || {};
            scope.viewerapi.getMedicalViewer = function () {
                return viewer;
            }

            scope.viewerapi.get_cellCount = function (): number {
                return viewer.get_gridLayout().get_rows() * viewer.get_gridLayout().get_columns();
            }

            scope.viewerapi.replaceSeries = replaceSeries;
            scope.viewerapi.InitializeCell = initializeCell;
            var castViewer: any = viewer;
            castViewer.InitializeCell = initializeCell;

            if (config.OnApiReady) {
                var viewerApi: Directives.MedicalViewerApi = new Directives.MedicalViewerApi(viewer, config);

                config.OnApiReady(viewerApi);
            }

            scope.$watch('series', function (newValue: Array<MedicalViewerSeries>, oldValue: Array<MedicalViewerSeries>) {

                var oldValue2: Array<MedicalViewerSeries> = Utils.RemoveDuplicates(newValue, oldValue);
                var newValue2: Array<MedicalViewerSeries> = Utils.RemoveDuplicates(oldValue, newValue);

                if (oldValue2.length == 0 && newValue2.length == 0) {

                    if (newValue.length == 0)
                        return;

                    newValue2 = newValue;
                }

                removeSeries(oldValue2);
                addSeries(newValue2);

                deleteUnreferencedSeries();
            }, true);

            viewer.layout.get_items().add_collectionChanged(function (sender: any, e: lt.NotifyLeadCollectionChangedEventArgs) {
                if (e.action == lt.NotifyLeadCollectionChangedAction.add) {
                    eventService.publish(EventNames.NewCellsAdded, { cells: e.newItems });
                }


                if (e.action == lt.NotifyLeadCollectionChangedAction.remove) {
                    var count = e.newItems.length;

                    for (var i = 0; i < count; i++) {
                        var result = $.grep(scope.series, function (item: any, index) {
                            return item.id == e.newItems[i].divID;
                        });

                        if (result.length > 0) {
                            var index = scope.series.indexOf(result[0]);

                            scope.series.splice(index, 1);
                        }

                    }

                    var tab: Models.Tab = tabService.get_allTabs()[tabService.activeTab];
                    tab.DeleteUnusedengine(viewer);

                }
            });

            //viewer.emptyDivs.items.add_collectionChanged(function (sender: any, e: lt.NotifyLeadCollectionChangedEventArgs) {
            //    if (e.action == lt.NotifyLeadCollectionChangedAction.add) {
            //        for (var i = 0; i < e.newItems.length; i++) {
            //            var emptyCell: lt.Controls.Medical.EmptyCell = e.newItems[i];
            //            emptyCell.backgroundColor = optionsService.get(OptionNames.EmptyCellBackgroundColor);
            //        }
            //    }
            //});

            viewer.emptyDivs.selectedItems.add_collectionChanged(function (sender: any, e: lt.NotifyLeadCollectionChangedEventArgs) {
                if (e.action == lt.NotifyLeadCollectionChangedAction.add) {
                    seriesManagerService.set_activeCell('');
                }
            });

            function set_gridMode(config, rows, columns): boolean {
                if (rows != -1 && columns != -1) {
                    config.rows = rows;
                    config.columns = columns;
                    viewer.cellsArrangement = lt.Controls.Medical.CellsArrangement.grid;
                    return true;
                }
                return false;
            }

            function set_hangingProtocolViewerSettings(viewer: lt.Controls.Medical.MedicalViewer, hp: Models.HangingProtocol) {
                if (viewer == null)
                    return;

                // **********************
                // Reference Lines
                // **********************
                if (hp.NavigationIndicatorSequence != null && hp.NavigationIndicatorSequence.length > 0) {
                    viewer.showReferenceLine = true;
                }

                // **********************
                // Synchronized Scrolling
                // **********************

                // 1. Get a list of the MPR Derived (Generated) planes
                var mprPlaneDisplaySets: Array<number> = new Array<number>();
                for (var i = 0; i < hp.DisplaySets.length; i++) {
                    if (hp.DisplaySets[i].ReformattingOperationType != null) {
                        mprPlaneDisplaySets.push(hp.DisplaySets[i].DisplaySetNumber);
                    }
                }

                // 2. If any synchronizedScrolling item contains Displaysets that are not MPR generated planes, then turn on enableSynchronization
                if (hp.SynchronizedScrollingSequence != null) {
                    for (var i = 0; i < hp.SynchronizedScrollingSequence.length; i++) {

                        var reformattedPlanes = false;
                        for (var j = 0; j < hp.SynchronizedScrollingSequence[i].DisplaySetScrollingGroup.length; j++) {
                            var currentDisplaySet: number = hp.SynchronizedScrollingSequence[i].DisplaySetScrollingGroup[j];
                            if (mprPlaneDisplaySets.indexOf(currentDisplaySet) != -1) {
                                reformattedPlanes = true;
                                break;
                            }
                        }

                        if (!reformattedPlanes) {
                            viewer.enableSynchronization = true;
                            break;
                        }
                    }
                }
            }

            function set_randomMode(config, boxes: Array<Models.ImageBox>, findBox: FindBoxCallback) {
                viewer.cellsArrangement = lt.Controls.Medical.CellsArrangement.random;
                viewer.totalCells = boxes.length;

                function resetSeriesArrangement(boxes: Array<Models.ImageBox>) {
                    var cellLength = Math.min(boxes.length, viewer.layout.items.count);
                    var length = viewer.get_emptyDivs().items.count;

                    for (var index = 0; index < length; index++) {
                        viewer.get_emptyDivs().get_items().get_item(index).set_position(index + cellLength);
                    }
                }

                viewer.layout.beginUpdate();
                $.each(boxes, function (index: number, item: Models.ImageBox) {
                    var cell: lt.Controls.Medical.EmptyCell = viewer.emptyDivs.items.item(index);

                    var rect: lt.LeadRectD = Utils.createLeadRect(item.Position.leftTop.x, item.Position.leftTop.y,
                        item.Position.rightBottom.x, item.Position.rightBottom.y);

                    cell.set_position(index);
                    cell.bounds = rect;
                    cell["displaySetNumber"] = item["displaySetNumber"];
                });
                viewer.layout.endUpdate();
            }

            function processEmptyDivs() {
                viewer.get_emptyDivs()
            }

            function enableDropTarget(elem: HTMLElement) {
                elem.addEventListener("dragover", dragOverFunction, false);
                elem.addEventListener("dragenter", emptyFunction, false);
                elem.addEventListener("dragleave", emptyFunction, false);
                elem.addEventListener("drop", dropFunction, false);
            }

            function disableDropTarget(elem: HTMLElement) {
                elem.removeEventListener("dragover", dragOverFunction, false);
                elem.removeEventListener("dragenter", emptyFunction, false);
                elem.removeEventListener("dragleave", emptyFunction, false);
                elem.removeEventListener("drop", dropFunction, false);
            }

            function AddParaxialLine(panoramicPolygon, cell, count, e) {

                var panCell: lt.Controls.Medical.PanoramicCell = panoramicPolygon.panoramicCell;

                var index;

                var sliceFrame: lt.Controls.Medical.SliceFrame;
                var paraxialSlice: lt.Controls.Medical.ParaxialSlice;

                var length = count;
                var distance = 100;
                var frames: any = [];

                if (!panoramicPolygon.paraxialCells)
                    panoramicPolygon.paraxialCells = [];

                if (panoramicPolygon.paraxialCells.length == 0) {


                    var paraxialCell: lt.Controls.Medical.Derivative3D = new lt.Controls.Medical.Derivative3D(cell.viewer, cell, lt.Controls.Medical.RenderingType.server, cell.divID + "_paraxial", 1, 1);
                    panoramicPolygon.paraxialCells.add(paraxialCell);

                    paraxialCell.add_disposing(function () {

                        panoramicPolygon.paraxialCells = [];
                        panoramicPolygon.paraxialSlices.clear();
                        panoramicPolygon.invalidate();
                    });


                    var info: lt.Controls.Medical.DICOMImageInformation = null;
                    if (paraxialCell.frames.count > 0) {
                        info = paraxialCell.frames.get_item(0).information;
                        distance = panoramicPolygon.paraxialSlices.get_item(0).length;
                    }


                    for (index = 0; index < length; index++) {

                        var sliceFrame = new lt.Controls.Medical.SliceFrame(paraxialCell, panCell.engine);
                        paraxialCell.frames.add(sliceFrame);
                        frames.add(sliceFrame);

                        if (info != null)
                            sliceFrame.information = info.clone();
                    }

                    var engine = InitializeDerivativeCell(cell, paraxialCell, seriesManagerService, queryArchiveService, optionsService, overlayManagerService);
                    if (engine) { engine.start("", cell.get_seriesInstanceUID(), cell.get_studyInstanceUID()); }
                }
                else {
                    var paraxialCell: lt.Controls.Medical.Derivative3D = <lt.Controls.Medical.Derivative3D>panoramicPolygon.paraxialCells[0];

                    var info: lt.Controls.Medical.DICOMImageInformation = null;
                    if (paraxialCell.frames.count > 0) {
                        info = paraxialCell.frames.get_item(0).information;
                        distance = panoramicPolygon.paraxialSlices.get_item(0).length;
                    }


                    for (index = 0; index < length; index++) {

                        var sliceFrame = new lt.Controls.Medical.SliceFrame(paraxialCell, panCell.engine);
                        paraxialCell.frames.add(sliceFrame);
                        frames.add(sliceFrame);

                        if (info != null)
                            sliceFrame.information = info.clone();

                    }
                }


                paraxialCell.beginUpdate();
                paraxialCell.arrangement = lt.Controls.Medical.FrameArrangement.grid;
                paraxialCell.gridLayout.rows = 1;
                paraxialCell.gridLayout.columns = paraxialCell.frames.count;
                paraxialCell.endUpdate();

                panoramicPolygon.createSlice(frames, cell.selectedItem, lt.LeadPointD.create(e.item.userData.x, e.item.userData.y), 25, distance);

                MakeRoomFor(cell.viewer, 1);
                cell.invalidate();
            }


            function cell_clicked(cell: lt.Controls.Medical.Cell, e: lt.Controls.InteractiveEventArgs) {
                if (e.mouseButton == lt.Controls.MouseButtons.right) {


                    var drawable: any = cell.drawables["Panoramic"];
                    var panoramicPolygon: lt.Controls.Medical.PanoramicPolygon = drawable;
                    if (panoramicPolygon != null) {
                        if (panoramicPolygon.hitTest(cell.selectedItem, e.position.x, e.position.y)) {

                            var menu: lt.Controls.Medical.Menu;
                            switch (panoramicPolygon.hitTestResult) {
                                case lt.Controls.Medical.DrawablePart.handle:
                                    menu = new lt.Controls.Medical.Menu("Panoramic");

                                    menu.items.add(new lt.Controls.Medical.MenuItem("Delete Point", null, panoramicPolygon.hitTestIndex));
                                    menu.items.add(new lt.Controls.Medical.MenuItem("Delete Polygon", null, panoramicPolygon));
                                    break;

                                case lt.Controls.Medical.DrawablePart.paraxialHandle:
                                case lt.Controls.Medical.DrawablePart.paraxialLine:
                                    {
                                        menu = new lt.Controls.Medical.Menu("Panoramic");

                                        menu.items.add(new lt.Controls.Medical.MenuItem("Delete Paraxial Slice", null, {
                                            polygon: panoramicPolygon,
                                            paraxialIndex: panoramicPolygon.hitTestIndex
                                        }));
                                    }
                                    break;

                                case lt.Controls.Medical.DrawablePart.line:
                                    menu = new lt.Controls.Medical.Menu("Panoramic");

                                    menu.items.add(new lt.Controls.Medical.MenuItem("Add Point", null, { index: panoramicPolygon.hitTestIndex, x: e.position.x, y: e.position.y }));

                                    menu.items.add(new lt.Controls.Medical.MenuItem("Add Paraxial Slice", null, { index: panoramicPolygon.hitTestIndex, x: e.position.x, y: e.position.y }));
                                    menu.items.add(new lt.Controls.Medical.MenuItem("Add (5) Paraxial Slices", null, { index: panoramicPolygon.hitTestIndex, x: e.position.x, y: e.position.y }));

                                    menu.items.add(new lt.Controls.Medical.MenuItem("Delete Polygon", null, panoramicPolygon));
                                    break;
                                default:
                                    return;
                            }

                            menu.show(cell, e.position.x, e.position.y, lt.LeadRectD.empty);
                            menu.add_menuItemSelected(function (sender, e) {

                                switch (e.item.text) {
                                    case "Delete Point":
                                        // delete the point
                                        var points: any = panoramicPolygon.get_points();
                                        points.removeAt(e.item.userData);
                                        cell.invalidate(lt.LeadRectD.empty);

                                        // if you delete the last point, then the case statment is gonna go to the delete polygon block and delete the polygon all together
                                        if (points.count > 1)
                                            break;

                                    case "Delete Polygon":
                                        {
                                            // delete the panoramic cell that is associated with the polygon
                                            var polygon: lt.Controls.Medical.PanoramicPolygon = panoramicPolygon;
                                            if (polygon.panoramicCell instanceof lt.Controls.Medical.PanoramicCell) {
                                                polygon.panoramicCell.dispose();
                                            }

                                            // delete "panoramic" from the dictionary
                                            delete cell.drawables.Panoramic;
                                            cell.invalidate(lt.LeadRectD.empty);
                                        }
                                        break;


                                    case "Add Point":
                                        // add the point
                                        var points: any = panoramicPolygon.get_points();

                                        var newPoint: lt.LeadPointD = lt.Controls.Medical.Tools.physicalToLogical(cell.selectedItem, lt.LeadPointD.create(e.item.userData.x, e.item.userData.y));
                                        points.insert(e.item.userData.index + 1, newPoint);
                                        cell.invalidate(lt.LeadRectD.empty);
                                        break;

                                    case "Delete Paraxial Slice":
                                        {
                                            var index = e.item.userData.paraxialIndex;
                                            var mprCurve: any = <any>(e.item.userData.polygon);

                                            var frame: lt.Controls.Medical.SliceFrame = (<lt.Controls.Medical.ParaxialSlice>mprCurve.paraxialSlices.get_item(index)).frame;
                                            mprCurve.paraxialSlices.removeAt(index);
                                            frame.dispose();

                                            var paraxialCell: lt.Controls.Medical.Derivative3D = mprCurve.paraxialCells[0];
                                            paraxialCell.frames.remove(frame);

                                            mprCurve.invalidate();

                                            if (paraxialCell.frames.count == 0) {
                                                paraxialCell.dispose();
                                                mprCurve.paraxialCells = [];
                                            }
                                            else {
                                                paraxialCell.onSizeChanged();
                                                paraxialCell.invalidate(lt.LeadRectD.empty);
                                            }
                                        }
                                        break;

                                    case "Add Paraxial Slice":
                                        AddParaxialLine(panoramicPolygon, cell, 1, e);
                                        break;


                                    case "Add (5) Paraxial Slices":
                                        AddParaxialLine(panoramicPolygon, cell, 5, e);
                                        break;




                                }
                            });

                            return;

                        }
                    }

                    showSelectSeriesContextMenu(cell, e.position.x, e.position.y);

                }
            }

            function showSelectSeriesContextMenu(sender, x, y) {
                var menu: lt.Controls.Medical.Menu = new lt.Controls.Medical.Menu("Select Series");
                var cell: lt.Controls.Medical.Cell = sender;

                var index = 0;
                var length = viewer.layout.get_items().count;

                for (index = 0; index < length; index++) {
                    var item: lt.Controls.Medical.LayoutManagerItem = viewer.layout.get_items().get_item(index);
                    menu.items.add(new lt.Controls.Medical.MenuItem(item.name, null, item));
                }

                var div = document.getElementById(cell.viewer.divId);

                menu.show(cell, x, y, lt.LeadRectD.create(0, 0, div.clientWidth, div.clientHeight));
                menu.add_menuItemSelected(function (sender, e: lt.Controls.Medical.MenuItemSelectedEventArgs) {

                    viewer.layout.highlightedItems.clear();

                    var selectedCell: lt.Controls.Medical.LayoutManagerItem = e.item.userData;

                    viewer.layout.beginUpdate();
                    viewer.emptyDivs.beginUpdate();

                    var exploded: boolean = viewer.exploded;
                    if (exploded)
                        viewer.explode(cell, false);


                    if (viewer.cellsArrangement == lt.Controls.Medical.CellsArrangement.grid) {

                        var selectedCellRowPosition = selectedCell.rowPosition;
                        var selectedCellColumnsPosition = selectedCell.columnsPosition;

                        selectedCell.rowPosition = cell.rowPosition;
                        selectedCell.columnsPosition = cell.columnsPosition;
                        cell.rowPosition = selectedCellRowPosition;
                        cell.columnsPosition = selectedCellColumnsPosition;
                    }
                    else {
                        var selectedCellPosition = selectedCell.position;
                        var selectedBounds = selectedCell.bounds;

                        selectedCell.bounds = cell.bounds;
                        cell.bounds = selectedBounds;

                        selectedCell.position = cell.position;
                        cell.position = selectedCellPosition;

                    }

                    if (exploded)
                        viewer.explode(<lt.Controls.Medical.Cell>selectedCell, true);


                    viewer.layout.endUpdate();
                    viewer.emptyDivs.endUpdate();

                    cell.selected = false;
                    selectedCell.selected = true;

                    viewer.layoutCells();
                });

                menu.add_menuItemHover(function (sender, e) {
                    viewer.layout.highlightedItems.clear();
                    viewer.layout.highlightedItems.add(e.item.userData);
                });

                menu.add_menuItemLeave(function (sender, e: lt.Controls.Medical.MenuItemSelectedEventArgs) {
                    viewer.layout.highlightedItems.clear();
                });
            }


            function emptyDivsCollectionChanged(e, args) {
                var index = 0;
                var length = args.newItems.length;
                var div = null;

                if (args.get_action() === lt.NotifyLeadCollectionChangedAction.add) {

                    for (; index < length; index++) {

                        var emptyCell: lt.Controls.Medical.EmptyCell = args.newItems[index];
                        div = emptyCell.div;

                        enableDropTarget(div);

                        $(div).click(function (event) {
                            if (cinePlayerService.isPlaying)
                                cinePlayerService.stop();
                        });

                        div.addEventListener('mousedown', function (ev: MouseEvent) {
                            if (ev.button == 2)
                                showSelectSeriesContextMenu(emptyCell, ev.offsetX, ev.offsetY);

                        }.bind(this));



                    }
                }
                else if (args.get_action() === lt.NotifyLeadCollectionChangedAction.remove) {
                    for (; index < length; index++) {
                        div = args.newItems[index].get_div();
                        disableDropTarget(div);
                    }
                }
            }

            function dragOverFunction(e) {
                if (e.preventDefault)
                    e.preventDefault();

                e.dataTransfer.dropEffect = 'copy';
                return false;
            }

            function dropFunction(e) {
                var series: string = e.dataTransfer.getData('Text');

                if (series.indexOf('overflow') != -1) {
                    return false;
                }
                else {
                    if (e.stopPropagation)
                        e.stopPropagation();
                    if (e.preventDefault)
                        e.preventDefault();

                    if (null != series) {
                        var selectedIndex = -1;
                        var div = this;
                        var length = viewer.layout.get_items().get_count();
                        var selectedSeries = null;
                        var cellDiv = null;
                        var userData = null;
                        var items = viewer.layout.get_items();
                        var item;
                        var emptyItems = viewer.get_emptyDivs().get_items();
                        var position;
                        var rowPosition;
                        var colPosition;
                        var bounds;
                        var oldSeriesInstanceUID = null;

                        for (var index = 0; index < length; index++) {
                            var item = items.get_item(index);
                            var divId = item.get_divID();

                            cellDiv = document.getElementById(divId);
                            if (cellDiv == this) {
                                position = item.get_position();
                                rowPosition = item.get_rowPosition();
                                colPosition = item.get_columnsPosition();
                                bounds = item.get_bounds();
                                oldSeriesInstanceUID = $('#' + divId).attr('seriesInstanceUID');
                                break;
                            }
                        }

                        if (position == undefined) {
                            length = emptyItems.get_count();
                            items = emptyItems;
                            for (index = 0; index < length; index++) {
                                item = emptyItems.get_item(index);

                                if (item.div.id == e.target.id) {
                                    position = item.get_position();
                                    rowPosition = item.get_rowPosition();
                                    colPosition = item.get_columnsPosition();
                                    bounds = item.get_bounds();
                                    break;
                                }
                            }
                        }
                        scope.seriesDropped(
                            {
                                viewer: viewer,
                                oldSeriesInstanceUID: oldSeriesInstanceUID,
                                seriesInstanceUID: series,
                                position: position,
                                rowPosition: rowPosition,
                                colPosition: colPosition,
                                bounds: bounds
                            });
                    }
                }

                return false;
            }

            function emptyFunction(e) { }

            function removeSeries(newValue: Array<MedicalViewerSeries>) {
                var items = viewer.layout.get_items();
                var count: number = items.count;
                var itemsToDelete: Array<string> = new Array<string>();

                for (var i = 0; i < count; i++) {
                    var seriesInstanceUID = items.item(i).get_seriesInstanceUID();
                    var result = $.grep(newValue, function (e, index) { return e.seriesInstanceUID == seriesInstanceUID });

                    if (result.length != 0) {
                        itemsToDelete.push(seriesInstanceUID);
                    }
                    else {
                        // alert('you should not be in here');
                    }
                }

                $.each(itemsToDelete, function (index: number, instanceUID: string) {
                    deleteSeriesCell(instanceUID);
                });
            }

            function deleteUnreferencedSeries() {

                seriesManagerService.remove_UnusedSeries();
            }

            function addSeries(newValue: Array<MedicalViewerSeries>) {
                var count: number = newValue.length;

                if (viewer.exploded) {
                    viewer.explode(<lt.Controls.Medical.Cell>viewer.explodedCell, false);
                }

                viewer.layout.beginUpdate();
                for (var i = 0; i < count; i++) {
                    var series: MedicalViewerSeries = newValue[i];
                    var cell = seriesManagerService.get_seriesCellById(series.id);

                    if (!series.forCompare && !cell) {
                        addSeriesCell(series);
                    }
                    else if (series.forCompare) {
                        addSeriesCell(series);
                    }
                }
                viewer.layout.endUpdate();
            }

            function deleteSeriesCell(seriesInstanceUID: string, sopInstanceUID?: string) {
                var length = viewer.layout.get_items().get_count();

                viewer.layout.beginUpdate();
                for (var index: number = 0; index < length; index++) {
                    var cell: lt.Controls.Medical.Cell = viewer.layout.get_items().get_item(index);


                    if (cell.get_seriesInstanceUID() == seriesInstanceUID) {
                        var deleteCell: boolean = false;

                        if (angular.isDefined(sopInstanceUID)) {
                            var frame: lt.Controls.Medical.Frame;
                            var items = cell.get_selectedItems();
                            var i = -1;

                            if (items.get_count() > 0)
                                i = cell.get_imageViewer().get_items().indexOf(items.get_item(0));

                            if (i < 0)
                                i = 0;

                            i = cell.get_currentOffset() + index;
                            frame = cell.get_frames().get_item(index);
                            if ((<any>frame).Instance.SOPInstanceUID == sopInstanceUID) {
                                deleteCell = true;
                            }
                        }
                        else
                            deleteCell = true;

                        var dentalMode: boolean = optionsService.isSeriesView();
                        if (dentalMode) {
                            if (deleteCell) {
                                seriesManagerService.remove_seriesCell(seriesInstanceUID);
                                break;
                            }
                        }
                    }
                }
                viewer.layout.endUpdate();
            }

            function loadResources(): lt.Annotations.Engine.AnnResources {
                var resources: lt.Annotations.Engine.AnnResources = new lt.Annotations.Engine.AnnResources();
                var host: string = document.location.href;
                var imagesResources = resources.get_images();

                imagesResources[0] = new lt.Annotations.Engine.AnnPicture("images/objects/Point.png");
                return resources;
            }

            function set_resources(automationManager: lt.Annotations.Automation.AnnAutomationManager) {
                var resources: lt.Annotations.Engine.AnnResources = loadResources();

                automationManager.set_resources(resources);
            }


            function FindAnotherLineObjectToAttach(cell, cobbAngles: lt.Controls.Medical.CobbAngle[], lineObject: lt.Annotations.Engine.AnnPolylineObject): lt.Annotations.Engine.AnnPolylineObject {
                if (cell == null)
                    return null;

                if (lineObject == null)
                    return null;

                var container: lt.Annotations.Engine.AnnContainer = cell.selectedItem.attachedFrame.container;
                if (container == null)
                    return null;

                var count: number = 0;
                if (cobbAngles != null) {
                    count = cobbAngles.length;
                }

                var lastObject: number = container.children.count - 1;
                var list: lt.Annotations.Engine.AnnPolylineObject[] = new Array((count * 2) + 1);
                var index: number;
                var counter: number = 0;

                for (index = 0; index < count; index++) {
                    list[counter++] = cobbAngles[index].line1;
                    list[counter++] = cobbAngles[index].line2;
                }

                var annObject: lt.Annotations.Engine.AnnObject;
                for (index = lastObject; index >= 0; index--) {
                    annObject = container.children.get_item(index);
                    if (annObject instanceof lt.Annotations.Engine.AnnPolylineObject) {
                        if (annObject == lineObject) // If it is the same object we just drew, ignore it.
                            continue;
                        if (list.indexOf(annObject) == -1) // If not already part of a cobb angle, then we found a match
                            return <lt.Annotations.Engine.AnnPolylineObject>annObject;
                    }
                }

                return null;
            }

            function initializeCell(cell: lt.Controls.Medical.Cell, series: MedicalViewerSeries, position?, rowPosition?, columnPosition?) {
                var id: string = cell.get_divID();

                cell.set_unselectedBorderColor(optionsService.get(OptionNames.UnSelectedBorderColor));


                cell.set_selectedSubCellBorderColor(optionsService.get(OptionNames.SelectedSubCellBorderColor));
                cell.set_selectedBorderColor(optionsService.get(OptionNames.SelectedBorderColor));
                cell.set_highlightedSubCellBorderColor(optionsService.get(OptionNames.SelectedBorderColor));
                cell.set_showFrameBorder(optionsService.get(OptionNames.ShowFrameBorder));
                cell.set_seriesInstanceUID(series.seriesInstanceUID);
                cell.add_mouseDown(cell_mousedown);
                cell.add_cellClicked(cell_clicked)
                cell.add_currentOffsetChanged(stack_changed);
                cell.set_linked(series.link);
                if (cell.tickBoxes.length > 0) {
                    cell.tickBoxes[0].add_tickBoxClicked(tickBox_clicked);
                }
                cell.selectedItems.add_collectionChanged(function (sender, e: lt.NotifyLeadCollectionChangedEventArgs) {
                    if (e.action == lt.NotifyLeadCollectionChangedAction.add) {
                        if (e.newItems.length > 0) {
                            var subCell: lt.Controls.Medical.SubCell = e.newItems[0];

                            if (angular.isDefined(subCell)) {
                                var frame: lt.Controls.Medical.Frame = subCell.get_attachedFrame();

                                eventService.publish(EventNames.NewSubCellSelected, { subCell: subCell, frame: frame });
                            }
                        }
                    }
                });

                cell.automation.add_draw(function (sender, e: lt.Annotations.Engine.AnnDrawDesignerEventArgs) {
                    if (cell.selectedItem != null) {
                        switch (CommandManager.LastCommand.Action) {
                            case MedicalViewerAction.ShutterRect:
                            case MedicalViewerAction.ShutterEllipse:
                            case MedicalViewerAction.ShutterFreeHand:
                            case MedicalViewerAction.ShutterPolygon:
                                if (e.object.id == lt.Annotations.Engine.AnnObject.selectObjectId)
                                    return;
                                var frame = cell.selectedItem.attachedFrame;
                                if (e.operationStatus == lt.Annotations.Engine.AnnDesignerOperationStatus.end) {

                                    Utils.clearAllShutter(frame, null);

                                    frame.get_shutter().get_objects().add(e.object);
                                    frame.get_shutter().fillStyle = "rgba(0, 0, 0, 1)";
                                }
                                break;
                        }
                    }

                    // TM: CobbAngle: BEGIN
                    if ((<any>cell).CobbAngleStarted) {
                        if (e.operationStatus == lt.Annotations.Engine.AnnDesignerOperationStatus.end) {
                            if (e.object instanceof lt.Annotations.Engine.AnnPolylineObject) {
                                var container = cell.selectedItem.attachedFrame.container;
                                // This is the object that was just drawn on the image.  Should be a line (AnnPolylineObject)
                                var annObject = e.object;
                                if (annObject instanceof lt.Annotations.Engine.AnnPolylineObject) {
                                    // Cast to line object
                                    var lineObject = annObject;
                                    // Obtain corresponding Frame containing collection of CobbAngles
                                    var myframe: any = cell.selectedItem.attachedFrame;
                                    // Determine if this is the first line or second line.  Returns NULL if first line.
                                    var secondLine = FindAnotherLineObjectToAttach(cell, myframe.CobbAngles, annObject);
                                    if (secondLine != null) {
                                        // Create CobbAngle collection if none exist
                                        if (myframe.CobbAngles == null) {
                                            myframe.CobbAngles = new Array(1);
                                            // Add CobbAngle to our collection
                                            myframe.CobbAngles[0] = new lt.Controls.Medical.CobbAngle(cell.automation, annObject, secondLine);
                                        }
                                        else {
                                            // Add CobbAngle to our collection
                                            myframe.CobbAngles.push(new lt.Controls.Medical.CobbAngle(cell.automation, annObject, secondLine));
                                        }
                                        // Repaint the cell
                                        cell.invalidate(lt.LeadRectD.empty);
                                    }
                                }
                            }
                        }
                    }
                    // TM: CobbAngle: END
                });




                // TM: CobbAngle: BEGIN
                cell.automation.add_edit(function () {
                    cell.invalidate(lt.LeadRectD.empty);
                });
                // TM: CobbAngle: END

                // TM: CobbAngle: BEGIN
                cell.add_postRender(function (sender, e) {
                    // Get a reference to the SubCell
                    var subCell = sender;
                    // Get the bounds for where the subcell will be rendered within the cell
                    var rect = subCell.imageViewer.getItemViewBounds(subCell, lt.Controls.ImageViewerItemPart.view, false);
                    // Get the Frame for the SubCell
                    var frame = subCell.attachedFrame;
                    if (frame != null) {
                        if (frame.CobbAngles != null) {
                            for (var i = 0; i < (<any>frame).CobbAngles.length; i++) {
                                e.context.save();
                                // Move context position to the subcell bounds
                                e.context.translate(rect.left, rect.top);
                                // Draw the CobbAngle to the context
                                (<any>frame).CobbAngles[i].draw(e.context);
                                // Move the position back to origin.
                                e.context.restore();
                            }
                        }
                    }
                });
                // TM: CobbAngle: END





                enableDropTarget($('#' + id)[0]);
                $('#' + id)[0].addEventListener('dragstart', function (ev: DragEvent) {
                    ev.dataTransfer.effectAllowed = 'copy';
                    ev.dataTransfer.setData('Text', 'overflow:' + (<any>(ev.target)).id);
                }.bind(this));

                setupDraggable(cell);

                if (position) {
                    cell.set_position(position);
                }
                else if (series.dislaySetNumber) {
                    cell.set_position(series.dislaySetNumber);
                }

                if (rowPosition) {
                    cell.set_rowPosition(rowPosition);
                }
                if (columnPosition) {
                    cell.set_columnsPosition(columnPosition);
                }

                viewer.layout.get_items().add(cell);
                intializeActions(cell);
                seriesManagerService.add_seriesCell(cell);
                seriesManagerService.set_activeCell(cell.divID);
                $("#" + id).attr('seriesInstanceUID', cell.get_seriesInstanceUID());
                $("#" + id).attr('seriesID', series.id);
                set_resources((<any>cell).get_automationManager());
            }

            function setupDraggable(cell: lt.Controls.Medical.Cell) {
                var dragMode = new lt.Controls.ImageViewerDragInteractiveMode;

                cell.imageViewer.interactiveModes.beginUpdate();
                cell.imageViewer.interactiveModes.add(dragMode);
                cell.imageViewer.interactiveModes.endUpdate();
            }

            function getMPRType(value: number) {
                switch (value) {
                    case 0:
                        return lt.Controls.Medical.CellMPRType.axial;

                    case 1:
                        return lt.Controls.Medical.CellMPRType.sagittal;

                    case 2:
                        return lt.Controls.Medical.CellMPRType.coronal;

                }
            }

            function getCellByDisplaySetNumber(viewer: lt.Controls.Medical.MedicalViewer, parentDisplaySetNumber: number): lt.Controls.Medical.Cell {
                var count: number = viewer.layout.items.count;

                for (var i = 0; i < count; i++) {
                    var cell: lt.Controls.Medical.Cell = viewer.layout.items.item(i);
                    var displaySetNumber = cell['displaySetNumber'];
                    if (parentDisplaySetNumber == displaySetNumber)
                        return cell;
                }
                return null;
            }

            function addSeriesCell(series: MedicalViewerSeries, position?, rowPosition?, columnPosition?) {
                var isMprCell = false;
                var cell = null;
                if (series.view != null) {

                    if (series.view.ReformattingOperationView != null) {
                        isMprCell = true;
                        var parentCell: lt.Controls.Medical.Cell = getCellByDisplaySetNumber(viewer, series.view.ParentDisplaySetNumber);
                        cell = createMPRCell(objectRetrieveService, null, seriesManagerService, overlayManagerService, optionsService, viewer, parentCell, getMPRType(series.view.ReformattingOperationView), eventService, false);
                    }

                }

                // when we generate the series using the structured display, we check if the user hasn't click another structured display while this one is loading.
                if (series.structuredDisplayID != undefined) {
                    if (templateService.currentStudyLayoutID != series.structuredDisplayID)
                        return;
                }

                if (cell == null) {
                    if (series.type == "stl") {

                        var medicalViewer: lt.Controls.Medical.MedicalViewer = viewer;

                        cell = new lt.Controls.Medical.STLCell(viewer, "file.stl", series.id);

                        cell.loadFromURL(objectRetrieveService.GetSTLData(series.seriesInstanceUID));

                        medicalViewer.layout.items.add(cell);

                        medicalViewer.onSizeChanged();


                        cell.seriesInstanceUID = series.seriesInstanceUID;
                        cell.studyInstanceUID = "STL";

                        var seriesInstanceUID = cell.get_seriesInstanceUID();
                        var seriesInfo = seriesManagerService.get_seriesInfo(cell.get_seriesInstanceUID());
                        var newSeriesInfo = jQuery.extend(true, {}, seriesInfo);
                        newSeriesInfo.InstanceUID = seriesInstanceUID;
                        seriesManagerService.add_seriesCell(cell);
                        seriesManagerService.set_activeCell(cell.divID);

                    }
                    else {
                        cell = new lt.Controls.Medical.Cell(viewer, series.id, series.rows, series.columns);

                        cell.beginUpdate();

                        // item for the subCell template.
                        var subCell: lt.Controls.Medical.MRTISubCell = <lt.Controls.Medical.MRTISubCell>cell.imageViewer.items.get_item(0);
                        (<any>subCell).templateFrame = series.templateItem;

                        // if the series is part of the template, then apply the template properties on the series once the frame gets attached.
                        if (series.templateItem) {
                            subCell.add_frameAttached(function (sender, e: lt.Controls.Medical.FrameAttachedEventArgs) {
                                if (e.frame) {
                                    if ((<any>e.subCell).templateFrame) {
                                        var templateFrame: Models.Frame = (<any>e.subCell).templateFrame;

                                        Utils.rotateFrame(e.frame, templateFrame);
                                        if (templateFrame.Flip && !e.frame.flipped)
                                            e.frame.flipped = templateFrame.Flip;
                                        if (templateFrame.Reverse && !e.frame.reversed)
                                            e.frame.reversed = templateFrame.Reverse;

                                        if (e.frame.mrtiInfo) {
                                            if (templateFrame.Invert && !e.frame.inverted)
                                                e.frame.inverted = templateFrame.Invert;
                                        }

                                        Utils.subCell_setPresentationMode(<lt.Controls.Medical.MRTISubCell>e.subCell);
                                    }
                                }
                            });
                        }


                        var SDInstances = (<any>viewer).SDInstances;
                        // make sure that the series exist in the SDInstance list or just consider it true.
                        // also, if SDInstances is not defined yet, that means there is no structure display clicked on yet, so make it visible.
                        cell.visibility = SDInstances ? (SDInstances[series.seriesInstanceUID] ? SDInstances[series.seriesInstanceUID] : true) : true;


                        var hideOverlays = optionsService.get(OptionNames.HideOverlays);
                        cell.set_overlayTextVisible(!hideOverlays);

                        var isMedicore: boolean = false;
                        if (optionsService.has(OptionNames.UseMedicoreLogo)) {
                            isMedicore = optionsService.get(OptionNames.UseMedicoreLogo);
                        }

                        //if (isMedicore) {
                        //    HideTab_And_ShiftToolbarButtons();
                        //}

                        (<any>cell).forCompare = series.forCompare;
                        (<any>cell).SortOrderAcsending = true;
                        (<any>cell).CurrentSelectedSortOrder = "Axis";

                        if (cell.tickBoxes.length > 0) {
                            if (series.forCompare) {
                                cell.tickBoxes[0].checked = true;
                            }
                            else {
                                var dentalMode: boolean = optionsService.isSeriesView();
                                if (dentalMode) {
                                    cell.tickBoxes[0].visible = false;
                                }
                            }
                        }



                        initializeCell(cell, series, position, rowPosition, columnPosition);
                        //if (templateService.currentStudyLayout && templateService.currentStudyLayout.Boxes) {
                        //    if (templateService.currentStudyLayout.Boxes.length == viewer.layout.get_items().get_count()) {
                        //        eventService.publish(EventNames.EnableSeriesList, { enable: true });
                        //    }
                        //}




                        cell['displaySetNumber'] = series.dislaySetNumber;
                        enableDropTarget($('#' + series.id)[0]);
                        $("#" + series.id).attr('seriesInstanceUID', cell.get_seriesInstanceUID());
                        dicomLoaderService.loadSeries(cell, series.sopInstanceUIDS, series.template, series.modality, false, (<any>series).mrtiCell, series.loadSeriesLayout);

                        if (series.forCompare) {
                            cell.runCommand(MedicalViewerAction.Stack);

                        }

                        var firstFrameReady = function (sender, e) {

                            eventService.publish(EventNames.SeriesLoading, null);
                            eventService.publish(EventNames.EnableSeriesList, { enable: true });

                            if (cell) {
                                var loadingDiv: any = cell.div.getElementsByClassName('loader' + cell.div.id)[0];
                                if (loadingDiv) {
                                    cell.div.removeChild(loadingDiv);
                                    loadingDiv.id = '';
                                }

                                cell.endUpdate();
                                if (cell.viewer.layout.selectedItem == null)
                                    cell.viewer.layout.selectedItem = cell;

                                CommandManager.RunCommand(cell, CommandManager.LastCommand.Action, CommandManager.LastCommand.ButtonID);
                            }
                        }

                        cell.add_firstFrameReady(firstFrameReady);
                        cell.add_disposing(function (sender, e) {
                            cell.remove_firstFrameReady(firstFrameReady);
                        });


                        cell.endUpdate();

                        var loadingDiv = document.createElement("div");
                        loadingDiv.id = 'loader';
                        loadingDiv.className = 'loader' + cell.div.id;

                        cell.div.appendChild(loadingDiv);
                    }
                }

                setCellPosition(cell, series.dislaySetNumber);

                cell.beginUpdate();


                return cell;
            }

            function setCellPosition(cell: lt.Controls.Medical.Cell, displaySetNumber?: number) {

                if (angular.isDefined(config.hangingProtocol) && config.hangingProtocol != null) {
                    var displaySet: Models.DisplaySet = Utils.findFirst(config.hangingProtocol.DisplaySets, function (set) {
                        return set.DisplaySetNumber == displaySetNumber;
                    });


                    (<any>viewer).HangingProtocolEnabled = (displaySet != null);

                    if (displaySet) {
                        var box: Models.ImageBox = displaySet.Boxes[0];

                        if (viewer.cellsArrangement == lt.Controls.Medical.CellsArrangement.random) {
                            var emptyCell: lt.Controls.Medical.EmptyCell = Utils.findFirst(viewer.emptyDivs.items.toArray(), function (cell: lt.Controls.Medical.Cell) {
                                return cell["displaySetNumber"] == box["displaySetNumber"];
                            });

                            if (emptyCell) {
                                var bounds = emptyCell.bounds;

                                viewer.emptyDivs.items.remove(emptyCell);
                                cell.bounds = bounds;
                            }
                        }
                        else
                            setBoxPosition(box, cell);

                        if (box.ImageBoxLayoutType == Models.ImageBoxLayoutType.Tiled) {
                            cell.beginUpdate();

                            cell.gridLayout.rows = box.ImageBoxTileVerticalDimension;
                            cell.gridLayout.columns = box.ImageBoxTileHorizontalDimension;
                            if (cell.arrangement != 0)
                                cell.arrangement = 0;

                            cell.endUpdate();
                        }

                        var scrollType: lt.Controls.Medical.ScrollType = HangingProtocolHelper.ConvertToScrollType(displaySet);
                        cell.set_scrollType(scrollType);

                        HangingProtocolHelper.ConvertToCellCinePlayer(cell, displaySet);
                        cinePlayerService.fps = cell.cinePlayer.FPS;
                        cinePlayerService.directionFromPlayingDirection = cell.cinePlayer.direction;
                        cinePlayerService.loop = cell.cinePlayer.loop;


                        cell.frames.add_collectionChanged(function (sender, e: lt.NotifyLeadCollectionChangedEventArgs) {
                            if (e.action == lt.NotifyLeadCollectionChangedAction.add) {

                                var windowLevelItem = FindPresetWindowLevelValue(displaySet.VoiType);
                                for (var i = 0; i < e.newItems.length; i++) {
                                    var frame: lt.Controls.Medical.Frame = e.newItems[i];

                                    frame.horizontalAlignment = HangingProtocolHelper.ConvertToHorizontalAlignmentType(displaySet.DisplaySetHorizontalJustification);
                                    frame.verticalAlignment = HangingProtocolHelper.ConvertToVerticalAlignmentType(displaySet.DisplaySetVerticalJustification);
                                    frame.targetOrientation = displaySet.DisplaySetPatientOrientation;

                                    // Set 
                                    // var item = { VoiType: Models.VoiType.Lung, Text: camelize('LUNG'), Info: { W: 1500, C: -600 } };
                                    if (windowLevelItem != null) {
                                        frame.setWindowLevel(windowLevelItem['Info']['W'], windowLevelItem['Info']['C']);
                                    }

                                    if (displaySet.ShowGrayscaleInverted != null) {
                                        frame.inverted = displaySet.ShowGrayscaleInverted;
                                    }

                                    if (displaySet.ShowImageTrueSizeFlag != null) {
                                        if (displaySet.ShowImageTrueSizeFlag) {
                                            frame.zoom(lt.Controls.Medical.MedicalViewerSizeMode.trueSize, 1);
                                        }
                                    }

                                }
                            }
                        });
                    }
                }
                else if (angular.isDefined(config.studyLayout) && config.studyLayout != null && angular.isDefined(config.studyLayout["Series"])) {

                    var series = $.grep(config.studyLayout.Series, function (item: Models.SeriesInfo) {

                        if (cell.hasOwnProperty("displaySetNumber")) {
                            return item.ImageBoxNumber == cell["displaySetNumber"];
                        }
                        else {
                            return item.SeriesInstanceUID == cell.seriesInstanceUID;
                        }
                    });

                    if (series.length == 0) {
                        for (var i = 0; i < config.studyLayout.OtherStudies.length; i++) {
                            var study: Models.OtherStudies = config.studyLayout.OtherStudies[i];
                            var series = $.grep(study.Series, function (item: Models.SeriesInfo) {
                                return item.SeriesInstanceUID == cell.seriesInstanceUID;
                            });

                            if (series.length > 0)
                                break;
                        }
                    }

                    if (series.length > 0) {
                        var boxes: Array<Models.ImageBox> = $.grep(config.studyLayout.Boxes, function (item: Models.ImageBox) {
                            return item.ImageBoxNumber == series[0].ImageBoxNumber;
                        });

                        if (boxes.length > 0) {
                            var box: Models.ImageBox = boxes[0];

                            setBoxPosition(box, cell);

                            if (box.ImageBoxLayoutType == Models.ImageBoxLayoutType.Tiled) {
                                cell.beginUpdate();

                                cell.gridLayout.rows = box.ImageBoxTileVerticalDimension;
                                cell.gridLayout.columns = box.ImageBoxTileHorizontalDimension;
                                if (cell.arrangement != 0)
                                    cell.arrangement = 0;

                                cell.endUpdate();
                            }

                            cell.frames.add_collectionChanged(function (sender, e: lt.NotifyLeadCollectionChangedEventArgs) {
                                if (e.action == lt.NotifyLeadCollectionChangedAction.add) {

                                    for (var i = 0; i < e.newItems.length; i++) {
                                        var frame: lt.Controls.Medical.Frame = e.newItems[i];

                                        frame.horizontalAlignment = HangingProtocolHelper.ConvertToHorizontalAlignmentType(box.HorizontalJustification);
                                        frame.verticalAlignment = HangingProtocolHelper.ConvertToVerticalAlignmentType(box.VerticalJustification);

                                    }
                                }
                            });
                        }
                    }


                }
            }

            function setBoxPosition(box: Models.ImageBox, cell: lt.Controls.Medical.Cell) {
                if (box.ColumnPosition != -1 && box.RowPosition != -1) {
                    cell.rowPosition = box.RowPosition;
                    cell.columnsPosition = box.ColumnPosition;
                    cell.numberOfRows = box.NumberOfRows;
                    cell.numberOfColumns = box.NumberOfColumns;

                    if (box.FirstFrame != null) {
                        cell.frames.add_collectionChanged(cellFrame_added);

                        function cellFrame_added(sender, e: lt.NotifyLeadCollectionChangedEventArgs) {
                            if (e.action == lt.NotifyLeadCollectionChangedAction.add) {
                                var index: number = box.FirstFrame.FrameNumber - 1;

                                for (var i = 0; i < e.newItems.length; i++) {
                                    var frame: lt.Controls.Medical.Frame = e.newItems[i];

                                    if (cell.frames.indexOf(frame) == index) {
                                        cell.frames.remove_collectionChanged(cellFrame_added);
                                        cell.currentOffset = index;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                else {
                    var rect: lt.LeadRectD = Utils.createLeadRect(box.Position.leftTop.x, box.Position.leftTop.y,
                        box.Position.rightBottom.x, box.Position.rightBottom.y);

                    cell.bounds = rect;
                }
            }

            function getCellWithPosition(rowPosition, colPosition, position) {
                var index = 0;
                var length = viewer.layout.items.count;
                var cell: lt.Controls.Medical.LayoutManagerItem;
                var grid = viewer.cellsArrangement == lt.Controls.Medical.CellsArrangement.grid;

                for (index = 0; index < length; index++) {
                    cell = viewer.layout.items.get_item(index);

                    if (grid) {
                        if (rowPosition != -1 && colPosition != -1) {
                            if (cell.rowPosition == rowPosition &&
                                cell.columnsPosition == colPosition)
                                return cell;

                        }
                    }
                    else {
                        if (position != -1) {
                            if (cell.position == position)
                                return cell;
                        }
                    }
                }

                return null;
            }

            function disposeAutomation(automation: lt.Annotations.Automation.AnnAutomation) {
                if (automation == null)
                    return;
                automation.get_container().get_children().clear();
                automation.detach();
            }


            function replaceSeries(oldSeriesInstanceUID: string, sopInstanceUID: string, newSeries: MedicalViewerSeries, position, rowPosition, colPosition, bounds) {
                var cell;
                var result = $.grep(scope.series, function (e: any, index) {
                    return e.seriesInstanceUID == oldSeriesInstanceUID
                });

                if (result.length != 0) {
                    var oldSeries;
                    var index;

                    if (result.length == 1) {
                        var oldSeries = result[0];
                    }
                    else {
                        for (var i = 0; i < result.length; i++) {
                            oldSeries = result[i];

                            if (!oldSeries)
                                continue;
                            if (!oldSeries.sopInstanceUIDS)
                                continue;

                            if (oldSeries.sopInstanceUIDS.indexOf(sopInstanceUID) != -1) {
                                break;
                            }
                        }
                    }

                    index = scope.series.indexOf(oldSeries);
                    //scope.series[index] = newSeries;
                    scope.series.splice(index, 1);
                    //scope.series.push(newSeries);
                    //deleteSeriesCell(oldSeriesInstanceUID, sopInstanceUID);
                }
                else {
                    //scope.series.push(newSeries);
                }

                viewer.layout.beginUpdate();

                var oldCell: lt.Controls.Medical.Cell = <lt.Controls.Medical.Cell>getCellWithPosition(rowPosition, colPosition, position);
                if (oldCell != null) {
                    viewer.layout.get_items().remove(oldCell);
                    disposeAutomation(oldCell.get_automation());
                    seriesManagerService.remove_cell(oldCell);
                    oldCell.dispose();
                }

                cell = addSeriesCell(newSeries, position, rowPosition, colPosition);


                if (position != -1)
                    cell.set_position(position);
                cell.set_rowPosition(rowPosition);
                cell.set_columnsPosition(colPosition);
                cell.set_bounds(bounds);
                viewer.layout.endUpdate();
                viewer.layoutCells();

                scope.series.push(newSeries);
            }

            function cinePlayerActive(viewer: lt.Controls.Medical.MedicalViewer) {
                var index;
                var length = viewer.layout.get_items().get_count();
                for (index = 0; index < length; index++) {
                    var currentCell: lt.Controls.Medical.Cell = viewer.layout.get_items().get_item(index);
                    if (currentCell.cinePlayer != null) {
                        if (currentCell.cinePlayer.isPlaying)
                            return true;
                    }
                }

                return false;
            }


            function updateAnimation() {

            }

            function tickBox_clicked(sender: lt.Controls.Medical.TickBox, e) {
                var parentCell: lt.Controls.Medical.Cell = <lt.Controls.Medical.Cell>sender.parent;
                var viewer = parentCell.viewer;

                var index;
                var length = parentCell.viewer.layout.get_items().get_count();
                for (index = 0; index < length; index++) {
                    var cell: lt.Controls.Medical.Cell = viewer.layout.get_items().get_item(index);

                    if (cell.tickBoxes.length > 0) {
                        if (cinePlayerActive(viewer)) {
                            if (cell.tickBoxes[0].checked) {
                                if (!cell.cinePlayer.isPlaying) {
                                    cell.cinePlayer.play();
                                }
                            }
                            else {
                                if (cell.cinePlayer.isPlaying) {
                                    cell.cinePlayer.stop();
                                }
                            }
                        }
                    }

                    for (var commandItem in cell.commands) {
                        var command: lt.Controls.Medical.ActionCommand = cell.commands[commandItem];
                        command.linked.clear();

                        var itemIndex;
                        var itemLength = parentCell.viewer.layout.get_items().get_count();
                        for (itemIndex = 0; itemIndex < itemLength; itemIndex++) {
                            var itemCell: lt.Controls.Medical.Cell = parentCell.viewer.layout.get_items().get_item(itemIndex);
                            if (itemCell.tickBoxes.length > 0) {
                                if (itemCell.tickBoxes[0].checked)
                                    command.linked.add(itemCell);
                            }
                        }
                    }
                }
            }

            function cell_mousedown(sender: lt.Controls.Medical.Cell, e) {
                var seriesInstanceUID: string = sender.get_seriesInstanceUID();
                var series = dataService.get_Series(seriesInstanceUID);
                var click: boolean = false;
                if (!angular.isDefined(e))
                    click = true;

                if (sender != seriesManagerService.get_activeCell()) {
                    seriesManagerService.set_activeCell(sender.divID);
                    eventService.publish(EventNames.ActiveSeriesChanged, { seriesInstanceUID: seriesInstanceUID, id: sender.divID });
                }

                if (click) {
                    scope.cellClicked({ seriesInstanceUID: seriesInstanceUID });
                }

                if (sender.getCommandInteractiveMode) {
                    var lineProfile: lt.Controls.Medical.LineProfileInteractiveMode = sender.getCommandInteractiveMode(MedicalViewerAction.LineProfile);
                    lineProfile.refresh(sender);
                }
            }

            function stack_changed(sender: lt.Controls.Medical.Cell, e) {
                var index: number = sender.get_currentOffset();
                var frame = null;

                if (index != -1) {
                    frame = sender.get_frames().item(index);
                }
                scope.stackChanged({ sender: sender, e: e });
                eventService.publish(EventNames.StackChanged, { viewer: viewer, cell: sender, frame: frame });
            }


            function MakeRoomFor(viewer: lt.Controls.Medical.MedicalViewer, roomFor) {
                var desiredNumber = viewer.layout.items.count + roomFor;

                if (viewer.cellsArrangement == lt.Controls.Medical.CellsArrangement.grid) {
                    if (desiredNumber >= viewer.gridLayout.rows * viewer.gridLayout.columns) {
                        var rows = Math.round(Math.sqrt(desiredNumber));
                        var col = Math.ceil(desiredNumber / rows);


                        viewer.layout.beginUpdate();

                        viewer.gridLayout.rows = rows;
                        viewer.gridLayout.columns = col;

                        viewer.layout.endUpdate();
                    }
                }
            }

            function setupPanoramicAction(cell: lt.Controls.Medical.Cell) {
                var panoramicAction: lt.Controls.Medical.PanoramicAction = new lt.Controls.Medical.PanoramicAction(cell);
                var seriesInfo = seriesManagerService.get_seriesInfo(cell.get_seriesInstanceUID());

                var tab: Models.Tab = tabService.get_allTabs()[tabService.activeTab];
                var _cell = cell;



                cell.setCommand(MedicalViewerAction.PanoramicPolygon, panoramicAction);

            }

            function intializeActions(cell: lt.Controls.Medical.Cell) {
                var spyGlass = new lt.Controls.Medical.SpyGlassAction();
                var scaleAction: lt.Controls.Medical.ScaleAction = new lt.Controls.Medical.ScaleAction();
                var probeTool = new lt.Controls.Medical.ProbeToolAction();
                var lineProfile = new lt.Controls.Medical.LineProfileAction();


                cell.lineProfile.add_histogramGenerated(histogramGenerated);

                spyGlass.add_imageRequested(spyGlassRequested);
                spyGlass.add_chunkLoaded(chunkLoaded);
                spyGlass.add_positionChanged(spyGlassPositionChanged);




                probeTool.add_probeToolUpdated(probeToolUpdated);

                scaleAction.set_button(lt.Controls.MouseButtons.right);
                cell.setCommand(MedicalViewerAction.Offset, new lt.Controls.Medical.OffsetAction());
                cell.setCommand(MedicalViewerAction.ProbeTool, probeTool);
                probeTool.interactiveObject.backgroundColor = "rgba(0, 0, 0, 0.0)";
                probeTool.interactiveObject.textColor = "rgba(153, 200, 255, 1)";
                probeTool.interactiveObject.showBorder = false;

                cell.setCommand(MedicalViewerAction.ShutterRect, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.rectangleObjectId));
                cell.setCommand(MedicalViewerAction.ShutterEllipse, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.ellipseObjectId));
                cell.setCommand(MedicalViewerAction.ShutterFreeHand, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.freehandObjectId));
                cell.setCommand(MedicalViewerAction.ShutterPolygon, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.polygonObjectId));

                cell.setCommand(MedicalViewerAction.Cursor3D, new lt.Controls.Medical.Cursor3DAction());
                cell.setCommand(MedicalViewerAction.DragItem, new lt.Controls.Medical.TransformItemAction(cell));
                cell.setCommand(MedicalViewerAction.LineProfile, lineProfile);

                cell.setCommand(MedicalViewerAction.Scale, new lt.Controls.Medical.ScaleAction());
                cell.setCommand(MedicalViewerAction.Magnify, new lt.Controls.Medical.MagnifyAction());
                cell.setCommand(MedicalViewerAction.WindowLevel, new lt.Controls.Medical.WindowLevelAction());
                cell.setCommand(MedicalViewerAction.Stack, new lt.Controls.Medical.StackAction());
                cell.setCommand(MedicalViewerAction.AnnRectangle, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.rectangleObjectId));
                cell.setCommand(MedicalViewerAction.AnnEllipse, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.ellipseObjectId));
                cell.setCommand(MedicalViewerAction.AnnPointer, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.pointerObjectId));
                cell.setCommand(MedicalViewerAction.AnnCurve, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.curveObjectId));
                cell.setCommand(MedicalViewerAction.AnnLine, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.lineObjectId));
                cell.setCommand(MedicalViewerAction.AnnText, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.textObjectId));
                cell.setCommand(MedicalViewerAction.AnnHighlight, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.hiliteObjectId));
                cell.setCommand(MedicalViewerAction.AnnRuler, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.rulerObjectId));
                cell.setCommand(MedicalViewerAction.AnnPolyRuler, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.polyRulerObjectId));
                cell.setCommand(MedicalViewerAction.AnnProtractor, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.protractorObjectId));
                cell.setCommand(MedicalViewerAction.AnnSelect, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.selectObjectId));
                cell.setCommand(MedicalViewerAction.AnnFreeHand, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.freehandObjectId));
                cell.setCommand(MedicalViewerAction.AnnPoint, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.pointObjectId))
                cell.setCommand(MedicalViewerAction.AnnPolyline, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.polylineObjectId));
                cell.setCommand(MedicalViewerAction.AnnPolygon, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.polygonObjectId));
                cell.setCommand(MedicalViewerAction.AnnNote, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.noteObjectId));
                cell.setCommand(MedicalViewerAction.AnnTextPointer, new lt.Controls.Medical.AutomationInteractiveAction(lt.Annotations.Engine.AnnObject.textPointerObjectId));

                cell.setCommand(MedicalViewerAction.SpyGlass, spyGlass);

                setupPanoramicAction(cell);

                lineProfileInteractiveMode = cell.getCommandInteractiveMode(MedicalViewerAction.LineProfile);


                cell.add_disposing(onDisposeCell);

            }

            function onDisposeCell(sender, args) {

                var cell: lt.Controls.Medical.Cell = <lt.Controls.Medical.Cell>sender;

                var probeToolInteractiveMode: lt.Controls.Medical.ProbeToolInteractiveMode = <lt.Controls.Medical.ProbeToolInteractiveMode>cell.getCommandInteractiveMode(MedicalViewerAction.ProbeTool);


                if (probeToolInteractiveMode == null)
                    return;

                probeToolInteractiveMode.remove_probeToolUpdated(probeToolUpdated);
                probeToolInteractiveMode.dispose();
            }

            function probeToolUpdated(sender, args) {
                var frame = args.get_target();

                var modality: string = DicomHelper.getDicomTagValue(frame.JSON, DicomTag.Modality);

                if (frame.get_isDataReady() && (modality == 'CT')) {
                    var value = lt.Controls.Medical.ProbeToolInteractiveMode.getHuValue(frame, args.get_position().get_x(), args.get_position().get_y(), -1);

                    args.set_pixelValue("Hu = " + value);
                }
                else {

                    var rgbValue: number[] = lt.Controls.Medical.ProbeToolInteractiveMode.getPixelValue(frame, args.get_position().get_x(), args.get_position().get_y());

                    if (frame.get_isDataReady())
                        args.set_pixelValue("Density = " + rgbValue[0]);
                    else
                        args.set_pixelValue("RGB = " + rgbValue[0] + ", " + rgbValue[1] + ", " + rgbValue[2]);


                }
            }

            function applyImageProcessingOnSpyGlassCanvas(spyGlass, canvas, backCanvas) {

                var _spyGlass = spyGlass;
                var context = canvas.getContext("2d");
                if (backCanvas != null)
                    context.drawImage(backCanvas, 0, 0);

                switch (SpyglassEffect) {
                    case Spyglass.Equalization:
                        {
                            if (stretchIntensityHigh == 0)
                                return;
                            var context = canvas.getContext("2d");
                            var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                            lt.Controls.Medical.ImageProcessing.levelIntensity(imageData, stretchIntensityLow, stretchIntensityHigh);
                            context.putImageData(imageData, 0, 0);
                        }
                        break;
                    case Spyglass.Invert:
                        {
                            var context = canvas.getContext("2d");
                            try {
                                var imageCanvas = canvas;
                                var context1 = imageCanvas.getContext('2d');
                                var imageData = context1.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                                var pixels = imageData.data;
                                var length = pixels.length;
                                for (var i = 0; i < length;) {
                                    pixels[i] = 255 - pixels[i];
                                    pixels[i + 1] = 255 - pixels[i + 1];
                                    pixels[i + 2] = 255 - pixels[i + 2];
                                    i += 4;
                                }
                                context.putImageData(imageData, 0, 0);
                            }
                            finally {
                                pixels = null;
                                imageData = null;
                                context = null;
                            }
                        }
                        break;
                    case Spyglass.CLAHE:
                        {
                            var imageCanvas = canvas;
                            var imageContext = imageCanvas.getContext("2d");
                            var imageData = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                            var ip: lt.ImageProcessing = new lt.ImageProcessing();

                            _spyGlass.set_text("Filter: CLAHE (Loading)");
                            ip.set_jsFilePath(_jsFileCorePath);
                            ip.set_command("CLAHE");
                            ip.get_arguments()["alpha"] = 0.65;
                            ip.get_arguments()["tilesize"] = 6;
                            ip.get_arguments()["tilehistcliplimit"] = 0.08;
                            ip.get_arguments()["binsnumber"] = 128;
                            ip.get_arguments()["flags"] = 0x00001;
                            ip.get_arguments()["useProgress"] = false;

                            ip.set_imageData(imageData);

                            ip.add_completed(function (sender, event) {
                                var spyCanvasContext = null;

                                if (!canvas)
                                    return;

                                if (canvas.width == 1)
                                    return;

                                spyCanvasContext = canvas.getContext("2d");
                                spyCanvasContext.putImageData(event.get_imageData(), 0, 0);
                                sender.abort();
                                if (_spyGlass.get_isWorking()) {
                                    _spyGlass.refresh();
                                    _spyGlass.set_text("Filter: CLAHE");
                                }
                            });

                            ip.run();
                        }
                        break;
                    default:
                        _spyGlass.set_text("");
                        break;
                }
            }

            /*function drawTest(args: lt.Controls.Medical.HistogramGeneratedEventArgs) {
                var testCanvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('testCanvas');

                var context = testCanvas.getContext("2d");
                context.drawImage(args.canvas, 0, 0);

                length = args.lineHistogramPoints.length;
                if (length == 0)
                    return;

                context.beginPath();
                context.strokeStyle = 'black';
                context.moveTo(args.lineHistogramPoints[0].x, args.lineHistogramPoints[0].y);
                var pixel: lt.LeadPointD;
                var index: number = 1;
                for (index = 1; index < length; index++) {
                    pixel = args.lineHistogramPoints[index];
                    context.lineTo(pixel.x, pixel.y);
                }
                context.stroke();


                //context.beginPath();
                //context.strokeStyle = 'black';
                //context.moveTo(0, 0);
                //context.lineTo(500, 500);
                //context.stroke();

            }*/



            function histogramGenerated(sender, args: lt.Controls.Medical.HistogramGeneratedEventArgs) {
                currentLineProfileFrame = args.frame;
                lineProfileHistogram = args.histogram;
                colorType = args.type;

                lineProfileSliderPosition = 0;
                RenderLineProfileHistogram(0, 0, false);
                HistogramUpdated();

                //drawTest(args);
            }

            function spyGlassRequested(spyGlass, args: lt.Controls.Medical.SpyGlassEventArgs) {

                var outputCanvas = args.outputCanvas;
                var inputCanvas = args.inputCanvas;

                outputCanvas.width = inputCanvas.width;
                outputCanvas.height = inputCanvas.height;

                switch (SpyglassEffect) {
                    case Spyglass.Equalization:
                        spyGlass.set_text("Filter: Revealer");
                        break;
                    case Spyglass.Invert:
                        spyGlass.set_text("Filter: Invert");
                        break;
                    case Spyglass.CLAHE:
                        break;
                    default:
                        spyGlass.set_text("");
                        break;
                }

                applyImageProcessingOnSpyGlassCanvas(spyGlass, outputCanvas, inputCanvas);
            }

            function chunkLoaded(spyGlass, args) {
                applyImageProcessingOnSpyGlassCanvas(spyGlass, args.chunk.canvas, args.chunk.canvas);
            }

            function spyGlassPositionChanged(sender, args: lt.Controls.Medical.SpyGlassPositionChangedEventArgs) {

                if (SpyglassEffect != Spyglass.Equalization)
                    return;
                var displayRect = args.get_displayRect();
                var subCell: lt.Controls.Medical.MRTISubCell = args.get_subCell();
                var canvas = args.outputCanvas;
                var inputCanvas = args.inputCanvas;
                var cell = sender.SubCellAttached;


                if (displayRect.get_isEmpty())
                    return;
                if (displayRect.get_width() == 0)
                    return;
                if (displayRect.get_height() == 0)
                    return;

                var imageCanvas = subCell.get_parentCell().get_imageViewer().get_foreCanvas();
                var imageContext = imageCanvas.getContext("2d");
                var imageData = imageContext.getImageData(displayRect.get_left(), displayRect.get_top(), displayRect.get_width(), displayRect.get_height());
                var point = lt.Controls.Medical.ImageProcessing.getHistogramPoint(imageData, 10);
                stretchIntensityLow = point.x;
                stretchIntensityHigh = point.y;

                var context;

                var frame: lt.Controls.Medical.Frame = subCell.attachedFrame;
                applyImageProcessingOnSpyGlassCanvas(sender, canvas, inputCanvas);


                var chunkList = args.chunkList;
                var index = 0;
                var chunkData: lt.Controls.Medical.ChunkData;
                for (index = 0; index < chunkList.length; index++) {
                    chunkData = chunkList[index];
                    context = chunkData.canvas.getContext("2d");
                    context.drawImage(chunkData.backCanvas, 0, 0);
                    imageData = context.getImageData(0, 0, chunkData.rect.width, chunkData.rect.height);
                    lt.Controls.Medical.ImageProcessing.levelIntensity(imageData, stretchIntensityLow, stretchIntensityHigh);
                    context.putImageData(imageData, 0, 0);
                }

            }



            function createPanZoomInteractiveMode() {
                var zoomToInteractiveMode: lt.Controls.ImageViewerPanZoomInteractiveMode = new lt.Controls.ImageViewerPanZoomInteractiveMode();

                zoomToInteractiveMode.set_idleCursor("default");
                zoomToInteractiveMode.set_workingCursor("crosshair");
                zoomToInteractiveMode.set_enablePan(false);
                zoomToInteractiveMode.set_enableZoom(true);
                zoomToInteractiveMode.set_enablePinchZoom(false);
                //zoomToInteractiveMode.set_workOnImageRectangle(false);
                //zoomToInteractiveMode.add_workStarted(Zoom_Started);
                //zoomToInteractiveMode.add_workCompleted(Zoom_Completed);
                zoomToInteractiveMode.set_zoomKeyModifier(lt.Controls.Keys.none);
                zoomToInteractiveMode.set_mouseButtons(lt.Controls.MouseButtons.right);

                return zoomToInteractiveMode;
            }
        }
    };
}]);






directives.directive('bottomToolbar', ['$modal', '$translate', function ($modal, $translate): ng.IDirective {
    return {
        replace: true,
        restrict: "E",
        scope: {
            api: '=',
            study: '='
        },
        template: '<div></div>',
        link: function (scope: any, elem: ng.IAugmentedJQuery) {
            scope.api = scope.api || {};

            $translate('ServiceRequestInfor').then(function (translation) {
                var serviceInfoButton: ng.IAugmentedJQuery =
                    angular.element('<button class="btn-sm btn-primary">' + translation + '</button>');

                serviceInfoButton.bind('click', function () {
                    alert("service request: " + scope.study);
                });
                elem.append(serviceInfoButton);
            });
            $translate('Conclusion').then(function (translation) {
                var conclusionButton: ng.IAugmentedJQuery =
                    angular.element('<button class="btn-sm btn-primary">' + translation + '</button>');
                conclusionButton.bind('click', function () {
                    var modalInstance = $modal.open({
                        templateUrl: 'views/dialogs/Conclusion.html',
                        controller: Controllers.ConclusionController,
                        backdrop: 'static'
                    });
                });
                elem.append(conclusionButton);
            });

            $translate('ZoomMetting').then(function (translation) {
                var zoomMeetingButton: ng.IAugmentedJQuery =
                    angular.element('<button class="btn-sm btn-primary">' + translation + '</button>');

                zoomMeetingButton.bind('click', function () {
                    alert("zoom: " + scope.study);
                });
                elem.append(zoomMeetingButton);
            });

           
        }
    }
}]);








//function fixCurves() {
//    if (point[0] == 0) start = point[1];
//    if (point[0] == 1) end = point[1];
//    var points = filter[curves.name];
//    var foundStart = false;
//    var foundEnd = false;
//    for (var i = 0; i < points.length; i++) {
//        var p = points[i];
//        if (p[0] == 0) {
//            foundStart = true;
//            if (point[0] == 0 && p != point) points.splice(i--, 1);
//        } else if (p[0] == 1) {
//            foundEnd = true;
//            if (point[0] == 1 && p != point) points.splice(i--, 1);
//        }
//    }
//    if (!foundStart) points.push([0, start]);
//    if (!foundEnd) points.push([1, end]);
//};


//var a = {
//0: (2) [0, 0]
//1: (2) [0.275, 0.629921875]
//2: (2) [0.725, 0.504921875]
//3: (2) [1, 1]
//}

//function q(a, d, c) {
//    return Math.max(a, Math.min(d, c))
//}

//function splineInterpolate(a) {
//    a = new z(a);
//    for (var d = [], c = 0; 256 > c; c++)
//        d.push(q(0, Math.floor(256 * a.interpolate(c / 255)), 255));
//    return d
//}


//function z(a) {
//    var d = a.length;
//    this.xa = [];
//    this.ya = [];
//    this.u = [];
//    this.y2 = [];
//    a.sort(function (a, b) {
//        return a[0] - b[0]
//    });
//    for (var c = 0; c < d; c++)
//        this.xa.push(a[c][0]),
//            this.ya.push(a[c][1]);
//    this.u[0] = 0;
//    this.y2[0] = 0;
//    for (c = 1; c < d - 1; ++c) {
//        a = this.xa[c + 1] - this.xa[c - 1];
//        var e = (this.xa[c] - this.xa[c - 1]) / a
//            , g = e * this.y2[c - 1] + 2;
//        this.y2[c] = (e - 1) / g;
//        this.u[c] = (6 * ((this.ya[c + 1] - this.ya[c]) / (this.xa[c + 1] - this.xa[c]) - (this.ya[c] - this.ya[c - 1]) / (this.xa[c] - this.xa[c - 1])) / a - e * this.u[c - 1]) / g
//    }
//    this.y2[d - 1] = 0;
//    for (c = d - 2; 0 <= c; --c)
//        this.y2[c] = this.y2[c] * this.y2[c + 1] + this.u[c]
//}

//z.prototype.interpolate = function (a) {
//    for (var d = 0, c = this.ya.length - 1; 1 < c - d;) {
//        var e = c + d >> 1;
//        this.xa[e] > a ? c = e : d = e
//    }
//    var e = this.xa[c] - this.xa[d]
//        , g = (this.xa[c] - a) / e;
//    a = (a - this.xa[d]) / e;
//    return g * this.ya[d] + a * this.ya[c] + ((g * g * g - g) * this.y2[d] + (a * a * a - a) * this.y2[c]) * e * e / 6
//}
