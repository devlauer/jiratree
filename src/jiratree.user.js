// ==UserScript==
// @name         JIRA Tree
// @namespace    http://elnarion.ad.loc/
// @version      0.9
// @description  shows a tree widget with all issues linked as child to the selected issue
// @author       dev.lauer
// @match        *://*/*/secure/Dashboar*
// @match        *://*/secure/Dashboar*
// @grant        none
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.2.3/jquery.contextMenu.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.2.3/jquery.ui.position.min.js
// @require https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.1/jstree.min.js
// @run-at document-end
// ==/UserScript==



(function() {
    'use strict';
    $(document).ready(function() {

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
        // small workaround for IE which does not like creating styles
        var css = ""+
            ".ui-dialog { overflow:hidden} "+
            ".jstree-contextmenu { z-index: 999}"
        ;
        var htmlDiv = document.createElement('div');
        htmlDiv.innerHTML = '<p>foo</p><style>' + css + '</style>';
        document.getElementsByTagName("head")[0].appendChild(htmlDiv.childNodes[1]);

        /////////////////////////////////////////////////////////////////////////////////////
        // dialog widget
        ////////////////////////////////////////////////////////////////////////////////////


        $('body').append("<div id='dialogBaum' title='Treeview'><div id='treetable'></div></div> ");
        var dWidth = $(window).width() * 0.9;
        var dHeight = $(window).height() * 0.9; 
        $( "#dialogBaum" ).dialog({autoOpen: false,
                                   width: dWidth,
                                   height: dHeight,
                                   resizable: false,
                                   modal: true});
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
             "plugins" : [ "contextmenu" ],
             "contextmenu": {
                 "items": function ($node) {
                     console.log('test');
                     return {
                         "ShowInWindow": {
                             "label": "show in new window",
                             "action": function (obj) {
                                 de.elnarion.jira.showIssue(obj.reference[0].parentElement.id,true);
                             }
                         },
                         "Show": {
                             "label": "show in same window",
                             "action": function (obj) {
                                 de.elnarion.jira.showIssue(obj.reference[0].parentElement.id,false);
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

        $(".dashboard-item-frame").contextMenu({
            selector: '.issuekey', 
            callback: function(key, options) {
                var issueKey = options.$trigger.find(".issue-link").attr('data-issue-key');
                de.elnarion.jira.paintTree(issueKey);
            },
            items: {
                "Treeview": {name: "Treeview", icon: "tree"}    
            }
        });

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
            /////////////////////////////////////
            // private defaultvalues
            ////////////////////////////////////
            var styleObject = {
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
            };
            var debug = true;
            var baseContext = "/jira";
            var baseURL = '';
            var baseBrowseURL = '';
            var imageURL = '';
            var usedLinkTypes = [
                'is blocked by',
                'hängt ab von',
                'Umsetzung von'
                ];
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
                    url: baseURL+"issue/"+ issuekey +"?fields=timetracking,subtasks,sub-tasks,issuelinks,issuetype,status",
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
//                $( "#dialogBaum" ).dialog({autoOpen: false, modal: true});
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
                result.id = issue.key;
                result.parent = parentID;
                result.text = issue.fields.summary;
                if(result.text=== undefined)
                    result.text=issue.key;
                var styleKey = issue.fields.status.name;
                if(debug)
                {
                    console.log('style for reference is');
                    console.log('::'+styleKey+'::');
                    console.log('styleObject'+styleObject[styleKey]);
                }
                if(!(styleObject[styleKey]===undefined))
                {
                    result.a_attr = { style:styleObject[styleKey]};                    
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
                child = fillIssueData(issue, parentId);
                treeArray.push(child);
                resolveData(child,treeArray);                
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
                        else if (usedLinkTypes.indexOf(linkedtype)>-1)
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
            // public functions
            /////////////////////////////////////            
            return {
                getIssue: getIssue,
                paintTree: paintTree,
                showIssue: showIssue
            };
        }();

        /////////////////////////////////////////////////////////////////////////////////////
        // end custom namespace de.elnarion
        ////////////////////////////////////////////////////////////////////////////////////
    });
})();