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
            url: "http://interactive.guim.co.uk/spreadsheetdata/" + spreadsheetID + ".json",
            type: "json",
            method: "get",
            success: function(resp) {
                app(resp, el)
            }
        })
    }

    function app(spreadsheet, el) {
        data = spreadsheet;
        searchable = (data.sheets.tableMeta[0].searchable.toLowerCase() === 'true');

        var j = 0;
        var length = -1; // starts at -1 to offset the rowNumber field

        // reformat data into an array of arrays
        for (var i = 0; i < data.sheets.dataSheet.length; i++) {
            formattedData[i] = [];
            for (j in data.sheets.dataSheet[0]) {
                if (j === "highlight") {
                    highlighted[formattedData[i][0]] = data.sheets.dataSheet[i][j];
                } else if (data.sheets.dataSheet[i][j].toString().slice(0, 11) === "[sparkline=") {
                    length++;
                    formattedData[i][length] = draw(data.sheets.dataSheet[i][j].substr(11).slice(0, -1));
                } else {
                    length++;
                    formattedData[i][length] = data.sheets.dataSheet[i][j];
                }
            }
            length = -1;
            formattedData[i].pop();
        }

        headerRows = formattedData[0];
        formattedData = formattedData.slice(1);

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
        tbodyEl.innerHTML = tableRendered;

        initSearch();

        addMobilePrefix();

        document.querySelector("tr").addEventListener("click", sortColumns);
    }

    function sortColumns(e) {
        var sorted = formattedData.sort(propComparator(e.target.cellIndex));
        var rendered = Mustache.render(template, {
            rows: sorted,
            highlightClass: highlightedFunc
        });
        initSparklines();
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
        el.className += " table-sorted";
        lastSorted = e.target;
        tbodyEl.innerHTML = rendered;
    }

    function propComparator(prop) {
        currentSort = (currentSort !== prop) ? prop : null;
        return function Comparator(a, b) {
            if (a[prop] < b[prop]) return (currentSort !== prop) ? -1 : 1;
            if (a[prop] > b[prop]) return (currentSort !== prop) ? 1 : -1;
            return 0;
        }
    }

    function initSearch() {
        if (searchable) {
            searchEl = document.getElementById("search-field");
            searchEl.addEventListener("keyup", searchFunc);
            searchEl.addEventListener("focus", function() {
                this.value = "";
            });
            searchEl.addEventListener("blur", function() {
                if (this.value === "") {
                    this.value = "Search";
                }
            });
        }
    }

    function searchFunc() {
        var filtered = formattedData.filter(searchMatch),
            rendered,
            emptyBoolean;

        emptyBoolean = (filtered.length > 0) ? false : true;

        rendered = Mustache.render(template, {
            rows: filtered,
            emptyBoolean: emptyBoolean,
            highlightClass: highlightedFunc
        });
        tbodyEl.innerHTML = rendered;
        initSparklines();
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
            x2 = range * (i / parts.length) + (div / 2);
            y2 = range - parts[i];
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