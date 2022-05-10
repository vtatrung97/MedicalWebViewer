/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/LEADTOOLS/jquery/jquery.d.ts" />
/// <reference path="../../lib/angular/angular.d.ts" />
/// <reference path="../../lib/angular/angular-route.d.ts" />

module ExportImagesSource {
    export var AllPatientImages: string = "AllPatientImages";
    export var LoadedSeries: string = "LoadedSeries";
    export var CurrentSeries: string = "CurrentSeries";
    export var SelectedImages: string = "SelectedImages";
    export var PrintCurrentView: string = "PrintCurrentView";
    export var Layout: string = "Layout";
}

module PrintImagesSource {
   export var AllPatientImages: string = "AllPatientImages";
   export var LoadedSeries: string = "LoadedSeries";
   export var CurrentSeries: string = "CurrentSeries";
   export var SelectedImages: string = "SelectedImages";
   export var PrintCurrentView: string = "PrintCurrentView";
   export var Layout: string = "Layout";
}

class ExportManagerService {

    private _exportService: ExportService;
    private _printService: PrintService;
    private _seriesManagerService: SeriesManagerService;
    private _objectRetrieveService: ObjectRetrieveService;
    private _objectStoreService: ObjectStoreService;
    private _tabService: TabService;
    private $q: ng.IQService;

   static $inject = ['$q', 'exportService', 'printService', 'seriesManagerService', 'tabService', 'objectRetrieveService', 'objectStoreService', 'seriesManagerService'];
   constructor($q: ng.IQService, exportService: ExportService, printService: PrintService, seriesManagerService: SeriesManagerService, tabService: TabService, objectRetrieveService: ObjectRetrieveService, objectStoreService: ObjectStoreService) {
        this._exportService = exportService;
        this._printService = printService;
        this._seriesManagerService = seriesManagerService;
        this._objectRetrieveService = objectRetrieveService;
        this._objectStoreService = objectStoreService;
        this.$q = $q;
        this._tabService = tabService;
    }

    public Export(exportOptions: Models.ExportOptions, source: string, seriesInstanceUID?: string, sopInstanceUIDs?: any[]): ng.IHttpPromise<any> {


        if (source == ExportImagesSource.PrintCurrentView) {
            var viewer: lt.Controls.Medical.MedicalViewer = this._tabService.getActiveViewer();
            var element: HTMLElement = document.getElementById(viewer.divId);
            html2canvas(element.parentElement, { onrendered: function (canvas) { OpenPrintViewUrl(canvas.toDataURL()); } });
            var deferred: any = this.$q.defer();
            deferred.resolve();
            return deferred.promise;
        }



        if (exportOptions.FileFormat == 'PDF')
            return this.Print(exportOptions, source, seriesInstanceUID, sopInstanceUIDs);
        switch (source) {
            case ExportImagesSource.AllPatientImages:
                var cellFrame = this._seriesManagerService.get_activeCellFrame();
                var patientId = DicomHelper.getDicomTagValue(cellFrame.metadata, DicomTag.PatientID);
                return this._exportService.ExportAllSeries(patientId, exportOptions);

            case ExportImagesSource.Layout:
                return this.Print(exportOptions, source, seriesInstanceUID);

            case ExportImagesSource.SelectedImages:
                var cellFrame = this._seriesManagerService.get_activeCellFrame();
                return this._exportService.ExportInstances(sopInstanceUIDs ? sopInstanceUIDs : [cellFrame.Instance.SOPInstanceUID], exportOptions);


            default:
                var seriesInstanceUID = this._seriesManagerService.get_activeCell().get_seriesInstanceUID();
                return this._exportService.ExportSeries([seriesInstanceUID], exportOptions);
        }
   } 

    public Print(exportOptions: Models.ExportOptions, source: string, seriesInstanceUID? : string, sopInstanceUIDs? : string[]): ng.IHttpPromise<any> {

        var printOptions: Models.PrintOptions = new Models.PrintOptions();

        printOptions.BurnAnnotations = exportOptions.BurnAnnotations;
        printOptions.IncludeOverflowImages = exportOptions.IncludeOverflowImages;
        printOptions.LayoutImageWidth = exportOptions.LayoutImageWidth;
        printOptions.WhiteBackground = exportOptions.WhiteBackground;
        printOptions.PatientInfo = exportOptions.PatientInfo;
        printOptions.ReduceGrayscaleTo8BitsSelected = exportOptions.ReduceGrayscaleTo8BitsSelected;
        printOptions.AnnotationsFileName = (<any>exportOptions).AnnotationsFileName;
        printOptions.BackgroundColor = exportOptions.BackgroundColor;
        printOptions.TextBackgroundColor = exportOptions.TextBackgroundColor;
        printOptions.TextColor = exportOptions.TextColor;
        printOptions.BurnDisplayedAnnotations = exportOptions.BurnDisplayedAnnotations;


        try {
            if (source === PrintImagesSource.AllPatientImages) {
                var cellFrame = this._seriesManagerService.get_activeCellFrame();
                var patientId = DicomHelper.getDicomTagValue(cellFrame.metadata, DicomTag.PatientID);
                return this._printService.PrintAllSeries(patientId, printOptions);
            }
            else if (source === PrintImagesSource.Layout) {
                var layout: Models.Layout = new Models.Layout();
                var cell: lt.Controls.Medical.Cell = this._seriesManagerService.get_activeCell();
                if (cell == null)
                    return;
                var viewer = cell.viewer;
                var viewerElement: HTMLElement = document.getElementById(cell.viewer.divId);


                printOptions.PageWidth = viewerElement.clientWidth;
                printOptions.PageHeight = viewerElement.clientHeight;

                var length: number = viewer.layout.items.count;

                var box: Models.ImageBox;
                var subItemLength;
                var subItemIndex = 0;

                for (var index = 0; index < length; index++) {
                    var item: lt.Controls.Medical.Cell = viewer.layout.items.get_item(index);
                    if (item == null)
                        continue;

                    if (!item.visibility)
                        continue;

                    if ((item.imageViewer == null) || (item.imageViewer.items.count == 0)) {
                        var bounds = item.bounds;
                        var sop: string = "";

                        layout.Boxes.push(new Models.ImageBox(sop, bounds.x, bounds.y, bounds.width + bounds.x, bounds.height + bounds.y));
                    }
                    else {
                        subItemIndex = 0;
                        subItemLength = item.imageViewer.items.count;
                        var subItem: lt.Controls.Medical.SubCell;
                        var itemBounds = item.bounds;

                        if (itemBounds == null)
                            continue;

                        for (subItemIndex = 0; subItemIndex < subItemLength; subItemIndex++) {

                            subItem = <lt.Controls.Medical.SubCell>item.imageViewer.items.get_item(subItemIndex);
                            if (subItem == null)
                                continue;
                            if (subItem.bounds == null)
                                continue;




                            var bounds: lt.LeadRectD = lt.LeadRectD.create(subItem.bounds.left * item.bounds.width, subItem.bounds.top * item.bounds.height, subItem.bounds.width * item.bounds.width, subItem.bounds.height * item.bounds.height);

                            bounds.offset(item.bounds.left, item.bounds.top);
                            var frame: any = null;


                            frame = subItem.attachedFrame;

                            var sop: string = "";


                            if (frame != null) {

                                if (!frame.Instance)
                                    continue;

                                sop = frame.Instance.SOPInstanceUID.toString();
                            }

                            box = new Models.ImageBox(sop, bounds.x, bounds.y, bounds.width + bounds.x, bounds.height + bounds.y);

                            if (frame != null) {
                                box.WindowWidth = frame.windowWidth;
                                box.WindowCenter = frame.windowCenter;
                                var photometricInverted = (frame.photometricInterpretation == "MONOCHROME1") ? 1 : 0;
                                box.Inverted = (<any>frame.inverted ^ photometricInverted) ? true : false;
                            }


                            var viewRect: lt.LeadRectD = subItem.imageViewer.getItemViewBounds(subItem, lt.Controls.ImageViewerItemPart.view, false);
                            var paintRect = subItem.imageViewer.getItemViewBounds(subItem, lt.Controls.ImageViewerItemPart.image, false);
                            box.PaintRect = lt.LeadRectD.create(paintRect.left / viewRect.width, paintRect.top / viewRect.height, paintRect.width / viewRect.width, paintRect.height / viewRect.height);


                            layout.Boxes.push(box);
                        }
                    }
                }

                if (!seriesInstanceUID)
                    seriesInstanceUID = this._seriesManagerService.get_activeCell().get_seriesInstanceUID();

                return this._printService.PrintLayout(seriesInstanceUID, layout, printOptions);
            }
            else if (source === PrintImagesSource.SelectedImages) {
                var cellFrame = this._seriesManagerService.get_activeCellFrame();
                return this._printService.PrintInstances(sopInstanceUIDs ? sopInstanceUIDs : [cellFrame.Instance.SOPInstanceUID], printOptions);
            }
            else {
                var seriesInstanceUID = this._seriesManagerService.get_activeCell().get_seriesInstanceUID();
                return this._printService.PrintSeries([seriesInstanceUID], printOptions);
            }
        }
        catch (e) {
            throw e;
        }
    }
   
   public UploadAnnotations(burnAnnotations: boolean): ng.IPromise<any> {
      try {
         var deferred: ng.IDeferred<{}> = this.$q.defer();

         if (!burnAnnotations) {
            deferred.resolve();
            return deferred.promise;
         }

         var cell = this._seriesManagerService.get_activeCell();
         if (cell) {
            var seriesInstanceUID: string = cell.get_seriesInstanceUID();
             var annotationsData: string = this._seriesManagerService.get_cellAnnotations(cell, false);
            var description: string = "_printing";

            return this._objectStoreService.StoreAnnotations(seriesInstanceUID, annotationsData, description);
         }
         else {
            deferred.resolve();
            return deferred.promise;
         }
      }
      catch (e) {
         throw e;
      }
   }

   public buildIpArray(cellFrame: lt.Controls.Medical.Frame): Array<any> {
       var ipArray: Array<any> = new Array<any>();
       var ipItems: Array<lt.ImageProcessing> = cellFrame.imageProcessingList.toArray();
       var foundItems: Array<lt.ImageProcessing>;       

       foundItems = $.grep(ipItems, function (item) { return item.command == "UnsharpMask" || item.command == "Perio" || item.command == "Dentin" || item.command == "Endo" });
       if (foundItems.length > 0) {
           for (var i = 0; i < foundItems.length; i++) {
               var ip: lt.ImageProcessing = foundItems[0];

               if (ip.arguments["MultiscaleEnhancement"]) {
                   ipArray.push({
                       Name: "MultiscaleEnhancement", Parameters: ip.arguments["MultiscaleEnhancement"].replace(/=/g, "")
                   });
               }

               if (ip.arguments["GammaCorrect"]) {
                   ipArray.push({
                       Name: "GammaCorrect", Parameters: ip.arguments["GammaCorrect"].replace(/=/g, "")
                   });
               }

               if (ip.arguments["UnsharpMask"]) {
                   ipArray.push({
                       Name: "UnsharpMask", Parameters: ip.arguments["UnsharpMask"]
                   });
               }
           }
       }

       foundItems = $.grep(ipItems, function (item) { return item.command == "ContrastBrightnessIntensity" });
       if (foundItems.length > 0) {
           for (var i = 0; i < foundItems.length; i++) {
               var ip: lt.ImageProcessing = foundItems[0];

               ipArray.push({
                   Name: "BrightnessContrast",
                   Parameters: ip.arguments["brightness"] + "," + ip.arguments["contrast"]
               });
           }
       }

       foundItems = $.grep(ipItems, function (item) { return item.command == "ChangeHueSaturationIntensity" });
       if (foundItems.length > 0) {
           for (var i = 0; i < foundItems.length; i++) {
               var ip: lt.ImageProcessing = foundItems[0];

               ipArray.push({
                   Name: "HSL",
                   Parameters: ip.arguments["hue"] + "," + ip.arguments["saturation"] + "," + ip.arguments["intensity"]
               });
           }
       }      

       foundItems = $.grep(ipItems, function (item) { return item.command == "StretchHistogram" });
       if (foundItems.length > 0) {
           ipArray.push({ Name: "StretchHistogram", Parameters: "" });
       }

       if (cellFrame.flipped) {
           ipArray.push({ Name: "Flip", Parameters: "" });
       }

       if (cellFrame.reversed) {
           ipArray.push({ Name: "Flip", Parameters: "true" });
       }

       if (cellFrame.rotateAngle != 0) {
           ipArray.push({ Name: "Rotate", Parameters: cellFrame.rotateAngle.toString() });
       }

       if (cellFrame.mrtiInfo.supportWindowLevel) {
           var photoMetric = cellFrame.information.photometricInterpretation;
           var inverted = (cellFrame.information.photometricInterpretation == "MONOCHROME1");

           ipArray.push({
               Name: "WindowLevel", Parameters: cellFrame.wlRenderer.windowLevelWidth.toString() + "," +
               cellFrame.wlRenderer.windowLevelCenter.toString() + "," +
               inverted
           });
       }
       else {
           if (cellFrame.inverted) {
               ipArray.push({ Name: "Invert", Parameters: "" });
           }
       }      

       return ipArray;
   }

    public PopupCapture() {
        var cell = this._seriesManagerService.get_activeCell();

        if (cell instanceof lt.Controls.Medical.Cell3D) {

            var cell3D: lt.Controls.Medical.Cell3D = <lt.Controls.Medical.Cell3D>cell;

            var tab = window.open("", "_blank");

            tab.location.href = cell3D.image.src + ".jpg";

            return;
        }

        if (cell instanceof lt.Controls.Medical.PanoramicCell) {

            var cellPano: lt.Controls.Medical.PanoramicCell = <lt.Controls.Medical.PanoramicCell>cell;
            var frame: lt.Controls.Medical.Frame;

            frame = cellPano.frames.get_item(0);
            OpenPrintViewUrl(frame.lowResImage.canvas.toDataURL());

            return;
        }


        var cellFrame = this._seriesManagerService.get_activeCellFrame();
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
        var ipArray: Array<any> = this.buildIpArray(cellFrame);   

        if (cellFrame == null) {
            return;
        }

        loader = this._seriesManagerService.get_seriesLoaderById(cell);        
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
            this._objectRetrieveService.UploadAnnotations(annotationsData)
                .then(function (result) {
                    var data: string = result.data.replace(/"/g, "");

                    var xDpi = 254;
                    var yDpi = 254;
                    
                    if (cellFrame.columnSpacing > 0)
                        xDpi = 25.4 / cellFrame.columnSpacing;
                    if (cellFrame.rowSpacing > 0)
                        yDpi = 25.4 / cellFrame.rowSpacing;

                    var downloadImageUrl = __this._objectRetrieveService.DownloadImageUrl(cellFrame, data.replace('\"', ''), 0, 0, xDpi, yDpi, JSON.stringify(ipArray))

                    if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.mobile) {
                        newTab.location.href = downloadImageUrl;
                        newTab.focus();
                    } else {
                        window.location.href = downloadImageUrl;
                    }
                }, function (error) {
                });
        }
        else {
            var downloadImageUrl = __this._objectRetrieveService.DownloadImageUrl(cellFrame, null, 0, 0, 150, 150, JSON.stringify(ipArray));

            if (lt.LTHelper.OS == lt.LTOS.iOS && lt.LTHelper.device != lt.LTDevice.mobile) {
                newTab.location.href = downloadImageUrl;
                newTab.focus();
            }
            else {
                window.location.href = downloadImageUrl;
            }
        }
    }
}

services.service('exportManagerService', ExportManagerService);