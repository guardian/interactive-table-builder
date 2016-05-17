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
        highlighted = {},
        numberCount,
            highlightedFunc = function() {
            if (highlighted[this[0]]) {
                console.log(highlighted);
                return "highlighted"
            };
        },
        sparkMax,
        sparkMin,
        sparklineVals = [],
        specialColumns = {'bold': [], 'percentagebar': [], 'desc': [], 'asc': []};

    function init(el, spreadsheetID) {
        reqwest({
            url: "https://interactive.guim.co.uk/docsdata/" + spreadsheetID + ".json",
            type: "json",
            method: "get",
            success: function(resp) {
                app(resp, el);
            }
        });
    }

    function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    function app(spreadsheet, el) {
        data = spreadsheet;
        searchable = (data.sheets.tableMeta[0].searchable.toLowerCase() === 'true');

        headerRows = data.sheets.tableDataSheet[0];
        formattedData = data.sheets.tableDataSheet.slice(1);

        // convert highlight column into usable format and pop
        if (headerRows[headerRows.length - 1] === "highlight") {
            formattedData.map(function(row) {
                highlighted[row[0]] = row[headerRows.length - 1];
                console.log(row);
                // row.pop();
            });
            headerRows.pop();
        }

        headerRows.map(function(header, i) {
            // find special columns (e.g. bold / percentagebars / etc) and
            // remove diretive prefixes from output
            var match = /\[(\w+)\].+/.exec(header);
            if (match && specialColumns[match[1]]) {
                specialColumns[match[1]].push(i);
                headerRows[i] = header.toString().slice(match[1].length + 2);
            }
        });

        //init Sparklines
        if(data.sheets.tableMeta[0].normaliseSparklines === "TRUE") {
            formattedData.map(function(row, i) {
                row.map(function(cell, j) {
                    if (cell.toString().slice(0, 11) === "[sparkline=") {
                        var split = cell.substr(11).slice(0, -1).split(",");
                        split.map(function(val) {
                            sparklineVals.push(val.trim());
                        });
                    }
                });
            });

            sparkMin = Math.min.apply(null, sparklineVals);
            sparkMax = Math.max.apply(null, sparklineVals);
        }

        formattedData.map(function(row, i) {
            row.map(function(cell, j) {
                if (cell.toString().slice(0, 11) === "[sparkline=") {
                    formattedData[i][j] = draw(cell.substr(11).slice(0, -1));
                }
            });
        });

        specialColumns.percentagebar.map(function(colnum) {
            formattedData.map(function(row, i) {
                var match = /^(\d*(?:\.\d+)?)%?$/.exec(row[colnum]);
                if (match) {
                    var value = parseFloat(match[1]);
                    var valueStr = value.toFixed(1);
                    row[colnum] = '<div data-val="' + pad(value.toFixed(10), 14, '0') + '" class="percentagebar"><span style="width: ' + valueStr + '%;"></span><span>' + valueStr + '%</span></div>';
                } else {
                    row[colnum] = 'N/A'
                }

            });
        });

        //which rows are columns of numbers?
        numberCount = [];
        formattedData.map(function(row, i) {
            row.map(function(cell, j) {
                if (!numberCount[j]) {
                    numberCount[j] = 0
                };
                if (typeof cell === "string" && !isNaN(parseInt(cell))) {
                    numberCount[j]++;
                }
            });
        });

        var collapseMobile = (spreadsheet.sheets.tableMeta[0].mobileCollapse && spreadsheet.sheets.tableMeta[0].mobileCollapse === "FALSE") ? "collapse-false" : "collapse-true";

        var tableRendered = Mustache.render(template, {
            rows: formattedData,
            highlightClass: highlightedFunc
        });
        var metaRendered = Mustache.render(metaTemplate, {
            meta: data.sheets.tableMeta[0],
            headerRows: headerRows,
            searchable: searchable,
            collapseMobile: collapseMobile
        });
        el.innerHTML = metaRendered;

        tbodyEl = document.querySelector("#int-table tbody");
        tableEl = document.getElementById("int-table");
        tbodyEl.innerHTML = tableRendered;

        initSearch();

        addMobilePrefix(collapseMobile);

        document.querySelector("tr").addEventListener("click", sortColumns);

        var headers = document.querySelectorAll(".column-header");

        specialColumns.desc.map(function(colnum) {
            headers[colnum].className += " sorted";
        });

        specialColumns.asc.map(function(colnum) {
            headers[colnum].className += " sorted-reversed";
        });
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
        if (!hasClass(tableEl, "table-sorted")) {
            tableEl.className = "table-sorted";
        }
        lastSorted = e.target;
        render();
    }

    function propComparator(prop) {
        var c, d;
        currentSort = (currentSort !== prop) ? prop : null;
        return function Comparator(a, b) {
            c = (typeof a[prop] === "string" && !isNaN(parseFloat(a[prop]))) ? parseFloat(a[prop].replace(/,/g, '')) : a[prop]; //refactor
            d = (typeof b[prop] === "string" && !isNaN(parseFloat(b[prop]))) ? parseFloat(b[prop].replace(/,/g, '')) : b[prop];
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
                if (this.value === "Search") {
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
    
    function removeGradient () {
        var gradient = document.getElementsByClassName("truncated")[0];
        if (gradient !== undefined) {gradient.className = "" };  
    }
    

    function render() {
        var rowsToRender = (searchEl && searchEl.value !== "Search" && searchEl.value !== "") ? formattedData.filter(searchMatch) : formattedData,
            emptyBoolean = (rowsToRender.length > 0) ? false : true,
            exactMatch = (rowsToRender.length === 1) ? true : false,
            rendered = Mustache.render(template, {
                rows: rowsToRender,
                highlightClass: highlightedFunc,
                emptyBoolean: emptyBoolean,
                exactMatch: exactMatch
            });
        if (exactMatch) { removeGradient() };    
        tbodyEl.innerHTML = rendered;
    }

    function addMobilePrefix(collapseMobile) {
        var css = "",
            head = document.head || document.getElementsByTagName('head')[0],
            style = document.createElement('style'),
            d = 1,
            e = 1;

        if(collapseMobile === "collapse-true") {
            css = "@media (max-width: 30em) {";

            headerRows.map(function(name) {
                css += "tr td:nth-child(" + d + ")::before { content: '" + name + ": '; font-weight: 500; }";
                d++;
            });

            css += "}";
        }

        numberCount.map(function(columnNumberCount, i) {
            if (columnNumberCount > formattedData.length / 2) {
                css += "tr td:nth-of-type(" + (i + 1) + "), tr th:nth-of-type(" + (i + 1) + ") { text-align: right; }";
            }
        });

        if ((data.sheets.tableMeta[0].rowLimit.toString().toLowerCase() !== "false" && data.sheets.tableMeta[0].rowLimit > 0) || window.innerWidth < 620) {
            var wrapperEl = document.getElementById("int-table__wrapper"),
                rowLimit = (window.innerWidth > 620) ? parseInt(data.sheets.tableMeta[0].rowLimit) + 1 : parseInt(data.sheets.tableMeta[0].mobileRowLimit) + 1;

            wrapperEl.classList.add("truncated");
            css += ".truncated tr:nth-of-type(1n+" + rowLimit + ") { display: none; }";

            document.getElementById("untruncate").addEventListener("click", function() {
                wrapperEl.classList.remove("truncated");
            });
        }

        specialColumns.bold.map(function(column) {
            css += "@media (min-width: 30em) { tr td:nth-of-type(" + (column + 1) + "), tr th:nth-of-type(" + (column + 1) + ") { font-weight: bold !important; } }";
        });

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
            c = (array[a].toString().substr(0, 4) !== "<svg" && array[a].toString().toLowerCase().indexOf(searchEl.value.toLowerCase()) !== -1) ? c + 1 : c;
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
        return (data.sheets.tableMeta[0].normaliseSparklines === "TRUE") ? (100 * (num - sparkMin) / (sparkMax - sparkMin)) : (100 * (num - min) / (max - min));
    }

    function draw(dataString) {
        var elem = document.createElement("svg"),
            dotSize = 2,
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
            ln.setAttribute("stroke-width", "1.5");
            elem.appendChild(ln);
            if (show_current && i + 1 === parts.length) {
                var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", x2 + "%");
                circle.setAttribute("cy", y2 + "%");
                circle.setAttribute("r", dotSize + "%");
                circle.setAttribute("fill", "rgb(75, 198, 223)");
                circle.setAttribute("stroke", "rgb(75, 198, 223)");
                elem.appendChild(circle);
                var text = document.createElementNS('http://www.w3.org/2000/svg', 'text'),
                    tx = (x2 + (dotSize * 1.5)) + "%",
                    ty = (y2 < 25) ? "25%" : (y2 + 12) + "%";
                text.setAttribute('x', tx);
                text.setAttribute('y', ty);
                text.setAttribute('fill', '#000');
                text.setAttribute('style', 'font-size: 10px; fill: #bdbdbd; font-weight: 400;')
                text.textContent = data.slice(-1)[0];
                elem.appendChild(text);
            }
        }
        return elem.outerHTML;
    }

    return {
        init: init
    };
});
