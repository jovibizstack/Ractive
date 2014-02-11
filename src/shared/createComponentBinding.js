define([
	'circular',
	'utils/isArray',
	'utils/isEqual',
	'shared/registerDependant',
	'shared/unregisterDependant'
], function (
	circular,
	isArray,
	isEqual,
	registerDependant,
	unregisterDependant
) {

	'use strict';

	var get;

	circular.push( function () {
		get = circular.get;
	});

	var Binding = function ( ractive, keypath, otherInstance, otherKeypath, priority ) {
		this.root = ractive;
		this.keypath = keypath;
		this.priority = priority;

		this.otherInstance = otherInstance;
		this.otherKeypath = otherKeypath;

		registerDependant( this );

		this.value = get( this.root, this.keypath );
	};

	Binding.prototype = {
		update: function () {
			var value;

			// Only *you* can prevent infinite loops
			if ( this.updating || this.counterpart && this.counterpart.updating ) {
				return;
			}

			value = get( this.root, this.keypath );

			// Is this a smart array update? If so, it'll update on its
			// own, we shouldn't do anything
			if ( isArray( value ) && value._ractive && value._ractive.setting ) {
				return;
			}

			if ( !isEqual( value, this.value ) ) {
				this.updating = true;
				this.otherInstance.set( this.otherKeypath, value );
				this.value = value;
				this.updating = false;
			}
		},

		teardown: function () {
			unregisterDependant( this );
		}
	};


	return function createComponentBinding ( component, parentInstance, parentKeypath, childKeypath ) {
		var hash, childInstance, bindings, priority, parentToChildBinding, childToParentBinding;

		hash = parentKeypath + '=' + childKeypath;
		bindings = component.bindings;

		if ( bindings[ hash ] ) {
			// TODO does this ever happen?
			return;
		}

		bindings[ hash ] = true;

		childInstance = component.instance;
		priority = component.parentFragment.priority;

		parentToChildBinding = new Binding( parentInstance, parentKeypath, childInstance, childKeypath, priority );
		bindings.push( parentToChildBinding );

		if ( childInstance.twoway ) {
			childToParentBinding = new Binding( childInstance, childKeypath, parentInstance, parentKeypath, 1 );
			bindings.push( childToParentBinding );

			parentToChildBinding.counterpart = childToParentBinding;
			childToParentBinding.counterpart = parentToChildBinding;
		}
	};

});
