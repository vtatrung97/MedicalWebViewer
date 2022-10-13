directives.directive('bottomToolbar',
    ["eventService", "$timeout", "queryArchiveService", "seriesManagerService",
        "authenticationService", "dataService", "optionsService",
        function (eventService: EventService, $timeout, queryArchiveService: QueryArchiveService,
            seriesManagerService: SeriesManagerService,
            authenticationService: AuthenticationService, dataService: DataService,
            optionsService: OptionsService): ng.IDirective {
            return {
                replace: true,
                template: '<div></div>',
                scope: {
                    retrieveUrl: '=',
                    api: '=',
                },
                templateUrl: 'views/templates/AudioPlayer.html',
            }
        }
    ]
);