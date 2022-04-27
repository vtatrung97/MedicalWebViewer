/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IUpdateUserControllerScope extends ng.IScope {                
        user: string;
        users: Array<string>;
        roles: Array<Models.Role>;
        selectedRoles: Array<string>;
        permissions: Array<Models.Permission>;
        selectedPermissions: Array<string>;
        password: string;
        confirmPassword: string;       
        usersInfo: { [name: string]: any; };
        userName: string;

        deleteUser(user: string);
        isCurrentUserSelected(user: string): boolean;
        userChanged(role: Models.Role);
        resetPassword(user: string, password: string);
        canSetPermission(permission: string): boolean;
        disableFeaturesForFDA(permission: string): boolean;
        updateUser(user: string, roles: Array<string>, permissions: Array<string>);
        userHasPermission(user: string, permission: string): boolean;
        keyPressed: Function;
        textChanged: Function;
        setSelected(value: string);
        getSelected();
        userSelected();
        populateDropDown();
        showDropDown(show: boolean);
    }

    export class UpdateUserController {
        static $inject = ['$scope', 'optionsService', 'authenticationService', 'dialogs', '$translate','$timeout'];  
        private _authenticationService: AuthenticationService;
        private _dialogs: any;
        private _successMessage: string;
        private _notifyTitle: string;
        private _errorTitle: string;
        private _scope: IUpdateUserControllerScope;
        private _userPermissions: any;
        private _userRoles: any;
        private _timeout: ng.ITimeoutService;
        private _confirmDeleteUserTitle: string;
        private _confirmDeleteUserMessage: string;
        private _userName: string;
        private _users;
        private _selectedIndex;
        private _userNameValid;

        constructor($scope: IUpdateUserControllerScope, optionsService: OptionsService, authenticationService: AuthenticationService, dialogs, $translate,$timeout:ng.ITimeoutService) {  
            var __this = this;
                                                                                       
            this._authenticationService = authenticationService;            
            this._dialogs = dialogs;
            this._userPermissions = {};
            this._userRoles = {};
            this._timeout = $timeout;
            this._selectedIndex = 0;
            this._userNameValid = false;



            $scope.selectedPermissions = new Array<string>();
            $scope.selectedRoles = new Array<string>();
            $scope.password = '';
            $scope.confirmPassword = '';
            $scope.userName = '';

            $scope.deleteUser = $.proxy(this.deleteUser, this);
            $scope.isCurrentUserSelected = $.proxy(this.isCurrentUserSelected, this);
            $scope.userChanged = $.proxy(this.userChanged, this);
            $scope.resetPassword = $.proxy(this.resetPassword, this);
            $scope.updateUser = $.proxy(this.updateUser, this);
            $scope.userHasPermission = $.proxy(this.userHasPermission, this);
            $scope.showDropDown = $.proxy(this.showDropDown, this);
            $scope.populateDropDown = $.proxy(this.populateDropDown, this);
            $scope.userSelected = $.proxy(this.userSelected, this);

            this.registerDiv();

            document.addEventListener('mousedown', function (args) {
                if (!args.defaultPrevented)
                    __this.showDropDown(false);
            });

            $scope.keyPressed = function (args) {
                // it has to be a letter to be processed
                if (args.key && args.key.length > 1) {
                    if (args.key == "ArrowDown") {
                        args.preventDefault();
                        args.stopPropagation();
                        var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");
                        __this.setSelected(Math.min(parentDiv.children.length - 1, __this.getSelected() + 1));
                    }
                    else if (args.key == "ArrowUp") {
                        args.preventDefault();
                        args.stopPropagation();
                        __this.setSelected(Math.max(0, __this.getSelected() - 1));
                    }
                    else if (args.key == "Enter") {
                        args.preventDefault();
                        args.stopPropagation();
                        __this._scope.user = 
                        __this._scope.userName = (<any>__this.getSelectedItem()).UserName;
                        __this._userNameValid = true;
                        __this.userChanged(__this._scope.user);
                        __this.showDropDown(false);
                    }
                    else if (args.key == "Esc") {
                        __this.showDropDown(false);
                    }
                }
            }

            $scope.textChanged = function(event)
            {
                this.showDropDown(true);
                this.populateDropDown($scope.userName);
            }

            $translate('DIALOGS_NOTIFICATION').then(function (translation) {
                __this._notifyTitle = translation;
            });

            $translate('DIALOGS_ERROR').then(function (translation) {
                __this._errorTitle = translation;
            });

            this._confirmDeleteUserTitle = "Confirm Delete";
            $translate('DIALOGS_CONFIRMATION_DELETE_USER_TITLE').then(function (translation) {
                this._confirmDeleteUserTitle = translation;
            }.bind(this));

            this._confirmDeleteUserMessage = "Are you sure you want to delete the currently selected user ({0})?";
            $translate('DIALOGS_CONFIRMATION_DELETE_USER_MESSAGE').then(function (translation) {
                this._confirmDeleteUserMessage = translation;
            }.bind(this));

            authenticationService.getAllUsers().
                success(function (result) {
                    __this._users = result;
                    $scope.usersInfo = {};
                    $scope.users = [];

                    if (result && result.length > 0) {
                        for (var u of result) {
                            if (u.UserType != "temp") {
                                if (u.UserName) {
                                    $scope.usersInfo[u.UserName] = u;
                                    $scope.users.push(u.UserName);
                                }
                                else {
                                    $scope.usersInfo[u] = u;
                                    $scope.users.push(u);
                                }
                            }
                        }
                    }
                    
                    if ($scope.users && $scope.users.length > 0) {
                        $scope.user = $scope.users[0];                        
                    }
                    authenticationService.getRoles().
                        success(function (result) {
                            $scope.roles = result || [];                            
                            authenticationService.getPermissions().
                                success(function (result) {
                                    $scope.permissions = result;
                                    __this.userChanged($scope.user);
                                }).
                                error(function (error) {
                                });  
                        }).
                        error(function (error) {
                        });                                                     
                }).
                error(function (error) {
                });                                   

            $scope.canSetPermission = $.proxy(this.canSetPermission, this);

            $scope.disableFeaturesForFDA = $.proxy(this.disableFeaturesForFDA, this);

            this._scope = $scope;
        }

        private userSelected() {
            return this._userNameValid;
        }

        private getSelectedItem() {
            var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");

            return parentDiv.children.item(this._selectedIndex);

        }


        private setSelectedItem(value) {
            var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");



            var index = 0;
            var length = parentDiv.children.length;

            for (index = 0; index < length; index++) {
                if (parentDiv.children.item(index) == value) {  
                    this.setSelected(index);
                    return;
                }

            }
        }


        private setSelected(value) {
            this._selectedIndex= value;

            var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");

            var index = 0;
            var length = parentDiv.children.length;
            var label: HTMLLabelElement;
            var div: HTMLDivElement;

            for (index = 0; index < length; index++) {
                div = <HTMLDivElement>parentDiv.children.item(index);
                label = <HTMLLabelElement>div.children.item(0);

                if (index == this._selectedIndex) {
                    label.className = "dropDownTextSelected";
                    var position = (div.offsetTop - parentDiv.scrollTop);
                    var maxAllowed = (parentDiv.clientHeight - div.clientHeight);

                    if (position < 0) {
                        parentDiv.scroll(0, div.offsetTop);
                    }
                    else if (position > maxAllowed) {
                        parentDiv.scroll(0, (div.offsetTop - maxAllowed));
                    }
                        
                }
                else {
                    label.className = "dropDownText";
                }
            }

            

        }

        private getSelected() {
            return this._selectedIndex;
        }

        private populateDropDown(text : string) {

            var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");

            if (this._users == null)
                return;

            if (this._users.length == 0)
                return;

            parentDiv.innerHTML = "";
            var _this = this;
            this._userNameValid = false;
            for (var u of this._users) {

                var subStringIndex = (<string>u.UserName).toLowerCase().indexOf(text.toLowerCase());

                if (u.UserName.length == text.length) {
                    this._userNameValid = true;
                }
                if (u.UserType == "temp")
                    continue;
                if (subStringIndex != -1) {

                    var div: HTMLDivElement = document.createElement("div");
                    (<any>div).UserName = u.UserName;
                    div.className = "dropBoxItem";
                    div.addEventListener('click', function (args) {
                        _this._scope.userName = (<any>this).UserName;
                        _this._userNameValid = true;
                        _this._scope.user = (<any>this).UserName;
                        _this.userChanged(_this._scope.user);
                        _this.showDropDown(false);
                    });

                    div.addEventListener('mousemove', function (args) {
                        _this.setSelectedItem(this);
                    });

                    var fullString: string = u.UserName;

                    var firstString = fullString.substring(0, subStringIndex);
                    var highlightedString = fullString.substring(subStringIndex, subStringIndex + text.length);
                    var restofString = fullString.substring(subStringIndex + text.length);

                    div.innerHTML = "<label class='dropDownText'>" + firstString + "<span class='highlightString'>" + highlightedString + "</span>" + restofString + "</label>";
                    parentDiv.appendChild(div);
                }
            }

            this.setSelected(0);
        }

        private deleteUser(user: string) {
            var __this = this; 

            var confirmationMessage: string = this._confirmDeleteUserMessage.format(user);
            var dlg = this._dialogs.confirm(this._confirmDeleteUserTitle, confirmationMessage);

            dlg.result.then(function (btn) {
                if (btn == "yes") {
                    __this._authenticationService.deleteUser(user)
                        .success(function (result) {
                            if (angular.isDefined(result.FaultType)) {
                                __this._dialogs.error(__this._errorTitle, result.Message);
                            }
                            else {
                                var index = __this._scope.users.map(r => r).indexOf(user);

                                __this._dialogs.notify(__this._notifyTitle, "User [" + user + "] deleted successfully.");
                                if (index != -1) {
                                    __this._scope.users.splice(index, 1);
                                    __this._scope.selectedPermissions.length = 0;
                                    __this._scope.selectedRoles.length = 0;
                                }
                            }
                        })
                        .error(function (error) {
                            __this._dialogs.error(__this._errorTitle, error);
                        });
                }
            }); 
        }

        private registerDiv() {
            var div: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");
            div.addEventListener('mousedown', function (args) {
                args.preventDefault();
            });
        }


        private showDropDown(show: boolean) {
            var div: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");
            div.style.visibility = show ? "visible" : "hidden";
        }

        private isCurrentUserSelected(currentUser: string): boolean {
            var currentUserSelected: boolean = false;
            if (currentUser != null) {
                currentUserSelected = (currentUser == this._authenticationService.user);
            }
            return currentUserSelected;
        }

        private userChanged(user: string) {
            var __this = this;
            
            this._scope.password = '';
            this._scope.confirmPassword = '';

            if(!angular.isDefined(this._userRoles[user])) {
                this._authenticationService.getUserRoles(user).
                    success(function (result) {
                        __this._scope.selectedRoles = result;
                        __this._userRoles[user] = angular.copy(__this._scope.selectedRoles);
                    }).
                    error(function (error) {
                        __this._dialogs.error(__this._errorTitle, error);
                    });
            }
            else {
                __this._scope.selectedRoles = this._userRoles[user];
            }
            
            if(!angular.isDefined(this._userPermissions[user])) {
                this._authenticationService.getUserPermissions(user).
                    success(function (result) {
                        __this._scope.selectedPermissions = result;                        
                    }).
                    error(function (error) {
                        __this._dialogs.error(__this._errorTitle, error);
                    });
            }
            else {
                __this._scope.selectedPermissions = this._userPermissions[user];
            }            
        }

        private resetPassword(user:string, password:string) {
            var __this = this;

            this._authenticationService.validatePassword(password).
                success(function (result) {
                    if (result.length == 0) {
                        __this._authenticationService.resetPassword(user, password).
                            success(function (result) {
                                if (angular.isDefined(result.FaultType)) {
                                    __this._dialogs.error(__this._errorTitle, result.Message);
                                }
                                else {
                                    __this._dialogs.notify(__this._notifyTitle, "User [" + user + "] password reset successfully.");
                                }
                            }).
                            error(function (error) {
                                __this._dialogs.error(__this._errorTitle, error);
                            });
                    }
                    else {
                        __this._dialogs.error(__this._errorTitle, result);
                    }
                }).
                error(function (error) {
                    __this._dialogs.error(__this._errorTitle, error);
                });           
        }


        private disableFeaturesForFDA(permission: string): boolean {
            var disable: boolean = false;
            if (VersionNumber.viewerType == "Medicore") {
                if (permission.toUpperCase().indexOf("PACS") != -1)
                    disable = true;
            }

            return disable;
        }



        private canSetPermission(permission: string): boolean {
            var length = this._scope.selectedRoles.length;

            for (var i = 0; i < length; i++) {
                var index: number = this._scope.roles.map(r => r.Name).indexOf(this._scope.selectedRoles[i]);

                if (index != -1) {
                    var role: Models.Role = this._scope.roles[index];

                    if (role.AssignedPermissions.indexOf(permission) != -1) {
                        return false;
                    }
                }
            }
            return true;
        }

        private updateUser(user: string, roles: Array<string>, permissions: Array<string>) {
            if (!this._userNameValid)
                return;

            var length: number = this._scope.roles.length;
            var __this = this;

            for (var i = 0; i < length; i++) {
                var role: string = this._scope.roles[i].Name;
                var index: number = roles.map(r => r).indexOf(role);

                if (index != -1) {  
                    __this.grantRole(user, role);
                }
                else {
                    __this.denyRole(user, role);
                }
            } 

            length = this._scope.permissions.length;
            for (var i = 0; i < length; i++) {
                var permission: string = this._scope.permissions[i].Name;
                var index: number = permissions.map(p => p).indexOf(permission);

                if (index != -1) {
                    __this.grantPermission(user, permission);                
                }
                else {
                    __this.denyPermission(user, permission);
                }
            }
            __this._dialogs.notify(__this._notifyTitle, "User [" + user + "] updated successfully.");
        }

        private grantRole(user: string, role: string) {            
            var __this = this;

            this._authenticationService.grantRole(user, role).
                success(function (result) {
                    var index: number = __this._userRoles[user].indexOf(role);

                    if (index == -1) {
                        __this._userRoles[user].push(role);
                    }                            
                }).
                error(function (error) {
                }); 
        }

        private denyRole(user: string, role: string) {
            var __this = this;
            
            this._authenticationService.denyRole(user, role).
                success(function (result) {
                    var index: number = __this._userRoles[user].indexOf(role);

                    if (index != -1) {
                        __this._userRoles[user].slice(index, 1);
                    }   
                }).
                error(function (error) {
                });
        } 

        private grantPermission(user: string, permission: string) {
            var __this = this;
            
            this._authenticationService.grantPermission(user, permission).
                success(function (result) {
                    if (__this._userPermissions[user]) {
                    var index: number = __this._userPermissions[user].indexOf(permission);

                    if (index == -1) {
                        __this._userPermissions[user].push(permission);
                    }   
                    }
                }).
                error(function (error) {
                }); 
        }  
        
        private denyPermission(user: string, permission: string) {
            var __this = this;

            this._authenticationService.denyPermission(user, permission).
                success(function (result) {
                    if (__this._userPermissions[user]) {
                    var index: number = __this._userPermissions[user].indexOf(permission);

                    if (index != -1) {
                        __this._userPermissions[user].slice(index, 1);
                        }
                    } 
                }).
                error(function (error) {
                });
        }            

        private userHasPermission(user: string, permission:string): boolean {
            if(angular.isDefined(this._userPermissions[user])) {
                return this._userPermissions[user].indexOf(permission) != -1;
            }
            return false;
        }
    }
}

interface String {
    format(...replacements: string[]): string;
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}