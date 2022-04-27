// *************************************************************
// Copyright (c) 1991-2022 LEAD Technologies, Inc.
// All Rights Reserved.
// *************************************************************

// adduser.js

/*jslint white: true */

/*global rolesArray : false */ 
/*global populatePermissionsTable : false */ 
/*global populateRolesTable : false */ 
/*global permissionsArray : false */ 
/*global onCreateUserExtError : false */ 
/*global logger : false */ 
/*global getCheckedArray : false */ 
/*global document : false */ 
/*global CreateUserOptions : false */ 
/*global ExternalCommandNames : false */ 
/*global controller : false */ 


function initializeAddUser() {
    //Validate if the user can view this type of information
    controller.AuthenticationProxy.ValidatePermission(permission = "MWV.CanManageUsers", onAddUserPermissionError, onAddUserPermissionSuccess);
}

function onAddUserPermissionError(){
    logger.LogMessage("Alert: Not Authorized to Manage User Information."); 
    AddUser_DisableItems(true);
}

function onAddUserPermissionSuccess(){
    AddUser_DisableItems(false);
    populatePermissionsTable("idAddUser", "idTable_addUser_permissions");
    populateRolesTable("idAddUser", 'idTable_addUser_roles');
}

//function AddPatient_DisableItems(disable)
function AddUser_DisableItems(disable){
    
    document.getElementById("idText_addUser_userName").disabled = disable;
    document.getElementById("idText_addUser_password").disabled = disable;
    document.getElementById("idTable_addUser_permissions").disabled = disable;
    document.getElementById("idTable_addUser_roles").disabled = disable;
    document.getElementById("idButton_addUser_addUser").disabled = disable;

    if(disable){
        $("#idTable_addUser_permissions").find("*").attr("disabled", "disabled");
        $("#idTable_addUser_roles").find("*").attr("disabled", "disabled");
    }else{
        $("#idTable_addUser_permissions").find("*").removeAttr("disabled");
        $("#idTable_addUser_roles").find("*").removeAttr("disabled");
    }



}


function onClick_addUser() {
    var commandName = ExternalCommandNames.AddUser,
        username = document.getElementById("idText_addUser_userName").value,
        password = document.getElementById("idText_addUser_password").value,
        adminUsername = document.getElementById("idText_loginLogout_userName").value,
        adminPassword = document.getElementById("idText_loginLogout_password").value,

        permissions =  getCheckedArray('idAddUser', 'idTable_addUser_permissions', permissionsArray),
        roles =  getCheckedArray('idAddUser', 'idTable_addUser_roles', rolesArray),
        options = CreateUserOptions.CreateUser; 

        controller.AuthenticationProxy.CreateUserExt(
                               username,
                               password,
                               adminUsername,
                               adminPassword,
                                 false,
                              permissions,
                              roles,
                               options,
                               onCreateUserExtError,

                               function (result) {
                                   logger.LogMessage(commandName, result);
            }); 
}


