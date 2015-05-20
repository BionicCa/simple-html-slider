(function($) {
	/*
	 * simple html slider 
	 * JQuery Plugin
	 * written by sc 18.06.2013
	 */

	$.contentSlider = function(element, options) {
		/*
		 *  private constant Definitions
		 */
		var DIRECTION_LEFT = 0,
			DIRECTION_RIGHT = 1,
			EVENT_TOUCH_NONE = 0,
			EVENT_TOUCH_START = 1,
			EVENT_TOUCH_END = 2,
			MIN_PIXELS_FOR_SLIDE = 25;

		/*
		 *  private variables
		 */
		var _timer = null, 	// holds looping Timeout id
			_slideWidth = 0,
			_dataLength = 0,
			_bCanSlide = false,
			_touchStatus = EVENT_TOUCH_NONE,
			_touchPoint = { eventX: 0.0, eventY: 0.0 },
			$_items = null;

		// To avoid scope issues, use 'base' instead of 'this'
		// to reference this class from internal events and functions.
		var base = this;

		// Access to jQuery and DOM versions of element
		base.$element = $(element);
		base.element = element;

		base.$element.data('content_slider', base);

		base.currentPosition = 0;

		base.init = function() {
			base.options = $.extend({}, $.contentSlider.options, options);

			var $itemContainer = base.$element.find('.' + base.options.itemContainerClass);

			base.currentPosition = base.options.startIndex;

			$_items = $itemContainer.children();

			if ( !$_items || !$_items.length) {
				console.log('no items found!');
				return;
			}

			_dataLength = $_items.length;

			// we have items, initialise html element styles

			// set predefined width
			if (base.options.slideWidth) {
				$itemContainer.css({width: base.options.slideWidth + 'px'});
			}

			_slideWidth = $itemContainer.width();

			// init Events
			window.onresize = function(){
				_slideWidth = $itemContainer.width();
			};

			if (_dataLength !== 1) {
				// set click handler for content slider controls
				base.$element.find(".slide-left").click( function () {
					sliderControl(DIRECTION_LEFT);
				});

				base.$element.find(".slide-right").click( function () {
					sliderControl(DIRECTION_RIGHT);
				});
			}

			if (window.navigator.msPointerEnabled) {
				base.element.addEventListener("MSPointerDown", touchStartEventHandler, false);
				base.element.addEventListener("MSPointerMove", function(e) {
					if ((e.pointerType != e.MSPOINTER_TYPE_TOUCH && e.buttons != 1) || !e.isPrimary) {
						return;
					}
					touchMoveEventHandler(e);
				}, false);
				base.element.addEventListener("MSPointerUp", touchEndEventHandler, false);
			}

			$itemContainer.on('touchstart', function (e) {
				touchStartEventHandler(e);
			});
			$itemContainer.on('touchend touchcancel', function (e) {
				touchEndEventHandler(e);
			});
			$itemContainer.on('touchmove', function (e) {
				touchMoveEventHandler(e);
			});

			$("." + base.options.sliderStatusPanelClass).children().click( function() {
				var idx = parseInt(this.id.replace('slider-bullet', ''));
				if (idx == base.currentPosition) return true;	// if click on the same position do nothing

				_bCanSlide = false;

				base.showPage(idx);
				return true;
			});

			if( base.currentPosition <= 0 ) {
				base.$element.find(".slide-left").css("display", "none");
			}

			base.$element.data('doingAnimation', false);

			lazyLoadItem(getItemAtIndex(base.currentPosition)); // update Lazy Load images

			if ( base.options.showStatusPanel )
				$("." + base.options.sliderStatusPanelClass).fadeIn();

			if ( _dataLength === 1) {
				base.$element.find(".slide-left").css("display","none");
				base.$element.find(".slide-right").css("display","none");
				return;
			}

			_bCanSlide = true; // initialization is done, sliding can start

			// start auto slide when page is loaded
			if (base.options.autoSlide) {
				$(window).load(function(){
					startAutoSlide();
				});
			}
		};

		/*
		 *	Slide Function
		 */
		base.slide = function (direction) {
			if (_dataLength == 1) {
				return;
			}

			var offset = 0, // holds the offset for sliding
				targetElement, // hold html of the target item element we are sliding
				currentElement = null; // holds current item element

			// if slide animation is not done, do nothing
			if (base.$element.data('doingAnimation')) {
				return;
			}

			currentElement = getItemAtIndex(base.currentPosition); // get current Item
			if (direction) {
				offset = _slideWidth; // offset for right sliding
				base.currentPosition++;
			} else {
				offset = -_slideWidth; // offset for left sliding
				base.currentPosition--;
			}

			// we are animating
			base.$element.data('doingAnimation', true);

			$(currentElement).css('z-index', 0).animate({
				left: -offset + 'px'
			}, {
				duration: base.options.slidingSpeed,
				queue: false
			});

			targetElement = getTargetSlideItem(direction);

			if ($(targetElement).css("display") === "none") // make item visible
				$(targetElement).toggle();

			lazyLoadItem(targetElement); // update Lazy Load images

			$(targetElement).css('z-index', 0).css('left', offset + "px").animate({
				left: 0 + 'px'
			}, {
				duration: base.options.slidingSpeed,
				queue: false, // don't queue event, fire event instantly
				complete: function() {
					updateStatusBullets(base.currentPosition);
					base.$element.data('doingAnimation', false); // animating is done

					$(currentElement).css('display', 'none'); // hide not visible item
					if ( _bCanSlide ) {
						_timer = setTimeout(function() {
							if (_bCanSlide)
								base.slide(base.options.direction);
						}, base.options.slideInterval);
					}
				}
			});

			updateControlButtons();
		};

		base.showPage = function(index) {
			var old_contentItem,
				itemContainerElem,
				new_contentItem,
				offset;

			if ( isNaN(index) || index == base.currentPosition )
				return false;

			old_contentItem = getItemAtIndex(base.currentPosition);

			if (index > base.currentPosition ) offset = -_slideWidth; // offset for right sliding
			else offset = _slideWidth; // offset for left sliding

			base.currentPosition = index;

			updateControlButtons();

			itemContainerElem = base.$element.find('.' + base.options.itemContainerClass);

			base.$element.data('doingAnimation', true);

			itemContainerElem.fadeOut( function() {
				try {
					$(old_contentItem).css( {
						"z-index": -1,
						"left": offset + "px"
					});

					new_contentItem = getItemAtIndex(base.currentPosition);

					lazyLoadItem(new_contentItem); // update Lazy Load images

					if ($(new_contentItem).css("display") === "none") // make item visible
						$(new_contentItem).toggle();

					$(new_contentItem).css({
						"z-index": 0,
						"left": 0
					});

					updateStatusBullets(base.currentPosition);

					itemContainerElem.fadeIn();

					$(old_contentItem).css('display', 'none'); // hide not visible item

					base.$element.data('doingAnimation', false);

				} catch(e) {
					console.log('Error: ' + e.message);
				}
			});

			return true;
		};

		/*
		 * Private functions
		 */
		function startAutoSlide () {
			var autoSlide = function() {
				if (_bCanSlide)
					base.slide(base.options.direction);
			};
			_timer = window.setTimeout(autoSlide, base.options.slideInterval);
		}

		// checks for lazyload images
		function lazyLoadItem( item ) {
			var $item = $(item);
			if ( !$item.data("lazyload") )
				return; // items already loaded

			$item.find('img[data-src]').each(function () {
				$(this).attr("src", $(this).data('src'));
			});

			// delete all lazyLoad data
			$item.removeAttr("data-lazyload");
			$item.removeData("lazyload");
		}

		// checks if slider needs to fadeOut left Control button
		function updateControlButtons () {
			if(base.currentPosition == 0 && !base.options.infiniteScrolling){
				base.$element.find(".slide-left").fadeOut();
			} else {
				base.$element.find(".slide-left").fadeIn();
			}

			if(base.currentPosition == _dataLength - 1 && !base.options.infiniteScrolling) {
				base.$element.find(".slide-right").fadeOut();
			} else {
				base.$element.find(".slide-right").fadeIn();
			}
		}

		function updateStatusBullets(index) {
			var sliderStatusIdx = base.$element.find("." + base.options.sliderStatusPanelClass + " span.active").index(); // current index of active bullet

			if (sliderStatusIdx != index) {
				base.$element.find("." + base.options.sliderStatusPanelClass + " span.active").toggleClass('active'); // remove active from old bullet
				base.$element.find("." + base.options.sliderStatusPanelClass + ' span:eq(' + index +')').toggleClass('active'); // add active to the actual bullet
			}
		}

		function sliderControl(direction) {
			_bCanSlide = false;

			if (_timer)
				clearTimeout(_timer);

			base.slide(direction);
		}

		function getItemAtIndex ( index ) {
			if ( index < 0 ) index = 0;
			else if (index > _dataLength - 1) index = 0; //start at first item again

			return $_items.get(index);
		}

		function getTargetSlideItem(direction) {
			if (direction) {
				//to Right
				if ( base.currentPosition == _dataLength ) { // start again at first item
					base.currentPosition = 0;
				}
			} else {
				// to Left
				if (base.currentPosition < 0 ) {
					base.currentPosition = _dataLength - 1; // start again at last item
				}
			}

			return getItemAtIndex(base.currentPosition);
		}

		function touchStartEventHandler(e) {
			var touch = null;
			if (e.originalEvent)
				e = e.originalEvent;

			if (_timer)
				clearTimeout(_timer);
			if (e.targetTouches && e.targetTouches.length > 0)
				touch = e.targetTouches[0];
			if (EVENT_TOUCH_NONE == _touchStatus) {

				_touchStatus = EVENT_TOUCH_START;

				if (touch) {
					_touchPoint.x = touch.clientX;
					_touchPoint.y = touch.clientY;
				} else {
					_touchPoint.x = e.clientX;
					_touchPoint.y = e.clientY;
				}
			}
		}

		function touchEndEventHandler(e) {
			var touchStatus = _touchStatus;

			_touchStatus = EVENT_TOUCH_NONE;

			if (EVENT_TOUCH_END == touchStatus) {
				if(absX >= absY){
					e.preventDefault();

					if ( touchDeltaX > 0.0) {
						sliderControl(DIRECTION_LEFT);
					} else if (touchDeltaX < 0.0) {
						sliderControl(DIRECTION_RIGHT);
					}
				}

				return false;
			}
		}

		function touchMoveEventHandler(e) {
			if (e.originalEvent)
				e = e.originalEvent;

			var touch = null;
			if (e.targetTouches && e.targetTouches.length > 0)
				touch = e.targetTouches[0];

			if (touch) {
				touchDeltaX = touch.clientX - _touchPoint.x;
				touchDeltaY = touch.clientY - _touchPoint.y;
				absX = Math.abs(touchDeltaX);
				absY = Math.abs(touchDeltaY);
			} else {
				touchDeltaX = e.clientX - _touchPoint.x;
				touchDeltaY = e.clientY - _touchPoint.y;
				absX = Math.abs(touchDeltaX);
				absY = Math.abs(touchDeltaY);
			}

			if (EVENT_TOUCH_START == _touchStatus) {

				if (absX >= absY) {
					e.preventDefault();

					if (absX > MIN_PIXELS_FOR_SLIDE) {
						_touchStatus = EVENT_TOUCH_END;
					}
				}
			}
			return true;
		}

		base.init();
	};

	$.contentSlider.options = {
		slideContainerClass: "slider-item-container",
		slideControlsClass: "slider-controller",
		sliderStatusPanelClass: "slider-bullet-panel",
		showStatusPanel: true,
		itemContainerClass: "slider-container",
		startIndex: 0,
		autoSlide: true,
		slideInterval: 3000,
		infiniteScrolling: true,
		direction: 1, // 1 for right, <1 for left
		slideWidth: null,
		slidingSpeed: 300
	};

	$.fn.contentSlider = function(options) {
		return this.each(function() { // Maintain chainability
			var element = $(this);
			if (element.data('content_slider')) return;

			(new $.contentSlider(this, options));
		});
	};

})(jQuery);