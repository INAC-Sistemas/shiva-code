//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region ../../node_modules/.pnpm/cosmokit@1.8.1/node_modules/cosmokit/lib/index.cjs
var require_lib$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var index_exports = {};
	__export(index_exports, {
		Binary: () => Binary,
		Time: () => Time,
		arrayBufferToBase64: () => arrayBufferToBase64,
		arrayBufferToHex: () => arrayBufferToHex,
		base64ToArrayBuffer: () => base64ToArrayBuffer,
		camelCase: () => camelCase,
		camelize: () => camelize,
		capitalize: () => capitalize,
		clone: () => clone,
		contain: () => contain,
		deduplicate: () => deduplicate,
		deepEqual: () => deepEqual,
		defineProperty: () => defineProperty,
		difference: () => difference,
		filterKeys: () => filterKeys,
		formatProperty: () => formatProperty,
		hexToArrayBuffer: () => hexToArrayBuffer,
		hyphenate: () => hyphenate,
		intersection: () => intersection,
		is: () => is,
		isNonNullable: () => isNonNullable,
		isNullable: () => isNullable,
		isPlainObject: () => isPlainObject,
		makeArray: () => makeArray,
		mapValues: () => mapValues,
		noop: () => noop,
		omit: () => omit,
		paramCase: () => paramCase,
		pick: () => pick,
		remove: () => remove,
		sanitize: () => sanitize,
		snakeCase: () => snakeCase,
		trimSlash: () => trimSlash,
		uncapitalize: () => uncapitalize,
		union: () => union,
		valueMap: () => mapValues
	});
	module.exports = __toCommonJS(index_exports);
	function noop() {}
	function isNullable(value) {
		return value === null || value === void 0;
	}
	function isNonNullable(value) {
		return !isNullable(value);
	}
	function isPlainObject(data) {
		return data && typeof data === "object" && !Array.isArray(data);
	}
	function filterKeys(object, filter) {
		return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
	}
	function mapValues(object, transform) {
		return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
	}
	function pick(source, keys, forced) {
		if (!keys) return { ...source };
		const result = {};
		for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
		return result;
	}
	function omit(source, keys) {
		if (!keys) return { ...source };
		const result = { ...source };
		for (const key of keys) Reflect.deleteProperty(result, key);
		return result;
	}
	function defineProperty(object, key, value) {
		return Object.defineProperty(object, key, {
			writable: true,
			value,
			enumerable: false
		});
	}
	function contain(array1, array2) {
		return array2.every((item) => array1.includes(item));
	}
	function intersection(array1, array2) {
		return array1.filter((item) => array2.includes(item));
	}
	function difference(array1, array2) {
		return array1.filter((item) => !array2.includes(item));
	}
	function union(array1, array2) {
		return Array.from(/* @__PURE__ */ new Set([...array1, ...array2]));
	}
	function deduplicate(array) {
		return [...new Set(array)];
	}
	function remove(list, item) {
		const index = list?.indexOf(item);
		if (index >= 0) {
			list.splice(index, 1);
			return true;
		} else return false;
	}
	function makeArray(source) {
		return Array.isArray(source) ? source : isNullable(source) ? [] : [source];
	}
	function is(type, value) {
		if (arguments.length === 1) return (value2) => is(type, value2);
		return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
	}
	function isArrayBufferLike(value) {
		return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
	}
	function isArrayBufferSource(value) {
		return isArrayBufferLike(value) || ArrayBuffer.isView(value);
	}
	var Binary;
	((Binary2) => {
		Binary2.is = isArrayBufferLike;
		Binary2.isSource = isArrayBufferSource;
		function fromSource(source) {
			if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
			else return source;
		}
		Binary2.fromSource = fromSource;
		function toBase64(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
			let binary = "";
			const bytes = new Uint8Array(source);
			for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
			return btoa(binary);
		}
		Binary2.toBase64 = toBase64;
		function fromBase64(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
			return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
		}
		Binary2.fromBase64 = fromBase64;
		function toHex(source) {
			source = fromSource(source);
			if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
			return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
		}
		Binary2.toHex = toHex;
		function fromHex(source) {
			if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
			const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
			const buffer = [];
			for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
			return Uint8Array.from(buffer).buffer;
		}
		Binary2.fromHex = fromHex;
	})(Binary || (Binary = {}));
	var base64ToArrayBuffer = Binary.fromBase64;
	var arrayBufferToBase64 = Binary.toBase64;
	var hexToArrayBuffer = Binary.fromHex;
	var arrayBufferToHex = Binary.toHex;
	function clone(source, refs = /* @__PURE__ */ new Map()) {
		if (!source || typeof source !== "object") return source;
		if (is("Date", source)) return new Date(source.valueOf());
		if (is("RegExp", source)) return new RegExp(source.source, source.flags);
		if (isArrayBufferLike(source)) return source.slice(0);
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		const cached = refs.get(source);
		if (cached) return cached;
		if (Array.isArray(source)) {
			const result2 = [];
			refs.set(source, result2);
			source.forEach((value, index) => {
				result2[index] = Reflect.apply(clone, null, [value, refs]);
			});
			return result2;
		}
		const result = Object.create(Object.getPrototypeOf(source));
		refs.set(source, result);
		for (const key of Reflect.ownKeys(source)) {
			const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
			if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
			Reflect.defineProperty(result, key, descriptor);
		}
		return result;
	}
	function deepEqual(a, b, strict) {
		if (a === b) return true;
		if (!strict && isNullable(a) && isNullable(b)) return true;
		if (typeof a !== typeof b) return false;
		if (typeof a !== "object") return false;
		if (!a || !b) return false;
		function check(test, then) {
			return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
		}
		return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
			if (a2.byteLength !== b2.byteLength) return false;
			const viewA = new Uint8Array(a2);
			const viewB = new Uint8Array(b2);
			for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
			return true;
		}) ?? Object.keys({
			...a,
			...b
		}).every((key) => deepEqual(a[key], b[key], strict));
	}
	function capitalize(source) {
		return source.charAt(0).toUpperCase() + source.slice(1);
	}
	function uncapitalize(source) {
		return source.charAt(0).toLowerCase() + source.slice(1);
	}
	function camelCase(source) {
		return source.replace(/[_-][a-z]/g, (str) => str.slice(1).toUpperCase());
	}
	function tokenize(source, delimiters, delimiter) {
		const output = [];
		let state = 0;
		for (let i = 0; i < source.length; i++) {
			const code = source.charCodeAt(i);
			if (code >= 65 && code <= 90) {
				if (state === 1) {
					const next = source.charCodeAt(i + 1);
					if (next >= 97 && next <= 122) output.push(delimiter);
					output.push(code + 32);
				} else {
					if (state !== 0) output.push(delimiter);
					output.push(code + 32);
				}
				state = 1;
			} else if (code >= 97 && code <= 122) {
				output.push(code);
				state = 2;
			} else if (delimiters.includes(code)) {
				if (state !== 0) output.push(delimiter);
				state = 0;
			} else output.push(code);
		}
		return String.fromCharCode(...output);
	}
	function paramCase(source) {
		return tokenize(source, [45, 95], 45);
	}
	function snakeCase(source) {
		return tokenize(source, [45, 95], 95);
	}
	var camelize = camelCase;
	var hyphenate = paramCase;
	function formatProperty(key) {
		if (typeof key !== "string") return `[${key.toString()}]`;
		return /^[a-z_$][\w$]*$/i.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
	}
	function trimSlash(source) {
		return source.replace(/\/$/, "");
	}
	function sanitize(source) {
		if (!source.startsWith("/")) source = "/" + source;
		return trimSlash(source);
	}
	var Time;
	((Time2) => {
		Time2.millisecond = 1;
		Time2.second = 1e3;
		Time2.minute = Time2.second * 60;
		Time2.hour = Time2.minute * 60;
		Time2.day = Time2.hour * 24;
		Time2.week = Time2.day * 7;
		let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
		function setTimezoneOffset(offset) {
			timezoneOffset = offset;
		}
		Time2.setTimezoneOffset = setTimezoneOffset;
		function getTimezoneOffset() {
			return timezoneOffset;
		}
		Time2.getTimezoneOffset = getTimezoneOffset;
		function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
			if (typeof date === "number") date = new Date(date);
			if (offset === void 0) offset = timezoneOffset;
			return Math.floor((date.valueOf() / Time2.minute - offset) / 1440);
		}
		Time2.getDateNumber = getDateNumber;
		function fromDateNumber(value, offset) {
			const date = new Date(value * Time2.day);
			if (offset === void 0) offset = timezoneOffset;
			return new Date(+date + offset * Time2.minute);
		}
		Time2.fromDateNumber = fromDateNumber;
		const numeric = /\d+(?:\.\d+)?/.source;
		const timeRegExp = new RegExp(`^${[
			"w(?:eek(?:s)?)?",
			"d(?:ay(?:s)?)?",
			"h(?:our(?:s)?)?",
			"m(?:in(?:ute)?(?:s)?)?",
			"s(?:ec(?:ond)?(?:s)?)?"
		].map((unit) => `(${numeric}${unit})?`).join("")}$`);
		function parseTime(source) {
			const capture = timeRegExp.exec(source);
			if (!capture) return 0;
			return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
		}
		Time2.parseTime = parseTime;
		function parseDate(date) {
			const parsed = parseTime(date);
			if (parsed) date = Date.now() + parsed;
			else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
			else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
			return date ? new Date(date) : /* @__PURE__ */ new Date();
		}
		Time2.parseDate = parseDate;
		function format(ms) {
			const abs = Math.abs(ms);
			if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
			else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
			else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
			else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
			return ms + "ms";
		}
		Time2.format = format;
		function toDigits(source, length = 2) {
			return source.toString().padStart(length, "0");
		}
		Time2.toDigits = toDigits;
		function template(template2, time = /* @__PURE__ */ new Date()) {
			return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
		}
		Time2.template = template;
	})(Time || (Time = {}));
	0 && (module.exports = {
		Binary,
		Time,
		arrayBufferToBase64,
		arrayBufferToHex,
		base64ToArrayBuffer,
		camelCase,
		camelize,
		capitalize,
		clone,
		contain,
		deduplicate,
		deepEqual,
		defineProperty,
		difference,
		filterKeys,
		formatProperty,
		hexToArrayBuffer,
		hyphenate,
		intersection,
		is,
		isNonNullable,
		isNullable,
		isPlainObject,
		makeArray,
		mapValues,
		noop,
		omit,
		paramCase,
		pick,
		remove,
		sanitize,
		snakeCase,
		trimSlash,
		uncapitalize,
		union,
		valueMap
	});
}));
//#endregion
//#region src/config.ts
var import_lib = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __name = (target, value) => __defProp(target, "name", {
		value,
		configurable: true
	});
	var import_cosmokit = require_lib$1();
	var kSchema = Symbol.for("schemastery");
	var kValidationError = Symbol.for("ValidationError");
	globalThis.__schemastery_index__ ??= 0;
	globalThis.__schemastery_refs__ = void 0;
	var ValidationError = class extends TypeError {
		constructor(message, options) {
			let prefix = "$";
			for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
			else if (typeof segment === "number") prefix += "[" + segment + "]";
			else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
			if (prefix.startsWith(".")) prefix = prefix.slice(1);
			super((prefix === "$" ? "" : `${prefix} `) + message);
			this.options = options;
		}
		static {
			__name(this, "ValidationError");
		}
		name = "ValidationError";
		static is(error) {
			return !!error?.[kValidationError];
		}
	};
	Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
	var Schema = /* @__PURE__ */ __name(function(options) {
		const schema = /* @__PURE__ */ __name(function(data, options2 = {}) {
			return Schema.resolve(data, schema, options2)[0];
		}, "schema");
		if (options.refs) {
			const refs = (0, import_cosmokit.valueMap)(options.refs, (options2) => new Schema(options2));
			const getRef = /* @__PURE__ */ __name((uid) => refs[uid], "getRef");
			for (const key in refs) {
				const options2 = refs[key];
				options2.sKey = getRef(options2.sKey);
				options2.inner = getRef(options2.inner);
				options2.list = options2.list && options2.list.map(getRef);
				options2.dict = options2.dict && (0, import_cosmokit.valueMap)(options2.dict, getRef);
			}
			return refs[options.uid];
		}
		Object.assign(schema, options);
		if (typeof schema.callback === "string") try {
			schema.callback = new Function("return " + schema.callback)();
		} catch {}
		Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
		Object.setPrototypeOf(schema, Schema.prototype);
		schema.meta ||= {};
		schema.toString = schema.toString.bind(schema);
		return schema;
	}, "Schema");
	Schema.prototype = Object.create(Function.prototype);
	Schema.prototype[kSchema] = true;
	Object.defineProperty(Schema.prototype, "~standard", { get() {
		return {
			version: 1,
			vendor: "schemastery",
			validate: /* @__PURE__ */ __name((value) => {
				try {
					return { value: Schema.resolve(value, this, {})[0] };
				} catch (error) {
					if (ValidationError.is(error)) return { issues: [{
						message: error.message,
						path: error.options.path
					}] };
					throw error;
				}
			}, "validate")
		};
	} });
	Schema.ValidationError = ValidationError;
	Schema.prototype.toJSON = /* @__PURE__ */ __name(function toJSON() {
		if (globalThis.__schemastery_refs__) {
			globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
			return this.uid;
		}
		globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
		globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
		const result = {
			uid: this.uid,
			refs: globalThis.__schemastery_refs__
		};
		globalThis.__schemastery_refs__ = void 0;
		return result;
	}, "toJSON");
	Schema.prototype.set = /* @__PURE__ */ __name(function set(key, value) {
		this.dict[key] = value;
		return this;
	}, "set");
	Schema.prototype.push = /* @__PURE__ */ __name(function push(value) {
		this.list.push(value);
		return this;
	}, "push");
	function mergeDesc(original, messages) {
		const result = typeof original === "string" ? { "": original } : { ...original };
		for (const locale in messages) {
			const value = messages[locale];
			if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
			else if (typeof value === "string") result[locale] = value;
		}
		return result;
	}
	__name(mergeDesc, "mergeDesc");
	function getInner(value) {
		return value?.$value ?? value?.$inner;
	}
	__name(getInner, "getInner");
	function extractKeys(data) {
		return (0, import_cosmokit.filterKeys)(data ?? {}, (key) => !key.startsWith("$"));
	}
	__name(extractKeys, "extractKeys");
	Schema.prototype.i18n = /* @__PURE__ */ __name(function i18n(messages) {
		const schema = Schema(this);
		const desc = mergeDesc(schema.meta.description, messages);
		if (Object.keys(desc).length) schema.meta.description = desc;
		if (schema.dict) schema.dict = (0, import_cosmokit.valueMap)(schema.dict, (inner, key) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
		});
		if (schema.list) schema.list = schema.list.map((inner, index) => {
			return inner.i18n((0, import_cosmokit.valueMap)(messages, (data = {}) => {
				if (Array.isArray(getInner(data))) return getInner(data)[index];
				if (Array.isArray(data)) return data[index];
				return extractKeys(data);
			}));
		});
		if (schema.inner) schema.inner = schema.inner.i18n((0, import_cosmokit.valueMap)(messages, (data) => {
			if (getInner(data)) return getInner(data);
			return extractKeys(data);
		}));
		if (schema.sKey) schema.sKey = schema.sKey.i18n((0, import_cosmokit.valueMap)(messages, (data) => data?.$key));
		return schema;
	}, "i18n");
	Schema.prototype.extra = /* @__PURE__ */ __name(function extra(key, value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	}, "extra");
	for (const key of [
		"required",
		"disabled",
		"collapse",
		"hidden",
		"loose"
	]) Object.assign(Schema.prototype, { [key](value = true) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	Schema.prototype.deprecated = /* @__PURE__ */ __name(function deprecated() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "deprecated",
			type: "danger"
		});
		return schema;
	}, "deprecated");
	Schema.prototype.experimental = /* @__PURE__ */ __name(function experimental() {
		const schema = Schema(this);
		schema.meta.badges ||= [];
		schema.meta.badges.push({
			text: "experimental",
			type: "warning"
		});
		return schema;
	}, "experimental");
	Schema.prototype.pattern = /* @__PURE__ */ __name(function pattern(regexp) {
		const schema = Schema(this);
		const pattern2 = (0, import_cosmokit.pick)(regexp, ["source", "flags"]);
		schema.meta = {
			...schema.meta,
			pattern: pattern2
		};
		return schema;
	}, "pattern");
	Schema.prototype.simplify = /* @__PURE__ */ __name(function simplify(value) {
		if ((0, import_cosmokit.deepEqual)(value, this.meta.default, this.type === "dict")) return null;
		if ((0, import_cosmokit.isNullable)(value)) return value;
		if (this.type === "object" || this.type === "dict") {
			const result = {};
			for (const key in value) {
				const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
				if (this.type === "dict" || !(0, import_cosmokit.isNullable)(item)) result[key] = item;
			}
			if ((0, import_cosmokit.deepEqual)(result, this.meta.default, this.type === "dict")) return null;
			return result;
		} else if (this.type === "array" || this.type === "tuple") {
			const result = [];
			value.forEach((value2, index) => {
				const schema = this.type === "array" ? this.inner : this.list[index];
				const item = schema ? schema.simplify(value2) : value2;
				result.push(item);
			});
			return result;
		} else if (this.type === "intersect") {
			const result = {};
			for (const item of this.list) Object.assign(result, item.simplify(value));
			return result;
		} else if (this.type === "union") for (const schema of this.list) try {
			Schema.resolve(value, schema, {});
			return schema.simplify(value);
		} catch {}
		return value;
	}, "simplify");
	Schema.prototype.toString = /* @__PURE__ */ __name(function toString(inline) {
		return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
	}, "toString");
	Schema.prototype.role = /* @__PURE__ */ __name(function role(role, extra2) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			role,
			extra: extra2
		};
		return schema;
	}, "role");
	for (const key of [
		"default",
		"link",
		"comment",
		"description",
		"max",
		"min",
		"step"
	]) Object.assign(Schema.prototype, { [key](value) {
		const schema = Schema(this);
		schema.meta = {
			...schema.meta,
			[key]: value
		};
		return schema;
	} });
	var resolvers = {};
	Schema.extend = /* @__PURE__ */ __name(function extend(type, resolve2) {
		resolvers[type] = resolve2;
	}, "extend");
	Schema.resolve = /* @__PURE__ */ __name(function resolve(data, schema, options = {}, strict = false) {
		if (!schema) return [data];
		if (options.ignore?.(data, schema)) return [data];
		if ((0, import_cosmokit.isNullable)(data) && schema.type !== "lazy") {
			if (schema.meta.required) throw new ValidationError(`missing required value`, options);
			let current = schema;
			let fallback = schema.meta.default;
			while (current?.type === "intersect" && (0, import_cosmokit.isNullable)(fallback)) {
				current = current.list[0];
				fallback = current?.meta.default;
			}
			if ((0, import_cosmokit.isNullable)(fallback)) return [data];
			data = (0, import_cosmokit.clone)(fallback);
		}
		const callback = resolvers[schema.type];
		if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
		try {
			return callback(data, schema, options, strict);
		} catch (error) {
			if (!schema.meta.loose) throw error;
			return [schema.meta.default];
		}
	}, "resolve");
	Schema.from = /* @__PURE__ */ __name(function from(source) {
		if ((0, import_cosmokit.isNullable)(source)) return Schema.any();
		else if ([
			"string",
			"number",
			"boolean"
		].includes(typeof source)) return Schema.const(source).required();
		else if (source[kSchema]) return source;
		else if (typeof source === "function") switch (source) {
			case String: return Schema.string().required();
			case Number: return Schema.number().required();
			case Boolean: return Schema.boolean().required();
			case Function: return Schema.function().required();
			default: return Schema.is(source).required();
		}
		else throw new TypeError(`cannot infer schema from ${source}`);
	}, "from");
	Schema.lazy = /* @__PURE__ */ __name(function lazy(builder) {
		const schema = new Schema({
			type: "lazy",
			builder,
			inner: { toJSON: /* @__PURE__ */ __name(() => {
				if (!schema.inner[kSchema]) {
					schema.inner = schema.builder();
					schema.inner.meta = {
						...schema.meta,
						...schema.inner.meta
					};
				}
				return schema.inner.toJSON();
			}, "toJSON") }
		});
		return schema;
	}, "lazy");
	Schema.natural = /* @__PURE__ */ __name(function natural() {
		return Schema.number().step(1).min(0);
	}, "natural");
	Schema.percent = /* @__PURE__ */ __name(function percent() {
		return Schema.number().step(.01).min(0).max(1).role("slider");
	}, "percent");
	Schema.date = /* @__PURE__ */ __name(function date() {
		return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
			const date2 = new Date(value);
			if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
			return date2;
		}, true)]);
	}, "date");
	Schema.regExp = /* @__PURE__ */ __name(function regExp(flag = "") {
		return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
			try {
				return new RegExp(value, flag);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)]);
	}, "regExp");
	Schema.arrayBuffer = /* @__PURE__ */ __name(function arrayBuffer(encoding) {
		return Schema.union([
			Schema.is(ArrayBuffer),
			Schema.is(SharedArrayBuffer),
			Schema.transform(Schema.any(), (value, options) => {
				if (import_cosmokit.Binary.isSource(value)) return import_cosmokit.Binary.fromSource(value);
				throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
			}, true),
			...encoding ? [Schema.transform(Schema.string(), (value, options) => {
				try {
					return encoding === "base64" ? import_cosmokit.Binary.fromBase64(value) : import_cosmokit.Binary.fromHex(value);
				} catch (e) {
					throw new ValidationError(e.message, options);
				}
			}, true)] : []
		]);
	}, "arrayBuffer");
	Schema.extend("lazy", (data, schema, options, strict) => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return Schema.resolve(data, schema.inner, options, strict);
	});
	Schema.extend("any", (data) => {
		return [data];
	});
	Schema.extend("never", (data, _, options) => {
		throw new ValidationError(`expected nullable but got ${data}`, options);
	});
	Schema.extend("const", (data, { value }, options) => {
		if ((0, import_cosmokit.deepEqual)(data, value)) return [value];
		throw new ValidationError(`expected ${value} but got ${data}`, options);
	});
	function checkWithinRange(data, meta, description, options, skipMin = false) {
		const { max = Infinity, min = -Infinity } = meta;
		if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
		if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
	}
	__name(checkWithinRange, "checkWithinRange");
	Schema.extend("string", (data, { meta }, options) => {
		if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
		if (meta.pattern) {
			const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
			if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
		}
		checkWithinRange(data.length, meta, "string length", options);
		return [data];
	});
	function decimalShift(data, digits) {
		const str = data.toString();
		if (str.includes("e")) return data * Math.pow(10, digits);
		const index = str.indexOf(".");
		if (index === -1) return data * Math.pow(10, digits);
		const frac = str.slice(index + 1);
		const integer = str.slice(0, index);
		if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
		return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
	}
	__name(decimalShift, "decimalShift");
	function isMultipleOf(data, min, step) {
		step = Math.abs(step);
		if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
		const index = step.toString().indexOf(".");
		const digits = step.toString().slice(index + 1).length;
		return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
	}
	__name(isMultipleOf, "isMultipleOf");
	Schema.extend("number", (data, { meta }, options) => {
		if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
		checkWithinRange(data, meta, "number", options);
		const { step } = meta;
		if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
		return [data];
	});
	Schema.extend("boolean", (data, _, options) => {
		if (typeof data === "boolean") return [data];
		throw new ValidationError(`expected boolean but got ${data}`, options);
	});
	Schema.extend("bitset", (data, { bits, meta }, options) => {
		let value = 0, keys = [];
		if (typeof data === "number") {
			value = data;
			for (const key in bits) if (data & bits[key]) keys.push(key);
		} else if (Array.isArray(data)) {
			keys = data;
			for (const key of keys) {
				if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
				if (key in bits) value |= bits[key];
			}
		} else throw new ValidationError(`expected number or array but got ${data}`, options);
		if (value === meta.default) return [value];
		return [value, keys];
	});
	Schema.extend("function", (data, _, options) => {
		if (typeof data === "function") return [data];
		throw new ValidationError(`expected function but got ${data}`, options);
	});
	Schema.extend("is", (data, { constructor }, options) => {
		if (typeof constructor === "function") {
			if (data instanceof constructor) return [data];
			throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
		} else {
			if ((0, import_cosmokit.isNullable)(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
			let prototype = Object.getPrototypeOf(data);
			while (prototype) {
				if (prototype.constructor?.name === constructor) return [data];
				prototype = Object.getPrototypeOf(prototype);
			}
			throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		}
	});
	function property(data, key, schema, options) {
		try {
			const [value, adapted] = Schema.resolve(data[key], schema, {
				...options,
				path: [...options.path || [], key]
			});
			if (adapted !== void 0) data[key] = adapted;
			return value;
		} catch (e) {
			if (!options?.autofix) throw e;
			delete data[key];
			return schema.meta.default;
		}
	}
	__name(property, "property");
	Schema.extend("array", (data, { inner, meta }, options) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		checkWithinRange(data.length, meta, "array length", options, !(0, import_cosmokit.isNullable)(inner.meta.default));
		return [data.map((_, index) => property(data, index, inner, options))];
	});
	Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in data) {
			let rKey;
			try {
				rKey = Schema.resolve(key, sKey, options)[0];
			} catch (error) {
				if (strict) continue;
				throw error;
			}
			result[rKey] = property(data, key, inner, options);
			data[rKey] = data[key];
			if (key !== rKey) delete data[key];
		}
		return [result];
	});
	Schema.extend("tuple", (data, { list }, options, strict) => {
		if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
		const result = list.map((inner, index) => property(data, index, inner, options));
		if (strict) return [result];
		result.push(...data.slice(list.length));
		return [result];
	});
	function merge(result, data) {
		for (const key in data) {
			if (key in result) continue;
			result[key] = data[key];
		}
	}
	__name(merge, "merge");
	Schema.extend("object", (data, { dict }, options, strict) => {
		if (!(0, import_cosmokit.isPlainObject)(data)) throw new ValidationError(`expected object but got ${data}`, options);
		const result = {};
		for (const key in dict) {
			const value = property(data, key, dict[key], options);
			if (!(0, import_cosmokit.isNullable)(value) || key in data) result[key] = value;
		}
		if (!strict) merge(result, data);
		return [result];
	});
	Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
		const messages = [];
		for (const inner of list) try {
			return Schema.resolve(data, inner, options, strict);
		} catch (error) {
			messages.push(error);
		}
		throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
	});
	Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
		if (!list.length) return [data];
		let result;
		for (const inner of list) {
			const value = Schema.resolve(data, inner, options, true)[0];
			if ((0, import_cosmokit.isNullable)(value)) continue;
			if ((0, import_cosmokit.isNullable)(result)) result = value;
			else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
			else if (typeof value === "object") merge(result ??= {}, value);
			else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
		}
		if (!strict && (0, import_cosmokit.isPlainObject)(data)) merge(result, data);
		return [result];
	});
	Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
		const [result, adapted = data] = Schema.resolve(data, inner, options, true);
		if (preserve) return [callback(result)];
		else return [callback(result), callback(adapted)];
	});
	var formatters = {};
	function defineMethod(name, keys, format) {
		formatters[name] = format;
		Object.assign(Schema, { [name](...args) {
			const schema = new Schema({ type: name });
			keys.forEach((key, index) => {
				switch (key) {
					case "sKey":
						schema.sKey = args[index] ?? Schema.string();
						break;
					case "inner":
						schema.inner = Schema.from(args[index]);
						break;
					case "list":
						schema.list = args[index].map(Schema.from);
						break;
					case "dict":
						schema.dict = (0, import_cosmokit.valueMap)(args[index], Schema.from);
						break;
					case "bits":
						schema.bits = {};
						for (const key2 in args[index]) {
							if (typeof args[index][key2] !== "number") continue;
							schema.bits[key2] = args[index][key2];
						}
						break;
					case "callback": {
						const callback = schema.callback = args[index];
						callback["toJSON"] ||= () => callback.toString();
						break;
					}
					case "constructor": {
						const constructor = schema.constructor = args[index];
						if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
						break;
					}
					default: schema[key] = args[index];
				}
			});
			if (name === "object" || name === "dict") schema.meta.default = {};
			else if (name === "array" || name === "tuple") schema.meta.default = [];
			else if (name === "bitset") schema.meta.default = 0;
			return schema;
		} });
	}
	__name(defineMethod, "defineMethod");
	defineMethod("is", ["constructor"], ({ constructor }) => {
		if (typeof constructor === "function") return constructor.name;
		else return constructor;
	});
	defineMethod("any", [], () => "any");
	defineMethod("never", [], () => "never");
	defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
	defineMethod("string", [], () => "string");
	defineMethod("number", [], () => "number");
	defineMethod("boolean", [], () => "boolean");
	defineMethod("bitset", ["bits"], () => "bitset");
	defineMethod("function", [], () => "function");
	defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
	defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
	defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
	defineMethod("object", ["dict"], ({ dict }) => {
		if (Object.keys(dict).length === 0) return "{}";
		return `{ ${Object.entries(dict).map(([key, inner]) => {
			return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
		}).join(", ")} }`;
	});
	defineMethod("union", ["list"], ({ list }, inline) => {
		const result = list.map(({ toString: format }) => format()).join(" | ");
		return inline ? `(${result})` : result;
	});
	defineMethod("intersect", ["list"], ({ list }) => {
		return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
	});
	defineMethod("transform", [
		"inner",
		"callback",
		"preserve"
	], ({ inner }, isInner) => inner.toString(isInner));
	module.exports = Schema;
})))(), 1);
/** Settings namespace id. */
const SIDEBARQA_SETTINGS_NS = "sidebarqa";
/** Schema-backed defaults (also used when the settings service is absent). */
const SIDEBARQA_DEFAULTS = {
	historyStrategy: "compressed",
	trimWindowMessages: 10,
	summarizeProvider: "",
	summarizeModel: "deepseek-v4-flash",
	summarizeReasoningEffort: "off",
	summarizeBudgetTokens: 160,
	recentWindowMessages: 2,
	backgroundWindowMessages: 12,
	answerProvider: "deepseek-official",
	answerModel: "deepseek-v4-flash",
	answerReasoningEffort: "off",
	titleBudgetTokens: 64
};
/** Schemastery schema for the `sidebarqa` settings namespace. */
const SidebarqaPrefsSchema = import_lib.default.object({
	historyStrategy: import_lib.default.union([
		"inherit",
		"compressed",
		"trim"
	]).default(SIDEBARQA_DEFAULTS.historyStrategy),
	trimWindowMessages: import_lib.default.number().step(1).min(1).max(256).default(SIDEBARQA_DEFAULTS.trimWindowMessages),
	summarizeProvider: import_lib.default.string().default(SIDEBARQA_DEFAULTS.summarizeProvider),
	summarizeModel: import_lib.default.string().default(SIDEBARQA_DEFAULTS.summarizeModel),
	summarizeReasoningEffort: import_lib.default.union([
		"off",
		"high",
		"max"
	]).default(SIDEBARQA_DEFAULTS.summarizeReasoningEffort),
	summarizeBudgetTokens: import_lib.default.number().step(1).min(64).max(8192).default(SIDEBARQA_DEFAULTS.summarizeBudgetTokens),
	recentWindowMessages: import_lib.default.number().step(1).min(1).max(64).default(SIDEBARQA_DEFAULTS.recentWindowMessages),
	backgroundWindowMessages: import_lib.default.number().step(1).min(1).max(256).default(SIDEBARQA_DEFAULTS.backgroundWindowMessages),
	answerProvider: import_lib.default.string().default(SIDEBARQA_DEFAULTS.answerProvider),
	answerModel: import_lib.default.string().default(SIDEBARQA_DEFAULTS.answerModel),
	answerReasoningEffort: import_lib.default.union([
		"off",
		"high",
		"max"
	]).default(SIDEBARQA_DEFAULTS.answerReasoningEffort),
	titleBudgetTokens: import_lib.default.number().step(1).min(16).max(256).default(SIDEBARQA_DEFAULTS.titleBudgetTokens)
});
//#endregion
//#region src/prompt-locale.ts
/**
* Normalize a wire value to a prompt locale.
*
* ABSENT → `'zh'`: this is the back-compat contract with clients that predate
* the `locale` field. Any unknown language falls to `'en'`; never throws.
* @param raw - the payload's `locale` field, unvalidated.
*/
function promptLocaleOf(raw) {
	if (typeof raw !== "string" || raw === "") return "zh";
	return raw.toLowerCase().startsWith("zh") ? "zh" : "en";
}
/**
* Every question marker this plugin has EVER emitted.
*
* APPEND-ONLY: never reorder, never remove. These messages are persisted in the
* DSH session log and re-parsed on every panel render, so a marker dropped here
* would make historical follow-ups display a bare `问题：` prefix forever.
* `tests/prompt-locale.spec.ts` pins that every bundle's `questionLabel` is a
* member of this list, so a new language cannot be added without teaching the
* parser about it.
*/
const QUESTION_LABELS = ["问题：", "Question: "];
/** The model-facing text, per language. */
const PROMPTS = {
	zh: {
		backgroundSystem: [
			"你是对话上下文压缩助手。下面是主对话【较早部分】的原文，按时间从新到旧排列（第一条是最新状态，每条以「用户：」或「助手：」开头）。",
			"请用最多 3 句话概括，依次是：会话目标（在做什么）、当前进度（最新状态/最近完成了什么）、未决事项（没有就省略这一句）。",
			"要求：极简、只陈述事实、禁止列清单、禁止复述指令、禁止编造；早期指令若已被后续执行，视为已完成，不要当作未决事项。"
		].join("\n"),
		roleUser: "用户：",
		roleAssistant: "助手：",
		sectionBackground: "【背景】",
		sectionRecent: "【近期对话】",
		titleSystem: [
			"你是会话标题生成助手：根据下面的「问题 + 回答」提炼一个极简标题。",
			"严格只输出标题本身，遵守：",
			"1. 纯文本单行，禁止引号、Markdown、XML、解释、前后缀、换行或终端控制码；",
			"2. 使用问题与回答的语言；",
			"3. 不超过 15 个汉字（非中文语言约 6 个词以内）；",
			"4. 直接给主题短语，不要开场白、自我陈述或任务复述。"
		].join("\n"),
		titleQuestionLabel: "问题：",
		titleAnswerLabel: "回答：",
		followUpIntro: [
			"这是一次「侧边栏追问」：用户对主对话里划选的一段文本提问。",
			"请识别用户意图，只围绕这段划选文本的主题直接、简明地回答（必要时先做概念澄清），不要复述上下文、也不要过度联系主对话的整体主题。",
			"输出要求：第一句就进入回答正文，禁止任何开场白、自我陈述或任务复述（如\"我来回答…\"\"这个问题是关于…\"\"直接介绍即可\"之类的话一律不写）。",
			"用与「用户的问题」相同的语言作答；问题的语言不明确时，跟随划选文本的语言。",
			"下面依次是参考上下文：",
			"1. 主对话整体主题",
			"2. 主对话最近几轮对话",
			"3. 用户划选的文本（见 <quoted_context> 块）",
			"4. 用户的问题"
		].join("\n"),
		contextHeading: "【主对话上下文】",
		questionLabel: "问题：",
		quoteLabelUser: "用户消息",
		quoteLabelAgent: "Agent 回复",
		fallbackTopic: "追问"
	},
	en: {
		backgroundSystem: [
			"You compress conversation context. Below is the verbatim EARLIER part of a main conversation, ordered newest first (the first entry is the latest state; each entry starts with \"User:\" or \"Assistant:\").",
			"Summarize it in at most 3 sentences, in this order: the goal of the session (what is being done), the current progress (latest state / what was just finished), and open items (omit this sentence if there are none).",
			"Requirements: be minimal, state facts only, no bullet lists, no restating instructions, no invention; an early instruction that later work already carried out counts as done and must not be reported as an open item."
		].join("\n"),
		roleUser: "User: ",
		roleAssistant: "Assistant: ",
		sectionBackground: "[Background]",
		sectionRecent: "[Recent]",
		titleSystem: [
			"You generate session titles: distill one minimal title from the \"question + answer\" below.",
			"Output the title and nothing else, obeying:",
			"1. plain text, single line — no quotes, Markdown, XML, explanation, prefix, suffix, newline or terminal control codes;",
			"2. use the language of the question and the answer;",
			"3. at most 6 words (about 15 characters for CJK);",
			"4. give the topic phrase directly — no preamble, self-description or task restatement."
		].join("\n"),
		titleQuestionLabel: "Question: ",
		titleAnswerLabel: "Answer: ",
		followUpIntro: [
			"This is a \"sidebar follow-up\": the user is asking about a passage they selected in the main conversation.",
			"Identify their intent and answer the topic of that selected passage directly and concisely (clarify the concept first when that is needed). Do not restate the context, and do not over-connect the answer to the main conversation's overall theme.",
			"Output: begin with the answer itself in the first sentence. No opening remarks, self-description or task restatement (never write things like \"Let me answer…\", \"This question is about…\", \"Here is an introduction\").",
			"Answer in the same language as the user's question; if that language is ambiguous, follow the language of the quoted text.",
			"The reference context follows, in order:",
			"1. the overall topic of the main conversation",
			"2. the most recent turns of the main conversation",
			"3. the passage the user selected (see the <quoted_context> block)",
			"4. the user's question"
		].join("\n"),
		contextHeading: "[Main conversation context]",
		questionLabel: "Question: ",
		quoteLabelUser: "user message",
		quoteLabelAgent: "agent reply",
		fallbackTopic: "Follow-up"
	}
};
/**
* One language's model-facing text.
* @param locale - the resolved prompt locale (defaults to the pre-i18n zh).
*/
function promptsOf(locale = "zh") {
	return PROMPTS[locale];
}
//#endregion
//#region src/summarize.ts
/** Per-segment char cap for the `trim` strategy's verbatim tail. */
const TRIM_SEGMENT_MAX = 1e3;
/** Bound a string to `max` characters (Unicode-safe slice + ellipsis). */
function bound$1(input, max) {
	if (input.length <= max) return input;
	return `${input.slice(0, max)}…`;
}
/** Join the text blocks of one content array, skipping reasoning/tool noise. */
function textOfBlocks(blocks) {
	if (!Array.isArray(blocks)) return "";
	const parts = [];
	for (const block of blocks) {
		if (block === null || typeof block !== "object") continue;
		const record = block;
		if (record.type === "text" && typeof record.text === "string" && record.text !== "") parts.push(record.text);
	}
	return parts.join("\n");
}
/** Extract the semantic text of one surface event ('' when non-text). */
function textOfEvent(event) {
	switch (event.type) {
		case "user/message": {
			const data = event.data;
			const kind = data.source?.kind;
			if (kind !== void 0 && kind !== "user") return "";
			return textOfBlocks(data.content);
		}
		case "assistant/message": {
			const data = event.data;
			return textOfBlocks(data.message?.content);
		}
		default: return "";
	}
}
/** The role of one surface event ('assistant' for anything non-user). */
function roleOfEvent(event) {
	return event.type === "user/message" ? "user" : "assistant";
}
/**
* Fold the surface into ordered user/assistant segments (newest-last).
* @param events - current surface events in model-history order.
*/
function extractSegments(events) {
	const segments = [];
	for (const event of events) {
		const text = textOfEvent(event);
		if (text !== "") segments.push({
			role: roleOfEvent(event),
			text
		});
	}
	return segments;
}
/** Split segments into the EARLIER background and the RECENT verbatim window. */
function splitRecent(segments, recentCount) {
	const count = Math.max(0, recentCount);
	const recent = segments.slice(Math.max(0, segments.length - count));
	return {
		earlier: segments.slice(0, Math.max(0, segments.length - count)),
		recent
	};
}
/**
* Render segments as role-labeled, turn-separated text (the model input for
* the background, or the verbatim recent window).
*/
function formatSegments(segments, maxPerSegment, locale = "zh") {
	const prompts = promptsOf(locale);
	return segments.map((segment) => `${segment.role === "user" ? prompts.roleUser : prompts.roleAssistant}${bound$1(segment.text, maxPerSegment)}`).join("\n\n");
}
/**
* The `trim` strategy's injected context: the last `count` segments VERBATIM
* (role-labeled, per-segment bounded) — deterministic, zero LLM cost. A count
* of 0 or negative yields an empty string; a count ≥ the segment count keeps
* the whole tail.
*/
function buildTrimContext(segments, count, maxPerSegment = TRIM_SEGMENT_MAX, locale = "zh") {
	const take = Math.max(0, count);
	return formatSegments(segments.slice(Math.max(0, segments.length - take)), maxPerSegment, locale);
}
/**
* Render the EARLIER background window for the model, NEWEST-FIRST. We want
* the current progress (the tail of the earlier window — the messages just
* before the verbatim recent band) to land at the model's strongest attention
* position, instead of a flat chronological wall that ends with the opening
* topic. The newest `count` of `earlier` are taken and reversed.
*/
function formatBackground(earlier, count, maxPerSegment, locale = "zh") {
	const take = Math.max(0, count);
	return formatSegments(earlier.slice(Math.max(0, earlier.length - take)).reverse(), maxPerSegment, locale);
}
/**
* Compose the final injected context: the model-compressed background plus the
* verbatim recent window. Either part may be absent.
*/
function composeSummary(background, recent, locale = "zh") {
	const prompts = promptsOf(locale);
	const parts = [];
	if (background.trim() !== "") parts.push(`${prompts.sectionBackground}\n${background}`);
	if (recent.trim() !== "") parts.push(`${prompts.sectionRecent}\n${recent}`);
	return parts.join("\n\n");
}
/**
* Accumulate the text deltas of one model stream until the terminal finish.
* @param chunks - the `ctx.llm.stream` chunk iterable.
* @returns the assembled text and whether the call errored or was aborted.
*/
async function assembleText(chunks) {
	let text = "";
	let failed = false;
	for await (const chunk of chunks) if (chunk.type === "text-delta") text += chunk.text;
	else if (chunk.type === "finish") {
		const kind = chunk.reason.kind;
		if (kind === "error" || kind === "aborted") failed = true;
	}
	return {
		text,
		failed
	};
}
/**
* The system prompt for the background compression. It only ever sees the
* EARLIER part; the recent state is handled verbatim elsewhere. The prompt
* forces a done/current/pending split so an early instruction already carried
* out (e.g. "生成计划" before the plan was actually produced) is never
* reported as a pending task.
*
* The input is handed NEWEST-FIRST (see the background helper in index.ts), so
* the current progress sits at the model's strongest attention position. The
* prompt mirrors that ordering and tells the model to anchor on the newest
* state first, not on the opening topic.
*/
function backgroundSystem(locale = "zh") {
	return promptsOf(locale).backgroundSystem;
}
/** The zh system prompt — the pre-i18n constant, kept for callers and tests
*  that predate the locale parameter. */
const BACKGROUND_SYSTEM = backgroundSystem("zh");
//#endregion
//#region src/trust-fence.ts
function header(headers, name) {
	const value = headers[name];
	return typeof value === "string" ? value : void 0;
}
/** Normalized URL of a Host-header authority, or undefined when unparsable. */
function parseAuthority(authority) {
	try {
		return new URL(`http://${authority}`);
	} catch {
		return;
	}
}
/** Whether a normalized URL hostname names the local loopback authority. */
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
/** Canonical authority form: hostname, or hostname:port when a port was written. */
function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}
/** Whether the request authority matches a trustedHosts entry (exact or port-less). */
function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		const entryUrl = parseAuthority(entry);
		if (entryUrl === void 0) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname ? entryUrl.hostname === hostUrl.hostname : entryUrl.host === hostUrl.host;
	});
}
/**
* Decide whether one request may reach the plugin routes.
* @param request - node HTTP request facts (headers).
* @param trustedHosts - non-loopback authorities this deployment serves.
* @returns true when the Host is ours (loopback or trusted) and browser markers are same-origin.
*/
function isTrustedApiRequest(request, trustedHosts) {
	const host = header(request.headers, "host");
	if (host === void 0) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === void 0) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (header(request.headers, "sec-fetch-site") === "cross-site") return false;
	const origin = header(request.headers, "origin");
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
//#endregion
//#region src/wire.ts
/** One API failure with its wire code and HTTP status. */
var SidebarqaError = class extends Error {
	code;
	status;
	constructor(code, message, status = 400) {
		super(message);
		this.code = code;
		this.status = status;
	}
};
/** Body size bound of one JSON request (defense against unbounded reads). */
const MAX_BODY_BYTES = 1 << 20;
/** Read and parse the JSON request body (bounded; malformed → bad-request). */
async function readJsonBody(req) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
		total += buffer.length;
		if (total > MAX_BODY_BYTES) throw new SidebarqaError("bad-request", "request body too large");
		chunks.push(buffer);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text.trim() === "") return {};
	try {
		return JSON.parse(text);
	} catch {
		throw new SidebarqaError("bad-request", "request body is not valid JSON");
	}
}
/** Write a JSON response with the given status. */
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(payload);
}
/** Write the success envelope. */
function writeOk(res, value) {
	writeJson(res, 200, {
		ok: true,
		value
	});
}
/** Write the failure envelope for any thrown value (unknown → internal 500). */
function writeError(res, error) {
	if (error instanceof SidebarqaError) {
		writeJson(res, error.status, {
			ok: false,
			error: {
				code: error.code,
				message: error.message
			}
		});
		return;
	}
	writeJson(res, 500, {
		ok: false,
		error: {
			code: "internal",
			message: error instanceof Error ? error.message : String(error)
		}
	});
}
/** Narrow an unknown payload value to a string, else throw bad-request. */
function requireString(payload, key) {
	const value = payload?.[key];
	if (typeof value !== "string" || value === "") throw new SidebarqaError("bad-request", `missing or invalid "${key}"`);
	return value;
}
//#endregion
//#region src/title.ts
/**
* Pure helpers for the post-answer retitle flow: the strict "title-only"
* system prompt, the Q+A input framing with a truncation budget, and
* UTF-8-safe title normalization. The normalization rules mirror DSH's
* session-title package (control-sequence stripping + UTF-8 byte truncation
* that never splits a code point), copied here so a third-party plugin
* resolves outside the DSH monorepo without a runtime value import. Kept
* dependency-free (TextEncoder only) for unit testing and shared by both the
* host title route and the client input builder.
*
* The prompt text itself lives in `prompt-locale.ts`; the locale enters as a
* trailing parameter defaulting to `'zh'`, so pre-i18n callers are unaffected.
*/
/**
* System prompt: emit ONLY the title, plain single line, with a dual budget
* (≤15 CJK chars / ≤6 words). It tells the model to use the language of the
* question and answer — the title follows the CONTENT, not the UI language.
* @param locale - which language the instruction itself is written in.
*/
function titleSystem(locale = "zh") {
	return promptsOf(locale).titleSystem;
}
/** The zh system prompt — the pre-i18n constant, kept for callers and tests
*  that predate the locale parameter. */
const TITLE_SYSTEM = titleSystem("zh");
/** Max chars of the answer part admitted into the title input. */
const TITLE_ANSWER_MAX = 1200;
/** Defensive cap on the whole input the host hands to the model. */
const TITLE_INPUT_MAX = 4e3;
/** Operating-system-command escape sequences, including unterminated tails. */
const OSC_SEQUENCE = /(?:\u001B\]|\u009D)(?:(?!\u0007|\u001B\\)[\s\S])*(?:\u0007|\u001B\\|$)/gu;
/** Control-sequence-introducer escapes such as SGR color codes. */
const CSI_SEQUENCE = /(?:\u001B\[|\u009B)[0-?]*[ -/]*[@-~]/gu;
/** Remaining two-byte ESC control sequences. */
const ESC_SEQUENCE = /\u001B[@-_]/gu;
/** Non-whitespace C0/C1 control characters. */
const CONTROL_CHARACTER = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;
/** Directional and invisible controls that can make a displayed title deceptive. */
const DIRECTIONAL_CONTROL = /[\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/gu;
/** UTF-8 byte length of a string (TextEncoder is global in Node and browsers). */
function utf8Length(input) {
	return new TextEncoder().encode(input).length;
}
/** Bound a string to `max` characters with an ellipsis (Unicode-safe slice). */
function bound(input, max) {
	if (input.length <= max) return input;
	return `${input.slice(0, max)}…`;
}
/**
* Truncate a string to a UTF-8 byte budget without splitting a Unicode code
* point.
*/
function truncateTitleUtf8(input, maxBytes) {
	if (utf8Length(input) <= maxBytes) return input;
	let used = 0;
	let output = "";
	for (const character of input) {
		const bytes = utf8Length(character);
		if (used + bytes > maxBytes) break;
		output += character;
		used += bytes;
	}
	return output;
}
/**
* Normalize one model-produced title: strip terminal/control/invisible
* sequences, collapse whitespace to a single trimmed line, and enforce the
* UTF-8 byte budget.
*/
function normalizeTitle(input, maxBytes) {
	return truncateTitleUtf8(input.replace(OSC_SEQUENCE, "").replace(CSI_SEQUENCE, "").replace(ESC_SEQUENCE, "").replace(CONTROL_CHARACTER, "").replace(DIRECTIONAL_CONTROL, "").replace(/\s+/gu, " ").trim(), maxBytes).trimEnd();
}
/**
* Build the labeled `question / answer` input for the title model, each part
* bounded. The labels are the ones `titleSystem` refers to, so both come from
* the same bundle.
*/
function buildTitleInput(question, answer, locale = "zh") {
	const prompts = promptsOf(locale);
	const parts = [];
	if (question.trim() !== "") parts.push(`${prompts.titleQuestionLabel}${bound(question, 400)}`);
	if (answer.trim() !== "") parts.push(`${prompts.titleAnswerLabel}${bound(answer, TITLE_ANSWER_MAX)}`);
	return parts.join("\n");
}
/** Defensive whole-input cap for the host route (idempotent with the framing). */
function boundTitleInput(input) {
	return bound(input, TITLE_INPUT_MAX);
}
//#endregion
//#region src/index.ts
/** Plugin identity for cordis.yml rows. */
const name = "dsh-sidebar-qa";
/** Services required before mounting: the webserver routes, the session query engine, the llm runtime, and the loader's connection row (trust fence). */
const inject = [
	"webServer",
	"sessionQuery",
	"llm",
	"loader"
];
/** How long a summarize call may run before degrading. */
const SUMMARIZE_TIMEOUT_MS = 8e3;
/** How long a title call may run before degrading. */
const TITLE_TIMEOUT_MS = 8e3;
/** Generate a unique message id for a hand-built llm message. */
function randomId() {
	const cryptoLike = globalThis.crypto;
	if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();
	return `sq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
/** Build a user-role message carrying the surface text. */
function userMessage(text) {
	return {
		id: randomId(),
		role: "user",
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "plugin",
			plugin: "dsh-sidebar-qa"
		}
	};
}
/** The connection row's resolved trustedHosts (live read; the /api fence's own list). */
function trustedHostsOf(ctx) {
	for (const entry of ctx.loader.entries()) if (entry.options.name === "connection") return entry.options.config?.trustedHosts ?? [];
	return [];
}
/** Build the API method table bound to the plugin context and its cache. */
function buildApi(ctx, getConfig, cache, getConfigFace) {
	return {
		config: () => getConfig(),
		catalog: async () => {
			const providers = ctx.llm.listProviders().map(async (provider) => {
				let models = [];
				try {
					models = await ctx.llm.listModels(provider.id);
				} catch {}
				return {
					provider: provider.id,
					displayName: provider.name,
					models
				};
			});
			return { providers: await Promise.all(providers) };
		},
		"config.get": () => {
			return getConfigFace()?.get() ?? {
				value: getConfig(),
				revision: void 0
			};
		},
		"config.update": async (payload) => {
			const face = getConfigFace();
			if (face === void 0) throw new SidebarqaError("settings-rejected", "the settings service is not mounted in this deployment", 503);
			const record = payload;
			const patch = record?.patch;
			if (patch === null || typeof patch !== "object" || Array.isArray(patch)) throw new SidebarqaError("bad-request", "patch must be a plain object");
			const expectedRevision = typeof record?.expectedRevision === "number" ? record.expectedRevision : void 0;
			try {
				return await face.update(patch, expectedRevision);
			} catch (error) {
				if (error.code === "SETTINGS_CONFLICT") throw new SidebarqaError("settings-conflict", error instanceof Error ? error.message : String(error), 409);
				throw new SidebarqaError("settings-rejected", error instanceof Error ? error.message : String(error), 400);
			}
		},
		context: async (payload) => {
			const mainSessionId = requireString(payload, "mainSessionId");
			const record = payload;
			const locale = promptLocaleOf(record.locale);
			const config = getConfig();
			const strategy = record.strategy === "inherit" || record.strategy === "trim" ? record.strategy : "compressed";
			if (strategy === "inherit") return {
				degraded: false,
				text: null,
				sourceSeq: -1
			};
			const provider = typeof record.provider === "string" && record.provider !== "" ? record.provider : config.summarizeProvider;
			const model = typeof record.model === "string" && record.model !== "" ? record.model : config.summarizeModel;
			const budgetTokens = typeof record.budgetTokens === "number" && Number.isInteger(record.budgetTokens) && record.budgetTokens > 0 ? record.budgetTokens : config.summarizeBudgetTokens;
			const surface = await ctx.sessionQuery.readSurface(mainSessionId);
			const sourceSeq = surface.capturedThroughSeq ?? -1;
			if (strategy === "trim") {
				const text = buildTrimContext(extractSegments(surface.events), config.trimWindowMessages, void 0, locale);
				if (text === "") return {
					degraded: true,
					text: null,
					sourceSeq,
					reason: "empty-surface"
				};
				return {
					degraded: false,
					text,
					sourceSeq
				};
			}
			const cacheKey = `${strategy}:${locale}:${mainSessionId}`;
			const cached = cache.get(cacheKey);
			if (cached !== void 0 && cached.sourceSeq === sourceSeq) return {
				degraded: false,
				text: cached.summary,
				sourceSeq
			};
			const { earlier, recent } = splitRecent(extractSegments(surface.events), config.recentWindowMessages);
			const recentText = formatSegments(recent, 400, locale);
			const earlierText = formatBackground(earlier, config.backgroundWindowMessages, 400, locale);
			let background = "";
			if (earlierText.trim() !== "" && provider !== "") try {
				const assembled = await assembleText(ctx.llm.stream({
					provider,
					model,
					messages: [userMessage(earlierText)],
					system: backgroundSystem(locale),
					maxTokens: budgetTokens,
					reasoningEffort: config.summarizeReasoningEffort,
					signal: AbortSignal.timeout(SUMMARIZE_TIMEOUT_MS)
				}));
				if (!assembled.failed) background = assembled.text.trim();
			} catch {}
			const text = composeSummary(background, recentText, locale);
			if (text.trim() === "") return {
				degraded: true,
				text: null,
				sourceSeq,
				reason: "empty-surface"
			};
			cache.set(cacheKey, {
				sourceSeq,
				summary: text
			});
			return {
				degraded: false,
				text,
				sourceSeq
			};
		},
		title: async (payload) => {
			const text = requireString(payload, "text");
			const record = payload;
			const locale = promptLocaleOf(record.locale);
			const config = getConfig();
			const provider = typeof record.provider === "string" && record.provider !== "" ? record.provider : config.summarizeProvider;
			const model = typeof record.model === "string" && record.model !== "" ? record.model : config.summarizeModel;
			const budgetTokens = typeof record.budgetTokens === "number" && Number.isInteger(record.budgetTokens) && record.budgetTokens > 0 ? record.budgetTokens : config.titleBudgetTokens;
			if (provider === "") return {
				degraded: true,
				title: null,
				reason: "no-provider"
			};
			try {
				const assembled = await assembleText(ctx.llm.stream({
					provider,
					model,
					messages: [userMessage(boundTitleInput(text))],
					system: titleSystem(locale),
					maxTokens: budgetTokens,
					reasoningEffort: config.summarizeReasoningEffort,
					signal: AbortSignal.timeout(TITLE_TIMEOUT_MS)
				}));
				if (assembled.failed || assembled.text.trim() === "") return {
					degraded: true,
					title: null,
					reason: assembled.failed ? "stream" : "empty"
				};
				const title = normalizeTitle(assembled.text, 60);
				if (title === "") return {
					degraded: true,
					title: null,
					reason: "empty-title"
				};
				return {
					degraded: false,
					title
				};
			} catch {
				return {
					degraded: true,
					title: null,
					reason: "error"
				};
			}
		}
	};
}
/**
* Plugin body: mount the fenced route and the optional settings namespace.
* @param ctx - host plugin context (webServer, sessionQuery, llm, loader).
*/
function apply(ctx) {
	const fence = (req) => isTrustedApiRequest(req, trustedHostsOf(ctx));
	let configScope;
	let configFace;
	ctx.inject(["settings"], (sctx) => {
		const settingsService = sctx.settings;
		try {
			configScope = settingsService.register(SIDEBARQA_SETTINGS_NS, SidebarqaPrefsSchema);
			const viewOf = () => {
				const descriptor = settingsService.describe({ redactSecrets: true }).find((candidate) => candidate.ns === SIDEBARQA_SETTINGS_NS);
				return descriptor === void 0 ? {
					value: void 0,
					revision: void 0
				} : {
					value: descriptor.value,
					revision: descriptor.revision
				};
			};
			configFace = {
				get: viewOf,
				update: async (patch, expectedRevision) => {
					await settingsService.update(SIDEBARQA_SETTINGS_NS, patch, expectedRevision);
					return viewOf();
				}
			};
		} catch (error) {
			console.warn("[dsh-sidebar-qa] settings registration failed; using defaults:", error);
		}
	});
	const getConfig = () => {
		try {
			return configScope?.get() ?? SIDEBARQA_DEFAULTS;
		} catch {
			return SIDEBARQA_DEFAULTS;
		}
	};
	const api = buildApi(ctx, getConfig, /* @__PURE__ */ new Map(), () => configFace);
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/sidebarqa/api",
		handler: async (req, res) => {
			if (!fence(req)) {
				writeJson(res, 403, {
					ok: false,
					error: {
						code: "forbidden",
						message: "forbidden"
					}
				});
				return;
			}
			if (req.method !== "POST") {
				writeJson(res, 405, {
					ok: false,
					error: {
						code: "method-error",
						message: "method not allowed"
					}
				});
				return;
			}
			const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
			const method = pathname.startsWith("/sidebarqa/api/") ? pathname.slice(15) : void 0;
			if (method === void 0 || method.includes("/")) {
				writeError(res, new SidebarqaError("not-found", "unknown sidebarqa API method", 404));
				return;
			}
			try {
				const payload = await readJsonBody(req);
				const handler = api[method];
				if (handler === void 0) throw new SidebarqaError("not-found", `unknown sidebarqa API method "${method}"`, 404);
				writeOk(res, await handler(payload));
			} catch (error) {
				writeError(res, error);
			}
		}
	}), "dsh-sidebar-qa: /sidebarqa/api routes");
}
//#endregion
export { BACKGROUND_SYSTEM, PROMPTS, QUESTION_LABELS, SIDEBARQA_DEFAULTS, SIDEBARQA_SETTINGS_NS, TITLE_SYSTEM, apply, assembleText, backgroundSystem, boundTitleInput, buildTitleInput, buildTrimContext, composeSummary, extractSegments, formatBackground, formatSegments, inject, name, normalizeTitle, promptLocaleOf, promptsOf, splitRecent, textOfEvent, titleSystem, truncateTitleUtf8 };
