var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
import { g as getDefaultExportFromCjs } from "./csv_data_analysis_vendor-data.js";
const ONE = 2147483648;
const ALL = 4294967295;
class BitSet {
  /**
   * Instantiate a new BitSet instance.
   * @param {number} size The number of bits.
   */
  constructor(size) {
    this._size = size;
    this._bits = new Uint32Array(Math.ceil(size / 32));
  }
  /**
   * The number of bits.
   * @return {number}
   */
  get length() {
    return this._size;
  }
  /**
   * The number of bits set to one.
   * https://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
   * @return {number}
   */
  count() {
    const n = this._bits.length;
    let count2 = 0;
    for (let i = 0; i < n; ++i) {
      for (let b = this._bits[i]; b; ++count2) {
        b &= b - 1;
      }
    }
    return count2;
  }
  /**
   * Get the bit at a given index.
   * @param {number} i The bit index.
   */
  get(i) {
    return this._bits[i >> 5] & ONE >>> i;
  }
  /**
   * Set the bit at a given index to one.
   * @param {number} i The bit index.
   */
  set(i) {
    this._bits[i >> 5] |= ONE >>> i;
  }
  /**
   * Clear the bit at a given index to zero.
   * @param {number} i The bit index.
   */
  clear(i) {
    this._bits[i >> 5] &= ~(ONE >>> i);
  }
  /**
   * Scan the bits, invoking a callback function with the index of
   * each non-zero bit.
   * @param {(i: number) => void} fn A callback function.
   */
  scan(fn) {
    for (let i = this.next(0); i >= 0; i = this.next(i + 1)) {
      fn(i);
    }
  }
  /**
   * Get the next non-zero bit starting from a given index.
   * @param {number} i The bit index.
   */
  next(i) {
    const bits = this._bits;
    const n = bits.length;
    let index2 = i >> 5;
    let curr = bits[index2] & ALL >>> i;
    for (; index2 < n; curr = bits[++index2]) {
      if (curr !== 0) {
        return (index2 << 5) + Math.clz32(curr);
      }
    }
    return -1;
  }
  /**
   * Return the index of the nth non-zero bit.
   * @param {number} n The number of non-zero bits to advance.
   * @return {number} The index of the nth non-zero bit.
   */
  nth(n) {
    let i = this.next(0);
    while (n-- && i >= 0) i = this.next(i + 1);
    return i;
  }
  /**
   * Negate all bits in this bitset.
   * Modifies this BitSet in place.
   * @return {this}
   */
  not() {
    const bits = this._bits;
    const n = bits.length;
    for (let i = 0; i < n; ++i) {
      bits[i] = ~bits[i];
    }
    const tail = this._size % 32;
    if (tail) {
      bits[n - 1] &= ONE >> tail - 1;
    }
    return this;
  }
  /**
   * Compute the logical AND of this BitSet and another.
   * @param {BitSet} bitset The BitSet to combine with.
   * @return {BitSet} This BitSet updated with the logical AND.
   */
  and(bitset) {
    if (bitset) {
      const a = this._bits;
      const b = bitset._bits;
      const n = a.length;
      for (let i = 0; i < n; ++i) {
        a[i] &= b[i];
      }
    }
    return this;
  }
  /**
   * Compute the logical OR of this BitSet and another.
   * @param {BitSet} bitset The BitSet to combine with.
   * @return {BitSet} This BitSet updated with the logical OR.
   */
  or(bitset) {
    if (bitset) {
      const a = this._bits;
      const b = bitset._bits;
      const n = a.length;
      for (let i = 0; i < n; ++i) {
        a[i] |= b[i];
      }
    }
    return this;
  }
}
function bin(value, min2, max2, step, offset2) {
  return value == null ? null : value < min2 ? -Infinity : value > max2 ? Infinity : (value = Math.max(min2, Math.min(value, max2)), min2 + step * Math.floor(1e-14 + (value - min2) / step + (offset2 || 0)));
}
function isDate$1(value) {
  return value instanceof Date;
}
function isRegExp(value) {
  return value instanceof RegExp;
}
function isObject$2(value) {
  return value === Object(value);
}
function equal(a, b) {
  return a == null || b == null || a !== a || b !== b ? false : a === b ? true : isDate$1(a) || isDate$1(b) ? +a === +b : isRegExp(a) && isRegExp(b) ? a + "" === b + "" : isObject$2(a) && isObject$2(b) ? deepEqual(a, b) : false;
}
function deepEqual(a, b) {
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }
  if (a.length || b.length) {
    return arrayEqual(a, b);
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) {
    return false;
  }
  keysA.sort();
  keysB.sort();
  if (!arrayEqual(keysA, keysB, (a2, b2) => a2 === b2)) {
    return false;
  }
  const n = keysA.length;
  for (let i = 0; i < n; ++i) {
    const k = keysA[i];
    if (!equal(a[k], b[k])) {
      return false;
    }
  }
  return true;
}
function arrayEqual(a, b, test = equal) {
  const n = a.length;
  if (n !== b.length) return false;
  for (let i = 0; i < n; ++i) {
    if (!test(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
function recode(value, map2, fallback) {
  if (map2 instanceof Map) {
    if (map2.has(value)) return map2.get(value);
  } else {
    const key2 = `${value}`;
    if (Object.hasOwn(map2, key2)) return map2[key2];
  }
  return fallback !== void 0 ? fallback : value;
}
function sequence(start, stop, step) {
  let n = arguments.length;
  start = +start;
  stop = +stop;
  step = n < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
  n = Math.max(0, Math.ceil((stop - start) / step)) | 0;
  const seq = new Array(n);
  for (let i = 0; i < n; ++i) {
    seq[i] = start + i * step;
  }
  return seq;
}
const NULL = void 0;
function isArray$2(value) {
  return Array.isArray(value);
}
const TypedArray$1 = Object.getPrototypeOf(Int8Array);
function isTypedArray$1(value) {
  return value instanceof TypedArray$1;
}
function isArrayType(value) {
  return isArray$2(value) || isTypedArray$1(value);
}
function isString(value) {
  return typeof value === "string";
}
function isValid(value) {
  return value != null && value === value;
}
const isSeq = (seq) => isArrayType(seq) || isString(seq);
function compact(array2) {
  return isArrayType(array2) ? array2.filter((v) => isValid(v)) : array2;
}
function concat$2(...values2) {
  return [].concat(...values2);
}
function includes(sequence2, value, index2) {
  return isSeq(sequence2) ? sequence2.includes(value, index2) : false;
}
function indexof(sequence2, value) {
  return isSeq(sequence2) ? sequence2.indexOf(value) : -1;
}
function join$1(array2, delim) {
  return isArrayType(array2) ? array2.join(delim) : NULL;
}
function lastindexof(sequence2, value) {
  return isSeq(sequence2) ? sequence2.lastIndexOf(value) : -1;
}
function length(sequence2) {
  return isSeq(sequence2) ? sequence2.length : 0;
}
function pluck(array2, property) {
  return isArrayType(array2) ? array2.map((v) => isValid(v) ? v[property] : NULL) : NULL;
}
function reverse(sequence2) {
  return isArrayType(sequence2) ? sequence2.slice().reverse() : isString(sequence2) ? sequence2.split("").reverse().join("") : NULL;
}
function slice$2(sequence2, start, end) {
  return isSeq(sequence2) ? sequence2.slice(start, end) : NULL;
}
const array$2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  compact,
  concat: concat$2,
  includes,
  indexof,
  join: join$1,
  lastindexof,
  length,
  pluck,
  reverse,
  slice: slice$2
}, Symbol.toStringTag, { value: "Module" }));
function pad(value, width, char = "0") {
  const s = value + "";
  const len = s.length;
  return len < width ? Array(width - len + 1).join(char) + s : s;
}
const pad2 = (v) => (v < 10 ? "0" : "") + v;
const formatYear = (year2) => year2 < 0 ? "-" + pad(-year2, 6) : year2 > 9999 ? "+" + pad(year2, 6) : pad(year2, 4);
function formatISO(year2, month2, date2, hours2, min2, sec, ms, utc, short) {
  const suffix = utc ? "Z" : "";
  return formatYear(year2) + "-" + pad2(month2 + 1) + "-" + pad2(date2) + (!short || ms ? "T" + pad2(hours2) + ":" + pad2(min2) + ":" + pad2(sec) + "." + pad(ms, 3) + suffix : sec ? "T" + pad2(hours2) + ":" + pad2(min2) + ":" + pad2(sec) + suffix : min2 || hours2 || !utc ? "T" + pad2(hours2) + ":" + pad2(min2) + suffix : "");
}
function formatDate(d, short) {
  return isNaN(d) ? "Invalid Date" : formatISO(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
    false,
    short
  );
}
function formatUTCDate(d, short) {
  return isNaN(d) ? "Invalid Date" : formatISO(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds(),
    true,
    short
  );
}
const iso_re = /^([-+]\d{2})?\d{4}(-\d{2}(-\d{2})?)?(T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[-+]\d{2}:\d{2})?)?$/;
function isISODateString(value) {
  return value.match(iso_re) && !isNaN(Date.parse(value));
}
function parseISODate(value, parse4 = Date.parse) {
  return isISODateString(value) ? parse4(value) : value;
}
const msMinute = 6e4;
const msDay = 864e5;
const msWeek = 6048e5;
const t0 = /* @__PURE__ */ new Date();
const t1 = /* @__PURE__ */ new Date();
const t = (d) => (t0.setTime(typeof d === "string" ? parseISODate(d) : d), t0);
function format_date(date2, shorten) {
  return formatDate(t(date2), !shorten);
}
function format_utcdate(date2, shorten) {
  return formatUTCDate(t(date2), !shorten);
}
function now() {
  return Date.now();
}
function timestamp$1(date2) {
  return +t(date2);
}
function datetime$2(year2, month2, date2, hours2, minutes2, seconds2, milliseconds2) {
  return !arguments.length ? new Date(Date.now()) : new Date(
    year2,
    month2 || 0,
    date2 == null ? 1 : date2,
    hours2 || 0,
    minutes2 || 0,
    seconds2 || 0,
    milliseconds2 || 0
  );
}
function year(date2) {
  return t(date2).getFullYear();
}
function quarter(date2) {
  return Math.floor(t(date2).getMonth() / 3);
}
function month(date2) {
  return t(date2).getMonth();
}
function week(date2, firstday) {
  const i = firstday || 0;
  t1.setTime(+date2);
  t1.setDate(t1.getDate() - (t1.getDay() + 7 - i) % 7);
  t1.setHours(0, 0, 0, 0);
  t0.setTime(+date2);
  t0.setMonth(0);
  t0.setDate(1);
  t0.setDate(1 - (t0.getDay() + 7 - i) % 7);
  t0.setHours(0, 0, 0, 0);
  const tz = (t1.getTimezoneOffset() - t0.getTimezoneOffset()) * msMinute;
  return Math.floor((1 + (+t1 - +t0) - tz) / msWeek);
}
function date$3(date2) {
  return t(date2).getDate();
}
function dayofyear(date2) {
  t1.setTime(+date2);
  t1.setHours(0, 0, 0, 0);
  t0.setTime(+t1);
  t0.setMonth(0);
  t0.setDate(1);
  const tz = (t1.getTimezoneOffset() - t0.getTimezoneOffset()) * msMinute;
  return Math.floor(1 + (+t1 - +t0 - tz) / msDay);
}
function dayofweek(date2) {
  return t(date2).getDay();
}
function hours(date2) {
  return t(date2).getHours();
}
function minutes(date2) {
  return t(date2).getMinutes();
}
function seconds(date2) {
  return t(date2).getSeconds();
}
function milliseconds(date2) {
  return t(date2).getMilliseconds();
}
function utcdatetime(year2, month2, date2, hours2, minutes2, seconds2, milliseconds2) {
  return !arguments.length ? new Date(Date.now()) : new Date(Date.UTC(
    year2,
    month2 || 0,
    date2 == null ? 1 : date2,
    hours2 || 0,
    minutes2 || 0,
    seconds2 || 0,
    milliseconds2 || 0
  ));
}
function utcyear(date2) {
  return t(date2).getUTCFullYear();
}
function utcquarter(date2) {
  return Math.floor(t(date2).getUTCMonth() / 3);
}
function utcmonth(date2) {
  return t(date2).getUTCMonth();
}
function utcweek(date2, firstday) {
  const i = firstday || 0;
  t1.setTime(+date2);
  t1.setUTCDate(t1.getUTCDate() - (t1.getUTCDay() + 7 - i) % 7);
  t1.setUTCHours(0, 0, 0, 0);
  t0.setTime(+date2);
  t0.setUTCMonth(0);
  t0.setUTCDate(1);
  t0.setUTCDate(1 - (t0.getUTCDay() + 7 - i) % 7);
  t0.setUTCHours(0, 0, 0, 0);
  return Math.floor((1 + (+t1 - +t0)) / msWeek);
}
function utcdate(date2) {
  return t(date2).getUTCDate();
}
function utcdayofyear(date2) {
  t1.setTime(+date2);
  t1.setUTCHours(0, 0, 0, 0);
  const t02 = Date.UTC(t1.getUTCFullYear(), 0, 1);
  return Math.floor(1 + (+t1 - t02) / msDay);
}
function utcdayofweek(date2) {
  return t(date2).getUTCDay();
}
function utchours(date2) {
  return t(date2).getUTCHours();
}
function utcminutes(date2) {
  return t(date2).getUTCMinutes();
}
function utcseconds(date2) {
  return t(date2).getUTCSeconds();
}
function utcmilliseconds(date2) {
  return t(date2).getUTCMilliseconds();
}
const date$4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  date: date$3,
  datetime: datetime$2,
  dayofweek,
  dayofyear,
  format_date,
  format_utcdate,
  hours,
  milliseconds,
  minutes,
  month,
  now,
  quarter,
  seconds,
  timestamp: timestamp$1,
  utcdate,
  utcdatetime,
  utcdayofweek,
  utcdayofyear,
  utchours,
  utcmilliseconds,
  utcminutes,
  utcmonth,
  utcquarter,
  utcseconds,
  utcweek,
  utcyear,
  week,
  year
}, Symbol.toStringTag, { value: "Module" }));
function parse_json(value) {
  return JSON.parse(value);
}
function to_json(value) {
  return JSON.stringify(value);
}
const json = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  parse_json,
  to_json
}, Symbol.toStringTag, { value: "Module" }));
let source = Math.random;
function random$1() {
  return source();
}
function random() {
  return random$1();
}
function is_nan(value) {
  return Number.isNaN(value);
}
function is_finite(value) {
  return Number.isFinite(value);
}
function abs(value) {
  return Math.abs(value);
}
function cbrt(value) {
  return Math.cbrt(value);
}
function ceil(value) {
  return Math.ceil(value);
}
function clz32(value) {
  return Math.clz32(value);
}
function exp(value) {
  return Math.exp(value);
}
function expm1(value) {
  return Math.expm1(value);
}
function floor(value) {
  return Math.floor(value);
}
function fround(value) {
  return Math.fround(value);
}
function greatest(...values2) {
  return Math.max(...values2);
}
function least(...values2) {
  return Math.min(...values2);
}
function log(value) {
  return Math.log(value);
}
function log10(value) {
  return Math.log10(value);
}
function log1p(value) {
  return Math.log1p(value);
}
function log2(value) {
  return Math.log2(value);
}
function pow(base, exponent) {
  return Math.pow(base, exponent);
}
function round$1(value) {
  return Math.round(value);
}
function sign(value) {
  return Math.sign(value);
}
function sqrt(value) {
  return Math.sqrt(value);
}
function trunc(value) {
  return Math.trunc(value);
}
function degrees(radians2) {
  return 180 * radians2 / Math.PI;
}
function radians(degrees2) {
  return Math.PI * degrees2 / 180;
}
function acos(value) {
  return Math.acos(value);
}
function acosh(value) {
  return Math.acosh(value);
}
function asin(value) {
  return Math.asin(value);
}
function asinh(value) {
  return Math.asinh(value);
}
function atan(value) {
  return Math.atan(value);
}
function atan2(y, x) {
  return Math.atan2(y, x);
}
function atanh(value) {
  return Math.atanh(value);
}
function cos(value) {
  return Math.cos(value);
}
function cosh(value) {
  return Math.cosh(value);
}
function sin(value) {
  return Math.sin(value);
}
function sinh(value) {
  return Math.sinh(value);
}
function tan(value) {
  return Math.tan(value);
}
function tanh(value) {
  return Math.tanh(value);
}
const math = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  abs,
  acos,
  acosh,
  asin,
  asinh,
  atan,
  atan2,
  atanh,
  cbrt,
  ceil,
  clz32,
  cos,
  cosh,
  degrees,
  exp,
  expm1,
  floor,
  fround,
  greatest,
  is_finite,
  is_nan,
  least,
  log,
  log10,
  log1p,
  log2,
  pow,
  radians,
  random,
  round: round$1,
  sign,
  sin,
  sinh,
  sqrt,
  tan,
  tanh,
  trunc
}, Symbol.toStringTag, { value: "Module" }));
function isMap(value) {
  return value instanceof Map;
}
function isSet(value) {
  return value instanceof Set;
}
function isMapOrSet(value) {
  return isMap(value) || isSet(value);
}
function array$1(iter) {
  return Array.from(iter);
}
function has(object2, key2) {
  return isMapOrSet(object2) ? object2.has(key2) : object2 != null ? Object.hasOwn(object2, `${key2}`) : false;
}
function keys(object2) {
  return isMap(object2) ? array$1(object2.keys()) : object2 != null ? (
    /** @type {K[]} */
    Object.keys(object2)
  ) : [];
}
function values$1(object2) {
  return isMapOrSet(object2) ? array$1(object2.values()) : object2 != null ? Object.values(object2) : [];
}
function entries$1(object2) {
  return isMapOrSet(object2) ? array$1(object2.entries()) : object2 != null ? (
    /** @type {[K, V][]} */
    Object.entries(object2)
  ) : [];
}
function object$1(entries2) {
  return entries2 ? (
    /** @type {Record<K, V>} */
    Object.fromEntries(entries2)
  ) : NULL;
}
const object$2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  entries: entries$1,
  has,
  keys,
  object: object$1,
  values: values$1
}, Symbol.toStringTag, { value: "Module" }));
function parse_date(value) {
  return value == null ? value : new Date(value);
}
function parse_float(value) {
  return value == null ? value : Number.parseFloat(value);
}
function parse_int(value, radix) {
  return value == null ? value : Number.parseInt(value, radix);
}
function endswith(value, search, length2) {
  return value == null ? false : String(value).endsWith(search, length2);
}
function match(value, regexp, index2) {
  const m = value == null ? value : String(value).match(regexp);
  return index2 == null || m == null ? m : typeof index2 === "number" ? m[index2] : m.groups ? m.groups[index2] : null;
}
function normalize(value, form) {
  return value == null ? value : String(value).normalize(form);
}
function padend(value, length2, fill) {
  return value == null ? value : String(value).padEnd(length2, fill);
}
function padstart(value, length2, fill) {
  return value == null ? value : String(value).padStart(length2, fill);
}
function upper(value) {
  return value == null ? value : String(value).toUpperCase();
}
function lower(value) {
  return value == null ? value : String(value).toLowerCase();
}
function repeat$1(value, number2) {
  return value == null ? value : String(value).repeat(number2);
}
function replace(value, pattern, replacement) {
  return value == null ? value : String(value).replace(pattern, String(replacement));
}
function split(value, separator, limit) {
  return value == null ? [] : String(value).split(separator, limit);
}
function startswith(value, search, position) {
  return value == null ? false : String(value).startsWith(search, position);
}
function substring(value, start, end) {
  return value == null ? value : String(value).substring(start, end);
}
function trim(value) {
  return value == null ? value : String(value).trim();
}
const string$2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  endswith,
  lower,
  match,
  normalize,
  padend,
  padstart,
  parse_date,
  parse_float,
  parse_int,
  repeat: repeat$1,
  replace,
  split,
  startswith,
  substring,
  trim,
  upper
}, Symbol.toStringTag, { value: "Module" }));
const functions = {
  bin,
  equal,
  recode,
  sequence,
  ...array$2,
  ...date$4,
  ...json,
  ...math,
  ...object$2,
  ...string$2
};
function toArray$1(value) {
  return value != null ? isArray$2(value) ? value : [value] : [];
}
function isBigInt(value) {
  return typeof value === "bigint";
}
function toString$1(v) {
  return v === void 0 ? v + "" : isBigInt(v) ? v + "n" : JSON.stringify(v);
}
let Op$1 = class Op {
  constructor(name2, fields, params) {
    this.name = name2;
    this.fields = fields;
    this.params = params;
  }
  toString() {
    const args = [
      ...this.fields.map((f) => `d[${toString$1(f)}]`),
      ...this.params.map(toString$1)
    ];
    return `d => op.${this.name}(${args})`;
  }
  toObject() {
    return { expr: this.toString(), func: true };
  }
};
function op(name2, fields = [], params = []) {
  return new Op$1(name2, toArray$1(fields), toArray$1(params));
}
const any$1 = (field2) => op("any", field2);
const count = () => op("count");
const array_agg = (field2) => op("array_agg", field2);
const array_agg_distinct = (field2) => op("array_agg_distinct", field2);
const map_agg = (key2, value) => op("map_agg", [key2, value]);
const object_agg = (key2, value) => op("object_agg", [key2, value]);
const entries_agg = (key2, value) => op("entries_agg", [key2, value]);
({
  ...functions
});
function error(message, cause) {
  throw Error(message, { cause });
}
function uniqueName(names2, name2) {
  names2 = isMapOrSet(names2) ? names2 : new Set(names2);
  let uname = name2;
  let index2 = 0;
  while (names2.has(uname)) {
    uname = name2 + ++index2;
  }
  return uname;
}
function isFunction$1(value) {
  return typeof value === "function";
}
function repeat(reps, value) {
  const result = Array(reps);
  if (isFunction$1(value)) {
    for (let i = 0; i < reps; ++i) {
      result[i] = value(i);
    }
  } else {
    result.fill(value);
  }
  return result;
}
function bins(min2, max2, maxbins = 15, nice = true, minstep = 0, step) {
  const base = 10;
  const logb = Math.LN10;
  if (step == null) {
    const level = Math.ceil(Math.log(maxbins) / logb);
    const span = max2 - min2 || Math.abs(min2) || 1;
    const div = [5, 2];
    step = Math.max(
      minstep,
      Math.pow(base, Math.round(Math.log(span) / logb) - level)
    );
    while (Math.ceil(span / step) > maxbins) {
      step *= base;
    }
    const n = div.length;
    for (let i = 0; i < n; ++i) {
      const v = step / div[i];
      if (v >= minstep && span / v <= maxbins) {
        step = v;
      }
    }
  }
  if (nice) {
    let v = Math.log(step);
    const precision = v >= 0 ? 0 : ~~(-v / logb) + 1;
    const eps = Math.pow(base, -precision - 1);
    v = Math.floor(min2 / step + eps) * step;
    min2 = min2 < v ? v - step : v;
    max2 = Math.ceil(max2 / step) * step;
  }
  return [
    min2,
    max2 === min2 ? min2 + step : max2,
    step
  ];
}
function key(value) {
  const type = typeof value;
  return type === "string" ? `"${value}"` : type !== "object" || !value ? value : isDate$1(value) ? +value : isArray$2(value) || isTypedArray$1(value) ? `[${value.map(key)}]` : isRegExp(value) ? value + "" : objectKey$1(value);
}
function objectKey$1(value) {
  let s = "{";
  let i = -1;
  for (const k in value) {
    if (++i > 0) s += ",";
    s += `"${k}":${key(value[k])}`;
  }
  s += "}";
  return s;
}
function keyFunction(get2, nulls) {
  const n = get2.length;
  return n === 1 ? (row, data2) => key(get2[0](row, data2)) : (row, data2) => {
    let s = "";
    for (let i = 0; i < n; ++i) {
      if (i > 0) s += "|";
      const v = get2[i](row, data2);
      if (nulls && (v == null || v !== v)) return null;
      s += key(v);
    }
    return s;
  };
}
function distinctMap() {
  const map2 = /* @__PURE__ */ new Map();
  return {
    count() {
      return map2.size;
    },
    values() {
      return Array.from(map2.values(), (_) => _.v);
    },
    increment(v) {
      const k = key(v);
      const e = map2.get(k);
      e ? ++e.n : map2.set(k, { v, n: 1 });
    },
    decrement(v) {
      const k = key(v);
      const e = map2.get(k);
      e.n === 1 ? map2.delete(k) : --e.n;
    },
    forEach(fn) {
      map2.forEach(({ v, n }) => fn(v, n));
    }
  };
}
function noop$1() {
}
function product(values2, start = 0, stop = values2.length) {
  let prod = values2[start++];
  for (let i = start; i < stop; ++i) {
    prod *= values2[i];
  }
  return prod;
}
function initOp(op2) {
  op2.init = op2.init || noop$1;
  op2.add = op2.add || noop$1;
  op2.rem = op2.rem || noop$1;
  return op2;
}
function initProduct(s, value) {
  s.product_v = false;
  return s.product = value;
}
const aggregateFunctions = {
  /** @type {AggregateDef} */
  count: {
    create: () => initOp({
      value: (s) => s.count
    }),
    param: []
  },
  /** @type {AggregateDef} */
  array_agg: {
    create: () => initOp({
      init: (s) => s.values = true,
      value: (s) => s.list.values(s.stream)
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  object_agg: {
    create: () => initOp({
      init: (s) => s.values = true,
      value: (s) => Object.fromEntries(s.list.values())
    }),
    param: [2]
  },
  /** @type {AggregateDef} */
  map_agg: {
    create: () => initOp({
      init: (s) => s.values = true,
      value: (s) => new Map(s.list.values())
    }),
    param: [2]
  },
  /** @type {AggregateDef} */
  entries_agg: {
    create: () => initOp({
      init: (s) => s.values = true,
      value: (s) => s.list.values(s.stream)
    }),
    param: [2]
  },
  /** @type {AggregateDef} */
  any: {
    create: () => initOp({
      add: (s, v) => {
        if (s.any == null) s.any = v;
      },
      value: (s) => s.valid ? s.any : NULL
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  valid: {
    create: () => initOp({
      value: (s) => s.valid
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  invalid: {
    create: () => initOp({
      value: (s) => s.count - s.valid
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  distinct: {
    create: () => ({
      init: (s) => s.distinct = distinctMap(),
      value: (s) => s.distinct.count() + (s.valid === s.count ? 0 : 1),
      add: (s, v) => s.distinct.increment(v),
      rem: (s, v) => s.distinct.decrement(v)
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  array_agg_distinct: {
    create: () => initOp({
      value: (s) => s.distinct.values()
    }),
    param: [1],
    req: ["distinct"]
  },
  /** @type {AggregateDef} */
  mode: {
    create: () => initOp({
      value: (s) => {
        let mode = NULL;
        let max2 = 0;
        s.distinct.forEach((value, count2) => {
          if (count2 > max2) {
            max2 = count2;
            mode = value;
          }
        });
        return mode;
      }
    }),
    param: [1],
    req: ["distinct"]
  },
  /** @type {AggregateDef} */
  sum: {
    create: () => ({
      init: (s) => s.sum = 0,
      value: (s) => s.valid ? s.sum : NULL,
      add: (s, v) => isBigInt(v) ? s.sum === 0 ? s.sum = v : s.sum += v : s.sum += +v,
      rem: (s, v) => s.sum -= v
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  product: {
    create: () => ({
      init: (s) => initProduct(s, 1),
      value: (s) => s.valid ? s.product_v ? initProduct(s, product(s.list.values())) : s.product : void 0,
      add: (s, v) => isBigInt(v) ? s.product === 1 ? s.product = v : s.product *= v : s.product *= v,
      rem: (s, v) => v == 0 || v === Infinity || v === -Infinity ? s.product_v = true : s.product /= v
    }),
    param: [1],
    stream: ["array_agg"]
  },
  /** @type {AggregateDef} */
  mean: {
    create: () => ({
      init: (s) => s.mean = 0,
      value: (s) => s.valid ? s.mean : NULL,
      add: (s, v) => {
        s.mean_d = v - s.mean;
        s.mean += s.mean_d / s.valid;
      },
      rem: (s, v) => {
        s.mean_d = v - s.mean;
        s.mean -= s.valid ? s.mean_d / s.valid : s.mean;
      }
    }),
    param: [1]
  },
  /** @type {AggregateDef} */
  average: {
    create: () => initOp({
      value: (s) => s.valid ? s.mean : NULL
    }),
    param: [1],
    req: ["mean"]
  },
  /** @type {AggregateDef} */
  variance: {
    create: () => ({
      init: (s) => s.dev = 0,
      value: (s) => s.valid > 1 ? s.dev / (s.valid - 1) : NULL,
      add: (s, v) => s.dev += s.mean_d * (v - s.mean),
      rem: (s, v) => s.dev -= s.mean_d * (v - s.mean)
    }),
    param: [1],
    req: ["mean"]
  },
  /** @type {AggregateDef} */
  variancep: {
    create: () => initOp({
      value: (s) => s.valid > 1 ? s.dev / s.valid : NULL
    }),
    param: [1],
    req: ["variance"]
  },
  /** @type {AggregateDef} */
  stdev: {
    create: () => initOp({
      value: (s) => s.valid > 1 ? Math.sqrt(s.dev / (s.valid - 1)) : NULL
    }),
    param: [1],
    req: ["variance"]
  },
  /** @type {AggregateDef} */
  stdevp: {
    create: () => initOp({
      value: (s) => s.valid > 1 ? Math.sqrt(s.dev / s.valid) : NULL
    }),
    param: [1],
    req: ["variance"]
  },
  /** @type {AggregateDef} */
  min: {
    create: () => ({
      init: (s) => s.min = NULL,
      value: (s) => s.min = Number.isNaN(s.min) ? s.list.min() : s.min,
      add: (s, v) => {
        if (v < s.min || s.min === NULL) s.min = v;
      },
      rem: (s, v) => {
        if (v <= s.min) s.min = NaN;
      }
    }),
    param: [1],
    stream: ["array_agg"]
  },
  /** @type {AggregateDef} */
  max: {
    create: () => ({
      init: (s) => s.max = NULL,
      value: (s) => s.max = Number.isNaN(s.max) ? s.list.max() : s.max,
      add: (s, v) => {
        if (v > s.max || s.max === NULL) s.max = v;
      },
      rem: (s, v) => {
        if (v >= s.max) s.max = NaN;
      }
    }),
    param: [1],
    stream: ["array_agg"]
  },
  /** @type {AggregateDef} */
  quantile: {
    create: (p) => initOp({
      value: (s) => s.list.quantile(p)
    }),
    param: [1, 1],
    req: ["array_agg"]
  },
  /** @type {AggregateDef} */
  median: {
    create: () => initOp({
      value: (s) => s.list.quantile(0.5)
    }),
    param: [1],
    req: ["array_agg"]
  },
  /** @type {AggregateDef} */
  covariance: {
    create: () => ({
      init: (s) => {
        s.cov = s.mean_x = s.mean_y = s.dev_x = s.dev_y = 0;
      },
      value: (s) => s.valid > 1 ? s.cov / (s.valid - 1) : NULL,
      add: (s, x, y) => {
        const dx = x - s.mean_x;
        const dy = y - s.mean_y;
        s.mean_x += dx / s.valid;
        s.mean_y += dy / s.valid;
        const dy2 = y - s.mean_y;
        s.dev_x += dx * (x - s.mean_x);
        s.dev_y += dy * dy2;
        s.cov += dx * dy2;
      },
      rem: (s, x, y) => {
        const dx = x - s.mean_x;
        const dy = y - s.mean_y;
        s.mean_x -= s.valid ? dx / s.valid : s.mean_x;
        s.mean_y -= s.valid ? dy / s.valid : s.mean_y;
        const dy2 = y - s.mean_y;
        s.dev_x -= dx * (x - s.mean_x);
        s.dev_y -= dy * dy2;
        s.cov -= dx * dy2;
      }
    }),
    param: [2]
  },
  /** @type {AggregateDef} */
  covariancep: {
    create: () => initOp({
      value: (s) => s.valid > 1 ? s.cov / s.valid : NULL
    }),
    param: [2],
    req: ["covariance"]
  },
  /** @type {AggregateDef} */
  corr: {
    create: () => initOp({
      value: (s) => s.valid > 1 ? s.cov / (Math.sqrt(s.dev_x) * Math.sqrt(s.dev_y)) : NULL
    }),
    param: [2],
    req: ["covariance"]
  },
  /** @type {AggregateDef} */
  bins: {
    create: (maxbins, nice, minstep, step) => initOp({
      value: (s) => bins(s.min, s.max, maxbins, nice, minstep, step)
    }),
    param: [1, 4],
    req: ["min", "max"]
  }
};
const rank = {
  create() {
    let rank2;
    return {
      init: () => rank2 = 1,
      value: (w) => {
        const i = w.index;
        return i && !w.peer(i) ? rank2 = i + 1 : rank2;
      }
    };
  },
  param: []
};
const cume_dist = {
  create() {
    let cume;
    return {
      init: () => cume = 0,
      value: (w) => {
        const { index: index2, peer, size } = w;
        let i = index2;
        if (cume < i) {
          while (i + 1 < size && peer(i + 1)) ++i;
          cume = i;
        }
        return (1 + cume) / size;
      }
    };
  },
  param: []
};
const windowFunctions = {
  /** @type {WindowDef} */
  row_number: {
    create() {
      return {
        init: noop$1,
        value: (w) => w.index + 1
      };
    },
    param: []
  },
  /** @type {WindowDef} */
  rank,
  /** @type {WindowDef} */
  avg_rank: {
    create() {
      let j, rank2;
      return {
        init: () => (j = -1, rank2 = 1),
        value: (w) => {
          const i = w.index;
          if (i >= j) {
            for (rank2 = j = i + 1; w.peer(j); rank2 += ++j) ;
            rank2 /= j - i;
          }
          return rank2;
        }
      };
    },
    param: []
  },
  /** @type {WindowDef} */
  dense_rank: {
    create() {
      let drank;
      return {
        init: () => drank = 1,
        value: (w) => {
          const i = w.index;
          return i && !w.peer(i) ? ++drank : drank;
        }
      };
    },
    param: []
  },
  /** @type {WindowDef} */
  percent_rank: {
    create() {
      const { init, value } = rank.create();
      return {
        init,
        value: (w) => (value(w) - 1) / (w.size - 1)
      };
    },
    param: []
  },
  /** @type {WindowDef} */
  cume_dist,
  /** @type {WindowDef} */
  ntile: {
    create(num) {
      num = +num;
      if (!(num > 0)) error("ntile num must be greater than zero.");
      const { init, value } = cume_dist.create();
      return {
        init,
        value: (w) => Math.ceil(num * value(w))
      };
    },
    param: [0, 1]
  },
  /** @type {WindowDef} */
  lag: {
    create(offset2, defaultValue = NULL) {
      offset2 = +offset2 || 1;
      return {
        init: noop$1,
        value: (w, f) => {
          const i = w.index - offset2;
          return i >= 0 ? w.value(i, f) : defaultValue;
        }
      };
    },
    param: [1, 2]
  },
  /** @type {WindowDef} */
  lead: {
    create(offset2, defaultValue = NULL) {
      offset2 = +offset2 || 1;
      return {
        init: noop$1,
        value: (w, f) => {
          const i = w.index + offset2;
          return i < w.size ? w.value(i, f) : defaultValue;
        }
      };
    },
    param: [1, 2]
  },
  /** @type {WindowDef} */
  first_value: {
    create() {
      return {
        init: noop$1,
        value: (w, f) => w.value(w.i0, f)
      };
    },
    param: [1]
  },
  /** @type {WindowDef} */
  last_value: {
    create() {
      return {
        init: noop$1,
        value: (w, f) => w.value(w.i1 - 1, f)
      };
    },
    param: [1]
  },
  /** @type {WindowDef} */
  nth_value: {
    create(nth) {
      nth = +nth;
      if (!(nth > 0)) error("nth_value nth must be greater than zero.");
      return {
        init: noop$1,
        value: (w, f) => {
          const i = w.i0 + (nth - 1);
          return i < w.i1 ? w.value(i, f) : NULL;
        }
      };
    },
    param: [1, 1]
  },
  /** @type {WindowDef} */
  fill_down: {
    create(defaultValue = NULL) {
      let value;
      return {
        init: () => value = defaultValue,
        value: (w, f) => {
          const v = w.value(w.index, f);
          return isValid(v) ? value = v : value;
        }
      };
    },
    param: [1, 1]
  },
  /** @type {WindowDef} */
  fill_up: {
    create(defaultValue = NULL) {
      let value, idx;
      return {
        init: () => (value = defaultValue, idx = -1),
        value: (w, f) => w.index <= idx ? value : (idx = find(w, f, w.index)) >= 0 ? value = w.value(idx, f) : (idx = w.size, value = defaultValue)
      };
    },
    param: [1, 1]
  }
};
function find(w, f, i) {
  for (const n = w.size; i < n; ++i) {
    if (isValid(w.value(i, f))) return i;
  }
  return -1;
}
function hasAggregate(name2) {
  return Object.hasOwn(aggregateFunctions, name2);
}
function hasWindow(name2) {
  return Object.hasOwn(windowFunctions, name2);
}
function hasFunction(name2) {
  return Object.hasOwn(functions, name2) || name2 === "row_object";
}
function getAggregate(name2) {
  return hasAggregate(name2) && aggregateFunctions[name2];
}
function getWindow(name2) {
  return hasWindow(name2) && windowFunctions[name2];
}
function concat$1(list2, fn = ((x, i) => x), delim = "") {
  const n = list2.length;
  if (!n) return "";
  let s = fn(list2[0], 0);
  for (let i = 1; i < n; ++i) {
    s += delim + fn(list2[i], i);
  }
  return s;
}
function unroll$1(args, code, ...lists) {
  const v = ["_", "$"];
  const a = v.slice(0, lists.length);
  a.push(
    '"use strict"; const ' + lists.map((l, j) => l.map((_, i) => `${v[j]}${i} = ${v[j]}[${i}]`).join(", ")).join(", ") + `; return (${args}) => ${code};`
  );
  return Function(...a)(...lists);
}
function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function max(values2, start = 0, stop = values2.length) {
  let max2 = stop ? values2[start++] : NULL;
  for (let i = start; i < stop; ++i) {
    if (max2 < values2[i]) {
      max2 = values2[i];
    }
  }
  return max2;
}
function min(values2, start = 0, stop = values2.length) {
  let min2 = stop ? values2[start++] : NULL;
  for (let i = start; i < stop; ++i) {
    if (min2 > values2[i]) {
      min2 = values2[i];
    }
  }
  return min2;
}
function toNumeric(value) {
  return isBigInt(value) ? value : +value;
}
function quantile(values2, p) {
  const n = values2.length;
  if (!n) return NULL;
  if ((p = +p) <= 0 || n < 2) return toNumeric(values2[0]);
  if (p >= 1) return toNumeric(values2[n - 1]);
  const i = (n - 1) * p;
  const i0 = Math.floor(i);
  const v0 = toNumeric(values2[i0]);
  return isBigInt(v0) ? v0 : v0 + (toNumeric(values2[i0 + 1]) - v0) * (i - i0);
}
class ValueList {
  constructor(values2) {
    this._values = values2 || [];
    this._sorted = null;
    this._start = 0;
  }
  values(copy) {
    if (this._start) {
      this._values = this._values.slice(this._start);
      this._start = 0;
    }
    return copy ? this._values.slice() : this._values;
  }
  add(value) {
    this._values.push(value);
    this._sorted = null;
  }
  rem() {
    this._start += 1;
    this._sorted = null;
  }
  min() {
    return this._sorted && this._sorted.length ? this._sorted[0] : min(this._values, this._start);
  }
  max() {
    return this._sorted && this._sorted.length ? this._sorted[this._sorted.length - 1] : max(this._values, this._start);
  }
  quantile(p) {
    if (!this._sorted) {
      this._sorted = this.values(true);
      this._sorted.sort(ascending);
    }
    return quantile(this._sorted, p);
  }
}
class Reducer {
  constructor(outputs) {
    this._outputs = outputs;
  }
  size() {
    return this._outputs.length;
  }
  outputs() {
    return this._outputs;
  }
  // eslint-disable-next-line no-unused-vars
  init(columns2) {
    return {};
  }
  // eslint-disable-next-line no-unused-vars
  add(state, row, data2) {
  }
  // eslint-disable-next-line no-unused-vars
  rem(state, row, data2) {
  }
  // eslint-disable-next-line no-unused-vars
  write(state, values2, index2) {
  }
}
const update = (ops, args, fn) => unroll$1(
  args,
  "{" + concat$1(ops, (_, i) => `_${i}.${fn}(${args});`) + "}",
  ops
);
function fieldReducer(oplist, stream) {
  const { ops, output: output2 } = expand$1(oplist, stream);
  const fields = oplist[0].fields;
  const n = fields.length;
  const cls = n === 0 ? FieldReducer : n === 1 ? Field1Reducer : n === 2 ? Field2Reducer : error("Unsupported field count: " + n);
  return new cls(fields, ops, output2, stream);
}
function expand$1(oplist, stream) {
  const has2 = {};
  const ops = [];
  function add(name2, params = []) {
    const key2 = name2 + ":" + params;
    if (has2[key2]) return has2[key2];
    const def = getAggregate(name2);
    const op2 = def.create(...params);
    if (stream < 0 && def.stream) {
      def.stream.forEach((name3) => add(name3, []));
    }
    if (def.req) {
      def.req.forEach((name3) => add(name3, []));
    }
    has2[key2] = op2;
    ops.push(op2);
    return op2;
  }
  const output2 = oplist.map((item) => {
    const op2 = add(item.name, item.params);
    op2.output = item.id;
    return op2;
  });
  return { ops, output: output2 };
}
class FieldReducer extends Reducer {
  constructor(fields, ops, outputs, stream) {
    super(outputs);
    this._op = ops;
    this._fields = fields;
    this._stream = !!stream;
  }
  init() {
    const state = { count: 0, valid: 0, stream: this._stream };
    this._op.forEach((op2) => op2.init(state));
    if (state.values) {
      state.list = new ValueList();
    }
    return state;
  }
  write(state, values2, index2) {
    const op2 = this._outputs;
    const n = op2.length;
    for (let i = 0; i < n; ++i) {
      values2[op2[i].output][index2] = op2[i].value(state);
    }
    return 1;
  }
  _add() {
  }
  _rem() {
  }
  add(state) {
    ++state.count;
  }
  rem(state) {
    --state.count;
  }
}
class Field1Reducer extends FieldReducer {
  constructor(fields, ops, outputs, stream) {
    super(fields, ops, outputs, stream);
    const args = ["state", "v1", "v2"];
    this._add = update(ops, args, "add");
    this._rem = update(ops, args, "rem");
  }
  add(state, row, data2) {
    const value = this._fields[0](row, data2);
    ++state.count;
    if (isValid(value)) {
      ++state.valid;
      if (state.list) state.list.add(value);
      this._add(state, value);
    }
  }
  rem(state, row, data2) {
    const value = this._fields[0](row, data2);
    --state.count;
    if (isValid(value)) {
      --state.valid;
      if (state.list) state.list.rem();
      this._rem(state, value);
    }
  }
}
class Field2Reducer extends FieldReducer {
  constructor(fields, ops, outputs, stream) {
    super(fields, ops, outputs, stream);
    const args = ["state", "v1", "v2"];
    this._add = update(ops, args, "add");
    this._rem = update(ops, args, "rem");
  }
  add(state, row, data2) {
    const value1 = this._fields[0](row, data2);
    const value2 = this._fields[1](row, data2);
    ++state.count;
    if (isValid(value1) && isValid(value2)) {
      ++state.valid;
      if (state.list) state.list.add([value1, value2]);
      this._add(state, value1, value2);
    }
  }
  rem(state, row, data2) {
    const value1 = this._fields[0](row, data2);
    const value2 = this._fields[1](row, data2);
    --state.count;
    if (isValid(value1) && isValid(value2)) {
      --state.valid;
      if (state.list) state.list.rem();
      this._rem(state, value1, value2);
    }
  }
}
function aggregateGet(table, ops, get2) {
  if (ops.length) {
    const data2 = table.data();
    const { keys: keys2 } = table.groups() || {};
    const result = aggregate(table, ops);
    const op2 = keys2 ? (name2, row) => result[name2][keys2[row]] : (name2) => result[name2][0];
    get2 = get2.map((f) => (row) => f(row, data2, op2));
  }
  return get2;
}
function aggregate(table, ops, result) {
  if (!ops.length) return result;
  const aggrs = reducers(ops);
  const groups = table.groups();
  const size = groups ? groups.size : 1;
  result = result || repeat(ops.length, () => Array(size));
  if (size > 1) {
    aggrs.forEach((aggr) => {
      const cells = reduceGroups(table, aggr, groups);
      for (let i = 0; i < size; ++i) {
        aggr.write(cells[i], result, i);
      }
    });
  } else {
    aggrs.forEach((aggr) => {
      const cell = reduceFlat(table, aggr);
      aggr.write(cell, result, 0);
    });
  }
  return result;
}
function reducers(ops, stream) {
  const aggrs = [];
  const fields = {};
  for (const op2 of ops) {
    const key2 = op2.fields.map((f) => f + "").join(",");
    (fields[key2] || (fields[key2] = [])).push(op2);
  }
  for (const key2 in fields) {
    aggrs.push(fieldReducer(fields[key2], stream));
  }
  return aggrs;
}
function reduceFlat(table, reducer) {
  const cell = reducer.init();
  const data2 = table.data();
  const bits = table.mask();
  if (table.isOrdered()) {
    const idx = table.indices();
    const m = idx.length;
    for (let i = 0; i < m; ++i) {
      reducer.add(cell, idx[i], data2);
    }
  } else if (bits) {
    for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
      reducer.add(cell, i, data2);
    }
  } else {
    const n = table.totalRows();
    for (let i = 0; i < n; ++i) {
      reducer.add(cell, i, data2);
    }
  }
  return cell;
}
function reduceGroups(table, reducer, groups) {
  const { keys: keys2, size } = groups;
  const cells = repeat(size, () => reducer.init());
  const data2 = table.data();
  if (table.isOrdered()) {
    const idx = table.indices();
    const m = idx.length;
    for (let i = 0; i < m; ++i) {
      const row = idx[i];
      reducer.add(cells[keys2[row]], row, data2);
    }
  } else if (table.isFiltered()) {
    const bits = table.mask();
    for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
      reducer.add(cells[keys2[i]], i, data2);
    }
  } else {
    const n = table.totalRows();
    for (let i = 0; i < n; ++i) {
      reducer.add(cells[keys2[i]], i, data2);
    }
  }
  return cells;
}
function groupOutput(cols, groups) {
  const { get: get2, names: names2, rows, size } = groups;
  const m = names2.length;
  for (let j = 0; j < m; ++j) {
    const col = cols.add(names2[j], Array(size));
    const val = get2[j];
    for (let i = 0; i < size; ++i) {
      col[i] = val(rows[i]);
    }
  }
}
function entries(value) {
  return isArray$2(value) ? value : isMap(value) ? value.entries() : value ? Object.entries(value) : [];
}
const ArrayPattern = "ArrayPattern";
const ArrowFunctionExpression = "ArrowFunctionExpression";
const FunctionExpression = "FunctionExpression";
const Identifier = "Identifier";
const Literal = "Literal";
const MemberExpression = "MemberExpression";
const ObjectExpression = "ObjectExpression";
const ObjectPattern = "ObjectPattern";
const Property = "Property";
const Column$1 = "Column";
const Constant = "Constant";
const Dictionary = "Dictionary";
const Function$1 = "Function";
const Parameter = "Parameter";
const Op2 = "Op";
function walk(node, ctx, visitors2, parent) {
  const visit2 = visitors2[node.type] || visitors2["Default"];
  if (visit2 && visit2(node, ctx, parent) === false) return;
  const walker = walkers[node.type];
  if (walker) walker(node, ctx, visitors2);
}
const unary = (node, ctx, visitors2) => {
  walk(node.argument, ctx, visitors2, node);
};
const binary$1 = (node, ctx, visitors2) => {
  walk(node.left, ctx, visitors2, node);
  walk(node.right, ctx, visitors2, node);
};
const ternary = (node, ctx, visitors2) => {
  walk(node.test, ctx, visitors2, node);
  walk(node.consequent, ctx, visitors2, node);
  if (node.alternate) walk(node.alternate, ctx, visitors2, node);
};
const func$1 = (node, ctx, visitors2) => {
  list$3(node.params, ctx, visitors2, node);
  walk(node.body, ctx, visitors2, node);
};
const call$1 = (node, ctx, visitors2) => {
  walk(node.callee, ctx, visitors2, node);
  list$3(node.arguments, ctx, visitors2, node);
};
const list$3 = (nodes, ctx, visitors2, node) => {
  nodes.forEach((item) => walk(item, ctx, visitors2, node));
};
const walkers = {
  TemplateLiteral: (node, ctx, visitors2) => {
    list$3(node.expressions, ctx, visitors2, node);
    list$3(node.quasis, ctx, visitors2, node);
  },
  MemberExpression: (node, ctx, visitors2) => {
    walk(node.object, ctx, visitors2, node);
    walk(node.property, ctx, visitors2, node);
  },
  CallExpression: call$1,
  NewExpression: call$1,
  ArrayExpression: (node, ctx, visitors2) => {
    list$3(node.elements, ctx, visitors2, node);
  },
  AssignmentExpression: binary$1,
  AwaitExpression: unary,
  BinaryExpression: binary$1,
  LogicalExpression: binary$1,
  UnaryExpression: unary,
  UpdateExpression: unary,
  ConditionalExpression: ternary,
  ObjectExpression: (node, ctx, visitors2) => {
    list$3(node.properties, ctx, visitors2, node);
  },
  Property: (node, ctx, visitors2) => {
    walk(node.key, ctx, visitors2, node);
    walk(node.value, ctx, visitors2, node);
  },
  ArrowFunctionExpression: func$1,
  FunctionExpression: func$1,
  FunctionDeclaration: func$1,
  VariableDeclaration: (node, ctx, visitors2) => {
    list$3(node.declarations, ctx, visitors2, node);
  },
  VariableDeclarator: (node, ctx, visitors2) => {
    walk(node.id, ctx, visitors2, node);
    walk(node.init, ctx, visitors2, node);
  },
  SpreadElement: (node, ctx, visitors2) => {
    walk(node.argument, ctx, visitors2, node);
  },
  BlockStatement: (node, ctx, visitors2) => {
    list$3(node.body, ctx, visitors2, node);
  },
  ExpressionStatement: (node, ctx, visitors2) => {
    walk(node.expression, ctx, visitors2, node);
  },
  IfStatement: ternary,
  ForStatement: (node, ctx, visitors2) => {
    walk(node.init, ctx, visitors2, node);
    walk(node.test, ctx, visitors2, node);
    walk(node.update, ctx, visitors2, node);
    walk(node.body, ctx, visitors2, node);
  },
  WhileStatement: (node, ctx, visitors2) => {
    walk(node.test, ctx, visitors2, node);
    walk(node.body, ctx, visitors2, node);
  },
  DoWhileStatement: (node, ctx, visitors2) => {
    walk(node.body, ctx, visitors2, node);
    walk(node.test, ctx, visitors2, node);
  },
  SwitchStatement: (node, ctx, visitors2) => {
    walk(node.discriminant, ctx, visitors2, node);
    list$3(node.cases, ctx, visitors2, node);
  },
  SwitchCase: (node, ctx, visitors2) => {
    if (node.test) walk(node.test, ctx, visitors2, node);
    list$3(node.consequent, ctx, visitors2, node);
  },
  ReturnStatement: unary,
  Program: (node, ctx, visitors2) => {
    walk(node.body[0], ctx, visitors2, node);
  }
};
function strip(node) {
  delete node.start;
  delete node.end;
  delete node.optional;
}
function stripMember(node) {
  strip(node);
  delete node.object;
  delete node.property;
  delete node.computed;
  if (!node.table) delete node.table;
}
function clean(ast) {
  walk(ast, null, {
    Column: stripMember,
    Constant: stripMember,
    Default: strip
  });
  return ast;
}
function is(type, node) {
  return node && node.type === type;
}
function isFunctionExpression(node) {
  return is(FunctionExpression, node) || is(ArrowFunctionExpression, node);
}
const visit$1 = (node, opt2) => {
  const f = visitors$1[node.type];
  return f ? f(node, opt2) : error(`Unsupported expression construct: ${node.type}`);
};
const binary = (node, opt2) => {
  return "(" + visit$1(node.left, opt2) + " " + node.operator + " " + visit$1(node.right, opt2) + ")";
};
const func = (node, opt2) => {
  return "(" + list$2(node.params, opt2) + ")=>" + visit$1(node.body, opt2);
};
const call = (node, opt2) => {
  return visit$1(node.callee, opt2) + "(" + list$2(node.arguments, opt2) + ")";
};
const list$2 = (array2, opt2, delim = ",") => {
  return array2.map((node) => visit$1(node, opt2)).join(delim);
};
const name = (node) => node.computed ? `[${toString$1(node.name)}]` : `.${node.name}`;
const ref$1 = (node, opt2, method) => {
  const table = node.table || "";
  return `data${table}${name(node)}.${method}(${opt2.index}${table})`;
};
const get$1 = (node, opt2) => {
  const table = node.table || "";
  return `data${table}${name(node)}[${opt2.index}${table}]`;
};
const visitors$1 = {
  Constant: (node) => node.raw,
  Column: (node, opt2) => node.array ? get$1(node, opt2) : ref$1(node, opt2, "at"),
  Dictionary: (node, opt2) => ref$1(node, opt2, "key"),
  Function: (node) => `fn.${node.name}`,
  Parameter: (node) => `$${name(node)}`,
  Op: (node, opt2) => `op(${toString$1(node.name)},${opt2.op || opt2.index})`,
  Literal: (node) => node.raw,
  Identifier: (node) => node.name,
  TemplateLiteral: (node, opt2) => {
    const { quasis, expressions } = node;
    const n = expressions.length;
    let t2 = quasis[0].value.raw;
    for (let i = 0; i < n; ) {
      t2 += "${" + visit$1(expressions[i], opt2) + "}" + quasis[++i].value.raw;
    }
    return "`" + t2 + "`";
  },
  MemberExpression: (node, opt2) => {
    const d = !node.computed;
    const o = visit$1(node.object, opt2);
    const p = visit$1(node.property, opt2);
    return o + (d ? "." + p : "[" + p + "]");
  },
  CallExpression: call,
  NewExpression: (node, opt2) => {
    return "new " + call(node, opt2);
  },
  ArrayExpression: (node, opt2) => {
    return "[" + list$2(node.elements, opt2) + "]";
  },
  AssignmentExpression: binary,
  BinaryExpression: binary,
  LogicalExpression: binary,
  UnaryExpression: (node, opt2) => {
    return "(" + node.operator + visit$1(node.argument, opt2) + ")";
  },
  ConditionalExpression: (node, opt2) => {
    return "(" + visit$1(node.test, opt2) + "?" + visit$1(node.consequent, opt2) + ":" + visit$1(node.alternate, opt2) + ")";
  },
  ObjectExpression: (node, opt2) => {
    return "({" + list$2(node.properties, opt2) + "})";
  },
  Property: (node, opt2) => {
    const key2 = visit$1(node.key, opt2);
    return (node.computed ? `[${key2}]` : key2) + ":" + visit$1(node.value, opt2);
  },
  ArrowFunctionExpression: func,
  FunctionExpression: func,
  FunctionDeclaration: func,
  ArrayPattern: (node, opt2) => {
    return "[" + list$2(node.elements, opt2) + "]";
  },
  ObjectPattern: (node, opt2) => {
    return "{" + list$2(node.properties, opt2) + "}";
  },
  VariableDeclaration: (node, opt2) => {
    return node.kind + " " + list$2(node.declarations, opt2, ",");
  },
  VariableDeclarator: (node, opt2) => {
    return visit$1(node.id, opt2) + "=" + visit$1(node.init, opt2);
  },
  SpreadElement: (node, opt2) => {
    return "..." + visit$1(node.argument, opt2);
  },
  BlockStatement: (node, opt2) => {
    return "{" + list$2(node.body, opt2, ";") + ";}";
  },
  BreakStatement: () => {
    return "break";
  },
  ExpressionStatement: (node, opt2) => {
    return visit$1(node.expression, opt2);
  },
  IfStatement: (node, opt2) => {
    return "if (" + visit$1(node.test, opt2) + ")" + visit$1(node.consequent, opt2) + (node.alternate ? " else " + visit$1(node.alternate, opt2) : "");
  },
  SwitchStatement: (node, opt2) => {
    return "switch (" + visit$1(node.discriminant, opt2) + ") {" + list$2(node.cases, opt2, "") + "}";
  },
  SwitchCase: (node, opt2) => {
    return (node.test ? "case " + visit$1(node.test, opt2) : "default") + ": " + list$2(node.consequent, opt2, ";") + ";";
  },
  ReturnStatement: (node, opt2) => {
    return "return " + visit$1(node.argument, opt2);
  },
  Program: (node, opt2) => visit$1(node.body[0], opt2)
};
function codegen(node, opt2 = { index: "row" }) {
  return visit$1(node, opt2);
}
function _compile(code, fn, params) {
  code = `"use strict"; return ${code};`;
  return Function("fn", "$", code)(fn, params);
}
const compile = {
  escape: (code, func2, params) => _compile(code, func2, params),
  expr: (code, params) => _compile(`(row,data,op)=>${code}`, functions, params),
  expr2: (code, params) => _compile(`(row0,data0,row,data)=>${code}`, functions, params),
  join: (code, params) => _compile(`(row1,data1,row2,data2)=>${code}`, functions, params),
  param: (code, params) => _compile(code, functions, params)
};
const dictOps = {
  "==": 1,
  "!=": 1,
  "===": 1,
  "!==": 1
};
function rewrite(ref2, name2, index2 = 0, col = void 0, op2 = void 0) {
  ref2.type = Column$1;
  ref2.name = name2;
  ref2.table = index2;
  if (isArrayType(col)) {
    ref2.array = true;
  }
  if (op2 && col && isFunction$1(col.keyFor)) {
    const lit = dictOps[op2.operator] ? op2.left === ref2 ? op2.right : op2.left : op2.callee && op2.callee.name === "equal" ? op2.arguments[op2.arguments[0] === ref2 ? 1 : 0] : null;
    if (lit && lit.type === Literal) {
      rewriteDictionary(op2, ref2, lit, col.keyFor(lit.value));
    }
  }
  return ref2;
}
function rewriteDictionary(op2, ref2, lit, key2) {
  if (key2 < 0) {
    op2.type = Literal;
    op2.value = false;
    op2.raw = "false";
  } else {
    ref2.type = Dictionary;
    lit.value = key2;
    lit.raw = key2 + "";
  }
  return true;
}
const ROW_OBJECT = "row_object";
function rowObjectExpression(node, table, props = table.columnNames()) {
  node.type = ObjectExpression;
  const p = node.properties = [];
  for (const prop of entries(props)) {
    const [name2, key2] = isArray$2(prop) ? prop : [prop, prop];
    p.push({
      type: Property,
      key: { type: Literal, raw: toString$1(key2) },
      value: rewrite({ computed: true }, name2, 0, table.column(name2))
    });
  }
  return node;
}
function rowObjectCode(table, props) {
  return codegen(rowObjectExpression({}, table, props));
}
function rowObjectBuilder(table, props) {
  return compile.expr(rowObjectCode(table, props));
}
function toFunction(value) {
  return isFunction$1(value) ? value : () => value;
}
const ERROR_ESC_AGGRONLY = "Escaped functions are not valid as rollup or pivot values.";
function parseEscape(ctx, spec, params) {
  if (ctx.aggronly) error(ERROR_ESC_AGGRONLY);
  const code = `(row,data)=>fn(${rowObjectCode(ctx.table)},$)`;
  return { escape: compile.escape(code, toFunction(spec.expr), params) };
}
var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 7, 9, 32, 4, 318, 1, 78, 5, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 68, 8, 2, 0, 3, 0, 2, 3, 2, 4, 2, 0, 15, 1, 83, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 7, 19, 58, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 199, 7, 137, 9, 54, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 55, 9, 266, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 10, 5350, 0, 7, 14, 11465, 27, 2343, 9, 87, 9, 39, 4, 60, 6, 26, 9, 535, 9, 470, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4178, 9, 519, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 245, 1, 2, 9, 233, 0, 3, 0, 8, 1, 6, 0, 475, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 4, 51, 13, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 7, 25, 39, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 39, 27, 10, 22, 251, 41, 7, 1, 17, 5, 57, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 31, 9, 2, 0, 3, 0, 2, 37, 2, 0, 26, 0, 2, 0, 45, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 200, 32, 32, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 24, 43, 261, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 26, 3994, 6, 582, 6842, 29, 1763, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 433, 44, 212, 63, 33, 24, 3, 24, 45, 74, 6, 0, 67, 12, 65, 1, 2, 0, 15, 4, 10, 7381, 42, 31, 98, 114, 8702, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 229, 29, 3, 0, 208, 30, 2, 2, 2, 1, 2, 6, 3, 4, 10, 1, 225, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4381, 3, 5773, 3, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 8489];
var nonASCIIidentifierChars = "‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߽߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࢗ-࢟࣊-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯৾ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ૺ-૿ଁ-ଃ଼ା-ୄେୈୋ-୍୕-ୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఄ఼ా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ೳഀ-ഃ഻഼ാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ඁ-ඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ຼ່-໎໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜕ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠏-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᪿ-᫝᫠-᫫ᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭᳴᳷-᳹᷀-᷿‌‍‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯・꘠-꘩꙯ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧ꠬ꢀꢁꢴ-ꣅ꣐-꣙꣠-꣱ꣿ-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︯︳︴﹍-﹏０-９＿･";
var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-࢏ࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱৼਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚ౜ౝౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ೜-ೞೠೡೱೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄຆ-ຊຌ-ຣລວ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
var reservedWords = {
  3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
  5: "class enum extends super const export import",
  6: "enum",
  strict: "implements interface let package private protected public static yield",
  strictBind: "eval arguments"
};
var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";
var keywords$1 = {
  5: ecma5AndLessKeywords,
  "5module": ecma5AndLessKeywords + " export import",
  6: ecma5AndLessKeywords + " const class extends export import super"
};
var keywordRelationalOperator = /^in(stanceof)?$/;
var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
function isInAstralSet(code, set) {
  var pos = 65536;
  for (var i = 0; i < set.length; i += 2) {
    pos += set[i];
    if (pos > code) {
      return false;
    }
    pos += set[i + 1];
    if (pos >= code) {
      return true;
    }
  }
  return false;
}
function isIdentifierStart(code, astral) {
  if (code < 65) {
    return code === 36;
  }
  if (code < 91) {
    return true;
  }
  if (code < 97) {
    return code === 95;
  }
  if (code < 123) {
    return true;
  }
  if (code <= 65535) {
    return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
  }
  if (astral === false) {
    return false;
  }
  return isInAstralSet(code, astralIdentifierStartCodes);
}
function isIdentifierChar(code, astral) {
  if (code < 48) {
    return code === 36;
  }
  if (code < 58) {
    return true;
  }
  if (code < 65) {
    return false;
  }
  if (code < 91) {
    return true;
  }
  if (code < 97) {
    return code === 95;
  }
  if (code < 123) {
    return true;
  }
  if (code <= 65535) {
    return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
  }
  if (astral === false) {
    return false;
  }
  return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
}
var TokenType = function TokenType2(label, conf) {
  if (conf === void 0) conf = {};
  this.label = label;
  this.keyword = conf.keyword;
  this.beforeExpr = !!conf.beforeExpr;
  this.startsExpr = !!conf.startsExpr;
  this.isLoop = !!conf.isLoop;
  this.isAssign = !!conf.isAssign;
  this.prefix = !!conf.prefix;
  this.postfix = !!conf.postfix;
  this.binop = conf.binop || null;
  this.updateContext = null;
};
function binop(name2, prec) {
  return new TokenType(name2, { beforeExpr: true, binop: prec });
}
var beforeExpr = { beforeExpr: true }, startsExpr = { startsExpr: true };
var keywords = {};
function kw(name2, options) {
  if (options === void 0) options = {};
  options.keyword = name2;
  return keywords[name2] = new TokenType(name2, options);
}
var types$1 = {
  num: new TokenType("num", startsExpr),
  regexp: new TokenType("regexp", startsExpr),
  string: new TokenType("string", startsExpr),
  name: new TokenType("name", startsExpr),
  privateId: new TokenType("privateId", startsExpr),
  eof: new TokenType("eof"),
  // Punctuation token types.
  bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
  parenR: new TokenType(")"),
  comma: new TokenType(",", beforeExpr),
  semi: new TokenType(";", beforeExpr),
  colon: new TokenType(":", beforeExpr),
  dot: new TokenType("."),
  question: new TokenType("?", beforeExpr),
  questionDot: new TokenType("?."),
  arrow: new TokenType("=>", beforeExpr),
  template: new TokenType("template"),
  invalidTemplate: new TokenType("invalidTemplate"),
  ellipsis: new TokenType("...", beforeExpr),
  backQuote: new TokenType("`", startsExpr),
  dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),
  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator.
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.
  eq: new TokenType("=", { beforeExpr: true, isAssign: true }),
  assign: new TokenType("_=", { beforeExpr: true, isAssign: true }),
  incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
  prefix: new TokenType("!/~", { beforeExpr: true, prefix: true, startsExpr: true }),
  logicalOR: binop("||", 1),
  logicalAND: binop("&&", 2),
  bitwiseOR: binop("|", 3),
  bitwiseXOR: binop("^", 4),
  bitwiseAND: binop("&", 5),
  equality: binop("==/!=/===/!==", 6),
  relational: binop("</>/<=/>=", 7),
  bitShift: binop("<</>>/>>>", 8),
  plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
  modulo: binop("%", 10),
  star: binop("*", 10),
  slash: binop("/", 10),
  starstar: new TokenType("**", { beforeExpr: true }),
  coalesce: binop("??", 1),
  // Keyword token types.
  _break: kw("break"),
  _case: kw("case", beforeExpr),
  _catch: kw("catch"),
  _continue: kw("continue"),
  _debugger: kw("debugger"),
  _default: kw("default", beforeExpr),
  _do: kw("do", { isLoop: true, beforeExpr: true }),
  _else: kw("else", beforeExpr),
  _finally: kw("finally"),
  _for: kw("for", { isLoop: true }),
  _function: kw("function", startsExpr),
  _if: kw("if"),
  _return: kw("return", beforeExpr),
  _switch: kw("switch"),
  _throw: kw("throw", beforeExpr),
  _try: kw("try"),
  _var: kw("var"),
  _const: kw("const"),
  _while: kw("while", { isLoop: true }),
  _with: kw("with"),
  _new: kw("new", { beforeExpr: true, startsExpr: true }),
  _this: kw("this", startsExpr),
  _super: kw("super", startsExpr),
  _class: kw("class", startsExpr),
  _extends: kw("extends", beforeExpr),
  _export: kw("export"),
  _import: kw("import", startsExpr),
  _null: kw("null", startsExpr),
  _true: kw("true", startsExpr),
  _false: kw("false", startsExpr),
  _in: kw("in", { beforeExpr: true, binop: 7 }),
  _instanceof: kw("instanceof", { beforeExpr: true, binop: 7 }),
  _typeof: kw("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
  _void: kw("void", { beforeExpr: true, prefix: true, startsExpr: true }),
  _delete: kw("delete", { beforeExpr: true, prefix: true, startsExpr: true })
};
var lineBreak = /\r\n?|\n|\u2028|\u2029/;
var lineBreakG = new RegExp(lineBreak.source, "g");
function isNewLine(code) {
  return code === 10 || code === 13 || code === 8232 || code === 8233;
}
function nextLineBreak(code, from2, end) {
  if (end === void 0) end = code.length;
  for (var i = from2; i < end; i++) {
    var next = code.charCodeAt(i);
    if (isNewLine(next)) {
      return i < end - 1 && next === 13 && code.charCodeAt(i + 1) === 10 ? i + 2 : i + 1;
    }
  }
  return -1;
}
var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;
var ref = Object.prototype;
var hasOwnProperty$1 = ref.hasOwnProperty;
var toString = ref.toString;
var hasOwn = Object.hasOwn || (function(obj, propName) {
  return hasOwnProperty$1.call(obj, propName);
});
var isArray$1 = Array.isArray || (function(obj) {
  return toString.call(obj) === "[object Array]";
});
var regexpCache = /* @__PURE__ */ Object.create(null);
function wordsRegexp(words) {
  return regexpCache[words] || (regexpCache[words] = new RegExp("^(?:" + words.replace(/ /g, "|") + ")$"));
}
function codePointToString(code) {
  if (code <= 65535) {
    return String.fromCharCode(code);
  }
  code -= 65536;
  return String.fromCharCode((code >> 10) + 55296, (code & 1023) + 56320);
}
var loneSurrogate = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;
var Position = function Position2(line, col) {
  this.line = line;
  this.column = col;
};
Position.prototype.offset = function offset(n) {
  return new Position(this.line, this.column + n);
};
var SourceLocation = function SourceLocation2(p, start, end) {
  this.start = start;
  this.end = end;
  if (p.sourceFile !== null) {
    this.source = p.sourceFile;
  }
};
function getLineInfo(input, offset2) {
  for (var line = 1, cur = 0; ; ) {
    var nextBreak = nextLineBreak(input, cur, offset2);
    if (nextBreak < 0) {
      return new Position(line, offset2 - cur);
    }
    ++line;
    cur = nextBreak;
  }
}
var defaultOptions = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must be
  // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
  // (2019), 11 (2020), 12 (2021), 13 (2022), 14 (2023), or `"latest"`
  // (the latest version the library supports). This influences
  // support for strict mode, the set of reserved words, and support
  // for new syntax features.
  ecmaVersion: null,
  // `sourceType` indicates the mode the code should be parsed in.
  // Can be either `"script"`, `"module"` or `"commonjs"`. This influences global
  // strict mode and parsing of `import` and `export` declarations.
  sourceType: "script",
  // `onInsertedSemicolon` can be a callback that will be called when
  // a semicolon is automatically inserted. It will be passed the
  // position of the inserted semicolon as an offset, and if
  // `locations` is enabled, it is given the location as a `{line,
  // column}` object as second argument.
  onInsertedSemicolon: null,
  // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
  // trailing commas.
  onTrailingComma: null,
  // By default, reserved words are only enforced if ecmaVersion >= 5.
  // Set `allowReserved` to a boolean value to explicitly turn this on
  // an off. When this option has the value "never", reserved words
  // and keywords can also not be used as property names.
  allowReserved: null,
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When enabled, import/export statements are not constrained to
  // appearing at the top of the program, and an import.meta expression
  // in a script isn't considered an error.
  allowImportExportEverywhere: false,
  // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
  // When enabled, await identifiers are allowed to appear at the top-level scope,
  // but they are still not allowed in non-async functions.
  allowAwaitOutsideFunction: null,
  // When enabled, super identifiers are not constrained to
  // appearing in methods and do not raise an error when they appear elsewhere.
  allowSuperOutsideMethod: null,
  // When enabled, hashbang directive in the beginning of file is
  // allowed and treated as a line comment. Enabled by default when
  // `ecmaVersion` >= 2023.
  allowHashBang: false,
  // By default, the parser will verify that private properties are
  // only used in places where they are valid and have been declared.
  // Set this to false to turn such checks off.
  checkPrivateFields: true,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokens returned from `tokenizer().getToken()`. Note
  // that you are not allowed to call the parser from the
  // callback—that will corrupt its internal state.
  onToken: null,
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  // When this option has an array as value, objects representing the
  // comments are pushed to it.
  onComment: null,
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: false,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: null,
  // When enabled, parenthesized expressions are represented by
  // (non-standard) ParenthesizedExpression nodes
  preserveParens: false
};
var warnedAboutEcmaVersion = false;
function getOptions(opts) {
  var options = {};
  for (var opt2 in defaultOptions) {
    options[opt2] = opts && hasOwn(opts, opt2) ? opts[opt2] : defaultOptions[opt2];
  }
  if (options.ecmaVersion === "latest") {
    options.ecmaVersion = 1e8;
  } else if (options.ecmaVersion == null) {
    if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
      warnedAboutEcmaVersion = true;
      console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
    }
    options.ecmaVersion = 11;
  } else if (options.ecmaVersion >= 2015) {
    options.ecmaVersion -= 2009;
  }
  if (options.allowReserved == null) {
    options.allowReserved = options.ecmaVersion < 5;
  }
  if (!opts || opts.allowHashBang == null) {
    options.allowHashBang = options.ecmaVersion >= 14;
  }
  if (isArray$1(options.onToken)) {
    var tokens = options.onToken;
    options.onToken = function(token) {
      return tokens.push(token);
    };
  }
  if (isArray$1(options.onComment)) {
    options.onComment = pushComment(options, options.onComment);
  }
  if (options.sourceType === "commonjs" && options.allowAwaitOutsideFunction) {
    throw new Error("Cannot use allowAwaitOutsideFunction with sourceType: commonjs");
  }
  return options;
}
function pushComment(options, array2) {
  return function(block, text, start, end, startLoc, endLoc) {
    var comment = {
      type: block ? "Block" : "Line",
      value: text,
      start,
      end
    };
    if (options.locations) {
      comment.loc = new SourceLocation(this, startLoc, endLoc);
    }
    if (options.ranges) {
      comment.range = [start, end];
    }
    array2.push(comment);
  };
}
var SCOPE_TOP = 1, SCOPE_FUNCTION = 2, SCOPE_ASYNC = 4, SCOPE_GENERATOR = 8, SCOPE_ARROW = 16, SCOPE_SIMPLE_CATCH = 32, SCOPE_SUPER = 64, SCOPE_DIRECT_SUPER = 128, SCOPE_CLASS_STATIC_BLOCK = 256, SCOPE_CLASS_FIELD_INIT = 512, SCOPE_SWITCH = 1024, SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK;
function functionFlags(async, generator) {
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
}
var BIND_NONE = 0, BIND_VAR = 1, BIND_LEXICAL = 2, BIND_FUNCTION = 3, BIND_SIMPLE_CATCH = 4, BIND_OUTSIDE = 5;
var Parser = function Parser2(options, input, startPos) {
  this.options = options = getOptions(options);
  this.sourceFile = options.sourceFile;
  this.keywords = wordsRegexp(keywords$1[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
  var reserved = "";
  if (options.allowReserved !== true) {
    reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
    if (options.sourceType === "module") {
      reserved += " await";
    }
  }
  this.reservedWords = wordsRegexp(reserved);
  var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
  this.reservedWordsStrict = wordsRegexp(reservedStrict);
  this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
  this.input = String(input);
  this.containsEsc = false;
  if (startPos) {
    this.pos = startPos;
    this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
    this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
  } else {
    this.pos = this.lineStart = 0;
    this.curLine = 1;
  }
  this.type = types$1.eof;
  this.value = null;
  this.start = this.end = this.pos;
  this.startLoc = this.endLoc = this.curPosition();
  this.lastTokEndLoc = this.lastTokStartLoc = null;
  this.lastTokStart = this.lastTokEnd = this.pos;
  this.context = this.initialContext();
  this.exprAllowed = true;
  this.inModule = options.sourceType === "module";
  this.strict = this.inModule || this.strictDirective(this.pos);
  this.potentialArrowAt = -1;
  this.potentialArrowInForAwait = false;
  this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
  this.labels = [];
  this.undefinedExports = /* @__PURE__ */ Object.create(null);
  if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!") {
    this.skipLineComment(2);
  }
  this.scopeStack = [];
  this.enterScope(
    this.options.sourceType === "commonjs" ? SCOPE_FUNCTION : SCOPE_TOP
  );
  this.regexpState = null;
  this.privateNameStack = [];
};
var prototypeAccessors = { inFunction: { configurable: true }, inGenerator: { configurable: true }, inAsync: { configurable: true }, canAwait: { configurable: true }, allowReturn: { configurable: true }, allowSuper: { configurable: true }, allowDirectSuper: { configurable: true }, treatFunctionsAsVar: { configurable: true }, allowNewDotTarget: { configurable: true }, allowUsing: { configurable: true }, inClassStaticBlock: { configurable: true } };
Parser.prototype.parse = function parse() {
  var node = this.options.program || this.startNode();
  this.nextToken();
  return this.parseTopLevel(node);
};
prototypeAccessors.inFunction.get = function() {
  return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0;
};
prototypeAccessors.inGenerator.get = function() {
  return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0;
};
prototypeAccessors.inAsync.get = function() {
  return (this.currentVarScope().flags & SCOPE_ASYNC) > 0;
};
prototypeAccessors.canAwait.get = function() {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref2 = this.scopeStack[i];
    var flags = ref2.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT)) {
      return false;
    }
    if (flags & SCOPE_FUNCTION) {
      return (flags & SCOPE_ASYNC) > 0;
    }
  }
  return this.inModule && this.options.ecmaVersion >= 13 || this.options.allowAwaitOutsideFunction;
};
prototypeAccessors.allowReturn.get = function() {
  if (this.inFunction) {
    return true;
  }
  if (this.options.allowReturnOutsideFunction && this.currentVarScope().flags & SCOPE_TOP) {
    return true;
  }
  return false;
};
prototypeAccessors.allowSuper.get = function() {
  var ref2 = this.currentThisScope();
  var flags = ref2.flags;
  return (flags & SCOPE_SUPER) > 0 || this.options.allowSuperOutsideMethod;
};
prototypeAccessors.allowDirectSuper.get = function() {
  return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0;
};
prototypeAccessors.treatFunctionsAsVar.get = function() {
  return this.treatFunctionsAsVarInScope(this.currentScope());
};
prototypeAccessors.allowNewDotTarget.get = function() {
  for (var i = this.scopeStack.length - 1; i >= 0; i--) {
    var ref2 = this.scopeStack[i];
    var flags = ref2.flags;
    if (flags & (SCOPE_CLASS_STATIC_BLOCK | SCOPE_CLASS_FIELD_INIT) || flags & SCOPE_FUNCTION && !(flags & SCOPE_ARROW)) {
      return true;
    }
  }
  return false;
};
prototypeAccessors.allowUsing.get = function() {
  var ref2 = this.currentScope();
  var flags = ref2.flags;
  if (flags & SCOPE_SWITCH) {
    return false;
  }
  if (!this.inModule && flags & SCOPE_TOP) {
    return false;
  }
  return true;
};
prototypeAccessors.inClassStaticBlock.get = function() {
  return (this.currentVarScope().flags & SCOPE_CLASS_STATIC_BLOCK) > 0;
};
Parser.extend = function extend() {
  var plugins = [], len = arguments.length;
  while (len--) plugins[len] = arguments[len];
  var cls = this;
  for (var i = 0; i < plugins.length; i++) {
    cls = plugins[i](cls);
  }
  return cls;
};
Parser.parse = function parse2(input, options) {
  return new this(options, input).parse();
};
Parser.parseExpressionAt = function parseExpressionAt(input, pos, options) {
  var parser = new this(options, input, pos);
  parser.nextToken();
  return parser.parseExpression();
};
Parser.tokenizer = function tokenizer(input, options) {
  return new this(options, input);
};
Object.defineProperties(Parser.prototype, prototypeAccessors);
var pp$9 = Parser.prototype;
var literal$1 = /^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;
pp$9.strictDirective = function(start) {
  if (this.options.ecmaVersion < 5) {
    return false;
  }
  for (; ; ) {
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    var match2 = literal$1.exec(this.input.slice(start));
    if (!match2) {
      return false;
    }
    if ((match2[1] || match2[2]) === "use strict") {
      skipWhiteSpace.lastIndex = start + match2[0].length;
      var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
      var next = this.input.charAt(end);
      return next === ";" || next === "}" || lineBreak.test(spaceAfter[0]) && !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "=");
    }
    start += match2[0].length;
    skipWhiteSpace.lastIndex = start;
    start += skipWhiteSpace.exec(this.input)[0].length;
    if (this.input[start] === ";") {
      start++;
    }
  }
};
pp$9.eat = function(type) {
  if (this.type === type) {
    this.next();
    return true;
  } else {
    return false;
  }
};
pp$9.isContextual = function(name2) {
  return this.type === types$1.name && this.value === name2 && !this.containsEsc;
};
pp$9.eatContextual = function(name2) {
  if (!this.isContextual(name2)) {
    return false;
  }
  this.next();
  return true;
};
pp$9.expectContextual = function(name2) {
  if (!this.eatContextual(name2)) {
    this.unexpected();
  }
};
pp$9.canInsertSemicolon = function() {
  return this.type === types$1.eof || this.type === types$1.braceR || lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};
pp$9.insertSemicolon = function() {
  if (this.canInsertSemicolon()) {
    if (this.options.onInsertedSemicolon) {
      this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
    }
    return true;
  }
};
pp$9.semicolon = function() {
  if (!this.eat(types$1.semi) && !this.insertSemicolon()) {
    this.unexpected();
  }
};
pp$9.afterTrailingComma = function(tokType, notNext) {
  if (this.type === tokType) {
    if (this.options.onTrailingComma) {
      this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
    }
    if (!notNext) {
      this.next();
    }
    return true;
  }
};
pp$9.expect = function(type) {
  this.eat(type) || this.unexpected();
};
pp$9.unexpected = function(pos) {
  this.raise(pos != null ? pos : this.start, "Unexpected token");
};
var DestructuringErrors = function DestructuringErrors2() {
  this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this.parenthesizedBind = this.doubleProto = -1;
};
pp$9.checkPatternErrors = function(refDestructuringErrors, isAssign) {
  if (!refDestructuringErrors) {
    return;
  }
  if (refDestructuringErrors.trailingComma > -1) {
    this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element");
  }
  var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
  if (parens > -1) {
    this.raiseRecoverable(parens, isAssign ? "Assigning to rvalue" : "Parenthesized pattern");
  }
};
pp$9.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
  if (!refDestructuringErrors) {
    return false;
  }
  var shorthandAssign = refDestructuringErrors.shorthandAssign;
  var doubleProto = refDestructuringErrors.doubleProto;
  if (!andThrow) {
    return shorthandAssign >= 0 || doubleProto >= 0;
  }
  if (shorthandAssign >= 0) {
    this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns");
  }
  if (doubleProto >= 0) {
    this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property");
  }
};
pp$9.checkYieldAwaitInDefaultParams = function() {
  if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos)) {
    this.raise(this.yieldPos, "Yield expression cannot be a default value");
  }
  if (this.awaitPos) {
    this.raise(this.awaitPos, "Await expression cannot be a default value");
  }
};
pp$9.isSimpleAssignTarget = function(expr) {
  if (expr.type === "ParenthesizedExpression") {
    return this.isSimpleAssignTarget(expr.expression);
  }
  return expr.type === "Identifier" || expr.type === "MemberExpression";
};
var pp$8 = Parser.prototype;
pp$8.parseTopLevel = function(node) {
  var exports$1 = /* @__PURE__ */ Object.create(null);
  if (!node.body) {
    node.body = [];
  }
  while (this.type !== types$1.eof) {
    var stmt = this.parseStatement(null, true, exports$1);
    node.body.push(stmt);
  }
  if (this.inModule) {
    for (var i = 0, list2 = Object.keys(this.undefinedExports); i < list2.length; i += 1) {
      var name2 = list2[i];
      this.raiseRecoverable(this.undefinedExports[name2].start, "Export '" + name2 + "' is not defined");
    }
  }
  this.adaptDirectivePrologue(node.body);
  this.next();
  node.sourceType = this.options.sourceType === "commonjs" ? "script" : this.options.sourceType;
  return this.finishNode(node, "Program");
};
var loopLabel = { kind: "loop" }, switchLabel = { kind: "switch" };
pp$8.isLet = function(context2) {
  if (this.options.ecmaVersion < 6 || !this.isContextual("let")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, nextCh = this.fullCharCodeAt(next);
  if (nextCh === 91 || nextCh === 92) {
    return true;
  }
  if (context2) {
    return false;
  }
  if (nextCh === 123) {
    return true;
  }
  if (isIdentifierStart(nextCh)) {
    var start = next;
    do {
      next += nextCh <= 65535 ? 1 : 2;
    } while (isIdentifierChar(nextCh = this.fullCharCodeAt(next)));
    if (nextCh === 92) {
      return true;
    }
    var ident = this.input.slice(start, next);
    if (!keywordRelationalOperator.test(ident)) {
      return true;
    }
  }
  return false;
};
pp$8.isAsyncFunction = function() {
  if (this.options.ecmaVersion < 8 || !this.isContextual("async")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length, after;
  return !lineBreak.test(this.input.slice(this.pos, next)) && this.input.slice(next, next + 8) === "function" && (next + 8 === this.input.length || !(isIdentifierChar(after = this.fullCharCodeAt(next + 8)) || after === 92));
};
pp$8.isUsingKeyword = function(isAwaitUsing, isFor) {
  if (this.options.ecmaVersion < 17 || !this.isContextual(isAwaitUsing ? "await" : "using")) {
    return false;
  }
  skipWhiteSpace.lastIndex = this.pos;
  var skip = skipWhiteSpace.exec(this.input);
  var next = this.pos + skip[0].length;
  if (lineBreak.test(this.input.slice(this.pos, next))) {
    return false;
  }
  if (isAwaitUsing) {
    var usingEndPos = next + 5, after;
    if (this.input.slice(next, usingEndPos) !== "using" || usingEndPos === this.input.length || isIdentifierChar(after = this.fullCharCodeAt(usingEndPos)) || after === 92) {
      return false;
    }
    skipWhiteSpace.lastIndex = usingEndPos;
    var skipAfterUsing = skipWhiteSpace.exec(this.input);
    next = usingEndPos + skipAfterUsing[0].length;
    if (skipAfterUsing && lineBreak.test(this.input.slice(usingEndPos, next))) {
      return false;
    }
  }
  var ch = this.fullCharCodeAt(next);
  if (!isIdentifierStart(ch) && ch !== 92) {
    return false;
  }
  var idStart = next;
  do {
    next += ch <= 65535 ? 1 : 2;
  } while (isIdentifierChar(ch = this.fullCharCodeAt(next)));
  if (ch === 92) {
    return true;
  }
  var id = this.input.slice(idStart, next);
  if (keywordRelationalOperator.test(id) || isFor && id === "of") {
    return false;
  }
  return true;
};
pp$8.isAwaitUsing = function(isFor) {
  return this.isUsingKeyword(true, isFor);
};
pp$8.isUsing = function(isFor) {
  return this.isUsingKeyword(false, isFor);
};
pp$8.parseStatement = function(context2, topLevel, exports$1) {
  var starttype = this.type, node = this.startNode(), kind;
  if (this.isLet(context2)) {
    starttype = types$1._var;
    kind = "let";
  }
  switch (starttype) {
    case types$1._break:
    case types$1._continue:
      return this.parseBreakContinueStatement(node, starttype.keyword);
    case types$1._debugger:
      return this.parseDebuggerStatement(node);
    case types$1._do:
      return this.parseDoStatement(node);
    case types$1._for:
      return this.parseForStatement(node);
    case types$1._function:
      if (context2 && (this.strict || context2 !== "if" && context2 !== "label") && this.options.ecmaVersion >= 6) {
        this.unexpected();
      }
      return this.parseFunctionStatement(node, false, !context2);
    case types$1._class:
      if (context2) {
        this.unexpected();
      }
      return this.parseClass(node, true);
    case types$1._if:
      return this.parseIfStatement(node);
    case types$1._return:
      return this.parseReturnStatement(node);
    case types$1._switch:
      return this.parseSwitchStatement(node);
    case types$1._throw:
      return this.parseThrowStatement(node);
    case types$1._try:
      return this.parseTryStatement(node);
    case types$1._const:
    case types$1._var:
      kind = kind || this.value;
      if (context2 && kind !== "var") {
        this.unexpected();
      }
      return this.parseVarStatement(node, kind);
    case types$1._while:
      return this.parseWhileStatement(node);
    case types$1._with:
      return this.parseWithStatement(node);
    case types$1.braceL:
      return this.parseBlock(true, node);
    case types$1.semi:
      return this.parseEmptyStatement(node);
    case types$1._export:
    case types$1._import:
      if (this.options.ecmaVersion > 10 && starttype === types$1._import) {
        skipWhiteSpace.lastIndex = this.pos;
        var skip = skipWhiteSpace.exec(this.input);
        var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
        if (nextCh === 40 || nextCh === 46) {
          return this.parseExpressionStatement(node, this.parseExpression());
        }
      }
      if (!this.options.allowImportExportEverywhere) {
        if (!topLevel) {
          this.raise(this.start, "'import' and 'export' may only appear at the top level");
        }
        if (!this.inModule) {
          this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
        }
      }
      return starttype === types$1._import ? this.parseImport(node) : this.parseExport(node, exports$1);
    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
    default:
      if (this.isAsyncFunction()) {
        if (context2) {
          this.unexpected();
        }
        this.next();
        return this.parseFunctionStatement(node, true, !context2);
      }
      var usingKind = this.isAwaitUsing(false) ? "await using" : this.isUsing(false) ? "using" : null;
      if (usingKind) {
        if (!this.allowUsing) {
          this.raise(this.start, "Using declaration cannot appear in the top level when source type is `script` or in the bare case statement");
        }
        if (usingKind === "await using") {
          if (!this.canAwait) {
            this.raise(this.start, "Await using cannot appear outside of async function");
          }
          this.next();
        }
        this.next();
        this.parseVar(node, false, usingKind);
        this.semicolon();
        return this.finishNode(node, "VariableDeclaration");
      }
      var maybeName = this.value, expr = this.parseExpression();
      if (starttype === types$1.name && expr.type === "Identifier" && this.eat(types$1.colon)) {
        return this.parseLabeledStatement(node, maybeName, expr, context2);
      } else {
        return this.parseExpressionStatement(node, expr);
      }
  }
};
pp$8.parseBreakContinueStatement = function(node, keyword) {
  var isBreak = keyword === "break";
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) {
    node.label = null;
  } else if (this.type !== types$1.name) {
    this.unexpected();
  } else {
    node.label = this.parseIdent();
    this.semicolon();
  }
  var i = 0;
  for (; i < this.labels.length; ++i) {
    var lab = this.labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) {
        break;
      }
      if (node.label && isBreak) {
        break;
      }
    }
  }
  if (i === this.labels.length) {
    this.raise(node.start, "Unsyntactic " + keyword);
  }
  return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
};
pp$8.parseDebuggerStatement = function(node) {
  this.next();
  this.semicolon();
  return this.finishNode(node, "DebuggerStatement");
};
pp$8.parseDoStatement = function(node) {
  this.next();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("do");
  this.labels.pop();
  this.expect(types$1._while);
  node.test = this.parseParenExpression();
  if (this.options.ecmaVersion >= 6) {
    this.eat(types$1.semi);
  } else {
    this.semicolon();
  }
  return this.finishNode(node, "DoWhileStatement");
};
pp$8.parseForStatement = function(node) {
  this.next();
  var awaitAt = this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await") ? this.lastTokStart : -1;
  this.labels.push(loopLabel);
  this.enterScope(0);
  this.expect(types$1.parenL);
  if (this.type === types$1.semi) {
    if (awaitAt > -1) {
      this.unexpected(awaitAt);
    }
    return this.parseFor(node, null);
  }
  var isLet = this.isLet();
  if (this.type === types$1._var || this.type === types$1._const || isLet) {
    var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
    this.next();
    this.parseVar(init$1, true, kind);
    this.finishNode(init$1, "VariableDeclaration");
    return this.parseForAfterInit(node, init$1, awaitAt);
  }
  var startsWithLet = this.isContextual("let"), isForOf = false;
  var usingKind = this.isUsing(true) ? "using" : this.isAwaitUsing(true) ? "await using" : null;
  if (usingKind) {
    var init$2 = this.startNode();
    this.next();
    if (usingKind === "await using") {
      if (!this.canAwait) {
        this.raise(this.start, "Await using cannot appear outside of async function");
      }
      this.next();
    }
    this.parseVar(init$2, true, usingKind);
    this.finishNode(init$2, "VariableDeclaration");
    return this.parseForAfterInit(node, init$2, awaitAt);
  }
  var containsEsc = this.containsEsc;
  var refDestructuringErrors = new DestructuringErrors();
  var initPos = this.start;
  var init = awaitAt > -1 ? this.parseExprSubscripts(refDestructuringErrors, "await") : this.parseExpression(true, refDestructuringErrors);
  if (this.type === types$1._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
    if (awaitAt > -1) {
      if (this.type === types$1._in) {
        this.unexpected(awaitAt);
      }
      node.await = true;
    } else if (isForOf && this.options.ecmaVersion >= 8) {
      if (init.start === initPos && !containsEsc && init.type === "Identifier" && init.name === "async") {
        this.unexpected();
      } else if (this.options.ecmaVersion >= 9) {
        node.await = false;
      }
    }
    if (startsWithLet && isForOf) {
      this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'.");
    }
    this.toAssignable(init, false, refDestructuringErrors);
    this.checkLValPattern(init);
    return this.parseForIn(node, init);
  } else {
    this.checkExpressionErrors(refDestructuringErrors, true);
  }
  if (awaitAt > -1) {
    this.unexpected(awaitAt);
  }
  return this.parseFor(node, init);
};
pp$8.parseForAfterInit = function(node, init, awaitAt) {
  if ((this.type === types$1._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && init.declarations.length === 1) {
    if (this.options.ecmaVersion >= 9) {
      if (this.type === types$1._in) {
        if (awaitAt > -1) {
          this.unexpected(awaitAt);
        }
      } else {
        node.await = awaitAt > -1;
      }
    }
    return this.parseForIn(node, init);
  }
  if (awaitAt > -1) {
    this.unexpected(awaitAt);
  }
  return this.parseFor(node, init);
};
pp$8.parseFunctionStatement = function(node, isAsync, declarationPosition) {
  this.next();
  return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync);
};
pp$8.parseIfStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  node.consequent = this.parseStatement("if");
  node.alternate = this.eat(types$1._else) ? this.parseStatement("if") : null;
  return this.finishNode(node, "IfStatement");
};
pp$8.parseReturnStatement = function(node) {
  if (!this.allowReturn) {
    this.raise(this.start, "'return' outside of function");
  }
  this.next();
  if (this.eat(types$1.semi) || this.insertSemicolon()) {
    node.argument = null;
  } else {
    node.argument = this.parseExpression();
    this.semicolon();
  }
  return this.finishNode(node, "ReturnStatement");
};
pp$8.parseSwitchStatement = function(node) {
  this.next();
  node.discriminant = this.parseParenExpression();
  node.cases = [];
  this.expect(types$1.braceL);
  this.labels.push(switchLabel);
  this.enterScope(SCOPE_SWITCH);
  var cur;
  for (var sawDefault = false; this.type !== types$1.braceR; ) {
    if (this.type === types$1._case || this.type === types$1._default) {
      var isCase = this.type === types$1._case;
      if (cur) {
        this.finishNode(cur, "SwitchCase");
      }
      node.cases.push(cur = this.startNode());
      cur.consequent = [];
      this.next();
      if (isCase) {
        cur.test = this.parseExpression();
      } else {
        if (sawDefault) {
          this.raiseRecoverable(this.lastTokStart, "Multiple default clauses");
        }
        sawDefault = true;
        cur.test = null;
      }
      this.expect(types$1.colon);
    } else {
      if (!cur) {
        this.unexpected();
      }
      cur.consequent.push(this.parseStatement(null));
    }
  }
  this.exitScope();
  if (cur) {
    this.finishNode(cur, "SwitchCase");
  }
  this.next();
  this.labels.pop();
  return this.finishNode(node, "SwitchStatement");
};
pp$8.parseThrowStatement = function(node) {
  this.next();
  if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) {
    this.raise(this.lastTokEnd, "Illegal newline after throw");
  }
  node.argument = this.parseExpression();
  this.semicolon();
  return this.finishNode(node, "ThrowStatement");
};
var empty$1 = [];
pp$8.parseCatchClauseParam = function() {
  var param = this.parseBindingAtom();
  var simple = param.type === "Identifier";
  this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
  this.checkLValPattern(param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
  this.expect(types$1.parenR);
  return param;
};
pp$8.parseTryStatement = function(node) {
  this.next();
  node.block = this.parseBlock();
  node.handler = null;
  if (this.type === types$1._catch) {
    var clause = this.startNode();
    this.next();
    if (this.eat(types$1.parenL)) {
      clause.param = this.parseCatchClauseParam();
    } else {
      if (this.options.ecmaVersion < 10) {
        this.unexpected();
      }
      clause.param = null;
      this.enterScope(0);
    }
    clause.body = this.parseBlock(false);
    this.exitScope();
    node.handler = this.finishNode(clause, "CatchClause");
  }
  node.finalizer = this.eat(types$1._finally) ? this.parseBlock() : null;
  if (!node.handler && !node.finalizer) {
    this.raise(node.start, "Missing catch or finally clause");
  }
  return this.finishNode(node, "TryStatement");
};
pp$8.parseVarStatement = function(node, kind, allowMissingInitializer) {
  this.next();
  this.parseVar(node, false, kind, allowMissingInitializer);
  this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};
pp$8.parseWhileStatement = function(node) {
  this.next();
  node.test = this.parseParenExpression();
  this.labels.push(loopLabel);
  node.body = this.parseStatement("while");
  this.labels.pop();
  return this.finishNode(node, "WhileStatement");
};
pp$8.parseWithStatement = function(node) {
  if (this.strict) {
    this.raise(this.start, "'with' in strict mode");
  }
  this.next();
  node.object = this.parseParenExpression();
  node.body = this.parseStatement("with");
  return this.finishNode(node, "WithStatement");
};
pp$8.parseEmptyStatement = function(node) {
  this.next();
  return this.finishNode(node, "EmptyStatement");
};
pp$8.parseLabeledStatement = function(node, maybeName, expr, context2) {
  for (var i$1 = 0, list2 = this.labels; i$1 < list2.length; i$1 += 1) {
    var label = list2[i$1];
    if (label.name === maybeName) {
      this.raise(expr.start, "Label '" + maybeName + "' is already declared");
    }
  }
  var kind = this.type.isLoop ? "loop" : this.type === types$1._switch ? "switch" : null;
  for (var i = this.labels.length - 1; i >= 0; i--) {
    var label$1 = this.labels[i];
    if (label$1.statementStart === node.start) {
      label$1.statementStart = this.start;
      label$1.kind = kind;
    } else {
      break;
    }
  }
  this.labels.push({ name: maybeName, kind, statementStart: this.start });
  node.body = this.parseStatement(context2 ? context2.indexOf("label") === -1 ? context2 + "label" : context2 : "label");
  this.labels.pop();
  node.label = expr;
  return this.finishNode(node, "LabeledStatement");
};
pp$8.parseExpressionStatement = function(node, expr) {
  node.expression = expr;
  this.semicolon();
  return this.finishNode(node, "ExpressionStatement");
};
pp$8.parseBlock = function(createNewLexicalScope, node, exitStrict) {
  if (createNewLexicalScope === void 0) createNewLexicalScope = true;
  if (node === void 0) node = this.startNode();
  node.body = [];
  this.expect(types$1.braceL);
  if (createNewLexicalScope) {
    this.enterScope(0);
  }
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  if (exitStrict) {
    this.strict = false;
  }
  this.next();
  if (createNewLexicalScope) {
    this.exitScope();
  }
  return this.finishNode(node, "BlockStatement");
};
pp$8.parseFor = function(node, init) {
  node.init = init;
  this.expect(types$1.semi);
  node.test = this.type === types$1.semi ? null : this.parseExpression();
  this.expect(types$1.semi);
  node.update = this.type === types$1.parenR ? null : this.parseExpression();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, "ForStatement");
};
pp$8.parseForIn = function(node, init) {
  var isForIn = this.type === types$1._in;
  this.next();
  if (init.type === "VariableDeclaration" && init.declarations[0].init != null && (!isForIn || this.options.ecmaVersion < 8 || this.strict || init.kind !== "var" || init.declarations[0].id.type !== "Identifier")) {
    this.raise(
      init.start,
      (isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer"
    );
  }
  node.left = init;
  node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
  this.expect(types$1.parenR);
  node.body = this.parseStatement("for");
  this.exitScope();
  this.labels.pop();
  return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement");
};
pp$8.parseVar = function(node, isFor, kind, allowMissingInitializer) {
  node.declarations = [];
  node.kind = kind;
  for (; ; ) {
    var decl = this.startNode();
    this.parseVarId(decl, kind);
    if (this.eat(types$1.eq)) {
      decl.init = this.parseMaybeAssign(isFor);
    } else if (!allowMissingInitializer && kind === "const" && !(this.type === types$1._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      this.unexpected();
    } else if (!allowMissingInitializer && (kind === "using" || kind === "await using") && this.options.ecmaVersion >= 17 && this.type !== types$1._in && !this.isContextual("of")) {
      this.raise(this.lastTokEnd, "Missing initializer in " + kind + " declaration");
    } else if (!allowMissingInitializer && decl.id.type !== "Identifier" && !(isFor && (this.type === types$1._in || this.isContextual("of")))) {
      this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
    } else {
      decl.init = null;
    }
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
    if (!this.eat(types$1.comma)) {
      break;
    }
  }
  return node;
};
pp$8.parseVarId = function(decl, kind) {
  decl.id = kind === "using" || kind === "await using" ? this.parseIdent() : this.parseBindingAtom();
  this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
};
var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;
pp$8.parseFunction = function(node, statement, allowExpressionBody, isAsync, forInit) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
    if (this.type === types$1.star && statement & FUNC_HANGING_STATEMENT) {
      this.unexpected();
    }
    node.generator = this.eat(types$1.star);
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  if (statement & FUNC_STATEMENT) {
    node.id = statement & FUNC_NULLABLE_ID && this.type !== types$1.name ? null : this.parseIdent();
    if (node.id && !(statement & FUNC_HANGING_STATEMENT)) {
      this.checkLValSimple(node.id, this.strict || node.generator || node.async ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION);
    }
  }
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(node.async, node.generator));
  if (!(statement & FUNC_STATEMENT)) {
    node.id = this.type === types$1.name ? this.parseIdent() : null;
  }
  this.parseFunctionParams(node);
  this.parseFunctionBody(node, allowExpressionBody, false, forInit);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, statement & FUNC_STATEMENT ? "FunctionDeclaration" : "FunctionExpression");
};
pp$8.parseFunctionParams = function(node) {
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
};
pp$8.parseClass = function(node, isStatement) {
  this.next();
  var oldStrict = this.strict;
  this.strict = true;
  this.parseClassId(node, isStatement);
  this.parseClassSuper(node);
  var privateNameMap = this.enterClassBody();
  var classBody = this.startNode();
  var hadConstructor = false;
  classBody.body = [];
  this.expect(types$1.braceL);
  while (this.type !== types$1.braceR) {
    var element = this.parseClassElement(node.superClass !== null);
    if (element) {
      classBody.body.push(element);
      if (element.type === "MethodDefinition" && element.kind === "constructor") {
        if (hadConstructor) {
          this.raiseRecoverable(element.start, "Duplicate constructor in the same class");
        }
        hadConstructor = true;
      } else if (element.key && element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
        this.raiseRecoverable(element.key.start, "Identifier '#" + element.key.name + "' has already been declared");
      }
    }
  }
  this.strict = oldStrict;
  this.next();
  node.body = this.finishNode(classBody, "ClassBody");
  this.exitClassBody();
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};
pp$8.parseClassElement = function(constructorAllowsSuper) {
  if (this.eat(types$1.semi)) {
    return null;
  }
  var ecmaVersion = this.options.ecmaVersion;
  var node = this.startNode();
  var keyName = "";
  var isGenerator = false;
  var isAsync = false;
  var kind = "method";
  var isStatic = false;
  if (this.eatContextual("static")) {
    if (ecmaVersion >= 13 && this.eat(types$1.braceL)) {
      this.parseClassStaticBlock(node);
      return node;
    }
    if (this.isClassElementNameStart() || this.type === types$1.star) {
      isStatic = true;
    } else {
      keyName = "static";
    }
  }
  node.static = isStatic;
  if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
    if ((this.isClassElementNameStart() || this.type === types$1.star) && !this.canInsertSemicolon()) {
      isAsync = true;
    } else {
      keyName = "async";
    }
  }
  if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types$1.star)) {
    isGenerator = true;
  }
  if (!keyName && !isAsync && !isGenerator) {
    var lastValue = this.value;
    if (this.eatContextual("get") || this.eatContextual("set")) {
      if (this.isClassElementNameStart()) {
        kind = lastValue;
      } else {
        keyName = lastValue;
      }
    }
  }
  if (keyName) {
    node.computed = false;
    node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
    node.key.name = keyName;
    this.finishNode(node.key, "Identifier");
  } else {
    this.parseClassElementName(node);
  }
  if (ecmaVersion < 13 || this.type === types$1.parenL || kind !== "method" || isGenerator || isAsync) {
    var isConstructor = !node.static && checkKeyName(node, "constructor");
    var allowsDirectSuper = isConstructor && constructorAllowsSuper;
    if (isConstructor && kind !== "method") {
      this.raise(node.key.start, "Constructor can't have get/set modifier");
    }
    node.kind = isConstructor ? "constructor" : kind;
    this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
  } else {
    this.parseClassField(node);
  }
  return node;
};
pp$8.isClassElementNameStart = function() {
  return this.type === types$1.name || this.type === types$1.privateId || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword;
};
pp$8.parseClassElementName = function(element) {
  if (this.type === types$1.privateId) {
    if (this.value === "constructor") {
      this.raise(this.start, "Classes can't have an element named '#constructor'");
    }
    element.computed = false;
    element.key = this.parsePrivateIdent();
  } else {
    this.parsePropertyName(element);
  }
};
pp$8.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
  var key2 = method.key;
  if (method.kind === "constructor") {
    if (isGenerator) {
      this.raise(key2.start, "Constructor can't be a generator");
    }
    if (isAsync) {
      this.raise(key2.start, "Constructor can't be an async method");
    }
  } else if (method.static && checkKeyName(method, "prototype")) {
    this.raise(key2.start, "Classes may not have a static property named prototype");
  }
  var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);
  if (method.kind === "get" && value.params.length !== 0) {
    this.raiseRecoverable(value.start, "getter should have no params");
  }
  if (method.kind === "set" && value.params.length !== 1) {
    this.raiseRecoverable(value.start, "setter should have exactly one param");
  }
  if (method.kind === "set" && value.params[0].type === "RestElement") {
    this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params");
  }
  return this.finishNode(method, "MethodDefinition");
};
pp$8.parseClassField = function(field2) {
  if (checkKeyName(field2, "constructor")) {
    this.raise(field2.key.start, "Classes can't have a field named 'constructor'");
  } else if (field2.static && checkKeyName(field2, "prototype")) {
    this.raise(field2.key.start, "Classes can't have a static field named 'prototype'");
  }
  if (this.eat(types$1.eq)) {
    this.enterScope(SCOPE_CLASS_FIELD_INIT | SCOPE_SUPER);
    field2.value = this.parseMaybeAssign();
    this.exitScope();
  } else {
    field2.value = null;
  }
  this.semicolon();
  return this.finishNode(field2, "PropertyDefinition");
};
pp$8.parseClassStaticBlock = function(node) {
  node.body = [];
  var oldLabels = this.labels;
  this.labels = [];
  this.enterScope(SCOPE_CLASS_STATIC_BLOCK | SCOPE_SUPER);
  while (this.type !== types$1.braceR) {
    var stmt = this.parseStatement(null);
    node.body.push(stmt);
  }
  this.next();
  this.exitScope();
  this.labels = oldLabels;
  return this.finishNode(node, "StaticBlock");
};
pp$8.parseClassId = function(node, isStatement) {
  if (this.type === types$1.name) {
    node.id = this.parseIdent();
    if (isStatement) {
      this.checkLValSimple(node.id, BIND_LEXICAL, false);
    }
  } else {
    if (isStatement === true) {
      this.unexpected();
    }
    node.id = null;
  }
};
pp$8.parseClassSuper = function(node) {
  node.superClass = this.eat(types$1._extends) ? this.parseExprSubscripts(null, false) : null;
};
pp$8.enterClassBody = function() {
  var element = { declared: /* @__PURE__ */ Object.create(null), used: [] };
  this.privateNameStack.push(element);
  return element.declared;
};
pp$8.exitClassBody = function() {
  var ref2 = this.privateNameStack.pop();
  var declared = ref2.declared;
  var used = ref2.used;
  if (!this.options.checkPrivateFields) {
    return;
  }
  var len = this.privateNameStack.length;
  var parent = len === 0 ? null : this.privateNameStack[len - 1];
  for (var i = 0; i < used.length; ++i) {
    var id = used[i];
    if (!hasOwn(declared, id.name)) {
      if (parent) {
        parent.used.push(id);
      } else {
        this.raiseRecoverable(id.start, "Private field '#" + id.name + "' must be declared in an enclosing class");
      }
    }
  }
};
function isPrivateNameConflicted(privateNameMap, element) {
  var name2 = element.key.name;
  var curr = privateNameMap[name2];
  var next = "true";
  if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
    next = (element.static ? "s" : "i") + element.kind;
  }
  if (curr === "iget" && next === "iset" || curr === "iset" && next === "iget" || curr === "sget" && next === "sset" || curr === "sset" && next === "sget") {
    privateNameMap[name2] = "true";
    return false;
  } else if (!curr) {
    privateNameMap[name2] = next;
    return false;
  } else {
    return true;
  }
}
function checkKeyName(node, name2) {
  var computed = node.computed;
  var key2 = node.key;
  return !computed && (key2.type === "Identifier" && key2.name === name2 || key2.type === "Literal" && key2.value === name2);
}
pp$8.parseExportAllDeclaration = function(node, exports$1) {
  if (this.options.ecmaVersion >= 11) {
    if (this.eatContextual("as")) {
      node.exported = this.parseModuleExportName();
      this.checkExport(exports$1, node.exported, this.lastTokStart);
    } else {
      node.exported = null;
    }
  }
  this.expectContextual("from");
  if (this.type !== types$1.string) {
    this.unexpected();
  }
  node.source = this.parseExprAtom();
  if (this.options.ecmaVersion >= 16) {
    node.attributes = this.parseWithClause();
  }
  this.semicolon();
  return this.finishNode(node, "ExportAllDeclaration");
};
pp$8.parseExport = function(node, exports$1) {
  this.next();
  if (this.eat(types$1.star)) {
    return this.parseExportAllDeclaration(node, exports$1);
  }
  if (this.eat(types$1._default)) {
    this.checkExport(exports$1, "default", this.lastTokStart);
    node.declaration = this.parseExportDefaultDeclaration();
    return this.finishNode(node, "ExportDefaultDeclaration");
  }
  if (this.shouldParseExportStatement()) {
    node.declaration = this.parseExportDeclaration(node);
    if (node.declaration.type === "VariableDeclaration") {
      this.checkVariableExport(exports$1, node.declaration.declarations);
    } else {
      this.checkExport(exports$1, node.declaration.id, node.declaration.id.start);
    }
    node.specifiers = [];
    node.source = null;
    if (this.options.ecmaVersion >= 16) {
      node.attributes = [];
    }
  } else {
    node.declaration = null;
    node.specifiers = this.parseExportSpecifiers(exports$1);
    if (this.eatContextual("from")) {
      if (this.type !== types$1.string) {
        this.unexpected();
      }
      node.source = this.parseExprAtom();
      if (this.options.ecmaVersion >= 16) {
        node.attributes = this.parseWithClause();
      }
    } else {
      for (var i = 0, list2 = node.specifiers; i < list2.length; i += 1) {
        var spec = list2[i];
        this.checkUnreserved(spec.local);
        this.checkLocalExport(spec.local);
        if (spec.local.type === "Literal") {
          this.raise(spec.local.start, "A string literal cannot be used as an exported binding without `from`.");
        }
      }
      node.source = null;
      if (this.options.ecmaVersion >= 16) {
        node.attributes = [];
      }
    }
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};
pp$8.parseExportDeclaration = function(node) {
  return this.parseStatement(null);
};
pp$8.parseExportDefaultDeclaration = function() {
  var isAsync;
  if (this.type === types$1._function || (isAsync = this.isAsyncFunction())) {
    var fNode = this.startNode();
    this.next();
    if (isAsync) {
      this.next();
    }
    return this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
  } else if (this.type === types$1._class) {
    var cNode = this.startNode();
    return this.parseClass(cNode, "nullableID");
  } else {
    var declaration = this.parseMaybeAssign();
    this.semicolon();
    return declaration;
  }
};
pp$8.checkExport = function(exports$1, name2, pos) {
  if (!exports$1) {
    return;
  }
  if (typeof name2 !== "string") {
    name2 = name2.type === "Identifier" ? name2.name : name2.value;
  }
  if (hasOwn(exports$1, name2)) {
    this.raiseRecoverable(pos, "Duplicate export '" + name2 + "'");
  }
  exports$1[name2] = true;
};
pp$8.checkPatternExport = function(exports$1, pat) {
  var type = pat.type;
  if (type === "Identifier") {
    this.checkExport(exports$1, pat, pat.start);
  } else if (type === "ObjectPattern") {
    for (var i = 0, list2 = pat.properties; i < list2.length; i += 1) {
      var prop = list2[i];
      this.checkPatternExport(exports$1, prop);
    }
  } else if (type === "ArrayPattern") {
    for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
      var elt = list$1[i$1];
      if (elt) {
        this.checkPatternExport(exports$1, elt);
      }
    }
  } else if (type === "Property") {
    this.checkPatternExport(exports$1, pat.value);
  } else if (type === "AssignmentPattern") {
    this.checkPatternExport(exports$1, pat.left);
  } else if (type === "RestElement") {
    this.checkPatternExport(exports$1, pat.argument);
  }
};
pp$8.checkVariableExport = function(exports$1, decls) {
  if (!exports$1) {
    return;
  }
  for (var i = 0, list2 = decls; i < list2.length; i += 1) {
    var decl = list2[i];
    this.checkPatternExport(exports$1, decl.id);
  }
};
pp$8.shouldParseExportStatement = function() {
  return this.type.keyword === "var" || this.type.keyword === "const" || this.type.keyword === "class" || this.type.keyword === "function" || this.isLet() || this.isAsyncFunction();
};
pp$8.parseExportSpecifier = function(exports$1) {
  var node = this.startNode();
  node.local = this.parseModuleExportName();
  node.exported = this.eatContextual("as") ? this.parseModuleExportName() : node.local;
  this.checkExport(
    exports$1,
    node.exported,
    node.exported.start
  );
  return this.finishNode(node, "ExportSpecifier");
};
pp$8.parseExportSpecifiers = function(exports$1) {
  var nodes = [], first = true;
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    nodes.push(this.parseExportSpecifier(exports$1));
  }
  return nodes;
};
pp$8.parseImport = function(node) {
  this.next();
  if (this.type === types$1.string) {
    node.specifiers = empty$1;
    node.source = this.parseExprAtom();
  } else {
    node.specifiers = this.parseImportSpecifiers();
    this.expectContextual("from");
    node.source = this.type === types$1.string ? this.parseExprAtom() : this.unexpected();
  }
  if (this.options.ecmaVersion >= 16) {
    node.attributes = this.parseWithClause();
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};
pp$8.parseImportSpecifier = function() {
  var node = this.startNode();
  node.imported = this.parseModuleExportName();
  if (this.eatContextual("as")) {
    node.local = this.parseIdent();
  } else {
    this.checkUnreserved(node.imported);
    node.local = node.imported;
  }
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportSpecifier");
};
pp$8.parseImportDefaultSpecifier = function() {
  var node = this.startNode();
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportDefaultSpecifier");
};
pp$8.parseImportNamespaceSpecifier = function() {
  var node = this.startNode();
  this.next();
  this.expectContextual("as");
  node.local = this.parseIdent();
  this.checkLValSimple(node.local, BIND_LEXICAL);
  return this.finishNode(node, "ImportNamespaceSpecifier");
};
pp$8.parseImportSpecifiers = function() {
  var nodes = [], first = true;
  if (this.type === types$1.name) {
    nodes.push(this.parseImportDefaultSpecifier());
    if (!this.eat(types$1.comma)) {
      return nodes;
    }
  }
  if (this.type === types$1.star) {
    nodes.push(this.parseImportNamespaceSpecifier());
    return nodes;
  }
  this.expect(types$1.braceL);
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    nodes.push(this.parseImportSpecifier());
  }
  return nodes;
};
pp$8.parseWithClause = function() {
  var nodes = [];
  if (!this.eat(types$1._with)) {
    return nodes;
  }
  this.expect(types$1.braceL);
  var attributeKeys = {};
  var first = true;
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    var attr = this.parseImportAttribute();
    var keyName = attr.key.type === "Identifier" ? attr.key.name : attr.key.value;
    if (hasOwn(attributeKeys, keyName)) {
      this.raiseRecoverable(attr.key.start, "Duplicate attribute key '" + keyName + "'");
    }
    attributeKeys[keyName] = true;
    nodes.push(attr);
  }
  return nodes;
};
pp$8.parseImportAttribute = function() {
  var node = this.startNode();
  node.key = this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
  this.expect(types$1.colon);
  if (this.type !== types$1.string) {
    this.unexpected();
  }
  node.value = this.parseExprAtom();
  return this.finishNode(node, "ImportAttribute");
};
pp$8.parseModuleExportName = function() {
  if (this.options.ecmaVersion >= 13 && this.type === types$1.string) {
    var stringLiteral = this.parseLiteral(this.value);
    if (loneSurrogate.test(stringLiteral.value)) {
      this.raise(stringLiteral.start, "An export name cannot include a lone surrogate.");
    }
    return stringLiteral;
  }
  return this.parseIdent(true);
};
pp$8.adaptDirectivePrologue = function(statements) {
  for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
    statements[i].directive = statements[i].expression.raw.slice(1, -1);
  }
};
pp$8.isDirectiveCandidate = function(statement) {
  return this.options.ecmaVersion >= 5 && statement.type === "ExpressionStatement" && statement.expression.type === "Literal" && typeof statement.expression.value === "string" && // Reject parenthesized strings.
  (this.input[statement.start] === '"' || this.input[statement.start] === "'");
};
var pp$7 = Parser.prototype;
pp$7.toAssignable = function(node, isBinding, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "Identifier":
        if (this.inAsync && node.name === "await") {
          this.raise(node.start, "Cannot use 'await' as identifier inside an async function");
        }
        break;
      case "ObjectPattern":
      case "ArrayPattern":
      case "AssignmentPattern":
      case "RestElement":
        break;
      case "ObjectExpression":
        node.type = "ObjectPattern";
        if (refDestructuringErrors) {
          this.checkPatternErrors(refDestructuringErrors, true);
        }
        for (var i = 0, list2 = node.properties; i < list2.length; i += 1) {
          var prop = list2[i];
          this.toAssignable(prop, isBinding);
          if (prop.type === "RestElement" && (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")) {
            this.raise(prop.argument.start, "Unexpected token");
          }
        }
        break;
      case "Property":
        if (node.kind !== "init") {
          this.raise(node.key.start, "Object pattern can't contain getter or setter");
        }
        this.toAssignable(node.value, isBinding);
        break;
      case "ArrayExpression":
        node.type = "ArrayPattern";
        if (refDestructuringErrors) {
          this.checkPatternErrors(refDestructuringErrors, true);
        }
        this.toAssignableList(node.elements, isBinding);
        break;
      case "SpreadElement":
        node.type = "RestElement";
        this.toAssignable(node.argument, isBinding);
        if (node.argument.type === "AssignmentPattern") {
          this.raise(node.argument.start, "Rest elements cannot have a default value");
        }
        break;
      case "AssignmentExpression":
        if (node.operator !== "=") {
          this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
        }
        node.type = "AssignmentPattern";
        delete node.operator;
        this.toAssignable(node.left, isBinding);
        break;
      case "ParenthesizedExpression":
        this.toAssignable(node.expression, isBinding, refDestructuringErrors);
        break;
      case "ChainExpression":
        this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
        break;
      case "MemberExpression":
        if (!isBinding) {
          break;
        }
      default:
        this.raise(node.start, "Assigning to rvalue");
    }
  } else if (refDestructuringErrors) {
    this.checkPatternErrors(refDestructuringErrors, true);
  }
  return node;
};
pp$7.toAssignableList = function(exprList, isBinding) {
  var end = exprList.length;
  for (var i = 0; i < end; i++) {
    var elt = exprList[i];
    if (elt) {
      this.toAssignable(elt, isBinding);
    }
  }
  if (end) {
    var last = exprList[end - 1];
    if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier") {
      this.unexpected(last.argument.start);
    }
  }
  return exprList;
};
pp$7.parseSpread = function(refDestructuringErrors) {
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
  return this.finishNode(node, "SpreadElement");
};
pp$7.parseRestBinding = function() {
  var node = this.startNode();
  this.next();
  if (this.options.ecmaVersion === 6 && this.type !== types$1.name) {
    this.unexpected();
  }
  node.argument = this.parseBindingAtom();
  return this.finishNode(node, "RestElement");
};
pp$7.parseBindingAtom = function() {
  if (this.options.ecmaVersion >= 6) {
    switch (this.type) {
      case types$1.bracketL:
        var node = this.startNode();
        this.next();
        node.elements = this.parseBindingList(types$1.bracketR, true, true);
        return this.finishNode(node, "ArrayPattern");
      case types$1.braceL:
        return this.parseObj(true);
    }
  }
  return this.parseIdent();
};
pp$7.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowModifiers) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (first) {
      first = false;
    } else {
      this.expect(types$1.comma);
    }
    if (allowEmpty && this.type === types$1.comma) {
      elts.push(null);
    } else if (allowTrailingComma && this.afterTrailingComma(close)) {
      break;
    } else if (this.type === types$1.ellipsis) {
      var rest = this.parseRestBinding();
      this.parseBindingListItem(rest);
      elts.push(rest);
      if (this.type === types$1.comma) {
        this.raiseRecoverable(this.start, "Comma is not permitted after the rest element");
      }
      this.expect(close);
      break;
    } else {
      elts.push(this.parseAssignableListItem(allowModifiers));
    }
  }
  return elts;
};
pp$7.parseAssignableListItem = function(allowModifiers) {
  var elem = this.parseMaybeDefault(this.start, this.startLoc);
  this.parseBindingListItem(elem);
  return elem;
};
pp$7.parseBindingListItem = function(param) {
  return param;
};
pp$7.parseMaybeDefault = function(startPos, startLoc, left) {
  left = left || this.parseBindingAtom();
  if (this.options.ecmaVersion < 6 || !this.eat(types$1.eq)) {
    return left;
  }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.right = this.parseMaybeAssign();
  return this.finishNode(node, "AssignmentPattern");
};
pp$7.checkLValSimple = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  var isBind = bindingType !== BIND_NONE;
  switch (expr.type) {
    case "Identifier":
      if (this.strict && this.reservedWordsStrictBind.test(expr.name)) {
        this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
      }
      if (isBind) {
        if (bindingType === BIND_LEXICAL && expr.name === "let") {
          this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name");
        }
        if (checkClashes) {
          if (hasOwn(checkClashes, expr.name)) {
            this.raiseRecoverable(expr.start, "Argument name clash");
          }
          checkClashes[expr.name] = true;
        }
        if (bindingType !== BIND_OUTSIDE) {
          this.declareName(expr.name, bindingType, expr.start);
        }
      }
      break;
    case "ChainExpression":
      this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
      break;
    case "MemberExpression":
      if (isBind) {
        this.raiseRecoverable(expr.start, "Binding member expression");
      }
      break;
    case "ParenthesizedExpression":
      if (isBind) {
        this.raiseRecoverable(expr.start, "Binding parenthesized expression");
      }
      return this.checkLValSimple(expr.expression, bindingType, checkClashes);
    default:
      this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
  }
};
pp$7.checkLValPattern = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  switch (expr.type) {
    case "ObjectPattern":
      for (var i = 0, list2 = expr.properties; i < list2.length; i += 1) {
        var prop = list2[i];
        this.checkLValInnerPattern(prop, bindingType, checkClashes);
      }
      break;
    case "ArrayPattern":
      for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
        var elem = list$1[i$1];
        if (elem) {
          this.checkLValInnerPattern(elem, bindingType, checkClashes);
        }
      }
      break;
    default:
      this.checkLValSimple(expr, bindingType, checkClashes);
  }
};
pp$7.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
  if (bindingType === void 0) bindingType = BIND_NONE;
  switch (expr.type) {
    case "Property":
      this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
      break;
    case "AssignmentPattern":
      this.checkLValPattern(expr.left, bindingType, checkClashes);
      break;
    case "RestElement":
      this.checkLValPattern(expr.argument, bindingType, checkClashes);
      break;
    default:
      this.checkLValPattern(expr, bindingType, checkClashes);
  }
};
var TokContext = function TokContext2(token, isExpr, preserveSpace, override, generator) {
  this.token = token;
  this.isExpr = !!isExpr;
  this.preserveSpace = !!preserveSpace;
  this.override = override;
  this.generator = !!generator;
};
var types = {
  b_stat: new TokContext("{", false),
  b_expr: new TokContext("{", true),
  b_tmpl: new TokContext("${", false),
  p_stat: new TokContext("(", false),
  p_expr: new TokContext("(", true),
  q_tmpl: new TokContext("`", true, true, function(p) {
    return p.tryReadTemplateToken();
  }),
  f_stat: new TokContext("function", false),
  f_expr: new TokContext("function", true),
  f_expr_gen: new TokContext("function", true, false, null, true),
  f_gen: new TokContext("function", false, false, null, true)
};
var pp$6 = Parser.prototype;
pp$6.initialContext = function() {
  return [types.b_stat];
};
pp$6.curContext = function() {
  return this.context[this.context.length - 1];
};
pp$6.braceIsBlock = function(prevType) {
  var parent = this.curContext();
  if (parent === types.f_expr || parent === types.f_stat) {
    return true;
  }
  if (prevType === types$1.colon && (parent === types.b_stat || parent === types.b_expr)) {
    return !parent.isExpr;
  }
  if (prevType === types$1._return || prevType === types$1.name && this.exprAllowed) {
    return lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
  }
  if (prevType === types$1._else || prevType === types$1.semi || prevType === types$1.eof || prevType === types$1.parenR || prevType === types$1.arrow) {
    return true;
  }
  if (prevType === types$1.braceL) {
    return parent === types.b_stat;
  }
  if (prevType === types$1._var || prevType === types$1._const || prevType === types$1.name) {
    return false;
  }
  return !this.exprAllowed;
};
pp$6.inGeneratorContext = function() {
  for (var i = this.context.length - 1; i >= 1; i--) {
    var context2 = this.context[i];
    if (context2.token === "function") {
      return context2.generator;
    }
  }
  return false;
};
pp$6.updateContext = function(prevType) {
  var update2, type = this.type;
  if (type.keyword && prevType === types$1.dot) {
    this.exprAllowed = false;
  } else if (update2 = type.updateContext) {
    update2.call(this, prevType);
  } else {
    this.exprAllowed = type.beforeExpr;
  }
};
pp$6.overrideContext = function(tokenCtx) {
  if (this.curContext() !== tokenCtx) {
    this.context[this.context.length - 1] = tokenCtx;
  }
};
types$1.parenR.updateContext = types$1.braceR.updateContext = function() {
  if (this.context.length === 1) {
    this.exprAllowed = true;
    return;
  }
  var out = this.context.pop();
  if (out === types.b_stat && this.curContext().token === "function") {
    out = this.context.pop();
  }
  this.exprAllowed = !out.isExpr;
};
types$1.braceL.updateContext = function(prevType) {
  this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
  this.exprAllowed = true;
};
types$1.dollarBraceL.updateContext = function() {
  this.context.push(types.b_tmpl);
  this.exprAllowed = true;
};
types$1.parenL.updateContext = function(prevType) {
  var statementParens = prevType === types$1._if || prevType === types$1._for || prevType === types$1._with || prevType === types$1._while;
  this.context.push(statementParens ? types.p_stat : types.p_expr);
  this.exprAllowed = true;
};
types$1.incDec.updateContext = function() {
};
types$1._function.updateContext = types$1._class.updateContext = function(prevType) {
  if (prevType.beforeExpr && prevType !== types$1._else && !(prevType === types$1.semi && this.curContext() !== types.p_stat) && !(prevType === types$1._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) && !((prevType === types$1.colon || prevType === types$1.braceL) && this.curContext() === types.b_stat)) {
    this.context.push(types.f_expr);
  } else {
    this.context.push(types.f_stat);
  }
  this.exprAllowed = false;
};
types$1.colon.updateContext = function() {
  if (this.curContext().token === "function") {
    this.context.pop();
  }
  this.exprAllowed = true;
};
types$1.backQuote.updateContext = function() {
  if (this.curContext() === types.q_tmpl) {
    this.context.pop();
  } else {
    this.context.push(types.q_tmpl);
  }
  this.exprAllowed = false;
};
types$1.star.updateContext = function(prevType) {
  if (prevType === types$1._function) {
    var index2 = this.context.length - 1;
    if (this.context[index2] === types.f_expr) {
      this.context[index2] = types.f_expr_gen;
    } else {
      this.context[index2] = types.f_gen;
    }
  }
  this.exprAllowed = true;
};
types$1.name.updateContext = function(prevType) {
  var allowed = false;
  if (this.options.ecmaVersion >= 6 && prevType !== types$1.dot) {
    if (this.value === "of" && !this.exprAllowed || this.value === "yield" && this.inGeneratorContext()) {
      allowed = true;
    }
  }
  this.exprAllowed = allowed;
};
var pp$5 = Parser.prototype;
pp$5.checkPropClash = function(prop, propHash, refDestructuringErrors) {
  if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement") {
    return;
  }
  if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand)) {
    return;
  }
  var key2 = prop.key;
  var name2;
  switch (key2.type) {
    case "Identifier":
      name2 = key2.name;
      break;
    case "Literal":
      name2 = String(key2.value);
      break;
    default:
      return;
  }
  var kind = prop.kind;
  if (this.options.ecmaVersion >= 6) {
    if (name2 === "__proto__" && kind === "init") {
      if (propHash.proto) {
        if (refDestructuringErrors) {
          if (refDestructuringErrors.doubleProto < 0) {
            refDestructuringErrors.doubleProto = key2.start;
          }
        } else {
          this.raiseRecoverable(key2.start, "Redefinition of __proto__ property");
        }
      }
      propHash.proto = true;
    }
    return;
  }
  name2 = "$" + name2;
  var other = propHash[name2];
  if (other) {
    var redefinition;
    if (kind === "init") {
      redefinition = this.strict && other.init || other.get || other.set;
    } else {
      redefinition = other.init || other[kind];
    }
    if (redefinition) {
      this.raiseRecoverable(key2.start, "Redefinition of property");
    }
  } else {
    other = propHash[name2] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
};
pp$5.parseExpression = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
  if (this.type === types$1.comma) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(types$1.comma)) {
      node.expressions.push(this.parseMaybeAssign(forInit, refDestructuringErrors));
    }
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};
pp$5.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
  if (this.isContextual("yield")) {
    if (this.inGenerator) {
      return this.parseYield(forInit);
    } else {
      this.exprAllowed = false;
    }
  }
  var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1, oldDoubleProto = -1;
  if (refDestructuringErrors) {
    oldParenAssign = refDestructuringErrors.parenthesizedAssign;
    oldTrailingComma = refDestructuringErrors.trailingComma;
    oldDoubleProto = refDestructuringErrors.doubleProto;
    refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
  } else {
    refDestructuringErrors = new DestructuringErrors();
    ownDestructuringErrors = true;
  }
  var startPos = this.start, startLoc = this.startLoc;
  if (this.type === types$1.parenL || this.type === types$1.name) {
    this.potentialArrowAt = this.start;
    this.potentialArrowInForAwait = forInit === "await";
  }
  var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
  if (afterLeftParse) {
    left = afterLeftParse.call(this, left, startPos, startLoc);
  }
  if (this.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.value;
    if (this.type === types$1.eq) {
      left = this.toAssignable(left, false, refDestructuringErrors);
    }
    if (!ownDestructuringErrors) {
      refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
    }
    if (refDestructuringErrors.shorthandAssign >= left.start) {
      refDestructuringErrors.shorthandAssign = -1;
    }
    if (this.type === types$1.eq) {
      this.checkLValPattern(left);
    } else {
      this.checkLValSimple(left);
    }
    node.left = left;
    this.next();
    node.right = this.parseMaybeAssign(forInit);
    if (oldDoubleProto > -1) {
      refDestructuringErrors.doubleProto = oldDoubleProto;
    }
    return this.finishNode(node, "AssignmentExpression");
  } else {
    if (ownDestructuringErrors) {
      this.checkExpressionErrors(refDestructuringErrors, true);
    }
  }
  if (oldParenAssign > -1) {
    refDestructuringErrors.parenthesizedAssign = oldParenAssign;
  }
  if (oldTrailingComma > -1) {
    refDestructuringErrors.trailingComma = oldTrailingComma;
  }
  return left;
};
pp$5.parseMaybeConditional = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprOps(forInit, refDestructuringErrors);
  if (this.checkExpressionErrors(refDestructuringErrors)) {
    return expr;
  }
  if (this.eat(types$1.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(types$1.colon);
    node.alternate = this.parseMaybeAssign(forInit);
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};
pp$5.parseExprOps = function(forInit, refDestructuringErrors) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseMaybeUnary(refDestructuringErrors, false, false, forInit);
  if (this.checkExpressionErrors(refDestructuringErrors)) {
    return expr;
  }
  return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit);
};
pp$5.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
  var prec = this.type.binop;
  if (prec != null && (!forInit || this.type !== types$1._in)) {
    if (prec > minPrec) {
      var logical = this.type === types$1.logicalOR || this.type === types$1.logicalAND;
      var coalesce = this.type === types$1.coalesce;
      if (coalesce) {
        prec = types$1.logicalAND.binop;
      }
      var op2 = this.value;
      this.next();
      var startPos = this.start, startLoc = this.startLoc;
      var right = this.parseExprOp(this.parseMaybeUnary(null, false, false, forInit), startPos, startLoc, prec, forInit);
      var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op2, logical || coalesce);
      if (logical && this.type === types$1.coalesce || coalesce && (this.type === types$1.logicalOR || this.type === types$1.logicalAND)) {
        this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
      }
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit);
    }
  }
  return left;
};
pp$5.buildBinary = function(startPos, startLoc, left, right, op2, logical) {
  if (right.type === "PrivateIdentifier") {
    this.raise(right.start, "Private identifier can only be left side of binary expression");
  }
  var node = this.startNodeAt(startPos, startLoc);
  node.left = left;
  node.operator = op2;
  node.right = right;
  return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression");
};
pp$5.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec, forInit) {
  var startPos = this.start, startLoc = this.startLoc, expr;
  if (this.isContextual("await") && this.canAwait) {
    expr = this.parseAwait(forInit);
    sawUnary = true;
  } else if (this.type.prefix) {
    var node = this.startNode(), update2 = this.type === types$1.incDec;
    node.operator = this.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(null, true, update2, forInit);
    this.checkExpressionErrors(refDestructuringErrors, true);
    if (update2) {
      this.checkLValSimple(node.argument);
    } else if (this.strict && node.operator === "delete" && isLocalVariableAccess(node.argument)) {
      this.raiseRecoverable(node.start, "Deleting local variable in strict mode");
    } else if (node.operator === "delete" && isPrivateFieldAccess(node.argument)) {
      this.raiseRecoverable(node.start, "Private fields can not be deleted");
    } else {
      sawUnary = true;
    }
    expr = this.finishNode(node, update2 ? "UpdateExpression" : "UnaryExpression");
  } else if (!sawUnary && this.type === types$1.privateId) {
    if ((forInit || this.privateNameStack.length === 0) && this.options.checkPrivateFields) {
      this.unexpected();
    }
    expr = this.parsePrivateIdent();
    if (this.type !== types$1._in) {
      this.unexpected();
    }
  } else {
    expr = this.parseExprSubscripts(refDestructuringErrors, forInit);
    if (this.checkExpressionErrors(refDestructuringErrors)) {
      return expr;
    }
    while (this.type.postfix && !this.canInsertSemicolon()) {
      var node$1 = this.startNodeAt(startPos, startLoc);
      node$1.operator = this.value;
      node$1.prefix = false;
      node$1.argument = expr;
      this.checkLValSimple(expr);
      this.next();
      expr = this.finishNode(node$1, "UpdateExpression");
    }
  }
  if (!incDec && this.eat(types$1.starstar)) {
    if (sawUnary) {
      this.unexpected(this.lastTokStart);
    } else {
      return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false, false, forInit), "**", false);
    }
  } else {
    return expr;
  }
};
function isLocalVariableAccess(node) {
  return node.type === "Identifier" || node.type === "ParenthesizedExpression" && isLocalVariableAccess(node.expression);
}
function isPrivateFieldAccess(node) {
  return node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" || node.type === "ChainExpression" && isPrivateFieldAccess(node.expression) || node.type === "ParenthesizedExpression" && isPrivateFieldAccess(node.expression);
}
pp$5.parseExprSubscripts = function(refDestructuringErrors, forInit) {
  var startPos = this.start, startLoc = this.startLoc;
  var expr = this.parseExprAtom(refDestructuringErrors, forInit);
  if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")") {
    return expr;
  }
  var result = this.parseSubscripts(expr, startPos, startLoc, false, forInit);
  if (refDestructuringErrors && result.type === "MemberExpression") {
    if (refDestructuringErrors.parenthesizedAssign >= result.start) {
      refDestructuringErrors.parenthesizedAssign = -1;
    }
    if (refDestructuringErrors.parenthesizedBind >= result.start) {
      refDestructuringErrors.parenthesizedBind = -1;
    }
    if (refDestructuringErrors.trailingComma >= result.start) {
      refDestructuringErrors.trailingComma = -1;
    }
  }
  return result;
};
pp$5.parseSubscripts = function(base, startPos, startLoc, noCalls, forInit) {
  var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" && this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 && this.potentialArrowAt === base.start;
  var optionalChained = false;
  while (true) {
    var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit);
    if (element.optional) {
      optionalChained = true;
    }
    if (element === base || element.type === "ArrowFunctionExpression") {
      if (optionalChained) {
        var chainNode = this.startNodeAt(startPos, startLoc);
        chainNode.expression = element;
        element = this.finishNode(chainNode, "ChainExpression");
      }
      return element;
    }
    base = element;
  }
};
pp$5.shouldParseAsyncArrow = function() {
  return !this.canInsertSemicolon() && this.eat(types$1.arrow);
};
pp$5.parseSubscriptAsyncArrow = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true, forInit);
};
pp$5.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained, forInit) {
  var optionalSupported = this.options.ecmaVersion >= 11;
  var optional2 = optionalSupported && this.eat(types$1.questionDot);
  if (noCalls && optional2) {
    this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions");
  }
  var computed = this.eat(types$1.bracketL);
  if (computed || optional2 && this.type !== types$1.parenL && this.type !== types$1.backQuote || this.eat(types$1.dot)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.object = base;
    if (computed) {
      node.property = this.parseExpression();
      this.expect(types$1.bracketR);
    } else if (this.type === types$1.privateId && base.type !== "Super") {
      node.property = this.parsePrivateIdent();
    } else {
      node.property = this.parseIdent(this.options.allowReserved !== "never");
    }
    node.computed = !!computed;
    if (optionalSupported) {
      node.optional = optional2;
    }
    base = this.finishNode(node, "MemberExpression");
  } else if (!noCalls && this.eat(types$1.parenL)) {
    var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
    this.yieldPos = 0;
    this.awaitPos = 0;
    this.awaitIdentPos = 0;
    var exprList = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
    if (maybeAsyncArrow && !optional2 && this.shouldParseAsyncArrow()) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      if (this.awaitIdentPos > 0) {
        this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function");
      }
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.parseSubscriptAsyncArrow(startPos, startLoc, exprList, forInit);
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
    var node$1 = this.startNodeAt(startPos, startLoc);
    node$1.callee = base;
    node$1.arguments = exprList;
    if (optionalSupported) {
      node$1.optional = optional2;
    }
    base = this.finishNode(node$1, "CallExpression");
  } else if (this.type === types$1.backQuote) {
    if (optional2 || optionalChained) {
      this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
    }
    var node$2 = this.startNodeAt(startPos, startLoc);
    node$2.tag = base;
    node$2.quasi = this.parseTemplate({ isTagged: true });
    base = this.finishNode(node$2, "TaggedTemplateExpression");
  }
  return base;
};
pp$5.parseExprAtom = function(refDestructuringErrors, forInit, forNew) {
  if (this.type === types$1.slash) {
    this.readRegexp();
  }
  var node, canBeArrow = this.potentialArrowAt === this.start;
  switch (this.type) {
    case types$1._super:
      if (!this.allowSuper) {
        this.raise(this.start, "'super' keyword outside a method");
      }
      node = this.startNode();
      this.next();
      if (this.type === types$1.parenL && !this.allowDirectSuper) {
        this.raise(node.start, "super() call outside constructor of a subclass");
      }
      if (this.type !== types$1.dot && this.type !== types$1.bracketL && this.type !== types$1.parenL) {
        this.unexpected();
      }
      return this.finishNode(node, "Super");
    case types$1._this:
      node = this.startNode();
      this.next();
      return this.finishNode(node, "ThisExpression");
    case types$1.name:
      var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
      var id = this.parseIdent(false);
      if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types$1._function)) {
        this.overrideContext(types.f_expr);
        return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true, forInit);
      }
      if (canBeArrow && !this.canInsertSemicolon()) {
        if (this.eat(types$1.arrow)) {
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false, forInit);
        }
        if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types$1.name && !containsEsc && (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
          id = this.parseIdent(false);
          if (this.canInsertSemicolon() || !this.eat(types$1.arrow)) {
            this.unexpected();
          }
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true, forInit);
        }
      }
      return id;
    case types$1.regexp:
      var value = this.value;
      node = this.parseLiteral(value.value);
      node.regex = { pattern: value.pattern, flags: value.flags };
      return node;
    case types$1.num:
    case types$1.string:
      return this.parseLiteral(this.value);
    case types$1._null:
    case types$1._true:
    case types$1._false:
      node = this.startNode();
      node.value = this.type === types$1._null ? null : this.type === types$1._true;
      node.raw = this.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");
    case types$1.parenL:
      var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow, forInit);
      if (refDestructuringErrors) {
        if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr)) {
          refDestructuringErrors.parenthesizedAssign = start;
        }
        if (refDestructuringErrors.parenthesizedBind < 0) {
          refDestructuringErrors.parenthesizedBind = start;
        }
      }
      return expr;
    case types$1.bracketL:
      node = this.startNode();
      this.next();
      node.elements = this.parseExprList(types$1.bracketR, true, true, refDestructuringErrors);
      return this.finishNode(node, "ArrayExpression");
    case types$1.braceL:
      this.overrideContext(types.b_expr);
      return this.parseObj(false, refDestructuringErrors);
    case types$1._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, 0);
    case types$1._class:
      return this.parseClass(this.startNode(), false);
    case types$1._new:
      return this.parseNew();
    case types$1.backQuote:
      return this.parseTemplate();
    case types$1._import:
      if (this.options.ecmaVersion >= 11) {
        return this.parseExprImport(forNew);
      } else {
        return this.unexpected();
      }
    default:
      return this.parseExprAtomDefault();
  }
};
pp$5.parseExprAtomDefault = function() {
  this.unexpected();
};
pp$5.parseExprImport = function(forNew) {
  var node = this.startNode();
  if (this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword import");
  }
  this.next();
  if (this.type === types$1.parenL && !forNew) {
    return this.parseDynamicImport(node);
  } else if (this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "import";
    node.meta = this.finishNode(meta, "Identifier");
    return this.parseImportMeta(node);
  } else {
    this.unexpected();
  }
};
pp$5.parseDynamicImport = function(node) {
  this.next();
  node.source = this.parseMaybeAssign();
  if (this.options.ecmaVersion >= 16) {
    if (!this.eat(types$1.parenR)) {
      this.expect(types$1.comma);
      if (!this.afterTrailingComma(types$1.parenR)) {
        node.options = this.parseMaybeAssign();
        if (!this.eat(types$1.parenR)) {
          this.expect(types$1.comma);
          if (!this.afterTrailingComma(types$1.parenR)) {
            this.unexpected();
          }
        }
      } else {
        node.options = null;
      }
    } else {
      node.options = null;
    }
  } else {
    if (!this.eat(types$1.parenR)) {
      var errorPos = this.start;
      if (this.eat(types$1.comma) && this.eat(types$1.parenR)) {
        this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
      } else {
        this.unexpected(errorPos);
      }
    }
  }
  return this.finishNode(node, "ImportExpression");
};
pp$5.parseImportMeta = function(node) {
  this.next();
  var containsEsc = this.containsEsc;
  node.property = this.parseIdent(true);
  if (node.property.name !== "meta") {
    this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'");
  }
  if (containsEsc) {
    this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters");
  }
  if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere) {
    this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module");
  }
  return this.finishNode(node, "MetaProperty");
};
pp$5.parseLiteral = function(value) {
  var node = this.startNode();
  node.value = value;
  node.raw = this.input.slice(this.start, this.end);
  if (node.raw.charCodeAt(node.raw.length - 1) === 110) {
    node.bigint = node.value != null ? node.value.toString() : node.raw.slice(0, -1).replace(/_/g, "");
  }
  this.next();
  return this.finishNode(node, "Literal");
};
pp$5.parseParenExpression = function() {
  this.expect(types$1.parenL);
  var val = this.parseExpression();
  this.expect(types$1.parenR);
  return val;
};
pp$5.shouldParseArrow = function(exprList) {
  return !this.canInsertSemicolon();
};
pp$5.parseParenAndDistinguishExpression = function(canBeArrow, forInit) {
  var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
  if (this.options.ecmaVersion >= 6) {
    this.next();
    var innerStartPos = this.start, innerStartLoc = this.startLoc;
    var exprList = [], first = true, lastIsComma = false;
    var refDestructuringErrors = new DestructuringErrors(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
    this.yieldPos = 0;
    this.awaitPos = 0;
    while (this.type !== types$1.parenR) {
      first ? first = false : this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(types$1.parenR, true)) {
        lastIsComma = true;
        break;
      } else if (this.type === types$1.ellipsis) {
        spreadStart = this.start;
        exprList.push(this.parseParenItem(this.parseRestBinding()));
        if (this.type === types$1.comma) {
          this.raiseRecoverable(
            this.start,
            "Comma is not permitted after the rest element"
          );
        }
        break;
      } else {
        exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
      }
    }
    var innerEndPos = this.lastTokEnd, innerEndLoc = this.lastTokEndLoc;
    this.expect(types$1.parenR);
    if (canBeArrow && this.shouldParseArrow(exprList) && this.eat(types$1.arrow)) {
      this.checkPatternErrors(refDestructuringErrors, false);
      this.checkYieldAwaitInDefaultParams();
      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      return this.parseParenArrowList(startPos, startLoc, exprList, forInit);
    }
    if (!exprList.length || lastIsComma) {
      this.unexpected(this.lastTokStart);
    }
    if (spreadStart) {
      this.unexpected(spreadStart);
    }
    this.checkExpressionErrors(refDestructuringErrors, true);
    this.yieldPos = oldYieldPos || this.yieldPos;
    this.awaitPos = oldAwaitPos || this.awaitPos;
    if (exprList.length > 1) {
      val = this.startNodeAt(innerStartPos, innerStartLoc);
      val.expressions = exprList;
      this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
    } else {
      val = exprList[0];
    }
  } else {
    val = this.parseParenExpression();
  }
  if (this.options.preserveParens) {
    var par = this.startNodeAt(startPos, startLoc);
    par.expression = val;
    return this.finishNode(par, "ParenthesizedExpression");
  } else {
    return val;
  }
};
pp$5.parseParenItem = function(item) {
  return item;
};
pp$5.parseParenArrowList = function(startPos, startLoc, exprList, forInit) {
  return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, false, forInit);
};
var empty = [];
pp$5.parseNew = function() {
  if (this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword new");
  }
  var node = this.startNode();
  this.next();
  if (this.options.ecmaVersion >= 6 && this.type === types$1.dot) {
    var meta = this.startNodeAt(node.start, node.loc && node.loc.start);
    meta.name = "new";
    node.meta = this.finishNode(meta, "Identifier");
    this.next();
    var containsEsc = this.containsEsc;
    node.property = this.parseIdent(true);
    if (node.property.name !== "target") {
      this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'");
    }
    if (containsEsc) {
      this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters");
    }
    if (!this.allowNewDotTarget) {
      this.raiseRecoverable(node.start, "'new.target' can only be used in functions and class static block");
    }
    return this.finishNode(node, "MetaProperty");
  }
  var startPos = this.start, startLoc = this.startLoc;
  node.callee = this.parseSubscripts(this.parseExprAtom(null, false, true), startPos, startLoc, true, false);
  if (this.eat(types$1.parenL)) {
    node.arguments = this.parseExprList(types$1.parenR, this.options.ecmaVersion >= 8, false);
  } else {
    node.arguments = empty;
  }
  return this.finishNode(node, "NewExpression");
};
pp$5.parseTemplateElement = function(ref2) {
  var isTagged = ref2.isTagged;
  var elem = this.startNode();
  if (this.type === types$1.invalidTemplate) {
    if (!isTagged) {
      this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
    }
    elem.value = {
      raw: this.value.replace(/\r\n?/g, "\n"),
      cooked: null
    };
  } else {
    elem.value = {
      raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
      cooked: this.value
    };
  }
  this.next();
  elem.tail = this.type === types$1.backQuote;
  return this.finishNode(elem, "TemplateElement");
};
pp$5.parseTemplate = function(ref2) {
  if (ref2 === void 0) ref2 = {};
  var isTagged = ref2.isTagged;
  if (isTagged === void 0) isTagged = false;
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement({ isTagged });
  node.quasis = [curElt];
  while (!curElt.tail) {
    if (this.type === types$1.eof) {
      this.raise(this.pos, "Unterminated template literal");
    }
    this.expect(types$1.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(types$1.braceR);
    node.quasis.push(curElt = this.parseTemplateElement({ isTagged }));
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
};
pp$5.isAsyncProp = function(prop) {
  return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" && (this.type === types$1.name || this.type === types$1.num || this.type === types$1.string || this.type === types$1.bracketL || this.type.keyword || this.options.ecmaVersion >= 9 && this.type === types$1.star) && !lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
};
pp$5.parseObj = function(isPattern, refDestructuringErrors) {
  var node = this.startNode(), first = true, propHash = {};
  node.properties = [];
  this.next();
  while (!this.eat(types$1.braceR)) {
    if (!first) {
      this.expect(types$1.comma);
      if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types$1.braceR)) {
        break;
      }
    } else {
      first = false;
    }
    var prop = this.parseProperty(isPattern, refDestructuringErrors);
    if (!isPattern) {
      this.checkPropClash(prop, propHash, refDestructuringErrors);
    }
    node.properties.push(prop);
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
};
pp$5.parseProperty = function(isPattern, refDestructuringErrors) {
  var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
  if (this.options.ecmaVersion >= 9 && this.eat(types$1.ellipsis)) {
    if (isPattern) {
      prop.argument = this.parseIdent(false);
      if (this.type === types$1.comma) {
        this.raiseRecoverable(this.start, "Comma is not permitted after the rest element");
      }
      return this.finishNode(prop, "RestElement");
    }
    prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
    if (this.type === types$1.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
      refDestructuringErrors.trailingComma = this.start;
    }
    return this.finishNode(prop, "SpreadElement");
  }
  if (this.options.ecmaVersion >= 6) {
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refDestructuringErrors) {
      startPos = this.start;
      startLoc = this.startLoc;
    }
    if (!isPattern) {
      isGenerator = this.eat(types$1.star);
    }
  }
  var containsEsc = this.containsEsc;
  this.parsePropertyName(prop);
  if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
    isAsync = true;
    isGenerator = this.options.ecmaVersion >= 9 && this.eat(types$1.star);
    this.parsePropertyName(prop);
  } else {
    isAsync = false;
  }
  this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
  return this.finishNode(prop, "Property");
};
pp$5.parseGetterSetter = function(prop) {
  var kind = prop.key.name;
  this.parsePropertyName(prop);
  prop.value = this.parseMethod(false);
  prop.kind = kind;
  var paramCount = prop.kind === "get" ? 0 : 1;
  if (prop.value.params.length !== paramCount) {
    var start = prop.value.start;
    if (prop.kind === "get") {
      this.raiseRecoverable(start, "getter should have no params");
    } else {
      this.raiseRecoverable(start, "setter should have exactly one param");
    }
  } else {
    if (prop.kind === "set" && prop.value.params[0].type === "RestElement") {
      this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params");
    }
  }
};
pp$5.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
  if ((isGenerator || isAsync) && this.type === types$1.colon) {
    this.unexpected();
  }
  if (this.eat(types$1.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
    prop.kind = "init";
  } else if (this.options.ecmaVersion >= 6 && this.type === types$1.parenL) {
    if (isPattern) {
      this.unexpected();
    }
    prop.method = true;
    prop.value = this.parseMethod(isGenerator, isAsync);
    prop.kind = "init";
  } else if (!isPattern && !containsEsc && this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type !== types$1.comma && this.type !== types$1.braceR && this.type !== types$1.eq)) {
    if (isGenerator || isAsync) {
      this.unexpected();
    }
    this.parseGetterSetter(prop);
  } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
    if (isGenerator || isAsync) {
      this.unexpected();
    }
    this.checkUnreserved(prop.key);
    if (prop.key.name === "await" && !this.awaitIdentPos) {
      this.awaitIdentPos = startPos;
    }
    if (isPattern) {
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else if (this.type === types$1.eq && refDestructuringErrors) {
      if (refDestructuringErrors.shorthandAssign < 0) {
        refDestructuringErrors.shorthandAssign = this.start;
      }
      prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
    } else {
      prop.value = this.copyNode(prop.key);
    }
    prop.kind = "init";
    prop.shorthand = true;
  } else {
    this.unexpected();
  }
};
pp$5.parsePropertyName = function(prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(types$1.bracketL)) {
      prop.computed = true;
      prop.key = this.parseMaybeAssign();
      this.expect(types$1.bracketR);
      return prop.key;
    } else {
      prop.computed = false;
    }
  }
  return prop.key = this.type === types$1.num || this.type === types$1.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
};
pp$5.initFunction = function(node) {
  node.id = null;
  if (this.options.ecmaVersion >= 6) {
    node.generator = node.expression = false;
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = false;
  }
};
pp$5.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
  var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6) {
    node.generator = isGenerator;
  }
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));
  this.expect(types$1.parenL);
  node.params = this.parseBindingList(types$1.parenR, false, this.options.ecmaVersion >= 8);
  this.checkYieldAwaitInDefaultParams();
  this.parseFunctionBody(node, false, true, false);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "FunctionExpression");
};
pp$5.parseArrowExpression = function(node, params, isAsync, forInit) {
  var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
  this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
  this.initFunction(node);
  if (this.options.ecmaVersion >= 8) {
    node.async = !!isAsync;
  }
  this.yieldPos = 0;
  this.awaitPos = 0;
  this.awaitIdentPos = 0;
  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true, false, forInit);
  this.yieldPos = oldYieldPos;
  this.awaitPos = oldAwaitPos;
  this.awaitIdentPos = oldAwaitIdentPos;
  return this.finishNode(node, "ArrowFunctionExpression");
};
pp$5.parseFunctionBody = function(node, isArrowFunction, isMethod, forInit) {
  var isExpression = isArrowFunction && this.type !== types$1.braceL;
  var oldStrict = this.strict, useStrict = false;
  if (isExpression) {
    node.body = this.parseMaybeAssign(forInit);
    node.expression = true;
    this.checkParams(node, false);
  } else {
    var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
    if (!oldStrict || nonSimple) {
      useStrict = this.strictDirective(this.end);
      if (useStrict && nonSimple) {
        this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list");
      }
    }
    var oldLabels = this.labels;
    this.labels = [];
    if (useStrict) {
      this.strict = true;
    }
    this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
    if (this.strict && node.id) {
      this.checkLValSimple(node.id, BIND_OUTSIDE);
    }
    node.body = this.parseBlock(false, void 0, useStrict && !oldStrict);
    node.expression = false;
    this.adaptDirectivePrologue(node.body.body);
    this.labels = oldLabels;
  }
  this.exitScope();
};
pp$5.isSimpleParamList = function(params) {
  for (var i = 0, list2 = params; i < list2.length; i += 1) {
    var param = list2[i];
    if (param.type !== "Identifier") {
      return false;
    }
  }
  return true;
};
pp$5.checkParams = function(node, allowDuplicates) {
  var nameHash = /* @__PURE__ */ Object.create(null);
  for (var i = 0, list2 = node.params; i < list2.length; i += 1) {
    var param = list2[i];
    this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
  }
};
pp$5.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
  var elts = [], first = true;
  while (!this.eat(close)) {
    if (!first) {
      this.expect(types$1.comma);
      if (allowTrailingComma && this.afterTrailingComma(close)) {
        break;
      }
    } else {
      first = false;
    }
    var elt = void 0;
    if (allowEmpty && this.type === types$1.comma) {
      elt = null;
    } else if (this.type === types$1.ellipsis) {
      elt = this.parseSpread(refDestructuringErrors);
      if (refDestructuringErrors && this.type === types$1.comma && refDestructuringErrors.trailingComma < 0) {
        refDestructuringErrors.trailingComma = this.start;
      }
    } else {
      elt = this.parseMaybeAssign(false, refDestructuringErrors);
    }
    elts.push(elt);
  }
  return elts;
};
pp$5.checkUnreserved = function(ref2) {
  var start = ref2.start;
  var end = ref2.end;
  var name2 = ref2.name;
  if (this.inGenerator && name2 === "yield") {
    this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator");
  }
  if (this.inAsync && name2 === "await") {
    this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function");
  }
  if (!(this.currentThisScope().flags & SCOPE_VAR) && name2 === "arguments") {
    this.raiseRecoverable(start, "Cannot use 'arguments' in class field initializer");
  }
  if (this.inClassStaticBlock && (name2 === "arguments" || name2 === "await")) {
    this.raise(start, "Cannot use " + name2 + " in class static initialization block");
  }
  if (this.keywords.test(name2)) {
    this.raise(start, "Unexpected keyword '" + name2 + "'");
  }
  if (this.options.ecmaVersion < 6 && this.input.slice(start, end).indexOf("\\") !== -1) {
    return;
  }
  var re2 = this.strict ? this.reservedWordsStrict : this.reservedWords;
  if (re2.test(name2)) {
    if (!this.inAsync && name2 === "await") {
      this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function");
    }
    this.raiseRecoverable(start, "The keyword '" + name2 + "' is reserved");
  }
};
pp$5.parseIdent = function(liberal) {
  var node = this.parseIdentNode();
  this.next(!!liberal);
  this.finishNode(node, "Identifier");
  if (!liberal) {
    this.checkUnreserved(node);
    if (node.name === "await" && !this.awaitIdentPos) {
      this.awaitIdentPos = node.start;
    }
  }
  return node;
};
pp$5.parseIdentNode = function() {
  var node = this.startNode();
  if (this.type === types$1.name) {
    node.name = this.value;
  } else if (this.type.keyword) {
    node.name = this.type.keyword;
    if ((node.name === "class" || node.name === "function") && (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
      this.context.pop();
    }
    this.type = types$1.name;
  } else {
    this.unexpected();
  }
  return node;
};
pp$5.parsePrivateIdent = function() {
  var node = this.startNode();
  if (this.type === types$1.privateId) {
    node.name = this.value;
  } else {
    this.unexpected();
  }
  this.next();
  this.finishNode(node, "PrivateIdentifier");
  if (this.options.checkPrivateFields) {
    if (this.privateNameStack.length === 0) {
      this.raise(node.start, "Private field '#" + node.name + "' must be declared in an enclosing class");
    } else {
      this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
    }
  }
  return node;
};
pp$5.parseYield = function(forInit) {
  if (!this.yieldPos) {
    this.yieldPos = this.start;
  }
  var node = this.startNode();
  this.next();
  if (this.type === types$1.semi || this.canInsertSemicolon() || this.type !== types$1.star && !this.type.startsExpr) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(types$1.star);
    node.argument = this.parseMaybeAssign(forInit);
  }
  return this.finishNode(node, "YieldExpression");
};
pp$5.parseAwait = function(forInit) {
  if (!this.awaitPos) {
    this.awaitPos = this.start;
  }
  var node = this.startNode();
  this.next();
  node.argument = this.parseMaybeUnary(null, true, false, forInit);
  return this.finishNode(node, "AwaitExpression");
};
var pp$4 = Parser.prototype;
pp$4.raise = function(pos, message) {
  var loc = getLineInfo(this.input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  if (this.sourceFile) {
    message += " in " + this.sourceFile;
  }
  var err = new SyntaxError(message);
  err.pos = pos;
  err.loc = loc;
  err.raisedAt = this.pos;
  throw err;
};
pp$4.raiseRecoverable = pp$4.raise;
pp$4.curPosition = function() {
  if (this.options.locations) {
    return new Position(this.curLine, this.pos - this.lineStart);
  }
};
var pp$3 = Parser.prototype;
var Scope = function Scope2(flags) {
  this.flags = flags;
  this.var = [];
  this.lexical = [];
  this.functions = [];
};
pp$3.enterScope = function(flags) {
  this.scopeStack.push(new Scope(flags));
};
pp$3.exitScope = function() {
  this.scopeStack.pop();
};
pp$3.treatFunctionsAsVarInScope = function(scope) {
  return scope.flags & SCOPE_FUNCTION || !this.inModule && scope.flags & SCOPE_TOP;
};
pp$3.declareName = function(name2, bindingType, pos) {
  var redeclared = false;
  if (bindingType === BIND_LEXICAL) {
    var scope = this.currentScope();
    redeclared = scope.lexical.indexOf(name2) > -1 || scope.functions.indexOf(name2) > -1 || scope.var.indexOf(name2) > -1;
    scope.lexical.push(name2);
    if (this.inModule && scope.flags & SCOPE_TOP) {
      delete this.undefinedExports[name2];
    }
  } else if (bindingType === BIND_SIMPLE_CATCH) {
    var scope$1 = this.currentScope();
    scope$1.lexical.push(name2);
  } else if (bindingType === BIND_FUNCTION) {
    var scope$2 = this.currentScope();
    if (this.treatFunctionsAsVar) {
      redeclared = scope$2.lexical.indexOf(name2) > -1;
    } else {
      redeclared = scope$2.lexical.indexOf(name2) > -1 || scope$2.var.indexOf(name2) > -1;
    }
    scope$2.functions.push(name2);
  } else {
    for (var i = this.scopeStack.length - 1; i >= 0; --i) {
      var scope$3 = this.scopeStack[i];
      if (scope$3.lexical.indexOf(name2) > -1 && !(scope$3.flags & SCOPE_SIMPLE_CATCH && scope$3.lexical[0] === name2) || !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name2) > -1) {
        redeclared = true;
        break;
      }
      scope$3.var.push(name2);
      if (this.inModule && scope$3.flags & SCOPE_TOP) {
        delete this.undefinedExports[name2];
      }
      if (scope$3.flags & SCOPE_VAR) {
        break;
      }
    }
  }
  if (redeclared) {
    this.raiseRecoverable(pos, "Identifier '" + name2 + "' has already been declared");
  }
};
pp$3.checkLocalExport = function(id) {
  if (this.scopeStack[0].lexical.indexOf(id.name) === -1 && this.scopeStack[0].var.indexOf(id.name) === -1) {
    this.undefinedExports[id.name] = id;
  }
};
pp$3.currentScope = function() {
  return this.scopeStack[this.scopeStack.length - 1];
};
pp$3.currentVarScope = function() {
  for (var i = this.scopeStack.length - 1; ; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK)) {
      return scope;
    }
  }
};
pp$3.currentThisScope = function() {
  for (var i = this.scopeStack.length - 1; ; i--) {
    var scope = this.scopeStack[i];
    if (scope.flags & (SCOPE_VAR | SCOPE_CLASS_FIELD_INIT | SCOPE_CLASS_STATIC_BLOCK) && !(scope.flags & SCOPE_ARROW)) {
      return scope;
    }
  }
};
var Node = function Node2(parser, pos, loc) {
  this.type = "";
  this.start = pos;
  this.end = 0;
  if (parser.options.locations) {
    this.loc = new SourceLocation(parser, loc);
  }
  if (parser.options.directSourceFile) {
    this.sourceFile = parser.options.directSourceFile;
  }
  if (parser.options.ranges) {
    this.range = [pos, 0];
  }
};
var pp$2 = Parser.prototype;
pp$2.startNode = function() {
  return new Node(this, this.start, this.startLoc);
};
pp$2.startNodeAt = function(pos, loc) {
  return new Node(this, pos, loc);
};
function finishNodeAt(node, type, pos, loc) {
  node.type = type;
  node.end = pos;
  if (this.options.locations) {
    node.loc.end = loc;
  }
  if (this.options.ranges) {
    node.range[1] = pos;
  }
  return node;
}
pp$2.finishNode = function(node, type) {
  return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
};
pp$2.finishNodeAt = function(node, type, pos, loc) {
  return finishNodeAt.call(this, node, type, pos, loc);
};
pp$2.copyNode = function(node) {
  var newNode = new Node(this, node.start, this.startLoc);
  for (var prop in node) {
    newNode[prop] = node[prop];
  }
  return newNode;
};
var scriptValuesAddedInUnicode = "Berf Beria_Erfe Gara Garay Gukh Gurung_Khema Hrkt Katakana_Or_Hiragana Kawi Kirat_Rai Krai Nag_Mundari Nagm Ol_Onal Onao Sidetic Sidt Sunu Sunuwar Tai_Yo Tayo Todhri Todr Tolong_Siki Tols Tulu_Tigalari Tutg Unknown Zzzz";
var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
var ecma11BinaryProperties = ecma10BinaryProperties;
var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
var ecma13BinaryProperties = ecma12BinaryProperties;
var ecma14BinaryProperties = ecma13BinaryProperties;
var unicodeBinaryProperties = {
  9: ecma9BinaryProperties,
  10: ecma10BinaryProperties,
  11: ecma11BinaryProperties,
  12: ecma12BinaryProperties,
  13: ecma13BinaryProperties,
  14: ecma14BinaryProperties
};
var ecma14BinaryPropertiesOfStrings = "Basic_Emoji Emoji_Keycap_Sequence RGI_Emoji_Modifier_Sequence RGI_Emoji_Flag_Sequence RGI_Emoji_Tag_Sequence RGI_Emoji_ZWJ_Sequence RGI_Emoji";
var unicodeBinaryPropertiesOfStrings = {
  9: "",
  10: "",
  11: "",
  12: "",
  13: "",
  14: ecma14BinaryPropertiesOfStrings
};
var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";
var ecma9ScriptValues = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
var ecma13ScriptValues = ecma12ScriptValues + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith";
var ecma14ScriptValues = ecma13ScriptValues + " " + scriptValuesAddedInUnicode;
var unicodeScriptValues = {
  9: ecma9ScriptValues,
  10: ecma10ScriptValues,
  11: ecma11ScriptValues,
  12: ecma12ScriptValues,
  13: ecma13ScriptValues,
  14: ecma14ScriptValues
};
var data = {};
function buildUnicodeData(ecmaVersion) {
  var d = data[ecmaVersion] = {
    binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
    binaryOfStrings: wordsRegexp(unicodeBinaryPropertiesOfStrings[ecmaVersion]),
    nonBinary: {
      General_Category: wordsRegexp(unicodeGeneralCategoryValues),
      Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
    }
  };
  d.nonBinary.Script_Extensions = d.nonBinary.Script;
  d.nonBinary.gc = d.nonBinary.General_Category;
  d.nonBinary.sc = d.nonBinary.Script;
  d.nonBinary.scx = d.nonBinary.Script_Extensions;
}
for (var i = 0, list$1 = [9, 10, 11, 12, 13, 14]; i < list$1.length; i += 1) {
  var ecmaVersion = list$1[i];
  buildUnicodeData(ecmaVersion);
}
var pp$1 = Parser.prototype;
var BranchID = function BranchID2(parent, base) {
  this.parent = parent;
  this.base = base || this;
};
BranchID.prototype.separatedFrom = function separatedFrom(alt) {
  for (var self2 = this; self2; self2 = self2.parent) {
    for (var other = alt; other; other = other.parent) {
      if (self2.base === other.base && self2 !== other) {
        return true;
      }
    }
  }
  return false;
};
BranchID.prototype.sibling = function sibling() {
  return new BranchID(this.parent, this.base);
};
var RegExpValidationState = function RegExpValidationState2(parser) {
  this.parser = parser;
  this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "") + (parser.options.ecmaVersion >= 15 ? "v" : "");
  this.unicodeProperties = data[parser.options.ecmaVersion >= 14 ? 14 : parser.options.ecmaVersion];
  this.source = "";
  this.flags = "";
  this.start = 0;
  this.switchU = false;
  this.switchV = false;
  this.switchN = false;
  this.pos = 0;
  this.lastIntValue = 0;
  this.lastStringValue = "";
  this.lastAssertionIsQuantifiable = false;
  this.numCapturingParens = 0;
  this.maxBackReference = 0;
  this.groupNames = /* @__PURE__ */ Object.create(null);
  this.backReferenceNames = [];
  this.branchID = null;
};
RegExpValidationState.prototype.reset = function reset(start, pattern, flags) {
  var unicodeSets = flags.indexOf("v") !== -1;
  var unicode = flags.indexOf("u") !== -1;
  this.start = start | 0;
  this.source = pattern + "";
  this.flags = flags;
  if (unicodeSets && this.parser.options.ecmaVersion >= 15) {
    this.switchU = true;
    this.switchV = true;
    this.switchN = true;
  } else {
    this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
    this.switchV = false;
    this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
  }
};
RegExpValidationState.prototype.raise = function raise(message) {
  this.parser.raiseRecoverable(this.start, "Invalid regular expression: /" + this.source + "/: " + message);
};
RegExpValidationState.prototype.at = function at(i, forceU) {
  if (forceU === void 0) forceU = false;
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return -1;
  }
  var c = s.charCodeAt(i);
  if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l) {
    return c;
  }
  var next = s.charCodeAt(i + 1);
  return next >= 56320 && next <= 57343 ? (c << 10) + next - 56613888 : c;
};
RegExpValidationState.prototype.nextIndex = function nextIndex(i, forceU) {
  if (forceU === void 0) forceU = false;
  var s = this.source;
  var l = s.length;
  if (i >= l) {
    return l;
  }
  var c = s.charCodeAt(i), next;
  if (!(forceU || this.switchU) || c <= 55295 || c >= 57344 || i + 1 >= l || (next = s.charCodeAt(i + 1)) < 56320 || next > 57343) {
    return i + 1;
  }
  return i + 2;
};
RegExpValidationState.prototype.current = function current(forceU) {
  if (forceU === void 0) forceU = false;
  return this.at(this.pos, forceU);
};
RegExpValidationState.prototype.lookahead = function lookahead(forceU) {
  if (forceU === void 0) forceU = false;
  return this.at(this.nextIndex(this.pos, forceU), forceU);
};
RegExpValidationState.prototype.advance = function advance(forceU) {
  if (forceU === void 0) forceU = false;
  this.pos = this.nextIndex(this.pos, forceU);
};
RegExpValidationState.prototype.eat = function eat(ch, forceU) {
  if (forceU === void 0) forceU = false;
  if (this.current(forceU) === ch) {
    this.advance(forceU);
    return true;
  }
  return false;
};
RegExpValidationState.prototype.eatChars = function eatChars(chs, forceU) {
  if (forceU === void 0) forceU = false;
  var pos = this.pos;
  for (var i = 0, list2 = chs; i < list2.length; i += 1) {
    var ch = list2[i];
    var current2 = this.at(pos, forceU);
    if (current2 === -1 || current2 !== ch) {
      return false;
    }
    pos = this.nextIndex(pos, forceU);
  }
  this.pos = pos;
  return true;
};
pp$1.validateRegExpFlags = function(state) {
  var validFlags = state.validFlags;
  var flags = state.flags;
  var u = false;
  var v = false;
  for (var i = 0; i < flags.length; i++) {
    var flag = flags.charAt(i);
    if (validFlags.indexOf(flag) === -1) {
      this.raise(state.start, "Invalid regular expression flag");
    }
    if (flags.indexOf(flag, i + 1) > -1) {
      this.raise(state.start, "Duplicate regular expression flag");
    }
    if (flag === "u") {
      u = true;
    }
    if (flag === "v") {
      v = true;
    }
  }
  if (this.options.ecmaVersion >= 15 && u && v) {
    this.raise(state.start, "Invalid regular expression flag");
  }
};
function hasProp(obj) {
  for (var _ in obj) {
    return true;
  }
  return false;
}
pp$1.validateRegExpPattern = function(state) {
  this.regexp_pattern(state);
  if (!state.switchN && this.options.ecmaVersion >= 9 && hasProp(state.groupNames)) {
    state.switchN = true;
    this.regexp_pattern(state);
  }
};
pp$1.regexp_pattern = function(state) {
  state.pos = 0;
  state.lastIntValue = 0;
  state.lastStringValue = "";
  state.lastAssertionIsQuantifiable = false;
  state.numCapturingParens = 0;
  state.maxBackReference = 0;
  state.groupNames = /* @__PURE__ */ Object.create(null);
  state.backReferenceNames.length = 0;
  state.branchID = null;
  this.regexp_disjunction(state);
  if (state.pos !== state.source.length) {
    if (state.eat(
      41
      /* ) */
    )) {
      state.raise("Unmatched ')'");
    }
    if (state.eat(
      93
      /* ] */
    ) || state.eat(
      125
      /* } */
    )) {
      state.raise("Lone quantifier brackets");
    }
  }
  if (state.maxBackReference > state.numCapturingParens) {
    state.raise("Invalid escape");
  }
  for (var i = 0, list2 = state.backReferenceNames; i < list2.length; i += 1) {
    var name2 = list2[i];
    if (!state.groupNames[name2]) {
      state.raise("Invalid named capture referenced");
    }
  }
};
pp$1.regexp_disjunction = function(state) {
  var trackDisjunction = this.options.ecmaVersion >= 16;
  if (trackDisjunction) {
    state.branchID = new BranchID(state.branchID, null);
  }
  this.regexp_alternative(state);
  while (state.eat(
    124
    /* | */
  )) {
    if (trackDisjunction) {
      state.branchID = state.branchID.sibling();
    }
    this.regexp_alternative(state);
  }
  if (trackDisjunction) {
    state.branchID = state.branchID.parent;
  }
  if (this.regexp_eatQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  if (state.eat(
    123
    /* { */
  )) {
    state.raise("Lone quantifier brackets");
  }
};
pp$1.regexp_alternative = function(state) {
  while (state.pos < state.source.length && this.regexp_eatTerm(state)) {
  }
};
pp$1.regexp_eatTerm = function(state) {
  if (this.regexp_eatAssertion(state)) {
    if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
      if (state.switchU) {
        state.raise("Invalid quantifier");
      }
    }
    return true;
  }
  if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
    this.regexp_eatQuantifier(state);
    return true;
  }
  return false;
};
pp$1.regexp_eatAssertion = function(state) {
  var start = state.pos;
  state.lastAssertionIsQuantifiable = false;
  if (state.eat(
    94
    /* ^ */
  ) || state.eat(
    36
    /* $ */
  )) {
    return true;
  }
  if (state.eat(
    92
    /* \ */
  )) {
    if (state.eat(
      66
      /* B */
    ) || state.eat(
      98
      /* b */
    )) {
      return true;
    }
    state.pos = start;
  }
  if (state.eat(
    40
    /* ( */
  ) && state.eat(
    63
    /* ? */
  )) {
    var lookbehind = false;
    if (this.options.ecmaVersion >= 9) {
      lookbehind = state.eat(
        60
        /* < */
      );
    }
    if (state.eat(
      61
      /* = */
    ) || state.eat(
      33
      /* ! */
    )) {
      this.regexp_disjunction(state);
      if (!state.eat(
        41
        /* ) */
      )) {
        state.raise("Unterminated group");
      }
      state.lastAssertionIsQuantifiable = !lookbehind;
      return true;
    }
  }
  state.pos = start;
  return false;
};
pp$1.regexp_eatQuantifier = function(state, noError) {
  if (noError === void 0) noError = false;
  if (this.regexp_eatQuantifierPrefix(state, noError)) {
    state.eat(
      63
      /* ? */
    );
    return true;
  }
  return false;
};
pp$1.regexp_eatQuantifierPrefix = function(state, noError) {
  return state.eat(
    42
    /* * */
  ) || state.eat(
    43
    /* + */
  ) || state.eat(
    63
    /* ? */
  ) || this.regexp_eatBracedQuantifier(state, noError);
};
pp$1.regexp_eatBracedQuantifier = function(state, noError) {
  var start = state.pos;
  if (state.eat(
    123
    /* { */
  )) {
    var min2 = 0, max2 = -1;
    if (this.regexp_eatDecimalDigits(state)) {
      min2 = state.lastIntValue;
      if (state.eat(
        44
        /* , */
      ) && this.regexp_eatDecimalDigits(state)) {
        max2 = state.lastIntValue;
      }
      if (state.eat(
        125
        /* } */
      )) {
        if (max2 !== -1 && max2 < min2 && !noError) {
          state.raise("numbers out of order in {} quantifier");
        }
        return true;
      }
    }
    if (state.switchU && !noError) {
      state.raise("Incomplete quantifier");
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatAtom = function(state) {
  return this.regexp_eatPatternCharacters(state) || state.eat(
    46
    /* . */
  ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state);
};
pp$1.regexp_eatReverseSolidusAtomEscape = function(state) {
  var start = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatAtomEscape(state)) {
      return true;
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatUncapturingGroup = function(state) {
  var start = state.pos;
  if (state.eat(
    40
    /* ( */
  )) {
    if (state.eat(
      63
      /* ? */
    )) {
      if (this.options.ecmaVersion >= 16) {
        var addModifiers = this.regexp_eatModifiers(state);
        var hasHyphen = state.eat(
          45
          /* - */
        );
        if (addModifiers || hasHyphen) {
          for (var i = 0; i < addModifiers.length; i++) {
            var modifier = addModifiers.charAt(i);
            if (addModifiers.indexOf(modifier, i + 1) > -1) {
              state.raise("Duplicate regular expression modifiers");
            }
          }
          if (hasHyphen) {
            var removeModifiers = this.regexp_eatModifiers(state);
            if (!addModifiers && !removeModifiers && state.current() === 58) {
              state.raise("Invalid regular expression modifiers");
            }
            for (var i$1 = 0; i$1 < removeModifiers.length; i$1++) {
              var modifier$1 = removeModifiers.charAt(i$1);
              if (removeModifiers.indexOf(modifier$1, i$1 + 1) > -1 || addModifiers.indexOf(modifier$1) > -1) {
                state.raise("Duplicate regular expression modifiers");
              }
            }
          }
        }
      }
      if (state.eat(
        58
        /* : */
      )) {
        this.regexp_disjunction(state);
        if (state.eat(
          41
          /* ) */
        )) {
          return true;
        }
        state.raise("Unterminated group");
      }
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatCapturingGroup = function(state) {
  if (state.eat(
    40
    /* ( */
  )) {
    if (this.options.ecmaVersion >= 9) {
      this.regexp_groupSpecifier(state);
    } else if (state.current() === 63) {
      state.raise("Invalid group");
    }
    this.regexp_disjunction(state);
    if (state.eat(
      41
      /* ) */
    )) {
      state.numCapturingParens += 1;
      return true;
    }
    state.raise("Unterminated group");
  }
  return false;
};
pp$1.regexp_eatModifiers = function(state) {
  var modifiers = "";
  var ch = 0;
  while ((ch = state.current()) !== -1 && isRegularExpressionModifier(ch)) {
    modifiers += codePointToString(ch);
    state.advance();
  }
  return modifiers;
};
function isRegularExpressionModifier(ch) {
  return ch === 105 || ch === 109 || ch === 115;
}
pp$1.regexp_eatExtendedAtom = function(state) {
  return state.eat(
    46
    /* . */
  ) || this.regexp_eatReverseSolidusAtomEscape(state) || this.regexp_eatCharacterClass(state) || this.regexp_eatUncapturingGroup(state) || this.regexp_eatCapturingGroup(state) || this.regexp_eatInvalidBracedQuantifier(state) || this.regexp_eatExtendedPatternCharacter(state);
};
pp$1.regexp_eatInvalidBracedQuantifier = function(state) {
  if (this.regexp_eatBracedQuantifier(state, true)) {
    state.raise("Nothing to repeat");
  }
  return false;
};
pp$1.regexp_eatSyntaxCharacter = function(state) {
  var ch = state.current();
  if (isSyntaxCharacter(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
function isSyntaxCharacter(ch) {
  return ch === 36 || ch >= 40 && ch <= 43 || ch === 46 || ch === 63 || ch >= 91 && ch <= 94 || ch >= 123 && ch <= 125;
}
pp$1.regexp_eatPatternCharacters = function(state) {
  var start = state.pos;
  var ch = 0;
  while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
    state.advance();
  }
  return state.pos !== start;
};
pp$1.regexp_eatExtendedPatternCharacter = function(state) {
  var ch = state.current();
  if (ch !== -1 && ch !== 36 && !(ch >= 40 && ch <= 43) && ch !== 46 && ch !== 63 && ch !== 91 && ch !== 94 && ch !== 124) {
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_groupSpecifier = function(state) {
  if (state.eat(
    63
    /* ? */
  )) {
    if (!this.regexp_eatGroupName(state)) {
      state.raise("Invalid group");
    }
    var trackDisjunction = this.options.ecmaVersion >= 16;
    var known = state.groupNames[state.lastStringValue];
    if (known) {
      if (trackDisjunction) {
        for (var i = 0, list2 = known; i < list2.length; i += 1) {
          var altID = list2[i];
          if (!altID.separatedFrom(state.branchID)) {
            state.raise("Duplicate capture group name");
          }
        }
      } else {
        state.raise("Duplicate capture group name");
      }
    }
    if (trackDisjunction) {
      (known || (state.groupNames[state.lastStringValue] = [])).push(state.branchID);
    } else {
      state.groupNames[state.lastStringValue] = true;
    }
  }
};
pp$1.regexp_eatGroupName = function(state) {
  state.lastStringValue = "";
  if (state.eat(
    60
    /* < */
  )) {
    if (this.regexp_eatRegExpIdentifierName(state) && state.eat(
      62
      /* > */
    )) {
      return true;
    }
    state.raise("Invalid capture group name");
  }
  return false;
};
pp$1.regexp_eatRegExpIdentifierName = function(state) {
  state.lastStringValue = "";
  if (this.regexp_eatRegExpIdentifierStart(state)) {
    state.lastStringValue += codePointToString(state.lastIntValue);
    while (this.regexp_eatRegExpIdentifierPart(state)) {
      state.lastStringValue += codePointToString(state.lastIntValue);
    }
    return true;
  }
  return false;
};
pp$1.regexp_eatRegExpIdentifierStart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);
  if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierStart(ch)) {
    state.lastIntValue = ch;
    return true;
  }
  state.pos = start;
  return false;
};
function isRegExpIdentifierStart(ch) {
  return isIdentifierStart(ch, true) || ch === 36 || ch === 95;
}
pp$1.regexp_eatRegExpIdentifierPart = function(state) {
  var start = state.pos;
  var forceU = this.options.ecmaVersion >= 11;
  var ch = state.current(forceU);
  state.advance(forceU);
  if (ch === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
    ch = state.lastIntValue;
  }
  if (isRegExpIdentifierPart(ch)) {
    state.lastIntValue = ch;
    return true;
  }
  state.pos = start;
  return false;
};
function isRegExpIdentifierPart(ch) {
  return isIdentifierChar(ch, true) || ch === 36 || ch === 95 || ch === 8204 || ch === 8205;
}
pp$1.regexp_eatAtomEscape = function(state) {
  if (this.regexp_eatBackReference(state) || this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state) || state.switchN && this.regexp_eatKGroupName(state)) {
    return true;
  }
  if (state.switchU) {
    if (state.current() === 99) {
      state.raise("Invalid unicode escape");
    }
    state.raise("Invalid escape");
  }
  return false;
};
pp$1.regexp_eatBackReference = function(state) {
  var start = state.pos;
  if (this.regexp_eatDecimalEscape(state)) {
    var n = state.lastIntValue;
    if (state.switchU) {
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true;
    }
    if (n <= state.numCapturingParens) {
      return true;
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatKGroupName = function(state) {
  if (state.eat(
    107
    /* k */
  )) {
    if (this.regexp_eatGroupName(state)) {
      state.backReferenceNames.push(state.lastStringValue);
      return true;
    }
    state.raise("Invalid named reference");
  }
  return false;
};
pp$1.regexp_eatCharacterEscape = function(state) {
  return this.regexp_eatControlEscape(state) || this.regexp_eatCControlLetter(state) || this.regexp_eatZero(state) || this.regexp_eatHexEscapeSequence(state) || this.regexp_eatRegExpUnicodeEscapeSequence(state, false) || !state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state) || this.regexp_eatIdentityEscape(state);
};
pp$1.regexp_eatCControlLetter = function(state) {
  var start = state.pos;
  if (state.eat(
    99
    /* c */
  )) {
    if (this.regexp_eatControlLetter(state)) {
      return true;
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatZero = function(state) {
  if (state.current() === 48 && !isDecimalDigit(state.lookahead())) {
    state.lastIntValue = 0;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatControlEscape = function(state) {
  var ch = state.current();
  if (ch === 116) {
    state.lastIntValue = 9;
    state.advance();
    return true;
  }
  if (ch === 110) {
    state.lastIntValue = 10;
    state.advance();
    return true;
  }
  if (ch === 118) {
    state.lastIntValue = 11;
    state.advance();
    return true;
  }
  if (ch === 102) {
    state.lastIntValue = 12;
    state.advance();
    return true;
  }
  if (ch === 114) {
    state.lastIntValue = 13;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatControlLetter = function(state) {
  var ch = state.current();
  if (isControlLetter(ch)) {
    state.lastIntValue = ch % 32;
    state.advance();
    return true;
  }
  return false;
};
function isControlLetter(ch) {
  return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122;
}
pp$1.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
  if (forceU === void 0) forceU = false;
  var start = state.pos;
  var switchU = forceU || state.switchU;
  if (state.eat(
    117
    /* u */
  )) {
    if (this.regexp_eatFixedHexDigits(state, 4)) {
      var lead = state.lastIntValue;
      if (switchU && lead >= 55296 && lead <= 56319) {
        var leadSurrogateEnd = state.pos;
        if (state.eat(
          92
          /* \ */
        ) && state.eat(
          117
          /* u */
        ) && this.regexp_eatFixedHexDigits(state, 4)) {
          var trail = state.lastIntValue;
          if (trail >= 56320 && trail <= 57343) {
            state.lastIntValue = (lead - 55296) * 1024 + (trail - 56320) + 65536;
            return true;
          }
        }
        state.pos = leadSurrogateEnd;
        state.lastIntValue = lead;
      }
      return true;
    }
    if (switchU && state.eat(
      123
      /* { */
    ) && this.regexp_eatHexDigits(state) && state.eat(
      125
      /* } */
    ) && isValidUnicode(state.lastIntValue)) {
      return true;
    }
    if (switchU) {
      state.raise("Invalid unicode escape");
    }
    state.pos = start;
  }
  return false;
};
function isValidUnicode(ch) {
  return ch >= 0 && ch <= 1114111;
}
pp$1.regexp_eatIdentityEscape = function(state) {
  if (state.switchU) {
    if (this.regexp_eatSyntaxCharacter(state)) {
      return true;
    }
    if (state.eat(
      47
      /* / */
    )) {
      state.lastIntValue = 47;
      return true;
    }
    return false;
  }
  var ch = state.current();
  if (ch !== 99 && (!state.switchN || ch !== 107)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatDecimalEscape = function(state) {
  state.lastIntValue = 0;
  var ch = state.current();
  if (ch >= 49 && ch <= 57) {
    do {
      state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
      state.advance();
    } while ((ch = state.current()) >= 48 && ch <= 57);
    return true;
  }
  return false;
};
var CharSetNone = 0;
var CharSetOk = 1;
var CharSetString = 2;
pp$1.regexp_eatCharacterClassEscape = function(state) {
  var ch = state.current();
  if (isCharacterClassEscape(ch)) {
    state.lastIntValue = -1;
    state.advance();
    return CharSetOk;
  }
  var negate = false;
  if (state.switchU && this.options.ecmaVersion >= 9 && ((negate = ch === 80) || ch === 112)) {
    state.lastIntValue = -1;
    state.advance();
    var result;
    if (state.eat(
      123
      /* { */
    ) && (result = this.regexp_eatUnicodePropertyValueExpression(state)) && state.eat(
      125
      /* } */
    )) {
      if (negate && result === CharSetString) {
        state.raise("Invalid property name");
      }
      return result;
    }
    state.raise("Invalid property name");
  }
  return CharSetNone;
};
function isCharacterClassEscape(ch) {
  return ch === 100 || ch === 68 || ch === 115 || ch === 83 || ch === 119 || ch === 87;
}
pp$1.regexp_eatUnicodePropertyValueExpression = function(state) {
  var start = state.pos;
  if (this.regexp_eatUnicodePropertyName(state) && state.eat(
    61
    /* = */
  )) {
    var name2 = state.lastStringValue;
    if (this.regexp_eatUnicodePropertyValue(state)) {
      var value = state.lastStringValue;
      this.regexp_validateUnicodePropertyNameAndValue(state, name2, value);
      return CharSetOk;
    }
  }
  state.pos = start;
  if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
    var nameOrValue = state.lastStringValue;
    return this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
  }
  return CharSetNone;
};
pp$1.regexp_validateUnicodePropertyNameAndValue = function(state, name2, value) {
  if (!hasOwn(state.unicodeProperties.nonBinary, name2)) {
    state.raise("Invalid property name");
  }
  if (!state.unicodeProperties.nonBinary[name2].test(value)) {
    state.raise("Invalid property value");
  }
};
pp$1.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
  if (state.unicodeProperties.binary.test(nameOrValue)) {
    return CharSetOk;
  }
  if (state.switchV && state.unicodeProperties.binaryOfStrings.test(nameOrValue)) {
    return CharSetString;
  }
  state.raise("Invalid property name");
};
pp$1.regexp_eatUnicodePropertyName = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyNameCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== "";
};
function isUnicodePropertyNameCharacter(ch) {
  return isControlLetter(ch) || ch === 95;
}
pp$1.regexp_eatUnicodePropertyValue = function(state) {
  var ch = 0;
  state.lastStringValue = "";
  while (isUnicodePropertyValueCharacter(ch = state.current())) {
    state.lastStringValue += codePointToString(ch);
    state.advance();
  }
  return state.lastStringValue !== "";
};
function isUnicodePropertyValueCharacter(ch) {
  return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch);
}
pp$1.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
  return this.regexp_eatUnicodePropertyValue(state);
};
pp$1.regexp_eatCharacterClass = function(state) {
  if (state.eat(
    91
    /* [ */
  )) {
    var negate = state.eat(
      94
      /* ^ */
    );
    var result = this.regexp_classContents(state);
    if (!state.eat(
      93
      /* ] */
    )) {
      state.raise("Unterminated character class");
    }
    if (negate && result === CharSetString) {
      state.raise("Negated character class may contain strings");
    }
    return true;
  }
  return false;
};
pp$1.regexp_classContents = function(state) {
  if (state.current() === 93) {
    return CharSetOk;
  }
  if (state.switchV) {
    return this.regexp_classSetExpression(state);
  }
  this.regexp_nonEmptyClassRanges(state);
  return CharSetOk;
};
pp$1.regexp_nonEmptyClassRanges = function(state) {
  while (this.regexp_eatClassAtom(state)) {
    var left = state.lastIntValue;
    if (state.eat(
      45
      /* - */
    ) && this.regexp_eatClassAtom(state)) {
      var right = state.lastIntValue;
      if (state.switchU && (left === -1 || right === -1)) {
        state.raise("Invalid character class");
      }
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
    }
  }
};
pp$1.regexp_eatClassAtom = function(state) {
  var start = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatClassEscape(state)) {
      return true;
    }
    if (state.switchU) {
      var ch$1 = state.current();
      if (ch$1 === 99 || isOctalDigit(ch$1)) {
        state.raise("Invalid class escape");
      }
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  var ch = state.current();
  if (ch !== 93) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatClassEscape = function(state) {
  var start = state.pos;
  if (state.eat(
    98
    /* b */
  )) {
    state.lastIntValue = 8;
    return true;
  }
  if (state.switchU && state.eat(
    45
    /* - */
  )) {
    state.lastIntValue = 45;
    return true;
  }
  if (!state.switchU && state.eat(
    99
    /* c */
  )) {
    if (this.regexp_eatClassControlLetter(state)) {
      return true;
    }
    state.pos = start;
  }
  return this.regexp_eatCharacterClassEscape(state) || this.regexp_eatCharacterEscape(state);
};
pp$1.regexp_classSetExpression = function(state) {
  var result = CharSetOk, subResult;
  if (this.regexp_eatClassSetRange(state)) ;
  else if (subResult = this.regexp_eatClassSetOperand(state)) {
    if (subResult === CharSetString) {
      result = CharSetString;
    }
    var start = state.pos;
    while (state.eatChars(
      [38, 38]
      /* && */
    )) {
      if (state.current() !== 38 && (subResult = this.regexp_eatClassSetOperand(state))) {
        if (subResult !== CharSetString) {
          result = CharSetOk;
        }
        continue;
      }
      state.raise("Invalid character in character class");
    }
    if (start !== state.pos) {
      return result;
    }
    while (state.eatChars(
      [45, 45]
      /* -- */
    )) {
      if (this.regexp_eatClassSetOperand(state)) {
        continue;
      }
      state.raise("Invalid character in character class");
    }
    if (start !== state.pos) {
      return result;
    }
  } else {
    state.raise("Invalid character in character class");
  }
  for (; ; ) {
    if (this.regexp_eatClassSetRange(state)) {
      continue;
    }
    subResult = this.regexp_eatClassSetOperand(state);
    if (!subResult) {
      return result;
    }
    if (subResult === CharSetString) {
      result = CharSetString;
    }
  }
};
pp$1.regexp_eatClassSetRange = function(state) {
  var start = state.pos;
  if (this.regexp_eatClassSetCharacter(state)) {
    var left = state.lastIntValue;
    if (state.eat(
      45
      /* - */
    ) && this.regexp_eatClassSetCharacter(state)) {
      var right = state.lastIntValue;
      if (left !== -1 && right !== -1 && left > right) {
        state.raise("Range out of order in character class");
      }
      return true;
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatClassSetOperand = function(state) {
  if (this.regexp_eatClassSetCharacter(state)) {
    return CharSetOk;
  }
  return this.regexp_eatClassStringDisjunction(state) || this.regexp_eatNestedClass(state);
};
pp$1.regexp_eatNestedClass = function(state) {
  var start = state.pos;
  if (state.eat(
    91
    /* [ */
  )) {
    var negate = state.eat(
      94
      /* ^ */
    );
    var result = this.regexp_classContents(state);
    if (state.eat(
      93
      /* ] */
    )) {
      if (negate && result === CharSetString) {
        state.raise("Negated character class may contain strings");
      }
      return result;
    }
    state.pos = start;
  }
  if (state.eat(
    92
    /* \ */
  )) {
    var result$1 = this.regexp_eatCharacterClassEscape(state);
    if (result$1) {
      return result$1;
    }
    state.pos = start;
  }
  return null;
};
pp$1.regexp_eatClassStringDisjunction = function(state) {
  var start = state.pos;
  if (state.eatChars(
    [92, 113]
    /* \q */
  )) {
    if (state.eat(
      123
      /* { */
    )) {
      var result = this.regexp_classStringDisjunctionContents(state);
      if (state.eat(
        125
        /* } */
      )) {
        return result;
      }
    } else {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return null;
};
pp$1.regexp_classStringDisjunctionContents = function(state) {
  var result = this.regexp_classString(state);
  while (state.eat(
    124
    /* | */
  )) {
    if (this.regexp_classString(state) === CharSetString) {
      result = CharSetString;
    }
  }
  return result;
};
pp$1.regexp_classString = function(state) {
  var count2 = 0;
  while (this.regexp_eatClassSetCharacter(state)) {
    count2++;
  }
  return count2 === 1 ? CharSetOk : CharSetString;
};
pp$1.regexp_eatClassSetCharacter = function(state) {
  var start = state.pos;
  if (state.eat(
    92
    /* \ */
  )) {
    if (this.regexp_eatCharacterEscape(state) || this.regexp_eatClassSetReservedPunctuator(state)) {
      return true;
    }
    if (state.eat(
      98
      /* b */
    )) {
      state.lastIntValue = 8;
      return true;
    }
    state.pos = start;
    return false;
  }
  var ch = state.current();
  if (ch < 0 || ch === state.lookahead() && isClassSetReservedDoublePunctuatorCharacter(ch)) {
    return false;
  }
  if (isClassSetSyntaxCharacter(ch)) {
    return false;
  }
  state.advance();
  state.lastIntValue = ch;
  return true;
};
function isClassSetReservedDoublePunctuatorCharacter(ch) {
  return ch === 33 || ch >= 35 && ch <= 38 || ch >= 42 && ch <= 44 || ch === 46 || ch >= 58 && ch <= 64 || ch === 94 || ch === 96 || ch === 126;
}
function isClassSetSyntaxCharacter(ch) {
  return ch === 40 || ch === 41 || ch === 45 || ch === 47 || ch >= 91 && ch <= 93 || ch >= 123 && ch <= 125;
}
pp$1.regexp_eatClassSetReservedPunctuator = function(state) {
  var ch = state.current();
  if (isClassSetReservedPunctuator(ch)) {
    state.lastIntValue = ch;
    state.advance();
    return true;
  }
  return false;
};
function isClassSetReservedPunctuator(ch) {
  return ch === 33 || ch === 35 || ch === 37 || ch === 38 || ch === 44 || ch === 45 || ch >= 58 && ch <= 62 || ch === 64 || ch === 96 || ch === 126;
}
pp$1.regexp_eatClassControlLetter = function(state) {
  var ch = state.current();
  if (isDecimalDigit(ch) || ch === 95) {
    state.lastIntValue = ch % 32;
    state.advance();
    return true;
  }
  return false;
};
pp$1.regexp_eatHexEscapeSequence = function(state) {
  var start = state.pos;
  if (state.eat(
    120
    /* x */
  )) {
    if (this.regexp_eatFixedHexDigits(state, 2)) {
      return true;
    }
    if (state.switchU) {
      state.raise("Invalid escape");
    }
    state.pos = start;
  }
  return false;
};
pp$1.regexp_eatDecimalDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isDecimalDigit(ch = state.current())) {
    state.lastIntValue = 10 * state.lastIntValue + (ch - 48);
    state.advance();
  }
  return state.pos !== start;
};
function isDecimalDigit(ch) {
  return ch >= 48 && ch <= 57;
}
pp$1.regexp_eatHexDigits = function(state) {
  var start = state.pos;
  var ch = 0;
  state.lastIntValue = 0;
  while (isHexDigit(ch = state.current())) {
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return state.pos !== start;
};
function isHexDigit(ch) {
  return ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102;
}
function hexToInt(ch) {
  if (ch >= 65 && ch <= 70) {
    return 10 + (ch - 65);
  }
  if (ch >= 97 && ch <= 102) {
    return 10 + (ch - 97);
  }
  return ch - 48;
}
pp$1.regexp_eatLegacyOctalEscapeSequence = function(state) {
  if (this.regexp_eatOctalDigit(state)) {
    var n1 = state.lastIntValue;
    if (this.regexp_eatOctalDigit(state)) {
      var n2 = state.lastIntValue;
      if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
        state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
      } else {
        state.lastIntValue = n1 * 8 + n2;
      }
    } else {
      state.lastIntValue = n1;
    }
    return true;
  }
  return false;
};
pp$1.regexp_eatOctalDigit = function(state) {
  var ch = state.current();
  if (isOctalDigit(ch)) {
    state.lastIntValue = ch - 48;
    state.advance();
    return true;
  }
  state.lastIntValue = 0;
  return false;
};
function isOctalDigit(ch) {
  return ch >= 48 && ch <= 55;
}
pp$1.regexp_eatFixedHexDigits = function(state, length2) {
  var start = state.pos;
  state.lastIntValue = 0;
  for (var i = 0; i < length2; ++i) {
    var ch = state.current();
    if (!isHexDigit(ch)) {
      state.pos = start;
      return false;
    }
    state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
    state.advance();
  }
  return true;
};
var Token = function Token2(p) {
  this.type = p.type;
  this.value = p.value;
  this.start = p.start;
  this.end = p.end;
  if (p.options.locations) {
    this.loc = new SourceLocation(p, p.startLoc, p.endLoc);
  }
  if (p.options.ranges) {
    this.range = [p.start, p.end];
  }
};
var pp = Parser.prototype;
pp.next = function(ignoreEscapeSequenceInKeyword) {
  if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc) {
    this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword);
  }
  if (this.options.onToken) {
    this.options.onToken(new Token(this));
  }
  this.lastTokEnd = this.end;
  this.lastTokStart = this.start;
  this.lastTokEndLoc = this.endLoc;
  this.lastTokStartLoc = this.startLoc;
  this.nextToken();
};
pp.getToken = function() {
  this.next();
  return new Token(this);
};
if (typeof Symbol !== "undefined") {
  pp[Symbol.iterator] = function() {
    var this$1$1 = this;
    return {
      next: function() {
        var token = this$1$1.getToken();
        return {
          done: token.type === types$1.eof,
          value: token
        };
      }
    };
  };
}
pp.nextToken = function() {
  var curContext = this.curContext();
  if (!curContext || !curContext.preserveSpace) {
    this.skipSpace();
  }
  this.start = this.pos;
  if (this.options.locations) {
    this.startLoc = this.curPosition();
  }
  if (this.pos >= this.input.length) {
    return this.finishToken(types$1.eof);
  }
  if (curContext.override) {
    return curContext.override(this);
  } else {
    this.readToken(this.fullCharCodeAtPos());
  }
};
pp.readToken = function(code) {
  if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92) {
    return this.readWord();
  }
  return this.getTokenFromCode(code);
};
pp.fullCharCodeAt = function(pos) {
  var code = this.input.charCodeAt(pos);
  if (code <= 55295 || code >= 56320) {
    return code;
  }
  var next = this.input.charCodeAt(pos + 1);
  return next <= 56319 || next >= 57344 ? code : (code << 10) + next - 56613888;
};
pp.fullCharCodeAtPos = function() {
  return this.fullCharCodeAt(this.pos);
};
pp.skipBlockComment = function() {
  var startLoc = this.options.onComment && this.curPosition();
  var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
  if (end === -1) {
    this.raise(this.pos - 2, "Unterminated comment");
  }
  this.pos = end + 2;
  if (this.options.locations) {
    for (var nextBreak = void 0, pos = start; (nextBreak = nextLineBreak(this.input, pos, this.pos)) > -1; ) {
      ++this.curLine;
      pos = this.lineStart = nextBreak;
    }
  }
  if (this.options.onComment) {
    this.options.onComment(
      true,
      this.input.slice(start + 2, end),
      start,
      this.pos,
      startLoc,
      this.curPosition()
    );
  }
};
pp.skipLineComment = function(startSkip) {
  var start = this.pos;
  var startLoc = this.options.onComment && this.curPosition();
  var ch = this.input.charCodeAt(this.pos += startSkip);
  while (this.pos < this.input.length && !isNewLine(ch)) {
    ch = this.input.charCodeAt(++this.pos);
  }
  if (this.options.onComment) {
    this.options.onComment(
      false,
      this.input.slice(start + startSkip, this.pos),
      start,
      this.pos,
      startLoc,
      this.curPosition()
    );
  }
};
pp.skipSpace = function() {
  loop: while (this.pos < this.input.length) {
    var ch = this.input.charCodeAt(this.pos);
    switch (ch) {
      case 32:
      case 160:
        ++this.pos;
        break;
      case 13:
        if (this.input.charCodeAt(this.pos + 1) === 10) {
          ++this.pos;
        }
      case 10:
      case 8232:
      case 8233:
        ++this.pos;
        if (this.options.locations) {
          ++this.curLine;
          this.lineStart = this.pos;
        }
        break;
      case 47:
        switch (this.input.charCodeAt(this.pos + 1)) {
          case 42:
            this.skipBlockComment();
            break;
          case 47:
            this.skipLineComment(2);
            break;
          default:
            break loop;
        }
        break;
      default:
        if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
          ++this.pos;
        } else {
          break loop;
        }
    }
  }
};
pp.finishToken = function(type, val) {
  this.end = this.pos;
  if (this.options.locations) {
    this.endLoc = this.curPosition();
  }
  var prevType = this.type;
  this.type = type;
  this.value = val;
  this.updateContext(prevType);
};
pp.readToken_dot = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next >= 48 && next <= 57) {
    return this.readNumber(true);
  }
  var next2 = this.input.charCodeAt(this.pos + 2);
  if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
    this.pos += 3;
    return this.finishToken(types$1.ellipsis);
  } else {
    ++this.pos;
    return this.finishToken(types$1.dot);
  }
};
pp.readToken_slash = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (this.exprAllowed) {
    ++this.pos;
    return this.readRegexp();
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.slash, 1);
};
pp.readToken_mult_modulo_exp = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  var tokentype = code === 42 ? types$1.star : types$1.modulo;
  if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
    ++size;
    tokentype = types$1.starstar;
    next = this.input.charCodeAt(this.pos + 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, size + 1);
  }
  return this.finishOp(tokentype, size);
};
pp.readToken_pipe_amp = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (this.options.ecmaVersion >= 12) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 === 61) {
        return this.finishOp(types$1.assign, 3);
      }
    }
    return this.finishOp(code === 124 ? types$1.logicalOR : types$1.logicalAND, 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(code === 124 ? types$1.bitwiseOR : types$1.bitwiseAND, 1);
};
pp.readToken_caret = function() {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.bitwiseXOR, 1);
};
pp.readToken_plus_min = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === code) {
    if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 && (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
      this.skipLineComment(3);
      this.skipSpace();
      return this.nextToken();
    }
    return this.finishOp(types$1.incDec, 2);
  }
  if (next === 61) {
    return this.finishOp(types$1.assign, 2);
  }
  return this.finishOp(types$1.plusMin, 1);
};
pp.readToken_lt_gt = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
    if (this.input.charCodeAt(this.pos + size) === 61) {
      return this.finishOp(types$1.assign, size + 1);
    }
    return this.finishOp(types$1.bitShift, size);
  }
  if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 && this.input.charCodeAt(this.pos + 3) === 45) {
    this.skipLineComment(4);
    this.skipSpace();
    return this.nextToken();
  }
  if (next === 61) {
    size = 2;
  }
  return this.finishOp(types$1.relational, size);
};
pp.readToken_eq_excl = function(code) {
  var next = this.input.charCodeAt(this.pos + 1);
  if (next === 61) {
    return this.finishOp(types$1.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
  }
  if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
    this.pos += 2;
    return this.finishToken(types$1.arrow);
  }
  return this.finishOp(code === 61 ? types$1.eq : types$1.prefix, 1);
};
pp.readToken_question = function() {
  var ecmaVersion = this.options.ecmaVersion;
  if (ecmaVersion >= 11) {
    var next = this.input.charCodeAt(this.pos + 1);
    if (next === 46) {
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (next2 < 48 || next2 > 57) {
        return this.finishOp(types$1.questionDot, 2);
      }
    }
    if (next === 63) {
      if (ecmaVersion >= 12) {
        var next2$1 = this.input.charCodeAt(this.pos + 2);
        if (next2$1 === 61) {
          return this.finishOp(types$1.assign, 3);
        }
      }
      return this.finishOp(types$1.coalesce, 2);
    }
  }
  return this.finishOp(types$1.question, 1);
};
pp.readToken_numberSign = function() {
  var ecmaVersion = this.options.ecmaVersion;
  var code = 35;
  if (ecmaVersion >= 13) {
    ++this.pos;
    code = this.fullCharCodeAtPos();
    if (isIdentifierStart(code, true) || code === 92) {
      return this.finishToken(types$1.privateId, this.readWord1());
    }
  }
  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};
pp.getTokenFromCode = function(code) {
  switch (code) {
    // The interpretation of a dot depends on whether it is followed
    // by a digit or another two dots.
    case 46:
      return this.readToken_dot();
    // Punctuation tokens.
    case 40:
      ++this.pos;
      return this.finishToken(types$1.parenL);
    case 41:
      ++this.pos;
      return this.finishToken(types$1.parenR);
    case 59:
      ++this.pos;
      return this.finishToken(types$1.semi);
    case 44:
      ++this.pos;
      return this.finishToken(types$1.comma);
    case 91:
      ++this.pos;
      return this.finishToken(types$1.bracketL);
    case 93:
      ++this.pos;
      return this.finishToken(types$1.bracketR);
    case 123:
      ++this.pos;
      return this.finishToken(types$1.braceL);
    case 125:
      ++this.pos;
      return this.finishToken(types$1.braceR);
    case 58:
      ++this.pos;
      return this.finishToken(types$1.colon);
    case 96:
      if (this.options.ecmaVersion < 6) {
        break;
      }
      ++this.pos;
      return this.finishToken(types$1.backQuote);
    case 48:
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 120 || next === 88) {
        return this.readRadixNumber(16);
      }
      if (this.options.ecmaVersion >= 6) {
        if (next === 111 || next === 79) {
          return this.readRadixNumber(8);
        }
        if (next === 98 || next === 66) {
          return this.readRadixNumber(2);
        }
      }
    // Anything else beginning with a digit is an integer, octal
    // number, or float.
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
      return this.readNumber(false);
    // Quotes produce strings.
    case 34:
    case 39:
      return this.readString(code);
    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.
    case 47:
      return this.readToken_slash();
    case 37:
    case 42:
      return this.readToken_mult_modulo_exp(code);
    case 124:
    case 38:
      return this.readToken_pipe_amp(code);
    case 94:
      return this.readToken_caret();
    case 43:
    case 45:
      return this.readToken_plus_min(code);
    case 60:
    case 62:
      return this.readToken_lt_gt(code);
    case 61:
    case 33:
      return this.readToken_eq_excl(code);
    case 63:
      return this.readToken_question();
    case 126:
      return this.finishOp(types$1.prefix, 1);
    case 35:
      return this.readToken_numberSign();
  }
  this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
};
pp.finishOp = function(type, size) {
  var str = this.input.slice(this.pos, this.pos + size);
  this.pos += size;
  return this.finishToken(type, str);
};
pp.readRegexp = function() {
  var escaped, inClass, start = this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(start, "Unterminated regular expression");
    }
    var ch = this.input.charAt(this.pos);
    if (lineBreak.test(ch)) {
      this.raise(start, "Unterminated regular expression");
    }
    if (!escaped) {
      if (ch === "[") {
        inClass = true;
      } else if (ch === "]" && inClass) {
        inClass = false;
      } else if (ch === "/" && !inClass) {
        break;
      }
      escaped = ch === "\\";
    } else {
      escaped = false;
    }
    ++this.pos;
  }
  var pattern = this.input.slice(start, this.pos);
  ++this.pos;
  var flagsStart = this.pos;
  var flags = this.readWord1();
  if (this.containsEsc) {
    this.unexpected(flagsStart);
  }
  var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
  state.reset(start, pattern, flags);
  this.validateRegExpFlags(state);
  this.validateRegExpPattern(state);
  var value = null;
  try {
    value = new RegExp(pattern, flags);
  } catch (e) {
  }
  return this.finishToken(types$1.regexp, { pattern, flags, value });
};
pp.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
  var allowSeparators = this.options.ecmaVersion >= 12 && len === void 0;
  var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;
  var start = this.pos, total = 0, lastCode = 0;
  for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
    var code = this.input.charCodeAt(this.pos), val = void 0;
    if (allowSeparators && code === 95) {
      if (isLegacyOctalNumericLiteral) {
        this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals");
      }
      if (lastCode === 95) {
        this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore");
      }
      if (i === 0) {
        this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits");
      }
      lastCode = code;
      continue;
    }
    if (code >= 97) {
      val = code - 97 + 10;
    } else if (code >= 65) {
      val = code - 65 + 10;
    } else if (code >= 48 && code <= 57) {
      val = code - 48;
    } else {
      val = Infinity;
    }
    if (val >= radix) {
      break;
    }
    lastCode = code;
    total = total * radix + val;
  }
  if (allowSeparators && lastCode === 95) {
    this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits");
  }
  if (this.pos === start || len != null && this.pos - start !== len) {
    return null;
  }
  return total;
};
function stringToNumber(str, isLegacyOctalNumericLiteral) {
  if (isLegacyOctalNumericLiteral) {
    return parseInt(str, 8);
  }
  return parseFloat(str.replace(/_/g, ""));
}
function stringToBigInt(str) {
  if (typeof BigInt !== "function") {
    return null;
  }
  return BigInt(str.replace(/_/g, ""));
}
pp.readRadixNumber = function(radix) {
  var start = this.pos;
  this.pos += 2;
  var val = this.readInt(radix);
  if (val == null) {
    this.raise(this.start + 2, "Expected number in radix " + radix);
  }
  if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
    val = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
  } else if (isIdentifierStart(this.fullCharCodeAtPos())) {
    this.raise(this.pos, "Identifier directly after number");
  }
  return this.finishToken(types$1.num, val);
};
pp.readNumber = function(startsWithDot) {
  var start = this.pos;
  if (!startsWithDot && this.readInt(10, void 0, true) === null) {
    this.raise(start, "Invalid number");
  }
  var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
  if (octal && this.strict) {
    this.raise(start, "Invalid number");
  }
  var next = this.input.charCodeAt(this.pos);
  if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
    var val$1 = stringToBigInt(this.input.slice(start, this.pos));
    ++this.pos;
    if (isIdentifierStart(this.fullCharCodeAtPos())) {
      this.raise(this.pos, "Identifier directly after number");
    }
    return this.finishToken(types$1.num, val$1);
  }
  if (octal && /[89]/.test(this.input.slice(start, this.pos))) {
    octal = false;
  }
  if (next === 46 && !octal) {
    ++this.pos;
    this.readInt(10);
    next = this.input.charCodeAt(this.pos);
  }
  if ((next === 69 || next === 101) && !octal) {
    next = this.input.charCodeAt(++this.pos);
    if (next === 43 || next === 45) {
      ++this.pos;
    }
    if (this.readInt(10) === null) {
      this.raise(start, "Invalid number");
    }
  }
  if (isIdentifierStart(this.fullCharCodeAtPos())) {
    this.raise(this.pos, "Identifier directly after number");
  }
  var val = stringToNumber(this.input.slice(start, this.pos), octal);
  return this.finishToken(types$1.num, val);
};
pp.readCodePoint = function() {
  var ch = this.input.charCodeAt(this.pos), code;
  if (ch === 123) {
    if (this.options.ecmaVersion < 6) {
      this.unexpected();
    }
    var codePos = ++this.pos;
    code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
    ++this.pos;
    if (code > 1114111) {
      this.invalidStringToken(codePos, "Code point out of bounds");
    }
  } else {
    code = this.readHexChar(4);
  }
  return code;
};
pp.readString = function(quote) {
  var out = "", chunkStart = ++this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(this.start, "Unterminated string constant");
    }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === quote) {
      break;
    }
    if (ch === 92) {
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(false);
      chunkStart = this.pos;
    } else if (ch === 8232 || ch === 8233) {
      if (this.options.ecmaVersion < 10) {
        this.raise(this.start, "Unterminated string constant");
      }
      ++this.pos;
      if (this.options.locations) {
        this.curLine++;
        this.lineStart = this.pos;
      }
    } else {
      if (isNewLine(ch)) {
        this.raise(this.start, "Unterminated string constant");
      }
      ++this.pos;
    }
  }
  out += this.input.slice(chunkStart, this.pos++);
  return this.finishToken(types$1.string, out);
};
var INVALID_TEMPLATE_ESCAPE_ERROR = {};
pp.tryReadTemplateToken = function() {
  this.inTemplateElement = true;
  try {
    this.readTmplToken();
  } catch (err) {
    if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
      this.readInvalidTemplateToken();
    } else {
      throw err;
    }
  }
  this.inTemplateElement = false;
};
pp.invalidStringToken = function(position, message) {
  if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
    throw INVALID_TEMPLATE_ESCAPE_ERROR;
  } else {
    this.raise(position, message);
  }
};
pp.readTmplToken = function() {
  var out = "", chunkStart = this.pos;
  for (; ; ) {
    if (this.pos >= this.input.length) {
      this.raise(this.start, "Unterminated template");
    }
    var ch = this.input.charCodeAt(this.pos);
    if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
      if (this.pos === this.start && (this.type === types$1.template || this.type === types$1.invalidTemplate)) {
        if (ch === 36) {
          this.pos += 2;
          return this.finishToken(types$1.dollarBraceL);
        } else {
          ++this.pos;
          return this.finishToken(types$1.backQuote);
        }
      }
      out += this.input.slice(chunkStart, this.pos);
      return this.finishToken(types$1.template, out);
    }
    if (ch === 92) {
      out += this.input.slice(chunkStart, this.pos);
      out += this.readEscapedChar(true);
      chunkStart = this.pos;
    } else if (isNewLine(ch)) {
      out += this.input.slice(chunkStart, this.pos);
      ++this.pos;
      switch (ch) {
        case 13:
          if (this.input.charCodeAt(this.pos) === 10) {
            ++this.pos;
          }
        case 10:
          out += "\n";
          break;
        default:
          out += String.fromCharCode(ch);
          break;
      }
      if (this.options.locations) {
        ++this.curLine;
        this.lineStart = this.pos;
      }
      chunkStart = this.pos;
    } else {
      ++this.pos;
    }
  }
};
pp.readInvalidTemplateToken = function() {
  for (; this.pos < this.input.length; this.pos++) {
    switch (this.input[this.pos]) {
      case "\\":
        ++this.pos;
        break;
      case "$":
        if (this.input[this.pos + 1] !== "{") {
          break;
        }
      // fall through
      case "`":
        return this.finishToken(types$1.invalidTemplate, this.input.slice(this.start, this.pos));
      case "\r":
        if (this.input[this.pos + 1] === "\n") {
          ++this.pos;
        }
      // fall through
      case "\n":
      case "\u2028":
      case "\u2029":
        ++this.curLine;
        this.lineStart = this.pos + 1;
        break;
    }
  }
  this.raise(this.start, "Unterminated template");
};
pp.readEscapedChar = function(inTemplate) {
  var ch = this.input.charCodeAt(++this.pos);
  ++this.pos;
  switch (ch) {
    case 110:
      return "\n";
    // 'n' -> '\n'
    case 114:
      return "\r";
    // 'r' -> '\r'
    case 120:
      return String.fromCharCode(this.readHexChar(2));
    // 'x'
    case 117:
      return codePointToString(this.readCodePoint());
    // 'u'
    case 116:
      return "	";
    // 't' -> '\t'
    case 98:
      return "\b";
    // 'b' -> '\b'
    case 118:
      return "\v";
    // 'v' -> '\u000b'
    case 102:
      return "\f";
    // 'f' -> '\f'
    case 13:
      if (this.input.charCodeAt(this.pos) === 10) {
        ++this.pos;
      }
    // '\r\n'
    case 10:
      if (this.options.locations) {
        this.lineStart = this.pos;
        ++this.curLine;
      }
      return "";
    case 56:
    case 57:
      if (this.strict) {
        this.invalidStringToken(
          this.pos - 1,
          "Invalid escape sequence"
        );
      }
      if (inTemplate) {
        var codePos = this.pos - 1;
        this.invalidStringToken(
          codePos,
          "Invalid escape sequence in template string"
        );
      }
    default:
      if (ch >= 48 && ch <= 55) {
        var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
        var octal = parseInt(octalStr, 8);
        if (octal > 255) {
          octalStr = octalStr.slice(0, -1);
          octal = parseInt(octalStr, 8);
        }
        this.pos += octalStr.length - 1;
        ch = this.input.charCodeAt(this.pos);
        if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
          this.invalidStringToken(
            this.pos - 1 - octalStr.length,
            inTemplate ? "Octal literal in template string" : "Octal literal in strict mode"
          );
        }
        return String.fromCharCode(octal);
      }
      if (isNewLine(ch)) {
        if (this.options.locations) {
          this.lineStart = this.pos;
          ++this.curLine;
        }
        return "";
      }
      return String.fromCharCode(ch);
  }
};
pp.readHexChar = function(len) {
  var codePos = this.pos;
  var n = this.readInt(16, len);
  if (n === null) {
    this.invalidStringToken(codePos, "Bad character escape sequence");
  }
  return n;
};
pp.readWord1 = function() {
  this.containsEsc = false;
  var word = "", first = true, chunkStart = this.pos;
  var astral = this.options.ecmaVersion >= 6;
  while (this.pos < this.input.length) {
    var ch = this.fullCharCodeAtPos();
    if (isIdentifierChar(ch, astral)) {
      this.pos += ch <= 65535 ? 1 : 2;
    } else if (ch === 92) {
      this.containsEsc = true;
      word += this.input.slice(chunkStart, this.pos);
      var escStart = this.pos;
      if (this.input.charCodeAt(++this.pos) !== 117) {
        this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX");
      }
      ++this.pos;
      var esc2 = this.readCodePoint();
      if (!(first ? isIdentifierStart : isIdentifierChar)(esc2, astral)) {
        this.invalidStringToken(escStart, "Invalid Unicode escape");
      }
      word += codePointToString(esc2);
      chunkStart = this.pos;
    } else {
      break;
    }
    first = false;
  }
  return word + this.input.slice(chunkStart, this.pos);
};
pp.readWord = function() {
  var word = this.readWord1();
  var type = types$1.name;
  if (this.keywords.test(word)) {
    type = keywords[word];
  }
  return this.finishToken(type, word);
};
var version$1 = "8.16.0";
Parser.acorn = {
  Parser,
  version: version$1,
  defaultOptions,
  Position,
  SourceLocation,
  getLineInfo,
  Node,
  TokenType,
  tokTypes: types$1,
  keywordTypes: keywords,
  TokContext,
  tokContexts: types,
  isIdentifierChar,
  isIdentifierStart,
  Token,
  isNewLine,
  lineBreak,
  lineBreakG,
  nonASCIIwhitespace
};
function parse$2(input, options) {
  return Parser.parse(input, options);
}
const constants = {
  undefined: "void(0)",
  Infinity: "Number.POSITIVE_INFINITY",
  NaN: "Number.NaN",
  E: "Math.E",
  LN2: "Math.LN2",
  LN10: "Math.LN10",
  LOG2E: "Math.LOG2E",
  LOG10E: "Math.LOG10E",
  PI: "Math.PI",
  SQRT1_2: "Math.SQRT1_2",
  SQRT2: "Math.SQRT2"
};
function isNumber(value) {
  return typeof value === "number";
}
const PARSER_OPT = { ecmaVersion: 11 };
const DEFAULT_PARAM_ID = "$";
const DEFAULT_TUPLE_ID = "d";
const DEFAULT_TUPLE_ID1 = "d1";
const DEFAULT_TUPLE_ID2 = "d2";
const NO = (msg) => (node, ctx) => ctx.error(node, msg + " not allowed");
const ERROR_AGGREGATE = NO("Aggregate function");
const ERROR_WINDOW = NO("Window function");
const ERROR_ARGUMENT = "Invalid argument";
const ERROR_COLUMN = "Invalid column reference";
const ERROR_AGGRONLY = ERROR_COLUMN + " (must be input to an aggregate function)";
const ERROR_FUNCTION = "Invalid function call";
const ERROR_MEMBER = "Invalid member expression";
const ERROR_OP_PARAMETER = "Invalid operator parameter";
const ERROR_PARAM = "Invalid param reference";
const ERROR_VARIABLE = "Invalid variable reference";
const ERROR_VARIABLE_OP = "Variable not accessible in operator call";
const ERROR_DECLARATION = "Unsupported variable declaration";
const ERROR_DESTRUCTURE = "Unsupported destructuring pattern";
const ERROR_CLOSURE = "Table expressions do not support closures";
const ERROR_ESCAPE = "Use aq.escape(fn) to use a function as-is (including closures)";
const ERROR_USE_PARAMS = "use table.params({ name: value }) to define dynamic parameters";
const ERROR_ADD_FUNCTION = "use aq.addFunction(name, fn) to add new op functions";
const ERROR_VARIABLE_NOTE = `
Note: ${ERROR_CLOSURE}. ${ERROR_ESCAPE}, or ${ERROR_USE_PARAMS}.`;
const ERROR_FUNCTION_NOTE = `
Note: ${ERROR_CLOSURE}. ${ERROR_ESCAPE}, or ${ERROR_ADD_FUNCTION}.`;
const ERROR_ROW_OBJECT = `The ${ROW_OBJECT} method is not valid in multi-table expressions.`;
function parseExpression(ctx, spec) {
  const ast = parseAST(spec);
  let node = ctx.root = ast;
  ctx.spec = spec;
  ctx.tuple = null;
  ctx.tuple1 = null;
  ctx.tuple2 = null;
  ctx.$param = null;
  ctx.$op = 0;
  ctx.scope = /* @__PURE__ */ new Set();
  ctx.paramsRef = /* @__PURE__ */ new Map();
  ctx.columnRef = /* @__PURE__ */ new Map();
  if (isFunctionExpression(node)) {
    parseFunction(node, ctx);
    node = node.body;
  } else if (ctx.join) {
    ctx.scope.add(ctx.tuple1 = DEFAULT_TUPLE_ID1);
    ctx.scope.add(ctx.tuple2 = DEFAULT_TUPLE_ID2);
    ctx.scope.add(ctx.$param = DEFAULT_PARAM_ID);
  } else {
    ctx.scope.add(ctx.tuple = DEFAULT_TUPLE_ID);
    ctx.scope.add(ctx.$param = DEFAULT_PARAM_ID);
  }
  walk(node, ctx, visitors);
  return ctx.root;
}
function parseAST(expr) {
  try {
    const code = expr.field ? fieldRef(expr) : isArray$2(expr) ? toString$1(expr) : expr;
    return parse$2(`expr=(${code})`, PARSER_OPT).body[0].expression.right;
  } catch (err) {
    error(`Expression parse error: ${expr + ""}`);
  }
}
function fieldRef(expr) {
  const col = JSON.stringify(expr + "");
  return !(expr.table || 0) ? `d=>d[${col}]` : `(a,b)=>b[${col}]`;
}
const visitors = {
  FunctionDeclaration: NO("Function definitions"),
  ForStatement: NO("For loops"),
  ForOfStatement: NO("For-of loops"),
  ForInStatement: NO("For-in loops"),
  WhileStatement: NO("While loops"),
  DoWhileStatement: NO("Do-while loops"),
  AwaitExpression: NO("Await expressions"),
  ArrowFunctionExpression: NO("Function definitions"),
  AssignmentExpression: NO("Assignments"),
  FunctionExpression: NO("Function definitions"),
  NewExpression: NO('Use of "new"'),
  UpdateExpression: NO("Update expressions"),
  VariableDeclarator(node, ctx) {
    handleDeclaration(node.id, ctx);
  },
  Identifier(node, ctx, parent) {
    if (handleIdentifier(node, ctx, parent) && !ctx.scope.has(node.name)) {
      ctx.error(node, ERROR_VARIABLE, ERROR_VARIABLE_NOTE);
    }
  },
  CallExpression(node, ctx) {
    const name2 = functionName(node.callee);
    const def = getAggregate(name2) || getWindow(name2);
    if (def) {
      if ((ctx.join || ctx.aggregate === false) && hasAggregate(name2)) {
        ERROR_AGGREGATE(node, ctx);
      }
      if ((ctx.join || ctx.window === false) && hasWindow(name2)) {
        ERROR_WINDOW(node, ctx);
      }
      ctx.$op = 1;
      if (ctx.ast) {
        updateFunctionNode(node, name2, ctx);
        node.arguments.forEach((arg) => walk(arg, ctx, opVisitors));
      } else {
        const op2 = ctx.op(parseOperator(ctx, def, name2, node.arguments));
        Object.assign(node, { type: Op2, name: op2.id });
      }
      ctx.$op = 0;
      return false;
    } else if (hasFunction(name2)) {
      updateFunctionNode(node, name2, ctx);
    } else {
      ctx.error(node, ERROR_FUNCTION, ERROR_FUNCTION_NOTE);
    }
  },
  MemberExpression(node, ctx, parent) {
    const { object: object2, property } = node;
    if (!is(Identifier, object2)) return;
    const { name: name2 } = object2;
    if (isMath(node) && is(Identifier, property) && Object.hasOwn(constants, property.name)) {
      updateConstantNode(node, property.name);
      return;
    }
    const index2 = name2 === ctx.tuple ? 0 : name2 === ctx.tuple1 ? 1 : name2 === ctx.tuple2 ? 2 : -1;
    if (index2 >= 0) {
      return spliceMember(node, index2, ctx, checkColumn, parent);
    } else if (name2 === ctx.$param) {
      return spliceMember(node, index2, ctx, checkParam);
    } else if (ctx.paramsRef.has(name2)) {
      updateParameterNode(node, ctx.paramsRef.get(name2));
    } else if (ctx.columnRef.has(name2)) {
      updateColumnNode(object2, name2, ctx, node);
    } else if (Object.hasOwn(ctx.params, name2)) {
      updateParameterNode(object2, name2);
    }
  }
};
function spliceMember(node, index2, ctx, check2, parent) {
  const { property, computed } = node;
  let name2;
  if (!computed) {
    name2 = property.name;
  } else if (is(Literal, property)) {
    name2 = property.value;
  } else try {
    walk(property, ctx, visitors, node);
    name2 = ctx.param(property);
  } catch (e) {
    ctx.error(node, ERROR_MEMBER);
  }
  check2(node, name2, index2, ctx, parent);
  return false;
}
const opVisitors = {
  ...visitors,
  VariableDeclarator: NO("Variable declaration in operator call"),
  Identifier(node, ctx, parent) {
    if (handleIdentifier(node, ctx, parent)) {
      ctx.error(node, ERROR_VARIABLE_OP);
    }
  },
  CallExpression(node, ctx) {
    const name2 = functionName(node.callee);
    if (hasFunction(name2)) {
      updateFunctionNode(node, name2, ctx);
    } else {
      ctx.error(node, ERROR_FUNCTION, ERROR_FUNCTION_NOTE);
    }
  }
};
function parseFunction(node, ctx) {
  if (node.generator) NO("Generator functions")(node, ctx);
  if (node.async) NO("Async functions")(node, ctx);
  const { params } = node;
  const len = params.length;
  const setc = (index2) => (name2, key2) => ctx.columnRef.set(name2, [key2, index2]);
  const setp = (name2, key2) => ctx.paramsRef.set(name2, key2);
  if (!len) ;
  else if (ctx.join) {
    parseRef(ctx, params[0], "tuple1", setc(1));
    if (len > 1) parseRef(ctx, params[1], "tuple2", setc(2));
    if (len > 2) parseRef(ctx, params[2], "$param", setp);
  } else {
    parseRef(ctx, params[0], "tuple", setc(0));
    if (len > 1) parseRef(ctx, params[1], "$param", setp);
  }
  ctx.root = node.body;
}
function parseRef(ctx, node, refName, alias) {
  if (is(Identifier, node)) {
    ctx.scope.add(node.name);
    ctx[refName] = node.name;
  } else if (is(ObjectPattern, node)) {
    node.properties.forEach((p) => {
      const key2 = is(Identifier, p.key) ? p.key.name : is(Literal, p.key) ? p.key.value : ctx.error(p, ERROR_ARGUMENT);
      if (!is(Identifier, p.value)) {
        ctx.error(p.value, ERROR_DESTRUCTURE);
      }
      alias(p.value.name, key2);
    });
  }
}
function parseOperator(ctx, def, name2, args) {
  const fields = [];
  const params = [];
  const idxFields = def.param[0] || 0;
  const idxParams = idxFields + (def.param[1] || 0);
  args.forEach((arg, index2) => {
    if (index2 < idxFields) {
      walk(arg, ctx, opVisitors);
      fields.push(ctx.field(arg));
    } else if (index2 < idxParams) {
      walk(arg, ctx, opVisitors);
      params.push(ctx.param(arg));
    } else {
      ctx.error(arg, ERROR_OP_PARAMETER);
    }
  });
  return { name: name2, fields, params, ...ctx.spec.window || {} };
}
function functionName(node) {
  return is(Identifier, node) ? node.name : !is(MemberExpression, node) ? null : isMath(node) ? rewriteMath(node.property.name) : node.property.name;
}
function isMath(node) {
  return is(Identifier, node.object) && node.object.name === "Math";
}
function rewriteMath(name2) {
  return name2 === "max" ? "greatest" : name2 === "min" ? "least" : name2;
}
function handleIdentifier(node, ctx, parent) {
  const { name: name2 } = node;
  if (is(MemberExpression, parent) && parent.property === node) ;
  else if (is(Property, parent) && parent.key === node) ;
  else if (ctx.paramsRef.has(name2)) {
    updateParameterNode(node, ctx.paramsRef.get(name2));
  } else if (ctx.columnRef.has(name2)) {
    updateColumnNode(node, name2, ctx, parent);
  } else if (Object.hasOwn(ctx.params, name2)) {
    updateParameterNode(node, name2);
  } else if (Object.hasOwn(constants, name2)) {
    updateConstantNode(node, name2);
  } else {
    return true;
  }
}
function checkColumn(node, name2, index2, ctx, parent) {
  const table = index2 === 0 ? ctx.table : index2 > 0 ? ctx.join[index2 - 1] : null;
  const col = table && table.column(name2);
  if (table && !col) {
    ctx.error(node, ERROR_COLUMN);
  }
  if (ctx.aggronly && !ctx.$op) {
    ctx.error(node, ERROR_AGGRONLY);
  }
  rewrite(node, name2, index2, col, parent);
}
function updateColumnNode(node, key2, ctx, parent) {
  const [name2, index2] = ctx.columnRef.get(key2);
  checkColumn(node, name2, index2, ctx, parent);
}
function checkParam(node, name2, index2, ctx) {
  if (ctx.params && !Object.hasOwn(ctx.params, name2)) {
    ctx.error(node, ERROR_PARAM);
  }
  updateParameterNode(node, name2);
}
function updateParameterNode(node, name2) {
  node.type = Parameter;
  node.name = name2;
}
function updateConstantNode(node, name2) {
  node.type = Constant;
  node.name = name2;
  node.raw = constants[name2];
}
function updateFunctionNode(node, name2, ctx) {
  if (name2 === ROW_OBJECT) {
    const t2 = ctx.table;
    if (!t2) ctx.error(node, ERROR_ROW_OBJECT);
    rowObjectExpression(
      node,
      t2,
      node.arguments.length ? node.arguments.map((node2) => {
        const col = ctx.param(node2);
        const name3 = isNumber(col) ? t2.columnName(col) : col;
        if (!t2.column(name3)) ctx.error(node2, ERROR_COLUMN);
        return name3;
      }) : t2.columnNames()
    );
  } else {
    node.callee = { type: Function$1, name: name2 };
  }
}
function handleDeclaration(node, ctx) {
  if (is(Identifier, node)) {
    ctx.scope.add(node.name);
  } else if (is(ArrayPattern, node)) {
    node.elements.forEach((elm) => handleDeclaration(elm, ctx));
  } else if (is(ObjectPattern, node)) {
    node.properties.forEach((prop) => handleDeclaration(prop.value, ctx));
  } else {
    ctx.error(node.id, ERROR_DECLARATION);
  }
}
const ANNOTATE = { [Column$1]: 1, [Op2]: 1 };
function parse$1(input, opt2 = {}) {
  const generate = opt2.generate || codegen;
  const compiler = opt2.compiler || compile;
  const params = getParams(opt2);
  const fields = {};
  const opcall = {};
  const names2 = [];
  const exprs = [];
  let fieldId = 0;
  let opId = -1;
  const compileExpr = opt2.join ? compiler.join : opt2.index == 1 ? compiler.expr2 : compiler.expr;
  const ctx = {
    op(op2) {
      const key2 = opKey(op2);
      return opcall[key2] || (op2.id = ++opId, opcall[key2] = op2);
    },
    field(node) {
      const code = generate(node);
      return fields[code] || (fields[code] = ++fieldId);
    },
    param(node) {
      return is(Literal, node) ? node.value : compiler.param(generate(node), params);
    },
    value(name2, node) {
      names2.push(name2);
      const e = node.escape || (opt2.ast ? clean(node) : compileExpr(generate(node), params));
      exprs.push(e);
      if (ANNOTATE[node.type] && e !== node && isObject$2(e)) {
        e.field = node.name;
      }
    },
    error(node, msg, note = "") {
      const i = node.start - 6;
      const j = node.end - 6;
      const snippet = String(ctx.spec).slice(i, j);
      error(`${msg}: "${snippet}"${note}`);
    }
  };
  Object.assign(ctx, opt2, { params });
  for (const [name2, value] of entries(input)) {
    ctx.value(
      name2 + "",
      value.escape ? parseEscape(ctx, value, params) : parseExpression(ctx, value)
    );
  }
  if (opt2.ast) {
    return { names: names2, exprs };
  }
  const f = [];
  for (const key2 in fields) {
    f[fields[key2]] = compiler.expr(key2, params);
  }
  const ops = Object.values(opcall);
  ops.forEach((op2) => op2.fields = op2.fields.map((id) => f[id]));
  return { names: names2, exprs, ops };
}
function opKey(op2) {
  let key2 = `${op2.name}(${op2.fields.concat(op2.params).join(",")})`;
  if (op2.frame) {
    const frame = op2.frame.map((v) => Number.isFinite(v) ? Math.abs(v) : -1);
    key2 += `[${frame},${!!op2.peers}]`;
  }
  return key2;
}
function getParams(opt2) {
  return (opt2.table ? getTableParams(opt2.table) : opt2.join ? {
    ...getTableParams(opt2.join[1]),
    ...getTableParams(opt2.join[0])
  } : {}) || {};
}
function getTableParams(table) {
  return table && isFunction$1(table.params) ? table.params() : {};
}
function wrap$1(expr, properties) {
  return expr && expr.expr ? new Wrapper({ ...expr, ...properties }) : new Wrapper(properties, expr);
}
class Wrapper {
  constructor(properties, expr) {
    this.expr = expr;
    Object.assign(this, properties);
  }
  toString() {
    return String(this.expr);
  }
  toObject() {
    return {
      ...this,
      expr: this.toString(),
      ...isFunction$1(this.expr) ? { func: true } : {}
    };
  }
}
function field$1(expr, name2, table = 0) {
  const props = table ? { field: true, table } : { field: true };
  return wrap$1(
    expr,
    name2 ? { expr: name2, ...props } : props
  );
}
function assign$1(map2, pairs2) {
  for (const [key2, value] of entries(pairs2)) {
    map2.set(key2, value);
  }
  return map2;
}
function resolve(table, sel, map2 = /* @__PURE__ */ new Map()) {
  sel = isNumber(sel) ? table.columnName(sel) : sel;
  if (isString(sel)) {
    map2.set(sel, sel);
  } else if (isArray$2(sel)) {
    sel.forEach((r) => resolve(table, r, map2));
  } else if (isFunction$1(sel)) {
    resolve(table, sel(table), map2);
  } else if (isObject$2(sel)) {
    assign$1(map2, sel);
  } else {
    error(`Invalid column selection: ${toString$1(sel)}`);
  }
  return map2;
}
function decorate$1(value, toObject2) {
  value.toObject = toObject2;
  return value;
}
function toObject(value) {
  return isArray$2(value) ? value.map(toObject) : value && value.toObject ? value.toObject() : value;
}
function all() {
  return decorate$1(
    (table) => table.columnNames(),
    () => ({ all: [] })
  );
}
function not(...selection) {
  selection = selection.flat();
  return decorate$1(
    (table) => {
      const drop = resolve(table, selection);
      return table.columnNames((name2) => !drop.has(name2));
    },
    () => ({ not: toObject(selection) })
  );
}
function parseValue(name2, table, params, options = { window: false }) {
  const exprs = /* @__PURE__ */ new Map();
  const marshal = (param) => {
    param = isNumber(param) ? table.columnName(param) : param;
    isString(param) ? exprs.set(param, field$1(param)) : isFunction$1(param) ? resolve(table, param).forEach(marshal) : isObject$2(param) ? assign$1(exprs, param) : error(`Invalid ${name2} value: ${param + ""}`);
  };
  toArray$1(params).forEach(marshal);
  if (options.preparse) {
    options.preparse(exprs);
  }
  return parse$1(exprs, { table, ...options });
}
function groupby(table, ...values2) {
  return _groupby(table, parseValue("groupby", table, values2.flat()));
}
function _groupby(table, exprs) {
  return table.create({
    groups: createGroups(table, exprs)
  });
}
function createGroups(table, { names: names2 = [], exprs = [], ops = [] }) {
  const n = names2.length;
  if (n === 0) return null;
  if (n === 1 && !table.isFiltered() && exprs[0].field) {
    const col = table.column(exprs[0].field);
    if (col.groups) return col.groups(names2);
  }
  let get2 = aggregateGet(table, ops, exprs);
  const getKey = keyFunction(get2);
  const nrows = table.totalRows();
  const keys2 = new Uint32Array(nrows);
  const index2 = {};
  const rows = [];
  const data2 = table.data();
  const bits = table.mask();
  if (bits) {
    for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
      const key2 = getKey(i, data2) + "";
      keys2[i] = index2[key2] ?? (index2[key2] = rows.push(i) - 1);
    }
  } else {
    for (let i = 0; i < nrows; ++i) {
      const key2 = getKey(i, data2) + "";
      keys2[i] = index2[key2] ?? (index2[key2] = rows.push(i) - 1);
    }
  }
  if (!ops.length) {
    get2 = get2.map((f) => (row) => f(row, data2));
  }
  return { keys: keys2, get: get2, names: names2, rows, size: rows.length };
}
function columnSet(table) {
  return table ? new ColumnSet({ ...table.data() }, table.columnNames()) : new ColumnSet();
}
class ColumnSet {
  /**
   * Create a new column set instance.
   * @param {import('./types.js').ColumnData} [data] Initial column data.
   * @param {string[]} [names] Initial column names.
   */
  constructor(data2, names2) {
    this.data = data2 || {};
    this.names = names2 || [];
  }
  /**
   * Add a new column to this set and return the column values.
   * @template {import('./types.js').ColumnType} T
   * @param {string} name The column name.
   * @param {T} values The column values.
   * @return {T} The provided column values.
   */
  add(name2, values2) {
    if (!this.has(name2)) this.names.push(name2 + "");
    return this.data[name2] = values2;
  }
  /**
   * Test if this column set has a columns with the given name.
   * @param {string} name A column name
   * @return {boolean} True if this set contains a column with the given name,
   *  false otherwise.
   */
  has(name2) {
    return Object.hasOwn(this.data, name2);
  }
  /**
   * Add a groupby specification to this column set.
   * @param {import('./types.js').GroupBySpec} groups A groupby specification.
   * @return {this} This column set.
   */
  groupby(groups) {
    this.groups = groups;
    return this;
  }
  /**
   * Create a new table with the contents of this column set, using the same
   * type as a given prototype table. The new table does not inherit the
   * filter, groupby, or orderby state of the prototype.
   * @template {import('./Table.js').Table} T
   * @param {T} proto A prototype table
   * @return {T} The new table.
   */
  new(proto) {
    const { data: data2, names: names2, groups = null } = this;
    return proto.create({ data: data2, names: names2, groups, filter: null, order: null });
  }
  /**
   * Create a derived table with the contents of this column set, using the same
   * type as a given prototype table. The new table will inherit the filter,
   * groupby, and orderby state of the prototype.
   * @template {import('./Table.js').Table} T
   * @param {T} proto A prototype table
   * @return {T} The new table.
   */
  derive(proto) {
    return proto.create(this);
  }
}
function rollup(table, values2) {
  return _rollup(table, parse$1(values2, { table, aggronly: true, window: false }));
}
function _rollup(table, { names: names2, exprs, ops = [] }) {
  const cols = columnSet();
  const groups = table.groups();
  if (groups) groupOutput(cols, groups);
  output$2(names2, exprs, groups, aggregate(table, ops), cols);
  return cols.new(table);
}
function output$2(names2, exprs, groups, result = [], cols) {
  if (!exprs.length) return;
  const size = groups ? groups.size : 1;
  const op2 = (id, row) => result[id][row];
  const n = names2.length;
  for (let i = 0; i < n; ++i) {
    const get2 = exprs[i];
    if (get2.field != null) {
      cols.add(names2[i], result[get2.field]);
    } else if (size > 1) {
      const col = cols.add(names2[i], Array(size));
      for (let j = 0; j < size; ++j) {
        col[j] = get2(j, null, op2);
      }
    } else {
      cols.add(names2[i], [get2(0, null, op2)]);
    }
  }
}
function select(table, ...columns2) {
  return _select(table, resolve(table, columns2.flat()));
}
function _select(table, columns2) {
  const cols = columnSet();
  columns2.forEach((value, curr) => {
    const next = isString(value) ? value : curr;
    if (next) {
      const col = table.column(curr) || error(`Unrecognized column: ${curr}`);
      cols.add(next, col);
    }
  });
  return cols.derive(table);
}
function regroup(groups, filter2) {
  if (!groups || !filter2) return groups;
  const { keys: keys2, rows, size } = groups;
  const map2 = new Uint32Array(size);
  filter2.scan((row) => map2[keys2[row]] = 1);
  const sum = map2.reduce((sum2, val) => sum2 + val, 0);
  if (sum === size) return groups;
  const _rows = Array(sum);
  let _size = 0;
  for (let i = 0; i < size; ++i) {
    if (map2[i]) _rows[map2[i] = _size++] = rows[i];
  }
  const _keys = new Uint32Array(keys2.length);
  filter2.scan((row) => _keys[row] = map2[keys2[row]]);
  return { ...groups, keys: _keys, rows: _rows, size: _size };
}
function reindex(groups, scan2, filter2, nrows) {
  const { keys: keys2, rows, size } = groups;
  let _rows = rows;
  let _size = size;
  let map2 = null;
  if (filter2) {
    map2 = new Int32Array(size);
    scan2((row) => map2[keys2[row]] = 1);
    const sum = map2.reduce((sum2, val) => sum2 + val, 0);
    if (sum !== size) {
      _rows = Array(sum);
      _size = 0;
      for (let i = 0; i < size; ++i) {
        if (map2[i]) _rows[map2[i] = _size++] = rows[i];
      }
    }
  }
  let r = -1;
  const _keys = new Uint32Array(nrows);
  const fn = _size !== size ? (row) => _keys[++r] = map2[keys2[row]] : (row) => _keys[++r] = keys2[row];
  scan2(fn);
  return { ...groups, keys: _keys, rows: _rows, size: _size };
}
function nest(table, idx, obj, type) {
  const agg = type === "map" || type === true ? map_agg : type === "entries" ? entries_agg : type === "object" ? object_agg : error('groups option must be "map", "entries", or "object".');
  const { names: names2 } = table.groups();
  const col = uniqueName(table.columnNames(), "_");
  let t2 = select(table, {}).reify(idx).create({ data: { [col]: obj } });
  t2 = rollup(t2, { [col]: array_agg(col) });
  for (let i = names2.length; --i >= 0; ) {
    t2 = rollup(
      groupby(t2, names2.slice(0, i)),
      // @ts-ignore
      { [col]: agg(names2[i], col) }
    );
  }
  return t2.get(col);
}
function arrayType$1(column) {
  return isTypedArray$1(column) ? column.constructor : Array;
}
let Table$1 = class Table {
  /**
   * Instantiate a Table instance.
   * @param {import('./types.js').ColumnData} columns
   *  An object mapping column names to values.
   * @param {string[]} [names]
   *  An ordered list of column names.
   * @param {import('./BitSet.js').BitSet} [filter]
   *  A filtering BitSet.
   * @param {import('./types.js').GroupBySpec} [group]
   *  A groupby specification.
   * @param {import('./types.js').RowComparator} [order]
   *  A row comparator function.
   * @param {import('./types.js').Params} [params]
   *  An object mapping parameter names to values.
   */
  constructor(columns2, names2, filter2, group, order, params) {
    const data2 = Object.freeze({ ...columns2 });
    names2 = (names2 == null ? void 0 : names2.slice()) ?? Object.keys(data2);
    const nrows = names2.length ? data2[names2[0]].length : 0;
    this._names = Object.freeze(names2);
    this._data = data2;
    this._total = nrows;
    this._nrows = (filter2 == null ? void 0 : filter2.count()) ?? nrows;
    this._mask = filter2 ?? null;
    this._group = group ?? null;
    this._order = order ?? null;
    this._params = params;
    this._index = null;
    this._partitions = null;
  }
  /**
   * Create a new table with the same type as this table.
   * The new table may have different data, filter, grouping, or ordering
   * based on the values of the optional configuration argument. If a
   * setting is not specified, it is inherited from the current table.
   * @param {import('./types.js').CreateOptions} [options]
   *  Creation options for the new table.
   * @return {this} A newly created table.
   */
  create({
    data: data2 = void 0,
    names: names2 = void 0,
    filter: filter2 = void 0,
    groups = void 0,
    order = void 0
  } = {}) {
    const f = filter2 !== void 0 ? filter2 : this.mask();
    return new this.constructor(
      data2 || this._data,
      names2 || (!data2 ? this._names : null),
      f,
      groups !== void 0 ? groups : regroup(this._group, filter2 && f),
      order !== void 0 ? order : this._order,
      this._params
    );
  }
  /**
   * Get or set table expression parameter values.
   * If called with no arguments, returns the current parameter values
   * as an object. Otherwise, adds the provided parameters to this
   * table's parameter set and returns the table. Any prior parameters
   * with names matching the input parameters are overridden.
   * @param {import('./types.js').Params} [values]
   *  The parameter values.
   * @return {this|import('./types.js').Params}
   *  The current parameter values (if called with no arguments) or this table.
   */
  params(values2) {
    if (arguments.length) {
      if (values2) {
        this._params = { ...this._params, ...values2 };
      }
      return this;
    } else {
      return this._params;
    }
  }
  /**
   * Provide an informative object string tag.
   */
  get [Symbol.toStringTag]() {
    if (!this._names) return "Object";
    const nr = this.numRows();
    const nc = this.numCols();
    const plural = (v) => v !== 1 ? "s" : "";
    return `Table: ${nc} col${plural(nc)} x ${nr} row${plural(nr)}` + (this.isFiltered() ? ` (${this.totalRows()} backing)` : "") + (this.isGrouped() ? `, ${this._group.size} groups` : "") + (this.isOrdered() ? ", ordered" : "");
  }
  /**
   * Indicates if the table has a filter applied.
   * @return {boolean} True if filtered, false otherwise.
   */
  isFiltered() {
    return !!this._mask;
  }
  /**
   * Indicates if the table has a groupby specification.
   * @return {boolean} True if grouped, false otherwise.
   */
  isGrouped() {
    return !!this._group;
  }
  /**
   * Indicates if the table has a row order comparator.
   * @return {boolean} True if ordered, false otherwise.
   */
  isOrdered() {
    return !!this._order;
  }
  /**
   * Get the backing column data for this table.
   * @return {import('./types.js').ColumnData}
   *  Object of named column instances.
   */
  data() {
    return this._data;
  }
  /**
   * Returns the filter bitset mask, if defined.
   * @return {import('./BitSet.js').BitSet} The filter bitset mask.
   */
  mask() {
    return this._mask;
  }
  /**
   * Returns the groupby specification, if defined.
   * @return {import('./types.js').GroupBySpec} The groupby specification.
   */
  groups() {
    return this._group;
  }
  /**
   * Returns the row order comparator function, if specified.
   * @return {import('./types.js').RowComparator}
   *  The row order comparator function.
   */
  comparator() {
    return this._order;
  }
  /**
   * The total number of rows in this table, counting both
   * filtered and unfiltered rows.
   * @return {number} The number of total rows.
   */
  totalRows() {
    return this._total;
  }
  /**
   * The number of active rows in this table. This number may be
   * less than the *totalRows* if the table has been filtered.
   * @return {number} The number of rows.
   */
  numRows() {
    return this._nrows;
  }
  /**
   * The number of active rows in this table. This number may be
   * less than the *totalRows* if the table has been filtered.
   * @return {number} The number of rows.
   */
  get size() {
    return this._nrows;
  }
  /**
   * The number of columns in this table.
   * @return {number} The number of columns.
   */
  numCols() {
    return this._names.length;
  }
  /**
   * Filter function invoked for each column name.
   * @callback NameFilter
   * @param {string} name The column name.
   * @param {number} index The column index.
   * @param {string[]} array The array of names.
   * @return {boolean} Returns true to retain the column name.
   */
  /**
   * The table column names, optionally filtered.
   * @param {NameFilter} [filter] An optional filter function.
   *  If unspecified, all column names are returned.
   * @return {string[]} An array of matching column names.
   */
  columnNames(filter2) {
    return filter2 ? this._names.filter(filter2) : this._names.slice();
  }
  /**
   * The column name at the given index.
   * @param {number} index The column index.
   * @return {string} The column name,
   *  or undefined if the index is out of range.
   */
  columnName(index2) {
    return this._names[index2];
  }
  /**
   * The column index for the given name.
   * @param {string} name The column name.
   * @return {number} The column index, or -1 if the name is not found.
   */
  columnIndex(name2) {
    return this._names.indexOf(name2);
  }
  /**
   * Get the column instance with the given name.
   * @param {string} name The column name.
   * @return {import('./types.js').ColumnType | undefined}
   *  The named column, or undefined if it does not exist.
   */
  column(name2) {
    return this._data[name2];
  }
  /**
   * Get the column instance at the given index position.
   * @param {number} index The zero-based column index.
   * @return {import('./types.js').ColumnType | undefined}
   *  The column, or undefined if it does not exist.
   */
  columnAt(index2) {
    return this._data[this._names[index2]];
  }
  /**
   * Get an array of values contained in a column. The resulting array
   * respects any table filter or orderby criteria.
   * @param {string} name The column name.
   * @param {ArrayConstructor | import('./types.js').TypedArrayConstructor} [constructor=Array]
   *  The array constructor for instantiating the output array.
   * @return {import('./types.js').DataValue[] | import('./types.js').TypedArray}
   *  The array of column values.
   */
  array(name2, constructor = Array) {
    const column = this.column(name2);
    const array2 = new constructor(this.numRows());
    let idx = -1;
    this.scan((row) => array2[++idx] = column.at(row), true);
    return array2;
  }
  /**
   * Get the value for the given column and row.
   * @param {string} name The column name.
   * @param {number} [row=0] The row index, defaults to zero if not specified.
   * @return {import('./types.js').DataValue} The table value at (column, row).
   */
  get(name2, row = 0) {
    const column = this.column(name2);
    return this.isFiltered() || this.isOrdered() ? column.at(this.indices()[row]) : column.at(row);
  }
  /**
   * Returns an accessor ("getter") function for a column. The returned
   * function takes a row index as its single argument and returns the
   * corresponding column value.
   * @param {string} name The column name.
   * @return {import('./types.js').ColumnGetter} The column getter function.
   */
  getter(name2) {
    const column = this.column(name2);
    const indices = this.isFiltered() || this.isOrdered() ? this.indices() : null;
    if (indices) {
      return (row) => column.at(indices[row]);
    } else if (column) {
      return (row) => column.at(row);
    } else {
      error(`Unrecognized column: ${name2}`);
    }
  }
  /**
   * Returns an object representing a table row.
   * @param {number} [row=0] The row index, defaults to zero if not specified.
   * @return {object} A row object with named properties for each column.
   */
  object(row = 0) {
    return objectBuilder$1(this)(row);
  }
  /**
   * Returns an array of objects representing table rows.
   * @param {import('./types.js').ObjectsOptions} [options]
   *  The options for row object generation.
   * @return {object[]} An array of row objects.
   */
  objects(options = {}) {
    const { grouped, limit, offset: offset2 } = options;
    const names2 = resolve(this, options.columns || all());
    const createRow = rowObjectBuilder(this, names2);
    const obj = [];
    this.scan(
      (row, data2) => obj.push(createRow(row, data2)),
      true,
      limit,
      offset2
    );
    if (grouped && this.isGrouped()) {
      const idx = [];
      this.scan((row) => idx.push(row), true, limit, offset2);
      return nest(this, idx, obj, grouped);
    }
    return obj;
  }
  /**
   * Returns an iterator over objects representing table rows.
   * @return {Iterator<object>} An iterator over row objects.
   */
  *[Symbol.iterator]() {
    const createRow = objectBuilder$1(this);
    const n = this.numRows();
    for (let i = 0; i < n; ++i) {
      yield createRow(i);
    }
  }
  /**
   * Returns an iterator over column values.
   * @return {Iterator<object>} An iterator over row objects.
   */
  *values(name2) {
    const get2 = this.getter(name2);
    const n = this.numRows();
    for (let i = 0; i < n; ++i) {
      yield get2(i);
    }
  }
  /**
   * Print the contents of this table using the console.table() method.
   * @param {import('./types.js').PrintOptions|number} options
   *  The options for row object generation, determining which rows and
   *  columns are printed. If number-valued, specifies the row limit.
   * @return {this} The table instance.
   */
  print(options = {}) {
    const opt2 = isNumber(options) ? { limit: +options } : { ...options, limit: 10 };
    const obj = this.objects({ ...opt2, grouped: false });
    const msg = `${this[Symbol.toStringTag]}. Showing ${obj.length} rows.`;
    console.log(msg);
    console.table(obj);
    return this;
  }
  /**
   * Returns an array of indices for all rows passing the table filter.
   * @param {boolean} [order=true] A flag indicating if the returned
   *  indices should be sorted if this table is ordered. If false, the
   *  returned indices may or may not be sorted.
   * @return {Uint32Array} An array of row indices.
   */
  indices(order = true) {
    if (this._index) return this._index;
    const n = this.numRows();
    const index2 = new Uint32Array(n);
    const ordered = this.isOrdered();
    const bits = this.mask();
    let row = -1;
    if (bits) {
      for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
        index2[++row] = i;
      }
    } else {
      for (let i = 0; i < n; ++i) {
        index2[++row] = i;
      }
    }
    if (order && ordered) {
      const { _order, _data } = this;
      index2.sort((a, b) => _order(a, b, _data));
    }
    if (order || !ordered) {
      this._index = index2;
    }
    return index2;
  }
  /**
   * Returns an array of indices for each group in the table.
   * If the table is not grouped, the result is the same as
   * the *indices* method, but wrapped within an array.
   * @param {boolean} [order=true] A flag indicating if the returned
   *  indices should be sorted if this table is ordered. If false, the
   *  returned indices may or may not be sorted.
   * @return {number[][] | Uint32Array[]} An array of row index arrays, one
   *  per group. The indices will be filtered if the table is filtered.
   */
  partitions(order = true) {
    if (this._partitions) {
      return this._partitions;
    }
    if (!this.isGrouped()) {
      return [this.indices(order)];
    }
    const { keys: keys2, size } = this._group;
    const part = repeat(size, () => []);
    const sort = this._index;
    const bits = this.mask();
    const n = this.numRows();
    if (sort && this.isOrdered()) {
      for (let i = 0, r; i < n; ++i) {
        r = sort[i];
        part[keys2[r]].push(r);
      }
    } else if (bits) {
      for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
        part[keys2[i]].push(i);
      }
    } else {
      for (let i = 0; i < n; ++i) {
        part[keys2[i]].push(i);
      }
    }
    if (order && !sort && this.isOrdered()) {
      const compare2 = this._order;
      const data2 = this._data;
      for (let i = 0; i < size; ++i) {
        part[i].sort((a, b) => compare2(a, b, data2));
      }
    }
    if (order || !this.isOrdered()) {
      this._partitions = part;
    }
    return part;
  }
  /**
   * Create a new fully-materialized instance of this table.
   * All filter and orderby settings are removed from the new table.
   * Instead, the backing data itself is filtered and ordered as needed.
   * @param {number[]} [indices] Ordered row indices to materialize.
   *  If unspecified, all rows passing the table filter are used.
   * @return {this} A reified table.
   */
  reify(indices) {
    const nrows = indices ? indices.length : this.numRows();
    const names2 = this._names;
    let data2, groups;
    if (!indices && !this.isOrdered()) {
      if (!this.isFiltered()) {
        return this;
      } else if (nrows === this.totalRows()) {
        data2 = this.data();
      }
    }
    if (!data2) {
      const scan2 = indices ? (f) => indices.forEach(f) : (f) => this.scan(f, true);
      const ncols = names2.length;
      data2 = {};
      for (let i = 0; i < ncols; ++i) {
        const name2 = names2[i];
        const prev = this.column(name2);
        const curr = data2[name2] = new (arrayType$1(prev))(nrows);
        let r = -1;
        isArrayType(prev) ? scan2((row) => curr[++r] = prev[row]) : scan2((row) => curr[++r] = prev.at(row));
      }
      if (this.isGrouped()) {
        groups = reindex(this.groups(), scan2, !!indices, nrows);
      }
    }
    return this.create({ data: data2, names: names2, groups, filter: null, order: null });
  }
  /**
   * Callback function to cancel a table scan.
   * @callback ScanStop
   * @return {void}
   */
  /**
   * Callback function invoked for each row of a table scan.
   * @callback ScanVisitor
   * @param {number} [row] The table row index.
   * @param {import('./types.js').ColumnData} [data]
   *  The backing table data store.
   * @param {ScanStop} [stop] Function to stop the scan early.
   *  Callees can invoke this function to prevent future calls.
   * @return {void}
   */
  /**
   * Perform a table scan, visiting each row of the table.
   * If this table is filtered, only rows passing the filter are visited.
   * @param {ScanVisitor} fn Callback invoked for each row of the table.
   * @param {boolean} [order=false] Indicates if the table should be
   *  scanned in the order determined by *orderby*. This
   *  argument has no effect if the table is unordered.
   * @property {number} [limit=Infinity] The maximum number of rows to scan.
   * @property {number} [offset=0] The row offset indicating how many
   *  initial rows to skip.
   */
  scan(fn, order, limit = Infinity, offset2 = 0) {
    const filter2 = this._mask;
    const nrows = this._nrows;
    const data2 = this._data;
    let i = offset2 || 0;
    if (i > nrows) return;
    const n = Math.min(nrows, i + limit);
    const stop = () => i = this._total;
    if (order && this.isOrdered() || filter2 && this._index) {
      const index2 = this.indices();
      const data3 = this._data;
      for (; i < n; ++i) {
        fn(index2[i], data3, stop);
      }
    } else if (filter2) {
      let c = n - i + 1;
      for (i = filter2.nth(i); --c && i > -1; i = filter2.next(i + 1)) {
        fn(i, data2, stop);
      }
    } else {
      for (; i < n; ++i) {
        fn(i, data2, stop);
      }
    }
  }
};
function objectBuilder$1(table) {
  let b = table._builder;
  if (!b) {
    const createRow = rowObjectBuilder(table);
    const data2 = table.data();
    if (table.isOrdered() || table.isFiltered()) {
      const indices = table.indices();
      b = (row) => createRow(indices[row], data2);
    } else {
      b = (row) => createRow(row, data2);
    }
    table._builder = b;
  }
  return b;
}
function assign(table, ...others) {
  others = others.flat();
  const nrows = table.numRows();
  const base = table.reify();
  const cols = columnSet(base).groupby(base.groups());
  others.forEach((input) => {
    input = input instanceof Table$1 ? input : new Table$1(input);
    if (input.numRows() !== nrows) error("Assign row counts do not match");
    input = input.reify();
    input.columnNames((name2) => cols.add(name2, input.column(name2)));
  });
  return cols.new(table);
}
function concat(table, ...others) {
  others = others.flat();
  const trows = table.numRows();
  const nrows = trows + others.reduce((n, t2) => n + t2.numRows(), 0);
  if (trows === nrows) return table;
  const tables = [table, ...others];
  const cols = columnSet();
  table.columnNames().forEach((name2) => {
    const arr = Array(nrows);
    let row = 0;
    tables.forEach((table2) => {
      const col = table2.column(name2) || { at: () => NULL };
      table2.scan((trow) => arr[row++] = col.at(trow));
    });
    cols.add(name2, arr);
  });
  return cols.new(table);
}
function relocate(table, columns2, {
  before = void 0,
  after = void 0
} = {}) {
  const bef = before != null;
  const aft = after != null;
  if (!(bef || aft)) {
    error("relocate requires a before or after option.");
  }
  if (bef && aft) {
    error("relocate accepts only one of the before or after options.");
  }
  columns2 = resolve(table, columns2);
  const anchors = [...resolve(table, bef ? before : after).keys()];
  const anchor = bef ? anchors[0] : anchors.pop();
  const select2 = /* @__PURE__ */ new Map();
  table.columnNames().forEach((name2) => {
    const assign2 = !columns2.has(name2);
    if (name2 === anchor) {
      if (aft && assign2) select2.set(name2, name2);
      for (const [key2, value] of columns2) {
        select2.set(key2, value);
      }
      if (aft) return;
    }
    if (assign2) select2.set(name2, name2);
  });
  return _select(table, select2);
}
function bisector(compare2) {
  return {
    left(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }
  };
}
const bisect$1 = bisector(ascending);
function windowState(data2, frame, adjust, ops, aggrs) {
  let rows, peer, cells, result, key2;
  const isPeer = (index2) => peer[index2 - 1] === peer[index2];
  const numOps = ops.length;
  const numAgg = aggrs.length;
  const evaluate = ops.length ? unroll$1(
    ["w", "r", "k"],
    "{" + concat$1(ops, (_, i) => `r[_${i}.id][k]=_${i}.value(w,_${i}.get);`) + "}",
    ops
  ) : () => {
  };
  const w = {
    i0: 0,
    i1: 0,
    index: 0,
    size: 0,
    peer: isPeer,
    init(partition, peers, results, group) {
      w.index = w.i0 = w.i1 = 0;
      w.size = peers.length;
      rows = partition;
      peer = peers;
      result = results;
      key2 = group;
      cells = aggrs ? aggrs.map((aggr) => aggr.init()) : null;
      for (let i = 0; i < numOps; ++i) {
        ops[i].init();
      }
      return w;
    },
    value(index2, get2) {
      return get2(rows[index2], data2);
    },
    step(idx) {
      const [f0, f1] = frame;
      const n = w.size;
      const p0 = w.i0;
      const p1 = w.i1;
      w.i0 = f0 != null ? Math.max(0, idx - Math.abs(f0)) : 0;
      w.i1 = f1 != null ? Math.min(n, idx + Math.abs(f1) + 1) : n;
      w.index = idx;
      if (adjust) {
        if (w.i0 > 0 && isPeer(w.i0)) {
          w.i0 = bisect$1.left(peer, peer[w.i0]);
        }
        if (w.i1 < n && isPeer(w.i1)) {
          w.i1 = bisect$1.right(peer, peer[w.i1 - 1]);
        }
      }
      for (let i = 0; i < numAgg; ++i) {
        const aggr = aggrs[i];
        const cell = cells[i];
        for (let j = p0; j < w.i0; ++j) {
          aggr.rem(cell, rows[j], data2);
        }
        for (let j = p1; j < w.i1; ++j) {
          aggr.add(cell, rows[j], data2);
        }
        aggr.write(cell, result, key2);
      }
      evaluate(w, result, key2);
      return result;
    }
  };
  return w;
}
const frameValue = (op2) => (op2.frame || [null, null]).map((v) => Number.isFinite(v) ? Math.abs(v) : null);
const peersValue = (op2) => !!op2.peers;
function windowOp(spec) {
  const { id, name: name2, fields = [], params = [] } = spec;
  return {
    ...getWindow(name2).create(...params),
    get: fields.length ? fields[0] : null,
    id
  };
}
function window$1(table, cols, exprs, result = {}, ops) {
  const data2 = table.data();
  const states = windowStates(ops, data2);
  const nstate = states.length;
  const write = unroll$1(
    ["r", "d", "op"],
    "{" + concat$1(cols, (_, i) => `_${i}[r] = $${i}(r, d, op);`) + "}",
    cols,
    exprs
  );
  table.partitions().forEach((rows, key2) => {
    const size = rows.length;
    const peers = windowPeers(table, rows);
    for (let i = 0; i < nstate; ++i) {
      states[i].init(rows, peers, result, key2);
    }
    const op2 = (id) => result[id][key2];
    for (let index2 = 0; index2 < size; ++index2) {
      for (let i = 0; i < nstate; ++i) {
        states[i].step(index2);
      }
      write(rows[index2], data2, op2);
    }
  });
}
function windowStates(ops, data2) {
  const map2 = {};
  ops.forEach((op2) => {
    const frame = frameValue(op2);
    const peers = peersValue(op2);
    const key2 = `${frame},${peers}`;
    const { aggOps, winOps } = map2[key2] || (map2[key2] = {
      frame,
      peers,
      aggOps: [],
      winOps: []
    });
    hasAggregate(op2.name) ? aggOps.push(op2) : winOps.push(windowOp(op2));
  });
  return Object.values(map2).map((_) => windowState(
    data2,
    _.frame,
    _.peers,
    _.winOps,
    reducers(_.aggOps, _.frame[0] != null ? -1 : 1)
  ));
}
function windowPeers(table, rows) {
  if (table.isOrdered()) {
    const compare2 = table.comparator();
    const data2 = table.data();
    const nrows = rows.length;
    const peers = new Uint32Array(nrows);
    for (let i = 1, index2 = 0; i < nrows; ++i) {
      peers[i] = compare2(rows[i - 1], rows[i], data2) ? ++index2 : index2;
    }
    return peers;
  } else {
    return rows;
  }
}
function isWindowed(op2) {
  return hasWindow(op2.name) || op2.frame && (Number.isFinite(op2.frame[0]) || Number.isFinite(op2.frame[1]));
}
function derive(table, values2, options = {}) {
  const dt = _derive(table, parse$1(values2, { table }), options);
  return options.drop || options.before == null && options.after == null ? dt : relocate(
    dt,
    Object.keys(values2).filter((name2) => !table.column(name2)),
    options
  );
}
function _derive(table, { names: names2, exprs, ops = [] }, options = {}) {
  const total = table.totalRows();
  const cols = columnSet(options.drop ? null : table);
  const data2 = names2.map((name2) => cols.add(name2, Array(total)));
  const [aggOps, winOps] = segmentOps(ops);
  const size = table.isGrouped() ? table.groups().size : 1;
  const result = aggregate(
    table,
    aggOps,
    repeat(ops.length, () => Array(size))
  );
  winOps.length ? window$1(table, data2, exprs, result, winOps) : output$1(table, data2, exprs, result);
  return cols.derive(table);
}
function segmentOps(ops) {
  const aggOps = [];
  const winOps = [];
  const n = ops.length;
  for (let i = 0; i < n; ++i) {
    const op2 = ops[i];
    op2.id = i;
    (isWindowed(op2) ? winOps : aggOps).push(op2);
  }
  return [aggOps, winOps];
}
function output$1(table, cols, exprs, result) {
  const bits = table.mask();
  const data2 = table.data();
  const { keys: keys2 } = table.groups() || {};
  const op2 = keys2 ? (id, row) => result[id][keys2[row]] : (id) => result[id][0];
  const m = cols.length;
  for (let j = 0; j < m; ++j) {
    const get2 = exprs[j];
    const col = cols[j];
    if (bits) {
      for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
        col[i] = get2(i, data2, op2);
      }
    } else {
      const n = table.totalRows();
      for (let i = 0; i < n; ++i) {
        col[i] = get2(i, data2, op2);
      }
    }
  }
}
function filter(table, criteria) {
  const test = parse$1({ p: criteria }, { table });
  let predicate = test.exprs[0];
  if (test.ops.length) {
    const data2 = _derive(table, test, { drop: true }).column("p");
    predicate = (row) => data2.at(row);
  }
  return _filter(table, predicate);
}
function _filter(table, predicate) {
  const n = table.totalRows();
  const bits = table.mask();
  const data2 = table.data();
  const filter2 = new BitSet(n);
  if (bits) {
    for (let i = bits.next(0); i >= 0; i = bits.next(i + 1)) {
      if (predicate(i, data2)) filter2.set(i);
    }
  } else {
    for (let i = 0; i < n; ++i) {
      if (predicate(i, data2)) filter2.set(i);
    }
  }
  return table.create({ filter: filter2 });
}
function dedupe(table, ...keys2) {
  keys2 = keys2.flat();
  const gt = groupby(table, keys2.length ? keys2 : table.columnNames());
  return filter(gt, "row_number() === 1").ungroup().reify();
}
function rowLookup(table, hash) {
  const lut = /* @__PURE__ */ new Map();
  table.scan((row, data2) => {
    const key2 = hash(row, data2);
    if (key2 != null && key2 === key2) {
      lut.set(key2, row);
    }
  });
  return lut;
}
function indexLookup(idx, data2, hash) {
  const lut = /* @__PURE__ */ new Map();
  const n = idx.length;
  for (let i = 0; i < n; ++i) {
    const row = idx[i];
    const key2 = hash(row, data2);
    if (key2 != null && key2 === key2) {
      lut.has(key2) ? lut.get(key2).push(i) : lut.set(key2, [i]);
    }
  }
  return lut;
}
function intersect$1(a, b) {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}
function parseKey(name2, table, params) {
  const exprs = /* @__PURE__ */ new Map();
  toArray$1(params).forEach((param, i) => {
    param = isNumber(param) ? table.columnName(param) : param;
    isString(param) ? exprs.set(i, field$1(param)) : isFunction$1(param) || isObject$2(param) && param.expr ? exprs.set(i, param) : error(`Invalid ${name2} key value: ${param + ""}`);
  });
  const fn = parse$1(exprs, { table, aggregate: false, window: false });
  return keyFunction(fn.exprs, true);
}
function inferKeys(tableL, tableR, on) {
  if (!on) {
    const isect = intersect$1(tableL.columnNames(), tableR.columnNames());
    if (!isect.length) error("Natural join requires shared column names.");
    on = [isect, isect];
  } else if (isString(on)) {
    on = [on, on];
  } else if (isArray$2(on) && on.length === 1) {
    on = [on[0], on[0]];
  }
  return on;
}
function keyPredicate(tableL, tableR, onL, onR) {
  if (onL.length !== onR.length) {
    error("Mismatched number of join keys");
  }
  return [
    parseKey("join", tableL, onL),
    parseKey("join", tableR, onR)
  ];
}
function semijoin(tableL, tableR, on) {
  return join_filter(tableL, tableR, on, { anti: false });
}
function antijoin(tableL, tableR, on) {
  return join_filter(tableL, tableR, on, { anti: true });
}
function join_filter(tableL, tableR, on, options) {
  on = inferKeys(tableL, tableR, on);
  const predicate = isArray$2(on) ? keyPredicate(tableL, tableR, ...on.map(toArray$1)) : parse$1({ on }, { join: [tableL, tableR] }).exprs[0];
  return _join_filter(tableL, tableR, predicate, options);
}
function _join_filter(tableL, tableR, predicate, options = {}) {
  const filter2 = new BitSet(tableL.totalRows());
  const join2 = isArray$2(predicate) ? hashSemiJoin : loopSemiJoin;
  join2(filter2, tableL, tableR, predicate);
  if (options.anti) {
    filter2.not().and(tableL.mask());
  }
  return tableL.create({ filter: filter2 });
}
function hashSemiJoin(filter2, tableL, tableR, [keyL, keyR]) {
  const lut = rowLookup(tableR, keyR);
  tableL.scan((rowL, data2) => {
    const rowR = lut.get(keyL(rowL, data2));
    if (rowR >= 0) filter2.set(rowL);
  });
}
function loopSemiJoin(filter2, tableL, tableR, predicate) {
  const nL = tableL.numRows();
  const nR = tableR.numRows();
  const dataL = tableL.data();
  const dataR = tableR.data();
  if (tableL.isFiltered() || tableR.isFiltered()) {
    const idxL = tableL.indices(false);
    const idxR = tableR.indices(false);
    for (let i = 0; i < nL; ++i) {
      const rowL = idxL[i];
      for (let j = 0; j < nR; ++j) {
        if (predicate(rowL, dataL, idxR[j], dataR)) {
          filter2.set(rowL);
          break;
        }
      }
    }
  } else {
    for (let i = 0; i < nL; ++i) {
      for (let j = 0; j < nR; ++j) {
        if (predicate(i, dataL, j, dataR)) {
          filter2.set(i);
          break;
        }
      }
    }
  }
}
function except(table, ...others) {
  others = others.flat();
  if (others.length === 0) return table;
  const names2 = table.columnNames();
  return dedupe(others.reduce((a, b) => antijoin(a, b.select(names2)), table));
}
function unroll(table, values2, options) {
  return _unroll(
    table,
    parseValue("unroll", table, values2),
    options && options.drop ? { ...options, drop: parseValue("unroll", table, options.drop).names } : options
  );
}
function _unroll(table, { names: names2 = [], exprs = [], ops = [] }, options = {}) {
  if (!names2.length) return table;
  const limit = options.limit > 0 ? +options.limit : Infinity;
  const index2 = options.index ? options.index === true ? "index" : options.index + "" : null;
  const drop = new Set(options.drop);
  const get2 = aggregateGet(table, ops, exprs);
  const cols = columnSet();
  const nset = new Set(names2);
  const priors = [];
  const copies = [];
  const unroll2 = [];
  table.columnNames().forEach((name2) => {
    if (!drop.has(name2)) {
      const col = cols.add(name2, []);
      if (!nset.has(name2)) {
        priors.push(table.column(name2));
        copies.push(col);
      }
    }
  });
  names2.forEach((name2) => {
    if (!drop.has(name2)) {
      if (!cols.has(name2)) cols.add(name2, []);
      unroll2.push(cols.data[name2]);
    }
  });
  const icol = index2 ? cols.add(index2, []) : null;
  let start = 0;
  const m = priors.length;
  const n = unroll2.length;
  const copy = (row, maxlen) => {
    for (let i = 0; i < m; ++i) {
      copies[i].length = start + maxlen;
      copies[i].fill(priors[i].at(row), start, start + maxlen);
    }
  };
  const indices = icol ? (row, maxlen) => {
    for (let i = 0; i < maxlen; ++i) {
      icol[row + i] = i;
    }
  } : () => {
  };
  if (n === 1) {
    const fn = get2[0];
    const col = unroll2[0];
    table.scan((row, data2) => {
      const array2 = toArray$1(fn(row, data2));
      const maxlen = Math.min(array2.length, limit);
      copy(row, maxlen);
      for (let j = 0; j < maxlen; ++j) {
        col[start + j] = array2[j];
      }
      indices(start, maxlen);
      start += maxlen;
    });
  } else {
    table.scan((row, data2) => {
      let maxlen = 0;
      const arrays = get2.map((fn) => {
        const value = toArray$1(fn(row, data2));
        maxlen = Math.min(Math.max(maxlen, value.length), limit);
        return value;
      });
      copy(row, maxlen);
      for (let i = 0; i < n; ++i) {
        const col = unroll2[i];
        const arr = arrays[i];
        for (let j = 0; j < maxlen; ++j) {
          col[start + j] = arr[j];
        }
      }
      indices(start, maxlen);
      start += maxlen;
    });
  }
  return cols.new(table);
}
function fold(table, values2, options) {
  return _fold(table, parseValue("fold", table, values2), options);
}
function _fold(table, { names: names2 = [], exprs = [], ops = [] }, options = {}) {
  if (names2.length === 0) return table;
  const [k = "key", v = "value"] = options.as || [];
  const vals = aggregateGet(table, ops, exprs);
  return _unroll(
    table,
    {
      names: [k, v],
      exprs: [() => names2, (row, data2) => vals.map((fn) => fn(row, data2))]
    },
    { ...options, drop: names2 }
  );
}
function ungroup(table) {
  return table.isGrouped() ? table.create({ groups: null }) : table;
}
function impute(table, values2, options = {}) {
  values2 = parse$1(values2, { table });
  values2.names.forEach(
    (name2) => table.column(name2) ? 0 : error(`Invalid impute column ${toString$1(name2)}`)
  );
  if (options.expand) {
    const opt2 = { preparse: preparse$1, window: false, aggronly: true };
    const params = parseValue("impute", table, options.expand, opt2);
    const result = _rollup(ungroup(table), params);
    return _impute(
      table,
      values2,
      params.names,
      params.names.map((name2) => result.get(name2, 0))
    );
  } else {
    return _impute(table, values2);
  }
}
function preparse$1(map2) {
  map2.forEach(
    (value, key2) => value.field ? map2.set(key2, array_agg_distinct(value + "")) : 0
  );
}
function _impute(table, values2, keys2, arrays) {
  const write = keys2 && keys2.length;
  table = write ? expand(table, keys2, arrays) : table;
  const { names: names2, exprs, ops } = values2;
  const gets = aggregateGet(table, ops, exprs);
  const cols = write ? null : columnSet(table);
  const rows = table.totalRows();
  names2.forEach((name2, i) => {
    const col = table.column(name2);
    const out = write ? col : cols.add(name2, Array(rows));
    const get2 = gets[i];
    table.scan((idx) => {
      const v = col.at(idx);
      out[idx] = !isValid(v) ? get2(idx) : v;
    });
  });
  return write ? table : table.create(cols);
}
function expand(table, keys2, values2) {
  const groups = table.groups();
  const data2 = table.data();
  const keyNames = (groups ? groups.names : []).concat(keys2);
  const keyGet = (groups ? groups.get : []).concat(keys2.map((key2) => table.getter(key2)));
  const hash = /* @__PURE__ */ new Set();
  const keyTable = keyFunction(keyGet);
  table.scan((idx, data3) => hash.add(keyTable(idx, data3)));
  const names2 = table.columnNames();
  const cols = columnSet();
  const out = names2.map((name2) => cols.add(name2, []));
  names2.forEach((name2, i) => {
    const old = data2[name2];
    const col = out[i];
    table.scan((row) => col.push(old.at(row)));
  });
  const keyEnum = keyFunction(keyGet.map((k, i) => (a) => a[i]));
  const set = unroll$1(
    "v",
    "{" + out.map((_, i) => `_${i}.push(v[$${i}]);`).join("") + "}",
    out,
    names2.map((name2) => keyNames.indexOf(name2))
  );
  if (groups) {
    let row = groups.keys.length;
    const prod = values2.reduce((p, a) => p * a.length, groups.size);
    const keys3 = new Uint32Array(prod + (row - hash.size));
    keys3.set(groups.keys);
    enumerate(groups, values2, (vec, idx) => {
      if (!hash.has(keyEnum(vec))) {
        set(vec);
        keys3[row++] = idx[0];
      }
    });
    cols.groupby({ ...groups, keys: keys3 });
  } else {
    enumerate(groups, values2, (vec) => {
      if (!hash.has(keyEnum(vec))) set(vec);
    });
  }
  return cols.new(table);
}
function enumerate(groups, values2, callback) {
  const offset2 = groups ? groups.get.length : 0;
  const pad3 = groups ? 1 : 0;
  const len = pad3 + values2.length;
  const lens = new Int32Array(len);
  const idxs = new Int32Array(len);
  const set = [];
  if (groups) {
    const { get: get2, rows, size } = groups;
    lens[0] = size;
    set.push((vec2, idx) => {
      const row = rows[idx];
      for (let i = 0; i < offset2; ++i) {
        vec2[i] = get2[i](row);
      }
    });
  }
  values2.forEach((a, i) => {
    const j = i + offset2;
    lens[i + pad3] = a.length;
    set.push((vec2, idx) => vec2[j] = a[idx]);
  });
  const vec = Array(offset2 + values2.length);
  for (let i = 0; i < len; ++i) {
    set[i](vec, 0);
  }
  callback(vec, idxs);
  for (let i = len - 1; i >= 0; ) {
    const idx = ++idxs[i];
    if (idx < lens[i]) {
      set[i](vec, idx);
      callback(vec, idxs);
      i = len - 1;
    } else {
      idxs[i] = 0;
      set[i](vec, 0);
      --i;
    }
  }
}
function intersect(table, ...others) {
  others = others.flat();
  const names2 = table.columnNames();
  return others.length ? dedupe(others.reduce((a, b) => semijoin(a, b.select(names2)), table)) : table.reify([]);
}
const OPT_L = { aggregate: false, window: false };
const OPT_R = { ...OPT_L, index: 1 };
const NONE = -Infinity;
function cross(table, other, values2, options) {
  return join(
    table,
    other,
    () => true,
    values2,
    { ...options, left: true, right: true }
  );
}
function join(tableL, tableR, on, values2, options = {}) {
  on = inferKeys(tableL, tableR, on);
  const optParse = { join: [tableL, tableR] };
  let predicate;
  if (isArray$2(on)) {
    const [onL, onR] = on.map(toArray$1);
    predicate = keyPredicate(tableL, tableR, onL, onR);
    if (!values2) {
      values2 = inferValues(tableL, onL, onR, options);
    }
  } else {
    predicate = parse$1({ on }, optParse).exprs[0];
    if (!values2) {
      values2 = [all(), all()];
    }
  }
  return _join(
    tableL,
    tableR,
    predicate,
    parseValues$1(tableL, tableR, values2, optParse, options && options.suffix),
    options
  );
}
function inferValues(tableL, onL, onR, options) {
  const isect = [];
  onL.forEach((s, i) => isString(s) && s === onR[i] ? isect.push(s) : 0);
  const vR = not(isect);
  if (options.left && options.right) {
    const shared = new Set(isect);
    return [
      tableL.columnNames().map((s) => {
        const c = `[${toString$1(s)}]`;
        return shared.has(s) ? { [s]: `(a, b) => a${c} == null ? b${c} : a${c}` } : s;
      }),
      vR
    ];
  }
  return options.right ? [vR, all()] : [all(), vR];
}
function parseValues$1(tableL, tableR, values2, optParse, suffix = []) {
  if (isArray$2(values2)) {
    let vL, vR, vJ, n = values2.length;
    vL = vR = vJ = { names: [], exprs: [] };
    if (n--) {
      vL = parseValue("join", tableL, values2[0], optParse);
    }
    if (n--) {
      vR = parseValue("join", tableR, values2[1], OPT_R);
    }
    if (n--) {
      vJ = parse$1(values2[2], optParse);
    }
    const rename2 = /* @__PURE__ */ new Set();
    const namesL = new Set(vL.names);
    vR.names.forEach((name2) => {
      if (namesL.has(name2)) {
        rename2.add(name2);
      }
    });
    if (rename2.size) {
      suffix[0] !== "" && rekey(vL.names, rename2, suffix[0] || "_1");
      suffix[1] !== "" && rekey(vR.names, rename2, suffix[1] || "_2");
    }
    return {
      names: vL.names.concat(vR.names, vJ.names),
      exprs: vL.exprs.concat(vR.exprs, vJ.exprs)
    };
  } else {
    return parse$1(values2, optParse);
  }
}
function rekey(names2, rename2, suffix) {
  names2.forEach((name2, i) => rename2.has(name2) ? names2[i] = name2 + suffix : 0);
}
function emitter(columns2, getters) {
  const args = ["i", "a", "j", "b"];
  return unroll$1(
    args,
    "{" + concat$1(columns2, (_, i) => `_${i}.push($${i}(${args}));`) + "}",
    columns2,
    getters
  );
}
function _join(tableL, tableR, predicate, { names: names2, exprs }, options = {}) {
  const dataL = tableL.data();
  const idxL = tableL.indices(false);
  const nL = idxL.length;
  const hitL = new Int32Array(nL);
  const dataR = tableR.data();
  const idxR = tableR.indices(false);
  const nR = idxR.length;
  const hitR = new Int32Array(nR);
  const ncols = names2.length;
  const cols = columnSet();
  const columns2 = Array(ncols);
  const getters = Array(ncols);
  for (let i = 0; i < names2.length; ++i) {
    columns2[i] = cols.add(names2[i], []);
    getters[i] = exprs[i];
  }
  const emit = emitter(columns2, getters);
  const join2 = isArray$2(predicate) ? hashJoin : loopJoin;
  join2(emit, predicate, dataL, dataR, idxL, idxR, hitL, hitR, nL, nR);
  if (options.left) {
    for (let i = 0; i < nL; ++i) {
      if (!hitL[i]) {
        emit(idxL[i], dataL, NONE, dataR);
      }
    }
  }
  if (options.right) {
    for (let j = 0; j < nR; ++j) {
      if (!hitR[j]) {
        emit(NONE, dataL, idxR[j], dataR);
      }
    }
  }
  return cols.new(tableL);
}
function loopJoin(emit, predicate, dataL, dataR, idxL, idxR, hitL, hitR, nL, nR) {
  for (let i = 0; i < nL; ++i) {
    const rowL = idxL[i];
    for (let j = 0; j < nR; ++j) {
      const rowR = idxR[j];
      if (predicate(rowL, dataL, rowR, dataR)) {
        emit(rowL, dataL, rowR, dataR);
        hitL[i] = 1;
        hitR[j] = 1;
      }
    }
  }
}
function hashJoin(emit, [keyL, keyR], dataL, dataR, idxL, idxR, hitL, hitR, nL, nR) {
  let dataScan, keyScan, hitScan, idxScan;
  let dataHash, keyHash, hitHash, idxHash;
  let emitScan = emit;
  if (nL >= nR) {
    dataScan = dataL;
    keyScan = keyL;
    hitScan = hitL;
    idxScan = idxL;
    dataHash = dataR;
    keyHash = keyR;
    hitHash = hitR;
    idxHash = idxR;
  } else {
    dataScan = dataR;
    keyScan = keyR;
    hitScan = hitR;
    idxScan = idxR;
    dataHash = dataL;
    keyHash = keyL;
    hitHash = hitL;
    idxHash = idxL;
    emitScan = (i, a, j, b) => emit(j, b, i, a);
  }
  const lut = indexLookup(idxHash, dataHash, keyHash);
  const m = idxScan.length;
  for (let j = 0; j < m; ++j) {
    const rowScan = idxScan[j];
    const list2 = lut.get(keyScan(rowScan, dataScan));
    if (list2) {
      const n = list2.length;
      for (let k = 0; k < n; ++k) {
        const i = list2[k];
        emitScan(rowScan, dataScan, idxHash[i], dataHash);
        hitHash[i] = 1;
      }
      hitScan[j] = 1;
    }
  }
}
function lookup(tableL, tableR, on, ...values2) {
  on = inferKeys(tableL, tableR, on);
  values2 = values2.length === 0 ? [not(tableL.columnNames())] : values2.flat();
  return _lookup(
    tableL,
    tableR,
    [parseKey("lookup", tableL, on[0]), parseKey("lookup", tableR, on[1])],
    parseValue("lookup", tableR, values2)
  );
}
function _lookup(tableL, tableR, [keyL, keyR], { names: names2, exprs, ops = [] }) {
  const cols = columnSet(tableL);
  const total = tableL.totalRows();
  names2.forEach((name2) => cols.add(name2, Array(total).fill(NULL)));
  const lut = rowLookup(tableR, keyR);
  const set = unroll$1(
    ["lr", "rr", "data"],
    "{" + concat$1(names2, (_, i) => `_[${i}][lr] = $[${i}](rr, data);`) + "}",
    names2.map((name2) => cols.data[name2]),
    aggregateGet(tableR, ops, exprs)
  );
  const dataR = tableR.data();
  tableL.scan((lrow, data2) => {
    const rrow = lut.get(keyL(lrow, data2));
    if (rrow >= 0) set(lrow, rrow, dataR);
  });
  return cols.derive(tableL);
}
const _compare = (u, v, lt, gt) => `((u = ${u}) < (v = ${v}) || u == null) && v != null ? ${lt} : (u > v || v == null) && u != null ? ${gt} : ((v = v instanceof Date ? +v : v), (u = u instanceof Date ? +u : u)) !== u && v === v ? ${lt} : v !== v && u === u ? ${gt} : `;
const _collate = (u, v, lt, gt, f) => `(v = ${v}, (u = ${u}) == null && v == null) ? 0 : v == null ? ${gt} : u == null ? ${lt} : (u = ${f}(u,v)) ? u : `;
function compare(table, fields) {
  const names2 = [];
  const exprs = [];
  const fn = [];
  let keys2 = null, opA = "0", opB = "0";
  if (table.isGrouped()) {
    keys2 = table.groups().keys;
    opA = "ka";
    opB = "kb";
  }
  const { ops } = parse$1(fields, {
    table,
    value: (name2, node) => {
      names2.push(name2);
      if (node.escape) {
        const f = (i) => `fn[${fn.length}](${i}, data)`;
        exprs.push([f("a"), f("b")]);
        fn.push(node.escape);
      } else {
        exprs.push([
          codegen(node, { index: "a", op: opA }),
          codegen(node, { index: "b", op: opB })
        ]);
      }
    },
    window: false
  });
  const result = aggregate(table, ops);
  const op2 = (id, row) => result[id][row];
  const n = names2.length;
  let code = "return (a, b) => {" + (op2 && table.isGrouped() ? "const ka = keys[a], kb = keys[b];" : "") + "let u, v; return ";
  for (let i = 0; i < n; ++i) {
    const field2 = fields.get(names2[i]);
    const o = field2.desc ? -1 : 1;
    const [u, v] = exprs[i];
    if (field2.collate) {
      code += _collate(u, v, -o, o, `${o < 0 ? "-" : ""}fn[${fn.length}]`);
      fn.push(field2.collate);
    } else {
      code += _compare(u, v, -o, o);
    }
  }
  code += "0;};";
  return Function("op", "keys", "fn", "data", code)(op2, keys2, fn, table.data());
}
function orderby(table, ...values2) {
  return _orderby(table, parseValues(table, values2.flat()));
}
function parseValues(table, params) {
  let index2 = -1;
  const exprs = /* @__PURE__ */ new Map();
  const add = (val) => exprs.set(++index2 + "", val);
  params.forEach((param) => {
    const expr = param.expr != null ? param.expr : param;
    if (isObject$2(expr) && !isFunction$1(expr)) {
      for (const key2 in expr) add(expr[key2]);
    } else {
      add(
        isNumber(expr) ? field$1(param, table.columnName(expr)) : isString(expr) ? field$1(param) : isFunction$1(expr) ? param : error(`Invalid orderby field: ${param + ""}`)
      );
    }
  });
  return compare(table, exprs);
}
function _orderby(table, comparator) {
  return table.create({ order: comparator });
}
function pivot(table, on, values2, options) {
  return _pivot(
    table,
    parseValue("fold", table, on),
    parseValue("fold", table, values2, { preparse, window: false, aggronly: true }),
    options
  );
}
function preparse(map2) {
  map2.forEach(
    (value, key2) => value.field ? map2.set(key2, any$1(value + "")) : 0
  );
}
const opt = (value, defaultValue) => value != null ? value : defaultValue;
function _pivot(table, on, values2, options = {}) {
  const { keys: keys2, keyColumn } = pivotKeys(table, on, options);
  const vsep = opt(options.valueSeparator, "_");
  const namefn = values2.names.length > 1 ? (i, name2) => name2 + vsep + keys2[i] : (i) => keys2[i];
  const results = keys2.map(
    (k) => aggregate(table, values2.ops.map((op2) => {
      if (op2.name === "count") {
        const fn = (r) => k === keyColumn[r] ? 1 : NaN;
        fn.toString = () => k + ":1";
        return { ...op2, name: "sum", fields: [fn] };
      }
      const fields = op2.fields.map((f) => {
        const fn = (r, d) => k === keyColumn[r] ? f(r, d) : NaN;
        fn.toString = () => k + ":" + f;
        return fn;
      });
      return { ...op2, fields };
    }))
  );
  return output(values2, namefn, table.groups(), results).new(table);
}
function pivotKeys(table, on, options) {
  const limit = options.limit > 0 ? +options.limit : Infinity;
  const sort = opt(options.sort, true);
  const ksep = opt(options.keySeparator, "_");
  const get2 = aggregateGet(table, on.ops, on.exprs);
  const key2 = get2.length === 1 ? get2[0] : (row, data2) => get2.map((fn) => fn(row, data2)).join(ksep);
  const kcol = Array(table.totalRows());
  table.scan((row, data2) => kcol[row] = key2(row, data2));
  const uniq = aggregate(
    ungroup(table),
    [{
      id: 0,
      name: "array_agg_distinct",
      fields: [((row) => kcol[row])],
      params: []
    }]
  )[0][0];
  const keys2 = sort ? uniq.sort() : uniq;
  return {
    keys: Number.isFinite(limit) ? keys2.slice(0, limit) : keys2,
    keyColumn: kcol
  };
}
function output({ names: names2, exprs }, namefn, groups, results) {
  const size = groups ? groups.size : 1;
  const cols = columnSet();
  const m = results.length;
  const n = names2.length;
  let result;
  const op2 = (id, row) => result[id][row];
  if (groups) groupOutput(cols, groups);
  for (let i = 0; i < n; ++i) {
    const get2 = exprs[i];
    if (get2.field != null) {
      for (let j = 0; j < m; ++j) {
        cols.add(namefn(j, names2[i]), results[j][get2.field]);
      }
    } else if (size > 1) {
      for (let j = 0; j < m; ++j) {
        result = results[j];
        const col = cols.add(namefn(j, names2[i]), Array(size));
        for (let k = 0; k < size; ++k) {
          col[k] = get2(k, null, op2);
        }
      }
    } else {
      for (let j = 0; j < m; ++j) {
        result = results[j];
        cols.add(namefn(j, names2[i]), [get2(0, null, op2)]);
      }
    }
  }
  return cols;
}
function reduce(table, reducer) {
  const cols = columnSet();
  const groups = table.groups();
  const { get: get2, names: names2 = [], rows, size = 1 } = groups || {};
  const counts = new Uint32Array(size + 1);
  names2.forEach((name2) => cols.add(name2, null));
  const cells = groups ? reduceGroups(table, reducer, groups) : [reduceFlat(table, reducer)];
  reducer.outputs().map((name2) => cols.add(name2, []));
  const n = counts.length - 1;
  let len = 0;
  for (let i = 0; i < n; ++i) {
    len += counts[i + 1] = reducer.write(cells[i], cols.data, counts[i]);
  }
  if (groups) {
    const data2 = table.data();
    names2.forEach((name2, index2) => {
      const column = cols.data[name2] = Array(len);
      const getter = get2[index2];
      for (let i = 0, j = 0; i < size; ++i) {
        column.fill(getter(rows[i], data2), j, j += counts[i + 1]);
      }
    });
  }
  return cols.new(table);
}
function rename(table, ...columns2) {
  const map2 = /* @__PURE__ */ new Map();
  table.columnNames((x) => (map2.set(x, x), 0));
  return _select(table, resolve(table, columns2.flat(), map2));
}
function sample$1(buffer2, replace2, index2, weight) {
  return (replace2 ? weight ? sampleRW : sampleRU : weight ? sampleNW : sampleNU)(buffer2.length, buffer2, index2, weight);
}
function sampleRU(size, buffer2, index2) {
  const n = index2.length;
  for (let i = 0; i < size; ++i) {
    buffer2[i] = index2[n * random$1() | 0];
  }
  return buffer2;
}
function sampleRW(size, buffer2, index2, weight) {
  const n = index2.length;
  const w = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; ++i) {
    w[i] = sum += weight(index2[i]);
  }
  const bisect2 = bisector(ascending).right;
  for (let i = 0; i < size; ++i) {
    buffer2[i] = index2[bisect2(w, sum * random$1())];
  }
  return buffer2;
}
function sampleNU(size, buffer2, index2) {
  const n = index2.length;
  if (size >= n) return index2;
  for (let i = 0; i < size; ++i) {
    buffer2[i] = index2[i];
  }
  for (let i = size; i < n; ++i) {
    const j = i * random$1();
    if (j < size) {
      buffer2[j | 0] = index2[i];
    }
  }
  return buffer2;
}
function sampleNW(size, buffer2, index2, weight) {
  const n = index2.length;
  if (size >= n) return index2;
  const w = new Float32Array(n);
  const k = new Uint32Array(n);
  for (let i = 0; i < n; ++i) {
    k[i] = i;
    w[i] = -Math.log(random$1()) / weight(index2[i]);
  }
  k.sort((a, b) => w[a] - w[b]);
  for (let i = 0; i < size; ++i) {
    buffer2[i] = index2[k[i]];
  }
  return buffer2;
}
function shuffle(array2, lo = 0, hi = array2.length) {
  let n = hi - (lo = +lo);
  while (n) {
    const i = random$1() * n-- | 0;
    const v = array2[n + lo];
    array2[n + lo] = array2[i + lo];
    array2[i + lo] = v;
  }
  return array2;
}
function sample(table, size, options = {}) {
  return _sample(
    table,
    parseSize(table, size),
    parseWeight(table, options.weight),
    options
  );
}
const get = (col) => (row) => col.at(row) || 0;
function parseSize(table, size) {
  return isNumber(size) ? () => size : get(_rollup(table, parse$1({ size }, { table, window: false })).column("size"));
}
function parseWeight(table, w) {
  if (w == null) return null;
  w = isNumber(w) ? table.columnName(w) : w;
  return get(
    isString(w) ? table.column(w) : _derive(table, parse$1({ w }, { table }), { drop: true }).column("w")
  );
}
function _sample(table, size, weight, options = {}) {
  const { replace: replace2, shuffle: shuffle$1 } = options;
  const parts = table.partitions(false);
  let total = 0;
  size = parts.map((idx, group) => {
    let s = size(group);
    total += s = replace2 ? s : Math.min(idx.length, s);
    return s;
  });
  const samples = new Uint32Array(total);
  let curr = 0;
  parts.forEach((idx, group) => {
    const sz = size[group];
    const buf2 = samples.subarray(curr, curr += sz);
    if (!replace2 && sz === idx.length) {
      buf2.set(idx);
    } else {
      sample$1(buf2, replace2, idx, weight);
    }
  });
  if (shuffle$1 !== false && (parts.length > 1 || !replace2)) {
    shuffle(samples);
  }
  return table.reify(samples);
}
function slice$1(start = 0, end = Infinity) {
  return `${prep$1(start)} < row_number() && row_number() <= ${prep$1(end)}`;
}
function prep$1(index2) {
  return index2 < 0 ? `count() + ${index2}` : index2;
}
function slice(table, start = 0, end = Infinity) {
  if (table.isGrouped()) {
    return filter(table, slice$1(start, end)).reify();
  }
  const indices = [];
  const nrows = table.numRows();
  start = Math.max(0, start + (start < 0 ? nrows : 0));
  end = Math.min(nrows, Math.max(0, end + (end < 0 ? nrows : 0)));
  table.scan((row) => indices.push(row), true, end - start, start);
  return table.reify(indices);
}
function spread(table, values2, options) {
  return _spread(table, parseValue("spread", table, values2), options);
}
function _spread(table, { names: names2, exprs, ops = [] }, options = {}) {
  if (names2.length === 0) return table;
  const as = names2.length === 1 && options.as || [];
  const drop = options.drop == null ? true : !!options.drop;
  const limit = options.limit == null ? as.length || Infinity : Math.max(1, +options.limit || 1);
  const get2 = aggregateGet(table, ops, exprs);
  const cols = columnSet();
  const map2 = names2.reduce((map3, name2, i) => map3.set(name2, i), /* @__PURE__ */ new Map());
  const add = (index2, name2) => {
    const columns2 = spreadCols(table, get2[index2], limit);
    const n = columns2.length;
    for (let i = 0; i < n; ++i) {
      cols.add(as[i] || `${name2}_${i + 1}`, columns2[i]);
    }
  };
  table.columnNames().forEach((name2) => {
    if (map2.has(name2)) {
      if (!drop) cols.add(name2, table.column(name2));
      add(map2.get(name2), name2);
      map2.delete(name2);
    } else {
      cols.add(name2, table.column(name2));
    }
  });
  map2.forEach(add);
  return cols.derive(table);
}
function spreadCols(table, get2, limit) {
  const nrows = table.totalRows();
  const columns2 = [];
  table.scan((row, data2) => {
    const values2 = toArray$1(get2(row, data2));
    const n = Math.min(values2.length, limit);
    while (columns2.length < n) {
      columns2.push(Array(nrows).fill(NULL));
    }
    for (let i = 0; i < n; ++i) {
      columns2[i][row] = values2[i];
    }
  });
  return columns2;
}
function union$1(table, ...others) {
  return dedupe(concat(table, others.flat()));
}
function unorder(table) {
  return table.isOrdered() ? table.create({ order: null }) : table;
}
const MAGIC = Uint8Array.of(65, 82, 82, 79, 87, 49);
const EOS = Uint8Array.of(255, 255, 255, 255, 0, 0, 0, 0);
const Version = (
  /** @type {const} */
  {
    /** 0.1.0 (October 2016). */
    V1: 0,
    /**
     * >= 1.0.0 (July 2020). Backwards compatible with V4 (V5 readers can read V4
     * metadata and IPC messages). Implementations are recommended to provide a
     * V4 compatibility mode with V5 format changes disabled.
     *
     * Incompatible changes between V4 and V5:
     * - Union buffer layout has changed.
     *   In V5, Unions don't have a validity bitmap buffer.
     */
    V5: 4
  }
);
const Endianness = (
  /** @type {const} */
  {
    Little: 0
  }
);
const MessageHeader = (
  /** @type {const} */
  {
    NONE: 0,
    /**
     * A Schema describes the columns in a record batch.
     */
    Schema: 1,
    /**
     * For sending dictionary encoding information. Any Field can be
     * dictionary-encoded, but in this case none of its children may be
     * dictionary-encoded.
     * There is one vector / column per dictionary, but that vector / column
     * may be spread across multiple dictionary batches by using the isDelta
     * flag.
     */
    DictionaryBatch: 2,
    /**
     * A data header describing the shared memory layout of a "record" or "row"
     * batch. Some systems call this a "row batch" internally and others a "record
     * batch".
     */
    RecordBatch: 3
  }
);
const Type = (
  /** @type {const} */
  {
    /**
     * Dictionary types compress data by using a set of integer indices to
     * lookup potentially repeated vales in a separate dictionary of values.
     *
     * This type entry is provided for API convenience, it does not occur
     * in actual Arrow IPC binary data.
     */
    Dictionary: -1,
    /** No data type. Included for flatbuffer compatibility. */
    NONE: 0,
    /** Null values only. */
    Null: 1,
    /** Integers, either signed or unsigned, with 8, 16, 32, or 64 bit widths. */
    Int: 2,
    /** Floating point numbers with 16, 32, or 64 bit precision. */
    Float: 3,
    /** Opaque binary data. */
    Binary: 4,
    /** Unicode with UTF-8 encoding. */
    Utf8: 5,
    /** Booleans represented as 8 bit bytes. */
    Bool: 6,
    /**
     * Exact decimal value represented as an integer value in two's complement.
     * Currently only 128-bit (16-byte) and 256-bit (32-byte) integers are used.
     * The representation uses the endianness indicated in the schema.
     */
    Decimal: 7,
    /**
     * Date is either a 32-bit or 64-bit signed integer type representing an
     * elapsed time since UNIX epoch (1970-01-01), stored in either of two units:
     * - Milliseconds (64 bits) indicating UNIX time elapsed since the epoch (no
     * leap seconds), where the values are evenly divisible by 86400000
     * - Days (32 bits) since the UNIX epoch
     */
    Date: 8,
    /**
     * Time is either a 32-bit or 64-bit signed integer type representing an
     * elapsed time since midnight, stored in either of four units: seconds,
     * milliseconds, microseconds or nanoseconds.
     *
     * The integer `bitWidth` depends on the `unit` and must be one of the following:
     * - SECOND and MILLISECOND: 32 bits
     * - MICROSECOND and NANOSECOND: 64 bits
     *
     * The allowed values are between 0 (inclusive) and 86400 (=24*60*60) seconds
     * (exclusive), adjusted for the time unit (for example, up to 86400000
     * exclusive for the MILLISECOND unit).
     * This definition doesn't allow for leap seconds. Time values from
     * measurements with leap seconds will need to be corrected when ingesting
     * into Arrow (for example by replacing the value 86400 with 86399).
     */
    Time: 9,
    /**
     * Timestamp is a 64-bit signed integer representing an elapsed time since a
     * fixed epoch, stored in either of four units: seconds, milliseconds,
     * microseconds or nanoseconds, and is optionally annotated with a timezone.
     *
     * Timestamp values do not include any leap seconds (in other words, all
     * days are considered 86400 seconds long).
     *
     * The timezone is an optional string for the name of a timezone, one of:
     *
     *  - As used in the Olson timezone database (the "tz database" or
     *    "tzdata"), such as "America/New_York".
     *  - An absolute timezone offset of the form "+XX:XX" or "-XX:XX",
     *    such as "+07:30".
     *
     * Whether a timezone string is present indicates different semantics about
     * the data.
     */
    Timestamp: 10,
    /**
     * A "calendar" interval which models types that don't necessarily
     * have a precise duration without the context of a base timestamp (e.g.
     * days can differ in length during day light savings time transitions).
     * All integers in the units below are stored in the endianness indicated
     * by the schema.
     *
     *  - YEAR_MONTH - Indicates the number of elapsed whole months, stored as
     *    4-byte signed integers.
     *  - DAY_TIME - Indicates the number of elapsed days and milliseconds (no
     *    leap seconds), stored as 2 contiguous 32-bit signed integers (8-bytes
     *    in total). Support of this IntervalUnit is not required for full arrow
     *    compatibility.
     *  - MONTH_DAY_NANO - A triple of the number of elapsed months, days, and
     *    nanoseconds. The values are stored contiguously in 16-byte blocks.
     *    Months and days are encoded as 32-bit signed integers and nanoseconds
     *    is encoded as a 64-bit signed integer. Nanoseconds does not allow for
     *    leap seconds. Each field is independent (e.g. there is no constraint
     *    that nanoseconds have the same sign as days or that the quantity of
     *    nanoseconds represents less than a day's worth of time).
     */
    Interval: 11,
    /**
     * List (vector) data supporting variably-sized lists.
     * A list has a single child data type for list entries.
     */
    List: 12,
    /**
     * A struct consisting of multiple named child data types.
     */
    Struct: 13,
    /**
     * A union is a complex type with parallel child data types. By default ids
     * in the type vector refer to the offsets in the children. Optionally
     * typeIds provides an indirection between the child offset and the type id.
     * For each child `typeIds[offset]` is the id used in the type vector.
     */
    Union: 14,
    /**
     * Binary data where each entry has the same fixed size.
     */
    FixedSizeBinary: 15,
    /**
     * List (vector) data where every list has the same fixed size.
     * A list has a single child data type for list entries.
     */
    FixedSizeList: 16,
    /**
     * A Map is a logical nested type that is represented as
     * List<entries: Struct<key: K, value: V>>
     *
     * In this layout, the keys and values are each respectively contiguous. We do
     * not constrain the key and value types, so the application is responsible
     * for ensuring that the keys are hashable and unique. Whether the keys are sorted
     * may be set in the metadata for this field.
     *
     * In a field with Map type, the field has a child Struct field, which then
     * has two children: key type and the second the value type. The names of the
     * child fields may be respectively "entries", "key", and "value", but this is
     * not enforced.
     *
     * Map
     * ```text
     *   - child[0] entries: Struct
     *   - child[0] key: K
     *   - child[1] value: V
     *  ```
     * Neither the "entries" field nor the "key" field may be nullable.
     *
     * The metadata is structured so that Arrow systems without special handling
     * for Map can make Map an alias for List. The "layout" attribute for the Map
     * field must have the same contents as a List.
     */
    Map: 17,
    /**
     * An absolute length of time unrelated to any calendar artifacts. For the
     * purposes of Arrow implementations, adding this value to a Timestamp
     * ("t1") naively (i.e. simply summing the two numbers) is acceptable even
     * though in some cases the resulting Timestamp (t2) would not account for
     * leap-seconds during the elapsed time between "t1" and "t2". Similarly,
     * representing the difference between two Unix timestamp is acceptable, but
     * would yield a value that is possibly a few seconds off from the true
     * elapsed time.
     *
     * The resolution defaults to millisecond, but can be any of the other
     * supported TimeUnit values as with Timestamp and Time types. This type is
     * always represented as an 8-byte integer.
     */
    Duration: 18,
    /**
     * Same as Binary, but with 64-bit offsets, allowing representation of
     * extremely large data values.
     */
    LargeBinary: 19,
    /**
     * Same as Utf8, but with 64-bit offsets, allowing representation of
     * extremely large data values.
     */
    LargeUtf8: 20,
    /**
     * Same as List, but with 64-bit offsets, allowing representation of
     * extremely large data values.
     */
    LargeList: 21,
    /**
     * Contains two child arrays, run_ends and values. The run_ends child array
     * must be a 16/32/64-bit integer array which encodes the indices at which
     * the run with the value in each corresponding index in the values child
     * array ends. Like list/struct types, the value array can be of any type.
     */
    RunEndEncoded: 22,
    /**
     * Logically the same as Binary, but the internal representation uses a view
     * struct that contains the string length and either the string's entire data
     * inline (for small strings) or an inlined prefix, an index of another buffer,
     * and an offset pointing to a slice in that buffer (for non-small strings).
     *
     * Since it uses a variable number of data buffers, each Field with this type
     * must have a corresponding entry in `variadicBufferCounts`.
     */
    BinaryView: 23,
    /**
     * Logically the same as Utf8, but the internal representation uses a view
     * struct that contains the string length and either the string's entire data
     * inline (for small strings) or an inlined prefix, an index of another buffer,
     * and an offset pointing to a slice in that buffer (for non-small strings).
     *
     * Since it uses a variable number of data buffers, each Field with this type
     * must have a corresponding entry in `variadicBufferCounts`.
     */
    Utf8View: 24,
    /**
     * Represents the same logical types that List can, but contains offsets and
     * sizes allowing for writes in any order and sharing of child values among
     * list values.
     */
    ListView: 25,
    /**
     * Same as ListView, but with 64-bit offsets and sizes, allowing to represent
     * extremely large data values.
     */
    LargeListView: 26
  }
);
const Precision = (
  /** @type {const} */
  {
    /** 16-bit floating point number. */
    HALF: 0,
    /** 32-bit floating point number. */
    SINGLE: 1,
    /** 64-bit floating point number. */
    DOUBLE: 2
  }
);
const DateUnit = (
  /** @type {const} */
  {
    /* Days (as 32 bit int) since the UNIX epoch. */
    DAY: 0,
    /**
     * Milliseconds (as 64 bit int) indicating UNIX time elapsed since the epoch
     * (no leap seconds), with values evenly divisible by 86400000.
     */
    MILLISECOND: 1
  }
);
const TimeUnit = (
  /** @type {const} */
  {
    /** Seconds. */
    SECOND: 0,
    /** Milliseconds. */
    MILLISECOND: 1,
    /** Microseconds. */
    MICROSECOND: 2,
    /** Nanoseconds. */
    NANOSECOND: 3
  }
);
const IntervalUnit = (
  /** @type {const} */
  {
    /**
     * Indicates the number of elapsed whole months, stored as 4-byte signed
     * integers.
     */
    YEAR_MONTH: 0,
    /**
     * Indicates the number of elapsed days and milliseconds (no leap seconds),
     * stored as 2 contiguous 32-bit signed integers (8-bytes in total). Support
     * of this IntervalUnit is not required for full arrow compatibility.
     */
    DAY_TIME: 1,
    /**
     * A triple of the number of elapsed months, days, and nanoseconds.
     * The values are stored contiguously in 16-byte blocks. Months and days are
     * encoded as 32-bit signed integers and nanoseconds is encoded as a 64-bit
     * signed integer. Nanoseconds does not allow for leap seconds. Each field is
     * independent (e.g. there is no constraint that nanoseconds have the same
     * sign as days or that the quantity of nanoseconds represents less than a
     * day's worth of time).
     */
    MONTH_DAY_NANO: 2
  }
);
const UnionMode = (
  /** @type {const} */
  {
    /** Sparse union layout with full arrays for each sub-type. */
    Sparse: 0,
    /** Dense union layout with offsets into value arrays. */
    Dense: 1
  }
);
const CompressionType = (
  /** @type {const} */
  {
    /**
     * LZ4 frame compression.
     * Not to be confused with "raw" (also called "block") format.
     */
    LZ4_FRAME: 0,
    /** Zstandard compression. */
    ZSTD: 1
  }
);
const BodyCompressionMethod = (
  /** @type {const} */
  {
    /**
     * Each constituent buffer is first compressed with the indicated
     * compressor, and then written with the uncompressed length in the first 8
     * bytes as a 64-bit little-endian signed integer followed by the compressed
     * buffer bytes (and then padding as required by the protocol). The
     * uncompressed length may be set to -1 to indicate that the data that
     * follows is not compressed, which can be useful for cases where
     * compression does not yield appreciable savings.
     */
    BUFFER: 0
  }
);
const uint8Array = Uint8Array;
const uint16Array = Uint16Array;
const uint32Array = Uint32Array;
const uint64Array = BigUint64Array;
const int8Array = Int8Array;
const int16Array = Int16Array;
const int32Array = Int32Array;
const int64Array = BigInt64Array;
const float32Array = Float32Array;
const float64Array = Float64Array;
function intArrayType(bitWidth, signed) {
  const i = Math.log2(bitWidth) - 3;
  return (signed ? [int8Array, int16Array, int32Array, int64Array] : [uint8Array, uint16Array, uint32Array, uint64Array])[i];
}
const TypedArray = Object.getPrototypeOf(Int8Array);
function isTypedArray(value) {
  return value instanceof TypedArray;
}
function isArray(value) {
  return Array.isArray(value) || isTypedArray(value);
}
function isInt64ArrayType(value) {
  return value === int64Array || value === uint64Array;
}
function bisect(offsets, index2) {
  let a = 0;
  let b = offsets.length;
  if (b <= 2147483648) {
    do {
      const mid = a + b >>> 1;
      if (offsets[mid] <= index2) a = mid + 1;
      else b = mid;
    } while (a < b);
  } else {
    do {
      const mid = Math.trunc((a + b) / 2);
      if (offsets[mid] <= index2) a = mid + 1;
      else b = mid;
    } while (a < b);
  }
  return a;
}
function align64(length2, bpe = 1) {
  return (length2 * bpe + 7 & -8) / bpe;
}
function align(array2, length2 = array2.length) {
  const alignedLength = align64(length2, array2.BYTES_PER_ELEMENT);
  return array2.length > alignedLength ? (
    /** @type {T} */
    array2.subarray(0, alignedLength)
  ) : array2.length < alignedLength ? resize(array2, alignedLength) : array2;
}
function resize(array2, newLength, offset2 = 0) {
  const newArray = new array2.constructor(newLength);
  newArray.set(array2, offset2);
  return newArray;
}
function grow(array2, index2, shift) {
  while (array2.length <= index2) {
    array2 = resize(array2, array2.length << 1, shift ? array2.length : 0);
  }
  return array2;
}
function isDate(value) {
  return value instanceof Date;
}
function isIterable(value) {
  return typeof value[Symbol.iterator] === "function";
}
function check(value, test, message) {
  if (test(value)) return value;
  throw new Error(message(value));
}
function checkOneOf(value, set, message) {
  set = Array.isArray(set) ? set : Object.values(set);
  return check(
    value,
    (value2) => set.includes(value2),
    message ?? (() => `${value} must be one of ${set}`)
  );
}
function keyFor(object2, value) {
  for (const [key2, val] of Object.entries(object2)) {
    if (val === value) return key2;
  }
  return "<Unknown>";
}
const invalidDataType = (typeId) => `Unsupported data type: "${keyFor(Type, typeId)}" (id ${typeId})`;
const field = (name2, type, nullable2 = true, metadata = null) => ({
  name: name2,
  type,
  nullable: nullable2,
  metadata
});
function isField(value) {
  return Object.hasOwn(value, "name") && isDataType(value.type);
}
function isDataType(value) {
  return typeof (value == null ? void 0 : value.typeId) === "number";
}
function asField(value, defaultName = "", defaultNullable = true) {
  return isField(value) ? value : field(
    defaultName,
    check(value, isDataType, () => `Data type expected.`),
    defaultNullable
  );
}
const basicType = (typeId) => ({ typeId });
const dictionary = (type, indexType, ordered = false, id = -1) => ({
  typeId: Type.Dictionary,
  id,
  dictionary: type,
  indices: indexType || int32(),
  ordered
});
const nullType = () => basicType(Type.Null);
const int$1 = (bitWidth = 32, signed = true) => ({
  typeId: Type.Int,
  bitWidth: checkOneOf(bitWidth, [8, 16, 32, 64]),
  signed,
  values: intArrayType(bitWidth, signed)
});
const int8 = () => int$1(8);
const int16 = () => int$1(16);
const int32 = () => int$1(32);
const int64 = () => int$1(64);
const uint8 = () => int$1(8, false);
const uint16 = () => int$1(16, false);
const uint32 = () => int$1(32, false);
const uint64 = () => int$1(64, false);
const float = (precision = 2) => ({
  typeId: Type.Float,
  precision: checkOneOf(precision, Precision),
  values: [uint16Array, float32Array, float64Array][precision]
});
const float32 = () => float(Precision.SINGLE);
const float64 = () => float(Precision.DOUBLE);
const utf8 = () => ({
  typeId: Type.Utf8,
  offsets: int32Array
});
const bool = () => basicType(Type.Bool);
const date$2 = (unit) => ({
  typeId: Type.Date,
  unit: checkOneOf(unit, DateUnit),
  values: unit === DateUnit.DAY ? int32Array : int64Array
});
const dateDay = () => date$2(DateUnit.DAY);
const timestamp = (unit = TimeUnit.MILLISECOND, timezone = null) => ({
  typeId: Type.Timestamp,
  unit: checkOneOf(unit, TimeUnit),
  timezone,
  values: int64Array
});
const list = (child) => ({
  typeId: Type.List,
  children: [asField(child)],
  offsets: int32Array
});
const struct = (children) => ({
  typeId: Type.Struct,
  children: Array.isArray(children) && children.length > 0 && isField(children[0]) ? (
    /** @type {Field[]} */
    children
  ) : Object.entries(children).map(([name2, type]) => field(name2, type))
});
const fixedSizeList = (child, stride) => ({
  typeId: Type.FixedSizeList,
  stride,
  children: [asField(child)]
});
const f64 = new float64Array(2);
const buf = f64.buffer;
const i64 = new int64Array(buf);
const u32 = new uint32Array(buf);
const i32 = new int32Array(buf);
const u8 = new uint8Array(buf);
function identity$1(value) {
  return value;
}
function toBigInt(value) {
  return BigInt(value);
}
function toOffset(type) {
  return isInt64ArrayType(type) ? toBigInt : identity$1;
}
function toDateDay(value) {
  return value / 864e5 | 0;
}
function toTimestamp(unit) {
  return unit === TimeUnit.SECOND ? (value) => toBigInt(value / 1e3) : unit === TimeUnit.MILLISECOND ? toBigInt : unit === TimeUnit.MICROSECOND ? (value) => toBigInt(value * 1e3) : (value) => toBigInt(value * 1e6);
}
function toMonthDayNanoBytes([m, d, n]) {
  i32[0] = m;
  i32[1] = d;
  i64[1] = toBigInt(n);
  return u8;
}
function toNumber(value) {
  if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
    throw Error(`BigInt exceeds integer number representation: ${value}`);
  }
  return Number(value);
}
function divide(num, div) {
  return Number(num / div) + Number(num % div) / Number(div);
}
function toDecimal32(scale) {
  return (value) => typeof value === "bigint" ? Number(value) : Math.trunc(value * scale);
}
function toDecimal(value, buf2, offset2, stride, scale) {
  const v = typeof value === "bigint" ? value : toBigInt(Math.trunc(value * scale));
  buf2[offset2] = v;
  if (stride > 1) {
    buf2[offset2 + 1] = v >> 64n;
    if (stride > 2) {
      buf2[offset2 + 2] = v >> 128n;
      buf2[offset2 + 3] = v >> 192n;
    }
  }
}
const asUint64 = (v) => BigInt.asUintN(64, v);
function fromDecimal64(buf2, offset2) {
  return BigInt.asIntN(64, buf2[offset2]);
}
function fromDecimal128(buf2, offset2) {
  const i = offset2 << 1;
  let x;
  if (BigInt.asIntN(64, buf2[i + 1]) < 0) {
    x = asUint64(~buf2[i]) | asUint64(~buf2[i + 1]) << 64n;
    x = -(x + 1n);
  } else {
    x = buf2[i] | buf2[i + 1] << 64n;
  }
  return x;
}
function fromDecimal256(buf2, offset2) {
  const i = offset2 << 2;
  let x;
  if (BigInt.asIntN(64, buf2[i + 3]) < 0) {
    x = asUint64(~buf2[i]) | asUint64(~buf2[i + 1]) << 64n | asUint64(~buf2[i + 2]) << 128n | asUint64(~buf2[i + 3]) << 192n;
    x = -(x + 1n);
  } else {
    x = buf2[i] | buf2[i + 1] << 64n | buf2[i + 2] << 128n | buf2[i + 3] << 192n;
  }
  return x;
}
function toFloat16(value) {
  if (value !== value) return 32256;
  f64[0] = value;
  const sign2 = (u32[1] & 2147483648) >> 16 & 65535;
  let expo = u32[1] & 2146435072, sigf = 0;
  if (expo >= 1089470464) {
    if (u32[0] > 0) {
      expo = 31744;
    } else {
      expo = (expo & 2080374784) >> 16;
      sigf = (u32[1] & 1048575) >> 10;
    }
  } else if (expo <= 1056964608) {
    sigf = 1048576 + (u32[1] & 1048575);
    sigf = 1048576 + (sigf << (expo >> 20) - 998) >> 21;
    expo = 0;
  } else {
    expo = expo - 1056964608 >> 10;
    sigf = (u32[1] & 1048575) + 512 >> 10;
  }
  return sign2 | expo | sigf & 65535;
}
const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder();
function decodeUtf8(buf2) {
  return textDecoder.decode(buf2);
}
function encodeUtf8(str) {
  return textEncoder.encode(str);
}
function keyString(value) {
  const val = typeof value !== "object" || !value ? value ?? null : isDate(value) ? +value : isArray(value) ? `[${value.map(keyString)}]` : objectKey(value);
  return `${val}`;
}
function objectKey(value) {
  let s = "";
  let i = -1;
  for (const k in value) {
    if (++i > 0) s += ",";
    s += `"${k}":${keyString(value[k])}`;
  }
  return `{${s}}`;
}
const SIZEOF_INT = 4;
const SIZEOF_SHORT = 2;
function decodeBit(bitmap2, index2) {
  return (bitmap2[index2 >> 3] & 1 << index2 % 8) !== 0;
}
function readInt16(buf2, offset2) {
  return readUint16(buf2, offset2) << 16 >> 16;
}
function readUint16(buf2, offset2) {
  return buf2[offset2] | buf2[offset2 + 1] << 8;
}
function readInt32(buf2, offset2) {
  return buf2[offset2] | buf2[offset2 + 1] << 8 | buf2[offset2 + 2] << 16 | buf2[offset2 + 3] << 24;
}
function readUint32(buf2, offset2) {
  return readInt32(buf2, offset2) >>> 0;
}
function readInt64(buf2, offset2) {
  return toNumber(BigInt.asIntN(
    64,
    BigInt(readUint32(buf2, offset2)) + (BigInt(readUint32(buf2, offset2 + SIZEOF_INT)) << 32n)
  ));
}
const RowIndex = Symbol("rowIndex");
function proxyFactory(names2, batches) {
  class RowObject {
    /**
     * Create a new proxy row object representing a struct or table row.
     * @param {number} index The record batch row index.
     */
    constructor(index2) {
      this[RowIndex] = index2;
    }
    /**
     * Return a JSON-compatible object representation.
     */
    toJSON() {
      return structObject(names2, batches, this[RowIndex]);
    }
  }
  const proto = RowObject.prototype;
  for (let i = 0; i < names2.length; ++i) {
    if (Object.hasOwn(proto, names2[i])) continue;
    const batch = batches[i];
    Object.defineProperty(proto, names2[i], {
      get() {
        return batch.at(this[RowIndex]);
      },
      enumerable: true
    });
  }
  return (index2) => new RowObject(index2);
}
function objectFactory(names2, batches) {
  return (index2) => structObject(names2, batches, index2);
}
function structObject(names2, batches, index2) {
  const obj = {};
  for (let i = 0; i < names2.length; ++i) {
    obj[names2[i]] = batches[i].at(index2);
  }
  return obj;
}
function isDirectBatch(batch) {
  return batch instanceof DirectBatch;
}
class Batch {
  /**
   * Create a new column batch.
   * @param {object} options
   * @param {number} options.length The length of the batch
   * @param {number} options.nullCount The null value count
   * @param {DataType} options.type The data type.
   * @param {Uint8Array} [options.validity] Validity bitmap buffer
   * @param {TypedArray} [options.values] Values buffer
   * @param {OffsetArray} [options.offsets] Offsets buffer
   * @param {OffsetArray} [options.sizes] Sizes buffer
   * @param {Batch[]} [options.children] Children batches
   */
  constructor({
    length: length2,
    nullCount,
    type,
    validity,
    values: values2,
    offsets,
    sizes,
    children
  }) {
    this.length = length2;
    this.nullCount = nullCount;
    this.type = type;
    this.validity = validity;
    this.values = values2;
    this.offsets = offsets;
    this.sizes = sizes;
    this.children = children;
    if (!nullCount || !this.validity) {
      this.at = (index2) => this.value(index2);
    }
  }
  /**
   * Provide an informative object string tag.
   */
  get [Symbol.toStringTag]() {
    return "Batch";
  }
  /**
   * Return the value at the given index.
   * @param {number} index The value index.
   * @returns {T | null} The value.
   */
  at(index2) {
    return this.isValid(index2) ? this.value(index2) : null;
  }
  /**
   * Check if a value at the given index is valid (non-null).
   * @param {number} index The value index.
   * @returns {boolean} True if valid, false otherwise.
   */
  isValid(index2) {
    return decodeBit(this.validity, index2);
  }
  /**
   * Return the value at the given index. This method does not check the
   * validity bitmap and is intended primarily for internal use. In most
   * cases, callers should use the `at()` method instead.
   * @param {number} index The value index
   * @returns {T} The value, ignoring the validity bitmap.
   */
  value(index2) {
    return (
      /** @type {T} */
      this.values[index2]
    );
  }
  /**
   * Extract an array of values within the given index range. Unlike
   * Array.slice, all arguments are required and may not be negative indices.
   * @param {number} start The starting index, inclusive
   * @param {number} end The ending index, exclusive
   * @returns {ValueArray<T?>} The slice of values
   */
  slice(start, end) {
    const n = end - start;
    const values2 = Array(n);
    for (let i = 0; i < n; ++i) {
      values2[i] = this.at(start + i);
    }
    return values2;
  }
  /**
   * Return an iterator over the values in this batch.
   * @returns {Iterator<T?>}
   */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; ++i) {
      yield this.at(i);
    }
  }
}
/**
 * The array type to use when extracting data from the batch.
 * A null value indicates that the array type should match
 * the type of the batch's values array.
 * @type {ArrayConstructor | TypedArrayConstructor | null}
 */
__publicField(Batch, "ArrayType", null);
class DirectBatch extends Batch {
  /**
   * Create a new column batch with direct value array access.
   * @param {object} options
   * @param {number} options.length The length of the batch
   * @param {number} options.nullCount The null value count
   * @param {DataType} options.type The data type.
   * @param {Uint8Array} [options.validity] Validity bitmap buffer
   * @param {TypedArray} options.values Values buffer
   */
  constructor(options) {
    super(options);
    const { length: length2, values: values2 } = this;
    this.values = values2.subarray(0, length2);
  }
  /**
   * Extract an array of values within the given index range. Unlike
   * Array.slice, all arguments are required and may not be negative indices.
   * When feasible, a zero-copy subarray of a typed array is returned.
   * @param {number} start The starting index, inclusive
   * @param {number} end The ending index, exclusive
   * @returns {ValueArray<T?>} The slice of values
   */
  slice(start, end) {
    return this.nullCount ? super.slice(start, end) : this.values.subarray(start, end);
  }
  /**
   * Return an iterator over the values in this batch.
   * @returns {Iterator<T?>}
   */
  [Symbol.iterator]() {
    return this.nullCount ? super[Symbol.iterator]() : (
      /** @type {Iterator<T?>} */
      this.values[Symbol.iterator]()
    );
  }
}
class NumberBatch extends Batch {
}
__publicField(NumberBatch, "ArrayType", float64Array);
class ArrayBatch extends Batch {
}
__publicField(ArrayBatch, "ArrayType", Array);
class NullBatch extends ArrayBatch {
  /**
   * @param {number} index The value index
   * @returns {null}
   */
  value(index2) {
    return null;
  }
}
class Int64Batch extends NumberBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return toNumber(
      /** @type {bigint} */
      this.values[index2]
    );
  }
}
class Float16Batch extends NumberBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    const v = (
      /** @type {number} */
      this.values[index2]
    );
    const expo = (v & 31744) >> 10;
    const sigf = (v & 1023) / 1024;
    const sign2 = (-1) ** ((v & 32768) >> 15);
    switch (expo) {
      case 31:
        return sign2 * (sigf ? Number.NaN : 1 / 0);
      case 0:
        return sign2 * (sigf ? 6103515625e-14 * sigf : 0);
    }
    return sign2 * 2 ** (expo - 15) * (1 + sigf);
  }
}
class BoolBatch extends ArrayBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return decodeBit(
      /** @type {Uint8Array} */
      this.values,
      index2
    );
  }
}
class Decimal32NumberBatch extends NumberBatch {
  constructor(options) {
    super(options);
    const { scale } = (
      /** @type {DecimalType} */
      this.type
    );
    this.scale = 10 ** scale;
  }
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return (
      /** @type {number} */
      this.values[index2] / this.scale
    );
  }
}
class DecimalBatch extends Batch {
  constructor(options) {
    super(options);
    const { bitWidth, scale } = (
      /** @type {DecimalType} */
      this.type
    );
    this.decimal = bitWidth === 64 ? fromDecimal64 : bitWidth === 128 ? fromDecimal128 : fromDecimal256;
    this.scale = 10n ** BigInt(scale);
  }
}
class DecimalNumberBatch extends DecimalBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return divide(
      this.decimal(
        /** @type {BigUint64Array} */
        this.values,
        index2
      ),
      this.scale
    );
  }
}
__publicField(DecimalNumberBatch, "ArrayType", float64Array);
class DecimalBigIntBatch extends DecimalBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return this.decimal(
      /** @type {BigUint64Array} */
      this.values,
      index2
    );
  }
}
__publicField(DecimalBigIntBatch, "ArrayType", Array);
class DateBatch extends ArrayBatch {
  /**
   * Create a new date batch.
   * @param {Batch<number>} batch A batch of timestamp values.
   */
  constructor(batch) {
    super(batch);
    this.source = batch;
  }
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return new Date(this.source.value(index2));
  }
}
class DateDayBatch extends NumberBatch {
  /**
   * @param {number} index The value index
   * @returns {number}
   */
  value(index2) {
    return 864e5 * /** @type {number} */
    this.values[index2];
  }
}
const DateDayMillisecondBatch = Int64Batch;
class TimestampSecondBatch extends Int64Batch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return super.value(index2) * 1e3;
  }
}
const TimestampMillisecondBatch = Int64Batch;
class TimestampMicrosecondBatch extends Int64Batch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return divide(
      /** @type {bigint} */
      this.values[index2],
      1000n
    );
  }
}
class TimestampNanosecondBatch extends Int64Batch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    return divide(
      /** @type {bigint} */
      this.values[index2],
      1000000n
    );
  }
}
class IntervalDayTimeBatch extends ArrayBatch {
  /**
   * @param {number} index The value index
   * @returns {Int32Array}
   */
  value(index2) {
    const values2 = (
      /** @type {Int32Array} */
      this.values
    );
    return values2.subarray(index2 << 1, index2 + 1 << 1);
  }
}
class IntervalMonthDayNanoBatch extends ArrayBatch {
  /**
   * @param {number} index The value index
   */
  value(index2) {
    const values2 = (
      /** @type {Uint8Array} */
      this.values
    );
    const base = index2 << 4;
    return Float64Array.of(
      readInt32(values2, base),
      readInt32(values2, base + 4),
      readInt64(values2, base + 8)
    );
  }
}
const offset32 = ({ values: values2, offsets }, index2) => values2.subarray(offsets[index2], offsets[index2 + 1]);
const offset64 = ({ values: values2, offsets }, index2) => values2.subarray(toNumber(offsets[index2]), toNumber(offsets[index2 + 1]));
class BinaryBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {Uint8Array}
   */
  value(index2) {
    return offset32(this, index2);
  }
}
class LargeBinaryBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {Uint8Array}
   */
  value(index2) {
    return offset64(this, index2);
  }
}
class Utf8Batch extends ArrayBatch {
  /**
   * @param {number} index
   */
  value(index2) {
    return decodeUtf8(offset32(this, index2));
  }
}
class LargeUtf8Batch extends ArrayBatch {
  /**
   * @param {number} index
   */
  value(index2) {
    return decodeUtf8(offset64(this, index2));
  }
}
class ListBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {ValueArray<V>}
   */
  value(index2) {
    const offsets = (
      /** @type {Int32Array} */
      this.offsets
    );
    return this.children[0].slice(offsets[index2], offsets[index2 + 1]);
  }
}
class LargeListBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {ValueArray<V>}
   */
  value(index2) {
    const offsets = (
      /** @type {BigInt64Array} */
      this.offsets
    );
    return this.children[0].slice(toNumber(offsets[index2]), toNumber(offsets[index2 + 1]));
  }
}
class ListViewBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {ValueArray<V>}
   */
  value(index2) {
    const a = (
      /** @type {number} */
      this.offsets[index2]
    );
    const b = a + /** @type {number} */
    this.sizes[index2];
    return this.children[0].slice(a, b);
  }
}
class LargeListViewBatch extends ArrayBatch {
  /**
   * @param {number} index
   * @returns {ValueArray<V>}
   */
  value(index2) {
    const a = (
      /** @type {bigint} */
      this.offsets[index2]
    );
    const b = a + /** @type {bigint} */
    this.sizes[index2];
    return this.children[0].slice(toNumber(a), toNumber(b));
  }
}
class FixedBatch extends ArrayBatch {
  constructor(options) {
    super(options);
    this.stride = this.type.stride;
  }
}
class FixedBinaryBatch extends FixedBatch {
  /**
   * @param {number} index
   * @returns {Uint8Array}
   */
  value(index2) {
    const { stride, values: values2 } = this;
    return (
      /** @type {Uint8Array} */
      values2.subarray(index2 * stride, (index2 + 1) * stride)
    );
  }
}
class FixedListBatch extends FixedBatch {
  /**
   * @param {number} index
   * @returns {ValueArray<V>}
   */
  value(index2) {
    const { children, stride } = this;
    return children[0].slice(index2 * stride, (index2 + 1) * stride);
  }
}
function pairs({ children, offsets }, index2) {
  const [keys2, vals] = children[0].children;
  const start = offsets[index2];
  const end = offsets[index2 + 1];
  const entries2 = [];
  for (let i = start; i < end; ++i) {
    entries2.push([keys2.at(i), vals.at(i)]);
  }
  return entries2;
}
class MapEntryBatch extends ArrayBatch {
  /**
   * Return the value at the given index.
   * @param {number} index The value index.
   * @returns {[K, V][]} The map entries as an array of [key, value] arrays.
   */
  value(index2) {
    return (
      /** @type {[K, V][]} */
      pairs(this, index2)
    );
  }
}
class MapBatch extends ArrayBatch {
  /**
   * Return the value at the given index.
   * @param {number} index The value index.
   * @returns {Map<K, V>} The map value.
   */
  value(index2) {
    return new Map(
      /** @type {[K, V][]} */
      pairs(this, index2)
    );
  }
}
class SparseUnionBatch extends ArrayBatch {
  /**
   * Create a new column batch.
   * @param {object} options
   * @param {number} options.length The length of the batch
   * @param {number} options.nullCount The null value count
   * @param {DataType} options.type The data type.
   * @param {Uint8Array} [options.validity] Validity bitmap buffer
   * @param {Int32Array} [options.offsets] Offsets buffer
   * @param {Batch[]} options.children Children batches
   * @param {Int8Array} options.typeIds Union type ids buffer
   * @param {Record<string, number>} options.map A typeId to children index map
   */
  constructor({ typeIds, ...options }) {
    super(options);
    this.typeIds = typeIds;
    this.typeMap = this.type.typeMap;
  }
  /**
   * @param {number} index The value index.
   */
  value(index2, offset2 = index2) {
    const { typeIds, children, typeMap } = this;
    return children[typeMap[typeIds[index2]]].at(offset2);
  }
}
class DenseUnionBatch extends SparseUnionBatch {
  /**
   * @param {number} index The value index.
   */
  value(index2) {
    return super.value(
      index2,
      /** @type {number} */
      this.offsets[index2]
    );
  }
}
class StructBatch extends ArrayBatch {
  constructor(options, factory = objectFactory) {
    super(options);
    this.names = this.type.children.map((child) => child.name);
    this.factory = factory(this.names, this.children);
  }
  /**
   * @param {number} index The value index.
   * @returns {Record<string, any>}
   */
  value(index2) {
    return this.factory(index2);
  }
}
class StructProxyBatch extends StructBatch {
  constructor(options) {
    super(options, proxyFactory);
  }
}
class RunEndEncodedBatch extends ArrayBatch {
  /**
   * @param {number} index The value index.
   */
  value(index2) {
    const [{ values: runs }, vals] = this.children;
    return vals.at(
      bisect(
        /** @type {IntegerArray} */
        runs,
        index2
      )
    );
  }
}
class DictionaryBatch extends ArrayBatch {
  /**
   * Register the backing dictionary. Dictionaries are added
   * after batch creation as the complete dictionary may not
   * be finished across multiple record batches.
   * @param {Column<T>} dictionary
   * The dictionary of column values.
   */
  setDictionary(dictionary2) {
    this.dictionary = dictionary2;
    this.cache = dictionary2.cache();
    return this;
  }
  /**
   * @param {number} index The value index.
   */
  value(index2) {
    return this.cache[this.key(index2)];
  }
  /**
   * @param {number} index The value index.
   * @returns {number} The dictionary key
   */
  key(index2) {
    return (
      /** @type {number} */
      this.values[index2]
    );
  }
}
class ViewBatch extends ArrayBatch {
  /**
   * Create a new view batch.
   * @param {object} options Batch options.
   * @param {number} options.length The length of the batch
   * @param {number} options.nullCount The null value count
   * @param {DataType} options.type The data type.
   * @param {Uint8Array} [options.validity] Validity bitmap buffer
   * @param {Uint8Array} options.values Values buffer
   * @param {Uint8Array[]} options.data View data buffers
   */
  constructor({ data: data2, ...options }) {
    super(options);
    this.data = data2;
  }
  /**
   * Get the binary data at the provided index.
   * @param {number} index The value index.
   * @returns {Uint8Array}
   */
  view(index2) {
    const { values: values2, data: data2 } = this;
    const offset2 = index2 << 4;
    let start = offset2 + 4;
    let buf2 = (
      /** @type {Uint8Array} */
      values2
    );
    const length2 = readInt32(buf2, offset2);
    if (length2 > 12) {
      start = readInt32(buf2, offset2 + 12);
      buf2 = data2[readInt32(buf2, offset2 + 8)];
    }
    return buf2.subarray(start, start + length2);
  }
}
class BinaryViewBatch extends ViewBatch {
  /**
   * @param {number} index The value index.
   */
  value(index2) {
    return this.view(index2);
  }
}
class Utf8ViewBatch extends ViewBatch {
  /**
   * @param {number} index The value index.
   */
  value(index2) {
    return decodeUtf8(this.view(index2));
  }
}
class Column {
  /**
   * Create a new column instance.
   * @param {Batch<T>[]} data The value batches.
   * @param {DataType} [type] The column data type.
   *  If not specified, the type is extracted from the batches.
   */
  constructor(data2, type = ((_a2) => (_a2 = data2[0]) == null ? void 0 : _a2.type)()) {
    this.type = type;
    this.length = data2.reduce((m, c) => m + c.length, 0);
    this.nullCount = data2.reduce((m, c) => m + c.nullCount, 0);
    this.data = data2;
    const n = data2.length;
    const offsets = new Int32Array(n + 1);
    if (n === 1) {
      const [batch] = data2;
      offsets[1] = batch.length;
      this.at = (index2) => batch.at(index2);
    } else {
      for (let i = 0, s = 0; i < n; ++i) {
        offsets[i + 1] = s += data2[i].length;
      }
    }
    this.offsets = offsets;
  }
  /**
   * Provide an informative object string tag.
   */
  get [Symbol.toStringTag]() {
    return "Column";
  }
  /**
   * Return an iterator over the values in this column.
   * @returns {Iterator<T?>}
   */
  [Symbol.iterator]() {
    const data2 = this.data;
    return data2.length === 1 ? data2[0][Symbol.iterator]() : batchedIterator(data2);
  }
  /**
   * Return the column value at the given index. If a column has multiple
   * batches, this method performs binary search over the batch lengths to
   * determine the batch from which to retrieve the value. The search makes
   * lookup less efficient than a standard array access. If making a full
   * scan of a column, consider extracting arrays via `toArray()` or using an
   * iterator (`for (const value of column) {...}`).
   * @param {number} index The row index.
   * @returns {T | null} The value.
   */
  at(index2) {
    var _a2;
    const { data: data2, offsets } = this;
    const i = bisect(offsets, index2) - 1;
    return (_a2 = data2[i]) == null ? void 0 : _a2.at(index2 - offsets[i]);
  }
  /**
   * Return the column value at the given index. This method is the same as
   * `at()` and is provided for better compatibility with Apache Arrow JS.
   * @param {number} index The row index.
   * @returns {T | null} The value.
   */
  get(index2) {
    return this.at(index2);
  }
  /**
   * Extract column values into a single array instance. When possible,
   * a zero-copy subarray of the input Arrow data is returned.
   * @returns {ValueArray<T?>}
   */
  toArray() {
    const { length: length2, nullCount, data: data2 } = this;
    const copy = !nullCount && isDirectBatch(data2[0]);
    const n = data2.length;
    if (copy && n === 1) {
      return data2[0].values;
    }
    const ArrayType = !n || nullCount > 0 ? Array : data2[0].constructor.ArrayType ?? data2[0].values.constructor;
    const array2 = new ArrayType(length2);
    return copy ? copyArray(array2, data2) : extractArray(array2, data2);
  }
  /**
   * Return an array of cached column values.
   * Used internally to accelerate dictionary types.
   */
  cache() {
    return this._cache ?? (this._cache = this.toArray());
  }
}
function* batchedIterator(data2) {
  for (let i = 0; i < data2.length; ++i) {
    const iter = data2[i][Symbol.iterator]();
    for (let next = iter.next(); !next.done; next = iter.next()) {
      yield next.value;
    }
  }
}
function copyArray(array2, data2) {
  for (let i = 0, offset2 = 0; i < data2.length; ++i) {
    const { values: values2 } = data2[i];
    array2.set(values2, offset2);
    offset2 += values2.length;
  }
  return array2;
}
function extractArray(array2, data2) {
  let index2 = -1;
  for (let i = 0; i < data2.length; ++i) {
    const batch = data2[i];
    for (let j = 0; j < batch.length; ++j) {
      array2[++index2] = batch.at(j);
    }
  }
  return array2;
}
class Table2 {
  /**
   * Create a new table with the given schema and columns (children).
   * @param {Schema} schema The table schema.
   * @param {Column[]} children The table columns.
   * @param {boolean} [useProxy=false] Flag indicating if row proxy
   *  objects should be used to represent table rows (default `false`).
   */
  constructor(schema, children, useProxy = false) {
    const names2 = schema.fields.map((f) => f.name);
    this.schema = schema;
    this.names = names2;
    this.children = children;
    this.factory = useProxy ? proxyFactory : objectFactory;
    const gen = [];
    this.getFactory = (b) => gen[b] ?? (gen[b] = this.factory(names2, children.map((c) => c.data[b])));
  }
  /**
   * Provide an informative object string tag.
   */
  get [Symbol.toStringTag]() {
    return "Table";
  }
  /**
   * The number of columns in this table.
   * @return {number} The number of columns.
   */
  get numCols() {
    return this.names.length;
  }
  /**
   * The number of rows in this table.
   * @return {number} The number of rows.
   */
  get numRows() {
    var _a2;
    return ((_a2 = this.children[0]) == null ? void 0 : _a2.length) ?? 0;
  }
  /**
   * Return the child column at the given index position.
   * @template {T[keyof T]} R
   * @param {number} index The column index.
   * @returns {Column<R>}
   */
  getChildAt(index2) {
    return this.children[index2];
  }
  /**
   * Return the first child column with the given name.
   * @template {keyof T} P
   * @param {P} name The column name.
   * @returns {Column<T[P]>}
   */
  getChild(name2) {
    const i = this.names.findIndex((x) => x === name2);
    return i > -1 ? this.children[i] : void 0;
  }
  /**
   * Construct a new table containing only columns at the specified indices.
   * The order of columns in the new table matches the order of input indices.
   * @template {T[keyof T]} V
   * @param {number[]} indices The indices of columns to keep.
   * @param {string[]} [as] Optional new names for selected columns.
   * @returns {Table<{ [key: string]: V }>} A new table with selected columns.
   */
  selectAt(indices, as = []) {
    const { children, factory, schema } = this;
    const { fields } = schema;
    return new Table2(
      {
        ...schema,
        fields: indices.map((i, j) => renameField(fields[i], as[j]))
      },
      indices.map((i) => children[i]),
      factory === proxyFactory
    );
  }
  /**
   * Construct a new table containing only columns with the specified names.
   * If columns have duplicate names, the first (with lowest index) is used.
   * The order of columns in the new table matches the order of input names.
   * @template {keyof T} K
   * @param {K[]} names Names of columns to keep.
   * @param {string[]} [as] Optional new names for selected columns.
   * @returns A new table with columns matching the specified names.
   */
  select(names2, as) {
    const all2 = (
      /** @type {K[]} */
      this.names
    );
    const indices = names2.map((name2) => all2.indexOf(name2));
    return this.selectAt(indices, as);
  }
  /**
   * Return an object mapping column names to extracted value arrays.
   * @returns {{ [P in keyof T]: ValueArray<T[P]> }}
   */
  toColumns() {
    const { children, names: names2 } = this;
    const cols = {};
    names2.forEach((name2, i) => {
      var _a2;
      return cols[name2] = ((_a2 = children[i]) == null ? void 0 : _a2.toArray()) ?? [];
    });
    return cols;
  }
  /**
   * Return an array of objects representing the rows of this table.
   * @returns {{ [P in keyof T]: T[P] }[]}
   */
  toArray() {
    var _a2;
    const { children, getFactory, numRows } = this;
    const data2 = ((_a2 = children[0]) == null ? void 0 : _a2.data) ?? [];
    const output2 = Array(numRows);
    for (let b = 0, row = -1; b < data2.length; ++b) {
      const f = getFactory(b);
      for (let i = 0; i < data2[b].length; ++i) {
        output2[++row] = f(i);
      }
    }
    return output2;
  }
  /**
   * Return an iterator over objects representing the rows of this table.
   * @returns {Generator<{ [P in keyof T]: T[P] }, any, any>}
   */
  *[Symbol.iterator]() {
    var _a2;
    const { children, getFactory } = this;
    const data2 = ((_a2 = children[0]) == null ? void 0 : _a2.data) ?? [];
    for (let b = 0; b < data2.length; ++b) {
      const f = getFactory(b);
      for (let i = 0; i < data2[b].length; ++i) {
        yield f(i);
      }
    }
  }
  /**
   * Return a row object for the given index.
   * @param {number} index The row index.
   * @returns {{ [P in keyof T]: T[P] }} The row object.
   */
  at(index2) {
    const { children, getFactory, numRows } = this;
    if (index2 < 0 || index2 >= numRows) return null;
    const [{ offsets }] = children;
    const b = bisect(offsets, index2) - 1;
    return getFactory(b)(index2 - offsets[b]);
  }
  /**
   * Return a row object for the given index. This method is the same as
   * `at()` and is provided for better compatibility with Apache Arrow JS.
   * @param {number} index The row index.
   * @returns {{ [P in keyof T]: T[P] }} The row object.
   */
  get(index2) {
    return this.at(index2);
  }
}
function renameField(field2, name2) {
  return name2 != null && name2 !== field2.name ? { ...field2, name: name2 } : field2;
}
function batchType(type, options = {}) {
  const { typeId, bitWidth, mode, precision, unit } = (
    /** @type {any} */
    type
  );
  const { useBigInt, useDate, useDecimalInt, useMap, useProxy } = options;
  switch (typeId) {
    case Type.Null:
      return NullBatch;
    case Type.Bool:
      return BoolBatch;
    case Type.Int:
    case Type.Time:
    case Type.Duration:
      return useBigInt || bitWidth < 64 ? DirectBatch : Int64Batch;
    case Type.Float:
      return precision ? DirectBatch : Float16Batch;
    case Type.Date:
      return wrap(
        unit === DateUnit.DAY ? DateDayBatch : DateDayMillisecondBatch,
        useDate && DateBatch
      );
    case Type.Timestamp:
      return wrap(
        unit === TimeUnit.SECOND ? TimestampSecondBatch : unit === TimeUnit.MILLISECOND ? TimestampMillisecondBatch : unit === TimeUnit.MICROSECOND ? TimestampMicrosecondBatch : TimestampNanosecondBatch,
        useDate && DateBatch
      );
    case Type.Decimal:
      return bitWidth === 32 ? useDecimalInt ? DirectBatch : Decimal32NumberBatch : useDecimalInt ? DecimalBigIntBatch : DecimalNumberBatch;
    case Type.Interval:
      return unit === IntervalUnit.DAY_TIME ? IntervalDayTimeBatch : unit === IntervalUnit.YEAR_MONTH ? DirectBatch : IntervalMonthDayNanoBatch;
    case Type.FixedSizeBinary:
      return FixedBinaryBatch;
    case Type.Utf8:
      return Utf8Batch;
    case Type.LargeUtf8:
      return LargeUtf8Batch;
    case Type.Binary:
      return BinaryBatch;
    case Type.LargeBinary:
      return LargeBinaryBatch;
    case Type.BinaryView:
      return BinaryViewBatch;
    case Type.Utf8View:
      return Utf8ViewBatch;
    case Type.List:
      return ListBatch;
    case Type.LargeList:
      return LargeListBatch;
    case Type.Map:
      return useMap ? MapBatch : MapEntryBatch;
    case Type.ListView:
      return ListViewBatch;
    case Type.LargeListView:
      return LargeListViewBatch;
    case Type.FixedSizeList:
      return FixedListBatch;
    case Type.Struct:
      return useProxy ? StructProxyBatch : StructBatch;
    case Type.RunEndEncoded:
      return RunEndEncodedBatch;
    case Type.Dictionary:
      return DictionaryBatch;
    case Type.Union:
      return mode ? DenseUnionBatch : SparseUnionBatch;
  }
  throw new Error(invalidDataType(typeId));
}
function wrap(BaseClass, WrapperClass) {
  return WrapperClass ? class WrapBatch extends WrapperClass {
    constructor(options) {
      super(new BaseClass(options));
    }
  } : BaseClass;
}
function writeInt32(buf2, index2, value) {
  buf2[index2] = value;
  buf2[index2 + 1] = value >> 8;
  buf2[index2 + 2] = value >> 16;
  buf2[index2 + 3] = value >> 24;
}
function writeInt64(buf2, index2, value) {
  const v = BigInt(value);
  writeInt32(buf2, index2 + 4, Number(BigInt.asIntN(32, v >> BigInt(32))));
  writeInt32(buf2, index2 + 0, Number(BigInt.asIntN(32, v)));
}
const INIT_SIZE = 1024;
class Builder {
  /**
   * Create a new builder instance.
   * @param {Sink} sink The byte consumer.
   */
  constructor(sink) {
    this.sink = sink;
    this.minalign = 1;
    this.buf = new Uint8Array(INIT_SIZE);
    this.space = INIT_SIZE;
    this.vtables = [];
    this.outputBytes = 0;
  }
  /**
   * Returns the flatbuffer offset, relative to the end of the current buffer.
   * @returns {number} Offset relative to the end of the buffer.
   */
  offset() {
    return this.buf.length - this.space;
  }
  /**
   * Write a flatbuffer int8 value at the current buffer position
   * and advance the internal cursor.
   * @param {number} value
   */
  writeInt8(value) {
    this.buf[this.space -= 1] = value;
  }
  /**
   * Write a flatbuffer int16 value at the current buffer position
   * and advance the internal cursor.
   * @param {number} value
   */
  writeInt16(value) {
    this.buf[this.space -= 2] = value;
    this.buf[this.space + 1] = value >> 8;
  }
  /**
   * Write a flatbuffer int32 value at the current buffer position
   * and advance the internal cursor.
   * @param {number} value
   */
  writeInt32(value) {
    writeInt32(this.buf, this.space -= 4, value);
  }
  /**
   * Write a flatbuffer int64 value at the current buffer position
   * and advance the internal cursor.
   * @param {number} value
   */
  writeInt64(value) {
    writeInt64(this.buf, this.space -= 8, value);
  }
  /**
   * Add a flatbuffer int8 value, properly aligned,
   * @param value The int8 value to add the buffer.
   */
  addInt8(value) {
    prep(this, 1, 0);
    this.writeInt8(value);
  }
  /**
   * Add a flatbuffer int16 value, properly aligned,
   * @param value The int16 value to add the buffer.
   */
  addInt16(value) {
    prep(this, 2, 0);
    this.writeInt16(value);
  }
  /**
   * Add a flatbuffer int32 value, properly aligned,
   * @param value The int32 value to add the buffer.
   */
  addInt32(value) {
    prep(this, 4, 0);
    this.writeInt32(value);
  }
  /**
   * Add a flatbuffer int64 values, properly aligned.
   * @param value The int64 value to add the buffer.
   */
  addInt64(value) {
    prep(this, 8, 0);
    this.writeInt64(value);
  }
  /**
   * Add a flatbuffer offset, relative to where it will be written.
   * @param {number} offset The offset to add.
   */
  addOffset(offset2) {
    prep(this, SIZEOF_INT, 0);
    this.writeInt32(this.offset() - offset2 + SIZEOF_INT);
  }
  /**
   * Add a flatbuffer object (vtable).
   * @param {number} numFields The maximum number of fields
   *  this object may include.
   * @param {(tableBuilder: ReturnType<objectBuilder>) => void} [addFields]
   *  A callback function that writes all fields using an object builder.
   * @returns {number} The object offset.
   */
  addObject(numFields, addFields) {
    const b = objectBuilder(this, numFields);
    addFields == null ? void 0 : addFields(b);
    return b.finish();
  }
  /**
   * Add a flatbuffer vector (list).
   * @template T
   * @param {T[]} items An array of items to write.
   * @param {number} itemSize The size in bytes of a serialized item.
   * @param {number} alignment The desired byte alignment value.
   * @param {(builder: this, item: T) => void} writeItem A callback
   *  function that writes a vector item to this builder.
   * @returns {number} The vector offset.
   */
  addVector(items, itemSize, alignment, writeItem) {
    const n = items == null ? void 0 : items.length;
    if (!n) return 0;
    prep(this, SIZEOF_INT, itemSize * n);
    prep(this, alignment, itemSize * n);
    for (let i = n; --i >= 0; ) {
      writeItem(this, items[i]);
    }
    this.writeInt32(n);
    return this.offset();
  }
  /**
   * Convenience method for writing a vector of byte buffer offsets.
   * @param {number[]} offsets
   * @returns {number} The vector offset.
   */
  addOffsetVector(offsets) {
    return this.addVector(offsets, 4, 4, (b, off) => b.addOffset(off));
  }
  /**
   * Add a flatbuffer UTF-8 string.
   * @param {string} s The string to encode.
   * @return {number} The string offset.
   */
  addString(s) {
    if (s == null) return 0;
    const utf82 = encodeUtf8(s);
    const n = utf82.length;
    this.addInt8(0);
    prep(this, SIZEOF_INT, n);
    this.buf.set(utf82, this.space -= n);
    this.writeInt32(n);
    return this.offset();
  }
  /**
   * Finish the current flatbuffer by adding a root offset.
   * @param {number} rootOffset The root offset.
   */
  finish(rootOffset) {
    prep(this, this.minalign, SIZEOF_INT);
    this.addOffset(rootOffset);
  }
  /**
   * Flush the current flatbuffer byte buffer content to the sink,
   * and reset the flatbuffer builder state.
   */
  flush() {
    const { buf: buf2, sink } = this;
    const bytes = buf2.subarray(this.space, buf2.length);
    sink.write(bytes);
    this.outputBytes += bytes.byteLength;
    this.minalign = 1;
    this.vtables = [];
    this.buf = new Uint8Array(INIT_SIZE);
    this.space = INIT_SIZE;
  }
  /**
   * Add a byte buffer directly to the builder sink. This method bypasses
   * any unflushed flatbuffer state and leaves it unchanged, writing the
   * buffer to the sink *before* the flatbuffer.
   * The buffer will be padded for 64-bit (8-byte) alignment as needed.
   * @param {Uint8Array} buffer The buffer to add.
   * @returns {number} The total byte count of the buffer and padding.
   */
  addBuffer(buffer2) {
    const size = buffer2.byteLength;
    if (!size) return 0;
    this.sink.write(buffer2);
    this.outputBytes += size;
    const pad3 = (size + 7 & -8) - size;
    this.addPadding(pad3);
    return size + pad3;
  }
  /**
   * Write padding bytes directly to the builder sink. This method bypasses
   * any unflushed flatbuffer state and leaves it unchanged, writing the
   * padding bytes to the sink *before* the flatbuffer.
   * @param {number} byteCount The number of padding bytes.
   */
  addPadding(byteCount) {
    if (byteCount > 0) {
      this.sink.write(new Uint8Array(byteCount));
      this.outputBytes += byteCount;
    }
  }
}
function prep(builder2, size, additionalBytes) {
  let { buf: buf2, space, minalign } = builder2;
  if (size > minalign) {
    builder2.minalign = size;
  }
  const bufSize = buf2.length;
  const used = bufSize - space + additionalBytes;
  const alignSize = ~used + 1 & size - 1;
  buf2 = grow(buf2, used + alignSize + size - 1, true);
  space += buf2.length - bufSize;
  for (let i = 0; i < alignSize; ++i) {
    buf2[--space] = 0;
  }
  builder2.buf = buf2;
  builder2.space = space;
}
function objectBuilder(builder2, numFields) {
  const vtable = Array(numFields).fill(0);
  const startOffset = builder2.offset();
  function slot(index2) {
    vtable[index2] = builder2.offset();
  }
  return {
    /**
     * Add an int8-valued table field.
     * @param {number} index
     * @param {number} value
     * @param {number} defaultValue
     */
    addInt8(index2, value, defaultValue) {
      if (value != defaultValue) {
        builder2.addInt8(value);
        slot(index2);
      }
    },
    /**
     * Add an int16-valued table field.
     * @param {number} index
     * @param {number} value
     * @param {number} defaultValue
     */
    addInt16(index2, value, defaultValue) {
      if (value != defaultValue) {
        builder2.addInt16(value);
        slot(index2);
      }
    },
    /**
     * Add an int32-valued table field.
     * @param {number} index
     * @param {number} value
     * @param {number} defaultValue
     */
    addInt32(index2, value, defaultValue) {
      if (value != defaultValue) {
        builder2.addInt32(value);
        slot(index2);
      }
    },
    /**
     * Add an int64-valued table field.
     * @param {number} index
     * @param {number} value
     * @param {number} defaultValue
     */
    addInt64(index2, value, defaultValue) {
      if (value != defaultValue) {
        builder2.addInt64(value);
        slot(index2);
      }
    },
    /**
     * Add a buffer offset-valued table field.
     * @param {number} index
     * @param {number} value
     * @param {number} defaultValue
     */
    addOffset(index2, value, defaultValue) {
      if (value != defaultValue) {
        builder2.addOffset(value);
        slot(index2);
      }
    },
    /**
     * Write the vtable to the buffer and return the table offset.
     * @returns {number} The buffer offset to the vtable.
     */
    finish() {
      builder2.addInt32(0);
      const vtableOffset = builder2.offset();
      let i = numFields;
      while (--i >= 0 && vtable[i] === 0) {
      }
      const size = i + 1;
      for (; i >= 0; --i) {
        builder2.addInt16(vtable[i] ? vtableOffset - vtable[i] : 0);
      }
      const standardFields = 2;
      builder2.addInt16(vtableOffset - startOffset);
      const len = (size + standardFields) * SIZEOF_SHORT;
      builder2.addInt16(len);
      let existingTable = 0;
      const { buf: buf2, vtables, space: vt1 } = builder2;
      outer_loop:
        for (i = 0; i < vtables.length; ++i) {
          const vt2 = buf2.length - vtables[i];
          if (len == readInt16(buf2, vt2)) {
            for (let j = SIZEOF_SHORT; j < len; j += SIZEOF_SHORT) {
              if (readInt16(buf2, vt1 + j) != readInt16(buf2, vt2 + j)) {
                continue outer_loop;
              }
            }
            existingTable = vtables[i];
            break;
          }
        }
      if (existingTable) {
        builder2.space = buf2.length - vtableOffset;
        writeInt32(buf2, builder2.space, existingTable - vtableOffset);
      } else {
        const off = builder2.offset();
        vtables.push(off);
        writeInt32(buf2, buf2.length - vtableOffset, off - vtableOffset);
      }
      return vtableOffset;
    }
  };
}
const LENGTH_NO_COMPRESSED_DATA = -1;
const COMPRESS_LENGTH_PREFIX = 8;
function missingCodec(type) {
  return `Missing compression codec "${keyFor(CompressionType, type)}" (id ${type})`;
}
const codecs = /* @__PURE__ */ new Map();
function getCompressionCodec(type) {
  return type != null && codecs.get(type) || null;
}
function compressBuffer(bytes, codec) {
  const compressed = codec.encode(bytes);
  const keep = compressed.length < bytes.length;
  const data2 = keep ? compressed : bytes;
  const buf2 = new Uint8Array(COMPRESS_LENGTH_PREFIX + data2.length);
  writeInt64(buf2, 0, keep ? bytes.length : LENGTH_NO_COMPRESSED_DATA);
  buf2.set(data2, COMPRESS_LENGTH_PREFIX);
  return buf2;
}
function encodeRecordBatch(builder2, batch, compression) {
  const { nodes, regions, variadic } = batch;
  const nodeVector = builder2.addVector(
    nodes,
    16,
    8,
    (builder3, node) => {
      builder3.writeInt64(node.nullCount);
      builder3.writeInt64(node.length);
      return builder3.offset();
    }
  );
  const regionVector = builder2.addVector(
    regions,
    16,
    8,
    (builder3, region) => {
      builder3.writeInt64(region.length);
      builder3.writeInt64(region.offset);
      return builder3.offset();
    }
  );
  const variadicVector = builder2.addVector(
    variadic,
    8,
    8,
    (builder3, count2) => builder3.addInt64(count2)
  );
  return builder2.addObject(5, (b) => {
    b.addInt64(0, nodes[0].length, 0);
    b.addOffset(1, nodeVector, 0);
    b.addOffset(2, regionVector, 0);
    b.addOffset(3, encodeCompression(builder2, compression), 0);
    b.addOffset(4, variadicVector, 0);
  });
}
function encodeCompression(builder2, compression) {
  if (!compression) return 0;
  const { codec, method } = compression;
  return builder2.addObject(2, (b) => {
    b.addInt8(0, codec, CompressionType.LZ4_FRAME);
    b.addInt8(1, method, BodyCompressionMethod.BUFFER);
  });
}
function encodeDictionaryBatch(builder2, dictionaryBatch, compression) {
  const dataOffset = encodeRecordBatch(builder2, dictionaryBatch.data, compression);
  return builder2.addObject(3, (b) => {
    b.addInt64(0, dictionaryBatch.id, 0);
    b.addOffset(1, dataOffset, 0);
    b.addInt8(2, +dictionaryBatch.isDelta, 0);
  });
}
function encodeMetadata(builder2, metadata) {
  return (metadata == null ? void 0 : metadata.size) > 0 ? builder2.addOffsetVector(Array.from(metadata, ([k, v]) => {
    const key2 = builder2.addString(`${k}`);
    const val = builder2.addString(`${v}`);
    return builder2.addObject(2, (b) => {
      b.addOffset(0, key2, 0);
      b.addOffset(1, val, 0);
    });
  })) : 0;
}
function encodeDataType(builder2, type) {
  const typeId = checkOneOf(type.typeId, Type, invalidDataType);
  switch (typeId) {
    case Type.Dictionary:
      return encodeDictionary(builder2, type);
    case Type.Int:
      return encodeInt(builder2, type);
    case Type.Float:
      return encodeFloat(builder2, type);
    case Type.Decimal:
      return encodeDecimal(builder2, type);
    case Type.Date:
      return encodeDate(builder2, type);
    case Type.Time:
      return encodeTime(builder2, type);
    case Type.Timestamp:
      return encodeTimestamp(builder2, type);
    case Type.Interval:
      return encodeInterval(builder2, type);
    case Type.Duration:
      return encodeDuration(builder2, type);
    case Type.FixedSizeBinary:
    case Type.FixedSizeList:
      return encodeFixedSize(builder2, type);
    case Type.Map:
      return encodeMap(builder2, type);
    case Type.Union:
      return encodeUnion(builder2, type);
  }
  return builder2.addObject(0);
}
function encodeDate(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt16(0, type.unit, DateUnit.MILLISECOND);
  });
}
function encodeDecimal(builder2, type) {
  return builder2.addObject(3, (b) => {
    b.addInt32(0, type.precision, 0);
    b.addInt32(1, type.scale, 0);
    b.addInt32(2, type.bitWidth, 128);
  });
}
function encodeDuration(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt16(0, type.unit, TimeUnit.MILLISECOND);
  });
}
function encodeFixedSize(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt32(0, type.stride, 0);
  });
}
function encodeFloat(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt16(0, type.precision, Precision.HALF);
  });
}
function encodeInt(builder2, type) {
  return builder2.addObject(2, (b) => {
    b.addInt32(0, type.bitWidth, 0);
    b.addInt8(1, +type.signed, 0);
  });
}
function encodeInterval(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt16(0, type.unit, IntervalUnit.YEAR_MONTH);
  });
}
function encodeMap(builder2, type) {
  return builder2.addObject(1, (b) => {
    b.addInt8(0, +type.keysSorted, 0);
  });
}
function encodeTime(builder2, type) {
  return builder2.addObject(2, (b) => {
    b.addInt16(0, type.unit, TimeUnit.MILLISECOND);
    b.addInt32(1, type.bitWidth, 32);
  });
}
function encodeTimestamp(builder2, type) {
  const timezoneOffset = builder2.addString(type.timezone);
  return builder2.addObject(2, (b) => {
    b.addInt16(0, type.unit, TimeUnit.SECOND);
    b.addOffset(1, timezoneOffset, 0);
  });
}
function encodeUnion(builder2, type) {
  const typeIdsOffset = builder2.addVector(
    type.typeIds,
    4,
    4,
    (builder3, value) => builder3.addInt32(value)
  );
  return builder2.addObject(2, (b) => {
    b.addInt16(0, type.mode, UnionMode.Sparse);
    b.addOffset(1, typeIdsOffset, 0);
  });
}
function encodeDictionary(builder2, type) {
  return builder2.addObject(4, (b) => {
    b.addInt64(0, type.id, 0);
    b.addOffset(1, encodeDataType(builder2, type.indices), 0);
    b.addInt8(2, +type.ordered, 0);
  });
}
const isLittleEndian = new Uint16Array(new Uint8Array([1, 0]).buffer)[0] === 1;
function encodeSchema(builder2, schema) {
  const { fields, metadata } = schema;
  const fieldOffsets = fields.map((f) => encodeField(builder2, f));
  const fieldsVectorOffset = builder2.addOffsetVector(fieldOffsets);
  const metadataOffset = encodeMetadata(builder2, metadata);
  return builder2.addObject(4, (b) => {
    b.addInt16(0, +!isLittleEndian, 0);
    b.addOffset(1, fieldsVectorOffset, 0);
    b.addOffset(2, metadataOffset, 0);
  });
}
function encodeField(builder2, field2) {
  const { name: name2, nullable: nullable2, type, metadata } = field2;
  let { typeId } = type;
  let typeOffset = 0;
  let dictionaryOffset = 0;
  if (typeId !== Type.Dictionary) {
    typeOffset = encodeDataType(builder2, type);
  } else {
    const dict = (
      /** @type {DictionaryType} */
      type.dictionary
    );
    typeId = dict.typeId;
    dictionaryOffset = encodeDataType(builder2, type);
    typeOffset = encodeDataType(builder2, dict);
  }
  const childOffsets = (type.children || []).map((f) => encodeField(builder2, f));
  const childrenVectorOffset = builder2.addOffsetVector(childOffsets);
  const metadataOffset = encodeMetadata(builder2, metadata);
  const nameOffset = builder2.addString(name2);
  return builder2.addObject(7, (b) => {
    b.addOffset(0, nameOffset, 0);
    b.addInt8(1, +nullable2, 0);
    b.addInt8(2, typeId, Type.NONE);
    b.addOffset(3, typeOffset, 0);
    b.addOffset(4, dictionaryOffset, 0);
    b.addOffset(5, childrenVectorOffset, 0);
    b.addOffset(6, metadataOffset, 0);
  });
}
function writeFooter(builder2, schema, dictBlocks, recordBlocks, metadata) {
  const metadataOffset = encodeMetadata(builder2, metadata);
  const recsOffset = builder2.addVector(recordBlocks, 24, 8, encodeBlock);
  const dictsOffset = builder2.addVector(dictBlocks, 24, 8, encodeBlock);
  const schemaOffset = encodeSchema(builder2, schema);
  builder2.finish(
    builder2.addObject(5, (b) => {
      b.addInt16(0, Version.V5, Version.V1);
      b.addOffset(1, schemaOffset, 0);
      b.addOffset(2, dictsOffset, 0);
      b.addOffset(3, recsOffset, 0);
      b.addOffset(4, metadataOffset, 0);
    })
  );
  const size = builder2.offset();
  builder2.addInt32(0);
  builder2.addInt32(-1);
  builder2.flush();
  builder2.sink.write(new Uint8Array(Int32Array.of(size).buffer));
  builder2.sink.write(MAGIC);
}
function encodeBlock(builder2, { offset: offset2, metadataLength, bodyLength }) {
  builder2.writeInt64(bodyLength);
  builder2.writeInt32(0);
  builder2.writeInt32(metadataLength);
  builder2.writeInt64(offset2);
  return builder2.offset();
}
function writeMessage(builder2, headerType, headerOffset, bodyLength, blocks) {
  builder2.finish(
    builder2.addObject(5, (b) => {
      b.addInt16(0, Version.V5, Version.V1);
      b.addInt8(1, headerType, MessageHeader.NONE);
      b.addOffset(2, headerOffset, 0);
      b.addInt64(3, bodyLength, 0);
    })
  );
  const prefixSize = 8;
  const messageSize = builder2.offset();
  const alignedSize = messageSize + prefixSize + 7 & -8;
  blocks == null ? void 0 : blocks.push({
    offset: builder2.outputBytes,
    metadataLength: alignedSize,
    bodyLength
  });
  builder2.addInt32(alignedSize - prefixSize);
  builder2.addInt32(-1);
  builder2.flush();
  builder2.addPadding(alignedSize - messageSize - prefixSize);
}
class Sink {
  /**
   * Write bytes to this sink.
   * @param {Uint8Array} bytes The byte buffer to write.
   */
  write(bytes) {
  }
  /**
   * Write padding bytes (zeroes) to this sink.
   * @param {number} byteCount The number of padding bytes.
   */
  pad(byteCount) {
    this.write(new Uint8Array(byteCount));
  }
  /**
   * @returns {Uint8Array | null}
   */
  finish() {
    return null;
  }
}
class MemorySink extends Sink {
  /**
   * A sink that collects bytes in memory.
   */
  constructor() {
    super();
    this.buffers = [];
  }
  /**
   * Write bytes
   * @param {Uint8Array} bytes
   */
  write(bytes) {
    this.buffers.push(bytes);
  }
  /**
   * @returns {Uint8Array}
   */
  finish() {
    const bufs = this.buffers;
    const size = bufs.reduce((sum, b) => sum + b.byteLength, 0);
    const buf2 = new Uint8Array(size);
    for (let i = 0, off = 0; i < bufs.length; ++i) {
      buf2.set(bufs[i], off);
      off += bufs[i].byteLength;
    }
    return buf2;
  }
}
const STREAM = "stream";
const FILE = "file";
function encodeIPC(data2, { sink, format = STREAM, codec } = {}) {
  if (format !== STREAM && format !== FILE) {
    throw new Error(`Unrecognized Arrow IPC format: ${format}`);
  }
  const { schema, dictionaries = [], records = [], metadata } = data2;
  const builder2 = new Builder(sink || new MemorySink());
  const file = format === FILE;
  const dictBlocks = [];
  const recordBlocks = [];
  const compression = codec != null ? { codec, method: BodyCompressionMethod.BUFFER } : null;
  if (file) {
    builder2.addBuffer(MAGIC);
  }
  if (schema) {
    writeMessage(
      builder2,
      MessageHeader.Schema,
      encodeSchema(builder2, schema),
      0
    );
  }
  for (const dict of dictionaries) {
    const { data: data3 } = dict;
    writeMessage(
      builder2,
      MessageHeader.DictionaryBatch,
      encodeDictionaryBatch(builder2, dict, compression),
      data3.byteLength,
      dictBlocks
    );
    writeBuffers(builder2, data3.buffers);
  }
  for (const batch of records) {
    writeMessage(
      builder2,
      MessageHeader.RecordBatch,
      encodeRecordBatch(builder2, batch, compression),
      batch.byteLength,
      recordBlocks
    );
    writeBuffers(builder2, batch.buffers);
  }
  builder2.addBuffer(EOS);
  if (file) {
    writeFooter(builder2, schema, dictBlocks, recordBlocks, metadata);
  }
  return builder2.sink;
}
function writeBuffers(builder2, buffers) {
  for (let i = 0; i < buffers.length; ++i) {
    builder2.addBuffer(buffers[i]);
  }
}
function tableToIPC(table, options) {
  if (typeof options === "string") {
    options = { format: options };
  }
  const id = options == null ? void 0 : options.codec;
  const codec = getCompressionCodec(id);
  if (id != null && !codec) throw new Error(missingCodec(id));
  const columns2 = table.children;
  checkBatchLengths(columns2);
  const { dictionaries, idMap } = assembleDictionaryBatches(columns2, codec);
  const records = assembleRecordBatches(columns2, codec);
  const schema = assembleSchema(table.schema, idMap);
  const data2 = { schema, dictionaries, records };
  return encodeIPC(data2, { ...options, codec: id }).finish();
}
function checkBatchLengths(columns2) {
  var _a2;
  const n = (_a2 = columns2[0]) == null ? void 0 : _a2.data.map((d) => d.length);
  columns2.forEach(({ data: data2 }) => {
    if (data2.length !== n.length || data2.some((b, i) => b.length !== n[i])) {
      throw new Error("Columns have inconsistent batch sizes.");
    }
  });
}
function assembleContext(codec) {
  let byteLength = 0;
  const nodes = [];
  const regions = [];
  const buffers = [];
  const variadic = [];
  return {
    /**
     * @param {number} length
     * @param {number} nullCount
     */
    node(length2, nullCount) {
      nodes.push({ length: length2, nullCount });
    },
    /**
     * @param {TypedArray} b
     */
    buffer(b) {
      const bytes = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
      const buf2 = codec ? compressBuffer(bytes, codec) : bytes;
      const length2 = buf2.byteLength;
      regions.push({ offset: byteLength, length: length2 });
      buffers.push(buf2);
      byteLength += length2 + 7 & -8;
    },
    /**
     * @param {number} length
     */
    variadic(length2) {
      variadic.push(length2);
    },
    /**
     * @param {DataType} type
     * @param {Batch} batch
     */
    children(type, batch) {
      type.children.forEach((field2, index2) => {
        visit(field2.type, batch.children[index2], this);
      });
    },
    /**
     * @returns {RecordBatch}
     */
    done() {
      return { byteLength, nodes, regions, variadic, buffers };
    }
  };
}
function assembleDictionaryBatches(columns2, codec) {
  const dictionaries = [];
  const dictMap = /* @__PURE__ */ new Map();
  const idMap = /* @__PURE__ */ new Map();
  let id = -1;
  const visitor = (dictionaryColumn) => {
    if (!dictMap.has(dictionaryColumn)) {
      dictMap.set(dictionaryColumn, ++id);
      for (let i = 0; i < dictionaryColumn.data.length; ++i) {
        dictionaries.push({
          id,
          isDelta: i > 0,
          data: assembleRecordBatch([dictionaryColumn], i, codec)
        });
      }
      idMap.set(dictionaryColumn.type, id);
    } else {
      idMap.set(dictionaryColumn.type, dictMap.get(dictionaryColumn));
    }
  };
  columns2.forEach((col) => visitDictionaries(col.data[0], visitor));
  return { dictionaries, idMap };
}
function visitDictionaries(batch, visitor) {
  var _a2;
  if ((batch == null ? void 0 : batch.type.typeId) === Type.Dictionary) {
    const dictionary2 = batch.dictionary;
    visitor(dictionary2);
    visitDictionaries(dictionary2.data[0], visitor);
  }
  (_a2 = batch == null ? void 0 : batch.children) == null ? void 0 : _a2.forEach((child) => visitDictionaries(child, visitor));
}
function assembleSchema(schema, idMap) {
  if (!idMap.size) return schema;
  const visit2 = (type) => {
    if (type.typeId === Type.Dictionary) {
      type.id = idMap.get(type.dictionary);
      visitDictType(type);
    }
    if (type.children) {
      (type.children = type.children.slice()).forEach(visitFields);
    }
  };
  const visitFields = (field2, index2, array2) => {
    const type = { ...field2.type };
    array2[index2] = { ...field2, type };
    visit2(type);
  };
  const visitDictType = (parentType) => {
    const type = { ...parentType.dictionary };
    parentType.dictionary = type;
    visit2(type);
  };
  schema = { ...schema, fields: schema.fields.slice() };
  schema.fields.forEach(visitFields);
  return schema;
}
function assembleRecordBatches(columns2, codec) {
  var _a2;
  return (((_a2 = columns2[0]) == null ? void 0 : _a2.data) || []).map((_, index2) => assembleRecordBatch(columns2, index2, codec));
}
function assembleRecordBatch(columns2, batchIndex = 0, codec) {
  const ctx = assembleContext(codec);
  columns2.forEach((column) => {
    visit(column.type, column.data[batchIndex], ctx);
  });
  return ctx.done();
}
function visit(type, batch, ctx) {
  const { typeId } = type;
  ctx.node(batch.length, batch.nullCount);
  if (typeId === Type.Null) return;
  switch (typeId) {
    // validity and value buffers
    // backing dictionaries handled elsewhere
    case Type.Bool:
    case Type.Int:
    case Type.Time:
    case Type.Duration:
    case Type.Float:
    case Type.Date:
    case Type.Timestamp:
    case Type.Decimal:
    case Type.Interval:
    case Type.FixedSizeBinary:
    case Type.Dictionary:
      ctx.buffer(batch.validity);
      ctx.buffer(batch.values);
      return;
    // validity, offset, and value buffers
    case Type.Utf8:
    case Type.LargeUtf8:
    case Type.Binary:
    case Type.LargeBinary:
      ctx.buffer(batch.validity);
      ctx.buffer(batch.offsets);
      ctx.buffer(batch.values);
      return;
    // views with variadic buffers
    case Type.BinaryView:
    case Type.Utf8View:
      ctx.buffer(batch.validity);
      ctx.buffer(batch.values);
      ctx.variadic(batch.data.length);
      batch.data.forEach((b) => ctx.buffer(b));
      return;
    // validity, offset, and list child
    case Type.List:
    case Type.LargeList:
    case Type.Map:
      ctx.buffer(batch.validity);
      ctx.buffer(batch.offsets);
      ctx.children(type, batch);
      return;
    // validity, offset, size, and list child
    case Type.ListView:
    case Type.LargeListView:
      ctx.buffer(batch.validity);
      ctx.buffer(batch.offsets);
      ctx.buffer(batch.sizes);
      ctx.children(type, batch);
      return;
    // validity and children
    case Type.FixedSizeList:
    case Type.Struct:
      ctx.buffer(batch.validity);
      ctx.children(type, batch);
      return;
    // children only
    case Type.RunEndEncoded:
      ctx.children(type, batch);
      return;
    // union
    case Type.Union: {
      ctx.buffer(batch.typeIds);
      if (type.mode === UnionMode.Dense) {
        ctx.buffer(batch.offsets);
      }
      ctx.children(type, batch);
      return;
    }
    // unsupported type
    default:
      throw new Error(invalidDataType(typeId));
  }
}
function buffer(arrayType2) {
  return new Buffer2(arrayType2);
}
class Buffer2 {
  /**
   * Create a new resizable buffer instance.
   * @param {TypedArrayConstructor} arrayType
   */
  constructor(arrayType2 = uint8Array) {
    this.buf = new arrayType2(512);
  }
  /**
   * Return the underlying data as a 64-bit aligned array of minimum size.
   * @param {number} size The desired minimum array size.
   * @returns {TypedArray} The 64-bit aligned array.
   */
  array(size) {
    return align(this.buf, size);
  }
  /**
   * Prepare for writes to the given index, resizing as necessary.
   * @param {number} index The array index to prepare to write to.
   */
  prep(index2) {
    if (index2 >= this.buf.length) {
      this.buf = grow(this.buf, index2);
    }
  }
  /**
   * Return the value at the given index.
   * @param {number} index The array index.
   */
  get(index2) {
    return this.buf[index2];
  }
  /**
   * Set a value at the given index.
   * @param {number | bigint} value The value to set.
   * @param {number} index The index to write to.
   */
  set(value, index2) {
    this.prep(index2);
    this.buf[index2] = value;
  }
  /**
   * Write a byte array at the given index. The method should be called
   * only when the underlying buffer is of type Uint8Array.
   * @param {Uint8Array} bytes The byte array.
   * @param {number} index The starting index to write to.
   */
  write(bytes, index2) {
    this.prep(index2 + bytes.length);
    this.buf.set(bytes, index2);
  }
}
function bitmap() {
  return new Bitmap();
}
class Bitmap extends Buffer2 {
  /**
   * Set a bit to true at the given bitmap index.
   * @param {number} index The index to write to.
   */
  set(index2) {
    const i = index2 >> 3;
    this.prep(i);
    this.buf[i] |= 1 << index2 % 8;
  }
}
class BatchBuilder {
  constructor(type, ctx) {
    this.type = type;
    this.ctx = ctx;
    this.batchClass = ctx.batchType(type);
  }
  /**
   * Initialize the builder state.
   * @returns {this} This builder.
   */
  init() {
    this.index = -1;
    return this;
  }
  /**
   * Write a value to the builder.
   * @param {*} value
   * @param {number} index
   * @returns {boolean | void}
   */
  set(value, index2) {
    this.index = index2;
    return false;
  }
  /**
   * Returns a batch constructor options object.
   * Used internally to marshal batch data.
   * @returns {Record<string, any>}
   */
  done() {
    return null;
  }
  /**
   * Returns a completed batch and reinitializes the builder state.
   * @returns {Batch}
   */
  batch() {
    const b = new this.batchClass(this.done());
    this.init();
    return b;
  }
}
class ValidityBuilder extends BatchBuilder {
  constructor(type, ctx) {
    super(type, ctx);
  }
  init() {
    this.nullCount = 0;
    this.validity = bitmap();
    return super.init();
  }
  /**
   * @param {*} value
   * @param {number} index
   * @returns {boolean | void}
   */
  set(value, index2) {
    this.index = index2;
    const isValid2 = value != null;
    if (isValid2) {
      this.validity.set(index2);
    } else {
      this.nullCount++;
    }
    return isValid2;
  }
  done() {
    const { index: index2, nullCount, type, validity } = this;
    return {
      length: index2 + 1,
      nullCount,
      type,
      validity: nullCount ? validity.array((index2 >> 3) + 1) : new uint8Array(0)
    };
  }
}
function dictionaryContext() {
  const idMap = /* @__PURE__ */ new Map();
  const dicts = /* @__PURE__ */ new Set();
  return {
    /**
     * Get a dictionary values builder for the given dictionary type.
     * @param {DictionaryType} type
     *  The dictionary type.
     * @param {*} ctx The builder context.
     * @returns {ReturnType<dictionaryValues>}
     */
    get(type, ctx) {
      const id = type.id;
      if (id >= 0 && idMap.has(id)) {
        return idMap.get(id);
      } else {
        const dict = dictionaryValues(type, ctx);
        if (id >= 0) idMap.set(id, dict);
        dicts.add(dict);
        return dict;
      }
    },
    /**
     * Finish building dictionary values columns and assign them to
     * their corresponding dictionary batches.
     * @param {ExtractionOptions} options
     */
    finish(options) {
      dicts.forEach((dict) => dict.finish(options));
    }
  };
}
function dictionaryValues(type, ctx) {
  const keys2 = /* @__PURE__ */ Object.create(null);
  const values2 = ctx.builder(type.dictionary);
  const batches = [];
  values2.init();
  let index2 = -1;
  return {
    type,
    values: values2,
    add(batch) {
      batches.push(batch);
      return batch;
    },
    key(value) {
      const v = keyString(value);
      let k = keys2[v];
      if (k === void 0) {
        keys2[v] = k = ++index2;
        values2.set(value, k);
      }
      return k;
    },
    finish(options) {
      const valueType = type.dictionary;
      const batch = new (batchType(valueType, options))(values2.done());
      const dictionary2 = new Column([batch]);
      batches.forEach((batch2) => batch2.setDictionary(dictionary2));
    }
  };
}
class DictionaryBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.dict = ctx.dictionary(type);
  }
  init() {
    this.values = buffer(this.type.indices.values);
    return super.init();
  }
  set(value, index2) {
    if (super.set(value, index2)) {
      this.values.set(this.dict.key(value), index2);
    }
  }
  done() {
    return {
      ...super.done(),
      values: this.values.array(this.index + 1)
    };
  }
  batch() {
    return this.dict.add(super.batch());
  }
}
function inferType(visit2) {
  const profile = profiler();
  visit2((value) => profile.add(value));
  return profile.type();
}
function profiler() {
  let length2 = 0;
  let nullCount = 0;
  let boolCount = 0;
  let numberCount = 0;
  let intCount = 0;
  let bigintCount = 0;
  let dateCount = 0;
  let dayCount = 0;
  let stringCount = 0;
  let arrayCount = 0;
  let structCount = 0;
  let min2 = Infinity;
  let max2 = -Infinity;
  let minLength = Infinity;
  let maxLength = -Infinity;
  let minBigInt;
  let maxBigInt;
  let arrayProfile;
  let structProfiles = {};
  return {
    add(value) {
      length2++;
      if (value == null) {
        nullCount++;
        return;
      }
      switch (typeof value) {
        case "string":
          stringCount++;
          break;
        case "number":
          numberCount++;
          if (value < min2) min2 = value;
          if (value > max2) max2 = value;
          if (Number.isInteger(value)) intCount++;
          break;
        case "bigint":
          bigintCount++;
          if (minBigInt === void 0) {
            minBigInt = maxBigInt = value;
          } else {
            if (value < minBigInt) minBigInt = value;
            if (value > maxBigInt) maxBigInt = value;
          }
          break;
        case "boolean":
          boolCount++;
          break;
        case "object":
          if (value instanceof Date) {
            dateCount++;
            if (+value % 864e5 === 0) dayCount++;
          } else if (isArray(value)) {
            arrayCount++;
            const len = value.length;
            if (len < minLength) minLength = len;
            if (len > maxLength) maxLength = len;
            arrayProfile ?? (arrayProfile = profiler());
            value.forEach(arrayProfile.add);
          } else {
            structCount++;
            for (const key2 in value) {
              const fieldProfiler = structProfiles[key2] ?? (structProfiles[key2] = profiler());
              fieldProfiler.add(value[key2]);
            }
          }
      }
    },
    type() {
      const valid = length2 - nullCount;
      return valid === 0 ? nullType() : intCount === valid ? intType(min2, max2) : numberCount === valid ? float64() : bigintCount === valid ? bigintType(minBigInt, maxBigInt) : boolCount === valid ? bool() : dayCount === valid ? dateDay() : dateCount === valid ? timestamp() : stringCount === valid ? dictionary(utf8()) : arrayCount === valid ? arrayType(arrayProfile.type(), minLength, maxLength) : structCount === valid ? struct(
        Object.entries(structProfiles).map((_) => field(_[0], _[1].type()))
      ) : unionType();
    }
  };
}
function arrayType(type, minLength, maxLength) {
  return maxLength === minLength ? fixedSizeList(type, minLength) : list(type);
}
function intType(min2, max2) {
  const v = Math.max(Math.abs(min2) - 1, max2);
  return v < 1 << 7 ? int8() : v < 1 << 15 ? int16() : v < 2 ** 31 ? int32() : float64();
}
function bigintType(min2, max2) {
  const v = -min2 > max2 ? -min2 - 1n : max2;
  if (v >= 2 ** 63) {
    throw new Error(`BigInt exceeds 64 bits: ${v}`);
  }
  return int64();
}
function unionType() {
  throw new Error("Mixed types detected, please define a union type.");
}
class BinaryBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.toOffset = toOffset(type.offsets);
  }
  init() {
    this.offsets = buffer(this.type.offsets);
    this.values = buffer();
    this.pos = 0;
    return super.init();
  }
  set(value, index2) {
    const { offsets, values: values2, toOffset: toOffset2 } = this;
    if (super.set(value, index2)) {
      values2.write(value, this.pos);
      this.pos += value.length;
    }
    offsets.set(toOffset2(this.pos), index2 + 1);
  }
  done() {
    return {
      ...super.done(),
      offsets: this.offsets.array(this.index + 2),
      values: this.values.array(this.pos + 1)
    };
  }
}
class BoolBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
  }
  init() {
    this.values = bitmap();
    return super.init();
  }
  set(value, index2) {
    super.set(value, index2);
    if (value) this.values.set(index2);
  }
  done() {
    return {
      ...super.done(),
      values: this.values.array((this.index >> 3) + 1)
    };
  }
}
class DecimalBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.scale = 10 ** type.scale;
    this.stride = type.bitWidth >> 6;
  }
  init() {
    this.values = buffer(this.type.values);
    return super.init();
  }
  set(value, index2) {
    const { scale, stride, values: values2 } = this;
    if (super.set(value, index2)) {
      values2.prep((index2 + 1) * stride);
      toDecimal(value, values2.buf, index2 * stride, stride, scale);
    }
  }
  done() {
    const { index: index2, stride, values: values2 } = this;
    return {
      ...super.done(),
      values: values2.array((index2 + 1) * stride)
    };
  }
}
class FixedSizeBinaryBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.stride = type.stride;
  }
  init() {
    this.values = buffer();
    return super.init();
  }
  set(value, index2) {
    if (super.set(value, index2)) {
      this.values.write(value, index2 * this.stride);
    }
  }
  done() {
    const { stride, values: values2 } = this;
    return {
      ...super.done(),
      values: values2.array(stride * (this.index + 1))
    };
  }
}
class FixedSizeListBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.child = ctx.builder(this.type.children[0].type);
    this.stride = type.stride;
  }
  init() {
    this.child.init();
    return super.init();
  }
  set(value, index2) {
    const { child, stride } = this;
    const base = index2 * stride;
    if (super.set(value, index2)) {
      for (let i = 0; i < stride; ++i) {
        child.set(value[i], base + i);
      }
    } else {
      child.index = base + stride;
    }
  }
  done() {
    const { child } = this;
    return {
      ...super.done(),
      children: [child.batch()]
    };
  }
}
class IntervalDayTimeBuilder extends ValidityBuilder {
  init() {
    this.values = buffer(this.type.values);
    return super.init();
  }
  set(value, index2) {
    if (super.set(value, index2)) {
      const i = index2 << 1;
      this.values.set(value[0], i);
      this.values.set(value[1], i + 1);
    }
  }
  done() {
    return {
      ...super.done(),
      values: this.values.array(this.index + 1 << 1)
    };
  }
}
class IntervalMonthDayNanoBuilder extends ValidityBuilder {
  init() {
    this.values = buffer();
    return super.init();
  }
  set(value, index2) {
    if (super.set(value, index2)) {
      this.values.write(toMonthDayNanoBytes(value), index2 << 4);
    }
  }
  done() {
    return {
      ...super.done(),
      values: this.values.array(this.index + 1 << 4)
    };
  }
}
class AbstractListBuilder extends ValidityBuilder {
  constructor(type, ctx, child) {
    super(type, ctx);
    this.child = child;
  }
  init() {
    this.child.init();
    const offsetType = this.type.offsets;
    this.offsets = buffer(offsetType);
    this.toOffset = toOffset(offsetType);
    this.pos = 0;
    return super.init();
  }
  done() {
    return {
      ...super.done(),
      offsets: this.offsets.array(this.index + 2),
      children: [this.child.batch()]
    };
  }
}
class ListBuilder extends AbstractListBuilder {
  constructor(type, ctx) {
    super(type, ctx, ctx.builder(type.children[0].type));
  }
  set(value, index2) {
    const { child, offsets, toOffset: toOffset2 } = this;
    if (super.set(value, index2)) {
      value.forEach((v) => child.set(v, this.pos++));
    }
    offsets.set(toOffset2(this.pos), index2 + 1);
  }
}
class AbstractStructBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.children = type.children.map((c) => ctx.builder(c.type));
  }
  init() {
    this.children.forEach((c) => c.init());
    return super.init();
  }
  done() {
    const { children } = this;
    children.forEach((c) => c.index = this.index);
    return {
      ...super.done(),
      children: children.map((c) => c.batch())
    };
  }
}
class StructBuilder extends AbstractStructBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.setters = this.children.map((child, i) => {
      const name2 = type.children[i].name;
      return (value, index2) => child.set(value == null ? void 0 : value[name2], index2);
    });
  }
  set(value, index2) {
    super.set(value, index2);
    const setters = this.setters;
    for (let i = 0; i < setters.length; ++i) {
      setters[i](value, index2);
    }
  }
}
class MapBuilder extends AbstractListBuilder {
  constructor(type, ctx) {
    super(type, ctx, new MapStructBuilder(type.children[0].type, ctx));
  }
  set(value, index2) {
    const { child, offsets, toOffset: toOffset2 } = this;
    if (super.set(value, index2)) {
      for (const keyValuePair of value) {
        child.set(keyValuePair, this.pos++);
      }
    }
    offsets.set(toOffset2(this.pos), index2 + 1);
  }
}
class MapStructBuilder extends AbstractStructBuilder {
  set(value, index2) {
    super.set(value, index2);
    const [key2, val] = this.children;
    key2.set(value[0], index2);
    val.set(value[1], index2);
  }
}
const NO_VALUE = {};
class RunEndEncodedBuilder extends BatchBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.children = type.children.map((c) => ctx.builder(c.type));
  }
  init() {
    this.pos = 0;
    this.key = null;
    this.value = NO_VALUE;
    this.children.forEach((c) => c.init());
    return super.init();
  }
  next() {
    const [runs, vals] = this.children;
    runs.set(this.index + 1, this.pos);
    vals.set(this.value, this.pos++);
  }
  set(value, index2) {
    if (value !== this.value) {
      const key2 = keyString(value);
      if (key2 !== this.key) {
        if (this.key) this.next();
        this.key = key2;
        this.value = value;
      }
    }
    this.index = index2;
  }
  done() {
    this.next();
    const { children, index: index2, type } = this;
    return {
      length: index2 + 1,
      nullCount: 0,
      type,
      children: children.map((c) => c.batch())
    };
  }
}
class AbstractUnionBuilder extends BatchBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.children = type.children.map((c) => ctx.builder(c.type));
    this.typeMap = type.typeMap;
    this.lookup = type.typeIdForValue;
  }
  init() {
    this.nullCount = 0;
    this.typeIds = buffer(int8Array);
    this.children.forEach((c) => c.init());
    return super.init();
  }
  set(value, index2) {
    const { children, lookup: lookup2, typeMap, typeIds } = this;
    this.index = index2;
    const typeId = lookup2(value, index2);
    const child = children[typeMap[typeId]];
    typeIds.set(typeId, index2);
    if (value == null) ++this.nullCount;
    this.update(value, index2, child);
  }
  done() {
    const { children, nullCount, type, typeIds } = this;
    const length2 = this.index + 1;
    return {
      length: length2,
      nullCount,
      type,
      typeIds: typeIds.array(length2),
      children: children.map((c) => c.batch())
    };
  }
}
class SparseUnionBuilder extends AbstractUnionBuilder {
  update(value, index2, child) {
    child.set(value, index2);
    this.children.forEach((c) => {
      if (c !== child) c.set(null, index2);
    });
  }
}
class DenseUnionBuilder extends AbstractUnionBuilder {
  init() {
    this.offsets = buffer(this.type.offsets);
    return super.init();
  }
  update(value, index2, child) {
    const offset2 = child.index + 1;
    child.set(value, offset2);
    this.offsets.set(offset2, index2);
  }
  done() {
    return {
      ...super.done(),
      offsets: this.offsets.array(this.index + 1)
    };
  }
}
class Utf8Builder extends BinaryBuilder {
  set(value, index2) {
    super.set(value && encodeUtf8(value), index2);
  }
}
class DirectBuilder extends ValidityBuilder {
  constructor(type, ctx) {
    super(type, ctx);
    this.values = buffer(type.values);
  }
  init() {
    this.values = buffer(this.type.values);
    return super.init();
  }
  /**
   * @param {*} value
   * @param {number} index
   * @returns {boolean | void}
   */
  set(value, index2) {
    if (super.set(value, index2)) {
      this.values.set(value, index2);
    }
  }
  done() {
    return {
      ...super.done(),
      values: this.values.array(this.index + 1)
    };
  }
}
class Int64Builder extends DirectBuilder {
  set(value, index2) {
    super.set(value == null ? value : toBigInt(value), index2);
  }
}
class TransformBuilder extends DirectBuilder {
  constructor(type, ctx, transform2) {
    super(type, ctx);
    this.transform = transform2;
  }
  set(value, index2) {
    super.set(value == null ? value : this.transform(value), index2);
  }
}
function builderContext(options = {}, dictionaries = dictionaryContext()) {
  return {
    batchType: (type) => batchType(type, options),
    builder(type) {
      return builder(type, this);
    },
    dictionary(type) {
      return dictionaries.get(type, this);
    },
    finish: () => dictionaries.finish(options)
  };
}
function builder(type, ctx = builderContext()) {
  const { typeId } = type;
  switch (typeId) {
    case Type.Int:
    case Type.Time:
    case Type.Duration:
      return isInt64ArrayType(type.values) ? new Int64Builder(type, ctx) : new DirectBuilder(type, ctx);
    case Type.Float:
      return type.precision ? new DirectBuilder(type, ctx) : new TransformBuilder(type, ctx, toFloat16);
    case Type.Binary:
    case Type.LargeBinary:
      return new BinaryBuilder(type, ctx);
    case Type.Utf8:
    case Type.LargeUtf8:
      return new Utf8Builder(type, ctx);
    case Type.Bool:
      return new BoolBuilder(type, ctx);
    case Type.Decimal:
      return type.bitWidth === 32 ? new TransformBuilder(type, ctx, toDecimal32(type.scale)) : new DecimalBuilder(type, ctx);
    case Type.Date:
      return new TransformBuilder(type, ctx, type.unit ? toBigInt : toDateDay);
    case Type.Timestamp:
      return new TransformBuilder(type, ctx, toTimestamp(type.unit));
    case Type.Interval:
      switch (type.unit) {
        case IntervalUnit.DAY_TIME:
          return new IntervalDayTimeBuilder(type, ctx);
        case IntervalUnit.MONTH_DAY_NANO:
          return new IntervalMonthDayNanoBuilder(type, ctx);
      }
      return new DirectBuilder(type, ctx);
    case Type.List:
    case Type.LargeList:
      return new ListBuilder(type, ctx);
    case Type.Struct:
      return new StructBuilder(type, ctx);
    case Type.Union:
      return type.mode ? new DenseUnionBuilder(type, ctx) : new SparseUnionBuilder(type, ctx);
    case Type.FixedSizeBinary:
      return new FixedSizeBinaryBuilder(type, ctx);
    case Type.FixedSizeList:
      return new FixedSizeListBuilder(type, ctx);
    case Type.Map:
      return new MapBuilder(type, ctx);
    case Type.RunEndEncoded:
      return new RunEndEncodedBuilder(type, ctx);
    case Type.Dictionary:
      return new DictionaryBuilder(type, ctx);
  }
  throw new Error(invalidDataType(typeId));
}
function columnFromValues(values2, type, options = {}, dicts) {
  const visit2 = isIterable(values2) ? (callback) => {
    for (const value of values2) callback(value);
  } : values2;
  type ?? (type = inferType(visit2));
  const { maxBatchRows = Infinity, ...opt2 } = options;
  let data2;
  if (type.typeId === Type.Null) {
    let length2 = 0;
    visit2(() => ++length2);
    data2 = nullBatches(type, length2, maxBatchRows);
  } else {
    const ctx = builderContext(opt2, dicts);
    const b = builder(type, ctx).init();
    const next = (b2) => data2.push(b2.batch());
    data2 = [];
    let row = 0;
    visit2((value) => {
      b.set(value, row++);
      if (row >= maxBatchRows) {
        next(b);
        row = 0;
      }
    });
    if (row) next(b);
    ctx.finish();
  }
  return new Column(data2, type);
}
function nullBatches(type, length2, limit) {
  const data2 = [];
  const batch = (length3) => new NullBatch({ length: length3, nullCount: length3, type });
  const numBatches = Math.floor(length2 / limit);
  for (let i = 0; i < numBatches; ++i) {
    data2.push(batch(limit));
  }
  const rem = length2 % limit;
  if (rem) data2.push(batch(rem));
  return data2;
}
function columnFromArray(array2, type, options = {}, dicts) {
  return !type && isTypedArray(array2) ? columnFromTypedArray(array2, options) : columnFromValues((v) => array2.forEach(v), type, options, dicts);
}
function columnFromTypedArray(values2, { maxBatchRows, useBigInt }) {
  const arrayType2 = (
    /** @type {TypedArrayConstructor} */
    values2.constructor
  );
  const type = typeForTypedArray(arrayType2);
  const length2 = values2.length;
  const limit = Math.min(maxBatchRows || Infinity, length2);
  const numBatches = Math.floor(length2 / limit);
  const batches = [];
  const batchType2 = isInt64ArrayType(arrayType2) && !useBigInt ? Int64Batch : DirectBatch;
  const add = (start, end) => batches.push(new batchType2({
    length: end - start,
    nullCount: 0,
    type,
    validity: new uint8Array(0),
    values: values2.subarray(start, end)
  }));
  let idx = 0;
  for (let i = 0; i < numBatches; ++i) add(idx, idx += limit);
  if (idx < length2) add(idx, length2);
  return new Column(batches);
}
function typeForTypedArray(arrayType2) {
  switch (arrayType2) {
    case float32Array:
      return float32();
    case float64Array:
      return float64();
    case int8Array:
      return int8();
    case int16Array:
      return int16();
    case int32Array:
      return int32();
    case int64Array:
      return int64();
    case uint8Array:
      return uint8();
    case uint16Array:
      return uint16();
    case uint32Array:
      return uint32();
    case uint64Array:
      return uint64();
  }
}
function tableFromColumns(data2, useProxy) {
  var _a2;
  const fields = [];
  const entries2 = Array.isArray(data2) ? data2 : Object.entries(data2);
  const length2 = (_a2 = entries2[0]) == null ? void 0 : _a2[1].length;
  const columns2 = entries2.map(([name2, col]) => {
    if (col.length !== length2) {
      throw new Error("All columns must have the same length.");
    }
    fields.push(field(name2, col.type));
    return col;
  });
  const schema = {
    version: Version.V5,
    endianness: Endianness.Little,
    fields,
    metadata: null
  };
  return new Table2(schema, columns2, useProxy);
}
function columns(table, names2) {
  return isFunction$1(names2) ? names2(table) : names2 || table.columnNames();
}
function toArrow(table, options = {}) {
  const { columns: columns$1, limit = Infinity, offset: offset2 = 0, types: types2 = {}, ...opt2 } = options;
  const names2 = columns(table, columns$1);
  const data2 = table.data();
  const fullScan = offset2 === 0 && table.numRows() <= limit && !table.isFiltered() && !table.isOrdered();
  return tableFromColumns(names2.map((name2) => {
    const values2 = data2[name2];
    const type = types2[name2];
    const isArray2 = isArrayType(values2);
    let col;
    if (fullScan && (isArray2 || isFunction$1(values2.toArray))) {
      col = columnFromArray(isArray2 ? values2 : values2.toArray(), type, opt2);
    } else {
      const get2 = isArray2 ? (row) => values2[row] : (row) => values2.at(row);
      col = columnFromValues(
        (visit2) => table.scan((row) => visit2(get2(row)), true, limit, offset2),
        type,
        opt2
      );
    }
    return [name2, col];
  }));
}
function toArrowIPC(data2, options = {}) {
  const { format = "stream", ...toArrowOptions } = options;
  return tableToIPC(toArrow(data2, toArrowOptions), { format });
}
function identity(x) {
  return x;
}
function scan(table, names2, limit = 100, offset2, ctx) {
  const { start = identity, cell, end = identity } = ctx;
  const data2 = table.data();
  const n = names2.length;
  table.scan((row) => {
    start(row);
    for (let i = 0; i < n; ++i) {
      const name2 = names2[i];
      cell(data2[name2].at(row), name2, i);
    }
    end(row);
  }, true, limit, offset2);
}
function toCSV(table, options = {}) {
  const names2 = columns(table, options.columns);
  const format = options.format || {};
  const delim = options.delimiter || ",";
  const header = options.header ?? true;
  const reFormat = new RegExp(`["${delim}
\r]`);
  const formatValue2 = (value) => value == null ? "" : isDate$1(value) ? formatUTCDate(value, true) : reFormat.test(value += "") ? '"' + value.replace(/"/g, '""') + '"' : value;
  const vals = names2.map(formatValue2);
  let text = header ? vals.join(delim) + "\n" : "";
  scan(table, names2, options.limit || Infinity, options.offset, {
    cell(value, name2, index2) {
      vals[index2] = formatValue2(format[name2] ? format[name2](value) : value);
    },
    end() {
      text += vals.join(delim) + "\n";
    }
  });
  return text;
}
function mapObject(obj, fn, output2 = {}) {
  for (const key2 in obj) {
    output2[key2] = fn(obj[key2], key2);
  }
  return output2;
}
function isExactDateUTC(d) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}
function inferFormat(scan2, options = {}) {
  let count2 = 0;
  let nulls = 0;
  let dates = 0;
  let dutcs = 0;
  let nums = 0;
  let digits = 0;
  scan2((value) => {
    ++count2;
    if (value == null) {
      ++nulls;
      return;
    }
    const type = typeof value;
    if (type === "object" && isDate$1(value)) {
      ++dates;
      if (isExactDateUTC(value)) ++dutcs;
    } else if (type === "number") {
      ++nums;
      if (value === value && (value | 0) !== value) {
        const s = value + "";
        const p = s.indexOf(".");
        if (p >= 0) {
          const e = s.indexOf("e");
          const l = e > 0 ? e : s.length;
          digits = Math.max(digits, l - p - 1);
        }
      }
    }
  });
  return {
    align: (nulls + nums + dates) / count2 > 0.5 ? "r" : "l",
    format: {
      utc: dates === dutcs,
      digits: Math.min(digits, options.maxdigits || 6)
    }
  };
}
function formats(table, names2, options) {
  const formatOpt = options.format || {};
  const alignOpt = options.align || {};
  const format = {};
  const align2 = {};
  names2.forEach((name2) => {
    const auto = inferFormat(values(table, name2), options);
    align2[name2] = alignOpt[name2] || auto.align;
    format[name2] = formatOpt[name2] || auto.format;
  });
  return { align: align2, format };
}
function values(table, columnName) {
  const column = table.column(columnName);
  return (fn) => table.scan((row) => fn(column.at(row)));
}
function formatValue(v, options = {}) {
  if (isFunction$1(options)) {
    return options(v) + "";
  }
  const type = typeof v;
  if (type === "object") {
    if (isDate$1(v)) {
      return options.utc ? formatUTCDate(v) : formatDate(v);
    } else {
      const s = JSON.stringify(
        v,
        // @ts-ignore
        (k, v2) => isTypedArray$1(v2) ? Array.from(v2) : v2
      );
      const maxlen = options.maxlen || 30;
      return s.length > maxlen ? s.slice(0, 28) + "…" + (s[0] === "[" ? "]" : "}") : s;
    }
  } else if (type === "number") {
    const digits = options.digits || 0;
    let a;
    return v !== 0 && ((a = Math.abs(v)) >= 1e18 || a < Math.pow(10, -digits)) ? v.toExponential(digits) : v.toFixed(digits);
  } else {
    return v + "";
  }
}
function toHTML(table, options = {}) {
  const names2 = columns(table, options.columns);
  const { align: align2, format } = formats(table, names2, options);
  const style = styles(options);
  const nullish2 = options.null;
  const alignValue = (a) => a === "c" ? "center" : a === "r" ? "right" : "left";
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const baseFormat = (value, opt2) => escape(formatValue(value, opt2));
  const formatter = nullish2 ? (value, opt2) => value == null ? nullish2(value) : baseFormat(value, opt2) : baseFormat;
  let r = -1;
  let idx = -1;
  const tag = (tag2, name2, shouldAlign) => {
    const a = shouldAlign ? alignValue(align2[name2]) : "";
    const s = style[tag2] ? style[tag2](name2, idx, r) || "" : "";
    const css = (a ? `text-align: ${a};` + (s ? " " : "") : "") + s;
    return `<${tag2}${css ? ` style="${css}"` : ""}>`;
  };
  let text = tag("table") + tag("thead") + tag("tr", r) + names2.map((name2) => `${tag("th", name2, 1)}${name2}</th>`).join("") + "</tr></thead>" + tag("tbody");
  scan(table, names2, options.limit, options.offset, {
    start(row) {
      r = row;
      ++idx;
      text += tag("tr");
    },
    cell(value, name2) {
      text += tag("td", name2, 1) + formatter(value, format[name2]) + "</td>";
    },
    end() {
      text += "</tr>";
    }
  });
  return text + "</tbody></table>";
}
function styles(options) {
  return mapObject(
    options.style,
    (value) => isFunction$1(value) ? value : () => value
  );
}
const COLUMNS = "columns";
const NDJSON = "ndjson";
const defaultFormatter = (value) => isDate$1(value) ? formatUTCDate(value, true) : value;
function toJSON(table, {
  type,
  columns: cols,
  format = {},
  limit,
  offset: offset2
} = {}) {
  const names2 = columns(table, cols);
  const fmt = names2.map((name2) => format[name2] || defaultFormatter);
  const scan2 = (fn) => table.scan(fn, true, limit, offset2);
  return type === COLUMNS ? toColumns(table, names2, fmt, scan2) : toRows(table, names2, fmt, scan2, type === NDJSON);
}
function toColumns(table, names2, format, scan2) {
  let text = "{";
  names2.forEach((name2, i) => {
    text += (i ? "," : "") + JSON.stringify(name2) + ":[";
    const column = table.column(name2);
    const formatter = format[i];
    let r = -1;
    scan2((row) => {
      const value = column.at(row);
      text += (++r ? "," : "") + JSON.stringify(formatter(value));
    });
    text += "]";
  });
  return text + "}";
}
function toRows(table, names2, format, scan2, nd = false) {
  const n = names2.length;
  const keys2 = names2.map((name2) => `"${name2}":`);
  const cols = names2.map((name2) => table.column(name2));
  const finish = nd ? (o) => o.replaceAll("\n", "") : identity;
  const sep = nd ? "\n" : ",";
  let text = nd ? "" : "[";
  let r = -1;
  scan2((row) => {
    const props = [];
    for (let i = 0; i < n; ++i) {
      props.push(keys2[i] + JSON.stringify(format[i](cols[i].at(row))));
    }
    text += (++r ? sep : "") + finish(`{${props.join(",")}}`);
  });
  return text + (nd ? "" : "]");
}
function toMarkdown(table, options = {}) {
  const names2 = columns(table, options.columns);
  const { align: align2, format } = formats(table, names2, options);
  const alignValue = (a) => a === "c" ? ":-:" : a === "r" ? "-:" : ":-";
  const escape = (s) => s.replace(/\|/g, "\\|");
  let text = "|" + names2.map(escape).join("|") + "|\n|" + names2.map((name2) => alignValue(align2[name2])).join("|") + "|\n";
  scan(table, names2, options.limit, options.offset, {
    start() {
      text += "|";
    },
    cell(value, name2) {
      text += escape(formatValue(value, format[name2])) + "|";
    },
    end() {
      text += "\n";
    }
  });
  return text;
}
class ColumnTable extends Table$1 {
  /**
   * Create a new table with additional columns drawn from one or more input
   * tables. All tables must have the same numer of rows and are reified
   * prior to assignment. In the case of repeated column names, input table
   * columns overwrite existing columns.
   * @param {...(Table|import('./types.js').ColumnData)} tables
   *  The tables to merge with this table.
   * @return {this} A new table with merged columns.
   * @example table.assign(table1, table2)
   */
  assign(...tables) {
    return assign(this, ...tables);
  }
  /**
   * Count the number of values in a group. This method is a shorthand
   * for *rollup* with a count aggregate function.
   * @param {import('./types.js').CountOptions} [options]
   *  Options for the count.
   * @return {this} A new table with groupby and count columns.
   * @example table.groupby('colA').count()
   * @example table.groupby('colA').count({ as: 'num' })
   */
  count(options = {}) {
    const { as = "count" } = options;
    return rollup(this, { [as]: count() });
  }
  /**
   * Derive new column values based on the provided expressions. By default,
   * new columns are added after (higher indices than) existing columns. Use
   * the before or after options to place new columns elsewhere.
   * @param {import('./types.js').ExprObject} values
   *  Object of name-value pairs defining the columns to derive. The input
   *  object should have output column names for keys and table expressions
   *  for values.
   * @param {import('./types.js').DeriveOptions} [options]
   *  Options for dropping or relocating derived columns. Use either a before
   *  or after property to indicate where to place derived columns. Specifying
   *  both before and after is an error. Unlike the *relocate* verb, this
   *  option affects only new columns; updated columns with existing names
   *  are excluded from relocation.
   * @return {this} A new table with derived columns added.
   * @example table.derive({ sumXY: d => d.x + d.y })
   * @example table.derive({ z: d => d.x * d.y }, { before: 'x' })
   */
  derive(values2, options) {
    return derive(this, values2, options);
  }
  /**
   * Filter a table to a subset of rows based on the input criteria.
   * The resulting table provides a filtered view over the original data; no
   * data copy is made. To create a table that copies only filtered data to
   * new data structures, call *reify* on the output table.
   * @param {import('./types.js').TableExpr} criteria
   *  Filter criteria as a table expression. Both aggregate and window
   *  functions are permitted, taking into account *groupby* or *orderby*
   *  settings.
   * @return {this} A new table with filtered rows.
   * @example table.filter(d => abs(d.value) < 5)
   */
  filter(criteria) {
    return filter(this, criteria);
  }
  /**
   * Extract rows with indices from start to end (end not included), where
   * start and end represent per-group ordered row numbers in the table.
   * @param {number} [start] Zero-based index at which to start extraction.
   *  A negative index indicates an offset from the end of the group.
   *  If start is undefined, slice starts from the index 0.
   * @param {number} [end] Zero-based index before which to end extraction.
   *  A negative index indicates an offset from the end of the group.
   *  If end is omitted, slice extracts through the end of the group.
   * @return {this} A new table with sliced rows.
   * @example table.slice(1, -1)
   */
  slice(start, end) {
    return slice(this, start, end);
  }
  /**
   * Group table rows based on a set of column values.
   * Subsequent operations that are sensitive to grouping (such as
   * aggregate functions) will operate over the grouped rows.
   * To undo grouping, use *ungroup*.
   * @param  {...import('./types.js').ExprList} keys
   *  Key column values to group by. The keys may be specified using column
   *  name strings, column index numbers, value objects with output column
   *  names for keys and table expressions for values, or selection helper
   *  functions.
   * @return {this} A new table with grouped rows.
   * @example table.groupby('colA', 'colB')
   * @example table.groupby({ key: d => d.colA + d.colB })
   */
  groupby(...keys2) {
    return groupby(this, ...keys2);
  }
  /**
   * Order table rows based on a set of column values. Subsequent operations
   * sensitive to ordering (such as window functions) will operate over sorted
   * values. The resulting table provides an view over the original data,
   * without any copying. To create a table with sorted data copied to new
   * data strucures, call *reify* on the result of this method. To undo
   * ordering, use *unorder*.
   * @param  {...import('./types.js').OrderKeys} keys
   *  Key values to sort by, in precedence order.
   *  By default, sorting is done in ascending order.
   *  To sort in descending order, wrap values using *desc*.
   *  If a string, order by the column with that name.
   *  If a number, order by the column with that index.
   *  If a function, must be a valid table expression; aggregate functions
   *  are permitted, but window functions are not.
   *  If an object, object values must be valid values parameters
   *  with output column names for keys and table expressions
   *  for values (the output names will be ignored).
   *  If an array, array values must be valid key parameters.
   * @return {this} A new ordered table.
   * @example table.orderby('a', desc('b'))
   * @example table.orderby({ a: 'a', b: desc('b') )})
   * @example table.orderby(desc(d => d.a))
   */
  orderby(...keys2) {
    return orderby(this, ...keys2);
  }
  /**
   * Relocate a subset of columns to change their positions, also
   * potentially renaming them.
   * @param {import('./types.js').Select} columns
   *  An ordered selection of columns to relocate.
   *  The input may consist of column name strings, column integer indices,
   *  rename objects with current column names as keys and new column names
   *  as values, or functions that take a table as input and returns a valid
   *  selection parameter (typically the output of selection helper functions
   *  such as *all*, *not*, or *range*).
   * @param {import('./types.js').RelocateOptions} options
   *  Options for relocating. Must include either the before or after property
   *  to indicate where to place the relocated columns. Specifying both before
   *  and after is an error.
   * @return {this} A new table with relocated columns.
   * @example table.relocate(['colY', 'colZ'], { after: 'colX' })
   * @example table.relocate(not('colB', 'colC'), { before: 'colA' })
   * @example table.relocate({ colA: 'newA', colB: 'newB' }, { after: 'colC' })
   */
  relocate(columns2, options) {
    return relocate(this, toArray$1(columns2), options);
  }
  /**
   * Rename one or more columns, preserving column order.
   * @param {...import('./types.js').Select} columns
   *  One or more rename objects with current column names as keys and new
   *  column names as values.
   * @return {this} A new table with renamed columns.
   * @example table.rename({ oldName: 'newName' })
   * @example table.rename({ a: 'a2', b: 'b2' })
   */
  rename(...columns2) {
    return rename(this, ...columns2);
  }
  /**
   * Reduce a table, processing all rows to produce a new table.
   * To produce standard aggregate summaries, use the rollup verb.
   * This method allows the use of custom reducer implementations,
   * for example to produce multiple rows for an aggregate.
   * @param {import('../verbs/reduce/reducer.js').Reducer} reducer
   *  The reducer to apply.
   * @return {this} A new table of reducer outputs.
   */
  reduce(reducer) {
    return reduce(this, reducer);
  }
  /**
   * Rollup a table to produce an aggregate summary.
   * Often used in conjunction with *groupby*.
   * To produce counts only, *count* is a shortcut.
   * @param {import('./types.js').ExprObject} [values]
   *  Object of name-value pairs defining aggregate output columns. The input
   *  object should have output column names for keys and table expressions
   *  for values. The expressions must be valid aggregate expressions: window
   *  functions are not allowed and column references must be arguments to
   *  aggregate functions.
   * @return {this} A new table of aggregate summary values.
   * @example table.groupby('colA').rollup({ mean: d => mean(d.colB) })
   * @example table.groupby('colA').rollup({ mean: op.median('colB') })
   */
  rollup(values2) {
    return rollup(this, values2);
  }
  /**
   * Generate a table from a random sample of rows.
   * If the table is grouped, performs a stratified sample by
   * sampling from each group separately.
   * @param {number | import('./types.js').TableExpr} size
   *  The number of samples to draw per group.
   *  If number-valued, the same sample size is used for each group.
   *  If function-valued, the input should be an aggregate table
   *  expression compatible with *rollup*.
   * @param {import('./types.js').SampleOptions} [options]
   *  Options for sampling.
   * @return {this} A new table with sampled rows.
   * @example table.sample(50)
   * @example table.sample(100, { replace: true })
   * @example table.groupby('colA').sample(() => op.floor(0.5 * op.count()))
   */
  sample(size, options) {
    return sample(this, size, options);
  }
  /**
   * Select a subset of columns into a new table, potentially renaming them.
   * @param {...import('./types.js').Select} columns
   *  An ordered selection of columns.
   *  The input may consist of column name strings, column integer indices,
   *  rename objects with current column names as keys and new column names
   *  as values, or functions that take a table as input and returns a valid
   *  selection parameter (typically the output of selection helper functions
   *  such as *all*, *not*, or *range*.).
   * @return {this} A new table of selected columns.
   * @example table.select('colA', 'colB')
   * @example table.select(not('colB', 'colC'))
   * @example table.select({ colA: 'newA', colB: 'newB' })
   */
  select(...columns2) {
    return select(this, ...columns2);
  }
  /**
   * Ungroup a table, removing any grouping criteria.
   * Undoes the effects of *groupby*.
   * @return {this} A new ungrouped table, or this table if not grouped.
   * @example table.ungroup()
   */
  ungroup() {
    return ungroup(this);
  }
  /**
   * Unorder a table, removing any sorting criteria.
   * Undoes the effects of *orderby*.
   * @return {this} A new unordered table, or this table if not ordered.
   * @example table.unorder()
   */
  unorder() {
    return unorder(this);
  }
  // -- Cleaning Verbs ------------------------------------------------------
  /**
   * De-duplicate table rows by removing repeated row values.
   * @param {...import('./types.js').ExprList} keys
   *  Key columns to check for duplicates.
   *  Two rows are considered duplicates if they have matching values for
   *  all keys. If keys are unspecified, all columns are used.
   *  The keys may be specified using column name strings, column index
   *  numbers, value objects with output column names for keys and table
   *  expressions for values, or selection helper functions.
   * @return {this} A new de-duplicated table.
   * @example table.dedupe()
   * @example table.dedupe('a', 'b')
   * @example table.dedupe({ abs: d => op.abs(d.a) })
   */
  dedupe(...keys2) {
    return dedupe(this, ...keys2);
  }
  /**
   * Impute missing values or rows. Accepts a set of column-expression pairs
   * and evaluates the expressions to replace any missing (null, undefined,
   * or NaN) values in the original column.
   * If the expand option is specified, imputes new rows for missing
   * combinations of values. All combinations of key values (a full cross
   * product) are considered for each level of grouping (specified by
   * *groupby*). New rows will be added for any combination
   * of key and groupby values not already contained in the table. For all
   * non-key and non-group columns the new rows are populated with imputation
   * values (first argument) if specified, otherwise undefined.
   * If the expand option is specified, any filter or orderby settings are
   * removed from the output table, but groupby settings persist.
   * @param {import('./types.js').ExprObject} values
   *  Object of name-value pairs for the column values to impute. The input
   *  object should have existing column names for keys and table expressions
   *  for values. The expressions will be evaluated to determine replacements
   *  for any missing values.
   * @param {import('./types.js').ImputeOptions} [options] Imputation options.
   *  The expand property specifies a set of column values to consider for
   *  imputing missing rows. All combinations of expanded values are
   *  considered, and new rows are added for each combination that does not
   *  appear in the input table.
   * @return {this} A new table with imputed values and/or rows.
   * @example table.impute({ v: () => 0 })
   * @example table.impute({ v: d => op.mean(d.v) })
   * @example table.impute({ v: () => 0 }, { expand: ['x', 'y'] })
   */
  impute(values2, options) {
    return impute(this, values2, options);
  }
  // -- Reshaping Verbs -----------------------------------------------------
  /**
   * Fold one or more columns into two key-value pair columns.
   * The fold transform is an inverse of the *pivot* transform.
   * The resulting table has two new columns, one containing the column
   * names (named "key") and the other the column values (named "value").
   * The number of output rows equals the original row count multiplied
   * by the number of folded columns.
   * @param {import('./types.js').ExprList} values The columns to fold.
   *  The columns may be specified using column name strings, column index
   *  numbers, value objects with output column names for keys and table
   *  expressions for values, or selection helper functions.
   * @param {import('./types.js').FoldOptions} [options] Options for folding.
   * @return {this} A new folded table.
   * @example table.fold('colA')
   * @example table.fold(['colA', 'colB'])
   * @example table.fold(range(5, 8))
   */
  fold(values2, options) {
    return fold(this, values2, options);
  }
  /**
   * Pivot columns into a cross-tabulation.
   * The pivot transform is an inverse of the *fold* transform.
   * The resulting table has new columns for each unique combination
   * of the provided *keys*, populated with the provided *values*.
   * The provided *values* must be aggregates, as a single set of keys may
   * include more than one row. If string-valued, the *any* aggregate is used.
   * If only one *values* column is defined, the new pivoted columns will
   * be named using key values directly. Otherwise, input value column names
   * will be included as a component of the output column names.
   * @param {import('./types.js').ExprList} keys
   *  Key values to map to new column names. The keys may be specified using
   *  column name strings, column index numbers, value objects with output
   *  column names for keys and table expressions for values, or selection
   *  helper functions.
   * @param {import('./types.js').ExprList} values Output values for pivoted
   *  columns. Column references will be wrapped in an *any* aggregate. If
   *  object-valued, the input object should have output value names for keys
   *  and aggregate table expressions for values.
   * @param {import('./types.js').PivotOptions} [options]
   *  Options for pivoting.
   * @return {this} A new pivoted table.
   * @example table.pivot('key', 'value')
   * @example table.pivot(['keyA', 'keyB'], ['valueA', 'valueB'])
   * @example table.pivot({ key: d => d.key }, { value: d => op.sum(d.value) })
   */
  pivot(keys2, values2, options) {
    return pivot(this, keys2, values2, options);
  }
  /**
   * Spread array elements into a set of new columns.
   * Output columns are named based on the value key and array index.
   * @param {import('./types.js').ExprList} values
   *  The column values to spread. The values may be specified using column
   *  name strings, column index numbers, value objects with output column
   *  names for keys and table expressions for values, or selection helper
   *  functions.
   * @param {import('./types.js').SpreadOptions } [options]
   *  Options for spreading.
   * @return {this} A new table with the spread columns added.
   * @example table.spread({ a: d => op.split(d.text, '') })
   * @example table.spread('arrayCol', { limit: 100 })
   */
  spread(values2, options) {
    return spread(this, values2, options);
  }
  /**
   * Unroll one or more array-valued columns into new rows.
   * If more than one array value is used, the number of new rows
   * is the smaller of the limit and the largest length.
   * Values for all other columns are copied over.
   * @param {import('./types.js').ExprList} values
   *  The column values to unroll. The values may be specified using column
   *  name strings, column index numbers, value objects with output column
   *  names for keys and table expressions for values, or selection helper
   *  functions.
   * @param {import('./types.js').UnrollOptions} [options]
   *  Options for unrolling.
   * @return {this} A new unrolled table.
   * @example table.unroll('colA', { limit: 1000 })
   */
  unroll(values2, options) {
    return unroll(this, values2, options);
  }
  // -- Joins ---------------------------------------------------------------
  /**
   * Lookup values from a secondary table and add them as new columns.
   * A lookup occurs upon matching key values for rows in both tables.
   * If the secondary table has multiple rows with the same key, only
   * the last observed instance will be considered in the lookup.
   * Lookup is similar to *join_left*, but with a simpler
   * syntax and the added constraint of allowing at most one match only.
   * @param {import('./types.js').TableRef} other
   *  The secondary table to look up values from.
   * @param {import('./types.js').JoinKeys} [on]
   *  Lookup keys (column name strings or table expressions) for this table
   *  and the secondary table, respectively. If unspecified, the values of
   *  all columns with matching names are compared.
   * @param {...import('./types.js').ExprList} [values]
   *  The column values to add from the secondary table. Can be column name
   *  strings or objects with column names as keys and table expressions as
   *  values. If unspecified, includes all columns from the secondary table
   *  whose names do no match any column in the primary table.
   * @return {this} A new table with lookup values added.
   * @example table.lookup(other, ['key1', 'key2'], 'value1', 'value2')
   */
  lookup(other, on, ...values2) {
    return lookup(this, other, on, ...values2);
  }
  /**
   * Join two tables, extending the columns of one table with
   * values from the other table. The current table is considered
   * the "left" table in the join, and the new table input is
   * considered the "right" table in the join. By default an inner
   * join is performed, removing all rows that do not match the
   * join criteria. To perform left, right, or full outer joins, use
   * the *join_left*, *join_right*, or *join_full* methods, or provide
   * an options argument.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows. If unspecified, the values of
   *  all columns with matching names are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @param {import('./types.js').JoinValues} [values]
   *  The columns to include in the join output.
   *  If unspecified, all columns from both tables are included; paired
   *  join keys sharing the same column name are included only once.
   *  If array-valued, a two element array should be provided, containing
   *  the columns to include for the left and right tables, respectively.
   *  Array input may consist of column name strings, objects with output
   *  names as keys and single-table table expressions as values, or the
   *  selection helper functions *all*, *not*, or *range*.
   *  If object-valued, specifies the key-value pairs for each output,
   *  defined using two-table table expressions.
   * @param {import('./types.js').JoinOptions} [options]
   *  Options for the join.
   * @return {this} A new joined table.
   * @example table.join(other, ['keyL', 'keyR'])
   * @example table.join(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  join(other, on, values2, options) {
    return join(this, other, on, values2, options);
  }
  /**
   * Perform a left outer join on two tables. Rows in the left table
   * that do not match a row in the right table will be preserved.
   * This is a convenience method with fixed options for *join*.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows.
   *  If unspecified, the values of all columns with matching names
   *  are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @param {import('./types.js').JoinValues} [values]
   *  he columns to include in the join output.
   *  If unspecified, all columns from both tables are included; paired
   *  join keys sharing the same column name are included only once.
   *  If array-valued, a two element array should be provided, containing
   *  the columns to include for the left and right tables, respectively.
   *  Array input may consist of column name strings, objects with output
   *  names as keys and single-table table expressions as values, or the
   *  selection helper functions *all*, *not*, or *range*.
   *  If object-valued, specifies the key-value pairs for each output,
   *  defined using two-table table expressions.
   * @param {import('./types.js').JoinOptions} [options]
   *  Options for the join. With this method, any options will be
   *  overridden with `{left: true, right: false}`.
   * @return {this} A new joined table.
   * @example table.join_left(other, ['keyL', 'keyR'])
   * @example table.join_left(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  join_left(other, on, values2, options) {
    const opt2 = { ...options, left: true, right: false };
    return join(this, other, on, values2, opt2);
  }
  /**
   * Perform a right outer join on two tables. Rows in the right table
   * that do not match a row in the left table will be preserved.
   * This is a convenience method with fixed options for *join*.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows.
   *  If unspecified, the values of all columns with matching names
   *  are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @param {import('./types.js').JoinValues} [values]
   *  The columns to include in the join output.
   *  If unspecified, all columns from both tables are included; paired
   *  join keys sharing the same column name are included only once.
   *  If array-valued, a two element array should be provided, containing
   *  the columns to include for the left and right tables, respectively.
   *  Array input may consist of column name strings, objects with output
   *  names as keys and single-table table expressions as values, or the
   *  selection helper functions *all*, *not*, or *range*.
   *  If object-valued, specifies the key-value pairs for each output,
   *  defined using two-table table expressions.
   * @param {import('./types.js').JoinOptions} [options]
   *  Options for the join. With this method, any options will be overridden
   *  with `{left: false, right: true}`.
   * @return {this} A new joined table.
   * @example table.join_right(other, ['keyL', 'keyR'])
   * @example table.join_right(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  join_right(other, on, values2, options) {
    const opt2 = { ...options, left: false, right: true };
    return join(this, other, on, values2, opt2);
  }
  /**
   * Perform a full outer join on two tables. Rows in either the left or
   * right table that do not match a row in the other will be preserved.
   * This is a convenience method with fixed options for *join*.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows.
   *  If unspecified, the values of all columns with matching names
   *  are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @param {import('./types.js').JoinValues} [values]
   *  The columns to include in the join output.
   *  If unspecified, all columns from both tables are included; paired
   *  join keys sharing the same column name are included only once.
   *  If array-valued, a two element array should be provided, containing
   *  the columns to include for the left and right tables, respectively.
   *  Array input may consist of column name strings, objects with output
   *  names as keys and single-table table expressions as values, or the
   *  selection helper functions *all*, *not*, or *range*.
   *  If object-valued, specifies the key-value pairs for each output,
   *  defined using two-table table expressions.
   * @param {import('./types.js').JoinOptions} [options]
   *  Options for the join. With this method, any options will be overridden
   *  with `{left: true, right: true}`.
   * @return {this} A new joined table.
   * @example table.join_full(other, ['keyL', 'keyR'])
   * @example table.join_full(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  join_full(other, on, values2, options) {
    const opt2 = { ...options, left: true, right: true };
    return join(this, other, on, values2, opt2);
  }
  /**
   * Produce the Cartesian cross product of two tables. The output table
   * has one row for every pair of input table rows. Beware that outputs
   * may be quite large, as the number of output rows is the product of
   * the input row counts.
   * This is a convenience method for *join* in which the
   * join criteria is always true.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinValues} [values]
   *  The columns to include in the output.
   *  If unspecified, all columns from both tables are included.
   *  If array-valued, a two element array should be provided, containing
   *  the columns to include for the left and right tables, respectively.
   *  Array input may consist of column name strings, objects with output
   *  names as keys and single-table table expressions as values, or the
   *  selection helper functions *all*, *not*, or *range*.
   *  If object-valued, specifies the key-value pairs for each output,
   *  defined using two-table table expressions.
   * @param {import('./types.js').JoinOptions} [options]
   *  Options for the join.
   * @return {this} A new joined table.
   * @example table.cross(other)
   * @example table.cross(other, [['leftKey', 'leftVal'], ['rightVal']])
   */
  cross(other, values2, options) {
    return cross(this, other, values2, options);
  }
  /**
   * Perform a semi-join, filtering the left table to only rows that
   * match a row in the right table.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows.
   *  If unspecified, the values of all columns with matching names
   *  are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @return {this} A new filtered table.
   * @example table.semijoin(other)
   * @example table.semijoin(other, ['keyL', 'keyR'])
   * @example table.semijoin(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  semijoin(other, on) {
    return semijoin(this, other, on);
  }
  /**
   * Perform an anti-join, filtering the left table to only rows that
   * do *not* match a row in the right table.
   * @param {import('./types.js').TableRef} other
   *  The other (right) table to join with.
   * @param {import('./types.js').JoinPredicate} [on]
   *  The join criteria for matching table rows.
   *  If unspecified, the values of all columns with matching names
   *  are compared.
   *  If array-valued, a two-element array should be provided, containing
   *  the columns to compare for the left and right tables, respectively.
   *  If a one-element array or a string value is provided, the same
   *  column names will be drawn from both tables.
   *  If function-valued, should be a two-table table expression that
   *  returns a boolean value. When providing a custom predicate, note that
   *  join key values can be arrays or objects, and that normal join
   *  semantics do not consider null or undefined values to be equal (that is,
   *  null !== null). Use the op.equal function to handle these cases.
   * @return {this} A new filtered table.
   * @example table.antijoin(other)
   * @example table.antijoin(other, ['keyL', 'keyR'])
   * @example table.antijoin(other, (a, b) => op.equal(a.keyL, b.keyR))
   */
  antijoin(other, on) {
    return antijoin(this, other, on);
  }
  // -- Set Operations ------------------------------------------------------
  /**
   * Concatenate multiple tables into a single table, preserving all rows.
   * This transformation mirrors the UNION_ALL operation in SQL.
   * Only named columns in this table are included in the output.
   * @param  {...import('./types.js').TableRefList} tables
   *  A list of tables to concatenate.
   * @return {this} A new concatenated table.
   * @example table.concat(other)
   * @example table.concat(other1, other2)
   * @example table.concat([other1, other2])
   */
  concat(...tables) {
    return concat(this, ...tables);
  }
  /**
   * Union multiple tables into a single table, deduplicating all rows.
   * This transformation mirrors the UNION operation in SQL. It is
   * similar to *concat* but suppresses duplicate rows with
   * values identical to another row.
   * Only named columns in this table are included in the output.
   * @param  {...import('./types.js').TableRefList} tables
   *  A list of tables to union.
   * @return {this} A new unioned table.
   * @example table.union(other)
   * @example table.union(other1, other2)
   * @example table.union([other1, other2])
   */
  union(...tables) {
    return union$1(this, ...tables);
  }
  /**
   * Intersect multiple tables, keeping only rows whose with identical
   * values for all columns in all tables, and deduplicates the rows.
   * This transformation is similar to a series of *semijoin*.
   * calls, but additionally suppresses duplicate rows.
   * @param  {...import('./types.js').TableRefList} tables
   *  A list of tables to intersect.
   * @return {this} A new filtered table.
   * @example table.intersect(other)
   * @example table.intersect(other1, other2)
   * @example table.intersect([other1, other2])
   */
  intersect(...tables) {
    return intersect(this, ...tables);
  }
  /**
   * Compute the set difference with multiple tables, keeping only rows in
   * this table that whose values do not occur in the other tables.
   * This transformation is similar to a series of *anitjoin*
   * calls, but additionally suppresses duplicate rows.
   * @param  {...import('./types.js').TableRefList} tables
   *  A list of tables to difference.
   * @return {this} A new filtered table.
   * @example table.except(other)
   * @example table.except(other1, other2)
   * @example table.except([other1, other2])
   */
  except(...tables) {
    return except(this, ...tables);
  }
  // -- Table Output Formats ------------------------------------------------
  /**
   * Format this table as a Flechette Arrow table.
   * @param {import('../format/types.js').ArrowFormatOptions} [options]
   *  The Arrow formatting options.
   * @return {import('@uwdata/flechette').Table} A Flechette Arrow table.
   */
  toArrow(options) {
    return toArrow(this, options);
  }
  /**
   * Format this table as binary data in the Apache Arrow IPC format.
   * @param {import('../format/types.js').ArrowIPCFormatOptions} [options]
   *  The Arrow IPC formatting options.
   * @return {Uint8Array} A new Uint8Array of Arrow-encoded binary data.
   */
  toArrowIPC(options) {
    return toArrowIPC(this, options);
  }
  /**
   * Format this table as a comma-separated values (CSV) string. Other
   * delimiters, such as tabs or pipes ('|'), can be specified using
   * the options argument.
   * @param {import('../format/to-csv.js').CSVFormatOptions} [options]
   *   The CSV formatting options.
   * @return {string} A delimited value string.
   */
  toCSV(options) {
    return toCSV(this, options);
  }
  /**
   * Format this table as an HTML table string.
   * @param {import('../format/to-html.js').HTMLFormatOptions} [options]
   *  The HTML formatting options.
   * @return {string} An HTML table string.
   */
  toHTML(options) {
    return toHTML(this, options);
  }
  /**
   * Format this table as a JavaScript Object Notation (JSON) string.
   * @param {import('../format/to-json.js').JSONFormatOptions} [options]
   *  The JSON formatting options.
   * @return {string} A JSON string.
   */
  toJSON(options) {
    return toJSON(this, options);
  }
  /**
   * Format this table as a GitHub-Flavored Markdown table string.
   * @param {import('../format/to-markdown.js').MarkdownFormatOptions} [options]
   *  The Markdown formatting options.
   * @return {string} A GitHub-Flavored Markdown table string.
   */
  toMarkdown(options) {
    return toMarkdown(this, options);
  }
}
function desc(expr) {
  return wrap$1(expr, { desc: true });
}
function columnsFrom(values2, names2) {
  const raise2 = (type) => {
    error(`Illegal argument type: ${type || typeof values2}`);
    return (
      /** @type {import('./types.js').ColumnData} */
      {}
    );
  };
  return values2 instanceof Map ? fromKeyValuePairs(values2.entries(), names2) : isDate$1(values2) ? raise2("Date") : isRegExp(values2) ? raise2("RegExp") : isString(values2) ? raise2() : isArray$2(values2) ? fromArray(values2, names2) : isFunction$1(values2[Symbol.iterator]) ? fromIterable(values2, names2) : isObject$2(values2) ? fromKeyValuePairs(Object.entries(values2), names2) : raise2();
}
function fromKeyValuePairs(entries2, names2 = ["key", "value"]) {
  const keys2 = [];
  const vals = [];
  for (const [key2, val] of entries2) {
    keys2.push(key2);
    vals.push(val);
  }
  const columns2 = {};
  if (names2[0]) columns2[names2[0]] = keys2;
  if (names2[1]) columns2[names2[1]] = vals;
  return columns2;
}
function fromArray(values2, names2) {
  const len = values2.length;
  const columns2 = {};
  const add = (name2) => columns2[name2] = Array(len);
  if (len) {
    names2 = names2 || Object.keys(values2[0]);
    const cols = names2.map(add);
    const n = cols.length;
    for (let idx = 0; idx < len; ++idx) {
      const row = values2[idx];
      for (let i = 0; i < n; ++i) {
        cols[i][idx] = row[names2[i]];
      }
    }
  } else if (names2) {
    names2.forEach(add);
  }
  return columns2;
}
function fromIterable(values2, names2) {
  const columns2 = {};
  const add = (name2) => columns2[name2] = [];
  let cols;
  let n;
  for (const row of values2) {
    if (!cols) {
      names2 = names2 || Object.keys(row);
      cols = names2.map(add);
      n = cols.length;
    }
    for (let i = 0; i < n; ++i) {
      cols[i].push(row[names2[i]]);
    }
  }
  if (!cols && names2) {
    names2.forEach(add);
  }
  return columns2;
}
function from$1(values2, names2) {
  return new ColumnTable(columnsFrom(values2, names2), names2);
}
function $constructor(name2, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name2)) {
      return;
    }
    inst._zod.traits.add(name2);
    initializer2(inst, def);
    const proto = _.prototype;
    const keys2 = Object.keys(proto);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = (params == null ? void 0 : params.Parent) ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name2 });
  function _(def) {
    var _a2;
    const inst = (params == null ? void 0 : params.Parent) ? new Definition() : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      var _a2, _b;
      if ((params == null ? void 0 : params.Parent) && inst instanceof params.Parent)
        return true;
      return (_b = (_a2 = inst == null ? void 0 : inst._zod) == null ? void 0 : _a2.traits) == null ? void 0 : _b.has(name2);
    }
  });
  Object.defineProperty(_, "name", { value: name2 });
  return _;
}
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(name2) {
    super(`Encountered unidirectional transform during encode: ${name2}`);
    this.name = "ZodEncodeError";
  }
}
const globalConfig = {};
function config(newConfig) {
  return globalConfig;
}
function getEnumValues(entries2) {
  const numericValues = Object.values(entries2).filter((v) => typeof v === "number");
  const values2 = Object.entries(entries2).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values2;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  return {
    get value() {
      {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source2) {
  const start = source2.startsWith("^") ? 1 : 0;
  const end = source2.endsWith("$") ? source2.length - 1 : source2.length;
  return source2.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepString = step.toString();
  let stepDecCount = (stepString.split(".")[1] || "").length;
  if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
    const match2 = stepString.match(/\d?e-(\d?)/);
    if (match2 == null ? void 0 : match2[1]) {
      stepDecCount = Number.parseInt(match2[1]);
    }
  }
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
const EVALUATING = Symbol("evaluating");
function defineLazy(object2, key2, getter) {
  let value = void 0;
  Object.defineProperty(object2, key2, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key2, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject$1(data2) {
  return typeof data2 === "object" && data2 !== null && !Array.isArray(data2);
}
const allowsEval = cached(() => {
  var _a2;
  if (typeof navigator !== "undefined" && ((_a2 = navigator == null ? void 0 : navigator.userAgent) == null ? void 0 : _a2.includes("Cloudflare"))) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject$1(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject$1(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone$1(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || (params == null ? void 0 : params.parent))
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if ((params == null ? void 0 : params.message) !== void 0) {
    if ((params == null ? void 0 : params.error) !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
const NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key2 in mask) {
        if (!(key2 in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key2}"`);
        }
        if (!mask[key2])
          continue;
        newShape[key2] = currDef.shape[key2];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone$1(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key2 in mask) {
        if (!(key2 in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key2}"`);
        }
        if (!mask[key2])
          continue;
        delete newShape[key2];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone$1(schema, def);
}
function extend2(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key2 in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key2) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone$1(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone$1(schema, def);
}
function merge(a, b) {
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: []
    // delete existing checks
  });
  return clone$1(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key2 in mask) {
          if (!(key2 in oldShape)) {
            throw new Error(`Unrecognized key: "${key2}"`);
          }
          if (!mask[key2])
            continue;
          shape[key2] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key2]
          }) : oldShape[key2];
        }
      } else {
        for (const key2 in oldShape) {
          shape[key2] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key2]
          }) : oldShape[key2];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone$1(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key2 in mask) {
          if (!(key2 in shape)) {
            throw new Error(`Unrecognized key: "${key2}"`);
          }
          if (!mask[key2])
            continue;
          shape[key2] = new Class({
            type: "nonoptional",
            innerType: oldShape[key2]
          });
        }
      } else {
        for (const key2 in oldShape) {
          shape[key2] = new Class({
            type: "nonoptional",
            innerType: oldShape[key2]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone$1(schema, def);
}
function aborted(x, startIndex = 0) {
  var _a2;
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (((_a2 = x.issues[i]) == null ? void 0 : _a2.continue) !== true) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message == null ? void 0 : message.message;
}
function finalizeIssue(iss, ctx, config2) {
  var _a2, _b, _c, _d, _e, _f;
  const full = { ...iss, path: iss.path ?? [] };
  if (!iss.message) {
    const message = unwrapMessage((_c = (_b = (_a2 = iss.inst) == null ? void 0 : _a2._zod.def) == null ? void 0 : _b.error) == null ? void 0 : _c.call(_b, iss)) ?? unwrapMessage((_d = ctx == null ? void 0 : ctx.error) == null ? void 0 : _d.call(ctx, iss)) ?? unwrapMessage((_e = config2.customError) == null ? void 0 : _e.call(config2, iss)) ?? unwrapMessage((_f = config2.localeError) == null ? void 0 : _f.call(config2, iss)) ?? "Invalid input";
    full.message = message;
  }
  delete full.inst;
  delete full.continue;
  if (!(ctx == null ? void 0 : ctx.reportInput)) {
    delete full.input;
  }
  return full;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
const initializer$1 = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error3) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues });
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues });
      } else if (issue2.path.length === 0) {
        fieldErrors._errors.push(mapper(issue2));
      } else {
        let curr = fieldErrors;
        let i = 0;
        while (i < issue2.path.length) {
          const el = issue2.path[i];
          const terminal = i === issue2.path.length - 1;
          if (!terminal) {
            curr[el] = curr[el] || { _errors: [] };
          } else {
            curr[el] = curr[el] || { _errors: [] };
            curr[el]._errors.push(mapper(issue2));
          }
          curr = curr[el];
          i++;
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}
const _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new ((_params == null ? void 0 : _params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params == null ? void 0 : _params.callee);
    throw e;
  }
  return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new ((params == null ? void 0 : params.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params == null ? void 0 : params.callee);
    throw e;
  }
  return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
const cuid = /^[cC][^\s-]{8,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid$1 = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time$1(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
  const regex = params ? `[\\s\\S]{${(params == null ? void 0 : params.minimum) ?? 0},${(params == null ? void 0 : params.maximum) ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$2 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const _null$2 = /^null$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a2;
    (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = (_a2 = def.format) == null ? void 0 : _a2.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length2 = input.length;
    if (length2 <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length2 = input.length;
    if (length2 >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length2 = input.length;
    if (length2 === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length2 > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a2, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content = arg;
    const lines = content.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this == null ? void 0 : this.args;
    const content = (this == null ? void 0 : this.content) ?? [``];
    const lines = [...content.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
}
const version = {
  major: 4,
  minor: 3,
  patch: 6
};
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a3;
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    (_a3 = inst._zod.deferred) == null ? void 0 : _a3.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && (ctx == null ? void 0 : ctx.async) === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      var _a4;
      try {
        const r = safeParse$1(inst, value);
        return r.success ? { value: r.data } : { issues: (_a4 = r.error) == null ? void 0 : _a4.issues };
      } catch (_) {
        return safeParseAsync$1(inst, value).then((r) => {
          var _a5;
          return r.success ? { value: r.data } : { issues: (_a5 = r.error) == null ? void 0 : _a5.issues };
        });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  var _a2;
  $ZodType.init(inst, def);
  inst._zod.pattern = [...((_a2 = inst == null ? void 0 : inst._zod.bag) == null ? void 0 : _a2.patterns) ?? []].pop() ?? string$1(inst._zod.bag);
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid$1(v));
  } else
    def.pattern ?? (def.pattern = uuid$1());
  $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data2) {
  if (data2 === "")
    return true;
  if (data2.length % 4 !== 0)
    return false;
  try {
    atob(data2);
    return true;
  } catch {
    return false;
  }
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data2) {
  if (!base64url.test(data2))
    return false;
  const base642 = data2.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && (parsedHeader == null ? void 0 : parsedHeader.typ) !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number$2;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
const $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = _null$2;
  inst._zod.values = /* @__PURE__ */ new Set([null]);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (input === null)
      return payload;
    payload.issues.push({
      expected: "null",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
const $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index2) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index2, result.issues));
  }
  final.value[index2] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key2, input, isOptionalOut) {
  if (result.issues.length) {
    if (isOptionalOut && !(key2 in input)) {
      return;
    }
    final.issues.push(...prefixIssues(key2, result.issues));
  }
  if (result.value === void 0) {
    if (key2 in input) {
      final.value[key2] = void 0;
    }
  } else {
    final.value[key2] = result.value;
  }
}
function normalizeDef(def) {
  var _a2, _b, _c, _d;
  const keys2 = Object.keys(def.shape);
  for (const k of keys2) {
    if (!((_d = (_c = (_b = (_a2 = def.shape) == null ? void 0 : _a2[k]) == null ? void 0 : _b._zod) == null ? void 0 : _c.traits) == null ? void 0 : _d.has("$ZodType"))) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys: keys2,
    keySet: new Set(keys2),
    numKeys: keys2.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t2 = _catchall.def.type;
  const isOptionalOut = _catchall.optout === "optional";
  for (const key2 in input) {
    if (keySet.has(key2))
      continue;
    if (t2 === "never") {
      unrecognized.push(key2);
      continue;
    }
    const r = _catchall.run({ value: input[key2], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key2, input, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key2, input, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc2 = Object.getOwnPropertyDescriptor(def, "shape");
  if (!(desc2 == null ? void 0 : desc2.get)) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key2 in shape) {
      const field2 = shape[key2]._zod;
      if (field2.values) {
        propValues[key2] ?? (propValues[key2] = /* @__PURE__ */ new Set());
        for (const v of field2.values)
          propValues[key2].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject$1;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key2 of value.keys) {
      const el = shape[key2];
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key2], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key2, input, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key2, input, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    var _a2;
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key2) => {
      const k = esc(key2);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key2 of normalized.keys) {
      ids[key2] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key2 of normalized.keys) {
      const id = ids[key2];
      const k = esc(key2);
      const schema = shape[key2];
      const isOptionalOut = ((_a2 = schema == null ? void 0 : schema._zod) == null ? void 0 : _a2.optout) === "optional";
      doc.write(`const ${id} = ${parseStr(key2)};`);
      if (isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject2 = isObject$1;
  const jit = !globalConfig.jitless;
  const allowsEval$1 = allowsEval;
  const fastEnabled = jit && allowsEval$1.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && (ctx == null ? void 0 : ctx.async) === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const single = def.options.length === 1;
  const first = def.options[0]._zod.run;
  inst._zod.parse = (payload, ctx) => {
    if (single) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
const $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
  def.inclusive = false;
  $ZodUnion.init(inst, def);
  const _super = inst._zod.parse;
  defineLazy(inst._zod, "propValues", () => {
    const propValues = {};
    for (const option of def.options) {
      const pv = option._zod.propValues;
      if (!pv || Object.keys(pv).length === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
      for (const [k, v] of Object.entries(pv)) {
        if (!propValues[k])
          propValues[k] = /* @__PURE__ */ new Set();
        for (const val of v) {
          propValues[k].add(val);
        }
      }
    }
    return propValues;
  });
  const disc = cached(() => {
    var _a2;
    const opts = def.options;
    const map2 = /* @__PURE__ */ new Map();
    for (const o of opts) {
      const values2 = (_a2 = o._zod.propValues) == null ? void 0 : _a2[def.discriminator];
      if (!values2 || values2.size === 0)
        throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o)}"`);
      for (const v of values2) {
        if (map2.has(v)) {
          throw new Error(`Duplicate discriminator value "${String(v)}"`);
        }
        map2.set(v, o);
      }
    }
    return map2;
  });
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isObject$1(input)) {
      payload.issues.push({
        code: "invalid_type",
        expected: "object",
        input,
        inst
      });
      return payload;
    }
    const opt2 = disc.value.get(input == null ? void 0 : input[def.discriminator]);
    if (opt2) {
      return opt2._zod.run(payload, ctx);
    }
    if (def.unionFallback) {
      return _super(payload, ctx);
    }
    payload.issues.push({
      code: "invalid_union",
      errors: [],
      note: "No matching discriminator",
      discriminator: def.discriminator,
      input,
      path: [def.discriminator],
      inst
    });
    return payload;
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key2) => bKeys.indexOf(key2) !== -1);
    const newObj = { ...a, ...b };
    for (const key2 of sharedKeys) {
      const sharedValue = mergeValues(a[key2], b[key2]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key2, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key2] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index2, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values2 = def.keyType._zod.values;
    if (values2) {
      payload.value = {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key2 of values2) {
        if (typeof key2 === "string" || typeof key2 === "number" || typeof key2 === "symbol") {
          recordKeys.add(typeof key2 === "number" ? key2.toString() : key2);
          const result = def.valueType._zod.run({ value: input[key2], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key2, result2.issues));
              }
              payload.value[key2] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key2, result.issues));
            }
            payload.value[key2] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key2 in input) {
        if (!recordKeys.has(key2)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key2);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key2 of Reflect.ownKeys(input)) {
        if (key2 === "__proto__")
          continue;
        let keyResult = def.keyType._zod.run({ value: key2, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key2 === "string" && number$2.test(key2) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key2), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key2] = input[key2];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key2,
              path: [key2],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key2], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key2, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key2, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values2 = getEnumValues(def.entries);
  const valuesSet = new Set(values2);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values2.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: values2,
      input,
      inst
    });
    return payload;
  };
});
const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values2 = new Set(def.values);
  inst._zod.values = values2;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values2.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output2 = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output2.then((output3) => {
        payload.value = output3;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (result.issues.length && input === void 0) {
    return { issues: [], value: void 0 };
  }
  return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, payload.value));
      return handleOptionalResult(result, payload.value);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
            },
            input: payload.value
          });
          payload.issues = [];
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        },
        input: payload.value
      });
      payload.issues = [];
    }
    return payload;
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues }, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => {
    var _a2, _b;
    return (_b = (_a2 = def.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optin;
  });
  defineLazy(inst._zod, "optout", () => {
    var _a2, _b;
    return (_b = (_a2 = def.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optout;
  });
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "innerType", () => def.getter());
  defineLazy(inst._zod, "pattern", () => {
    var _a2, _b;
    return (_b = (_a2 = inst._zod.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.pattern;
  });
  defineLazy(inst._zod, "propValues", () => {
    var _a2, _b;
    return (_b = (_a2 = inst._zod.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.propValues;
  });
  defineLazy(inst._zod, "optin", () => {
    var _a2, _b;
    return ((_b = (_a2 = inst._zod.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optin) ?? void 0;
  });
  defineLazy(inst._zod, "optout", () => {
    var _a2, _b;
    return ((_b = (_a2 = inst._zod.innerType) == null ? void 0 : _a2._zod) == null ? void 0 : _b.optout) ?? void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const inner = inst._zod.innerType;
    return inner._zod.run(payload, ctx);
  };
});
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var _a;
class $ZodRegistry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _coercedNumber(Class, params) {
  return new Class({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _null$1(Class, params) {
  return new Class({
    type: "null",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
  return new Class({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length2, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length: length2
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes2, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes: includes2
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _custom(Class, fn, _params) {
  const norm = normalizeParams(_params);
  norm.abort ?? (norm.abort = true);
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...norm
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function initializeContext(params) {
  let target = (params == null ? void 0 : params.target) ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: (params == null ? void 0 : params.metadata) ?? globalRegistry,
    target,
    unrepresentable: (params == null ? void 0 : params.unrepresentable) ?? "throw",
    override: (params == null ? void 0 : params.override) ?? (() => {
    }),
    io: (params == null ? void 0 : params.io) ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: (params == null ? void 0 : params.cycles) ?? "ref",
    reused: (params == null ? void 0 : params.reused) ?? "inline",
    external: (params == null ? void 0 : params.external) ?? void 0
  };
}
function process$1(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a3, _b;
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = (_b = (_a3 = schema._zod).toJSONSchema) == null ? void 0 : _b.call(_a3);
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process$1(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && result.schema._prefault)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  var _a2, _b, _c, _d;
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = (_a2 = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _a2.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    var _a3;
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = (_a3 = ctx.external.registry.get(entry[0])) == null ? void 0 : _a3.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref: ref2, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key2 in schema2) {
      delete schema2[key2];
    }
    schema2.$ref = ref2;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${(_b = seen.cycle) == null ? void 0 : _b.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = (_c = ctx.external.registry.get(entry[0])) == null ? void 0 : _c.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = (_d = ctx.metadataRegistry.get(entry[0])) == null ? void 0 : _d.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  var _a2, _b, _c;
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref2 = seen.ref;
    seen.ref = null;
    if (ref2) {
      flattenRef(ref2);
      const refSeen = ctx.seen.get(ref2);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref2;
      if (isParentRef) {
        for (const key2 in schema2) {
          if (key2 === "$ref" || key2 === "allOf")
            continue;
          if (!(key2 in _cached)) {
            delete schema2[key2];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key2 in schema2) {
          if (key2 === "$ref" || key2 === "allOf")
            continue;
          if (key2 in refSeen.def && JSON.stringify(schema2[key2]) === JSON.stringify(refSeen.def[key2])) {
            delete schema2[key2];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref2) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen == null ? void 0 : parentSeen.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key2 in schema2) {
            if (key2 === "$ref" || key2 === "allOf")
              continue;
            if (key2 in parentSeen.def && JSON.stringify(schema2[key2]) === JSON.stringify(parentSeen.def[key2])) {
              delete schema2[key2];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") ;
  else ;
  if ((_a2 = ctx.external) == null ? void 0 : _a2.uri) {
    const id = (_b = ctx.external.registry.get(schema)) == null ? void 0 : _b.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const defs = ((_c = ctx.external) == null ? void 0 : _c.defs) ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) ;
  else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key2 in def.shape) {
      if (isTransforming(def.shape[key2], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
const stringProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  json2.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minLength = minimum;
  if (typeof maximum === "number")
    json2.maxLength = maximum;
  if (format) {
    json2.format = formatMap[format] ?? format;
    if (json2.format === "")
      delete json2.format;
    if (format === "time") {
      delete json2.format;
    }
  }
  if (contentEncoding)
    json2.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json2.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json2.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
const numberProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json2.type = "integer";
  else
    json2.type = "number";
  if (typeof exclusiveMinimum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.minimum = exclusiveMinimum;
      json2.exclusiveMinimum = true;
    } else {
      json2.exclusiveMinimum = exclusiveMinimum;
    }
  }
  if (typeof minimum === "number") {
    json2.minimum = minimum;
    if (typeof exclusiveMinimum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMinimum >= minimum)
        delete json2.minimum;
      else
        delete json2.exclusiveMinimum;
    }
  }
  if (typeof exclusiveMaximum === "number") {
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.maximum = exclusiveMaximum;
      json2.exclusiveMaximum = true;
    } else {
      json2.exclusiveMaximum = exclusiveMaximum;
    }
  }
  if (typeof maximum === "number") {
    json2.maximum = maximum;
    if (typeof exclusiveMaximum === "number" && ctx.target !== "draft-04") {
      if (exclusiveMaximum <= maximum)
        delete json2.maximum;
      else
        delete json2.exclusiveMaximum;
    }
  }
  if (typeof multipleOf === "number")
    json2.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
const bigintProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("BigInt cannot be represented in JSON Schema");
  }
};
const symbolProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Symbols cannot be represented in JSON Schema");
  }
};
const nullProcessor = (_schema, ctx, json2, _params) => {
  if (ctx.target === "openapi-3.0") {
    json2.type = "string";
    json2.nullable = true;
    json2.enum = [null];
  } else {
    json2.type = "null";
  }
};
const undefinedProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Undefined cannot be represented in JSON Schema");
  }
};
const voidProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Void cannot be represented in JSON Schema");
  }
};
const neverProcessor = (_schema, _ctx, json2, _params) => {
  json2.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
};
const dateProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Date cannot be represented in JSON Schema");
  }
};
const enumProcessor = (schema, _ctx, json2, _params) => {
  const def = schema._zod.def;
  const values2 = getEnumValues(def.entries);
  if (values2.every((v) => typeof v === "number"))
    json2.type = "number";
  if (values2.every((v) => typeof v === "string"))
    json2.type = "string";
  json2.enum = values2;
};
const literalProcessor = (schema, ctx, json2, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) ;
  else if (vals.length === 1) {
    const val = vals[0];
    json2.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.enum = [val];
    } else {
      json2.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json2.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json2.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json2.type = "boolean";
    if (vals.every((v) => v === null))
      json2.type = "null";
    json2.enum = vals;
  }
};
const nanProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("NaN cannot be represented in JSON Schema");
  }
};
const templateLiteralProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const pattern = schema._zod.pattern;
  if (!pattern)
    throw new Error("Pattern not found in template literal");
  _json.type = "string";
  _json.pattern = pattern.source;
};
const fileProcessor = (schema, _ctx, json2, _params) => {
  const _json = json2;
  const file = {
    type: "string",
    format: "binary",
    contentEncoding: "binary"
  };
  const { minimum, maximum, mime } = schema._zod.bag;
  if (minimum !== void 0)
    file.minLength = minimum;
  if (maximum !== void 0)
    file.maxLength = maximum;
  if (mime) {
    if (mime.length === 1) {
      file.contentMediaType = mime[0];
      Object.assign(_json, file);
    } else {
      Object.assign(_json, file);
      _json.anyOf = mime.map((m) => ({ contentMediaType: m }));
    }
  } else {
    Object.assign(_json, file);
  }
};
const successProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
const customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
const functionProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Function types cannot be represented in JSON Schema");
  }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
const mapProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Map cannot be represented in JSON Schema");
  }
};
const setProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Set cannot be represented in JSON Schema");
  }
};
const arrayProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
  json2.type = "array";
  json2.items = process$1(def.element, ctx, { ...params, path: [...params.path, "items"] });
};
const objectProcessor = (schema, ctx, _json, params) => {
  var _a2;
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  json2.properties = {};
  const shape = def.shape;
  for (const key2 in shape) {
    json2.properties[key2] = process$1(shape[key2], ctx, {
      ...params,
      path: [...params.path, "properties", key2]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key2) => {
    const v = def.shape[key2]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json2.required = Array.from(requiredKeys);
  }
  if (((_a2 = def.catchall) == null ? void 0 : _a2._zod.def.type) === "never") {
    json2.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json2.additionalProperties = false;
  } else if (def.catchall) {
    json2.additionalProperties = process$1(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
const unionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options = def.options.map((x, i) => process$1(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json2.oneOf = options;
  } else {
    json2.anyOf = options;
  }
};
const intersectionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const a = process$1(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process$1(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json2.allOf = allOf;
};
const tupleProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "array";
  const prefixPath = ctx.target === "draft-2020-12" ? "prefixItems" : "items";
  const restPath = ctx.target === "draft-2020-12" ? "items" : ctx.target === "openapi-3.0" ? "items" : "additionalItems";
  const prefixItems = def.items.map((x, i) => process$1(x, ctx, {
    ...params,
    path: [...params.path, prefixPath, i]
  }));
  const rest = def.rest ? process$1(def.rest, ctx, {
    ...params,
    path: [...params.path, restPath, ...ctx.target === "openapi-3.0" ? [def.items.length] : []]
  }) : null;
  if (ctx.target === "draft-2020-12") {
    json2.prefixItems = prefixItems;
    if (rest) {
      json2.items = rest;
    }
  } else if (ctx.target === "openapi-3.0") {
    json2.items = {
      anyOf: prefixItems
    };
    if (rest) {
      json2.items.anyOf.push(rest);
    }
    json2.minItems = prefixItems.length;
    if (!rest) {
      json2.maxItems = prefixItems.length;
    }
  } else {
    json2.items = prefixItems;
    if (rest) {
      json2.additionalItems = rest;
    }
  }
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
};
const recordProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag == null ? void 0 : keyBag.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process$1(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json2.patternProperties = {};
    for (const pattern of patterns) {
      json2.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json2.propertyNames = process$1(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json2.additionalProperties = process$1(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json2.required = validKeyValues;
    }
  }
};
const nullableProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const inner = process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json2.nullable = true;
  } else {
    json2.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json2._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json2.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const innerType = ctx.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
  process$1(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.readOnly = true;
};
const promiseProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const lazyProcessor = (schema, ctx, _json, params) => {
  const innerType = schema._zod.innerType;
  process$1(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const allProcessors = {
  string: stringProcessor,
  number: numberProcessor,
  boolean: booleanProcessor,
  bigint: bigintProcessor,
  symbol: symbolProcessor,
  null: nullProcessor,
  undefined: undefinedProcessor,
  void: voidProcessor,
  never: neverProcessor,
  any: anyProcessor,
  unknown: unknownProcessor,
  date: dateProcessor,
  enum: enumProcessor,
  literal: literalProcessor,
  nan: nanProcessor,
  template_literal: templateLiteralProcessor,
  file: fileProcessor,
  success: successProcessor,
  custom: customProcessor,
  function: functionProcessor,
  transform: transformProcessor,
  map: mapProcessor,
  set: setProcessor,
  array: arrayProcessor,
  object: objectProcessor,
  union: unionProcessor,
  intersection: intersectionProcessor,
  tuple: tupleProcessor,
  record: recordProcessor,
  nullable: nullableProcessor,
  nonoptional: nonoptionalProcessor,
  default: defaultProcessor,
  prefault: prefaultProcessor,
  catch: catchProcessor,
  pipe: pipeProcessor,
  readonly: readonlyProcessor,
  promise: promiseProcessor,
  optional: optionalProcessor,
  lazy: lazyProcessor
};
function toJSONSchema(input, params) {
  if ("_idmap" in input) {
    const registry2 = input;
    const ctx2 = initializeContext({ ...params, processors: allProcessors });
    const defs = {};
    for (const entry of registry2._idmap.entries()) {
      const [_, schema] = entry;
      process$1(schema, ctx2);
    }
    const schemas = {};
    const external = {
      registry: registry2,
      uri: params == null ? void 0 : params.uri,
      defs
    };
    ctx2.external = external;
    for (const entry of registry2._idmap.entries()) {
      const [key2, schema] = entry;
      extractDefs(ctx2, schema);
      schemas[key2] = finalize(ctx2, schema);
    }
    if (Object.keys(defs).length > 0) {
      const defsSegment = ctx2.target === "draft-2020-12" ? "$defs" : "definitions";
      schemas.__shared = {
        [defsSegment]: defs
      };
    }
    return { schemas };
  }
  const ctx = initializeContext({ ...params, processors: allProcessors });
  process$1(input, ctx);
  extractDefs(ctx, input);
  return finalize(ctx, input);
}
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime(params) {
  return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date(params) {
  return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time(params) {
  return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration(params) {
  return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
const initializer = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
const ZodRealError = $constructor("ZodError", initializer, {
  Parent: Error
});
const parse3 = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.check = (...checks) => {
    return inst.clone(mergeDefs(def, {
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }), {
      parent: true
    });
  };
  inst.with = inst.check;
  inst.clone = (def2, params) => clone$1(inst, def2, params);
  inst.brand = () => inst;
  inst.register = ((reg, meta) => {
    reg.add(inst, meta);
    return inst;
  });
  inst.parse = (data2, params) => parse3(inst, data2, params, { callee: inst.parse });
  inst.safeParse = (data2, params) => safeParse(inst, data2, params);
  inst.parseAsync = async (data2, params) => parseAsync(inst, data2, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data2, params) => safeParseAsync(inst, data2, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data2, params) => encode(inst, data2, params);
  inst.decode = (data2, params) => decode(inst, data2, params);
  inst.encodeAsync = async (data2, params) => encodeAsync(inst, data2, params);
  inst.decodeAsync = async (data2, params) => decodeAsync(inst, data2, params);
  inst.safeEncode = (data2, params) => safeEncode(inst, data2, params);
  inst.safeDecode = (data2, params) => safeDecode(inst, data2, params);
  inst.safeEncodeAsync = async (data2, params) => safeEncodeAsync(inst, data2, params);
  inst.safeDecodeAsync = async (data2, params) => safeDecodeAsync(inst, data2, params);
  inst.refine = (check2, params) => inst.check(refine(check2, params));
  inst.superRefine = (refinement) => inst.check(superRefine(refinement));
  inst.overwrite = (fn) => inst.check(/* @__PURE__ */ _overwrite(fn));
  inst.optional = () => optional(inst);
  inst.exactOptional = () => exactOptional(inst);
  inst.nullable = () => nullable(inst);
  inst.nullish = () => optional(nullable(inst));
  inst.nonoptional = (params) => nonoptional(inst, params);
  inst.array = () => array(inst);
  inst.or = (arg) => union([inst, arg]);
  inst.and = (arg) => intersection(inst, arg);
  inst.transform = (tx) => pipe(inst, transform(tx));
  inst.default = (def2) => _default(inst, def2);
  inst.prefault = (def2) => prefault(inst, def2);
  inst.catch = (params) => _catch(inst, params);
  inst.pipe = (target) => pipe(inst, target);
  inst.readonly = () => readonly(inst);
  inst.describe = (description) => {
    const cl = inst.clone();
    globalRegistry.add(cl, { description });
    return cl;
  };
  Object.defineProperty(inst, "description", {
    get() {
      var _a2;
      return (_a2 = globalRegistry.get(inst)) == null ? void 0 : _a2.description;
    },
    configurable: true
  });
  inst.meta = (...args) => {
    if (args.length === 0) {
      return globalRegistry.get(inst);
    }
    const cl = inst.clone();
    globalRegistry.add(cl, args[0]);
    return cl;
  };
  inst.isOptional = () => inst.safeParse(void 0).success;
  inst.isNullable = () => inst.safeParse(null).success;
  inst.apply = (fn) => fn(inst);
  return inst;
});
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => stringProcessor(inst, ctx, json2);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  inst.regex = (...args) => inst.check(/* @__PURE__ */ _regex(...args));
  inst.includes = (...args) => inst.check(/* @__PURE__ */ _includes(...args));
  inst.startsWith = (...args) => inst.check(/* @__PURE__ */ _startsWith(...args));
  inst.endsWith = (...args) => inst.check(/* @__PURE__ */ _endsWith(...args));
  inst.min = (...args) => inst.check(/* @__PURE__ */ _minLength(...args));
  inst.max = (...args) => inst.check(/* @__PURE__ */ _maxLength(...args));
  inst.length = (...args) => inst.check(/* @__PURE__ */ _length(...args));
  inst.nonempty = (...args) => inst.check(/* @__PURE__ */ _minLength(1, ...args));
  inst.lowercase = (params) => inst.check(/* @__PURE__ */ _lowercase(params));
  inst.uppercase = (params) => inst.check(/* @__PURE__ */ _uppercase(params));
  inst.trim = () => inst.check(/* @__PURE__ */ _trim());
  inst.normalize = (...args) => inst.check(/* @__PURE__ */ _normalize(...args));
  inst.toLowerCase = () => inst.check(/* @__PURE__ */ _toLowerCase());
  inst.toUpperCase = () => inst.check(/* @__PURE__ */ _toUpperCase());
  inst.slugify = () => inst.check(/* @__PURE__ */ _slugify());
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
  inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
  inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime(params));
  inst.date = (params) => inst.check(date(params));
  inst.time = (params) => inst.check(time(params));
  inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
  return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => numberProcessor(inst, ctx, json2);
  inst.gt = (value, params) => inst.check(/* @__PURE__ */ _gt(value, params));
  inst.gte = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
  inst.min = (value, params) => inst.check(/* @__PURE__ */ _gte(value, params));
  inst.lt = (value, params) => inst.check(/* @__PURE__ */ _lt(value, params));
  inst.lte = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
  inst.max = (value, params) => inst.check(/* @__PURE__ */ _lte(value, params));
  inst.int = (params) => inst.check(int(params));
  inst.safe = (params) => inst.check(int(params));
  inst.positive = (params) => inst.check(/* @__PURE__ */ _gt(0, params));
  inst.nonnegative = (params) => inst.check(/* @__PURE__ */ _gte(0, params));
  inst.negative = (params) => inst.check(/* @__PURE__ */ _lt(0, params));
  inst.nonpositive = (params) => inst.check(/* @__PURE__ */ _lte(0, params));
  inst.multipleOf = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
  inst.step = (value, params) => inst.check(/* @__PURE__ */ _multipleOf(value, params));
  inst.finite = () => inst;
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number$1(params) {
  return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => booleanProcessor(inst, ctx, json2);
});
function boolean(params) {
  return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
  $ZodNull.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullProcessor(inst, ctx, json2);
});
function _null(params) {
  return /* @__PURE__ */ _null$1(ZodNull, params);
}
const ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => anyProcessor();
});
function any() {
  return /* @__PURE__ */ _any(ZodAny);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unknownProcessor();
});
function unknown() {
  return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => neverProcessor(inst, ctx, json2);
});
function never(params) {
  return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => arrayProcessor(inst, ctx, json2, params);
  inst.element = def.element;
  inst.min = (minLength, params) => inst.check(/* @__PURE__ */ _minLength(minLength, params));
  inst.nonempty = (params) => inst.check(/* @__PURE__ */ _minLength(1, params));
  inst.max = (maxLength, params) => inst.check(/* @__PURE__ */ _maxLength(maxLength, params));
  inst.length = (len, params) => inst.check(/* @__PURE__ */ _length(len, params));
  inst.unwrap = () => inst.element;
});
function array(element, params) {
  return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => objectProcessor(inst, ctx, json2, params);
  defineLazy(inst, "shape", () => {
    return def.shape;
  });
  inst.keyof = () => _enum(Object.keys(inst._zod.def.shape));
  inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
  inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
  inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
  inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
  inst.extend = (incoming) => {
    return extend2(inst, incoming);
  };
  inst.safeExtend = (incoming) => {
    return safeExtend(inst, incoming);
  };
  inst.merge = (other) => merge(inst, other);
  inst.pick = (mask) => pick(inst, mask);
  inst.omit = (mask) => omit(inst, mask);
  inst.partial = (...args) => partial(ZodOptional, inst, args[0]);
  inst.required = (...args) => required(ZodNonOptional, inst, args[0]);
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function union(options, params) {
  return new ZodUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
const ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
  ZodUnion.init(inst, def);
  $ZodDiscriminatedUnion.init(inst, def);
});
function discriminatedUnion(discriminator, options, params) {
  return new ZodDiscriminatedUnion({
    type: "union",
    options,
    discriminator,
    ...normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => intersectionProcessor(inst, ctx, json2, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => recordProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => enumProcessor(inst, ctx, json2);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys2 = new Set(Object.keys(def.entries));
  inst.extract = (values2, params) => {
    const newEntries = {};
    for (const value of values2) {
      if (keys2.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values2, params) => {
    const newEntries = { ...def.entries };
    for (const value of values2) {
      if (keys2.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values2, params) {
  const entries2 = Array.isArray(values2) ? Object.fromEntries(values2.map((v) => [v, v])) : values2;
  return new ZodEnum({
    type: "enum",
    entries: entries2,
    ...normalizeParams(params)
  });
}
const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => literalProcessor(inst, ctx, json2);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => transformProcessor(inst, ctx);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output2 = def.transform(payload.value, payload);
    if (output2 instanceof Promise) {
      return output2.then((output3) => {
        payload.value = output3;
        return payload;
      });
    }
    payload.value = output2;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullableProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => defaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => prefaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nonoptionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => catchProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => pipeProcessor(inst, ctx, json2, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => readonlyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
  $ZodLazy.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => lazyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.getter();
});
function lazy(getter) {
  return new ZodLazy({
    type: "lazy",
    getter
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => customProcessor(inst, ctx);
});
function custom(fn, _params) {
  return /* @__PURE__ */ _custom(ZodCustom, fn ?? (() => true), _params);
}
function refine(fn, _params = {}) {
  return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn) {
  return /* @__PURE__ */ _superRefine(fn);
}
function _instanceof(cls, params = {}) {
  const inst = new ZodCustom({
    type: "custom",
    check: "custom",
    fn: (data2) => data2 instanceof cls,
    abort: true,
    ...normalizeParams(params)
  });
  inst._zod.bag.Class = cls;
  inst._zod.check = (payload) => {
    if (!(payload.value instanceof cls)) {
      payload.issues.push({
        code: "invalid_type",
        expected: cls.name,
        input: payload.value,
        inst,
        path: [...inst._zod.def.path ?? []]
      });
    }
  };
  return inst;
}
function number(params) {
  return /* @__PURE__ */ _coercedNumber(ZodNumber, params);
}
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object2) => {
    const keys2 = [];
    for (const key2 in object2) {
      if (Object.prototype.hasOwnProperty.call(object2, key2)) {
        keys2.push(key2);
      }
    }
    return keys2;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array2, separator = " | ") {
    return array2.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue2) {
      return issue2.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error2) => {
      for (const issue2 of error2.issues) {
        if (issue2.code === "invalid_union") {
          issue2.unionErrors.map(processError);
        } else if (issue2.code === "invalid_return_type") {
          processError(issue2.returnTypeError);
        } else if (issue2.code === "invalid_arguments") {
          processError(issue2.argumentsError);
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue2.path.length) {
            const el = issue2.path[i];
            const terminal = i === issue2.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue2) => issue2.message) {
    const fieldErrors = /* @__PURE__ */ Object.create(null);
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
}
ZodError.create = (issues) => {
  const error2 = new ZodError(issues);
  return error2;
};
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message == null ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
class ParseError extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
}
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = true, id, data2 = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = false;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field2 = line.slice(0, fieldSeparatorIndex), offset2 = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset2);
      processField(field2, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field2, value, line) {
    switch (field2) {
      case "event":
        eventType = value;
        break;
      case "data":
        data2 = `${data2}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field2.length > 20 ? `${field2.slice(0, 20)}…` : field2}"`,
            { type: "unknown-field", field: field2, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data2.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data2.endsWith(`
`) ? data2.slice(0, -1) : data2
    }), id = void 0, data2 = "", eventType = "";
  }
  function reset2(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id = void 0, data2 = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset: reset2 };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}
class EventSourceParserStream extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error2) {
            onError === "terminate" ? controller.error(error2) : typeof onError == "function" && onError(error2);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
}
var getContext_1;
var hasRequiredGetContext;
function requireGetContext() {
  if (hasRequiredGetContext) return getContext_1;
  hasRequiredGetContext = 1;
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all2) => {
    for (var name2 in all2)
      __defProp2(target, name2, { get: all2[name2], enumerable: true });
  };
  var __copyProps = (to2, from2, except2, desc2) => {
    if (from2 && typeof from2 === "object" || typeof from2 === "function") {
      for (let key2 of __getOwnPropNames(from2))
        if (!__hasOwnProp.call(to2, key2) && key2 !== except2)
          __defProp2(to2, key2, { get: () => from2[key2], enumerable: !(desc2 = __getOwnPropDesc(from2, key2)) || desc2.enumerable });
    }
    return to2;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var get_context_exports = {};
  __export(get_context_exports, {
    SYMBOL_FOR_REQ_CONTEXT: () => SYMBOL_FOR_REQ_CONTEXT,
    getContext: () => getContext
  });
  getContext_1 = __toCommonJS(get_context_exports);
  const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");
  function getContext() {
    var _a2, _b;
    const fromSymbol = globalThis;
    return ((_b = (_a2 = fromSymbol[SYMBOL_FOR_REQ_CONTEXT]) == null ? void 0 : _a2.get) == null ? void 0 : _b.call(_a2)) ?? {};
  }
  return getContext_1;
}
var indexBrowser;
var hasRequiredIndexBrowser;
function requireIndexBrowser() {
  if (hasRequiredIndexBrowser) return indexBrowser;
  hasRequiredIndexBrowser = 1;
  var __defProp2 = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all2) => {
    for (var name2 in all2)
      __defProp2(target, name2, { get: all2[name2], enumerable: true });
  };
  var __copyProps = (to2, from2, except2, desc2) => {
    if (from2 && typeof from2 === "object" || typeof from2 === "function") {
      for (let key2 of __getOwnPropNames(from2))
        if (!__hasOwnProp.call(to2, key2) && key2 !== except2)
          __defProp2(to2, key2, { get: () => from2[key2], enumerable: !(desc2 = __getOwnPropDesc(from2, key2)) || desc2.enumerable });
    }
    return to2;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
  var index_browser_exports = {};
  __export(index_browser_exports, {
    getContext: () => import_get_context.getContext,
    getVercelOidcToken: () => getVercelOidcToken,
    getVercelOidcTokenSync: () => getVercelOidcTokenSync
  });
  indexBrowser = __toCommonJS(index_browser_exports);
  var import_get_context = requireGetContext();
  async function getVercelOidcToken() {
    return "";
  }
  function getVercelOidcTokenSync() {
    return "";
  }
  return indexBrowser;
}
var indexBrowserExports = requireIndexBrowser();
var _globalThis = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
var VERSION = "1.9.0";
var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var isCompatible = _makeCompatibilityCheck(VERSION);
var major = VERSION.split(".")[0];
var GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
var _global = _globalThis;
function registerGlobal(type, instance, diag, allowOverride) {
  var _a2;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a2 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a2 !== void 0 ? _a2 : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
    diag.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
  return true;
}
function getGlobal(type) {
  var _a2, _b;
  var globalVersion = (_a2 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a2 === void 0 ? void 0 : _a2.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag) {
  diag.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var __read$4 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error2) {
    e = { error: error2 };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray$3 = function(to2, from2, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
    if (ar || !(i in from2)) {
      if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
      ar[i] = from2[i];
    }
  }
  return to2.concat(ar || Array.prototype.slice.call(from2));
};
var DiagComponentLogger = (
  /** @class */
  (function() {
    function DiagComponentLogger2(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    DiagComponentLogger2.prototype.debug = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("debug", this._namespace, args);
    };
    DiagComponentLogger2.prototype.error = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("error", this._namespace, args);
    };
    DiagComponentLogger2.prototype.info = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("info", this._namespace, args);
    };
    DiagComponentLogger2.prototype.warn = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("warn", this._namespace, args);
    };
    DiagComponentLogger2.prototype.verbose = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("verbose", this._namespace, args);
    };
    return DiagComponentLogger2;
  })()
);
function logProxy(funcName, namespace, args) {
  var logger = getGlobal("diag");
  if (!logger) {
    return;
  }
  args.unshift(namespace);
  return logger[funcName].apply(logger, __spreadArray$3([], __read$4(args), false));
}
var DiagLogLevel;
(function(DiagLogLevel2) {
  DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
  DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
  DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
  DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
  DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
  DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
  DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
})(DiagLogLevel || (DiagLogLevel = {}));
function createLogLevelDiagLogger(maxLevel, logger) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger = logger || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var __read$3 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error2) {
    e = { error: error2 };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray$2 = function(to2, from2, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
    if (ar || !(i in from2)) {
      if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
      ar[i] = from2[i];
    }
  }
  return to2.concat(ar || Array.prototype.slice.call(from2));
};
var API_NAME$4 = "diag";
var DiagAPI = (
  /** @class */
  (function() {
    function DiagAPI2() {
      function _logProxy(funcName) {
        return function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var logger = getGlobal("diag");
          if (!logger)
            return;
          return logger[funcName].apply(logger, __spreadArray$2([], __read$3(args), false));
        };
      }
      var self2 = this;
      var setLogger = function(logger, optionsOrLogLevel) {
        var _a2, _b, _c;
        if (optionsOrLogLevel === void 0) {
          optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
        }
        if (logger === self2) {
          var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self2.error((_a2 = err.stack) !== null && _a2 !== void 0 ? _a2 : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        var oldLogger = getGlobal("diag");
        var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn("Current logger will be overwritten from " + stack);
          newLogger.warn("Current logger will overwrite one already registered from " + stack);
        }
        return registerGlobal("diag", newLogger, self2, true);
      };
      self2.setLogger = setLogger;
      self2.disable = function() {
        unregisterGlobal(API_NAME$4, self2);
      };
      self2.createComponentLogger = function(options) {
        return new DiagComponentLogger(options);
      };
      self2.verbose = _logProxy("verbose");
      self2.debug = _logProxy("debug");
      self2.info = _logProxy("info");
      self2.warn = _logProxy("warn");
      self2.error = _logProxy("error");
    }
    DiagAPI2.instance = function() {
      if (!this._instance) {
        this._instance = new DiagAPI2();
      }
      return this._instance;
    };
    return DiagAPI2;
  })()
);
var __read$2 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error2) {
    e = { error: error2 };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __values = function(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var BaggageImpl = (
  /** @class */
  (function() {
    function BaggageImpl2(entries2) {
      this._entries = entries2 ? new Map(entries2) : /* @__PURE__ */ new Map();
    }
    BaggageImpl2.prototype.getEntry = function(key2) {
      var entry = this._entries.get(key2);
      if (!entry) {
        return void 0;
      }
      return Object.assign({}, entry);
    };
    BaggageImpl2.prototype.getAllEntries = function() {
      return Array.from(this._entries.entries()).map(function(_a2) {
        var _b = __read$2(_a2, 2), k = _b[0], v = _b[1];
        return [k, v];
      });
    };
    BaggageImpl2.prototype.setEntry = function(key2, entry) {
      var newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.set(key2, entry);
      return newBaggage;
    };
    BaggageImpl2.prototype.removeEntry = function(key2) {
      var newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.delete(key2);
      return newBaggage;
    };
    BaggageImpl2.prototype.removeEntries = function() {
      var e_1, _a2;
      var keys2 = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        keys2[_i] = arguments[_i];
      }
      var newBaggage = new BaggageImpl2(this._entries);
      try {
        for (var keys_1 = __values(keys2), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
          var key2 = keys_1_1.value;
          newBaggage._entries.delete(key2);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (keys_1_1 && !keys_1_1.done && (_a2 = keys_1.return)) _a2.call(keys_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      return newBaggage;
    };
    BaggageImpl2.prototype.clear = function() {
      return new BaggageImpl2();
    };
    return BaggageImpl2;
  })()
);
DiagAPI.instance();
function createBaggage(entries2) {
  if (entries2 === void 0) {
    entries2 = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries2)));
}
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext = (
  /** @class */
  /* @__PURE__ */ (function() {
    function BaseContext2(parentContext) {
      var self2 = this;
      self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self2.getValue = function(key2) {
        return self2._currentContext.get(key2);
      };
      self2.setValue = function(key2, value) {
        var context2 = new BaseContext2(self2._currentContext);
        context2._currentContext.set(key2, value);
        return context2;
      };
      self2.deleteValue = function(key2) {
        var context2 = new BaseContext2(self2._currentContext);
        context2._currentContext.delete(key2);
        return context2;
      };
    }
    return BaseContext2;
  })()
);
var ROOT_CONTEXT = new BaseContext();
var __extends = /* @__PURE__ */ (function() {
  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
      d2.__proto__ = b2;
    } || function(d2, b2) {
      for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
    };
    return extendStatics(d, b);
  };
  return function(d, b) {
    if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();
var NoopMeter = (
  /** @class */
  (function() {
    function NoopMeter2() {
    }
    NoopMeter2.prototype.createGauge = function(_name, _options) {
      return NOOP_GAUGE_METRIC;
    };
    NoopMeter2.prototype.createHistogram = function(_name, _options) {
      return NOOP_HISTOGRAM_METRIC;
    };
    NoopMeter2.prototype.createCounter = function(_name, _options) {
      return NOOP_COUNTER_METRIC;
    };
    NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
      return NOOP_UP_DOWN_COUNTER_METRIC;
    };
    NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
      return NOOP_OBSERVABLE_GAUGE_METRIC;
    };
    NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
      return NOOP_OBSERVABLE_COUNTER_METRIC;
    };
    NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
      return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    };
    NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
    };
    NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
    };
    return NoopMeter2;
  })()
);
var NoopMetric = (
  /** @class */
  /* @__PURE__ */ (function() {
    function NoopMetric2() {
    }
    return NoopMetric2;
  })()
);
var NoopCounterMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopCounterMetric2, _super);
    function NoopCounterMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopCounterMetric2.prototype.add = function(_value, _attributes) {
    };
    return NoopCounterMetric2;
  })(NoopMetric)
);
var NoopUpDownCounterMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopUpDownCounterMetric2, _super);
    function NoopUpDownCounterMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
    };
    return NoopUpDownCounterMetric2;
  })(NoopMetric)
);
var NoopGaugeMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopGaugeMetric2, _super);
    function NoopGaugeMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
    };
    return NoopGaugeMetric2;
  })(NoopMetric)
);
var NoopHistogramMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopHistogramMetric2, _super);
    function NoopHistogramMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
    };
    return NoopHistogramMetric2;
  })(NoopMetric)
);
var NoopObservableMetric = (
  /** @class */
  (function() {
    function NoopObservableMetric2() {
    }
    NoopObservableMetric2.prototype.addCallback = function(_callback) {
    };
    NoopObservableMetric2.prototype.removeCallback = function(_callback) {
    };
    return NoopObservableMetric2;
  })()
);
var NoopObservableCounterMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopObservableCounterMetric2, _super);
    function NoopObservableCounterMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableCounterMetric2;
  })(NoopObservableMetric)
);
var NoopObservableGaugeMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopObservableGaugeMetric2, _super);
    function NoopObservableGaugeMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableGaugeMetric2;
  })(NoopObservableMetric)
);
var NoopObservableUpDownCounterMetric = (
  /** @class */
  (function(_super) {
    __extends(NoopObservableUpDownCounterMetric2, _super);
    function NoopObservableUpDownCounterMetric2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    return NoopObservableUpDownCounterMetric2;
  })(NoopObservableMetric)
);
var NOOP_METER = new NoopMeter();
var NOOP_COUNTER_METRIC = new NoopCounterMetric();
var NOOP_GAUGE_METRIC = new NoopGaugeMetric();
var NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
var NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
var NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
var NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
var NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
var defaultTextMapGetter = {
  get: function(carrier, key2) {
    if (carrier == null) {
      return void 0;
    }
    return carrier[key2];
  },
  keys: function(carrier) {
    if (carrier == null) {
      return [];
    }
    return Object.keys(carrier);
  }
};
var defaultTextMapSetter = {
  set: function(carrier, key2, value) {
    if (carrier == null) {
      return;
    }
    carrier[key2] = value;
  }
};
var __read$1 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error2) {
    e = { error: error2 };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray$1 = function(to2, from2, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
    if (ar || !(i in from2)) {
      if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
      ar[i] = from2[i];
    }
  }
  return to2.concat(ar || Array.prototype.slice.call(from2));
};
var NoopContextManager = (
  /** @class */
  (function() {
    function NoopContextManager2() {
    }
    NoopContextManager2.prototype.active = function() {
      return ROOT_CONTEXT;
    };
    NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return fn.call.apply(fn, __spreadArray$1([thisArg], __read$1(args), false));
    };
    NoopContextManager2.prototype.bind = function(_context, target) {
      return target;
    };
    NoopContextManager2.prototype.enable = function() {
      return this;
    };
    NoopContextManager2.prototype.disable = function() {
      return this;
    };
    return NoopContextManager2;
  })()
);
var __read = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error2) {
    e = { error: error2 };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray = function(to2, from2, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
    if (ar || !(i in from2)) {
      if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
      ar[i] = from2[i];
    }
  }
  return to2.concat(ar || Array.prototype.slice.call(from2));
};
var API_NAME$3 = "context";
var NOOP_CONTEXT_MANAGER = new NoopContextManager();
var ContextAPI = (
  /** @class */
  (function() {
    function ContextAPI2() {
    }
    ContextAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new ContextAPI2();
      }
      return this._instance;
    };
    ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
      return registerGlobal(API_NAME$3, contextManager, DiagAPI.instance());
    };
    ContextAPI2.prototype.active = function() {
      return this._getContextManager().active();
    };
    ContextAPI2.prototype.with = function(context2, fn, thisArg) {
      var _a2;
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return (_a2 = this._getContextManager()).with.apply(_a2, __spreadArray([context2, fn, thisArg], __read(args), false));
    };
    ContextAPI2.prototype.bind = function(context2, target) {
      return this._getContextManager().bind(context2, target);
    };
    ContextAPI2.prototype._getContextManager = function() {
      return getGlobal(API_NAME$3) || NOOP_CONTEXT_MANAGER;
    };
    ContextAPI2.prototype.disable = function() {
      this._getContextManager().disable();
      unregisterGlobal(API_NAME$3, DiagAPI.instance());
    };
    return ContextAPI2;
  })()
);
var TraceFlags;
(function(TraceFlags2) {
  TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
  TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
})(TraceFlags || (TraceFlags = {}));
var INVALID_SPANID = "0000000000000000";
var INVALID_TRACEID = "00000000000000000000000000000000";
var INVALID_SPAN_CONTEXT = {
  traceId: INVALID_TRACEID,
  spanId: INVALID_SPANID,
  traceFlags: TraceFlags.NONE
};
var NonRecordingSpan = (
  /** @class */
  (function() {
    function NonRecordingSpan2(_spanContext) {
      if (_spanContext === void 0) {
        _spanContext = INVALID_SPAN_CONTEXT;
      }
      this._spanContext = _spanContext;
    }
    NonRecordingSpan2.prototype.spanContext = function() {
      return this._spanContext;
    };
    NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
      return this;
    };
    NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addLink = function(_link) {
      return this;
    };
    NonRecordingSpan2.prototype.addLinks = function(_links) {
      return this;
    };
    NonRecordingSpan2.prototype.setStatus = function(_status) {
      return this;
    };
    NonRecordingSpan2.prototype.updateName = function(_name) {
      return this;
    };
    NonRecordingSpan2.prototype.end = function(_endTime) {
    };
    NonRecordingSpan2.prototype.isRecording = function() {
      return false;
    };
    NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
    };
    return NonRecordingSpan2;
  })()
);
var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a2;
  return (_a2 = getSpan(context2)) === null || _a2 === void 0 ? void 0 : _a2.spanContext();
}
var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var contextApi = ContextAPI.getInstance();
var NoopTracer = (
  /** @class */
  (function() {
    function NoopTracer2() {
    }
    NoopTracer2.prototype.startSpan = function(name2, options, context2) {
      if (context2 === void 0) {
        context2 = contextApi.active();
      }
      var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan();
      }
      var parentFromContext = context2 && getSpanContext(context2);
      if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
        return new NonRecordingSpan(parentFromContext);
      } else {
        return new NonRecordingSpan();
      }
    };
    NoopTracer2.prototype.startActiveSpan = function(name2, arg2, arg3, arg4) {
      var opts;
      var ctx;
      var fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
      var span = this.startSpan(name2, opts, parentContext);
      var contextWithSpanSet = setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, void 0, span);
    };
    return NoopTracer2;
  })()
);
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var NOOP_TRACER = new NoopTracer();
var ProxyTracer = (
  /** @class */
  (function() {
    function ProxyTracer2(_provider, name2, version2, options) {
      this._provider = _provider;
      this.name = name2;
      this.version = version2;
      this.options = options;
    }
    ProxyTracer2.prototype.startSpan = function(name2, options, context2) {
      return this._getTracer().startSpan(name2, options, context2);
    };
    ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
      var tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    };
    ProxyTracer2.prototype._getTracer = function() {
      if (this._delegate) {
        return this._delegate;
      }
      var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) {
        return NOOP_TRACER;
      }
      this._delegate = tracer;
      return this._delegate;
    };
    return ProxyTracer2;
  })()
);
var NoopTracerProvider = (
  /** @class */
  (function() {
    function NoopTracerProvider2() {
    }
    NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
      return new NoopTracer();
    };
    return NoopTracerProvider2;
  })()
);
var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
var ProxyTracerProvider = (
  /** @class */
  (function() {
    function ProxyTracerProvider2() {
    }
    ProxyTracerProvider2.prototype.getTracer = function(name2, version2, options) {
      var _a2;
      return (_a2 = this.getDelegateTracer(name2, version2, options)) !== null && _a2 !== void 0 ? _a2 : new ProxyTracer(this, name2, version2, options);
    };
    ProxyTracerProvider2.prototype.getDelegate = function() {
      var _a2;
      return (_a2 = this._delegate) !== null && _a2 !== void 0 ? _a2 : NOOP_TRACER_PROVIDER;
    };
    ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
      this._delegate = delegate;
    };
    ProxyTracerProvider2.prototype.getDelegateTracer = function(name2, version2, options) {
      var _a2;
      return (_a2 = this._delegate) === null || _a2 === void 0 ? void 0 : _a2.getTracer(name2, version2, options);
    };
    return ProxyTracerProvider2;
  })()
);
var SpanStatusCode;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));
var context = ContextAPI.getInstance();
DiagAPI.instance();
var NoopMeterProvider = (
  /** @class */
  (function() {
    function NoopMeterProvider2() {
    }
    NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
      return NOOP_METER;
    };
    return NoopMeterProvider2;
  })()
);
var NOOP_METER_PROVIDER = new NoopMeterProvider();
var API_NAME$2 = "metrics";
var MetricsAPI = (
  /** @class */
  (function() {
    function MetricsAPI2() {
    }
    MetricsAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new MetricsAPI2();
      }
      return this._instance;
    };
    MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
      return registerGlobal(API_NAME$2, provider, DiagAPI.instance());
    };
    MetricsAPI2.prototype.getMeterProvider = function() {
      return getGlobal(API_NAME$2) || NOOP_METER_PROVIDER;
    };
    MetricsAPI2.prototype.getMeter = function(name2, version2, options) {
      return this.getMeterProvider().getMeter(name2, version2, options);
    };
    MetricsAPI2.prototype.disable = function() {
      unregisterGlobal(API_NAME$2, DiagAPI.instance());
    };
    return MetricsAPI2;
  })()
);
MetricsAPI.getInstance();
var NoopTextMapPropagator = (
  /** @class */
  (function() {
    function NoopTextMapPropagator2() {
    }
    NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
    };
    NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
      return context2;
    };
    NoopTextMapPropagator2.prototype.fields = function() {
      return [];
    };
    return NoopTextMapPropagator2;
  })()
);
var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var API_NAME$1 = "propagation";
var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
var PropagationAPI = (
  /** @class */
  (function() {
    function PropagationAPI2() {
      this.createBaggage = createBaggage;
      this.getBaggage = getBaggage;
      this.getActiveBaggage = getActiveBaggage;
      this.setBaggage = setBaggage;
      this.deleteBaggage = deleteBaggage;
    }
    PropagationAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new PropagationAPI2();
      }
      return this._instance;
    };
    PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
      return registerGlobal(API_NAME$1, propagator, DiagAPI.instance());
    };
    PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
      if (setter === void 0) {
        setter = defaultTextMapSetter;
      }
      return this._getGlobalPropagator().inject(context2, carrier, setter);
    };
    PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
      if (getter === void 0) {
        getter = defaultTextMapGetter;
      }
      return this._getGlobalPropagator().extract(context2, carrier, getter);
    };
    PropagationAPI2.prototype.fields = function() {
      return this._getGlobalPropagator().fields();
    };
    PropagationAPI2.prototype.disable = function() {
      unregisterGlobal(API_NAME$1, DiagAPI.instance());
    };
    PropagationAPI2.prototype._getGlobalPropagator = function() {
      return getGlobal(API_NAME$1) || NOOP_TEXT_MAP_PROPAGATOR;
    };
    return PropagationAPI2;
  })()
);
PropagationAPI.getInstance();
var API_NAME = "trace";
var TraceAPI = (
  /** @class */
  (function() {
    function TraceAPI2() {
      this._proxyTracerProvider = new ProxyTracerProvider();
      this.wrapSpanContext = wrapSpanContext;
      this.isSpanContextValid = isSpanContextValid;
      this.deleteSpan = deleteSpan;
      this.getSpan = getSpan;
      this.getActiveSpan = getActiveSpan;
      this.getSpanContext = getSpanContext;
      this.setSpan = setSpan;
      this.setSpanContext = setSpanContext;
    }
    TraceAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new TraceAPI2();
      }
      return this._instance;
    };
    TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
      var success = registerGlobal(API_NAME, this._proxyTracerProvider, DiagAPI.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    };
    TraceAPI2.prototype.getTracerProvider = function() {
      return getGlobal(API_NAME) || this._proxyTracerProvider;
    };
    TraceAPI2.prototype.getTracer = function(name2, version2) {
      return this.getTracerProvider().getTracer(name2, version2);
    };
    TraceAPI2.prototype.disable = function() {
      unregisterGlobal(API_NAME, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    };
    return TraceAPI2;
  })()
);
var trace = TraceAPI.getInstance();
function resolveUrl(url, baseUrl) {
  if (url.match(/^[a-z]+:\/\//i)) {
    return url;
  }
  if (url.match(/^\/\//)) {
    return window.location.protocol + url;
  }
  if (url.match(/^[a-z]+:/i)) {
    return url;
  }
  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  const a = doc.createElement("a");
  doc.head.appendChild(base);
  doc.body.appendChild(a);
  if (baseUrl) {
    base.href = baseUrl;
  }
  a.href = url;
  return a.href;
}
const uuid = /* @__PURE__ */ (() => {
  let counter = 0;
  const random2 = () => (
    // eslint-disable-next-line no-bitwise
    `0000${(Math.random() * 36 ** 4 << 0).toString(36)}`.slice(-4)
  );
  return () => {
    counter += 1;
    return `u${random2()}${counter}`;
  };
})();
function toArray(arrayLike) {
  const arr = [];
  for (let i = 0, l = arrayLike.length; i < l; i++) {
    arr.push(arrayLike[i]);
  }
  return arr;
}
function px(node, styleProperty) {
  const win = node.ownerDocument.defaultView || window;
  const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
  return val ? parseFloat(val.replace("px", "")) : 0;
}
function getNodeWidth(node) {
  const leftBorder = px(node, "border-left-width");
  const rightBorder = px(node, "border-right-width");
  return node.clientWidth + leftBorder + rightBorder;
}
function getNodeHeight(node) {
  const topBorder = px(node, "border-top-width");
  const bottomBorder = px(node, "border-bottom-width");
  return node.clientHeight + topBorder + bottomBorder;
}
function getImageSize(targetNode, options = {}) {
  const width = options.width || getNodeWidth(targetNode);
  const height = options.height || getNodeHeight(targetNode);
  return { width, height };
}
function getPixelRatio() {
  let ratio;
  let FINAL_PROCESS;
  try {
    FINAL_PROCESS = process;
  } catch (e) {
  }
  const val = FINAL_PROCESS && FINAL_PROCESS.env ? FINAL_PROCESS.env.devicePixelRatio : null;
  if (val) {
    ratio = parseInt(val, 10);
    if (Number.isNaN(ratio)) {
      ratio = 1;
    }
  }
  return ratio || window.devicePixelRatio || 1;
}
const canvasDimensionLimit = 16384;
function checkCanvasDimensions(canvas) {
  if (canvas.width > canvasDimensionLimit || canvas.height > canvasDimensionLimit) {
    if (canvas.width > canvasDimensionLimit && canvas.height > canvasDimensionLimit) {
      if (canvas.width > canvas.height) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    } else if (canvas.width > canvasDimensionLimit) {
      canvas.height *= canvasDimensionLimit / canvas.width;
      canvas.width = canvasDimensionLimit;
    } else {
      canvas.width *= canvasDimensionLimit / canvas.height;
      canvas.height = canvasDimensionLimit;
    }
  }
}
function createImage(url) {
  return new Promise((resolve2, reject) => {
    const img = new Image();
    img.decode = () => resolve2(img);
    img.onload = () => resolve2(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
  });
}
async function svgToDataURL(svg) {
  return Promise.resolve().then(() => new XMLSerializer().serializeToString(svg)).then(encodeURIComponent).then((html) => `data:image/svg+xml;charset=utf-8,${html}`);
}
async function nodeToDataURL(node, width, height) {
  const xmlns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(xmlns, "svg");
  const foreignObject = document.createElementNS(xmlns, "foreignObject");
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("externalResourcesRequired", "true");
  svg.appendChild(foreignObject);
  foreignObject.appendChild(node);
  return svgToDataURL(svg);
}
const isInstanceOfElement = (node, instance) => {
  if (node instanceof instance)
    return true;
  const nodePrototype = Object.getPrototypeOf(node);
  if (nodePrototype === null)
    return false;
  return nodePrototype.constructor.name === instance.name || isInstanceOfElement(nodePrototype, instance);
};
function formatCSSText(style) {
  const content = style.getPropertyValue("content");
  return `${style.cssText} content: '${content.replace(/'|"/g, "")}';`;
}
function formatCSSProperties(style) {
  return toArray(style).map((name2) => {
    const value = style.getPropertyValue(name2);
    const priority = style.getPropertyPriority(name2);
    return `${name2}: ${value}${priority ? " !important" : ""};`;
  }).join(" ");
}
function getPseudoElementStyle(className, pseudo, style) {
  const selector = `.${className}:${pseudo}`;
  const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style);
  return document.createTextNode(`${selector}{${cssText}}`);
}
function clonePseudoElement(nativeNode, clonedNode, pseudo) {
  const style = window.getComputedStyle(nativeNode, pseudo);
  const content = style.getPropertyValue("content");
  if (content === "" || content === "none") {
    return;
  }
  const className = uuid();
  try {
    clonedNode.className = `${clonedNode.className} ${className}`;
  } catch (err) {
    return;
  }
  const styleElement = document.createElement("style");
  styleElement.appendChild(getPseudoElementStyle(className, pseudo, style));
  clonedNode.appendChild(styleElement);
}
function clonePseudoElements(nativeNode, clonedNode) {
  clonePseudoElement(nativeNode, clonedNode, ":before");
  clonePseudoElement(nativeNode, clonedNode, ":after");
}
const WOFF = "application/font-woff";
const JPEG = "image/jpeg";
const mimes = {
  woff: WOFF,
  woff2: WOFF,
  ttf: "application/font-truetype",
  eot: "application/vnd.ms-fontobject",
  png: "image/png",
  jpg: JPEG,
  jpeg: JPEG,
  gif: "image/gif",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  webp: "image/webp"
};
function getExtension(url) {
  const match2 = /\.([^./]*?)$/g.exec(url);
  return match2 ? match2[1] : "";
}
function getMimeType(url) {
  const extension = getExtension(url).toLowerCase();
  return mimes[extension] || "";
}
function getContentFromDataUrl(dataURL) {
  return dataURL.split(/,/)[1];
}
function isDataUrl(url) {
  return url.search(/^(data:)/) !== -1;
}
function makeDataUrl(content, mimeType) {
  return `data:${mimeType};base64,${content}`;
}
async function fetchAsDataURL(url, init, process2) {
  const res = await fetch(url, init);
  if (res.status === 404) {
    throw new Error(`Resource "${res.url}" not found`);
  }
  const blob = await res.blob();
  return new Promise((resolve2, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      try {
        resolve2(process2({ res, result: reader.result }));
      } catch (error2) {
        reject(error2);
      }
    };
    reader.readAsDataURL(blob);
  });
}
const cache = {};
function getCacheKey(url, contentType, includeQueryParams) {
  let key2 = url.replace(/\?.*/, "");
  if (includeQueryParams) {
    key2 = url;
  }
  if (/ttf|otf|eot|woff2?/i.test(key2)) {
    key2 = key2.replace(/.*\//, "");
  }
  return contentType ? `[${contentType}]${key2}` : key2;
}
async function resourceToDataURL(resourceUrl, contentType, options) {
  const cacheKey = getCacheKey(resourceUrl, contentType, options.includeQueryParams);
  if (cache[cacheKey] != null) {
    return cache[cacheKey];
  }
  if (options.cacheBust) {
    resourceUrl += (/\?/.test(resourceUrl) ? "&" : "?") + (/* @__PURE__ */ new Date()).getTime();
  }
  let dataURL;
  try {
    const content = await fetchAsDataURL(resourceUrl, options.fetchRequestInit, ({ res, result }) => {
      if (!contentType) {
        contentType = res.headers.get("Content-Type") || "";
      }
      return getContentFromDataUrl(result);
    });
    dataURL = makeDataUrl(content, contentType);
  } catch (error2) {
    dataURL = options.imagePlaceholder || "";
    let msg = `Failed to fetch resource: ${resourceUrl}`;
    if (error2) {
      msg = typeof error2 === "string" ? error2 : error2.message;
    }
    if (msg) {
      console.warn(msg);
    }
  }
  cache[cacheKey] = dataURL;
  return dataURL;
}
async function cloneCanvasElement(canvas) {
  const dataURL = canvas.toDataURL();
  if (dataURL === "data:,") {
    return canvas.cloneNode(false);
  }
  return createImage(dataURL);
}
async function cloneVideoElement(video, options) {
  if (video.currentSrc) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL2 = canvas.toDataURL();
    return createImage(dataURL2);
  }
  const poster = video.poster;
  const contentType = getMimeType(poster);
  const dataURL = await resourceToDataURL(poster, contentType, options);
  return createImage(dataURL);
}
async function cloneIFrameElement(iframe) {
  var _a2;
  try {
    if ((_a2 = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument) === null || _a2 === void 0 ? void 0 : _a2.body) {
      return await cloneNode(iframe.contentDocument.body, {}, true);
    }
  } catch (_b) {
  }
  return iframe.cloneNode(false);
}
async function cloneSingleNode(node, options) {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node);
  }
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options);
  }
  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node);
  }
  return node.cloneNode(false);
}
const isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SLOT";
async function cloneChildren(nativeNode, clonedNode, options) {
  var _a2, _b;
  let children = [];
  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray(nativeNode.assignedNodes());
  } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && ((_a2 = nativeNode.contentDocument) === null || _a2 === void 0 ? void 0 : _a2.body)) {
    children = toArray(nativeNode.contentDocument.body.childNodes);
  } else {
    children = toArray(((_b = nativeNode.shadowRoot) !== null && _b !== void 0 ? _b : nativeNode).childNodes);
  }
  if (children.length === 0 || isInstanceOfElement(nativeNode, HTMLVideoElement)) {
    return clonedNode;
  }
  await children.reduce((deferred, child) => deferred.then(() => cloneNode(child, options)).then((clonedChild) => {
    if (clonedChild) {
      clonedNode.appendChild(clonedChild);
    }
  }), Promise.resolve());
  return clonedNode;
}
function cloneCSSStyle(nativeNode, clonedNode) {
  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }
  const sourceStyle = window.getComputedStyle(nativeNode);
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText;
    targetStyle.transformOrigin = sourceStyle.transformOrigin;
  } else {
    toArray(sourceStyle).forEach((name2) => {
      let value = sourceStyle.getPropertyValue(name2);
      if (name2 === "font-size" && value.endsWith("px")) {
        const reducedFont = Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1;
        value = `${reducedFont}px`;
      }
      if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && name2 === "display" && value === "inline") {
        value = "block";
      }
      if (name2 === "d" && clonedNode.getAttribute("d")) {
        value = `path(${clonedNode.getAttribute("d")})`;
      }
      targetStyle.setProperty(name2, value, sourceStyle.getPropertyPriority(name2));
    });
  }
}
function cloneInputValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.innerHTML = nativeNode.value;
  }
  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute("value", nativeNode.value);
  }
}
function cloneSelectValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
    const clonedSelect = clonedNode;
    const selectedOption = Array.from(clonedSelect.children).find((child) => nativeNode.value === child.getAttribute("value"));
    if (selectedOption) {
      selectedOption.setAttribute("selected", "");
    }
  }
}
function decorate(nativeNode, clonedNode) {
  if (isInstanceOfElement(clonedNode, Element)) {
    cloneCSSStyle(nativeNode, clonedNode);
    clonePseudoElements(nativeNode, clonedNode);
    cloneInputValue(nativeNode, clonedNode);
    cloneSelectValue(nativeNode, clonedNode);
  }
  return clonedNode;
}
async function ensureSVGSymbols(clone2, options) {
  const uses = clone2.querySelectorAll ? clone2.querySelectorAll("use") : [];
  if (uses.length === 0) {
    return clone2;
  }
  const processedDefs = {};
  for (let i = 0; i < uses.length; i++) {
    const use = uses[i];
    const id = use.getAttribute("xlink:href");
    if (id) {
      const exist = clone2.querySelector(id);
      const definition = document.querySelector(id);
      if (!exist && definition && !processedDefs[id]) {
        processedDefs[id] = await cloneNode(definition, options, true);
      }
    }
  }
  const nodes = Object.values(processedDefs);
  if (nodes.length) {
    const ns = "http://www.w3.org/1999/xhtml";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("xmlns", ns);
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.display = "none";
    const defs = document.createElementNS(ns, "defs");
    svg.appendChild(defs);
    for (let i = 0; i < nodes.length; i++) {
      defs.appendChild(nodes[i]);
    }
    clone2.appendChild(svg);
  }
  return clone2;
}
async function cloneNode(node, options, isRoot) {
  if (!isRoot && options.filter && !options.filter(node)) {
    return null;
  }
  return Promise.resolve(node).then((clonedNode) => cloneSingleNode(clonedNode, options)).then((clonedNode) => cloneChildren(node, clonedNode, options)).then((clonedNode) => decorate(node, clonedNode)).then((clonedNode) => ensureSVGSymbols(clonedNode, options));
}
const URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
const URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
const FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
function toRegex(url) {
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
}
function parseURLs(cssText) {
  const urls = [];
  cssText.replace(URL_REGEX, (raw, quotation, url) => {
    urls.push(url);
    return raw;
  });
  return urls.filter((url) => !isDataUrl(url));
}
async function embed(cssText, resourceURL, baseURL, options, getContentFromUrl) {
  try {
    const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
    const contentType = getMimeType(resourceURL);
    let dataURL;
    if (getContentFromUrl) ;
    else {
      dataURL = await resourceToDataURL(resolvedURL, contentType, options);
    }
    return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
  } catch (error2) {
  }
  return cssText;
}
function filterPreferredFontFormat(str, { preferredFontFormat }) {
  return !preferredFontFormat ? str : str.replace(FONT_SRC_REGEX, (match2) => {
    while (true) {
      const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match2) || [];
      if (!format) {
        return "";
      }
      if (format === preferredFontFormat) {
        return `src: ${src};`;
      }
    }
  });
}
function shouldEmbed(url) {
  return url.search(URL_REGEX) !== -1;
}
async function embedResources(cssText, baseUrl, options) {
  if (!shouldEmbed(cssText)) {
    return cssText;
  }
  const filteredCSSText = filterPreferredFontFormat(cssText, options);
  const urls = parseURLs(filteredCSSText);
  return urls.reduce((deferred, url) => deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText));
}
async function embedProp(propName, node, options) {
  var _a2;
  const propValue = (_a2 = node.style) === null || _a2 === void 0 ? void 0 : _a2.getPropertyValue(propName);
  if (propValue) {
    const cssString = await embedResources(propValue, null, options);
    node.style.setProperty(propName, cssString, node.style.getPropertyPriority(propName));
    return true;
  }
  return false;
}
async function embedBackground(clonedNode, options) {
  if (!await embedProp("background", clonedNode, options)) {
    await embedProp("background-image", clonedNode, options);
  }
  if (!await embedProp("mask", clonedNode, options)) {
    await embedProp("mask-image", clonedNode, options);
  }
}
async function embedImageNode(clonedNode, options) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
  if (!(isImageElement && !isDataUrl(clonedNode.src)) && !(isInstanceOfElement(clonedNode, SVGImageElement) && !isDataUrl(clonedNode.href.baseVal))) {
    return;
  }
  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
  const dataURL = await resourceToDataURL(url, getMimeType(url), options);
  await new Promise((resolve2, reject) => {
    clonedNode.onload = resolve2;
    clonedNode.onerror = reject;
    const image = clonedNode;
    if (image.decode) {
      image.decode = resolve2;
    }
    if (image.loading === "lazy") {
      image.loading = "eager";
    }
    if (isImageElement) {
      clonedNode.srcset = "";
      clonedNode.src = dataURL;
    } else {
      clonedNode.href.baseVal = dataURL;
    }
  });
}
async function embedChildren(clonedNode, options) {
  const children = toArray(clonedNode.childNodes);
  const deferreds = children.map((child) => embedImages(child, options));
  await Promise.all(deferreds).then(() => clonedNode);
}
async function embedImages(clonedNode, options) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode, options);
    await embedImageNode(clonedNode, options);
    await embedChildren(clonedNode, options);
  }
}
function applyStyle(node, options) {
  const { style } = node;
  if (options.backgroundColor) {
    style.backgroundColor = options.backgroundColor;
  }
  if (options.width) {
    style.width = `${options.width}px`;
  }
  if (options.height) {
    style.height = `${options.height}px`;
  }
  const manual = options.style;
  if (manual != null) {
    Object.keys(manual).forEach((key2) => {
      style[key2] = manual[key2];
    });
  }
  return node;
}
const cssFetchCache = {};
async function fetchCSS(url) {
  let cache2 = cssFetchCache[url];
  if (cache2 != null) {
    return cache2;
  }
  const res = await fetch(url);
  const cssText = await res.text();
  cache2 = { url, cssText };
  cssFetchCache[url] = cache2;
  return cache2;
}
async function embedFonts(data2, options) {
  let cssText = data2.cssText;
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
  const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
  const loadFonts = fontLocs.map(async (loc) => {
    let url = loc.replace(regexUrl, "$1");
    if (!url.startsWith("https://")) {
      url = new URL(url, data2.url).href;
    }
    return fetchAsDataURL(url, options.fetchRequestInit, ({ result }) => {
      cssText = cssText.replace(loc, `url(${result})`);
      return [loc, result];
    });
  });
  return Promise.all(loadFonts).then(() => cssText);
}
function parseCSS(source2) {
  if (source2 == null) {
    return [];
  }
  const result = [];
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
  let cssText = source2.replace(commentsRegex, "");
  const keyframesRegex = new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})", "gi");
  while (true) {
    const matches = keyframesRegex.exec(cssText);
    if (matches === null) {
      break;
    }
    result.push(matches[0]);
  }
  cssText = cssText.replace(keyframesRegex, "");
  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
  const combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
  const unifiedRegex = new RegExp(combinedCSSRegex, "gi");
  while (true) {
    let matches = importRegex.exec(cssText);
    if (matches === null) {
      matches = unifiedRegex.exec(cssText);
      if (matches === null) {
        break;
      } else {
        importRegex.lastIndex = unifiedRegex.lastIndex;
      }
    } else {
      unifiedRegex.lastIndex = importRegex.lastIndex;
    }
    result.push(matches[0]);
  }
  return result;
}
async function getCSSRules(styleSheets, options) {
  const ret = [];
  const deferreds = [];
  styleSheets.forEach((sheet) => {
    if ("cssRules" in sheet) {
      try {
        toArray(sheet.cssRules || []).forEach((item, index2) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            let importIndex = index2 + 1;
            const url = item.href;
            const deferred = fetchCSS(url).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
              try {
                sheet.insertRule(rule, rule.startsWith("@import") ? importIndex += 1 : sheet.cssRules.length);
              } catch (error2) {
                console.error("Error inserting rule from remote css", {
                  rule,
                  error: error2
                });
              }
            })).catch((e) => {
              console.error("Error loading remote css", e.toString());
            });
            deferreds.push(deferred);
          }
        });
      } catch (e) {
        const inline = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
        if (sheet.href != null) {
          deferreds.push(fetchCSS(sheet.href).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
            inline.insertRule(rule, sheet.cssRules.length);
          })).catch((err) => {
            console.error("Error loading remote stylesheet", err);
          }));
        }
        console.error("Error inlining remote css file", e);
      }
    }
  });
  return Promise.all(deferreds).then(() => {
    styleSheets.forEach((sheet) => {
      if ("cssRules" in sheet) {
        try {
          toArray(sheet.cssRules || []).forEach((item) => {
            ret.push(item);
          });
        } catch (e) {
          console.error(`Error while reading CSS rules from ${sheet.href}`, e);
        }
      }
    });
    return ret;
  });
}
function getWebFontRules(cssRules) {
  return cssRules.filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
}
async function parseWebFontRules(node, options) {
  if (node.ownerDocument == null) {
    throw new Error("Provided element is not within a Document");
  }
  const styleSheets = toArray(node.ownerDocument.styleSheets);
  const cssRules = await getCSSRules(styleSheets, options);
  return getWebFontRules(cssRules);
}
async function getWebFontCSS(node, options) {
  const rules = await parseWebFontRules(node, options);
  const cssTexts = await Promise.all(rules.map((rule) => {
    const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null;
    return embedResources(rule.cssText, baseUrl, options);
  }));
  return cssTexts.join("\n");
}
async function embedWebFonts(clonedNode, options) {
  const cssText = options.fontEmbedCSS != null ? options.fontEmbedCSS : options.skipFonts ? null : await getWebFontCSS(clonedNode, options);
  if (cssText) {
    const styleNode = document.createElement("style");
    const sytleContent = document.createTextNode(cssText);
    styleNode.appendChild(sytleContent);
    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild);
    } else {
      clonedNode.appendChild(styleNode);
    }
  }
}
async function toSvg(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const clonedNode = await cloneNode(node, options, true);
  await embedWebFonts(clonedNode, options);
  await embedImages(clonedNode, options);
  applyStyle(clonedNode, options);
  const datauri = await nodeToDataURL(clonedNode, width, height);
  return datauri;
}
async function toCanvas(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const svg = await toSvg(node, options);
  const img = await createImage(svg);
  const canvas = document.createElement("canvas");
  const context2 = canvas.getContext("2d");
  const ratio = options.pixelRatio || getPixelRatio();
  const canvasWidth = options.canvasWidth || width;
  const canvasHeight = options.canvasHeight || height;
  canvas.width = canvasWidth * ratio;
  canvas.height = canvasHeight * ratio;
  if (!options.skipAutoScale) {
    checkCanvasDimensions(canvas);
  }
  canvas.style.width = `${canvasWidth}`;
  canvas.style.height = `${canvasHeight}`;
  if (options.backgroundColor) {
    context2.fillStyle = options.backgroundColor;
    context2.fillRect(0, 0, canvas.width, canvas.height);
  }
  context2.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
async function toPng(node, options = {}) {
  const canvas = await toCanvas(node, options);
  return canvas.toDataURL();
}
/*!
 * @kurkle/color v0.3.4
 * https://github.com/kurkle/color#readme
 * (c) 2024 Jukka Kurkela
 * Released under the MIT License
 */
function round(v) {
  return v + 0.5 | 0;
}
const lim = (v, l, h) => Math.max(Math.min(v, h), l);
function p2b(v) {
  return lim(round(v * 2.55), 0, 255);
}
function n2b(v) {
  return lim(round(v * 255), 0, 255);
}
function b2n(v) {
  return lim(round(v / 2.55) / 100, 0, 1);
}
function n2p(v) {
  return lim(round(v * 100), 0, 100);
}
const map$1 = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 };
const hex = [..."0123456789ABCDEF"];
const h1 = (b) => hex[b & 15];
const h2 = (b) => hex[(b & 240) >> 4] + hex[b & 15];
const eq = (b) => (b & 240) >> 4 === (b & 15);
const isShort = (v) => eq(v.r) && eq(v.g) && eq(v.b) && eq(v.a);
function hexParse(str) {
  var len = str.length;
  var ret;
  if (str[0] === "#") {
    if (len === 4 || len === 5) {
      ret = {
        r: 255 & map$1[str[1]] * 17,
        g: 255 & map$1[str[2]] * 17,
        b: 255 & map$1[str[3]] * 17,
        a: len === 5 ? map$1[str[4]] * 17 : 255
      };
    } else if (len === 7 || len === 9) {
      ret = {
        r: map$1[str[1]] << 4 | map$1[str[2]],
        g: map$1[str[3]] << 4 | map$1[str[4]],
        b: map$1[str[5]] << 4 | map$1[str[6]],
        a: len === 9 ? map$1[str[7]] << 4 | map$1[str[8]] : 255
      };
    }
  }
  return ret;
}
const alpha = (a, f) => a < 255 ? f(a) : "";
function hexString(v) {
  var f = isShort(v) ? h1 : h2;
  return v ? "#" + f(v.r) + f(v.g) + f(v.b) + alpha(v.a, f) : void 0;
}
const HUE_RE = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
function hsl2rgbn(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}
function hsv2rgbn(h, s, v) {
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)];
}
function hwb2rgbn(h, w, b) {
  const rgb = hsl2rgbn(h, 1, 0.5);
  let i;
  if (w + b > 1) {
    i = 1 / (w + b);
    w *= i;
    b *= i;
  }
  for (i = 0; i < 3; i++) {
    rgb[i] *= 1 - w - b;
    rgb[i] += w;
  }
  return rgb;
}
function hueValue(r, g, b, d, max2) {
  if (r === max2) {
    return (g - b) / d + (g < b ? 6 : 0);
  }
  if (g === max2) {
    return (b - r) / d + 2;
  }
  return (r - g) / d + 4;
}
function rgb2hsl(v) {
  const range = 255;
  const r = v.r / range;
  const g = v.g / range;
  const b = v.b / range;
  const max2 = Math.max(r, g, b);
  const min2 = Math.min(r, g, b);
  const l = (max2 + min2) / 2;
  let h, s, d;
  if (max2 !== min2) {
    d = max2 - min2;
    s = l > 0.5 ? d / (2 - max2 - min2) : d / (max2 + min2);
    h = hueValue(r, g, b, d, max2);
    h = h * 60 + 0.5;
  }
  return [h | 0, s || 0, l];
}
function calln(f, a, b, c) {
  return (Array.isArray(a) ? f(a[0], a[1], a[2]) : f(a, b, c)).map(n2b);
}
function hsl2rgb(h, s, l) {
  return calln(hsl2rgbn, h, s, l);
}
function hwb2rgb(h, w, b) {
  return calln(hwb2rgbn, h, w, b);
}
function hsv2rgb(h, s, v) {
  return calln(hsv2rgbn, h, s, v);
}
function hue(h) {
  return (h % 360 + 360) % 360;
}
function hueParse(str) {
  const m = HUE_RE.exec(str);
  let a = 255;
  let v;
  if (!m) {
    return;
  }
  if (m[5] !== v) {
    a = m[6] ? p2b(+m[5]) : n2b(+m[5]);
  }
  const h = hue(+m[2]);
  const p1 = +m[3] / 100;
  const p2 = +m[4] / 100;
  if (m[1] === "hwb") {
    v = hwb2rgb(h, p1, p2);
  } else if (m[1] === "hsv") {
    v = hsv2rgb(h, p1, p2);
  } else {
    v = hsl2rgb(h, p1, p2);
  }
  return {
    r: v[0],
    g: v[1],
    b: v[2],
    a
  };
}
function rotate(v, deg) {
  var h = rgb2hsl(v);
  h[0] = hue(h[0] + deg);
  h = hsl2rgb(h);
  v.r = h[0];
  v.g = h[1];
  v.b = h[2];
}
function hslString(v) {
  if (!v) {
    return;
  }
  const a = rgb2hsl(v);
  const h = a[0];
  const s = n2p(a[1]);
  const l = n2p(a[2]);
  return v.a < 255 ? `hsla(${h}, ${s}%, ${l}%, ${b2n(v.a)})` : `hsl(${h}, ${s}%, ${l}%)`;
}
const map = {
  x: "dark",
  Z: "light",
  Y: "re",
  X: "blu",
  W: "gr",
  V: "medium",
  U: "slate",
  A: "ee",
  T: "ol",
  S: "or",
  B: "ra",
  C: "lateg",
  D: "ights",
  R: "in",
  Q: "turquois",
  E: "hi",
  P: "ro",
  O: "al",
  N: "le",
  M: "de",
  L: "yello",
  F: "en",
  K: "ch",
  G: "arks",
  H: "ea",
  I: "ightg",
  J: "wh"
};
const names$1 = {
  OiceXe: "f0f8ff",
  antiquewEte: "faebd7",
  aqua: "ffff",
  aquamarRe: "7fffd4",
  azuY: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "0",
  blanKedOmond: "ffebcd",
  Xe: "ff",
  XeviTet: "8a2be2",
  bPwn: "a52a2a",
  burlywood: "deb887",
  caMtXe: "5f9ea0",
  KartYuse: "7fff00",
  KocTate: "d2691e",
  cSO: "ff7f50",
  cSnflowerXe: "6495ed",
  cSnsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "ffff",
  xXe: "8b",
  xcyan: "8b8b",
  xgTMnPd: "b8860b",
  xWay: "a9a9a9",
  xgYF: "6400",
  xgYy: "a9a9a9",
  xkhaki: "bdb76b",
  xmagFta: "8b008b",
  xTivegYF: "556b2f",
  xSange: "ff8c00",
  xScEd: "9932cc",
  xYd: "8b0000",
  xsOmon: "e9967a",
  xsHgYF: "8fbc8f",
  xUXe: "483d8b",
  xUWay: "2f4f4f",
  xUgYy: "2f4f4f",
  xQe: "ced1",
  xviTet: "9400d3",
  dAppRk: "ff1493",
  dApskyXe: "bfff",
  dimWay: "696969",
  dimgYy: "696969",
  dodgerXe: "1e90ff",
  fiYbrick: "b22222",
  flSOwEte: "fffaf0",
  foYstWAn: "228b22",
  fuKsia: "ff00ff",
  gaRsbSo: "dcdcdc",
  ghostwEte: "f8f8ff",
  gTd: "ffd700",
  gTMnPd: "daa520",
  Way: "808080",
  gYF: "8000",
  gYFLw: "adff2f",
  gYy: "808080",
  honeyMw: "f0fff0",
  hotpRk: "ff69b4",
  RdianYd: "cd5c5c",
  Rdigo: "4b0082",
  ivSy: "fffff0",
  khaki: "f0e68c",
  lavFMr: "e6e6fa",
  lavFMrXsh: "fff0f5",
  lawngYF: "7cfc00",
  NmoncEffon: "fffacd",
  ZXe: "add8e6",
  ZcSO: "f08080",
  Zcyan: "e0ffff",
  ZgTMnPdLw: "fafad2",
  ZWay: "d3d3d3",
  ZgYF: "90ee90",
  ZgYy: "d3d3d3",
  ZpRk: "ffb6c1",
  ZsOmon: "ffa07a",
  ZsHgYF: "20b2aa",
  ZskyXe: "87cefa",
  ZUWay: "778899",
  ZUgYy: "778899",
  ZstAlXe: "b0c4de",
  ZLw: "ffffe0",
  lime: "ff00",
  limegYF: "32cd32",
  lRF: "faf0e6",
  magFta: "ff00ff",
  maPon: "800000",
  VaquamarRe: "66cdaa",
  VXe: "cd",
  VScEd: "ba55d3",
  VpurpN: "9370db",
  VsHgYF: "3cb371",
  VUXe: "7b68ee",
  VsprRggYF: "fa9a",
  VQe: "48d1cc",
  VviTetYd: "c71585",
  midnightXe: "191970",
  mRtcYam: "f5fffa",
  mistyPse: "ffe4e1",
  moccasR: "ffe4b5",
  navajowEte: "ffdead",
  navy: "80",
  Tdlace: "fdf5e6",
  Tive: "808000",
  TivedBb: "6b8e23",
  Sange: "ffa500",
  SangeYd: "ff4500",
  ScEd: "da70d6",
  pOegTMnPd: "eee8aa",
  pOegYF: "98fb98",
  pOeQe: "afeeee",
  pOeviTetYd: "db7093",
  papayawEp: "ffefd5",
  pHKpuff: "ffdab9",
  peru: "cd853f",
  pRk: "ffc0cb",
  plum: "dda0dd",
  powMrXe: "b0e0e6",
  purpN: "800080",
  YbeccapurpN: "663399",
  Yd: "ff0000",
  Psybrown: "bc8f8f",
  PyOXe: "4169e1",
  saddNbPwn: "8b4513",
  sOmon: "fa8072",
  sandybPwn: "f4a460",
  sHgYF: "2e8b57",
  sHshell: "fff5ee",
  siFna: "a0522d",
  silver: "c0c0c0",
  skyXe: "87ceeb",
  UXe: "6a5acd",
  UWay: "708090",
  UgYy: "708090",
  snow: "fffafa",
  sprRggYF: "ff7f",
  stAlXe: "4682b4",
  tan: "d2b48c",
  teO: "8080",
  tEstN: "d8bfd8",
  tomato: "ff6347",
  Qe: "40e0d0",
  viTet: "ee82ee",
  JHt: "f5deb3",
  wEte: "ffffff",
  wEtesmoke: "f5f5f5",
  Lw: "ffff00",
  LwgYF: "9acd32"
};
function unpack() {
  const unpacked = {};
  const keys2 = Object.keys(names$1);
  const tkeys = Object.keys(map);
  let i, j, k, ok, nk;
  for (i = 0; i < keys2.length; i++) {
    ok = nk = keys2[i];
    for (j = 0; j < tkeys.length; j++) {
      k = tkeys[j];
      nk = nk.replace(k, map[k]);
    }
    k = parseInt(names$1[ok], 16);
    unpacked[nk] = [k >> 16 & 255, k >> 8 & 255, k & 255];
  }
  return unpacked;
}
let names;
function nameParse(str) {
  if (!names) {
    names = unpack();
    names.transparent = [0, 0, 0, 0];
  }
  const a = names[str.toLowerCase()];
  return a && {
    r: a[0],
    g: a[1],
    b: a[2],
    a: a.length === 4 ? a[3] : 255
  };
}
const RGB_RE = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
function rgbParse(str) {
  const m = RGB_RE.exec(str);
  let a = 255;
  let r, g, b;
  if (!m) {
    return;
  }
  if (m[7] !== r) {
    const v = +m[7];
    a = m[8] ? p2b(v) : lim(v * 255, 0, 255);
  }
  r = +m[1];
  g = +m[3];
  b = +m[5];
  r = 255 & (m[2] ? p2b(r) : lim(r, 0, 255));
  g = 255 & (m[4] ? p2b(g) : lim(g, 0, 255));
  b = 255 & (m[6] ? p2b(b) : lim(b, 0, 255));
  return {
    r,
    g,
    b,
    a
  };
}
function rgbString(v) {
  return v && (v.a < 255 ? `rgba(${v.r}, ${v.g}, ${v.b}, ${b2n(v.a)})` : `rgb(${v.r}, ${v.g}, ${v.b})`);
}
const to = (v) => v <= 31308e-7 ? v * 12.92 : Math.pow(v, 1 / 2.4) * 1.055 - 0.055;
const from = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
function interpolate(rgb1, rgb2, t2) {
  const r = from(b2n(rgb1.r));
  const g = from(b2n(rgb1.g));
  const b = from(b2n(rgb1.b));
  return {
    r: n2b(to(r + t2 * (from(b2n(rgb2.r)) - r))),
    g: n2b(to(g + t2 * (from(b2n(rgb2.g)) - g))),
    b: n2b(to(b + t2 * (from(b2n(rgb2.b)) - b))),
    a: rgb1.a + t2 * (rgb2.a - rgb1.a)
  };
}
function modHSL(v, i, ratio) {
  if (v) {
    let tmp = rgb2hsl(v);
    tmp[i] = Math.max(0, Math.min(tmp[i] + tmp[i] * ratio, i === 0 ? 360 : 1));
    tmp = hsl2rgb(tmp);
    v.r = tmp[0];
    v.g = tmp[1];
    v.b = tmp[2];
  }
}
function clone(v, proto) {
  return v ? Object.assign(proto || {}, v) : v;
}
function fromObject(input) {
  var v = { r: 0, g: 0, b: 0, a: 255 };
  if (Array.isArray(input)) {
    if (input.length >= 3) {
      v = { r: input[0], g: input[1], b: input[2], a: 255 };
      if (input.length > 3) {
        v.a = n2b(input[3]);
      }
    }
  } else {
    v = clone(input, { r: 0, g: 0, b: 0, a: 1 });
    v.a = n2b(v.a);
  }
  return v;
}
function functionParse(str) {
  if (str.charAt(0) === "r") {
    return rgbParse(str);
  }
  return hueParse(str);
}
class Color {
  constructor(input) {
    if (input instanceof Color) {
      return input;
    }
    const type = typeof input;
    let v;
    if (type === "object") {
      v = fromObject(input);
    } else if (type === "string") {
      v = hexParse(input) || nameParse(input) || functionParse(input);
    }
    this._rgb = v;
    this._valid = !!v;
  }
  get valid() {
    return this._valid;
  }
  get rgb() {
    var v = clone(this._rgb);
    if (v) {
      v.a = b2n(v.a);
    }
    return v;
  }
  set rgb(obj) {
    this._rgb = fromObject(obj);
  }
  rgbString() {
    return this._valid ? rgbString(this._rgb) : void 0;
  }
  hexString() {
    return this._valid ? hexString(this._rgb) : void 0;
  }
  hslString() {
    return this._valid ? hslString(this._rgb) : void 0;
  }
  mix(color, weight) {
    if (color) {
      const c1 = this.rgb;
      const c2 = color.rgb;
      let w2;
      const p = weight === w2 ? 0.5 : weight;
      const w = 2 * p - 1;
      const a = c1.a - c2.a;
      const w1 = ((w * a === -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
      w2 = 1 - w1;
      c1.r = 255 & w1 * c1.r + w2 * c2.r + 0.5;
      c1.g = 255 & w1 * c1.g + w2 * c2.g + 0.5;
      c1.b = 255 & w1 * c1.b + w2 * c2.b + 0.5;
      c1.a = p * c1.a + (1 - p) * c2.a;
      this.rgb = c1;
    }
    return this;
  }
  interpolate(color, t2) {
    if (color) {
      this._rgb = interpolate(this._rgb, color._rgb, t2);
    }
    return this;
  }
  clone() {
    return new Color(this.rgb);
  }
  alpha(a) {
    this._rgb.a = n2b(a);
    return this;
  }
  clearer(ratio) {
    const rgb = this._rgb;
    rgb.a *= 1 - ratio;
    return this;
  }
  greyscale() {
    const rgb = this._rgb;
    const val = round(rgb.r * 0.3 + rgb.g * 0.59 + rgb.b * 0.11);
    rgb.r = rgb.g = rgb.b = val;
    return this;
  }
  opaquer(ratio) {
    const rgb = this._rgb;
    rgb.a *= 1 + ratio;
    return this;
  }
  negate() {
    const v = this._rgb;
    v.r = 255 - v.r;
    v.g = 255 - v.g;
    v.b = 255 - v.b;
    return this;
  }
  lighten(ratio) {
    modHSL(this._rgb, 2, ratio);
    return this;
  }
  darken(ratio) {
    modHSL(this._rgb, 2, -ratio);
    return this;
  }
  saturate(ratio) {
    modHSL(this._rgb, 1, ratio);
    return this;
  }
  desaturate(ratio) {
    modHSL(this._rgb, 1, -ratio);
    return this;
  }
  rotate(deg) {
    rotate(this._rgb, deg);
    return this;
  }
}
var hammer = { exports: {} };
/*! Hammer.JS - v2.0.7 - 2016-04-22
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
var hasRequiredHammer;
function requireHammer() {
  if (hasRequiredHammer) return hammer.exports;
  hasRequiredHammer = 1;
  (function(module) {
    (function(window2, document2, exportName, undefined$1) {
      var VENDOR_PREFIXES = ["", "webkit", "Moz", "MS", "ms", "o"];
      var TEST_ELEMENT = document2.createElement("div");
      var TYPE_FUNCTION = "function";
      var round2 = Math.round;
      var abs2 = Math.abs;
      var now2 = Date.now;
      function setTimeoutContext(fn, timeout, context2) {
        return setTimeout(bindFn(fn, context2), timeout);
      }
      function invokeArrayArg(arg, fn, context2) {
        if (Array.isArray(arg)) {
          each(arg, context2[fn], context2);
          return true;
        }
        return false;
      }
      function each(obj, iterator, context2) {
        var i;
        if (!obj) {
          return;
        }
        if (obj.forEach) {
          obj.forEach(iterator, context2);
        } else if (obj.length !== undefined$1) {
          i = 0;
          while (i < obj.length) {
            iterator.call(context2, obj[i], i, obj);
            i++;
          }
        } else {
          for (i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context2, obj[i], i, obj);
          }
        }
      }
      function deprecate(method, name2, message) {
        var deprecationMessage = "DEPRECATED METHOD: " + name2 + "\n" + message + " AT \n";
        return function() {
          var e = new Error("get-stack-trace");
          var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, "").replace(/^\s+at\s+/gm, "").replace(/^Object.<anonymous>\s*\(/gm, "{anonymous}()@") : "Unknown Stack Trace";
          var log3 = window2.console && (window2.console.warn || window2.console.log);
          if (log3) {
            log3.call(window2.console, deprecationMessage, stack);
          }
          return method.apply(this, arguments);
        };
      }
      var assign2;
      if (typeof Object.assign !== "function") {
        assign2 = function assign3(target) {
          if (target === undefined$1 || target === null) {
            throw new TypeError("Cannot convert undefined or null to object");
          }
          var output2 = Object(target);
          for (var index2 = 1; index2 < arguments.length; index2++) {
            var source2 = arguments[index2];
            if (source2 !== undefined$1 && source2 !== null) {
              for (var nextKey in source2) {
                if (source2.hasOwnProperty(nextKey)) {
                  output2[nextKey] = source2[nextKey];
                }
              }
            }
          }
          return output2;
        };
      } else {
        assign2 = Object.assign;
      }
      var extend3 = deprecate(function extend4(dest, src, merge3) {
        var keys2 = Object.keys(src);
        var i = 0;
        while (i < keys2.length) {
          if (!merge3 || merge3 && dest[keys2[i]] === undefined$1) {
            dest[keys2[i]] = src[keys2[i]];
          }
          i++;
        }
        return dest;
      }, "extend", "Use `assign`.");
      var merge2 = deprecate(function merge3(dest, src) {
        return extend3(dest, src, true);
      }, "merge", "Use `assign`.");
      function inherit(child, base, properties) {
        var baseP = base.prototype, childP;
        childP = child.prototype = Object.create(baseP);
        childP.constructor = child;
        childP._super = baseP;
        if (properties) {
          assign2(childP, properties);
        }
      }
      function bindFn(fn, context2) {
        return function boundFn() {
          return fn.apply(context2, arguments);
        };
      }
      function boolOrFn(val, args) {
        if (typeof val == TYPE_FUNCTION) {
          return val.apply(args ? args[0] || undefined$1 : undefined$1, args);
        }
        return val;
      }
      function ifUndefined(val1, val2) {
        return val1 === undefined$1 ? val2 : val1;
      }
      function addEventListeners(target, types2, handler) {
        each(splitStr(types2), function(type) {
          target.addEventListener(type, handler, false);
        });
      }
      function removeEventListeners(target, types2, handler) {
        each(splitStr(types2), function(type) {
          target.removeEventListener(type, handler, false);
        });
      }
      function hasParent(node, parent) {
        while (node) {
          if (node == parent) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      }
      function inStr(str, find2) {
        return str.indexOf(find2) > -1;
      }
      function splitStr(str) {
        return str.trim().split(/\s+/g);
      }
      function inArray(src, find2, findByKey) {
        if (src.indexOf && !findByKey) {
          return src.indexOf(find2);
        } else {
          var i = 0;
          while (i < src.length) {
            if (findByKey && src[i][findByKey] == find2 || !findByKey && src[i] === find2) {
              return i;
            }
            i++;
          }
          return -1;
        }
      }
      function toArray2(obj) {
        return Array.prototype.slice.call(obj, 0);
      }
      function uniqueArray(src, key2, sort) {
        var results = [];
        var values2 = [];
        var i = 0;
        while (i < src.length) {
          var val = src[i][key2];
          if (inArray(values2, val) < 0) {
            results.push(src[i]);
          }
          values2[i] = val;
          i++;
        }
        {
          {
            results = results.sort(function sortUniqueArray(a, b) {
              return a[key2] > b[key2];
            });
          }
        }
        return results;
      }
      function prefixed(obj, property) {
        var prefix, prop;
        var camelProp = property[0].toUpperCase() + property.slice(1);
        var i = 0;
        while (i < VENDOR_PREFIXES.length) {
          prefix = VENDOR_PREFIXES[i];
          prop = prefix ? prefix + camelProp : property;
          if (prop in obj) {
            return prop;
          }
          i++;
        }
        return undefined$1;
      }
      var _uniqueId = 1;
      function uniqueId() {
        return _uniqueId++;
      }
      function getWindowForElement(element) {
        var doc = element.ownerDocument || element;
        return doc.defaultView || doc.parentWindow || window2;
      }
      var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;
      var SUPPORT_TOUCH = "ontouchstart" in window2;
      var SUPPORT_POINTER_EVENTS = prefixed(window2, "PointerEvent") !== undefined$1;
      var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);
      var INPUT_TYPE_TOUCH = "touch";
      var INPUT_TYPE_PEN = "pen";
      var INPUT_TYPE_MOUSE = "mouse";
      var INPUT_TYPE_KINECT = "kinect";
      var COMPUTE_INTERVAL = 25;
      var INPUT_START = 1;
      var INPUT_MOVE = 2;
      var INPUT_END = 4;
      var INPUT_CANCEL = 8;
      var DIRECTION_NONE = 1;
      var DIRECTION_LEFT = 2;
      var DIRECTION_RIGHT = 4;
      var DIRECTION_UP = 8;
      var DIRECTION_DOWN = 16;
      var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
      var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
      var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;
      var PROPS_XY = ["x", "y"];
      var PROPS_CLIENT_XY = ["clientX", "clientY"];
      function Input(manager, callback) {
        var self2 = this;
        this.manager = manager;
        this.callback = callback;
        this.element = manager.element;
        this.target = manager.options.inputTarget;
        this.domHandler = function(ev) {
          if (boolOrFn(manager.options.enable, [manager])) {
            self2.handler(ev);
          }
        };
        this.init();
      }
      Input.prototype = {
        /**
         * should handle the inputEvent data and trigger the callback
         * @virtual
         */
        handler: function() {
        },
        /**
         * bind the events
         */
        init: function() {
          this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
          this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
          this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
        },
        /**
         * unbind the events
         */
        destroy: function() {
          this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
          this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
          this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
        }
      };
      function createInputInstance(manager) {
        var Type2;
        var inputClass = manager.options.inputClass;
        if (inputClass) {
          Type2 = inputClass;
        } else if (SUPPORT_POINTER_EVENTS) {
          Type2 = PointerEventInput;
        } else if (SUPPORT_ONLY_TOUCH) {
          Type2 = TouchInput;
        } else if (!SUPPORT_TOUCH) {
          Type2 = MouseInput;
        } else {
          Type2 = TouchMouseInput;
        }
        return new Type2(manager, inputHandler);
      }
      function inputHandler(manager, eventType, input) {
        var pointersLen = input.pointers.length;
        var changedPointersLen = input.changedPointers.length;
        var isFirst = eventType & INPUT_START && pointersLen - changedPointersLen === 0;
        var isFinal = eventType & (INPUT_END | INPUT_CANCEL) && pointersLen - changedPointersLen === 0;
        input.isFirst = !!isFirst;
        input.isFinal = !!isFinal;
        if (isFirst) {
          manager.session = {};
        }
        input.eventType = eventType;
        computeInputData(manager, input);
        manager.emit("hammer.input", input);
        manager.recognize(input);
        manager.session.prevInput = input;
      }
      function computeInputData(manager, input) {
        var session = manager.session;
        var pointers = input.pointers;
        var pointersLength = pointers.length;
        if (!session.firstInput) {
          session.firstInput = simpleCloneInputData(input);
        }
        if (pointersLength > 1 && !session.firstMultiple) {
          session.firstMultiple = simpleCloneInputData(input);
        } else if (pointersLength === 1) {
          session.firstMultiple = false;
        }
        var firstInput = session.firstInput;
        var firstMultiple = session.firstMultiple;
        var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;
        var center = input.center = getCenter(pointers);
        input.timeStamp = now2();
        input.deltaTime = input.timeStamp - firstInput.timeStamp;
        input.angle = getAngle(offsetCenter, center);
        input.distance = getDistance(offsetCenter, center);
        computeDeltaXY(session, input);
        input.offsetDirection = getDirection(input.deltaX, input.deltaY);
        var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
        input.overallVelocityX = overallVelocity.x;
        input.overallVelocityY = overallVelocity.y;
        input.overallVelocity = abs2(overallVelocity.x) > abs2(overallVelocity.y) ? overallVelocity.x : overallVelocity.y;
        input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
        input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;
        input.maxPointers = !session.prevInput ? input.pointers.length : input.pointers.length > session.prevInput.maxPointers ? input.pointers.length : session.prevInput.maxPointers;
        computeIntervalInputData(session, input);
        var target = manager.element;
        if (hasParent(input.srcEvent.target, target)) {
          target = input.srcEvent.target;
        }
        input.target = target;
      }
      function computeDeltaXY(session, input) {
        var center = input.center;
        var offset2 = session.offsetDelta || {};
        var prevDelta = session.prevDelta || {};
        var prevInput = session.prevInput || {};
        if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
          prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
          };
          offset2 = session.offsetDelta = {
            x: center.x,
            y: center.y
          };
        }
        input.deltaX = prevDelta.x + (center.x - offset2.x);
        input.deltaY = prevDelta.y + (center.y - offset2.y);
      }
      function computeIntervalInputData(session, input) {
        var last = session.lastInterval || input, deltaTime = input.timeStamp - last.timeStamp, velocity, velocityX, velocityY, direction;
        if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined$1)) {
          var deltaX = input.deltaX - last.deltaX;
          var deltaY = input.deltaY - last.deltaY;
          var v = getVelocity(deltaTime, deltaX, deltaY);
          velocityX = v.x;
          velocityY = v.y;
          velocity = abs2(v.x) > abs2(v.y) ? v.x : v.y;
          direction = getDirection(deltaX, deltaY);
          session.lastInterval = input;
        } else {
          velocity = last.velocity;
          velocityX = last.velocityX;
          velocityY = last.velocityY;
          direction = last.direction;
        }
        input.velocity = velocity;
        input.velocityX = velocityX;
        input.velocityY = velocityY;
        input.direction = direction;
      }
      function simpleCloneInputData(input) {
        var pointers = [];
        var i = 0;
        while (i < input.pointers.length) {
          pointers[i] = {
            clientX: round2(input.pointers[i].clientX),
            clientY: round2(input.pointers[i].clientY)
          };
          i++;
        }
        return {
          timeStamp: now2(),
          pointers,
          center: getCenter(pointers),
          deltaX: input.deltaX,
          deltaY: input.deltaY
        };
      }
      function getCenter(pointers) {
        var pointersLength = pointers.length;
        if (pointersLength === 1) {
          return {
            x: round2(pointers[0].clientX),
            y: round2(pointers[0].clientY)
          };
        }
        var x = 0, y = 0, i = 0;
        while (i < pointersLength) {
          x += pointers[i].clientX;
          y += pointers[i].clientY;
          i++;
        }
        return {
          x: round2(x / pointersLength),
          y: round2(y / pointersLength)
        };
      }
      function getVelocity(deltaTime, x, y) {
        return {
          x: x / deltaTime || 0,
          y: y / deltaTime || 0
        };
      }
      function getDirection(x, y) {
        if (x === y) {
          return DIRECTION_NONE;
        }
        if (abs2(x) >= abs2(y)) {
          return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
        }
        return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
      }
      function getDistance(p1, p2, props) {
        if (!props) {
          props = PROPS_XY;
        }
        var x = p2[props[0]] - p1[props[0]], y = p2[props[1]] - p1[props[1]];
        return Math.sqrt(x * x + y * y);
      }
      function getAngle(p1, p2, props) {
        if (!props) {
          props = PROPS_XY;
        }
        var x = p2[props[0]] - p1[props[0]], y = p2[props[1]] - p1[props[1]];
        return Math.atan2(y, x) * 180 / Math.PI;
      }
      function getRotation(start, end) {
        return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
      }
      function getScale(start, end) {
        return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
      }
      var MOUSE_INPUT_MAP = {
        mousedown: INPUT_START,
        mousemove: INPUT_MOVE,
        mouseup: INPUT_END
      };
      var MOUSE_ELEMENT_EVENTS = "mousedown";
      var MOUSE_WINDOW_EVENTS = "mousemove mouseup";
      function MouseInput() {
        this.evEl = MOUSE_ELEMENT_EVENTS;
        this.evWin = MOUSE_WINDOW_EVENTS;
        this.pressed = false;
        Input.apply(this, arguments);
      }
      inherit(MouseInput, Input, {
        /**
         * handle mouse events
         * @param {Object} ev
         */
        handler: function MEhandler(ev) {
          var eventType = MOUSE_INPUT_MAP[ev.type];
          if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
          }
          if (eventType & INPUT_MOVE && ev.which !== 1) {
            eventType = INPUT_END;
          }
          if (!this.pressed) {
            return;
          }
          if (eventType & INPUT_END) {
            this.pressed = false;
          }
          this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
          });
        }
      });
      var POINTER_INPUT_MAP = {
        pointerdown: INPUT_START,
        pointermove: INPUT_MOVE,
        pointerup: INPUT_END,
        pointercancel: INPUT_CANCEL,
        pointerout: INPUT_CANCEL
      };
      var IE10_POINTER_TYPE_ENUM = {
        2: INPUT_TYPE_TOUCH,
        3: INPUT_TYPE_PEN,
        4: INPUT_TYPE_MOUSE,
        5: INPUT_TYPE_KINECT
        // see https://twitter.com/jacobrossi/status/480596438489890816
      };
      var POINTER_ELEMENT_EVENTS = "pointerdown";
      var POINTER_WINDOW_EVENTS = "pointermove pointerup pointercancel";
      if (window2.MSPointerEvent && !window2.PointerEvent) {
        POINTER_ELEMENT_EVENTS = "MSPointerDown";
        POINTER_WINDOW_EVENTS = "MSPointerMove MSPointerUp MSPointerCancel";
      }
      function PointerEventInput() {
        this.evEl = POINTER_ELEMENT_EVENTS;
        this.evWin = POINTER_WINDOW_EVENTS;
        Input.apply(this, arguments);
        this.store = this.manager.session.pointerEvents = [];
      }
      inherit(PointerEventInput, Input, {
        /**
         * handle mouse events
         * @param {Object} ev
         */
        handler: function PEhandler(ev) {
          var store = this.store;
          var removePointer = false;
          var eventTypeNormalized = ev.type.toLowerCase().replace("ms", "");
          var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
          var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;
          var isTouch = pointerType == INPUT_TYPE_TOUCH;
          var storeIndex = inArray(store, ev.pointerId, "pointerId");
          if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
            if (storeIndex < 0) {
              store.push(ev);
              storeIndex = store.length - 1;
            }
          } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
          }
          if (storeIndex < 0) {
            return;
          }
          store[storeIndex] = ev;
          this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType,
            srcEvent: ev
          });
          if (removePointer) {
            store.splice(storeIndex, 1);
          }
        }
      });
      var SINGLE_TOUCH_INPUT_MAP = {
        touchstart: INPUT_START,
        touchmove: INPUT_MOVE,
        touchend: INPUT_END,
        touchcancel: INPUT_CANCEL
      };
      var SINGLE_TOUCH_TARGET_EVENTS = "touchstart";
      var SINGLE_TOUCH_WINDOW_EVENTS = "touchstart touchmove touchend touchcancel";
      function SingleTouchInput() {
        this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
        this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
        this.started = false;
        Input.apply(this, arguments);
      }
      inherit(SingleTouchInput, Input, {
        handler: function TEhandler(ev) {
          var type = SINGLE_TOUCH_INPUT_MAP[ev.type];
          if (type === INPUT_START) {
            this.started = true;
          }
          if (!this.started) {
            return;
          }
          var touches = normalizeSingleTouches.call(this, ev, type);
          if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
            this.started = false;
          }
          this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
          });
        }
      });
      function normalizeSingleTouches(ev, type) {
        var all2 = toArray2(ev.touches);
        var changed = toArray2(ev.changedTouches);
        if (type & (INPUT_END | INPUT_CANCEL)) {
          all2 = uniqueArray(all2.concat(changed), "identifier");
        }
        return [all2, changed];
      }
      var TOUCH_INPUT_MAP = {
        touchstart: INPUT_START,
        touchmove: INPUT_MOVE,
        touchend: INPUT_END,
        touchcancel: INPUT_CANCEL
      };
      var TOUCH_TARGET_EVENTS = "touchstart touchmove touchend touchcancel";
      function TouchInput() {
        this.evTarget = TOUCH_TARGET_EVENTS;
        this.targetIds = {};
        Input.apply(this, arguments);
      }
      inherit(TouchInput, Input, {
        handler: function MTEhandler(ev) {
          var type = TOUCH_INPUT_MAP[ev.type];
          var touches = getTouches.call(this, ev, type);
          if (!touches) {
            return;
          }
          this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
          });
        }
      });
      function getTouches(ev, type) {
        var allTouches = toArray2(ev.touches);
        var targetIds = this.targetIds;
        if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
          targetIds[allTouches[0].identifier] = true;
          return [allTouches, allTouches];
        }
        var i, targetTouches, changedTouches = toArray2(ev.changedTouches), changedTargetTouches = [], target = this.target;
        targetTouches = allTouches.filter(function(touch) {
          return hasParent(touch.target, target);
        });
        if (type === INPUT_START) {
          i = 0;
          while (i < targetTouches.length) {
            targetIds[targetTouches[i].identifier] = true;
            i++;
          }
        }
        i = 0;
        while (i < changedTouches.length) {
          if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
          }
          if (type & (INPUT_END | INPUT_CANCEL)) {
            delete targetIds[changedTouches[i].identifier];
          }
          i++;
        }
        if (!changedTargetTouches.length) {
          return;
        }
        return [
          // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
          uniqueArray(targetTouches.concat(changedTargetTouches), "identifier"),
          changedTargetTouches
        ];
      }
      var DEDUP_TIMEOUT = 2500;
      var DEDUP_DISTANCE = 25;
      function TouchMouseInput() {
        Input.apply(this, arguments);
        var handler = bindFn(this.handler, this);
        this.touch = new TouchInput(this.manager, handler);
        this.mouse = new MouseInput(this.manager, handler);
        this.primaryTouch = null;
        this.lastTouches = [];
      }
      inherit(TouchMouseInput, Input, {
        /**
         * handle mouse and touch events
         * @param {Hammer} manager
         * @param {String} inputEvent
         * @param {Object} inputData
         */
        handler: function TMEhandler(manager, inputEvent, inputData) {
          var isTouch = inputData.pointerType == INPUT_TYPE_TOUCH, isMouse = inputData.pointerType == INPUT_TYPE_MOUSE;
          if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
            return;
          }
          if (isTouch) {
            recordTouches.call(this, inputEvent, inputData);
          } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
            return;
          }
          this.callback(manager, inputEvent, inputData);
        },
        /**
         * remove the event listeners
         */
        destroy: function destroy() {
          this.touch.destroy();
          this.mouse.destroy();
        }
      });
      function recordTouches(eventType, eventData) {
        if (eventType & INPUT_START) {
          this.primaryTouch = eventData.changedPointers[0].identifier;
          setLastTouch.call(this, eventData);
        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
          setLastTouch.call(this, eventData);
        }
      }
      function setLastTouch(eventData) {
        var touch = eventData.changedPointers[0];
        if (touch.identifier === this.primaryTouch) {
          var lastTouch = { x: touch.clientX, y: touch.clientY };
          this.lastTouches.push(lastTouch);
          var lts = this.lastTouches;
          var removeLastTouch = function() {
            var i = lts.indexOf(lastTouch);
            if (i > -1) {
              lts.splice(i, 1);
            }
          };
          setTimeout(removeLastTouch, DEDUP_TIMEOUT);
        }
      }
      function isSyntheticEvent(eventData) {
        var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
        for (var i = 0; i < this.lastTouches.length; i++) {
          var t2 = this.lastTouches[i];
          var dx = Math.abs(x - t2.x), dy = Math.abs(y - t2.y);
          if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
            return true;
          }
        }
        return false;
      }
      var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, "touchAction");
      var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined$1;
      var TOUCH_ACTION_COMPUTE = "compute";
      var TOUCH_ACTION_AUTO = "auto";
      var TOUCH_ACTION_MANIPULATION = "manipulation";
      var TOUCH_ACTION_NONE = "none";
      var TOUCH_ACTION_PAN_X = "pan-x";
      var TOUCH_ACTION_PAN_Y = "pan-y";
      var TOUCH_ACTION_MAP = getTouchActionProps();
      function TouchAction(manager, value) {
        this.manager = manager;
        this.set(value);
      }
      TouchAction.prototype = {
        /**
         * set the touchAction value on the element or enable the polyfill
         * @param {String} value
         */
        set: function(value) {
          if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
          }
          if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
          }
          this.actions = value.toLowerCase().trim();
        },
        /**
         * just re-set the touchAction value
         */
        update: function() {
          this.set(this.manager.options.touchAction);
        },
        /**
         * compute the value for the touchAction property based on the recognizer's settings
         * @returns {String} value
         */
        compute: function() {
          var actions = [];
          each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
              actions = actions.concat(recognizer.getTouchAction());
            }
          });
          return cleanTouchActions(actions.join(" "));
        },
        /**
         * this method is called on each input cycle and provides the preventing of the browser behavior
         * @param {Object} input
         */
        preventDefaults: function(input) {
          var srcEvent = input.srcEvent;
          var direction = input.offsetDirection;
          if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
          }
          var actions = this.actions;
          var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
          var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
          var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];
          if (hasNone) {
            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;
            if (isTapPointer && isTapMovement && isTapTouchTime) {
              return;
            }
          }
          if (hasPanX && hasPanY) {
            return;
          }
          if (hasNone || hasPanY && direction & DIRECTION_HORIZONTAL || hasPanX && direction & DIRECTION_VERTICAL) {
            return this.preventSrc(srcEvent);
          }
        },
        /**
         * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
         * @param {Object} srcEvent
         */
        preventSrc: function(srcEvent) {
          this.manager.session.prevented = true;
          srcEvent.preventDefault();
        }
      };
      function cleanTouchActions(actions) {
        if (inStr(actions, TOUCH_ACTION_NONE)) {
          return TOUCH_ACTION_NONE;
        }
        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);
        if (hasPanX && hasPanY) {
          return TOUCH_ACTION_NONE;
        }
        if (hasPanX || hasPanY) {
          return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
        }
        if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
          return TOUCH_ACTION_MANIPULATION;
        }
        return TOUCH_ACTION_AUTO;
      }
      function getTouchActionProps() {
        if (!NATIVE_TOUCH_ACTION) {
          return false;
        }
        var touchMap = {};
        var cssSupports = window2.CSS && window2.CSS.supports;
        ["auto", "manipulation", "pan-y", "pan-x", "pan-x pan-y", "none"].forEach(function(val) {
          touchMap[val] = cssSupports ? window2.CSS.supports("touch-action", val) : true;
        });
        return touchMap;
      }
      var STATE_POSSIBLE = 1;
      var STATE_BEGAN = 2;
      var STATE_CHANGED = 4;
      var STATE_ENDED = 8;
      var STATE_RECOGNIZED = STATE_ENDED;
      var STATE_CANCELLED = 16;
      var STATE_FAILED = 32;
      function Recognizer(options) {
        this.options = assign2({}, this.defaults, options || {});
        this.id = uniqueId();
        this.manager = null;
        this.options.enable = ifUndefined(this.options.enable, true);
        this.state = STATE_POSSIBLE;
        this.simultaneous = {};
        this.requireFail = [];
      }
      Recognizer.prototype = {
        /**
         * @virtual
         * @type {Object}
         */
        defaults: {},
        /**
         * set options
         * @param {Object} options
         * @return {Recognizer}
         */
        set: function(options) {
          assign2(this.options, options);
          this.manager && this.manager.touchAction.update();
          return this;
        },
        /**
         * recognize simultaneous with an other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        recognizeWith: function(otherRecognizer) {
          if (invokeArrayArg(otherRecognizer, "recognizeWith", this)) {
            return this;
          }
          var simultaneous = this.simultaneous;
          otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
          if (!simultaneous[otherRecognizer.id]) {
            simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
          }
          return this;
        },
        /**
         * drop the simultaneous link. it doesnt remove the link on the other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        dropRecognizeWith: function(otherRecognizer) {
          if (invokeArrayArg(otherRecognizer, "dropRecognizeWith", this)) {
            return this;
          }
          otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
          delete this.simultaneous[otherRecognizer.id];
          return this;
        },
        /**
         * recognizer can only run when an other is failing
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        requireFailure: function(otherRecognizer) {
          if (invokeArrayArg(otherRecognizer, "requireFailure", this)) {
            return this;
          }
          var requireFail = this.requireFail;
          otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
          if (inArray(requireFail, otherRecognizer) === -1) {
            requireFail.push(otherRecognizer);
            otherRecognizer.requireFailure(this);
          }
          return this;
        },
        /**
         * drop the requireFailure link. it does not remove the link on the other recognizer.
         * @param {Recognizer} otherRecognizer
         * @returns {Recognizer} this
         */
        dropRequireFailure: function(otherRecognizer) {
          if (invokeArrayArg(otherRecognizer, "dropRequireFailure", this)) {
            return this;
          }
          otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
          var index2 = inArray(this.requireFail, otherRecognizer);
          if (index2 > -1) {
            this.requireFail.splice(index2, 1);
          }
          return this;
        },
        /**
         * has require failures boolean
         * @returns {boolean}
         */
        hasRequireFailures: function() {
          return this.requireFail.length > 0;
        },
        /**
         * if the recognizer can recognize simultaneous with an other recognizer
         * @param {Recognizer} otherRecognizer
         * @returns {Boolean}
         */
        canRecognizeWith: function(otherRecognizer) {
          return !!this.simultaneous[otherRecognizer.id];
        },
        /**
         * You should use `tryEmit` instead of `emit` directly to check
         * that all the needed recognizers has failed before emitting.
         * @param {Object} input
         */
        emit: function(input) {
          var self2 = this;
          var state = this.state;
          function emit(event) {
            self2.manager.emit(event, input);
          }
          if (state < STATE_ENDED) {
            emit(self2.options.event + stateStr(state));
          }
          emit(self2.options.event);
          if (input.additionalEvent) {
            emit(input.additionalEvent);
          }
          if (state >= STATE_ENDED) {
            emit(self2.options.event + stateStr(state));
          }
        },
        /**
         * Check that all the require failure recognizers has failed,
         * if true, it emits a gesture event,
         * otherwise, setup the state to FAILED.
         * @param {Object} input
         */
        tryEmit: function(input) {
          if (this.canEmit()) {
            return this.emit(input);
          }
          this.state = STATE_FAILED;
        },
        /**
         * can we emit?
         * @returns {boolean}
         */
        canEmit: function() {
          var i = 0;
          while (i < this.requireFail.length) {
            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
              return false;
            }
            i++;
          }
          return true;
        },
        /**
         * update the recognizer
         * @param {Object} inputData
         */
        recognize: function(inputData) {
          var inputDataClone = assign2({}, inputData);
          if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
          }
          if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
          }
          this.state = this.process(inputDataClone);
          if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.tryEmit(inputDataClone);
          }
        },
        /**
         * return the state of the recognizer
         * the actual recognizing happens in this method
         * @virtual
         * @param {Object} inputData
         * @returns {Const} STATE
         */
        process: function(inputData) {
        },
        // jshint ignore:line
        /**
         * return the preferred touch-action
         * @virtual
         * @returns {Array}
         */
        getTouchAction: function() {
        },
        /**
         * called when the gesture isn't allowed to recognize
         * like when another is being recognized or it is disabled
         * @virtual
         */
        reset: function() {
        }
      };
      function stateStr(state) {
        if (state & STATE_CANCELLED) {
          return "cancel";
        } else if (state & STATE_ENDED) {
          return "end";
        } else if (state & STATE_CHANGED) {
          return "move";
        } else if (state & STATE_BEGAN) {
          return "start";
        }
        return "";
      }
      function directionStr(direction) {
        if (direction == DIRECTION_DOWN) {
          return "down";
        } else if (direction == DIRECTION_UP) {
          return "up";
        } else if (direction == DIRECTION_LEFT) {
          return "left";
        } else if (direction == DIRECTION_RIGHT) {
          return "right";
        }
        return "";
      }
      function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
        var manager = recognizer.manager;
        if (manager) {
          return manager.get(otherRecognizer);
        }
        return otherRecognizer;
      }
      function AttrRecognizer() {
        Recognizer.apply(this, arguments);
      }
      inherit(AttrRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof AttrRecognizer
         */
        defaults: {
          /**
           * @type {Number}
           * @default 1
           */
          pointers: 1
        },
        /**
         * Used to check if it the recognizer receives valid input, like input.distance > 10.
         * @memberof AttrRecognizer
         * @param {Object} input
         * @returns {Boolean} recognized
         */
        attrTest: function(input) {
          var optionPointers = this.options.pointers;
          return optionPointers === 0 || input.pointers.length === optionPointers;
        },
        /**
         * Process the input and return the state for the recognizer
         * @memberof AttrRecognizer
         * @param {Object} input
         * @returns {*} State
         */
        process: function(input) {
          var state = this.state;
          var eventType = input.eventType;
          var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
          var isValid2 = this.attrTest(input);
          if (isRecognized && (eventType & INPUT_CANCEL || !isValid2)) {
            return state | STATE_CANCELLED;
          } else if (isRecognized || isValid2) {
            if (eventType & INPUT_END) {
              return state | STATE_ENDED;
            } else if (!(state & STATE_BEGAN)) {
              return STATE_BEGAN;
            }
            return state | STATE_CHANGED;
          }
          return STATE_FAILED;
        }
      });
      function PanRecognizer() {
        AttrRecognizer.apply(this, arguments);
        this.pX = null;
        this.pY = null;
      }
      inherit(PanRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof PanRecognizer
         */
        defaults: {
          event: "pan",
          threshold: 10,
          pointers: 1,
          direction: DIRECTION_ALL
        },
        getTouchAction: function() {
          var direction = this.options.direction;
          var actions = [];
          if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
          }
          if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
          }
          return actions;
        },
        directionTest: function(input) {
          var options = this.options;
          var hasMoved = true;
          var distance = input.distance;
          var direction = input.direction;
          var x = input.deltaX;
          var y = input.deltaY;
          if (!(direction & options.direction)) {
            if (options.direction & DIRECTION_HORIZONTAL) {
              direction = x === 0 ? DIRECTION_NONE : x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
              hasMoved = x != this.pX;
              distance = Math.abs(input.deltaX);
            } else {
              direction = y === 0 ? DIRECTION_NONE : y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
              hasMoved = y != this.pY;
              distance = Math.abs(input.deltaY);
            }
          }
          input.direction = direction;
          return hasMoved && distance > options.threshold && direction & options.direction;
        },
        attrTest: function(input) {
          return AttrRecognizer.prototype.attrTest.call(this, input) && (this.state & STATE_BEGAN || !(this.state & STATE_BEGAN) && this.directionTest(input));
        },
        emit: function(input) {
          this.pX = input.deltaX;
          this.pY = input.deltaY;
          var direction = directionStr(input.direction);
          if (direction) {
            input.additionalEvent = this.options.event + direction;
          }
          this._super.emit.call(this, input);
        }
      });
      function PinchRecognizer() {
        AttrRecognizer.apply(this, arguments);
      }
      inherit(PinchRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof PinchRecognizer
         */
        defaults: {
          event: "pinch",
          threshold: 0,
          pointers: 2
        },
        getTouchAction: function() {
          return [TOUCH_ACTION_NONE];
        },
        attrTest: function(input) {
          return this._super.attrTest.call(this, input) && (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
        },
        emit: function(input) {
          if (input.scale !== 1) {
            var inOut = input.scale < 1 ? "in" : "out";
            input.additionalEvent = this.options.event + inOut;
          }
          this._super.emit.call(this, input);
        }
      });
      function PressRecognizer() {
        Recognizer.apply(this, arguments);
        this._timer = null;
        this._input = null;
      }
      inherit(PressRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof PressRecognizer
         */
        defaults: {
          event: "press",
          pointers: 1,
          time: 251,
          // minimal time of the pointer to be pressed
          threshold: 9
          // a minimal movement is ok, but keep it low
        },
        getTouchAction: function() {
          return [TOUCH_ACTION_AUTO];
        },
        process: function(input) {
          var options = this.options;
          var validPointers = input.pointers.length === options.pointers;
          var validMovement = input.distance < options.threshold;
          var validTime = input.deltaTime > options.time;
          this._input = input;
          if (!validMovement || !validPointers || input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime) {
            this.reset();
          } else if (input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeoutContext(function() {
              this.state = STATE_RECOGNIZED;
              this.tryEmit();
            }, options.time, this);
          } else if (input.eventType & INPUT_END) {
            return STATE_RECOGNIZED;
          }
          return STATE_FAILED;
        },
        reset: function() {
          clearTimeout(this._timer);
        },
        emit: function(input) {
          if (this.state !== STATE_RECOGNIZED) {
            return;
          }
          if (input && input.eventType & INPUT_END) {
            this.manager.emit(this.options.event + "up", input);
          } else {
            this._input.timeStamp = now2();
            this.manager.emit(this.options.event, this._input);
          }
        }
      });
      function RotateRecognizer() {
        AttrRecognizer.apply(this, arguments);
      }
      inherit(RotateRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof RotateRecognizer
         */
        defaults: {
          event: "rotate",
          threshold: 0,
          pointers: 2
        },
        getTouchAction: function() {
          return [TOUCH_ACTION_NONE];
        },
        attrTest: function(input) {
          return this._super.attrTest.call(this, input) && (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
        }
      });
      function SwipeRecognizer() {
        AttrRecognizer.apply(this, arguments);
      }
      inherit(SwipeRecognizer, AttrRecognizer, {
        /**
         * @namespace
         * @memberof SwipeRecognizer
         */
        defaults: {
          event: "swipe",
          threshold: 10,
          velocity: 0.3,
          direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
          pointers: 1
        },
        getTouchAction: function() {
          return PanRecognizer.prototype.getTouchAction.call(this);
        },
        attrTest: function(input) {
          var direction = this.options.direction;
          var velocity;
          if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.overallVelocity;
          } else if (direction & DIRECTION_HORIZONTAL) {
            velocity = input.overallVelocityX;
          } else if (direction & DIRECTION_VERTICAL) {
            velocity = input.overallVelocityY;
          }
          return this._super.attrTest.call(this, input) && direction & input.offsetDirection && input.distance > this.options.threshold && input.maxPointers == this.options.pointers && abs2(velocity) > this.options.velocity && input.eventType & INPUT_END;
        },
        emit: function(input) {
          var direction = directionStr(input.offsetDirection);
          if (direction) {
            this.manager.emit(this.options.event + direction, input);
          }
          this.manager.emit(this.options.event, input);
        }
      });
      function TapRecognizer() {
        Recognizer.apply(this, arguments);
        this.pTime = false;
        this.pCenter = false;
        this._timer = null;
        this._input = null;
        this.count = 0;
      }
      inherit(TapRecognizer, Recognizer, {
        /**
         * @namespace
         * @memberof PinchRecognizer
         */
        defaults: {
          event: "tap",
          pointers: 1,
          taps: 1,
          interval: 300,
          // max time between the multi-tap taps
          time: 250,
          // max time of the pointer to be down (like finger on the screen)
          threshold: 9,
          // a minimal movement is ok, but keep it low
          posThreshold: 10
          // a multi-tap can be a bit off the initial position
        },
        getTouchAction: function() {
          return [TOUCH_ACTION_MANIPULATION];
        },
        process: function(input) {
          var options = this.options;
          var validPointers = input.pointers.length === options.pointers;
          var validMovement = input.distance < options.threshold;
          var validTouchTime = input.deltaTime < options.time;
          this.reset();
          if (input.eventType & INPUT_START && this.count === 0) {
            return this.failTimeout();
          }
          if (validMovement && validTouchTime && validPointers) {
            if (input.eventType != INPUT_END) {
              return this.failTimeout();
            }
            var validInterval = this.pTime ? input.timeStamp - this.pTime < options.interval : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;
            this.pTime = input.timeStamp;
            this.pCenter = input.center;
            if (!validMultiTap || !validInterval) {
              this.count = 1;
            } else {
              this.count += 1;
            }
            this._input = input;
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
              if (!this.hasRequireFailures()) {
                return STATE_RECOGNIZED;
              } else {
                this._timer = setTimeoutContext(function() {
                  this.state = STATE_RECOGNIZED;
                  this.tryEmit();
                }, options.interval, this);
                return STATE_BEGAN;
              }
            }
          }
          return STATE_FAILED;
        },
        failTimeout: function() {
          this._timer = setTimeoutContext(function() {
            this.state = STATE_FAILED;
          }, this.options.interval, this);
          return STATE_FAILED;
        },
        reset: function() {
          clearTimeout(this._timer);
        },
        emit: function() {
          if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
          }
        }
      });
      function Hammer2(element, options) {
        options = options || {};
        options.recognizers = ifUndefined(options.recognizers, Hammer2.defaults.preset);
        return new Manager(element, options);
      }
      Hammer2.VERSION = "2.0.7";
      Hammer2.defaults = {
        /**
         * set if DOM events are being triggered.
         * But this is slower and unused by simple implementations, so disabled by default.
         * @type {Boolean}
         * @default false
         */
        domEvents: false,
        /**
         * The value for the touchAction property/fallback.
         * When set to `compute` it will magically set the correct value based on the added recognizers.
         * @type {String}
         * @default compute
         */
        touchAction: TOUCH_ACTION_COMPUTE,
        /**
         * @type {Boolean}
         * @default true
         */
        enable: true,
        /**
         * EXPERIMENTAL FEATURE -- can be removed/changed
         * Change the parent input target element.
         * If Null, then it is being set the to main element.
         * @type {Null|EventTarget}
         * @default null
         */
        inputTarget: null,
        /**
         * force an input class
         * @type {Null|Function}
         * @default null
         */
        inputClass: null,
        /**
         * Default recognizer setup when calling `Hammer()`
         * When creating a new Manager these will be skipped.
         * @type {Array}
         */
        preset: [
          // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
          [RotateRecognizer, { enable: false }],
          [PinchRecognizer, { enable: false }, ["rotate"]],
          [SwipeRecognizer, { direction: DIRECTION_HORIZONTAL }],
          [PanRecognizer, { direction: DIRECTION_HORIZONTAL }, ["swipe"]],
          [TapRecognizer],
          [TapRecognizer, { event: "doubletap", taps: 2 }, ["tap"]],
          [PressRecognizer]
        ],
        /**
         * Some CSS properties can be used to improve the working of Hammer.
         * Add them to this method and they will be set when creating a new Manager.
         * @namespace
         */
        cssProps: {
          /**
           * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
           * @type {String}
           * @default 'none'
           */
          userSelect: "none",
          /**
           * Disable the Windows Phone grippers when pressing an element.
           * @type {String}
           * @default 'none'
           */
          touchSelect: "none",
          /**
           * Disables the default callout shown when you touch and hold a touch target.
           * On iOS, when you touch and hold a touch target such as a link, Safari displays
           * a callout containing information about the link. This property allows you to disable that callout.
           * @type {String}
           * @default 'none'
           */
          touchCallout: "none",
          /**
           * Specifies whether zooming is enabled. Used by IE10>
           * @type {String}
           * @default 'none'
           */
          contentZooming: "none",
          /**
           * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
           * @type {String}
           * @default 'none'
           */
          userDrag: "none",
          /**
           * Overrides the highlight color shown when the user taps a link or a JavaScript
           * clickable element in iOS. This property obeys the alpha value, if specified.
           * @type {String}
           * @default 'rgba(0,0,0,0)'
           */
          tapHighlightColor: "rgba(0,0,0,0)"
        }
      };
      var STOP = 1;
      var FORCED_STOP = 2;
      function Manager(element, options) {
        this.options = assign2({}, Hammer2.defaults, options || {});
        this.options.inputTarget = this.options.inputTarget || element;
        this.handlers = {};
        this.session = {};
        this.recognizers = [];
        this.oldCssProps = {};
        this.element = element;
        this.input = createInputInstance(this);
        this.touchAction = new TouchAction(this, this.options.touchAction);
        toggleCssProps(this, true);
        each(this.options.recognizers, function(item) {
          var recognizer = this.add(new item[0](item[1]));
          item[2] && recognizer.recognizeWith(item[2]);
          item[3] && recognizer.requireFailure(item[3]);
        }, this);
      }
      Manager.prototype = {
        /**
         * set options
         * @param {Object} options
         * @returns {Manager}
         */
        set: function(options) {
          assign2(this.options, options);
          if (options.touchAction) {
            this.touchAction.update();
          }
          if (options.inputTarget) {
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
          }
          return this;
        },
        /**
         * stop recognizing for this session.
         * This session will be discarded, when a new [input]start event is fired.
         * When forced, the recognizer cycle is stopped immediately.
         * @param {Boolean} [force]
         */
        stop: function(force) {
          this.session.stopped = force ? FORCED_STOP : STOP;
        },
        /**
         * run the recognizers!
         * called by the inputHandler function on every movement of the pointers (touches)
         * it walks through all the recognizers and tries to detect the gesture that is being made
         * @param {Object} inputData
         */
        recognize: function(inputData) {
          var session = this.session;
          if (session.stopped) {
            return;
          }
          this.touchAction.preventDefaults(inputData);
          var recognizer;
          var recognizers = this.recognizers;
          var curRecognizer = session.curRecognizer;
          if (!curRecognizer || curRecognizer && curRecognizer.state & STATE_RECOGNIZED) {
            curRecognizer = session.curRecognizer = null;
          }
          var i = 0;
          while (i < recognizers.length) {
            recognizer = recognizers[i];
            if (session.stopped !== FORCED_STOP && // 1
            (!curRecognizer || recognizer == curRecognizer || // 2
            recognizer.canRecognizeWith(curRecognizer))) {
              recognizer.recognize(inputData);
            } else {
              recognizer.reset();
            }
            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
              curRecognizer = session.curRecognizer = recognizer;
            }
            i++;
          }
        },
        /**
         * get a recognizer by its event name.
         * @param {Recognizer|String} recognizer
         * @returns {Recognizer|Null}
         */
        get: function(recognizer) {
          if (recognizer instanceof Recognizer) {
            return recognizer;
          }
          var recognizers = this.recognizers;
          for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
              return recognizers[i];
            }
          }
          return null;
        },
        /**
         * add a recognizer to the manager
         * existing recognizers with the same event name will be removed
         * @param {Recognizer} recognizer
         * @returns {Recognizer|Manager}
         */
        add: function(recognizer) {
          if (invokeArrayArg(recognizer, "add", this)) {
            return this;
          }
          var existing = this.get(recognizer.options.event);
          if (existing) {
            this.remove(existing);
          }
          this.recognizers.push(recognizer);
          recognizer.manager = this;
          this.touchAction.update();
          return recognizer;
        },
        /**
         * remove a recognizer by name or instance
         * @param {Recognizer|String} recognizer
         * @returns {Manager}
         */
        remove: function(recognizer) {
          if (invokeArrayArg(recognizer, "remove", this)) {
            return this;
          }
          recognizer = this.get(recognizer);
          if (recognizer) {
            var recognizers = this.recognizers;
            var index2 = inArray(recognizers, recognizer);
            if (index2 !== -1) {
              recognizers.splice(index2, 1);
              this.touchAction.update();
            }
          }
          return this;
        },
        /**
         * bind event
         * @param {String} events
         * @param {Function} handler
         * @returns {EventEmitter} this
         */
        on: function(events, handler) {
          if (events === undefined$1) {
            return;
          }
          if (handler === undefined$1) {
            return;
          }
          var handlers = this.handlers;
          each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
          });
          return this;
        },
        /**
         * unbind event, leave emit blank to remove all handlers
         * @param {String} events
         * @param {Function} [handler]
         * @returns {EventEmitter} this
         */
        off: function(events, handler) {
          if (events === undefined$1) {
            return;
          }
          var handlers = this.handlers;
          each(splitStr(events), function(event) {
            if (!handler) {
              delete handlers[event];
            } else {
              handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
            }
          });
          return this;
        },
        /**
         * emit event to the listeners
         * @param {String} event
         * @param {Object} data
         */
        emit: function(event, data2) {
          if (this.options.domEvents) {
            triggerDomEvent(event, data2);
          }
          var handlers = this.handlers[event] && this.handlers[event].slice();
          if (!handlers || !handlers.length) {
            return;
          }
          data2.type = event;
          data2.preventDefault = function() {
            data2.srcEvent.preventDefault();
          };
          var i = 0;
          while (i < handlers.length) {
            handlers[i](data2);
            i++;
          }
        },
        /**
         * destroy the manager and unbinds all events
         * it doesn't unbind dom events, that is the user own responsibility
         */
        destroy: function() {
          this.element && toggleCssProps(this, false);
          this.handlers = {};
          this.session = {};
          this.input.destroy();
          this.element = null;
        }
      };
      function toggleCssProps(manager, add) {
        var element = manager.element;
        if (!element.style) {
          return;
        }
        var prop;
        each(manager.options.cssProps, function(value, name2) {
          prop = prefixed(element.style, name2);
          if (add) {
            manager.oldCssProps[prop] = element.style[prop];
            element.style[prop] = value;
          } else {
            element.style[prop] = manager.oldCssProps[prop] || "";
          }
        });
        if (!add) {
          manager.oldCssProps = {};
        }
      }
      function triggerDomEvent(event, data2) {
        var gestureEvent = document2.createEvent("Event");
        gestureEvent.initEvent(event, true, true);
        gestureEvent.gesture = data2;
        data2.target.dispatchEvent(gestureEvent);
      }
      assign2(Hammer2, {
        INPUT_START,
        INPUT_MOVE,
        INPUT_END,
        INPUT_CANCEL,
        STATE_POSSIBLE,
        STATE_BEGAN,
        STATE_CHANGED,
        STATE_ENDED,
        STATE_RECOGNIZED,
        STATE_CANCELLED,
        STATE_FAILED,
        DIRECTION_NONE,
        DIRECTION_LEFT,
        DIRECTION_RIGHT,
        DIRECTION_UP,
        DIRECTION_DOWN,
        DIRECTION_HORIZONTAL,
        DIRECTION_VERTICAL,
        DIRECTION_ALL,
        Manager,
        Input,
        TouchAction,
        TouchInput,
        MouseInput,
        PointerEventInput,
        TouchMouseInput,
        SingleTouchInput,
        Recognizer,
        AttrRecognizer,
        Tap: TapRecognizer,
        Pan: PanRecognizer,
        Swipe: SwipeRecognizer,
        Pinch: PinchRecognizer,
        Rotate: RotateRecognizer,
        Press: PressRecognizer,
        on: addEventListeners,
        off: removeEventListeners,
        each,
        merge: merge2,
        extend: extend3,
        assign: assign2,
        inherit,
        bindFn,
        prefixed
      });
      var freeGlobal = typeof window2 !== "undefined" ? window2 : typeof self !== "undefined" ? self : {};
      freeGlobal.Hammer = Hammer2;
      if (module.exports) {
        module.exports = Hammer2;
      } else {
        window2[exportName] = Hammer2;
      }
    })(window, document, "Hammer");
  })(hammer);
  return hammer.exports;
}
var hammerExports = requireHammer();
const Hammer = /* @__PURE__ */ getDefaultExportFromCjs(hammerExports);
function _defineProperty(obj, key2, value) {
  if (key2 in obj) {
    Object.defineProperty(obj, key2, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key2] = value;
  }
  return obj;
}
function ownKeys(object2, enumerableOnly) {
  var keys2 = Object.keys(object2);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object2);
    if (enumerableOnly) symbols = symbols.filter(function(sym) {
      return Object.getOwnPropertyDescriptor(object2, sym).enumerable;
    });
    keys2.push.apply(keys2, symbols);
  }
  return keys2;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source2 = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source2), true).forEach(function(key2) {
        _defineProperty(target, key2, source2[key2]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source2));
    } else {
      ownKeys(Object(source2)).forEach(function(key2) {
        Object.defineProperty(target, key2, Object.getOwnPropertyDescriptor(source2, key2));
      });
    }
  }
  return target;
}
function compose() {
  for (var _len = arguments.length, fns = new Array(_len), _key = 0; _key < _len; _key++) {
    fns[_key] = arguments[_key];
  }
  return function(x) {
    return fns.reduceRight(function(y, f) {
      return f(y);
    }, x);
  };
}
function curry(fn) {
  return function curried() {
    var _this = this;
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    return args.length >= fn.length ? fn.apply(this, args) : function() {
      for (var _len3 = arguments.length, nextArgs = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        nextArgs[_key3] = arguments[_key3];
      }
      return curried.apply(_this, [].concat(args, nextArgs));
    };
  };
}
function isObject(value) {
  return {}.toString.call(value).includes("Object");
}
function isEmpty(obj) {
  return !Object.keys(obj).length;
}
function isFunction(value) {
  return typeof value === "function";
}
function hasOwnProperty(object2, property) {
  return Object.prototype.hasOwnProperty.call(object2, property);
}
function validateChanges(initial, changes) {
  if (!isObject(changes)) errorHandler("changeType");
  if (Object.keys(changes).some(function(field2) {
    return !hasOwnProperty(initial, field2);
  })) errorHandler("changeField");
  return changes;
}
function validateSelector(selector) {
  if (!isFunction(selector)) errorHandler("selectorType");
}
function validateHandler(handler) {
  if (!(isFunction(handler) || isObject(handler))) errorHandler("handlerType");
  if (isObject(handler) && Object.values(handler).some(function(_handler) {
    return !isFunction(_handler);
  })) errorHandler("handlersType");
}
function validateInitial(initial) {
  if (!initial) errorHandler("initialIsRequired");
  if (!isObject(initial)) errorHandler("initialType");
  if (isEmpty(initial)) errorHandler("initialContent");
}
function throwError(errorMessages2, type) {
  throw new Error(errorMessages2[type] || errorMessages2["default"]);
}
var errorMessages = {
  initialIsRequired: "initial state is required",
  initialType: "initial state should be an object",
  initialContent: "initial state shouldn't be an empty object",
  handlerType: "handler should be an object or a function",
  handlersType: "all handlers should be a functions",
  selectorType: "selector should be a function",
  changeType: "provided value of changes should be an object",
  changeField: 'it seams you want to change a field in the state which is not specified in the "initial" state',
  "default": "an unknown error accured in `state-local` package"
};
var errorHandler = curry(throwError)(errorMessages);
var validators = {
  changes: validateChanges,
  selector: validateSelector,
  handler: validateHandler,
  initial: validateInitial
};
function create(initial) {
  var handler = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  validators.initial(initial);
  validators.handler(handler);
  var state = {
    current: initial
  };
  var didUpdate = curry(didStateUpdate)(state, handler);
  var update2 = curry(updateState)(state);
  var validate = curry(validators.changes)(initial);
  var getChanges = curry(extractChanges)(state);
  function getState() {
    var selector = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : function(state2) {
      return state2;
    };
    validators.selector(selector);
    return selector(state.current);
  }
  function setState(causedChanges) {
    compose(didUpdate, update2, validate, getChanges)(causedChanges);
  }
  return [getState, setState];
}
function extractChanges(state, causedChanges) {
  return isFunction(causedChanges) ? causedChanges(state.current) : causedChanges;
}
function updateState(state, changes) {
  state.current = _objectSpread2(_objectSpread2({}, state.current), changes);
  return changes;
}
function didStateUpdate(state, handler, changes) {
  isFunction(handler) ? handler(state.current) : Object.keys(changes).forEach(function(field2) {
    var _handler$field;
    return (_handler$field = handler[field2]) === null || _handler$field === void 0 ? void 0 : _handler$field.call(handler, state.current[field2]);
  });
  return changes;
}
var index = {
  create
};
export {
  Color as C,
  EventSourceParserStream as E,
  Hammer as H,
  SpanStatusCode as S,
  ZodFirstPartyTypeKind as Z,
  _enum as _,
  array as a,
  boolean as b,
  string as c,
  desc as d,
  unknown as e,
  from$1 as f,
  any as g,
  discriminatedUnion as h,
  lazy as i,
  _null as j,
  number as k,
  literal as l,
  indexBrowserExports as m,
  number$1 as n,
  object as o,
  trace as p,
  context as q,
  record as r,
  safeParseAsync as s,
  toJSONSchema as t,
  union as u,
  _instanceof as v,
  custom as w,
  index as x,
  toPng as y
};
