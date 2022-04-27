/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IExportControllerScope extends ng.IScope {        
        exportOptions: Models.ExportOptions;
        exportFormats: Array<Models.ExportImageFormat>;
        exportSources: Array<ExportSource>;
        source: any;

        ok();
        isDICOM();
        isPDF();
        GetExtention();
        passwordRequired();
        cancel();
        passwordValid(): boolean;     
        saveAndExport();
    }

    export class ExportSource {
        public value:string;
        public displayName:string;
        public selectable: boolean; 

        public constructor(value: string, displayName: string) {
            this.value = value;
            this.displayName = displayName;
            this.selectable = true;
        }
    }

    declare var html2canvas;

    export class ExportController {
        static $inject = ['$scope', '$modal', 'optionsService', '$modalInstance','hasLayout'];

        private _overlayManagerService: OverlayManagerService;


        private getExportSourceItem($scope, value) {
            var index = 0;
            var length = $scope.exportSources.length;

            if (length == 0)
                return;

            for (index = 0; index < length; index++) {
                if ($scope.exportSources[index].value == value)
                    return $scope.exportSources[index];
            }

            return $scope.exportSources[0];
        }

        private getExportFormatItem($scope, value) {
            var index = 0;
            var length = $scope.exportFormats.length;

            if (length == 0)
                return;

            for (index = 0; index < length; index++) {
                if ($scope.exportFormats[index].Format == value)
                    return $scope.exportFormats[index];
            }


            return $scope.exportFormats[0];
        }



        constructor($scope: IExportControllerScope, $modal, optionsService:OptionsService, $modalInstance, hasLayout:boolean) {
            $scope.exportFormats = new Array<Models.ExportImageFormat>(); 
            $scope.exportFormats.push(new Models.ExportImageFormat("BMP", "Bmp", true, false));
            $scope.exportFormats.push(new Models.ExportImageFormat("JPG", "Jpeg", true, false, true));
            $scope.exportFormats.push(new Models.ExportImageFormat("JPG Lossless", "JpegLossy", true, true));
            $scope.exportFormats.push(new Models.ExportImageFormat("PNG", "Png", true, false));
            $scope.exportFormats.push(new Models.ExportImageFormat("TIF", "Tif", true, true));
            $scope.exportFormats.push(new Models.ExportImageFormat("CMP", "Cmp", true, false, true));
            $scope.exportFormats.push(new Models.ExportImageFormat("PDF", "PDF", false, false, false, true, true));
            $scope.exportFormats.push(new Models.ExportImageFormat("DICOM", "DicomGray", false, true));

           

            $scope.exportOptions = new Models.ExportOptions();
            $scope.source = {};

            $scope.exportSources = new Array<ExportSource>();            
            $scope.exportSources.push(new ExportSource("PrintCurrentView", "Screenshot Current View"));                          
            $scope.exportSources.push(new ExportSource("AllPatientImages", "All Patient Images"));                          
            $scope.exportSources.push(new ExportSource("CurrentSeries", "Current Series"));                          
            // selected images only work when you have a layout attached with the series.
            if (hasLayout) {
                $scope.exportSources.push(new ExportSource("SelectedImages", "Selected Images"));
            }


            // set export source.
            var value = window.localStorage.getItem("Export.ExportSource");
            if (value)
                $scope.source.exportType = this.getExportSourceItem($scope, value);
            else
                $scope.source.exportType = $scope.exportSources[0]; 

            // set export format.
            value = window.localStorage.getItem("Export.ExportFormats");
            if (value)
                $scope.source.selectedFormat = this.getExportFormatItem($scope, value);
            else
                $scope.source.selectedFormat = $scope.exportFormats[3];

            // set burn annotation.
            value = window.localStorage.getItem("Export.BurnAnnotations");
            if (value)
                $scope.exportOptions.BurnAnnotations = (value == "true" ? true : false);

            
            value = window.localStorage.getItem("Export.WhiteBackground");
            if (value)
                $scope.exportOptions.WhiteBackground = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.PatientInfo");
            if (value)
                $scope.exportOptions.PatientInfo = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.CreateDICOMDIR");
            if (value)
                $scope.exportOptions.CreateDICOMDIR = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.ImageCompression");
            if (value)
                $scope.exportOptions.ImageCompression = parseInt(value);

            value = window.localStorage.getItem("Export.Anonymize");
            if (value)
                $scope.exportOptions.Anonymize = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.IncludeViewer");
            if (value)
                $scope.exportOptions.IncludeViewer = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.BurnDisplayedAnnotations");
            if (value)
                $scope.exportOptions.BurnDisplayedAnnotations = (value == "true" ? true : false);

            value = window.localStorage.getItem("Export.ZipType");
            if (value)
                $scope.exportOptions.ZipType = value;
            else
                $scope.exportOptions.ZipType = 'dcz';



            $scope.passwordValid = function () { 
                return $scope.exportOptions.DczPassword && $scope.exportOptions.DczPassword.trim().length > 0;          
            }

            $scope.passwordRequired = function () {
                return $scope.isDICOM() && ($scope.exportOptions.ZipType == "dcz");
            }


            $scope.isDICOM = function () {
                return $scope.source.exportType.value != 'PrintCurrentView' && ($scope.source.selectedFormat.Format == "DicomGray");
            }


            $scope.isPDF = function () {
                return ($scope.source.selectedFormat.Format == 'PDF') && ($scope.source.exportType.value != 'PrintCurrentView');
            }


            $scope.GetExtention = function ()
            {
                var format: string = $scope.source.selectedFormat.Format;

                var extention = ".zip";

                if (format.toLowerCase() == "pdf")
                    extention = ".pdf";

                if (format.toLowerCase() == "pdf")
                    extention = ".pdf";

                if ($scope.exportOptions.DczPassword.trim())
                    extention = ".dcz";

                return extention;
            }

            $scope.ok = function () {

                if ((!$scope.passwordValid()) && $scope.passwordRequired()) {
                    alert('Password is required');
                    $scope.exportOptions.DczPassword = "";
                    return;
                }


                var ananomize = $scope.exportOptions.Anonymize;
                var displayWarningAgain = !(window.localStorage.getItem("Export.DontAskAgain") == "true" ? true : false);

                if (ananomize && displayWarningAgain) {
                    var modalInstance = $modal.open({
                        templateUrl: 'views/dialogs/Warning.html',
                        controller: Controllers.WarningController,
                        backdrop: 'static'
                    });
                    modalInstance.result.then(function () {
                        $scope.saveAndExport();
                    });
                }
                else
                    $scope.saveAndExport();
            }

            $scope.saveAndExport = function () {

                window.localStorage.setItem("Export.ExportSource", $scope.source.exportType.value);
                window.localStorage.setItem("Export.ExportFormats", $scope.source.selectedFormat.Format);
                window.localStorage.setItem("Export.BurnAnnotations", $scope.exportOptions.BurnAnnotations.toString());
                window.localStorage.setItem("Export.BurnDisplayedAnnotations", $scope.exportOptions.BurnDisplayedAnnotations.toString());
                window.localStorage.setItem("Export.WhiteBackground", $scope.exportOptions.WhiteBackground.toString());
                window.localStorage.setItem("Export.PatientInfo", $scope.exportOptions.PatientInfo.toString());
                window.localStorage.setItem("Export.CreateDICOMDIR", $scope.exportOptions.CreateDICOMDIR.toString());
                window.localStorage.setItem("Export.ImageCompression", $scope.exportOptions.ImageCompression.toString());
                window.localStorage.setItem("Export.Anonymize", $scope.exportOptions.Anonymize.toString());
                window.localStorage.setItem("Export.IncludeViewer", $scope.exportOptions.IncludeViewer.toString());
                window.localStorage.setItem("Export.ZipType", $scope.exportOptions.ZipType.toString());

                if ($scope.exportOptions.ZipType != 'dcz')
                    $scope.exportOptions.DczPassword = "";

                $scope.exportOptions.Ext = $scope.GetExtention();

                $scope.exportOptions.FileFormat = $scope.source.selectedFormat.Format == "JpegLossy" ? "Jpg Lossless" : $scope.source.selectedFormat.Format;
                $scope.exportOptions.LayoutImageWidth = 0;
                $modalInstance.close({ options: $scope.exportOptions, source: $scope.source.exportType.value });
            }


            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };            
        }       
    }
}