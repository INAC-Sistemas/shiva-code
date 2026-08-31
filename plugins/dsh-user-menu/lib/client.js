window.__ModuleLoader__.load({
	id: "dsh-user-menu",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp$22 = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __exportAll = (all, no_symbols) => {
			let target = {};
			for (var name in all) __defProp$22(target, name, {
				get: all[name],
				enumerable: true
			});
			if (!no_symbols) __defProp$22(target, Symbol.toStringTag, { value: "Module" });
			return target;
		};
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp$22(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp$22(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp$22({}, "__esModule", { value: true }), mod);
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		react_dom = __toESM(react_dom, 1);
		//#region ../../node_modules/.pnpm/@radix-ui+primitive@1.1.7/node_modules/@radix-ui/primitive/dist/index.mjs
		var __defProp$21 = Object.defineProperty;
		var __name$21 = (target, value) => __defProp$21(target, "name", {
			value,
			configurable: true
		});
		var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
		function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
			return /* @__PURE__ */ __name$21(function handleEvent(event) {
				originalEventHandler?.(event);
				if (checkForDefaultPrevented === false || !event || !event.defaultPrevented) return ourEventHandler?.(event);
			}, "handleEvent");
		}
		__name$21(composeEventHandlers, "composeEventHandlers");
		function getOwnerWindow(element) {
			if (!canUseDOM) throw new Error("Cannot access window outside of the DOM");
			return element?.ownerDocument?.defaultView ?? window;
		}
		__name$21(getOwnerWindow, "getOwnerWindow");
		function getOwnerDocument(element) {
			if (!canUseDOM) throw new Error("Cannot access document outside of the DOM");
			return element?.ownerDocument ?? document;
		}
		__name$21(getOwnerDocument, "getOwnerDocument");
		function getActiveElement(node, activeDescendant = false) {
			const { activeElement } = getOwnerDocument(node);
			if (!activeElement?.nodeName) return null;
			if (isFrame(activeElement) && activeElement.contentDocument) return getActiveElement(activeElement.contentDocument.body, activeDescendant);
			if (activeDescendant) {
				const id = activeElement.getAttribute("aria-activedescendant");
				if (id) {
					const element = getOwnerDocument(activeElement).getElementById(id);
					if (element) return element;
				}
			}
			return activeElement;
		}
		__name$21(getActiveElement, "getActiveElement");
		function isFrame(element) {
			return element.tagName === "IFRAME";
		}
		__name$21(isFrame, "isFrame");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.5_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
		var __defProp$20 = Object.defineProperty;
		var __name$20 = (target, value) => __defProp$20(target, "name", {
			value,
			configurable: true
		});
		function setRef$1(ref, value) {
			if (typeof ref === "function") return ref(value);
			else if (ref !== null && ref !== void 0) ref.current = value;
		}
		__name$20(setRef$1, "setRef");
		function composeRefs(...refs) {
			return (node) => {
				let hasCleanup = false;
				const cleanups = refs.map((ref) => {
					const cleanup = setRef$1(ref, node);
					if (!hasCleanup && typeof cleanup == "function") hasCleanup = true;
					return cleanup;
				});
				if (hasCleanup) return () => {
					for (let i = 0; i < cleanups.length; i++) {
						const cleanup = cleanups[i];
						if (typeof cleanup == "function") cleanup();
						else setRef$1(refs[i], null);
					}
				};
			};
		}
		__name$20(composeRefs, "composeRefs");
		function useComposedRefs(...refs) {
			return react.useCallback(composeRefs(...refs), refs);
		}
		__name$20(useComposedRefs, "useComposedRefs");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-context@1.2.2_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-context/dist/index.mjs
		var __defProp$19 = Object.defineProperty;
		var __name$19 = (target, value) => __defProp$19(target, "name", {
			value,
			configurable: true
		});
		// @__NO_SIDE_EFFECTS__
		function createContext2(rootComponentName, defaultContext) {
			const Context = react.createContext(defaultContext);
			Context.displayName = rootComponentName + "Context";
			const Provider = /* @__PURE__ */ __name$19((props) => {
				const { children, ...context } = props;
				const value = react.useMemo(() => context, Object.values(context));
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Context.Provider, {
					value,
					children
				});
			}, "Provider");
			Provider.displayName = rootComponentName + "Provider";
			function useContext2(consumerName, options = {}) {
				const { optional = false } = options;
				const context = react.useContext(Context);
				if (context) return context;
				if (defaultContext !== void 0) return defaultContext;
				if (optional) return void 0;
				throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
			}
			__name$19(useContext2, "useContext");
			return [Provider, useContext2];
		}
		__name$19(createContext2, "createContext");
		// @__NO_SIDE_EFFECTS__
		function createContextScope(scopeName, createContextScopeDeps = []) {
			let defaultContexts = [];
			function createContext3(rootComponentName, defaultContext) {
				const BaseContext = react.createContext(defaultContext);
				BaseContext.displayName = rootComponentName + "Context";
				const index = defaultContexts.length;
				defaultContexts = [...defaultContexts, defaultContext];
				const Provider = /* @__PURE__ */ __name$19((props) => {
					const { scope, children, ...context } = props;
					const Context = scope?.[scopeName]?.[index] || BaseContext;
					const value = react.useMemo(() => context, Object.values(context));
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Context.Provider, {
						value,
						children
					});
				}, "Provider");
				Provider.displayName = rootComponentName + "Provider";
				function useContext2(consumerName, scope, options = {}) {
					const { optional = false } = options;
					const Context = scope?.[scopeName]?.[index] || BaseContext;
					const context = react.useContext(Context);
					if (context) return context;
					if (defaultContext !== void 0) return defaultContext;
					if (optional) return void 0;
					throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
				}
				__name$19(useContext2, "useContext");
				return [Provider, useContext2];
			}
			__name$19(createContext3, "createContext");
			const createScope = /* @__PURE__ */ __name$19(() => {
				const scopeContexts = defaultContexts.map((defaultContext) => {
					return react.createContext(defaultContext);
				});
				return /* @__PURE__ */ __name$19(function useScope(scope) {
					const contexts = scope?.[scopeName] || scopeContexts;
					return react.useMemo(() => ({ [`__scope${scopeName}`]: {
						...scope,
						[scopeName]: contexts
					} }), [scope, contexts]);
				}, "useScope");
			}, "createScope");
			createScope.scopeName = scopeName;
			return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
		}
		__name$19(createContextScope, "createContextScope");
		function composeContextScopes(...scopes) {
			const baseScope = scopes[0];
			if (scopes.length === 1) return baseScope;
			const createScope = /* @__PURE__ */ __name$19(() => {
				const scopeHooks = scopes.map((createScope2) => ({
					useScope: createScope2(),
					scopeName: createScope2.scopeName
				}));
				return /* @__PURE__ */ __name$19(function useComposedScopes(overrideScopes) {
					const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
						const currentScope = useScope(overrideScopes)[`__scope${scopeName}`];
						return {
							...nextScopes2,
							...currentScope
						};
					}, {});
					return react.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
				}, "useComposedScopes");
			}, "createScope");
			createScope.scopeName = baseScope.scopeName;
			return createScope;
		}
		__name$19(composeContextScopes, "composeContextScopes");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-layout-effect@1.1.4_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
		var useLayoutEffect2 = globalThis?.document ? react.useLayoutEffect : () => {};
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-effect-event@0.0.5_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-effect-event/dist/index.mjs
		var __defProp$18 = Object.defineProperty;
		var __name$18 = (target, value) => __defProp$18(target, "name", {
			value,
			configurable: true
		});
		var useReactEffectEvent = react[" useEffectEvent ".trim().toString()];
		var useReactInsertionEffect = react[" useInsertionEffect ".trim().toString()];
		function useEffectEvent(callback) {
			if (typeof useReactEffectEvent === "function") return useReactEffectEvent(callback);
			const ref = react.useRef(() => {
				throw new Error("Cannot call an event handler while rendering.");
			});
			if (typeof useReactInsertionEffect === "function") useReactInsertionEffect(() => {
				ref.current = callback;
			});
			else useLayoutEffect2(() => {
				ref.current = callback;
			});
			return react.useMemo(() => ((...args) => ref.current?.(...args)), []);
		}
		__name$18(useEffectEvent, "useEffectEvent");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-controllable-state@1.2.6_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
		var __defProp$17 = Object.defineProperty;
		var __name$17 = (target, value) => __defProp$17(target, "name", {
			value,
			configurable: true
		});
		var useInsertionEffect = react[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
		function useControllableState({ prop, defaultProp, onChange = /* @__PURE__ */ __name$17(() => {}, "onChange"), caller }) {
			const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState({
				defaultProp,
				onChange
			});
			const isControlled = prop !== void 0;
			return [isControlled ? prop : uncontrolledProp, react.useCallback((nextValue) => {
				if (isControlled) {
					const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
					if (value2 !== prop) onChangeRef.current?.(value2);
				} else setUncontrolledProp(nextValue);
			}, [
				isControlled,
				prop,
				setUncontrolledProp,
				onChangeRef
			])];
		}
		__name$17(useControllableState, "useControllableState");
		function useUncontrolledState({ defaultProp, onChange }) {
			const [value, setValue] = react.useState(defaultProp);
			const prevValueRef = react.useRef(value);
			const onChangeRef = react.useRef(onChange);
			useInsertionEffect(() => {
				onChangeRef.current = onChange;
			}, [onChange]);
			react.useEffect(() => {
				if (prevValueRef.current !== value) {
					onChangeRef.current?.(value);
					prevValueRef.current = value;
				}
			}, [value, prevValueRef]);
			return [
				value,
				setValue,
				onChangeRef
			];
		}
		__name$17(useUncontrolledState, "useUncontrolledState");
		function isFunction(value) {
			return typeof value === "function";
		}
		__name$17(isFunction, "isFunction");
		var SYNC_STATE = Symbol("RADIX:SYNC_STATE");
		function useControllableStateReducer(reducer, userArgs, initialArg, init) {
			const { prop: controlledState, defaultProp, onChange: onChangeProp, caller } = userArgs;
			const isControlled = controlledState !== void 0;
			const onChange = useEffectEvent(onChangeProp);
			const args = [{
				...initialArg,
				state: defaultProp
			}];
			if (init) args.push(init);
			const [internalState, dispatch] = react.useReducer((state2, action) => {
				if (action.type === SYNC_STATE) return {
					...state2,
					state: action.state
				};
				const next = reducer(state2, action);
				if (isControlled && !Object.is(next.state, state2.state)) onChange(next.state);
				return next;
			}, ...args);
			const uncontrolledState = internalState.state;
			const prevValueRef = react.useRef(uncontrolledState);
			react.useEffect(() => {
				if (prevValueRef.current !== uncontrolledState) {
					prevValueRef.current = uncontrolledState;
					if (!isControlled) onChange(uncontrolledState);
				}
			}, [
				uncontrolledState,
				prevValueRef,
				isControlled
			]);
			const state = react.useMemo(() => {
				if (controlledState !== void 0) return {
					...internalState,
					state: controlledState
				};
				return internalState;
			}, [internalState, controlledState]);
			react.useEffect(() => {
				if (isControlled && !Object.is(controlledState, internalState.state)) dispatch({
					type: SYNC_STATE,
					state: controlledState
				});
			}, [
				controlledState,
				internalState.state,
				isControlled
			]);
			return [state, dispatch];
		}
		__name$17(useControllableStateReducer, "useControllableStateReducer");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-slot@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-slot/dist/index.mjs
		var __defProp$16 = Object.defineProperty;
		var __name$16 = (target, value) => __defProp$16(target, "name", {
			value,
			configurable: true
		});
		// @__NO_SIDE_EFFECTS__
		function createSlot(ownerName) {
			const Slot2 = react.forwardRef((props, forwardedRef) => {
				let { children, ...slotProps } = props;
				let slottableElement = null;
				let hasSlottable = false;
				const newChildren = [];
				if (isLazyComponent(children) && typeof use === "function") children = use(children._payload);
				react.Children.forEach(children, (maybeSlottable) => {
					if (isSlottable(maybeSlottable)) {
						hasSlottable = true;
						const slottable = maybeSlottable;
						let child = "child" in slottable.props ? slottable.props.child : slottable.props.children;
						if (isLazyComponent(child) && typeof use === "function") child = use(child._payload);
						slottableElement = getSlottableElementFromSlottable(slottable, child);
						newChildren.push(slottableElement?.props?.children);
					} else newChildren.push(maybeSlottable);
				});
				if (slottableElement) slottableElement = react.cloneElement(slottableElement, void 0, newChildren);
				else if (!hasSlottable && react.Children.count(children) === 1 && react.isValidElement(children)) slottableElement = children;
				const slottableElementRef = slottableElement ? getElementRef$1(slottableElement) : void 0;
				const composedRef = useComposedRefs(forwardedRef, slottableElementRef);
				if (!slottableElement) {
					if (children || children === 0) throw new Error(hasSlottable ? createSlottableError(ownerName) : createSlotError(ownerName));
					return children;
				}
				const mergedProps = mergeProps(slotProps, slottableElement.props ?? {});
				if (slottableElement.type !== react.Fragment) mergedProps.ref = forwardedRef ? composedRef : slottableElementRef;
				return react.cloneElement(slottableElement, mergedProps);
			});
			Slot2.displayName = `${ownerName}.Slot`;
			return Slot2;
		}
		__name$16(createSlot, "createSlot");
		var SLOTTABLE_IDENTIFIER = Symbol.for("radix.slottable");
		// @__NO_SIDE_EFFECTS__
		function createSlottable(ownerName) {
			const Slottable2 = /* @__PURE__ */ __name$16((props) => "child" in props ? props.children(props.child) : props.children, "Slottable");
			Slottable2.displayName = `${ownerName}.Slottable`;
			Slottable2.__radixId = SLOTTABLE_IDENTIFIER;
			return Slottable2;
		}
		__name$16(createSlottable, "createSlottable");
		var getSlottableElementFromSlottable = /* @__PURE__ */ __name$16((slottable, child) => {
			if ("child" in slottable.props) {
				const child2 = slottable.props.child;
				if (!react.isValidElement(child2)) return null;
				return react.cloneElement(child2, void 0, slottable.props.children(child2.props.children));
			}
			return react.isValidElement(child) ? child : null;
		}, "getSlottableElementFromSlottable");
		function mergeProps(slotProps, childProps) {
			const overrideProps = { ...childProps };
			for (const propName in childProps) {
				const slotPropValue = slotProps[propName];
				const childPropValue = childProps[propName];
				if (/^on[A-Z]/.test(propName)) {
					if (slotPropValue && childPropValue) overrideProps[propName] = (...args) => {
						const result = childPropValue(...args);
						slotPropValue(...args);
						return result;
					};
					else if (slotPropValue) overrideProps[propName] = slotPropValue;
				} else if (propName === "style") overrideProps[propName] = {
					...slotPropValue,
					...childPropValue
				};
				else if (propName === "className") overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
			}
			return {
				...slotProps,
				...overrideProps
			};
		}
		__name$16(mergeProps, "mergeProps");
		function getElementRef$1(element) {
			let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
			let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
			if (mayWarn) return element.ref;
			getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
			mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
			if (mayWarn) return element.props.ref;
			return element.props.ref || element.ref;
		}
		__name$16(getElementRef$1, "getElementRef");
		function isSlottable(child) {
			return react.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
		}
		__name$16(isSlottable, "isSlottable");
		var REACT_LAZY_TYPE = Symbol.for("react.lazy");
		function isLazyComponent(element) {
			return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
		}
		__name$16(isLazyComponent, "isLazyComponent");
		function isPromiseLike(value) {
			return typeof value === "object" && value !== null && "then" in value;
		}
		__name$16(isPromiseLike, "isPromiseLike");
		var createSlotError = /* @__PURE__ */ __name$16((ownerName) => {
			return `${ownerName} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`;
		}, "createSlotError");
		var createSlottableError = /* @__PURE__ */ __name$16((ownerName) => {
			return `${ownerName} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`;
		}, "createSlottableError");
		var use = react[" use ".trim().toString()];
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-primitive@2.1.10_@types+react-dom@18.3.7_@types+react@18.3.31__@types+r_13f2c98306b57ec3095ec9668f21e5b2/node_modules/@radix-ui/react-primitive/dist/index.mjs
		var __defProp$15 = Object.defineProperty;
		var __name$15 = (target, value) => __defProp$15(target, "name", {
			value,
			configurable: true
		});
		var Primitive = [
			"a",
			"button",
			"div",
			"form",
			"h2",
			"h3",
			"img",
			"input",
			"label",
			"li",
			"nav",
			"ol",
			"p",
			"select",
			"span",
			"svg",
			"ul"
		].reduce((primitive, node) => {
			const Slot = /* @__PURE__ */ createSlot(`Primitive.${node}`);
			const Node = react.forwardRef((props, forwardedRef) => {
				const { asChild, ...primitiveProps } = props;
				const Comp = asChild ? Slot : node;
				if (typeof window !== "undefined") window[Symbol.for("radix-ui")] = true;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Comp, {
					...primitiveProps,
					ref: forwardedRef
				});
			});
			Node.displayName = `Primitive.${node}`;
			return {
				...primitive,
				[node]: Node
			};
		}, {});
		function dispatchDiscreteCustomEvent(target, event) {
			if (target) react_dom.flushSync(() => target.dispatchEvent(event));
		}
		__name$15(dispatchDiscreteCustomEvent, "dispatchDiscreteCustomEvent");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-collection@1.1.15_@types+react-dom@18.3.7_@types+react@18.3.31__@types+_2112a96bceb6b62ecd4753f26b7fbff6/node_modules/@radix-ui/react-collection/dist/index.mjs
		var __defProp$14 = Object.defineProperty;
		var __name$14 = (target, value) => __defProp$14(target, "name", {
			value,
			configurable: true
		});
		// @__NO_SIDE_EFFECTS__
		function createCollection(name) {
			const PROVIDER_NAME = name + "CollectionProvider";
			const [createCollectionContext, createCollectionScope] = /* @__PURE__ */ createContextScope(PROVIDER_NAME);
			const [CollectionProviderImpl, useCollectionContext] = createCollectionContext(PROVIDER_NAME, {
				collectionRef: { current: null },
				itemMap: /* @__PURE__ */ new Map()
			});
			const CollectionProvider = /* @__PURE__ */ __name$14((props) => {
				const { scope, children } = props;
				const ref = react.useRef(null);
				const itemMap = react.useRef(/* @__PURE__ */ new Map()).current;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionProviderImpl, {
					scope,
					itemMap,
					collectionRef: ref,
					children
				});
			}, "CollectionProvider");
			CollectionProvider.displayName = PROVIDER_NAME;
			const COLLECTION_SLOT_NAME = name + "CollectionSlot";
			const CollectionSlotImpl = /* @__PURE__ */ createSlot(COLLECTION_SLOT_NAME);
			const CollectionSlot = react.forwardRef((props, forwardedRef) => {
				const { scope, children } = props;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionSlotImpl, {
					ref: useComposedRefs(forwardedRef, useCollectionContext(COLLECTION_SLOT_NAME, scope).collectionRef),
					children
				});
			});
			CollectionSlot.displayName = COLLECTION_SLOT_NAME;
			const ITEM_SLOT_NAME = name + "CollectionItemSlot";
			const ITEM_DATA_ATTR = "data-radix-collection-item";
			const CollectionItemSlotImpl = /* @__PURE__ */ createSlot(ITEM_SLOT_NAME);
			const CollectionItemSlot = react.forwardRef((props, forwardedRef) => {
				const { scope, children, ...itemData } = props;
				const ref = react.useRef(null);
				const composedRefs = useComposedRefs(forwardedRef, ref);
				const context = useCollectionContext(ITEM_SLOT_NAME, scope);
				react.useEffect(() => {
					context.itemMap.set(ref, {
						ref,
						...itemData
					});
					return () => void context.itemMap.delete(ref);
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionItemSlotImpl, {
					[ITEM_DATA_ATTR]: "",
					ref: composedRefs,
					children
				});
			});
			CollectionItemSlot.displayName = ITEM_SLOT_NAME;
			function useCollection(scope) {
				const context = useCollectionContext(name + "CollectionConsumer", scope);
				return react.useCallback(() => {
					const collectionNode = context.collectionRef.current;
					if (!collectionNode) return [];
					const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`));
					return Array.from(context.itemMap.values()).sort((a, b) => orderedNodes.indexOf(a.ref.current) - orderedNodes.indexOf(b.ref.current));
				}, [context.collectionRef, context.itemMap]);
			}
			__name$14(useCollection, "useCollection");
			return [
				{
					Provider: CollectionProvider,
					Slot: CollectionSlot,
					ItemSlot: CollectionItemSlot
				},
				useCollection,
				createCollectionScope
			];
		}
		__name$14(createCollection, "createCollection");
		var __instanciated = /* @__PURE__ */ new WeakMap();
		var OrderedDict = class _OrderedDict extends Map {
			static {
				__name$14(this, "OrderedDict");
			}
			#keys;
			constructor(entries) {
				super(entries);
				this.#keys = [...super.keys()];
				__instanciated.set(this, true);
			}
			set(key, value) {
				if (__instanciated.get(this)) if (this.has(key)) this.#keys[this.#keys.indexOf(key)] = key;
				else this.#keys.push(key);
				super.set(key, value);
				return this;
			}
			insert(index, key, value) {
				const has = this.has(key);
				const length = this.#keys.length;
				const relativeIndex = toSafeInteger(index);
				let actualIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
				const safeIndex = actualIndex < 0 || actualIndex >= length ? -1 : actualIndex;
				if (safeIndex === this.size || has && safeIndex === this.size - 1 || safeIndex === -1) {
					this.set(key, value);
					return this;
				}
				const size = this.size + (has ? 0 : 1);
				if (relativeIndex < 0) actualIndex++;
				const keys = [...this.#keys];
				let nextValue;
				let shouldSkip = false;
				for (let i = actualIndex; i < size; i++) if (actualIndex === i) {
					let nextKey = keys[i];
					if (keys[i] === key) nextKey = keys[i + 1];
					if (has) this.delete(key);
					nextValue = this.get(nextKey);
					this.set(key, value);
				} else {
					if (!shouldSkip && keys[i - 1] === key) shouldSkip = true;
					const currentKey = keys[shouldSkip ? i : i - 1];
					const currentValue = nextValue;
					nextValue = this.get(currentKey);
					this.delete(currentKey);
					this.set(currentKey, currentValue);
				}
				return this;
			}
			with(index, key, value) {
				const copy = new _OrderedDict(this);
				copy.insert(index, key, value);
				return copy;
			}
			before(key) {
				const index = this.#keys.indexOf(key) - 1;
				if (index < 0) return;
				return this.entryAt(index);
			}
			/**
			* Sets a new key-value pair at the position before the given key.
			*/
			setBefore(key, newKey, value) {
				const index = this.#keys.indexOf(key);
				if (index === -1) return this;
				return this.insert(index, newKey, value);
			}
			after(key) {
				let index = this.#keys.indexOf(key);
				index = index === -1 || index === this.size - 1 ? -1 : index + 1;
				if (index === -1) return;
				return this.entryAt(index);
			}
			/**
			* Sets a new key-value pair at the position after the given key.
			*/
			setAfter(key, newKey, value) {
				const index = this.#keys.indexOf(key);
				if (index === -1) return this;
				return this.insert(index + 1, newKey, value);
			}
			first() {
				return this.entryAt(0);
			}
			last() {
				return this.entryAt(-1);
			}
			clear() {
				this.#keys = [];
				return super.clear();
			}
			delete(key) {
				const deleted = super.delete(key);
				if (deleted) this.#keys.splice(this.#keys.indexOf(key), 1);
				return deleted;
			}
			deleteAt(index) {
				const key = this.keyAt(index);
				if (key !== void 0) return this.delete(key);
				return false;
			}
			at(index) {
				const key = at(this.#keys, index);
				if (key !== void 0) return this.get(key);
			}
			entryAt(index) {
				const key = at(this.#keys, index);
				if (key !== void 0) return [key, this.get(key)];
			}
			indexOf(key) {
				return this.#keys.indexOf(key);
			}
			keyAt(index) {
				return at(this.#keys, index);
			}
			from(key, offset) {
				const index = this.indexOf(key);
				if (index === -1) return;
				let dest = index + offset;
				if (dest < 0) dest = 0;
				if (dest >= this.size) dest = this.size - 1;
				return this.at(dest);
			}
			keyFrom(key, offset) {
				const index = this.indexOf(key);
				if (index === -1) return;
				let dest = index + offset;
				if (dest < 0) dest = 0;
				if (dest >= this.size) dest = this.size - 1;
				return this.keyAt(dest);
			}
			find(predicate, thisArg) {
				let index = 0;
				for (const entry of this) {
					if (Reflect.apply(predicate, thisArg, [
						entry,
						index,
						this
					])) return entry;
					index++;
				}
			}
			findIndex(predicate, thisArg) {
				let index = 0;
				for (const entry of this) {
					if (Reflect.apply(predicate, thisArg, [
						entry,
						index,
						this
					])) return index;
					index++;
				}
				return -1;
			}
			filter(predicate, thisArg) {
				const entries = [];
				let index = 0;
				for (const entry of this) {
					if (Reflect.apply(predicate, thisArg, [
						entry,
						index,
						this
					])) entries.push(entry);
					index++;
				}
				return new _OrderedDict(entries);
			}
			map(callbackfn, thisArg) {
				const entries = [];
				let index = 0;
				for (const entry of this) {
					entries.push([entry[0], Reflect.apply(callbackfn, thisArg, [
						entry,
						index,
						this
					])]);
					index++;
				}
				return new _OrderedDict(entries);
			}
			reduce(...args) {
				const [callbackfn, initialValue] = args;
				let index = 0;
				let accumulator = initialValue ?? this.at(0);
				for (const entry of this) {
					if (index === 0 && args.length === 1) accumulator = entry;
					else accumulator = Reflect.apply(callbackfn, this, [
						accumulator,
						entry,
						index,
						this
					]);
					index++;
				}
				return accumulator;
			}
			reduceRight(...args) {
				const [callbackfn, initialValue] = args;
				let accumulator = initialValue ?? this.at(-1);
				for (let index = this.size - 1; index >= 0; index--) {
					const entry = this.at(index);
					if (index === this.size - 1 && args.length === 1) accumulator = entry;
					else accumulator = Reflect.apply(callbackfn, this, [
						accumulator,
						entry,
						index,
						this
					]);
				}
				return accumulator;
			}
			toSorted(compareFn) {
				return new _OrderedDict([...this.entries()].sort(compareFn));
			}
			toReversed() {
				const reversed = new _OrderedDict();
				for (let index = this.size - 1; index >= 0; index--) {
					const key = this.keyAt(index);
					const element = this.get(key);
					reversed.set(key, element);
				}
				return reversed;
			}
			toSpliced(...args) {
				const entries = [...this.entries()];
				entries.splice(...args);
				return new _OrderedDict(entries);
			}
			slice(start, end) {
				const result = new _OrderedDict();
				let stop = this.size - 1;
				if (start === void 0) return result;
				if (start < 0) start = start + this.size;
				if (end !== void 0 && end > 0) stop = end - 1;
				for (let index = start; index <= stop; index++) {
					const key = this.keyAt(index);
					const element = this.get(key);
					result.set(key, element);
				}
				return result;
			}
			every(predicate, thisArg) {
				let index = 0;
				for (const entry of this) {
					if (!Reflect.apply(predicate, thisArg, [
						entry,
						index,
						this
					])) return false;
					index++;
				}
				return true;
			}
			some(predicate, thisArg) {
				let index = 0;
				for (const entry of this) {
					if (Reflect.apply(predicate, thisArg, [
						entry,
						index,
						this
					])) return true;
					index++;
				}
				return false;
			}
		};
		function at(array, index) {
			if ("at" in Array.prototype) return Array.prototype.at.call(array, index);
			const actualIndex = toSafeIndex(array, index);
			return actualIndex === -1 ? void 0 : array[actualIndex];
		}
		__name$14(at, "at");
		function toSafeIndex(array, index) {
			const length = array.length;
			const relativeIndex = toSafeInteger(index);
			const actualIndex = relativeIndex >= 0 ? relativeIndex : length + relativeIndex;
			return actualIndex < 0 || actualIndex >= length ? -1 : actualIndex;
		}
		__name$14(toSafeIndex, "toSafeIndex");
		function toSafeInteger(number) {
			return number !== number || number === 0 ? 0 : Math.trunc(number);
		}
		__name$14(toSafeInteger, "toSafeInteger");
		// @__NO_SIDE_EFFECTS__
		function createCollection2(name) {
			const PROVIDER_NAME = name + "CollectionProvider";
			const [createCollectionContext, createCollectionScope] = /* @__PURE__ */ createContextScope(PROVIDER_NAME);
			const [CollectionContextProvider, useCollectionContext] = createCollectionContext(PROVIDER_NAME, {
				collectionElement: null,
				collectionRef: { current: null },
				collectionRefObject: { current: null },
				itemMap: new OrderedDict(),
				setItemMap: /* @__PURE__ */ __name$14(() => void 0, "setItemMap")
			});
			const CollectionProvider = /* @__PURE__ */ __name$14(({ state, ...props }) => {
				return state ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionProviderImpl, {
					...props,
					state
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionInit, { ...props });
			}, "CollectionProvider");
			CollectionProvider.displayName = PROVIDER_NAME;
			const CollectionInit = /* @__PURE__ */ __name$14((props) => {
				const state = useInitCollection();
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionProviderImpl, {
					...props,
					state
				});
			}, "CollectionInit");
			CollectionInit.displayName = PROVIDER_NAME + "Init";
			const CollectionProviderImpl = /* @__PURE__ */ __name$14((props) => {
				const { scope, children, state } = props;
				const ref = react.useRef(null);
				const [collectionElement, setCollectionElement] = react.useState(null);
				const composeRefs = useComposedRefs(ref, setCollectionElement);
				const [itemMap, setItemMap] = state;
				react.useEffect(() => {
					if (!collectionElement) return;
					const observer = getChildListObserver(() => {});
					observer.observe(collectionElement, {
						childList: true,
						subtree: true
					});
					return () => {
						observer.disconnect();
					};
				}, [collectionElement]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionContextProvider, {
					scope,
					itemMap,
					setItemMap,
					collectionRef: composeRefs,
					collectionRefObject: ref,
					collectionElement,
					children
				});
			}, "CollectionProviderImpl");
			CollectionProviderImpl.displayName = PROVIDER_NAME + "Impl";
			const COLLECTION_SLOT_NAME = name + "CollectionSlot";
			const CollectionSlotImpl = /* @__PURE__ */ createSlot(COLLECTION_SLOT_NAME);
			const CollectionSlot = react.forwardRef((props, forwardedRef) => {
				const { scope, children } = props;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionSlotImpl, {
					ref: useComposedRefs(forwardedRef, useCollectionContext(COLLECTION_SLOT_NAME, scope).collectionRef),
					children
				});
			});
			CollectionSlot.displayName = COLLECTION_SLOT_NAME;
			const ITEM_SLOT_NAME = name + "CollectionItemSlot";
			const ITEM_DATA_ATTR = "data-radix-collection-item";
			const CollectionItemSlotImpl = /* @__PURE__ */ createSlot(ITEM_SLOT_NAME);
			const CollectionItemSlot = react.forwardRef((props, forwardedRef) => {
				const { scope, children, ...itemData } = props;
				const ref = react.useRef(null);
				const [element, setElement] = react.useState(null);
				const composedRefs = useComposedRefs(forwardedRef, ref, setElement);
				const { setItemMap } = useCollectionContext(ITEM_SLOT_NAME, scope);
				const itemDataRef = react.useRef(itemData);
				if (!shallowEqual(itemDataRef.current, itemData)) itemDataRef.current = itemData;
				const memoizedItemData = itemDataRef.current;
				react.useEffect(() => {
					const itemData2 = memoizedItemData;
					setItemMap((map) => {
						if (!element) return map;
						if (!map.has(element)) {
							map.set(element, {
								...itemData2,
								element
							});
							return map.toSorted(sortByDocumentPosition);
						}
						return map.set(element, {
							...itemData2,
							element
						}).toSorted(sortByDocumentPosition);
					});
					return () => {
						setItemMap((map) => {
							if (!element || !map.has(element)) return map;
							map.delete(element);
							return new OrderedDict(map);
						});
					};
				}, [
					element,
					memoizedItemData,
					setItemMap
				]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CollectionItemSlotImpl, {
					[ITEM_DATA_ATTR]: "",
					ref: composedRefs,
					children
				});
			});
			CollectionItemSlot.displayName = ITEM_SLOT_NAME;
			function useInitCollection() {
				return react.useState(new OrderedDict());
			}
			__name$14(useInitCollection, "useInitCollection");
			function useCollection(scope) {
				const { itemMap } = useCollectionContext(name + "CollectionConsumer", scope);
				return itemMap;
			}
			__name$14(useCollection, "useCollection");
			return [{
				Provider: CollectionProvider,
				Slot: CollectionSlot,
				ItemSlot: CollectionItemSlot
			}, {
				createCollectionScope,
				useCollection,
				useInitCollection
			}];
		}
		__name$14(createCollection2, "createCollection");
		function shallowEqual(a, b) {
			if (a === b) return true;
			if (typeof a !== "object" || typeof b !== "object") return false;
			if (a == null || b == null) return false;
			const keysA = Object.keys(a);
			const keysB = Object.keys(b);
			if (keysA.length !== keysB.length) return false;
			for (const key of keysA) {
				if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
				if (a[key] !== b[key]) return false;
			}
			return true;
		}
		__name$14(shallowEqual, "shallowEqual");
		function isElementPreceding(a, b) {
			return !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING);
		}
		__name$14(isElementPreceding, "isElementPreceding");
		function sortByDocumentPosition(a, b) {
			return !a[1].element || !b[1].element ? 0 : isElementPreceding(a[1].element, b[1].element) ? -1 : 1;
		}
		__name$14(sortByDocumentPosition, "sortByDocumentPosition");
		function getChildListObserver(callback) {
			return new MutationObserver((mutationsList) => {
				for (const mutation of mutationsList) if (mutation.type === "childList") {
					callback();
					return;
				}
			});
		}
		__name$14(getChildListObserver, "getChildListObserver");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-direction@1.1.4_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-direction/dist/index.mjs
		var __defProp$13 = Object.defineProperty;
		var __name$13 = (target, value) => __defProp$13(target, "name", {
			value,
			configurable: true
		});
		var DirectionContext = react.createContext(void 0);
		function useDirection(localDir) {
			const globalDir = react.useContext(DirectionContext);
			return localDir || globalDir || "ltr";
		}
		__name$13(useDirection, "useDirection");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-callback-ref@1.1.4_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
		var __defProp$12 = Object.defineProperty;
		var __name$12 = (target, value) => __defProp$12(target, "name", {
			value,
			configurable: true
		});
		function useCallbackRef(callback) {
			const callbackRef = react.useRef(callback);
			react.useEffect(() => {
				callbackRef.current = callback;
			});
			return react.useMemo(() => ((...args) => callbackRef.current?.(...args)), []);
		}
		__name$12(useCallbackRef, "useCallbackRef");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-dismissable-layer@1.1.19_@types+react-dom@18.3.7_@types+react@18.3.31___7124fa7a64d9804273e89d2c10b89c69/node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
		var __defProp$11 = Object.defineProperty;
		var __name$11 = (target, value) => __defProp$11(target, "name", {
			value,
			configurable: true
		});
		var CONTEXT_UPDATE = "dismissableLayer.update";
		var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
		var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
		var originalBodyPointerEvents;
		var DismissableLayerContext = react.createContext({
			layers: /* @__PURE__ */ new Set(),
			layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
			branches: /* @__PURE__ */ new Set(),
			dismissableSurfaces: /* @__PURE__ */ new Set()
		});
		var DismissableLayer = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$11(function DismissableLayer2(props, forwardedRef) {
			const { disableOutsidePointerEvents = false, deferPointerDownOutside = false, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss, ...layerProps } = props;
			const context = react.useContext(DismissableLayerContext);
			const [node, setNode] = react.useState(null);
			const ownerDocument = node?.ownerDocument ?? globalThis?.document;
			const [, force] = react.useState({});
			const composedRefs = useComposedRefs(forwardedRef, setNode);
			const layers = Array.from(context.layers);
			const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
			const highestLayerWithOutsidePointerEventsDisabledIndex = highestLayerWithOutsidePointerEventsDisabled ? layers.indexOf(highestLayerWithOutsidePointerEventsDisabled) : -1;
			const index = node ? layers.indexOf(node) : -1;
			const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
			const isPointerEventsEnabled = index >= highestLayerWithOutsidePointerEventsDisabledIndex;
			const isDeferredPointerDownOutsideRef = react.useRef(false);
			const pointerDownOutside = usePointerDownOutside((event) => {
				onPointerDownOutside?.(event);
				onInteractOutside?.(event);
				if (!event.defaultPrevented) onDismiss?.();
			}, {
				ownerDocument,
				deferPointerDownOutside,
				isDeferredPointerDownOutsideRef,
				dismissableSurfaces: context.dismissableSurfaces,
				shouldHandlePointerDownOutside: react.useCallback((target) => {
					if (!(target instanceof Node)) return false;
					const isPointerDownOnBranch = [...context.branches].some((branch) => branch.contains(target));
					return isPointerEventsEnabled && !isPointerDownOnBranch;
				}, [context.branches, isPointerEventsEnabled])
			});
			const focusOutside = useFocusOutside((event) => {
				if (deferPointerDownOutside && isDeferredPointerDownOutsideRef.current) return;
				const target = event.target;
				if ([...context.branches].some((branch) => branch.contains(target))) return;
				onFocusOutside?.(event);
				onInteractOutside?.(event);
				if (!event.defaultPrevented) onDismiss?.();
			}, ownerDocument);
			const isHighestLayer = node ? index === layers.length - 1 : false;
			const handleKeyDown = useCallbackRef((event) => {
				if (event.key !== "Escape") return;
				onEscapeKeyDown?.(event);
				if (!event.defaultPrevented && onDismiss) {
					event.preventDefault();
					onDismiss();
				}
			});
			react.useEffect(() => {
				if (!isHighestLayer) return;
				ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
				return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
			}, [
				ownerDocument,
				isHighestLayer,
				handleKeyDown
			]);
			react.useEffect(() => {
				if (!node) return;
				if (disableOutsidePointerEvents) {
					if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
						originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
						ownerDocument.body.style.pointerEvents = "none";
					}
					context.layersWithOutsidePointerEventsDisabled.add(node);
				}
				context.layers.add(node);
				dispatchUpdate();
				return () => {
					if (disableOutsidePointerEvents) {
						context.layersWithOutsidePointerEventsDisabled.delete(node);
						if (context.layersWithOutsidePointerEventsDisabled.size === 0) ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
					}
				};
			}, [
				node,
				ownerDocument,
				disableOutsidePointerEvents,
				context
			]);
			react.useEffect(() => {
				return () => {
					if (!node) return;
					context.layers.delete(node);
					context.layersWithOutsidePointerEventsDisabled.delete(node);
					dispatchUpdate();
				};
			}, [node, context]);
			react.useEffect(() => {
				const handleUpdate = /* @__PURE__ */ __name$11(() => force({}), "handleUpdate");
				document.addEventListener(CONTEXT_UPDATE, handleUpdate);
				return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
				...layerProps,
				ref: composedRefs,
				style: {
					pointerEvents: isBodyPointerEventsDisabled ? isPointerEventsEnabled ? "auto" : "none" : void 0,
					...props.style
				},
				onFocusCapture: composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture),
				onBlurCapture: composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture),
				onPointerDownCapture: composeEventHandlers(props.onPointerDownCapture, pointerDownOutside.onPointerDownCapture)
			});
		}, "DismissableLayer"));
		function useDismissableLayerSurface() {
			const context = react.useContext(DismissableLayerContext);
			const [node, setNode] = react.useState(null);
			react.useEffect(() => {
				if (!node) return;
				context.dismissableSurfaces.add(node);
				return () => {
					context.dismissableSurfaces.delete(node);
				};
			}, [node, context.dismissableSurfaces]);
			return setNode;
		}
		__name$11(useDismissableLayerSurface, "useDismissableLayerSurface");
		var IS_TRUE = /* @__PURE__ */ __name$11(() => true, "IS_TRUE");
		function usePointerDownOutside(onPointerDownOutside, args) {
			const { ownerDocument = globalThis?.document, deferPointerDownOutside = false, isDeferredPointerDownOutsideRef, dismissableSurfaces, shouldHandlePointerDownOutside = IS_TRUE } = args;
			const handlePointerDownOutside = useCallbackRef(onPointerDownOutside);
			const isPointerInsideReactTreeRef = react.useRef(false);
			const isPointerDownOutsideRef = react.useRef(false);
			const interceptedOutsideInteractionEventsRef = react.useRef(/* @__PURE__ */ new Map());
			const handleClickRef = react.useRef(() => {});
			react.useEffect(() => {
				function resetOutsideInteraction() {
					isPointerDownOutsideRef.current = false;
					isDeferredPointerDownOutsideRef.current = false;
					interceptedOutsideInteractionEventsRef.current.clear();
				}
				__name$11(resetOutsideInteraction, "resetOutsideInteraction");
				function isOutsideInteractionIntercepted() {
					return Array.from(interceptedOutsideInteractionEventsRef.current.values()).some(Boolean);
				}
				__name$11(isOutsideInteractionIntercepted, "isOutsideInteractionIntercepted");
				function handleInteractionCapture(event) {
					if (!isPointerDownOutsideRef.current) return;
					const target = event.target;
					if (!(target instanceof Node && [...dismissableSurfaces].some((surface) => surface.contains(target)))) interceptedOutsideInteractionEventsRef.current.set(event.type, true);
					if (event.type === "click") window.setTimeout(() => {
						if (isPointerDownOutsideRef.current) handleClickRef.current();
					}, 0);
				}
				__name$11(handleInteractionCapture, "handleInteractionCapture");
				function handleInteractionBubble(event) {
					if (isPointerDownOutsideRef.current) interceptedOutsideInteractionEventsRef.current.set(event.type, false);
				}
				__name$11(handleInteractionBubble, "handleInteractionBubble");
				const handlePointerDown = /* @__PURE__ */ __name$11((event) => {
					if (event.target && !isPointerInsideReactTreeRef.current) {
						let handleAndDispatchPointerDownOutsideEvent2 = function() {
							ownerDocument.removeEventListener("click", handleClickRef.current);
							const wasOutsideInteractionIntercepted = isOutsideInteractionIntercepted();
							resetOutsideInteraction();
							if (!wasOutsideInteractionIntercepted) handleAndDispatchCustomEvent(POINTER_DOWN_OUTSIDE, handlePointerDownOutside, eventDetail, { discrete: true });
						};
						__name$11(handleAndDispatchPointerDownOutsideEvent2, "handleAndDispatchPointerDownOutsideEvent");
						if (!shouldHandlePointerDownOutside(event.target)) {
							ownerDocument.removeEventListener("click", handleClickRef.current);
							resetOutsideInteraction();
							isPointerInsideReactTreeRef.current = false;
							return;
						}
						const eventDetail = { originalEvent: event };
						isPointerDownOutsideRef.current = true;
						isDeferredPointerDownOutsideRef.current = deferPointerDownOutside && event.button === 0;
						interceptedOutsideInteractionEventsRef.current.clear();
						if (!deferPointerDownOutside || event.button !== 0) handleAndDispatchPointerDownOutsideEvent2();
						else {
							ownerDocument.removeEventListener("click", handleClickRef.current);
							handleClickRef.current = handleAndDispatchPointerDownOutsideEvent2;
							ownerDocument.addEventListener("click", handleClickRef.current, { once: true });
						}
					} else {
						ownerDocument.removeEventListener("click", handleClickRef.current);
						resetOutsideInteraction();
					}
					isPointerInsideReactTreeRef.current = false;
				}, "handlePointerDown");
				const outsideInteractionEvents = [
					"pointerup",
					"mousedown",
					"mouseup",
					"touchstart",
					"touchend",
					"click"
				];
				for (const eventName of outsideInteractionEvents) {
					ownerDocument.addEventListener(eventName, handleInteractionCapture, true);
					ownerDocument.addEventListener(eventName, handleInteractionBubble);
				}
				const timerId = window.setTimeout(() => {
					ownerDocument.addEventListener("pointerdown", handlePointerDown);
				}, 0);
				return () => {
					window.clearTimeout(timerId);
					ownerDocument.removeEventListener("pointerdown", handlePointerDown);
					ownerDocument.removeEventListener("click", handleClickRef.current);
					for (const eventName of outsideInteractionEvents) {
						ownerDocument.removeEventListener(eventName, handleInteractionCapture, true);
						ownerDocument.removeEventListener(eventName, handleInteractionBubble);
					}
				};
			}, [
				ownerDocument,
				handlePointerDownOutside,
				deferPointerDownOutside,
				isDeferredPointerDownOutsideRef,
				dismissableSurfaces,
				shouldHandlePointerDownOutside
			]);
			return { onPointerDownCapture: /* @__PURE__ */ __name$11(() => isPointerInsideReactTreeRef.current = true, "onPointerDownCapture") };
		}
		__name$11(usePointerDownOutside, "usePointerDownOutside");
		function useFocusOutside(onFocusOutside, ownerDocument = globalThis?.document) {
			const handleFocusOutside = useCallbackRef(onFocusOutside);
			const isFocusInsideReactTreeRef = react.useRef(false);
			react.useEffect(() => {
				const handleFocus = /* @__PURE__ */ __name$11((event) => {
					if (event.target && !isFocusInsideReactTreeRef.current) handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, { originalEvent: event }, { discrete: false });
				}, "handleFocus");
				ownerDocument.addEventListener("focusin", handleFocus);
				return () => ownerDocument.removeEventListener("focusin", handleFocus);
			}, [ownerDocument, handleFocusOutside]);
			return {
				onFocusCapture: /* @__PURE__ */ __name$11(() => isFocusInsideReactTreeRef.current = true, "onFocusCapture"),
				onBlurCapture: /* @__PURE__ */ __name$11(() => isFocusInsideReactTreeRef.current = false, "onBlurCapture")
			};
		}
		__name$11(useFocusOutside, "useFocusOutside");
		function dispatchUpdate() {
			const event = new CustomEvent(CONTEXT_UPDATE);
			document.dispatchEvent(event);
		}
		__name$11(dispatchUpdate, "dispatchUpdate");
		function handleAndDispatchCustomEvent(name, handler, detail, { discrete }) {
			const target = detail.originalEvent.target;
			const event = new CustomEvent(name, {
				bubbles: false,
				cancelable: true,
				detail
			});
			if (handler) target.addEventListener(name, handler, { once: true });
			if (discrete) dispatchDiscreteCustomEvent(target, event);
			else target.dispatchEvent(event);
		}
		__name$11(handleAndDispatchCustomEvent, "handleAndDispatchCustomEvent");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-focus-guards@1.1.6_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-focus-guards/dist/index.mjs
		var __defProp$10 = Object.defineProperty;
		var __name$10 = (target, value) => __defProp$10(target, "name", {
			value,
			configurable: true
		});
		var count$1 = 0;
		var guards = null;
		function FocusGuards(props) {
			useFocusGuards();
			return props.children;
		}
		__name$10(FocusGuards, "FocusGuards");
		function useFocusGuards() {
			react.useEffect(() => {
				if (!guards) guards = {
					start: createFocusGuard(),
					end: createFocusGuard()
				};
				const { start, end } = guards;
				if (document.body.firstElementChild !== start) document.body.insertAdjacentElement("afterbegin", start);
				if (document.body.lastElementChild !== end) document.body.insertAdjacentElement("beforeend", end);
				count$1++;
				return () => {
					if (count$1 === 1) {
						guards?.start.remove();
						guards?.end.remove();
						guards = null;
					}
					count$1 = Math.max(0, count$1 - 1);
				};
			}, []);
		}
		__name$10(useFocusGuards, "useFocusGuards");
		function createFocusGuard() {
			const element = document.createElement("span");
			element.setAttribute("data-radix-focus-guard", "");
			element.tabIndex = 0;
			element.style.outline = "none";
			element.style.opacity = "0";
			element.style.position = "fixed";
			element.style.pointerEvents = "none";
			return element;
		}
		__name$10(createFocusGuard, "createFocusGuard");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-focus-scope@1.1.16_@types+react-dom@18.3.7_@types+react@18.3.31__@types_c897b3d4475f359d06f1ee3270126427/node_modules/@radix-ui/react-focus-scope/dist/index.mjs
		var __defProp$9 = Object.defineProperty;
		var __name$9 = (target, value) => __defProp$9(target, "name", {
			value,
			configurable: true
		});
		var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
		var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
		var EVENT_OPTIONS$1 = {
			bubbles: false,
			cancelable: true
		};
		var FocusScope = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$9(function FocusScope2(props, forwardedRef) {
			const { loop = false, trapped = false, onMountAutoFocus: onMountAutoFocusProp, onUnmountAutoFocus: onUnmountAutoFocusProp, ...scopeProps } = props;
			const [container, setContainer] = react.useState(null);
			const onMountAutoFocus = useCallbackRef(onMountAutoFocusProp);
			const onUnmountAutoFocus = useCallbackRef(onUnmountAutoFocusProp);
			const lastFocusedElementRef = react.useRef(null);
			const composedRefs = useComposedRefs(forwardedRef, setContainer);
			const focusScope = react.useRef({
				paused: false,
				pause() {
					this.paused = true;
				},
				resume() {
					this.paused = false;
				}
			}).current;
			react.useEffect(() => {
				if (trapped) {
					let handleFocusIn2 = function(event) {
						if (focusScope.paused || !container) return;
						const target = event.target;
						if (container.contains(target)) lastFocusedElementRef.current = target;
						else focus(lastFocusedElementRef.current, { select: true });
					}, handleFocusOut2 = function(event) {
						if (focusScope.paused || !container) return;
						const relatedTarget = event.relatedTarget;
						if (relatedTarget === null) return;
						if (!container.contains(relatedTarget)) focus(lastFocusedElementRef.current, { select: true });
					}, handleMutations2 = function(mutations) {
						if (document.activeElement !== document.body) return;
						for (const mutation of mutations) if (mutation.removedNodes.length > 0) focus(container);
					};
					__name$9(handleFocusIn2, "handleFocusIn");
					__name$9(handleFocusOut2, "handleFocusOut");
					__name$9(handleMutations2, "handleMutations");
					document.addEventListener("focusin", handleFocusIn2);
					document.addEventListener("focusout", handleFocusOut2);
					const mutationObserver = new MutationObserver(handleMutations2);
					if (container) mutationObserver.observe(container, {
						childList: true,
						subtree: true
					});
					return () => {
						document.removeEventListener("focusin", handleFocusIn2);
						document.removeEventListener("focusout", handleFocusOut2);
						mutationObserver.disconnect();
					};
				}
			}, [
				trapped,
				container,
				focusScope.paused
			]);
			react.useEffect(() => {
				if (container) {
					focusScopesStack.add(focusScope);
					const previouslyFocusedElement = document.activeElement;
					if (!container.contains(previouslyFocusedElement)) {
						const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS$1);
						container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
						container.dispatchEvent(mountEvent);
						if (!mountEvent.defaultPrevented) {
							focusFirst$2(removeLinks(getTabbableCandidates(container)), { select: true });
							if (document.activeElement === previouslyFocusedElement) focus(container);
						}
					}
					return () => {
						container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
						setTimeout(() => {
							const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS$1);
							container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
							container.dispatchEvent(unmountEvent);
							if (!unmountEvent.defaultPrevented) focus(previouslyFocusedElement ?? document.body, { select: true });
							container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
							focusScopesStack.remove(focusScope);
						}, 0);
					};
				}
			}, [
				container,
				onMountAutoFocus,
				onUnmountAutoFocus,
				focusScope
			]);
			const handleKeyDown = react.useCallback((event) => {
				if (!loop && !trapped) return;
				if (focusScope.paused) return;
				const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
				const focusedElement = document.activeElement;
				if (isTabKey && focusedElement) {
					const container2 = event.currentTarget;
					const [first, last] = getTabbableEdges(container2);
					if (!(first && last)) {
						if (focusedElement === container2) event.preventDefault();
					} else if (!event.shiftKey && focusedElement === last) {
						event.preventDefault();
						if (loop) focus(first, { select: true });
					} else if (event.shiftKey && focusedElement === first) {
						event.preventDefault();
						if (loop) focus(last, { select: true });
					}
				}
			}, [
				loop,
				trapped,
				focusScope.paused
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
				tabIndex: -1,
				...scopeProps,
				ref: composedRefs,
				onKeyDown: handleKeyDown
			});
		}, "FocusScope"));
		function focusFirst$2(candidates, { select = false } = {}) {
			const previouslyFocusedElement = document.activeElement;
			for (const candidate of candidates) {
				focus(candidate, { select });
				if (document.activeElement !== previouslyFocusedElement) return;
			}
		}
		__name$9(focusFirst$2, "focusFirst");
		function getTabbableEdges(container) {
			const candidates = getTabbableCandidates(container);
			return [findVisible(candidates, container), findVisible(candidates.reverse(), container)];
		}
		__name$9(getTabbableEdges, "getTabbableEdges");
		function getTabbableCandidates(container) {
			const nodes = [];
			const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: /* @__PURE__ */ __name$9((node) => {
				const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
				if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
				return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
			}, "acceptNode") });
			while (walker.nextNode()) nodes.push(walker.currentNode);
			return nodes;
		}
		__name$9(getTabbableCandidates, "getTabbableCandidates");
		function findVisible(elements, container) {
			const canUseCheckVisibility = typeof container.checkVisibility === "function" && container.checkVisibility({ checkVisibilityCSS: true });
			for (const element of elements) if (!(canUseCheckVisibility ? !element.checkVisibility({ checkVisibilityCSS: true }) : isHidden(element, { upTo: container }))) return element;
		}
		__name$9(findVisible, "findVisible");
		function isHidden(node, { upTo }) {
			if (getComputedStyle(node).visibility === "hidden") return true;
			while (node) {
				if (upTo !== void 0 && node === upTo) return false;
				if (getComputedStyle(node).display === "none") return true;
				node = node.parentElement;
			}
			return false;
		}
		__name$9(isHidden, "isHidden");
		function isSelectableInput(element) {
			return element instanceof HTMLInputElement && "select" in element;
		}
		__name$9(isSelectableInput, "isSelectableInput");
		function focus(element, { select = false } = {}) {
			if (element && element.focus) {
				const previouslyFocusedElement = document.activeElement;
				element.focus({ preventScroll: true });
				if (element !== previouslyFocusedElement && isSelectableInput(element) && select) element.select();
			}
		}
		__name$9(focus, "focus");
		var focusScopesStack = createFocusScopesStack();
		function createFocusScopesStack() {
			let stack = [];
			return {
				add(focusScope) {
					const activeFocusScope = stack[0];
					if (focusScope !== activeFocusScope) activeFocusScope?.pause();
					stack = arrayRemove(stack, focusScope);
					stack.unshift(focusScope);
				},
				remove(focusScope) {
					stack = arrayRemove(stack, focusScope);
					stack[0]?.resume();
				}
			};
		}
		__name$9(createFocusScopesStack, "createFocusScopesStack");
		function arrayRemove(array, item) {
			const updatedArray = [...array];
			const index = updatedArray.indexOf(item);
			if (index !== -1) updatedArray.splice(index, 1);
			return updatedArray;
		}
		__name$9(arrayRemove, "arrayRemove");
		function removeLinks(items) {
			return items.filter((item) => item.tagName !== "A");
		}
		__name$9(removeLinks, "removeLinks");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-id@1.1.4_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-id/dist/index.mjs
		var __defProp$8 = Object.defineProperty;
		var __name$8 = (target, value) => __defProp$8(target, "name", {
			value,
			configurable: true
		});
		var useReactId = react[" useId ".trim().toString()] || (() => void 0);
		var count = 0;
		function useId(deterministicId) {
			const [id, setId] = react.useState(useReactId());
			useLayoutEffect2(() => {
				if (!deterministicId) setId((reactId) => reactId ?? String(count++));
			}, [deterministicId]);
			return deterministicId || (id ? `radix-${id}` : "");
		}
		__name$8(useId, "useId");
		//#endregion
		//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.12/node_modules/@floating-ui/utils/dist/floating-ui.utils.mjs
		/**
		* Custom positioning reference element.
		* @see https://floating-ui.com/docs/virtual-elements
		*/
		const sides = [
			"top",
			"right",
			"bottom",
			"left"
		];
		const min = Math.min;
		const max = Math.max;
		const round = Math.round;
		const floor = Math.floor;
		const createCoords = (v) => ({
			x: v,
			y: v
		});
		const oppositeSideMap = {
			left: "right",
			right: "left",
			bottom: "top",
			top: "bottom"
		};
		function clamp(start, value, end) {
			return max(start, min(value, end));
		}
		function evaluate(value, param) {
			return typeof value === "function" ? value(param) : value;
		}
		function getSide(placement) {
			return placement.split("-")[0];
		}
		function getAlignment(placement) {
			return placement.split("-")[1];
		}
		function getOppositeAxis(axis) {
			return axis === "x" ? "y" : "x";
		}
		function getAxisLength(axis) {
			return axis === "y" ? "height" : "width";
		}
		function getSideAxis(placement) {
			const firstChar = placement[0];
			return firstChar === "t" || firstChar === "b" ? "y" : "x";
		}
		function getAlignmentAxis(placement) {
			return getOppositeAxis(getSideAxis(placement));
		}
		function getAlignmentSides(placement, rects, rtl) {
			if (rtl === void 0) rtl = false;
			const alignment = getAlignment(placement);
			const alignmentAxis = getAlignmentAxis(placement);
			const length = getAxisLength(alignmentAxis);
			let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
			if (rects.reference[length] > rects.floating[length]) mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
			return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
		}
		function getExpandedPlacements(placement) {
			const oppositePlacement = getOppositePlacement(placement);
			return [
				getOppositeAlignmentPlacement(placement),
				oppositePlacement,
				getOppositeAlignmentPlacement(oppositePlacement)
			];
		}
		function getOppositeAlignmentPlacement(placement) {
			return placement.includes("start") ? placement.replace("start", "end") : placement.replace("end", "start");
		}
		const lrPlacement = ["left", "right"];
		const rlPlacement = ["right", "left"];
		const tbPlacement = ["top", "bottom"];
		const btPlacement = ["bottom", "top"];
		function getSideList(side, isStart, rtl) {
			switch (side) {
				case "top":
				case "bottom":
					if (rtl) return isStart ? rlPlacement : lrPlacement;
					return isStart ? lrPlacement : rlPlacement;
				case "left":
				case "right": return isStart ? tbPlacement : btPlacement;
				default: return [];
			}
		}
		function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
			const alignment = getAlignment(placement);
			let list = getSideList(getSide(placement), direction === "start", rtl);
			if (alignment) {
				list = list.map((side) => side + "-" + alignment);
				if (flipAlignment) list = list.concat(list.map(getOppositeAlignmentPlacement));
			}
			return list;
		}
		function getOppositePlacement(placement) {
			const side = getSide(placement);
			return oppositeSideMap[side] + placement.slice(side.length);
		}
		function expandPaddingObject(padding) {
			var _padding$top, _padding$right, _padding$bottom, _padding$left;
			return {
				top: (_padding$top = padding.top) != null ? _padding$top : 0,
				right: (_padding$right = padding.right) != null ? _padding$right : 0,
				bottom: (_padding$bottom = padding.bottom) != null ? _padding$bottom : 0,
				left: (_padding$left = padding.left) != null ? _padding$left : 0
			};
		}
		function getPaddingObject(padding) {
			return typeof padding !== "number" ? expandPaddingObject(padding) : {
				top: padding,
				right: padding,
				bottom: padding,
				left: padding
			};
		}
		function rectToClientRect(rect) {
			const { x, y, width, height } = rect;
			return {
				width,
				height,
				top: y,
				left: x,
				right: x + width,
				bottom: y + height,
				x,
				y
			};
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@floating-ui+core@1.8.0/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
		function computeCoordsFromPlacement(_ref, placement, rtl) {
			let { reference, floating } = _ref;
			const sideAxis = getSideAxis(placement);
			const alignmentAxis = getAlignmentAxis(placement);
			const alignLength = getAxisLength(alignmentAxis);
			const side = getSide(placement);
			const isVertical = sideAxis === "y";
			const commonX = reference.x + reference.width / 2 - floating.width / 2;
			const commonY = reference.y + reference.height / 2 - floating.height / 2;
			const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
			let coords;
			switch (side) {
				case "top":
					coords = {
						x: commonX,
						y: reference.y - floating.height
					};
					break;
				case "bottom":
					coords = {
						x: commonX,
						y: reference.y + reference.height
					};
					break;
				case "right":
					coords = {
						x: reference.x + reference.width,
						y: commonY
					};
					break;
				case "left":
					coords = {
						x: reference.x - floating.width,
						y: commonY
					};
					break;
				default: coords = {
					x: reference.x,
					y: reference.y
				};
			}
			const alignment = getAlignment(placement);
			if (alignment) coords[alignmentAxis] += commonAlign * (alignment === "end" ? 1 : -1) * (rtl && isVertical ? -1 : 1);
			return coords;
		}
		/**
		* Resolves with an object of overflow side offsets that determine how much the
		* element is overflowing a given clipping boundary on each side.
		* - positive = overflowing the boundary by that number of pixels
		* - negative = how many pixels left before it will overflow
		* - 0 = lies flush with the boundary
		* @see https://floating-ui.com/docs/detectOverflow
		*/
		async function detectOverflow(state, options) {
			var _await$platform$isEle;
			if (options === void 0) options = {};
			const { x, y, platform, rects, elements, strategy } = state;
			const { boundary = "clippingAncestors", rootBoundary = "viewport", elementContext = "floating", altBoundary = false, padding = 0 } = evaluate(options, state);
			const paddingObject = getPaddingObject(padding);
			const element = elements[altBoundary ? elementContext === "floating" ? "reference" : "floating" : elementContext];
			const clippingClientRect = rectToClientRect(await platform.getClippingRect({
				element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating)),
				boundary,
				rootBoundary,
				strategy
			}));
			const rect = elementContext === "floating" ? {
				x,
				y,
				width: rects.floating.width,
				height: rects.floating.height
			} : rects.reference;
			const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
			const offsetScale = await (platform.isElement == null ? void 0 : platform.isElement(offsetParent)) && await (platform.getScale == null ? void 0 : platform.getScale(offsetParent)) || {
				x: 1,
				y: 1
			};
			const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
				elements,
				rect,
				offsetParent,
				strategy
			}) : rect);
			return {
				top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
				bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
				left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
				right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
			};
		}
		const MAX_RESET_COUNT = 50;
		/**
		* Computes the `x` and `y` coordinates that will place the floating element
		* next to a given reference element.
		*
		* This export does not have any `platform` interface logic. You will need to
		* write one for the platform you are using Floating UI with.
		*/
		const computePosition$1 = async (reference, floating, config) => {
			const { placement = "bottom", strategy = "absolute", middleware = [], platform } = config;
			const platformWithDetectOverflow = platform.detectOverflow ? platform : {
				...platform,
				detectOverflow
			};
			const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
			let rects = await platform.getElementRects({
				reference,
				floating,
				strategy
			});
			let { x, y } = computeCoordsFromPlacement(rects, placement, rtl);
			let statefulPlacement = placement;
			let resetCount = 0;
			const middlewareData = {};
			for (let i = 0; i < middleware.length; i++) {
				const currentMiddleware = middleware[i];
				if (!currentMiddleware) continue;
				const { name, fn } = currentMiddleware;
				const { x: nextX, y: nextY, data, reset } = await fn({
					x,
					y,
					initialPlacement: placement,
					placement: statefulPlacement,
					strategy,
					middlewareData,
					rects,
					platform: platformWithDetectOverflow,
					elements: {
						reference,
						floating
					}
				});
				x = nextX != null ? nextX : x;
				y = nextY != null ? nextY : y;
				middlewareData[name] = {
					...middlewareData[name],
					...data
				};
				if (reset && resetCount < MAX_RESET_COUNT) {
					resetCount++;
					if (typeof reset === "object") {
						if (reset.placement) statefulPlacement = reset.placement;
						if (reset.rects) rects = reset.rects === true ? await platform.getElementRects({
							reference,
							floating,
							strategy
						}) : reset.rects;
						({x, y} = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
					}
					i = -1;
				}
			}
			return {
				x,
				y,
				placement: statefulPlacement,
				strategy,
				middlewareData
			};
		};
		/**
		* Provides data to position an inner element of the floating element so that it
		* appears centered to the reference element.
		* @see https://floating-ui.com/docs/arrow
		*/
		const arrow$3 = (options) => ({
			name: "arrow",
			options,
			async fn(state) {
				const { x, y, placement, rects, platform, elements, middlewareData } = state;
				const { element, padding = 0 } = evaluate(options, state) || {};
				if (element == null) return {};
				const paddingObject = getPaddingObject(padding);
				const coords = {
					x,
					y
				};
				const axis = getAlignmentAxis(placement);
				const length = getAxisLength(axis);
				const arrowDimensions = await platform.getDimensions(element);
				const isYAxis = axis === "y";
				const minProp = isYAxis ? "top" : "left";
				const maxProp = isYAxis ? "bottom" : "right";
				const clientProp = isYAxis ? "clientHeight" : "clientWidth";
				const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
				const startDiff = coords[axis] - rects.reference[axis];
				const arrowOffsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(element));
				let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
				if (!clientSize || !await (platform.isElement == null ? void 0 : platform.isElement(arrowOffsetParent))) clientSize = elements.floating[clientProp] || rects.floating[length];
				const centerToReference = endDiff / 2 - startDiff / 2;
				const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
				const minPadding = min(paddingObject[minProp], largestPossiblePadding);
				const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
				const max = clientSize - arrowDimensions[length] - maxPadding;
				const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
				const offset = clamp(minPadding, center, max);
				const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset && rects.reference[length] / 2 - (center < minPadding ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
				const alignmentOffset = shouldAddOffset ? center < minPadding ? center - minPadding : center - max : 0;
				return {
					[axis]: coords[axis] + alignmentOffset,
					data: {
						[axis]: offset,
						centerOffset: center - offset - alignmentOffset,
						...shouldAddOffset && { alignmentOffset }
					},
					reset: shouldAddOffset
				};
			}
		});
		/**
		* Optimizes the visibility of the floating element by flipping the `placement`
		* in order to keep it in view when the preferred placement(s) will overflow the
		* clipping boundary. Alternative to `autoPlacement`.
		* @see https://floating-ui.com/docs/flip
		*/
		const flip$2 = function(options) {
			if (options === void 0) options = {};
			return {
				name: "flip",
				options,
				async fn(state) {
					var _middlewareData$arrow, _middlewareData$flip;
					const { placement, middlewareData, rects, initialPlacement, platform, elements } = state;
					const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true, fallbackPlacements: specifiedFallbackPlacements, fallbackStrategy = "bestFit", fallbackAxisSideDirection = "none", flipAlignment = true, ...detectOverflowOptions } = evaluate(options, state);
					if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
					const side = getSide(placement);
					const initialSideAxis = getSideAxis(initialPlacement);
					const isBasePlacement = getSide(initialPlacement) === initialPlacement;
					const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
					const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
					const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
					if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
					const placements = [initialPlacement, ...fallbackPlacements];
					const overflow = await platform.detectOverflow(state, detectOverflowOptions);
					const overflows = [];
					let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
					if (checkMainAxis) overflows.push(overflow[side]);
					if (checkCrossAxis) {
						const sides = getAlignmentSides(placement, rects, rtl);
						overflows.push(overflow[sides[0]], overflow[sides[1]]);
					}
					overflowsData = [...overflowsData, {
						placement,
						overflows
					}];
					if (!overflows.every((side) => side <= 0)) {
						var _middlewareData$flip2, _overflowsData$filter;
						const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
						const nextPlacement = placements[nextIndex];
						if (nextPlacement) {
							if (!(checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false) || overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) return {
								data: {
									index: nextIndex,
									overflows: overflowsData
								},
								reset: { placement: nextPlacement }
							};
						}
						let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
						if (!resetPlacement) switch (fallbackStrategy) {
							case "bestFit": {
								var _overflowsData$filter2;
								const placement = (_overflowsData$filter2 = overflowsData.filter((d) => {
									if (hasFallbackAxisSideDirection) {
										const currentSideAxis = getSideAxis(d.placement);
										return currentSideAxis === initialSideAxis || currentSideAxis === "y";
									}
									return true;
								}).map((d) => [d.placement, d.overflows.filter((overflow) => overflow > 0).reduce((acc, overflow) => acc + overflow, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
								if (placement) resetPlacement = placement;
								break;
							}
							case "initialPlacement":
								resetPlacement = initialPlacement;
								break;
						}
						if (placement !== resetPlacement) return { reset: { placement: resetPlacement } };
					}
					return {};
				}
			};
		};
		function getSideOffsets(overflow, rect) {
			return {
				top: overflow.top - rect.height,
				right: overflow.right - rect.width,
				bottom: overflow.bottom - rect.height,
				left: overflow.left - rect.width
			};
		}
		function isAnySideFullyClipped(overflow) {
			return sides.some((side) => overflow[side] >= 0);
		}
		/**
		* Provides data to hide the floating element in applicable situations, such as
		* when it is not in the same clipping context as the reference element.
		* @see https://floating-ui.com/docs/hide
		*/
		const hide$2 = function(options) {
			if (options === void 0) options = {};
			return {
				name: "hide",
				options,
				async fn(state) {
					const { rects, platform } = state;
					const { strategy = "referenceHidden", ...detectOverflowOptions } = evaluate(options, state);
					switch (strategy) {
						case "referenceHidden": {
							const offsets = getSideOffsets(await platform.detectOverflow(state, {
								...detectOverflowOptions,
								elementContext: "reference"
							}), rects.reference);
							return { data: {
								referenceHiddenOffsets: offsets,
								referenceHidden: isAnySideFullyClipped(offsets)
							} };
						}
						case "escaped": {
							const offsets = getSideOffsets(await platform.detectOverflow(state, {
								...detectOverflowOptions,
								altBoundary: true
							}), rects.floating);
							return { data: {
								escapedOffsets: offsets,
								escaped: isAnySideFullyClipped(offsets)
							} };
						}
						default: return {};
					}
				}
			};
		};
		const originSides = /*#__PURE__*/ new Set(["left", "top"]);
		async function convertValueToCoords(state, options) {
			const { placement, platform, elements } = state;
			const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
			const side = getSide(placement);
			const alignment = getAlignment(placement);
			const isVertical = getSideAxis(placement) === "y";
			const mainAxisMulti = originSides.has(side) ? -1 : 1;
			const crossAxisMulti = rtl && isVertical ? -1 : 1;
			const rawValue = evaluate(options, state);
			let { mainAxis, crossAxis, alignmentAxis } = typeof rawValue === "number" ? {
				mainAxis: rawValue,
				crossAxis: 0,
				alignmentAxis: null
			} : {
				mainAxis: rawValue.mainAxis || 0,
				crossAxis: rawValue.crossAxis || 0,
				alignmentAxis: rawValue.alignmentAxis
			};
			if (alignment && typeof alignmentAxis === "number") crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
			return isVertical ? {
				x: crossAxis * crossAxisMulti,
				y: mainAxis * mainAxisMulti
			} : {
				x: mainAxis * mainAxisMulti,
				y: crossAxis * crossAxisMulti
			};
		}
		/**
		* Modifies the placement by translating the floating element along the
		* specified axes.
		* A number (shorthand for `mainAxis` or distance), or an axes configuration
		* object may be passed.
		* @see https://floating-ui.com/docs/offset
		*/
		const offset$2 = function(options) {
			if (options === void 0) options = 0;
			return {
				name: "offset",
				options,
				async fn(state) {
					var _middlewareData$offse, _middlewareData$arrow;
					const { x, y, placement, middlewareData } = state;
					const diffCoords = await convertValueToCoords(state, options);
					if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) return {};
					return {
						x: x + diffCoords.x,
						y: y + diffCoords.y,
						data: {
							...diffCoords,
							placement
						}
					};
				}
			};
		};
		/**
		* Optimizes the visibility of the floating element by shifting it in order to
		* keep it in view when it will overflow the clipping boundary.
		* @see https://floating-ui.com/docs/shift
		*/
		const shift$2 = function(options) {
			if (options === void 0) options = {};
			return {
				name: "shift",
				options,
				async fn(state) {
					const { x, y, placement, platform } = state;
					const { mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = false, limiter = { fn: (_ref) => {
						let { x, y } = _ref;
						return {
							x,
							y
						};
					} }, ...detectOverflowOptions } = evaluate(options, state);
					const coords = {
						x,
						y
					};
					const overflow = await platform.detectOverflow(state, detectOverflowOptions);
					const crossAxis = getSideAxis(placement);
					const mainAxis = getOppositeAxis(crossAxis);
					let mainAxisCoord = coords[mainAxis];
					let crossAxisCoord = coords[crossAxis];
					const clampCoord = (axis, coord) => clamp(coord + overflow[axis === "y" ? "top" : "left"], coord, coord - overflow[axis === "y" ? "bottom" : "right"]);
					if (checkMainAxis) mainAxisCoord = clampCoord(mainAxis, mainAxisCoord);
					if (checkCrossAxis) crossAxisCoord = clampCoord(crossAxis, crossAxisCoord);
					const limitedCoords = limiter.fn({
						...state,
						[mainAxis]: mainAxisCoord,
						[crossAxis]: crossAxisCoord
					});
					return {
						...limitedCoords,
						data: {
							x: limitedCoords.x - x,
							y: limitedCoords.y - y,
							enabled: {
								[mainAxis]: checkMainAxis,
								[crossAxis]: checkCrossAxis
							}
						}
					};
				}
			};
		};
		/**
		* Built-in `limiter` that will stop `shift()` at a certain point.
		*/
		const limitShift$2 = function(options) {
			if (options === void 0) options = {};
			return {
				options,
				fn(state) {
					var _rawOffset$mainAxis, _rawOffset$crossAxis;
					const { x, y, placement, rects, middlewareData } = state;
					const { offset = 0, mainAxis: checkMainAxis = true, crossAxis: checkCrossAxis = true } = evaluate(options, state);
					const coords = {
						x,
						y
					};
					const crossAxis = getSideAxis(placement);
					const mainAxis = getOppositeAxis(crossAxis);
					let mainAxisCoord = coords[mainAxis];
					let crossAxisCoord = coords[crossAxis];
					const rawOffset = evaluate(offset, state);
					const computedOffset = typeof rawOffset === "number" ? {
						mainAxis: rawOffset,
						crossAxis: 0
					} : {
						mainAxis: (_rawOffset$mainAxis = rawOffset.mainAxis) != null ? _rawOffset$mainAxis : 0,
						crossAxis: (_rawOffset$crossAxis = rawOffset.crossAxis) != null ? _rawOffset$crossAxis : 0
					};
					if (checkMainAxis) {
						const len = mainAxis === "y" ? "height" : "width";
						const limitMin = rects.reference[mainAxis] - rects.floating[len] + computedOffset.mainAxis;
						const limitMax = rects.reference[mainAxis] + rects.reference[len] - computedOffset.mainAxis;
						if (mainAxisCoord < limitMin) mainAxisCoord = limitMin;
						else if (mainAxisCoord > limitMax) mainAxisCoord = limitMax;
					}
					if (checkCrossAxis) {
						var _middlewareData$offse, _middlewareData$offse2;
						const len = mainAxis === "y" ? "width" : "height";
						const isOriginSide = originSides.has(getSide(placement));
						const limitMin = rects.reference[crossAxis] - rects.floating[len] + (isOriginSide ? ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse[crossAxis]) || 0 : 0) + (isOriginSide ? 0 : computedOffset.crossAxis);
						const limitMax = rects.reference[crossAxis] + rects.reference[len] + (isOriginSide ? 0 : ((_middlewareData$offse2 = middlewareData.offset) == null ? void 0 : _middlewareData$offse2[crossAxis]) || 0) - (isOriginSide ? computedOffset.crossAxis : 0);
						if (crossAxisCoord < limitMin) crossAxisCoord = limitMin;
						else if (crossAxisCoord > limitMax) crossAxisCoord = limitMax;
					}
					return {
						[mainAxis]: mainAxisCoord,
						[crossAxis]: crossAxisCoord
					};
				}
			};
		};
		/**
		* Provides data that allows you to change the size of the floating element —
		* for instance, prevent it from overflowing the clipping boundary or match the
		* width of the reference element.
		* @see https://floating-ui.com/docs/size
		*/
		const size$2 = function(options) {
			if (options === void 0) options = {};
			return {
				name: "size",
				options,
				async fn(state) {
					const { placement, rects, platform, elements } = state;
					const { apply = () => {}, ...detectOverflowOptions } = evaluate(options, state);
					const overflow = await platform.detectOverflow(state, detectOverflowOptions);
					const side = getSide(placement);
					const alignment = getAlignment(placement);
					const isYAxis = getSideAxis(placement) === "y";
					const { width, height } = rects.floating;
					let heightSide;
					let widthSide;
					if (side === "top" || side === "bottom") {
						heightSide = side;
						widthSide = alignment === (await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
					} else {
						widthSide = side;
						heightSide = alignment === "end" ? "top" : "bottom";
					}
					const maximumClippingHeight = height - overflow.top - overflow.bottom;
					const maximumClippingWidth = width - overflow.left - overflow.right;
					const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
					const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
					const shiftData = state.middlewareData.shift;
					const noShift = !shiftData;
					let availableHeight = overflowAvailableHeight;
					let availableWidth = overflowAvailableWidth;
					if (shiftData != null && shiftData.enabled.x) availableWidth = maximumClippingWidth;
					if (shiftData != null && shiftData.enabled.y) availableHeight = maximumClippingHeight;
					if (noShift && !alignment) if (isYAxis) availableWidth = width - 2 * max(overflow.left, overflow.right);
					else availableHeight = height - 2 * max(overflow.top, overflow.bottom);
					await apply({
						...state,
						availableWidth,
						availableHeight
					});
					const nextDimensions = await platform.getDimensions(elements.floating);
					if (width !== nextDimensions.width || height !== nextDimensions.height) return { reset: { rects: true } };
					return {};
				}
			};
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.12/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
		function hasWindow() {
			return typeof window !== "undefined";
		}
		function getNodeName(node) {
			if (isNode(node)) return (node.nodeName || "").toLowerCase();
			return "#document";
		}
		function getWindow(node) {
			var _node$ownerDocument;
			return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
		}
		function getDocumentElement(node) {
			var _ref;
			return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
		}
		function isNode(value) {
			if (!hasWindow()) return false;
			return value instanceof Node || value instanceof getWindow(value).Node;
		}
		function isElement(value) {
			if (!hasWindow()) return false;
			return value instanceof Element || value instanceof getWindow(value).Element;
		}
		function isHTMLElement(value) {
			if (!hasWindow()) return false;
			return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
		}
		function isShadowRoot(value) {
			if (!hasWindow() || typeof ShadowRoot === "undefined") return false;
			return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
		}
		function isOverflowElement(element) {
			const { overflow, overflowX, overflowY, display } = getComputedStyle$1(element);
			return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && display !== "inline" && display !== "contents";
		}
		function isTableElement(element) {
			return /^(table|td|th)$/.test(getNodeName(element));
		}
		function isTopLayer(element) {
			try {
				if (element.matches(":popover-open")) return true;
			} catch (_e) {}
			try {
				return element.matches(":modal");
			} catch (_e) {
				return false;
			}
		}
		const willChangeRe = /transform|translate|scale|rotate|perspective|filter/;
		const containRe = /paint|layout|strict|content/;
		const isNotNone = (value) => !!value && value !== "none";
		let isWebKitValue;
		function isContainingBlock(elementOrCss) {
			const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;
			return isNotNone(css.transform) || isNotNone(css.translate) || isNotNone(css.scale) || isNotNone(css.rotate) || isNotNone(css.perspective) || !isWebKit() && (isNotNone(css.backdropFilter) || isNotNone(css.filter)) || willChangeRe.test(css.willChange || "") || containRe.test(css.contain || "");
		}
		function getContainingBlock(element) {
			let currentNode = getParentNode(element);
			while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
				if (isContainingBlock(currentNode)) return currentNode;
				else if (isTopLayer(currentNode)) return null;
				currentNode = getParentNode(currentNode);
			}
			return null;
		}
		function isWebKit() {
			if (isWebKitValue == null) isWebKitValue = typeof CSS !== "undefined" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none");
			return isWebKitValue;
		}
		function isLastTraversableNode(node) {
			return /^(html|body|#document)$/.test(getNodeName(node));
		}
		function getComputedStyle$1(element) {
			return getWindow(element).getComputedStyle(element);
		}
		function getNodeScroll(element) {
			if (isElement(element)) return {
				scrollLeft: element.scrollLeft,
				scrollTop: element.scrollTop
			};
			return {
				scrollLeft: element.scrollX,
				scrollTop: element.scrollY
			};
		}
		function getParentNode(node) {
			if (getNodeName(node) === "html") return node;
			const result = node.assignedSlot || node.parentNode || isShadowRoot(node) && node.host || getDocumentElement(node);
			return isShadowRoot(result) ? result.host : result;
		}
		function getNearestOverflowAncestor(node) {
			const parentNode = getParentNode(node);
			if (isLastTraversableNode(parentNode)) return (node.ownerDocument || node).body;
			if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) return parentNode;
			return getNearestOverflowAncestor(parentNode);
		}
		function getOverflowAncestors(node, list, traverseIframes) {
			var _node$ownerDocument2;
			if (list === void 0) list = [];
			if (traverseIframes === void 0) traverseIframes = true;
			const scrollableAncestor = getNearestOverflowAncestor(node);
			const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
			const win = getWindow(scrollableAncestor);
			if (isBody) {
				const frameElement = getFrameElement(win);
				return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], frameElement && traverseIframes ? getOverflowAncestors(frameElement) : []);
			} else return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, [], traverseIframes));
		}
		function getFrameElement(win) {
			return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/@floating-ui+dom@1.8.0/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
		function getCssDimensions(element) {
			const css = getComputedStyle$1(element);
			let width = parseFloat(css.width) || 0;
			let height = parseFloat(css.height) || 0;
			const hasOffset = isHTMLElement(element);
			const offsetWidth = hasOffset ? element.offsetWidth : width;
			const offsetHeight = hasOffset ? element.offsetHeight : height;
			const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
			if (shouldFallback) {
				width = offsetWidth;
				height = offsetHeight;
			}
			return {
				width,
				height,
				$: shouldFallback
			};
		}
		function unwrapElement(element) {
			return !isElement(element) ? element.contextElement : element;
		}
		function getScale(element) {
			const domElement = unwrapElement(element);
			if (!isHTMLElement(domElement)) return createCoords(1);
			const rect = domElement.getBoundingClientRect();
			const { width, height, $ } = getCssDimensions(domElement);
			let x = ($ ? round(rect.width) : rect.width) / width;
			let y = ($ ? round(rect.height) : rect.height) / height;
			if (!x || !Number.isFinite(x)) x = 1;
			if (!y || !Number.isFinite(y)) y = 1;
			return {
				x,
				y
			};
		}
		const noOffsets = /*#__PURE__*/ createCoords(0);
		function getVisualOffsets(element) {
			const win = getWindow(element);
			if (!isWebKit() || !win.visualViewport) return noOffsets;
			return {
				x: win.visualViewport.offsetLeft,
				y: win.visualViewport.offsetTop
			};
		}
		function shouldAddVisualOffsets(element, isFixed, floatingOffsetParent) {
			if (isFixed === void 0) isFixed = false;
			return !!floatingOffsetParent && isFixed && floatingOffsetParent === getWindow(element);
		}
		function getBoundingClientRect(element, includeScale, isFixedStrategy, offsetParent) {
			if (includeScale === void 0) includeScale = false;
			if (isFixedStrategy === void 0) isFixedStrategy = false;
			const clientRect = element.getBoundingClientRect();
			const domElement = unwrapElement(element);
			let scale = createCoords(1);
			if (includeScale) if (offsetParent) {
				if (isElement(offsetParent)) scale = getScale(offsetParent);
			} else scale = getScale(element);
			const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
			let x = (clientRect.left + visualOffsets.x) / scale.x;
			let y = (clientRect.top + visualOffsets.y) / scale.y;
			let width = clientRect.width / scale.x;
			let height = clientRect.height / scale.y;
			if (domElement && offsetParent) {
				const win = getWindow(domElement);
				const offsetWin = isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
				let currentWin = win;
				let currentIFrame = getFrameElement(currentWin);
				while (currentIFrame && offsetWin !== currentWin) {
					const iframeScale = getScale(currentIFrame);
					const iframeRect = currentIFrame.getBoundingClientRect();
					const css = getComputedStyle$1(currentIFrame);
					const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
					const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
					x *= iframeScale.x;
					y *= iframeScale.y;
					width *= iframeScale.x;
					height *= iframeScale.y;
					x += left;
					y += top;
					currentWin = getWindow(currentIFrame);
					currentIFrame = getFrameElement(currentWin);
				}
			}
			return rectToClientRect({
				width,
				height,
				x,
				y
			});
		}
		function getWindowScrollBarX(element, rect) {
			const leftScroll = getNodeScroll(element).scrollLeft;
			if (!rect) return getBoundingClientRect(getDocumentElement(element)).left + leftScroll;
			return rect.left + leftScroll;
		}
		function getHTMLOffset(documentElement, scroll) {
			const htmlRect = documentElement.getBoundingClientRect();
			return {
				x: htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect),
				y: htmlRect.top + scroll.scrollTop
			};
		}
		function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
			let { elements, rect, offsetParent, strategy } = _ref;
			const isFixed = strategy === "fixed";
			const documentElement = getDocumentElement(offsetParent);
			const topLayer = elements ? isTopLayer(elements.floating) : false;
			if (offsetParent === documentElement || topLayer && isFixed) return rect;
			let scroll = {
				scrollLeft: 0,
				scrollTop: 0
			};
			let scale = createCoords(1);
			const offsets = createCoords(0);
			const isOffsetParentAnElement = isHTMLElement(offsetParent);
			if (isOffsetParentAnElement || !isFixed) {
				if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
				if (isOffsetParentAnElement) {
					const offsetRect = getBoundingClientRect(offsetParent);
					scale = getScale(offsetParent);
					offsets.x = offsetRect.x + offsetParent.clientLeft;
					offsets.y = offsetRect.y + offsetParent.clientTop;
				}
			}
			const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
			return {
				width: rect.width * scale.x,
				height: rect.height * scale.y,
				x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
				y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
			};
		}
		function getClientRects(element) {
			return element.getClientRects ? Array.from(element.getClientRects()) : [];
		}
		function getDocumentRect(html) {
			const scroll = getNodeScroll(html);
			const body = html.ownerDocument.body;
			const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
			const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
			let x = -scroll.scrollLeft + getWindowScrollBarX(html);
			const y = -scroll.scrollTop;
			if (getComputedStyle$1(body).direction === "rtl") x += max(html.clientWidth, body.clientWidth) - width;
			return {
				width,
				height,
				x,
				y
			};
		}
		const SCROLLBAR_MAX = 25;
		function getViewportRect(element, strategy, rootBoundary) {
			if (rootBoundary === void 0) rootBoundary = "viewport";
			const isLayoutViewport = rootBoundary === "layoutViewport";
			const win = getWindow(element);
			const html = getDocumentElement(element);
			const visualViewport = win.visualViewport;
			let width = html.clientWidth;
			let height = html.clientHeight;
			let x = 0;
			let y = 0;
			if (visualViewport) {
				const layoutRelativeClientCoords = !isWebKit() || strategy === "fixed";
				if (isLayoutViewport) {
					if (!layoutRelativeClientCoords) {
						x = -visualViewport.offsetLeft;
						y = -visualViewport.offsetTop;
					}
				} else {
					width = visualViewport.width;
					height = visualViewport.height;
					if (layoutRelativeClientCoords) {
						x = visualViewport.offsetLeft;
						y = visualViewport.offsetTop;
					}
				}
			}
			if (getWindowScrollBarX(html) <= 0) {
				const doc = html.ownerDocument;
				const body = doc.body;
				const bodyStyles = getComputedStyle(body);
				const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
				const reservedWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
				const gutter = getComputedStyle(html).scrollbarGutter === "stable both-edges" ? reservedWidth / 2 : reservedWidth;
				if (gutter <= SCROLLBAR_MAX) width -= gutter;
			}
			return {
				width,
				height,
				x,
				y
			};
		}
		function getInnerBoundingClientRect(element, strategy) {
			const clientRect = getBoundingClientRect(element, true, strategy === "fixed");
			const top = clientRect.top + element.clientTop;
			const left = clientRect.left + element.clientLeft;
			const scale = getScale(element);
			return {
				width: element.clientWidth * scale.x,
				height: element.clientHeight * scale.y,
				x: left * scale.x,
				y: top * scale.y
			};
		}
		function getClientRectFromClippingAncestor(element, clippingAncestor, strategy) {
			let rect;
			if (clippingAncestor === "viewport" || clippingAncestor === "layoutViewport") rect = getViewportRect(element, strategy, clippingAncestor);
			else if (clippingAncestor === "document") rect = getDocumentRect(getDocumentElement(element));
			else if (isElement(clippingAncestor)) rect = getInnerBoundingClientRect(clippingAncestor, strategy);
			else {
				const visualOffsets = getVisualOffsets(element);
				rect = {
					x: clippingAncestor.x - visualOffsets.x,
					y: clippingAncestor.y - visualOffsets.y,
					width: clippingAncestor.width,
					height: clippingAncestor.height
				};
			}
			return rectToClientRect(rect);
		}
		function getClippingElementAncestors(element, cache) {
			const cachedResult = cache.get(element);
			if (cachedResult) return cachedResult;
			let result = getOverflowAncestors(element, [], false).filter((el) => isElement(el) && getNodeName(el) !== "body");
			let lastKeptComputedStyle = null;
			const elementIsFixed = getComputedStyle$1(element).position === "fixed";
			let currentNode = elementIsFixed ? getParentNode(element) : element;
			while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
				const computedStyle = getComputedStyle$1(currentNode);
				const currentNodeIsContaining = isContainingBlock(currentNode);
				const lastPosition = lastKeptComputedStyle ? lastKeptComputedStyle.position : elementIsFixed ? "fixed" : "";
				if (!currentNodeIsContaining && (lastPosition === "fixed" || lastPosition === "absolute" && computedStyle.position === "static")) result = result.filter((ancestor) => ancestor !== currentNode);
				else lastKeptComputedStyle = computedStyle;
				currentNode = getParentNode(currentNode);
			}
			cache.set(element, result);
			return result;
		}
		function getClippingRect(_ref) {
			let { element, boundary, rootBoundary, strategy } = _ref;
			const clippingAncestors = [...boundary === "clippingAncestors" ? isTopLayer(element) ? [] : getClippingElementAncestors(element, this._c) : [].concat(boundary), rootBoundary];
			const firstRect = getClientRectFromClippingAncestor(element, clippingAncestors[0], strategy);
			let top = firstRect.top;
			let right = firstRect.right;
			let bottom = firstRect.bottom;
			let left = firstRect.left;
			for (let i = 1; i < clippingAncestors.length; i++) {
				const rect = getClientRectFromClippingAncestor(element, clippingAncestors[i], strategy);
				top = max(rect.top, top);
				right = min(rect.right, right);
				bottom = min(rect.bottom, bottom);
				left = max(rect.left, left);
			}
			return {
				width: right - left,
				height: bottom - top,
				x: left,
				y: top
			};
		}
		function getDimensions(element) {
			const { width, height } = getCssDimensions(element);
			return {
				width,
				height
			};
		}
		function getRectRelativeToOffsetParent(element, offsetParent, strategy) {
			const isOffsetParentAnElement = isHTMLElement(offsetParent);
			const documentElement = getDocumentElement(offsetParent);
			const isFixed = strategy === "fixed";
			const rect = getBoundingClientRect(element, true, isFixed, offsetParent);
			let scroll = {
				scrollLeft: 0,
				scrollTop: 0
			};
			const offsets = createCoords(0);
			if (isOffsetParentAnElement || !isFixed) {
				if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) scroll = getNodeScroll(offsetParent);
				if (isOffsetParentAnElement) {
					const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
					offsets.x = offsetRect.x + offsetParent.clientLeft;
					offsets.y = offsetRect.y + offsetParent.clientTop;
				}
			}
			if (!isOffsetParentAnElement && documentElement) offsets.x = getWindowScrollBarX(documentElement);
			const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
			return {
				x: rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x,
				y: rect.top + scroll.scrollTop - offsets.y - htmlOffset.y,
				width: rect.width,
				height: rect.height
			};
		}
		function isStaticPositioned(element) {
			return getComputedStyle$1(element).position === "static";
		}
		function getTrueOffsetParent(element, polyfill) {
			if (!isHTMLElement(element) || getComputedStyle$1(element).position === "fixed") return null;
			if (polyfill) return polyfill(element);
			let rawOffsetParent = element.offsetParent;
			if (getDocumentElement(element) === rawOffsetParent) rawOffsetParent = rawOffsetParent.ownerDocument.body;
			return rawOffsetParent;
		}
		function getOffsetParent(element, polyfill) {
			const win = getWindow(element);
			if (isTopLayer(element)) return win;
			if (!isHTMLElement(element)) {
				let svgOffsetParent = getParentNode(element);
				while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
					if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) return svgOffsetParent;
					svgOffsetParent = getParentNode(svgOffsetParent);
				}
				return win;
			}
			let offsetParent = getTrueOffsetParent(element, polyfill);
			while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) offsetParent = getTrueOffsetParent(offsetParent, polyfill);
			if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) return win;
			return offsetParent || getContainingBlock(element) || win;
		}
		const getElementRects = async function(data) {
			const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
			const getDimensionsFn = this.getDimensions;
			const floatingDimensions = await getDimensionsFn(data.floating);
			return {
				reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
				floating: {
					x: 0,
					y: 0,
					width: floatingDimensions.width,
					height: floatingDimensions.height
				}
			};
		};
		function isRTL(element) {
			return getComputedStyle$1(element).direction === "rtl";
		}
		const platform = {
			convertOffsetParentRelativeRectToViewportRelativeRect,
			getDocumentElement,
			getClippingRect,
			getOffsetParent,
			getElementRects,
			getClientRects,
			getDimensions,
			getScale,
			isElement,
			isRTL
		};
		function rectsAreEqual(a, b) {
			return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
		}
		function observeMove(element, onMove, ancestorResize) {
			let io = null;
			let timeoutId;
			const root = getDocumentElement(element);
			function cleanup() {
				var _io;
				clearTimeout(timeoutId);
				(_io = io) == null || _io.disconnect();
				io = null;
			}
			function refresh(skip, threshold) {
				if (skip === void 0) skip = false;
				if (threshold === void 0) threshold = 1;
				cleanup();
				const elementRectForRootMargin = element.getBoundingClientRect();
				const { left, top, width, height } = elementRectForRootMargin;
				if (!skip) onMove();
				if (!width || !height) return;
				const insetTop = floor(top);
				const insetRight = floor(root.clientWidth - (left + width));
				const insetBottom = floor(root.clientHeight - (top + height));
				const insetLeft = floor(left);
				const options = {
					rootMargin: -insetTop + "px " + -insetRight + "px " + -insetBottom + "px " + -insetLeft + "px",
					threshold: max(0, min(1, threshold)) || 1
				};
				let isFirstUpdate = true;
				function handleObserve(entries) {
					const ratio = entries[0].intersectionRatio;
					if (!rectsAreEqual(elementRectForRootMargin, element.getBoundingClientRect())) return refresh();
					if (ratio !== threshold) {
						if (!isFirstUpdate) return refresh();
						if (!ratio) timeoutId = setTimeout(() => {
							refresh(false, 1e-7);
						}, 1e3);
						else refresh(false, ratio);
					}
					isFirstUpdate = false;
				}
				try {
					io = new IntersectionObserver(handleObserve, {
						...options,
						root: root.ownerDocument
					});
				} catch (_e) {
					io = new IntersectionObserver(handleObserve, options);
				}
				io.observe(element);
			}
			const win = getWindow(element);
			const handleResize = () => refresh(ancestorResize);
			win.addEventListener("resize", handleResize);
			refresh(true);
			return () => {
				win.removeEventListener("resize", handleResize);
				cleanup();
			};
		}
		/**
		* Automatically updates the position of the floating element when necessary.
		* Should only be called when the floating element is mounted on the DOM or
		* visible on the screen.
		* @returns cleanup function that should be invoked when the floating element is
		* removed from the DOM or hidden from the screen.
		* @see https://floating-ui.com/docs/autoUpdate
		*/
		function autoUpdate(reference, floating, update, options) {
			if (options === void 0) options = {};
			const { ancestorScroll = true, ancestorResize = true, elementResize = typeof ResizeObserver === "function", layoutShift = typeof IntersectionObserver === "function", animationFrame = false } = options;
			const referenceEl = unwrapElement(reference);
			const ancestors = ancestorScroll || ancestorResize ? [...referenceEl ? getOverflowAncestors(referenceEl) : [], ...floating ? getOverflowAncestors(floating) : []] : [];
			ancestors.forEach((ancestor) => {
				ancestorScroll && ancestor.addEventListener("scroll", update);
				ancestorResize && ancestor.addEventListener("resize", update);
			});
			const cleanupIo = referenceEl && layoutShift ? observeMove(referenceEl, update, ancestorResize) : null;
			let reobserveFrame = -1;
			let resizeObserver = null;
			if (elementResize) {
				resizeObserver = new ResizeObserver((_ref) => {
					let [firstEntry] = _ref;
					if (firstEntry && firstEntry.target === referenceEl && resizeObserver && floating) {
						resizeObserver.unobserve(floating);
						cancelAnimationFrame(reobserveFrame);
						reobserveFrame = requestAnimationFrame(() => {
							var _resizeObserver;
							(_resizeObserver = resizeObserver) == null || _resizeObserver.observe(floating);
						});
					}
					update();
				});
				if (referenceEl && !animationFrame) resizeObserver.observe(referenceEl);
				if (floating) resizeObserver.observe(floating);
			}
			let frameId;
			let prevRefRect = animationFrame ? getBoundingClientRect(reference) : null;
			if (animationFrame) frameLoop();
			function frameLoop() {
				const nextRefRect = getBoundingClientRect(reference);
				if (prevRefRect && !rectsAreEqual(prevRefRect, nextRefRect)) update();
				prevRefRect = nextRefRect;
				frameId = requestAnimationFrame(frameLoop);
			}
			update();
			return () => {
				var _resizeObserver2;
				ancestors.forEach((ancestor) => {
					ancestorScroll && ancestor.removeEventListener("scroll", update);
					ancestorResize && ancestor.removeEventListener("resize", update);
				});
				cleanupIo?.();
				(_resizeObserver2 = resizeObserver) == null || _resizeObserver2.disconnect();
				resizeObserver = null;
				if (animationFrame) cancelAnimationFrame(frameId);
			};
		}
		/**
		* Modifies the placement by translating the floating element along the
		* specified axes.
		* A number (shorthand for `mainAxis` or distance), or an axes configuration
		* object may be passed.
		* @see https://floating-ui.com/docs/offset
		*/
		const offset$1 = offset$2;
		/**
		* Optimizes the visibility of the floating element by shifting it in order to
		* keep it in view when it will overflow the clipping boundary.
		* @see https://floating-ui.com/docs/shift
		*/
		const shift$1 = shift$2;
		/**
		* Optimizes the visibility of the floating element by flipping the `placement`
		* in order to keep it in view when the preferred placement(s) will overflow the
		* clipping boundary. Alternative to `autoPlacement`.
		* @see https://floating-ui.com/docs/flip
		*/
		const flip$1 = flip$2;
		/**
		* Provides data that allows you to change the size of the floating element —
		* for instance, prevent it from overflowing the clipping boundary or match the
		* width of the reference element.
		* @see https://floating-ui.com/docs/size
		*/
		const size$1 = size$2;
		/**
		* Provides data to hide the floating element in applicable situations, such as
		* when it is not in the same clipping context as the reference element.
		* @see https://floating-ui.com/docs/hide
		*/
		const hide$1 = hide$2;
		/**
		* Provides data to position an inner element of the floating element so that it
		* appears centered to the reference element.
		* @see https://floating-ui.com/docs/arrow
		*/
		const arrow$2 = arrow$3;
		/**
		* Built-in `limiter` that will stop `shift()` at a certain point.
		*/
		const limitShift$1 = limitShift$2;
		/**
		* Computes the `x` and `y` coordinates that will place the floating element
		* next to a given reference element.
		*/
		const computePosition = (reference, floating, options) => {
			const cache = /* @__PURE__ */ new Map();
			const mergedOptions = options != null ? options : {};
			const platformWithCache = {
				...platform,
				...mergedOptions.platform,
				_c: cache
			};
			return computePosition$1(reference, floating, {
				...mergedOptions,
				platform: platformWithCache
			});
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@floating-ui+react-dom@2.1.9_react-dom@18.2.0_react@18.3.1__react@18.3.1/node_modules/@floating-ui/react-dom/dist/floating-ui.react-dom.mjs
		var index = typeof document !== "undefined" ? react.useLayoutEffect : function noop() {};
		function deepEqual(a, b) {
			if (a === b) return true;
			if (typeof a !== typeof b) return false;
			if (typeof a === "function" && a.toString() === b.toString()) return true;
			let length;
			let i;
			let keys;
			if (a && b && typeof a === "object") {
				if (Array.isArray(a)) {
					length = a.length;
					if (length !== b.length) return false;
					for (i = length; i-- !== 0;) if (!deepEqual(a[i], b[i])) return false;
					return true;
				}
				keys = Object.keys(a);
				length = keys.length;
				if (length !== Object.keys(b).length) return false;
				for (i = length; i-- !== 0;) if (!{}.hasOwnProperty.call(b, keys[i])) return false;
				for (i = length; i-- !== 0;) {
					const key = keys[i];
					if (key === "_owner" && a.$$typeof) continue;
					if (!deepEqual(a[key], b[key])) return false;
				}
				return true;
			}
			return a !== a && b !== b;
		}
		function getDPR(element) {
			if (typeof window === "undefined") return 1;
			return (element.ownerDocument.defaultView || window).devicePixelRatio || 1;
		}
		function roundByDPR(element, value) {
			const dpr = getDPR(element);
			return Math.round(value * dpr) / dpr;
		}
		function useLatestRef(value) {
			const ref = react.useRef(value);
			index(() => {
				ref.current = value;
			});
			return ref;
		}
		/**
		* Provides data to position a floating element.
		* @see https://floating-ui.com/docs/useFloating
		*/
		function useFloating(options) {
			if (options === void 0) options = {};
			const { placement = "bottom", strategy = "absolute", middleware = [], platform, elements: { reference: externalReference, floating: externalFloating } = {}, transform = true, whileElementsMounted, open } = options;
			const [data, setData] = react.useState({
				x: 0,
				y: 0,
				strategy,
				placement,
				middlewareData: {},
				isPositioned: false
			});
			const [latestMiddleware, setLatestMiddleware] = react.useState(middleware);
			if (!deepEqual(latestMiddleware, middleware)) setLatestMiddleware(middleware);
			const [_reference, _setReference] = react.useState(null);
			const [_floating, _setFloating] = react.useState(null);
			const setReference = react.useCallback((node) => {
				if (node !== referenceRef.current) {
					referenceRef.current = node;
					_setReference(node);
				}
			}, []);
			const setFloating = react.useCallback((node) => {
				if (node !== floatingRef.current) {
					floatingRef.current = node;
					_setFloating(node);
				}
			}, []);
			const referenceEl = externalReference || _reference;
			const floatingEl = externalFloating || _floating;
			const referenceRef = react.useRef(null);
			const floatingRef = react.useRef(null);
			const dataRef = react.useRef(data);
			const hasWhileElementsMounted = whileElementsMounted != null;
			const whileElementsMountedRef = useLatestRef(whileElementsMounted);
			const platformRef = useLatestRef(platform);
			const openRef = useLatestRef(open);
			const update = react.useCallback(() => {
				if (!referenceRef.current || !floatingRef.current) return;
				const config = {
					placement,
					strategy,
					middleware: latestMiddleware
				};
				if (platformRef.current) config.platform = platformRef.current;
				computePosition(referenceRef.current, floatingRef.current, config).then((data) => {
					const fullData = {
						...data,
						isPositioned: openRef.current !== false
					};
					if (isMountedRef.current && !deepEqual(dataRef.current, fullData)) {
						dataRef.current = fullData;
						react_dom.flushSync(() => {
							setData(fullData);
						});
					}
				});
			}, [
				latestMiddleware,
				placement,
				strategy,
				platformRef,
				openRef
			]);
			index(() => {
				if (open === false && dataRef.current.isPositioned) {
					dataRef.current.isPositioned = false;
					setData((data) => ({
						...data,
						isPositioned: false
					}));
				}
			}, [open]);
			const isMountedRef = react.useRef(false);
			index(() => {
				isMountedRef.current = true;
				return () => {
					isMountedRef.current = false;
				};
			}, []);
			index(() => {
				if (referenceEl) referenceRef.current = referenceEl;
				if (floatingEl) floatingRef.current = floatingEl;
				if (referenceEl && floatingEl) {
					if (whileElementsMountedRef.current) return whileElementsMountedRef.current(referenceEl, floatingEl, update);
					update();
				}
			}, [
				referenceEl,
				floatingEl,
				update,
				whileElementsMountedRef,
				hasWhileElementsMounted
			]);
			const refs = react.useMemo(() => ({
				reference: referenceRef,
				floating: floatingRef,
				setReference,
				setFloating
			}), [setReference, setFloating]);
			const elements = react.useMemo(() => ({
				reference: referenceEl,
				floating: floatingEl
			}), [referenceEl, floatingEl]);
			const floatingStyles = react.useMemo(() => {
				const initialStyles = {
					position: strategy,
					left: 0,
					top: 0
				};
				if (!elements.floating) return initialStyles;
				const x = roundByDPR(elements.floating, data.x);
				const y = roundByDPR(elements.floating, data.y);
				if (transform) return {
					...initialStyles,
					transform: "translate(" + x + "px, " + y + "px)",
					...getDPR(elements.floating) >= 1.5 && { willChange: "transform" }
				};
				return {
					position: strategy,
					left: x,
					top: y
				};
			}, [
				strategy,
				transform,
				elements.floating,
				data.x,
				data.y
			]);
			return react.useMemo(() => ({
				...data,
				update,
				refs,
				elements,
				floatingStyles
			}), [
				data,
				update,
				refs,
				elements,
				floatingStyles
			]);
		}
		/**
		* Provides data to position an inner element of the floating element so that it
		* appears centered to the reference element.
		* This wraps the core `arrow` middleware to allow React refs as the element.
		* @see https://floating-ui.com/docs/arrow
		*/
		const arrow$1 = (options) => {
			function isRef(value) {
				return {}.hasOwnProperty.call(value, "current");
			}
			return {
				name: "arrow",
				options,
				fn(state) {
					const { element, padding } = typeof options === "function" ? options(state) : options;
					if (element && isRef(element)) {
						if (element.current != null) return arrow$2({
							element: element.current,
							padding
						}).fn(state);
						return {};
					}
					if (element) return arrow$2({
						element,
						padding
					}).fn(state);
					return {};
				}
			};
		};
		/**
		* Modifies the placement by translating the floating element along the
		* specified axes.
		* A number (shorthand for `mainAxis` or distance), or an axes configuration
		* object may be passed.
		* @see https://floating-ui.com/docs/offset
		*/
		const offset = (options, deps) => {
			const result = offset$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		/**
		* Optimizes the visibility of the floating element by shifting it in order to
		* keep it in view when it will overflow the clipping boundary.
		* @see https://floating-ui.com/docs/shift
		*/
		const shift = (options, deps) => {
			const result = shift$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		/**
		* Built-in `limiter` that will stop `shift()` at a certain point.
		*/
		const limitShift = (options, deps) => {
			return {
				fn: limitShift$1(options).fn,
				options: [options, deps]
			};
		};
		/**
		* Optimizes the visibility of the floating element by flipping the `placement`
		* in order to keep it in view when the preferred placement(s) will overflow the
		* clipping boundary. Alternative to `autoPlacement`.
		* @see https://floating-ui.com/docs/flip
		*/
		const flip = (options, deps) => {
			const result = flip$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		/**
		* Provides data that allows you to change the size of the floating element —
		* for instance, prevent it from overflowing the clipping boundary or match the
		* width of the reference element.
		* @see https://floating-ui.com/docs/size
		*/
		const size = (options, deps) => {
			const result = size$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		/**
		* Provides data to hide the floating element in applicable situations, such as
		* when it is not in the same clipping context as the reference element.
		* @see https://floating-ui.com/docs/hide
		*/
		const hide = (options, deps) => {
			const result = hide$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		/**
		* Provides data to position an inner element of the floating element so that it
		* appears centered to the reference element.
		* This wraps the core `arrow` middleware to allow React refs as the element.
		* @see https://floating-ui.com/docs/arrow
		*/
		const arrow = (options, deps) => {
			const result = arrow$1(options);
			return {
				name: result.name,
				fn: result.fn,
				options: [options, deps]
			};
		};
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-size@1.1.4_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-size/dist/index.mjs
		var __defProp$7 = Object.defineProperty;
		var __name$7 = (target, value) => __defProp$7(target, "name", {
			value,
			configurable: true
		});
		function useSize(element) {
			const [size, setSize] = react.useState(void 0);
			useLayoutEffect2(() => {
				if (element) {
					setSize({
						width: element.offsetWidth,
						height: element.offsetHeight
					});
					const resizeObserver = new ResizeObserver((entries) => {
						if (!Array.isArray(entries)) return;
						if (!entries.length) return;
						const entry = entries[0];
						let width;
						let height;
						if ("borderBoxSize" in entry) {
							const borderSizeEntry = entry["borderBoxSize"];
							const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
							width = borderSize["inlineSize"];
							height = borderSize["blockSize"];
						} else {
							width = element.offsetWidth;
							height = element.offsetHeight;
						}
						setSize({
							width,
							height
						});
					});
					resizeObserver.observe(element, { box: "border-box" });
					return () => resizeObserver.unobserve(element);
				} else setSize(void 0);
			}, [element]);
			return size;
		}
		__name$7(useSize, "useSize");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-popper@1.3.7_@types+react-dom@18.3.7_@types+react@18.3.31__@types+react_28096db0f9bde2423c97e3931a7c2161/node_modules/@radix-ui/react-popper/dist/index.mjs
		var __defProp$6 = Object.defineProperty;
		var __name$6 = (target, value) => __defProp$6(target, "name", {
			value,
			configurable: true
		});
		var POPPER_NAME = "Popper";
		var [createPopperContext, createPopperScope] = /* @__PURE__ */ createContextScope(POPPER_NAME);
		var [PopperProvider, usePopperContext] = createPopperContext(POPPER_NAME);
		var Popper = /* @__PURE__ */ __name$6((props) => {
			const { __scopePopper, children } = props;
			const [anchor, setAnchor] = react.useState(null);
			const [placementState, setPlacementState] = react.useState(void 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopperProvider, {
				scope: __scopePopper,
				anchor,
				onAnchorChange: setAnchor,
				placementState,
				setPlacementState,
				children
			});
		}, "Popper");
		var ANCHOR_NAME = "PopperAnchor";
		var PopperAnchor = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$6(function PopperAnchor2(props, forwardedRef) {
			const { __scopePopper, virtualRef, ...anchorProps } = props;
			const context = usePopperContext(ANCHOR_NAME, __scopePopper);
			const ref = react.useRef(null);
			const onAnchorChange = context.onAnchorChange;
			const composedRefs = useComposedRefs(forwardedRef, react.useCallback((node) => {
				ref.current = node;
				if (node) onAnchorChange(node);
			}, [onAnchorChange]));
			const anchorRef = react.useRef(null);
			react.useEffect(() => {
				if (!virtualRef) return;
				const previousAnchor = anchorRef.current;
				anchorRef.current = virtualRef.current;
				if (previousAnchor !== anchorRef.current) onAnchorChange(anchorRef.current);
			});
			const sideAndAlign = context.placementState && getSideAndAlignFromPlacement(context.placementState);
			const placedSide = sideAndAlign?.[0];
			const placedAlign = sideAndAlign?.[1];
			return virtualRef ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
				"data-radix-popper-side": placedSide,
				"data-radix-popper-align": placedAlign,
				...anchorProps,
				ref: composedRefs
			});
		}, "PopperAnchor"));
		var CONTENT_NAME$2 = "PopperContent";
		var [PopperContentProvider, useContentContext] = createPopperContext(CONTENT_NAME$2);
		var PopperContent = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$6(function PopperContent2(props, forwardedRef) {
			const { __scopePopper, side = "bottom", sideOffset = 0, align = "center", alignOffset = 0, arrowPadding = 0, avoidCollisions = true, collisionBoundary = [], collisionPadding: collisionPaddingProp = 0, sticky = "partial", hideWhenDetached = false, updatePositionStrategy = "optimized", onPlaced, ...contentProps } = props;
			const context = usePopperContext(CONTENT_NAME$2, __scopePopper);
			const [content, setContent] = react.useState(null);
			const composedRefs = useComposedRefs(forwardedRef, setContent);
			const [arrow$4, setArrow] = react.useState(null);
			const arrowSize = useSize(arrow$4);
			const arrowWidth = arrowSize?.width ?? 0;
			const arrowHeight = arrowSize?.height ?? 0;
			const desiredPlacement = side + (align !== "center" ? "-" + align : "");
			const collisionPadding = typeof collisionPaddingProp === "number" ? collisionPaddingProp : {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				...collisionPaddingProp
			};
			const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
			const hasExplicitBoundaries = boundary.length > 0;
			const detectOverflowOptions = {
				padding: collisionPadding,
				boundary: boundary.filter(isNotNull),
				altBoundary: hasExplicitBoundaries
			};
			const { refs, floatingStyles, placement, isPositioned, middlewareData } = useFloating({
				strategy: "fixed",
				placement: desiredPlacement,
				whileElementsMounted: /* @__PURE__ */ __name$6((...args) => {
					return autoUpdate(...args, { animationFrame: updatePositionStrategy === "always" });
				}, "whileElementsMounted"),
				elements: { reference: context.anchor },
				middleware: [
					offset({
						mainAxis: sideOffset + arrowHeight,
						alignmentAxis: alignOffset
					}),
					avoidCollisions && shift({
						mainAxis: true,
						crossAxis: false,
						limiter: sticky === "partial" ? limitShift() : void 0,
						...detectOverflowOptions
					}),
					avoidCollisions && flip({ ...detectOverflowOptions }),
					size({
						...detectOverflowOptions,
						apply: /* @__PURE__ */ __name$6(({ elements, rects, availableWidth, availableHeight }) => {
							const { width: anchorWidth, height: anchorHeight } = rects.reference;
							const contentStyle = elements.floating.style;
							contentStyle.setProperty("--radix-popper-available-width", `${availableWidth}px`);
							contentStyle.setProperty("--radix-popper-available-height", `${availableHeight}px`);
							contentStyle.setProperty("--radix-popper-anchor-width", `${anchorWidth}px`);
							contentStyle.setProperty("--radix-popper-anchor-height", `${anchorHeight}px`);
						}, "apply")
					}),
					arrow$4 && arrow({
						element: arrow$4,
						padding: arrowPadding
					}),
					transformOrigin({
						arrowWidth,
						arrowHeight
					}),
					hideWhenDetached && hide({
						strategy: "referenceHidden",
						...detectOverflowOptions,
						boundary: hasExplicitBoundaries ? detectOverflowOptions.boundary : void 0
					})
				]
			});
			const setPlacementState = context.setPlacementState;
			useLayoutEffect2(() => {
				setPlacementState(placement);
				return () => {
					setPlacementState(void 0);
				};
			}, [placement, setPlacementState]);
			const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
			const handlePlaced = useCallbackRef(onPlaced);
			useLayoutEffect2(() => {
				if (isPositioned) handlePlaced?.();
			}, [isPositioned, handlePlaced]);
			const arrowX = middlewareData.arrow?.x;
			const arrowY = middlewareData.arrow?.y;
			const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
			const [contentZIndex, setContentZIndex] = react.useState();
			useLayoutEffect2(() => {
				if (content) setContentZIndex(window.getComputedStyle(content).zIndex);
			}, [content]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: refs.setFloating,
				"data-radix-popper-content-wrapper": "",
				style: {
					...floatingStyles,
					transform: isPositioned ? floatingStyles.transform : "translate(0, -200%)",
					minWidth: "max-content",
					zIndex: contentZIndex,
					"--radix-popper-transform-origin": [middlewareData.transformOrigin?.x, middlewareData.transformOrigin?.y].join(" "),
					...middlewareData.hide?.referenceHidden && {
						visibility: "hidden",
						pointerEvents: "none"
					}
				},
				dir: props.dir,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopperContentProvider, {
					scope: __scopePopper,
					placedSide,
					placedAlign,
					onArrowChange: setArrow,
					arrowX,
					arrowY,
					shouldHideArrow: cannotCenterArrow,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
						"data-side": placedSide,
						"data-align": placedAlign,
						...contentProps,
						ref: composedRefs,
						style: {
							...contentProps.style,
							animation: !isPositioned ? "none" : contentProps.style?.animation
						}
					})
				})
			});
		}, "PopperContent"));
		function isNotNull(value) {
			return value !== null;
		}
		__name$6(isNotNull, "isNotNull");
		var transformOrigin = /* @__PURE__ */ __name$6((options) => ({
			name: "transformOrigin",
			options,
			fn(data) {
				const { placement, rects, middlewareData } = data;
				const isArrowHidden = middlewareData.arrow?.centerOffset !== 0;
				const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
				const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;
				const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
				const noArrowAlign = {
					start: "0%",
					center: "50%",
					end: "100%"
				}[placedAlign];
				const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
				const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
				let x = "";
				let y = "";
				if (placedSide === "bottom") {
					x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
					y = `${-arrowHeight}px`;
				} else if (placedSide === "top") {
					x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
					y = `${rects.floating.height + arrowHeight}px`;
				} else if (placedSide === "right") {
					x = `${-arrowHeight}px`;
					y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
				} else if (placedSide === "left") {
					x = `${rects.floating.width + arrowHeight}px`;
					y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
				}
				return { data: {
					x,
					y
				} };
			}
		}), "transformOrigin");
		function getSideAndAlignFromPlacement(placement) {
			const [side, align = "center"] = placement.split("-");
			return [side, align];
		}
		__name$6(getSideAndAlignFromPlacement, "getSideAndAlignFromPlacement");
		var Root2$1 = Popper;
		var Anchor = PopperAnchor;
		var Content = PopperContent;
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-portal@1.1.17_@types+react-dom@18.3.7_@types+react@18.3.31__@types+reac_fec8154ee9f066565a91ca8c6ba2c7d1/node_modules/@radix-ui/react-portal/dist/index.mjs
		var __defProp$5 = Object.defineProperty;
		var __name$5 = (target, value) => __defProp$5(target, "name", {
			value,
			configurable: true
		});
		var Portal$1 = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$5(function Portal2(props, forwardedRef) {
			const { container: containerProp, ...portalProps } = props;
			const [mounted, setMounted] = react.useState(false);
			useLayoutEffect2(() => setMounted(true), []);
			const container = containerProp || mounted && globalThis?.document?.body;
			return container ? react_dom.createPortal(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
				...portalProps,
				ref: forwardedRef
			}), container) : null;
		}, "Portal"));
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-presence@1.1.10_@types+react-dom@18.3.7_@types+react@18.3.31__@types+re_1e2cd35b12d6127fe3d2d84d5861b3c1/node_modules/@radix-ui/react-presence/dist/index.mjs
		var __defProp$4 = Object.defineProperty;
		var __name$4 = (target, value) => __defProp$4(target, "name", {
			value,
			configurable: true
		});
		function useStateMachine(initialState, machine) {
			return react.useReducer((state, event) => {
				return machine[state][event] ?? state;
			}, initialState);
		}
		__name$4(useStateMachine, "useStateMachine");
		var Presence = /* @__PURE__ */ __name$4((props) => {
			const { present, children } = props;
			const presence = usePresence(present);
			const child = typeof children === "function" ? children({ present: presence.isPresent }) : react.Children.only(children);
			const ref = useStableComposedRefs(presence.ref, getElementRef(child));
			return typeof children === "function" || presence.isPresent ? react.cloneElement(child, { ref }) : null;
		}, "Presence");
		function usePresence(present) {
			const [node, setNode] = react.useState();
			const stylesRef = react.useRef(null);
			const prevPresentRef = react.useRef(present);
			const prevAnimationNameRef = react.useRef("none");
			const mountAnimationNameRef = react.useRef(void 0);
			const [state, send] = useStateMachine(present ? "mounted" : "unmounted", {
				mounted: {
					UNMOUNT: "unmounted",
					ANIMATION_OUT: "unmountSuspended"
				},
				unmountSuspended: {
					MOUNT: "mounted",
					ANIMATION_END: "unmounted"
				},
				unmounted: { MOUNT: "mounted" }
			});
			react.useEffect(() => {
				if (state === "mounted") {
					prevAnimationNameRef.current = mountAnimationNameRef.current ?? getAnimationName(stylesRef.current);
					mountAnimationNameRef.current = void 0;
				} else prevAnimationNameRef.current = "none";
			}, [state]);
			useLayoutEffect2(() => {
				const styles = stylesRef.current;
				const wasPresent = prevPresentRef.current;
				if (wasPresent !== present) {
					const prevAnimationName = prevAnimationNameRef.current;
					const currentAnimationName = getAnimationName(styles);
					if (present) {
						mountAnimationNameRef.current = currentAnimationName;
						send("MOUNT");
					} else if (currentAnimationName === "none" || styles?.display === "none") send("UNMOUNT");
					else if (wasPresent && prevAnimationName !== currentAnimationName) send("ANIMATION_OUT");
					else send("UNMOUNT");
					prevPresentRef.current = present;
				}
			}, [present, send]);
			useLayoutEffect2(() => {
				if (node) {
					let timeoutId;
					const ownerWindow = node.ownerDocument.defaultView ?? window;
					const handleAnimationEnd = /* @__PURE__ */ __name$4((event) => {
						const isCurrentAnimation = getAnimationName(stylesRef.current).includes(CSS.escape(event.animationName));
						if (event.target === node && isCurrentAnimation) {
							send("ANIMATION_END");
							if (!prevPresentRef.current) {
								const currentFillMode = node.style.animationFillMode;
								node.style.animationFillMode = "forwards";
								timeoutId = ownerWindow.setTimeout(() => {
									if (node.style.animationFillMode === "forwards") node.style.animationFillMode = currentFillMode;
								});
							}
						}
					}, "handleAnimationEnd");
					const handleAnimationStart = /* @__PURE__ */ __name$4((event) => {
						if (event.target === node) prevAnimationNameRef.current = getAnimationName(stylesRef.current);
					}, "handleAnimationStart");
					node.addEventListener("animationstart", handleAnimationStart);
					node.addEventListener("animationcancel", handleAnimationEnd);
					node.addEventListener("animationend", handleAnimationEnd);
					return () => {
						ownerWindow.clearTimeout(timeoutId);
						node.removeEventListener("animationstart", handleAnimationStart);
						node.removeEventListener("animationcancel", handleAnimationEnd);
						node.removeEventListener("animationend", handleAnimationEnd);
					};
				} else send("ANIMATION_END");
			}, [node, send]);
			return {
				isPresent: ["mounted", "unmountSuspended"].includes(state),
				ref: react.useCallback((node2) => {
					if (node2) {
						const styles = getComputedStyle(node2);
						stylesRef.current = styles;
						mountAnimationNameRef.current = getAnimationName(styles);
					} else stylesRef.current = null;
					setNode(node2);
				}, [])
			};
		}
		__name$4(usePresence, "usePresence");
		function setRef(ref, value) {
			if (typeof ref === "function") return ref(value);
			else if (ref !== null && ref !== void 0) ref.current = value;
		}
		__name$4(setRef, "setRef");
		function useStableComposedRefs(...refs) {
			const refsRef = react.useRef(refs);
			refsRef.current = refs;
			return react.useCallback((node) => {
				const currentRefs = refsRef.current;
				let hasCleanup = false;
				const cleanups = currentRefs.map((ref) => {
					const cleanup = setRef(ref, node);
					if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
					return cleanup;
				});
				if (hasCleanup) return () => {
					for (let i = 0; i < cleanups.length; i++) {
						const cleanup = cleanups[i];
						if (typeof cleanup === "function") cleanup();
						else setRef(currentRefs[i], null);
					}
				};
			}, []);
		}
		__name$4(useStableComposedRefs, "useStableComposedRefs");
		function getAnimationName(styles) {
			return styles?.animationName || "none";
		}
		__name$4(getAnimationName, "getAnimationName");
		function getElementRef(element) {
			let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
			let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
			if (mayWarn) return element.ref;
			getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
			mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
			if (mayWarn) return element.props.ref;
			return element.props.ref || element.ref;
		}
		__name$4(getElementRef, "getElementRef");
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-use-is-hydrated@0.1.3_@types+react@18.3.31_react@18.3.1/node_modules/@radix-ui/react-use-is-hydrated/dist/index.mjs
		var __defProp$3 = Object.defineProperty;
		var __name$3 = (target, value) => __defProp$3(target, "name", {
			value,
			configurable: true
		});
		var _isHydrated = false;
		function useIsHydrated() {
			const [isHydrated, setIsHydrated] = react.useState(_isHydrated);
			react.useEffect(() => {
				if (!_isHydrated) {
					_isHydrated = true;
					setIsHydrated(true);
				}
			}, []);
			return isHydrated;
		}
		__name$3(useIsHydrated, "useIsHydrated");
		var useReactSyncExternalStore = react[" useSyncExternalStore ".trim().toString()];
		function subscribe() {
			return () => {};
		}
		__name$3(subscribe, "subscribe");
		function useIsHydratedModern() {
			return useReactSyncExternalStore(subscribe, () => true, () => false);
		}
		__name$3(useIsHydratedModern, "useIsHydratedModern");
		var useIsHydrated2 = typeof useReactSyncExternalStore === "function" ? useIsHydratedModern : useIsHydrated;
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-roving-focus@1.1.19_@types+react-dom@18.3.7_@types+react@18.3.31__@type_ae2d963fea1b25890101d299bacd26ae/node_modules/@radix-ui/react-roving-focus/dist/index.mjs
		var __defProp$2 = Object.defineProperty;
		var __name$2 = (target, value) => __defProp$2(target, "name", {
			value,
			configurable: true
		});
		var ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
		var EVENT_OPTIONS = {
			bubbles: false,
			cancelable: true
		};
		var GROUP_NAME = "RovingFocusGroup";
		var [Collection$1, useCollection$1, createCollectionScope$1] = /* @__PURE__ */ createCollection(GROUP_NAME);
		var [createRovingFocusGroupContext, createRovingFocusGroupScope] = /* @__PURE__ */ createContextScope(GROUP_NAME, [createCollectionScope$1]);
		var [RovingFocusProvider, useRovingFocusContext] = createRovingFocusGroupContext(GROUP_NAME);
		var RovingFocusGroup = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$2(function RovingFocusGroup2(props, forwardedRef) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection$1.Provider, {
				scope: props.__scopeRovingFocusGroup,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection$1.Slot, {
					scope: props.__scopeRovingFocusGroup,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RovingFocusGroupImpl, {
						...props,
						ref: forwardedRef
					})
				})
			});
		}, "RovingFocusGroup"));
		var RovingFocusGroupImpl = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$2(function RovingFocusGroupImpl2(props, forwardedRef) {
			const { __scopeRovingFocusGroup, orientation, loop = false, dir, currentTabStopId: currentTabStopIdProp, defaultCurrentTabStopId, onCurrentTabStopIdChange, onEntryFocus, preventScrollOnEntryFocus = false, ...groupProps } = props;
			const ref = react.useRef(null);
			const composedRefs = useComposedRefs(forwardedRef, ref);
			const direction = useDirection(dir);
			const [currentTabStopId, setCurrentTabStopId] = useControllableState({
				prop: currentTabStopIdProp,
				defaultProp: defaultCurrentTabStopId ?? null,
				onChange: onCurrentTabStopIdChange,
				caller: GROUP_NAME
			});
			const [isTabbingBackOut, setIsTabbingBackOut] = react.useState(false);
			const handleEntryFocus = useCallbackRef(onEntryFocus);
			const getItems = useCollection$1(__scopeRovingFocusGroup);
			const isClickFocusRef = react.useRef(false);
			const [focusableItemsCount, setFocusableItemsCount] = react.useState(0);
			react.useEffect(() => {
				const node = ref.current;
				if (node) {
					node.addEventListener(ENTRY_FOCUS, handleEntryFocus);
					return () => node.removeEventListener(ENTRY_FOCUS, handleEntryFocus);
				}
			}, [handleEntryFocus]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RovingFocusProvider, {
				scope: __scopeRovingFocusGroup,
				orientation,
				dir: direction,
				loop,
				currentTabStopId,
				onItemFocus: react.useCallback((tabStopId) => setCurrentTabStopId(tabStopId), [setCurrentTabStopId]),
				onItemShiftTab: react.useCallback(() => setIsTabbingBackOut(true), []),
				onFocusableItemAdd: react.useCallback(() => setFocusableItemsCount((prevCount) => prevCount + 1), []),
				onFocusableItemRemove: react.useCallback(() => setFocusableItemsCount((prevCount) => prevCount - 1), []),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
					tabIndex: isTabbingBackOut || focusableItemsCount === 0 ? -1 : 0,
					"data-orientation": orientation,
					...groupProps,
					ref: composedRefs,
					style: {
						outline: "none",
						...props.style
					},
					onMouseDown: composeEventHandlers(props.onMouseDown, () => {
						isClickFocusRef.current = true;
					}),
					onFocus: composeEventHandlers(props.onFocus, (event) => {
						const isKeyboardFocus = !isClickFocusRef.current;
						if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
							const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
							event.currentTarget.dispatchEvent(entryFocusEvent);
							if (!entryFocusEvent.defaultPrevented) {
								const items = getItems().filter((item) => item.focusable);
								focusFirst$1([
									items.find((item) => item.active),
									items.find((item) => item.id === currentTabStopId),
									...items
								].filter(Boolean).map((item) => item.ref.current), preventScrollOnEntryFocus);
							}
						}
						isClickFocusRef.current = false;
					}),
					onBlur: composeEventHandlers(props.onBlur, () => setIsTabbingBackOut(false))
				})
			});
		}, "RovingFocusGroupImpl"));
		var ITEM_NAME$1 = "RovingFocusGroupItem";
		var RovingFocusGroupItem = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$2(function RovingFocusGroupItem2(props, forwardedRef) {
			const { __scopeRovingFocusGroup, focusable = true, active = false, tabStopId, children, ...itemProps } = props;
			const autoId = useId();
			const id = tabStopId || autoId;
			const context = useRovingFocusContext(ITEM_NAME$1, __scopeRovingFocusGroup);
			const isCurrentTabStop = context.currentTabStopId === id;
			const getItems = useCollection$1(__scopeRovingFocusGroup);
			const { onFocusableItemAdd, onFocusableItemRemove, currentTabStopId } = context;
			const isHydrated = useIsHydrated2();
			useLayoutEffect2(() => {
				if (!isHydrated || !focusable) return;
				onFocusableItemAdd();
				return () => onFocusableItemRemove();
			}, [
				isHydrated,
				focusable,
				onFocusableItemAdd,
				onFocusableItemRemove
			]);
			react.useEffect(() => {
				if (isHydrated || !focusable) return;
				onFocusableItemAdd();
				return () => onFocusableItemRemove();
			}, [
				isHydrated,
				focusable,
				onFocusableItemAdd,
				onFocusableItemRemove
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection$1.ItemSlot, {
				scope: __scopeRovingFocusGroup,
				id,
				focusable,
				active,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.span, {
					tabIndex: isCurrentTabStop ? 0 : -1,
					"data-orientation": context.orientation,
					...itemProps,
					ref: forwardedRef,
					onMouseDown: composeEventHandlers(props.onMouseDown, (event) => {
						if (!focusable) event.preventDefault();
						else context.onItemFocus(id);
					}),
					onFocus: composeEventHandlers(props.onFocus, () => context.onItemFocus(id)),
					onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
						if (event.key === "Tab" && event.shiftKey) {
							context.onItemShiftTab();
							return;
						}
						if (event.target !== event.currentTarget) return;
						const focusIntent = getFocusIntent(event, context.orientation, context.dir);
						if (focusIntent !== void 0) {
							if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
							event.preventDefault();
							let candidateNodes = getItems().filter((item) => item.focusable).map((item) => item.ref.current);
							if (focusIntent === "last") candidateNodes.reverse();
							else if (focusIntent === "prev" || focusIntent === "next") {
								if (focusIntent === "prev") candidateNodes.reverse();
								const currentIndex = candidateNodes.indexOf(event.currentTarget);
								candidateNodes = context.loop ? wrapArray$1(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
							}
							setTimeout(() => focusFirst$1(candidateNodes));
						}
					}),
					children: typeof children === "function" ? children({
						isCurrentTabStop,
						hasTabStop: currentTabStopId != null
					}) : children
				})
			});
		}, "RovingFocusGroupItem"));
		var MAP_KEY_TO_FOCUS_INTENT = {
			ArrowLeft: "prev",
			ArrowUp: "prev",
			ArrowRight: "next",
			ArrowDown: "next",
			PageUp: "first",
			Home: "first",
			PageDown: "last",
			End: "last"
		};
		function getDirectionAwareKey(key, dir) {
			if (dir !== "rtl") return key;
			return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
		}
		__name$2(getDirectionAwareKey, "getDirectionAwareKey");
		function getFocusIntent(event, orientation, dir) {
			const key = getDirectionAwareKey(event.key, dir);
			if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
			if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
			return MAP_KEY_TO_FOCUS_INTENT[key];
		}
		__name$2(getFocusIntent, "getFocusIntent");
		function focusFirst$1(candidates, preventScroll = false) {
			const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
			for (const candidate of candidates) {
				if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
				candidate.focus({ preventScroll });
				if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
			}
		}
		__name$2(focusFirst$1, "focusFirst");
		function wrapArray$1(array, startIndex) {
			return array.map((_, index) => array[(startIndex + index) % array.length]);
		}
		__name$2(wrapArray$1, "wrapArray");
		var Root = RovingFocusGroup;
		var Item = RovingFocusGroupItem;
		//#endregion
		//#region ../../node_modules/.pnpm/aria-hidden@1.2.6/node_modules/aria-hidden/dist/es5/index.js
		var require_es5$6 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.suppressOthers = exports.supportsInert = exports.inertOthers = exports.hideOthers = void 0;
			var getDefaultParent = function(originalTarget) {
				if (typeof document === "undefined") return null;
				return (Array.isArray(originalTarget) ? originalTarget[0] : originalTarget).ownerDocument.body;
			};
			var counterMap = /* @__PURE__ */ new WeakMap();
			var uncontrolledNodes = /* @__PURE__ */ new WeakMap();
			var markerMap = {};
			var lockCount = 0;
			var unwrapHost = function(node) {
				return node && (node.host || unwrapHost(node.parentNode));
			};
			var correctTargets = function(parent, targets) {
				return targets.map(function(target) {
					if (parent.contains(target)) return target;
					var correctedTarget = unwrapHost(target);
					if (correctedTarget && parent.contains(correctedTarget)) return correctedTarget;
					console.error("aria-hidden", target, "in not contained inside", parent, ". Doing nothing");
					return null;
				}).filter(function(x) {
					return Boolean(x);
				});
			};
			/**
			* Marks everything except given node(or nodes) as aria-hidden
			* @param {Element | Element[]} originalTarget - elements to keep on the page
			* @param [parentNode] - top element, defaults to document.body
			* @param {String} [markerName] - a special attribute to mark every node
			* @param {String} [controlAttribute] - html Attribute to control
			* @return {Undo} undo command
			*/
			var applyAttributeToOthers = function(originalTarget, parentNode, markerName, controlAttribute) {
				var targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
				if (!markerMap[markerName]) markerMap[markerName] = /* @__PURE__ */ new WeakMap();
				var markerCounter = markerMap[markerName];
				var hiddenNodes = [];
				var elementsToKeep = /* @__PURE__ */ new Set();
				var elementsToStop = new Set(targets);
				var keep = function(el) {
					if (!el || elementsToKeep.has(el)) return;
					elementsToKeep.add(el);
					keep(el.parentNode);
				};
				targets.forEach(keep);
				var deep = function(parent) {
					if (!parent || elementsToStop.has(parent)) return;
					Array.prototype.forEach.call(parent.children, function(node) {
						if (elementsToKeep.has(node)) deep(node);
						else try {
							var attr = node.getAttribute(controlAttribute);
							var alreadyHidden = attr !== null && attr !== "false";
							var counterValue = (counterMap.get(node) || 0) + 1;
							var markerValue = (markerCounter.get(node) || 0) + 1;
							counterMap.set(node, counterValue);
							markerCounter.set(node, markerValue);
							hiddenNodes.push(node);
							if (counterValue === 1 && alreadyHidden) uncontrolledNodes.set(node, true);
							if (markerValue === 1) node.setAttribute(markerName, "true");
							if (!alreadyHidden) node.setAttribute(controlAttribute, "true");
						} catch (e) {
							console.error("aria-hidden: cannot operate on ", node, e);
						}
					});
				};
				deep(parentNode);
				elementsToKeep.clear();
				lockCount++;
				return function() {
					hiddenNodes.forEach(function(node) {
						var counterValue = counterMap.get(node) - 1;
						var markerValue = markerCounter.get(node) - 1;
						counterMap.set(node, counterValue);
						markerCounter.set(node, markerValue);
						if (!counterValue) {
							if (!uncontrolledNodes.has(node)) node.removeAttribute(controlAttribute);
							uncontrolledNodes.delete(node);
						}
						if (!markerValue) node.removeAttribute(markerName);
					});
					lockCount--;
					if (!lockCount) {
						counterMap = /* @__PURE__ */ new WeakMap();
						counterMap = /* @__PURE__ */ new WeakMap();
						uncontrolledNodes = /* @__PURE__ */ new WeakMap();
						markerMap = {};
					}
				};
			};
			/**
			* Marks everything except given node(or nodes) as aria-hidden
			* @param {Element | Element[]} originalTarget - elements to keep on the page
			* @param [parentNode] - top element, defaults to document.body
			* @param {String} [markerName] - a special attribute to mark every node
			* @return {Undo} undo command
			*/
			var hideOthers = function(originalTarget, parentNode, markerName) {
				if (markerName === void 0) markerName = "data-aria-hidden";
				var targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
				var activeParentNode = parentNode || getDefaultParent(originalTarget);
				if (!activeParentNode) return function() {
					return null;
				};
				targets.push.apply(targets, Array.from(activeParentNode.querySelectorAll("[aria-live], script")));
				return applyAttributeToOthers(targets, activeParentNode, markerName, "aria-hidden");
			};
			exports.hideOthers = hideOthers;
			/**
			* Marks everything except given node(or nodes) as inert
			* @param {Element | Element[]} originalTarget - elements to keep on the page
			* @param [parentNode] - top element, defaults to document.body
			* @param {String} [markerName] - a special attribute to mark every node
			* @return {Undo} undo command
			*/
			var inertOthers = function(originalTarget, parentNode, markerName) {
				if (markerName === void 0) markerName = "data-inert-ed";
				var activeParentNode = parentNode || getDefaultParent(originalTarget);
				if (!activeParentNode) return function() {
					return null;
				};
				return applyAttributeToOthers(originalTarget, activeParentNode, markerName, "inert");
			};
			exports.inertOthers = inertOthers;
			/**
			* @returns if current browser supports inert
			*/
			var supportsInert = function() {
				return typeof HTMLElement !== "undefined" && HTMLElement.prototype.hasOwnProperty("inert");
			};
			exports.supportsInert = supportsInert;
			/**
			* Automatic function to "suppress" DOM elements - _hide_ or _inert_ in the best possible way
			* @param {Element | Element[]} originalTarget - elements to keep on the page
			* @param [parentNode] - top element, defaults to document.body
			* @param {String} [markerName] - a special attribute to mark every node
			* @return {Undo} undo command
			*/
			var suppressOthers = function(originalTarget, parentNode, markerName) {
				if (markerName === void 0) markerName = "data-suppressed";
				return ((0, exports.supportsInert)() ? exports.inertOthers : exports.hideOthers)(originalTarget, parentNode, markerName);
			};
			exports.suppressOthers = suppressOthers;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/tslib@2.8.1/node_modules/tslib/tslib.es6.mjs
		var tslib_es6_exports = /* @__PURE__ */ __exportAll({
			__addDisposableResource: () => __addDisposableResource,
			__assign: () => __assign,
			__asyncDelegator: () => __asyncDelegator,
			__asyncGenerator: () => __asyncGenerator,
			__asyncValues: () => __asyncValues,
			__await: () => __await,
			__awaiter: () => __awaiter,
			__classPrivateFieldGet: () => __classPrivateFieldGet,
			__classPrivateFieldIn: () => __classPrivateFieldIn,
			__classPrivateFieldSet: () => __classPrivateFieldSet,
			__createBinding: () => __createBinding,
			__decorate: () => __decorate,
			__disposeResources: () => __disposeResources,
			__esDecorate: () => __esDecorate,
			__exportStar: () => __exportStar,
			__extends: () => __extends,
			__generator: () => __generator,
			__importDefault: () => __importDefault,
			__importStar: () => __importStar,
			__makeTemplateObject: () => __makeTemplateObject,
			__metadata: () => __metadata,
			__param: () => __param,
			__propKey: () => __propKey,
			__read: () => __read,
			__rest: () => __rest,
			__rewriteRelativeImportExtension: () => __rewriteRelativeImportExtension,
			__runInitializers: () => __runInitializers,
			__setFunctionName: () => __setFunctionName,
			__spread: () => __spread,
			__spreadArray: () => __spreadArray,
			__spreadArrays: () => __spreadArrays,
			__values: () => __values,
			default: () => tslib_es6_default
		});
		function __extends(d, b) {
			if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
			extendStatics(d, b);
			function __() {
				this.constructor = d;
			}
			d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
		}
		function __rest(s, e) {
			var t = {};
			for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
			if (s != null && typeof Object.getOwnPropertySymbols === "function") {
				for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
			}
			return t;
		}
		function __decorate(decorators, target, key, desc) {
			var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
			if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
			else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
			return c > 3 && r && Object.defineProperty(target, key, r), r;
		}
		function __param(paramIndex, decorator) {
			return function(target, key) {
				decorator(target, key, paramIndex);
			};
		}
		function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
			function accept(f) {
				if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
				return f;
			}
			var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
			var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
			var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
			var _, done = false;
			for (var i = decorators.length - 1; i >= 0; i--) {
				var context = {};
				for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
				for (var p in contextIn.access) context.access[p] = contextIn.access[p];
				context.addInitializer = function(f) {
					if (done) throw new TypeError("Cannot add initializers after decoration has completed");
					extraInitializers.push(accept(f || null));
				};
				var result = (0, decorators[i])(kind === "accessor" ? {
					get: descriptor.get,
					set: descriptor.set
				} : descriptor[key], context);
				if (kind === "accessor") {
					if (result === void 0) continue;
					if (result === null || typeof result !== "object") throw new TypeError("Object expected");
					if (_ = accept(result.get)) descriptor.get = _;
					if (_ = accept(result.set)) descriptor.set = _;
					if (_ = accept(result.init)) initializers.unshift(_);
				} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
				else descriptor[key] = _;
			}
			if (target) Object.defineProperty(target, contextIn.name, descriptor);
			done = true;
		}
		function __runInitializers(thisArg, initializers, value) {
			var useValue = arguments.length > 2;
			for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
			return useValue ? value : void 0;
		}
		function __propKey(x) {
			return typeof x === "symbol" ? x : "".concat(x);
		}
		function __setFunctionName(f, name, prefix) {
			if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
			return Object.defineProperty(f, "name", {
				configurable: true,
				value: prefix ? "".concat(prefix, " ", name) : name
			});
		}
		function __metadata(metadataKey, metadataValue) {
			if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
		}
		function __awaiter(thisArg, _arguments, P, generator) {
			function adopt(value) {
				return value instanceof P ? value : new P(function(resolve) {
					resolve(value);
				});
			}
			return new (P || (P = Promise))(function(resolve, reject) {
				function fulfilled(value) {
					try {
						step(generator.next(value));
					} catch (e) {
						reject(e);
					}
				}
				function rejected(value) {
					try {
						step(generator["throw"](value));
					} catch (e) {
						reject(e);
					}
				}
				function step(result) {
					result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
				}
				step((generator = generator.apply(thisArg, _arguments || [])).next());
			});
		}
		function __generator(thisArg, body) {
			var _ = {
				label: 0,
				sent: function() {
					if (t[0] & 1) throw t[1];
					return t[1];
				},
				trys: [],
				ops: []
			}, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
			return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
				return this;
			}), g;
			function verb(n) {
				return function(v) {
					return step([n, v]);
				};
			}
			function step(op) {
				if (f) throw new TypeError("Generator is already executing.");
				while (g && (g = 0, op[0] && (_ = 0)), _) try {
					if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
					if (y = 0, t) op = [op[0] & 2, t.value];
					switch (op[0]) {
						case 0:
						case 1:
							t = op;
							break;
						case 4:
							_.label++;
							return {
								value: op[1],
								done: false
							};
						case 5:
							_.label++;
							y = op[1];
							op = [0];
							continue;
						case 7:
							op = _.ops.pop();
							_.trys.pop();
							continue;
						default:
							if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
								_ = 0;
								continue;
							}
							if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
								_.label = op[1];
								break;
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1];
								t = op;
								break;
							}
							if (t && _.label < t[2]) {
								_.label = t[2];
								_.ops.push(op);
								break;
							}
							if (t[2]) _.ops.pop();
							_.trys.pop();
							continue;
					}
					op = body.call(thisArg, _);
				} catch (e) {
					op = [6, e];
					y = 0;
				} finally {
					f = t = 0;
				}
				if (op[0] & 5) throw op[1];
				return {
					value: op[0] ? op[1] : void 0,
					done: true
				};
			}
		}
		function __exportStar(m, o) {
			for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
		}
		function __values(o) {
			var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
			if (m) return m.call(o);
			if (o && typeof o.length === "number") return { next: function() {
				if (o && i >= o.length) o = void 0;
				return {
					value: o && o[i++],
					done: !o
				};
			} };
			throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
		}
		function __read(o, n) {
			var m = typeof Symbol === "function" && o[Symbol.iterator];
			if (!m) return o;
			var i = m.call(o), r, ar = [], e;
			try {
				while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
			} catch (error) {
				e = { error };
			} finally {
				try {
					if (r && !r.done && (m = i["return"])) m.call(i);
				} finally {
					if (e) throw e.error;
				}
			}
			return ar;
		}
		/** @deprecated */
		function __spread() {
			for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
			return ar;
		}
		/** @deprecated */
		function __spreadArrays() {
			for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
			for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
			return r;
		}
		function __spreadArray(to, from, pack) {
			if (pack || arguments.length === 2) {
				for (var i = 0, l = from.length, ar; i < l; i++) if (ar || !(i in from)) {
					if (!ar) ar = Array.prototype.slice.call(from, 0, i);
					ar[i] = from[i];
				}
			}
			return to.concat(ar || Array.prototype.slice.call(from));
		}
		function __await(v) {
			return this instanceof __await ? (this.v = v, this) : new __await(v);
		}
		function __asyncGenerator(thisArg, _arguments, generator) {
			if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
			var g = generator.apply(thisArg, _arguments || []), i, q = [];
			return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
				return this;
			}, i;
			function awaitReturn(f) {
				return function(v) {
					return Promise.resolve(v).then(f, reject);
				};
			}
			function verb(n, f) {
				if (g[n]) {
					i[n] = function(v) {
						return new Promise(function(a, b) {
							q.push([
								n,
								v,
								a,
								b
							]) > 1 || resume(n, v);
						});
					};
					if (f) i[n] = f(i[n]);
				}
			}
			function resume(n, v) {
				try {
					step(g[n](v));
				} catch (e) {
					settle(q[0][3], e);
				}
			}
			function step(r) {
				r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
			}
			function fulfill(value) {
				resume("next", value);
			}
			function reject(value) {
				resume("throw", value);
			}
			function settle(f, v) {
				if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
			}
		}
		function __asyncDelegator(o) {
			var i, p;
			return i = {}, verb("next"), verb("throw", function(e) {
				throw e;
			}), verb("return"), i[Symbol.iterator] = function() {
				return this;
			}, i;
			function verb(n, f) {
				i[n] = o[n] ? function(v) {
					return (p = !p) ? {
						value: __await(o[n](v)),
						done: false
					} : f ? f(v) : v;
				} : f;
			}
		}
		function __asyncValues(o) {
			if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
			var m = o[Symbol.asyncIterator], i;
			return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
				return this;
			}, i);
			function verb(n) {
				i[n] = o[n] && function(v) {
					return new Promise(function(resolve, reject) {
						v = o[n](v), settle(resolve, reject, v.done, v.value);
					});
				};
			}
			function settle(resolve, reject, d, v) {
				Promise.resolve(v).then(function(v) {
					resolve({
						value: v,
						done: d
					});
				}, reject);
			}
		}
		function __makeTemplateObject(cooked, raw) {
			if (Object.defineProperty) Object.defineProperty(cooked, "raw", { value: raw });
			else cooked.raw = raw;
			return cooked;
		}
		function __importStar(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		}
		function __importDefault(mod) {
			return mod && mod.__esModule ? mod : { default: mod };
		}
		function __classPrivateFieldGet(receiver, state, kind, f) {
			if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
			if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
			return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
		}
		function __classPrivateFieldSet(receiver, state, value, kind, f) {
			if (kind === "m") throw new TypeError("Private method is not writable");
			if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
			if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
			return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
		}
		function __classPrivateFieldIn(state, receiver) {
			if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
			return typeof state === "function" ? receiver === state : state.has(receiver);
		}
		function __addDisposableResource(env, value, async) {
			if (value !== null && value !== void 0) {
				if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
				var dispose, inner;
				if (async) {
					if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
					dispose = value[Symbol.asyncDispose];
				}
				if (dispose === void 0) {
					if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
					dispose = value[Symbol.dispose];
					if (async) inner = dispose;
				}
				if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
				if (inner) dispose = function() {
					try {
						inner.call(this);
					} catch (e) {
						return Promise.reject(e);
					}
				};
				env.stack.push({
					value,
					dispose,
					async
				});
			} else if (async) env.stack.push({ async: true });
			return value;
		}
		function __disposeResources(env) {
			function fail(e) {
				env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
				env.hasError = true;
			}
			var r, s = 0;
			function next() {
				while (r = env.stack.pop()) try {
					if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
					if (r.dispose) {
						var result = r.dispose.call(r.value);
						if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) {
							fail(e);
							return next();
						});
					} else s |= 1;
				} catch (e) {
					fail(e);
				}
				if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
				if (env.hasError) throw env.error;
			}
			return next();
		}
		function __rewriteRelativeImportExtension(path, preserveJsx) {
			if (typeof path === "string" && /^\.\.?\//.test(path)) return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function(m, tsx, d, ext, cm) {
				return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : d + ext + "." + cm.toLowerCase() + "js";
			});
			return path;
		}
		var extendStatics, __assign, __createBinding, __setModuleDefault, ownKeys, _SuppressedError, tslib_es6_default;
		var init_tslib_es6 = __esmMin((() => {
			extendStatics = function(d, b) {
				extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
					d.__proto__ = b;
				} || function(d, b) {
					for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
				};
				return extendStatics(d, b);
			};
			__assign = function() {
				__assign = Object.assign || function __assign(t) {
					for (var s, i = 1, n = arguments.length; i < n; i++) {
						s = arguments[i];
						for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
					}
					return t;
				};
				return __assign.apply(this, arguments);
			};
			__createBinding = Object.create ? (function(o, m, k, k2) {
				if (k2 === void 0) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
					enumerable: true,
					get: function() {
						return m[k];
					}
				};
				Object.defineProperty(o, k2, desc);
			}) : (function(o, m, k, k2) {
				if (k2 === void 0) k2 = k;
				o[k2] = m[k];
			});
			__setModuleDefault = Object.create ? (function(o, v) {
				Object.defineProperty(o, "default", {
					enumerable: true,
					value: v
				});
			}) : function(o, v) {
				o["default"] = v;
			};
			ownKeys = function(o) {
				ownKeys = Object.getOwnPropertyNames || function(o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
				return ownKeys(o);
			};
			_SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
				var e = new Error(message);
				return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
			};
			tslib_es6_default = {
				__extends,
				__assign,
				__rest,
				__decorate,
				__param,
				__esDecorate,
				__runInitializers,
				__propKey,
				__setFunctionName,
				__metadata,
				__awaiter,
				__generator,
				__createBinding,
				__exportStar,
				__values,
				__read,
				__spread,
				__spreadArrays,
				__spreadArray,
				__await,
				__asyncGenerator,
				__asyncDelegator,
				__asyncValues,
				__makeTemplateObject,
				__importStar,
				__importDefault,
				__classPrivateFieldGet,
				__classPrivateFieldSet,
				__classPrivateFieldIn,
				__addDisposableResource,
				__disposeResources,
				__rewriteRelativeImportExtension
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll-bar/dist/es5/constants.js
		var require_constants = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.removedBarSizeVariable = exports.noScrollbarsClassName = exports.fullWidthClassName = exports.zeroRightClassName = void 0;
			exports.zeroRightClassName = "right-scroll-bar-position";
			exports.fullWidthClassName = "width-before-scroll-bar";
			exports.noScrollbarsClassName = "with-scroll-bars-hidden";
			/**
			* Name of a CSS variable containing the amount of "hidden" scrollbar
			* ! might be undefined ! use will fallback!
			*/
			exports.removedBarSizeVariable = "--removed-body-scroll-bar-size";
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/assignRef.js
		var require_assignRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.assignRef = void 0;
			/**
			* Assigns a value for a given ref, no matter of the ref format
			* @param {RefObject} ref - a callback function or ref object
			* @param value - a new value
			*
			* @see https://github.com/theKashey/use-callback-ref#assignref
			* @example
			* const refObject = useRef();
			* const refFn = (ref) => {....}
			*
			* assignRef(refObject, "refValue");
			* assignRef(refFn, "refValue");
			*/
			function assignRef(ref, value) {
				if (typeof ref === "function") ref(value);
				else if (ref) ref.current = value;
				return ref;
			}
			exports.assignRef = assignRef;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/useRef.js
		var require_useRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useCallbackRef = void 0;
			var react_1$2 = require("react");
			/**
			* creates a MutableRef with ref change callback
			* @param initialValue - initial ref value
			* @param {Function} callback - a callback to run when value changes
			*
			* @example
			* const ref = useCallbackRef(0, (newValue, oldValue) => console.log(oldValue, '->', newValue);
			* ref.current = 1;
			* // prints 0 -> 1
			*
			* @see https://reactjs.org/docs/hooks-reference.html#useref
			* @see https://github.com/theKashey/use-callback-ref#usecallbackref---to-replace-reactuseref
			* @returns {MutableRefObject}
			*/
			function useCallbackRef(initialValue, callback) {
				var ref = (0, react_1$2.useState)(function() {
					return {
						value: initialValue,
						callback,
						facade: {
							get current() {
								return ref.value;
							},
							set current(value) {
								var last = ref.value;
								if (last !== value) {
									ref.value = value;
									ref.callback(value, last);
								}
							}
						}
					};
				})[0];
				ref.callback = callback;
				return ref.facade;
			}
			exports.useCallbackRef = useCallbackRef;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/createRef.js
		var require_createRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.createCallbackRef = void 0;
			/**
			* creates a Ref object with on change callback
			* @param callback
			* @returns {RefObject}
			*
			* @see {@link useCallbackRef}
			* @see https://reactjs.org/docs/refs-and-the-dom.html#creating-refs
			*/
			function createCallbackRef(callback) {
				var current = null;
				return {
					get current() {
						return current;
					},
					set current(value) {
						var last = current;
						if (last !== value) {
							current = value;
							callback(value, last);
						}
					}
				};
			}
			exports.createCallbackRef = createCallbackRef;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/mergeRef.js
		var require_mergeRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.mergeRefs = void 0;
			var assignRef_1 = require_assignRef();
			var createRef_1 = require_createRef();
			/**
			* Merges two or more refs together providing a single interface to set their value
			* @param {RefObject|Ref} refs
			* @returns {MutableRefObject} - a new ref, which translates all changes to {refs}
			*
			* @see {@link useMergeRefs} to be used in ReactComponents
			* @example
			* const Component = React.forwardRef((props, ref) => {
			*   const ownRef = useRef();
			*   const domRef = mergeRefs([ref, ownRef]); // 👈 merge together
			*   return <div ref={domRef}>...</div>
			* }
			*/
			function mergeRefs(refs) {
				return (0, createRef_1.createCallbackRef)(function(newValue) {
					return refs.forEach(function(ref) {
						return (0, assignRef_1.assignRef)(ref, newValue);
					});
				});
			}
			exports.mergeRefs = mergeRefs;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/useMergeRef.js
		var require_useMergeRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useMergeRefs = void 0;
			var React$8 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports)).__importStar(require("react"));
			var assignRef_1 = require_assignRef();
			var useRef_1 = require_useRef();
			var useIsomorphicLayoutEffect = typeof window !== "undefined" ? React$8.useLayoutEffect : React$8.useEffect;
			var currentValues = /* @__PURE__ */ new WeakMap();
			/**
			* Merges two or more refs together providing a single interface to set their value
			* @param {RefObject|Ref} refs
			* @returns {MutableRefObject} - a new ref, which translates all changes to {refs}
			*
			* @see {@link mergeRefs} a version without buit-in memoization
			* @see https://github.com/theKashey/use-callback-ref#usemergerefs
			* @example
			* const Component = React.forwardRef((props, ref) => {
			*   const ownRef = useRef();
			*   const domRef = useMergeRefs([ref, ownRef]); // 👈 merge together
			*   return <div ref={domRef}>...</div>
			* }
			*/
			function useMergeRefs(refs, defaultValue) {
				var callbackRef = (0, useRef_1.useCallbackRef)(defaultValue || null, function(newValue) {
					return refs.forEach(function(ref) {
						return (0, assignRef_1.assignRef)(ref, newValue);
					});
				});
				useIsomorphicLayoutEffect(function() {
					var oldValue = currentValues.get(callbackRef);
					if (oldValue) {
						var prevRefs_1 = new Set(oldValue);
						var nextRefs_1 = new Set(refs);
						var current_1 = callbackRef.current;
						prevRefs_1.forEach(function(ref) {
							if (!nextRefs_1.has(ref)) (0, assignRef_1.assignRef)(ref, null);
						});
						nextRefs_1.forEach(function(ref) {
							if (!prevRefs_1.has(ref)) (0, assignRef_1.assignRef)(ref, current_1);
						});
					}
					currentValues.set(callbackRef, refs);
				}, [refs]);
				return callbackRef;
			}
			exports.useMergeRefs = useMergeRefs;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/useTransformRef.js
		var require_useTransformRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useTransformRef = void 0;
			var assignRef_1 = require_assignRef();
			var useRef_1 = require_useRef();
			/**
			* Create a _lense_ on Ref, making it possible to transform ref value
			* @param {ReactRef} ref
			* @param {Function} transformer. 👉 Ref would be __NOT updated__ on `transformer` update.
			* @returns {RefObject}
			*
			* @see https://github.com/theKashey/use-callback-ref#usetransformref-to-replace-reactuseimperativehandle
			* @example
			*
			* const ResizableWithRef = forwardRef((props, ref) =>
			*  <Resizable {...props} ref={useTransformRef(ref, i => i ? i.resizable : null)}/>
			* );
			*/
			function useTransformRef(ref, transformer) {
				return (0, useRef_1.useCallbackRef)(null, function(value) {
					return (0, assignRef_1.assignRef)(ref, transformer(value));
				});
			}
			exports.useTransformRef = useTransformRef;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/transformRef.js
		var require_transformRef = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.transformRef = void 0;
			var assignRef_1 = require_assignRef();
			var createRef_1 = require_createRef();
			/**
			* Transforms one ref to another
			* @example
			* ```tsx
			* const ResizableWithRef = forwardRef((props, ref) =>
			*   <Resizable {...props} ref={transformRef(ref, i => i ? i.resizable : null)}/>
			* );
			* ```
			*/
			function transformRef(ref, transformer) {
				return (0, createRef_1.createCallbackRef)(function(value) {
					return (0, assignRef_1.assignRef)(ref, transformer(value));
				});
			}
			exports.transformRef = transformRef;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/refToCallback.js
		var require_refToCallback = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useRefToCallback = exports.refToCallback = void 0;
			/**
			* Unmemoized version of {@link useRefToCallback}
			* @see {@link useRefToCallback}
			* @param ref
			*/
			function refToCallback(ref) {
				return function(newValue) {
					if (typeof ref === "function") ref(newValue);
					else if (ref) ref.current = newValue;
				};
			}
			exports.refToCallback = refToCallback;
			var nullCallback = function() {
				return null;
			};
			var weakMem = /* @__PURE__ */ new WeakMap();
			var weakMemoize = function(ref) {
				var usedRef = ref || nullCallback;
				var storedRef = weakMem.get(usedRef);
				if (storedRef) return storedRef;
				var cb = refToCallback(usedRef);
				weakMem.set(usedRef, cb);
				return cb;
			};
			/**
			* Transforms a given `ref` into `callback`.
			*
			* To transform `callback` into ref use {@link useCallbackRef|useCallbackRef(undefined, callback)}
			*
			* @param {ReactRef} ref
			* @returns {Function}
			*
			* @see https://github.com/theKashey/use-callback-ref#reftocallback
			*
			* @example
			* const ref = useRef(0);
			* const setRef = useRefToCallback(ref);
			* 👉 setRef(10);
			* ✅ ref.current === 10
			*/
			function useRefToCallback(ref) {
				return weakMemoize(ref);
			}
			exports.useRefToCallback = useRefToCallback;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-callback-ref@1.3.3_@types+react@18.3.31_react@18.3.1/node_modules/use-callback-ref/dist/es5/index.js
		var require_es5$5 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useRefToCallback = exports.refToCallback = exports.transformRef = exports.useTransformRef = exports.useMergeRefs = exports.mergeRefs = exports.createCallbackRef = exports.useCallbackRef = exports.assignRef = void 0;
			var assignRef_1 = require_assignRef();
			Object.defineProperty(exports, "assignRef", {
				enumerable: true,
				get: function() {
					return assignRef_1.assignRef;
				}
			});
			var useRef_1 = require_useRef();
			Object.defineProperty(exports, "useCallbackRef", {
				enumerable: true,
				get: function() {
					return useRef_1.useCallbackRef;
				}
			});
			var createRef_1 = require_createRef();
			Object.defineProperty(exports, "createCallbackRef", {
				enumerable: true,
				get: function() {
					return createRef_1.createCallbackRef;
				}
			});
			var mergeRef_1 = require_mergeRef();
			Object.defineProperty(exports, "mergeRefs", {
				enumerable: true,
				get: function() {
					return mergeRef_1.mergeRefs;
				}
			});
			var useMergeRef_1 = require_useMergeRef();
			Object.defineProperty(exports, "useMergeRefs", {
				enumerable: true,
				get: function() {
					return useMergeRef_1.useMergeRefs;
				}
			});
			var useTransformRef_1 = require_useTransformRef();
			Object.defineProperty(exports, "useTransformRef", {
				enumerable: true,
				get: function() {
					return useTransformRef_1.useTransformRef;
				}
			});
			var transformRef_1 = require_transformRef();
			Object.defineProperty(exports, "transformRef", {
				enumerable: true,
				get: function() {
					return transformRef_1.transformRef;
				}
			});
			var refToCallback_1 = require_refToCallback();
			Object.defineProperty(exports, "refToCallback", {
				enumerable: true,
				get: function() {
					return refToCallback_1.refToCallback;
				}
			});
			Object.defineProperty(exports, "useRefToCallback", {
				enumerable: true,
				get: function() {
					return refToCallback_1.useRefToCallback;
				}
			});
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/detect-node-es@1.1.0/node_modules/detect-node-es/es5/node.js
		var require_node = /* @__PURE__ */ __commonJSMin(((exports, module) => {
			module.exports.isNode = Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/env.js
		var require_env = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.env = void 0;
			exports.env = {
				isNode: require_node().isNode,
				forceCache: false
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/hook.js
		var require_hook$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.useSidecar = void 0;
			var react_1$1 = require("react");
			var env_1 = require_env();
			var cache = /* @__PURE__ */ new WeakMap();
			var NO_OPTIONS = {};
			function useSidecar(importer, effect) {
				var options = effect && effect.options || NO_OPTIONS;
				if (env_1.env.isNode && !options.ssr) return [null, null];
				return useRealSidecar(importer, effect);
			}
			exports.useSidecar = useSidecar;
			function useRealSidecar(importer, effect) {
				var options = effect && effect.options || NO_OPTIONS;
				var couldUseCache = env_1.env.forceCache || env_1.env.isNode && !!options.ssr || !options.async;
				var _a = (0, react_1$1.useState)(couldUseCache ? function() {
					return cache.get(importer);
				} : void 0), Car = _a[0], setCar = _a[1];
				var _b = (0, react_1$1.useState)(null), error = _b[0], setError = _b[1];
				(0, react_1$1.useEffect)(function() {
					if (!Car) importer().then(function(car) {
						var resolved = effect ? effect.read() : car.default || car;
						if (!resolved) {
							console.error("Sidecar error: with importer", importer);
							var error_1;
							if (effect) {
								console.error("Sidecar error: with medium", effect);
								error_1 = /* @__PURE__ */ new Error("Sidecar medium was not found");
							} else error_1 = /* @__PURE__ */ new Error("Sidecar was not found in exports");
							setError(function() {
								return error_1;
							});
							throw error_1;
						}
						cache.set(importer, resolved);
						setCar(function() {
							return resolved;
						});
					}, function(e) {
						return setError(function() {
							return e;
						});
					});
				}, []);
				return [Car, error];
			}
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/hoc.js
		var require_hoc = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.sidecar = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React$7 = tslib_1.__importStar(require("react"));
			var hook_1 = require_hook$1();
			function sidecar(importer, errorComponent) {
				var ErrorCase = function() {
					return errorComponent;
				};
				return function Sidecar(props) {
					var _a = (0, hook_1.useSidecar)(importer, props.sideCar), Car = _a[0];
					if (_a[1] && errorComponent) return ErrorCase;
					return Car ? React$7.createElement(Car, tslib_1.__assign({}, props)) : null;
				};
			}
			exports.sidecar = sidecar;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/config.js
		var require_config = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.setConfig = exports.config = void 0;
			exports.config = { onError: function(e) {
				return console.error(e);
			} };
			var setConfig = function(conf) {
				Object.assign(exports.config, conf);
			};
			exports.setConfig = setConfig;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/medium.js
		var require_medium$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.createSidecarMedium = exports.createMedium = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			function ItoI(a) {
				return a;
			}
			function innerCreateMedium(defaults, middleware) {
				if (middleware === void 0) middleware = ItoI;
				var buffer = [];
				var assigned = false;
				return {
					read: function() {
						if (assigned) throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
						if (buffer.length) return buffer[buffer.length - 1];
						return defaults;
					},
					useMedium: function(data) {
						var item = middleware(data, assigned);
						buffer.push(item);
						return function() {
							buffer = buffer.filter(function(x) {
								return x !== item;
							});
						};
					},
					assignSyncMedium: function(cb) {
						assigned = true;
						while (buffer.length) {
							var cbs = buffer;
							buffer = [];
							cbs.forEach(cb);
						}
						buffer = {
							push: function(x) {
								return cb(x);
							},
							filter: function() {
								return buffer;
							}
						};
					},
					assignMedium: function(cb) {
						assigned = true;
						var pendingQueue = [];
						if (buffer.length) {
							var cbs = buffer;
							buffer = [];
							cbs.forEach(cb);
							pendingQueue = buffer;
						}
						var executeQueue = function() {
							var cbs = pendingQueue;
							pendingQueue = [];
							cbs.forEach(cb);
						};
						var cycle = function() {
							return Promise.resolve().then(executeQueue);
						};
						cycle();
						buffer = {
							push: function(x) {
								pendingQueue.push(x);
								cycle();
							},
							filter: function(filter) {
								pendingQueue = pendingQueue.filter(filter);
								return buffer;
							}
						};
					}
				};
			}
			function createMedium(defaults, middleware) {
				if (middleware === void 0) middleware = ItoI;
				return innerCreateMedium(defaults, middleware);
			}
			exports.createMedium = createMedium;
			function createSidecarMedium(options) {
				if (options === void 0) options = {};
				var medium = innerCreateMedium(null);
				medium.options = tslib_1.__assign({
					async: true,
					ssr: false
				}, options);
				return medium;
			}
			exports.createSidecarMedium = createSidecarMedium;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/renderProp.js
		var require_renderProp = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.renderCar = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React$6 = tslib_1.__importStar(require("react"));
			var react_1 = require("react");
			function renderCar(WrappedComponent, defaults) {
				function State(_a) {
					var stateRef = _a.stateRef, props = _a.props;
					var renderTarget = (0, react_1.useCallback)(function SideTarget() {
						var args = [];
						for (var _i = 0; _i < arguments.length; _i++) args[_i] = arguments[_i];
						(0, react_1.useLayoutEffect)(function() {
							stateRef.current(args);
						});
						return null;
					}, []);
					return React$6.createElement(WrappedComponent, tslib_1.__assign({}, props, { children: renderTarget }));
				}
				var Children = React$6.memo(function(_a) {
					var stateRef = _a.stateRef, defaultState = _a.defaultState, children = _a.children;
					var _b = (0, react_1.useState)(defaultState.current), state = _b[0], setState = _b[1];
					(0, react_1.useEffect)(function() {
						stateRef.current = setState;
					}, []);
					return children.apply(void 0, state);
				}, function() {
					return true;
				});
				return function Combiner(props) {
					var defaultState = React$6.useRef(defaults(props));
					var ref = React$6.useRef(function(state) {
						return defaultState.current = state;
					});
					return React$6.createElement(React$6.Fragment, null, React$6.createElement(State, {
						stateRef: ref,
						props
					}), React$6.createElement(Children, {
						stateRef: ref,
						defaultState,
						children: props.children
					}));
				};
			}
			exports.renderCar = renderCar;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/exports.js
		var require_exports = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.exportSidecar = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React$5 = tslib_1.__importStar(require("react"));
			var SideCar = function(_a) {
				var sideCar = _a.sideCar, rest = tslib_1.__rest(_a, ["sideCar"]);
				if (!sideCar) throw new Error("Sidecar: please provide `sideCar` property to import the right car");
				var Target = sideCar.read();
				if (!Target) throw new Error("Sidecar medium not found");
				return React$5.createElement(Target, tslib_1.__assign({}, rest));
			};
			SideCar.isSideCarExport = true;
			function exportSidecar(medium, exported) {
				medium.useMedium(exported);
				return SideCar;
			}
			exports.exportSidecar = exportSidecar;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/use-sidecar@1.1.3_@types+react@18.3.31_react@18.3.1/node_modules/use-sidecar/dist/es5/index.js
		var require_es5$4 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.exportSidecar = exports.renderCar = exports.createSidecarMedium = exports.createMedium = exports.setConfig = exports.useSidecar = exports.sidecar = void 0;
			var hoc_1 = require_hoc();
			Object.defineProperty(exports, "sidecar", {
				enumerable: true,
				get: function() {
					return hoc_1.sidecar;
				}
			});
			var hook_1 = require_hook$1();
			Object.defineProperty(exports, "useSidecar", {
				enumerable: true,
				get: function() {
					return hook_1.useSidecar;
				}
			});
			var config_1 = require_config();
			Object.defineProperty(exports, "setConfig", {
				enumerable: true,
				get: function() {
					return config_1.setConfig;
				}
			});
			var medium_1 = require_medium$1();
			Object.defineProperty(exports, "createMedium", {
				enumerable: true,
				get: function() {
					return medium_1.createMedium;
				}
			});
			Object.defineProperty(exports, "createSidecarMedium", {
				enumerable: true,
				get: function() {
					return medium_1.createSidecarMedium;
				}
			});
			var renderProp_1 = require_renderProp();
			Object.defineProperty(exports, "renderCar", {
				enumerable: true,
				get: function() {
					return renderProp_1.renderCar;
				}
			});
			var exports_1 = require_exports();
			Object.defineProperty(exports, "exportSidecar", {
				enumerable: true,
				get: function() {
					return exports_1.exportSidecar;
				}
			});
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/medium.js
		var require_medium = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.effectCar = void 0;
			exports.effectCar = (0, require_es5$4().createSidecarMedium)();
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/UI.js
		var require_UI = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.RemoveScroll = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React$4 = tslib_1.__importStar(require("react"));
			var constants_1 = require_constants();
			var use_callback_ref_1 = require_es5$5();
			var medium_1 = require_medium();
			var nothing = function() {};
			/**
			* Removes scrollbar from the page and contain the scroll within the Lock
			*/
			var RemoveScroll = React$4.forwardRef(function(props, parentRef) {
				var ref = React$4.useRef(null);
				var _a = React$4.useState({
					onScrollCapture: nothing,
					onWheelCapture: nothing,
					onTouchMoveCapture: nothing
				}), callbacks = _a[0], setCallbacks = _a[1];
				var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noRelative = props.noRelative, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, gapMode = props.gapMode, rest = tslib_1.__rest(props, [
					"forwardProps",
					"children",
					"className",
					"removeScrollBar",
					"enabled",
					"shards",
					"sideCar",
					"noRelative",
					"noIsolation",
					"inert",
					"allowPinchZoom",
					"as",
					"gapMode"
				]);
				var SideCar = sideCar;
				var containerRef = (0, use_callback_ref_1.useMergeRefs)([ref, parentRef]);
				var containerProps = tslib_1.__assign(tslib_1.__assign({}, rest), callbacks);
				return React$4.createElement(React$4.Fragment, null, enabled && React$4.createElement(SideCar, {
					sideCar: medium_1.effectCar,
					removeScrollBar,
					shards,
					noRelative,
					noIsolation,
					inert,
					setCallbacks,
					allowPinchZoom: !!allowPinchZoom,
					lockRef: ref,
					gapMode
				}), forwardProps ? React$4.cloneElement(React$4.Children.only(children), tslib_1.__assign(tslib_1.__assign({}, containerProps), { ref: containerRef })) : React$4.createElement(Container, tslib_1.__assign({}, containerProps, {
					className,
					ref: containerRef
				}), children));
			});
			exports.RemoveScroll = RemoveScroll;
			RemoveScroll.defaultProps = {
				enabled: true,
				removeScrollBar: true,
				inert: false
			};
			RemoveScroll.classNames = {
				fullWidth: constants_1.fullWidthClassName,
				zeroRight: constants_1.zeroRightClassName
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/get-nonce@1.0.1/node_modules/get-nonce/dist/es5/index.js
		var require_es5$3 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			var currentNonce;
			exports.setNonce = function(nonce) {
				currentNonce = nonce;
			};
			exports.getNonce = function() {
				if (currentNonce) return currentNonce;
				if (typeof __webpack_nonce__ !== "undefined") return __webpack_nonce__;
			};
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@18.3.31_react@18.3.1/node_modules/react-style-singleton/dist/es5/singleton.js
		var require_singleton = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.stylesheetSingleton = void 0;
			var get_nonce_1 = require_es5$3();
			function makeStyleTag() {
				if (!document) return null;
				var tag = document.createElement("style");
				tag.type = "text/css";
				var nonce = (0, get_nonce_1.getNonce)();
				if (nonce) tag.setAttribute("nonce", nonce);
				return tag;
			}
			function injectStyles(tag, css) {
				if (tag.styleSheet) tag.styleSheet.cssText = css;
				else tag.appendChild(document.createTextNode(css));
			}
			function insertStyleTag(tag) {
				(document.head || document.getElementsByTagName("head")[0]).appendChild(tag);
			}
			var stylesheetSingleton = function() {
				var counter = 0;
				var stylesheet = null;
				return {
					add: function(style) {
						if (counter == 0) {
							if (stylesheet = makeStyleTag()) {
								injectStyles(stylesheet, style);
								insertStyleTag(stylesheet);
							}
						}
						counter++;
					},
					remove: function() {
						counter--;
						if (!counter && stylesheet) {
							stylesheet.parentNode && stylesheet.parentNode.removeChild(stylesheet);
							stylesheet = null;
						}
					}
				};
			};
			exports.stylesheetSingleton = stylesheetSingleton;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@18.3.31_react@18.3.1/node_modules/react-style-singleton/dist/es5/hook.js
		var require_hook = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.styleHookSingleton = void 0;
			var React$3 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports)).__importStar(require("react"));
			var singleton_1 = require_singleton();
			/**
			* creates a hook to control style singleton
			* @see {@link styleSingleton} for a safer component version
			* @example
			* ```tsx
			* const useStyle = styleHookSingleton();
			* ///
			* useStyle('body { overflow: hidden}');
			*/
			var styleHookSingleton = function() {
				var sheet = (0, singleton_1.stylesheetSingleton)();
				return function(styles, isDynamic) {
					React$3.useEffect(function() {
						sheet.add(styles);
						return function() {
							sheet.remove();
						};
					}, [styles && isDynamic]);
				};
			};
			exports.styleHookSingleton = styleHookSingleton;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@18.3.31_react@18.3.1/node_modules/react-style-singleton/dist/es5/component.js
		var require_component$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.styleSingleton = void 0;
			var hook_1 = require_hook();
			/**
			* create a Component to add styles on demand
			* - styles are added when first instance is mounted
			* - styles are removed when the last instance is unmounted
			* - changing styles in runtime does nothing unless dynamic is set. But with multiple components that can lead to the undefined behavior
			*/
			var styleSingleton = function() {
				var useStyle = (0, hook_1.styleHookSingleton)();
				var Sheet = function(_a) {
					var styles = _a.styles, dynamic = _a.dynamic;
					useStyle(styles, dynamic);
					return null;
				};
				return Sheet;
			};
			exports.styleSingleton = styleSingleton;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-style-singleton@2.2.3_@types+react@18.3.31_react@18.3.1/node_modules/react-style-singleton/dist/es5/index.js
		var require_es5$2 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.styleHookSingleton = exports.stylesheetSingleton = exports.styleSingleton = void 0;
			var component_1 = require_component$1();
			Object.defineProperty(exports, "styleSingleton", {
				enumerable: true,
				get: function() {
					return component_1.styleSingleton;
				}
			});
			var singleton_1 = require_singleton();
			Object.defineProperty(exports, "stylesheetSingleton", {
				enumerable: true,
				get: function() {
					return singleton_1.stylesheetSingleton;
				}
			});
			var hook_1 = require_hook();
			Object.defineProperty(exports, "styleHookSingleton", {
				enumerable: true,
				get: function() {
					return hook_1.styleHookSingleton;
				}
			});
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll-bar/dist/es5/utils.js
		var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.getGapWidth = exports.zeroGap = void 0;
			exports.zeroGap = {
				left: 0,
				top: 0,
				right: 0,
				gap: 0
			};
			var parse = function(x) {
				return parseInt(x || "", 10) || 0;
			};
			var getOffset = function(gapMode) {
				var cs = window.getComputedStyle(document.body);
				var left = cs[gapMode === "padding" ? "paddingLeft" : "marginLeft"];
				var top = cs[gapMode === "padding" ? "paddingTop" : "marginTop"];
				var right = cs[gapMode === "padding" ? "paddingRight" : "marginRight"];
				return [
					parse(left),
					parse(top),
					parse(right)
				];
			};
			var getGapWidth = function(gapMode) {
				if (gapMode === void 0) gapMode = "margin";
				if (typeof window === "undefined") return exports.zeroGap;
				var offsets = getOffset(gapMode);
				var documentWidth = document.documentElement.clientWidth;
				var windowWidth = window.innerWidth;
				return {
					left: offsets[0],
					top: offsets[1],
					right: offsets[2],
					gap: Math.max(0, windowWidth - documentWidth + offsets[2] - offsets[0])
				};
			};
			exports.getGapWidth = getGapWidth;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll-bar/dist/es5/component.js
		var require_component = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.RemoveScrollBar = exports.useLockAttribute = exports.lockAttribute = void 0;
			var React$2 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports)).__importStar(require("react"));
			var react_style_singleton_1 = require_es5$2();
			var constants_1 = require_constants();
			var utils_1 = require_utils();
			var Style = (0, react_style_singleton_1.styleSingleton)();
			exports.lockAttribute = "data-scroll-locked";
			var getStyles = function(_a, allowRelative, gapMode, important) {
				var left = _a.left, top = _a.top, right = _a.right, gap = _a.gap;
				if (gapMode === void 0) gapMode = "margin";
				return "\n  .".concat(constants_1.noScrollbarsClassName, " {\n   overflow: hidden ").concat(important, ";\n   padding-right: ").concat(gap, "px ").concat(important, ";\n  }\n  body[").concat(exports.lockAttribute, "] {\n    overflow: hidden ").concat(important, ";\n    overscroll-behavior: contain;\n    ").concat([
					allowRelative && "position: relative ".concat(important, ";"),
					gapMode === "margin" && "\n    padding-left: ".concat(left, "px;\n    padding-top: ").concat(top, "px;\n    padding-right: ").concat(right, "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ").concat(gap, "px ").concat(important, ";\n    "),
					gapMode === "padding" && "padding-right: ".concat(gap, "px ").concat(important, ";")
				].filter(Boolean).join(""), "\n  }\n  \n  .").concat(constants_1.zeroRightClassName, " {\n    right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(constants_1.fullWidthClassName, " {\n    margin-right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(constants_1.zeroRightClassName, " .").concat(constants_1.zeroRightClassName, " {\n    right: 0 ").concat(important, ";\n  }\n  \n  .").concat(constants_1.fullWidthClassName, " .").concat(constants_1.fullWidthClassName, " {\n    margin-right: 0 ").concat(important, ";\n  }\n  \n  body[").concat(exports.lockAttribute, "] {\n    ").concat(constants_1.removedBarSizeVariable, ": ").concat(gap, "px;\n  }\n");
			};
			var getCurrentUseCounter = function() {
				var counter = parseInt(document.body.getAttribute(exports.lockAttribute) || "0", 10);
				return isFinite(counter) ? counter : 0;
			};
			var useLockAttribute = function() {
				React$2.useEffect(function() {
					document.body.setAttribute(exports.lockAttribute, (getCurrentUseCounter() + 1).toString());
					return function() {
						var newCounter = getCurrentUseCounter() - 1;
						if (newCounter <= 0) document.body.removeAttribute(exports.lockAttribute);
						else document.body.setAttribute(exports.lockAttribute, newCounter.toString());
					};
				}, []);
			};
			exports.useLockAttribute = useLockAttribute;
			/**
			* Removes page scrollbar and blocks page scroll when mounted
			*/
			var RemoveScrollBar = function(_a) {
				var noRelative = _a.noRelative, noImportant = _a.noImportant, _b = _a.gapMode, gapMode = _b === void 0 ? "margin" : _b;
				(0, exports.useLockAttribute)();
				var gap = React$2.useMemo(function() {
					return (0, utils_1.getGapWidth)(gapMode);
				}, [gapMode]);
				return React$2.createElement(Style, { styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "") });
			};
			exports.RemoveScrollBar = RemoveScrollBar;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll-bar@2.3.8_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll-bar/dist/es5/index.js
		var require_es5$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.getGapWidth = exports.removedBarSizeVariable = exports.noScrollbarsClassName = exports.fullWidthClassName = exports.zeroRightClassName = exports.RemoveScrollBar = void 0;
			var component_1 = require_component();
			Object.defineProperty(exports, "RemoveScrollBar", {
				enumerable: true,
				get: function() {
					return component_1.RemoveScrollBar;
				}
			});
			var constants_1 = require_constants();
			Object.defineProperty(exports, "zeroRightClassName", {
				enumerable: true,
				get: function() {
					return constants_1.zeroRightClassName;
				}
			});
			Object.defineProperty(exports, "fullWidthClassName", {
				enumerable: true,
				get: function() {
					return constants_1.fullWidthClassName;
				}
			});
			Object.defineProperty(exports, "noScrollbarsClassName", {
				enumerable: true,
				get: function() {
					return constants_1.noScrollbarsClassName;
				}
			});
			Object.defineProperty(exports, "removedBarSizeVariable", {
				enumerable: true,
				get: function() {
					return constants_1.removedBarSizeVariable;
				}
			});
			var utils_1 = require_utils();
			Object.defineProperty(exports, "getGapWidth", {
				enumerable: true,
				get: function() {
					return utils_1.getGapWidth;
				}
			});
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/aggresiveCapture.js
		var require_aggresiveCapture = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.nonPassive = void 0;
			var passiveSupported = false;
			if (typeof window !== "undefined") try {
				var options = Object.defineProperty({}, "passive", { get: function() {
					passiveSupported = true;
					return true;
				} });
				window.addEventListener("test", options, options);
				window.removeEventListener("test", options, options);
			} catch (err) {
				passiveSupported = false;
			}
			exports.nonPassive = passiveSupported ? { passive: false } : false;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/handleScroll.js
		var require_handleScroll = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.handleScroll = exports.locationCouldBeScrolled = void 0;
			var alwaysContainsScroll = function(node) {
				return node.tagName === "TEXTAREA";
			};
			var elementCanBeScrolled = function(node, overflow) {
				if (!(node instanceof Element)) return false;
				var styles = window.getComputedStyle(node);
				return styles[overflow] !== "hidden" && !(styles.overflowY === styles.overflowX && !alwaysContainsScroll(node) && styles[overflow] === "visible");
			};
			var elementCouldBeVScrolled = function(node) {
				return elementCanBeScrolled(node, "overflowY");
			};
			var elementCouldBeHScrolled = function(node) {
				return elementCanBeScrolled(node, "overflowX");
			};
			var locationCouldBeScrolled = function(axis, node) {
				var ownerDocument = node.ownerDocument;
				var current = node;
				do {
					if (typeof ShadowRoot !== "undefined" && current instanceof ShadowRoot) current = current.host;
					if (elementCouldBeScrolled(axis, current)) {
						var _a = getScrollVariables(axis, current);
						if (_a[1] > _a[2]) return true;
					}
					current = current.parentNode;
				} while (current && current !== ownerDocument.body);
				return false;
			};
			exports.locationCouldBeScrolled = locationCouldBeScrolled;
			var getVScrollVariables = function(_a) {
				return [
					_a.scrollTop,
					_a.scrollHeight,
					_a.clientHeight
				];
			};
			var getHScrollVariables = function(_a) {
				return [
					_a.scrollLeft,
					_a.scrollWidth,
					_a.clientWidth
				];
			};
			var elementCouldBeScrolled = function(axis, node) {
				return axis === "v" ? elementCouldBeVScrolled(node) : elementCouldBeHScrolled(node);
			};
			var getScrollVariables = function(axis, node) {
				return axis === "v" ? getVScrollVariables(node) : getHScrollVariables(node);
			};
			var getDirectionFactor = function(axis, direction) {
				/**
				* If the element's direction is rtl (right-to-left), then scrollLeft is 0 when the scrollbar is at its rightmost position,
				* and then increasingly negative as you scroll towards the end of the content.
				* @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft
				*/
				return axis === "h" && direction === "rtl" ? -1 : 1;
			};
			var handleScroll = function(axis, endTarget, event, sourceDelta, noOverscroll) {
				var directionFactor = getDirectionFactor(axis, window.getComputedStyle(endTarget).direction);
				var delta = directionFactor * sourceDelta;
				var target = event.target;
				var targetInLock = endTarget.contains(target);
				var shouldCancelScroll = false;
				var isDeltaPositive = delta > 0;
				var availableScroll = 0;
				var availableScrollTop = 0;
				do {
					if (!target) break;
					var _a = getScrollVariables(axis, target), position = _a[0];
					var elementScroll = _a[1] - _a[2] - directionFactor * position;
					if (position || elementScroll) {
						if (elementCouldBeScrolled(axis, target)) {
							availableScroll += elementScroll;
							availableScrollTop += position;
						}
					}
					var parent_1 = target.parentNode;
					target = parent_1 && parent_1.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent_1.host : parent_1;
				} while (!targetInLock && target !== document.body || targetInLock && (endTarget.contains(target) || endTarget === target));
				if (isDeltaPositive && (noOverscroll && Math.abs(availableScroll) < 1 || !noOverscroll && delta > availableScroll)) shouldCancelScroll = true;
				else if (!isDeltaPositive && (noOverscroll && Math.abs(availableScrollTop) < 1 || !noOverscroll && -delta > availableScrollTop)) shouldCancelScroll = true;
				return shouldCancelScroll;
			};
			exports.handleScroll = handleScroll;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/SideEffect.js
		var require_SideEffect = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.RemoveScrollSideCar = exports.getDeltaXY = exports.getTouchXY = void 0;
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React$1 = tslib_1.__importStar(require("react"));
			var react_remove_scroll_bar_1 = require_es5$1();
			var react_style_singleton_1 = require_es5$2();
			var aggresiveCapture_1 = require_aggresiveCapture();
			var handleScroll_1 = require_handleScroll();
			var getTouchXY = function(event) {
				return "changedTouches" in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
			};
			exports.getTouchXY = getTouchXY;
			var getDeltaXY = function(event) {
				return [event.deltaX, event.deltaY];
			};
			exports.getDeltaXY = getDeltaXY;
			var extractRef = function(ref) {
				return ref && "current" in ref ? ref.current : ref;
			};
			var deltaCompare = function(x, y) {
				return x[0] === y[0] && x[1] === y[1];
			};
			var generateStyle = function(id) {
				return "\n  .block-interactivity-".concat(id, " {pointer-events: none;}\n  .allow-interactivity-").concat(id, " {pointer-events: all;}\n");
			};
			var idCounter = 0;
			var lockStack = [];
			function RemoveScrollSideCar(props) {
				var shouldPreventQueue = React$1.useRef([]);
				var touchStartRef = React$1.useRef([0, 0]);
				var activeAxis = React$1.useRef();
				var id = React$1.useState(idCounter++)[0];
				var Style = React$1.useState(react_style_singleton_1.styleSingleton)[0];
				var lastProps = React$1.useRef(props);
				React$1.useEffect(function() {
					lastProps.current = props;
				}, [props]);
				React$1.useEffect(function() {
					if (props.inert) {
						document.body.classList.add("block-interactivity-".concat(id));
						var allow_1 = tslib_1.__spreadArray([props.lockRef.current], (props.shards || []).map(extractRef), true).filter(Boolean);
						allow_1.forEach(function(el) {
							return el.classList.add("allow-interactivity-".concat(id));
						});
						return function() {
							document.body.classList.remove("block-interactivity-".concat(id));
							allow_1.forEach(function(el) {
								return el.classList.remove("allow-interactivity-".concat(id));
							});
						};
					}
				}, [
					props.inert,
					props.lockRef.current,
					props.shards
				]);
				var shouldCancelEvent = React$1.useCallback(function(event, parent) {
					if ("touches" in event && event.touches.length === 2 || event.type === "wheel" && event.ctrlKey) return !lastProps.current.allowPinchZoom;
					var touch = (0, exports.getTouchXY)(event);
					var touchStart = touchStartRef.current;
					var deltaX = "deltaX" in event ? event.deltaX : touchStart[0] - touch[0];
					var deltaY = "deltaY" in event ? event.deltaY : touchStart[1] - touch[1];
					var currentAxis;
					var target = event.target;
					var moveDirection = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
					if ("touches" in event && moveDirection === "h" && target.type === "range") return false;
					var selection = window.getSelection();
					var anchorNode = selection && selection.anchorNode;
					if (anchorNode ? anchorNode === target || anchorNode.contains(target) : false) return false;
					var canBeScrolledInMainDirection = (0, handleScroll_1.locationCouldBeScrolled)(moveDirection, target);
					if (!canBeScrolledInMainDirection) return true;
					if (canBeScrolledInMainDirection) currentAxis = moveDirection;
					else {
						currentAxis = moveDirection === "v" ? "h" : "v";
						canBeScrolledInMainDirection = (0, handleScroll_1.locationCouldBeScrolled)(moveDirection, target);
					}
					if (!canBeScrolledInMainDirection) return false;
					if (!activeAxis.current && "changedTouches" in event && (deltaX || deltaY)) activeAxis.current = currentAxis;
					if (!currentAxis) return true;
					var cancelingAxis = activeAxis.current || currentAxis;
					return (0, handleScroll_1.handleScroll)(cancelingAxis, parent, event, cancelingAxis === "h" ? deltaX : deltaY, true);
				}, []);
				var shouldPrevent = React$1.useCallback(function(_event) {
					var event = _event;
					if (!lockStack.length || lockStack[lockStack.length - 1] !== Style) return;
					var delta = "deltaY" in event ? (0, exports.getDeltaXY)(event) : (0, exports.getTouchXY)(event);
					var sourceEvent = shouldPreventQueue.current.filter(function(e) {
						return e.name === event.type && (e.target === event.target || event.target === e.shadowParent) && deltaCompare(e.delta, delta);
					})[0];
					if (sourceEvent && sourceEvent.should) {
						if (event.cancelable) event.preventDefault();
						return;
					}
					if (!sourceEvent) {
						var shardNodes = (lastProps.current.shards || []).map(extractRef).filter(Boolean).filter(function(node) {
							return node.contains(event.target);
						});
						if (shardNodes.length > 0 ? shouldCancelEvent(event, shardNodes[0]) : !lastProps.current.noIsolation) {
							if (event.cancelable) event.preventDefault();
						}
					}
				}, []);
				var shouldCancel = React$1.useCallback(function(name, delta, target, should) {
					var event = {
						name,
						delta,
						target,
						should,
						shadowParent: getOutermostShadowParent(target)
					};
					shouldPreventQueue.current.push(event);
					setTimeout(function() {
						shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e) {
							return e !== event;
						});
					}, 1);
				}, []);
				var scrollTouchStart = React$1.useCallback(function(event) {
					touchStartRef.current = (0, exports.getTouchXY)(event);
					activeAxis.current = void 0;
				}, []);
				var scrollWheel = React$1.useCallback(function(event) {
					shouldCancel(event.type, (0, exports.getDeltaXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
				}, []);
				var scrollTouchMove = React$1.useCallback(function(event) {
					shouldCancel(event.type, (0, exports.getTouchXY)(event), event.target, shouldCancelEvent(event, props.lockRef.current));
				}, []);
				React$1.useEffect(function() {
					lockStack.push(Style);
					props.setCallbacks({
						onScrollCapture: scrollWheel,
						onWheelCapture: scrollWheel,
						onTouchMoveCapture: scrollTouchMove
					});
					document.addEventListener("wheel", shouldPrevent, aggresiveCapture_1.nonPassive);
					document.addEventListener("touchmove", shouldPrevent, aggresiveCapture_1.nonPassive);
					document.addEventListener("touchstart", scrollTouchStart, aggresiveCapture_1.nonPassive);
					return function() {
						lockStack = lockStack.filter(function(inst) {
							return inst !== Style;
						});
						document.removeEventListener("wheel", shouldPrevent, aggresiveCapture_1.nonPassive);
						document.removeEventListener("touchmove", shouldPrevent, aggresiveCapture_1.nonPassive);
						document.removeEventListener("touchstart", scrollTouchStart, aggresiveCapture_1.nonPassive);
					};
				}, []);
				var removeScrollBar = props.removeScrollBar, inert = props.inert;
				return React$1.createElement(React$1.Fragment, null, inert ? React$1.createElement(Style, { styles: generateStyle(id) }) : null, removeScrollBar ? React$1.createElement(react_remove_scroll_bar_1.RemoveScrollBar, {
					noRelative: props.noRelative,
					gapMode: props.gapMode
				}) : null);
			}
			exports.RemoveScrollSideCar = RemoveScrollSideCar;
			function getOutermostShadowParent(node) {
				var shadowParent = null;
				while (node !== null) {
					if (node instanceof ShadowRoot) {
						shadowParent = node.host;
						node = node.host;
					}
					node = node.parentNode;
				}
				return shadowParent;
			}
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/sidecar.js
		var require_sidecar = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			var use_sidecar_1 = require_es5$4();
			var SideEffect_1 = require_SideEffect();
			var medium_1 = require_medium();
			exports.default = (0, use_sidecar_1.exportSidecar)(medium_1.effectCar, SideEffect_1.RemoveScrollSideCar);
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/Combination.js
		var require_Combination = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
			var React = tslib_1.__importStar(require("react"));
			var UI_1 = require_UI();
			var sidecar_1 = tslib_1.__importDefault(require_sidecar());
			var ReactRemoveScroll = React.forwardRef(function(props, ref) {
				return React.createElement(UI_1.RemoveScroll, tslib_1.__assign({}, props, {
					ref,
					sideCar: sidecar_1.default
				}));
			});
			ReactRemoveScroll.classNames = UI_1.RemoveScroll.classNames;
			exports.default = ReactRemoveScroll;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/react-remove-scroll@2.7.2_@types+react@18.3.31_react@18.3.1/node_modules/react-remove-scroll/dist/es5/index.js
		var require_es5 = /* @__PURE__ */ __commonJSMin(((exports) => {
			Object.defineProperty(exports, "__esModule", { value: true });
			exports.RemoveScroll = void 0;
			exports.RemoveScroll = (init_tslib_es6(), __toCommonJS(tslib_es6_exports)).__importDefault(require_Combination()).default;
		}));
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-menu@2.1.24_@types+react-dom@18.3.7_@types+react@18.3.31__@types+react@_afa9008fba7977ed3987a94e6bda236c/node_modules/@radix-ui/react-menu/dist/index.mjs
		var import_es5 = require_es5$6();
		var import_es5$1 = require_es5();
		var __defProp$1 = Object.defineProperty;
		var __name$1 = (target, value) => __defProp$1(target, "name", {
			value,
			configurable: true
		});
		var SELECTION_KEYS = ["Enter", " "];
		var FIRST_KEYS = [
			"ArrowDown",
			"PageUp",
			"Home"
		];
		var LAST_KEYS = [
			"ArrowUp",
			"PageDown",
			"End"
		];
		var FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
		[...SELECTION_KEYS], [...SELECTION_KEYS];
		var MENU_NAME = "Menu";
		var [Collection, useCollection, createCollectionScope] = /* @__PURE__ */ createCollection(MENU_NAME);
		var [createMenuContext, createMenuScope] = /* @__PURE__ */ createContextScope(MENU_NAME, [
			createCollectionScope,
			createPopperScope,
			createRovingFocusGroupScope
		]);
		var usePopperScope = createPopperScope();
		var useRovingFocusGroupScope = createRovingFocusGroupScope();
		var [MenuProvider, useMenuContext] = createMenuContext(MENU_NAME);
		var [MenuRootProvider, useMenuRootContext] = createMenuContext(MENU_NAME);
		var Menu = /* @__PURE__ */ __name$1((props) => {
			const { __scopeMenu, open = false, children, dir, onOpenChange, modal = true } = props;
			const popperScope = usePopperScope(__scopeMenu);
			const [content, setContent] = react.useState(null);
			const isUsingKeyboardRef = react.useRef(false);
			const handleOpenChange = useCallbackRef(onOpenChange);
			const direction = useDirection(dir);
			react.useEffect(() => {
				const handleKeyDown = /* @__PURE__ */ __name$1(() => {
					isUsingKeyboardRef.current = true;
					document.addEventListener("pointerdown", handlePointer, {
						capture: true,
						once: true
					});
					document.addEventListener("pointermove", handlePointer, {
						capture: true,
						once: true
					});
				}, "handleKeyDown");
				const handlePointer = /* @__PURE__ */ __name$1(() => isUsingKeyboardRef.current = false, "handlePointer");
				document.addEventListener("keydown", handleKeyDown, { capture: true });
				return () => {
					document.removeEventListener("keydown", handleKeyDown, { capture: true });
					document.removeEventListener("pointerdown", handlePointer, { capture: true });
					document.removeEventListener("pointermove", handlePointer, { capture: true });
				};
			}, []);
			react.useEffect(() => {
				if (!open) return;
				const handleBlur = /* @__PURE__ */ __name$1(() => handleOpenChange(false), "handleBlur");
				window.addEventListener("blur", handleBlur);
				return () => window.removeEventListener("blur", handleBlur);
			}, [open, handleOpenChange]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Root2$1, {
				...popperScope,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuProvider, {
					scope: __scopeMenu,
					open,
					onOpenChange: handleOpenChange,
					content,
					onContentChange: setContent,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuRootProvider, {
						scope: __scopeMenu,
						onClose: react.useCallback(() => handleOpenChange(false), [handleOpenChange]),
						isUsingKeyboardRef,
						dir: direction,
						modal,
						children
					})
				})
			});
		}, "Menu");
		var MenuAnchor = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuAnchor2(props, forwardedRef) {
			const { __scopeMenu, ...anchorProps } = props;
			const popperScope = usePopperScope(__scopeMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Anchor, {
				...popperScope,
				...anchorProps,
				ref: forwardedRef
			});
		}, "MenuAnchor"));
		var PORTAL_NAME = "MenuPortal";
		var [PortalProvider, usePortalContext] = createMenuContext(PORTAL_NAME, { forceMount: void 0 });
		var MenuPortal = /* @__PURE__ */ __name$1((props) => {
			const { __scopeMenu, forceMount, children, container } = props;
			const context = useMenuContext(PORTAL_NAME, __scopeMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PortalProvider, {
				scope: __scopeMenu,
				forceMount,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Presence, {
					present: forceMount || context.open,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Portal$1, {
						asChild: true,
						container,
						children
					})
				})
			});
		}, "MenuPortal");
		var CONTENT_NAME$1 = "MenuContent";
		var [MenuContentProvider, useMenuContentContext] = createMenuContext(CONTENT_NAME$1);
		var MenuContent = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuContent2(props, forwardedRef) {
			const portalContext = usePortalContext(CONTENT_NAME$1, props.__scopeMenu);
			const { forceMount = portalContext.forceMount, ...contentProps } = props;
			const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
			const rootContext = useMenuRootContext(CONTENT_NAME$1, props.__scopeMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection.Provider, {
				scope: props.__scopeMenu,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Presence, {
					present: forceMount || context.open,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection.Slot, {
						scope: props.__scopeMenu,
						children: rootContext.modal ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuRootContentModal, {
							...contentProps,
							ref: forwardedRef
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuRootContentNonModal, {
							...contentProps,
							ref: forwardedRef
						})
					})
				})
			});
		}, "MenuContent"));
		var MenuRootContentModal = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuRootContentModal2(props, forwardedRef) {
			const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
			const ref = react.useRef(null);
			const composedRefs = useComposedRefs(forwardedRef, ref);
			react.useEffect(() => {
				const content = ref.current;
				if (content) return (0, import_es5.hideOthers)(content);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuContentImpl, {
				...props,
				ref: composedRefs,
				trapFocus: context.open,
				disableOutsidePointerEvents: context.open,
				disableOutsideScroll: true,
				onFocusOutside: composeEventHandlers(props.onFocusOutside, (event) => event.preventDefault(), { checkForDefaultPrevented: false }),
				onDismiss: () => context.onOpenChange(false)
			});
		}, "MenuRootContentModal"));
		var MenuRootContentNonModal = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuRootContentNonModal2(props, forwardedRef) {
			const context = useMenuContext(CONTENT_NAME$1, props.__scopeMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuContentImpl, {
				...props,
				ref: forwardedRef,
				trapFocus: false,
				disableOutsidePointerEvents: false,
				disableOutsideScroll: false,
				onDismiss: () => context.onOpenChange(false)
			});
		}, "MenuRootContentNonModal"));
		var Slot = /* @__PURE__ */ createSlot("MenuContent.ScrollLock");
		var MenuContentImpl = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuContentImpl2(props, forwardedRef) {
			const { __scopeMenu, loop = false, trapFocus, onOpenAutoFocus, onCloseAutoFocus, disableOutsidePointerEvents, onEntryFocus, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss, disableOutsideScroll, ...contentProps } = props;
			const context = useMenuContext(CONTENT_NAME$1, __scopeMenu);
			const rootContext = useMenuRootContext(CONTENT_NAME$1, __scopeMenu);
			const popperScope = usePopperScope(__scopeMenu);
			const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
			const getItems = useCollection(__scopeMenu);
			const [currentItemId, setCurrentItemId] = react.useState(null);
			const contentRef = react.useRef(null);
			const composedRefs = useComposedRefs(forwardedRef, contentRef, context.onContentChange);
			const timerRef = react.useRef(0);
			const searchRef = react.useRef("");
			const pointerGraceTimerRef = react.useRef(0);
			const pointerGraceIntentRef = react.useRef(null);
			const pointerDirRef = react.useRef("right");
			const lastPointerXRef = react.useRef(0);
			const ScrollLockWrapper = disableOutsideScroll ? import_es5$1.RemoveScroll : react.Fragment;
			const scrollLockWrapperProps = disableOutsideScroll ? {
				as: Slot,
				allowPinchZoom: true
			} : void 0;
			const handleTypeaheadSearch = /* @__PURE__ */ __name$1((key) => {
				const search = searchRef.current + key;
				const items = getItems().filter((item) => !item.disabled);
				const currentItem = document.activeElement;
				const currentMatch = items.find((item) => item.ref.current === currentItem)?.textValue;
				const nextMatch = getNextMatch(items.map((item) => item.textValue), search, currentMatch);
				const newItem = items.find((item) => item.textValue === nextMatch)?.ref.current;
				(/* @__PURE__ */ __name$1((function updateSearch(value) {
					searchRef.current = value;
					window.clearTimeout(timerRef.current);
					if (value !== "") timerRef.current = window.setTimeout(() => updateSearch(""), 1e3);
				}), "updateSearch"))(search);
				if (newItem) setTimeout(() => newItem.focus());
			}, "handleTypeaheadSearch");
			react.useEffect(() => {
				return () => window.clearTimeout(timerRef.current);
			}, []);
			useFocusGuards();
			const isPointerMovingToSubmenu = react.useCallback((event) => {
				return pointerDirRef.current === pointerGraceIntentRef.current?.side && isPointerInGraceArea(event, pointerGraceIntentRef.current?.area);
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuContentProvider, {
				scope: __scopeMenu,
				searchRef,
				onItemEnter: react.useCallback((event) => {
					if (isPointerMovingToSubmenu(event)) event.preventDefault();
				}, [isPointerMovingToSubmenu]),
				onItemLeave: react.useCallback((event) => {
					if (isPointerMovingToSubmenu(event)) return;
					contentRef.current?.focus();
					setCurrentItemId(null);
				}, [isPointerMovingToSubmenu]),
				onTriggerLeave: react.useCallback((event) => {
					if (isPointerMovingToSubmenu(event)) event.preventDefault();
				}, [isPointerMovingToSubmenu]),
				pointerGraceTimerRef,
				onPointerGraceIntentChange: react.useCallback((intent) => {
					pointerGraceIntentRef.current = intent;
				}, []),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollLockWrapper, {
					...scrollLockWrapperProps,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FocusScope, {
						asChild: true,
						trapped: trapFocus,
						onMountAutoFocus: composeEventHandlers(onOpenAutoFocus, (event) => {
							event.preventDefault();
							contentRef.current?.focus({ preventScroll: true });
						}),
						onUnmountAutoFocus: onCloseAutoFocus,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DismissableLayer, {
							asChild: true,
							disableOutsidePointerEvents,
							onEscapeKeyDown,
							onPointerDownOutside,
							onFocusOutside,
							onInteractOutside,
							onDismiss,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Root, {
								asChild: true,
								...rovingFocusGroupScope,
								dir: rootContext.dir,
								orientation: "vertical",
								loop,
								currentTabStopId: currentItemId,
								onCurrentTabStopIdChange: setCurrentItemId,
								onEntryFocus: composeEventHandlers(onEntryFocus, (event) => {
									if (!rootContext.isUsingKeyboardRef.current) event.preventDefault();
								}),
								preventScrollOnEntryFocus: true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content, {
									role: "menu",
									"aria-orientation": "vertical",
									"data-state": getOpenState(context.open),
									"data-radix-menu-content": "",
									dir: rootContext.dir,
									...popperScope,
									...contentProps,
									ref: composedRefs,
									style: {
										outline: "none",
										...contentProps.style
									},
									onKeyDown: composeEventHandlers(contentProps.onKeyDown, (event) => {
										const isKeyDownInside = event.target.closest("[data-radix-menu-content]") === event.currentTarget;
										const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
										const isCharacterKey = event.key.length === 1;
										if (isKeyDownInside) {
											if (event.key === "Tab") event.preventDefault();
											if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key);
										}
										const content = contentRef.current;
										if (event.target !== content) return;
										if (!FIRST_LAST_KEYS.includes(event.key)) return;
										event.preventDefault();
										const candidateNodes = getItems().filter((item) => !item.disabled).map((item) => item.ref.current);
										if (LAST_KEYS.includes(event.key)) candidateNodes.reverse();
										focusFirst(candidateNodes);
									}),
									onBlur: composeEventHandlers(props.onBlur, (event) => {
										if (!event.currentTarget.contains(event.target)) {
											window.clearTimeout(timerRef.current);
											searchRef.current = "";
										}
									}),
									onPointerMove: composeEventHandlers(props.onPointerMove, whenMouse((event) => {
										const target = event.target;
										const pointerXHasChanged = lastPointerXRef.current !== event.clientX;
										if (event.currentTarget.contains(target) && pointerXHasChanged) {
											pointerDirRef.current = event.clientX > lastPointerXRef.current ? "right" : "left";
											lastPointerXRef.current = event.clientX;
										}
									}))
								})
							})
						})
					})
				})
			});
		}, "MenuContentImpl"));
		var ITEM_NAME = "MenuItem";
		var ITEM_SELECT = "menu.itemSelect";
		var MenuItem = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuItem2(props, forwardedRef) {
			const { disabled = false, onSelect, ...itemProps } = props;
			const ref = react.useRef(null);
			const rootContext = useMenuRootContext(ITEM_NAME, props.__scopeMenu);
			const contentContext = useMenuContentContext(ITEM_NAME, props.__scopeMenu);
			const composedRefs = useComposedRefs(forwardedRef, ref);
			const isPointerDownRef = react.useRef(false);
			const handleSelect = /* @__PURE__ */ __name$1(() => {
				const menuItem = ref.current;
				if (!disabled && menuItem) {
					const itemSelectEvent = new CustomEvent(ITEM_SELECT, {
						bubbles: true,
						cancelable: true
					});
					menuItem.addEventListener(ITEM_SELECT, (event) => onSelect?.(event), { once: true });
					dispatchDiscreteCustomEvent(menuItem, itemSelectEvent);
					if (itemSelectEvent.defaultPrevented) isPointerDownRef.current = false;
					else rootContext.onClose();
				}
			}, "handleSelect");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuItemImpl, {
				...itemProps,
				ref: composedRefs,
				disabled,
				onClick: composeEventHandlers(props.onClick, handleSelect),
				onPointerDown: (event) => {
					props.onPointerDown?.(event);
					isPointerDownRef.current = true;
				},
				onPointerUp: composeEventHandlers(props.onPointerUp, (event) => {
					if (!isPointerDownRef.current) event.currentTarget?.click();
				}),
				onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
					if (disabled || event.target !== event.currentTarget) return;
					if (contentContext.searchRef.current !== "" && event.key === " ") return;
					if (SELECTION_KEYS.includes(event.key)) {
						event.currentTarget.click();
						event.preventDefault();
					}
				})
			});
		}, "MenuItem"));
		var MenuItemImpl = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuItemImpl2(props, forwardedRef) {
			const { __scopeMenu, disabled = false, textValue, ...itemProps } = props;
			const contentContext = useMenuContentContext(ITEM_NAME, __scopeMenu);
			const rovingFocusGroupScope = useRovingFocusGroupScope(__scopeMenu);
			const ref = react.useRef(null);
			const composedRefs = useComposedRefs(forwardedRef, ref);
			const [isFocused, setIsFocused] = react.useState(false);
			const [textContent, setTextContent] = react.useState("");
			react.useEffect(() => {
				const menuItem = ref.current;
				if (menuItem) setTextContent((menuItem.textContent ?? "").trim());
			}, [itemProps.children]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Collection.ItemSlot, {
				scope: __scopeMenu,
				disabled,
				textValue: textValue ?? textContent,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Item, {
					asChild: true,
					...rovingFocusGroupScope,
					focusable: !disabled,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
						role: "menuitem",
						"data-highlighted": isFocused ? "" : void 0,
						"aria-disabled": disabled || void 0,
						"data-disabled": disabled ? "" : void 0,
						...itemProps,
						ref: composedRefs,
						onPointerMove: composeEventHandlers(props.onPointerMove, whenMouse((event) => {
							if (disabled) contentContext.onItemLeave(event);
							else {
								contentContext.onItemEnter(event);
								if (!event.defaultPrevented) event.currentTarget.focus({ preventScroll: true });
							}
						})),
						onPointerLeave: composeEventHandlers(props.onPointerLeave, whenMouse((event) => contentContext.onItemLeave(event))),
						onFocus: composeEventHandlers(props.onFocus, () => setIsFocused(true)),
						onBlur: composeEventHandlers(props.onBlur, () => setIsFocused(false))
					})
				})
			});
		}, "MenuItemImpl"));
		var [RadioGroupProvider, useRadioGroupContext] = createMenuContext("MenuRadioGroup", {
			value: void 0,
			onValueChange: /* @__PURE__ */ __name$1(() => {}, "onValueChange")
		});
		var [ItemIndicatorProvider, useItemIndicatorContext] = createMenuContext("MenuItemIndicator", { checked: false });
		var MenuSeparator = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name$1(function MenuSeparator2(props, forwardedRef) {
			const { __scopeMenu, ...separatorProps } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.div, {
				role: "separator",
				"aria-orientation": "horizontal",
				...separatorProps,
				ref: forwardedRef
			});
		}, "MenuSeparator"));
		var [MenuSubProvider, useMenuSubContext] = createMenuContext("MenuSub");
		function getOpenState(open) {
			return open ? "open" : "closed";
		}
		__name$1(getOpenState, "getOpenState");
		function isIndeterminate(checked) {
			return checked === "indeterminate";
		}
		__name$1(isIndeterminate, "isIndeterminate");
		function getCheckedState(checked) {
			return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
		}
		__name$1(getCheckedState, "getCheckedState");
		function focusFirst(candidates) {
			const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
			for (const candidate of candidates) {
				if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
				candidate.focus();
				if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return;
			}
		}
		__name$1(focusFirst, "focusFirst");
		function wrapArray(array, startIndex) {
			return array.map((_, index) => array[(startIndex + index) % array.length]);
		}
		__name$1(wrapArray, "wrapArray");
		function getNextMatch(values, search, currentMatch) {
			const normalizedSearch = search.length > 1 && Array.from(search).every((char) => char === search[0]) ? search[0] : search;
			const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1;
			let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0));
			if (normalizedSearch.length === 1) wrappedValues = wrappedValues.filter((v) => v !== currentMatch);
			const nextMatch = wrappedValues.find((value) => value.toLowerCase().startsWith(normalizedSearch.toLowerCase()));
			return nextMatch !== currentMatch ? nextMatch : void 0;
		}
		__name$1(getNextMatch, "getNextMatch");
		function isPointInPolygon(point, polygon) {
			const { x, y } = point;
			let inside = false;
			for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
				const ii = polygon[i];
				const jj = polygon[j];
				const xi = ii.x;
				const yi = ii.y;
				const xj = jj.x;
				const yj = jj.y;
				if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
			}
			return inside;
		}
		__name$1(isPointInPolygon, "isPointInPolygon");
		function isPointerInGraceArea(event, area) {
			if (!area) return false;
			return isPointInPolygon({
				x: event.clientX,
				y: event.clientY
			}, area);
		}
		__name$1(isPointerInGraceArea, "isPointerInGraceArea");
		function whenMouse(handler) {
			return (event) => event.pointerType === "mouse" ? handler(event) : void 0;
		}
		__name$1(whenMouse, "whenMouse");
		var Root3 = Menu;
		var Anchor2 = MenuAnchor;
		var Portal = MenuPortal;
		var Content2$1 = MenuContent;
		var Item2$1 = MenuItem;
		var Separator = MenuSeparator;
		//#endregion
		//#region ../../node_modules/.pnpm/@radix-ui+react-dropdown-menu@2.1.24_@types+react-dom@18.3.7_@types+react@18.3.31__@typ_c44695284457f2a403af83fb7d30e3e4/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs
		var __defProp = Object.defineProperty;
		var __name = (target, value) => __defProp(target, "name", {
			value,
			configurable: true
		});
		var DROPDOWN_MENU_NAME = "DropdownMenu";
		var [createDropdownMenuContext, createDropdownMenuScope] = /* @__PURE__ */ createContextScope(DROPDOWN_MENU_NAME, [createMenuScope]);
		var useMenuScope = createMenuScope();
		var [DropdownMenuProvider, useDropdownMenuContext] = createDropdownMenuContext(DROPDOWN_MENU_NAME);
		var DropdownMenu = /* @__PURE__ */ __name((props) => {
			const { __scopeDropdownMenu, children, dir, open: openProp, defaultOpen, onOpenChange, modal = true } = props;
			const menuScope = useMenuScope(__scopeDropdownMenu);
			const triggerRef = react.useRef(null);
			const [open, setOpen] = useControllableState({
				prop: openProp,
				defaultProp: defaultOpen ?? false,
				onChange: onOpenChange,
				caller: DROPDOWN_MENU_NAME
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DropdownMenuProvider, {
				scope: __scopeDropdownMenu,
				triggerId: useId(),
				triggerRef,
				contentId: useId(),
				open,
				onOpenChange: setOpen,
				onOpenToggle: react.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
				modal,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Root3, {
					...menuScope,
					open,
					onOpenChange: setOpen,
					dir,
					modal,
					children
				})
			});
		}, "DropdownMenu");
		var TRIGGER_NAME = "DropdownMenuTrigger";
		var DropdownMenuTrigger = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuTrigger2(props, forwardedRef) {
			const { __scopeDropdownMenu, disabled = false, ...triggerProps } = props;
			const context = useDropdownMenuContext(TRIGGER_NAME, __scopeDropdownMenu);
			const menuScope = useMenuScope(__scopeDropdownMenu);
			const composedRefs = useComposedRefs(forwardedRef, context.triggerRef);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Anchor2, {
				asChild: true,
				...menuScope,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.button, {
					type: "button",
					id: context.triggerId,
					"aria-haspopup": "menu",
					"aria-expanded": context.open,
					"aria-controls": context.open ? context.contentId : void 0,
					"data-state": context.open ? "open" : "closed",
					"data-disabled": disabled ? "" : void 0,
					disabled,
					...triggerProps,
					ref: composedRefs,
					onPointerDown: composeEventHandlers(props.onPointerDown, (event) => {
						if (!disabled && event.button === 0 && event.ctrlKey === false) {
							context.onOpenToggle();
							if (!context.open) event.preventDefault();
						}
					}),
					onKeyDown: composeEventHandlers(props.onKeyDown, (event) => {
						if (disabled) return;
						if (["Enter", " "].includes(event.key)) context.onOpenToggle();
						if (event.key === "ArrowDown") context.onOpenChange(true);
						if ([
							"Enter",
							" ",
							"ArrowDown"
						].includes(event.key)) event.preventDefault();
					})
				})
			});
		}, "DropdownMenuTrigger"));
		var DropdownMenuPortal = /* @__PURE__ */ __name((props) => {
			const { __scopeDropdownMenu, ...portalProps } = props;
			const menuScope = useMenuScope(__scopeDropdownMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Portal, {
				...menuScope,
				...portalProps
			});
		}, "DropdownMenuPortal");
		var CONTENT_NAME = "DropdownMenuContent";
		var DropdownMenuContent = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuContent2(props, forwardedRef) {
			const { __scopeDropdownMenu, ...contentProps } = props;
			const context = useDropdownMenuContext(CONTENT_NAME, __scopeDropdownMenu);
			const menuScope = useMenuScope(__scopeDropdownMenu);
			const hasInteractedOutsideRef = react.useRef(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Content2$1, {
				id: context.contentId,
				"aria-labelledby": context.triggerId,
				...menuScope,
				...contentProps,
				ref: forwardedRef,
				onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
					if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
					hasInteractedOutsideRef.current = false;
					event.preventDefault();
				}),
				onInteractOutside: composeEventHandlers(props.onInteractOutside, (event) => {
					const originalEvent = event.detail.originalEvent;
					const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
					const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
					if (!context.modal || isRightClick) hasInteractedOutsideRef.current = true;
				}),
				style: {
					...props.style,
					"--radix-dropdown-menu-content-transform-origin": "var(--radix-popper-transform-origin)",
					"--radix-dropdown-menu-content-available-width": "var(--radix-popper-available-width)",
					"--radix-dropdown-menu-content-available-height": "var(--radix-popper-available-height)",
					"--radix-dropdown-menu-trigger-width": "var(--radix-popper-anchor-width)",
					"--radix-dropdown-menu-trigger-height": "var(--radix-popper-anchor-height)"
				}
			});
		}, "DropdownMenuContent"));
		var DropdownMenuItem = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuItem2(props, forwardedRef) {
			const { __scopeDropdownMenu, ...itemProps } = props;
			const menuScope = useMenuScope(__scopeDropdownMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Item2$1, {
				...menuScope,
				...itemProps,
				ref: forwardedRef
			});
		}, "DropdownMenuItem"));
		var DropdownMenuSeparator = /* @__PURE__ */ react.forwardRef(/* @__PURE__ */ __name(function DropdownMenuSeparator2(props, forwardedRef) {
			const { __scopeDropdownMenu, ...separatorProps } = props;
			const menuScope = useMenuScope(__scopeDropdownMenu);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Separator, {
				...menuScope,
				...separatorProps,
				ref: forwardedRef
			});
		}, "DropdownMenuSeparator"));
		var Root2 = DropdownMenu;
		var Trigger = DropdownMenuTrigger;
		var Portal2 = DropdownMenuPortal;
		var Content2 = DropdownMenuContent;
		var Item2 = DropdownMenuItem;
		var Separator2 = DropdownMenuSeparator;
		//#endregion
		//#region src/client/identity.ts
		/**
		* Reading a display name and its initials out of the session's `user` value.
		*
		* That value is whatever the login service returned, minus the token — this
		* plugin never assumes a shape, so every field is checked before it is read.
		* A service that returns nothing usable leaves the badge with no name, which
		* the menu renders as a neutral placeholder rather than as a broken row.
		*
		* This module is deliberately dependency-free: no React, no Node, no
		* `@deepseek-ai` values, so the bundle purity gate never has to look at it.
		* @module dsh-user-menu/client/identity
		*/
		/** Shown when the service returned no name and no e-mail. */
		const UNKNOWN_INITIALS = "?";
		/**
		* Read one non-blank string field off a record.
		* @param record - the object to read.
		* @param key - the field name.
		* @returns the trimmed value, or null when it is absent, blank, or not a string.
		*/
		function field(record, key) {
			const value = record[key];
			if (typeof value !== "string" || value.trim() === "") return null;
			return value.trim();
		}
		/**
		* Read a display name out of one record: `name` wins, an e-mail is the
		* fallback, cut at the `@` so the badge shows the person and not the domain.
		* @param record - a candidate object.
		* @returns the name, or null when the record carries neither.
		*/
		function nameIn(record) {
			const name = field(record, "name");
			if (name !== null) return name;
			const email = field(record, "email");
			if (email === null) return null;
			const local = email.split("@")[0] ?? "";
			return local === "" ? null : local;
		}
		/**
		* Read a display name out of the session's user value.
		*
		* dsh-login stores the login answer MINUS the token, so this value is the
		* response body as the service shaped it. Two shapes are conventional and both
		* are read: the fields at the top level (`{ token, name, email }` leaves
		* `{ name, email }`), and nested under a container (`{ token, user: {…} }`
		* leaves `{ user: {…} }`). The nested pass tries every object-valued property
		* rather than a hardcoded `user`/`data`/`profile` list, and stops at depth one
		* — deeper would start matching unrelated records the answer happens to carry.
		* @param user - the session's user value, of unknown shape.
		* @returns the trimmed name, or null when no field carries one.
		*/
		function displayName(user) {
			if (typeof user !== "object" || user === null) return null;
			const record = user;
			const own = nameIn(record);
			if (own !== null) return own;
			for (const value of Object.values(record)) {
				if (typeof value !== "object" || value === null || Array.isArray(value)) continue;
				const nested = nameIn(value);
				if (nested !== null) return nested;
			}
			return null;
		}
		/**
		* The badge's letters: the first two of the name, upper-cased.
		*
		* Iterated by code point, so an accented or non-Latin first letter counts as
		* one character rather than as half a surrogate pair. A one-character name
		* yields one letter; no name yields {@link UNKNOWN_INITIALS}.
		* @param name - the display name, or null.
		* @returns one or two upper-case characters.
		*/
		function initials(name) {
			if (name === null) return "?";
			const letters = [...name.trim()].slice(0, 2).join("");
			if (letters === "") return "?";
			return letters.toLocaleUpperCase();
		}
		//#endregion
		//#region \0dsh-css:/home/rai/shiva-code/plugins/dsh-user-menu/src/client/UserMenu.module.css.mjs
		const css = ".n3tNSW_trigger{width:100%;min-width:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:10px;align-items:center;gap:10px;padding:6px 8px;font-size:13px;line-height:20px;display:flex}.n3tNSW_collapsed{justify-content:center;width:auto;padding:6px}.n3tNSW_name{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.n3tNSW_trigger:hover,.n3tNSW_trigger[data-state=open]{background:var(--dsw-alias-interactive-bg-hover)}.n3tNSW_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.n3tNSW_avatar{background:var(--dsw-alias-state-business-primary);width:24px;height:24px;color:var(--dsw-static-white,#fff);letter-spacing:.2px;user-select:none;white-space:nowrap;border-radius:999px;flex:none;place-items:center;font-size:10px;font-weight:600;line-height:1;display:grid}.n3tNSW_content{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);min-width:200px;max-width:280px;box-shadow:var(--dsw-shadow-lv2);font-family:var(--dsw-font-family);z-index:10001;border-radius:12px;padding:4px;font-size:13px;line-height:20px}.n3tNSW_header{flex-direction:column;gap:2px;min-width:0;padding:8px 10px;display:flex}.n3tNSW_headerName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.n3tNSW_headerDetail{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;overflow:hidden}.n3tNSW_separator{background:var(--dsw-alias-border-l2);height:1px;margin:4px 0}.n3tNSW_item{color:var(--dsw-alias-label-primary);cursor:pointer;user-select:none;border-radius:8px;outline:none;align-items:center;padding:8px 10px;display:flex}.n3tNSW_item[data-highlighted]{background:var(--dsw-alias-interactive-bg-hover)}.n3tNSW_item[data-disabled]{color:var(--dsw-alias-label-secondary);cursor:default}";
		const tagId = "dsh-user-menu/UserMenu.module.css";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "dsh-user-menu";
				tag.dataset.pluginCss = tagId;
				document.head.appendChild(tag);
			}
			if (tag.textContent !== css) tag.textContent = css;
		}
		var UserMenu_module_css_default = {
			"item": "n3tNSW_item",
			"collapsed": "n3tNSW_collapsed",
			"trigger": "n3tNSW_trigger",
			"headerName": "n3tNSW_headerName",
			"content": "n3tNSW_content",
			"name": "n3tNSW_name",
			"avatar": "n3tNSW_avatar",
			"header": "n3tNSW_header",
			"headerDetail": "n3tNSW_headerDetail",
			"separator": "n3tNSW_separator"
		};
		//#endregion
		//#region src/client/UserMenu.tsx
		/**
		* The signed-in user's badge and its menu.
		*
		* Built on the Radix dropdown primitive — the same primitive shadcn/ui and
		* ReUI build their DropdownMenu on — so the focus trap, roving keyboard
		* navigation, Escape, outside-click, and the `aria-*` wiring are the
		* primitive's, not hand-rolled. The look is this plugin's own CSS module over
		* the app's `--dsw-*` design tokens, because the project ships no Tailwind and
		* a copied utility-class markup would render unstyled.
		*
		* Renders `null` while nobody is signed in, which is the whole gating
		* mechanism for the seat: the footer slot is a list, so an entry that renders
		* nothing costs the sidebar nothing.
		* @module dsh-user-menu/client/UserMenu
		*/
		/** Menu copy. The app it ships with is Portuguese; see the README to change it. */
		const SIGN_OUT_LABEL = "Sair";
		/** Accessible name of the trigger, since the collapsed rail shows letters only. */
		const TRIGGER_LABEL = "Conta";
		/**
		* Render the badge.
		* @param props - the shared session and the sidebar width.
		* @returns the badge and its menu, or null while nobody is signed in.
		*/
		function UserMenu({ session, wide }) {
			const snapshot = (0, react.useSyncExternalStore)((listener) => session.subscribe(listener), () => session.getSnapshot());
			const [leaving, setLeaving] = (0, react.useState)(false);
			const onSignOut = (0, react.useCallback)(() => {
				setLeaving(true);
				session.signOut();
			}, [session]);
			if (snapshot === null) return null;
			const name = displayName(snapshot.user);
			const letters = initials(name);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Root2, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Trigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: wide ? UserMenu_module_css_default["trigger"] : `${UserMenu_module_css_default["trigger"]} ${UserMenu_module_css_default["collapsed"]}`,
					"aria-label": name === null ? TRIGGER_LABEL : `${TRIGGER_LABEL}: ${name}`,
					title: name ?? TRIGGER_LABEL,
					"data-dsh-user-menu": "",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UserMenu_module_css_default["avatar"],
						"aria-hidden": "true",
						children: letters
					}), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: UserMenu_module_css_default["name"],
						children: name ?? TRIGGER_LABEL
					})]
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Content2, {
				className: UserMenu_module_css_default["content"],
				side: "top",
				align: "start",
				sideOffset: 8,
				collisionPadding: 8,
				children: [name !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: UserMenu_module_css_default["header"],
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UserMenu_module_css_default["headerName"],
						children: name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: UserMenu_module_css_default["headerDetail"],
						children: TRIGGER_LABEL
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Separator2, { className: UserMenu_module_css_default["separator"] })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Item2, {
					className: UserMenu_module_css_default["item"],
					disabled: leaving,
					onSelect: onSignOut,
					children: SIGN_OUT_LABEL
				})]
			}) })] });
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Client half of dsh-user-menu: the last row of the sidebar foot, under
		* Settings.
		*
		* `sidebar.footer.below` is a stacking list, which is what this badge needs
		* and what the older `sidebar.footer.action` seat cannot give: that one is a
		* single flex ROW shared by every occupant, and `dsh-kanban` already fills it
		* with a `flex: 0 0 auto` button hardcoded to 264px inside a 256px row, so a
		* second entry is pushed past the sidebar's edge and clipped whatever width it
		* declares. The new seat is a column, so this row claims the full width beside
		* its neighbours rather than competing with them.
		*
		* `slots.inject` waits for the seat's declaration and `inject` waits for
		* dsh-login's session service, so unloading either plugin removes the badge
		* with it.
		* @module dsh-user-menu/client
		*/
		/** The seat this plugin contributes into: the sidebar foot, under Settings. */
		const FOOTER_SLOT = "sidebar.footer.below";
		/** This entry's cell key in that list slot. */
		const ENTRY_ID = "dsh-user-menu";
		/** Ascending display order among the occupants of that seat. */
		const ENTRY_ORDER = 100;
		/**
		* Services required before mounting: the slot registry from the client
		* runtime, and the shared session dsh-login publishes.
		*/
		const inject = ["slots", "loginSession"];
		/**
		* Client plugin body.
		* @param ctx - the browser cordis context carrying the slot registry and session.
		*/
		function apply(ctx) {
			ctx.slots.inject(FOOTER_SLOT, () => ctx.slots.register({
				name: FOOTER_SLOT,
				id: ENTRY_ID,
				order: 100
			}, (props) => UserMenu({
				session: ctx.loginSession,
				wide: props["wide"] === true
			})));
		}
		//#endregion
		exports.ENTRY_ID = ENTRY_ID;
		exports.ENTRY_ORDER = ENTRY_ORDER;
		exports.FOOTER_SLOT = FOOTER_SLOT;
		exports.UNKNOWN_INITIALS = UNKNOWN_INITIALS;
		exports.UserMenu = UserMenu;
		exports.apply = apply;
		exports.displayName = displayName;
		exports.initials = initials;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map