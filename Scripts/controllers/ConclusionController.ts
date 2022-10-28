module Controllers {
    export interface IConclusionController extends ng.IScope {
        ok();
        cancel();
        pdfViewerOptions: any;
    }

    export class ConclusionController {
        static $inject = ['$scope', '$modalInstance'];


        constructor($scope: IConclusionController, $modalInstance) {
            //$scope.pdfViewerOptions = {
            //    pdfjsProcessing: {
            //        file: "http://localhost:8030/Files/Exports/test.pdf"
            //    },
            //    width: "100%",
            //    height: 400
            //};

            $.ajax({
                url: `http://localhost:8030/PdfProcess/Get`,
                type: 'GET'
            }).done(function (data) {
                $scope.pdfViewerOptions = {
                    pdfjsProcessing: {
                        file: {
                            //retain the base64 data
                            data: data
                        }
                    },
                    width: "100%",
                    height: 1200
                };
            });

            $scope.ok = function () {
                $modalInstance.close();
            }

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }
    }
}