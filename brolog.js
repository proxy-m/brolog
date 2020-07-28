(function (root, factory) {
    if (typeof define === 'function' && define.amd) define([], factory);
    else if (typeof exports === 'object') module.exports = factory();
    else root.Logger = factory();
}(this, function(){

var ARRAY_SLICE = Array.prototype.slice,
    ARRAY_PUSH = Array.prototype.push,
    DEFAULT_PRINTER = _getConsolePrinter(window.console),
    PRINTERS = [ DEFAULT_PRINTER ];

var QUERY_PARAM_DIRECTIVE = 'brolog';

var LEVELS = [
    'TRA',
    'DBG',
    'INF',
    'WRN',
    'ERR',
    'OFF'
].reduce(function(p, e, i, o){
    p.toNumber[e] = i;
    p.toString[i] = e;
    return p;
}, {
    toNumber: {},
    toString: {}
});

var gLevel = LEVELS.toNumber.OFF,
    gCounter = 0,
    lCounter = 0,
    gNameFilter,
    gStart;

if (window && window.location){
    var qs = window.location.search || "",
        re = new RegExp("[&\\?]" + QUERY_PARAM_DIRECTIVE + "=([^#&]*)"),
        m = qs.match(re),
        l;
    if (m) l = LEVELS.toNumber[m[1].toUpperCase()];
    if (l !== undefined) gLevel = l;
}

function clearName(fullFileName) {
	if (!fullFileName || fullFileName === true) {
		return fullFileName;
	} else {
		fullFileName = ''+fullFileName;
	}
	//console.error('fullFileName: ', fullFileName);
	fullFileName = fullFileName.replace(/\\/g, '/'); // safety from win paths: 1
	fullFileName = fullFileName.replace(/\r\n/g, '\r'); // safety from win paths: 2.1
	fullFileName = fullFileName.replace(/\r/g, '\n'); // safety from mac paths: 2.2
	fullFileName = fullFileName.replace(/\n/g, '_br_'); // safety from lin paths: 2.3
	fullFileName = fullFileName.replace(/\t/g, '    '); // safety from tabs: 3
	
	if (fullFileName.indexOf('/') < 0) {
		return fullFileName;
	} else {
		let tmpArr = fullFileName.split('/');
		fullFileName = tmpArr[tmpArr.length-1]; // to short path
		tmpArr = fullFileName.split('.');
		fullFileName = tmpArr[0]; // to short name
		return fullFileName;
	}
}

/**
 * Constructor
 */
function Logger(name){
    this.id = lCounter++;
    this.name = (!!name) ? ('Logger_'+clearName(name)) : ('Logger ' + this.id);
    this.hasGivenName = !!name;
    this.level = LEVELS.toNumber.TRA;
    this.counter = 0;
    this.start = null;

    // whatever is here will be sent as meta data to the log printers,
    // *only* for the next log message, and then will be reset back to 'null'.
    this.meta = null;
}

/**
 * Filterting rules:
 * 1. Should be at least as severe as the global level
 * 2. Should be at least as severe as the local level
 * 3. logger's name should pass name filter
 */
function allow(logger, level){
    if (level < gLevel) return false;
    if (level < logger.level) return false;
    if (gNameFilter && !gNameFilter.test(logger.name)) return false;
    return true;
}

function _getConsolePrinter(console){
    var clog = console && console.log ? getInterface('log') : function(){},
        cdbg = console && console.debug ? getInterface('debug') : clog,
        cwrn = console && console.warn ? getInterface('warn') : clog,
        cerr = console && console.error ? getInterface('error') : clog;
    return function(gCounter, gStart, logger, nLevel, sLevel, msgs, meta){
        var _msgs = [
            "[" + gCounter + " " + (Date.now() - gStart) + "]",
            "[" + logger.name + "]",
            "[" + logger.counter + " " + (Date.now() - logger.start) + "]",
            "[" + sLevel + "]"
        ];
        ARRAY_PUSH.apply(_msgs, msgs);
        switch(sLevel){
            case "TRA":
            case "DBG":
                cdbg.apply(null, _msgs);
                break;
            case "ERR":
                cerr.apply(null, _msgs);
                break;    
			case "WRN":
                cwrn.apply(null, _msgs);
                break;
            case "INF":
                clog.apply(null, _msgs);
                break;          
            default:
                clog.apply(null, _msgs);
                break;
        }
    };

    function getInterface(method){
        if (Function.prototype.bind && typeof console[method] === "object") {
            //IE9
            return Function.prototype.call.bind(console[method], console);
        } else {
            //others
            return console[method].bind(console);
        }
    }
}

function _print(logger, level, args){
    if (!allow(logger, level)) return;
    if (!gStart) gStart = Date.now();
    if (!logger.start) logger.start = Date.now();
    gCounter++;
    logger.counter++;
    args = ARRAY_SLICE.apply(args);
    PRINTERS.forEach(function(printer){
        printer(gCounter, gStart, logger, level, LEVELS.toString[level], args, logger.meta);
    });
    logger.meta = null;
    return args.join(" ");
}

Logger._getConsolePrinter = _getConsolePrinter;

function callerName() {
    try {
        var myCallee = arguments.callee;
        var hisCallee = myCallee.caller.arguments.callee;
        var hisCallerName = hisCallee.caller.name;

        if (isNoE(hisCallerName)) {
            var hisCallersFunction = hisCallee.caller.toString();
            if (!isNoE(hisCallersFunction)) {
                hisCallerName = fBetween(hisCallersFunction, "function", "(");
            }
        }
        hisCallerName = hisCallerName.trim();
    } catch (ex) {
        hisCallerName = "";
    }

    if (isNoE(hisCallerName)) {
		var e0 = new Error('e0');
		var s0 = e0.stack.split('\n');
        return '('+((s0[3] || s0[2] || s0[1] || 'at anonymous').trim())+')';
    }

    return hisCallerName;
}

///////////////////////////////////////
function getStringValue(inString) {
    if (inString == null || inString == "undefined" || inString == "null" || inString == "[object]" || inString == "[object NodeList]") {
        return "";
    }

    try {
        var tString = new String(inString);
        return tString.toString();
    } catch (e) {
        return "";
    }
}

function fLeft(inText, delim) {
    inText = getStringValue(inText);
    delim = getStringValue(delim);
    var outText = "";
    var theSpot = inText.indexOf(delim);
    if (theSpot > -1) {
        outText = inText.substring(0, theSpot);
    }
    return outText;
}

function fLeftBack(inText, delim) {
    inText = getStringValue(inText);
    delim = getStringValue(delim);
    var outText = "";
    var theSpot = inText.lastIndexOf(delim);
    if (theSpot > -1) outText = inText.substring(0, theSpot);
    return outText;
}

function fRight(inText, delim) {
    inText = getStringValue(inText);
    delim = getStringValue(delim);
    var outText = "";
    var theSpot = inText.indexOf(delim);
    if (theSpot > -1) {
        outText = inText.substring(theSpot + delim.length, inText.length);
    }
    return outText;
}

function fRightBack(inText, delim) {
    inText = getStringValue(inText);
    delim = getStringValue(delim);
    var outText = "";
    var theSpot = inText.lastIndexOf(delim);
    if (theSpot > -1) outText = inText.substring(theSpot + delim.length, inText.length);
    return outText;
}

function fBetween(inText, delimLeft, delimRight) {
    return fLeft(fRight(inText, delimLeft), delimRight);
}

function isNoE(obj) {
    return isNullOrEmpty(obj);
}

function isNullOrEmpty(obj) {

    // must test type of base object first
    if (typeof obj == "undefined") {
        return true;
    }

    // immediate
    if (obj == undefined || obj == null) {
        return true;
    }

    // STRING
    return getStringValue(obj) == "";
}
///////////////////////////////////////

Logger.prototype.trace = Logger.prototype.tra = function(){
    return _print(this, LEVELS.toNumber.TRA, Object.values(arguments).concat([callerName()]));
};

Logger.prototype.log = Logger.prototype.info = Logger.prototype.inf = function(){
    return _print(this, LEVELS.toNumber.INF, Object.values(arguments).concat([callerName()]));
};

Logger.prototype.debug = Logger.prototype.dbg = function(){
    return _print(this, LEVELS.toNumber.DBG, Object.values(arguments).concat([callerName()]));
};

Logger.prototype.warn = Logger.prototype.wrn = function(){
    return _print(this, LEVELS.toNumber.WRN, Object.values(arguments).concat([callerName()]));
};

Logger.prototype.error = Logger.prototype.err = function(){
    return _print(this, LEVELS.toNumber.ERR, Object.values(arguments).concat([callerName()]));
};

Logger.prototype.setOff = Logger.prototype.off = function(){
    this.level = LEVELS.toNumber.OFF;
};

Logger.prototype.with = function(meta){
    this.meta = meta;
    return this;
};

Logger.prototype.setTrace = function(){
    this.level = LEVELS.toNumber.TRA;
};

Logger.prototype.setDebug = function(){
    this.level = LEVELS.toNumber.DBG;
};

Logger.prototype.setInfo = Logger.prototype.setInf = Logger.prototype.setLog = function(){
    this.level = LEVELS.toNumber.INF;
};

Logger.prototype.setWarn = function(){
    this.level = LEVELS.toNumber.WRN;
};

Logger.prototype.setError = Logger.prototype.setErr = function(){
    this.level = LEVELS.toNumber.ERR;
};

Logger.setOff = Logger.off = function(){
    gLevel = LEVELS.toNumber.OFF;
};

Logger.setTrace = function(){
    gLevel = LEVELS.toNumber.TRA;
};

Logger.setDebug = function(){
    gLevel = LEVELS.toNumber.DBG;
};

Logger.setInfo = Logger.setInf = Logger.setLog = function(){
    gLevel = LEVELS.toNumber.INF;
};

Logger.setWarn = function(){
    gLevel = LEVELS.toNumber.WRN;
};

Logger.setError = Logger.setErr = function(){
    gLevel = LEVELS.toNumber.ERR;
};

Logger.filterName = function(filter){
    if (!(filter instanceof RegExp))
        if (typeof filter == 'string' || filter instanceof String)
            filter = new RegExp("^" + filter + "$");
        else throw Error("'filter' must be a RegExp or a string");
    gNameFilter = filter;
};

Logger.addPrinter = function(printer){
    if (typeof(printer) !== 'function') throw Error("'printer' must be a function");
    PRINTERS.push(printer);
};

return Logger;

}));
