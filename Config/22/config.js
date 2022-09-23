// Copyright (c) 1991-2022 LEAD Technologies, Inc.
/// <reference path="../lib/angular/angular.d.ts" />
app.constant("app.config", {
   urls: {
        //medicalViewerUrl: document.location.protocol + "//" + document.location.host + "/MedicalViewer22",
        //serviceUrl: document.location.protocol + "//" + document.location.host + "/MedicalViewerServiceAsp22/api/",
        //threeDserviceUrl: document.location.protocol + "//" + document.location.host + "/MedicalViewerServiceAsp22/api/",
        //idpServiceUrl: document.location.protocol + "//" + document.location.host + "/MedicalViewerIdp22/",
        medicalViewerUrl: document.location.protocol + "//" + document.location.host + "/MedicalViewer22",
        serviceUrl: document.location.protocol + "//192.168.1.104/MedicalViewerServiceAsp22/api/",
        threeDserviceUrl: document.location.protocol + "//192.168.1.104/MedicalViewerServiceAsp22/api/",
        idpServiceUrl: document.location.protocol + "//192.168.1.104/MedicalViewerIdp22/",
        // Use empty string to disable help button.
        oktaHelpUrl: "https://www.leadtools.com/help/leadtools/v22/dh/medical/to/sign-in-to-the-medical-web-viewer-demo-using-okta.html",
        loginShibbolethHelpUrl: "https://www.leadtools.com/help/leadtools/v22/dh/medical/to/sign-in-to-the-medical-web-viewer-demo-using-shibboleth.html",
        authenticationServiceName: "auth",
        queryLocalServiceName: "query",
        queryPacsServiceName: "pacsquery",
        optionsServiceName: "options",
        objectRetrieveLocalServiceName: "retrieve",
        pacsRetrieveServiceName: "pacsretrieve",
        objectStoreLocalServiceName: "store",
        monitorCalibrationServiceName: "monitorcalibration",
        exportServiceName: "export",
        auditLogServiceName: "audit",
        patientServiceName: "patient",
        patientAccessRightsServiceName: "patientaccessrights",
        templateServiceName: "template",
        autoServiceName: "auto",
        threeDServiceName: "threed"
    },
    copyright: "Copyright (c) 1991-" + new Date().getFullYear() + " LEAD Technologies, Inc. ALL RIGHTS RESERVED.",
    title: "DELTA Medical Web Viewer",
    defaultUserName: "",
    defaultPassword: "",
    runAsEval: true
});
//# sourceMappingURL=config.js.map
