module Controllers {
    export interface IMedicalConferencingController extends ng.IScope {
        cancel();
        close();
        scheduleZoomMeeting();

        scheduleDateTime: any;
        createZoomMeeting: Models.CreateZoomMeetingModel;
        imagingStudy: any;
        patient: any;
        edit: any;
    }

    export class MedicalConferencingController {
        static $inject = ['$scope', '$modalInstance', 'zoomMeetingService', 'fhirService',
            'dialogs', 'studyInstanceUID'];


        constructor($scope: IMedicalConferencingController, $modalInstance, zoomMeetingService: ZoomMeetingService,
            fhirService: FhirService, dialogs, studyInstanceUID: string) {
            $scope.edit = {};            

            $scope.createZoomMeeting = new Models.CreateZoomMeetingModel();

            

            $scope.scheduleDateTime = {
                scheduleDate: new Date()
            };

            fhirService.search("ImagingStudy", ["identifier=" + studyInstanceUID]).then(result => {
                console.log(result);
                if (result.data.total != null && result.data.total > 0) {
                    var imagingStudy = result.data.entry[0].resource;
                    $scope.imagingStudy = imagingStudy;
                    $scope.createZoomMeeting.topic = `Hội chẩn trực tuyến bệnh nhân`;
                    $scope.createZoomMeeting.agenda = "Hội chẩn bệnh nhân ";
                    $scope.createZoomMeeting.schedule_for = "viet@pacs.net.vn";
                    if (imagingStudy.subject != null) {
                        var patientReference = imagingStudy.subject.reference;
                        fhirService.read(patientReference).then(res => {
                            var patient = res.data;
                            console.log(patient);
                            $scope.patient = patient;
                            $scope.createZoomMeeting.topic = $scope.createZoomMeeting.topic + " " + patient.name[0].text;
                            $scope.createZoomMeeting.agenda = $scope.createZoomMeeting.agenda + " " + patient.name[0].text;

                        })
                    }
                }
            });

          
            $scope.edit.view = "NewMeeting";

            //zoomMeetingService.listUsers().then(result => {
            //    console.log(result.data);
            //})

            $scope.scheduleZoomMeeting = function () {
                $scope.createZoomMeeting.start_time = $scope.scheduleDateTime.scheduleDate;

                zoomMeetingService.create($scope.createZoomMeeting).then(result => {
                    dialogs.notify("Thông báo", "Cuộc họp đã được lên lịch");
                });
            }

            //$scope.ok = function () {
            //    $modalInstance.close();
            //}

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.close = function () {
                $modalInstance.dismiss('cancel');
            }
        }
    }
}