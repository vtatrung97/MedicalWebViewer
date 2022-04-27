/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IGlobalOptionsControllerScope extends ng.IScope {
        items: Array<PropertyGridItem>;
        onPropertyChanged(name: string, value: any);
        hasChanges(): boolean;
        close();
        save();
        keyDown: Function;
    }

    export class GlobalOptionsController {
        static $inject = ['$q', '$scope', '$modalInstance', 'dialogs', '$translate', 'optionsService']; 

        private _changes = {}; 
        private _optionsSuccessMsg: string;
        private _notificationTitle: string;   
        private _saved = false;   

        constructor($q, $scope: IGlobalOptionsControllerScope, $modalInstance, dialogs, $translate, optionsService:OptionsService) {
            var __this = this;

            $scope.items = new Array<PropertyGridItem>();
            
            addProperty("Behavior", "num", "", "", "", optionsService.get(OptionNames.DefaultSeriesRowCount), "DefaultSeriesRowCount");
            addProperty("Behavior", "num", "", "", "", optionsService.get(OptionNames.DefaultSeriesColumnCount), "DefaultSeriesColumnCount");
            addProperty("Behavior", "cdrop", "", "Series View|Study View", "", optionsService.get(OptionNames.ViewerMode), "ViewerMode");
            addProperty("Behavior", "cdrop", "", "true|false", "", optionsService.get(OptionNames.SinglePatientMode), "SinglePatientMode");
            addProperty("Behavior", "cdrop", "", "true|false", "", optionsService.get(OptionNames.SingleSeriesMode), "SingleSeriesMode");            
            addProperty("Behavior", "cdrop", "", "true|false", "", optionsService.get(OptionNames.ShowFrameBorder), "ShowFrameBorder");
            addProperty("Behavior", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnablePatientRestriction), "EnablePatientRestriction");

            addProperty("Thumbnails", "cdrop", "", "true|false", "", optionsService.get(OptionNames.ShowSearchThumbnails), "ShowSearchThumbnails");
            addProperty("Thumbnails", "num", "", "", "", optionsService.get(OptionNames.SeriesThumbnailWidth), "SeriesThumbnailWidth");
            addProperty("Thumbnails", "num", "", "", "", optionsService.get(OptionNames.SeriesThumbnailHeight), "SeriesThumbnailHeight");
            
            addProperty("Color", "color", "", "", "", optionsService.get(OptionNames.EmptyCellBackgroundColor), "EmptyCellBackgroundColor");
            addProperty("Color", "color", "", "", "", optionsService.get(OptionNames.SelectedBorderColor), "SelectedBorderColor");
            addProperty("Color", "color", "", "", "", optionsService.get(OptionNames.BackgroundColor), "BackgroundColor");

            addProperty("Autocomplete", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnablePatientIdAutoComplete), "EnablePatientIdAutoComplete");
            addProperty("Autocomplete", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnablePatientNameAutoComplete), "EnablePatientNameAutoComplete");
            
            addProperty("Derived Series", "input", "", "", "", optionsService.get(OptionNames.Derived3DSeriesDescriptionText), "Derived 3dSeriesDescriptionText");
            addProperty("Derived Series", "input", "", "", "", optionsService.get(OptionNames.DerivedSeriesDescriptionText), "DerivedSeriesDescriptionText");
            addProperty("Derived Series", "input", "", "", "", optionsService.get(OptionNames.DerivedPanoramicSeriesDescriptionText), "DerivedPanoramicSeriesDescriptionText");
            addProperty("Derived Series", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableSeriesNumberEdit), "EnableSeriesNumberEdit");
            addProperty("Derived Series", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableProtocolNameEdit), "EnableProtocolNameEdit");

            addProperty("Audit Log", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableAuditLog), "EnableAuditLog");
            addProperty("Audit Log", "cdrop", "", "true|false", "", optionsService.get(OptionNames.LogUserActivity), "LogUserActivity");
            addProperty("Audit Log", "cdrop", "", "true|false", "", optionsService.get(OptionNames.LogUserSecurity), "LogUserSecurity");
            addProperty("Audit Log", "cdrop", "", "true|false", "", optionsService.get(OptionNames.LogSettingChanges), "LogSettingChanges");
            addProperty("Audit Log", "cdrop", "", "true|false", "", optionsService.get(OptionNames.LogSecuritySettingChanges), "LogSecuritySettingChanges");
           
            addProperty("Annotations", "color", "", "", "", optionsService.get(OptionNames.AnnotationStrokeColor), "AnnotationStrokeColor");
            addProperty("Annotations", "color", "", "", "", optionsService.get(OptionNames.AnnotationTextColor), "AnnotationTextColor");
            addProperty("Annotations", "color", "", "", "", optionsService.get(OptionNames.AnnotationHiliteColor), "AnnotationHiliteColor");
            addProperty("Annotations", "cdrop", "", "true|false", "", optionsService.get(OptionNames.CalibrateUsingDpi), "CalibrateUsingDpi");

            addProperty("Timeout", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableIdleTimeout), "EnableIdleTimeout");
            addProperty("Timeout", "num", "", "", "", optionsService.get(OptionNames.IdleTimeout), "IdleTimeout");
            addProperty("Timeout", "num", "", "", "", optionsService.get(OptionNames.IdleWarningDuration), "IdleWarningDuration");

            addProperty("Query Results", "num", "", "", "", optionsService.get(OptionNames.MaxStudyResults), "MaxStudyResults");
            addProperty("Query Results", "num", "", "", "", optionsService.get(OptionNames.MaxSeriesResults), "MaxSeriesResults");
            addProperty("Query Results", "cdrop", "", "true|false", "", optionsService.get(OptionNames.SearchOtherPatientIds), "SearchOtherPatientIds");
            addProperty("Query Results", "cdrop", "", "true|false", "", optionsService.get(OptionNames.SearchStructuredDisplay), "SearchStructuredDisplay");

            addProperty("Template Editor", "color", "", "", "", optionsService.get(OptionNames.TemplateBackgroundColor), "TemplateBackgroundColor");
            addProperty("Template Editor", "color", "", "", "", optionsService.get(OptionNames.TemplateForeColor), "TemplateForeColor");
            addProperty("Template Editor", "color", "", "", "", optionsService.get(OptionNames.TemplateBorderColor), "TemplateBorderColor");
            addProperty("Template Editor", "num", "", "", "", optionsService.get(OptionNames.TemplateBorderSize), "TemplateBorderSize");
            addProperty("Template Editor", "cdrop", "", "true|false", "", optionsService.get(OptionNames.TemplateBoundsNotification), "TemplateBoundsNotification");
            addProperty("Template Editor", "input", "", "", "", optionsService.get(OptionNames.DefaultScript), "DefaultScript");


            // Remove this option for now because it conflicts with loading a structured display
            // if (!optionsService.isSeriesView()) {
            //     addProperty("Hanging Protocol", "cdrop", "", "true|false", "", optionsService.get(OptionNames.AutoLoadHangingProtocol), "AutoLoadHangingProtocol");
            // }

            //Remove this option for now
            addProperty("Lazy Loading", "num", "", "", "", optionsService.get(OptionNames.LazyLoadingThreshold), "LazyLoadingThreshold");
            addProperty("Lazy Loading", "num", "", "", "", optionsService.get(OptionNames.LazyLoadingMobileThreshold), "LazyLoadingMobileThreshold");
            addProperty("Lazy Loading", "num", "", "", "", optionsService.get(OptionNames.LazyLoadingBuffer), "LazyLoadingBuffer");            

            if (VersionNumber.viewerType != "Medicore")
                addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.ShowPacsQuery), "ShowPacsQuery");

            addProperty("Miscellaneous", "input", "", "", "", optionsService.get(OptionNames.DateFormat), "DateFormat");
            addProperty("Miscellaneous", "input", "", "", "", optionsService.get(OptionNames.TimeFormat), "TimeFormat");
            addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.HideOverlays), "HideOverlays");
            addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.HideCustomLayouts), "HideCustomLayouts");

            addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.ShowStudyTimeLine), "ShowStudyTimeLine");
            addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.LinkImages), "LinkImages");
            //addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.SplitSeries), "SplitSeries");
            addProperty("Miscellaneous", "cdrop", "", "true|false", "", optionsService.get(OptionNames.StackSingleFrames), "StackSingleFrames");
            addProperty("Miscellaneous", "num", "", "", "", optionsService.get(OptionNames.BackgroundSize), "BackgroundSize");
            addProperty("Miscellaneous", "num", "", "", "", optionsService.get(OptionNames.SDBackgroundSize), "SDBackgroundSize");

            addProperty("Miscellaneous", "textarea", "", "", "", optionsService.get(OptionNames.TwoFactorsAuthenticationMessage), "TwoFactorsAuthenticationMessage");

            addProperty("Miscellaneous", "input", "", "", "", optionsService.get(OptionNames.SearchPageSize), "SearchPageSize");

            

            addProperty("Print To PDF", "num", "", "", "", optionsService.get(OptionNames.PrintSize), "PrintSize");
            addProperty("Print To PDF", "cdrop", "", "true|false", "", optionsService.get(OptionNames.PrintLayout), "PrintLayout");
            addProperty("Print To PDF", "input_suggestions", "", "", "", optionsService.get(OptionNames.PrintName), "PrintName");
            addProperty("Print To PDF", "color", "", "", "", optionsService.get(OptionNames.TextBackgroundColor), "TextBackground");
            addProperty("Print To PDF", "color", "", "", "", optionsService.get(OptionNames.TextColor), "TextColor");
            addProperty("Print To PDF", "color", "", "", "", optionsService.get(OptionNames.PdfBackgroundColor), "PdfBackgroundColor");


            addProperty("3D", "cdrop", "", "Server Side|Client Side", "", optionsService.get(OptionNames.MPRRenderSide), "MprRenderSide");
            addProperty("3D", "cdrop", "", "Hardware Software|Software Only", "", optionsService.get(OptionNames.RenderingMethod), "RenderingMethod");

            addProperty("Sign-in", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableOkta), OptionNames.EnableOkta);
            //#Shibboleth: always disable shibboleth, uncomment this line to enable functionality
            //addProperty("Sign-in", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableShibboleth), OptionNames.EnableShibboleth);

            addProperty("Caching", "cdrop", "", "true|false", "", optionsService.get(OptionNames.EnableCaching), OptionNames.EnableCaching);

            
            $scope.onPropertyChanged = function (name, value) {
                __this._changes[name] = value;
            }

            $scope.keyDown = function ($event) {
                $event.originalEvent.stopPropagation();
            }


            $scope.hasChanges = function () {
                for (var p in __this._changes) {
                    return true;
                }
                return false;
            }

            $scope.close = function () {
                if ($scope.hasChanges()) {
                    if (window.confirm('Save before exit?')) {
                        $scope.save().then(function () {
                            $modalInstance.close(__this._saved);
                        });
                        return;
                    }
                }

                $modalInstance.close(__this._saved);
            }

            $scope.save = function () { 
                var defer = $q.defer();

                optionsService.saveDefaultOptions(__this._changes).success(function ()
                {
                    for (var p in __this._changes) {
                        optionsService.set(p, __this._changes[p]);
                    }
                    __this._changes = {};

                    showSavedNotification();

                    //dialogs.notify(__this._notificationTitle, __this._optionsSuccessMsg);
                    __this._saved = true;
                    defer.resolve();
                }).
                error(function (error, status) {
                });               
                return defer.promise;
            }

            $translate('DIALOGS_OPTIONS_SAVED').then(function (translation) {
                __this._optionsSuccessMsg = translation;
            });

            $translate('DIALOGS_NOTIFICATION').then(function (translation) {
                __this._notificationTitle = translation;
            });  

            function showSavedNotification() {
                var button = document.getElementById("optionsSaveButton");

                if (button.children.length != 0)
                    button.removeChild(button.children[0]);

                button.innerHTML = "<label class='optionsSaved' style='outline: none; padding-left:50px'>Saved</label>";
            }

            function addProperty(groupName: string, rowType: string, cssName: string, drpFields: string, isSubGroup: string, value: any, propertyName:string) {
                var item: PropertyGridItem = new PropertyGridItem();

                item.groupName = groupName;
                item.rowType = rowType;
                item.cssName = cssName;
                item.dropFields = drpFields;
                item.isSubGroup = isSubGroup;
                item.value = value;
                item.propertyName = propertyName;
                $scope.items.push(item);
            }
        }
    }
} 