/**
 * @file
 * CKEditor Accordion functionality.
 */

(function ($) {
  'use strict';
  Backdrop.behaviors.ckeditorAccordion = {
    attach: function (context, settings) {
      var accordionSettings = settings.ckeditor_accordion || {};

      // Create accordion functionality if the required elements exist is available.
      var $ckeditorAccordion = $('.ckeditor-accordion', context);
      if ($ckeditorAccordion.length > 0) {
        // Create simple accordion mechanism for each tab.
        $ckeditorAccordion.each(function () {
          var $accordion = $(this);
          if ($accordion.hasClass('styled')) {
            return;
          }

          var animate = accordionSettings.animateAccordionOpenAndClose;
          var collapseAll = accordionSettings.collapseAll;
          var allowHtmlInTitles = accordionSettings.allowHtmlInTitles;
          var openTabsWithHash = accordionSettings.openTabsWithHash;

          // The first one is the correct one.
          if (!collapseAll) {
            $accordion.children('dt:first-child').addClass('active');
            $accordion.children('dd:first-of-type').addClass('active').css('display', 'block');
          }

          // Turn the accordion tabs to links so that the content is accessible & can be traversed using keyboard.
          $accordion.children('dt').each(function () {
            var $tab = $(this);
            var tabText = $tab.text().trim();
            var tabHtml = (allowHtmlInTitles) ? $tab.html().trim() : tabText;
            var toggleClass = $tab.hasClass('active') ? ' active' : '';
            var hrefAndIds = 'href="#"';
            if (openTabsWithHash) {
              var tabHash = encodeURIComponent(tabText.replace(/[^A-Za-z0-9]/g, ''));
              hrefAndIds = 'href="#' + tabHash + '" id="' + tabHash + '" onclick="return false;"';
            }
            $tab.html('<a class="ckeditor-accordion-toggler" ' + hrefAndIds + '><span class="ckeditor-accordion-toggle' + toggleClass + '"></span>' + tabHtml + '</a>');
          });

          // Wrap the accordion in a div element so that quick edit function shows the source correctly.
          var wrapClasses = 'ckeditor-accordion-container';
          if (!animate) {
            wrapClasses = wrapClasses + ' no-animations';
          }
          $accordion.addClass('styled').removeClass('ckeditor-accordion');
          $accordion.wrap('<div class="' + wrapClasses + '"></div>');

          // Fire an event so other modules know when the accordion has been created.
          $accordion.trigger('ckeditorAccordionAttached');
        });

        // Add click event to body once because quick edits & ajax calls might reset the HTML.
        $('body').once('ckeditorAccordionToggleEvent').on('click', '.ckeditor-accordion-toggler', function (e) {
          var $t = $(this).parent();
          var $parent = $t.parent();
          var keepRowsOpen = accordionSettings.keepRowsOpen;
          var animate = accordionSettings.animateAccordionOpenAndClose;

          // Clicking on open element, close it.
          if ($t.hasClass('active')) {
            $t.removeClass('active');
            $t.children('a').children('span').removeClass('active');
            if (animate) {
              $t.next().slideUp(300, function () { $(this).removeClass('active'); });
            }
            else {
              $t.next().hide().removeClass('active');
            }
          }
          else {
            if (!keepRowsOpen) {
              // Remove active classes.
              $parent.children('dt.active').removeClass('active').children('a').children('span').removeClass('active');
              $parent.children('dd.active').each(function () {
                var $dd = $(this);
                if (animate) {
                  $dd.slideUp(300, function () { $dd.removeClass('active'); });
                }
                else {
                  $dd.hide().removeClass('active');
                }
              });
            }

            // Show the selected tab.
            $t.addClass('active');
            $t.children('a').children('span').addClass('active');
            if (animate) {
              $t.next().slideDown(300).addClass('active');
            }
            else {
              $t.next().show().addClass('active');
            }
          }

          // Don't add hash to url.
          e.preventDefault();
        });

        // Open tabs with hash if config requires.
        if (accordionSettings.openTabsWithHash) {
          // Trigger hash change when clicking an anchor to an accordion tab on the same page.

          // Open content that matches the hash on hash change.
          var handleHash = function () {
            var hash = window.location.hash;
            if (!hash) {
              return;
            }
            var $toggler = $('a.ckeditor-accordion-toggler[href="' + hash + '"]');
            if ($toggler.length && !$toggler.parent().hasClass('active')) {
              $toggler.click();
            }
          };

          // Handle links pointing to accordion hashes.
          $('a[href*="#"]').once('ckeditorAccordionHashLinks').on('click', function (e) {
            var href = $(this).attr('href');
            var hash = href.substring(href.indexOf('#'));
            if ($('a.ckeditor-accordion-toggler[href="' + hash + '"]').length) {
              window.location.hash = hash;
              e.preventDefault();
            }
          });

          $(window).on('hashchange', handleHash);
          handleHash();
        }
      }
    }
  };
})(jQuery);
