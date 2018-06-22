var Utils = (function () {
  "use strict";

  // check recursively if there are inactive nodes
  function hasInactiveNodes(nodes, recursive, filter) {
    var filteredNodes = filter ? filter(nodes) : nodes;
    return nodes.length ? reduceActive(filteredNodes) ? recursive ? hasInactiveNodes(flattenChildren(filteredNodes), true, filter) : false : true : false;
  }
  
  // check if there are inactive nodes with children
  function hasInactiveNodesWithChildren(nodes, recursive) {
    return hasInactiveNodes(nodes, recursive, filterWithChildren);
  }
  
  function reduceActive(nodes) {
    return _.reduce(_.pluck(nodes, 'active'), function(a, b) { return a && b }, true);
  }
  
  function filterWithChildren(nodes) {
    return _.filter(nodes, function (node) { return node.children.length; });
  }
  
  function flattenChildren(nodes) {
    return _.flatten(_.pluck(nodes, 'children'));
  }

  var utils = {
    hasInactiveNodes: hasInactiveNodes,
    hasInactiveNodesWithChildren: hasInactiveNodesWithChildren
  };

  return utils;

}());

// helper to display a message
function showMessage(txt,cls) {
  try {
    var s = Framework.Session(), language = s.read("user") ? s.read("user").language : Framework.functions.getNavigatorLanguage(), mh = Framework.MessageHandler("#error-drawer", "#message-container", "#alert-message-template", language);
    mh.showMessage(txt,cls); clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(mh.hideMessage.bind(mh), 10000);
  } catch (ex) {
    alert(txt);
  }
}

// set the contextmenu options
window.addEventListener('load', function() {
  context.init({
    fadeSpeed: 100,
    filter: function ($obj){},
    above: 'auto',
    preventDoubleContext: true,
    compress: false
  });
});function SecurityModel(session, messageHandler) {

  function getSecurityModelRequirements(Class) {
    switch(Class) {

      //case EntrypointPetrusProxy:
      //  return [new ProxyRequirement('reset_password'), new ProxyRequirement('reset_password', 'contact', 'read')];

      default:
        return [];

    }
  }

  return {
    getRequirements: getSecurityModelRequirements
  };

}/**
 * Created by remyfran on 2014-10-17.
 */
function CerberusProxy(api, session) {
  "use strict";

  var links = {
    "contractperson": "http://deviapps.groups.be/cerberus-dev/contractperson/",
    "codelist": "http://deviapps.groups.be/cerberus-dev/codelist/application/{applicationId}",
    "codelistid": "http://deviapps.groups.be/cerberus-dev/codelist/{codelistId}",
    "fieldproperty": "http://deviapps.groups.be/cerberus-dev/fieldproperty",
    "locality": "http://deviapps.groups.be/cerberus-dev/locality",
    "professionalqualification": "http://deviapps.groups.be/cerberus-dev/professionalqualification",
    "universeperson": "http://deviapps.groups.be/cerberus-dev/universeperson/94031",
    "universepersonreplication": "http://deviapps.groups.be/cerberus-dev/universeperson/replication/",
    "photo": "http://deviapps.groups.be/cerberus-dev/photo/",
    "administrativegroup": "http://deviapps.groups.be/cerberus-dev/administrativegroup",
    "draft": "http://deviapps.groups.be/cerberus-dev/draft/1414",
    "employer": "http://deviapps.groups.be/cerberus-dev/employer",
    "maatman": "http://deviapps.groups.be/cerberus-dev/maatman"
  };

  var employersLinks = {
    "94031":{
      "profile": "http://deviapps.groups.be/cerberus-dev/profile/employer/94031",
      "worktime": "http://deviapps.groups.be/cerberus-dev/worktime/employer/94031",
      "ccte": "http://deviapps.groups.be/cerberus-dev/ccte/employer/94031",
      "level": "http://deviapps.groups.be/cerberus-dev/level/employer/94031"
    }
  };

  var cachedResults = {};

  var universe = session.read('universe');
  var servers = session.read('servers');

  //
  // reset the proxy to its initial state
  //
  function refresh() {
    try {
      return api.Resource().request({url : servers.cerberus.links.entrypoint},
        function(data) {

          // reset links
          links = data.links;
          employersLinks = {}; for(var i = data.employers.length; i--;) {
            var employerData = data.employers[i];
            employersLinks[employerData.id] = employerData.links;
          }

          // reset cached results
          cachedResults = {};

        }
      );
    } catch(ex) {
      var noop = $.Deferred(); noop.resolve();
      return noop;
    }
  }

  //
  // fix the values coming from the server
  //
  function fixCodeLabelArray(values) {

    // iterate over the values
    for(var i = values.length; i--;) {

      // fill the code if not defined
      if(!values[i].code && values[i].no_ccte) {
        values[i].code = values[i].no_ccte;
      }

      // fill a default label if none is found
      if(!values[i].label) {
        values[i].label = "[" + values[i].code + "]";
      }

    }

    // return the values
    return values;

  }

  //
  // return the proxy
  //
  return {
    refresh: refresh,

    //
    // retrieves the list of all possible ccte values
    //
    getCCTEValues: function(employerId) {

      // compute the resource url
      var resourceUrl = employersLinks[employerId].ccte;

      // return from cache, if possible
      if(cachedResults[resourceUrl]) { return cachedResults[resourceUrl]; }

      // create the http request
      var request = api.Resource().request({url:resourceUrl});

      // convert the data
      return cachedResults[resourceUrl] = request.pipe(function(result) {

        // return the fixed results
        return fixCodeLabelArray(result.items||[]);

      });

    },

    //
    // retrieves the list of all possible level values
    //
    getLevelValues: function(employerId) {

      // compute the resource url
      var resourceUrl = employersLinks[employerId].level;

      // return from cache, if possible
      if(cachedResults[resourceUrl]) { return cachedResults[resourceUrl]; }

      // create the http request
      var request = api.Resource().request({url:resourceUrl});

      // convert the data
      return cachedResults[resourceUrl] = request.pipe(function(result) {

        // return the fixed results
        return {
          level1: fixCodeLabelArray(result.level1||[]),
          level2: fixCodeLabelArray(result.level2||[]),
          level3: fixCodeLabelArray(result.level3||[])
        };

      });
    },

    //
    // retrieves the list of all possible administrative group values
    //
    getAdministrativeGroupValues: function(employerId) {

      // compute the resource url
      var resourceUrl = links.administrativegroup+"?employerId="+employerId;

      // return from cache, if possible
      if(cachedResults[resourceUrl]) { return cachedResults[resourceUrl]; }

      // create the http request
      var request = api.Resource().request({url:resourceUrl});

      // convert the data
      return cachedResults[resourceUrl] = request.pipe(function(result) {

        // return the fixed results
        return fixCodeLabelArray(result.items||[]);

      });

    },

    //
    // retrieves the list of all possible employee type values
    //
    getProfileValues: function(employerId) {

      var promise = $.Deferred(); promise.resolve([{code:1,label:'Ouvrier'},{code:3,label:'Employé'}]);
      return promise;

      /*// compute the resource url
      var resourceUrl = employersLinks[employerId].codelist + '/cd_personnel';

      // return from cache, if possible
      if(cachedResults[resourceUrl]) { return cachedResults[resourceUrl]; }

      // create the http request
      var request = api.Resource().request({url:resourceUrl});

      // convert the data
      return cachedResults[resourceUrl] = request.pipe(function(result) {

        // return the fixed results
        return fixCodeLabelArray(result.items||[]);

      });*/

    }
  };

}
function ImportView(pxr) {

  // lazy loading (until click)
  var initialized = false;
  $("#import-view-link").click(initialize);
  setTimeout(preload, 0);

  // preloading code
  function preload() {
    pxr([ EmployeeDataProxy ]).then(function(employeeDataProxy) { employeeDataProxy.init(); })
  }

  function initialize() {
    if(initialized) { return } else {initialized = true }

    // get the proxies using the resolver
    pxr([ pxr.universe, EmployeeDataProxy ]).then(function(universe, employeeDataProxy) {
      var universedId = universe.id;

      // make sure the proxy is ready
      employeeDataProxy.init();
      var employees = employeeDataProxy.employees;
      var employeeById = employeeDataProxy.employeeById;
      var employeeByNationalId = employeeDataProxy.employeeByNationalId;
      var employeeData = employeeDataProxy.employeeData;

      // then make the user interface alive
      ClientsideDropzone("div#dropzone", {
        onerror: function(ex, done) {
          $('#upload-submit').attr('disabled', 'disabled');
          done(translate('hierarchy.invalidFileType'));
        },
        onsuccess :function(changes, done) {
          window.getImportViewChanges = function() { return changes; };
          $('#upload-submit').removeAttr('disabled');
          console.log(changes);
          done();
        },
        checkChange : function(change) {
          return !!change;
        },
        importData : function(cells, columns, changes, i) {
          var managerType = cells[columns.Characteristic];

          var employerId = cells[columns.Employer]; if(!employerId) { return; }
          var employerName = _.where(universe.employers, {id : employerId}, true)[0].name;

          var targetNationalId = cells[columns.Employee];
          var target = employeeByNationalId(targetNationalId, employerId);
          var targetId = target.user;
          var targetName = target.fullName;

          var oldValueId = employeeData.getOldValue(employeeById(targetId), managerType);
          var oldValueName = employeeData.getDescription(oldValueId, managerType);

          var newNationalId = cells[columns.Value];
          var newId = employeeData.fromExportId(newNationalId, employerId, managerType);
          var newName = employeeData.getDescription(newId, managerType);

          changes[i] = {

            /* property */
            propertyId          : managerType,
            propertyDescription : translate("hierarchy.managerNames." + managerType),

            /* employer */
            employerId          : parseInt(employerId),
            employerDescription : employerName,

            /* target */
            targetId            : parseInt(targetId),
            targetDescription   : targetName,

            /* old value */
            oldValueId          : parseInt(oldValueId),
            oldValueDescription : oldValueName,

            /* new value */
            newValueId          : parseInt(newId),
            newValueDescription : newName

          }

        },
        defaultColumns : {
          "Employer" : 0, "Employee" : 1, "Characteristic" : 3, "Value" : 4
        }
      });
    });

  }

}function NavigationMenu (navId, navigation, options) {
  "use strict";
  var defaultTabDivClass = ".tab-content";
  var defaultTabFormClass = ".tab-pane";
  options = options || {};

  function isClassSelector(string) {
    return string && string.indexOf(".") === 0;
  }

  var tabDivClass = defaultTabDivClass;

  function initNavigation() {
    var $el = $(navId);
    _.each(_.keys(navigation), function (key) {
      $el.find(key).click(function() {

        // allow to cancel a tab switch for a reason
        if(options.onBeforeSwitch) {
          if(options.onBeforeSwitch(key) === false) {
            return false;
          }
        }

        // switch to the matching tab now
        $el.children().removeClass("active");
        $el.find(key).addClass("active");
        $(tabDivClass).removeClass("active");
        $(navigation[key]).addClass("active");

        return false;

      });
    });
  }

  (function initialization () {
    initNavigation();
  }());
}function PageAutoSizer() {

  // (this code handles the sizing of the page)
  var HEADER_BAR = 36;
  var BUTTON_BAR = 30;
  var sizer = {
    getTabWidth:
      function() {
        var AVAIL_WIDTH = document.documentElement.clientWidth;
        return (getFullscreenElement() ? AVAIL_WIDTH - 0 : AVAIL_WIDTH - 0) + 'px';
      },
    getTabHeight:
      function() {
        var HEADER_MARGIN = 0;//80+5+24;//parseInt(getComputedStyle(document.getElementById('banner-header')).marginTop);
        return (getFullscreenElement() ? window.innerHeight - 160 + 30 - BUTTON_BAR : window.innerHeight - 270 + 30 + 30 - HEADER_MARGIN - BUTTON_BAR - HEADER_BAR) + 'px';
      },
    getPos:
      function() {
        var HEADER_MARGIN = 0;//80+5+24;//parseInt(getComputedStyle(document.getElementById('banner-header')).marginTop);
        return (getFullscreenElement() ? { top : (40 + BUTTON_BAR) + 'px', left : 0 + 'px' } : {top : (150 - 30 + HEADER_MARGIN + BUTTON_BAR + HEADER_BAR) + 'px', left : 0 + 'px'});
      }
  };
  var onresize = function() {
    document.getElementById('main-content').style.minHeight = (parseInt(sizer.getTabHeight()) + 40 + 70 + BUTTON_BAR) + 'px';
  };
  window.addEventListener('resize', onresize);
  onresize();

  return sizer;

}function TableView(pxr, session) {

  // lazy loading (until click or preloaded)
  var initialized = false;
  $("#table-view-link").click(initialize);
  setTimeout(preload, 0);

  // preloading code
  function preload() {
    pxr([ EmployeeDataProxy, CerberusProxy, MedusaProxy ]).then(function(employeeDataProxy, cerberusProxy, medusaProxy) {
      employeeDataProxy.init();
      setTimeout(initialize, 16);
    });
  }

  // loading code
  function initialize() {
    if(initialized) { return } else { initialized = true }

    // transform the update select into dynamic ones
    $.extend($.fn.select2.defaults, $.fn.select2.locales[PrestaWebCDN.language]);
    $("#table-view-selects select, #group-filter-box select").select2();

    // get the proxies using the resolver
    pxr([ pxr.universe, EmployeeDataProxy, CerberusProxy, MedusaProxy ]).then(function(universe, employeeDataProxy, cerberusProxy, medusaProxy) {
      var universeId = universe.id;

      // make sure the proxy is ready
      employeeDataProxy.init();
      var employees = employeeDataProxy.employees;
      var employeeByContract = employeeByContract = function(contractNb) {
        var employerId = document.getElementById("selectEmployer").value;
        return employeeDataProxy.employeeByContract(employerId, contractNb);
      };
      
      var employeeById = employeeDataProxy.employeeById;
      var employeeByNationalId = employeeDataProxy.employeeByNationalId;
      var employeeData = employeeDataProxy.employeeData;

      // then make the user interface alive
      var initDataTable = function initDataTable() {
        employees = employeeDataProxy.employees;
        undoredo._commit.employees = employees;
        var datatable = $('#table-view-table');
        var datatableHelper = datatable.dataTable({
          //"paginate"        : false,
          "useGroupFilters"  : true,
          "columns"          : [ {"searchable" : true}, {"searchable" : false}, {"searchable" : true}, {"searchable" : false, "orderable" : false} ],
          "stripeClasses"    : [],
          "language"         : { url : '../cdn/DataTables/1.10.4/resources/language/' + PrestaWeb.traduction.getLanguage() + '.json' },
          "initComplete"     : function() {

            datatable = $('#table-view-table');

            // support de la sélection des lignes
            function updateSelectionData() {

              var rows = datatableHelper.rows().nodes();
              for(var i = rows.length; i--;) {
                var txt = rows[i].querySelector('.checked-indicator');
                if(rows[i].classList.contains('checked')) {

                  // ligne selectionnée
                  if(txt.textContent != '+') {
                    txt.textContent = '+';
                    datatableHelper.row(rows[i]).invalidate();
                  }

                } else {

                  // ligne déselectionnée
                  if(txt.textContent != '-') {
                    txt.textContent = '-';
                    datatableHelper.row(rows[i]).invalidate();
                  }

                }
              }

              if (datatableHelper.rows(".checked").data().length > 0) {
                document.querySelector("#export-to-xls").disabled = false;
              } else {
                document.querySelector("#export-to-xls").disabled = true;
              }

            }

            // select row
            datatable.on('click', 'tbody tr', function() {
              var This = $(this);
              if(This.find('td.dataTables_empty').length >= 1) {
                return;
              }
              This.toggleClass('checked');
              updateSelectionData();
              
            });

            // select all
            datatable.on('click', 'thead.toolbar > tr', function() {
              var allThings = datatableHelper.rows({order : 'current', search : 'applied', page : 'all'}).nodes().toJQuery();
              var selectedThings = datatableHelper.rows('.checked', { order : 'current', search : 'applied', page : 'all' }).nodes().toJQuery();
              var areAllSelected = selectedThings.length == allThings.length;
              if(areAllSelected) {
                // unselect all
                allThings.removeClass('checked');
              } else {
                // select all
                allThings.addClass('checked');
              }
              updateSelectionData();

            });

            // invert all
            datatable.on('click', 'tfoot.toolbar > tr', function() {
              datatableHelper.rows({
                order : 'current', search : 'applied', page : 'all'
              }).nodes().toJQuery().toggleClass('checked');
              updateSelectionData();

            });

            // la recherche
            var wrapper = $("#table-view-table_wrapper");
            var filter = wrapper.find('#table-view-table_filter');
            filter.attr('style', 'display: none; position: absolute; bottom: 5px; right: 15px; visibility: hidden;');
            var filter_input = filter.find('input[type="search"]');
            filter_input.attr("style", "visibility: visible; background: #f0faff url('css/images/search.png') 7px center no-repeat; padding-left: 30px; border-color: lightblue; color: darkblue;");
            filter_input.attr('placeholder', translate('common.search') + '...');
            filter_input.attr('class', 'form-control');

            // met à jour le style des selects (et applique les filtres si besoin)
            resetTableFilter();
            var selects = document.querySelectorAll('#table-view select[onchange]');
            for(var i = selects.length; i--;) {
              triggerChange(selects[i]);
            }

          }
        }).DataTable();

        var exportToCSV = function exportToCSV() {

          var lines = [];
          var done = [];
          var escapeCSV = function(s) {
            return ('' + s).replace(/"/g, '""')
          };

          for(var i = 0; i < employees.length; i++) {
            var u = employees[i];

            // check done
            if(done.indexOf(u.nationalIdNumber) >= 0) {
              continue;
            }
            done.push(u.nationalIdNumber);

            // prepare append fields
            var fields = ["administrator", "administrative", "functional", "substitute", "workflow100", "workflow101"];
            var appendField = function(field) {
              var value = employeeData.getOldValue(u, field);
              var valueId = employeeData.getExportId(value, field);
              var valueDesc = employeeData.getDescription(value, field);
              var columns = [u.employer, u.nationalIdNumber, u.fullName, field, valueId, valueDesc];
              lines.push('"' + columns.map(escapeCSV).join('","') + '"');
            };

            // append fields
            fields.forEach(appendField);

          }

          return new Blob([lines.join("\n")], {type : "application/octet-stream"});

        };
        var exportToXML = function exportToXML() {

          var lines = [];
          var done = [];
          for(var i = 0; i < employees.length; i++) {
            var u = employees[i];

            // check done
            if(done.indexOf(u.nationalIdNumber) >= 0) {
              continue;
            }
            done.push(u.nationalIdNumber);

            // prepare append fields
            var fields = ["administrator", "administrative", "functional", "substitute", "workflow100", "workflow101"];
            var appendField = function(field, i) {
              var newExportRow = i == 0 ? newExportXFirstRow : newExportXSecondRow;
              var value = employeeData.getOldValue(u, field);
              var valueId = employeeData.getExportId(value, field);
              var valueDesc = employeeData.getDescription(value, field);
              lines.push(newExportRow({
                employerId   : u.employer,
                employeeId   : u.nationalIdNumber,
                employeeName : u.fullName,
                treeName     : field,
                managerId    : valueId,
                managerName  : valueDesc
              }));
            };

            // append fields
            fields.forEach(appendField);

          }

          return new Blob([newExportXDocument({rows : lines.join('\n')})], {type : "application/octet-stream"});

        };
        window.exportToCSV = exportToCSV;
        window.exportToXML = exportToXML;

        // filter by name
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          var LatinText = {
            latin_map : JSON.parse('{"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"}'),
            normalize : function(s) {
              return s.replace(/[^A-Za-z0-9\[\] ]/g, function(a) {
                return LatinText.latin_map[a] || a
              })
            }
          };

          var eNM = LatinText.normalize(" " + textData[0].substr(1) + " " + textData[2]).toUpperCase();
          var TTF = LatinText.normalize(document.getElementById('searchPerson').value).toUpperCase().split(/\s+/);
          return (TTF.length == 0) || TTF.every(function(TTF) {
              return eNM.indexOf(' ' + TTF) >= 0 || eNM.indexOf('-' + TTF) >= 0
            });

        });

        // filter by employer
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectEmployer");

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return select.selectedIndex == 0 || (employee && employee.employer == select.options[select.selectedIndex].value);
        });

        // filter by population
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectGroup");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.population.split(",").indexOf(select.options[select.selectedIndex].value) !== -1);

        });

        // filter by ccte
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectCCTE");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.code == select.options[select.selectedIndex].value);

        });

        // filter by employee type
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectEmployeeType");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.personnelCode == select.options[select.selectedIndex].value);

        });

        // filter by level 1
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectLevel1");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.level1 == select.options[select.selectedIndex].value);

        });

        // filter by level 2
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectLevel2");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.level2 == select.options[select.selectedIndex].value);

        });

        // filter by level 3
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectLevel3");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.level3 == select.options[select.selectedIndex].value);

        });

        // filter by admin group
        $.fn.dataTable.ext.search.push(function(settings, textData, dataIndex, htmlData) {
          if(settings.nTable.id != "table-view-table") {
            return true;
          }

          // check that the filter is enabled
          var select = document.getElementById("selectAdminGroup");
          if(select.selectedIndex == 0) {
            return true;
          }

          // find the employee
          var contractId = parseInt(textData[2].trim());
          var employee = employeeByContract(contractId);

          // check that it matches the condition
          return employee && (employee.admingroupNumber == select.options[select.selectedIndex].value);

        });

        var lastEmployerId = -1;
        var selectEmployer = document.querySelector('#selectEmployer');
        selectEmployer.innerHTML = selectEmployer.options[0].outerHTML + universe.employers.map(function(e) {
          return newGroupFilterOption({code : e.id, label : e.name});
        }).join('');
        selectEmployer.selectedIndex = 0;
        $(selectEmployer).select2();

        window.removeAnySelection = function() {
          datatableHelper.rows().nodes().toJQuery().removeClass("checked");
        };

        window.resetTableFilter = function() {

          // 1. Update the filters if we switched the employer
          var currentEmployerId = selectEmployer.options[selectEmployer.selectedIndex].value;
          if (selectEmployer.selectedIndex == 0) {
            var resetOtherFilters = function () {
              document.querySelector("#selectGroup").options.length = 1;
              document.querySelector("#selectCCTE").options.length = 1;
              document.querySelector("#selectEmployeeType").options.length = 1;
              document.querySelector("#selectLevel1").options.length = 1;
              document.querySelector("#selectLevel2").options.length = 1;
              document.querySelector("#selectLevel3").options.length = 1;
              document.querySelector("#selectAdminGroup").options.length = 1;
            };
            resetOtherFilters();
          } else if (currentEmployerId != lastEmployerId) {
            lastEmployerId = currentEmployerId;

            // remove any selection
            window.removeAnySelection();

            // define variables

            // update population groups
            try {
              var selectGroup = document.getElementById("selectGroup");
              void function (values) {
                selectGroup.innerHTML = selectGroup.options[0].outerHTML + values.map(newGroupFilterOption).join('');
                triggerChange(selectGroup);
              }(_.findWhere(universe.employers, {id: currentEmployerId}).groups.map(function (e) {
                return {code: e.id, label: e.name}
              }));
            } catch (ex) {
              showMessage(translate('common.stabilityWarning'));
              setTimeout(function () {
                throw ex;
              });
            }

            // update ccte
            try {
              var selectCCTE = document.getElementById("selectCCTE");
              selectCCTE.innerHTML = selectCCTE.options[0].outerHTML;
              selectCCTE.style.cursor = 'wait';
              triggerChange(selectCCTE);
              cerberusProxy.getCCTEValues(currentEmployerId).then(function (values) {
                if (lastEmployerId != currentEmployerId) {
                  return;
                }
                selectCCTE.innerHTML = selectCCTE.options[0].outerHTML + values.map(newGroupFilterOption).join('');
                selectCCTE.style.cursor = '';
              });
            } catch (ex) {
              showMessage(translate('common.stabilityWarning'));
              setTimeout(function () {
                throw ex;
              });
            }

            // update levels
            try {
              var selectLevel1 = document.getElementById("selectLevel1");
              var selectLevel2 = document.getElementById("selectLevel2");
              var selectLevel3 = document.getElementById("selectLevel3");
              selectLevel1.innerHTML = selectLevel1.options[0].outerHTML;
              selectLevel1.style.cursor = 'wait';
              triggerChange(selectLevel1);
              selectLevel2.innerHTML = selectLevel2.options[0].outerHTML;
              selectLevel2.style.cursor = 'wait';
              triggerChange(selectLevel2);
              selectLevel3.innerHTML = selectLevel3.options[0].outerHTML;
              selectLevel3.style.cursor = 'wait';
              triggerChange(selectLevel3);
              cerberusProxy.getLevelValues(currentEmployerId).then(function (values) {
                if (lastEmployerId != currentEmployerId) {
                  return;
                }

                values.level1.sort(function (a, b) {
                  return a.label > b.label ? +1 : -1;
                });
                values.level2.sort(function (a, b) {
                  return a.label > b.label ? +1 : -1;
                });
                values.level3.sort(function (a, b) {
                  return a.label > b.label ? +1 : -1;
                });

                values.level1.forEach(function (a) {
                  if (a.code < 100) {
                    a.code = ('00' + a.code).substr(-3)
                  }
                });
                values.level2.forEach(function (a) {
                  if (a.code < 100) {
                    a.code = ('00' + a.code).substr(-3)
                  }
                });
                values.level3.forEach(function (a) {
                  if (a.code < 100) {
                    a.code = ('00' + a.code).substr(-3)
                  }
                });

                selectLevel1.innerHTML = selectLevel1.options[0].outerHTML + values.level1.map(newGroupFilterOptionWithCode).join('');
                selectLevel2.innerHTML = selectLevel2.options[0].outerHTML + values.level2.map(newGroupFilterOptionWithCode).join('');
                selectLevel3.innerHTML = selectLevel3.options[0].outerHTML + values.level3.map(newGroupFilterOptionWithCode).join('');

                selectLevel1.style.cursor = '';
                selectLevel2.style.cursor = '';
                selectLevel3.style.cursor = '';

              });
            } catch (ex) {
              showMessage(translate('common.stabilityWarning'));
              setTimeout(function () {
                throw ex;
              });
            }

            // update profiles (employee types)
            try {
              var selectEmployeeType = document.getElementById("selectEmployeeType");
              selectEmployeeType.innerHTML = selectEmployeeType.options[0].outerHTML;
              selectEmployeeType.style.cursor = 'wait';
              triggerChange(selectEmployeeType);
              cerberusProxy.getProfileValues(currentEmployerId).then(function (values) {
                if (lastEmployerId != currentEmployerId) {
                  return;
                }
                selectEmployeeType.innerHTML = selectEmployeeType.options[0].outerHTML + values.map(newGroupFilterOption).join('');
                selectEmployeeType.style.cursor = '';
              });
            } catch (ex) {
              showMessage(translate('common.stabilityWarning'));
              setTimeout(function () {
                throw ex;
              });
            }

            // update administrative groups
            try {
              var selectAdminGroup = document.getElementById("selectAdminGroup");
              selectAdminGroup.innerHTML = selectAdminGroup.options[0].outerHTML;
              selectAdminGroup.style.cursor = 'wait';
              triggerChange(selectAdminGroup);
              cerberusProxy.getAdministrativeGroupValues(currentEmployerId).then(function (values) {
                if (lastEmployerId != currentEmployerId) {
                  return;
                }
                selectAdminGroup.innerHTML = selectAdminGroup.options[0].outerHTML + values.map(newGroupFilterOption).join('');
                selectAdminGroup.style.cursor = '';
              });
            } catch (ex) {
              showMessage(translate('common.stabilityWarning'));
              setTimeout(function () {
                throw ex;
              });
            }

            //------------------------------------------------------------------

          }

          function generateEmployeesOptions(employees, role) {

            // divide by "canBeManager" and employer
            var technicals = _.partition(employees.technicals, function (e) {
              return e[role.toLowerCase()]
            });
            var es = _.partition(employees, function (e) {
              return e["position" + role].canBeManager
            });
            var e1s = _.partition(es[0], function (e) {
              return true;
            });
            var e2s = _.partition(es[1], function (e) {
              return true;
            });

            // check if we should display the non-manager
            if (!PrestaWeb.AccessRights.canWrite('iadmin')) {
              e2s = [[], []]
            }

            // concat the arrays
            return (
                convertToHtml(e1s[0], translate('hierarchy.groupOfUsers.managers')) +
                convertToHtml(e1s[1], translate('hierarchy.groupOfUsers.managers') + translate('hierarchy.groupOfUsers.extended')) +
                convertToHtml(e2s[0], translate('hierarchy.groupOfUsers.otherEmployees')) +
                convertToHtml(e2s[1], translate('hierarchy.groupOfUsers.otherEmployees') + translate('hierarchy.groupOfUsers.extended')) +
                convertToHtml(technicals[0], translate('hierarchy.groupOfUsers.technical'))
            );

            //----------------------
            function generateBlock(prefix) {
              prefix = prefix || '';
              prefix = '' + prefix;
              return function (e) {
                return {code: e.user, label: prefix + e.fullName}
              };
            }

            function sortByLabel(a, b) {
              return a.label == b.label ? 0 : a.label < b.label ? -1 : +1;
            }

            function convertToHtml(arr, prefix) {
              if (arr.length > 0) {
                arr = arr.map(generateBlock());
                arr = arr.sort(sortByLabel);
                arr = arr.map(newGroupFilterOption);
                arr = arr.join('');
                if (prefix) return '<' + 'optgroup label="' + prefix + '">' + arr + '</optgroup' + '>';
                return arr;
              } else {
                return '';
              }
            }
          }

          // update the change-value selects (administrator)
          try {
            var selectAdministrator = document.getElementById("selectAdministrator");
            selectAdministrator.innerHTML = (
                selectAdministrator.options[0].outerHTML + selectAdministrator.options[1].outerHTML +
                generateEmployeesOptions(employees, "Administrator")
            );
            triggerChange(selectAdministrator);
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          // update the change-value selects (administrative)
          try {
            var selectAdminManager = document.getElementById("selectAdminManager");
            selectAdminManager.innerHTML = (
                selectAdminManager.options[0].outerHTML + selectAdminManager.options[1].outerHTML +
                generateEmployeesOptions(employees, "Administrative")
            );
            triggerChange(selectAdminManager);
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          // update the change-value selects (functional)
          try {
            var selectFuncManager = document.getElementById("selectFuncManager");
            selectFuncManager.innerHTML = (
                selectFuncManager.options[0].outerHTML + selectFuncManager.options[1].outerHTML +
                generateEmployeesOptions(employees, "Functional")
            );
            triggerChange(selectFuncManager);
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          // update the change-value selects (substitute)
          try {
            var selectSubst = document.getElementById("selectSubst");
            selectSubst.innerHTML = (
                selectSubst.options[0].outerHTML + selectSubst.options[1].outerHTML +
                generateEmployeesOptions(employees, "Administrative")
            );
            triggerChange(selectSubst);
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          // update the workflows (1)
          try {
            var selectWorkflow100 = document.getElementById("selectWorkflow100");
            selectWorkflow100.innerHTML = selectWorkflow100.options[0].outerHTML + selectWorkflow100.options[1].outerHTML;
            medusaProxy.getWorkflows().then(function (workflows) {
              workflows = workflows.filter(function (w) {
                return w.processId == '100'
              });
              selectWorkflow100.innerHTML = selectWorkflow100.options[0].outerHTML + selectWorkflow100.options[1].outerHTML + workflows.map(function (w) {
                    return newGroupFilterOption({code: w.id, label: w.label});
                  }).join('');
              triggerChange(selectWorkflow100);
            });
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          // update the workflows (2)
          try {
            var selectWorkflow101 = document.getElementById("selectWorkflow101");
            selectWorkflow101.innerHTML = selectWorkflow101.options[0].outerHTML + selectWorkflow101.options[1].outerHTML;
            medusaProxy.getWorkflows().then(function (workflows) {
              workflows = workflows.filter(function (w) {
                return w.processId == '101'
              });
              selectWorkflow101.innerHTML = selectWorkflow101.options[0].outerHTML + selectWorkflow101.options[1].outerHTML + workflows.map(function (w) {
                    return newGroupFilterOption({code: w.id, label: w.label});
                  }).join('');
              triggerChange(selectWorkflow101);
            });
          } catch (ex) {
            showMessage(translate('common.stabilityWarning'));
            setTimeout(function () {
              throw ex;
            });
          }

          //== Tentatively removed because I think I use another filter now ==============
          //// 2. Update the search
          //document.querySelector('#table-view-table_filter input[type="search"]').value = document.getElementById("searchPerson").value;
          //==============================================================================

          // 3. Reset the table
          datatableHelper.order([[0, "asc"]]);
          datatableHelper.draw();

        };

      };

      var exporter = {};

      exporter.Level = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        self.getDepartments = function() {
          return spec.departments;
        };

        return self;
      };

      exporter.Department = function(spec) {
        var self;

        self = {};

        self.getCode = function() {
          return spec.code;
        };

        self.getLabel = function() {
          return spec.label;
        };

        return self;
      };

      exporter.Employer = function(spec) {
        var self;

        self = {};

        spec.levels = spec.levels || [];

        self.getId = function() {
          return spec.id;
        };

        self.getName = function() {
          return spec.name;
        };

        self.getLevels = function() {
          return spec.levels;
        };

        return self;
      };

      exporter.Process = function(spec) {
        var self;

        self = {};

        spec.workflows = spec.workflows || {};

        self.getId = function() {
          return spec.id;
        };

        self.getCode = function() {
          return spec.code;
        };

        self.getWorkflows = function() {
          return spec.workflows;
        };

        self.addWorkflow = function(workflow) {
          spec.workflows[workflow.getId()] = workflow;
        };

        self.getWorkflows = function() {
          return spec.workflows;
        };

        return self;
      };

      exporter.Workflow = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        self.getLabel = function() {
          return spec.label;
        };

        self.getProcess = function() {
          return spec.process;
        };

        return self;
      };

      exporter.Role = function(spec) {
        var self;

        self = {};

        self.getCode = function() {
          return spec.code;
        };

        return self;
      };

      exporter.TechnicalEmployee = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        self.getName = function() {
          return spec.name;
        };

        return self;
      };

      exporter.Contract = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        return self;
      };

      exporter.RegularEmployee = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        /* By contract id */
        self.getContracts = function() {
          return spec.contracts;
        };

        self.getName = function() {
          return spec.name;
        };

        self.getProfession = function() {
          return spec.profession;
        };

        self.getAdministrativeApprover = function() {
          return spec.administrativeApprover;
        };

        self.setAdministrativeApprover = function(administrativeApprover) {
          spec.administrativeApprover = administrativeApprover;
        };

        self.getFunctionalApprover = function() {
          return spec.functionalApprover;
        };

        self.setFunctionalApprover = function(functionalApprover) {
          spec.functionalApprover = functionalApprover;
        };

        self.getSubstitute = function() {
          return spec.substitute;
        };

        self.setSubstitute = function(substitute) {
          spec.substitute = substitute;
        };

        self.getAdministrator = function() {
          return spec.administrator;
        };

        self.setAdministrator = function(administrator) {
          spec.administrator = administrator;
        };

        self.getRoles = function() {
          return spec.roles;
        };

        self.getHighestRole = function() {
          var highestToLowest = _.filter(spec.roles, function(role){return role.getCode() != 4})
            .sort(function(role, other) {
            return role.getCode() < other.getCode();
          });
          return highestToLowest[0];
        };

        self.getCanSubstitute = function() {
          return _.filter(spec.roles, function(role){return role.getCode() == 4}).length > 0;
        };

        /* By contract id */
        self.getEmployers = function() {
          return spec.employers;
        };

        /* By employer id */
        self.getDepartments = function() {
          return spec.departments;
        };

        /* By process id */
        self.getWorkflows = function() {
          return spec.workflows;
        };

        return self;
      };

      exporter.Universe = function(spec) {
        var self;

        self = {};

        self.getId = function() {
          return spec.id;
        };

        self.getName = function() {
          return spec.name;
        };

        self.getEmployers = function() {
          return spec.employers;
        };

        self.getEmployer = function(employerId) {
          return spec.employers[employerId];
        };

        self.getProcesses = function() {
          return spec.processes;
        };

        self.getTechnicalEmployees = function() {
          return spec.technicalEmployees;
        };

        self.getRegularEmployees = function() {
          return spec.regularEmployees;
        };

        self.getEmployee = function(employeeId) {
          var regularEmployee = spec.regularEmployees[employeeId];
          return  regularEmployee ? regularEmployee : spec.technicalEmployees[employeeId];
        };

        return self;
      };

      exporter.Level.loadByEmployer = function(employerId) {
        return cerberusProxy.getLevelValues(employerId)
            .then(function(levels) {
              return Object.keys(levels).map(function(level) {
                var departments = {};
                levels[level].forEach(function(department) {
                  department = exporter.Department({code: department.code, label: department.label});
                  departments[department.getCode()] = department;
                });
                return exporter.Level({departments: departments});
              });
            });
      };

      exporter.Employer.loadAll = function() {
        return $.when.apply($, universe.employers.map(function(employer) {
          return exporter.Level.loadByEmployer(employer.id)
              .then(function(levels) {
                return exporter.Employer({
                  id: employer.id,
                  name: employer.name,
                  levels: levels
                });
              });
        }))
            .then(function() {
              var employers = Array.prototype.slice.call(arguments);
              return employers.reduce(function(employers, employer) {
                employers[employer.getId()] = employer;
                return employers;
              }, {});
            });
      };

      exporter.Process.loadAll = function() {
        return medusaProxy.getWorkflows()
            .then(function(workflows) {
              return workflows.reduce(function(processes, workflow) {
                var process = exporter.Process({id: workflow.processId, code: workflow.processCode});
                processes[process.getId()] = processes[process.getId()] || process;
                processes[process.getId()].addWorkflow(exporter.Workflow({
                  id: workflow.id,
                  label: workflow.label,
                  process: process
                }));
                return processes;
              }, {});
            });
      };

      exporter.TechnicalEmployee.loadAll = function() {
        return employees.technicals.reduce(function(technicalEmployees, technicalEmployee) {
          technicalEmployee = exporter.TechnicalEmployee({
            id: technicalEmployee.user,
            name: technicalEmployee.fullName
          });
          technicalEmployees[technicalEmployee.getId()] = technicalEmployee;
          return technicalEmployees;
        }, {});
      };

      exporter.RegularEmployee.loadAll = function(allEmployers, allProcesses) {
        return employees.reduce(function(regularEmployees, regularEmployee) {
          var employers = {};

          var contracts = regularEmployee.contracts.reduce(function(contracts, contractId) {
            var split = contractId.split("-");
            var ids = {contract: parseInt(split[1]), employer: parseInt(split[0])};
            employers[ids.contract] = allEmployers[ids.employer];
            contracts[ids.contract] = exporter.Contract({id: ids.contract});
            return contracts;
          }, {});

          var roles = Object.keys(regularEmployee.roles).reduce(function(roles, code) {
            if (regularEmployee.roles[code]) {
              roles.push(exporter.Role({code: code}));
            }
            return roles;
          }, []);

          var departments = Object.keys(employers).reduce(function(departments, contractId) {
            var employer = employers[contractId];
            departments[employer.getId()] = [
              employer.getLevels()[0].getDepartments()[parseInt(regularEmployee.level1)],
              employer.getLevels()[1].getDepartments()[parseInt(regularEmployee.level2)],
              employer.getLevels()[2].getDepartments()[parseInt(regularEmployee.level3)]
            ];
            return departments;
          }, {});

          var workflows = Object.keys(regularEmployee.workflow).reduce(function(workflows, processId) {
            workflows[processId] = allProcesses[processId].getWorkflows()[regularEmployee.workflow[processId]];
            return workflows;
          }, {});

          regularEmployee = exporter.RegularEmployee({
            id: regularEmployee.user,
            contracts: contracts,
            name: regularEmployee.fullName,
            profession: regularEmployee.profLabel,
            administrativeApprover: regularEmployee.positionAdministrative.manager,
            functionalApprover: regularEmployee.positionFunctional.manager,
            substitute: regularEmployee.positionAdministrator.substitute,
            administrator: regularEmployee.positionAdministrator.manager,
            roles: roles,
            employers: employers,
            departments: departments,
            workflows: workflows
          });
          regularEmployees[regularEmployee.getId()] = regularEmployee;
          return regularEmployees;
        }, {});
      };

      exporter.controller = function(table) {
        var self, titles, promise;

        self = {};
        titles = [
          translate("common.contract"),
          translate("common.name"),
          translate("common.employeeRole"),
          translate("hierarchy.role"),
          translate("hierarchy.canSubstitute"),
          translate("hierarchy.managerNames.administrative"),
          translate("hierarchy.managerNames.functional"),
          translate("hierarchy.managerNames.substitute"),
          translate("hierarchy.managerNames.administrator"),
          translate("hierarchy.managerNames.workflow1"),
          translate("hierarchy.managerNames.workflow2"),
          translate("hierarchy.employerId"),
          translate("hierarchy.employer"),
          translate("hierarchy.levels.level1"),
          translate("hierarchy.levels.level2"),
          translate("hierarchy.levels.level3")
        ];
        promise = $.when(exporter.Employer.loadAll(), exporter.Process.loadAll())
          .then(function(employers, processes) {
            var regularEmployees = exporter.RegularEmployee.loadAll(employers, processes);
            return $.when(employers, processes, exporter.TechnicalEmployee.loadAll(), regularEmployees);
          })
          .then(function(employers, processes, technicalEmployees, regularEmployees) {
            return exporter.Universe({id: universe.id, name: universe.name, employers: employers, processes: processes, technicalEmployees: technicalEmployees, regularEmployees: regularEmployees});
          })
          .then(function(universe) {
            Object.keys(universe.getRegularEmployees()).forEach(function(regularEmployeeId) {
              var regularEmployee = universe.getRegularEmployees()[regularEmployeeId];

              var administrativeApprover = universe.getEmployee(regularEmployee.getAdministrativeApprover());
              regularEmployee.setAdministrativeApprover(administrativeApprover);

              var functionalApprover = universe.getEmployee(regularEmployee.getFunctionalApprover());
              regularEmployee.setFunctionalApprover(functionalApprover);

              var substitute = universe.getEmployee(regularEmployee.getSubstitute());
              regularEmployee.setSubstitute(substitute);

              var administrator = universe.getEmployee(regularEmployee.getAdministrator());
              regularEmployee.setAdministrator(administrator);
            });
            return universe;
          });

        self.export = function() {
          promise.then(function(universe) {
            var rows = [];
            rows.push(titles);
            var selectedTableRows = table.rows(".checked", { order: 'current', search: 'applied', page: 'all' });
            var selectedNodes = selectedTableRows.nodes();
            if (selectedTableRows.data().length > 0) {
              selectedNodes.each(function(node) {
                var row = [];
                var regularEmployee = universe.getRegularEmployees()[node.dataset.id];
                var contract = regularEmployee.getContracts()[parseInt(node.dataset.contractId)];
                row.push(contract.getId());
                row.push(regularEmployee.getName());
                row.push(regularEmployee.getProfession());
                var highestRole = regularEmployee.getHighestRole();
                row.push(highestRole ? translate("hierarchy.roleNames." + highestRole.getCode()) : "");
                var canreplace = regularEmployee.getCanSubstitute();
                row.push(canreplace ? 1 : 0);
                var administrativeApprover = regularEmployee.getAdministrativeApprover();
                row.push(administrativeApprover ? administrativeApprover.getName() : "");
                var functionalApprover = regularEmployee.getFunctionalApprover();
                row.push(functionalApprover ? functionalApprover.getName() : "");
                var substitute = regularEmployee.getSubstitute();
                row.push(substitute ? substitute.getName() : "");
                var administrator = regularEmployee.getAdministrator();
                row.push(administrator ? administrator.getName() : "");
                var workflow100 = regularEmployee.getWorkflows()[100];
                row.push(workflow100 ? workflow100.getLabel() : "");
                var workflow101 = regularEmployee.getWorkflows()[101];
                row.push(workflow101 ? workflow101.getLabel() : "");
                var employer = regularEmployee.getEmployers()[contract.getId()];
                row.push(employer ? employer.getId() : "");
                row.push(employer ? employer.getName() : "");
                var level1 = regularEmployee.getDepartments()[employer.getId()][0];
                row.push(level1 ? level1.getLabel() : "");
                var level2 = regularEmployee.getDepartments()[employer.getId()][1];
                row.push(level2 ? level2.getLabel() : "");
                var level3 = regularEmployee.getDepartments()[employer.getId()][2];
                row.push(level3 ? level3.getLabel() : "");
                rows.push(row);
              });
              var byContractIdAscending = function(row, other) {
                return row[0] - other[0];
              };
              rows.sort(byContractIdAscending);
              var options = {
                fileName: "organigram_" + universe.getName() + "_" + moment().format("MM-DD-YYYY-HH-mm-ss")
              };
              export_array_to_excel(rows, options);
            }
          });
        };

        return self;
      };

      exporter.view = function(controller) {
        document.querySelector("#export-to-xls").disabled = true;
        document.querySelector("#export-to-xls").onclick = controller.export;
      };

      employeeDataProxy.init(function() {

        // create rows
        var data = '';
        for(var i = employees.length; i--;) {
          data = newGroupTableBoxRow(employees[i]) + data;
        }
        document.querySelector("#table-view-table > tbody").innerHTML = data;

        // init datatable
        initDataTable();

        exporter.view(exporter.controller($('#table-view-table').DataTable()));
      });

      window.copyToChangeBoxes = function(src) {
        function changeSelectedIndex(select, value) {
          var options = select.options;
          for(var i = options.length; i--;) {
            if(options[i].value == value) {
              select.selectedIndex = i;
              triggerChange(select);
              return;
            }
          }
          console.warn("Invalid admin here: ", src);
          select.selectedIndex = 0;
        }

        changeSelectedIndex(document.getElementById('selectAdministrator'), src.parentNode.getAttribute('data-administrator-id'));
        changeSelectedIndex(document.getElementById('selectAdminManager'), src.parentNode.getAttribute('data-administrative-id'));
        changeSelectedIndex(document.getElementById('selectFuncManager'), src.parentNode.getAttribute('data-functional-id'));
        // TODO: the other selects
      };

    })
  }

  //-------------------------------------------------------------
  function triggerChange(select) {
    if ("createEvent" in document) {
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", false, true);
      select.dispatchEvent(evt);

    } else if('fireEvent' in select) {
      select.fireEvent("onchange");

    } else {
      select.onchange && select.onchange({})
    }
  }

}
function TreeView(pxr, sizer, session) {
  // lazy loading (until click or preloaded)
  var initialized = false;
  $("#tree-view-link").click(initialize).on('click.checkBrowser', checkBrowser);
  setTimeout(preload, 0);

  // preloading code
  function preload() {
    pxr([ MedusaProxy ]).then(function(medusaProxy) { setTimeout(initialize, 250); });
  }

  // loading code
  function initialize() {
    if(initialized) { return } else { initialized = true }

    // get the proxies using the resolver
    pxr([ pxr.universe, MedusaProxy, UserPreferencesProxy ]).then(function(universe, medusaProxy, userPreferencesProxy) {
      var universeId = universe.id;

      //
      // Create the tab manager
      //
      window.i18n = window.getOrgchartI18n();
      var tabManager = window.tabManager = new TabManager(document.querySelector('.orgchart-tab-manager'), document.querySelector('.orgchart-tabview'), sizer);

      //
      // This code handles the drag & drop (mostly)
      //
      tabManager.createTabFrom['HierarchyNode[of:Employee]'] = function(node) {

        // open the explainer popup for buggy nodes, if needed
        try {
          if(node.hadLostNodes) {
            // only display it once
            if(!sessionStorage.hadLostNodes) {
              sessionStorage.hadLostNodes = true;
              // display it now
              $('#lost-nodes-modal').modal('show');
            }
          }
        } catch (ex) {
          setTimeout(function() { throw ex });
          showMessage(translate("common.stabilityWarning"));
        }

        var t1 = tabManager.appendChild();
        t1.dragSourceKind = 'HierarchyNode[of:Employee]';
        t1.dragSource = node;

        var h1 = new HTree(t1, node);
        return t1;

      };
      tabManager.createTabFrom['Universe'] = function(u) {
        var fill = function(t, d) {
          return _.template(t, d);
        };

        // create a new tab
        var t1 = tabManager.appendChild();

        // init the templates
        var img1 = '<img src="css/images/add.png" class="image" height="19" width="30" alt="[+]" />';
        var img2 = '<img src="css/images/add-white.png" class="hover-image" height="19" width="30" alt="[+]" />';

        var header = '<h1><%-eNM%></h1>';
        var button1 = '<button class="orgchart-tab-button" data-employer="<%-eID%>" onclick="addHierarchyTree(this,this.getAttribute(\'data-employer\'),\'administrator\')" style="opacity: 0.75;">' + img1 + img2 + translate('hierarchy.treeNames.administrator') + '</button>';
        var button2 = '<button class="orgchart-tab-button" data-employer="<%-eID%>" onclick="addHierarchyTree(this,this.getAttribute(\'data-employer\'),\'administrative\')">' + img1 + img2 + translate('hierarchy.treeNames.administrative') + '</button>';
        var button3 = '<button class="orgchart-tab-button" data-employer="<%-eID%>" onclick="addHierarchyTree(this,this.getAttribute(\'data-employer\'),\'functional\')">' + img1 + img2 + translate('hierarchy.treeNames.functional') + '</button>';
        var buttonD = '<button class="orgchart-tab-button" data-employer="<%-eID%>" onclick="addHierarchyTree(this,this.getAttribute(\'data-employer\'),\'demo\')">' + img1 + img2 + 'Demo ' + translate('hierarchy.treeNames.demo') + '</button>';

        //Retrait de l'arbre fonctionel
        // var group = header + button2 + button3 + button1;
				userPreferencesProxy.getUserPreferences('inholidays').then(function (preference){

				  var adminParameter = _.find(preference.preferences, function (param) {
				    return param.parameter.parameterId === "ORGANIGRAM_ADMINISTRATOR";
          })

          var functionalParameter = _.find(preference.preferences, function (param) {
				    return param.parameter.parameterId === "ORGANIGRAM_FUNCTIONAL";
          })

					var group = header + button2;
          var groups = '';

          if(!functionalParameter || functionalParameter.preference.paramValue === "true") {
            group += button3;
          }

          if(!adminParameter) {
            group += button1;
          }

          // add a few trees for each employer
          var employers = /*u.employers*/[{id: '', name: u.name}];
          for (var i = employers.length; i--;) {
            var eID = employers[i].id;
            var eNM = employers[i].name;
            groups = fill(group, {eNM: eNM, eID: eID}) + groups;
          }

          // in localhost, add a dummy tree
          if (location.href.indexOf('http://localhost') == 0) {
            groups += fill(header + buttonD, {eNM: translate('hierarchy.treeNames.demo'), eID: -1});
          }

          // wrap all trees in a section
          t1.innerHTML = '<section id="open-tab-wrapper"><img style="display: none" src="css/images/new-tab.png" onload="this.parentNode.parentNode.updateTabView()" />' + groups + '</div>';
          return t1;
				});
      };
      tabManager.createTabFrom['ondblclick'] = function() {
        addNewTab();
      };

      //
      // this code is called when the user creates a new tab
      //
      window.addHierarchyTree = function(button, employerId, managerType) {
        var demo_mode = managerType == 'demo';
        if(demo_mode) {

          var EMPL = (function() {
            var id = 0;
            var uid = 2600;
            return function EMPL(fn, ln, role) {
              return new Employee(id++, {
                universePersonId : uid++, firstName : fn, lastName: ln, name : ln, language : 'en', professionLabel : role
              });
            }
          })();

          var NODE = function(a, b, c, d) {
            return new HierarchyNode(a, b, c, d);
          };

          var NODE_EMPL = function(fn, ln, role, children, options) {
            return NODE(EMPL(fn, ln, role), children, options);
          };

          var n1 = NODE_EMPL("Martin", "Vif", "Directeur Général Compta",[
            NODE_EMPL("Loic", "Duchatelet", "Directeur de département", [
              NODE_EMPL("Eléonore", "de Becker", "Chef Compta", [
                NODE_EMPL("Amy", "Demeus", "Secrétaire", [])
              ]),
              NODE_EMPL("Anaïs", "Lucas", "Directeur marketing", [
                NODE_EMPL("Gilles", "Dekauweren", "Commercial", []),
                NODE_EMPL("Olivier", "Hastings", "Commercial", [])
              ]),
              NODE_EMPL("Thomas", "Vanpeersen", "Aide compta", [])
            ]),
            NODE_EMPL("Florian", "Lisp", "Secrétaire de direction", [])
          ]);

          var n2 = NODE_EMPL("Master", "Demeus van Peersen van Golem", "Directeur Général R&D", [
            NODE_EMPL("One", "Demeus", "Scientifique", []), NODE_EMPL("Two", "Demeus", "Scientifique", []),
            NODE_EMPL("Three", "Demeus", "Scientifique", []), NODE_EMPL("Four", "Demeus", "Scientifique", []),
            NODE_EMPL("Five", "Demeus", "Scientifique", []), NODE_EMPL("Six", "Demeus", "Scientifique", []),
            NODE_EMPL("Seven", "Demeus", "Scientifique", []), NODE_EMPL("Eight", "Demeus", "Scientifique", []),
            NODE_EMPL("Nine", "Demeus", "Scientifique", []), NODE_EMPL("Ten", "Demeus", "Scientifique", []),
            NODE_EMPL("Eleven", "Demeus", "Scientifique", [])
          ]);

          var n3 = NODE_EMPL("DEMO"/*new window.String("")*/, "Fast Company", "DEMO", [n1, n2], {fillColor : '#676B48', textColor : 'white', ghostFillColor : '#E5DFD9'});

          /***********************************
          var lostNodes = [
            NODE_EMPL("Lost employee", "First", "Manager", []),
            NODE_EMPL("Lost employee", "Second", "Manager", []),
            NODE_EMPL("Lost employee", "Third", "Manager", [])
          ];
          if(lostNodes.length > 0) {
            var data = new Employee(-1, {
              id: -1,
              firstName: translate('hierarchy.moveUpToInsertInTree'),
              lastName: translate('common.batchUpdate.nobody'),
              fullName: translate('common.batchUpdate.nobody'),
              professionLabel: translate('hierarchy.treeNames.'+managerType)
            });
            var lostNodesRoot = new HierarchyNode(data, lostNodes, { fillColor: '#C0504D', badgeColor: '#953734', strokeColor: "#A57778", textColor: 'white', ghostFillColor: '#E5DFD9' });
            lostNodesRoot.children.forEach(function(n) { n.fillColor="#F2DCDB"; n.textColor="#953734"; n.options.badgeColor=n.badgeColor="#C0504D" });
            n3.appendChild(lostNodesRoot);
            n3.hadLostNodes = true;
          } else {
            n3.hadLostNodes = false;
          }
          /***********************************/

          var t1 = window.t1 = tabManager.createTabFrom['HierarchyNode[of:Employee]'](window.n3 = n3);
          n3.value.universeId = universeId;
          n3.value.employerId = employerId;
          n3.value.managerType = managerType;
          tabManager.removeChild(button.parentNode.parentNode);

        } else {

          var employer = {id : employerId, name : JSON.parse(sessionStorage.universe).name+(employerId?" (E" + employerId+")":"")};
          var employers = universe.employers;
          for(var i = employers.length; i--;) {
            if(employer.id == employers[i].id) {
              employer = employers[i];
              break;
            }
          }
          function clearHightlights () {
            $('.orgchart-chart-drag-item.highlight').removeClass('highlight');
          }
          function renderCurrentHightlight (nodeElement) { useful.exists(nodeElement)? nodeElement.classList.add('highlight') : undefined; }
          function handleSelectedNode (element, tabActive) {
            clearHightlights ();
            var nodeElement = tabActive.querySelector('[data-node="'+element.id+'"]');
            renderCurrentHightlight (nodeElement);
          }
          function constructHashFromTree (o) {  // an iterative tree runner
            var stack = [o];
            var element;
            var hash = {};
            while (stack.length) {
              element = stack.pop ();
              stack = stack.concat (element.children);
              var id = element.value.data.id;
              if (useful.exists (id) && id>=0) { hash[element.value.data.id] = element; }
            }
            return hash;
          }
          function sortTextAlphabetically (a, b) {
            if(a.text < b.text) return -1;
            if(a.text > b.text) return 1;
            return 0;
          }
          var promise = medusaProxy.getHierarchyTree(employer, managerType);
          promise.done(function(node) {
            var t1 = tabManager.createTabFrom['HierarchyNode[of:Employee]'](node);
            tabManager.removeChild(button.parentNode.parentNode);
            var showInactiveNodesModal = node.value.data.managerType === "administrator" ? Utils.hasInactiveNodesWithChildren([node], true) : Utils.hasInactiveNodes([node], true);
            if (showInactiveNodesModal) {
              // only display it once
              if(!sessionStorage.hadInactiveNodes) {
                sessionStorage.hadInactiveNodes = true;
                // display it now
                $('#inactive-nodes-modal').modal('show');
              }
            }
            promise.request.done(function(data) {
              var allChoices = {};
              data.forEach(function (item, idx) {
                allChoices[item.id] = 
                  {id: idx, text: item.lastName+' '+item.firstName, data: item};
              });
              function constructLimitedChoices () {
                var result = [];

                var defaultChoices = Array.prototype.slice.call($('.orgchart-tab.active').find('[universe-id]')
                    .map(function() { return Number($(this).attr('universe-id')); }))
                  .filter(function(id) { return !isNaN(id); })
                  .map(function(id) { return allChoices[id]; })
                  .filter(function(item) { return useful.exists(item); });
                result = result.concat(defaultChoices);

                while (defaultChoices.length > 0) {
                  var subLevelChoices = [];
                  defaultChoices.forEach(function (item) {
                    Object.getOwnPropertyNames(allChoices).forEach(function (prop) {
                      if (allChoices[prop].data.manager === item.data.id && !result.some(function (resultItem) { return resultItem.data.id === allChoices[prop].data.id; })) {
                        subLevelChoices.push(allChoices[prop]);
                      }
                    });
                  });
                  result = result.concat(subLevelChoices);
                  defaultChoices = subLevelChoices;
                }

                return result;
              }
              var limitedChoices = constructLimitedChoices();
              limitedChoices.sort(sortTextAlphabetically);
              var $select2 = $("#orgchart-select-to-focus-on").select2({data: limitedChoices});
              $select2.siblings(".select2-container").css('display', 'inline-block');
              var last;
              $select2.off("change");
              var hash = constructHashFromTree(node);
              $select2.change(function (e) {
                if (useful.exists(e.added)) {
                  var id = e.added.data.id;
                  var $viewport = $('#orgchart-tab-manager-id').find('.active');
                  var $tabActive = $('.orgchart-tab.active');
                  var $found = $tabActive.find("[universe-id='"+id+"']");
                  while ($found.length === 0 && e.added.data.manager) {
                    id = e.added.data.manager;
                    $found = $tabActive.find("[universe-id='" + id + "']");
                  }
                  if ($found.length > 0) {
                    $viewport.animate({
                        scrollTop: $found.offset().top - $viewport.offset().top + $viewport.scrollTop(),
                        scrollLeft: $found.offset().left - $viewport.offset().left + $viewport.scrollLeft()
                    }, 1000);
                    handleSelectedNode (hash[id], $tabActive[0]);
                  }
                } else {
                  clearHightlights ();
                  renderCurrentHightlight ();
                }
              });
              var $treeView = $('#tree-view');
              $treeView.off('DOMSubtreeModified');
              $treeView.on('DOMSubtreeModified', function() {
                limitedChoices.length = 0;
                var buffer = constructLimitedChoices();
                buffer.forEach(function (item) { limitedChoices.push(item); });
                limitedChoices.sort(sortTextAlphabetically);
              }); 
            });
          });
        }

      };
      window.addNewTab = function() {
        var tab = tabManager.createTabFrom['Universe'](universe);
        tabManager.switchTo(tab);
      };
      document.getElementById("orgchart-tab-close-button").onclick = function() {
        tabManager.currentTab && tabManager.removeChild(tabManager.currentTab);
      };

      //
      // Fill the tab manager
      //

      addNewTab();

    })
  }

  // check browser
  function checkBrowser() {

    // disable the check
    $("#tree-view-link").off('click.checkBrowser');

    // warn about old browsers
    if((window.ActiveXObject && document.documentMode <= 10) || !("pointerEvents" in document.body.style)) {
      alert(translate('common.yourBrowserIsOutdated'));
    }

  }
}function UndoRedoView(pxr) {

  var medusaProxy; pxr(MedusaProxy).then(function(value) { medusaProxy=value; });

  window.addEventListener('keyup', function(e) {
    if(e.ctrlKey && !e.altKey) {
      if(e.keyCode == 90) {
        if(e.shiftKey) {

          // CTRL+SHIFT+Z
          undoredo.redo();
          e.stopImmediatePropagation();
          e.preventDefault();

        } else {

          // CTRL+Z
          undoredo.undo();
          e.stopImmediatePropagation();
          e.preventDefault();

        }
      } else if (e.keyCode == 89) {
        if(!e.shiftKey) {

          // CTRL+Y
          undoredo.redo();
          e.stopImmediatePropagation();
          e.preventDefault();

        }
      }
    }
  }, true);

  undoredo._commit = function showSaveConfirmDialog(callback) {

    var employees = undoredo._commit.employees;
    var changes; if($('#tree-view:visible').length==1) {

      // grab all tree changes available
      changes = undoredo.collectData();

      // merge duplicates (keep the last one for newValue, the first one for oldValue)
      var map = Object.create ? Object.create(null) : {};
      for(var i = changes.length; i--;) { var change = changes[i];

        // detect whether the change is the first of its kind
        var changeKey = change.employerId + '__' + change.propertyId + '__' + change.targetId;
        var existingChange = map[changeKey];
        if(existingChange) {

          // if the change is an old duplicate, only update the oldValue
          var newChange = _.clone(existingChange);
          newChange.oldValueId = change.oldValueId;
          newChange.oldValueDescription = change.oldValueDescription;
          map[changeKey] = newChange;

        } else {

          // if the change is the first of its kind, use it directly
          map[changeKey] = change;

        }
      }
      changes = _.values(map);

    } else if ($('#import-view:visible').length==1) {

      // grab changes from the imported file
      changes = getImportViewChanges();

    } else {

      // get the checked rows of the table
      var table = $('#table-view-table').DataTable();
      var rows = _.flatten(table.rows(".checked", { order: 'current', search: 'applied', page: 'all' }).nodes());
      var removedRows = _.flatten(table.rows(".checked", { order: 'current', search: 'removed', page: 'all' }).nodes());
      if(rows.length >= 1) {

        // warn if the selection contains removed rows
        if(removedRows.length != 0) {

          var person1 = removedRows[0].querySelector('span.name-col-value').textContent;

          var message = translate('personSearch.selectionIsFiltered_sing') + person1.toUpperCase() + translate('personSearch.willBeLeftUntouched_sing');
          if(removedRows.length >= 2) {
            var person2 = removedRows[1].querySelector('span.name-col-value').textContent;
            if(removedRows.length >= 3) {
              message = translate('personSearch.selectionIsFiltered_plur') + person1.toUpperCase() + ", " + person2.toUpperCase() + translate('personSearch.and') + (removedRows.length - 2) + translate('personSearch.more') + translate('personSearch.willBeLeftUntouched_plur');
            } else if(removedRows.length == 2) {
              message = translate('personSearch.selectionIsFiltered_plur') + person1.toUpperCase() + translate('personSearch.and') + person2.toUpperCase() + translate('personSearch.willBeLeftUntouched_plur');
            }
          }

          // let the user cancel the operation
          if(!confirm(message)) {
            showMessage(translate('common.operationCancelled'));
            callback && callback(false);
            return;
          }
        }

        // detect the current employer
        var selectEmployer = document.getElementById('selectEmployer');
        var employerId = selectEmployer.options[selectEmployer.selectedIndex].value;
        var employerName = selectEmployer.options[selectEmployer.selectedIndex].textContent;

        // create the list of changes
        changes = _.flatten(rows.map(function(row) {

          // list of changes to push
          var rowChanges = [];
          var targetId = row.getAttribute('data-id');
          var targetName = row.querySelector('span.name-col-value').textContent;

          var select, newId, newName, pushChange = function(managerType) {
            var oldValueId = row.getAttribute('data-'+managerType+'-id') || '-1';
            if(managerType == 'workflow100' || managerType == 'workflow101') {

              var oldValueOption = _.where(document.getElementById('selectWorkflow'+managerType.substr('workflow'.length)).options, {value : oldValueId}, true)[0];
              var oldValueName = oldValueOption ? oldValueOption.textContent : '(???)';

            } else {

              var oldValueName = _.find(employees, function(e) { return e.user == oldValueId; });
              if(oldValueId == '-1') {
                oldValueName = '(' + translate('common.batchUpdate.nobody') + ')';
              } else if(oldValueName) {
                oldValueName = oldValueName.fullName;
              } else if(!oldValueName) {
                oldValueName = _.find(employees.technicals, function(e) { return e.user == oldValueId; });
                if(oldValueName) {
                  oldValueName = oldValueName.fullName;
                } else {
                  console.warn('Invalid old manager here: ', oldValueId);
                  oldValueName = '(???)';
                }
              }
            }
            rowChanges.push({
              /* property */
              propertyId          : managerType,
              propertyDescription : translate("hierarchy.managerNames." + managerType),
              /* employer */
              employerId          : employerId,
              employerDescription : employerName,
              /* target */
              targetId            : targetId,
              targetDescription   : targetName,
              /* old value */
              oldValueId          : oldValueId,
              oldValueDescription : oldValueName,
              /* new value */
              newValueId          : newId,
              newValueDescription : newName
            });
          };

          // administrator
          select  =  document.getElementById('selectAdministrator');
          newId   =  select.options[select.selectedIndex].value;
          newName =  select.options[select.selectedIndex].textContent;
          if(newId !== '' && newId != undefined) {
            pushChange('administrator');
          }

          // administrative manager
          select  =  document.getElementById('selectAdminManager');
          newId   =  select.options[select.selectedIndex].value;
          newName =  select.options[select.selectedIndex].textContent;
          if(newId !== '' && newId != undefined) {
            pushChange('administrative');
          }

          // functional manager
          select  =  document.getElementById('selectFuncManager');
          newId   =  select.options[select.selectedIndex].value;
          newName =  select.options[select.selectedIndex].textContent;
          if(newId !== '' && newId != undefined) {
            pushChange('functional');
          }

          // other fields
          if(select.parentNode.parentNode.classList.contains('more-fields')) {

            // substitute
            select = document.getElementById('selectSubst');
            newId = select.options[select.selectedIndex].value;
            newName = select.options[select.selectedIndex].textContent;
            if(newId !== '' && newId != undefined) {
              pushChange('substitute');
            }

            // workflow
            select = document.getElementById('selectWorkflow100');
            newId = select.options[select.selectedIndex].value;
            newName = select.options[select.selectedIndex].textContent;
            if(newId !== '' && newId != undefined) {
              pushChange('workflow100');
            }

            // workflow
            select = document.getElementById('selectWorkflow101');
            newId = select.options[select.selectedIndex].value;
            newName = select.options[select.selectedIndex].textContent;
            if(newId !== '' && newId != undefined) {
              pushChange('workflow101');
            }

          }

          return rowChanges;

        }));

      }

    }

    // remove noop (could be the result of two opposed changes)
    if(changes) { changes = changes.filter(function(c) { return c.oldValueId !== c.newValueId; }); }

    // show the save confirmation dialog
    if(changes && changes.length > 0) {

      var dialog = document.getElementById("save-confirm-dialog");
      dialog.outerHTML = newSaveConfirmDialog({'changes':changes});
      dialog = $("#save-confirm-dialog");

      $("#save-confirm-dialog-table").dataTable({
        "order"           : [],
        "stripeClasses"   : [],
        "language"        : {
          "url" : '../cdn/DataTables/1.10.4/resources/language/' + PrestaWeb.traduction.getLanguage() + '.json'
        },
        "initComplete": function() {
          dialog.find('input[type="search"]').attr('placeholder',translate('common.search')+'...');
        }
      });

      dialog.modal('show');
      dialog.on('hidden.bs.modal', function () {
        callback && callback(false); callback = false;
      });

      $("#save-confirm-dialog-submit").click(function() {

        // firstly, setup the waiting dialog
        var final_callback = callback; callback = false;
        dialog.removeClass('fade').modal('hide'); $('#wait-dialog').removeClass('fade').modal('show');

        // then, setup the save request
        var changes_by_type = {
          "substitute"       : changes.filter(function(e) { return e.propertyId=="substitute";     }).map(function(e) { return {employee: e.targetId, manager:  e.newValueId }; }),
          "administrator"    : changes.filter(function(e) { return e.propertyId=="administrator";  }).map(function(e) { return {employee: e.targetId, manager:  e.newValueId }; }),
          "administrative"   : changes.filter(function(e) { return e.propertyId=="administrative"; }).map(function(e) { return {employee: e.targetId, manager:  e.newValueId }; }),
          "functional"       : changes.filter(function(e) { return e.propertyId=="functional";     }).map(function(e) { return {employee: e.targetId, manager:  e.newValueId }; }),
          "workflow100"      : changes.filter(function(e) { return e.propertyId=="workflow100";    }).map(function(e) { return {employee: e.targetId, workflow: e.newValueId, process: 100 }; }),
          "workflow101"      : changes.filter(function(e) { return e.propertyId=="workflow101";    }).map(function(e) { return {employee: e.targetId, workflow: e.newValueId, process: 101 }; })
        };
        changes_by_type =  {
          "substitute"       : changes_by_type.substitute,
          "administrator"    : changes_by_type.administrator,
          "administrative"   : changes_by_type.administrative,
          "functional"       : changes_by_type.functional,
          "workflow"         : [].concat(changes_by_type.workflow100, changes_by_type.workflow101)
        };
        console.log(changes_by_type);
        medusaProxy.updateTrees(changes_by_type).then(
          function(ok) {
            // success
            final_callback && final_callback(true);
          },
          function(ok) {
            // failure
            showMessage(translate('saveConfirmation.saveError'));
            final_callback && final_callback(false);
          }
        );

      });

    } else {

      if(undoredo.entryIndex > 0) {
        showMessage(translate('saveConfirmation.noopChanges'));
        undoredo.clearEntries();
        callback(false);
      } else {
        showMessage(translate('saveConfirmation.nothingToSave'));
        callback(false);
      }

    }

  };

}(function () {

if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

var prototype = Array.prototype,
    push = prototype.push,
    splice = prototype.splice,
    join = prototype.join;

function DOMTokenList(el) {
  this.el = el;
  // The className needs to be trimmed and split on whitespace
  // to retrieve a list of classes.
  var classes = el.className.replace(/^\s+|\s+$/g,'').split(/\s+/);
  for (var i = 0; i < classes.length; i++) {
    push.call(this, classes[i]);
  }
};

DOMTokenList.prototype = {
  add: function(token) {
    if(this.contains(token)) return;
    push.call(this, token);
    this.el.className = this.toString();
  },
  contains: function(token) {
    return this.el.className.indexOf(token) != -1;
  },
  item: function(index) {
    return this[index] || null;
  },
  remove: function(token) {
    if (!this.contains(token)) return;
    for (var i = 0; i < this.length; i++) {
      if (this[i] == token) break;
    }
    splice.call(this, i, 1);
    this.el.className = this.toString();
  },
  toString: function() {
    return join.call(this, ' ');
  },
  toggle: function(token) {
    if (!this.contains(token)) {
      this.add(token);
    } else {
      this.remove(token);
    }

    return this.contains(token);
  }
};

window.DOMTokenList = DOMTokenList;

function defineElementGetter (obj, prop, getter) {
    if (Object.defineProperty) {
        Object.defineProperty(obj, prop,{
            get : getter
        });
    } else {
        obj.__defineGetter__(prop, getter);
    }
}

defineElementGetter(Element.prototype, 'classList', function () {
  return new DOMTokenList(this);
});

})();
// Copyright (c) 2013 The Polymer Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
if (typeof WeakMap === 'undefined') {
  (function() {
    var defineProperty = Object.defineProperty;
    var counter = Date.now() % 1e9;

    var WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    WeakMap.prototype = {
      set: function(key, value) {
        var entry = key[this.name];
        if (entry && entry[0] === key)
          entry[1] = value;
        else
          defineProperty(key, this.name, {value: [key, value], writable: true});
      },
      get: function(key) {
        var entry;
        return (entry = key[this.name]) && entry[0] === key ?
            entry[1] : undefined;
      },
      delete: function(key) {
        this.set(key, undefined);
      }
    };

    window.WeakMap = WeakMap;
  })();
}

(function(scope) {
  scope = scope || {};
  scope.external = scope.external || {};
  var target = {
    shadow: function(inEl) {
      if (inEl) {
        return inEl.shadowRoot || inEl.webkitShadowRoot;
      }
    },
    canTarget: function(shadow) {
      return shadow && Boolean(shadow.elementFromPoint);
    },
    targetingShadow: function(inEl) {
      var s = this.shadow(inEl);
      if (this.canTarget(s)) {
        return s;
      }
    },
    olderShadow: function(shadow) {
      var os = shadow.olderShadowRoot;
      if (!os) {
        var se = shadow.querySelector('shadow');
        if (se) {
          os = se.olderShadowRoot;
        }
      }
      return os;
    },
    allShadows: function(element) {
      var shadows = [], s = this.shadow(element);
      while(s) {
        shadows.push(s);
        s = this.olderShadow(s);
      }
      return shadows;
    },
    searchRoot: function(inRoot, x, y) {
      if (inRoot) {
        var t = inRoot.elementFromPoint(x, y);
        var st, sr, os;
        // is element a shadow host?
        sr = this.targetingShadow(t);
        while (sr) {
          // find the the element inside the shadow root
          st = sr.elementFromPoint(x, y);
          if (!st) {
            // check for older shadows
            sr = this.olderShadow(sr);
          } else {
            // shadowed element may contain a shadow root
            var ssr = this.targetingShadow(st);
            return this.searchRoot(ssr, x, y) || st;
          }
        }
        // light dom element is the target
        return t;
      }
    },
    owner: function(element) {
      var s = element;
      // walk up until you hit the shadow root or document
      while (s.parentNode) {
        s = s.parentNode;
      }
      // the owner element is expected to be a Document or ShadowRoot
      if (s.nodeType != Node.DOCUMENT_NODE && s.nodeType != Node.DOCUMENT_FRAGMENT_NODE) {
        s = document;
      }
      return s;
    },
    findTarget: function(inEvent) {
      var x = inEvent.clientX, y = inEvent.clientY;
      // if the listener is in the shadow root, it is much faster to start there
      var s = this.owner(inEvent.target);
      // if x, y is not in this root, fall back to document search
      if (!s.elementFromPoint(x, y)) {
        s = document;
      }
      return this.searchRoot(s, x, y);
    }
  };
  scope.targetFinding = target;
  scope.findTarget = target.findTarget.bind(target);

  window.PointerEventsPolyfill = scope;
})(window.PointerEventsPolyfill);

(function() {
  function shadowSelector(v) {
    return 'body ^^ ' + selector(v);
  }
  function selector(v) {
    return '[touch-action="' + v + '"]';
  }
  function rule(v) {
    return '{ -ms-touch-action: ' + v + '; touch-action: ' + v + '; touch-action-delay: none; }';
  }
  var attrib2css = [
    'none',
    'auto',
    'pan-x',
    'pan-y',
    {
      rule: 'pan-x pan-y',
      selectors: [
        'pan-x pan-y',
        'pan-y pan-x'
      ]
    }
  ];
  var styles = '';
  attrib2css.forEach(function(r) {
    if (String(r) === r) {
      styles += selector(r) + rule(r) + '\n';
      styles += shadowSelector(r) + rule(r) + '\n';
    } else {
      styles += r.selectors.map(selector) + rule(r.rule) + '\n';
      styles += r.selectors.map(shadowSelector) + rule(r.rule) + '\n';
    }
  });
  var el = document.createElement('style');
  el.textContent = styles;
  document.head.appendChild(el);
})();

/**
 * This is the constructor for new PointerEvents.
 *
 * New Pointer Events must be given a type, and an optional dictionary of
 * initialization properties.
 *
 * Due to certain platform requirements, events returned from the constructor
 * identify as MouseEvents.
 *
 * @constructor
 * @param {String} inType The type of the event to create.
 * @param {Object} [inDict] An optional dictionary of initial event properties.
 * @return {Event} A new PointerEvent of type `inType` and initialized with properties from `inDict`.
 */
(function(scope) {
  // test for DOM Level 4 Events
  var NEW_MOUSE_EVENT = false;
  var HAS_BUTTONS = false;
  try {
    var ev = new MouseEvent('click', {buttons: 1});
    NEW_MOUSE_EVENT = true;
    HAS_BUTTONS = ev.buttons === 1;
  } catch(e) {
  }

  var MOUSE_PROPS = [
    'bubbles',
    'cancelable',
    'view',
    'detail',
    'screenX',
    'screenY',
    'clientX',
    'clientY',
    'ctrlKey',
    'altKey',
    'shiftKey',
    'metaKey',
    'button',
    'relatedTarget',
  ];

  var MOUSE_DEFAULTS = [
    false,
    false,
    null,
    null,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null
  ];

  function PointerEvent(inType, inDict) {
    inDict = inDict || {};
    // According to the w3c spec,
    // http://www.w3.org/TR/DOM-Level-3-Events/#events-MouseEvent-button
    // MouseEvent.button == 0 can mean either no mouse button depressed, or the
    // left mouse button depressed.
    //
    // As of now, the only way to distinguish between the two states of
    // MouseEvent.button is by using the deprecated MouseEvent.which property, as
    // this maps mouse buttons to positive integers > 0, and uses 0 to mean that
    // no mouse button is held.
    //
    // MouseEvent.which is derived from MouseEvent.button at MouseEvent creation,
    // but initMouseEvent does not expose an argument with which to set
    // MouseEvent.which. Calling initMouseEvent with a buttonArg of 0 will set
    // MouseEvent.button == 0 and MouseEvent.which == 1, breaking the expectations
    // of app developers.
    //
    // The only way to propagate the correct state of MouseEvent.which and
    // MouseEvent.button to a new MouseEvent.button == 0 and MouseEvent.which == 0
    // is to call initMouseEvent with a buttonArg value of -1.
    //
    // This is fixed with DOM Level 4's use of buttons
    var buttons;
    if (inDict.buttons || HAS_BUTTONS) {
      buttons = inDict.buttons;
    } else {
      switch (inDict.which) {
        case 1: buttons = 1; break;
        case 2: buttons = 4; break;
        case 3: buttons = 2; break;
        default: buttons = 0;
      }
    }

    var e;
    if (NEW_MOUSE_EVENT) {
      e = new MouseEvent(inType, inDict);
    } else {
      e = document.createEvent('MouseEvent');

      // import values from the given dictionary
      var props = {}, p;
      for(var i = 0; i < MOUSE_PROPS.length; i++) {
        p = MOUSE_PROPS[i];
        props[p] = inDict[p] || MOUSE_DEFAULTS[i];
      }

      // define the properties inherited from MouseEvent
      e.initMouseEvent(
        inType, props.bubbles, props.cancelable, props.view, props.detail,
        props.screenX, props.screenY, props.clientX, props.clientY, props.ctrlKey,
        props.altKey, props.shiftKey, props.metaKey, props.button, props.relatedTarget
      );
    }

    // make the event pass instanceof checks
    e.__proto__ = PointerEvent.prototype;

    // define the buttons property according to DOM Level 3 spec
    if (!HAS_BUTTONS) {
      // IE 10 has buttons on MouseEvent.prototype as a getter w/o any setting
      // mechanism
      Object.defineProperty(e, 'buttons', {get: function(){ return buttons; }, enumerable: true});
    }

    // Spec requires that pointers without pressure specified use 0.5 for down
    // state and 0 for up state.
    var pressure = 0;
    if (inDict.pressure) {
      pressure = inDict.pressure;
    } else {
      pressure = buttons ? 0.5 : 0;
    }

    // define the properties of the PointerEvent interface
    Object.defineProperties(e, {
      pointerId: { value: inDict.pointerId || 0, enumerable: true },
      width: { value: inDict.width || 0, enumerable: true },
      height: { value: inDict.height || 0, enumerable: true },
      pressure: { value: pressure, enumerable: true },
      tiltX: { value: inDict.tiltX || 0, enumerable: true },
      tiltY: { value: inDict.tiltY || 0, enumerable: true },
      pointerType: { value: inDict.pointerType || '', enumerable: true },
      hwTimestamp: { value: inDict.hwTimestamp || 0, enumerable: true },
      isPrimary: { value: inDict.isPrimary || false, enumerable: true }
    });
    return e;
  }

  // PointerEvent extends MouseEvent
  PointerEvent.prototype = Object.create(MouseEvent.prototype);

  // Define constants
  PointerEvent.prototype.POINTER_TYPE_UNAVAILABLE = PointerEvent.POINTER_TYPE_UNAVAILABLE = 'unavailable';
  PointerEvent.prototype.POINTER_TYPE_TOUCH = PointerEvent.POINTER_TYPE_TOUCH = 'touch';
  PointerEvent.prototype.POINTER_TYPE_PEN = PointerEvent.POINTER_TYPE_PEN = 'pen';
  PointerEvent.prototype.POINTER_TYPE_MOUSE = PointerEvent.POINTER_TYPE_MOUSE = 'mouse';

  // attach to window
  if (!scope.PointerEvent) {
    scope.PointerEvent = PointerEvent;
  }
})(window);

/**
 * This module implements an map of pointer states
 */
(function(scope) {
  var USE_MAP = window.Map && window.Map.prototype.forEach;
  var POINTERS_FN = function(){ return this.size; };
  function PointerMap() {
    if (USE_MAP) {
      var m = new Map();
      m.pointers = POINTERS_FN;
      return m;
    } else {
      this.keys = [];
      this.values = [];
    }
  }

  PointerMap.prototype = {
    set: function(inId, inEvent) {
      var i = this.keys.indexOf(inId);
      if (i > -1) {
        this.values[i] = inEvent;
      } else {
        this.keys.push(inId);
        this.values.push(inEvent);
      }
    },
    has: function(inId) {
      return this.keys.indexOf(inId) > -1;
    },
    'delete': function(inId) {
      var i = this.keys.indexOf(inId);
      if (i > -1) {
        this.keys.splice(i, 1);
        this.values.splice(i, 1);
      }
    },
    get: function(inId) {
      var i = this.keys.indexOf(inId);
      return this.values[i];
    },
    clear: function() {
      this.keys.length = 0;
      this.values.length = 0;
    },
    // return value, key, map
    forEach: function(callback, thisArg) {
      this.values.forEach(function(v, i) {
        callback.call(thisArg, v, this.keys[i], this);
      }, this);
    },
    pointers: function() {
      return this.keys.length;
    }
  };

  scope.PointerMap = PointerMap;
})(window.PointerEventsPolyfill);

(function(scope) {
  var CLONE_PROPS = [
    // MouseEvent
    'bubbles',
    'cancelable',
    'view',
    'detail',
    'screenX',
    'screenY',
    'clientX',
    'clientY',
    'ctrlKey',
    'altKey',
    'shiftKey',
    'metaKey',
    'button',
    'relatedTarget',
    // DOM Level 3
    'buttons',
    // PointerEvent
    'pointerId',
    'width',
    'height',
    'pressure',
    'tiltX',
    'tiltY',
    'pointerType',
    'hwTimestamp',
    'isPrimary',
    // event instance
    'type',
    'target',
    'currentTarget',
    'which'
  ];

  var CLONE_DEFAULTS = [
    // MouseEvent
    false,
    false,
    null,
    null,
    0,
    0,
    0,
    0,
    false,
    false,
    false,
    false,
    0,
    null,
    // DOM Level 3
    0,
    // PointerEvent
    0,
    0,
    0,
    0,
    0,
    0,
    '',
    0,
    false,
    // event instance
    '',
    null,
    null,
    0
  ];

  var HAS_SVG_INSTANCE = (typeof SVGElementInstance !== 'undefined');

  /**
   * This module is for normalizing events. Mouse and Touch events will be
   * collected here, and fire PointerEvents that have the same semantics, no
   * matter the source.
   * Events fired:
   *   - pointerdown: a pointing is added
   *   - pointerup: a pointer is removed
   *   - pointermove: a pointer is moved
   *   - pointerover: a pointer crosses into an element
   *   - pointerout: a pointer leaves an element
   *   - pointercancel: a pointer will no longer generate events
   */
  var dispatcher = {
    targets: new WeakMap(),
    handledEvents: new WeakMap(),
    pointermap: new scope.PointerMap(),
    eventMap: {},
    // Scope objects for native events.
    // This exists for ease of testing.
    eventSources: {},
    eventSourceList: [],
    /**
     * Add a new event source that will generate pointer events.
     *
     * `inSource` must contain an array of event names named `events`, and
     * functions with the names specified in the `events` array.
     * @param {string} name A name for the event source
     * @param {Object} source A new source of platform events.
     */
    registerSource: function(name, source) {
      var s = source;
      var newEvents = s.events;
      if (newEvents) {
        newEvents.forEach(function(e) {
          if (s[e]) {
            this.eventMap[e] = s[e].bind(s);
          }
        }, this);
        this.eventSources[name] = s;
        this.eventSourceList.push(s);
      }
    },
    register: function(element) {
      var l = this.eventSourceList.length;
      for (var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {
        // call eventsource register
        es.register.call(es, element);
      }
    },
    unregister: function(element) {
      var l = this.eventSourceList.length;
      for (var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {
        // call eventsource register
        es.unregister.call(es, element);
      }
    },
    contains: scope.external.contains || function(container, contained) {
      return container.contains(contained);
    },
    // EVENTS
    down: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerdown', inEvent);
    },
    move: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointermove', inEvent);
    },
    up: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerup', inEvent);
    },
    enter: function(inEvent) {
      inEvent.bubbles = false;
      this.fireEvent('pointerenter', inEvent);
    },
    leave: function(inEvent) {
      inEvent.bubbles = false;
      this.fireEvent('pointerleave', inEvent);
    },
    over: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerover', inEvent);
    },
    out: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointerout', inEvent);
    },
    cancel: function(inEvent) {
      inEvent.bubbles = true;
      this.fireEvent('pointercancel', inEvent);
    },
    leaveOut: function(event) {
      this.out(event);
      if (!this.contains(event.target, event.relatedTarget)) {
        this.leave(event);
      }
    },
    enterOver: function(event) {
      this.over(event);
      if (!this.contains(event.target, event.relatedTarget)) {
        this.enter(event);
      }
    },
    // LISTENER LOGIC
    eventHandler: function(inEvent) {
      // This is used to prevent multiple dispatch of pointerevents from
      // platform events. This can happen when two elements in different scopes
      // are set up to create pointer events, which is relevant to Shadow DOM.
      if (this.handledEvents.get(inEvent)) {
        return;
      }
      var type = inEvent.type;
      var fn = this.eventMap && this.eventMap[type];
      if (fn) {
        fn(inEvent);
      }
      this.handledEvents.set(inEvent, true);
    },
    // set up event listeners
    listen: function(target, events) {
      events.forEach(function(e) {
        this.addEvent(target, e);
      }, this);
    },
    // remove event listeners
    unlisten: function(target, events) {
      events.forEach(function(e) {
        this.removeEvent(target, e);
      }, this);
    },
    addEvent: scope.external.addEvent || function(target, eventName) {
      target.addEventListener(eventName, this.boundHandler);
    },
    removeEvent: scope.external.removeEvent || function(target, eventName) {
      target.removeEventListener(eventName, this.boundHandler);
    },
    // EVENT CREATION AND TRACKING
    /**
     * Creates a new Event of type `inType`, based on the information in
     * `inEvent`.
     *
     * @param {string} inType A string representing the type of event to create
     * @param {Event} inEvent A platform event with a target
     * @return {Event} A PointerEvent of type `inType`
     */
    makeEvent: function(inType, inEvent) {
      // relatedTarget must be null if pointer is captured
      if (this.captureInfo) {
        inEvent.relatedTarget = null;
      }
      var e = new PointerEvent(inType, inEvent);
      if (inEvent.preventDefault) {
        e.preventDefault = inEvent.preventDefault;
      }
      this.targets.set(e, this.targets.get(inEvent) || inEvent.target);
      return e;
    },
    // make and dispatch an event in one call
    fireEvent: function(inType, inEvent) {
      var e = this.makeEvent(inType, inEvent);
      return this.dispatchEvent(e);
    },
    /**
     * Returns a snapshot of inEvent, with writable properties.
     *
     * @param {Event} inEvent An event that contains properties to copy.
     * @return {Object} An object containing shallow copies of `inEvent`'s
     *    properties.
     */
    cloneEvent: function(inEvent) {
      var eventCopy = {}, p;
      for (var i = 0; i < CLONE_PROPS.length; i++) {
        p = CLONE_PROPS[i];
        eventCopy[p] = inEvent[p] || CLONE_DEFAULTS[i];
        // Work around SVGInstanceElement shadow tree
        // Return the <use> element that is represented by the instance for Safari, Chrome, IE.
        // This is the behavior implemented by Firefox.
        if (HAS_SVG_INSTANCE && (p === 'target' || p === 'relatedTarget')) {
          if (eventCopy[p] instanceof SVGElementInstance) {
            eventCopy[p] = eventCopy[p].correspondingUseElement;
          }
        }
      }
      // keep the semantics of preventDefault
      if (inEvent.preventDefault) {
        eventCopy.preventDefault = function() {
          inEvent.preventDefault();
        };
      }
      return eventCopy;
    },
    getTarget: function(inEvent) {
      // if pointer capture is set, route all events for the specified pointerId
      // to the capture target
      if (this.captureInfo) {
        if (this.captureInfo.id === inEvent.pointerId) {
          return this.captureInfo.target;
        }
      }
      return this.targets.get(inEvent);
    },
    setCapture: function(inPointerId, inTarget) {
      if (this.captureInfo) {
        this.releaseCapture(this.captureInfo.id);
      }
      this.captureInfo = {id: inPointerId, target: inTarget};
      var e = new PointerEvent('gotpointercapture', { bubbles: true });
      this.implicitRelease = this.releaseCapture.bind(this, inPointerId);
      document.addEventListener('pointerup', this.implicitRelease);
      document.addEventListener('pointercancel', this.implicitRelease);
      this.targets.set(e, inTarget);
      this.asyncDispatchEvent(e);
    },
    releaseCapture: function(inPointerId) {
      if (this.captureInfo && this.captureInfo.id === inPointerId) {
        var e = new PointerEvent('lostpointercapture', { bubbles: true });
        var t = this.captureInfo.target;
        this.captureInfo = null;
        document.removeEventListener('pointerup', this.implicitRelease);
        document.removeEventListener('pointercancel', this.implicitRelease);
        this.targets.set(e, t);
        this.asyncDispatchEvent(e);
      }
    },
    /**
     * Dispatches the event to its target.
     *
     * @param {Event} inEvent The event to be dispatched.
     * @return {Boolean} True if an event handler returns true, false otherwise.
     */
    dispatchEvent: scope.external.dispatchEvent || function(inEvent) {
      var t = this.getTarget(inEvent);
      if (t) {
        return t.dispatchEvent(inEvent);
      }
    },
    asyncDispatchEvent: function(inEvent) {
      setTimeout(this.dispatchEvent.bind(this, inEvent), 0);
    }
  };
  dispatcher.boundHandler = dispatcher.eventHandler.bind(dispatcher);
  scope.dispatcher = dispatcher;
  scope.register = dispatcher.register.bind(dispatcher);
  scope.unregister = dispatcher.unregister.bind(dispatcher);
})(window.PointerEventsPolyfill);

/**
 * This module uses Mutation Observers to dynamically adjust which nodes will
 * generate Pointer Events.
 *
 * All nodes that wish to generate Pointer Events must have the attribute
 * `touch-action` set to `none`.
 */
(function(scope) {
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
  var map = Array.prototype.map.call.bind(Array.prototype.map);
  var toArray = Array.prototype.slice.call.bind(Array.prototype.slice);
  var filter = Array.prototype.filter.call.bind(Array.prototype.filter);
  var MO = window.MutationObserver || window.WebKitMutationObserver;
  var SELECTOR = '[touch-action]';
  var OBSERVER_INIT = {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['touch-action']
  };

  function Installer(add, remove, changed, binder) {
    this.addCallback = add.bind(binder);
    this.removeCallback = remove.bind(binder);
    this.changedCallback = changed.bind(binder);
    if (MO) {
      this.observer = new MO(this.mutationWatcher.bind(this));
    }
  }

  Installer.prototype = {
    watchSubtree: function(target) {
      // Only watch scopes that can target find, as these are top-level.
      // Otherwise we can see duplicate additions and removals that add noise.
      //
      // TODO(dfreedman): For some instances with ShadowDOMPolyfill, we can see
      // a removal without an insertion when a node is redistributed among
      // shadows. Since it all ends up correct in the document, watching only
      // the document will yield the correct mutations to watch.
      if (scope.targetFinding.canTarget(target)) {
        this.observer.observe(target, OBSERVER_INIT);
      }
    },
    enableOnSubtree: function(target) {
      this.watchSubtree(target);
      if (target === document && document.readyState !== 'complete') {
        this.installOnLoad();
      } else {
        this.installNewSubtree(target);
      }
    },
    installNewSubtree: function(target) {
      forEach(this.findElements(target), this.addElement, this);
    },
    findElements: function(target) {
      if (target.querySelectorAll) {
        var result = target.querySelectorAll(SELECTOR);
        if(target.hasAttribute && target.hasAttribute('touch-action')) { return [].concat.apply([target],result); }
		return result;
      }
      return [];
    },
    removeElement: function(el) {
      this.removeCallback(el);
    },
    addElement: function(el) {
      this.addCallback(el);
    },
    elementChanged: function(el, oldValue) {
      this.changedCallback(el, oldValue);
    },
    concatLists: function(accum, list) {
      return accum.concat(toArray(list));
    },
    // register all touch-action = none nodes on document load
    installOnLoad: function() {
      document.addEventListener('DOMContentLoaded', this.installNewSubtree.bind(this, document));
    },
    isElement: function(n) {
      return n.nodeType === Node.ELEMENT_NODE;
    },
    flattenMutationTree: function(inNodes) {
      // find children with touch-action
      var tree = map(inNodes, this.findElements, this);
      // make sure the added nodes are accounted for
      tree.push(filter(inNodes, this.isElement));
      // flatten the list
      return tree.reduce(this.concatLists, []);
    },
    mutationWatcher: function(mutations) {
      mutations.forEach(this.mutationHandler, this);
    },
    mutationHandler: function(m) {
      if (m.type === 'childList') {
        var added = this.flattenMutationTree(m.addedNodes);
        added.forEach(this.addElement, this);
        var removed = this.flattenMutationTree(m.removedNodes);
        removed.forEach(this.removeElement, this);
      } else if (m.type === 'attributes') {
        this.elementChanged(m.target, m.oldValue);
      }
    }
  };

  if (!MO) {
    Installer.prototype.watchSubtree = function(){
      console.warn('PointerEventsPolyfill: MutationObservers not found, touch-action will not be dynamically detected');
    };
  }

  scope.Installer = Installer;
})(window.PointerEventsPolyfill);

(function (scope) {
  var dispatcher = scope.dispatcher;
  var pointermap = dispatcher.pointermap;
  // radius around touchend that swallows mouse events
  var DEDUP_DIST = 25;

  // handler block for native mouse events
  var mouseEvents = {
    POINTER_ID: 1,
    POINTER_TYPE: 'mouse',
    events: [
      'mousedown',
      'mousemove',
      'mouseup',
      'mouseover',
      'mouseout'
    ],
    register: function(target) {
      dispatcher.listen(target, this.events);
    },
    unregister: function(target) {
      dispatcher.unlisten(target, this.events);
    },
    lastTouches: [],
    // collide with the global mouse listener
    isEventSimulatedFromTouch: function(inEvent) {
      var lts = this.lastTouches;
      var x = inEvent.clientX, y = inEvent.clientY;
      for (var i = 0, l = lts.length, t; i < l && (t = lts[i]); i++) {
        // simulated mouse events will be swallowed near a primary touchend
        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DIST && dy <= DEDUP_DIST) {
          return true;
        }
      }
    },
    prepareEvent: function(inEvent) {
      var e = dispatcher.cloneEvent(inEvent);
      // forward mouse preventDefault
      var pd = e.preventDefault;
      e.preventDefault = function() {
        inEvent.preventDefault();
        pd();
      };
      e.pointerId = this.POINTER_ID;
      e.isPrimary = true;
      e.pointerType = this.POINTER_TYPE;
      return e;
    },
    mousedown: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var p = pointermap.has(this.POINTER_ID);
        // TODO(dfreedman) workaround for some elements not sending mouseup
        // http://crbug/149091
        if (p) {
          this.cancel(inEvent);
        }
        var e = this.prepareEvent(inEvent);
        pointermap.set(this.POINTER_ID, inEvent);
        dispatcher.down(e);
      }
    },
    mousemove: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        dispatcher.move(e);
      }
    },
    mouseup: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var p = pointermap.get(this.POINTER_ID);
        if (p && p.button === inEvent.button) {
          var e = this.prepareEvent(inEvent);
          dispatcher.up(e);
          this.cleanupMouse();
        }
      }
    },
    mouseover: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        dispatcher.enterOver(e);
      }
    },
    mouseout: function(inEvent) {
      if (!this.isEventSimulatedFromTouch(inEvent)) {
        var e = this.prepareEvent(inEvent);
        dispatcher.leaveOut(e);
      }
    },
    cancel: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.cancel(e);
      this.cleanupMouse();
    },
    cleanupMouse: function() {
      pointermap['delete'](this.POINTER_ID);
    }
  };

  scope.mouseEvents = mouseEvents;
})(window.PointerEventsPolyfill);

(function(scope) {
  var dispatcher = scope.dispatcher;
  var findTarget = scope.findTarget;
  var allShadows = scope.targetFinding.allShadows.bind(scope.targetFinding);
  var pointermap = dispatcher.pointermap;
  var touchMap = Array.prototype.map.call.bind(Array.prototype.map);
  // This should be long enough to ignore compat mouse events made by touch
  var DEDUP_TIMEOUT = 2500;
  var CLICK_COUNT_TIMEOUT = 200;
  var ATTRIB = 'touch-action';
  var INSTALLER;
  // The presence of touch event handlers blocks scrolling, and so we must be careful to
  // avoid adding handlers unnecessarily.  Chrome plans to add a touch-action-delay property
  // (crbug.com/329559) to address this, and once we have that we can opt-in to a simpler
  // handler registration mechanism.  Rather than try to predict how exactly to opt-in to
  // that we'll just leave this disabled until there is a build of Chrome to test.
  var HAS_TOUCH_ACTION_DELAY = false;
  
  // handler block for native touch events
  var touchEvents = {
    scrollType: new WeakMap(),
    events: [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel'
    ],
    register: function(target) {
      if (HAS_TOUCH_ACTION_DELAY) {
        dispatcher.listen(target, this.events);
      } else {
        INSTALLER.enableOnSubtree(target);
      }
    },
    unregister: function(target) {
      if (HAS_TOUCH_ACTION_DELAY) {
        dispatcher.unlisten(target, this.events);
      } else {
        // TODO(dfreedman): is it worth it to disconnect the MO?
      }
    },
    elementAdded: function(el) {
      var a = el.getAttribute(ATTRIB);
      var st = this.touchActionToScrollType(a);
      if (st) {
        this.scrollType.set(el, st);
        dispatcher.listen(el, this.events);
        // set touch-action on shadows as well
        allShadows(el).forEach(function(s) {
          this.scrollType.set(s, st);
          dispatcher.listen(s, this.events);
        }, this);
      }
    },
    elementRemoved: function(el) {
      this.scrollType['delete'](el);
      dispatcher.unlisten(el, this.events);
      // remove touch-action from shadow
      allShadows(el).forEach(function(s) {
        this.scrollType['delete'](s);
        dispatcher.unlisten(s, this.events);
      }, this);
    },
    elementChanged: function(el, oldValue) {
      var a = el.getAttribute(ATTRIB);
      var st = this.touchActionToScrollType(a);
      var oldSt = this.touchActionToScrollType(oldValue);
      // simply update scrollType if listeners are already established
      if (st && oldSt) {
        this.scrollType.set(el, st);
        allShadows(el).forEach(function(s) {
          this.scrollType.set(s, st);
        }, this);
      } else if (oldSt) {
        this.elementRemoved(el);
      } else if (st) {
        this.elementAdded(el);
      }
    },
    scrollTypes: {
      EMITTER: 'none',
      XSCROLLER: 'pan-x',
      YSCROLLER: 'pan-y',
      SCROLLER: /^(?:pan-x pan-y)|(?:pan-y pan-x)|auto$/
    },
    touchActionToScrollType: function(touchAction) {
      var t = touchAction;
      var st = this.scrollTypes;
      if (t === 'none') {
        return 'none';
      } else if (t === st.XSCROLLER) {
        return 'X';
      } else if (t === st.YSCROLLER) {
        return 'Y';
      } else if (st.SCROLLER.exec(t)) {
        return 'XY';
      }
    },
    POINTER_TYPE: 'touch',
    firstTouch: null,
    isPrimaryTouch: function(inTouch) {
      return this.firstTouch === inTouch.identifier;
    },
    setPrimaryTouch: function(inTouch) {
      // set primary touch if there no pointers, or the only pointer is the mouse
      if (pointermap.pointers() === 0 || (pointermap.pointers() === 1 && pointermap.has(1))) {
        this.firstTouch = inTouch.identifier;
        this.firstXY = {X: inTouch.clientX, Y: inTouch.clientY};
        this.scrolling = false;
        this.cancelResetClickCount();
      }
    },
    removePrimaryPointer: function(inPointer) {
      if (inPointer.isPrimary) {
        this.firstTouch = null;
        this.firstXY = null;
        this.resetClickCount();
      }
    },
    clickCount: 0,
    resetId: null,
    resetClickCount: function() {
      var fn = function() {
        this.clickCount = 0;
        this.resetId = null;
      }.bind(this);
      this.resetId = setTimeout(fn, CLICK_COUNT_TIMEOUT);
    },
    cancelResetClickCount: function() {
      if (this.resetId) {
        clearTimeout(this.resetId);
      }
    },
    touchToPointer: function(inTouch) {
      var e = dispatcher.cloneEvent(inTouch);
      // Spec specifies that pointerId 1 is reserved for Mouse.
      // Touch identifiers can start at 0.
      // Add 2 to the touch identifier for compatibility.
      e.pointerId = inTouch.identifier + 2;
      e.target = findTarget(e);
      e.bubbles = true;
      e.cancelable = true;
      e.detail = this.clickCount;
      e.button = 0;
      e.buttons = 1;
      e.width = inTouch.webkitRadiusX || inTouch.radiusX || 0;
      e.height = inTouch.webkitRadiusY || inTouch.radiusY || 0;
      e.pressure = inTouch.webkitForce || inTouch.force || 0.5;
      e.isPrimary = this.isPrimaryTouch(inTouch);
      e.pointerType = this.POINTER_TYPE;
      return e;
    },
    processTouches: function(inEvent, inFunction) {
      var tl = inEvent.changedTouches;
      var pointers = touchMap(tl, this.touchToPointer, this);
      // forward touch preventDefaults
      pointers.forEach(function(p) {
        p.preventDefault = function() {
          this.scrolling = false;
          this.firstXY = null;
          inEvent.preventDefault();
        };
      }, this);
      pointers.forEach(inFunction, this);
    },
    // For single axis scrollers, determines whether the element should emit
    // pointer events or behave as a scroller
    shouldScroll: function(inEvent) {
      if (this.firstXY) {
        var ret;
        var scrollAxis = this.scrollType.get(inEvent.currentTarget);
        if (scrollAxis === 'none') {
          // this element is a touch-action: none, should never scroll
          ret = false;
        } else if (scrollAxis === 'XY') {
          // this element should always scroll
          ret = true;
        } else {
          var t = inEvent.changedTouches[0];
          // check the intended scroll axis, and other axis
          var a = scrollAxis;
          var oa = scrollAxis === 'Y' ? 'X' : 'Y';
          var da = Math.abs(t['client' + a] - this.firstXY[a]);
          var doa = Math.abs(t['client' + oa] - this.firstXY[oa]);
          // if delta in the scroll axis > delta other axis, scroll instead of
          // making events
          ret = da >= doa;
        }
        this.firstXY = null;
        return ret;
      }
    },
    findTouch: function(inTL, inId) {
      for (var i = 0, l = inTL.length, t; i < l && (t = inTL[i]); i++) {
        if (t.identifier === inId) {
          return true;
        }
      }
    },
    // In some instances, a touchstart can happen without a touchend. This
    // leaves the pointermap in a broken state.
    // Therefore, on every touchstart, we remove the touches that did not fire a
    // touchend event.
    // To keep state globally consistent, we fire a
    // pointercancel for this "abandoned" touch
    vacuumTouches: function(inEvent) {
      var tl = inEvent.touches;
      // pointermap.pointers() should be < tl.length here, as the touchstart has not
      // been processed yet.
      if (pointermap.pointers() >= tl.length) {
        var d = [];
        pointermap.forEach(function(value, key) {
          // Never remove pointerId == 1, which is mouse.
          // Touch identifiers are 2 smaller than their pointerId, which is the
          // index in pointermap.
          if (key !== 1 && !this.findTouch(tl, key - 2)) {
            var p = value.out;
            d.push(this.touchToPointer(p));
          }
        }, this);
        d.forEach(this.cancelOut, this);
      }
    },
    touchstart: function(inEvent) {
      this.vacuumTouches(inEvent);
      this.setPrimaryTouch(inEvent.changedTouches[0]);
      this.dedupSynthMouse(inEvent);
      if (!this.scrolling) {
        this.clickCount++;
        this.processTouches(inEvent, this.overDown);
      }
    },
    overDown: function(inPointer) {
      var p = pointermap.set(inPointer.pointerId, {
        target: inPointer.target,
        out: inPointer,
        outTarget: inPointer.target
      });
      dispatcher.over(inPointer);
      dispatcher.enter(inPointer);
      dispatcher.down(inPointer);
    },
    touchmove: function(inEvent) {
      if (!this.scrolling) {
        if (this.shouldScroll(inEvent)) {
          this.scrolling = true;
          this.touchcancel(inEvent);
        } else {
          inEvent.preventDefault();
          this.processTouches(inEvent, this.moveOverOut);
        }
      }
    },
    moveOverOut: function(inPointer) {
      var event = inPointer;
      var pointer = pointermap.get(event.pointerId);
      // a finger drifted off the screen, ignore it
      if (!pointer) {
        return;
      }
      var outEvent = pointer.out;
      var outTarget = pointer.outTarget;
      dispatcher.move(event);
      if (outEvent && outTarget !== event.target) {
        outEvent.relatedTarget = event.target;
        event.relatedTarget = outTarget;
        // recover from retargeting by shadow
        outEvent.target = outTarget;
        if (event.target) {
          dispatcher.leaveOut(outEvent);
          dispatcher.enterOver(event);
        } else {
          // clean up case when finger leaves the screen
          event.target = outTarget;
          event.relatedTarget = null;
          this.cancelOut(event);
        }
      }
      pointer.out = event;
      pointer.outTarget = event.target;
    },
    touchend: function(inEvent) {
      this.dedupSynthMouse(inEvent);
      this.processTouches(inEvent, this.upOut);
    },
    upOut: function(inPointer) {
      if (!this.scrolling) {
        dispatcher.up(inPointer);
        dispatcher.out(inPointer);
        dispatcher.leave(inPointer);
      }
      this.cleanUpPointer(inPointer);
    },
    touchcancel: function(inEvent) {
      this.processTouches(inEvent, this.cancelOut);
    },
    cancelOut: function(inPointer) {
      dispatcher.cancel(inPointer);
      dispatcher.out(inPointer);
      dispatcher.leave(inPointer);
      this.cleanUpPointer(inPointer);
    },
    cleanUpPointer: function(inPointer) {
      pointermap['delete'](inPointer.pointerId);
      this.removePrimaryPointer(inPointer);
    },
    // prevent synth mouse events from creating pointer events
    dedupSynthMouse: function(inEvent) {
      var lts = scope.mouseEvents.lastTouches;
      var t = inEvent.changedTouches[0];
      // only the primary finger will synth mouse events
      if (this.isPrimaryTouch(t)) {
        // remember x/y of last touch
        var lt = {x: t.clientX, y: t.clientY};
        lts.push(lt);
        var fn = (function(lts, lt){
          var i = lts.indexOf(lt);
          if (i > -1) {
            lts.splice(i, 1);
          }
        }).bind(null, lts, lt);
        setTimeout(fn, DEDUP_TIMEOUT);
      }
    }
  };

  if (!HAS_TOUCH_ACTION_DELAY) {
    INSTALLER = new scope.Installer(touchEvents.elementAdded, touchEvents.elementRemoved, touchEvents.elementChanged, touchEvents);
  }

  scope.touchEvents = touchEvents;
})(window.PointerEventsPolyfill);

(function(scope) {
  var dispatcher = scope.dispatcher;
  var pointermap = dispatcher.pointermap;
  var HAS_BITMAP_TYPE = window.MSPointerEvent && typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE === 'number';
  var msEvents = {
    events: [
      'MSPointerDown',
      'MSPointerMove',
      'MSPointerUp',
      'MSPointerOut',
      'MSPointerOver',
      'MSPointerCancel',
      'MSGotPointerCapture',
      'MSLostPointerCapture'
    ],
    register: function(target) {
      dispatcher.listen(target, this.events);
    },
    unregister: function(target) {
      dispatcher.unlisten(target, this.events);
    },
    POINTER_TYPES: [
      '',
      'unavailable',
      'touch',
      'pen',
      'mouse'
    ],
    prepareEvent: function(inEvent) {
      var e = inEvent;
      if (HAS_BITMAP_TYPE) {
        e = dispatcher.cloneEvent(inEvent);
        e.pointerType = this.POINTER_TYPES[inEvent.pointerType];
      }
      return e;
    },
    cleanup: function(id) {
      pointermap['delete'](id);
    },
    MSPointerDown: function(inEvent) {
      pointermap.set(inEvent.pointerId, inEvent);
      var e = this.prepareEvent(inEvent);
      dispatcher.down(e);
    },
    MSPointerMove: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.move(e);
    },
    MSPointerUp: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.up(e);
      this.cleanup(inEvent.pointerId);
    },
    MSPointerOut: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.leaveOut(e);
    },
    MSPointerOver: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.enterOver(e);
    },
    MSPointerCancel: function(inEvent) {
      var e = this.prepareEvent(inEvent);
      dispatcher.cancel(e);
      this.cleanup(inEvent.pointerId);
    },
    MSLostPointerCapture: function(inEvent) {
      var e = dispatcher.makeEvent('lostpointercapture', inEvent);
      dispatcher.dispatchEvent(e);
    },
    MSGotPointerCapture: function(inEvent) {
      var e = dispatcher.makeEvent('gotpointercapture', inEvent);
      dispatcher.dispatchEvent(e);
    }
  };

  scope.msEvents = msEvents;
})(window.PointerEventsPolyfill);

/**
 * This module contains the handlers for native platform events.
 * From here, the dispatcher is called to create unified pointer events.
 * Included are touch events (v1), mouse events, and MSPointerEvents.
 */
(function(scope) {
  var dispatcher = scope.dispatcher;

  // only activate if this platform does not have pointer events
  if (window.navigator.pointerEnabled === undefined) {
    Object.defineProperty(window.navigator, 'pointerEnabled', {value: true, enumerable: true});

    if (window.navigator.msPointerEnabled) {
      var tp = window.navigator.msMaxTouchPoints;
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: tp,
        enumerable: true
      });
      dispatcher.registerSource('ms', scope.msEvents);
    } else {
      window.navigator.polymerPointerEnabled=true;
      dispatcher.registerSource('mouse', scope.mouseEvents);
      if (window.ontouchstart !== undefined) {
        dispatcher.registerSource('touch', scope.touchEvents);
      }
    }

    dispatcher.register(document);
  }
})(window.PointerEventsPolyfill);

(function(scope) {
  var dispatcher = scope.dispatcher;
  var n = window.navigator;
  var s, r;
  function assertDown(id) {
    if (!dispatcher.pointermap.has(id)) {
      throw new Error('InvalidPointerId');
    }
  }
  if (n.msPointerEnabled) {
    s = function(pointerId) {
      assertDown(pointerId);
      this.msSetPointerCapture(pointerId);
    };
    r = function(pointerId) {
      assertDown(pointerId);
      this.msReleasePointerCapture(pointerId);
    };
  } else {
    s = function setPointerCapture(pointerId) {
      assertDown(pointerId);
      dispatcher.setCapture(pointerId, this);
    };
    r = function releasePointerCapture(pointerId) {
      assertDown(pointerId);
      dispatcher.releaseCapture(pointerId, this);
    };
  }
  if (window.Element && !Element.prototype.setPointerCapture) {
    Object.defineProperties(Element.prototype, {
      'setPointerCapture': {
        value: s
      },
      'releasePointerCapture': {
        value: r
      }
    });
  }
})(window.PointerEventsPolyfill);

if(window.PointerEvent) { 
	PointerEvent.isMouse = function(e) {
		return e.pointerType == e.POINTER_TYPE_MOUSE || e.pointerType == 4 || e.pointerType == 'mouse';
	}
	PointerEvent.isTouch = function(e) {
		return e.pointerType == e.POINTER_TYPE_TOUCH || e.pointerType == 2 || e.pointerType == 'touch';
	}
	PointerEvent.isPen = function(e) {
		return e.pointerType == e.POINTER_TYPE_PEN || e.pointerType == 3 || e.pointerType == 'pen';
	}
}
if(!window.requestFullscreen) {
  window.getFullscreenElement = function() {
    return (
    document.fullscreenElement || document.fullScreenElement
    || document.msFullscreenElement || document.mozFullscreenElement || document.webkitFullscreenElement
    || document.msFullScreenElement || document.mozFullScreenElement || document.webkitFullScreenElement
    );
  };
  window.requestFullscreen = function(element) {
    console.log('fullscreen requested');
    if(element.requestFullscreen) { element.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
    if(element.requestFullScreen) { element.requestFullScreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if(element.msRequestFullscreen) { element.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if(element.msRequestFullScreen) { element.msRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if (element.mozRequestFullscreen) { element.mozRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if (element.mozRequestFullScreen) { element.mozRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if (element.webkitRequestFullscreen) { element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT); }
    else if (element.webkitRequestFullScreen) { element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); }
    else {
      try { document.fullscreenElement = element; } catch (ex) {}
      document.documentElement.className += ' fullscreen';
      element.style.position='fixed';
      element.style.top=element.style.left=element.style.right=element.style.bottom='0px';
    }
    var evt = document.createEvent('UIEvents');
    evt.initUIEvent('resize', true, false, window, 0);
    window.dispatchEvent(evt);
  };
  window.exitFullscreen = function() {
    if(document.exitFullscreen) { document.exitFullscreen(); }
    else if(document.cancelFullscreen) { document.cancelFullscreen(); }
    else if(document.exitFullScreen) { document.exitFullScreen(); }
    else if(document.cancelFullScreen) { document.cancelFullScreen(); }
    else if(document.msExitFullscreen) { document.msExitFullscreen(); }
    else if(document.msCancelFullscreen) { document.msCancelFullscreen(); }
    else if(document.msExitFullScreen) { document.msExitFullScreen(); }
    else if(document.msCancelFullScreen) { document.msCancelFullScreen(); }
    else if(document.mozExitFullScreen) { document.mozExitFullScreen(); }
    else if(document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
    else if(document.mozExitFullscreen) { document.mozExitFullscreen(); }
    else if(document.mozCancelFullscreen) { document.mozCancelFullscreen(); }
    else if(document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
    else if(document.webkitCancelFullscreen) { document.webkitCancelFullscreen(); }
    else if(document.webkitExitFullScreen) { document.webkitExitFullScreen(); }
    else if(document.webkitCancelFullScreen) { document.webkitCancelFullScreen(); }
    else if(document.fullscreenElement) {
      document.documentElement.className = (' '+document.documentElement.className+' ').replace(/\s+fullscreen\s+/, ' ');
      var element = document.fullscreenElement;
      element.style.position='';
      element.style.top=element.style.left=element.style.right=element.style.bottom='';
      try { document.fullscreenElement = null; } catch (ex) {}
    }
    var evt = document.createEvent('UIEvents');
    evt.initUIEvent('resize', true, false, window, 0);
    window.dispatchEvent(evt);
  };
}

window.toggleFullscreen = function(element) {
  if(getFullscreenElement()) {
    exitFullscreen();
  } else {
    requestFullscreen(element);
  }
};void function() {
	var s = document.documentElement.style;
	var transition = (
		'transition' in s ? 'transition' : 
		'oTransition' in s ? 'oTransition' :
		'msTransition' in s ? 'msTransition' :
		'MsTransition' in s ? 'MsTransition' :
		'mozTransition' in s ? 'mozTransition' :
		'webkitTransition' in s ? 'webkitTransition' :
		'transition'
	);
	var transform = (
		'transform' in s ? 'transform' : 
		'oTransform' in s ? 'oTransform' :
		'msTransform' in s ? 'msTransform' :
		'MsTransform' in s ? 'MsTransform' :
		'mozTransform' in s ? 'mozTransform' :
		'webkitTransform' in s ? 'webkitTransform' :
		'transform'
	);
	var animation = (
		'animation' in s ? 'animation' : 
		'oAnimation' in s ? 'oAnimation' :
		'msAnimation' in s ? 'msAnimation' :
		'MsAnimation' in s ? 'MsAnimation' :
		'mozAnimation' in s ? 'mozAnimation' :
		'webkitAnimation' in s ? 'webkitAnimation' :
		'animation'
	);
	var alignItems = (
		'alignItems' in s ? 'alignItems' : 
		'oAlignItems' in s ? 'oAlignItems' :
		'msAlignItems' in s ? 'msAlignItems' :
		'MsAlignItems' in s ? 'MsAlignItems' :
		'mozAlignItems' in s ? 'mozAlignItems' :
		'webkitAlignItems' in s ? 'webkitAlignItems' :
		'alignItems'
	);
	var justifyContent = (
		'justifyContent' in s ? 'justifyContent' : 
		'oJustifyContent' in s ? 'oJustifyContent' :
		'msJustifyContent' in s ? 'msJustifyContent' :
		'MsJustifyContent' in s ? 'MsJustifyContent' :
		'mozJustifyContent' in s ? 'mozJustifyContent' :
		'webkitJustifyContent' in s ? 'webkitJustifyContent' :
		'justifyContent'
	);
	window.CSSPROP_TRANSITION = transition;
	window.CSSPROP_TRANSFORM = transform;
	window.CSSPROP_ANIMATION = animation;
	window.CSSPROP_ALIGN_ITEMS = alignItems;
	window.CSSPROP_JUSTIFY_CONTENT = justifyContent;
}();
//
// Translated texts
//

var getOrgchartI18n = 
	function() {
		var translate = (window.Framework && window.Framework.Traduction) ? window.Framework.Traduction.translate : null;
		var translate = translate || ((window.PrestaWeb && window.PrestaWeb.traduction) ? window.PrestaWeb.traduction.translate : function(){});
		return {
			noLoop: translate('orgchart.noLoop') || 'Creating loops in the tree is not authorized.',
			noParent: translate('orgchart.noParent') || 'This person does not have a parent.',
			chooseEnhancedActions: translate('orgchart.chooseEnhancedActions') || 'Choose among the following options:',
			chooseBasicAction: translate('orgchart.chooseBasicAction') || 'Or go back to the previous application:',
			returnToPreviousPage: translate('orgchart.returnToPreviousPage') || 'Return to the previous page',
			returnTo: translate('orgchart.returnTo') || 'Return to ',
			thisTab: translate('orgchart.thisTab') || 'this tab',
			closeThisTab: translate('orgchart.closeThisTab') || 'Close this tab',
			reopen: translate('orgchart.reopen') || 'Reopen ',
			noFirstName: translate('orgchart.noFirstName') || "[No first name]",
			noLastName: translate('orgchart.noLastName') || "[No last name]",
			pleaseTwoNodes: translate('orgchart.pleaseTwoNodes') || 'Two nodes have to be selected for this action to work',
			openMe: translate('orgchart.openMe') || 'Open Me in new tab',
			openN1: translate('orgchart.openN1') || 'Open N+1 in new tab',
			openN2: translate('orgchart.openN2') || 'Open N+2 in new tab',
			selectAllChildren: translate('orgchart.selectAllChildren') || 'Select all beneath me',
			swapRoles: translate('orgchart.swapRoles') || 'Swap the roles of selection',
			employee_s: translate('orgchart.employee_s') || ' employee(s)',
			displayOptions: translate('orgchart.displayOptions') || 'Display options',
			showChildren: translate('orgchart.showChildren') || 'Show children',
			autoDisplay: translate('orgchart.autoDisplay') || 'Automatically',
			alwaysDisplay: translate('orgchart.alwaysDisplay') || 'Always',
			neverDisplay: translate('orgchart.neverDisplay') || 'Never',
			layoutMode: translate('orgchart.layoutMode') || 'Layout mode',
			autoLayout: translate('orgchart.autoLayout') || 'Automatic layout',
			defaultLayout: translate('orgchart.defaultLayout') || 'Default layout',
			twoColumnsLayout: translate('orgchart.twoColumnsLayout') || 'Two-Columns Layout',
			oneColumnLayout: translate('orgchart.oneColumnLayout') || 'One-Column Layout',
			nodeCompress: translate('orgchart.nodeCompress') || 'Compress layout',
			newTab: {
				universe_primary: translate('orgchart.newTab.universe_primary') || 'Universe ',
				universe_secondary: translate('orgchart.newTab.universe_secondary') || 'Double-click the nodes below',
				employer_primary: translate('orgchart.newTab.employer_primary') || '',
				employer_secondary: translate('orgchart.newTab.employer_secondary') || 'Double-click to open all trees',
				graph_administrative_primary: translate('orgchart.newTab.graph_administrative_primary') || 'Administrative Tree',
				graph_administrator_primary: translate('orgchart.newTab.graph_administrator_primary') || 'Administrator Tree',
				graph_functional_primary: translate('orgchart.newTab.graph_functional_primary') || 'Functional Tree',
				graph_secondary: translate('orgchart.newTab.graph_secondary') || 'See nodes below',
			}
		}
	};
var i18n = getOrgchartI18n();
//
// IMPORTANT:
// ============================================================================
// Compatibility changes have been made to this file.
// Please don't update to another version without carefully recovering hacks.
// ============================================================================
//

/*
 * Context.js
 * Copyright Jacob Kelley
 * MIT License
 */

var context = context || (function () {
  
	var options = {
		fadeSpeed: 100,
		filter: function ($obj) {
			// Modify $obj, Do not return
		},
		above: 'auto',
		preventDoubleContext: true,
		compress: false
	};

  var nativePointerEnabled = navigator.pointerEnabled && !navigator.polymerPointerEnabled;
	function initialize(opts) {
		
		options = $.extend({}, options, opts);
		$(document).on(nativePointerEnabled ? 'pointerdown' : 'mousedown', 'html', hideContextMenu);
		$(document).on(nativePointerEnabled ? 'pointerup'   : 'mouseup'  , 'html', hideContextMenu);
		$(document).on(nativePointerEnabled ? 'pointerdown' : 'mousedown', '.dropdown-context', function(e) { e.keepContextMenu=true; e.stopPropagation(); });
		window.addEventListener('touchstart', hideContextMenu);
		if(options.preventDoubleContext){
			$(document).on('contextmenu', '.dropdown-context', function (e) {
				e.preventDefault(); e.stopPropagation();
			});
			$(document).on('contextmenu', 'html', hideContextMenu);
		}
		var onmouseenter = function(){
			var $sub = $(this).find('.dropdown-context-sub:first'),
				subWidth = $sub.width(),
				subLeft = $sub.offset().left,
				collision = (subWidth+subLeft) > window.innerWidth;
			if(collision){
				$sub.addClass('drop-left');
			}
		};
		initialize.startListeningForMouseEnter = function() {
			$(document).on('mouseenter', '.dropdown-submenu', onmouseenter);
			$(document).on('touchstart', '.dropdown-submenu', onmouseenter);
			for (var i = initialize.clickEvents.length; i--;) {
				var clickEvent = initialize.clickEvents[i];
				var element = document.getElementById(clickEvent.actionID);
				if(element) {
					element.onclick = clickEvent.eventAction;
				}
			}
		};
		initialize.stopListeningForMouseEnter = function() {
			$(document).off('mouseenter', '.dropdown-submenu', onmouseenter);
			$(document).off('touchstart', '.dropdown-submenu', onmouseenter);
		};
		initialize.clickEvents = initialize.clickEvents||[];

	}

	function hideContextMenu(e) {
		
		// default system to avoid hiding the menu
		if(e && e.keepContextMenu) { return; }
		
		// more complex one for touch devices & submenus
		if(e && e.target && ((nativePointerEnabled && e instanceof window.PointerEvent) ? window.PointerEvent.isTouch(e) : 'ontouchstart' in window)) {
			var target = e.target; do { 
				if(target.classList && target.classList.contains('dropdown-submenu')) { return; }
				if(e.type=='touchstart' || e.type=='mousedown' || e.type=='pointerdown') {
					if(target.classList && target.classList.contains('dropdown-menu')) { return; }
				}
			} while(target=target.parentNode);
		}
		
		//debugger; try { throw new Error('test'); } catch (ex) { console.log(ex.stack, e.type, e.target); }
		$('.dropdown-context:visible').fadeOut(options.fadeSpeed, function(){
			$('.dropdown-context').css({display:''}).find('.drop-left').removeClass('drop-left');
			initialize.stopListeningForMouseEnter();
		});
	}
	
	function updateOptions(opts){
		options = $.extend({}, options, opts);
	}

		function buildMenu(data, id, subMenu) {
			var subClass = (subMenu) ? ' dropdown-context-sub' : '';
			var compressed = options.compress ? ' compressed-context' : ''
			var $menu = $('<ul class="dropdown-menu dropdown-context' + subClass + compressed + '" id="dropdown-' + id + '"></ul>');
			var i = 0, linkTarget = '';
			for(i; i < data.length; i++) {
				try {
					if(typeof data[i].divider !== 'undefined') {
						$menu.append('<li class="divider"></li>');
					} else if(typeof data[i].header !== 'undefined') {
						$menu.append('<li class="nav-header">' + data[i].header + '</li>');
					} else {
						if(typeof data[i].href == 'undefined') {
							data[i].href = 'javascript:void(0)';
						}
						if(typeof data[i].target !== 'undefined') {
							linkTarget = ' target="' + data[i].target + '"';
						}
						if(typeof data[i].subMenu !== 'undefined') {
							$sub = ('<li class="dropdown-submenu"><a wtf-tabindex="-1" href="' + data[i].href + '">' + data[i].text + '</a></li>');
						} else {
							$sub = $('<li><a wtf-tabindex="-1" href="' + data[i].href + '"' + linkTarget + '>' + data[i].text + '</a></li>');
						}
						if(typeof data[i].action !== 'undefined') {
							var actiond = new Date(), actionID = 'event-' + actiond.getTime() * Math.floor(Math.random() * 100000), eventAction = (function(f) { return function(e) { try { hideContextMenu(); } finally { f(e) } } })(data[i].action);
							$sub.find('a').attr('id', actionID);
							$('#' + actionID).addClass('context-event');
							initialize.clickEvents.push({actionID : actionID, eventAction : eventAction});
						}
						$menu.append($sub);
						if(typeof data[i].subMenu != 'undefined') {
							var subMenuData = buildMenu(data[i].subMenu, id, true);
							$menu.find('li:last').append(subMenuData);
						}
					}
					if(typeof options.filter == 'function') {
						options.filter($menu.find('li:last'));
					}
				} catch (ex) {
					showMessage(translate('common.stabilityProblems'));
					setTimeout(function() { throw ex; }, 0);
					break;
				}
			}
			return $menu;
		}

	function addContext(selector, data) {
		
		var d = new Date(),
			id = d.getTime(),
			$menu = buildMenu(data, id);
		
		var appended = false;
		
		$(document).on('contextmenu', selector, function (e) {
			e.preventDefault();
			e.stopPropagation();

			$('.dropdown-context:not(.dropdown-context-sub)').hide();
			if(!appended) { 
				
				// append the menu to the DOM
				$('body').append($menu);
				initialize.startListeningForMouseEnter();

				// make sure we never leak something
				setInterval(function() {
					
					if($(selector).length == 0) {
						$menu.remove();
					}
					
				}, 10000);
				
			}
			
			$dd = $('#dropdown-' + id);
			var autoH = $dd.height() + 12;
			var autoW = $dd.width() + 4;
			var autoL = Math.min(window.innerWidth - autoW - 3, Math.max(3, e.pageX - 13));
			
			// assistve technology: auto focus the menu
			if(document.activeElement==e.target && !window.context.fromPointer) {
				var link = document.querySelector('#dropdown-'+id).querySelector('a');
				var onmove = function() { link.blur(); window.removeEventListener('pointermove', onmove, true); }
				window.addEventListener('pointermove', onmove, true);
				requestAnimationFrame(function() {
					link.focus();
				});
			}
			
			// ...
			window.context.fromPointer = false;
			if (options.above === true) {
				$dd.addClass('dropdown-context-up').css({
					top: e.pageY - 20 - $('#dropdown-' + id).height(),
					left: autoL
				}).fadeIn(options.fadeSpeed);
			} else if (options.above === 'auto') {
				$dd.removeClass('dropdown-context-up');
				if ((e.pageY + autoH) >= window.innerHeight - 36) {
					$dd.addClass('dropdown-context-up').css({
						top: e.pageY - 20 - autoH,
						left: autoL
					}).fadeIn(options.fadeSpeed);
				} else {
					$dd.css({
						top: e.pageY + 10,
						left: autoL
					}).fadeIn(options.fadeSpeed);
				}
			}
		});
	}
	
	function destroyContext(selector) {
		$(document).off('contextmenu', selector).off('click', '.context-event');
		if(appended) { $menu.remove(); }
	}

	// setup fakes to avoid race conditions
	initialize.startListeningForMouseEnter = function() { console.warn('fake initialized.startListeningForMouseEnter used') };
	initialize.stopListeningForMouseEnter = function() { console.warn('fake initialized.stopListeningForMouseEnter used') };
	initialize.clickEvents = initialize.clickEvents||[];

	return {
		init: initialize,
		settings: updateOptions,
		attach: addContext,
		destroy: destroyContext,
		fromPointer: false
	};
})();var enableTrueHistoryHook = false;
function HistoryManager() { var This = this;
	this.entries = [];
	this.zeroEntry = this.createEntry(i18n.returnToPreviousPage, function() { history.go(enableTrueHistoryHook ? -2 : -1); });
	this.toggleBackmenu = function(e) {

		var div = document.getElementById('backmenu');
		if(div) { div.parentNode.removeChild(div); return; }

		// filter entries to check legal ones
		This.entries = This.entries.filter(function(e) { return !e.isStillValid || e.isStillValid() });
		if(This.entries.length >= 2) {

			// display a config dialog
			var div = document.createElement("div");
			div.id = "backmenu";

			// add history entries (up to 5)
			div.appendChild(document.createElement('x-header'));
			div.lastChild.textContent = i18n.chooseEnhancedActions;
			for(var i = This.entries.length-1, j=0; i-- && j<5; j++) { var entry = This.entries[i];

				// update image
				if(entry.image) { cloneCanvas(entry.image, entry.querySelector('canvas')); }

				// append
				div.appendChild(This.entries[i]);
				div.appendChild(document.createElement('div'));

			}

			// add the zero entry
			div.appendChild(document.createElement('x-separator'));
			div.appendChild(document.createElement('x-header'));
			div.lastChild.textContent = i18n.chooseBasicAction;
			This.zeroEntry.textContent = i18n.returnToPreviousPage;
			div.appendChild(This.zeroEntry);

			// append to the body
			document.body.appendChild(div);

			// focus
			div.querySelector('button').focus();

		} else {

			var txt = translate('orgchart.noEvent');
			enableTrueHistoryHook && history.go(-1);
			!enableTrueHistoryHook && (window.showMessage ? window.showMessage(txt) : alert(txt));

		}

	};

	enableTrueHistoryHook && history.pushState('HistoryManager.Entry', 'HistoryManager.Entry');
	enableTrueHistoryHook && window.addEventListener('load', function() {
		setTimeout(function() {
			window.addEventListener('popstate', this.toggleBackmenu, 2000);
		})
	});

}

HistoryManager.prototype = {

	addHistoryEntry: function(buttonContent, action, isStillValid) {

		// check the entry identity
		var indexOf = -1; if('id' in buttonContent) {
			this.entries.some(function(entry, i) {
				if(entry.id=='history-entry-' + buttonContent.id) {
					indexOf=i; return true;
				} else {
					return false;
				}
			})
		}

		if(indexOf == -1) {

			// create a new entry
			var button = this.createEntry(buttonContent, action, isStillValid);
			if('id' in buttonContent) { button.id='history-entry-'+buttonContent.id; }
			this.entries.push(button);

			// filter entries
			this.entries = this.entries.filter(function(e) { return !e.isStillValid || e.isStillValid() });
			if(this.entries.length >= 15) { this.entries.shift(); }

		} else {

			// move the existing entry
			this.entries.push(this.entries.splice(indexOf, 1)[0]);

		}

	},

	createEntry: function(buttonContent, action, isStillValid) { var This=this;

		var button = document.createElement('button');
		button.onclick = function(e) {
			// put the clicked entry on the top of the history
			This.entries.splice(This.entries.indexOf(this),1);
			This.entries.push(this);
			// restore the pre-back-button state
			enableTrueHistoryHook && history.pushState('HistoryManager.Entry', 'HistoryManager.Entry');
			document.body.removeChild(this.parentNode);
			// perform the history-restoring action
			action();
		};

		button.image = buttonContent.image;
		button.isStillValid = isStillValid;

		if(typeof(buttonContent)=="string") {
			button.innerHTML = buttonContent;
		} else if ("image" in buttonContent && "text" in buttonContent) {
			button.appendChild(document.createTextNode(buttonContent.text));
			button.appendChild(document.createElement('br'));
			if(buttonContent.image) { button.appendChild(cloneCanvas(buttonContent.image)); }
		} else {
			button.appendChild(buttonContent);
		}

		return button;

	}
};

history.manager = new HistoryManager();

function cloneCanvas(canvas, nc) {
	nc = nc || document.createElement('canvas');
	nc.width = canvas.width;
	nc.height = canvas.height;
	nc.getContext('2d').drawImage(canvas, 0, 0);
	return nc;
}
var UndoRedoManager = function UndoRedoManager(enforceCommit) {
	this.entries = [];
	this.entryIndex = 0;
	this.enforceCommit = typeof(enforceCommit)=="function" ? enforceCommit : null;
}

UndoRedoManager.prototype = {
	
	// adds a new undo action
	push: function(undo, redo, description, metadata) {
		var newEntry = { undo: undo, redo: redo, description: description, data: metadata };
		this.entries[this.entryIndex++] = newEntry;
		this.entries.length = this.entryIndex;
		this.checkCommitStatus();
		return newEntry;
	},
	
	// returns the action to undo
	pop: function() {
		
		if(this.entryIndex<=0) { 
			return null;
		}
		
		var action = this.entries[--this.entryIndex];
		this.checkCommitStatus();
		return action;
		
	},
	
	// returns the action to redo
	unpop: function() {
		
		if(this.entryIndex>=this.entries.length) { 
			return null;
		}
		
		var action = this.entries[this.entryIndex++];
		this.checkCommitStatus();
		return action;
		
	},
	
	// unpop an action, and redo it
	redo: function() {
		var action = this.unpop();
		return action ? action.redo() : showMessage(translate('undoredo.nothingToRedo'));
	},
	
	// pop an action, and undo it
	undo: function() {
		var action = this.pop();
		return action ? action.undo() : showMessage(translate('undoredo.nothingToUndo'));
	},
	
	// check commit status
	checkCommitStatus: function() {
		if(this.enforceCommit) {
			if(this.entryIndex > 0) {
				window.onbeforeunload = this.enforceCommit;
			} else {
				window.onbeforeunload = null;
			}
		}
	},
	
	// clear entries
	clearEntries: function() {
		this.entries.length=this.entryIndex=0;
		this.checkCommitStatus();
	},
	
	// collect data
	collectData: function(filter) {
		var asArray = function asArray(a) { return (a instanceof Array) ? a : [a]; }
		var data = this.entries.slice(0,this.entryIndex).reduce(function(a,b) { return a.concat(asArray(b.data)); }, []);
		var data = filter ? data.filter(filter) : data;
		return data;
	},
	
	// commit
	_commit: function() { throw new Error("Not implemented"); },
	commit: function(callback) { var This = this;
		try { 
			this._commit(function(ok,data) { 
				if(ok) {
					This.clearEntries(); callback && callback(true,data);
					setTimeout(function() { location.reload(); }, 0);
				} else {
					callback && callback(false,data);
				}
			}); 
		} catch(ex) {
			if(callback) {
				callback(false, ex);
			} else {
				throw ex;
			}
		}
	}
	
};

var undoredo = new UndoRedoManager(function() {

	document.getElementById("orgchart-tab-save-button").classList.add('hover');
	setTimeout(function() { setTimeout(function() { document.getElementById("orgchart-tab-save-button").classList.remove('hover'); }, 3000) }, 0);
	return translate('undoredo.pleaseCancelSomeChangesAreNotSaved');
	
});function TabManager(element, tabviewElement, sizer) { var This = this;

	this.id = TabManager.FREE_ID++;
	this.element = element;
	this.tabviewElement = tabviewElement;
	this.sizer = sizer;

	this.element.setAttribute("data-tab-manager-id", this.id);
	this.currentTab = element.querySelector('.active.orgchart-tab');

	this.tabviewElement.setAttribute("touch-action", "none");

	this.createTabFrom = Object.create ? Object.create(null) : {};
	this.tabviewElement.addEventListener('pointerover', function(e) { if((e.originalTarget||e.target)!==this) { return; }
		if(DragAndDrop.sourceKind && e.pointerId==DragAndDrop.pid && !this.dragDisabled) {
			var createTabFrom = This.createTabFrom[DragAndDrop.sourceKind];
			if(createTabFrom) {
				this.classList.add('ondropvalid');
				DragAndDrop.updateDestination('TabView',This,function() { var tve = This.tabviewElement; tve.dragDisabled=false; tve.classList.remove('ondropvalid'); });
			} else {
				this.classList.add('ondropinvalid');
			}
		}
	});

	this.tabviewElement.addEventListener('pointerout', function(e) { if((e.originalTarget||e.target)!==this) { return; }
		this.classList.remove('ondropvalid');
		this.classList.remove('ondropinvalid');
		DragAndDrop.releaseDestination(This);
	});

	this.tabviewElement.addEventListener('pointerup', function(e) {
		if(this.className != 'orgchart-tabview') {
			this.classList.remove('ondropvalid');
			this.classList.remove('ondropinvalid');
		}
		if(this.childNodes.length==0 && !PointerEvent.isMouse(e)) {
			This.createTabFrom['ondblclick'] && This.createTabFrom['ondblclick']();
		}
	});

	this.tabviewElement.addEventListener('dblclick', function(e) { if(e.target!=this) { return; }
		This.createTabFrom['ondblclick'] && This.createTabFrom['ondblclick']();
	});

	var onresize = function() {

		onresize.timer = 0;
		var elm = This.currentTab;

		// give a chance to the sizer to act on the new conditions
		var sizer = This.sizer; if(sizer) {
			This.element.style.minWidth = sizer.getTabWidth() * This.element.children.length;
			This.element.style.height = sizer.getTabHeight();
			This.element.style.top = sizer.getPos().top;
			This.element.style.left = sizer.getPos().left;
			var tab = This.element.firstElementChild; while(tab) {
				tab.style.width = sizer.getTabWidth();
				tab.style.height = sizer.getTabHeight();
				tab = tab.nextElementSibling;
			}
		} else {
			This.element.style.minWidth = '';
			This.element.style.height = '';
			This.element.style.top = '';
			This.element.style.left = '';
			var tab = This.element.firstElementChild; while(tab) {
				tab.style.width = '';
				tab.style.height = '';
				tab = tab.nextElementSibling;
			}
		}

		// translate the viewport to the new location
		if(!elm) { return; }
		This.element.style[CSSPROP_TRANSFORM] = "translate(-"+elm.offsetLeft+"px, 0px)";
		This.element.style[CSSPROP_TRANSFORM] = "translateZ(0px) translate(-"+elm.offsetLeft+"px, 0px)";

	};
	window.addEventListener('resize', function() { if(!onresize.timer) { onresize.timer = requestAnimationFrame(onresize); } });
	onresize(); this.onresize = onresize;

}

TabManager.FREE_ID = 0;

TabManager.prototype = {

	switchTo: function(elm, noHistoryEntry) {
		if(elm && elm.parentNode === this.element && elm != this.currentTab) {

			// remove the focus from the currently active tab
			var blurEvent = document.createEvent('Event'); blurEvent.initEvent("blur", true, true);
			this.currentTab && this.currentTab.classList.remove('active');
			this.currentTab && this.currentTab.tabview && this.currentTab.tabview.classList.remove('active');
			this.currentTab && this.currentTab.dispatchEvent(blurEvent);

			// translate the viewport to the new location
			this.onresize();
			this.element.style[CSSPROP_TRANSFORM] = "translate(-"+elm.offsetLeft+"px, 0px)";
			this.element.style[CSSPROP_TRANSFORM] = "translateZ(0px) translate(-"+elm.offsetLeft+"px, 0px)";

			// focus the newly active tab
			var focusEvent = document.createEvent('Event'); focusEvent.initEvent("focus", true, true);
			this.currentTab = elm; elm.classList.add('active'); elm.tabview && elm.tabview.classList.add('active');
			elm.dispatchEvent(focusEvent);

			// add an history entry
			if(!noHistoryEntry) { this._addHistoryEntry(elm); }

		}
	},

	_switchTo: function(id) { var This = this;
		return function() {
			var tab = This.element.querySelector('[data-tab-id="'+id+'"]');
			tab && This.switchTo(tab, true);
		}
	},

	_addHistoryEntry: function(elm) {
		history.manager.addHistoryEntry(
			{
				text: i18n.returnTo + (elm.dragSource ? elm.dragSource.toString() : i18n.thisTab),
				image: elm.tabview, id: 'switchTo-'+elm.getAttribute('data-tab-id')
			},
			this._switchTo(elm.getAttribute ? elm.getAttribute('data-tab-id') : elm),
			function() {
				return !!elm.parentNode;
			}
		);
	},

	appendChild: function(elm, previousTab) { var This = this;

		// create a div
		var id = TabManager.FREE_ID++;
		var div = document.createElement("div");
		div.setAttribute("data-tab-manager-id", this.id);
		div.setAttribute("data-tab-id", id);
		div.className = "orgchart-tab";
		div.id = "tab"+this.id+"-"+id;

		// fill its content
		if(typeof(elm)=="string") { div.innerHTML = elm; }
		else if (elm) { div.appendChild(elm); }

		// add to the tab manager
		this.element.insertBefore(div, previousTab||null); //https://github.com/mbostock/d3/issues/1566
		this.element.style.minWidth = this.element.childNodes.length+'00vw'; this.onresize();

		// if there's a tabview
		if(this.tabviewElement) {

			// create a thumbnail image
			var img = document.createElement('canvas');
			img.setAttribute("data-tab-id", id); img.id = "TABVIEW-"+id;
			img.className = 'orgchart-tabview-item '+((div==this.currentTab)?'active':'');
			img.width = 200; img.height = 100;
			img.setAttribute('touch-action','none');
			var img_onclick = function() { This.switchTo(div); }
			img.addEventListener('pointerdown', function(e) {
				if('which' in e ? e.which == 1 : (e.button&1 == 1)) { e.preventDefault();

					var pid = e.pointerId;
					var started = false; var stopped = false;
					img.style[CSSPROP_TRANSFORM] = "translate(0px,0px)";
					img.style.zIndex='100';

					var startX = e.clientX, dx = 0;
					var startY = e.clientY, dy = 0;

					var onmove = function(e) { if(e.pointerId!=pid) { return; }
						if(!started && !stopped) {
							dx = e.clientX - startX;
							dy = e.clientY - startY;
							if(dx*dx+dy*dy >= (PointerEvent.isMouse(e) ? 25 : 100)) {
								started = true;
							}
						}
						if(started && !stopped) {

							dx = e.clientX - startX;
							dy = e.clientY - startY;
							var effectiveDy = Math.abs(dy);
							var effectiveDy = (dy>0?+1:-1) * Math.max(0, effectiveDy-30);
							var effectiveDy = Math.min(4,Math.max(-4,effectiveDy*effectiveDy*effectiveDy/1000));

							img.style[CSSPROP_TRANSFORM] = "translate("+dx+"px,"+effectiveDy+"px)";
							var moved = Math.round(dx / img.offsetWidth);
							if(moved>=0) {
								var currentMoved = 0;
								var current = img; while(currentMoved++,current=current.nextElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "translate(-"+(currentMoved<=moved ? img.offsetWidth+10 : 0)+"px,0px)";
								}
								var current = img; while(current=current.previousElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
								}
							} else {
								var currentMoved = 0; moved = -moved;
								var current = img; while(currentMoved++,current=current.previousElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "translate(+"+(currentMoved<=moved ? img.offsetWidth+10 : 0)+"px,0px)";
								}
								var current = img; while(current=current.nextElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
								}
							}

							if(effectiveDy <= -4 && !DragAndDrop.sourceKind && div.dragSourceKind) {
								This.tabviewElement.dragDisabled = true; img.style.opacity='0.2';
								DragAndDrop.beginDrag(div.dragSourceKind, div.dragSource, function() { This.tabviewElement.dragDisabled = false; img.style.opacity=''; }, e);
							} else if (effectiveDy == 0 && DragAndDrop.source && DragAndDrop.source == div.dragSource) {
								This.tabviewElement.dragDisabled = false; img.style.opacity='';
								DragAndDrop.abortDrag();
							}

						}
					}

					var onup = function(e) { if(e.pointerId!=pid) { return; }
						stopped=true;
						img.style[CSSPROP_TRANSFORM]='';
						img.style.zIndex='';
						if(DragAndDrop.source && DragAndDrop.source == div.dragSource) { e.preventDefault();

							var current = img; while(current=current.previousElementSibling) {
								current.style[CSSPROP_TRANSFORM] = "";
							}
							var current = img; while(current=current.nextElementSibling) {
								current.style[CSSPROP_TRANSFORM] = "";
							}
							DragAndDrop.endDrag();

						} else if(e.type=='pointercancel') {

							var current = img; while(current=current.previousElementSibling) {
								current.style[CSSPROP_TRANSFORM] = "";
							}
							var current = img; while(current=current.nextElementSibling) {
								current.style[CSSPROP_TRANSFORM] = "";
							}

						} else if(started) { e.preventDefault();

							var moved = Math.round(dx / img.offsetWidth); var target = null;
							if(moved>=0) {
								var currentMoved = 0;
								var current = img; while(currentMoved++,current=current.nextElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
									if(currentMoved<=moved) { target=current.nextSibling; }
								}
								var current = img; while(current=current.previousElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
								}
							} else {
								var currentMoved = 0; moved = -moved;
								var current = img; while(currentMoved++,current=current.previousElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
									if(currentMoved<=moved) { target=current; }
								}
								var current = img; while(current=current.nextElementSibling) {
									current.style[CSSPROP_TRANSFORM] = "";
								}
							}

							if(moved != 0) {
								var parentNode = img.parentNode;
								parentNode.removeChild(img);
								parentNode.insertBefore(img, target);

								var imgTab = img ? This.element.querySelector('[data-tab-id="'+img.getAttribute('data-tab-id')+'"]') : null;
								var targetTab = target ? This.element.querySelector('[data-tab-id="'+target.getAttribute('data-tab-id')+'"]') : null;
								This.element.removeChild(imgTab);
								This.element.insertBefore(imgTab, targetTab);
								This._resetTransform();

							}

						} else {
							img_onclick(e);
						}
						window.removeEventListener('pointermove', onmove, true);
						window.removeEventListener('pointerup', onup, true);
						window.removeEventListener('pointercancel', onup, true);

					}

					window.addEventListener('pointermove', onmove, true);
					window.addEventListener('pointerup', onup, true);
					window.addEventListener('pointercancel', onup, true);
					e.preventDefault();
					return false;

				} else if('which' in e ? e.which == 2 : (e.button&2 == 2)) {
					This.removeChild(div);
					e.preventDefault(); return false;
				}
			});
			img.addEventListener('pointerover', function(e) {
				if(DragAndDrop.sourceKind && e.pointerId==DragAndDrop.pid && !This.tabviewElement.dragDisabled) {
					img.timer = setTimeout(function() { img_onclick(); }, 200);
				}
			});
			img.addEventListener('pointerout', function() {
				clearTimeout(img.timer);
			});

			div.tabview = img;
			div.updateTabView = function() {

				requestAnimationFrame(function() {
					var source = div.querySelector('canvas,img');

					var wRatio = 200 / source.width;
					var hRatio = 100 / source.height;
					var mRatio = Math.min(wRatio, hRatio);

					if(mRatio <= 0.75 * wRatio) { mRatio = 0.75 * wRatio; }

					var mWidth = mRatio * source.width;
					var mHeight = mRatio * source.height;

					var canvas = img.getContext('2d');
					canvas.clearRect(0, 0, 200, 100);
					canvas.drawImage(source, (200 - mWidth) / 2, Math.max(0, (100 - mHeight) / 2), mWidth, mHeight);

				});

			};
			this.tabviewElement.insertBefore(img, previousTab?previousTab.tabview:null);
			window.context && window.context.attach("#"+img.id, [{ text:i18n.closeThisTab, href:"javascript:void(0)", action: function(e) { This.removeChild(div); e.preventDefault(); } }]);

		}

		// mark as active if only child
		if(!this.currentTab) { this.currentTab = div; div.classList.add('active'); img.classList.add('active'); this._addHistoryEntry(div); }

		return div;
	},

	removeChild: function(elm) {

		// firstly, add an history entry if possible
		if(this.createTabFrom[elm.dragSourceKind]) {
			this._addReopenHistoryEntry(elm.dragSource, elm.dragSourceKind, elm.tabview);
		}

		// get the previous and following tabs
		var prev = elm.previousElementSibling;
		var next = elm.nextElementSibling;

		// if there's a next element & it will receive the focus
		// -> make it snap its current position initially
		if(next && this.currentTab == elm) {

			// disable transitions while we maintain statu-quo
			next.style[CSSPROP_TRANSITION] = 'none';
			window.getComputedStyle && window.getComputedStyle(next)[CSSPROP_TRANSITION];

			// modify margin to maintain statu-quo
			next.style.marginLeft = elm.offsetWidth + "px";
			window.getComputedStyle && window.getComputedStyle(next).marginLeft;

			// reset to default transition style
			next.style[CSSPROP_TRANSITION] = '';
			window.getComputedStyle && window.getComputedStyle(next)[CSSPROP_TRANSITION];

			// reset to default margin style
			next.style.marginLeft = '';
			window.getComputedStyle && window.getComputedStyle(next).marginLeft;

		}

		// actually remove the tab
		this.element.removeChild(elm);
		this.element.style.minWidth = this.element.childNodes.length+'00vw';
		if(elm.tabview) { this.tabviewElement.removeChild(elm.tabview); }

		// if the tab was currently active, fix the situation
		if(this.currentTab == elm) {

			// focus the next tab, if there's any
			// otherwise, focus the previous tab
			if(next) {

				// the viewport is already right, we just need to change the active class
				this.currentTab = next;
				next.classList.add('active');
				if(next.tabview) next.tabview.classList.add('active');
				this._addHistoryEntry(next);

			} else if(prev) {

				// the viewport is wrong, let's fix this
				this.currentTab = null;
				this.switchTo(prev);

			} else {

				// there are no more tabs here (too bad!)
				this.currentTab = null;
				this.element.style[CSSPROP_TRANSFORM] = "translate(-0px, 0px)";

				// maybe fire up a new one?
				var This = this; setTimeout(function() {
					if(This.element.childNodes.length==0) {
						This.createTabFrom['ondblclick'] && This.createTabFrom['ondblclick']();
					}
				}, 1000);

			}

		} else if(this.currentTab) { // also fixed if the current tab moved due to the remove

			this._resetTransform();

		}

	},

	_resetTransform: function() {

		// disable transitons while we maintain statu-quo
		this.element.style[CSSPROP_TRANSITION] = 'none';
		window.getComputedStyle && window.getComputedStyle(this.element)[CSSPROP_TRANSITION];

		// modify the transform to maintain statu-quo
		this.element.style[CSSPROP_TRANSFORM] = "translate(-" + (this.currentTab.offsetLeft) + "px, 0px)"; // (this.currentTab == next ? parseFloat(next.style.marginLeft): 0)
		window.getComputedStyle && window.getComputedStyle(this.element)[CSSPROP_TRANSFORM];

		// reset to default transition style
		this.element.style[CSSPROP_TRANSITION] = '';
		window.getComputedStyle && window.getComputedStyle(this.element)[CSSPROP_TRANSITION];

	},

	_addReopenHistoryEntry: function(source, kind, image) { var This=this;
		var isEntryValid = true;
		history.manager.addHistoryEntry({ text:i18n.reopen + source, image:image, id: 'reopen-'+source.value.id }, function() { isEntryValid = false;
			var tab = This.createTabFrom[kind](source);
			This.switchTo(tab);
		}, function() { return isEntryValid; });
	}

};
var DragAndDrop = {
	
	source: null,
	sourceKind: null,
	sourceCallback: null,
	popupData: { popup: null, onmove: null, onup: null },
	
	destination: null,
	destinationKind: null,
	destinationCallback: null,
	
	actions: {
		"DebugText to null": function(s,d,callBack) {
			alert(s);
		},
		__proto__: null
	},
	
	createPopupFor: {
		"DebugText": function(e, value) {
			return null;
		}
	},
	
	destroyPopupFor: {
		"DebugText": function(popup, didDrag) {}
	},
	
	scrollOnEdge: function(e) {
		var target = e.target, jobDone = false, clearV = true, clearH = true; 
		DragAndDrop.scrollOnEdge.e = e;
		
		// walk the dom for a scrollable element
		if(!("getBoundingClientRect" in target)) { return; }
		do {
			
			// get data
			var cr = target.getBoundingClientRect();
			
			// generate event loop
			var generateEventLoop = function generateEventLoop(timer, target, action, condition) { 
				var factor = 0.4; var factor_increase = 1.05;
				//console_log(timer, DragAndDrop.scrollOnEdge[timer], condition+'', action+'');
				if(!DragAndDrop.scrollOnEdge[timer]) {
					//console_log('plan first');
					DragAndDrop.scrollOnEdge[timer] = setTimeout(function autoScroll() {
						//console_log('execute');
						if(DragAndDrop.sourceKind) {
							
							// increment the speed factor
							if(factor >= 2) { factor_increase = 1.01; }								
							if(factor <= 3) { factor = factor * factor_increase; }
							if(factor >= 3) { factor = 3; }
							
							// do something
							var e = DragAndDrop.scrollOnEdge.e;
							action(e,target,factor);
							
							// maybe replan
							if(condition(e,target)) { 
								//console_log('plan');
								DragAndDrop.scrollOnEdge[timer] = setTimeout(arguments.callee, 32);
							} else {
								//console_log('cancel');
								DragAndDrop.scrollOnEdge[timer] = 0;
							}
							
						} else {
							//console_log('cancel by sourceKind', DragAndDrop.sourceKind);
							DragAndDrop.scrollOnEdge[timer] = 0;
						}
					}, 500);
				} else {
					//console_log('noop');
				}
			}
		
			// need horizontal scrolling
			if(getComputedStyle(target).overflow == "auto") {
				if(target.scrollLeft != 0 && e.clientX < cr.left+Math.min(50,cr.width/3)) {
					generateEventLoop(
						"hTimer", target,
						function(e,target,f) { target.scrollLeft -= 5*f;},
						function(e,target,f) { return target.scrollLeft != 0 && e.clientX < cr.left+Math.min(50,cr.width/3) }
					)
					jobDone=true; clearH=false;
				} else if(target.scrollWidth > target.scrollLeft+target.clientWidth && e.clientX > cr.right-Math.min(50,cr.width/3)) {
					generateEventLoop(
						"hTimer", target,
						function(e,target,f) { target.scrollLeft += 5*f; },
						function(e,target,f) { return target.scrollWidth > target.scrollLeft+target.clientWidth && e.clientX > cr.right-Math.min(50,cr.width/3) }
					)
					jobDone=true; clearH=false;
				}
				
				// need vertical scrolling
				if(target.scrollTop != 0 && e.clientY < cr.top+Math.min(50,cr.height/3)) {
					generateEventLoop(
						"vTimer", target,
						function(e,target,f) { target.scrollTop -= 5*f;},
						function(e,target,f) { return target.scrollTop != 0 && e.clientY < cr.top+Math.min(50,cr.height/3) }
					)
					jobDone=true; clearV=false;
				} else if(target.scrollHeight > target.scrollTop+target.clientHeight && e.clientY > cr.bottom-Math.min(50,cr.height/3)) {
					generateEventLoop(
						"vTimer", target,
						function(e,target,f) { target.scrollTop += 5*f;},
						function(e,target,f) { return target.scrollHeight > target.scrollTop+target.clientHeight && e.clientY > cr.bottom-Math.min(50,cr.height/3) }
					)
					jobDone=true; clearV=false;
				}
			}
			
		} while(!jobDone && (target=target.parentNode) && target.getBoundingClientRect);
		
		// clear scroller that aren't relevant anymore
		if(clearH) {
			clearTimeout(DragAndDrop.scrollOnEdge.hTimer);
			DragAndDrop.scrollOnEdge.hTimer = 0;
		}
		if(clearV) {
			clearTimeout(DragAndDrop.scrollOnEdge.vTimer);
			DragAndDrop.scrollOnEdge.vTimer = 0;
		}
	},
	
	beginDrag: function(kind, value, callback, e) { 
		
		// only one drag may happen at a time, so let's abort the previous one
		if(this.sourceKind) { this.abortDrag(); } // TODO: handle simultaneous drags?
		
		// start a new drag
		var pid = this.pid = e.pointerId; 
		this.source = value;
		this.sourceKind = kind;
		this.sourceCallback = callback;
		document.documentElement.classList.add('ondragging');
		
		// create a drag popup, if needed
		var createPopupFor = this.createPopupFor[kind];
		if(createPopupFor) {
			var popup = createPopupFor(e, value); this.popupData.popup = popup;
			var startX = e.clientX; var dx = 0;
			var startY = e.clientY; var dy = 0;
			if(popup) {
				document.body.appendChild(popup);
				window.addEventListener('pointermove', this.popupData.onmove = function(e) {
					if(e.pointerId != pid) { return; }
					DragAndDrop.scrollOnEdge(e);
					dx = e.clientX - startX;
					dy = e.clientY - startY;
					popup.style[CSSPROP_TRANSFORM] = 'translate('+dx+'px,'+dy+'px)';
					popup.style[CSSPROP_TRANSFORM] = 'translateZ(0px) translate('+dx+'px,'+dy+'px)';
				},true);
				window.addEventListener('pointerup', this.popupData.onup = function(e) {
					// nothing to do?
				},true);
			}
		}
		
		// or else just support scroll-on-edge
		else {
			DragAndDrop.scrollOnEdge(e);
		}
		
	},
	
	abortDrag: function(didDrag) {
		
		// call back the observers
		try {
			if(this.sourceCallback) { 
				this.sourceCallback.call(this, this.source, this.destination, didDrag);
			}
		} catch (ex) {
			setTimeout(function() { throw ex; }, 0);
		}
		
		try {
			if(this.destinationCallback && this.destinationCallback !== this.sourceCallback) {
				this.destinationCallback.call(this, this.source, this.destination, didDrag);
			}
		} catch (ex) {
			setTimeout(function() { throw ex; }, 0);
		}
		
		// stop the drag operation
		document.documentElement.classList.remove('ondragging');
		
		// remove any eventual popup
		try {
			var popup; if(popup = this.popupData.popup) {
				var destroyPopup = this.destroyPopupFor[this.sourceKind];
				if(!!destroyPopup) { destroyPopup(popup, !!didDrag); } else { document.body.removeChild(popup); }
				this.popupData.popup=null;
			}
		} catch (ex) {
			setTimeout(function() { throw ex; }, 0);
		} finally {
			window.removeEventListener('pointermove', this.popupData.onmove, true);
			window.removeEventListener('pointerup', this.popupData.onup, true);
			this.popupData.onmove=null;
			this.popupData.onup=null;
		}
		
		// remove the current drag source
		this.source = null;
		this.sourceKind = null;
		this.sourceCallback = null;
		
		// remove the current drag destination
		this.destination = null;
		this.destinationKind = null;
		this.destinationCallback = null;
		
	},
	
	updateDestination: function(kind, value, callback) {
		this.destination = value;
		this.destinationKind = kind;
		this.destinationCallback = callback;
	},
	
	releaseDestination: function(value) {
		if(this.destination===value) {
			this.updateDestination(null, null);
		}
	},
	
	endDrag: function() { if(!this.sourceKind) { return false; };
		
		try {
			
			// find the callback to execute, then execute it
			var actionToExecute = this.actions[this.sourceKind + " to " + this.destinationKind];
			var actionResult = actionToExecute ? (actionResult=actionToExecute.call(this, this.source, this.destination)) : undefined;
			
		} catch (ex) {
			
			// throw asynchronously
			setTimeout(function() { throw ex; }, 0);

		} finally {
			
			try {
				// stop the operation with a success first
				this.abortDrag(actionResult);
				return actionResult;
			} catch (ex) { 
				// throw asynchronously
				setTimeout(function() { throw ex; }, 0);
				return false;
			}
		
		}
	}
	
};
//
// creates a 50% filled pattern of 5px diagonal stripes
//
function createStripes(canvas, color, alpha) {

	if(createStripes.cache[color+alpha]) {
		
		var pattern = createStripes.cache[color+alpha];
		
	} else {
	
		var pattern = document.createElement("canvas"); pattern.width=10; pattern.height=10;
		var ctx = pattern.getContext('2d');
		ctx.globalAlpha = alpha;
		
		var configureGradient = function configureGradient(g) {
			g.addColorStop(0.00, 'transparent');
			g.addColorStop(0.40, 'transparent');
			g.addColorStop(0.40, color);
			g.addColorStop(0.60, color);
			g.addColorStop(0.60, 'transparent');
			g.addColorStop(1.00, 'transparent');
			return g;
		}
		
		var g1 = configureGradient(ctx.createLinearGradient(-5, -5, +5, +5));
		var g2 = configureGradient(ctx.createLinearGradient(+0, +0, 10, 10));
		var g3 = configureGradient(ctx.createLinearGradient(+5, +5, 15, 15));
		
		ctx.fillStyle = g1;
		ctx.fillRect(0, 0, 10, 10);
		
		ctx.fillStyle = g2;
		ctx.fillRect(0, 0, 10, 10);
		
		ctx.fillStyle = g3;
		ctx.fillRect(0, 0, 10, 10);
		
		createStripes.cache[color+alpha] = pattern;
	
	}
	
	return canvas.createPattern(pattern, 'repeat');

}

createStripes.cache = Object.create ? Object.create(null) : {};
//
// This is an entry in a hierarchy tree
//

CanvasRenderingContext2D.prototype.beginRoundedRectPath = function (x, y, w, h, r) {
	this.beginPath();
  this.moveTo(x+r, y);
  this.lineTo(x+w-r, y);
  this.quadraticCurveTo(x+w, y, x+w, y+r);
  this.lineTo(x+w, y+h-r);
  this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  this.lineTo(x+r, y+h);
  this.quadraticCurveTo(x, y+h, x, y+h-r);
  this.lineTo(x, y+r);
  this.quadraticCurveTo(x, y, x+r, y);
}

CanvasRenderingContext2D.prototype.fillRoundedRect = function (x, y, w, h, r) {
  this.beginRoundedRectPath(x, y, w, h, r);
  this.fill();        
};

CanvasRenderingContext2D.prototype.clipRect = function(x, y, w, h) {
	this.beginPath();
	this.moveTo(x, y);
	this.lineTo(x+w, y);
	this.lineTo(x+w, y+h);
	this.lineTo(x, y+h);
	this.clip();
}

CanvasRenderingContext2D.prototype.clipRoundedRect = function (x, y, w, h, r) {
	this.beginRoundedRectPath(x, y, w, h, r);
  this.clip();        
};

function HierarchyNode(value, children, options) { /*defaults*/ options = options || {};

	this.id = HierarchyNode.ID++;
	this.options = options;

	this.value = value;
	this.parent = options.parent || null;
	this.children = []; if(children) {
		if(typeof(children.length)=="number") {
			for(var i=children.length;i--;) {
				if(children[i] instanceof HierarchyNode) {
					this.children.unshift(children[i])
				} else {
					console.warn('[HierarchyNode.new] Invalid child: ', children[i]);
				}
			}
		} else {
			console.warn('[HierarchyNode.new] Invalid array-like: ', children);
		}
	}
	
	this.active = value.data.activeUser !== 1;

	this.fillColor = options.fillColor || "#E5DFD9";
	this.ghostFillColor = options.ghostFillColor || this.fillColor;
	this.strokeColor = options.strokeColor || "#93887D";
	this.textColor = options.textColor || "#624E3D";
	
	if(!this.active) {
		this.fillColor = "#555555";
		this.stripeColor = "#BBBBBB";
		this.stripeOpacity = 0.2;
		this.textColor = "#DDDDDD";
		this.options.badgeColor = "#BBBBBB";
	}

	this.selected = false;
	this.selectedNodes = [];

	this.nodeWidth = options.nodeWidth || HierarchyNode.DEFAULT_WIDTH;
	this.nodeHeight = options.nodeHeight || HierarchyNode.DEFAULT_HEIGHT;

	this.nodeAlign = 0;
	this.nodeCompress = false;
	this.nodeOffsetXCenter = 0;
	this.nodeOffsetXStart = 0;

	this.layoutWidth = 0;
	this.layoutHeight = 0;
	this.layoutWidthLeft = 0;
	this.marginLeft = 0;
	this.marginRight = 0;

	this.layoutMode = 0;
	this.missingHeight = 0;
	this.missingWidthLeft = 0;
	this.missingWidthRight = 0;
	this.drawChildren = true;

	this.offsetConnect = 0;
	this.offsetX = 0;
	this.offsetY = 0;

	for(var i = this.children.length; i--;) { var childNode = this.children[i];
		childNode.parent = this;
	}

}

HierarchyNode.MAX_LEVEL_PER_TREE = 4;

HierarchyNode.DEFAULT_LAYOUT = 0;
HierarchyNode.LEVELED_LAYOUT = 1;
HierarchyNode.COLUMN1_LAYOUT = 2;

HierarchyNode.CONNECT_TOP = 0;
HierarchyNode.CONNECT_LEFT = 1;
HierarchyNode.CONNECT_RIGHT = 2;

HierarchyNode.DEFAULT_WIDTH = 200;
HierarchyNode.DEFAULT_HEIGHT = 30+2*9;
HierarchyNode.X_PADDING = 25;
HierarchyNode.Y_PADDING = 30;
HierarchyNode.ID = 0;

// customization entrypoints
HierarchyNode.actions = [];
HierarchyNode.primaryText = [];
HierarchyNode.secondaryText = [];

// prototypes
HierarchyNode.prototype = {

	//
	// removes a node from the children
	//
	removeChild: function(elm) {
		var array = this.children;
		var index = array.indexOf(elm);
		if (index > -1) { array.splice(index, 1); elm.parent=null; }
		return index;
	},

	appendChild: function(elm, index) {

		elm.parent = this;

		var array = this.children;
		if(index===0) { array.unshift(elm) }
		else if(!index || index==array.length) { array.push(elm) }
		else { array.splice(index, 0, elm) }

		return elm;

	},

	//
	// position every node and child node on the virutal space
	// @param options.reorder If true, child nodes will be reordered according the their importance
	//
	computeLayout: function(options, levelsRemaining) { options = options || {}; levelsRemaining = levelsRemaining==undefined?-1:levelsRemaining|0;
		var nextLevelsRemaining = (levelsRemaining==0 ? 0 : (levelsRemaining-1));

		//
		// STEP 0: reset
		//

		this.nodeWidth = this.options.nodeWidth || HierarchyNode.DEFAULT_WIDTH;
		this.nodeHeight = this.options.nodeHeight || HierarchyNode.DEFAULT_HEIGHT;

		this.layoutWidth = 0;
		this.layoutHeight = 0;
		this.layoutWidthLeft = 0;
		this.marginLeft = 0;
		this.marginRight = 0;

		this.missingHeight = 0;
		this.missingWidthLeft = 0;
		this.missingWidthRight = 0;
		this.drawChildren = ((options["drawChildren_"+this.id]!==false) && (levelsRemaining!=0)) || (options["drawChildren_"+this.id]===true);

		this.offsetX = 0;
		this.offsetY = 0;
		this.nodeOffsetXStart = 0;
		this.nodeOffsetXCenter = 0;

		var nodeAlign = this.nodeAlign;
		var nodeCompress = (options["nodeCompress_"+this.id] !== undefined) ? options["nodeCompress_"+this.id] : this.nodeCompress;
		if(levelsRemaining==HierarchyNode.MAX_LEVEL_PER_TREE) { options.nodeCompress=nodeCompress; }
		var X_PADDING = HierarchyNode.X_PADDING * (options.nodeCompress ? 0.75 : 1.00);
		var Y_PADDING = HierarchyNode.Y_PADDING * (options.nodeCompress ? 0.75 : 1.00);

		// Decide which algorithm to use, depending on the amount of children
		if(this.children.length==0 || !this.drawChildren) {
			this.layoutMode = HierarchyNode.DEFAULT_LAYOUT;
		} else if(options["layoutMode_"+this.id] !== undefined) {

			// import requirements
			this.layoutMode = options["layoutMode_"+this.id];

			// fix mistakes
			if(this.layoutMode == HierarchyNode.LEVELED_LAYOUT) {
				if(this.children.length <= 1) {
					this.layoutMode = HierarchyNode.COLUMN1_LAYOUT;
				} else if(this.children.length == 2) {
					this.layoutMode = HierarchyNode.DEFAULT_LAYOUT;
				}
			}

		} else if(nodeCompress && this.drawChildren && this.children.length >= 2 && this.nodeAlign != HierarchyNode.CONNECT_TOP && this.offsetConnect == this.nodeAlign) {
			this.layoutMode = HierarchyNode.COLUMN1_LAYOUT;
		} else if(this.children.length <= 3 || (this.nodeAlign == HierarchyNode.CONNECT_TOP && this.children.length <= 5 && (nextLevelsRemaining==0 || this.children.reduce(function(sum, childNode) { return sum+((childNode.children.length==0)?1:0); }, 0) > 3)) || !this.parent || (this.children.length<=6 && levelsRemaining==HierarchyNode.MAX_LEVEL_PER_TREE) || !this.drawChildren) {
			this.layoutMode = HierarchyNode.DEFAULT_LAYOUT;
		} else {
			this.layoutMode = HierarchyNode.LEVELED_LAYOUT;
		}

		// Apply the decided algorithm
		if(this.layoutMode == HierarchyNode.COLUMN1_LAYOUT) {

			// NOTE: we can't do one centered column, so we choose one direction
			if(nodeAlign==HierarchyNode.CONNECT_TOP) { nodeAlign = this.nodeAlign = HierarchyNode.CONNECT_LEFT; }

			//
			// STEP 1: compute width
			//

			this.layoutWidth = this.children.reduce(function(currentWidth, childNode) {
				childNode.nodeAlign = nodeAlign;
				childNode.offsetConnect = nodeAlign;
				childNode.nodeCompress = nodeCompress;
				childNode.computeLayout(options, nextLevelsRemaining);
				return Math.max(currentWidth, 2*X_PADDING + childNode.layoutWidth);
			},0);

			this.layoutWidth = Math.max(this.layoutWidth, this.nodeWidth);

			//
			// STEP 2: compute height
			//

			this.layoutHeight = this.nodeHeight + this.children.reduce(function(currentHeight, childNode) {
				return currentHeight + Y_PADDING + childNode.layoutHeight;
			},0);;

			//
			// STEP 3: position elements
			//

			if(options.reorder && this.drawChildren) {
				this.children = this.children.sort(HierarchyNode.compare);
			}

			var currentOffset = this.nodeHeight + Y_PADDING;
			if(this.children.length >= 1 && this.drawChildren) {
				for(var i=this.children.length; i--;) { var childNode = this.children[i];
					childNode.offsetY = currentOffset;
					childNode.offsetX = (this.nodeAlign==HierarchyNode.CONNECT_LEFT ? 2*X_PADDING : this.layoutWidth-2*X_PADDING-childNode.layoutWidth);
					childNode.missingWidthLeft = childNode.missingWidthRight = childNode.missingHeight = 0;
					currentOffset += childNode.layoutHeight + Y_PADDING;
				}
			}

			switch(this.nodeAlign) {

				case HierarchyNode.CONNECT_TOP:
				case HierarchyNode.CONNECT_LEFT:
					this.nodeOffsetXStart = 0;
					this.nodeOffsetXCenter = this.nodeWidth/2;
				break;

				case HierarchyNode.CONNECT_RIGHT:
					this.nodeOffsetXStart = this.layoutWidth-this.nodeWidth;
					this.nodeOffsetXCenter = this.layoutWidth-this.nodeWidth/2;
				break;

			}

			this.layoutWidthLeft = (nodeAlign == HierarchyNode.CONNECT_LEFT ? X_PADDING : this.layoutWidth - X_PADDING);

			this.marginLeft  = (this.offsetConnect == HierarchyNode.CONNECT_LEFT ? X_PADDING : 0);
			this.marginRight = (this.offsetConnect == HierarchyNode.CONNECT_RIGHT ? X_PADDING : 0);

		} else if(this.layoutMode == HierarchyNode.DEFAULT_LAYOUT) {

			//
			// STEP 1: compute width
			//

			this.layoutWidth = this.nodeWidth;
			if(this.children.length >= 1 && this.drawChildren) {

				this.layoutWidth = this.children.reduce(function(currentWidth, childNode) {
					childNode.nodeAlign = nodeAlign;
					childNode.nodeCompress = nodeCompress;
					childNode.computeLayout(options, nextLevelsRemaining);
					return currentWidth + childNode.layoutWidth;
				},0);

				if(this.children.length >= 2) {
					this.layoutWidth += (this.children.length-1)*X_PADDING;
				}

				this.layoutWidth = Math.max(this.layoutWidth, this.nodeWidth);

			}

			//
			// STEP 2: compute height
			//

			this.layoutHeight = this.nodeHeight;

			if(this.children.length >= 1 && this.drawChildren) {

				this.layoutHeight += Y_PADDING;
				this.layoutHeight += this.children.reduce(function(maxHeight, childNode) {
					return Math.max(maxHeight, childNode.layoutHeight);
				},0);
			}

			//
			// STEP 3: position elements
			//

			if(options.reorder && this.drawChildren) {
				this.children = this.children.sort(HierarchyNode.compare);
			}

			var currentOffset = 0;
			if(this.children.length >= 1 && this.drawChildren) {
				for(var i=this.children.length; i--;) { var childNode = this.children[i];
					childNode.offsetY = childNode.nodeHeight + Y_PADDING;
					childNode.offsetX = currentOffset;
					childNode.offsetConnect = HierarchyNode.CONNECT_TOP;
					childNode.missingHeight = (this.layoutHeight - this.nodeHeight - 2*Y_PADDING) - (childNode.layoutHeight);
					currentOffset += childNode.layoutWidth + X_PADDING;
				}
			}

			switch(this.nodeAlign) {

				case HierarchyNode.CONNECT_TOP:
					this.nodeOffsetXCenter = this.layoutWidth / 2;
					this.nodeOffsetXStart = this.nodeOffsetXCenter - this.nodeWidth / 2;
				break;

				case HierarchyNode.CONNECT_LEFT:
					this.nodeOffsetXStart = 0;
					this.nodeOffsetXCenter = this.nodeWidth/2;
				break;

				case HierarchyNode.CONNECT_RIGHT:
					this.nodeOffsetXStart = this.layoutWidth-this.nodeWidth;
					this.nodeOffsetXCenter = this.layoutWidth-this.nodeWidth/2;
				break;

			}

			//
			// STEP 4: compactify the tree
			//

			if(nodeCompress && this.children.length >= 2 && this.drawChildren) {

				var children_backup = this.children;
				var children_reverse = this.children.slice(0).reverse();
				this.children = children_reverse;

				//console_log('---------');
				for(var ci = this.children.length; --ci;) {

					var wrapWithOffset = function(offsetX, offsetY) {
						return function(node) { return {node:node,offsetX:offsetX,offsetY:offsetY}; };
					}

					var currentLevel = 0; var delayedNodesL = []; var delayedNodesR = [];
					var checkOffsetY_L = function(o,i,a) {
						if((o.offsetY + o.node.offsetY) >= ((currentLevel+1.9999) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING)) && (o.offsetY + o.node.offsetY) < ((currentLevel+2.9999) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING))) {
							//console_log('+[L]' + o.node.value.fullName, currentLevel, o.offsetY + o.node.offsetY, (currentLevel+2) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING));
							return true;
						} else {
							//console_log('-[L]' + o.node.value.fullName, currentLevel, o.offsetY + o.node.offsetY, (currentLevel+2) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING));
							delayedNodesL.push(o);
							return false;
						}
					}
					var checkOffsetY_R = function(o,i,a) {
						if((o.offsetY + o.node.offsetY) >= ((currentLevel+1.9999) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING)) && (o.offsetY + o.node.offsetY) < ((currentLevel+2.9999) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING))) {
							//console_log('+[R]' + o.node.value.fullName, currentLevel, o.offsetY + o.node.offsetY, (currentLevel+2) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING));
							return true;
						} else {
							//console_log('-[R]' + o.node.value.fullName, currentLevel, o.offsetY + o.node.offsetY, (currentLevel+2) * (HierarchyNode.DEFAULT_HEIGHT+Y_PADDING));
							delayedNodesR.push(o);
							return false;
						}
					}
					var cl = this.children[ci-1];
					var cr = this.children[ci];
					//console_log("* " + cl.value.fullName + " & " + cr.value.fullName);

					var freeSpace = cr.offsetX + cr.nodeOffsetXStart - cl.offsetX - cl.nodeOffsetXStart - cl.nodeWidth - X_PADDING - (cl.marginRight) - (cr.marginLeft);
					var levelNodesL = [[{node:cl,offsetX:0,offsetY:0}]], levelNodesR = [this.children.slice(ci).map(wrapWithOffset(0,0))];
					var edgeNodesL = [{node:cl,offsetX:0,offsetY:0}];
					var edgeNodesR = [{node:cl,offsetX:0,offsetY:0}];

					while(freeSpace > 0) {

						//
						// STEP 1: collect all nodes in the next level
						//

						// left nodes
						var currentLevelNodesL = [];

						var tmp = delayedNodesL; delayedNodesL=[];
						currentLevelNodesL.push.apply(currentLevelNodesL, tmp.filter(checkOffsetY_L));

						for(var i = levelNodesL[currentLevel].length; i--;) {
							var parent = levelNodesL[currentLevel][i];
							var wrapWithParentOffset = wrapWithOffset(parent.node.offsetX + parent.offsetX, parent.node.offsetY + parent.offsetY);
							currentLevelNodesL.push.apply(currentLevelNodesL, parent.node.children.map(wrapWithParentOffset).filter(checkOffsetY_L));
						}

						if(currentLevelNodesL.length==0) { break; }

						// right nodes
						var currentLevelNodesR = [];

						var tmp = delayedNodesR; delayedNodesR=[];
						currentLevelNodesR.push.apply(currentLevelNodesR, tmp.filter(checkOffsetY_R));

						for(var i = levelNodesR[currentLevel].length; i--;) {
							var parent = levelNodesR[currentLevel][i];
							var wrapWithParentOffset = wrapWithOffset(parent.node.offsetX + parent.offsetX, parent.node.offsetY + parent.offsetY);
							currentLevelNodesR.push.apply(currentLevelNodesR, parent.node.children.map(wrapWithParentOffset).filter(checkOffsetY_R));
						}

						if(currentLevelNodesR.length==0) { break; }

						levelNodesL.push(currentLevelNodesL);
						levelNodesR.push(currentLevelNodesR);


						//
						// STEP 2: find edge nodes
						//

						currentLevel++;

						var cenL = currentLevelNodesL[0];
						for(var i = currentLevelNodesL.length; --i;) {
							var inode = currentLevelNodesL[i];
							if(cenL.offsetX + cenL.node.offsetX + cenL.node.nodeOffsetXStart + cenL.node.nodeWidth < inode.offsetX + inode.node.offsetX + inode.node.nodeOffsetXStart + inode.node.nodeWidth) {
								cenL = inode;
							}
						}

						var cenR = currentLevelNodesR[0];
						for(var i = currentLevelNodesR.length; --i;) {
							var inode = currentLevelNodesR[i];
							if(cenR.offsetX + cenR.node.offsetX + cenR.node.nodeOffsetXStart > inode.offsetX + inode.node.offsetX + inode.node.nodeOffsetXStart) {
								cenR = inode;
							}
						}

						edgeNodesL[currentLevel] = cenL;
						edgeNodesR[currentLevel] = cenR;

						//
						// STEP 3: compute free space
						//

						freeSpace = Math.min(freeSpace, (cenR.offsetX + cenR.node.offsetX + cenR.node.nodeOffsetXStart) - (cenL.offsetX + cenL.node.offsetX + cenL.node.nodeOffsetXStart + cenL.node.nodeWidth) - X_PADDING - (cenL.node.marginRight) - (cenR.node.marginLeft));

						//console_log('current free space: ' + freeSpace);

					}

					// shift all elements to the left
					if(freeSpace > 0) {
						//console_log('free space: ', freeSpace);
						this.layoutWidth -= freeSpace;
						for(var i = levelNodesR[0].length; i--;) {
							levelNodesR[0][i].node.offsetX -= freeSpace;
							var rightEdge = levelNodesR[0][i].offsetX + levelNodesR[0][i].node.offsetX + levelNodesR[0][i].node.layoutWidth;
							if(rightEdge > this.layoutWidth) { this.layoutWidth = rightEdge; }
						}
						for(var i = edgeNodesR.length; i--;) {
							edgeNodesR[i].node.missingWidthLeft -= freeSpace;
						}
						for(var i = edgeNodesL.length; i--;) {
							edgeNodesL[i].node.missingWidthRight -= freeSpace;
							var rightEdge = edgeNodesL[i].offsetX + edgeNodesL[i].node.offsetX + edgeNodesL[i].node.layoutWidth;
							if(rightEdge > this.layoutWidth) { this.layoutWidth = rightEdge; }
						}
					}

				}

				this.children = children_backup;

			} else if ((this.children.length == 1 && this.drawChildren) && (!this.parent || this.offsetConnect == HierarchyNode.CONNECT_TOP)) {

				// align the top node on its only child
				this.nodeOffsetXCenter = this.children[0].nodeOffsetXCenter;
				this.nodeOffsetXStart = this.nodeOffsetXCenter - this.nodeWidth / 2;

			}

			this.layoutWidthLeft = this.layoutWidth / 2;

			this.marginLeft  = (this.offsetConnect!=HierarchyNode.CONNECT_LEFT  ? 0 : X_PADDING);
			this.marginRight = (this.offsetConnect!=HierarchyNode.CONNECT_RIGHT ? 0 : X_PADDING);

		} else if(this.layoutMode == HierarchyNode.LEVELED_LAYOUT && nodeCompress) {

			//
			// STEP 0: reorder
			//

			var children = this.children.slice(0)
			for(var i = children.length; i--;) {
				children[i].nodeAlign = HierarchyNode.CONNECT_RIGHT;
				children[i].nodeCompress = nodeCompress;
				children[i].offsetConnect = HierarchyNode.CONNECT_RIGHT;
				children[i].computeLayout(options, nextLevelsRemaining);
			}

			children = children.sort(HierarchyNode.compareWidth);
			//console_log(children.map(function(n) { return n.value+': '+n.layoutWidth; }));

			var c1s = []; var c2s = [];
			c1s.length = Math.ceil(children.length/2);
			c2s.length = Math.floor(children.length/2);

			// divide the elements in two columns
			var oneOrZero = children.length&1;
			var current = 0; var last = c2s.length; while(current < last + oneOrZero) {

				var c1 = children[current];
				var c2 = children[current+last];
				if(current == last) { c1=c2; c2=undefined; }

				// decide whether 2 elements form this level
				if(c2) {

					// prepare children for layout
					c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
					c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
					c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
					c1.computeLayout(options, nextLevelsRemaining);
					c2.computeLayout(options, nextLevelsRemaining);

					// append them to their column
					c1s[current] = c1;
					c2s[current] = c2;

				} else {

					// append it to the current column
					c1s[current] = c1;

				}

				current++;
			}

			// make sure the largest elements end up on the right column if possible
			var makeSureTheLargestElementsAreOnColumn2 = function makeSureTheLargestElementsAreOnColumn2() {
				for(var repeat_count = 2; repeat_count--;) {
					for(var c1i = c2s.length; c1i--;) { var c1 = c1s[c1i];
						/*for(var c2i = c2s.length; c2i--;) {*/var c2i=c1i; var c2 = c2s[c2i];

							// inverse the elements if needed
							if(c1.layoutWidth > c2.layoutWidth) {
								c2s[c2i]=c1; c1s[c1i]=c2; c1=c1s[c1i]; c2=c2s[c2i];
								c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
								c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
								c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
								c1.computeLayout(options, nextLevelsRemaining);
								c2.computeLayout(options, nextLevelsRemaining);
							}

						/*}*/
					}
				}
			}

			// now, sort the columns by height
			makeSureTheLargestElementsAreOnColumn2();
			var pivotWidth = c1s[0].layoutWidth; for(var i = c1s.length; --i;) { pivotWidth = Math.max(c1s[i].layoutWidth,pivotWidth); }
			c1s = c1s.sort(HierarchyNode.compare);
			c2s = c2s.sort(HierarchyNode.compare);
			makeSureTheLargestElementsAreOnColumn2();

			// now, check if we can't make height savings by taking elements from column 2 to column 1
			// which will not increase the width of the column 1 (pivotWidth) but have a more adequate height
			var movableElements = c2s.filter(function(n) { return n.layoutWidth<=pivotWidth; }).concat(c1s);
			var movableMaxHeight = movableElements.reduce(function(h,n) { return Math.max(h, n.layoutHeight); }, 0);
			for(var i = c2s.length; i--;) {
				var bestDistance = Math.abs(c1s[i].layoutHeight - c2s[i].layoutHeight), bestIndex = -1;
				for(var j = movableElements.length; j--;) {
					var distanceJ = Math.abs(movableElements[j].layoutHeight - c2s[i].layoutHeight);
					var isDoingBetter = distanceJ < bestDistance;
					if(isDoingBetter) {

						var isNotOneOfTheCurrentElement = movableElements[j] != c1s[i] && movableElements[j] != c2s[i];
						if(!isNotOneOfTheCurrentElement) { continue; }

						var isNotAlreadyInALockedLevel = c1s.indexOf(movableElements[j])<i && c2s.indexOf(movableElements[j])<i;
						var isAloneOnItsLevelAndCompatible = (movableElements[j]==c1s[c1s.length-1] && movableElements[j].layoutWidth<=pivotWidth);
						if(isNotAlreadyInALockedLevel||isAloneOnItsLevelAndCompatible) {
							bestDistance = distanceJ; bestIndex = j;
						}
					}
				}
				if(bestIndex >= 0) {
					//console_log(this.value+'');
					//for(var ci = 0; ci<c2s.length; ci++) {
					//	n=c1s[ci]; console_log('c1: '+n.value+', '+n.layoutWidth+', '+n.layoutHeight);
					//	n=c2s[ci]; console_log('c2: '+n.value+', '+n.layoutWidth+', '+n.layoutHeight);
					//}
					var tmp = c1s[i];
					var index = c2s.indexOf(movableElements[bestIndex]);
					if(index >= 0) {

						// swap the elements
						c1s[i] = c2s[index];
						c2s[index] = tmp;

						// relayout after change
						var c1 = tmp; var c2 = c2s[index];
						c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
						c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
						c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
						c1.computeLayout(options, nextLevelsRemaining);
						c2.computeLayout(options, nextLevelsRemaining);

					} else {

						// swap the elements
						index = c1s.indexOf(movableElements[bestIndex]);
						c1s[i] = c1s[index];
						c1s[index] = tmp;

						// relayout after change
						if(index==c2s.length) {

							var c1 = c1s[i]; var c2 = c1s[index];
							c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_TOP;
							c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_TOP;
							c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
							c1.computeLayout(options, nextLevelsRemaining);
							c2.computeLayout(options, nextLevelsRemaining);

						}
						//console_log('inverting ' + tmp.value + ' (c1) and ' + c1s[i].value + ' (c1)' );
					}

					// restart the loop
					var movableElements = c2s.filter(function(n) { return n.layoutWidth<=pivotWidth; })
					var movableMaxHeight = movableElements.reduce(function(h,n) { return Math.max(h, n.layoutHeight); }, 0);
					i = c2s.length;

				} else if(c2s.length!=c1s.length) {

					// what if we swapped the right & the trail instead?
					distanceJ = Math.abs(c1s[c2s.length].layoutHeight - c1s[i].layoutHeight)
					var isDoingBetter = distanceJ < bestDistance;
					if(isDoingBetter && c1s[c2s.length].layoutWidth <= c2s[i].layoutWidth) {

						// swap the elements
						var tmp = c2s[i]; c2s[i] = c1s[c2s.length]; c1s[c2s.length] = tmp;

						// relayout after change
						var c1 = c2s[i]; var c2 = c1s[c2s.length];
						c1.nodeAlign = HierarchyNode.CONNECT_LEFT; c2.nodeAlign = HierarchyNode.CONNECT_TOP;
						c1.offsetConnect = HierarchyNode.CONNECT_LEFT; c2.offsetConnect = HierarchyNode.CONNECT_TOP;
						c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
						c1.computeLayout(options, nextLevelsRemaining);
						c2.computeLayout(options, nextLevelsRemaining);

						// restart the loop
						var movableElements = c2s.filter(function(n) { return n.layoutWidth<=pivotWidth; })
						var movableMaxHeight = movableElements.reduce(function(h,n) { return Math.max(h, n.layoutHeight); }, 0);
						i = c2s.length;
					}
				}
			}

			// make sure the longest elements end up on the right column if possible
			makeSureTheLargestElementsAreOnColumn2();

			// now, let's reorder levels by height
			var levels = []; levels.length = c2s.length;
			for(var i = c2s.length; i--;) { levels[i]={i:i,c1:c1s[i],c2:c2s[i],h:Math.max(c1s[i].layoutHeight,c2s[i].layoutHeight)}; }
			levels.sort(function(a,b) { return a.h-b.h; });
			for(var i = c2s.length; i--;) {
				c1s[i] = levels[i].c1;
				c2s[i] = levels[i].c2;
			}

			//console_log(this.value+'');
			//c1s.forEach(function(n) { console_log('c1: '+n.value+', '+n.layoutWidth+', '+n.layoutHeight); });
			//c2s.forEach(function(n) { console_log('c2: '+n.value+', '+n.layoutWidth+', '+n.layoutHeight); });

			//
			// STEP 1: compute width+height
			//

			var didInvert = [];
			this.layoutWidth = this.nodeWidth;
			this.layoutHeight = this.nodeHeight;
			var layoutWidthLeft = this.layoutWidth/2;
			var layoutWidthRight = this.layoutWidth/2;
			for(var i = c1s.length; i--;) {

				var c1 = c1s[i];
				var c2 = c2s[i];

				// decide whether 2 elements form this level
				if(c2) {

					// prepare children for layout
					c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
					c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
					c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
					c1.computeLayout(options, nextLevelsRemaining);
					c2.computeLayout(options, nextLevelsRemaining);

					// inverse the elements if needed
					if(c1.layoutWidth > c2.layoutWidth) {
						var c3=c1; c1=c2; c2=c3;
						c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
						c1.offsetConnect = HierarchyNode.CONNECT_RIGHT; c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
						c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
						c1.computeLayout(options, nextLevelsRemaining);
						c2.computeLayout(options, nextLevelsRemaining);
						didInvert.push(true);
					} else {
						didInvert.push(false);
					}

					// compute the level properties
					var levelHeight = Y_PADDING+Math.max(c1.layoutHeight,c2.layoutHeight);
					var levelWidthLeft = X_PADDING+c1.layoutWidth;
					var levelWidthRight = X_PADDING+c2.layoutWidth;

				} else {

					// prepare children for layout
					c1.nodeAlign = HierarchyNode.CONNECT_TOP;
					c1.offsetConnect = HierarchyNode.CONNECT_TOP;
					c1.nodeCompress = nodeCompress;
					c1.computeLayout(options, nextLevelsRemaining);

					// compute level properties
					var levelHeight = Y_PADDING+c1.layoutHeight;
					var levelWidthLeft = c1.nodeOffsetXCenter;
					var levelWidthRight = c1.layoutWidth-levelWidthLeft;

				}

				// compute impact on the global scope
				layoutWidthLeft = Math.max(layoutWidthLeft, levelWidthLeft);
				layoutWidthRight = Math.max(layoutWidthRight, levelWidthRight);
				this.layoutWidth = layoutWidthLeft+layoutWidthRight;
				this.layoutHeight += levelHeight;

			}

			//
			// STEP 2: position elements
			//

			var levelHeight = this.nodeHeight;
			for(var i = 0; i<c1s.length; i++) {

				var c1 = c1s[i];
				var c2 = c2s[i];

				// decide whether 2 elements form this level
				if(c2) {

					// inverse the elements if needed
					if(didInvert.shift()) { var c3=c1; c1=c2; c2=c3; }

					// then layout
					c1.offsetX = layoutWidthLeft - c1.layoutWidth - X_PADDING;
					c1.offsetY = levelHeight + Y_PADDING;
					c1.missingHeight = c2.layoutHeight - c1.layoutHeight;
					c1.missingWidthLeft = c1.offsetX - X_PADDING;

					c2.offsetX = layoutWidthLeft + X_PADDING;
					c2.offsetY = levelHeight + Y_PADDING;
					c2.missingHeight = c1.layoutHeight - c2.layoutHeight;
					c2.missingWidthRight = this.layoutWidth - c2.offsetX - c2.layoutWidth - X_PADDING;

					levelHeight += Y_PADDING + Math.max(c1.layoutHeight, c2.layoutHeight);

				} else {

					c1.offsetX = layoutWidthLeft - c1.nodeOffsetXCenter;
					c1.offsetY = levelHeight + Y_PADDING;
					c1.missingHeight = 0;

					levelHeight += Y_PADDING + c1.layoutHeight;

				}

			}

			switch(this.nodeAlign) {

				case HierarchyNode.CONNECT_TOP:
					this.nodeOffsetXCenter = layoutWidthLeft;
					this.nodeOffsetXStart = layoutWidthLeft - this.nodeWidth / 2;
				break;

				case HierarchyNode.CONNECT_LEFT:
					this.nodeOffsetXStart = 0;
					this.nodeOffsetXCenter = this.nodeWidth / 2;
				break;

				case HierarchyNode.CONNECT_RIGHT:
					this.nodeOffsetXStart = this.layoutWidth - this.nodeWidth;
					this.nodeOffsetXCenter = this.nodeOffsetXStart + this.nodeWidth / 2;
				break;

			}

			if(options.reorder) { this.children = children; }
			this.layoutWidthLeft = layoutWidthLeft;

			this.marginLeft  = (this.offsetConnect!=HierarchyNode.CONNECT_LEFT  && (this.nodeOffsetXCenter <= this.layoutWidthLeft) ? 0 : X_PADDING);
			this.marginRight = (this.offsetConnect!=HierarchyNode.CONNECT_RIGHT && (this.nodeOffsetXCenter >= this.layoutWidthLeft) ? 0 : X_PADDING);

		} else if(this.layoutMode == HierarchyNode.LEVELED_LAYOUT) {

			//
			// STEP 0: reoreder
			//

			if(options.reorder) {

				for(var i = this.children.length; i--;) {
					this.children[i].nodeAlign = HierarchyNode.CONNECT_TOP;
					this.children[i].nodeCompress = false;
					this.children[i].computeLayout(options, levelsRemaining-1);
				}

				this.children = this.children.sort(HierarchyNode.compare);

			}


			//
			// STEP 1: compute width+height
			//

			this.layoutWidth = this.nodeWidth;
			this.layoutHeight = this.nodeHeight;
			var layoutWidthLeft = this.layoutWidth/2;
			var layoutWidthRight = this.layoutWidth/2;
			var first = 0; while(first < this.children.length) {

				var c1 = this.children[first+0];
				var c2 = this.children[first+1];

				// decide whether 2 elements form this level
				if(c2) {

					// prepare children for layout
					c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
					c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
					c1.computeLayout(options, levelsRemaining-1);
					c2.computeLayout(options, levelsRemaining-1);

					// inverse the elements if needed
					if(c1.layoutWidth > c2.layoutWidth) {
						var c3=c1; c1=c2; c2=c3;
						c1.nodeAlign = HierarchyNode.CONNECT_RIGHT; c2.nodeAlign = HierarchyNode.CONNECT_LEFT;
						c1.nodeCompress = nodeCompress; c2.nodeCompress = nodeCompress;
						c1.computeLayout(options, levelsRemaining-1);
						c2.computeLayout(options, levelsRemaining-1);
					}

					// compute the level properties
					var levelHeight = Y_PADDING+Math.max(c1.layoutHeight,c2.layoutHeight);
					var levelWidthLeft = X_PADDING+c1.layoutWidth;
					var levelWidthRight = X_PADDING+c2.layoutWidth;

				} else {

					// prepare chlidren for layout
					c1.nodeAlign = HierarchyNode.CONNECT_TOP;
					c1.nodeCompress = nodeCompress;
					c1.computeLayout(options, levelsRemaining-1);

					// compute level properties
					var levelHeight = Y_PADDING+c1.layoutHeight;
					var levelWidthLeft = c1.layoutWidth/2;
					var levelWidthRight = c1.layoutWidth/2;

				}

				// compute impact on the global scope
				layoutWidthLeft = Math.max(layoutWidthLeft, levelWidthLeft);
				layoutWidthRight = Math.max(layoutWidthRight, levelWidthRight);
				this.layoutWidth = layoutWidthLeft+layoutWidthRight;
				this.layoutHeight += levelHeight;

				// move to the previous level
				first += 2;

			}

			//
			// STEP 2: position elements
			//

			var levelHeight = this.nodeHeight;
			var first = 0; while(first < this.children.length) {

				var c1 = this.children[first+0];
				var c2 = this.children[first+1];

				// decide whether 2 elements form this level
				if(c2) {

					// inverse the elements if needed
					if(c1.layoutWidth > c2.layoutWidth) { var c3=c1; c1=c2; c2=c3; }

					// then layout
					c1.offsetX = layoutWidthLeft - c1.layoutWidth - X_PADDING;
					c1.offsetY = levelHeight + Y_PADDING;
					c1.offsetConnect = HierarchyNode.CONNECT_RIGHT;
					c1.missingHeight = c2.layoutHeight - c1.layoutHeight;
					c1.missingWidthLeft = c1.offsetX - X_PADDING;

					c2.offsetX = layoutWidthLeft + X_PADDING;
					c2.offsetY = levelHeight + Y_PADDING;
					c2.offsetConnect = HierarchyNode.CONNECT_LEFT;
					c2.missingHeight = c1.layoutHeight - c2.layoutHeight;
					c2.missingWidthRight = this.layoutWidth - c2.offsetX - c2.layoutWidth - X_PADDING;

					levelHeight += Y_PADDING + Math.max(c1.layoutHeight, c2.layoutHeight);

				} else {

					c1.offsetX = layoutWidthLeft - c1.layoutWidth / 2;
					c1.offsetY = levelHeight + Y_PADDING;
					c1.offsetConnect = HierarchyNode.CONNECT_TOP;
					c1.missingHeight = 0;

					levelHeight += Y_PADDING + c1.layoutHeight;

				}

				// move to the previous level
				first += 2;

			}

			switch(this.nodeAlign) {

				case HierarchyNode.CONNECT_TOP:
					this.nodeOffsetXCenter = layoutWidthLeft;
					this.nodeOffsetXStart = layoutWidthLeft - this.nodeWidth / 2;
				break;

				case HierarchyNode.CONNECT_LEFT:
					this.nodeOffsetXStart = 0;
					this.nodeOffsetXCenter = this.nodeWidth / 2;
				break;

				case HierarchyNode.CONNECT_RIGHT:
					this.nodeOffsetXStart = this.layoutWidth - this.nodeWidth;
					this.nodeOffsetXCenter = this.nodeOffsetXStart + this.nodeWidth / 2;
				break;

			}

			this.layoutWidthLeft = layoutWidthLeft;

			this.marginLeft  = (this.offsetConnect!=HierarchyNode.CONNECT_LEFT  ? 0 : X_PADDING);
			this.marginRight = (this.offsetConnect!=HierarchyNode.CONNECT_RIGHT ? 0 : X_PADDING);

		} else {
			throw new Error('Invalid layout mode');
		}

	},

	//
	//
	//
	render: function(canvas, options) { var parent=this.parent;

		canvas.save();
		canvas.translate(this.offsetX, this.offsetY);

		options = options || {};
		var X_PADDING = HierarchyNode.X_PADDING * (options.nodeCompress ? 0.75 : 1.00);
		var Y_PADDING = HierarchyNode.Y_PADDING * (options.nodeCompress ? 0.75 : 1.00);

		var strokeColor = parent ? parent.strokeColor : this.strokeColor;
		var textColor = this.selected ? this.fillColor : this.textColor;
		var fillColor = this.selected ? this.textColor : this.fillColor;

		// draw the link to the parent
		if(this.offsetY > 0 && parent) {

			canvas.save();
			canvas.lineWidth = 5;
			canvas.strokeStyle = strokeColor;
			canvas.lineCap = 'round';

			switch(this.offsetConnect) {

				case HierarchyNode.CONNECT_TOP:
					canvas.beginPath();
					canvas.moveTo(this.nodeOffsetXCenter, 0);
					canvas.lineTo(this.nodeOffsetXCenter, -Y_PADDING/2);
					canvas.stroke();
				break;

				case HierarchyNode.CONNECT_LEFT:
					canvas.beginPath();
					canvas.moveTo(this.nodeOffsetXStart, this.nodeHeight/2);
					canvas.lineTo(-X_PADDING, this.nodeHeight/2);
					canvas.stroke();
				break;

				case HierarchyNode.CONNECT_RIGHT:
					canvas.beginPath();
					canvas.moveTo(this.nodeOffsetXStart+this.nodeWidth, this.nodeHeight/2);
					canvas.lineTo(this.layoutWidth+X_PADDING, this.nodeHeight/2);
					canvas.stroke();
				break;

			}

			canvas.restore();

		}

		// draw the child nodes
		if(this.children.length > 0 && this.drawChildren) {

			// draw the link to the child nodes
			canvas.save();
			canvas.lineWidth = 5;
			canvas.strokeStyle = this.strokeColor;
			canvas.lineCap = 'round';

			switch(this.layoutMode) {

				case HierarchyNode.DEFAULT_LAYOUT:

					// small vertical line
					canvas.beginPath();
					canvas.moveTo(this.nodeOffsetXCenter, this.nodeHeight);
					canvas.lineTo(this.nodeOffsetXCenter, this.nodeHeight + Y_PADDING/2);
					canvas.stroke();

					// long horizontal line
					if(this.children.length >= 2) { var s=0, e=this.children.length-1;
						canvas.beginPath();
						var extremeRight = Math.max(this.children[s].offsetX+this.children[s].nodeOffsetXCenter,this.nodeOffsetXCenter);
						var extremeLeft = Math.min(this.children[e].offsetX+this.children[e].nodeOffsetXCenter,this.nodeOffsetXCenter);
						canvas.moveTo(extremeRight, this.nodeHeight + Y_PADDING/2);
						canvas.lineTo(extremeLeft, this.nodeHeight + Y_PADDING/2);
						canvas.stroke();
					}
				break;

				case HierarchyNode.LEVELED_LAYOUT:
					var last = this.children.reduce(function(best,current) { return current.offsetY > best.offsetY ? current : best; }, this.children[0]);

					// long vertical line
					canvas.beginPath();
					canvas.moveTo(this.layoutWidthLeft, this.nodeHeight/2);
					if(this.children.length % 2 == 0) {
						canvas.lineTo(this.layoutWidthLeft, last.offsetY + last.nodeHeight/2);
					} else {
						canvas.lineTo(this.layoutWidthLeft, last.offsetY - Y_PADDING/2);
					}
					canvas.stroke();

					// small horizontal line
					if(this.nodeOffsetXCenter != this.layoutWidthLeft) {
						canvas.beginPath();
						canvas.moveTo(this.nodeOffsetXCenter, this.nodeHeight/2);
						canvas.lineTo(this.layoutWidthLeft, this.nodeHeight/2);
						canvas.stroke();
					}

				break;

				case HierarchyNode.COLUMN1_LAYOUT:
					var last = this.children[0];

					// long vertical line
					canvas.beginPath();
					canvas.moveTo(this.layoutWidthLeft, this.nodeHeight/2);
					canvas.lineTo(this.layoutWidthLeft, last.offsetY + last.nodeHeight/2);
					canvas.stroke();

				break;

			}

			canvas.restore();

			// draw the children themselves
			for(var i=this.children.length; i--;) { var childNode = this.children[i];

				// draw the node
				childNode.render(canvas, options);

				// draw a ghost block if needed
				if(!options.nodeCompress) {
					var missingHeight = childNode.missingHeight;
					var missingLeft = childNode.missingWidthLeft;
					var missingRight = childNode.missingWidthRight;
					if(missingHeight >= 0) {
						canvas.fillStyle = createStripes(canvas, this.ghostFillColor || this.fillColor, 0.1);
						canvas.fillRect(
							childNode.offsetX, childNode.offsetY + childNode.layoutHeight + Y_PADDING,
							childNode.layoutWidth, missingHeight
						);
					}
					if(missingLeft >= 0) {
						canvas.fillStyle = createStripes(canvas, this.ghostFillColor || this.fillColor, 0.1);
						canvas.fillRect(
							childNode.offsetX-missingLeft-X_PADDING, childNode.offsetY,
							missingLeft, childNode.layoutHeight
						);
					}
					if(missingRight >= 0) {
						canvas.fillStyle = createStripes(canvas, this.ghostFillColor || this.fillColor, 0.1);
						canvas.fillRect(
							childNode.offsetX+childNode.layoutWidth+X_PADDING, childNode.offsetY,
							missingRight, childNode.layoutHeight
						);
					}
				}

			}

		}

		// draw the main node
		if(!options.nodeCompress) {
			// draw the main node ghost
			canvas.fillStyle = createStripes(canvas, this.ghostFillColor || this.fillColor, 0.2);
			canvas.fillRect(
				0, 0,
				this.layoutWidth, this.nodeHeight
			);
		}

		canvas.fillStyle = fillColor;
		canvas.translate(this.nodeOffsetXStart, 0);
		canvas.clipRect(0, 0, this.nodeWidth, this.nodeHeight);
		canvas.fillRect(0, 0, this.nodeWidth, this.nodeHeight);  // here
		
		if (!this.active) {
			canvas.fillStyle = createStripes(canvas, this.stripeColor, this.stripeOpacity);
			canvas.fillRect(0, 0, this.nodeWidth, this.nodeHeight);
		}

		// compute the main node text
		var value = this.value;
		var TEXT_TO_DISPLAY_1 = ''+this.value;
		HierarchyNode.primaryText.some(function(primaryText) { if(value instanceof primaryText.dataType) { TEXT_TO_DISPLAY_1 = primaryText.get(value); return true; } else { return false; } });
		var TEXT_TO_DISPLAY_2 = TEXT_TO_DISPLAY_1.toUpperCase();
		HierarchyNode.secondaryText.some(function(secondaryText) { if(value instanceof secondaryText.dataType) { TEXT_TO_DISPLAY_2 = secondaryText.get(value); return true; } else { return false; } });

		// draw the main node text
		var FONT_HEIGHT = 16; var PAD = 9;
		canvas.fillStyle = textColor;
		canvas.font = "700 "+FONT_HEIGHT+"px 'Arial'";
		if(TEXT_TO_DISPLAY_1.length > 15) {
			var ratio = Math.min(1.0, Math.max(0.65, 15/TEXT_TO_DISPLAY_1.length));
			var ratio = Math.floor(20*ratio)/20;
			canvas.save(); canvas.translate(PAD+50-13, PAD-3+FONT_HEIGHT); canvas.scale(ratio, 1.0);
			canvas.fillText(TEXT_TO_DISPLAY_1, 0, 0);
			canvas.restore();
		} else {
			canvas.fillText(TEXT_TO_DISPLAY_1, PAD+50-13, PAD-3+FONT_HEIGHT);
		}

		canvas.globalAlpha = 0.75;
		canvas.font = "400 "+Math.round(FONT_HEIGHT*0.75)+"px 'Arial'";
		canvas.fillText(TEXT_TO_DISPLAY_2, PAD+50-13, PAD-3+FONT_HEIGHT*2);
		canvas.globalAlpha = 1.0;

		// draw the main node badge
		var colors = [/*$yellow*/ "#b58900", /*$orange*/ "#cb4b16", /*$red*/ "#dc322f", /*$magenta*/ "#d33682", /*$violet*/ "#6c71c4", /*$blue*/ "#268bd2", /*$cyan*/ "#2aa198", /*$green*/ "#859900"];
		var level = 0, node = this; while(node=node.parent) { level++ };
		canvas.fillStyle = this.options.badgeColor || colors[7-level%8];
		canvas.fillRect(PAD,PAD,50-2*10,50-2*10);

		//// draw the small children node badges
		//var maxI = Math.min(9, this.children.length);
		//level++; for(var i=maxI; i--;) { var k = maxI-i-1;
		//	canvas.fillStyle = 'rgba(0,0,0,0.3)'//*/colors[7-level%8];
		//	canvas.fillRect(PAD+1+(8+2)*(k%3),PAD+50-2*10-(8+2)*(1+Math.floor(k/3)|0)+1,8,8);
		//}

		// draw the children count in the badge
		if(this.children.length>0) {
			canvas.fillStyle = 'rgba(255,255,255,0.7)'; //this.strokeColor;
			canvas.font = "700 18px monospace";
			canvas.fillText(''+this.children.length, 2+PAD+1, -6+PAD+50-2*10+1);
		}

		canvas.restore();

	},

	createInteractiveHTML: function(wrapper, parent_rootX, parent_rootY, oninvalidated, options) { var This=this;  // here possible performance issues for large trees! TODO: refactor from recursive to iterative
		// according to Francois it's not due to recursion, because it never goes deeper than four levels.
		// relocate the root
		var rootX = parent_rootX + this.offsetX;
		var rootY = parent_rootY + this.offsetY;

		// mark all nodes as not used
		if(rootX == 0 && rootY == 0) {
			var divs = wrapper.querySelectorAll('[data-node]');
			for(var i = divs.length; i--;) {
				divs[i].setAttribute('data-unused','true');
			}
		}

		// abort if the element wasn't shown
		if(this.parent && !this.parent.drawChildren) { return; }

		// add html for the element
		var div = wrapper.querySelector('[data-node="'+this.id+'"]'); // TODO: optimize
		if (div) {
			div.removeAttribute('data-unused');
			div.classList.add('transitioned');
			div.classList.remove('main'); if(DragAndDrop.lastSource==This || (DragAndDrop.lastSource && DragAndDrop.lastSource.indexOf && DragAndDrop.lastSource.indexOf(This)!=-1)) { div.classList.add('main'); }
			var s = (window.getComputedStyle ? window.getComputedStyle(div) : div.currentStyle); s = s[CSSPROP_TRANSITION];
			setTimeout(function() { div.classList.remove('transitioned') }, 555);
		} else {
			div = document.createElement("a");
			div.href = "data:"+this.value;
			div.title = this.value;
			div.className = "orgchart-chart-drag-item";
			div.setAttribute('data-node', this.id);
			div.onclick = function() { return false; }
			div.setAttribute('universe-id', this.value.id);
			div.ondragstart = function() { return false; }
			div.onselectionstart = function() { return false; }

			///
			/// ACTIONS
			///
			var actions = HierarchyNode.actions.filter(function(data) { return (This.value instanceof data.dataType); });
			var actions = actions[0] ? actions[0] :  { get: function() { return {}; }};
			var actions = actions.get(This, options, div, oninvalidated);

			///
			/// EVENTS
			///

			var lastClick = -1000.0; var dragSource = null;
			var onclick = actions.onclick;
			var ondblclick = actions.ondblclick;
			var onwheelclick = actions.onwheelclick;
			var dragBehavior = actions.dragBehavior || {};
			var isValidDragTarget = dragBehavior.isValidDragTarget ? dragBehavior.isValidDragTarget : function(){return false;}
			var isValidDropTarget = dragBehavior.isValidDropTarget ? dragBehavior.isValidDropTarget : function(){return false;}
			div.setAttribute('touch-action', 'none');
			div.addEventListener('pointerdown', function(e) {

				// use special paths for alternative mouse buttons
				if('which' in e ? e.which == 3 : e.buttons&4==4) { window.context.fromPointer=true; return; }
				if('which' in e ? e.which == 2 : e.buttons&2==2) { onwheelclick(); e.preventDefault(); return; }
				if('which' in e ? e.which != 1 : e.buttons&1!=1) { return; } else { e.preventDefault(); }

				// handle double-click & long-click gestures
				var didShowMenu = false; //clearTimeout(onclick.timer);
				if(!PointerEvent.isMouse(e)) {
					setTimeout(function() {
						if(!started && !stopped) {
							stopped = didShowMenu = true; window.context.fromPointer=true;
							var menuEvent = document.createEvent('MouseEvents'); menuEvent.initMouseEvent('contextmenu', true, true, div.ownerDocument.defaultView, 1, startX, startY, startX, startY, false, false, false, false, 1, null);
							div.dispatchEvent(menuEvent);
						}
					}, 750);
				} else {
					setTimeout(function() {
						if(!started && !stopped) { /* change the css if you update this line: */ div.style.cursor='move'; div.style.cursor='-webkit-grabbing'; div.style.cursor='grabbing'; }
					}, 300);
				}

				// handle the current pointer down
				var pid = e.pointerId;
				var busy = false;
				var started = false;
				var stopped = false;
				var startX = e.clientX; var dx=0;
				var startY = e.clientY; var dy=0;

				var onmove = function(e) { if(e.pointerId != pid) { return; }

					// start drag on first move (at least 3px)
					if(started===false && stopped===false) {

						dx = e.clientX - startX;
						dy = e.clientY - startY;

						if(dx*dx+dy*dy >= (PointerEvent.isMouse(e) ? 25 : 100)) {

							if(isValidDragTarget(This, e)) {
								if(This.selected && This.getRoot().selectedNodes.length >= 2) {
									DragAndDrop.beginDrag('HierarchyNode[of:'+This.value.constructor.name+'][]', dragSource=This.getRoot().selectedNodes, function(s,d,didDrag) { return didDrag && oninvalidated(true,true) }, e);
								} else {
									DragAndDrop.beginDrag('HierarchyNode[of:'+This.value.constructor.name+']', dragSource=This, function(s,d,didDrag) { return didDrag && oninvalidated(true,false) }, e);
								}
							} else {
								DragAndDrop.beginDrag('DragFaultStart', dragSource='The current object is not a valid drag source', null, e);
							}

							started = true;
							busy = true;

						}

					}

					// update the drag position if still busy
					if(busy) {
						dx = e.clientX - startX;
						dy = e.clientY - startY;
					}

				}
				var onup = function(e) { if(e.pointerId != pid) { return; }

					stopped = true;
					div.style.cursor='';
					div.classList.remove('ondropinvalid');
					window.removeEventListener('pointermove', onmove, true);
					window.removeEventListener('pointerup', onup, true);
					window.removeEventListener('pointercancel', onup, true);
					e.preventDefault();

					if(!started && e.type!='pointercancel') {

						// if right click
						if(didShowMenu) {

							// prevent anyone else from getting this event
							e.stopPropagation();
							e.keepContextMenu = true;

							// mark the click timing
							lastClick = -1000;

						}

						// if double click
						else if(new Date().getTime() - lastClick <= 350) {

							//// cancel pending click
							//clearTimeout(onclick.timer);

							// raise the double click
							onclick && onclick.call(div);
							ondblclick(e);

							// mark the click timing
							lastClick = -1000;

						}

						else if(onclick) {

							//// tentatively raise the click event
							//onclick.timer = setTimeout(onclick.bind(div), 201);
							onclick.call(div);

							// mark the click timing
							lastClick = new Date().getTime();

						} else {

							// mark the click timing
							lastClick = new Date().getTime();

						}

					}

					if(busy && DragAndDrop.source==dragSource) {
						DragAndDrop.endDrag();
					}

				}
				window.addEventListener('pointermove', onmove, true);
				window.addEventListener('pointerup', onup, true);
				window.addEventListener('pointercancel', onup, true);
				return false;
			});
			div.addEventListener('pointerover', function(e) {

				function checkSource(source) { return source!==This && source.parent && source.parent!==This }

				if(!actions.dragBehavior || !actions.dragBehavior.isValidDropTarget) {
					return;
				}

				if(DragAndDrop.sourceKind && e.pointerId==DragAndDrop.pid) {
					if(isValidDropTarget(This, e)) {
						DragAndDrop.updateDestination('HierarchyNode[of:'+This.value.constructor.name+']', This, function(s,d,didDrag) { div.classList.remove('ondropvalid'); if(didDrag) { oninvalidated(true, false); } });
						this.classList.add('ondropvalid');
					} else {
						this.classList.add('ondropinvalid');
					}
				}

			});
			div.addEventListener('pointerout', function(e) {
				if(this.classList.contains('ondropvalid')) {
					DragAndDrop.releaseDestination(This);
					this.classList.remove('ondropvalid');
				} else {
					this.classList.remove('ondropinvalid');
				}
			})

			wrapper.appendChild(div);
			var firstId = ":root"; var current = div; while(current=current.parentNode) { if(current.id) { firstId="#"+current.id; break; } }
			window.context && actions.contextMenu && window.context.attach(firstId+' [data-node="'+this.id+'"]', actions.contextMenu);

		}

		var top = (rootY)+"px";
		var left = (rootX+this.nodeOffsetXStart)+"px";
		if(div.style.top != top || div.style.left != left) {
			div.style.position = "absolute";
			div.style.width = this.nodeWidth+"px";
			div.style.height = this.nodeHeight+"px";
			div.style.top = top;
			div.style.left = left;
		} else {
			//console_log(this.value.toString());
			div.classList.remove('transitioned');
		}

		// add html for the children
		if(this.drawChildren) {
			for(var i=this.children.length; i--;) { var childNode = this.children[i];
				childNode.createInteractiveHTML(wrapper, rootX, rootY, oninvalidated, options);
			}
		}

		// remove nodes still marked as not used
		if(rootX == 0 && rootY == 0) {
			var divs = wrapper.querySelectorAll('[data-unused="true"]');
			for(var i = divs.length; i--;) {
				divs[i].parentNode.removeChild(divs[i]);
			}
		}
	},

	getRoot: function() {
		var root = this; while(root.parent) { root=root.parent; }
		return root;
	},

	getNodeByValue: function(v) {
		if(this.value===v || (v.id && this.value.id == v.id)) { return this; }
		for(var i = this.children.length; i--;) {
			var res = this.children[i].getNodeByValue(v); if(res) { return res; }
		}
		return null;
	},

	select: function() {
		$('#orgchart-select-to-focus-on').select2("val", '', true);
		if(!this.selected && this.active) {
			var root = this.getRoot(); if(this==root) { return; }
			root.selectedNodes.push(this);
			this.selected = true;
		}
	},

	unselect: function() {
		if(this.selected) {
			var root = this.getRoot();
			root.selectedNodes.splice(root.selectedNodes.indexOf(this), 1);
			this.selected = false;
		}
	},

	toggle: function() {
		if(this.selected) { this.unselect(); } else { this.select(); }
	},

	toString: function() {
		return '['+this.value+']';
	}
}

HierarchyNode.compare = function(a,b) {

	var deltaH = (a.layoutHeight-b.layoutHeight);
	if(deltaH != 0) { return deltaH; }

	var deltaW = (a.layoutWidth-b.layoutWidth);
	if(deltaW != 0) { return deltaW; }

	var deltaC = a.children.length-b.children.length;
	if(deltaC != 0) { return deltaC; }

	var av = a.value.toString();
	var bv = b.value.toString();
	if(av==bv) { return 0; }
	else { return av<bv?-1:+1; }

}

HierarchyNode.compareWidth = function(a,b) {

	var deltaW = (a.layoutWidth-b.layoutWidth);
	if(deltaW != 0) { return deltaW; }

	var av = a.value.toString();
	var bv = b.value.toString();
	if(av==bv) { return 0; }
	else { return av<bv?-1:+1; }

}

var HTree = function HTree(rootNode, n, options) { var maxLevel = HierarchyNode.MAX_LEVEL_PER_TREE;

	var options = options || (Object.create ? Object.create(null) : {});

	rootNode.setAttribute('touch-action', 'auto');
	rootNode.insertAdjacentHTML('beforeend','<center class="orgchart-center-wrapper"><div class="orgchart-chart-wrapper"><canvas width="100" height="100"></canvas></div></center>');
	rootNode.addEventListener('pointerdown', function(e) { 
		
		// unselect all nodes when clicking in the middle of nowhere
		var isDraggable = e.target.classList.contains('orgchart-chart-drag-item');
		var isOnScrollX = e.target==rootNode && e.clientY >= e.target.clientHeight+parseInt(getComputedStyle(e.target.parentNode).top);
		var isOnScrollY = e.target==rootNode && e.clientX >= e.target.clientWidth;
		if(!isDraggable && !isOnScrollX && !isOnScrollY) { 
			var sn = n.getRoot().selectedNodes; if(sn.length==0) { return; }
			for(var i=sn.length; i--;) { sn[i].selected=false; }; sn.length=0; 
			renderTree(false,false);
		}
		
	});
	var canvasNode = rootNode.querySelector('canvas');
	var wrapper = canvasNode.parentNode;

	var renderTree = function renderTree(reorder,relayout) {
		options.reorder = !!reorder; var SCALE_FACTOR = (window.devicePixelRatio>1 || screen.deviceXDPI>120)?2:1;

		if(relayout!==false) {

			// firstly, compute the abstract position of items

			if(options['nodeCompress_'+n.id] === undefined) {

				// try with a standard layout
				n.nodeAlign = HierarchyNode.CONNECT_TOP;
				n.nodeCompress = false;
				n.computeLayout(options, maxLevel);

				// then see if it fits the screen
				if(n.layoutWidth > 0.95*rootNode.offsetWidth) {
					// if not, compress the layout
					n.nodeAlign = HierarchyNode.CONNECT_LEFT;
					n.nodeCompress = true;
					n.computeLayout(options, maxLevel);
				}

			} else if(options['nodeCompress_'+n.id]) {

				n.nodeAlign = HierarchyNode.CONNECT_LEFT;
				n.nodeCompress = true;
				n.computeLayout(options, maxLevel);

			} else {

				n.nodeAlign = HierarchyNode.CONNECT_TOP;
				n.nodeCompress = false;
				n.computeLayout(options, maxLevel);

			}

			// secondly, modify the canvas to match
			canvasNode.width = SCALE_FACTOR*n.layoutWidth; canvasNode.height = SCALE_FACTOR*n.layoutHeight;
			if(SCALE_FACTOR!=1) { canvasNode.style.width = n.layoutWidth+'px'; canvasNode.style.height = n.layoutHeight+'px'; }
			canvasNode.style.boxSizing = 'content-box'; //IE10fix

			//if(n.layoutHeight >= rootNode.clientHeight) { rootNode.style[CSSPROP_ALIGN_ITEMS]='flex-start'; } else { rootNode.style[CSSPROP_ALIGN_ITEMS]='center';  }
			//if(n.layoutWidth >= rootNode.clientWidth) { rootNode.style[CSSPROP_JUSTIFY_CONTENT]='flex-start'; } else { rootNode.style[CSSPROP_JUSTIFY_CONTENT]='center';  }

		}

		// thirdly, create a 2d drawing surface
		var canvas = canvasNode.getContext('2d');
		canvas.clearRect(0,0,SCALE_FACTOR*n.layoutWidth,SCALE_FACTOR*n.layoutHeight);

		// fourthly, render on the canvas
		canvas.save(); if(SCALE_FACTOR!=1) { canvas.scale(SCALE_FACTOR,SCALE_FACTOR); }
		n.render(canvas, options); canvas.restore();
		rootNode.updateTabView && rootNode.updateTabView();

		if(relayout!==false) {

			// finally, make interactive the canvas
			n.createInteractiveHTML(wrapper, 0, 0, function(relayout,reorder) { scheduleRender(!!reorder,relayout) }, options);

		}

	};

	this.render = function (relayout) { renderTree (true, relayout); };  // careful with createInteractiveHTML, it's a very expensive operation, pass false if there's no need to rebuild a layout
	this.getN = function () {return n;}
	this.render();

	var resizeScheduled = false, reorder_state = false, relayout_state = false;
	var scheduleRender = function(reorder, relayout) {

		// any explicitly asked reordering persists
		if(reorder === true) { reorder_state=true; }

		// any non-explicitly-refused relayout persists
		if(relayout !== false) { relayout_state=true; }

		// schedule a repaint for the next frame
		if(!resizeScheduled) {
			resizeScheduled = true;
			requestAnimationFrame(function() {
				$('#orgchart-select-to-focus-on').select2("val", '');
				resizeScheduled=false;
				renderTree(reorder_state, relayout_state);
				reorder_state=false; relayout_state=false;
			});
		}

	};
	window.lastInnerWidth = window.innerWidth;
	window.addEventListener('resize', function() {
		if(window.lastInnerWidth == window.innerWidth) return;
		window.lastInnerWidth = window.innerWidth;
		scheduleRender(false, true);
	});
	rootNode.onfocus = rootNode.scheduleRender = scheduleRender;

};
//
// Define the data class
//

function Employee(id, data) {

	this.id = id;
	this.universalId = data.universePersonId || id;

	this.data = data;
	this.setName(data.firstName || i18n.noFirstName, data.lastName || i18n.noLastName);
	this.setLanguage(data.language || "en");
	this.professionLabel = data.professionLabel || data.profLabel;
	this.canBeManager = 'canBeManager' in data ? !!data.canBeManager : true;
	if(data.fullName) { this.fullName = data.fullName }

}

if(!Employee.name) { Employee.name="Employee"; }

Employee.prototype = {
	setName: function(firstName, lastName) {
		this.firstName = firstName;
		this.lastName = lastName;
		this.fullName = lastName.toUpperCase() + ((lastName&&firstName!='')?" ":'') + firstName;
	},
	setFirstName: function(firstName) {
		this.setName(firstName, this.lastName);
	},
	setLastName: function(lastName) {
		this.setName(this.firstName, lastName);
	},
	setLanguage: function(language) {
		this.language = language;
	},
	toString: function() {
		return this.fullName;
	},
	constructor: Employee
};


//
// undo-redo logic
//
function createUndoRedoChange(rootVal, target, newParent, oldParent) { if(!oldParent) { oldParent = target.parent; }

	//
	// unwrap nodes
	//
	if(target.value) target = target.value;
	if(newParent.value) newParent = newParent.value;
	if(oldParent.value) oldParent = oldParent.value;

	//
	// replace the "magic" newParent employee by the target
	//
	if(newParent.data.isMagicEmployee) { newParent = target; }
	if(oldParent.data.isMagicEmployee) { oldParent = target; }

	//
	// create the change element
	//
	return {
		/* property */
		propertyId: rootVal.managerType,
		propertyDescription: translate("hierarchy.managerNames." + rootVal.managerType), 
		/* employer */
		employerId: rootVal.employerId,
		employerDescription: rootVal.fullName,
		/* target */
		targetId: target.id,
		targetDescription: target.fullName,
		/* old value */
		oldValueId: oldParent && oldParent.id ? oldParent.id : -1,
		oldValueDescription: oldParent && oldParent.id ? oldParent.fullName : '',
		/* new value */
		newValueId: newParent && newParent.id ? newParent.id : -2,
		newValueDescription: newParent && newParent.id ? newParent.fullName : ''
	};
}


//
// add a new drag&drop behavior
//

DragAndDrop.createPopupFor['HierarchyNode[of:Employee]'] = function(e, node) {

	var supportsCssTransforms = (CSSPROP_TRANSFORM in document.body.style);
	var supportsCssPointerEvents = ('pointerEvents' in document.body.style) && !(document.documentMode <= 10);
	var shift = supportsCssPointerEvents ? -1 : +7;

	if(!supportsCssTransforms) return null;

	var popup = document.createElement("div");
	popup.textContent = node.value.toString();
	popup.style.position = "fixed";
	popup.style.top = (e.clientY+shift)+"px";
	popup.style.left = (e.clientX+shift)+"px";
	popup.style[CSSPROP_TRANSFORM] = 'translate(0px,0px)';
	popup.style[CSSPROP_TRANSFORM] = 'translateZ(0px) translate(0px,0px)';
	popup.style.opacity = '0';
	popup.style.padding = '3px 12px';
	popup.style.paddingBottom = '5px';
	popup.style.pointerEvents = 'none';
	popup.className = "orgchart-chart-drag-item ondragged";
	requestAnimationFrame(function() { popup.style.opacity = '1'; });
	return popup;

};
DragAndDrop.destroyPopupFor['HierarchyNode[of:Employee]'] = function(popup, didDrag) {

	if(didDrag) {
		popup.style.backgroundColor = 'lime';
		popup.style.opacity = 0;
	} else {
		popup.style.backgroundColor = 'red';
		popup.style.opacity = 0;
	}

	setTimeout(function() {
		document.body.removeChild(popup);
	}, 600);

};
DragAndDrop.createPopupFor['HierarchyNode[of:Employee][]'] = function(e, nodes) {
	return DragAndDrop.createPopupFor['HierarchyNode[of:Employee]'](e, {value:nodes.length+i18n.employee_s})
};
DragAndDrop.destroyPopupFor['HierarchyNode[of:Employee][]'] = DragAndDrop.destroyPopupFor['HierarchyNode[of:Employee]'];

DragAndDrop.actions["HierarchyNode[of:Employee] to TabView"] = function(source,tabManager) {
	var createTabFrom = tabManager.createTabFrom['HierarchyNode[of:Employee]'];
	if(createTabFrom) {
		return createTabFrom(source);
	} else {
		return false;
	}
};
DragAndDrop.actions["HierarchyNode[of:Employee] to HierarchyNode[of:Employee]"] = function(source,destination) { return DragAndDrop.actions["HierarchyNode[of:Employee][] to HierarchyNode[of:Employee]"]([source], destination); };
DragAndDrop.actions["HierarchyNode[of:Employee][] to HierarchyNode[of:Employee]"] = function(sources,destination) {

	//
	// firstly, check the arguments
	//
	var sourcesMatchingFailed = false;
	var sourcesRequiredMatching = false;

	// [1] the destination has to have the manager role
	if(!destination.value.canBeManager) {
		if(PrestaWeb.Module().accessRights.canWrite("iadmin")) {
			showMessage(translate('hierarchy.cantBeManagerYet'), 'alert-warning');
		} else {
			showMessage(translate('hierarchy.cantBeManager'));
			return false;
		}
	}
	
	// [2] inactive nodes can only be placed under the nobody node
	if (!destination.active || Utils.hasInactiveNodes(sources)) {
		showMessage(translate('hierarchy.inactiveNodes.replace'));
		return false;
	}

	// [3] the sources nodes have to exist in the destination tree
	var newSources = _.map(sources, toSameOrigin); var sources = newSources;
	if(sourcesMatchingFailed) {
		showMessage(translate('hierarchy.employeeNotFoundInTargetGraph'));
		return false;
	}

	// [4] the sources are accepted by the destination
	if(sources.every(checkSource)) {

		// secondly, inform the user of auto-fixed mistakes
		if(sourcesRequiredMatching) { if(!confirm(translate('hierarchy.confirmCrossGraphTransfer'))) { return false; } }
		
		// then, create the undo/redo action
		var action; do {
			
			// enumerate all the required changes
			var rootVal = destination.getRoot().value;
			var changes = sources.map(function(source) {
				return createUndoRedoChange(rootVal, source, destination);
			});
			
			// make a snapshot of the current state
			var currentTabId = tabManager.currentTab.id;
			var currentSourceParents = sources.map(function(s) { return s.parent; });
			var currentSourcePositions = sources.map(function(s, i) { return currentSourceParents[i].removeChild(s); });
			
			// cancel the action
			var undo = function() {
				
				// apply the requested change to all elements
				for(var i = sources.length; i--;) { var source = sources[i];

					//alert('The new manager of '+source.value+' has become '+currentSourceParents[i].value+' again.')
					source.parent.removeChild(source);
					currentSourceParents[i].appendChild(source, currentSourcePositions[i]);

				}
				
				// try to find the current tab, and refresh it
				var currentTab = document.getElementById(currentTabId) || tabManager.currentTab;
				tabManager.switchTo(currentTab); currentTab.scheduleRender && currentTab.scheduleRender();
				
			};
			
			// restore the action after an undo
			var redo = function() {
				
				// check the requirements again
				if(!sources.every(checkSource)) { showMessage(translate('hierarchy.requirementsNotMetAnymore')); return false; }
				
				// apply the requested change to all elements
				for(var i = sources.length; i--;) { var source = sources[i];

					//alert('The new manager of '+source.value+' has become '+destination.value+'.')
					source.parent.removeChild(source);
					destination.appendChild(source);

				}
				
				// try to find the current tab, and refresh it
				var currentTab = document.getElementById(currentTabId) || tabManager.currentTab;
				tabManager.switchTo(currentTab); currentTab.scheduleRender && currentTab.scheduleRender();
				
				// the operation was a success
				return true;
				
			};
			
			// generate the wrapper
			action = undoredo.push(undo, redo, "drag_and_drop", changes);
			
		} while(false);
		
		// now, apply the requested change everywhere
		for(var i = sources.length; i--;) { var source = sources[i];

			//alert('The new manager of '+source.value+' has become '+destination.value+'.')
			destination.appendChild(source);

		}
		
		// unselect everything
		destination.getRoot().selectedNodes.slice(0).forEach(function(n) { n.unselect(); });

		// save the current source in an obscure location
		DragAndDrop.lastSource = sources;

		// reports the operation was a success
		return true;

	} else {

		// reports the operation was a noop
		showMessage(translate('hierarchy.requirementsNotMet'));
		return false;

	}


	//---------------------------------------------------------------------------------

	//
	// convert a source to the destination tree, if necessary
	//
	function toSameOrigin(source) {

		// check that the origin is the same for the two nodes
		if(source.getRoot() === destination.getRoot()) {

			// if yes, we have nothing more to do
			return source;

		} else {

			// otherwise, we may want to warn the user
			sourcesRequiredMatching = true;

			// and we need to find the equivalent of the said node in the destination graph
			var newSource = destination.getRoot().getNodeByValue(source.value);

			// detect matching errors
			sourcesMatchingFailed = sourcesMatchingFailed || (newSource==null||newSource==undefined);

			// return the updated value
			return newSource;

		}

	}

	//
	// verifies that a source is accepted for the current destination
	//
	function checkSource(source) {

		// check that the nodes aren't identical
		if(source === destination || source.parent === destination) { return false; }

		// check that we actually do something useful
		if((source.value.id == destination.value.id) && (!source.parent || source.parent.value.id == destination.value.id)) { return false; }

		// check that we don't create a loop (as far as we know)
		var target = destination; while(target=target.parent) { if(target.value.id==source.value.id) { showMessage(i18n.noLoop); return false; } }

		// it looks ok
		return true;

	}

};

//
// add interactive behavior of nodes
//

HierarchyNode.primaryText.push({
	dataType: Employee,
	get: function(e) { return (e.lastName||e.lastname||e.name).toUpperCase()/*e.fullName*/; }
});

HierarchyNode.secondaryText.push({
	dataType: Employee,
	get: function(e) { return (e.firstName||e.firstname); }
});

HierarchyNode.actions.push({
	dataType: Employee,
	get: function(This, options, div, oninvalidated) {

		//
		// Change the selection state of the current node
		//
		function toggleSelectionOf(This) {
			if(This.value.id >= 0) {
				This.toggle();
				return true;
			} else {
				return false;
			}
		}
		var toggleSelection = function(noUpdate) {
			if(toggleSelectionOf(This) && noUpdate !== false) oninvalidated(false);
			return false;
		};

		//
		// Creates and focus a new tab whose the current node is the root
		//
		var openMeInNewTab = function() {
			var t1 = tabManager.createTabFrom['HierarchyNode[of:Employee]'](This);
			tabManager.switchTo(t1);
		};

		//
		// Creates and focus a new tab whose one of the current node's ancestors is the root
		//
		var openBossInNewTab = function(k) {

			// detect the N+k boss
			var parent = This.parent ? This.parent : null;
			while(--k>0) { parent = parent && parent.parent ? parent.parent : parent; }

			// display it in a new tab
			if(parent) {
				var t1 = tabManager.createTabFrom['HierarchyNode[of:Employee]'](parent);
				tabManager.switchTo(t1);
			} else {
				showMessage(i18n.noParent);
			}

		};

		//
		// Change the selection state of the children of the current node
		//
		var selectAllChildren = function() {
			for(var i = This.children.length; i--;) {
				toggleSelectionOf(This.children[i]);
			}
			oninvalidated(false);
		};

		//
		// Swap the position of two nodes
		//
		var swapHierarchyNodes = function() {

			var sn = This.getRoot().selectedNodes;
			if(sn.length == 2 && This.selected) {
				var n1 = sn[0];
				var n2 = sn[1];
			} else if(sn.length == 1 && !This.selected && This.parent && This.value.id >= 0) {
				var n1 = sn[0];
				var n2 = This; This.select();
			} else {
				showMessage(i18n.pleaseTwoNodes);
				return false;
			}

			var undo = function() { performSwap(n1,n2); }, redo = undo;
			undoredo.push(undo, redo, "node_swap", performSwap(n1, n2));
			
		};
		
		var performSwap = function(n1, n2) {
			
			var changes = [], rootVal = n1.getRoot().value;
			
			var n1p = n1.parent; var n1index = n1p.removeChild(n1); if(n1p==n2) { n1p=n1; }
			var n2p = n2.parent; var n2index = n2p.removeChild(n2); if(n2p==n1) { n2p=n2; }
			if(n1p==n2p) { if(n2index>=n1index) { n2index++; } }

			var n1cs = n1.children;
			var n2cs = n2.children.slice(0);
			for(var i = n1cs.length; i--;) {
				var n1c = n1cs[i];
				if(n1c !== n2) { changes.push(createUndoRedoChange(rootVal, n1c, n2)); }
				n1.removeChild(n1c); if(n1c == n2) { continue; }
				n2.appendChild(n1c, 0);
			}
			for(var i = n2cs.length; i--;) {
				var n2c = n2cs[i];
				if(n2c !== n1) { changes.push(createUndoRedoChange(rootVal, n2c, n1)); }
				n2.removeChild(n2c); if(n2c == n1) { continue; }
				n1.appendChild(n2c, 0);
			}

			if(n1p != n2p || n2index > n1index) {
				changes.push(createUndoRedoChange(rootVal, n2, n1p, n2p));
				changes.push(createUndoRedoChange(rootVal, n1, n2p, n1p));
				n1p.appendChild(n2,n1index); 
				n2p.appendChild(n1,n2index); 
			} else {
				changes.push(createUndoRedoChange(rootVal, n1, n2p, n1p));
				changes.push(createUndoRedoChange(rootVal, n2, n1p, n2p));
				n2p.appendChild(n1,n2index); 
				n1p.appendChild(n2,n1index);
			}

			n1.unselect();
			n2.unselect();

			oninvalidated(true);
			return changes;

		};
		
		var deleteInactive = function () {
			if (This.children.length) {
				showMessage(translate('hierarchy.inactiveNodes.deleteWithChildren'));
				return;
			}
			
			var undo = (function(node) { 
				return function() {
					node.appendChild(This)
					oninvalidated(true);
				}; 
			})(This.parent);
				
			var redo = function () {
				var changes = [];
				var parent = This.parent;
				parent.removeChild(This);
				changes.push(createUndoRedoChange(parent.getRoot().value, This, {data : {}}, parent));
				oninvalidated(true);
				return changes;
			}
			undoredo.push(undo, redo, "node-delete", redo());
		};

		//
		// summary
		//
		var result = {
			onclick: toggleSelection,
			ondblclick: openMeInNewTab,
			onwheelclick: openMeInNewTab,
			dragBehavior:
				{
					isValidDragTarget: function(This, e) {
						return This.value.id >= 0;
					},
					isValidDropTarget: function(This, e) {

						// refuse to drop on the "error" node
						if(!This.value || This.value.id == -1) { return false; }

						// refuse to drop on a parent node
						function checkSource(source) { return source!==This && source.parent && source.parent!==This; }
						switch(DragAndDrop.sourceKind) {
							case 'HierarchyNode[of:Employee]':
								return checkSource(DragAndDrop.source);
							case 'HierarchyNode[of:Employee][]':
								return !This.selected && This.getRoot().selectedNodes.every(checkSource);
							default:
								return false;
						}

					},
					onDragEnd: function() {
						oninvalidated(false);
					}
				},
			contextMenu:
				[
					{ text:i18n.openMe, action: function(e) { openMeInNewTab(); e.preventDefault(); } },
					{ text:i18n.openN1, action: function(e) { openBossInNewTab(1); e.preventDefault(); } },
					{ text:i18n.openN2, action: function(e) { openBossInNewTab(2); e.preventDefault(); } },
					{ divider: true },
					{ text:i18n.selectAllChildren, action: function(e) { selectAllChildren(); e.preventDefault(); } },
					{ text:i18n.swapRoles, action: function(e) { swapHierarchyNodes(); e.preventDefault(); } },
					{ divider: true },
					{ text:i18n.displayOptions, subMenu: [
						{ text:i18n.showChildren, subMenu: [
							{ text:i18n.autoDisplay, action: function(e) { options['drawChildren_'+This.id]=undefined; oninvalidated(true); } },
							{ text:i18n.alwaysDisplay, action: function(e) { options['drawChildren_'+This.id]=true; oninvalidated(true); } },
							{ text:i18n.neverDisplay, action: function(e) { options['drawChildren_'+This.id]=false; oninvalidated(true); } }
						]},
						{ text:i18n.layoutMode, subMenu: [
							{ text:i18n.autoLayout, action: function(e) { options['layoutMode_'+This.id]=undefined; oninvalidated(true); } },
							{ text:i18n.defaultLayout, action: function(e) { options['layoutMode_'+This.id]=HierarchyNode.DEFAULT_LAYOUT; oninvalidated(true); } },
							{ text:i18n.twoColumnsLayout, action: function(e) { options['layoutMode_'+This.id]=HierarchyNode.LEVELED_LAYOUT; oninvalidated(true); } },
							{ text:i18n.oneColumnLayout, action: function(e) { options['layoutMode_'+This.id]=HierarchyNode.COLUMN1_LAYOUT; oninvalidated(true); } }
						]},
						{ text:i18n.nodeCompress, subMenu: [
							{ text:i18n.autoDisplay, action: function(e) { options['nodeCompress_'+This.id]=undefined; oninvalidated(true); } },
							{ text:i18n.alwaysDisplay, action: function(e) { options['nodeCompress_'+This.id]=true; oninvalidated(true); } },
							{ text:i18n.neverDisplay, action: function(e) { options['nodeCompress_'+This.id]=false; oninvalidated(true); } }
						]}
					]}
				]
		};
		
		if(!This.active && This.getRoot().value.data.managerType !== "administrator") {
			result.contextMenu.push({ divider: true }, {text: translate('hierarchy.inactiveNodes.delete'), action: function(e) { deleteInactive(); e.preventDefault(); } });
		}
		
		return result;

	}
});try { Dropzone.autoDiscover = false; } catch (ex) {}

function translate(key) {
  return PrestaWeb.traduction.translate(key);
}

/**
 * Initializes the user interface of the application
 * @param api
 * @param session
 * @param module
 * @param pxr {ProxyResolver}
 */
function initUI(api, session, module, pxr) { "use strict";

  // this proxy loader is used for auxiliary, non-critical tasks
  var low_pxr = window.low_pxr/*debug*/ = pxr.fork({
    loader:new LoaderDomain({name:'low-page-load'})
  });

  //
  // Start the loader code
  //
  var loader = pxr.loader;
  var loaderLocker = $.Deferred(); loaderLocker.name = 'initUI';
  loader.waitOn(loaderLocker);

  //
  // Load the page controllers
  //
  FooterPicker(session);
  
  HeaderLoader(loader);
  NavigationMenu("#navigation-menu",
    {
      "#intro-view-link": "#intro-view",
      "#tree-view-link": "#tree-view",
      "#table-view-link": "#table-view",
      "#import-view-link": "#import-view"
    },
    {
      onBeforeSwitch: function(tab) {
        if(undoredo.entryIndex == 0) {
          undoredo.clearEntries();
          return true;
        } else {
          window.onbeforeunload();
          showMessage(translate('saveConfirmation.pleaseSaveFirst') + ' (<a href="javascript:undoredo.commit(); var container = document.getElementById(\'message-container\'); container.innerHTML=\'\'; $(container.parentNode).hide();">'+translate('common.submit')+'</a>) (<a href="javascript:while(undoredo.entryIndex) { undoredo.undo() }; undoredo.clearEntries(); while(tabManager.element.firstChild){tabManager.removeChild(tabManager.element.firstChild)}; $(\'#intro-view-link\').click(); var container = document.getElementById(\'message-container\'); container.innerHTML=\'\'; $(container.parentNode).hide();">'+translate('common.resetToZero')+'</a>)');
          return false;
        }
      }
    }
  );

  var sizer = PageAutoSizer();
  TreeView(pxr, sizer, session);
  TableView(pxr, session);
  ImportView(pxr);

  //
  // undo/redo
  //
  UndoRedoView(pxr);

  //
  // show message on first time here
  //
  if(!module.accessRights.canAccess("iadmin") && !localStorage.skipHierarchyFirstTime) {
    pxr.messageHandler.then(function(messageHandler) {
      function showMessage() {
        if(messageHandler.isVisible()) {
          setTimeout(showMessage, 500);
        } else {
          messageHandler.showMessage(translate('hierarchy.cantBeManagerPrevention'), 'alert-warning');
          localStorage.skipHierarchyFirstTime = true;
        }
      }
      showMessage();
    })
  }

  //
  // end of loading
  //
  loaderLocker.resolve();

}

$(function () {
  "use strict";
  $("#loader").removeClass('hide');
  var app = "hierarchy";

  var session = Framework.Session();
  var module = PrestaWeb.Module();
  var lang = session.read("user") ? session.read("user").language : Framework.functions.getNavigatorLanguage();
  var messageHandler = Framework.MessageHandler("#error-drawer", "#message-container", "#alert-message-template", lang);
  var api = Framework.Api({
    serverError0Callback: messageHandler.serverError0Callback,
    serverError5xxCallback: messageHandler.serverError5xxCallback,
    serverError401Callback: serverError401
  });

  function serverError401() {
    module.redirectToLogin(lang, app);
  }

  function entryPointFailed() {
    messageHandler.showMessage("Entry Point Failed.");
  }

  /***********  Start  *************/
  var startTerminated = PrestaWeb.start(app, lang, messageHandler);
  startTerminated.done(function startCallback() {
    PrestaWeb.loadHeader();
    messageHandler.init();
    moment.lang(session.read("user").language);

    var securityModel = new SecurityModel(session, messageHandler);
    var pxr = window.pxr/*debug*/ = CheckedProxyResolver(
      api, module, session, messageHandler,
      app, securityModel.getRequirements,
      { loader:new LoaderDomain({name:'page-load'}) }
    );

    initUI(api, session, module, pxr);


  });

});