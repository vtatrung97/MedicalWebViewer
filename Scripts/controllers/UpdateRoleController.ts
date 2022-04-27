/*! ************************************************************* */
/*! Copyright (c) 1991-2022 LEAD Technologies, Inc.               */
/*! All Rights Reserved.                                          */
/*! ************************************************************* */
module Controllers {
    export interface IUpdateRoleControllerScope extends ng.IScope {                
        role: Models.Role;
        roles: Array<Models.Role>;
        permissions: Array<Models.Permission>;
        selectedPermissions: Array<string>;
        deleteRole(role: Models.Role);
        disableFeaturesForFDA(permission: string): boolean;
        roleChanged(role: Models.Role);
        updateRole(role: Models.Role, permissions: Array<string>);
        roleName: string;

        keyPressed: Function;
        textChanged: Function;
        setSelected(value: string);
        getSelected();
        roleSelected();
        populateDropDown();
        isCurrentUserSelected(user: string): boolean;
        showDropDown(show: boolean);
    }

    export class UpdateRoleController {
        static $inject = ['$scope', 'optionsService', 'authenticationService', 'dialogs', '$translate'];  

        private _authenticationService: AuthenticationService;          
        private _dialogs: any;
        private _successMessage: string;
        private _notifyTitle: string;
        private _errorTitle: string;
        private _scope: IUpdateRoleControllerScope;

        private _roles;
        private _selectedIndex;
        private _roleNameValid;

        constructor($scope: IUpdateRoleControllerScope, optionsService: OptionsService, authenticationService: AuthenticationService, dialogs, $translate) {  
            var __this = this;


            this._selectedIndex = 0;
            this._roleNameValid = false;
            
            $scope.role = null;                        
            $scope.selectedPermissions = new Array<string>();

            $scope.deleteRole = $.proxy(this.deleteRole, this);
            $scope.roleChanged = $.proxy(this.roleChanged, this);
            $scope.updateRole = $.proxy(this.updateRole, this);
            $scope.isCurrentUserSelected = $.proxy(this.isCurrentUserSelected, this);
            $scope.showDropDown = $.proxy(this.showDropDown, this);
            $scope.populateDropDown = $.proxy(this.populateDropDown, this);
            $scope.roleSelected = $.proxy(this.roleSelected, this);
            $scope.roleName = '';
            $scope.disableFeaturesForFDA = $.proxy(this.disableFeaturesForFDA, this);

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
                        __this._scope.roleName = (<any>__this.getSelectedItem()).RoleName;
                        __this._scope.role = (<any>__this.getSelectedItem()).Role;
                        __this._roleNameValid = true;
                        __this.roleChanged(__this._scope.role);


                        __this.showDropDown(false);
                    }
                    else if (args.key == "Esc") {
                        __this.showDropDown(false);
                    }
                }
            }

            $scope.textChanged = function (event) {
                this.showDropDown(true);
                this.populateDropDown($scope.roleName);
            }

            this._authenticationService = authenticationService;            
            this._dialogs = dialogs;

            $translate('DIALOGS_NOTIFICATION').then(function (translation) {
                __this._notifyTitle = translation;
            });

            $translate('DIALOGS_ERROR').then(function (translation) {
                __this._errorTitle = translation;
            });

            authenticationService.getRoles().
                success(function (result) {
                    __this._roles = result;
                    $scope.roles = result; 
                    if ($scope.roles && $scope.roles.length > 0) {
                        $scope.role = $scope.roles[0];
                        $scope.roleName = $scope.role.Name;

                        __this.roleChanged($scope.role);
                    }                                           
                }).
                error(function (error) {
                });

            authenticationService.getPermissions().
                success(function (result) { 
                    $scope.permissions = result;                   
                    __this.roleChanged($scope.role);
                }).
                error(function (error) {
                });
            this._scope = $scope;
        }


        private roleSelected() {
            return this._roleNameValid;
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
            this._selectedIndex = value;

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

        private populateDropDown(text: string) {

            var parentDiv: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");

            if (this._roles == null)
                return;

            if (this._roles.length == 0)
                return;

            parentDiv.innerHTML = "";
            var _this = this;
            this._roleNameValid = false;
            for (var u of this._roles) {

                var subStringIndex = (<string>u.Name).toLowerCase().indexOf(text.toLowerCase());

                if (u.Name.length == text.length) {
                    this._roleNameValid = true;
                }
                if (subStringIndex != -1) {

                    var div: HTMLDivElement = document.createElement("div");
                    (<any>div).RoleName = u.Name;
                    (<any>div).Role = u;
                    div.className = "dropBoxItem";
                    div.addEventListener('click', function (args) {
                        _this._scope.roleName = (<any>this).RoleName;
                        _this._scope.role = (<any>this).Role;
                        _this._roleNameValid = true;
                        _this.roleChanged(_this._scope.role);

                        _this.showDropDown(false);
                    });

                    div.addEventListener('mousemove', function (args) {
                        _this.setSelectedItem(this);
                    });

                    var fullString: string = u.Name;

                    var firstString = fullString.substring(0, subStringIndex);
                    var highlightedString = fullString.substring(subStringIndex, subStringIndex + text.length);
                    var restofString = fullString.substring(subStringIndex + text.length);

                    div.innerHTML = "<label class='dropDownText'>" + firstString + "<span class='highlightString'>" + highlightedString + "</span>" + restofString + "</label>";
                    parentDiv.appendChild(div);
                }
            }

            this.setSelected(0);
        }

        private registerDiv() {
            var div: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");
            div.addEventListener('mousedown', function (args) {
                args.preventDefault();
            });
        }


        private showDropDown(show: boolean) {
            var div: HTMLDivElement = <HTMLDivElement>document.getElementById("userNameList");
            if (div)
                div.style.visibility = show ? "visible" : "hidden";
        }

        private isCurrentUserSelected(currentUser: string): boolean {
            var currentUserSelected: boolean = false;
            if (currentUser != null) {
                currentUserSelected = (currentUser == this._authenticationService.user);
            }
            return currentUserSelected;
        }


        private deleteRole(role: Models.Role) {
            var __this = this;
            
            this._authenticationService.deleteRole(role.Name)
                .success(function (result) {   
                    if (angular.isDefined(result.FaultType)) { 
                        __this._dialogs.error(__this._errorTitle, result.Message);                       
                    }
                    else { 
                        var index = __this._scope.roles.map(r => r.Name).indexOf(role.Name);

                        __this._dialogs.notify(__this._notifyTitle, "Role [" + role.Name + "] deleted successfully."); 
                        if (index != -1) {
                            __this._scope.roles.splice(index, 1);
                            __this._scope.selectedPermissions.length = 0;
                        }
                    }
                })
                .error(function (error) {
                    __this._dialogs.error(__this._errorTitle,error); 
                });
        }

        private copyPermissionsArray(targetRole, roles) {
            if (targetRole == null)
                return;
            targetRole.length = 0;

            if (roles != null) {
                var length: number = roles.length;

                for (var i = 0; i < length; i++) {
                    targetRole.push(roles[i]);
                }
            }
        }

        private roleChanged(role: Models.Role) {
            if (role == null)
                return;

            if (this._scope == null)
                return;

            this.copyPermissionsArray(this._scope.selectedPermissions, role.AssignedPermissions);
        }

        private disableFeaturesForFDA(permission: string){
            var disable: boolean = false;
            if (VersionNumber.viewerType == "Medicore") {
                if (permission.toUpperCase().indexOf("PACS") != -1)
                    disable = true;
            }

            return disable;
        }

        private updateRole(role: Models.Role, permissions: Array<string>) {

            if (!this._roleNameValid)
                return;

            var __this = this;

            this._authenticationService.updateRolePermissions(role.Name, permissions).
                success(function (result)
                {
                    if (angular.isDefined(result.FaultType))
                    {
                        __this._dialogs.error(__this._errorTitle, result.Message);
                    }
                    else
                    {

                        __this.copyPermissionsArray(role.AssignedPermissions, permissions);
                        __this._dialogs.notify(__this._notifyTitle, "Role [" + role.Name + "] updated successfully.");
                    }                     
                }).
                error(function (error) {
                    __this._dialogs.error(__this._errorTitle, error);
                });
        }
    }
}