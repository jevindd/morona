(function () {
   'use strict';

   if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
   }
   window.scrollTo(0, 0);

   var Utils = (function () {
      var refreshTimer = null;

      function requestRefresh(delay) {
         if (typeof ScrollTrigger === 'undefined') return;
         clearTimeout(refreshTimer);
         refreshTimer = setTimeout(function () {
            ScrollTrigger.refresh();
         }, delay || 50);
      }

      function waitForImages(container) {
         var imgs = Array.prototype.slice.call(container.querySelectorAll('img'));
         var pending = imgs.filter(function (img) { return !img.complete; });
         if (!pending.length) return Promise.resolve();
         return Promise.all(pending.map(function (img) {
            return new Promise(function (resolve) {
               img.addEventListener('load', resolve, { once: true });
               img.addEventListener('error', resolve, { once: true });
            });
         }));
      }

      function splitHeadingWords(heading, step) {
         if (!heading || heading.dataset.split === 'true') return;
         step = step || 0.09;
         var originalHTML = heading.innerHTML.trim();
         var lines = originalHTML.split(/<br\s*\/?>/i);
         var newHTML = lines.map(function (line) {
            var words = line.trim().split(/\s+/).filter(Boolean);
            return words.map(function (word, i) {
               return '<span class="word" style="--word-delay:' + (i * step).toFixed(3) + 's">' + word + '</span>';
            }).join(' ');
         }).join('<br>');
         heading.innerHTML = newHTML;
         heading.dataset.split = 'true';
      }

      function isInViewport(el) {
         var rect = el.getBoundingClientRect();
         return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
      }

      function revealOnce(section, callback, threshold) {
         if (!section) return;
         if (isInViewport(section)) {
            setTimeout(callback, 100);
            return;
         }
         if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
               entries.forEach(function (entry) {
                  if (entry.isIntersecting) {
                     callback();
                     observer.unobserve(section);
                  }
               });
            }, { threshold: threshold || 0.1 });
            observer.observe(section);
         } else {
            callback();
         }
      }

      var REFERENCE_VH = 900;
      function responsiveEnd(px) {
         var ratio = window.innerHeight / REFERENCE_VH;
         ratio = Math.min(Math.max(ratio, 0.75), 1.35);
         return '+=' + Math.round(px * ratio);
      }

      return {
         requestRefresh: requestRefresh,
         waitForImages: waitForImages,
         splitHeadingWords: splitHeadingWords,
         isInViewport: isInViewport,
         revealOnce: revealOnce,
         responsiveEnd: responsiveEnd
      };
   })();

   /* ======================================================================
      HEADER STICKY + MENU TOGGLE (jQuery, unchanged)
      ====================================================================== */
   jQuery(document).ready(function ($) {

      var $header = $('header');
      var stickyPoint = 150;
      var lastScrollTop = 0;
      var scrollDelta = 10;

      $header.addClass('header-visible');

      $(window).on('scroll', function () {
         var scrollTop = $(this).scrollTop();

         if (scrollTop > stickyPoint) {
            $header.addClass('is-sticky');
         } else {
            $header.removeClass('is-sticky');
         }

         if (Math.abs(scrollTop - lastScrollTop) > scrollDelta) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
               $header.addClass('header-hidden').removeClass('header-visible');
            } else {
               $header.removeClass('header-hidden').addClass('header-visible');
            }
         }

         lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
      });

      $('.menu-toggler').click(function () {
         $('body').toggleClass('menu-open');
      });

   });

   /* ======================================================================
      SMOOTH SCROLL (Lenis) — Desktop only
      ====================================================================== */
   function initLenis() {
      window.scrollTo(0, 0);

      var isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

      if (typeof Lenis !== 'undefined' && !isTouchDevice) {

         var lenis = new Lenis({
            duration: 1.2,
            easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 1.5
         });

         window.lenis = lenis;

         lenis.on('scroll', ScrollTrigger.update);

         gsap.ticker.add(function (time) {
            lenis.raf(time * 1000);
         });

         gsap.ticker.lagSmoothing(0);

         lenis.scrollTo(0, { immediate: true });

      } else {
         ScrollTrigger.config({ ignoreMobileResize: true });
      }
   }

   /* ======================================================================
      PAGE LOADER
      ====================================================================== */
   function initPageLoader() {

      var preloader = document.querySelector('#preloader');
      var loaderBg = document.querySelector('.loader-bg');
      var words = document.querySelectorAll('.loader-word');
      var counter = document.querySelector('.loader-counter');
      var index = document.querySelector('.loader-index');

      if (!preloader) return;

      words.forEach(function (word) {
         var text = word.textContent.trim();
         word.innerHTML = '';
         [...text].forEach(function (char) {
            var wrapper = document.createElement('span');
            wrapper.className = 'letter-wrapper';
            var letter = document.createElement('span');
            letter.className = 'letter';
            letter.textContent = char;
            wrapper.appendChild(letter);
            word.appendChild(wrapper);
         });
      });

      gsap.set(counter, { opacity: 0 });
      gsap.set('.hero-title-line span', { y: '120%' });
      gsap.set('.hero-p', { opacity: 0, y: 40 });
      gsap.set('.hero-img img', { opacity: 0, x: 120, scale: 1.08 });
      gsap.set('.waitlist-images img', { opacity: 0, x: -20, scale: 0.8 });
      gsap.set('.total-join', { opacity: 0, x: 20 });

      var tl = gsap.timeline({
         onComplete: function () {
            document.body.style.overflow = 'auto';
            preloader.remove();
            heroReveal();
            Utils.requestRefresh(0);
         }
      });

      tl.to(loaderBg, { scaleY: .38, duration: .6, ease: 'expo.out' });
      tl.to(loaderBg, { scaleY: 1, duration: 8.5, ease: 'power1.inOut' }, '<+=0.6');
      tl.to(counter, { opacity: 1, duration: .4 }, '<');

      var delay = .75;

      words.forEach(function (word, i) {
         var letters = word.querySelectorAll('.letter');
         var start = delay + i * 2.2;
         var last = i === words.length - 1;

         tl.call(function () { index.textContent = '00' + (i + 1); }, null, start);
         tl.set(word, { autoAlpha: 1 }, start);
         tl.to(letters, { y: '0%', duration: 1.2, stagger: .05, ease: 'expo.out' }, start);

         if (!last) {
            tl.to(letters, { y: '-110%', duration: .8, stagger: .03, ease: 'expo.in' }, start + 1.3);
            tl.set(word, { autoAlpha: 0 }, start + 2.2);
         } else {
            tl.to(letters, { y: '-110%', duration: .9, stagger: .04, ease: 'expo.in' }, start + 1.4);
            tl.to(counter, { opacity: 0, duration: .5 }, '<');
            tl.to(preloader, { opacity: 0, duration: 1, ease: 'power2.inOut' }, '-=.3');
         }
      });

      function heroReveal() {
         gsap.timeline()
            .to('.hero-title-line span', { y: '0%', duration: 1.3, stagger: .15, ease: 'expo.out' })
            .to('.hero-p', { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=.8')
            .to('.waitlist-images img', { opacity: 1, x: 0, scale: 1, duration: .5, stagger: .12, ease: 'back.out(1.7)' }, '-=.5')
            .to('.total-join', { opacity: 1, x: 0, duration: .6, ease: 'power3.out' }, '-=.15')
            .to('.hero-img img', { opacity: 1, x: 0, scale: 1, duration: 1.5, ease: 'expo.out' }, '-=.9');
      }
   }

   window.MoronaUtils = Utils;
   window.__initLenis = initLenis;
   window.__initPageLoader = initPageLoader;

})();

/* ==========================================================================
   HERO + FULL WIDTH TEXT-FILL SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function init() {

      var heroSection = document.querySelector('.hero-section');
      var wrapperSec = document.querySelector('.full-width-text-sec-main');

      if (!wrapperSec) return;

      var mainSection = wrapperSec.querySelector('.full-width-text-sec');
      var title = document.querySelector('#f_title');
      var logo = document.querySelector('#f_logo');
      var fillText = mainSection ? mainSection.querySelector('.full-text h2.h1') : null;

      if (!mainSection || !title || !logo || !fillText) {
         console.warn('Element missing:', { mainSection: mainSection, title: title, logo: logo, fillText: fillText });
         return;
      }

      gsap.set(logo, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%' });
      gsap.set(title, { autoAlpha: 0, scale: 0.92, transformOrigin: '50% 50%' });
      gsap.set(logo, { autoAlpha: 0, scale: 0.92, xPercent: -50, yPercent: -50 });

      /* Character fill uses a fixed white ink.
         The background of this section is intentionally never changed. */
      var DIM_PCT = 16;
      var fillChars = [];

      function ink(pct) {
         return pct >= 99.5
            ? '#ffffff'
            : 'color-mix(in srgb, #ffffff ' + pct.toFixed(1) + '%, transparent)';
      }

      var DIM_INK = ink(DIM_PCT);

      function dimAllChars() {
         for (var i = 0; i < fillChars.length; i++) {
            fillChars[i].style.color = DIM_INK;
         }
      }

      if (typeof SplitText !== 'undefined') {
         SplitText.create(fillText, {
            type: 'words, chars',
            autoSplit: true,
            onSplit: function (self) {
               fillChars = self.chars;
               dimAllChars();
            }
         });
      }

      function setFillProgress(p) {
         var total = fillChars.length;
         if (!total) return;
         var exact = p * total;
         for (var i = 0; i < total; i++) {
            // 0 -> fully dim, 1 -> fully filled, in between -> partial alpha.
            var t = Math.min(Math.max(exact - i, 0), 1);
            fillChars[i].style.color = t <= 0 ? DIM_INK : ink(DIM_PCT + (100 - DIM_PCT) * t);
         }
      }

      if (heroSection) {
         var heroTl = gsap.timeline({
            scrollTrigger: {
               trigger: heroSection,
               start: 'top top',
               end: 'bottom top',
               pin: true,
               pinSpacing: false,
               scrub: 1
            }
         });

         heroTl.to(heroSection, {
            yPercent: -20,
            ease: 'none'
         });
      }

      var textTl = gsap.timeline({
         scrollTrigger: {
            trigger: wrapperSec,
            start: 'top top',
            end: '+=280%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            fastScrollEnd: true,
            invalidateOnRefresh: true
         }
      });

      textTl
         .to([title, logo], { autoAlpha: 1, scale: 1, duration: 12, ease: 'power2.out' }, 0)

         .to({ p: 0 }, {
            p: 1,
            duration: 53,
            ease: 'none',
            onUpdate: function () {
               setFillProgress(this.targets()[0].p);
            }
         }, 12);

      /* Background stays fixed throughout this section. */

      if (document.fonts && document.fonts.ready) {
         document.fonts.ready.then(function () { Utils.requestRefresh(0); });
      }

      Utils.requestRefresh(300);
   }

   window.__initHeroFullWidth = init;
})();

/* ==========================================================================
   MORONA CARD SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function init() {

      var moronaSection = document.querySelector('.morona-cards-main-sec');
      if (!moronaSection) return;

      var firstSection = moronaSection.querySelector('.morona-cards-section:not(.black-screen)');
      var firstCardText = firstSection.querySelector('.card-text');
      var blackScreen = document.querySelector('.morona-cards-section.black-screen');
      var blackScreenTexts = blackScreen.querySelectorAll('.card-text');
      var blackScreenTexts2 = blackScreen.querySelectorAll('.card-text-2');
      var scrollingText2 = document.querySelector('.scrolling-text-2');

      /* Final fanned-out angles (see reference screenshot). All three cards
         reach these in ONE move once the stack has finished arriving —
         they no longer creep open across the whole scroll. */
      var FAN = { one: 8, two: -16, three: -34 };
      var FAN_DUR = 1.6;

      var cardImgWrap = moronaSection.querySelector('.card-img');
      var cardOne = cardImgWrap ? cardImgWrap.querySelector('.card-one') : null;
      var cardTwo = cardImgWrap ? cardImgWrap.querySelector('.card-two') : null;
      var cardThree = cardImgWrap ? cardImgWrap.querySelector('.card-three') : null;

      gsap.set(firstCardText, { opacity: 0, y: 60 });
      gsap.set(blackScreenTexts, { opacity: 0, y: 60 });
      gsap.set(blackScreenTexts2, { opacity: 0, y: 60 });

      if (cardOne && cardTwo && cardThree) {
         gsap.set(cardThree, { xPercent: -50, rotation: 0, y: 150, opacity: 0 });
         gsap.set(cardTwo, { xPercent: -50, rotation: 0, y: 150, opacity: 0 });
         gsap.set(cardOne, { xPercent: -50, rotation: 0, y: 150, opacity: 0 });
      }

      ScrollTrigger.create({
         trigger: moronaSection,
         start: 'top 80%',
         onEnter: function () {
            gsap.to(firstCardText, { opacity: 1, y: 0, ease: 'power2.out', duration: 1 });
         },
         onLeaveBack: function () {
            gsap.to(firstCardText, { opacity: 0, y: 60, ease: 'power2.in', duration: 0.5 });
         }
      });

      var tl = gsap.timeline({
         scrollTrigger: {
            trigger: moronaSection,
            start: 'top top',
            end: "+=4300", // reverted to fixed value — see note below
            scrub: 1.5,
            pin: true,
            anticipatePin: 1,
            onEnter: function () { moronaSection.classList.add('active'); },
            onLeaveBack: function () {
               moronaSection.classList.remove('active');
               blackScreen.classList.remove('is-revealing', 'is-revealed', 'first-content-active', 'second-content-active', 'scrolling-two-active');
            }
         }
      });

      if (cardOne && cardTwo && cardThree) {

         tl.to(cardThree, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 'cardsIn')
            .to(cardThree, { y: 0, duration: 1, ease: 'power2.out' }, 'cardsIn');

         tl.to(cardTwo, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 'cardsIn+=1')
            .to(cardTwo, { y: 0, duration: 1, ease: 'power2.out' }, 'cardsIn+=1');

         tl.to(cardOne, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 'cardsIn+=2')
            .to(cardOne, { y: 0, duration: 1, ease: 'power2.out' }, 'cardsIn+=2');
      }

      /* ---- FAN OPEN: all three cards spread at once, right after the
              stack has arrived. Scrubbing backwards closes the fan first,
              then the cards leave one by one. ---- */
      if (cardOne && cardTwo && cardThree) {
         tl.to(cardThree, { rotation: FAN.three, duration: FAN_DUR, ease: 'power2.out' }, 'cardsIn+=3.2')
            .to(cardTwo, { rotation: FAN.two, duration: FAN_DUR, ease: 'power2.out' }, 'cardsIn+=3.2')
            .to(cardOne, { rotation: FAN.one, duration: FAN_DUR, ease: 'power2.out' }, 'cardsIn+=3.2');
      }

      tl.to('.scrolling-text', { x: '-150%', ease: 'power1.inOut', duration: 1.4 }, 'cardsIn+=4.6');

      tl.to(blackScreen, {
         clipPath: 'circle(150% at 50% 50%)',
         ease: 'power1.inOut',
         duration: 1.5,
         onStart: function () { blackScreen.classList.add('is-revealing'); },
         onComplete: function () {
            blackScreen.classList.add('is-revealed');
         },
         onReverseComplete: function () {
            blackScreen.classList.remove('is-revealing', 'is-revealed');
         }
      }, 'cardsIn+=5.2');

      tl.to(blackScreenTexts, {
         opacity: 1, y: 0, ease: 'power2.out', stagger: 0, duration: 1,
         onStart: function () { blackScreen.classList.add('first-content-active'); },
         onReverseComplete: function () { blackScreen.classList.remove('first-content-active'); }
      }, 'step3');

      tl.to(blackScreenTexts, {
         opacity: 0, y: -60, ease: 'power2.inOut', stagger: 0, duration: 1,
         onComplete: function () { blackScreen.classList.remove('first-content-active'); },
         onReverseComplete: function () { blackScreen.classList.add('first-content-active'); }
      }, 'step3+=1.1');

      tl.to(scrollingText2, {
         x: '-150%',
         ease: 'power1.inOut',
         duration: 1.4,
         keyframes: { opacity: [0, 1, 1, 0], easeEach: 'none' },
         onUpdate: function () {
            if (this.progress() > 0 && this.progress() < 1) {
               blackScreen.classList.add('scrolling-two-active');
            } else {
               blackScreen.classList.remove('scrolling-two-active');
            }
         }
      }, 'step3+=1.6');

      tl.to(blackScreenTexts2, {
         opacity: 1, y: 0, ease: 'power2.out', stagger: 0, duration: 1,
         onStart: function () { blackScreen.classList.add('second-content-active'); },
         onReverseComplete: function () { blackScreen.classList.remove('second-content-active'); }
      }, '>-0.3');

      Utils.requestRefresh(300);
   }

   window.__initMoronaCard = init;
})();

/* ==========================================================================
   FULL-WIDTH LEFT TEXT FILL  +  ASK ANYTHING SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function initLeftTextFill() {

      var leftTextSections = document.querySelectorAll('.full-with-left-text');
      if (!leftTextSections.length) return;

      var DIM_ON_LIGHT = 'rgba(0, 0, 0, 0.16)';        // un-filled text on light/white bg
      var FILL_ON_LIGHT = '#000000';                   // filled text on light/white bg
      var DIM_ON_DARK = 'rgba(255, 255, 255, 0.16)';   // un-filled text on .black-bg sections
      var FILL_ON_DARK = '#ffffff';                    // filled text on .black-bg sections

      /* ---- speed / smoothness knobs ---- */
      var BG_DUR = 0.8;          // .bg-changed opacity fade, seconds
      var FILL_DUR = 1.5;        // full left-to-right sweep, seconds
      var FILL_DELAY = 0.25;     // sweep starts this long after the timeline begins
      var REVERSE_SPEED = 1.25;  // 1 = same speed backwards, higher = quicker
      var FEATHER = 1;           // 1 = crisp letter-by-letter, higher = soft wipe
      var DIM_DUR = 0.8;         // time for chars to go to DIM state at start

      // .bg-changed is a single shared overlay (direct child of <main>),
      // not nested inside each section — grab it once
      var bgChanged = document.querySelector('.bg-changed');
      if (bgChanged) gsap.set(bgChanged, { opacity: 0 });

      leftTextSections.forEach(function (leftTextSec) {

         var fillText = leftTextSec.querySelector('h2.h1') || leftTextSec.querySelector('h2');
         if (!fillText || fillText.dataset.fillInit === 'true') return;
         fillText.dataset.fillInit = 'true';

         // whenever this section can drive the shared black overlay, its
         // text should fill white to match
         var isBlackBg = leftTextSec.classList.contains('black-bg') || !!bgChanged;
         var DIM = isBlackBg ? DIM_ON_DARK : DIM_ON_LIGHT;
         var FILL = isBlackBg ? FILL_ON_DARK : FILL_ON_LIGHT;

         var chars = [];

         if (typeof SplitText !== 'undefined') {
            SplitText.create(fillText, {
               type: 'words, chars',
               wordsClass: 'word',
               charsClass: 'char',
               onSplit: function (self) {
                  chars = self.chars;
                  gsap.set(chars, { color: DIM });
               }
            });
         }

         /* p = 0 -> nothing filled, p = 1 -> all filled.
            Driven forward it fills left to right; driven backward the same
            function un-fills right to left. */
         function setFillProgress(p) {
            var total = chars.length;
            if (!total) return;

            // leading edge travels a bit past the end so p = 1 fills everything
            var head = p * (total + FEATHER);

            for (var i = 0; i < total; i++) {
               var t = (head - i) / FEATHER;
               if (t <= 0) {
                  chars[i].style.color = DIM;
               } else if (t >= 1) {
                  chars[i].style.color = FILL;
               } else {
                  // smoothstep so the soft edge has no visible seam
                  var s = t * t * (3 - 2 * t);
                  chars[i].style.color = gsap.utils.interpolate(DIM, FILL, s);
               }
            }
         }

         /* One reversible timeline:
              0.00  .bg-changed opacity 0 -> 1, text REST -> dim
              0.25  chars dim -> filled, left to right          */
         var tl = gsap.timeline({ paused: true });

         if (bgChanged) {
            tl.to(bgChanged, { opacity: 1, duration: BG_DUR, ease: 'sine.inOut' }, 0);
         }

         if (chars.length) {
            tl.to(chars, { color: DIM, duration: DIM_DUR, ease: 'sine.inOut' }, 0);

            /* linear on purpose: a constant sweep gives an even letter-by-letter
               cadence. An eased sweep speeds up in the middle and the
               per-letter rhythm disappears. */
            tl.to({ p: 0 }, {
               p: 1,
               duration: FILL_DUR,
               ease: 'none',
               onUpdate: function () { setFillProgress(this.targets()[0].p); }
            }, FILL_DELAY);
         } else {
            tl.fromTo(fillText, { color: DIM }, { color: FILL, duration: FILL_DUR, ease: 'sine.inOut' }, FILL_DELAY);
         }

         function forward() {
            tl.timeScale(1).play();
         }

         function backward() {
            tl.timeScale(REVERSE_SPEED).reverse();
         }

         /* Section entering the viewport -> fill/fade in.
            Section leaving the viewport (either edge) -> un-fill/fade out.
            Pure enter/leave, no scroll-direction dependence.
            IntersectionObserver only, so ScrollTrigger's pin maths is untouched. */
         if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
               entries.forEach(function (entry) {
                  if (entry.isIntersecting) forward();
                  else backward();
               });
            }, { threshold: 0.25 });

            io.observe(leftTextSec);
         } else {
            forward();
         }
      });
   }

   function initAskAnything() {
      var mm = gsap.matchMedia();

      /* Pin length per section.
         Sections that still use the two stacked screenshots (.screen-first +
         .screen-img) need the long distance to scrub the swap. Sections that
         use a <video> have nothing to scrub, so the swap phase is skipped and
         the pin is much shorter — .content-box-1 then arrives far sooner.
         Tune these numbers to taste. */
      var LEN = {
         askDesktopSwap: 3000, askDesktopVideo: 1500,
         askMobileSwap: 2500, askMobileVideo: 1300,
         ask1DesktopSwap: 4000, ask1DesktopVideo: 1500,
         ask1MobileSwap: 3500, ask1MobileVideo: 1300
      };

      function clean(arr) {
         return arr.filter(function (el) { return !!el; });
      }

      /* ---------- .ask-anything-sec (two content sets + optional swap) ---------- */
      function buildAskSec(askSec, isMobile) {
         var screenFirst = askSec.querySelector('.screen-first');
         var screenImg = askSec.querySelector('.screen-img');
         var screenMask = askSec.querySelector('.screen-mask');
         var leftBox = askSec.querySelector('.left-col .content-box');
         var leftBox1 = askSec.querySelector('.left-col .content-box-1');
         var rightBox = askSec.querySelector('.right-col .content-box');
         var rightBox1 = askSec.querySelector('.right-col .content-box-1');

         var hasSwap = !!(screenFirst && screenImg && screenMask);
         var getMaskHeight = function () { return screenMask ? screenMask.offsetHeight : 0; };

         var offset = isMobile ? 30 : 50;
         var swapDur = isMobile ? 1.5 : 1.8;
         var fadeDur = isMobile ? 0.9 : 1;
         var inDur = isMobile ? 1 : 1.2;

         if (hasSwap) {
            gsap.set(screenFirst, { y: 0, opacity: 1, zIndex: 2 });
            gsap.set(screenImg, { y: getMaskHeight(), opacity: 1, zIndex: 1 });
         }
         gsap.set(clean([leftBox, leftBox1]), { opacity: 0, y: offset });
         gsap.set(clean([rightBox, rightBox1]), { opacity: 0, y: -offset });

         var len = isMobile
            ? (hasSwap ? LEN.askMobileSwap : LEN.askMobileVideo)
            : (hasSwap ? LEN.askDesktopSwap : LEN.askDesktopVideo);

         var tl = gsap.timeline({
            scrollTrigger: {
               trigger: askSec,
               start: 'top top',
               end: '+=' + len,
               pin: true,
               scrub: 1.5,
               anticipatePin: 1,
               fastScrollEnd: true,
               invalidateOnRefresh: true
            }
         });

         tl.to(leftBox, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
            .to(rightBox, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '<');

         if (hasSwap) {
            tl.to(screenFirst, { y: function () { return -getMaskHeight(); }, duration: swapDur, ease: 'power2.inOut' }, '+=0.3')
               .to(screenImg, { y: 0, duration: swapDur, ease: 'power2.inOut' }, '<');
         } else {
            // no swap to scrub — just a short hold so the video stays readable
            tl.to({}, { duration: 0.6 }, '+=0.2');
         }

         tl.to(leftBox, { opacity: 0, duration: fadeDur, ease: 'sine.inOut' }, '+=0.4')
            .to(rightBox, { opacity: 0, duration: fadeDur, ease: 'sine.inOut' }, '<');

         if (leftBox1) tl.to(leftBox1, { opacity: 1, y: 0, duration: inDur, ease: 'power3.out' }, '+=0.1');
         if (rightBox1) tl.to(rightBox1, { opacity: 1, y: 0, duration: inDur, ease: 'power3.out' }, '<');
      }

      /* ---------- .ask-anything-sec-1 (long screenshot scrubbed upward) ---------- */
      function buildAskSec1(askSec1, isMobile) {
         var screenMask1 = askSec1.querySelector('.screen-mask');
         var screenImg1 = askSec1.querySelector('.screen-img');
         var leftBoxes = askSec1.querySelectorAll('.left-col .content-box');
         var rightBoxes = askSec1.querySelectorAll('.right-col .content-box');

         var hasScrollImg = !!(screenImg1 && screenMask1);
         var offset = isMobile ? 30 : 50;

         if (hasScrollImg) gsap.set(screenImg1, { y: 0, opacity: 1 });
         gsap.set(leftBoxes, { opacity: 0, y: offset });
         gsap.set(rightBoxes, { opacity: 0, y: -offset });

         var len = isMobile
            ? (hasScrollImg ? LEN.ask1MobileSwap : LEN.ask1MobileVideo)
            : (hasScrollImg ? LEN.ask1DesktopSwap : LEN.ask1DesktopVideo);

         var tl1 = gsap.timeline({
            scrollTrigger: {
               trigger: askSec1,
               start: 'top top',
               end: '+=' + len,
               pin: true,
               scrub: 1.5,
               anticipatePin: 1,
               fastScrollEnd: true,
               invalidateOnRefresh: true
            }
         });

         tl1.to([leftBoxes, rightBoxes], { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' });

         if (hasScrollImg) {
            tl1.to(screenImg1, {
               y: function () { return -(screenImg1.offsetHeight - screenMask1.offsetHeight); },
               ease: 'none',
               duration: 3
            }, '<+=0.5');
         } else {
            tl1.to({}, { duration: 0.6 }, '+=0.2');
         }

         tl1.to(leftBoxes, { opacity: 0, y: -100, duration: 1 }, '+=0.5')
            .to(rightBoxes, { opacity: 0, y: 100, duration: 1 }, '<');
      }

      /* Both selectors together so pins are created in DOCUMENT order —
         a pin built before the spacers above it exist gets a wrong start. */
      function buildAll(isMobile) {
         document.querySelectorAll('.ask-anything-sec, .ask-anything-sec-1').forEach(function (sec) {
            if (sec.classList.contains('ask-anything-sec-1')) {
               buildAskSec1(sec, isMobile);
            } else {
               buildAskSec(sec, isMobile);
            }
         });
      }

      mm.add('(min-width: 768px)', function () { buildAll(false); });
      mm.add('(max-width: 767px)', function () { buildAll(true); });

      var scopedImgs = Array.prototype.slice.call(
         document.querySelectorAll('.ask-anything-sec img, .ask-anything-sec-1 img')
      );
      var pending = scopedImgs.filter(function (img) { return !img.complete; });
      if (pending.length) {
         Promise.all(pending.map(function (img) {
            return new Promise(function (resolve) {
               img.addEventListener('load', resolve, { once: true });
               img.addEventListener('error', resolve, { once: true });
            });
         })).then(function () { Utils.requestRefresh(0); });
      } else {
         Utils.requestRefresh(0);
      }
      Utils.requestRefresh(800);
   }

   function init() {
      initLeftTextFill();
      initAskAnything();
   }

   window.__initAskAnything = init;
})();

/* ==========================================================================
   ACCOUNT SCREEN SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function init() {

      var sec = document.querySelector('.any-account-sec');
      if (!sec) return;

      var textMask = sec.querySelector('.text-mask');
      var textBlocks = Array.from(sec.querySelectorAll('.text-block'));
      var accountMask = sec.querySelector('.account-mask');
      var imgFirst = sec.querySelector('.account-first');
      var imgTwo = sec.querySelector('.account-two');
      var imgThree = sec.querySelector('.account-three');

      if (!textMask || textBlocks.length < 3 || !accountMask || !imgFirst || !imgTwo || !imgThree) return;

      var mm = gsap.matchMedia();

      // --- DESKTOP (>= 768px) ---
      mm.add('(min-width: 768px)', function () {

         var getTextMaskHeight = function () { return textMask.offsetHeight; };
         var getAccountMaskHeight = function () { return accountMask.offsetHeight; };

         gsap.set(textBlocks[0], { x: 0, y: 0, zIndex: 3 });
         gsap.set(textBlocks[1], { x: 0, y: function () { return getTextMaskHeight(); }, zIndex: 2 });
         gsap.set(textBlocks[2], { x: 0, y: function () { return getTextMaskHeight(); }, zIndex: 1 });

         gsap.set(imgFirst, { x: 0, y: 0, opacity: 1, zIndex: 3 });
         gsap.set(imgTwo, { x: 0, y: function () { return getAccountMaskHeight(); }, opacity: 1, zIndex: 2 });
         gsap.set(imgThree, { x: 0, y: function () { return getAccountMaskHeight(); }, opacity: 1, zIndex: 1 });

         var holdDur = 1.8;
         var stepDur = 2.2;
         var stepEase = 'sine.inOut';

         var tl = gsap.timeline({
            scrollTrigger: {
               trigger: sec,
               start: 'top top',
               end: "+=3600", // reverted to fixed value — see note below
               pin: true,
               scrub: 1.8,
               anticipatePin: 1,
               invalidateOnRefresh: true,
               snap: {
                  snapTo: function (value, self) {
                     var total = self.animation.duration();
                     var points = [
                        0,
                        (holdDur + stepDur) / total,
                        (holdDur + stepDur + holdDur + stepDur) / total,
                        1
                     ];
                     var closest = points[0];
                     points.forEach(function (p) {
                        if (Math.abs(value - p) < Math.abs(value - closest)) closest = p;
                     });
                     return closest;
                  },
                  duration: { min: 0.4, max: 0.9 },
                  ease: 'sine.inOut'
               }
            }
         });

         var step1Start = holdDur;
         tl.to(textBlocks[0], { y: function () { return -getTextMaskHeight(); }, duration: stepDur, ease: stepEase }, step1Start)
            .to(textBlocks[1], { y: 0, duration: stepDur, ease: stepEase }, step1Start)
            .to(imgFirst, { y: function () { return -getAccountMaskHeight(); }, duration: stepDur, ease: stepEase }, step1Start)
            .to(imgTwo, { y: 0, duration: stepDur, ease: stepEase }, step1Start);

         var step2Start = step1Start + stepDur + holdDur;
         tl.to(textBlocks[1], { y: function () { return -getTextMaskHeight(); }, duration: stepDur, ease: stepEase }, step2Start)
            .to(textBlocks[2], { y: 0, duration: stepDur, ease: stepEase }, step2Start)
            .to(imgTwo, { y: function () { return -getAccountMaskHeight(); }, duration: stepDur, ease: stepEase }, step2Start)
            .to(imgThree, { y: 0, duration: stepDur, ease: stepEase }, step2Start);

         tl.to({}, { duration: holdDur }, step2Start + stepDur);

         Utils.waitForImages(sec).then(function () { Utils.requestRefresh(0); });
      });

      // --- MOBILE (< 768px) ---
      mm.add('(max-width: 767px)', function () {

         var getTextMaskWidth = function () { return textMask.offsetWidth; };
         var getAccountMaskHeight = function () { return accountMask.offsetHeight; };

         gsap.set(textBlocks[0], { x: 0, y: 0, zIndex: 3 });
         gsap.set(textBlocks[1], { x: function () { return -getTextMaskWidth(); }, y: 0, zIndex: 2 });
         gsap.set(textBlocks[2], { x: function () { return -getTextMaskWidth(); }, y: 0, zIndex: 1 });

         gsap.set(imgFirst, { x: 0, y: 0, opacity: 1, zIndex: 3 });
         gsap.set(imgTwo, { x: 0, y: function () { return getAccountMaskHeight(); }, opacity: 1, zIndex: 2 });
         gsap.set(imgThree, { x: 0, y: function () { return getAccountMaskHeight(); }, opacity: 1, zIndex: 1 });

         var holdDur = 1.8;
         var stepDur = 2.2;
         var stepEase = 'sine.inOut';

         var tl = gsap.timeline({
            scrollTrigger: {
               trigger: sec,
               start: 'top top',
               end: "+=3600", // reverted to fixed value — see note below
               pin: true,
               scrub: 1.8,
               anticipatePin: 1,
               invalidateOnRefresh: true,
               snap: {
                  snapTo: function (value, self) {
                     var total = self.animation.duration();
                     var points = [
                        0,
                        (holdDur + stepDur) / total,
                        (holdDur + stepDur + holdDur + stepDur) / total,
                        1
                     ];
                     var closest = points[0];
                     points.forEach(function (p) {
                        if (Math.abs(value - p) < Math.abs(value - closest)) closest = p;
                     });
                     return closest;
                  },
                  duration: { min: 0.4, max: 0.9 },
                  ease: 'sine.inOut'
               }
            }
         });

         var step1Start = holdDur;
         tl.to(textBlocks[0], { x: function () { return getTextMaskWidth(); }, duration: stepDur, ease: stepEase }, step1Start)
            .to(textBlocks[1], { x: 0, duration: stepDur, ease: stepEase }, step1Start)
            .to(imgFirst, { y: function () { return -getAccountMaskHeight(); }, duration: stepDur, ease: stepEase }, step1Start)
            .to(imgTwo, { y: 0, duration: stepDur, ease: stepEase }, step1Start);

         var step2Start = step1Start + stepDur + holdDur;
         tl.to(textBlocks[1], { x: function () { return getTextMaskWidth(); }, duration: stepDur, ease: stepEase }, step2Start)
            .to(textBlocks[2], { x: 0, duration: stepDur, ease: stepEase }, step2Start)
            .to(imgTwo, { y: function () { return -getAccountMaskHeight(); }, duration: stepDur, ease: stepEase }, step2Start)
            .to(imgThree, { y: 0, duration: stepDur, ease: stepEase }, step2Start);

         tl.to({}, { duration: holdDur }, step2Start + stepDur);

         Utils.waitForImages(sec).then(function () { Utils.requestRefresh(0); });
      });
   }

   window.__initAccountScreen = init;
})();

(function () {
   'use strict';

   function initDarkSectionWatcher() {
      var body = document.body;
      var sections = Array.prototype.slice.call(document.querySelectorAll('.full-width-text-sec, .itelligent-search-sec, .full-with-left-text, .morona-cards-section.black-screen'));
      if (!sections.length) return;

      var activeSections = new Set();
      var observer = new IntersectionObserver(function (entries) {
         entries.forEach(function (entry) {
            if (entry.isIntersecting) {
               activeSections.add(entry.target);
               body.classList.add('dark-section-active');
            } else {
               activeSections.delete(entry.target);
               if (activeSections.size === 0) {
                  body.classList.remove('dark-section-active');
               }
            }
         });
      }, {
         threshold: 0.2
      });

      sections.forEach(function (section) {
         observer.observe(section);
      });
   }

   window.__initDarkSectionWatcher = initDarkSectionWatcher;
})();

/* ==========================================================================
   MASTER INIT — single window "load" listener.
   ========================================================================== */
window.addEventListener('load', function () {

   if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
   gsap.registerPlugin(ScrollTrigger);
   if (typeof SplitText !== 'undefined') gsap.registerPlugin(SplitText);

   if (window.__initLenis) window.__initLenis();
   if (window.__initPageLoader) window.__initPageLoader();
   if (window.__initHeroFullWidth) window.__initHeroFullWidth();
   if (window.__initMoronaCard) window.__initMoronaCard();
   if (window.__initAskAnything) window.__initAskAnything();
   if (window.__initAccountScreen) window.__initAccountScreen();
   if (window.__initDarkSectionWatcher) window.__initDarkSectionWatcher();

   /* ======================================================================
      GUARANTEED REFRESH
      Pins are created in init order, so a pin created early sits above a
      pin-spacer that is added later — its start/end are then too small and
      the section pins way too soon. One authoritative refresh after every
      trigger exists (and again once the preloader is gone and the videos
      have reported their size) fixes all start/end values at once.
      Uses its own timer so it can't be cancelled by Utils.requestRefresh.
      ====================================================================== */
   (function ensureRefresh() {
      var t = null;

      /* Assign refreshPriority to every PINNED trigger in document order,
         top-most first. Without this, a pin can be re-measured before the
         pins above it have rebuilt their spacers, so it keeps a start value
         that is thousands of pixels too small and engages far too early. */
      function prioritisePins() {
         var pins = ScrollTrigger.getAll().filter(function (st) {
            return st.pin && st.trigger;
         });
         if (!pins.length) return;

         pins.sort(function (a, b) {
            return (a.trigger.getBoundingClientRect().top + window.scrollY) -
               (b.trigger.getBoundingClientRect().top + window.scrollY);
         });

         pins.forEach(function (st, i) {
            st.refreshPriority = pins.length - i;   // higher = refreshed first
         });

         ScrollTrigger.sort();
      }

      function refresh() {
         clearTimeout(t);
         t = setTimeout(function () {
            prioritisePins();
            ScrollTrigger.refresh();
         }, 60);
      }

      // 1. right now — every trigger has been registered by this point
      refresh();

      // 2. when webfonts settle (heading heights can change)
      if (document.fonts && document.fonts.ready) {
         document.fonts.ready.then(refresh);
      }

      // 3. when each video reports its metadata
      document.querySelectorAll('video').forEach(function (v) {
         if (v.readyState < 1) {
            v.addEventListener('loadedmetadata', refresh, { once: true });
         }
      });

      // 4. the important one — after the preloader is removed from the DOM
      if (document.querySelector('#preloader')) {
         var mo = new MutationObserver(function () {
            if (!document.querySelector('#preloader')) {
               mo.disconnect();
               refresh();
               setTimeout(refresh, 500);
            }
         });
         mo.observe(document.body, { childList: true });
      } else {
         setTimeout(refresh, 500);
      }
   })();

});

/* ==========================================================================
   ONE BRAIN SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;
   var BLOCK_GAP = 0.5;

   function initOneBrainAnimation() {
      var section = document.querySelector('.one-brain-sec');
      if (!section) {
         console.warn('[one-brain-sec] Section not found on page.');
         return;
      }

      var orderedBlocks = [];

      var leftCol = section.querySelector('.top-block .left-col');
      var rightCol = section.querySelector('.top-block .right-col');
      if (leftCol) orderedBlocks.push(leftCol);
      if (rightCol) orderedBlocks.push(rightCol);

      var cards = section.querySelectorAll('.bottom-block .col-block');
      cards.forEach(function (card) { orderedBlocks.push(card); });

      orderedBlocks.forEach(function (block, index) {
         var delay = (index * BLOCK_GAP).toFixed(2);
         block.style.setProperty('--block-delay', delay + 's');
         block.querySelectorAll('h2, h3').forEach(function (h) { Utils.splitHeadingWords(h, 0.09); });
      });

      Utils.revealOnce(section, function () {
         section.classList.add('in-view');
      }, 0.1);
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOneBrainAnimation);
   } else {
      initOneBrainAnimation();
   }
})();

(function () {
   'use strict';

   var oneBrainSwiper = null;
   var oneBrainResizeTimer = null;

   function createOrDestroyOneBrainSwiper() {
      var selector = '.one-brain-sec .wrapper.swiper';
      var el = document.querySelector(selector);
      if (!el) return;

      var shouldInit = window.innerWidth <= 767;

      if (shouldInit && !oneBrainSwiper && typeof Swiper !== 'undefined') {
         oneBrainSwiper = new Swiper(selector, {
            slidesPerView: 1,
            spaceBetween: 16,
            pagination: {
               el: selector + ' .swiper-pagination',
               clickable: true
            }
         });
      }

      if (!shouldInit && oneBrainSwiper) {
         oneBrainSwiper.destroy(true, true);
         oneBrainSwiper = null;
      }
   }

   function initOneBrainSwiper() {
      createOrDestroyOneBrainSwiper();
      window.addEventListener('resize', function () {
         clearTimeout(oneBrainResizeTimer);
         oneBrainResizeTimer = setTimeout(createOrDestroyOneBrainSwiper, 150);
      });
   }

   window.__initOneBrainSwiper = initOneBrainSwiper;

})();

/* ==========================================================================
   INTELLIGENT SEARCH SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function initIntelligentSearchAnimation() {
      var section = document.querySelector('.itelligent-search-sec');
      if (!section) {
         console.warn('[itelligent-search-sec] Section not found on page.');
         return;
      }

      var heading = section.querySelector('.section-title h2');
      if (heading) Utils.splitHeadingWords(heading, 0.09);

      Utils.revealOnce(section, function () {
         section.classList.add('in-view');
      }, 0.15);
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initIntelligentSearchAnimation);
   } else {
      initIntelligentSearchAnimation();
   }
})();

/* ==========================================================================
   CLEAN TRANSACTION SECTION
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function initCleanTransactionAnimation() {
      var section = document.querySelector('.clean-transaction-sec');
      if (!section) {
         console.warn('[clean-transaction-sec] Section not found on page.');
         return;
      }

      var heading = section.querySelector('.left-col .section-title h2');
      if (heading) Utils.splitHeadingWords(heading, 0.06);

      Utils.revealOnce(section, function () {
         section.classList.add('in-view');
      }, 0.15);
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCleanTransactionAnimation);
   } else {
      initCleanTransactionAnimation();
   }
})();

/* ==========================================================================
   FAQ SECTION — scroll reveal + accordion click toggle
   ========================================================================== */
(function () {
   'use strict';
   var Utils = window.MoronaUtils;

   function initFaqScrollAnimation() {
      var section = document.querySelector('.faq-sec');
      if (!section) {
         console.warn('[faq-sec] Section not found on page.');
         return;
      }

      var BLOCK_GAP = 0.15;
      var BASE_DELAY = 0.5;

      var heading = section.querySelector('.section-title h2');
      if (heading && heading.dataset.split !== 'true') {
         var words = heading.textContent.trim().split(/\s+/);
         heading.innerHTML = words.map(function (word, i) {
            return '<span class="word" style="--word-delay:' + (i * 0.08) + 's">' + word + '</span>';
         }).join(' ');
         heading.dataset.split = 'true';
      }

      var boxes = section.querySelectorAll('.accordion-box');
      boxes.forEach(function (box, index) {
         var delay = (BASE_DELAY + index * BLOCK_GAP).toFixed(2);
         box.style.setProperty('--block-delay', delay + 's');
      });

      Utils.revealOnce(section, function () {
         section.classList.add('in-view');
      }, 0.1);
   }

   function initFaqAccordion() {
      if (typeof jQuery === 'undefined') {
         console.warn('[faq-sec] jQuery not found — accordion click toggle will not work. Make sure jQuery is loaded before this script.');
         return;
      }

      var $ = jQuery;
      var $faqContainer = $('.faq-sec');

      if (!$faqContainer.length) return;

      $faqContainer.find('.accordion-box:first').addClass('active');
      $faqContainer.find('.accordion-box:first .answers').show();

      $faqContainer.find('.question').on('click', function () {
         $faqContainer.find('.answers').slideUp();
         $faqContainer.find('.accordion-box').removeClass('active');
         var $currentAccordionBox = $(this).parent();
         var $currentAnswers = $currentAccordionBox.find('.answers');
         if ($currentAnswers.is(':visible')) {
            $currentAnswers.slideUp();
            $currentAccordionBox.removeClass('active');
         } else {
            $currentAnswers.slideDown();
            $currentAccordionBox.addClass('active');
         }
      });
   }

   function init() {
      initFaqScrollAnimation();
      initFaqAccordion();
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
   } else {
      init();
   }
})();

/* ==========================================================================
   IMAGE ZOOM SECTION + TITLE LETTER REVEAL + TESTIMONIAL SLIDER
========================================================================== */
(function () {
   'use strict';

   function initImageZoom() {
      var imgWrapper = document.getElementById('imgWrapper');
      if (!imgWrapper) return;
      var imgBox = imgWrapper.querySelector('.cover-image');
      if (!imgBox) return;

      var MIN_ZOOM = 1;
      var MAX_ZOOM = 1.2;

      var targetZoom = MIN_ZOOM;
      var currentZoom = MIN_ZOOM;

      function calcTargetZoom() {
         var rect = imgWrapper.getBoundingClientRect();
         var sectionHeight = imgWrapper.offsetHeight;

         var progress = -rect.top / sectionHeight;
         progress = Math.min(Math.max(progress, 0), 1);

         targetZoom = MIN_ZOOM + (MAX_ZOOM - MIN_ZOOM) * progress;
      }

      var lastTime = performance.now();
      function animate(now) {
         var dt = Math.min(now - lastTime, 50);
         lastTime = now;

         var smoothing = 1 - Math.pow(1 - 0.1, dt / 16.67);
         currentZoom += (targetZoom - currentZoom) * smoothing;

         imgBox.style.setProperty('--zoom', currentZoom.toFixed(4));
         requestAnimationFrame(animate);
      }

      window.addEventListener('scroll', calcTargetZoom);
      window.addEventListener('resize', calcTargetZoom);
      calcTargetZoom();
      requestAnimationFrame(animate);
   }

   function initCoverTitleReveal() {
      function splitIntoLetters(el, baseDelay, letterStep, duration) {
         var text = el.textContent;
         el.textContent = '';
         [...text].forEach(function (ch, i) {
            var mask = document.createElement('span');
            mask.className = 'letter-mask';
            var inner = document.createElement('span');
            inner.className = 'letter-inner';
            inner.textContent = ch === ' ' ? '\u00A0' : ch;
            inner.style.animationDelay = (baseDelay + i * letterStep).toFixed(3) + 's';
            inner.style.animationDuration = duration + 's';
            mask.appendChild(inner);
            el.appendChild(mask);
         });
      }

      var titleCols = document.querySelectorAll('.ttile-col');
      if (!titleCols.length) return;

      titleCols.forEach(function (col, colIndex) {
         var colBase = colIndex * 0.25;
         var titleH2 = col.querySelector('h2');
         var titleEl = col.querySelector('h2 .reveal-inner');
         if (titleEl) {
            titleH2.classList.add('split-letters');
            splitIntoLetters(titleEl, colBase + 0.15, 0.045, 0.65);
         }
      });

      var icons = document.querySelectorAll('.ttile-col .icon');
      icons.forEach(function (icon, i) {
         icon.style.opacity = '0';
         icon.style.transition = 'opacity .6s ease';
         icon.style.transitionDelay = (0.6 + i * 0.2).toFixed(3) + 's';
      });

      var titleSec = document.querySelector('.cover-title-sec');
      if (!titleSec) return;

      var observer = new IntersectionObserver(function (entries) {
         entries.forEach(function (entry) {
            if (entry.isIntersecting) {
               entry.target.classList.add('in-view');
               icons.forEach(function (icon) { icon.style.opacity = '1'; });
            } else {
               entry.target.classList.remove('in-view');
               icons.forEach(function (icon) { icon.style.opacity = '0'; });
            }
         });
      }, { threshold: 0.15 });

      observer.observe(titleSec);
   }

   function initTestimonial() {
      var wrapper = document.querySelector('.testimonialSwiper .swiper-wrapper');

      if (wrapper && !wrapper.dataset.marqueeReady) {
         var slides = Array.prototype.slice.call(wrapper.children);
         slides.forEach(function (slide) {
            var clone = slide.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            wrapper.appendChild(clone);
         });
         wrapper.dataset.marqueeReady = 'true';
      }

      var section = document.querySelector('.testimonial-slider-sec');
      if (section) {
         var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
               if (entry.isIntersecting) {
                  entry.target.classList.add('in-view');
                  obs.unobserve(entry.target);
               }
            });
         }, { threshold: 0.2 });
         observer.observe(section);
      }
   }

   function init() {
      initImageZoom();
      initCoverTitleReveal();
      initTestimonial();
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
   } else {
      init();
   }
})();

window.addEventListener('load', function () {
   setTimeout(function () {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
   }, 1500);
});

/* ==========================================================================
   VIDEO AUTOPLAY — iOS / Safari safe
   iOS only autoplays when muted + playsInline are set as PROPERTIES before
   playback, and it refuses entirely in Low Power Mode. So: set the properties,
   retry on every readiness event, retry when the video scrolls into view, and
   fall back to the first user gesture.
   ========================================================================== */
(function () {
   'use strict';

   function initVideoAutoplay() {
      var videos = Array.prototype.slice.call(document.querySelectorAll('video'));
      if (!videos.length) return;

      videos.forEach(function (v) {

         // properties, not just attributes — this is what iOS actually checks
         v.muted = true;
         v.defaultMuted = true;
         v.playsInline = true;
         v.loop = true;
         v.controls = false;
         v.setAttribute('muted', '');
         v.setAttribute('playsinline', '');
         v.setAttribute('webkit-playsinline', '');
         v.setAttribute('preload', 'auto');   // metadata is not enough on iOS

         function attempt() {
            if (!v.paused) return;
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(function () { /* blocked — gesture fallback will retry */ });
         }

         ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(function (ev) {
            v.addEventListener(ev, attempt);
         });

         // iOS is much more willing to start a video that is actually on screen
         if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
               entries.forEach(function (e) {
                  if (e.isIntersecting) attempt();
                  else if (!v.paused) v.pause();
               });
            }, { threshold: 0.05 }).observe(v);
         }

         attempt();
      });

      // Low Power Mode / strict policy: kick everything off on the first gesture
      var events = ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown', 'wheel'];

      function unlock() {
         videos.forEach(function (v) {
            v.muted = true;
            var p = v.play();
            if (p && typeof p.catch === 'function') p.catch(function () { });
         });
         events.forEach(function (ev) {
            window.removeEventListener(ev, unlock, true);
         });
      }

      events.forEach(function (ev) {
         window.addEventListener(ev, unlock, { capture: true, passive: true });
      });
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVideoAutoplay);
   } else {
      initVideoAutoplay();
   }

   jQuery(document).on('click', 'a[href^="#"]', function (event) {
      event.preventDefault();

      jQuery('html, body').animate({
         scrollTop: $($.attr(this, 'href')).offset().top
      }, 500);
   });

   document.addEventListener("DOMContentLoaded", () => {
     const form = document.getElementById("waitlistForm");

     if (!form) return;

     const button = form.querySelector('[type="submit"]');
     const buttonLabel = button.querySelector(".submit-label");
     const message = document.getElementById("waitlistMessage");

     const emailInput = form.elements.namedItem("email");
      const mobileInput = form.elements.namedItem("mobile");

      const emailError = document.getElementById("emailError");
      const mobileError = document.getElementById("mobileError");

     const fieldMap = {
       name: "firstname",
       email: "email",
       mobile: "phone",
       city: "city",
       "main-bank": "main_bank",
       "bank-accounts": "bank_accounts",
       "interested-in": "most_interested_in",
       early_access_consent:
         "i_agree_to_be_contacted_about_early_access_",
     };

     form.addEventListener("submit", async (event) => {
       event.preventDefault();

       const emailInput = form.elements.namedItem("email");
     const mobileInput = form.elements.namedItem("mobile");

     const emailError = document.getElementById("emailError");
     const mobileError = document.getElementById("mobileError");

     // Clear previous errors
     emailError.textContent = "";
     mobileError.textContent = "";

     emailInput.removeAttribute("aria-invalid");
     mobileInput.removeAttribute("aria-invalid");

     let isValid = true;

     // Email validation
     const email = emailInput.value.trim();
     const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

     if (!email) {
       emailError.textContent = "Email is required.";
       emailInput.setAttribute("aria-invalid", "true");
       isValid = false;
     } else if (!emailPattern.test(email)) {
       emailError.textContent = "Please enter a valid email address.";
       emailInput.setAttribute("aria-invalid", "true");
       isValid = false;
     }

     // Saudi mobile validation: exactly 05XXXXXXXX
     const mobile = mobileInput.value.trim();
     const mobilePattern = /^05\d{8}$/;

     if (!mobile) {
       mobileError.textContent = "Mobile number is required.";
       mobileInput.setAttribute("aria-invalid", "true");
       isValid = false;
     } else if (!mobilePattern.test(mobile)) {
       mobileError.textContent =
         "Enter a valid Saudi mobile number (05XXXXXXXX).";
       mobileInput.setAttribute("aria-invalid", "true");
       isValid = false;
     }

     // Stop submission if email or mobile is invalid
     if (!isValid) return;

       if (!form.reportValidity()) return;



       button.disabled = true;
       buttonLabel.textContent = "Submitting...";
       message.textContent = "";

       try {
         const fields = Object.entries(fieldMap).map(
           ([htmlName, hubspotName]) => {
             const input = form.elements.namedItem(htmlName);

             return {
               name: hubspotName,
               value:
                 input.type === "checkbox"
                   ? String(input.checked)
                   : input.value.trim(),
             };
           }
         );

         const response = await fetch("/api/submit-form", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify({
             fields,
             pageUri: window.location.href,
             pageName: document.title,
           }),
         });

         const result = await response.json();

         if (!response.ok || !result.success) {
           throw new Error(
             result.message || "Unable to submit the form."
           );
         }

         form.reset();
         message.textContent =
           "You're on the list. We'll be in touch before launch.";
         message.style.color = "green";
       } catch (error) {
         console.error("Waitlist submission error:", error);

         message.textContent =
           "Something went wrong. Please try again.";
         message.style.color = "red";
       } finally {
         button.disabled = false;
         buttonLabel.textContent = "Join Waitlist";
       }
     });
     emailInput.addEventListener("input", () => {
       emailError.textContent = "";
       emailInput.removeAttribute("aria-invalid");
     });

     mobileInput.addEventListener("input", () => {
       mobileError.textContent = "";
       mobileInput.removeAttribute("aria-invalid");
     });
   });

})();