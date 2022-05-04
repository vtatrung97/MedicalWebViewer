/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="../../lib/angular/angular.d.ts" />

module Controllers {
    export interface ILoginControllerScope extends ng.IScope {
        authenticationMessage: string;
        Copyright: string;
        Username: string;
        Password: string;
        RememberMe: boolean;
        Invalid: boolean;

        submit: Function;
        submitted: boolean;
        showMessage: boolean;
        currentYear: number;
        oktaIsEnabled: boolean;
        oktaHelpIsEnabled: boolean;
        loginOkta: Function;
        loginOktaHelp: Function;
        shibbolethIsEnabled: boolean;
        loginShibboleth: Function;
        loginShibbolethHelp: Function;
        pasteHandler: Function;
        contextfun: Function;
        keyPressed: Function;
        sepclick: Function;
        keyDown: Function;
        sendAgain: Function;
        GetKey: Function;
        SetKey: Function;
        codeInvalid: string;
        urlInvalid: string;
        sixDigitSubmit: Function;
        externalSubmit: Function;
        verifyURLScreen: boolean;
        enableTwoFactorsAuthentication: boolean;
        supportsTouch: boolean;
        phoneNumber: string;

    }

    export class LoginController {

        static $inject = ['$scope', 'app.config', 'authenticationService', '$location', 'eventService', 'optionsService', 'linkToken', 'linkProtocol', 'sharedProperties', 'deferredQ'];

        auth: AuthenticationService;
        _scope: ILoginControllerScope;

        constructor($scope: ILoginControllerScope, config, authenticationService: AuthenticationService,
            $location: ng.ILocationService, eventService: EventService, optionsService: OptionsService, linkToken, linkProtocol, sharedProperties, deferredQ) {
            var __this = this;

            this._scope = $scope;
            $scope.Copyright = config.copyright;
            $scope.authenticationMessage = "";
            $scope.Invalid = false;
            $scope.RememberMe = false;
            $scope.Username = config.defaultUserName;
            $scope.Password = config.defaultPassword;
            $scope.codeInvalid = "";
            $scope.urlInvalid = "";
            this.auth = authenticationService;
            $scope.GetKey = function () {

                var index = 0;
                var length = 6;
                var key = "";

                if (__this._scope.supportsTouch)
                    return (<HTMLInputElement>document.getElementById('sixSymbolText')).value;

                for (index = 1; index <= length; index++) {
                    key += document.getElementById('key' + index).innerText;
                }
                return key;
            }
            
            $scope.sixDigitSubmit = function () {
               /*authenticationService.verifyURLCode(url, $scope.GetKey()).then(function (data)*/ {
                   /*if (data.data.verified)*/ {
                        __this.loginLoad(true, "tempAuthenticaionLoading", "tempAuthenticaionSubmitButton", "SUBMIT");
                        var myAuthenticationInfoResult;
                        authenticationService.tempAuthenticate(linkToken, linkProtocol, $scope.GetKey()).success(function (authenticationInfoResult) {
                            myAuthenticationInfoResult = authenticationInfoResult;
                            sharedProperties.SetToken(authenticationInfoResult.Cookie);
                            sharedProperties.SetPolling(true);
                            document.getElementById('verionNumberFooter').innerHTML = "";
                            authenticationService.autologin(myAuthenticationInfoResult.UserName, authenticationInfoResult.Cookie);
                        }).error(function (error) {
                            __this._scope.urlInvalid = error.Message;
                            __this._scope.codeInvalid = "Invalid code... Please try again.";
                            __this.loginLoad(false, "tempAuthenticaionLoading", "tempAuthenticaionSubmitButton", "SUBMIT");
                            var message = "";
                            if (error) {
                                if (error.Message)
                                    message = error.Message;
                                else
                                    message = error;
                            }

                            LogUtils.DebugLog("tempAuthenticate error: " + error.Message);

                        });
                    }
                }
                //});
            }

            $scope.externalSubmit = function () {
                __this.loginLoad(true, "tempAuthenticaionLoading", "tempAuthenticaionSubmitButton", "SUBMIT");
                var myAuthenticationInfoResult;
                authenticationService.externalAuthenticate(linkToken, linkProtocol).success(function (authenticationInfoResult) {
                    myAuthenticationInfoResult = authenticationInfoResult;
                    sharedProperties.SetToken(authenticationInfoResult.Cookie);
                    sharedProperties.SetPolling(true);
                    document.getElementById('verionNumberFooter').innerHTML = "";
                    authenticationService.autologin(myAuthenticationInfoResult.UserName, authenticationInfoResult.Cookie);
                }).error(function (error) {
                    __this._scope.urlInvalid = error.Message;
                    __this._scope.codeInvalid = "Invalid code... Please try again.";
                    __this.loginLoad(false, "tempAuthenticaionLoading", "tempAuthenticaionSubmitButton", "SUBMIT");
                    var message = "";
                    if (error) {
                        if (error.Message)
                            message = error.Message;
                        else
                            message = error;
                    }

                    LogUtils.DebugLog("tempAuthenticate error: " + error.Message);

                });
            }


            $scope.enableTwoFactorsAuthentication = false;//optionsService.get(OptionNames.EnableTwoFactorsAuthentication);
            $scope.verifyURLScreen = authenticationService.isTempAuthentication || authenticationService.isExternalAuthentication;
            if (authenticationService.isExternalAuthentication === true) {
                $scope.externalSubmit();
                return;
            }
            if ($scope.verifyURLScreen) {
                $scope.supportsTouch = lt.LTHelper.supportsTouch || (lt.LTHelper.browser == lt.LTBrowser.internetExplorer);
                // send the e-mail
                authenticationService.sendPatientURLVerification(linkProtocol, linkToken).then(function (data) {
                    

                    if (!data.data.NeedsVerification) {
                        $scope.sixDigitSubmit();
                        return;
                    }

                    $scope.enableTwoFactorsAuthentication = true;
                    $scope.phoneNumber = data.data.Email;
                });

                setTimeout(function () {
                    document.getElementById('key1').focus();
                }, 100);
            }
            else {
                (<HTMLInputElement>document.getElementById("username")).autofocus;
            }

            $scope.submit = function () {
                __this.loginLoad(true, "loginloading", "submitButton", "Login");
                __this.auth.login($scope.Username, $scope.Password, $scope.RememberMe);
            }

            $scope.loginOkta = function () {
                window.location.replace(config.urls.idpServiceUrl + "Account/LoginOkta");
            }
            $scope.loginShibboleth = function () {
                window.location.replace(config.urls.idpServiceUrl + "Account/LoginShibboleth");
            }

            $scope.loginOktaHelp = function () {
                window.location.href = config.urls.oktaHelpUrl;
            }

            if (typeof config.urls.oktaHelpUrl != 'undefined' && config.urls.oktaHelpUrl) {
                $scope.oktaHelpIsEnabled = true;
            }

            $scope.loginShibbolethHelp = function () {
                window.location.href = config.urls.loginShibbolethHelpUrl;
            }

            $scope.pasteHandler = function (event) {

                __this._scope.SetKey(__this.getClipboardData(event));
                event.preventDefault();
                event.stopPropagation();
            }

            $scope.SetKey = function (value: string) {
                var index = 1;
                var symbollength = 6;
                var stringLength = value.length;
                var key = "";
                var counter = 0;

                for (; (index <= symbollength && counter < stringLength); counter++) {

                    // we are moving up in (Index) if the value in the paste is good.
                    if (__this.setSymbol(document.getElementById('key' + index), value[counter]))
                        index++
                }

            }

            $scope.currentYear = new Date().getFullYear();

            $scope.oktaIsEnabled = optionsService.get(OptionNames.EnableOkta);
            $scope.shibbolethIsEnabled = optionsService.get(OptionNames.EnableShibboleth);

            $scope.sendAgain = function () {
                // send the e-mail
                authenticationService.sendPatientURLVerification(linkProtocol, linkToken).then(function (data) {
                    if (!data.data.NeedsVerification) {
                        __this._scope.sixDigitSubmit();
                        return;
                    }

                    __this._scope.enableTwoFactorsAuthentication = true;
                    __this._scope.phoneNumber = data.data.Email;
                });
            };

            // the key action when in the 6-digit code.
            $scope.keyDown = function (args) {

                var index = parseInt(args.target.id[3]);
                var key = args.key;

                if (key.match(/BackSpace/i)) {
                    // if you are at the last digit, just take it out.
                    if (!(index == 6 && document.getElementById('key6').innerText)) {
                        index--;
                    }
                    args.preventDefault();
                    args.stopPropagation();
                }

                if (key.match(/Del|Delete|BackSpace/i)) {
                    var control = document.getElementById('key' + index);
                    if (control) {
                        control.innerText = "";
                        control.focus();

                        for (; index < 6; index++) {
                            document.getElementById('key' + index).innerText = document.getElementById('key' + (index + 1)).innerText;
                        }
                        document.getElementById('key' + (index)).innerText = "";
                    }
                    args.preventDefault();
                    args.stopPropagation();
                    return;
                }

                // check if the user wants to move the right
                if (key.match(/ArrowRight|ArrowDown|PageDown/i)) {
                    if (index < 6)
                        index++;

                    document.getElementById('key' + index).focus();
                    args.preventDefault();
                    args.stopPropagation();
                    return;
                }

                // check if the user wants to move the left
                if (key.match(/ArrowLeft|ArrowUp|PageUp/i)) {
                    if (index > 1)
                        index--;

                    document.getElementById('key' + index).focus();
                    args.preventDefault();
                    args.stopPropagation();
                    return;
                }

                if (key.match(/Enter/i)) {
                    __this._scope.sixDigitSubmit();
                }

            }


            $scope.sepclick = function (args) {
                var index = parseInt(args.target.id[3]);
                if (args.offsetX > args.target.clientWidth / 2) {
                    index++;
                }
                document.getElementById('key' + index).focus();
            }

            $scope.keyPressed = function (args) {

                args.preventDefault();
                args.stopPropagation();
                // it has to be a letter to be processed
                if (args.key.length == 1) {
                    // check if the user pressed a valid character, which is anything from A to Z or from 0 to 9 and enter it in the focused key area.
                    var array = args.key.match(/[a-z|0-9]/i);
                    if (array && array.length != 0) {

                        __this.setSymbol(args.target, args.key);

                        var curIndex = args.target.tabIndex;

                        var index = parseInt(args.target.id[3]);
                        if (index < 6)
                            index++;

                        document.getElementById('key' + index).focus();
                    }
                }
            }

            eventService.subscribe("AuthenticationService/AuthenticationFailed", function (event, message) {
                __this.loginLoad(false, "loginloading", "submitButton", "Login");
                $scope.authenticationMessage = message.args;
                $scope.Invalid = true;
            });
        }

        private loginLoad(start: boolean, loadingId, buttonId, text) {
            if (start) {
                this._scope.authenticationMessage = "";
                this._scope.Invalid = false;
                document.getElementById(loadingId).style.visibility = "visible";
                (<HTMLInputElement>document.getElementById(buttonId)).value = "";
            }
            else {
                document.getElementById(loadingId).style.visibility = "hidden";
                (<HTMLInputElement>document.getElementById(buttonId)).value = text;
            }
        }

        private setSymbol(target: HTMLElement, key: string) {
            var array = key.match(/[a-z|0-9]/i);
            if (array && array.length != 0) {
                target.innerHTML = "<div class='fadeLetter'>" + key.toUpperCase() + "</div>";
                return true;
            }
            return false;
        }

        private getClipboardData(event) {
            if (event.originalEvent.clipboardData)
                return event.originalEvent.clipboardData.getData("text");
            else {
                if ((<any>window).clipboardData) {
                    return (<any>window).clipboardData.getData("text");
                }
            }
            return "";
        }

        public init(_optionsService: OptionsService) {
            this._scope.oktaIsEnabled = _optionsService.get(OptionNames.EnableOkta);
            this._scope.shibbolethIsEnabled = _optionsService.get(OptionNames.EnableShibboleth);
        }
    }
}