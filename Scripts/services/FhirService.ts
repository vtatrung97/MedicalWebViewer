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


    read(reference: string): ng.IPromise<any> {
        return this._http.get(this._fhirUrl + reference);
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


    create(resourceType: string, resource: any): ng.IPromise<any> {
        return this._http.post(this._fhirUrl + resourceType, JSON.stringify(resource));
    }

    put(resourceType: string, resource: any): ng.IPromise<any> {
        return this._http.put(this._fhirUrl + resourceType + "/" + resource.id, JSON.stringify(resource));
    }
}

services.service('fhirService', FhirService);