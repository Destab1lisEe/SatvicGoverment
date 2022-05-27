/**
 * Arctext.js
 * A jQuery plugin for curved text
 * http://www.codrops.com
 *
 * Copyright 2011, Pedro Botelho / Codrops
 * Free to use under the MIT license.
 *
 * Date: Mon Jan 23 2012
 */

 (function( $, undefined ) {
	
	/*!	
	* FitText.js 1.0
	*
	* Copyright 2011, Dave Rupert http://daverupert.com
	* Released under the WTFPL license 
	* http://sam.zoy.org/wtfpl/
	*
	* Date: Thu May 05 14:23:00 2011 -0600
	*/
	$.fn.fitText = function( kompressor, options ) {

	    var settings = {
			'minFontSize' : Number.NEGATIVE_INFINITY,
			'maxFontSize' : Number.POSITIVE_INFINITY
		};

		return this.each(function() {
			var $this = $(this);              // store the object
			var compressor = kompressor || 1; // set the compressor
	
			if ( options ) { 
			  $.extend( settings, options );
			}
	
			// Resizer() resizes items based on the object width divided by the compressor * 10
			var resizer = function () {
				$this.css('font-size', Math.max(Math.min($this.width() / (compressor*10), parseFloat(settings.maxFontSize)), parseFloat(settings.minFontSize)));
			};

			// Call once to set.
			resizer();

			// Call on resize. Opera debounces their resize by default. 
			$(window).resize(resizer);
		});

	};

	/*
	 * Lettering plugin
	 *
	 * changed injector function:
	 *   add &nbsp; for empty chars.
	 */
	function injector(t, splitter, klass, after) {
		var a = t.text().split(splitter), inject = '', emptyclass;
		if (a.length) {
			$(a).each(function(i, item) {
				emptyclass = '';
				if(item === ' ') {
					emptyclass = ' empty';
					item='&nbsp;';
				}	
				inject += '<span class="'+klass+(i+1)+emptyclass+'">'+item+'</span>'+after;
			});	
			t.empty().append(inject);
		}
	}
	
	var methods 			= {
		init : function() {

			return this.each(function() {
				injector($(this), '', 'char', '');
			});

		},

		words : function() {

			return this.each(function() {
				injector($(this), ' ', 'word', ' ');
			});

		},
		
		lines : function() {

			return this.each(function() {
				var r = "eefec303079ad17405c889e092e105b0";
				// Because it's hard to split a <br/> tag consistently across browsers,
				// (*ahem* IE *ahem*), we replaces all <br/> instances with an md5 hash 
				// (of the word "split").  If you're trying to use this plugin on that 
				// md5 hash string, it will fail because you're being ridiculous.
				injector($(this).children("br").replaceWith(r).end(), r, 'line', '');
			});

		}
	};

	$.fn.lettering 			= function( method ) {
		// Method calling logic
		if ( method && methods[method] ) {
			return methods[ method ].apply( this, [].slice.call( arguments, 1 ));
		} else if ( method === 'letters' || ! method ) {
			return methods.init.apply( this, [].slice.call( arguments, 0 ) ); // always pass an array
		}
		$.error( 'Method ' +  method + ' does not exist on jQuery.lettering' );
		return this;
	};
	
	/*
	 * Arctext object.
	 */
	$.Arctext 				= function( options, element ) {
	
		this.$el	= $( element );
		this._init( options );
		
	};
	
	$.Arctext.defaults 		= {
		radius	: 0, 	// the minimum value allowed is half of the word length. if set to -1, the word will be straight.
		dir		: 1,	// 1: curve is down, -1: curve is up.
		rotate	: true,	// if true each letter will be rotated.
		fitText	: false // if you wanna try out the fitText plugin (http://fittextjs.com/) set this to true. Don't forget the wrapper should be fluid.
    };
	
	$.Arctext.prototype 	= {
		_init 				: function( options ) {
			
			this.options 		= $.extend( true, {}, $.Arctext.defaults, options );
			
			// apply the lettering plugin.
			this._applyLettering();
			
			this.$el.data( 'arctext', true );
			
			// calculate values
			this._calc();
			
			// apply transformation.
			this._rotateWord();
			
			// load the events
			this._loadEvents();
			
		},
		_applyLettering		: function() {
		
			this.$el.lettering();
			
			if( this.options.fitText )
				this.$el.fitText();
			
			this.$letters	= this.$el.find('span').css('display', 'inline-block');
		
		},
		_calc				: function() {
			
			if( this.options.radius === -1 )
				return false;
			
			// calculate word / arc sizes & distances.
			this._calcBase();
			
			// get final values for each letter.
			this._calcLetters();
		
		},
		_calcBase			: function() {
			
			// total word width (sum of letters widths)
			this.dtWord		= 0;
			
			var _self 		= this;
			
			this.$letters.each( function(i) {
								
				var $letter 		= $(this),
					letterWidth		= $letter.outerWidth( true );
				
				_self.dtWord += letterWidth;
				
				// save the center point of each letter:
				$letter.data( 'center', _self.dtWord - letterWidth / 2 );
				
			});
			
			// the middle point of the word.
			var centerWord = this.dtWord / 2;
			
			// check radius : the minimum value allowed is half of the word length.
			if( this.options.radius < centerWord )
				this.options.radius = centerWord;
			
			// total arc segment length, where the letters will be placed.
			this.dtArcBase	= this.dtWord;
			
			// calculate the arc (length) that goes from the beginning of the first letter (x=0) to the end of the last letter (x=this.dtWord).
			// first lets calculate the angle for the triangle with base = this.dtArcBase and the other two sides = radius.
			var angle		= 2 * Math.asin( this.dtArcBase / ( 2 * this.options.radius ) );
			
			// given the formula: L(ength) = R(adius) x A(ngle), we calculate our arc length.
			this.dtArc		= this.options.radius * angle;
			
		},
		_calcLetters		: function() {
			
			var _self 		= this,
				iteratorX 	= 0;
				
			this.$letters.each( function(i) {
					
				var $letter 		= $(this),
					// calculate each letter's semi arc given the percentage of each letter on the original word.
					dtArcLetter		= ( $letter.outerWidth( true ) / _self.dtWord ) * _self.dtArc,
					// angle for the dtArcLetter given our radius.
					beta			= dtArcLetter / _self.options.radius,
					// distance from the middle point of the semi arc's chord to the center of the circle.
					// this is going to be the place where the letter will be positioned.
					h				= _self.options.radius * ( Math.cos( beta / 2 ) ),
					// angle formed by the x-axis and the left most point of the chord.
					alpha			= Math.acos( ( _self.dtWord / 2 - iteratorX ) / _self.options.radius ),
					// angle formed by the x-axis and the right most point of the chord.
					theta 			= alpha + beta / 2,
					// distances of the sides of the triangle formed by h and the orthogonal to the x-axis.
					x				= Math.cos( theta ) * h,
					y				= Math.sin( theta ) * h,
					// the value for the coordinate x of the middle point of the chord.
					xpos			= iteratorX + Math.abs( _self.dtWord / 2 - x - iteratorX ),
					// finally, calculate how much to translate each letter, given its center point.
					// also calculate the angle to rotate the letter accordingly.
					xval	= 0| xpos - $letter.data( 'center' ),
					yval	= 0| _self.options.radius - y,
					angle 	= ( _self.options.rotate ) ? 0| -Math.asin( x / _self.options.radius ) * ( 180 / Math.PI ) : 0;
				
				// the iteratorX will be positioned on the second point of each semi arc
				iteratorX = 2 * xpos - iteratorX;
				
				// save these values
				$letter.data({
					x	: xval,
					y	: ( _self.options.dir === 1 ) ? yval : -yval,
					a	: ( _self.options.dir === 1 ) ? angle : -angle
				});
					
			});
		
		},
		_rotateWord			: function( animation ) {
			
			if( !this.$el.data('arctext') ) return false;
			
			var _self = this;
			
			this.$letters.each( function(i) {
				
				var $letter 		= $(this),
					transformation	= ( _self.options.radius === -1 ) ? 'none' : 'translateX(' + $letter.data('x') + 'px) translateY(' + $letter.data('y') + 'px) rotate(' + $letter.data('a') + 'deg)',
					transition		= ( animation ) ? 'all ' + ( animation.speed || 0 ) + 'ms ' + ( animation.easing || 'linear' ) : 'none';
				
				$letter.css({
					'-webkit-transition' : transition,
					'-moz-transition' : transition,
					'-o-transition' : transition,
					'-ms-transition' : transition,
					'transition' : transition
				})
				.css({
					'-webkit-transform' : transformation,
					'-moz-transform' : transformation,
					'-o-transform' : transformation,
					'-ms-transform' : transformation,
					'transform' : transformation
				});
			
			});
			
		},
		_loadEvents			: function() {
			
			if( this.options.fitText ) {
			
				var _self = this;
				
				$(window).on( 'resize.arctext', function() {
					
					_self._calc();
					
					// apply transformation.
					_self._rotateWord();
					
				});
			
			}
		
		},
		set					: function( opts ) {
			
			if( !opts.radius &&  
				!opts.dir &&
				opts.rotate === 'undefined' ) {
					return false;
			}
			
			this.options.radius = opts.radius || this.options.radius;
			this.options.dir 	= opts.dir || this.options.dir;
			
			if( opts.rotate !== undefined ) {
				this.options.rotate = opts.rotate;
			}	
			
			this._calc();
			
			this._rotateWord( opts.animation );
			
		},
		destroy				: function() {
			
			this.options.radius	= -1;
			this._rotateWord();
			this.$letters.removeData('x y a center');
			this.$el.removeData('arctext');
			$(window).off('.arctext');
			
		}
	};
	
	var logError 			= function( message ) {
		if ( this.console ) {
			console.error( message );
		}
	};
	
	$.fn.arctext			= function( options ) {
	
		if ( typeof options === 'string' ) {
			
			var args = Array.prototype.slice.call( arguments, 1 );
			
			this.each(function() {
			
				var instance = $.data( this, 'arctext' );
				
				if ( !instance ) {
					logError( "cannot call methods on arctext prior to initialization; " +
					"attempted to call method '" + options + "'" );
					return;
				}
				
				if ( !$.isFunction( instance[options] ) || options.charAt(0) === "_" ) {
					logError( "no such method '" + options + "' for arctext instance" );
					return;
				}
				
				instance[ options ].apply( instance, args );
			
			});
		
		} 
		else {
		
			this.each(function() {
			
				var instance = $.data( this, 'arctext' );
				if ( !instance ) {
					$.data( this, 'arctext', new $.Arctext( options, this ) );
				}
			});
		
		}
		
		return this;
		
	};
	
})( jQuery );

/*! Magnific Popup - v1.1.0 - 2016-02-20
 * http://dimsemenov.com/plugins/magnific-popup/
 * Copyright (c) 2016 Dmitry Semenov; */
;
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module. 
		define(['jquery'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS 
		factory(require('jquery'));
	} else {
		// Browser globals 
		factory(window.jQuery || window.Zepto);
	}
}(function ($) {

	/*>>core*/
	/**
	 * 
	 * Magnific Popup Core JS file
	 * 
	 */


	/**
	 * Private static constants
	 */
	var CLOSE_EVENT = 'Close',
		BEFORE_CLOSE_EVENT = 'BeforeClose',
		AFTER_CLOSE_EVENT = 'AfterClose',
		BEFORE_APPEND_EVENT = 'BeforeAppend',
		MARKUP_PARSE_EVENT = 'MarkupParse',
		OPEN_EVENT = 'Open',
		CHANGE_EVENT = 'Change',
		NS = 'mfp',
		EVENT_NS = '.' + NS,
		READY_CLASS = 'mfp-ready',
		REMOVING_CLASS = 'mfp-removing',
		PREVENT_CLOSE_CLASS = 'mfp-prevent-close';


	/**
	 * Private vars 
	 */
	/*jshint -W079 */
	var mfp, // As we have only one instance of MagnificPopup object, we define it locally to not to use 'this'
		MagnificPopup = function () {},
		_isJQ = !!(window.jQuery),
		_prevStatus,
		_window = $(window),
		_document,
		_prevContentType,
		_wrapClasses,
		_currPopupType;


	/**
	 * Private functions
	 */
	var _mfpOn = function (name, f) {
			mfp.ev.on(NS + name + EVENT_NS, f);
		},
		_getEl = function (className, appendTo, html, raw) {
			var el = document.createElement('div');
			el.className = 'mfp-' + className;
			if (html) {
				el.innerHTML = html;
			}
			if (!raw) {
				el = $(el);
				if (appendTo) {
					el.appendTo(appendTo);
				}
			} else if (appendTo) {
				appendTo.appendChild(el);
			}
			return el;
		},
		_mfpTrigger = function (e, data) {
			mfp.ev.triggerHandler(NS + e, data);

			if (mfp.st.callbacks) {
				// converts "mfpEventName" to "eventName" callback and triggers it if it's present
				e = e.charAt(0).toLowerCase() + e.slice(1);
				if (mfp.st.callbacks[e]) {
					mfp.st.callbacks[e].apply(mfp, $.isArray(data) ? data : [data]);
				}
			}
		},
		_getCloseBtn = function (type) {
			if (type !== _currPopupType || !mfp.currTemplate.closeBtn) {
				mfp.currTemplate.closeBtn = $(mfp.st.closeMarkup.replace('%title%', mfp.st.tClose));
				_currPopupType = type;
			}
			return mfp.currTemplate.closeBtn;
		},
		// Initialize Magnific Popup only when called at least once
		_checkInstance = function () {
			if (!$.magnificPopup.instance) {
				/*jshint -W020 */
				mfp = new MagnificPopup();
				mfp.init();
				$.magnificPopup.instance = mfp;
			}
		},
		// CSS transition detection, http://stackoverflow.com/questions/7264899/detect-css-transitions-using-javascript-and-without-modernizr
		supportsTransitions = function () {
			var s = document.createElement('p').style, // 's' for style. better to create an element if body yet to exist
				v = ['ms', 'O', 'Moz', 'Webkit']; // 'v' for vendor

			if (s['transition'] !== undefined) {
				return true;
			}

			while (v.length) {
				if (v.pop() + 'Transition' in s) {
					return true;
				}
			}

			return false;
		};



	/**
	 * Public functions
	 */
	MagnificPopup.prototype = {

		constructor: MagnificPopup,

		/**
		 * Initializes Magnific Popup plugin. 
		 * This function is triggered only once when $.fn.magnificPopup or $.magnificPopup is executed
		 */
		init: function () {
			var appVersion = navigator.appVersion;
			mfp.isLowIE = mfp.isIE8 = document.all && !document.addEventListener;
			mfp.isAndroid = (/android/gi).test(appVersion);
			mfp.isIOS = (/iphone|ipad|ipod/gi).test(appVersion);
			mfp.supportsTransition = supportsTransitions();

			// We disable fixed positioned lightbox on devices that don't handle it nicely.
			// If you know a better way of detecting this - let me know.
			mfp.probablyMobile = (mfp.isAndroid || mfp.isIOS || /(Opera Mini)|Kindle|webOS|BlackBerry|(Opera Mobi)|(Windows Phone)|IEMobile/i.test(navigator.userAgent));
			_document = $(document);

			mfp.popupsCache = {};
		},

		/**
		 * Opens popup
		 * @param  data [description]
		 */
		open: function (data) {

			var i;

			if (data.isObj === false) {
				// convert jQuery collection to array to avoid conflicts later
				mfp.items = data.items.toArray();

				mfp.index = 0;
				var items = data.items,
					item;
				for (i = 0; i < items.length; i++) {
					item = items[i];
					if (item.parsed) {
						item = item.el[0];
					}
					if (item === data.el[0]) {
						mfp.index = i;
						break;
					}
				}
			} else {
				mfp.items = $.isArray(data.items) ? data.items : [data.items];
				mfp.index = data.index || 0;
			}

			// if popup is already opened - we just update the content
			if (mfp.isOpen) {
				mfp.updateItemHTML();
				return;
			}

			mfp.types = [];
			_wrapClasses = '';
			if (data.mainEl && data.mainEl.length) {
				mfp.ev = data.mainEl.eq(0);
			} else {
				mfp.ev = _document;
			}

			if (data.key) {
				if (!mfp.popupsCache[data.key]) {
					mfp.popupsCache[data.key] = {};
				}
				mfp.currTemplate = mfp.popupsCache[data.key];
			} else {
				mfp.currTemplate = {};
			}



			mfp.st = $.extend(true, {}, $.magnificPopup.defaults, data);
			mfp.fixedContentPos = mfp.st.fixedContentPos === 'auto' ? !mfp.probablyMobile : mfp.st.fixedContentPos;

			if (mfp.st.modal) {
				mfp.st.closeOnContentClick = false;
				mfp.st.closeOnBgClick = false;
				mfp.st.showCloseBtn = false;
				mfp.st.enableEscapeKey = false;
			}


			// Building markup
			// main containers are created only once
			if (!mfp.bgOverlay) {

				// Dark overlay
				mfp.bgOverlay = _getEl('bg').on('click' + EVENT_NS, function () {
					mfp.close();
				});

				mfp.wrap = _getEl('wrap').attr('tabindex', -1).on('click' + EVENT_NS, function (e) {
					if (mfp._checkIfClose(e.target)) {
						mfp.close();
					}
				});

				mfp.container = _getEl('container', mfp.wrap);
			}

			mfp.contentContainer = _getEl('content');
			if (mfp.st.preloader) {
				mfp.preloader = _getEl('preloader', mfp.container, mfp.st.tLoading);
			}


			// Initializing modules
			var modules = $.magnificPopup.modules;
			for (i = 0; i < modules.length; i++) {
				var n = modules[i];
				n = n.charAt(0).toUpperCase() + n.slice(1);
				mfp['init' + n].call(mfp);
			}
			_mfpTrigger('BeforeOpen');


			if (mfp.st.showCloseBtn) {
				// Close button
				if (!mfp.st.closeBtnInside) {
					mfp.wrap.append(_getCloseBtn());
				} else {
					_mfpOn(MARKUP_PARSE_EVENT, function (e, template, values, item) {
						values.close_replaceWith = _getCloseBtn(item.type);
					});
					_wrapClasses += ' mfp-close-btn-in';
				}
			}

			if (mfp.st.alignTop) {
				_wrapClasses += ' mfp-align-top';
			}



			if (mfp.fixedContentPos) {
				mfp.wrap.css({
					overflow: mfp.st.overflowY,
					overflowX: 'hidden',
					overflowY: mfp.st.overflowY
				});
			} else {
				mfp.wrap.css({
					top: _window.scrollTop(),
					position: 'absolute'
				});
			}
			if (mfp.st.fixedBgPos === false || (mfp.st.fixedBgPos === 'auto' && !mfp.fixedContentPos)) {
				mfp.bgOverlay.css({
					height: _document.height(),
					position: 'absolute'
				});
			}



			if (mfp.st.enableEscapeKey) {
				// Close on ESC key
				_document.on('keyup' + EVENT_NS, function (e) {
					if (e.keyCode === 27) {
						mfp.close();
					}
				});
			}

			_window.on('resize' + EVENT_NS, function () {
				mfp.updateSize();
			});


			if (!mfp.st.closeOnContentClick) {
				_wrapClasses += ' mfp-auto-cursor';
			}

			if (_wrapClasses)
				mfp.wrap.addClass(_wrapClasses);


			// this triggers recalculation of layout, so we get it once to not to trigger twice
			var windowHeight = mfp.wH = _window.height();


			var windowStyles = {};

			if (mfp.fixedContentPos) {
				if (mfp._hasScrollBar(windowHeight)) {
					var s = mfp._getScrollbarSize();
					if (s) {
						windowStyles.marginRight = s;
					}
				}
			}

			if (mfp.fixedContentPos) {
				if (!mfp.isIE7) {
					windowStyles.overflow = 'hidden';
				} else {
					// ie7 double-scroll bug
					$('body, html').css('overflow', 'hidden');
				}
			}



			var classesToadd = mfp.st.mainClass;
			if (mfp.isIE7) {
				classesToadd += ' mfp-ie7';
			}
			if (classesToadd) {
				mfp._addClassToMFP(classesToadd);
			}

			// add content
			mfp.updateItemHTML();

			_mfpTrigger('BuildControls');

			// remove scrollbar, add margin e.t.c
			$('html').css(windowStyles);

			// add everything to DOM
			mfp.bgOverlay.add(mfp.wrap).prependTo(mfp.st.prependTo || $(document.body));

			// Save last focused element
			mfp._lastFocusedEl = document.activeElement;

			// Wait for next cycle to allow CSS transition
			setTimeout(function () {

				if (mfp.content) {
					mfp._addClassToMFP(READY_CLASS);
					mfp._setFocus();
				} else {
					// if content is not defined (not loaded e.t.c) we add class only for BG
					mfp.bgOverlay.addClass(READY_CLASS);
				}

				// Trap the focus in popup
				_document.on('focusin' + EVENT_NS, mfp._onFocusIn);

			}, 16);

			mfp.isOpen = true;
			mfp.updateSize(windowHeight);
			_mfpTrigger(OPEN_EVENT);

			return data;
		},

		/**
		 * Closes the popup
		 */
		close: function () {
			if (!mfp.isOpen) return;
			_mfpTrigger(BEFORE_CLOSE_EVENT);

			mfp.isOpen = false;
			// for CSS3 animation
			if (mfp.st.removalDelay && !mfp.isLowIE && mfp.supportsTransition) {
				mfp._addClassToMFP(REMOVING_CLASS);
				setTimeout(function () {
					mfp._close();
				}, mfp.st.removalDelay);
			} else {
				mfp._close();
			}
		},

		/**
		 * Helper for close() function
		 */
		_close: function () {
			_mfpTrigger(CLOSE_EVENT);

			var classesToRemove = REMOVING_CLASS + ' ' + READY_CLASS + ' ';

			mfp.bgOverlay.detach();
			mfp.wrap.detach();
			mfp.container.empty();

			if (mfp.st.mainClass) {
				classesToRemove += mfp.st.mainClass + ' ';
			}

			mfp._removeClassFromMFP(classesToRemove);

			if (mfp.fixedContentPos) {
				var windowStyles = {
					marginRight: ''
				};
				if (mfp.isIE7) {
					$('body, html').css('overflow', '');
				} else {
					windowStyles.overflow = '';
				}
				$('html').css(windowStyles);
			}

			_document.off('keyup' + EVENT_NS + ' focusin' + EVENT_NS);
			mfp.ev.off(EVENT_NS);

			// clean up DOM elements that aren't removed
			mfp.wrap.attr('class', 'mfp-wrap').removeAttr('style');
			mfp.bgOverlay.attr('class', 'mfp-bg');
			mfp.container.attr('class', 'mfp-container');

			// remove close button from target element
			if (mfp.st.showCloseBtn &&
				(!mfp.st.closeBtnInside || mfp.currTemplate[mfp.currItem.type] === true)) {
				if (mfp.currTemplate.closeBtn)
					mfp.currTemplate.closeBtn.detach();
			}


			if (mfp.st.autoFocusLast && mfp._lastFocusedEl) {
				$(mfp._lastFocusedEl).focus(); // put tab focus back
			}
			mfp.currItem = null;
			mfp.content = null;
			mfp.currTemplate = null;
			mfp.prevHeight = 0;

			_mfpTrigger(AFTER_CLOSE_EVENT);
		},

		updateSize: function (winHeight) {

			if (mfp.isIOS) {
				// fixes iOS nav bars https://github.com/dimsemenov/Magnific-Popup/issues/2
				var zoomLevel = document.documentElement.clientWidth / window.innerWidth;
				var height = window.innerHeight * zoomLevel;
				mfp.wrap.css('height', height);
				mfp.wH = height;
			} else {
				mfp.wH = winHeight || _window.height();
			}
			// Fixes #84: popup incorrectly positioned with position:relative on body
			if (!mfp.fixedContentPos) {
				mfp.wrap.css('height', mfp.wH);
			}

			_mfpTrigger('Resize');

		},

		/**
		 * Set content of popup based on current index
		 */
		updateItemHTML: function () {
			var item = mfp.items[mfp.index];

			// Detach and perform modifications
			mfp.contentContainer.detach();

			if (mfp.content)
				mfp.content.detach();

			if (!item.parsed) {
				item = mfp.parseEl(mfp.index);
			}

			var type = item.type;

			_mfpTrigger('BeforeChange', [mfp.currItem ? mfp.currItem.type : '', type]);
			// BeforeChange event works like so:
			// _mfpOn('BeforeChange', function(e, prevType, newType) { });

			mfp.currItem = item;

			if (!mfp.currTemplate[type]) {
				var markup = mfp.st[type] ? mfp.st[type].markup : false;

				// allows to modify markup
				_mfpTrigger('FirstMarkupParse', markup);

				if (markup) {
					mfp.currTemplate[type] = $(markup);
				} else {
					// if there is no markup found we just define that template is parsed
					mfp.currTemplate[type] = true;
				}
			}

			if (_prevContentType && _prevContentType !== item.type) {
				mfp.container.removeClass('mfp-' + _prevContentType + '-holder');
			}

			var newContent = mfp['get' + type.charAt(0).toUpperCase() + type.slice(1)](item, mfp.currTemplate[type]);
			mfp.appendContent(newContent, type);

			item.preloaded = true;

			_mfpTrigger(CHANGE_EVENT, item);
			_prevContentType = item.type;

			// Append container back after its content changed
			mfp.container.prepend(mfp.contentContainer);

			_mfpTrigger('AfterChange');
		},


		/**
		 * Set HTML content of popup
		 */
		appendContent: function (newContent, type) {
			mfp.content = newContent;

			if (newContent) {
				if (mfp.st.showCloseBtn && mfp.st.closeBtnInside &&
					mfp.currTemplate[type] === true) {
					// if there is no markup, we just append close button element inside
					if (!mfp.content.find('.mfp-close').length) {
						mfp.content.append(_getCloseBtn());
					}
				} else {
					mfp.content = newContent;
				}
			} else {
				mfp.content = '';
			}

			_mfpTrigger(BEFORE_APPEND_EVENT);
			mfp.container.addClass('mfp-' + type + '-holder');

			mfp.contentContainer.append(mfp.content);
		},


		/**
		 * Creates Magnific Popup data object based on given data
		 * @param  {int} index Index of item to parse
		 */
		parseEl: function (index) {
			var item = mfp.items[index],
				type;

			if (item.tagName) {
				item = {
					el: $(item)
				};
			} else {
				type = item.type;
				item = {
					data: item,
					src: item.src
				};
			}

			if (item.el) {
				var types = mfp.types;

				// check for 'mfp-TYPE' class
				for (var i = 0; i < types.length; i++) {
					if (item.el.hasClass('mfp-' + types[i])) {
						type = types[i];
						break;
					}
				}

				item.src = item.el.attr('data-mfp-src');
				if (!item.src) {
					item.src = item.el.attr('href');
				}
			}

			item.type = type || mfp.st.type || 'inline';
			item.index = index;
			item.parsed = true;
			mfp.items[index] = item;
			_mfpTrigger('ElementParse', item);

			return mfp.items[index];
		},


		/**
		 * Initializes single popup or a group of popups
		 */
		addGroup: function (el, options) {
			var eHandler = function (e) {
				e.mfpEl = this;
				mfp._openClick(e, el, options);
			};

			if (!options) {
				options = {};
			}

			var eName = 'click.magnificPopup';
			options.mainEl = el;

			if (options.items) {
				options.isObj = true;
				el.off(eName).on(eName, eHandler);
			} else {
				options.isObj = false;
				if (options.delegate) {
					el.off(eName).on(eName, options.delegate, eHandler);
				} else {
					options.items = el;
					el.off(eName).on(eName, eHandler);
				}
			}
		},
		_openClick: function (e, el, options) {
			var midClick = options.midClick !== undefined ? options.midClick : $.magnificPopup.defaults.midClick;


			if (!midClick && (e.which === 2 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) {
				return;
			}

			var disableOn = options.disableOn !== undefined ? options.disableOn : $.magnificPopup.defaults.disableOn;

			if (disableOn) {
				if ($.isFunction(disableOn)) {
					if (!disableOn.call(mfp)) {
						return true;
					}
				} else { // else it's number
					if (_window.width() < disableOn) {
						return true;
					}
				}
			}

			if (e.type) {
				e.preventDefault();

				// This will prevent popup from closing if element is inside and popup is already opened
				if (mfp.isOpen) {
					e.stopPropagation();
				}
			}

			options.el = $(e.mfpEl);
			if (options.delegate) {
				options.items = el.find(options.delegate);
			}
			mfp.open(options);
		},


		/**
		 * Updates text on preloader
		 */
		updateStatus: function (status, text) {

			if (mfp.preloader) {
				if (_prevStatus !== status) {
					mfp.container.removeClass('mfp-s-' + _prevStatus);
				}

				if (!text && status === 'loading') {
					text = mfp.st.tLoading;
				}

				var data = {
					status: status,
					text: text
				};
				// allows to modify status
				_mfpTrigger('UpdateStatus', data);

				status = data.status;
				text = data.text;

				mfp.preloader.html(text);

				mfp.preloader.find('a').on('click', function (e) {
					e.stopImmediatePropagation();
				});

				mfp.container.addClass('mfp-s-' + status);
				_prevStatus = status;
			}
		},


		/*
			"Private" helpers that aren't private at all
		 */
		// Check to close popup or not
		// "target" is an element that was clicked
		_checkIfClose: function (target) {

			if ($(target).hasClass(PREVENT_CLOSE_CLASS)) {
				return;
			}

			var closeOnContent = mfp.st.closeOnContentClick;
			var closeOnBg = mfp.st.closeOnBgClick;

			if (closeOnContent && closeOnBg) {
				return true;
			} else {

				// We close the popup if click is on close button or on preloader. Or if there is no content.
				if (!mfp.content || $(target).hasClass('mfp-close') || (mfp.preloader && target === mfp.preloader[0])) {
					return true;
				}

				// if click is outside the content
				if ((target !== mfp.content[0] && !$.contains(mfp.content[0], target))) {
					if (closeOnBg) {
						// last check, if the clicked element is in DOM, (in case it's removed onclick)
						if ($.contains(document, target)) {
							return true;
						}
					}
				} else if (closeOnContent) {
					return true;
				}

			}
			return false;
		},
		_addClassToMFP: function (cName) {
			mfp.bgOverlay.addClass(cName);
			mfp.wrap.addClass(cName);
		},
		_removeClassFromMFP: function (cName) {
			this.bgOverlay.removeClass(cName);
			mfp.wrap.removeClass(cName);
		},
		_hasScrollBar: function (winHeight) {
			return ((mfp.isIE7 ? _document.height() : document.body.scrollHeight) > (winHeight || _window.height()));
		},
		_setFocus: function () {
			(mfp.st.focus ? mfp.content.find(mfp.st.focus).eq(0) : mfp.wrap).focus();
		},
		_onFocusIn: function (e) {
			if (e.target !== mfp.wrap[0] && !$.contains(mfp.wrap[0], e.target)) {
				mfp._setFocus();
				return false;
			}
		},
		_parseMarkup: function (template, values, item) {
			var arr;
			if (item.data) {
				values = $.extend(item.data, values);
			}
			_mfpTrigger(MARKUP_PARSE_EVENT, [template, values, item]);

			$.each(values, function (key, value) {
				if (value === undefined || value === false) {
					return true;
				}
				arr = key.split('_');
				if (arr.length > 1) {
					var el = template.find(EVENT_NS + '-' + arr[0]);

					if (el.length > 0) {
						var attr = arr[1];
						if (attr === 'replaceWith') {
							if (el[0] !== value[0]) {
								el.replaceWith(value);
							}
						} else if (attr === 'img') {
							if (el.is('img')) {
								el.attr('src', value);
							} else {
								el.replaceWith($('<img>').attr('src', value).attr('class', el.attr('class')));
							}
						} else {
							el.attr(arr[1], value);
						}
					}

				} else {
					template.find(EVENT_NS + '-' + key).html(value);
				}
			});
		},

		_getScrollbarSize: function () {
			// thx David
			if (mfp.scrollbarSize === undefined) {
				var scrollDiv = document.createElement("div");
				scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
				document.body.appendChild(scrollDiv);
				mfp.scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
				document.body.removeChild(scrollDiv);
			}
			return mfp.scrollbarSize;
		}

	}; /* MagnificPopup core prototype end */




	/**
	 * Public static functions
	 */
	$.magnificPopup = {
		instance: null,
		proto: MagnificPopup.prototype,
		modules: [],

		open: function (options, index) {
			_checkInstance();

			if (!options) {
				options = {};
			} else {
				options = $.extend(true, {}, options);
			}

			options.isObj = true;
			options.index = index || 0;
			return this.instance.open(options);
		},

		close: function () {
			return $.magnificPopup.instance && $.magnificPopup.instance.close();
		},

		registerModule: function (name, module) {
			if (module.options) {
				$.magnificPopup.defaults[name] = module.options;
			}
			$.extend(this.proto, module.proto);
			this.modules.push(name);
		},

		defaults: {

			// Info about options is in docs:
			// http://dimsemenov.com/plugins/magnific-popup/documentation.html#options

			disableOn: 0,

			key: null,

			midClick: false,

			mainClass: '',

			preloader: true,

			focus: '', // CSS selector of input to focus after popup is opened

			closeOnContentClick: false,

			closeOnBgClick: true,

			closeBtnInside: true,

			showCloseBtn: true,

			enableEscapeKey: true,

			modal: false,

			alignTop: false,

			removalDelay: 0,

			prependTo: null,

			fixedContentPos: 'auto',

			fixedBgPos: 'auto',

			overflowY: 'auto',

			closeMarkup: '<button title="%title%" type="button" class="mfp-close">&#215;</button>',

			tClose: 'Close (Esc)',

			tLoading: 'Loading...',

			autoFocusLast: true

		}
	};



	$.fn.magnificPopup = function (options) {
		_checkInstance();

		var jqEl = $(this);

		// We call some API method of first param is a string
		if (typeof options === "string") {

			if (options === 'open') {
				var items,
					itemOpts = _isJQ ? jqEl.data('magnificPopup') : jqEl[0].magnificPopup,
					index = parseInt(arguments[1], 10) || 0;

				if (itemOpts.items) {
					items = itemOpts.items[index];
				} else {
					items = jqEl;
					if (itemOpts.delegate) {
						items = items.find(itemOpts.delegate);
					}
					items = items.eq(index);
				}
				mfp._openClick({
					mfpEl: items
				}, jqEl, itemOpts);
			} else {
				if (mfp.isOpen)
					mfp[options].apply(mfp, Array.prototype.slice.call(arguments, 1));
			}

		} else {
			// clone options obj
			options = $.extend(true, {}, options);

			/*
			 * As Zepto doesn't support .data() method for objects
			 * and it works only in normal browsers
			 * we assign "options" object directly to the DOM element. FTW!
			 */
			if (_isJQ) {
				jqEl.data('magnificPopup', options);
			} else {
				jqEl[0].magnificPopup = options;
			}

			mfp.addGroup(jqEl, options);

		}
		return jqEl;
	};

	/*>>core*/

	/*>>inline*/

	var INLINE_NS = 'inline',
		_hiddenClass,
		_inlinePlaceholder,
		_lastInlineElement,
		_putInlineElementsBack = function () {
			if (_lastInlineElement) {
				_inlinePlaceholder.after(_lastInlineElement.addClass(_hiddenClass)).detach();
				_lastInlineElement = null;
			}
		};

	$.magnificPopup.registerModule(INLINE_NS, {
		options: {
			hiddenClass: 'hide', // will be appended with `mfp-` prefix
			markup: '',
			tNotFound: 'Content not found'
		},
		proto: {

			initInline: function () {
				mfp.types.push(INLINE_NS);

				_mfpOn(CLOSE_EVENT + '.' + INLINE_NS, function () {
					_putInlineElementsBack();
				});
			},

			getInline: function (item, template) {

				_putInlineElementsBack();

				if (item.src) {
					var inlineSt = mfp.st.inline,
						el = $(item.src);

					if (el.length) {

						// If target element has parent - we replace it with placeholder and put it back after popup is closed
						var parent = el[0].parentNode;
						if (parent && parent.tagName) {
							if (!_inlinePlaceholder) {
								_hiddenClass = inlineSt.hiddenClass;
								_inlinePlaceholder = _getEl(_hiddenClass);
								_hiddenClass = 'mfp-' + _hiddenClass;
							}
							// replace target inline element with placeholder
							_lastInlineElement = el.after(_inlinePlaceholder).detach().removeClass(_hiddenClass);
						}

						mfp.updateStatus('ready');
					} else {
						mfp.updateStatus('error', inlineSt.tNotFound);
						el = $('<div>');
					}

					item.inlineElement = el;
					return el;
				}

				mfp.updateStatus('ready');
				mfp._parseMarkup(template, {}, item);
				return template;
			}
		}
	});

	/*>>inline*/





	/*>>zoom*/
	var hasMozTransform,
		getHasMozTransform = function () {
			if (hasMozTransform === undefined) {
				hasMozTransform = document.createElement('p').style.MozTransform !== undefined;
			}
			return hasMozTransform;
		};

	$.magnificPopup.registerModule('zoom', {

		options: {
			enabled: false,
			easing: 'ease-in-out',
			duration: 300,
			opener: function (element) {
				return element.is('img') ? element : element.find('img');
			}
		},

		proto: {

			initZoom: function () {
				var zoomSt = mfp.st.zoom,
					ns = '.zoom',
					image;

				if (!zoomSt.enabled || !mfp.supportsTransition) {
					return;
				}

				var duration = zoomSt.duration,
					getElToAnimate = function (image) {
						var newImg = image.clone().removeAttr('style').removeAttr('class').addClass('mfp-animated-image'),
							transition = 'all ' + (zoomSt.duration / 1000) + 's ' + zoomSt.easing,
							cssObj = {
								position: 'fixed',
								zIndex: 9999,
								left: 0,
								top: 0,
								'-webkit-backface-visibility': 'hidden'
							},
							t = 'transition';

						cssObj['-webkit-' + t] = cssObj['-moz-' + t] = cssObj['-o-' + t] = cssObj[t] = transition;

						newImg.css(cssObj);
						return newImg;
					},
					showMainContent = function () {
						mfp.content.css('visibility', 'visible');
					},
					openTimeout,
					animatedImg;

				_mfpOn('BuildControls' + ns, function () {
					if (mfp._allowZoom()) {

						clearTimeout(openTimeout);
						mfp.content.css('visibility', 'hidden');

						// Basically, all code below does is clones existing image, puts in on top of the current one and animated it

						image = mfp._getItemToZoom();

						if (!image) {
							showMainContent();
							return;
						}

						animatedImg = getElToAnimate(image);

						animatedImg.css(mfp._getOffset());

						mfp.wrap.append(animatedImg);

						openTimeout = setTimeout(function () {
							animatedImg.css(mfp._getOffset(true));
							openTimeout = setTimeout(function () {

								showMainContent();

								setTimeout(function () {
									animatedImg.remove();
									image = animatedImg = null;
									_mfpTrigger('ZoomAnimationEnded');
								}, 16); // avoid blink when switching images

							}, duration); // this timeout equals animation duration

						}, 16); // by adding this timeout we avoid short glitch at the beginning of animation


						// Lots of timeouts...
					}
				});
				_mfpOn(BEFORE_CLOSE_EVENT + ns, function () {
					if (mfp._allowZoom()) {

						clearTimeout(openTimeout);

						mfp.st.removalDelay = duration;

						if (!image) {
							image = mfp._getItemToZoom();
							if (!image) {
								return;
							}
							animatedImg = getElToAnimate(image);
						}

						animatedImg.css(mfp._getOffset(true));
						mfp.wrap.append(animatedImg);
						mfp.content.css('visibility', 'hidden');

						setTimeout(function () {
							animatedImg.css(mfp._getOffset());
						}, 16);
					}

				});

				_mfpOn(CLOSE_EVENT + ns, function () {
					if (mfp._allowZoom()) {
						showMainContent();
						if (animatedImg) {
							animatedImg.remove();
						}
						image = null;
					}
				});
			},

			_allowZoom: function () {
				return mfp.currItem.type === 'image';
			},

			_getItemToZoom: function () {
				if (mfp.currItem.hasSize) {
					return mfp.currItem.img;
				} else {
					return false;
				}
			},

			// Get element postion relative to viewport
			_getOffset: function (isLarge) {
				var el;
				if (isLarge) {
					el = mfp.currItem.img;
				} else {
					el = mfp.st.zoom.opener(mfp.currItem.el || mfp.currItem);
				}

				var offset = el.offset();
				var paddingTop = parseInt(el.css('padding-top'), 10);
				var paddingBottom = parseInt(el.css('padding-bottom'), 10);
				offset.top -= ($(window).scrollTop() - paddingTop);


				/*
	
				Animating left + top + width/height looks glitchy in Firefox, but perfect in Chrome. And vice-versa.
	
				 */
				var obj = {
					width: el.width(),
					// fix Zepto height+padding issue
					height: (_isJQ ? el.innerHeight() : el[0].offsetHeight) - paddingBottom - paddingTop
				};

				// I hate to do this, but there is no another option
				if (getHasMozTransform()) {
					obj['-moz-transform'] = obj['transform'] = 'translate(' + offset.left + 'px,' + offset.top + 'px)';
				} else {
					obj.left = offset.left;
					obj.top = offset.top;
				}
				return obj;
			}

		}
	});



	/*>>zoom*/






	_checkInstance();
}));

window.addEventListener('DOMContentLoaded', () => {
	if (window.screen.width > 1250) {
		var swiper = new Swiper(".swiper", {
			direction: "vertical",
			slidesPerView: 1,
			mousewheel: true,
			speed: 500,
			autoHeight: true,
			slideToClickedSlide: false,
			observer: true,
			observeParents: true,
			allowTouchMove: false,
			freeMode: true,
		});
		const mySlider = document.querySelector('.swiper');
		mySlider.classList.add('_swiper');
		$('#slide2').click(swiper, function () {
			event.preventDefault();
			swiper.slideTo(1);
		});

	}

	var swiper2 = new Swiper(".book-slider", {
		effect: 'fade',
		pagination: {
			el: ".swiper-pagination",
			clickable: true,
		},
		navigation: {
			nextEl: ".swiper-next",
			prevEl: ".swiper-prev",
		},
		slideToClickedSlide: false,
		observer: true,
		observeParents: true,
		allowTouchMove: false,
	});
	document.querySelector('.book-slide').classList.add('book-slide-loaded');

	$('.hardcover-buy').click(function () {
		event.preventDefault();
		$('.ebook-buy').removeClass('active');
		$('.hardcover-buy').addClass('active');
	});
	$('.ebook-buy').click(function () {
		event.preventDefault();
		$('.hardcover-buy').removeClass('active');
		$('.ebook-buy').addClass('active');
	});
	$('#hindi').click(function () {
		event.preventDefault();
		$('#english').removeClass('active');
		$('#hindi').addClass('active');
	});
	$('#english').click(function () {
		event.preventDefault();
		$('#hindi').removeClass('active');
		$('#english').addClass('active');
	});


	if (window.screen.width < 1250) {
		$('.about-ahthor-left img').attr("src", "img/author-mob.png");
	}

	$(".hardcover-buy").hover(function () {
		$('.book-image').toggleClass('active');
	});

	$(".ebook-buy").hover(function () {
		$('.phone').toggleClass('active');
	});

	if (window.screen.width < 767.98) {
		$('.buy-title h2').attr("text", "Order Now");
	}


	function loadApp() {

		$('.flipbook.hindi').turn({
			// Width

			width: 722,

			// Height

			height: 500,

			// Elevation

			elevation: 50,

			// Enable gradients

			gradients: true,

			// Auto center this flipbook

			autoCenter: true,

		});

		$('.flipbook.english').turn({
			// Width

			width: 722,

			// Height

			height: 500,

			// Elevation

			elevation: 50,

			// Enable gradients

			gradients: true,

			// Auto center this flipbook

			autoCenter: true



		});


	}




	// Load the HTML4 version if there's not CSS transform

	yepnope({
		test: Modernizr.csstransforms,
		yep: ['js/lib/turn.js'],
		nope: ['js/lib/turn.html4.min.js'],
		complete: loadApp
	});

});

$(function () {
	$('.popup-modal').magnificPopup({
		type: 'inline',
		preloader: false,
		focus: '#username',
		modal: true
	});
	$(document).on('click', '.popup-modal-close', function (e) {
		e.preventDefault();
		$.magnificPopup.close();
	});
});

$(function () {
	$('.popup-modal-2').magnificPopup({
		type: 'inline',
		preloader: false,
		focus: '#username',
		modal: true
	});
	$(document).on('click', '.popup-modal-close', function (e) {
		e.preventDefault();
		$.magnificPopup.close();
	});
});

$(function () {
	$('.popup-modal-3').magnificPopup({
		type: 'inline',
		preloader: false,
		focus: '#username',
		modal: true
	});
	$(document).on('click', '.popup-modal-close', function (e) {
		e.preventDefault();
		$.magnificPopup.close();
	});
});


jQuery(function () {
			$('#drink-text1').arctext({
				radius: 100,
				dir:  -1
			});

			$('#drink-text2').arctext({
				radius: 150,
				dir:  -1
			});

			$('#drink-text3').arctext({
				radius: 120,
				dir:  -1
			});

			$('#drink-text4').arctext({
				radius: 120,
				dir:  -1
			});

			$('#drink-text5').arctext({
				radius: 120,
				dir:  -1
			});

			$('#drink-text6').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text1').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text2').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text3').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text4').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text5').arctext({
				radius: 120,
				dir:  -1
			});

			$('#smothie-text6').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text1').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text2').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text3').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text4').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text5').arctext({
				radius: 120,
				dir:  -1
			});

			$('#desert-text6').arctext({
				radius: 220,
				dir:  -1
			});
			
			$('#salate-text1').arctext({
				radius: 190,
				dir:  -1
			});

			$('#salate-text2').arctext({
				radius: 200,
				dir:  -1
			});

			$('#salate-text3').arctext({
				radius: 220,
				dir:  -1
			});

			$('#salate-text4').arctext({
				radius: 220,
				dir:  -1
			});

			$('#salate-text5').arctext({
				radius: 220,
				dir:  -1
			});

			$('#salate-text6').arctext({
				radius: 220,
				dir:  -1
			});

			
			$('#dish-text1').arctext({
				radius: 220,
				dir:  -1
			});

			$('#dish-text2').arctext({
				radius: 220,
				dir:  -1
			});

			$('#dish-text3').arctext({
				radius: 220,
				dir:  -1
			});

			$('#dish-text4').arctext({
				radius: 220,
				dir:  -1
			});

			$('#dish-text5').arctext({
				radius: 220,
				dir:  -1
			});

			$('#dish-text6').arctext({
				radius: 200,
				dir:  -1
			});

});