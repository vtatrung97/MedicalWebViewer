/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
/// <reference path="AuthenticationService.ts" />

class QueryArchiveService {
    static $inject = ['app.config','authenticationService', '$http'];

    private _http: ng.IHttpService;
    private _authenticationService: AuthenticationService;
    private _queryLocalUrl;   
    private _threedLocalUrl;   
    private _currentPatientSeriesArray : any[];

    constructor(config, authenticationService, $http: ng.IHttpService, eventService:EventService) {
        this._http = $http;
        this._authenticationService = authenticationService;
        this._queryLocalUrl = config.urls.serviceUrl + config.urls.queryLocalServiceName;              
        if (config.urls.threeDserviceUrl) {
            this._threedLocalUrl = config.urls.threeDserviceUrl + config.urls.threeDServiceName;
        }
        else {
            this._threedLocalUrl = config.urls.serviceUrl + config.urls.threeDServiceName;
        }
        this._currentPatientSeriesArray = [];
    }

    public get_CurrentPatientSeries(patientID) {
        return this._currentPatientSeriesArray[patientID];
    }

    public set_CurrentPatientSeries(patientID, patientSeries) {
        this._currentPatientSeriesArray[patientID] = patientSeries;
        this._currentPatientSeriesArray[patientID].LoadedBoxes = 0;
    }


    public get_PatientSeriesData(seriesInstanceUID) {

        var data = this._currentPatientSeriesArray;
        var item;
        var index;
        var patientData = null;

        Object.keys(data).forEach(function (key) {
            item = data[key];
            length = item.length;
            for (index = 0; index < length; index++) {
                if (item[index].InstanceUID == seriesInstanceUID) {
                    patientData = item[index];
                }
            }
        });

        return patientData;
    }



    public get_PatientData(seriesInstanceUID) {

        var data = this._currentPatientSeriesArray;
        var item;
        var index;
        var patientData = null;
        Object.keys(data).forEach(function (key) {
            item = data[key];
            length = item.length;
            for (index = 0; index < length; index++) {
                if (item[index].InstanceUID == seriesInstanceUID) {
                    patientData = item;
                }
            }
        });

        return patientData;
    }


    public FindPatients(queryParams: Models.QueryOptions, maxQueryResults?: string): ng.IHttpPromise<any> {

        var max: string = maxQueryResults || '0';
        if (max == "0")
            max = "10000";

        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            extraOptions: { UserData: parseInt(max) }
        };

        return this._http.post(this._queryLocalUrl + "/FindPatients", JSON.stringify(data));
    }

    public FindPatientsRange(queryParams: Models.QueryOptions, from : number, to: number, maxQueryResults?: string): ng.IHttpPromise<any> {
        var max: string = maxQueryResults || '0';
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,

            extraOptions: { UserData: parseInt(max), From: from, To: to }
        };

        return this._http.post(this._queryLocalUrl + "/FindPatients", JSON.stringify(data));
    }



    public UploadDicomImage(buffer, start): ng.IHttpPromise<any> {


        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            dicomData: buffer,
            createFile: start
        };
        return this._http.post(this._queryLocalUrl + "/UploadDicomImage", JSON.stringify(data));
    }

    public FindStudies(queryParams: Models.QueryOptions, maxQueryResults?: string): ng.IHttpPromise<any> {
        var max: string = maxQueryResults || '0';
        // we wont allow more than 10000 because the database might be gigantic, and that will lead to a very long wait time.
        if (max == '0')
            max = '10000';

        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            extraOptions: { UserData: parseInt(max) }          
        };

        return this._http.post(this._queryLocalUrl + "/FindStudies", JSON.stringify(data));
    }

    private isDate(key: string): boolean {
        if (key.toLowerCase().indexOf("date") != -1)
            return true;

        if (key.toLowerCase().indexOf("time") != -1)
            return true;

        return false;
    }

    public FindSeries(queryParams: Models.QueryOptions, maxQueryResults?: string): ng.IHttpPromise<any> {
        var max:string = maxQueryResults || '0';
        // we wont allow more than 10000 because the database might be gigantic, and that will lead to a very long wait time.
        if (max == '0')
            max = '10000';
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            extraOptions: { UserData: parseInt(max) }
        };

        var _this = this;

        return this._http.post(this._queryLocalUrl + "/FindSeries", JSON.stringify(data, function (key, value) {            
            if (typeof value == 'string' && _this.isDate(key)) {
                var date:any = new Date(value);

                if (date != 'Invalid Date') {                    
                    return (<Date>date).toUTCString();
                }       
            }
            return value;
        }));
    }

    public FindPresentationState(referencedSeries:string): ng.IHttpPromise<any> {
        var parameter = "auth=" + encodeURIComponent(this._authenticationService.authenticationCode) + "&series=" + referencedSeries;        

        return this._http.get(this._queryLocalUrl + "/FindPresentationState?" + parameter);
    }

    public KeepAlive(id): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id : id
        };

        return this._http.post(this._threedLocalUrl + "/KeepAlive", JSON.stringify(data));
    }

    public Start3DObject(queryParams: Models.QueryOptions, id, renderingMethod, stackInstanceUID?): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            id: id,
            renderingType: renderingMethod,
            extraOptions: { UserData2: stackInstanceUID }
        };

        return this._http.post(this._threedLocalUrl + "/Create3DObject", JSON.stringify(data));
    }

    public GetSliceURL(url) {
        return this._threedLocalUrl + "/Get3DSlice?auth=" + encodeURIComponent(this._authenticationService.authenticationCode) + "&url=" + url + "&fileName="
    }

    public Generate3DSlice(id, widthCurve, heightCurve, info): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id: id,
            widthCurve: widthCurve,
            heightCurve: heightCurve,
            polygonInfo: info,
        };

        return this._http.post(this._threedLocalUrl + "/Generate3DSlice", JSON.stringify(data));
    }


    public CheckProgress(id): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id : id
        };

        return this._http.post(this._threedLocalUrl + "/CheckProgress", JSON.stringify(data));
    }

    public Get3DSettings(settings, id): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id: id,
            options: settings,
        };

        return this._http.post(this._threedLocalUrl + "/Get3DSettings", JSON.stringify(data));
    }

    public Update3DSettings(settings, id): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id: id,
            options: settings,
        };

        return this._http.post(this._threedLocalUrl + "/Update3DSettings", JSON.stringify(data));
    }


    public Get3DImage() {
        return this._threedLocalUrl + "/Get3DImage?auth=" + encodeURIComponent(this._authenticationService.authenticationCode);
    }

    public GetPanoramic3DImage() {
        return this._threedLocalUrl + "/GetPanoramicImage?auth=" + encodeURIComponent(this._authenticationService.authenticationCode);
    }

    public Close3DImage(id) {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            id : id,
        };
        return this._http.post(this._threedLocalUrl + "/End3DObject", JSON.stringify(data));
    }

    public FindSeriesArrayInstances(seriesArray): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            series: seriesArray,
            extraOptions: { UserData2: null }
        };

        return this._http.post(this._queryLocalUrl + "/FindArrayInstances", JSON.stringify(data));
    }


    public FindInstancesForCT(queryParams: Models.QueryOptions): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
        };

        return this._http.post(this._queryLocalUrl + "/FindInstancesForCT", JSON.stringify(data));
    }

    public FindInstances(queryParams: Models.QueryOptions, stackInstanceUID?): ng.IHttpPromise<any> {
       var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            extraOptions: { UserData2: stackInstanceUID }
        };

        return this._http.post(this._queryLocalUrl + "/FindInstances", JSON.stringify(data));
    }

    public ElectStudyTimeLineInstances(queryParams: Models.QueryOptions, userData?: any): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            options: queryParams,
            userData: userData || null
        };        

        return this._http.post(this._queryLocalUrl + "/ElectStudyTimeLineInstances", JSON.stringify(data));
    }

    public FindHangingProtocols(studyInstanceUID:string, userData?): ng.IHttpPromise<any> {
        var data = {
            authenticationCookie: this._authenticationService.authenticationCode,
            studyInstanceUID: studyInstanceUID,
            userData: userData || null
        };

        return this._http.post(this._queryLocalUrl + "/FindHangingProtocols", JSON.stringify(data));
    }

    public AutoComplete(key: string, term: string): ng.IHttpPromise<any> {
        var parameter = "auth=" + encodeURIComponent(this._authenticationService.authenticationCode) + "&key=" + key + "&term=" + term;;
        var __this = this;

        return this._http.get(this._queryLocalUrl + "/AutoComplete?" + parameter, { cache: false });
    }
}

services.service('queryArchiveService', QueryArchiveService);