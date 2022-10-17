/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="AuthenticationService.ts" />


class FhirService {
    static $inject = ['app.config', 'authenticationService', '$http', 'optionsService'];

    private _http: ng.IHttpService;
    private _authenticationService: AuthenticationService;
    private _optionsService: OptionsService;
    private _fhirUrl:string;

    constructor(config, authenticationService, $http: ng.IHttpService, optionsService: OptionsService) {
        this._http = $http;
        this._authenticationService = authenticationService;
        this._optionsService = optionsService;
        this._fhirUrl = config.urls.fhirServiceUrl;
    }

    search(resourceType: string, params?: string[]): ng.IPromise<any> {
        var fullUrl: string = resourceType;
        var queryURI: string = '';
        if (params != undefined && params.length > 0) {
            params.forEach((para, i) => {
                if (i === 0)
                    queryURI += "?"
                else
                    queryURI += "&"

                queryURI += para;
            })
        }
        if (queryURI.length > 0)
            fullUrl += queryURI;
        return this._http.get(this._fhirUrl + fullUrl);
    }
}

services.service('fhirService', FhirService);