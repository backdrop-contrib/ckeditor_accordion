/**
 * @file
 * Contains Accordion CKEditor 5 plugin and its dependent classes.
 */
(function (CKEditor5) {

  "use strict";

  /**
   * Main Accordion plugin that combines editing, UI, and toolbar.
   */
  class Accordion extends CKEditor5.Plugin {
    /**
    * @inheritdoc
    */
    static get requires() {
      return [AccordionEditing, AccordionUI, AccordionToolbar];
    }

    /**
    * @inheritdoc
    */
    static get pluginName() {
      return 'Accordion';
    }
  }

  // Expose the plugin to the CKEditor5 namespace.
  CKEditor5.accordion = {
    'Accordion': Accordion
  };

  /**
   * Command to insert a new accordion.
   */
  class InsertAccordionCommand extends CKEditor5.Command {
    /**
     * @inheritdoc
     */
    execute() {
      const { model } = this.editor;

      model.change(writer => {
        // Insert <accordion>*</accordion> at the current selection position
        // in a way that will result in creating a valid model structure.
        const accordion = writer.createElement('accordion');
        const accordionTitle = writer.createElement('accordionTitle');
        const accordionContent = writer.createElement('accordionContent');

        // Create some default title.
        writer.insertText('Accordion title', accordionTitle);

        writer.append(accordionTitle, accordion);
        writer.append(accordionContent, accordion);

        // Create some default content.
        const accordionContentParagraph = writer.createElement('paragraph');
        writer.appendText('Accordion content.', accordionContentParagraph);
        writer.insert(accordionContentParagraph, accordionContent);

        model.insertContent(accordion);
      });
    }

    /**
     * @inheritdoc
     */
    refresh() {
      const { model } = this.editor;
      const { selection } = model.document;

      // Determine if the cursor (selection) is in a position where adding a
      // accordion is permitted. This is based on the schema of the model(s)
      // currently containing the cursor.
      const allowedIn = model.schema.findAllowedParent(
        selection.getFirstPosition(),
        'accordion',
      );

      // Additional check: if we're inside accordionContent, explicitly allow it
      const isInAccordionContent = selection.getFirstPosition().findAncestor('accordionContent');

      // If the cursor is not in a location where a accordion can be added, return
      // null so the addition doesn't happen.
      this.isEnabled = allowedIn !== null || isInAccordionContent !== null;
    }
  }

  /**
   * Command to insert a new accordion row above or below the current row.
   */
  class InsertAccordionRowCommand extends CKEditor5.Command {
    /**
     * Creates a new `InsertAccordionRowCommand` instance.
     *
     * @param {module:core/editor/editor~Editor} editor
     *   The editor on which this command will be used.
     * @param {Object} options
     * @param {String} [options.order="below"]
     *   The order of insertion relative to the row in which the caret is located.
     *   Possible values: `"above"` and `"below"`.
     */
    constructor(editor, options = {}) {
      super(editor);

      /**
       * The order of insertion relative to the row in which the caret is located.
       *
       * @readonly
       * @member {String} module:accordion/commands/insertaccordionrowcommand~InsertAccordionRowCommand#order
       */
      this.order = options.order || 'below';
    }

    /**
     * @inheritdoc
     */
    execute() {
      const editor = this.editor;
      const selection = editor.model.document.selection;
      let commandEl = null;

      selection.getFirstPosition().getAncestors().forEach(ancestor => {
        if (ancestor.name == 'accordionContent' || ancestor.name == 'accordionTitle') {
          commandEl = ancestor;
        }
      });

      if (commandEl != null) {
        // Command is being run from a correct context.
        editor.model.change((writer) => {
          let position;
          if (this.order == 'below') {
            let insertAfterIndex = (commandEl.name == 'accordionContent') ? commandEl.index : commandEl.index + 1;
            if (insertAfterIndex < 0) {
              insertAfterIndex = 0;
            }
            // Add row below this row's accordionTitle.
            position = writer.createPositionAfter(commandEl.parent.getChild(insertAfterIndex));
          }
          else {
            let insertBeforeIndex = (commandEl.name == 'accordionContent') ? commandEl.index - 1 : commandEl.index;

            if(insertBeforeIndex < 0) {
              insertBeforeIndex = 0;
            }
            // Add row above this row's accordionTitle.
            position = writer.createPositionBefore(commandEl.parent.getChild(insertBeforeIndex));
          }

          // Create the accordion title and content and add em.
          const accordionTitle = writer.createElement('accordionTitle');
          const accordionContent = writer.createElement('accordionContent');

          // Create some default title.
          writer.insertText('Accordion title', accordionTitle);

          // Do the insert.
          writer.insert(accordionContent, position);
          writer.insert(accordionTitle, position);

          // Create some default content.
          const accordionContentParagraph = writer.createElement('paragraph');
          writer.appendText('Accordion content.', accordionContentParagraph);
          writer.insert(accordionContentParagraph, accordionContent);

          // Select the inserted title row.
          // TODO.
        });
      }
    }

    /**
     * @inheritdoc
     */
    refresh() {
      this.isEnabled = true;
    }
  }

  /**
   * Command to delete the current accordion row.
   */
  class DeleteAccordionRowCommand extends CKEditor5.Command {
    /**
     * Creates a new `DeleteAccordionRowCommand` instance.
     *
     * @param {module:core/editor/editor~Editor} editor
     *   The editor on which this command will be used.
     * @param {Object} options
     */
    constructor(editor, options = {}) {
      super(editor);
    }

    /**
     * @inheritdoc
     */
    execute() {
      const editor = this.editor;
      const selection = editor.model.document.selection;
      let elToDelete = null;

      selection.getFirstPosition().getAncestors().forEach(ancestor => {
        if (ancestor.name == 'accordionContent' || ancestor.name == 'accordionTitle') {
          elToDelete = ancestor;
        }
      });

      if (elToDelete != null) {
        // Command is being run from a correct context.
        editor.model.change((writer) => {
          let siblingElToDelete, siblingIndex;
          if (elToDelete.name == 'accordionContent') {
            // Sibling is accordionTitle.
            siblingIndex = elToDelete.index - 1;
          }
          else {
            // Sibling is accordionContent.
            siblingIndex = elToDelete.index + 1;
          }
          siblingElToDelete = elToDelete.parent.getChild(siblingIndex);

          // Remove elements.
          writer.remove(elToDelete);
          writer.remove(siblingElToDelete);
        });
      }
    }

    /**
     * @inheritdoc
     */
    refresh() {
      this.isEnabled = true;
    }
  }

  /**
   * CKEditor 5 plugins do not work directly with the DOM. They are defined as
   * plugin-specific data models that are then converted to markup that
   * is inserted in the DOM.
   *
   * CKEditor 5 internally interacts with accordion as this model:
   * <accordion>
   *    <accordionTitle></accordionTitle>
   *    <accordionContent></accordionContent>
   * </accordion>
   *
   * Which is converted for the browser/user as this markup
   * <section class="simple-box">
   *   <h2 class="simple-box-title"></h1>
   *   <div class="simple-box-description"></div>
   * </section>
   *
   * This file has the logic for defining the accordion model, and for how it is
   * converted to standard DOM markup.
   */
  class AccordionEditing extends CKEditor5.Plugin {

    /**
     * @inheritdoc
     */
    static get pluginName() {
      return 'AccordionEditing';
    }

    /**
     * @inheritdoc
     */
    static get requires() {
      return [CKEditor5.Widget];
    }

    /**
     * @inheritdoc
     */
    init() {
      this._defineSchema();
      this._defineConverters();
      this.editor.commands.add(
        'insertAccordion',
        new InsertAccordionCommand(this.editor),
      );
      this.editor.commands.add(
        'insertAccordionRowAbove',
        new InsertAccordionRowCommand(this.editor, { order: 'above' })
      );
      this.editor.commands.add(
        'insertAccordionRowBelow',
        new InsertAccordionRowCommand(this.editor, { order: 'below' })
      );
      this.editor.commands.add(
        'deleteAccordionRow',
        new DeleteAccordionRowCommand(this.editor, {})
      );
    }

    /**
     * This registers the structure that will be seen by CKEditor 5 as:
     * @code
     * <accordion>
     *   <accordionTitle></accordionTitle>
     *   <accordionContent></accordionContent>
     * </accordion>
     * @endcode
     *
     * The logic in _defineConverters() will determine how this is converted to
     * markup.
     */
    _defineSchema() {
      // Schemas are registered via the central `editor` object.
      const schema = this.editor.model.schema;

      schema.register('accordion', {
        // Behaves like a self-contained object (e.g. an image).
        isObject: true,
        // Allow in places where other blocks are allowed (e.g. directly in the
        // root).
        allowWhere: '$block'
      });
      schema.register('accordionTitle', {
        // This creates a boundary for external actions such as clicking and
        // and keypress. For example, when the cursor is inside this box, the
        // keyboard shortcut for "select all" will be limited to the contents of
        // the box.
        isLimit: true,
        // This is only to be used within accordion.
        allowIn: 'accordion',
        // Allow content that is allowed in blocks (e.g. text with attributes).
        allowContentOf: '$block'
      });
      schema.register('accordionContent', {
        isLimit: true,
        allowIn: 'accordion',
        allowContentOf: '$root'
      });
      schema.extend('accordion', {
        allowIn: 'accordionContent'
      });
    }

    /**
     * Converters determine how CKEditor 5 models are converted into markup and
     * vice-versa.
     */
    _defineConverters() {
      // Converters are registered via the central editor object.
      const conversion = this.editor.conversion;

      // Upcast Converters: determine how existing HTML is interpreted by the
      // editor. These trigger when an editor instance loads.
      //
      // If <dl class="ckeditor-accordion"> is present in the existing markup
      // processed by CKEditor, then CKEditor recognizes and loads it as a
      // <accordion> model.
      conversion.for('upcast').elementToElement({
        model: 'accordion',
        view: { name: 'dl', classes: 'ckeditor-accordion' }
      });

      // If <dt> is present in the existing markup
      // processed by CKEditor, then CKEditor recognizes and loads it as a
      // <accordionTitle> model, provided it is a child element of <accordion>,
      // as required by the schema.
      conversion.for('upcast').elementToElement({
        model: 'accordionTitle',
        view: { name: 'dt', classes: '' }
      });

      // If <dd> is present in the existing markup
      // processed by CKEditor, then CKEditor recognizes and loads it as a
      // <accordionContent> model, provided it is a child element of
      // <accordion>, as required by the schema.
      conversion.for('upcast').elementToElement({
        model: 'accordionContent',
        view: { name: 'dd', classes: '' }
      });

      // Data Downcast Converters: converts stored model data into HTML.
      // These trigger when content is saved.
      //
      // Instances of <accordion> are saved as
      // <dl class="ckeditor-accordion">{{inner content}}</dl>.
      conversion.for('dataDowncast').elementToElement({
        model: 'accordion',
        view: {
          name: 'dl',
          classes: 'ckeditor-accordion',
        }
      });

      // Instances of <accordionTitle> are saved as
      // <dt>{{inner content}}</dt>.
      conversion.for('dataDowncast').elementToElement({
        model: 'accordionTitle',
        view: { name: 'dt', classes: '' }
      });

      // Instances of <accordionContent> are saved as
      // <dd>{{inner content}}</dd>.
      conversion.for('dataDowncast').elementToElement({
        model: 'accordionContent',
        view: {
          name: 'dd',
          classes: '',
        }
      });

      // Editing Downcast Converters. These render the content to the user for
      // editing, i.e. this determines what gets seen in the editor. These trigger
      // after the Data Upcast Converters, and are re-triggered any time there
      // are changes to any of the models' properties.
      //
      // Convert the <accordion> model into a container widget in the editor UI.
      conversion.for('editingDowncast').elementToElement({
        model: 'accordion',
        view: (modelElement, { writer }) => {
          const div = writer.createContainerElement('div', {
            class: 'ckeditor-accordion',
          });

          return CKEditor5.toWidget(div, writer);
        }
      });

      // Convert the <accordionTitle> model into an editable <h2> widget.
      conversion.for('editingDowncast').elementToElement({
        model: 'accordionTitle',
        view: (modelElement, { writer }) => {
          const div = writer.createEditableElement('div', {
            class: 'ckeditor-accordion-title',
          });

          return CKEditor5.toWidgetEditable(div, writer);
        }
      });

      // Convert the <accordionContent> model into an editable <div> widget.
      conversion.for('editingDowncast').elementToElement({
        model: 'accordionContent',
        view: (modelElement, { writer }) => {
          const div = writer.createEditableElement('div', {
            class: 'ckeditor-accordion-content',
          });

          return CKEditor5.toWidgetEditable(div, writer);
        }
      });
    }
  }

  /**
   * UI plugin for accordion toolbar buttons.
   */
  class AccordionUI extends CKEditor5.Plugin {

    /**
     * @inheritdoc
     */
    static get requires() {
      return [CKEditor5.ContextualBalloon];
    }

    /**
     * @inheritdoc
     */
    init() {
      const editor = this.editor;

      // This will register the accordion toolbar button.
      editor.ui.componentFactory.add('accordion', locale => {
        const command = editor.commands.get('insertAccordion');
        const buttonView = new CKEditor5.ButtonView(locale);

        // Create the toolbar button.
        buttonView.set({
          label: Backdrop.t('Accordion'),
          icon: '<svg width="20" height="20" viewBox="0 0 5.292 5.292" xmlns="http://www.w3.org/2000/svg"><path style="fill:none;stroke:#000;stroke-opacity:1" d="M2.783 2.447a.222.222 0 0 0-.199.221v3.264c0 .122.098.22.22.22h14.391a.22.22 0 0 0 .221-.22V2.668a.22.22 0 0 0-.22-.22H2.782zm.022 3.897c-.123 0-.221.1-.221.222V9.83c0 .123.098.22.22.22h14.391a.22.22 0 0 0 .221-.22V6.566a.222.222 0 0 0-.22-.222H2.804zm1.5 3.724a.174.174 0 0 0-.174.176v3.703c0 .097.077.176.174.176h11.39a.174.174 0 0 0 .174-.176v-3.703a.174.174 0 0 0-.174-.176H4.305zm-1.5 4.073a.22.22 0 0 0-.221.22v3.266c0 .122.098.22.22.22h14.391a.22.22 0 0 0 .221-.22v-3.266a.22.22 0 0 0-.22-.22H2.804z" transform="scale(.26458)"/></svg>',
          tooltip: true
        });

        // Bind the state of the button to the command.
        buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');

        // Execute the command when the button is clicked (executed).
        this.listenTo(buttonView, 'execute', () => editor.execute('insertAccordion'));

        return buttonView;
      });

      editor.ui.componentFactory.add('accordionAddAbove', locale => {
        const command = editor.commands.get('insertAccordionRowAbove');
        const buttonView = new CKEditor5.ButtonView(locale);
        buttonView.set({
          label: Backdrop.t('Insert row above'),
          icon: '<svg width="76px" height="76px" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" enable-background="new 0 0 76.00 76.00" xml:space="preserve"><path fill="currentColor" fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 14,27L 46,27L 46,38L 40,38L 40,54L 14,54L 14,27 Z M 43,35L 43,30L 17,30L 17,35L 43,35 Z M 37,38L 17,38L 17,43L 37,43L 37,38 Z M 37,46L 17,46L 17,51L 37,51L 37,46 Z M 50,30L 55,30L 55,25L 60,25L 60,30L 65,30L 65,35L 60,35L 60,40L 55,40L 55,35L 50,35L 50,30 Z "/></svg>',
          tooltip: false,
          withText: true
        });
        buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');
        this.listenTo(buttonView, 'execute', () => editor.execute('insertAccordionRowAbove'));

        return buttonView;
      });

      editor.ui.componentFactory.add('accordionAddBelow', locale => {
        const command = editor.commands.get('insertAccordionRowBelow');
        const buttonView = new CKEditor5.ButtonView(locale);
        buttonView.set({
          label: Backdrop.t('Insert row below'),
          icon: '<svg width="76px" height="76px" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="full" enable-background="new 0 0 76.00 76.00" xml:space="preserve"><path fill="currentColor" fill-opacity="1" stroke-width="0.2" stroke-linejoin="round" d="M 50,48L 50,43L 55,43L 55,38L 60,38L 60,43L 65,43L 65,48L 60,48L 60,53L 55,53L 55,48L 50,48 Z M 14,51L 14,24L 40,24L 40,40L 46,40L 46,51L 14,51 Z M 43,43L 17,43L 17,48L 43,48L 43,43 Z M 37,40L 37,35L 17,35L 17,40L 37,40 Z M 37,32L 37,27L 17,27L 17,32L 37,32 Z "/></svg>',
          tooltip: false,
          withText: true
        });
        buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');
        this.listenTo(buttonView, 'execute', () => editor.execute('insertAccordionRowBelow'));

        return buttonView;
      });

      editor.ui.componentFactory.add('accordionRemove', locale => {
        const command = editor.commands.get('deleteAccordionRow');
        const buttonView = new CKEditor5.ButtonView(locale);
        buttonView.set({
          label: Backdrop.t('Delete row'),
          icon: '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3H3v18h18V3H5zm14 2v14H5V5h14zm-3 6H8v2h8v-2z" fill="currentColor" /></svg>',
          tooltip: false,
          withText: true
        });
        buttonView.bind('isOn', 'isEnabled').to(command, 'value', 'isEnabled');
        this.listenTo(buttonView, 'execute', () => editor.execute('deleteAccordionRow'));

        return buttonView;
      });
    }
  }

  /**
   * Gets the selected accordion widget element from the view selection.
   */
  function getSelectedAccordionWidget(selection) {
    const selectedElement = selection.getSelectedElement();
    if (selectedElement && isAccordionWidget(selectedElement)) {
      return selectedElement;
    }
    return null;
  }

  /**
   * Gets the closest accordion widget element from the view selection.
   */
  function getClosestAccordionWidgetElement(selection) {
    const position = selection.getFirstPosition();
    if (!position) {
      return null;
    }
    let parent = position.parent;
    while (parent) {
      if (parent.is('element') && isAccordionWidget(parent)) {
        return parent;
      }
      parent = parent.parent;
    }
    return null;
  }

  /**
   * Checks whether a view element is an accordion widget.
   */
  function isAccordionWidget(viewElement) {
    return !!viewElement.hasClass('ckeditor-accordion') && CKEditor5.isWidget(viewElement);
  }

  /**
   * Toolbar plugin that provides contextual toolbars for accordions.
   */
  class AccordionToolbar extends CKEditor5.Plugin {
    /**
     * @inheritdoc
     */
    static get requires() {
      return [CKEditor5.WidgetToolbarRepository];
    }

    /**
     * @inheritdoc
     */
    static get pluginName() {
      return 'AccordionToolbar';
    }

    /**
     * @inheritdoc
     */
    afterInit() {
      const editor = this.editor;
      const widgetToolbarRepository = editor.plugins.get(CKEditor5.WidgetToolbarRepository);

      const accordionContentToolbarItems = editor.config.get('accordion.contentToolbar');

      const accordionToolbarItems = editor.config.get('accordion.tableToolbar');
      if (accordionContentToolbarItems) {
        widgetToolbarRepository.register('accordionContent', {
          ariaLabel: Backdrop.t('Accordion toolbar'),
          items: accordionContentToolbarItems,
          getRelatedElement: getClosestAccordionWidgetElement
        });
      }
      if (accordionToolbarItems) {
        widgetToolbarRepository.register('accordion', {
          ariaLabel: Backdrop.t('Accordion toolbar'),
          items: accordionToolbarItems,
          getRelatedElement: getSelectedAccordionWidget
        });
      }
    }
  }

})(CKEditor5);
