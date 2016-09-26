// ==UserScript==
// @name         Ticketbaum
// @namespace    http://elnarion.ad.loc/
// @version      0.1
// @description  Zeigt einen Baum für ein bestimmtes Ticket an.
// @author       dev.lauer
// @match        https://prodserver/jira/secure/Dashboar*
// @match        file:///C:/Users/lauermat/AppData/Roaming/Mozilla/Firefox/Profiles/mqw56p6v.default/ScrapBook/data/20160731212959/index.html
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
    var css = ".ui-dialog { overflow:hidden}";
    var htmlDiv = document.createElement('div');
    htmlDiv.innerHTML = '<p>foo</p><style>' + css + '</style>';
    document.getElementsByTagName("head")[0].appendChild(htmlDiv.childNodes[1]);
    $('body').append("<div id='dialogBaum' title='Baumansicht'><div id='treetable'></div></div> ");
    $( "#dialogBaum" ).dialog({autoOpen: false,
        modal: true});
    $('#treetable').jstree({ 'core' : { 'data' : [{id:'id1',text:'Simple root node',parent:'#'}]}});
    $(".dashboard-item-frame").contextMenu({
        selector: '.issuekey', 
        callback: function(key, options) {
            console.log('triggered');
            console.log(options);
            var issueKey = options.$trigger.find(".issue-link").attr('data-issue-key');
            console.log(issueKey);
            de.elnarion.jira.paintTree(issueKey);
        },
        items: {
            "Baumansicht": {name: "Baumansicht", icon: "tree"}    
        }
    });
    var de = de || {};
    de.elnarion = function(){
        return {
        };
    }();
    de.elnarion.counter = 0;
    de.elnarion.jira = function(){
        var baseURL = "/jira/rest/api/latest/";
        var currentIssue = {};
        function getIssue(issuekey, options){
            var promise = $.ajax({
                url: baseURL+"issue/"+ issuekey +"?fields=timetracking,subtasks,sub-tasks,issuelinks",
                type: "GET",
                dataType: "json",
                contentType: "application/json",
            }).done(function( data, textStatus, jqXHR ) {
                //return data;
            });
            return promise;
        }
        function paintTreeWidget(root)
        {
            $('#treetable').jstree(true).settings.core.data = root;
            $('#treetable').jstree(true).refresh();
            $( "#dialogBaum" ).dialog({autoOpen: false,
        modal: true});
            $( "#dialogBaum" ).dialog('open');
            console.log("tree");
            console.log(root);
        }
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
        function buildTree(issue,tree,parent)
        {
            var children = false;
            var child={};            
            var links = issue.fields.issuelinks;
            var linksLength = links.length;
            var i = 0;
            for(i=0;i<linksLength;i++)
            {
                if(links[i].inwardIssue===undefined)
                {}
                else{
                    if (links[i].type.inward == 'is blocked by')
                    {
                        //if(tree.children===undefined)
                        //    tree.children = [];
                        child={};
                        child.id = links[i].inwardIssue.key;
                        child.parent = parent.id;
                        child.text = links[i].inwardIssue.fields.summary;
                        //tree.children.push(child);
                        tree.push(child);
                        resolveData(child,tree);
                        children = true;
                    }
                }
            }
            var subTasks = issue.fields.subtasks;
            if (subTasks === undefined )
            {}
            else
            {
                var subTasksLength = subTasks.length;
                for(i=0;i<subTasksLength;i++)
                {
//                    if(tree.children===undefined)
//                       tree.children = [];
                    child={};
                    child.id = subTasks[i].key;
                    child.parent = parent.id;
                    child.text = subTasks[i].fields.summary;
                    //tree.children.push(child);
                    tree.push(child);
                    resolveData(child,tree);
                    children = true;
                }
            }
            if((tree[0]==parent)&&(!children))
            {
                paintTreeWidget(tree);
            }
            return tree;
        }
        function paintTree(issuekey){
            var promise = getIssue(issuekey);
            var tree = {};
            $.when(promise.done(function(data){
                tree.id = data.key;
                tree.text = data.description;
                if(tree.text=== undefined)
                    tree.text=tree.id;
                tree.parent= '#';
                tree.state = {  opened    : true  };
                buildTree(data,[tree],tree);
            }));
        }
        return {
            getIssue: getIssue,
            paintTree: paintTree
        };
    }();
  });
})();