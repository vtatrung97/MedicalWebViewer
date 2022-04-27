/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IEmailURLControllerScope extends ng.IScope { 
        file: string
        firstName: string
        lastName: string
        sex: string
        dateOfBirth: string
        patientID: string
        InNetwork: boolean
        uploadFile(element: any);
        linkGenerated: boolean;
        confirmEmail: string;
        sharedLink: string;
        Email: string;
        PhoneNumber: string;
        parameters: any;
        fullToolbar: boolean;
        miniToolbar: boolean;
        title: string;
        body: string;
        seriesInstanceUID: string;
        ok();
        cancel();
        troubleShoot();
        miniToolbarChanged();
        close();
        textChanged();
        send();
        keyDown: Function;
        isSD: boolean;
    }

    export class EmailURLController {
        static $inject = ['$scope', '$modalInstance', 'Upload', 'templateService', 'eventService', '$translate', 'dialogs', 'patientInfo', 'authenticationService', 'optionsService', 'seriesManagerService'];

        private _Upload: any;
        private _templateService: TemplateService;
        private _eventService: EventService;
        private _dialogs: any;
        private _authenticationService: AuthenticationService;

        private notifyTitle: string = 'Notification';
        private errorTitle: string = 'Error';
        private successMessage: string = 'Templates successfully imported'; 
        private patientInfo;

        private fillupEmail($scope, json, emailData: string)
        {
            var sep = emailData.indexOf('\n');
            $scope.parameters.title = emailData.substring(0, sep);
            $scope.parameters.body = emailData.substring(sep + 1);

            $scope.parameters.title = tokenizeFileName(json, json, $scope.parameters.title, ["urlinterfacelink"], false, "N/A");
            $scope.parameters.body = tokenizeFileName(json, json, $scope.parameters.body, ["urlinterfacelink"], false, "N/A");
        }


        constructor($scope: IEmailURLControllerScope, $modalInstance, Upload, templateService: TemplateService, eventService: EventService, $translate, dialogs, patientInfo, authenticationService: AuthenticationService, optionsService: OptionsService, seriesManagerService: SeriesManagerService) {  
            $translate('DIALOGS_NOTIFICATION').then(function (translation) {
                this.notifyTitle = translation;
            }.bind(this));

            $translate('DIALOGS_ERROR').then(function (translation) {
                this.errorTitle = translation;
            }.bind(this));

            $translate('DIALOGS_TEMPLATES_IMPORTED').then(function (translation) {
                this.successMessage = translation;
            }.bind(this));

            var __this = this;

            $scope.file = '';
            $scope.InNetwork = true;
            $scope.parameters = {};
            $scope.parameters.Email = '';
            $scope.parameters.confirmEmail = '';
            $scope.parameters.miniToolbar = "full";
            $scope.parameters.body = "";
            $scope.parameters.title = "";
            $scope.parameters.sharedLink = '';
            $scope.parameters.requireAuthentication = true;
            $scope.seriesInstanceUID = '';

            $scope.linkGenerated = false;

            this._authenticationService = authenticationService;

            var _patientID;
            var _name : string;
            var _lastName;
            var _dateOfBirth;
            var _sex;
            var _seriesInstanceUID;


            if (patientInfo != null) {

                if (patientInfo.PatientID) {
                    _patientID = patientInfo.PatientID;
                    _name = patientInfo.PatientName;
                    _dateOfBirth = patientInfo.PatientBirthDate;
                    _sex = patientInfo.PatientSex;
                    _seriesInstanceUID = "";
                }
                else {
                    _patientID = DicomHelper.getDicomTagValue(patientInfo, DicomTag.PatientID);
                    _name = DicomHelper.getPatientName(patientInfo, DicomTag.PatientName);
                    _dateOfBirth = DicomHelper.getDicomTagValue(patientInfo, DicomTag.PatientBirthDate);
                    _sex = DicomHelper.getDicomTagValue(patientInfo, DicomTag.PatientSex);
                    _seriesInstanceUID = DicomHelper.getDicomTagValue(patientInfo, DicomTag.SeriesInstanceUID);
                }

                if (!_name)
                    _name = "";

                var nameArray = _name.split('^');

                var last = nameArray[0];
                var first = nameArray.length > 1 ? nameArray[1] : "";

                $scope.patientID = _patientID ? _patientID : "N/A";
                $scope.firstName = first ? first : "N/A";
                $scope.lastName = last ? last : "N/A";
                $scope.dateOfBirth = _dateOfBirth ? _dateOfBirth : "N/A";
                $scope.sex = _sex ? _sex : "N/A";
                $scope.isSD = (seriesManagerService.currentStructuredDisplay != null);
                $scope.seriesInstanceUID = $scope.isSD ? seriesManagerService.currentStructuredDisplay.SeriesInstanceUID : _seriesInstanceUID;

                this.fillupEmail($scope, patientInfo, optionsService.get(OptionNames.TwoFactorsAuthenticationMessage));
            }


            $scope.uploadFile = this.uploadFile.bind(this);                                

            $scope.keyDown = function ($event) {
                $event.originalEvent.stopPropagation();
            }

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.troubleShoot = function() {
                window.open("https://www.leadtools.com/support/guides/medicalWebViewer-Email-Configuration-Guide.pdf");
            }

            $scope.cancel = function () {
                $modalInstance.close();
            }

            $scope.send = function () {
                var result: string = __this.parametersValid($scope);
                if (result == "success") {
                    $modalInstance.close();
                    __this._authenticationService.sendPatientURLAsEmail($scope.patientID.trim(), $scope.seriesInstanceUID, $scope.parameters.Email, "1111111111"/*$scope.PhoneNumber*/, $scope.parameters.miniToolbar, $scope.parameters.title, $scope.parameters.body, $scope.isSD, $scope.parameters.requireAuthentication).then(function (result) {
                        if (result.data != "success")
                            alert(result.data);

                    });
                }
                else {
                    alert(result);
                }
            }

            $scope.close = function () {
                $modalInstance.close();
            }

            $scope.miniToolbarChanged = function () {
                $scope.textChanged();
            }

            $scope.textChanged = function () {
                if (__this.parametersValid($scope) == "success") {
                    __this.generateLink($scope);
                }
                else
                    $scope.sharedLink = "";
            }

            this._Upload = Upload;
            this._templateService = templateService;
            this._eventService = eventService;    
            this._dialogs = dialogs;              
        }

        public parametersValid($scope: IEmailURLControllerScope) {
            if (!this.emailIsValid($scope.parameters.Email))
                return "E-mail is not valid"

            if (!this.emailIsValid($scope.parameters.confirmEmail))
                return "confirm E-mail does not match";

            if ($scope.parameters.confirmEmail.toLowerCase().trim() != $scope.parameters.Email.toLowerCase().trim())
                return "confirm E-mail does not match";

            return "success";
        }

        public generateLink($scope: IEmailURLControllerScope) {

            var cmd = "ShowPatient";
            var user = this._authenticationService.user;

            // this is for testing purposes, if you want to get the url directly instad of sending it as an e-mail.
            //this._authenticationService.getPatientURL($scope.patientID.trim(), $scope.parameters.Email, "7047802994"/*$scope.PhoneNumber*/, $scope.parameters.miniToolbar, 0, $scope.requireAuthentication).then(function (result) {
            //    $scope.parameters.sharedLink = result.data;
            //});
        }

        public emailIsValid(email) {
            return /\S+@\S+\.\S+/.test(email)
        }

        public uploadFile(file) {
            var __this = this;
             
            this._templateService.ImportTemplates(this._Upload, file)
                .success(function (data: Models.Template[], status, headers, config) {
                    if (data.length == 1 && data[0].Id == 'GetImportTemplatesError_0F649AC6-0D07-49EA-906C-413256B8A43E') {
                        var errorString: string = "Import Failed: " + data[0].Name;
                        __this._dialogs.error(__this.errorTitle, errorString);
                    }
                    else {
                        __this._eventService.publish(EventNames.TemplatesImported, { templates: data });
                        __this._dialogs.notify(__this.notifyTitle, __this.successMessage);
                    }
                })
                .error(function (data, status, headers, config, aaa, bbb, ccc, ddd) {                    
                    __this._dialogs.error(__this.errorTitle, data);          
                });                                   
        }
    }
} 