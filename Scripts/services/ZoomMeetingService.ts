/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="AuthenticationService.ts" />


class ZoomMeetingService {
    static $inject = ['app.config', 'authenticationService', '$http', 'optionsService'];

    private _http: ng.IHttpService;
    private _authenticationService: AuthenticationService;
    private _optionsService: OptionsService;
    private _zoomMeetingUrl: string;

    constructor(config, authenticationService, $http: ng.IHttpService, optionsService: OptionsService) {
        this._http = $http;
        this._authenticationService = authenticationService;
        this._optionsService = optionsService;
        this._zoomMeetingUrl = config.urls.zoomMeetingServiceUrl;
    }


    create(data: Models.CreateZoomMeetingModel): ng.IPromise<any> {
        return this._http.post(this._zoomMeetingUrl +"Create-Meeting", JSON.stringify(data));
    }

    listUsers(): ng.IPromise<any> {
        return this._http.get(this._zoomMeetingUrl + "Users");

    }
}

services.service('zoomMeetingService', ZoomMeetingService);