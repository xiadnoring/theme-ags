export type JsonMaskItem = string | {
    [key: string]: JsonMaskItem;
} | JsonMaskItem[] | any;
export declare enum JsonMaskTypes {
    ANY = -1,
    INTEGER = 0,
    DECIMAL = 1,
    STRING = 2,
    OBJECT = 3,
    ARRAY = 4,
    NULL = 5,
    BOOLEAN = 6,
    NUMBER = 7
}
export type JsonMaskType = {
    type?: JsonMaskTypes;
    value?: any | {
        [key: string]: JsonMaskObject;
    } | JsonMaskObject[];
    mean?: any;
    min_mean?: number;
    max_mean?: number;
    default?: any | {
        [key: string]: JsonMaskObject;
    } | JsonMaskObject[];
    regex?: RegExp;
};
export type JsonMaskObject = [
    boolean,
    JsonMaskType[]
];
export declare enum JsonMaskBracketType {
    NONE = -1,
    CIRCLE = 0,
    SQUARE = 1
}
export declare enum JsonMaskSignsEquality {
    NONE = -1,
    EQUAL = 0,
    GREATER = 1,
    LESS = 2,
    GREATER_OR_EQUAL = 3,
    LESS_OR_EQUAL = 4
}
export declare enum JsonMaskBufferType {
    NONE = -1,
    INTEGER = 0,
    MEAN = 1
}
export declare enum JsonMaskErrorCode {
    FATAL = 0,
    PARSE_TYPE = 1,
    PARSE_UNEXPECTED_END = 2,
    INVALID_CHAR = 3
}
declare class JsonMask {
    private handler;
    private buffer;
    private prehandler;
    private current;
    private last;
    private bracket_type;
    private sign_equality;
    private buffer_type;
    private quotes;
    private escaped;
    /**
     * initialize a class to check json objects for validity when creating json or an existing one
     *
     * @param content expression or JsonMask
     */
    constructor(content?: JsonMaskItem);
    private get_type;
    private get_number_type;
    private _parse_type;
    private _parse_after_type_name;
    private _parse_buffer;
    private _ret_inner_brackets;
    private _parse_inner_brackets_mean;
    private _parse_inner_brackets;
    private _parse_after_type;
    private _is_white_space;
    private _skip_white_space;
    private _last_type;
    private _set_last_type;
    private item;
    private init_mask_object;
    parse(plain: JsonMaskItem): JsonMaskObject;
    private _parse;
    private _regex_valid;
    private _compare_types;
    private _recursive_valid;
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
    valid(original: JsonMaskItem): boolean;
    _set_current(current: JsonMaskObject): void;
    _get_current(): JsonMaskObject;
    _set_regexp(regex: RegExp): void;
}
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
declare function or(...originals: JsonMaskItem[]): JsonMask;
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
declare function array(original: JsonMaskItem, none?: boolean): JsonMask;
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
declare function regex(original: JsonMaskItem, regex: RegExp): JsonMask;
export { JsonMask, or, array, regex };
