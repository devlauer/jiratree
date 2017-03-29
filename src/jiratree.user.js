// ==UserScript==
// @name         JIRA Tree
// @namespace    http://elnarion.ad.loc/
// @version      1.2.6
// @description  shows a tree widget with all issues linked to the selected issue as child 
// @author       dev.lauer
// @match        *://*/*/secure/Dashboar*
// @match        *://*/secure/Dashboar*
// @match        *://*/*/browse/*
// @match        *://*/browse/*
// @updateURL    https://raw.githubusercontent.com/devlauer/jiratree/master/src/jiratree.user.js
// @downloadURL  https://raw.githubusercontent.com/devlauer/jiratree/master/src/jiratree.user.js
// @grant        none
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.2.3/jquery.contextMenu.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.2.3/jquery.ui.position.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.1/jstree.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/i18next/3.4.3/i18next.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/i18next-browser-languagedetector/1.0.0/i18nextBrowserLanguageDetector.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/json-editor/0.7.28/jsoneditor.min.js
// @run-at document-end
// ==/UserScript==


newJQuery = $.noConflict(true);
(function($) {
    'use strict';
    $(document).ready(function() {
        i18next.use(i18nextBrowserLanguageDetector).init({
            detection: {
                // order and from where user language should be detected
                order: [ 'htmlTag','navigator'],
                // keys or params to lookup language from
                lookupQuerystring: 'lng',
                // optional htmlTag with lang attribute, the default is:
                htmlTag: document.documentElement
            },        
            resources: {
                en: {
                    translation: {
                        "titleDialog": "Treeview",
                        "showInWindow":"show in new window",
                        "showInSameWindow":"show in same window",
                        "showClosed":"show closed issues",
                        "buttonClose":"Ok",
                        "buttonPreferences":"Preferences",
                        "titleDialogPreferences":"Preferences"
                    }
                },
                de: {
                    translation: {
                        "titleDialog": "Baumansicht",
                        "showInWindow":"in neuem Fenster anzeigen",
                        "showInSameWindow":"im gleichen Fenster anzeigen",
                        "showClosed":"geschlossene Tickets anzeigen",
                        "buttonClose":"Schließen",
                        "buttonPreferences":"Einstellungen",
                        "titleDialogPreferences":"Einstellungen"
                    }
                }
            }
        }, function(err, t) {
            // initialized and ready to go!
            console.log("key: ", i18next.t('key') );
        });
        /////////////////////////////////////////////////////////////////////////////////////
        // custom css
        ////////////////////////////////////////////////////////////////////////////////////

        // add css for context menu
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.2.3/jquery.contextMenu.min.css';
        document.getElementsByTagName("head")[0].appendChild(link);
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.css';
        document.getElementsByTagName("head")[0].appendChild(link);
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.theme.min.css';
        document.getElementsByTagName("head")[0].appendChild(link);
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.2/themes/default/style.min.css';    
        document.getElementsByTagName("head")[0].appendChild(link);
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/typicons/2.0.8/typicons.min.css';    
        document.getElementsByTagName("head")[0].appendChild(link);
        // small workaround for IE which does not like creating styles
        var css = ""+
            ".ui-dialog { overflow:hidden} "+
            ".jstree-contextmenu { z-index: 999}"
        ;
        var htmlDiv = document.createElement('div');
        htmlDiv.innerHTML = '<p>foo</p><style>' + css + '</style>';
        document.getElementsByTagName("head")[0].appendChild(htmlDiv.childNodes[1]);

        /////////////////////////////////////////////////////////////////////////////////////
        // custom namespace de.elnarion
        // - used to separate all custom functions from the global namespace
        ////////////////////////////////////////////////////////////////////////////////////
        window.de = window.de || {};
        de.elnarion = function(){
            return {
            };
        }();
        de.elnarion.counter = 0;
        de.elnarion.jira = function(){
            /////////////////////////////////////////////////////////////////////////////////////
            // dialog widget for treeview and preferences
            ////////////////////////////////////////////////////////////////////////////////////


            $('body').append("<div id='dialogBaum' title='"+i18next.t('titleDialog')+"'><input type='checkbox' id='showClosed' value='true' checked='checked'/>"+i18next.t('showClosed')+"<div id='treetable'></div></div> ");
//            $('body').append("<div id='dialogPreferences' title='"+i18next.t('titleDialogPreferences')+"'><div id='preferences'></div></div> ");
            var dWidth = $(window).width() * 0.9;
            var dHeight = $(window).height() * 0.9; 
            $( "#dialogBaum" ).dialog({autoOpen: false,
                                       width: dWidth,
                                       height: dHeight,
                                       resizable: false,
                                       modal: true,
                                       buttons: [
//                                           {
//                                               text: i18next.t("buttonPreferences"),
//                                               click: function() {
//                                                   showPreferences();
//                                               }
//                                           },
                                           {
                                               text: i18next.t("buttonClose"),
                                               click: function() {
                                                   $( this ).dialog( "close" );
                                               }
                                           }
                                       ]});
//            $( "#dialogPreferences" ).dialog({autoOpen: false,
//                                              resizable: false,
//                                              modal: true,
//                                              buttons: [
//                                                  {
//                                                      text: i18next.t("buttonClose"),
//                                                      click: function() {
//                                                          $( this ).dialog( "close" );
//                                                      }
//                                                  }
//                                              ]});
//            // Initialize the editor with a JSON schema
//            var editor = new JSONEditor(document.getElementById('preferences'),{
//                schema: {
//                    type: "object",
//                    title: i18next.t('titleDialogPreferences'),
//                    properties: {
//                        styleObject: {
//                            type: "array",
//                            title: "Styles",
//                            items: {
//                                title: "Style"
//                            }
//                        },
//                        closedTypes: {
//                            type: "array",
//                            items: {
//                                title: "Issue States as closed"
//                            }
//                        },
//                        usedLinkTypes: {
//                            type: "array",
//                            items: {
//                                title: "Linktypes being used for tree"
//                            }
//                        }
//                    }
//                },
//                // Disable additional properties
//                no_additional_properties: true,
//
//                // Require all properties by default
//                required_by_default: true
//            });
            /////////////////////////////////////////////////////////////////////////////////////
            // tree widget
            ////////////////////////////////////////////////////////////////////////////////////

            $('#treetable').jstree(
                { 'core' : 
                 { 'data' : 
                  [
                      {id:'id1',text:'Simple root node',parent:'#'}
                  ]
                 },
                 "plugins" : [ "contextmenu","sort" ],
                 "sort":function (a,b){
                     var node_a = this.get_node(a);
                     var node_b =this.get_node(b);
                     return node_a.li_attr["data-rank"]>node_b.li_attr["data-rank"];
                 },
                 "contextmenu": {
                     "items": function ($node) {
                         return {
                             "ShowInWindow": {
                                 "label": i18next.t('showInWindow'),
                                 "action": function (obj) {
                                     showIssue(obj.reference[0].parentElement.id,true);
                                 }
                             },
                             "Show": {
                                 "label": i18next.t('showInSameWindow'),
                                 "action": function (obj) {
                                     showIssue(obj.reference[0].parentElement.id,false);
                                 }
                             }
                         };
                     }
                 }
                }
            );
            /////////////////////////////////////////////////////////////////////////////////////
            // standard context-menu
            ////////////////////////////////////////////////////////////////////////////////////

            $("body").contextMenu({
                selector: '.issue-link', 
                classname: 'typecn',
                callback: function(key, options) {

                    var issueKey = options.$trigger.attr('data-issue-key');
                    switch (key)
                    {
                       case "ShowInWindow":
                           showIssue(issueKey,true);
                           break;
                       default: 
                           paintTree(issueKey);
                    }                    
                },
                items: {
                    "Treeview": {name: i18next.t('titleDialog'), icon: "leaf"}    ,
                    "ShowInWindow": { name: i18next.t('showInWindow'), icon: "document-add"}
                }
            });
            // enable json support on cookie
            $.cookie.json = true;
            $.cookie.defaults = { path: '/', expires: 36500 };
            /////////////////////////////////////
            // private defaultvalues
            ////////////////////////////////////
            // read from cookie where preferences are stored, but if undefined use default
            var preferences = $.cookie('preferences');
            if(preferences===undefined)
            {
                preferences = {
                    styleObject : {
                        'Done':'background-color:lightgray;color:darkgray;text-decoration: line-through',
                        'Geschlossen':'background-color:lightgray;color:darkgray;text-decoration: line-through',
                        'Fertig':'background-color:lightgray;color:darkgray;text-decoration: line-through',
                        'Erfolgreich':'background-color:lightgray;color:darkgray;text-decoration: line-through',
                        'Open':'background-color:#ffcccc',
                        'Offen':'background-color:#ffcccc',
                        'Analyse':'background-color:#ffcc00',
                        'Reopened':'background-color:#ffcccc',
                        'Erneut geöffnet':'background-color:#ffcccc',
                        'To Do':'background-color:#ffcccc',
                        'Aufgaben':'background-color:#ffcccc',
                        'In Bestätigung':'background-color:#ffcccc',
                        'Vorlage zur Bestätigung':'background-color:#ffcccc',
                        'Freigegeben':'background-color:#ffcccc',
                        'Abgestimmt':'',
                        'Bestätigt':'',
                        'Resolved':'background-color:#ccffcc',
                        'Erledigt':'background-color:#ccffcc',
                        'In Progress':'background-color:#b3b3ff',
                        'In Arbeit':'background-color:#b3b3ff',
                        'Backlog':'background-color:#e6ccb3'
                    },
                    closedTypes:
                    [
                        'Done',
                        'Geschlossen',
                        'Fertig',
                        'Erfolgreich'
                    ],
                    usedLinkTypes: [
                        'is blocked by',
                        'hängt ab von',
                        'Wird umgesetzt in'
                    ]
                };
            }
            var debug = false;
            var showClosedIssues = true;
            var currentIssueRoot = '';
            var baseContext = "/jira";
            var baseURL = '';
            var baseBrowseURL = '';
            var imageURL = '';
            var currentIssue = {};
            var promiseContext = $.ajax({
                url: baseContext+"/rest/api/latest/serverInfo",
                type: "GET",
                dataType: "json",
                contentType: "application/json",
            }).fail(function( jqXHR, textStatus, errorThrown  ) {
                console.log('Context not found! Error:'+errorThrown);
                baseContext = '';
            }).always(function(data, textStatus, jqXHR){
                baseURL = baseContext+"/rest/api/latest/";
                baseBrowseURL = baseContext+"/browse/";
                imageURL = baseContext+"/images/icons/issuetypes/";
            });
            /////////////////////////////////////
            // public getIssue()
            //    issuekey - the issuekey in jira
            //    options - currently ignored
            //
            // calls the jira REST-API and returns some data (timetracking, subtasks, 
            // sub-tasks, issuelinks, issuetype, status) for the issue
            /////////////////////////////////////
            function getIssue(issuekey, options){
                var promise = $.ajax({
                    url: baseURL+"issue/"+ issuekey +"?fields=timetracking,summary,labels,subtasks,sub-tasks,issuelinks,issuetype,status,rank,customfield_10100,customfield_10460",
                    type: "GET",
                    dataType: "json",
                    contentType: "application/json",
                });
                return promise;
            }
            /////////////////////////////////////
            // private paintTreeWidget()
            //    root - a json-data array for the widget
            //
            // refreshes the existing widget with the name "dialogBaum" 
            // with the data contained in the root-object
            /////////////////////////////////////
            function paintTreeWidget(root)
            {
                $('#treetable').jstree(true).settings.core.data = root;
                $('#treetable').jstree(true).refresh();
                $( "#dialogBaum" ).dialog('open');
                if(debug)
                {
                    console.log("tree");
                    console.log(root);
                }
            }
            /////////////////////////////////////
            // private resolveData()
            //    childObject - an object referencing an issue
            //    root - a json-data array for the tree-widget
            //
            // resolves the data for the passed-in issue and
            // repaints the tree-widget if all recursive resolving
            // is done
            /////////////////////////////////////
            function resolveData(childObject,root)
            {
                de.elnarion.counter++;
                childObject.state = {  opened    : true  };
                $.when(getIssue(childObject.id).done(function(data){
                    var result = buildTree(data,root,childObject);
                    de.elnarion.counter--;
                    if(de.elnarion.counter===0)
                    {
                        paintTreeWidget(root);
                    }
                }));
            }
            /////////////////////////////////////
            // private fillIssueData()
            //    issue - an object referencing an issue
            //    parentID - the key of the parent issue
            //
            // sets the data for a tree-node-object and its style 
            // and returns this object
            /////////////////////////////////////
            function fillIssueData(issue,parentID)
            {
                var result={};
                if(debug)
                {
                    console.log('issue');
                    console.log(issue);
                }
                if(!(issue.fields.labels===undefined)&&issue.fields.labels.contains("igntlnode")&&(parentID.includes("PRO")||parentID.includes("TES")))
                {
                	console.log("id ignored because of label "+issue.key);
                	return;
                }
                result.id = issue.key;
                result.parent = parentID;
                result.text = ' '+issue.fields.summary;
                result.li_attr = {  };
                result.li_attr["data-rank"] = issue.fields.customfield_10100;
                if(result.li_attr["data-rank"]===undefined)
                    result.li_attr["data-rank"] = issue.fields.customfield_10460;
                if(result.li_attr["data-rank"]===undefined)
                    result.li_attr["data-rank"] = 999;
                if(result.text=== undefined)
                    result.text=issue.key;
                result.text = issue.key + result.text;
                var styleKey = issue.fields.status.name;
                if(debug)
                {
                    console.log('style for reference is');
                    console.log('::'+styleKey+'::');
                    console.log('styleObject'+preferences.styleObject[styleKey]);
                }
                if(!showClosedIssues && preferences.closedTypes.indexOf(styleKey)>-1)
                {
                    return;
                }
                if(!(preferences.styleObject[styleKey]===undefined))
                {
                    result.a_attr = { style:preferences.styleObject[styleKey]};                    
                }
                result.icon = issue.fields.issuetype.iconUrl;
                result.state = {  opened    : true  };
                return result;
            }
            /////////////////////////////////////
            // private handleTreeData()
            //    treeArray - an object array representing all nodes of a tree
            //    issue - the issuedata to be added to the tree
            //    parentID - the key of the parent issue
            //
            // sets the data for a tree-node and its style 
            /////////////////////////////////////
            function handleTreeData(treeArray,issue,parentId)
            {
                var child={};
                var promise = getIssue(issue.key);
                $.when(promise.done(function(data){
                    child = fillIssueData(data,parentId);
                    if(!(child===undefined))
                    {
                        treeArray.push(child);
                        resolveData(child,treeArray);                
                    }
                }));                
            }
            /////////////////////////////////////
            // private buildTree()
            //    tree - an object array representing all nodes of a tree
            //    issue - the issue as root of the tree
            //    parent - the key of the parent issue
            //
            // builds an object array representing all nodes of a tree
            // by iterating through all referenced issues, subTasks etc.
            // after everything is finished a tree-widget is painted or refreshed.
            /////////////////////////////////////
            function buildTree(issue,tree,parent)
            {
                var children = false;
                var child={};            
                var links = issue.fields.issuelinks;
                var linksLength = links.length;
                var i = 0;
                var jsontree;
                for(i=0;i<linksLength;i++)
                {

                    if(!(links[i].type===undefined))
                    {
                        jsontree = JSON.stringify(tree);
                        if(debug)
                        {
                            console.log('issuetype');
                            console.log(links[i].type.inward);
                            console.log(links[i]);
                        }
                        var linkedissue = {};
                        var linkedtype = {};
                        if(!(links[i].inwardIssue===undefined))
                        {
                            linkedissue=links[i].inwardIssue;
                            linkedtype=links[i].type.inward;
                        }
                        if(!(links[i].outwardIssue===undefined))
                        {
                            linkedissue=links[i].outwardIssue;
                            linkedtype=links[i].type.outward;
                        }
                        if(jsontree.indexOf(linkedissue.key)>-1)
                        {
                            console.log('ignored issue'+linkedissue.key+' already inside');
                        }
                        else if (preferences.usedLinkTypes.indexOf(linkedtype)>-1)
                        {
                            handleTreeData(tree,linkedissue, parent.id);
                            children = true;
                        }
                    }
                }
                var subTasks = issue.fields.subtasks;
                if (!(subTasks === undefined ))
                {
                    var subTasksLength = subTasks.length;
                    for(i=0;i<subTasksLength;i++)
                    {
                        if(debug)
                        {
                            console.log('subtask');
                            console.log(subTasks[i]);
                        }
                        handleTreeData(tree,subTasks[i], parent.id);
                        children = true;
                    }
                }
                if((tree[0]==parent)&&(!children))
                {
                    paintTreeWidget(tree);
                }
                return tree;
            }
            /////////////////////////////////////
            // public paintTree()
            //    issuekey - the issuekey of the root-issue of the tree
            //
            // paints a tree of an issue and its descendants
            /////////////////////////////////////
            function paintTree(issuekey){
                currentIssueRoot=issuekey;
                var promise = getIssue(issuekey);
                var tree = {};
                $.when(promise.done(function(data){
                    tree = fillIssueData(data,'#');
                    buildTree(data,[tree],tree);
                }));
            }
            /////////////////////////////////////
            // public showIssue()
            //    issuekey - the issuekey of the root-issue of the tree
            //    newWindow - true for opening the issue in a new window, 
            //                false for opening the issue in the same window
            //
            // open an issue in jira
            /////////////////////////////////////
            function showIssue(issuekey,newWindow)
            {
                if(debug)
                {
                    console.log(issuekey+"showIssue");
                }
                var windowname = '_blank';
                if(!newWindow)
                {
                    windowname = '_self';
                }
                window.open(baseBrowseURL+issuekey, windowname); 
            }
            /////////////////////////////////////
            // public toggleSwitchClosedIssues()
            //   shows or hides closed issues in the treeview
            /////////////////////////////////////
            function toggleSwitchClosedIssues()
            {
                console.log('toggleSwitch');
                console.log(showClosedIssues);
                console.log(currentIssueRoot);
                showClosedIssues = !showClosedIssues;
                paintTree(currentIssueRoot);
            }
//            /////////////////////////////////////
//            // public showPreferences()
//            //   shows the preferences for the treeview dialog
//            /////////////////////////////////////
//            function showPreferences()
//            {
//                console.log('showPreferences');
//                editor.setValue(preferences);
//                $( "#dialogPreferences" ).dialog('open');
//            }
            /////////////////////////////////////
            // public functions
            /////////////////////////////////////            
            return {
                getIssue: getIssue,
                paintTree: paintTree,
                showIssue: showIssue,
                toggleSwitchClosedIssues : toggleSwitchClosedIssues //,
//                showPreferences : showPreferences
            };
        }();

        /////////////////////////////////////////////////////////////////////////////////////
        // end custom namespace de.elnarion
        ////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////
        // Add function to checkbox
        ////////////////////////////////////////////////////////////////////////////////////
        $('#showClosed').change(de.elnarion.jira.toggleSwitchClosedIssues);
    });

})(newJQuery);