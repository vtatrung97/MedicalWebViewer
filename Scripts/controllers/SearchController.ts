/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="Scopes.ts" />

class SearchController {
    public _queryArchiveService;
    public _authenticationService: AuthenticationService;
    public _openWith = "Open With";
    public _templateService: TemplateService;
    private _scope;
    private _templates: Array<Models.Template>;
    private _templatesHasAutoMatch: boolean = false;
    private _modalities: Array<Modality>;
    private _structuredDisplay: Array<Models.HangingProtocolQueryResult>;
    private _options: OptionsService;

    static $inject = ["$rootScope", "$scope", "queryArchiveService", "optionsService", "authenticationService", "queryPacsService", "tabService", "eventService", "templateService", "templateEditorService", "$translate"]

    constructor($rootScope, $scope: Controllers.ISearchControllerScope, queryArchiveService: QueryArchiveService, optionsService: OptionsService, authenticationService: AuthenticationService, queryPacsService: QueryPacsService, tabService: TabService, eventService: EventService, templateService: TemplateService, templateEditorService: TemplateEditorService, $translate) {
        var scrollTop;
        this._scope = $scope;
        this._queryArchiveService = queryArchiveService;
        this._authenticationService = authenticationService;
        this._templateService = templateService;
        this._modalities = templateEditorService.getModalities();
        this._options = optionsService;

        $scope.showPacsQuery = VersionNumber.viewerType != "Medicore" ? optionsService.get(OptionNames.ShowPacsQuery) && authenticationService.hasPermission(PermissionNames.CanQueryPACS) : false;

        $scope.querySource = {};
        $scope.querySource.name = 'database';
        $scope.querySource.pacs = null;
        $scope.isTabletOrMobile = Utils.isTabletOrMobile();

        $scope.getUrl = function (row) {
            return Utils.get_thumbnailUrl(row.entity);
        }

        queryPacsService.GetConnectionInfo().then(function (result) {


            $scope.pacsClientInfo = result.data[0];
            $scope.storageServerInfo = result.data[1];

            var pacsConfig: Models.RemoteConfig = null;
            if (optionsService != null) {
                pacsConfig = Models.RemoteConfig.Factory(optionsService.get(OptionNames.RemoteConfig));
                if (pacsConfig) {
                    if (pacsConfig.client) {
                        $scope.pacsClientInfo.AETitle = pacsConfig.client;
                    }
                }
            }

        }.bind(this));

        if (authenticationService.hasPermission(PermissionNames.CanViewTemplates)) {

            templateService.GetAllTemplates().then(function (result) {
                if (result && result.data) {
                    this._templates = result.data;

                    Utils.Templates = this._templates;

                    this.updateTemplatesHaveAutoMatch();
                }
            }.bind(this));
        }
        
        eventService.subscribe(EventNames.SelectedTabChanged, function (event, data) {
            var tab: Models.Tab = tabService.find_tab(data.args.currentTab.id);

            if (tab.type == TabTypes.Search) {
                if ($scope.onSearchTabSelected) {
                    $scope.onSearchTabSelected();
                }                
            }
        });        

        $translate('OPEN_WITH').then(function (translation) {
            this._openWith = translation;
        }.bind(this));

        $translate('SD_OPEN_WITH').then(function (translation) {
            this._sdOpenWith = translation;
        }.bind(this));

        $scope.$watch('windowDimensions', function (newValue,oldValue) {
            if ($scope.onLayoutChanged) {
                $scope.onLayoutChanged(newValue,oldValue);
            }
        });
    }

    public get_structuredDisplay() {
        return this._structuredDisplay;
    }

    public set_structuredDisplay(value) {
        this._structuredDisplay = value;
    }

    public patientids(patientId) {


        if (this._options.get(OptionNames.EnablePatientIdAutoComplete)) {

            return this._queryArchiveService.AutoComplete("patientid", patientId).then(function (results) {
                var ids: Array<any> = new Array<any>();

                angular.forEach(results.data, function (item) {
                    ids.push(item.Word);
                });
                return ids;
            });
        } 
    }

    public patientNames(patientName) {
        if (this._options.get(OptionNames.EnablePatientNameAutoComplete)) {

            var term = patientName.replace(" ", "^");

            return this._queryArchiveService.AutoComplete("patientname", term).then(function (results) {
                var ids: Array<any> = new Array<any>();

                angular.forEach(results.data, function (item) {
                    ids.push(item.Word);
                });
                return ids;
            });
        }
    }    

    public updateTemplatesHaveAutoMatch(): void{
        
        if (this._templates) {
            for (var i = 0; i < this._templates.length; i++) {
                var template = this._templates[i];

                if (template.AutoMatching) {
                    this._templatesHasAutoMatch = true;
                    return ;
                }
            }            
        }

        this._templatesHasAutoMatch = false;
    }


    public createStructuredDisplayFromTemplate(template: any, studyInstanceUID, seriesInstanceUID)
    {
        var output : any = {};

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


    public getTemplateMenu(modality: string){
        var menuItems = {};                

        if (this._templates) {
            var noMatchTemplates: Array<Models.Template> = new Array<Models.Template>();

            for (var i = 0; i < this._templates.length; i++) {
                var template = this._templates[i];

                if (this.isTemplateMatch(modality, template)) {
                    var item = {};

                    menuItems[template.Id] = {
                        name: template.Name
                    };
                }
                else {
                    noMatchTemplates.push(template);
                }
            }

            if (!$.isEmptyObject(menuItems) && noMatchTemplates.length > 0) {
                menuItems["seperator"] = "-----";
            }

            if (noMatchTemplates.length > 0) {
                menuItems["nonmatching"] = {
                    name: "Other Templates",
                    items: {}
                }

                for (var i = 0; i < noMatchTemplates.length; i++) {
                    var template = noMatchTemplates[i];

                    menuItems["nonmatching"]["items"][template.Id] = {
                        name: template.Name
                    };
                }
            }
        }

        return menuItems;
    }

    private isTemplateMatch(modality: string, template: Models.Template):boolean {
        var data: Array<string> = template.Modality.split('|');
        var modalities: Array<Modality>;               

        if (data.length == 0)
            return false;

        if (data.length == 1) {
            modalities = $.grep(this._modalities, function (modality: Modality, index: number) {
                return modality.classType == data[0];
            });
        }
        else {
            modalities = $.grep(this._modalities, function (modality: Modality, index: number) {
                return modality.classType == data[0] && modality.description == data[1];
            });
        }

        if (modalities.length > 0) {
            return modalities[0].name == modality;
        }
        return false;
    }

    public getTemplate(id:string): Models.Template {
        return Utils.findFirst(this._templates, function (template: Models.Template) {
            return id == template.Id;
        });
    }

    public getAutoMatchTemplates(): Models.Template[] {
        if (!this._templates) {
            var el: Array<any> = new Array<any>();
            return el;
        }
        return Utils.findAll(this._templates, function (template: Models.Template) {
            return template.AutoMatching;
        });
    }

    public isAnyTemplateAutoMatch(): boolean {
        return this._templatesHasAutoMatch;
    }
} 