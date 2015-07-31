define([
    'mustache',
    'reqwest',
    'text!templates/appTemplate.html',
    'text!templates/metaTemplate.html'
], function(
    Mustache,
    reqwest,
    template,
    metaTemplate
) {
    'use strict';

    var formattedData = [],
        headerRows = [],
        reversed = false,
        data,
        tbodyEl,
        tableEl,
        currentSort,
        lastSorted,
        searchable,
        searchEl,
        averages = [],
        percentages = [],
        highlighted = {},
        highlightedFunc = function() {
            if (highlighted[this[0]]) {
                return "highlighted"
            };
        };

    function init(el, spreadsheetID) {
        reqwest({
            url: "http://interactive.guim.co.uk/docsdata-test/" + spreadsheetID + ".json",
            type: "json",
            method: "get",
            success: function(resp) {
                app(resp, el)
            }
        })
    }

    function app(spreadsheet, el) {
        console.log(spreadsheet);
        data = spreadsheet;
        searchable = (data.sheets.tableMeta[0].searchable.toLowerCase() === 'true');

        // reformat data into an array of arrays
        // for (var i = 0; i < data.sheets.dataSheet.length; i++) {
        //     formattedData[i] = [];
        //     for (j in data.sheets.dataSheet[0]) {
        //         if (j === "highlight") {
        //             highlighted[formattedData[i][0]] = data.sheets.dataSheet[i][j];
        //         } else if (data.sheets.dataSheet[i][j].toString().slice(0, 11) === "[sparkline=") {
        //             length++;
        //             formattedData[i][length] = draw(data.sheets.dataSheet[i][j].substr(11).slice(0, -1));
        //         } else {
        //             length++;
        //             formattedData[i][length] = data.sheets.dataSheet[i][j];
        //         }
        //     }
        //     length = -1;
        //     formattedData[i].pop();
        // }

        headerRows = data.sheets.tableDataSheet[0];
        formattedData = data.sheets.tableDataSheet.slice(1);

        // convert highlight column into usable format and pop
        if(headerRows[headerRows.length-1] === "highlight") {
            formattedData.map(function(row) {
                highlighted[row[0]] = row[headerRows.length-1];
                row.pop();
            });
            headerRows.pop();
        }

        //init Sparklines
        formattedData.map(function(row, i) {
            row.map(function(cell, j) {
                if(cell.toString().slice(0, 11) === "[sparkline=") {
                    formattedData[i][j] = draw(cell.substr(11).slice(0, -1));
                }
            });
        });

        console.log(formattedData);

        var tableRendered = Mustache.render(template, {
            rows: formattedData,
            highlightClass: highlightedFunc
        });
        var metaRendered = Mustache.render(metaTemplate, {
            meta: data.sheets.tableMeta[0],
            headerRows: headerRows,
            searchable: searchable
        });
        el.innerHTML = metaRendered;

        tbodyEl = document.querySelector("#int-table tbody");
        tableEl = document.getElementById("int-table");
        tbodyEl.innerHTML = tableRendered;

        initSearch();

        addMobilePrefix();

        document.querySelector("tr").addEventListener("click", sortColumns);
    }

    function sortColumns(e) {
        formattedData = formattedData.sort(propComparator(e.target.cellIndex));

        if (lastSorted) {
            lastSorted.className = "column-header";
        }
        if (lastSorted === e.target && reversed === false) {
            e.target.className = "column-header sorted-reversed";
            reversed = true;
        } else {
            e.target.className = "column-header sorted";
            reversed = false;
        }
        if(!hasClass(tableEl,"table-sorted")) {
            tableEl.className = "table-sorted";
        }
        lastSorted = e.target;
        render();
    }

    function propComparator(prop) {
        var c,d;
        currentSort = (currentSort !== prop) ? prop : null;
        return function Comparator(a, b) {
            c = (typeof a[prop] === "string" && !isNaN(parseInt(a[prop]))) ? parseInt(a[prop].replace(/,/g, '')) : a[prop]; //refactor
            d = (typeof b[prop] === "string" && !isNaN(parseInt(b[prop]))) ? parseInt(b[prop].replace(/,/g, '')) : b[prop];
            if (c < d) return (currentSort !== prop) ? -1 : 1;
            if (c > d) return (currentSort !== prop) ? 1 : -1;
            return 0;
        }
    }

    function initSearch() {
        if (searchable) {
            searchEl = document.getElementById("search-field");
            searchEl.addEventListener("keyup", render);
            searchEl.addEventListener("focus", function() {
                if(this.value === "Search") {
                    this.value = "";
                }
            });
            searchEl.addEventListener("blur", function() {
                if (this.value === "") {
                    this.value = "Search";
                }
            });
        }
    }

    function render() {
        var rowsToRender = (searchEl.value !== "Search" && searchEl.value !== "") ? formattedData.filter(searchMatch) : formattedData,
            emptyBoolean = (rowsToRender.length > 0) ? false : true,
            rendered = Mustache.render(template, {
                rows: rowsToRender,
                highlightClass: highlightedFunc,
                emptyBoolean: emptyBoolean
            });

        tbodyEl.innerHTML = rendered;
    }

    function addMobilePrefix() {
        var css = "",
            head = document.head || document.getElementsByTagName('head')[0],
            style = document.createElement('style'),
            d = 1,
            e = 1;

        css = "@media (max-width: 30em) {";

        headerRows.map(function(name) {
            css += "tr td:nth-child(" + d + ")::before { content: '" + name + ": '; font-weight: 500; }";
            d++;
        });

        css += "}";

        style.type = 'text/css';

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }

        head.appendChild(style);
    }

    function searchMatch(array) {
        var c = 0;

        for (var a = 0; a < array.length; a++) {
            c = (array[a].toString().toLowerCase().indexOf(searchEl.value.toLowerCase()) !== -1) ? c + 1 : c;
        }

        return (c > 0) ? true : false;
    }

    function hasClass(el, cls) {
        if (!el.className) {
            return false;
        } else {
            var newElementClass = ' ' + el.className + ' ';
            var newClassName = ' ' + cls + ' ';
            return newElementClass.indexOf(newClassName) !== -1;
        }
    }

    function scale(max, min, num) {
        return (100 * (num - min) / (max - min)) || 0;
    }

    function draw(dataString) {
        var elem = document.createElement("svg"),
            dotSize = 1,
            data = dataString
            .split(",")
            .map(function(n) {
                return parseFloat(n.trim(), 10) || 0;
            }),
            range = 96,
            color = "rgb(75, 198, 223)",
            maxmin_color = "rgb(0, 86, 137)",
            show_max = false,
            show_min = false,
            show_color = false,
            show_current = true,
            max = Math.max.apply(null, data),
            min = Math.min.apply(null, data);

        if (show_color) {
            for (var i = 0; i < segments.length; i++) {
                if (segments[i].indexOf('rgba:') != -1) {
                    color = "rgba(" + segments[i].replace('rgba:', '') + ")";
                }
            }
        }
        var parts = data.map(function(num) {
                return scale(max, min, num);
            }),
            div = 100 / parts.length,
            x1 = 0,
            y1 = 0,
            x2 = div / 2,
            y2 = range - parts[0];

        for (var i = 0; i < parts.length; i++) {
            var ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
            x1 = x2;
            y1 = y2;
            x2 = (range * (i / parts.length) + (div / 2) > 0) ? range * (i / parts.length) + (div / 2) : 0;
            y2 = (range - parts[i] > 0) ? range - parts[i] : 0;
            ln.setAttribute("x1", x1 + "%");
            ln.setAttribute("x2", x2 + "%");
            ln.setAttribute("y1", y1 + "%");
            ln.setAttribute("y2", y2 + "%");
            ln.setAttribute("stroke", color);
            ln.setAttribute("stroke-width", "1.25");
            elem.appendChild(ln);
        }
        return elem.outerHTML;
    }

    return {
        init: init
    };
});