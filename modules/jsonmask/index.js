"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonMask = exports.JsonMaskErrorCode = exports.JsonMaskBufferType = exports.JsonMaskSignsEquality = exports.JsonMaskBracketType = exports.JsonMaskTypes = void 0;
exports.or = or;
exports.array = array;
exports.regex = regex;
var JsonMaskTypes;
(function (JsonMaskTypes) {
    JsonMaskTypes[JsonMaskTypes["ANY"] = -1] = "ANY";
    JsonMaskTypes[JsonMaskTypes["INTEGER"] = 0] = "INTEGER";
    JsonMaskTypes[JsonMaskTypes["DECIMAL"] = 1] = "DECIMAL";
    JsonMaskTypes[JsonMaskTypes["STRING"] = 2] = "STRING";
    JsonMaskTypes[JsonMaskTypes["OBJECT"] = 3] = "OBJECT";
    JsonMaskTypes[JsonMaskTypes["ARRAY"] = 4] = "ARRAY";
    JsonMaskTypes[JsonMaskTypes["NULL"] = 5] = "NULL";
    JsonMaskTypes[JsonMaskTypes["BOOLEAN"] = 6] = "BOOLEAN";
    JsonMaskTypes[JsonMaskTypes["NUMBER"] = 7] = "NUMBER";
})(JsonMaskTypes || (exports.JsonMaskTypes = JsonMaskTypes = {}));
;
var JsonMaskBracketType;
(function (JsonMaskBracketType) {
    JsonMaskBracketType[JsonMaskBracketType["NONE"] = -1] = "NONE";
    JsonMaskBracketType[JsonMaskBracketType["CIRCLE"] = 0] = "CIRCLE";
    JsonMaskBracketType[JsonMaskBracketType["SQUARE"] = 1] = "SQUARE";
})(JsonMaskBracketType || (exports.JsonMaskBracketType = JsonMaskBracketType = {}));
;
var JsonMaskSignsEquality;
(function (JsonMaskSignsEquality) {
    JsonMaskSignsEquality[JsonMaskSignsEquality["NONE"] = -1] = "NONE";
    JsonMaskSignsEquality[JsonMaskSignsEquality["EQUAL"] = 0] = "EQUAL";
    JsonMaskSignsEquality[JsonMaskSignsEquality["GREATER"] = 1] = "GREATER";
    JsonMaskSignsEquality[JsonMaskSignsEquality["LESS"] = 2] = "LESS";
    JsonMaskSignsEquality[JsonMaskSignsEquality["GREATER_OR_EQUAL"] = 3] = "GREATER_OR_EQUAL";
    JsonMaskSignsEquality[JsonMaskSignsEquality["LESS_OR_EQUAL"] = 4] = "LESS_OR_EQUAL";
})(JsonMaskSignsEquality || (exports.JsonMaskSignsEquality = JsonMaskSignsEquality = {}));
;
var JsonMaskBufferType;
(function (JsonMaskBufferType) {
    JsonMaskBufferType[JsonMaskBufferType["NONE"] = -1] = "NONE";
    JsonMaskBufferType[JsonMaskBufferType["INTEGER"] = 0] = "INTEGER";
    JsonMaskBufferType[JsonMaskBufferType["MEAN"] = 1] = "MEAN";
})(JsonMaskBufferType || (exports.JsonMaskBufferType = JsonMaskBufferType = {}));
;
var JsonMaskErrorCode;
(function (JsonMaskErrorCode) {
    JsonMaskErrorCode[JsonMaskErrorCode["FATAL"] = 0] = "FATAL";
    JsonMaskErrorCode[JsonMaskErrorCode["PARSE_TYPE"] = 1] = "PARSE_TYPE";
    JsonMaskErrorCode[JsonMaskErrorCode["PARSE_UNEXPECTED_END"] = 2] = "PARSE_UNEXPECTED_END";
    JsonMaskErrorCode[JsonMaskErrorCode["INVALID_CHAR"] = 3] = "INVALID_CHAR";
})(JsonMaskErrorCode || (exports.JsonMaskErrorCode = JsonMaskErrorCode = {}));
var JsonMaskErrorMsg = new Map([
    [JsonMaskErrorCode.FATAL, "Fatal error during parsing"],
    [JsonMaskErrorCode.PARSE_TYPE, "Error parsing type"],
    [JsonMaskErrorCode.PARSE_UNEXPECTED_END, "Unexpected end"],
    [JsonMaskErrorCode.INVALID_CHAR, "Invalid char"]
]);
var JsonMaskParseError = /** @class */ (function (_super) {
    __extends(JsonMaskParseError, _super);
    function JsonMaskParseError(errnum, i, comment) {
        if (comment === void 0) { comment = ""; }
        var _this = this;
        var _a;
        var message = ((_a = JsonMaskErrorMsg.get(errnum)) !== null && _a !== void 0 ? _a : '(without error message)') + (i !== undefined ? " at the ".concat(i + 1, " letter.") : '') + (comment ? "\n".concat(comment) : '');
        _this = _super.call(this, message) || this;
        _this.errnum = errnum;
        _this.message = message;
        _this.original = null;
        return _this;
    }
    return JsonMaskParseError;
}(Error));
var JsonMask = /** @class */ (function () {
    /**
     * initialize a class to check json objects for validity when creating json or an existing one
     *
     * @param content expression or JsonMask
     */
    function JsonMask(content) {
        this.handler = this._skip_white_space;
        this.buffer = '';
        this.sign_equality = JsonMaskSignsEquality.NONE;
        this.prehandler = this._parse_type;
        this.bracket_type = JsonMaskBracketType.NONE;
        this.buffer_type = JsonMaskBufferType.NONE;
        this.current = content !== undefined ? this._parse(content) : [false, []];
        this.last = this._last_type(this.current);
        this.quotes = false;
        this.escaped = false;
    }
    JsonMask.prototype.get_type = function (item) {
        if (item instanceof Array) {
            return JsonMaskTypes.ARRAY;
        }
        if (item instanceof Object) {
            return JsonMaskTypes.OBJECT;
        }
        if (typeof item == 'string') {
            return JsonMaskTypes.STRING;
        }
        if (typeof item == 'number') {
            return this.get_number_type(item);
        }
        if (typeof item == 'boolean') {
            return JsonMaskTypes.BOOLEAN;
        }
        if (item === null) {
            return JsonMaskTypes.NULL;
        }
        throw new JsonMaskParseError(JsonMaskErrorCode.PARSE_TYPE, undefined, "get_type(...): the variable has the wrong object type.\nAllowed types: array,object,string,number(integer,decimal),boolean,null");
    };
    JsonMask.prototype.get_number_type = function (item) {
        if (item % 1 == 0) {
            return JsonMaskTypes.INTEGER;
        }
        else {
            return JsonMaskTypes.DECIMAL;
        }
    };
    JsonMask.prototype._parse_type = function (ch, it) {
        var isletter = /^[a-z]+$/gi.test(ch);
        if (isletter) {
            this.buffer += ch;
            return;
        }
        var special_tag = false;
        switch (this.buffer.toLowerCase()) {
            case 'none':
                this.current[0] = true;
                special_tag = true;
                break;
        }
        if (!special_tag) {
            this.current[1].push({});
            this.last = this._last_type(this.current);
            switch (this.buffer.toLowerCase()) {
                case 'string':
                    this.last.type = JsonMaskTypes.STRING;
                    break;
                case 'integer':
                    this.last.type = JsonMaskTypes.INTEGER;
                    break;
                case 'decimal':
                    this.last.type = JsonMaskTypes.DECIMAL;
                    break;
                case 'null':
                    this.last.type = JsonMaskTypes.NULL;
                    break;
                case 'bool':
                    this.last.type = JsonMaskTypes.BOOLEAN;
                    break;
                case 'any':
                    this.last.type = JsonMaskTypes.ANY;
                    break;
                case 'number':
                    this.last.type = JsonMaskTypes.NUMBER;
                    break;
                default:
                    throw new JsonMaskParseError(JsonMaskErrorCode.PARSE_TYPE, it, "'".concat(this.buffer, "' is invalid.\nAllowed types: string,integer,decimal,null,bool,any,number"));
                    break;
            }
        }
        this.buffer = '';
        this.handler = this._skip_white_space;
        this.prehandler = this._parse_after_type_name;
        this.handler(ch, it);
    };
    JsonMask.prototype._parse_after_type_name = function (ch, it) {
        if (ch == '(') {
            this.handler = this._parse_inner_brackets_mean;
            this.bracket_type = JsonMaskBracketType.CIRCLE;
            return;
        }
        this.handler = this._parse_after_type;
        this.handler(ch, it);
    };
    JsonMask.prototype._parse_buffer = function (ch, it) {
        if (ch == ')' || ch == ']') {
            if (this.prehandler === null) {
                throw new JsonMaskParseError(JsonMaskErrorCode.PARSE_UNEXPECTED_END, it, 'this.prehandler is null');
            }
            this.prehandler(ch, it);
            return;
        }
        if (this.buffer_type == JsonMaskBufferType.INTEGER) {
            if (this._is_white_space(ch)) {
                this.handler = this._skip_white_space;
                this.handler(ch, it);
                return;
            }
            if (!/[0-9\e\-\+]/.test(ch)) {
                throw new JsonMaskParseError(JsonMaskErrorCode.INVALID_CHAR, it);
            }
            this.buffer += ch;
            return;
        }
        if (this.buffer_type == JsonMaskBufferType.MEAN) {
            if (this.quotes) {
                if (this.escaped) {
                    this.escaped = false;
                }
                else if (ch == '/') {
                    this.escaped = true;
                    return;
                }
                else if (ch == '"') {
                    this.quotes = false;
                    this.handler = this._skip_white_space;
                }
                this.buffer += ch;
            }
            else {
                if (ch == '"') {
                    if (this.buffer.length) {
                        throw new JsonMaskParseError(JsonMaskErrorCode.INVALID_CHAR, it);
                    }
                    this.buffer += ch;
                    this.quotes = true;
                    return;
                }
                if (this._is_white_space(ch)) {
                    this.handler = this._skip_white_space;
                    this.handler(ch, it);
                    return;
                }
                this.buffer += ch;
            }
            return;
        }
    };
    JsonMask.prototype._ret_inner_brackets = function (ch, it) {
        if (this.bracket_type == JsonMaskBracketType.CIRCLE && ch == ')') {
            this.handler = this._parse_after_type;
            this.bracket_type = JsonMaskBracketType.NONE;
            return true;
        }
        if (this.bracket_type == JsonMaskBracketType.SQUARE && ch == ']') {
            this.handler = this._parse_after_type;
            this.bracket_type = JsonMaskBracketType.NONE;
            return true;
        }
        return false;
    };
    JsonMask.prototype._parse_inner_brackets_mean = function (ch, it) {
        var _this = this;
        if (this._ret_inner_brackets(ch, it)) {
            return;
        }
        if (!/^[tnf0-9\-\+\"]+$/g.test(ch)) {
            this.handler = this._skip_white_space;
            this.prehandler = this._parse_inner_brackets;
            this.handler(ch, it);
            return;
        }
        this.buffer_type = JsonMaskBufferType.MEAN;
        this.handler = this._parse_buffer;
        this.prehandler = function (ch, it) {
            if (_this.buffer_type == JsonMaskBufferType.MEAN) {
                _this.buffer_type = JsonMaskBufferType.NONE;
                var object = JSON.parse(_this.buffer);
                _this.last.mean = object;
                _this.buffer = '';
            }
            _this.handler = _this._skip_white_space;
            _this.prehandler = _this._parse_inner_brackets;
            _this.handler(ch, it);
        };
        this.handler(ch, it);
    };
    JsonMask.prototype._parse_inner_brackets = function (ch, it) {
        if (this.buffer_type == JsonMaskBufferType.INTEGER) {
            this.buffer_type = JsonMaskBufferType.NONE;
            var num = Number(this.buffer);
            this.buffer = '';
            switch (this.sign_equality) {
                case JsonMaskSignsEquality.GREATER_OR_EQUAL:
                    num--;
                case JsonMaskSignsEquality.GREATER:
                    this.last.min_mean = num;
                    break;
                case JsonMaskSignsEquality.LESS_OR_EQUAL:
                    num++;
                case JsonMaskSignsEquality.LESS:
                    this.last.max_mean = num;
                    break;
                case JsonMaskSignsEquality.EQUAL:
                    this.last.max_mean = num + 1;
                    this.last.min_mean = num - 1;
                    break;
            }
            this.sign_equality = JsonMaskSignsEquality.NONE;
        }
        if (this._ret_inner_brackets(ch, it)) {
            return;
        }
        if (ch == '=') {
            if (this.sign_equality == JsonMaskSignsEquality.LESS) {
                this.sign_equality = JsonMaskSignsEquality.LESS_OR_EQUAL;
                return;
            }
            if (this.sign_equality == JsonMaskSignsEquality.GREATER) {
                this.sign_equality = JsonMaskSignsEquality.GREATER_OR_EQUAL;
                return;
            }
            if (this.sign_equality == JsonMaskSignsEquality.NONE) {
                this.sign_equality = JsonMaskSignsEquality.EQUAL;
                return;
            }
        }
        else if (ch == '>') {
            if (this.sign_equality == JsonMaskSignsEquality.NONE) {
                this.sign_equality = JsonMaskSignsEquality.GREATER;
                return;
            }
        }
        else if (ch == '<') {
            if (this.sign_equality == JsonMaskSignsEquality.NONE) {
                this.sign_equality = JsonMaskSignsEquality.LESS;
                return;
            }
        }
        else if (this.sign_equality != JsonMaskSignsEquality.NONE && /^[0-9\-\+]$/gi.test(ch)) {
            this.buffer_type = JsonMaskBufferType.INTEGER;
            this.prehandler = this._parse_inner_brackets;
            this.handler = this._parse_buffer;
            this.handler(ch, it);
            return;
        }
        throw new JsonMaskParseError(JsonMaskErrorCode.INVALID_CHAR, it);
    };
    JsonMask.prototype._parse_after_type = function (ch, it) {
        if (ch == '|') {
            this.handler = this._parse_type;
            return;
        }
        if (ch == '[') {
            var array_1 = {};
            array_1.default = this.current;
            array_1.type = JsonMaskTypes.ARRAY;
            this.current = [false, [array_1]];
            this.last = this._last_type(this.current);
            this.handler = this._parse_inner_brackets;
            this.bracket_type = JsonMaskBracketType.SQUARE;
            return;
        }
        this.handler = this._skip_white_space;
        this.prehandler = null;
        this._skip_white_space(ch, it);
    };
    JsonMask.prototype._is_white_space = function (ch) {
        switch (ch) {
            case '\t':
            case '\n':
            case '\s':
            case '\r':
            case ' ':
                return true;
            default:
                return false;
        }
    };
    JsonMask.prototype._skip_white_space = function (ch, it) {
        if (this._is_white_space(ch)) {
            return;
        }
        if (this.prehandler === null) {
            this.handler = function (ch, it) {
                // oh dears
                throw new JsonMaskParseError(JsonMaskErrorCode.INVALID_CHAR, it);
            };
            return;
        }
        this.handler = this.prehandler;
        this.prehandler = null;
        this.handler(ch, it);
    };
    JsonMask.prototype._last_type = function (object) {
        return object[1][object[1].length - 1];
    };
    JsonMask.prototype._set_last_type = function (type, object) {
        object[1][object[1].length - 1] = type;
        return object;
    };
    JsonMask.prototype.item = function (plain, result) {
        try {
            if (plain.length < 3 || plain[0] != '{'
                || (plain[plain.length - 1] != '}' && plain[plain.length - 2] != '\\')) {
                result[1].push({ type: this.get_type(plain) });
                var last = this._last_type(result);
                last.mean = plain;
                return result;
            }
            this.current = result;
            //this.last = last;
            this.handler = this._parse_type;
            // skip '{'
            for (var i = 1; i < plain.length; i++) {
                this.handler(plain[i], i);
            }
        }
        catch (e) {
            if (e instanceof Error && 'original' in e && e.original === null) {
                e.original = plain;
                e.message += (e.original !== undefined ? " in ".concat(JSON.stringify(e.original)) : '');
            }
            throw e;
        }
        return this.current;
    };
    JsonMask.prototype.init_mask_object = function (plain) {
        return [false, []];
    };
    JsonMask.prototype.parse = function (plain) {
        return new JsonMask(plain).current;
    };
    JsonMask.prototype._parse = function (plain, result) {
        if (result === void 0) { result = null; }
        if (plain instanceof JsonMask) {
            result = plain.current;
        }
        else {
            if (result === null) {
                result = this.init_mask_object(plain);
            }
            var type = this.get_type(plain);
            if (type == JsonMaskTypes.STRING) {
                result = this.item(plain, result);
            }
            else if (type == JsonMaskTypes.OBJECT) {
                result[1].push({ type: type });
                var last = this._last_type(result);
                last.value = {};
                //@ts-ignore
                for (var key in plain) {
                    var value = plain[key];
                    var item = last.value[key];
                    item = this.init_mask_object(value);
                    item = this._parse(value, item);
                    last.value[key] = item;
                }
            }
            else if (type == JsonMaskTypes.ARRAY) {
                result[1].push({ type: type });
                var last = this._last_type(result);
                last.value = Array(plain.length);
                //@ts-ignore
                for (var i = 0; i < plain.length; i++) {
                    last.value[i] = this.init_mask_object(plain[i]);
                    last.value[i] = this._parse(plain[i], last.value[i]);
                }
            }
            else {
                result[1].push({ type: type });
                var last = this._last_type(result);
                last.mean = plain;
            }
        }
        return result;
    };
    JsonMask.prototype._regex_valid = function (value, regex) {
        var result = regex.test(value);
        regex.lastIndex = 0;
        return result;
    };
    JsonMask.prototype._compare_types = function (type, original, mask) {
        switch (mask.type) {
            case JsonMaskTypes.ANY:
                return true;
            case JsonMaskTypes.NULL:
                if (mask.type != type) {
                    break;
                }
                return true;
            case JsonMaskTypes.BOOLEAN:
                if (mask.type != type || ('mean' in mask && mask.mean != original)) {
                    break;
                }
                return true;
            case JsonMaskTypes.NUMBER:
                if ((mask.type != type && JsonMaskTypes.INTEGER != type && JsonMaskTypes.DECIMAL != type)
                    || ('mean' in mask && mask.mean != original) || (mask.max_mean !== undefined && mask.max_mean < original)
                    || (mask.min_mean !== undefined && mask.min_mean > original)) {
                    break;
                }
                return true;
            case JsonMaskTypes.STRING:
                if (mask.type != type || (mask.min_mean !== undefined && mask.min_mean > original.length) || (mask.max_mean !== undefined && mask.max_mean < original.length)
                    || ('mean' in mask && mask.mean != original) || mask.regex !== undefined && !this._regex_valid(original, mask.regex)) {
                    break;
                }
                return true;
            case JsonMaskTypes.ARRAY:
                if (mask.type != type || (mask.mean !== undefined && mask.mean != original) || (mask.value !== undefined && original.length > mask.value.length)
                    || (mask.max_mean !== undefined && mask.max_mean < original.length) || (mask.min_mean !== undefined && mask.min_mean > original.length)) {
                    break;
                }
                if (mask.value !== undefined) {
                    /** error has been occured */
                    var flag = false;
                    for (var i = 0, j = 0; i < mask.value.length;) {
                        if (original.length <= j) {
                            if (mask.value[i][0]) {
                                continue;
                            }
                            else {
                                flag = true;
                                break;
                            }
                        }
                        var result = this._recursive_valid(original[j], mask.value[i]);
                        if (!result) {
                            // may be none -> mask.value[0][0]
                            if ((mask.value.length - original.length) > (i - j) && mask.value[i][0] && i + 1 != mask.value.length) {
                                i++;
                                continue;
                            }
                            flag = true;
                            break;
                        }
                        i++;
                        j++;
                    }
                    if (flag) {
                        break;
                    }
                }
                if (mask.default !== undefined) {
                    var flag = false;
                    for (var _i = 0, original_1 = original; _i < original_1.length; _i++) {
                        var _n = original_1[_i];
                        if (!this._recursive_valid(_n, mask.default)) {
                            flag = true;
                            break;
                        }
                    }
                    if (flag) {
                        break;
                    }
                }
                return true;
            case JsonMaskTypes.OBJECT:
                var length_1 = Object.keys(original).length;
                if (mask.type != type || (mask.mean !== undefined && mask.mean != original)
                    || (mask.value !== undefined && length_1 > Object.keys(mask.value).length)
                    || (mask.max_mean !== undefined && length_1 > mask.max_mean)
                    || (mask.min_mean !== undefined && length_1 < mask.min_mean)) {
                    break;
                }
                if (mask.value !== undefined) {
                    var flag = false;
                    for (var _a = 0, _b = Object.keys(mask.value); _a < _b.length; _a++) {
                        var key = _b[_a];
                        var value = mask.value[key];
                        if (!(key in original)) {
                            if (value[0]) {
                                continue;
                            }
                            else {
                                flag = true;
                                break;
                            }
                        }
                        if (!this._recursive_valid(original[key], value)) {
                            flag = true;
                            break;
                        }
                    }
                    if (flag) {
                        break;
                    }
                }
                return true;
            case JsonMaskTypes.DECIMAL:
                if ((mask.type != type)
                    || ('mean' in mask && mask.mean != original) || (mask.max_mean !== undefined && mask.max_mean < original)
                    || (mask.min_mean !== undefined && mask.min_mean > original)) {
                    break;
                }
                return true;
            case JsonMaskTypes.INTEGER:
                if ((mask.type != type)
                    || ('mean' in mask && mask.mean != original) || (mask.max_mean !== undefined && mask.max_mean < original)
                    || (mask.min_mean !== undefined && mask.min_mean > original)) {
                    break;
                }
                return true;
        }
        return false;
    };
    JsonMask.prototype._recursive_valid = function (original, current) {
        var type = this.get_type(original);
        var masks = current[1];
        for (var _i = 0, masks_1 = masks; _i < masks_1.length; _i++) {
            var mask = masks_1[_i];
            // lets check each type
            if (this._compare_types(type, original, mask)) {
                return true;
            }
        }
        return false;
    };
    /**
     * check the validity of a json object
     *
     * ### Usage:
     * ```tsx
     * const jm = new JsonMask ("{string(<=5)}");
     * console.log (jm.valid ("hello"));
     * ```
     *
     *
     * @param original json object to validate
     * @returns
     */
    JsonMask.prototype.valid = function (original) {
        //console.log(JSON.stringify (this.current, null, 2));
        return this._recursive_valid(original, this.current);
    };
    JsonMask.prototype._set_current = function (current) {
        this.current = structuredClone(current);
    };
    JsonMask.prototype._get_current = function () {
        return new Proxy(this.current, {
            set: undefined
        });
    };
    JsonMask.prototype._set_regexp = function (regex) {
        for (var _i = 0, _a = this.current[1]; _i < _a.length; _i++) {
            var _n = _a[_i];
            if (_n.type == JsonMaskTypes.STRING) {
                _n.regex = regex;
            }
        }
    };
    return JsonMask;
}());
exports.JsonMask = JsonMask;
/**
 * creating additional independent types for one element
 *
 * ### Usage:
 * ```tsx
 * JsonMask.or ("{string(<=100)}", "{number(>=0)}", "{bool(false)}")
 * ```
 *
 * @param originals expressions or JsonMasks
 * @returns
 */
function or() {
    var _a;
    var originals = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        originals[_i] = arguments[_i];
    }
    var new_original = new JsonMask();
    var current = [false, []];
    for (var _b = 0, originals_1 = originals; _b < originals_1.length; _b++) {
        var original = originals_1[_b];
        var _original = new_original.parse(original);
        (_a = current[1]).push.apply(_a, _original[1]);
        if (_original[0] && !original[0]) {
            original[0] = true;
        }
    }
    new_original._set_current(current);
    return new_original;
}
/**
 * creating an array with default value 'original'
 *
 * ### Usage:
 * ```tsx
 * JsonMask.array("{string}")
 * ```
 *
 * @param original expression or JsonMask
 * @param none can be none
 * @returns
 */
function array(original, none) {
    if (none === void 0) { none = false; }
    var arr = new JsonMask();
    var current = [none, [{ type: JsonMaskTypes.ARRAY }]];
    current[1][0].default = arr.parse(original);
    arr._set_current(current);
    return arr;
}
/**
 * Adding a regular expression for additional checking
 *
 * ### Usage:
 * ```tsx
 * JsonMask.regex("{string|none}", /^[a-zA-Z0-9]+$/g)
 * ```
 *
 * @param original expression or JsonMask
 * @param regex regular expression to check a string
 */
function regex(original, regex) {
    var s = new JsonMask(original);
    s._set_regexp(regex);
    return s;
}
