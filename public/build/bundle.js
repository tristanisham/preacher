
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/partials/Navbar.svelte generated by Svelte v3.44.2 */

    const file$1 = "src/partials/Navbar.svelte";

    // (171:20) {#if dropdown}
    function create_if_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none");
    			attr_dev(div, "role", "menu");
    			attr_dev(div, "aria-orientation", "vertical");
    			attr_dev(div, "aria-labelledby", "user-menu-button");
    			attr_dev(div, "tabindex", "-1");
    			add_location(div, file$1, 171, 24, 7571);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(171:20) {#if dropdown}",
    		ctx
    	});

    	return block;
    }

    // (207:4) {#if mobile_dropdown}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let t1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Dashboard";
    			t1 = text("\n\n        #");
    			attr_dev(button, "class", "text-white block px-3 py-2 rounded-md text-base font-medium border-0");
    			attr_dev(button, "aria-current", "page");
    			add_location(button, file$1, 212, 16, 9534);
    			attr_dev(div0, "class", "px-2 pt-2 pb-3 space-y-1 w-full");
    			add_location(div0, file$1, 209, 12, 9351);
    			attr_dev(div1, "class", "sm:hidden");
    			attr_dev(div1, "id", "mobile-menu");
    			add_location(div1, file$1, 208, 8, 9298);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(207:4) {#if mobile_dropdown}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let div9;
    	let div8;
    	let div0;
    	let button0;
    	let span0;
    	let t1;
    	let svg0;
    	let path0;
    	let t2;
    	let svg1;
    	let path1;
    	let t3;
    	let div4;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div3;
    	let div2;
    	let button1;
    	let t7;
    	let div7;
    	let button2;
    	let span1;
    	let t9;
    	let svg2;
    	let path2;
    	let t10;
    	let div6;
    	let div5;
    	let button3;
    	let span2;
    	let t12;
    	let img2;
    	let img2_src_value;
    	let t13;
    	let t14;
    	let mounted;
    	let dispose;
    	let if_block0 = /*dropdown*/ ctx[1] && create_if_block_1(ctx);
    	let if_block1 = /*mobile_dropdown*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div9 = element("div");
    			div8 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "Open main menu";
    			t1 = space();
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t2 = space();
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			t3 = space();
    			div4 = element("div");
    			div1 = element("div");
    			img0 = element("img");
    			t4 = space();
    			img1 = element("img");
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");
    			button1 = element("button");
    			button1.textContent = "Dashboard";
    			t7 = space();
    			div7 = element("div");
    			button2 = element("button");
    			span1 = element("span");
    			span1.textContent = "View notifications";
    			t9 = space();
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t10 = space();
    			div6 = element("div");
    			div5 = element("div");
    			button3 = element("button");
    			span2 = element("span");
    			span2.textContent = "Open user menu";
    			t12 = space();
    			img2 = element("img");
    			t13 = space();
    			if (if_block0) if_block0.c();
    			t14 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(span0, "class", "sr-only");
    			add_location(span0, file$1, 25, 20, 1015);
    			attr_dev(path0, "stroke-linecap", "round");
    			attr_dev(path0, "stroke-linejoin", "round");
    			attr_dev(path0, "stroke-width", "2");
    			attr_dev(path0, "d", "M4 6h16M4 12h16M4 18h16");
    			add_location(path0, file$1, 41, 24, 1589);
    			attr_dev(svg0, "class", "block h-6 w-6");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "fill", "none");
    			attr_dev(svg0, "viewBox", "0 0 24 24");
    			attr_dev(svg0, "stroke", "currentColor");
    			attr_dev(svg0, "aria-hidden", "true");
    			add_location(svg0, file$1, 33, 20, 1264);
    			attr_dev(path1, "stroke-linecap", "round");
    			attr_dev(path1, "stroke-linejoin", "round");
    			attr_dev(path1, "stroke-width", "2");
    			attr_dev(path1, "d", "M6 18L18 6M6 6l12 12");
    			add_location(path1, file$1, 63, 24, 2379);
    			attr_dev(svg1, "class", "hidden h-6 w-6");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			attr_dev(svg1, "stroke", "currentColor");
    			attr_dev(svg1, "aria-hidden", "true");
    			add_location(svg1, file$1, 55, 20, 2053);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white");
    			attr_dev(button0, "aria-controls", "mobile-menu");
    			attr_dev(button0, "aria-expanded", "false");
    			add_location(button0, file$1, 18, 16, 595);
    			attr_dev(div0, "class", "absolute inset-y-0 left-0 flex items-center sm:hidden");
    			add_location(div0, file$1, 16, 12, 468);
    			attr_dev(img0, "class", "block lg:hidden h-8 w-auto");
    			if (!src_url_equal(img0.src, img0_src_value = "https://nsgcentral.nationalstrategic.com/images/national-strategic-logo.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", /*site_title*/ ctx[0]);
    			add_location(img0, file$1, 76, 20, 2896);
    			attr_dev(img1, "class", "hidden lg:block h-8 w-auto");
    			if (!src_url_equal(img1.src, img1_src_value = "https://nsgcentral.nationalstrategic.com/images/national-strategic-logo.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", /*site_title*/ ctx[0]);
    			add_location(img1, file$1, 81, 20, 3152);
    			attr_dev(div1, "class", "flex-shrink-0 flex items-center");
    			add_location(div1, file$1, 75, 16, 2830);
    			attr_dev(button1, "class", "bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium border-0");
    			add_location(button1, file$1, 91, 24, 3667);
    			attr_dev(div2, "class", "flex space-x-4");
    			add_location(div2, file$1, 88, 20, 3485);
    			attr_dev(div3, "class", "hidden sm:block sm:ml-6");
    			add_location(div3, file$1, 87, 16, 3427);
    			attr_dev(div4, "class", "flex-1 flex items-center justify-center sm:items-stretch sm:justify-start");
    			add_location(div4, file$1, 72, 12, 2697);
    			attr_dev(span1, "class", "sr-only");
    			add_location(span1, file$1, 121, 20, 5103);
    			attr_dev(path2, "stroke-linecap", "round");
    			attr_dev(path2, "stroke-linejoin", "round");
    			attr_dev(path2, "stroke-width", "2");
    			attr_dev(path2, "d", "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9");
    			add_location(path2, file$1, 131, 24, 5547);
    			attr_dev(svg2, "class", "h-6 w-6");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "fill", "none");
    			attr_dev(svg2, "viewBox", "0 0 24 24");
    			attr_dev(svg2, "stroke", "currentColor");
    			attr_dev(svg2, "aria-hidden", "true");
    			add_location(svg2, file$1, 123, 20, 5228);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "bg-gray-800 p-1 rounded-full text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white");
    			add_location(button2, file$1, 117, 16, 4839);
    			attr_dev(span2, "class", "sr-only");
    			add_location(span2, file$1, 151, 28, 6617);
    			attr_dev(img2, "class", "h-8 w-8 rounded-full");
    			if (!src_url_equal(img2.src, img2_src_value = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$1, 152, 28, 6689);
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "class", "bg-gray-800 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white");
    			attr_dev(button3, "id", "user-menu-button");
    			attr_dev(button3, "aria-expanded", "false");
    			attr_dev(button3, "aria-haspopup", "true");
    			add_location(button3, file$1, 143, 24, 6140);
    			add_location(div5, file$1, 142, 20, 6110);
    			attr_dev(div6, "class", "ml-3 relative");
    			add_location(div6, file$1, 141, 16, 6062);
    			attr_dev(div7, "class", "absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0");
    			add_location(div7, file$1, 114, 12, 4690);
    			attr_dev(div8, "class", "relative flex items-center justify-between h-16");
    			add_location(div8, file$1, 15, 8, 394);
    			attr_dev(div9, "class", "max-w-7xl mx-auto px-2 sm:px-6 lg:px-8");
    			add_location(div9, file$1, 14, 4, 333);
    			attr_dev(nav, "class", "bg-gray-800 w-screen");
    			add_location(nav, file$1, 13, 0, 294);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div0);
    			append_dev(div0, button0);
    			append_dev(button0, span0);
    			append_dev(button0, t1);
    			append_dev(button0, svg0);
    			append_dev(svg0, path0);
    			append_dev(button0, t2);
    			append_dev(button0, svg1);
    			append_dev(svg1, path1);
    			append_dev(div8, t3);
    			append_dev(div8, div4);
    			append_dev(div4, div1);
    			append_dev(div1, img0);
    			append_dev(div1, t4);
    			append_dev(div1, img1);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, button1);
    			append_dev(div8, t7);
    			append_dev(div8, div7);
    			append_dev(div7, button2);
    			append_dev(button2, span1);
    			append_dev(button2, t9);
    			append_dev(button2, svg2);
    			append_dev(svg2, path2);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, button3);
    			append_dev(button3, span2);
    			append_dev(button3, t12);
    			append_dev(button3, img2);
    			append_dev(div6, t13);
    			if (if_block0) if_block0.m(div6, null);
    			append_dev(nav, t14);
    			if (if_block1) if_block1.m(nav, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*toggleMobileDropdown*/ ctx[4], false, false, false),
    					listen_dev(button3, "click", /*toggleDropdown*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*site_title*/ 1) {
    				attr_dev(img0, "alt", /*site_title*/ ctx[0]);
    			}

    			if (dirty & /*site_title*/ 1) {
    				attr_dev(img1, "alt", /*site_title*/ ctx[0]);
    			}

    			if (/*dropdown*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div6, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mobile_dropdown*/ ctx[2]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(nav, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	let { site_title } = $$props;

    	// import createEventDispatcher from "svelte";
    	let dropdown = false;

    	let mobile_dropdown = false;

    	function toggleDropdown() {
    		$$invalidate(1, dropdown = !dropdown);
    	}

    	function toggleMobileDropdown() {
    		$$invalidate(2, mobile_dropdown = !mobile_dropdown);
    	}

    	const writable_props = ['site_title'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('site_title' in $$props) $$invalidate(0, site_title = $$props.site_title);
    	};

    	$$self.$capture_state = () => ({
    		site_title,
    		dropdown,
    		mobile_dropdown,
    		toggleDropdown,
    		toggleMobileDropdown
    	});

    	$$self.$inject_state = $$props => {
    		if ('site_title' in $$props) $$invalidate(0, site_title = $$props.site_title);
    		if ('dropdown' in $$props) $$invalidate(1, dropdown = $$props.dropdown);
    		if ('mobile_dropdown' in $$props) $$invalidate(2, mobile_dropdown = $$props.mobile_dropdown);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [site_title, dropdown, mobile_dropdown, toggleDropdown, toggleMobileDropdown];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { site_title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*site_title*/ ctx[0] === undefined && !('site_title' in props)) {
    			console.warn("<Navbar> was created without expected prop 'site_title'");
    		}
    	}

    	get site_title() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set site_title(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let navbar;
    	let t0;
    	let h1;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let p;
    	let t5;
    	let a;
    	let t7;
    	let current;

    	navbar = new Navbar({
    			props: { site_title: /*name*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			h1 = element("h1");
    			t1 = text("Hello ");
    			t2 = text(/*name*/ ctx[0]);
    			t3 = text("!");
    			t4 = space();
    			p = element("p");
    			t5 = text("Visit the ");
    			a = element("a");
    			a.textContent = "Svelte tutorial";
    			t7 = text(" to learn how to build Svelte apps.");
    			add_location(h1, file, 6, 1, 130);
    			attr_dev(a, "href", "https://svelte.dev/tutorial");
    			add_location(a, file, 7, 14, 167);
    			add_location(p, file, 7, 1, 154);
    			add_location(main, file, 4, 0, 93);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t0);
    			append_dev(main, h1);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(h1, t3);
    			append_dev(main, t4);
    			append_dev(main, p);
    			append_dev(p, t5);
    			append_dev(p, a);
    			append_dev(p, t7);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const navbar_changes = {};
    			if (dirty & /*name*/ 1) navbar_changes.site_title = /*name*/ ctx[0];
    			navbar.$set(navbar_changes);
    			if (!current || dirty & /*name*/ 1) set_data_dev(t2, /*name*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name } = $$props;
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ Navbar, name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'Milkweed'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
