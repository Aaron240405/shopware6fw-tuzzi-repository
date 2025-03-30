import OffCanvas from 'src/plugin/offcanvas/offcanvas.plugin';
import Plugin from 'src/plugin-system/plugin.class';
import DomAccess from 'src/helper/dom-access.helper';

export default class CustomOffCanvasFilter extends Plugin {
    init() {
        this._customProductGridRows = document.querySelector('.cms-element-custom-product-grid-rows');
        this._filterContent = document.querySelector('[data-off-canvas-filter-content="true"]');
        this._isOffCanvasOpen = false;
        this._isProcessing = false; // Spamschutz
        this._handleCustomProductGridRowsInitial();
        this._registerEventListeners();
    }

    /**
     * Register event listeners
     * @private
     */
    _registerEventListeners() {
        this.el.addEventListener('click', this._onClickOffCanvasFilter.bind(this));
    }

    /**
     * Filter Offcanvas öffnen
     * @param {Event} event
     * @private
     */
    _onClickOffCanvasFilter(event) {
        event.preventDefault();
        
        // Spamschutz: Verhindere schnelles mehrfaches Klicken
        if (this._isProcessing) {
            return;
        }
        
        this._isProcessing = true;
        
        // Schließe das Offcanvas, wenn es bereits offen ist
        if (this._isOffCanvasOpen) {
            OffCanvas.close();
            this._isOffCanvasOpen = false;
            
            // Sperre für 300ms aufheben (nach Animation)
            setTimeout(() => {
                this._isProcessing = false;
            }, 300);
            
            return;
        }

        if (!this._filterContent) {
            this._isProcessing = false;
            throw Error('Filter content element not found');
        }

        // Vor dem Klonen sicherstellen, dass der Original-Inhalt korrekt sortiert ist
        this._ensureCorrectFilterOrder(this._filterContent);

        // Inhalt klonen, um Original nicht zu verändern
        const clone = document.createElement('div');
        clone.innerHTML = this._filterContent.innerHTML;

        // Herstellerfilter entfernen
        this._removeManufacturerFilter(clone);
        
        // Noch einmal sicherstellen, dass die Filter im geklonten Inhalt korrekt sortiert sind
        this._ensureCorrectFilterOrder(clone);
        
        // UI-Elemente für Offcanvas ergänzen
        this._addSortingToFilterPanel(clone);
        this._addApplyResetButtons(clone);

        // Offcanvas öffnen
        // Offcanvas öffnen - verbessere das Timing der Initialisierung
OffCanvas.open(
    clone.innerHTML,
    () => {
        // Verzögerte mehrfache Ausführung der Filter-Initialisierung
        setTimeout(() => this._setupOffCanvasEvents(), 10);
        
        // Erste Überprüfung von disabled Elementen
        setTimeout(() => this._ensureDisabledElementsAreMarked(), 50);
        
        // Zweite Überprüfung mit längerer Verzögerung
        setTimeout(() => this._ensureDisabledElementsAreMarked(), 150);
        
        // Dritte Überprüfung für Sicherheit
        setTimeout(() => this._ensureDisabledElementsAreMarked(), 300);
        
        // Sicherstellen, dass die Sortierung stimmt
        setTimeout(() => this._ensureCorrectFilterOrderInOffcanvas(), 100);
    },
    'right',
    true,
    OffCanvas.REMOVE_OFF_CANVAS_DELAY(),
    false,
    'offcanvas-filter'
);
    
        // Original-Filter aus DOM entfernen
        const filterPanel = DomAccess.querySelector(this._filterContent, '.filter-panel');
        if (filterPanel) filterPanel.remove();
    
        // Listing aktualisieren
        this._refreshListing();
        
        // Offcanvas-Schließen-Event abonnieren
        document.$emitter.subscribe('onCloseOffcanvas', this._onCloseOffCanvas.bind(this));
    
        // Status aktualisieren
        this._isOffCanvasOpen = true;
        
        // Event auslösen
        this.$emitter.publish('onClickOffCanvasFilter');
        
        // Sperre nach 300ms aufheben
        setTimeout(() => {
            this._isProcessing = false;
        }, 300);
    }

    /**
 * Sicherstellen, dass deaktivierte Elemente deutlich markiert sind
 * @private
 */
_ensureDisabledElementsAreMarked() {
    console.log('Checking disabled elements...');
    
    // Alle Checkboxen im Offcanvas durchsuchen
    document.querySelectorAll('.offcanvas input[type="checkbox"]').forEach(checkbox => {
        // Wenn das Element deaktiviert ist
        if (checkbox.disabled) {
            // Finde zugehörigen Button/Label
            const forId = checkbox.id;
            const button = document.querySelector(`.offcanvas label[for="${forId}"]`);
            
            if (button) {
                // CSS-Klassen für deaktivierte Elemente hinzufügen
                button.classList.add('disabled', 'unavailable');
                
                // Direkte Inline-Styles setzen (Überschreibt eventuelles CSS)
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.5';
                button.style.backgroundColor = '#f0f0f0';
                button.style.color = '#999';
                button.style.cursor = 'not-allowed';
                button.style.borderColor = '#ddd';
                
                // Preview-Elemente falls vorhanden
                const preview = document.querySelector(`.filter-property-select-preview[title="${checkbox.dataset.label}"]`);
                if (preview) {
                    preview.style.opacity = '0.5';
                    preview.style.pointerEvents = 'none';
                }
            }
        }
    });
    
    // Zusätzlich: Force-Update durch kleine DOM-Manipulation (hilft bei Rendering-Problemen)
    const offcanvas = document.querySelector('.offcanvas');
    if (offcanvas) {
        const temp = document.createElement('div');
        temp.style.display = 'none';
        offcanvas.appendChild(temp);
        setTimeout(() => {
            if (temp.parentNode) {
                temp.parentNode.removeChild(temp);
            }
        }, 10);
    }
}

    /**
 * Stellt sicher, dass die Filter in der richtigen Reihenfolge sind
 * @param {HTMLElement} element - Das Element, das die Filter enthält
 * @private
 */
_ensureCorrectFilterOrder(element) {
    const filterContainer = element.querySelector('.filter-panel-items-container');
    if (!filterContainer) return;
    
    // Filter identifizieren
    let sizeFilter = null;
    let colorFilter = null;
    
    // Alle Filter durchsuchen
    Array.from(filterContainer.children).forEach(filter => {
        const titleEl = filter.querySelector('.filter-panel-item-title');
        if (!titleEl) return;
        
        const titleText = titleEl.textContent.trim().toLowerCase();
        
        // Filter nach Titel identifizieren
        if (titleText === 'größe' || titleText === 'size' || 
            titleText.includes('größe') || titleText.includes('groesse') || 
            titleText.includes('size')) {
            sizeFilter = filter;
        } 
        else if (titleText === 'farbe' || titleText === 'color' || 
                titleText.includes('farbe') || titleText.includes('color')) {
            colorFilter = filter;
        }
    });
    
    // Wenn beide Filter gefunden wurden und Farbe vor Größe ist
    if (sizeFilter && colorFilter) {
        const sizeIndex = Array.from(filterContainer.children).indexOf(sizeFilter);
        const colorIndex = Array.from(filterContainer.children).indexOf(colorFilter);
        
        if (colorIndex < sizeIndex) {
            // Größe vor Farbe verschieben
            filterContainer.insertBefore(sizeFilter, colorFilter);
        }
    }
}

/**
 * Stellt sicher, dass die Filter im geöffneten Offcanvas in der richtigen Reihenfolge sind
 * @private
 */
_ensureCorrectFilterOrderInOffcanvas() {
    const offcanvas = document.querySelector('.offcanvas');
    if (offcanvas) {
        this._ensureCorrectFilterOrder(offcanvas);
    }
}

    /**
 * Handle off-canvas close event
 * @private
 */
_onCloseOffCanvas(event) {
    const oldChildNode = event.detail.offCanvasContent[0];
    
    // Entferne UI-Elemente, die nur für Offcanvas sind
    this._cleanupOffcanvasElements(oldChildNode);
    
    // Inhalte zurück in original verschieben
    if (this._filterContent) {
        this._filterContent.innerHTML = oldChildNode.innerHTML;
    }

    document.$emitter.unsubscribe('onCloseOffcanvas', this._onCloseOffCanvas.bind(this));
    
    // Listing aktualisieren
    this._refreshListing();
    
    // Status aktualisieren
    this._isOffCanvasOpen = false;
}

/**
 * Cleanup Offcanvas-spezifische Elemente
 * @private
 */
_cleanupOffcanvasElements(container) {
    // Entferne Buttons
    const buttonsContainer = container.querySelector('.filter-panel-actions');
    if (buttonsContainer) buttonsContainer.remove();

    // Entferne Sortierung
    const sortingPanel = container.querySelector('.filter-panel-sorting');
    if (sortingPanel && sortingPanel.parentElement) sortingPanel.parentElement.remove();
    
    // Entferne aktive Filter
    const activeFilterContainer = container.querySelector('.filter-panel-active-container');
    if (activeFilterContainer) activeFilterContainer.remove();
}

/**
 * Refresh Listing Plugin
 * @private
 */
_refreshListing() {
    const listingInstance = window.PluginManager.getPluginInstances('Listing')[0];
    if (listingInstance) listingInstance.refreshRegistry();
}

/**
 * Erste Prüfung und Handhabung der Custom Rows
 * @private
 */
_handleCustomProductGridRowsInitial() {
    if (!this._customProductGridRows) return;
    
    // Prüfe URL auf aktive Filter
    const hasFilters = this._checkForActiveFilters();
    
    if (hasFilters) {
        this._hideCustomRows();
    } else {
        // Keine Filter = Custom Rows anzeigen und sessionStorage leeren
        sessionStorage.removeItem('hideCustomRows');
        this._showCustomRows();
    }
}

/**
 * Prüft URL auf aktive Filter
 * @return {boolean}
 * @private
 */
_checkForActiveFilters() {
    const url = new URL(window.location.href);
    let hasFilters = false;
    
    url.searchParams.forEach((value, key) => {
        if (key !== 'p') { // Pagination ignorieren
            hasFilters = true;
        }
    });
    
    return hasFilters;
}

/**
 * Custom Rows verstecken
 * @private
 */
_hideCustomRows() {
    if (!this._customProductGridRows) return;
    
    // Komplettverstecken für Custom Rows
    this._customProductGridRows.classList.add('d-none');
    this._customProductGridRows.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important;';
    
    // Zustand in Session speichern
    sessionStorage.setItem('hideCustomRows', 'true');
}

/**
 * Custom Rows anzeigen
 * @private
 */
_showCustomRows() {
    if (!this._customProductGridRows) return;
    
    // Alle versteckenden Attribute entfernen
    this._customProductGridRows.classList.remove('d-none');
    this._customProductGridRows.style.cssText = '';
}

/**
 * Verbesserter Preis-Slider für den Filter
 * @private
 */
_addPriceRangeSlider() {
    // Find the price filter container
    const priceContainer = document.querySelector('.offcanvas .filter-range');
    if (!priceContainer) return;
    
    // Prüfen, ob bereits ein benutzerdefinierter Slider existiert
    if (priceContainer.querySelector('.custom-price-filter-container')) {
        return; // Bereits vorhanden, nicht erneut hinzufügen
    }
    
    // Find input elements
    const origMinInput = priceContainer.querySelector('input[name="min-price"]');
    const origMaxInput = priceContainer.querySelector('input[name="max-price"]');
    
    if (!origMinInput || !origMaxInput) return;
    
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Determine values with priority to URL parameters
    const minPrice = 0;
    const maxPrice = 300;
    const currentMinValue = parseInt(urlParams.get('min-price') || origMinInput.value || minPrice, 10);
    const currentMaxValue = parseInt(urlParams.get('max-price') || origMaxInput.value || maxPrice, 10);
    
    // Create HTML for price slider
    const sliderHTML = this._createPriceSliderHTML(minPrice, maxPrice, currentMinValue, currentMaxValue);
    
    // Remove original price filter elements
    this._cleanupOriginalPriceFilter(priceContainer);
    
    // Insert new price slider
    const newFilterContainer = document.createElement('div');
    newFilterContainer.innerHTML = sliderHTML;
    priceContainer.appendChild(newFilterContainer);
    
    // Remove original inputs
    if (origMinInput.parentNode) origMinInput.parentNode.removeChild(origMinInput);
    if (origMaxInput.parentNode) origMaxInput.parentNode.removeChild(origMaxInput);
    
    // Setup slider behavior
    this._setupPriceSliderLogic(priceContainer, minPrice, maxPrice);
}

/**
 * Ermittelt die aktuelle Währung
 * @returns {string} Währungssymbol (€ oder CHF)
 * @private
 */
_getCurrentCurrency() {
    // Versuche zuerst, die Währung aus dem DOM zu ermitteln
    const currencyElement = document.querySelector('.top-bar-currency .dropdown-toggle span:first-child');
    if (currencyElement) {
        const currencyText = currencyElement.textContent.trim();
        if (currencyText.includes('CHF')) {
            return 'CHF';
        } else if (currencyText.includes('€')) {
            return '€';
        }
    }
    
    // Alternativ: Währung aus der URL ableiten
    const path = window.location.pathname;
    const urlParts = path.split('/');
    
    // Durchsuche alle Pfadteile nach dem Muster xx-xx
    for (const part of urlParts) {
        if (part.match(/^[a-z]{2}-[a-z]{2}$/)) {
            const countryCode = part.split('-')[0];
            // Verwende das Länder-Währungs-Mapping
            if (countryCode === 'ch') {
                return 'CHF';
            }
            break;
        }
    }
    
    // Standard: Euro
    return '€';
}

/**
 * HTML für Preisslider erzeugen mit korrekter Währung
 * @private
 */
_createPriceSliderHTML(minPrice, maxPrice, currentMinValue, currentMaxValue) {
    const currency = this._getCurrentCurrency();
    
    return `
        <div class="custom-price-filter-container">
            <div class="custom-price-slider">
                <div class="slider-track"></div>
                <input type="range" class="min-slider" min="${minPrice}" max="${maxPrice}" value="${currentMinValue}">
                <input type="range" class="max-slider" min="${minPrice}" max="${maxPrice}" value="${currentMaxValue}">
            </div>
            
            <div class="price-inputs">
                <div class="price-input-group">
                    <input type="number" class="price-input min-price-input" 
                           min="${minPrice}" max="${maxPrice}" value="${currentMinValue}" 
                           placeholder="Min">
                    <span class="price-currency">${currency}</span>
                </div>
                <div class="price-input-group">
                    <input type="number" class="price-input max-price-input" 
                           min="${minPrice}" max="${maxPrice}" value="${currentMaxValue}" 
                           placeholder="Max">
                    <span class="price-currency">${currency}</span>
                </div>
            </div>
            
            <!-- Hidden inputs that will be submitted with the form -->
            <input type="hidden" name="min-price" value="${currentMinValue}">
            <input type="hidden" name="max-price" value="${currentMaxValue}">
        </div>
    `;
}

/**
 * Original-Preis-Filter entfernen
 * @private
 */
_cleanupOriginalPriceFilter(priceContainer) {
    const dropdownToggle = priceContainer.querySelector('.filter-range-dropdown-toggle');
    const dropdownMenu = priceContainer.querySelector('.filter-range-dropdown');
    
    if (dropdownToggle) dropdownToggle.remove();
    if (dropdownMenu) dropdownMenu.remove();
}

/**
 * Slider-Logik einrichten
 * @private
 */
_setupPriceSliderLogic(priceContainer, minPrice, maxPrice) {
    const minSlider = priceContainer.querySelector('.min-slider');
    const maxSlider = priceContainer.querySelector('.max-slider');
    const minPriceInput = priceContainer.querySelector('.min-price-input');
    const maxPriceInput = priceContainer.querySelector('.max-price-input');
    const track = priceContainer.querySelector('.slider-track');
    const hiddenMinInput = priceContainer.querySelector('input[name="min-price"]');
    const hiddenMaxInput = priceContainer.querySelector('input[name="max-price"]');
    
    // Funktion zum Aktualisieren aller Slider-Elemente
    const updateSlider = () => {
        const minVal = parseInt(minSlider.value);
        const maxVal = parseInt(maxSlider.value);
        
        // Update inputs
        minPriceInput.value = minVal;
        maxPriceInput.value = maxVal;
        hiddenMinInput.value = minVal;
        hiddenMaxInput.value = maxVal;
        
        // Update slider track
        const minPercent = ((minVal - minPrice) / (maxPrice - minPrice)) * 100;
        const maxPercent = ((maxVal - minPrice) / (maxPrice - minPrice)) * 100;
        
        track.style.left = `${minPercent}%`;
        track.style.width = `${maxPercent - minPercent}%`;
    };
    
    // Min-Slider Events
    minSlider.addEventListener('input', () => {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        
        if (minVal > maxVal - 10) {
            minSlider.value = maxVal - 10;
        }
        
        updateSlider();
    });
    
    // Max-Slider Events
    maxSlider.addEventListener('input', () => {
        let minVal = parseInt(minSlider.value);
        let maxVal = parseInt(maxSlider.value);
        
        if (maxVal < minVal + 10) {
            maxSlider.value = minVal + 10;
        }
        
        updateSlider();
    });
    
    // Min-Input Events
    minPriceInput.addEventListener('change', () => {
        let minVal = parseInt(minPriceInput.value);
        let maxVal = parseInt(maxPriceInput.value);
        
        if (isNaN(minVal)) minVal = minPrice;
        if (minVal < minPrice) minVal = minPrice;
        if (minVal > maxVal - 10) minVal = maxVal - 10;
        
        minPriceInput.value = minVal;
        minSlider.value = minVal;
        updateSlider();
    });
    
    // Max-Input Events
    maxPriceInput.addEventListener('change', () => {
        let minVal = parseInt(minPriceInput.value);
        let maxVal = parseInt(maxPriceInput.value);
        
        if (isNaN(maxVal)) maxVal = maxPrice;
        if (maxVal > maxPrice) maxVal = maxPrice;
        if (maxVal < minVal + 10) maxVal = minVal + 10;
        
        maxPriceInput.value = maxVal;
        maxSlider.value = maxVal;
        updateSlider();
    });
    
    // Initial update
    updateSlider();
}

/**
 * Herstellerfilter entfernen
 * @private
 */
_removeManufacturerFilter(contentElement) {
    // Suche nach dem Herstellerfilter im DOM
    const manufacturerFilters = contentElement.querySelectorAll('.filter-multi-select-manufacturer, [data-filter-type="manufacturer"]');
    
    // Entferne alle gefundenen Herstellerfilter
    manufacturerFilters.forEach(filter => {
        if (filter && filter.parentNode) {
            filter.parentNode.removeChild(filter);
        }
    });
    
    // Alternativ: Auch nach Titel-Text suchen, falls keine spezifische Klasse vorhanden ist
    const filterTitles = contentElement.querySelectorAll('.filter-panel-item-title');
    filterTitles.forEach(title => {
        const titleText = title.textContent.toLowerCase().trim();
        if (titleText.includes('hersteller') || titleText.includes('marke') || titleText.includes('brand') || titleText.includes('manufacturer')) {
            const filterItem = title.closest('.filter-panel-item');
            if (filterItem && filterItem.parentNode) {
                filterItem.parentNode.removeChild(filterItem);
            }
        }
    });
}

/**
 * Fügt Sortierung zum Filter hinzu
 * @private
 */
_addSortingToFilterPanel(contentElement) {

    // Prüfen, ob bereits eine Sortierung im Panel vorhanden ist und ALLE entfernen
    const existingSortings = contentElement.querySelectorAll('.filter-panel-item[data-sortierung="true"]');
    existingSortings.forEach(item => item.remove());
    
    const sortingElement = document.querySelector('.sorting');
    if (!sortingElement) return;

    // Sortierung klonen und vorbereiten
    const sortingClone = sortingElement.cloneNode(true);
    sortingClone.classList.add('filter-panel-sorting');
    
    // Container erstellen
    const sortingContainer = document.createElement('div');
    sortingContainer.classList.add('filter-panel-item');
    sortingContainer.setAttribute('data-sortierung', 'true'); // Marker für Erkennung
    
    // Header erstellen
    const sortingHeader = document.createElement('div');
    sortingHeader.classList.add('filter-panel-item-header');
    sortingHeader.innerHTML = '<h2 class="filter-panel-item-title">Sortierung</h2>';
    
    // Content erstellen
    const sortingContent = document.createElement('div');
    sortingContent.classList.add('filter-panel-item-content');
    
    // Das geklonte Select-Element verstecken, aber behalten
    sortingClone.style.display = 'none';
    sortingContent.appendChild(sortingClone);
    
    // Sortieroptionen als Buttons darstellen
    const sortOptions = [
        { value: 'name-asc', label: 'Name A-Z' },
        { value: 'name-desc', label: 'Name Z-A' },
        { value: 'price-asc', label: 'Preis aufsteigend' },
        { value: 'price-desc', label: 'Preis absteigend' },
        { value: 'topseller', label: 'Beliebtheit' },
        { value: 'rating', label: 'Bewertung' }
    ];
    
    // URL-Parameter abrufen
    const urlParams = new URLSearchParams(window.location.search);
    const currentSorting = urlParams.get('order') || urlParams.get('sorting') || 'name-asc';
    
    // Button-Container erstellen
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('sorting-button-container');
    
    // Sortieroptionen als Buttons erstellen
    sortOptions.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('sorting-button');
        button.setAttribute('data-value', option.value);
        button.textContent = option.label;
        
        // Aktiven Button markieren
        if (option.value === currentSorting) {
            button.classList.add('active');
        }
        
        // Beim Klick das versteckte Select aktualisieren
        button.addEventListener('click', () => {
            // Alle aktiven Klassen entfernen
            buttonContainer.querySelectorAll('.sorting-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Diesen Button aktivieren
            button.classList.add('active');
            
            // Das versteckte Select aktualisieren
            const selectElement = sortingClone.querySelector('select');
            if (selectElement) {
                selectElement.value = option.value;
            }
        });
        
        buttonContainer.appendChild(button);
    });
    
    sortingContent.appendChild(buttonContainer);
    
    // Alles zusammenfügen
    sortingContainer.appendChild(sortingHeader);
    sortingContainer.appendChild(sortingContent);
    
    // In Panel einfügen
    const filterPanel = contentElement.querySelector('.filter-panel-items-container');
    if (filterPanel) {
        filterPanel.appendChild(sortingContainer);
    }
    
    // Preisfilter vorbereiten
    this._preparePriceFilter(contentElement);
}

/**
 * Preis-Filter vorbereiten
 * @private
 */
_preparePriceFilter(contentElement) {
    const priceRangeFilters = contentElement.querySelectorAll('.filter-range');
    priceRangeFilters.forEach(filter => {
        const dropdownContainer = filter.querySelector('.filter-range-dropdown');
        if (dropdownContainer) {
            dropdownContainer.style.display = 'block';
            dropdownContainer.classList.remove('dropdown', 'dropdown-menu');
            
            const dropdownButton = filter.querySelector('.filter-range-dropdown-toggle');
            if (dropdownButton) {
                dropdownButton.style.display = 'none';
            }
        }
    });
}

/**
 * Buttons zum Anwenden und Zurücksetzen hinzufügen
 * @private
 */
_addApplyResetButtons(contentElement) {
    const filterPanel = contentElement.querySelector('.filter-panel');
    if (!filterPanel) return;
    
    // Prüfen, ob bereits Buttons vorhanden sind
    if (filterPanel.querySelector('.filter-panel-actions')) {
      return; // Buttons bereits vorhanden, nicht erneut hinzufügen
    }
    
    // Container erstellen
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('filter-panel-actions', 'pt-4', 'pb-4', 'p-3', 'd-flex', 'w-100', 'justify-content-between', 'align-items-center');
    
    // Übersetzungen aus dem DOM holen, wenn verfügbar
    const applyText = window.trans ? window.trans('filter.applyButton', 'Filter anwenden') : 'Filter anwenden';
    const resetText = window.trans ? window.trans('filter.resetButton', 'Zurücksetzen') : 'Zurücksetzen';
    
    // Anwenden-Button
    const applyButton = document.createElement('button');
    applyButton.classList.add('btn', 'btn-primary', 'apply-filter-button');
    applyButton.setAttribute('type', 'button');
    applyButton.textContent = applyText;
    
    // Reset-Button
    const resetButton = document.createElement('button');
    resetButton.classList.add('btn', 'btn-outline-secondary', 'custom-filter-reset-all');
    resetButton.setAttribute('type', 'button');
    resetButton.textContent = resetText;
    
    // Buttons einfügen
    buttonContainer.appendChild(resetButton);
    buttonContainer.appendChild(applyButton);
    filterPanel.appendChild(buttonContainer);
  }

/**
 * Offcanvas-Events einrichten
 * @private
 */
_setupOffCanvasEvents() {
    // Filter-Komponenten reaktivieren
    this._reinitializeFilterComponents();
    
    // Active Filter entfernen
    this._removeActiveFilterContainer();
    
    // Filter aus URL wiederherstellen
    this._restoreActiveFilters();
    
    // Filter-Typen identifizieren für spezifisches Styling
    this._identifyFilterTypes();

    // Tracking für disabled Status einrichten
    this._setupDisabledStatusTracking();
    
    // UL/LI-Listen in Grid-Container umwandeln
    this._convertListsToGridContainers();

    // Button-Layout optimieren
    this._optimizeButtonLayout();
    
    // Apply/Reset Buttons einrichten
    this._setupActionButtons();
    
    // Sortierungsbuttons einrichten
    this._setupSortingButtons();
    
    // Aktive Filter-Styles wiederherstellen
    this._restoreMultiSelectStylesAfterReopen();

    // Nach jeder Checkbox-Änderung disabled-Status neu prüfen
    document.querySelectorAll('.offcanvas input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Kurze Verzögerung für Shopware, um Verfügbarkeiten zu aktualisieren
            setTimeout(() => this._ensureDisabledElementsAreMarked(), 100);
        });
    });

    // Periodische Überprüfung für mehrere Sekunden
    let checkCount = 0;
    const intervalId = setInterval(() => {
        this._ensureDisabledElementsAreMarked();
        checkCount++;
        if (checkCount >= 10) { // Nach 10 Prüfungen (5 Sekunden) aufhören
            clearInterval(intervalId);
        }
    }, 500);
}

/**
 * Active-Filter-Container entfernen
 * @private
 */
_removeActiveFilterContainer() {
    const activeFilterContainer = document.querySelector('.offcanvas .filter-panel-active-container');
    if (activeFilterContainer) {
        activeFilterContainer.remove();
    }
}

/**
 * Filter-Komponenten reaktivieren und Observer für disabled-Status einrichten
 * @private
 */
_reinitializeFilterComponents() {
    // Akkordion-Logik
    this._setupAccordionToggles();
    
    // Multi-Select-Buttons aktivieren
    this._setupMultiSelectButtons();
    
    // Verbesserten Preisfilter hinzufügen
    this._addPriceRangeSlider();
    
    // MutationObserver für disabled-Status einrichten
    this._setupDisabledObserver();
}

/**
 * MutationObserver für disabled-Status einrichten
 * @private
 */
_setupDisabledObserver() {
    // MutationObserver für disabled-Attribute
    const observer = new MutationObserver((mutations) => {
        let hasDisabledChanges = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'disabled' && 
                mutation.target.matches('input[type="checkbox"]')) {
                hasDisabledChanges = true;
            }
        });
        
        // Nur einmal ausführen, wenn Änderungen festgestellt wurden
        if (hasDisabledChanges) {
            this._ensureDisabledElementsAreMarked();
        }
    });
    
    // Alle Checkboxen beobachten
    document.querySelectorAll('.offcanvas input[type="checkbox"]').forEach(checkbox => {
        observer.observe(checkbox, { attributes: true });
    });
}

/**
 * Tracking für disabled Status einrichten
 * @private
 */
_setupDisabledStatusTracking() {
    // Speichere initial den disabled-Status aller Checkboxen
    const disabledMap = new Map();
    document.querySelectorAll('.offcanvas input[type="checkbox"]').forEach(checkbox => {
        disabledMap.set(checkbox.id, checkbox.disabled);
        
        // Bei Änderungen an Filtern
        checkbox.addEventListener('change', () => {
            // Warte kurz und aktualisiere dann die Map
            setTimeout(() => {
                document.querySelectorAll('.offcanvas input[type="checkbox"]').forEach(box => {
                    disabledMap.set(box.id, box.disabled);
                });
                this._applyDisabledStatusFromMap(disabledMap);
            }, 200);
        });
    });
}

/**
 * Disabled-Status aus der Map anwenden
 * @private
 */
_applyDisabledStatusFromMap(disabledMap) {
    disabledMap.forEach((isDisabled, id) => {
        const checkbox = document.getElementById(id);
        const label = document.querySelector(`label[for="${id}"]`);
        
        if (checkbox && label) {
            if (isDisabled) {
                // Checkbox und Label ausgrauen
                checkbox.disabled = true;
                label.classList.add('disabled', 'unavailable');
                label.style.pointerEvents = 'none';
                label.style.opacity = '0.5';
            }
        }
    });
}

/**
 * Akkordion-Logik entfernen und alle Filter mit einheitlicher Überschrift versehen
 * @private
 */
_setupAccordionToggles() {
    // Zuerst die Überschriften aus den Toggle-Buttons extrahieren
    document.querySelectorAll('.offcanvas .filter-panel-item').forEach(item => {
        // Prüfen ob bereits eine Überschrift vorhanden ist
        if (item.querySelector('.filter-panel-item-title')) {
            // Alle doppelten Headers entfernen, nur den ersten behalten
            const headers = item.querySelectorAll('.filter-panel-item-header');
            for (let i = 1; i < headers.length; i++) {
                headers[i].remove();
            }
            return; // Dieser Filter hat bereits eine Überschrift
        }
        
        // Suche nach Toggle-Button und Content
        const toggle = item.querySelector('.filter-panel-item-toggle');
        const content = item.querySelector('.filter-panel-item-content') || 
                        item.querySelector('.filter-multi-select-list-container');
        
        if (toggle && content) {
            // Extrahiere den Text aus dem Toggle-Button (ohne Zahl-Angaben)
            let titleText = toggle.textContent.trim();
            titleText = titleText.replace(/\s*\(\d+\)\s*$/, ''); // Entferne "(X)" am Ende
            
            // Erstelle einen neuen Header mit dem Text
            const headerContainer = document.createElement('div');
            headerContainer.classList.add('filter-panel-item-header');
            headerContainer.innerHTML = `<h2 class="filter-panel-item-title">${titleText}</h2>`;
            
            // Toggle-Button ausblenden und Header einfügen
            toggle.style.display = 'none';
            
            // Finde den richtigen Platz für den Header
            if (toggle.parentNode) {
                const toggleParent = toggle.parentNode;
                if (toggleParent !== item) {
                    // Der Toggle ist in einem Wrapper - ersetze diesen
                    item.insertBefore(headerContainer, toggleParent);
                    toggleParent.style.display = 'none';
                } else {
                    // Der Toggle ist direkt im Item
                    item.insertBefore(headerContainer, content);
                }
            }
            
            // Stelle sicher, dass der Content immer sichtbar ist
            content.style.display = 'block';
            content.classList.remove('collapse', 'collapsing');
            
            // Entferne alle aria-Attribute, die das Akkordeon steuern
            toggle.removeAttribute('aria-expanded');
            content.removeAttribute('aria-hidden');
        }
    });

    
    
    // Spezialbehandlung für Filter-Multi-Select-Elemente
    document.querySelectorAll('.offcanvas .filter-multi-select').forEach(filter => {
        // Prüfen ob bereits eine Überschrift vorhanden ist
        if (filter.querySelector('.filter-panel-item-title')) {
            // Alle doppelten Headers entfernen, nur den ersten behalten
            const headers = filter.querySelectorAll('.filter-panel-item-header');
            for (let i = 1; i < headers.length; i++) {
                headers[i].remove();
            }
            return; // Dieser Filter hat bereits eine Überschrift
        }
        
        if (!filter.querySelector('.filter-panel-item-title')) {
            // Suche nach dem Toggle-Button
            const toggle = filter.querySelector('.filter-panel-item-toggle, button[aria-expanded]');
            const content = filter.querySelector('.filter-multi-select-list-container');
            
            if (toggle && content) {
                // Extrahiere den Text
                let titleText = toggle.textContent.trim();
                titleText = titleText.replace(/\s*\(\d+\)\s*$/, ''); // Entferne "(X)" am Ende
                
                // Erstelle Header
                const headerContainer = document.createElement('div');
                headerContainer.classList.add('filter-panel-item-header');
                headerContainer.innerHTML = `<h2 class="filter-panel-item-title">${titleText}</h2>`;
                
                // Toggle ausblenden und Header einfügen
                toggle.style.display = 'none';
                filter.insertBefore(headerContainer, content);
                
                // Content sichtbar machen
                content.style.display = 'block';
            }
        }
    });
    
    // Spezialbehandlung für Preisfilter
    document.querySelectorAll('.offcanvas .filter-range').forEach(filter => {
        // Prüfen ob bereits eine Überschrift vorhanden ist
        if (filter.querySelector('.filter-panel-item-title')) {
            return; // Dieser Filter hat bereits eine Überschrift
        }
        
        // Suche nach dem Toggle-Button
        const toggle = filter.querySelector('.filter-panel-item-toggle');
        if (toggle) {
            // Extrahiere den Text
            let titleText = toggle.textContent.trim();
            titleText = titleText.replace(/\s*\(\d+\)\s*$/, ''); // Entferne "(X)" am Ende
            
            // Erstelle Header
            const headerContainer = document.createElement('div');
            headerContainer.classList.add('filter-panel-item-header');
            headerContainer.innerHTML = `<h2 class="filter-panel-item-title">${titleText}</h2>`;
            
            // Header einfügen
            filter.insertBefore(headerContainer, filter.firstChild);
            
            // Toggle ausblenden
            toggle.style.display = 'none';
        }
    });
    
    // Stelle sicher, dass alle Filter-Inhalte sichtbar sind
    document.querySelectorAll('.offcanvas .filter-panel-item-content, .offcanvas .filter-multi-select-list-container').forEach(content => {
        content.style.display = 'block';
        content.classList.remove('collapse', 'collapsing');
    });
    
    // Stil für alle Filter-Überschriften vereinheitlichen
    document.querySelectorAll('.offcanvas .filter-panel-item-title').forEach(title => {
        title.style.fontSize = '16px';
        title.style.fontWeight = '600';
        title.style.marginBottom = '15px';
        title.style.display = 'block';
    });
}

/**
 * Multi-Select-Buttons aktivieren
 * @private
 */
_setupMultiSelectButtons() {
    document.querySelectorAll('.offcanvas .filter-multi-select-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const forAttr = button.getAttribute('for');
            if (forAttr) {
                const checkbox = document.getElementById(forAttr);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    button.classList.toggle('is-active', checkbox.checked);
                }
            }
            
            return false;
        });
    });
}

/**
 * Aktive Filter aus URL wiederherstellen
 * @private
 */
_restoreActiveFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Alle Parameter durchgehen
    urlParams.forEach((value, key) => {
        // Normale Checkboxen
        this._restoreCheckboxFilters(key, value);
        
        // Spezialfall: Properties
        if (key === 'properties') {
            this._restorePropertyFilters(value);
        }
        
        // Spezialfall: Preisfilter
        if (key === 'min-price' || key === 'max-price') {
            this._restorePriceFilter(key, value);
        }
    });
    
    // Sortierung wiederherstellen
    this._restoreSorting(urlParams);
}

/**
 * Checkbox-Filter wiederherstellen
 * @private
 */
_restoreCheckboxFilters(key, value) {
    document.querySelectorAll(`.offcanvas [name="${key}"][value="${value}"], .offcanvas [name="${key}[]"][value="${value}"]`).forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = true;
            
            // Auch Label aktivieren
            const label = document.querySelector(`.offcanvas label[for="${input.id}"]`);
            if (label) {
                label.classList.add('is-active');
            }
        } else {
            input.value = value;
        }
    });
}

/**
 * Property-Filter wiederherstellen
 * @private
 */
_restorePropertyFilters(value) {
    const properties = value.split('|');
    properties.forEach(propValue => {
        document.querySelectorAll('.offcanvas .filter-multi-select-checkbox').forEach(checkbox => {
            if (checkbox.value === propValue) {
                checkbox.checked = true;
                
                // Auch Label aktivieren
                const label = document.querySelector(`.offcanvas label[for="${checkbox.id}"]`);
                if (label) {
                    label.classList.add('is-active');
                }
            }
        });
    });
}

/**
 * MultiSelect Styles nach dem Neuöffnen wiederherstellen
 * @private
 */
_restoreMultiSelectStylesAfterReopen() {
    // 1. Aktive Checkboxen suchen und deren Buttons markieren
    document.querySelectorAll('.offcanvas .filter-multi-select-checkbox:checked').forEach(checkbox => {
        const button = document.querySelector(`.offcanvas .filter-multi-select-button[for="${checkbox.id}"]`);
        if (button) {
            button.classList.add('is-active');
            // Für bessere Sichtbarkeit auch die Textfarbe explizit setzen
            button.style.color = '#fff';
            button.style.backgroundColor = '#000';
        }
    });
    
    // 2. Forciere das Rendering mit einer kurzen Verzögerung
    setTimeout(() => {
        document.querySelectorAll('.offcanvas .filter-multi-select-button.is-active').forEach(button => {
            button.style.color = '#fff';
            button.style.backgroundColor = '#000';
        });
    }, 50);
}

/**
 * Preisfilter wiederherstellen
 * @private
 */
_restorePriceFilter(key, value) {
    const input = document.querySelector(`.offcanvas [name="${key}"]`);
    if (input) {
        input.value = value;
    }
}

/**
 * Sortierung wiederherstellen
 * @private
 */
_restoreSorting(urlParams) {
    const sortingValue = urlParams.get('order') || urlParams.get('sorting');
    if (!sortingValue) return;
    
    // UI des Sortierungsbuttons aktualisieren
    document.querySelectorAll('.offcanvas .sorting-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === sortingValue) {
            btn.classList.add('active');
        }
    });
    
    // Auch das versteckte Select aktualisieren
    const sortingSelect = document.querySelector('.offcanvas .sorting select');
    if (sortingSelect) {
        sortingSelect.value = sortingValue;
    }
}

/**
 * Filter-Typen identifizieren für spezifisches Styling
 * @private
 */
_identifyFilterTypes() {
    // Größen-Filter identifizieren und markieren
    document.querySelectorAll('.offcanvas .filter-multi-select').forEach(filter => {
        const title = filter.querySelector('.filter-panel-item-title');
        if (title) {
            const titleText = title.textContent.toLowerCase();
            if (titleText.includes('größe') || titleText.includes('groesse') || titleText.includes('size')) {
                filter.classList.add('filter-multi-select-size');
            } else if (titleText.includes('farbe') || titleText.includes('color')) {
                filter.classList.add('filter-multi-select-color');
            }
        }
    });
    
    // Farb-Filter speziell markieren
    document.querySelectorAll('.offcanvas .filter-color-list').forEach(list => {
        const container = list.closest('.filter-multi-select');
        if (container) {
            container.classList.add('filter-multi-select-color');
        }
    });
}

/**
 * Action-Buttons einrichten
 * @private
 */
_setupActionButtons() {
    // Apply-Button
    const applyButton = document.querySelector('.offcanvas .apply-filter-button');
    if (applyButton) {
        applyButton.addEventListener('click', this._onApplyFilter.bind(this));
    }
    
    // Reset-Button
    const resetButton = document.querySelector('.offcanvas .custom-filter-reset-all');
    if (resetButton) {
        resetButton.addEventListener('click', this._onResetFilter.bind(this));
    }
}

_onApplyFilter() {
    OffCanvas.close();
    // DIREKT zur neuen URL - KEIN Preload!
    this._updateFilterUrlAndReload();
}

_onResetFilter() {
    // DIREKT zur Basis-URL - KEIN Preload!
    const baseUrl = window.location.origin + window.location.pathname;
    window.location.href = baseUrl;
}

/**
 * Filter-URL aktualisieren und Seite neu laden
 * @private
 */
_updateFilterUrlAndReload() {
    const url = new URL(window.location.href);
    url.search = '';
    
    try {
        // Alle Filter im Shopware-Standard-Format sammeln
        const colorFilters = this._collectColorFilters();
        const sizeFilters = this._collectSizeFilters();
        
        // Farben als properties hinzufügen, wenn vorhanden
        if (colorFilters.length > 0) {
            url.searchParams.append('properties', colorFilters.join('|'));
        }
        
        // Größen als properties hinzufügen, wenn vorhanden (zum selben Parameter)
        if (sizeFilters.length > 0) {
            // Wenn bereits ein properties-Parameter existiert, vorhandene Werte abrufen
            let existingProperties = url.searchParams.has('properties') 
                ? url.searchParams.get('properties').split('|') 
                : [];
                
            // Größen hinzufügen und Parameter aktualisieren
            existingProperties = [...existingProperties, ...sizeFilters];
            
            // Vorhandenen Parameter entfernen und neu setzen
            url.searchParams.delete('properties');
            url.searchParams.append('properties', existingProperties.join('|'));
        }
        
        // Preisfilter hinzufügen
        this._collectPriceFilters(url);
        
        // Sortierung hinzufügen
        this._collectSortingOption(url);
        
        // Seitenzahl hinzufügen (p=1 für erste Seite)
        url.searchParams.append('p', '1');
        
        // Custom Rows Status setzen
        if (url.searchParams.toString() !== 'p=1') {
            sessionStorage.setItem('hideCustomRows', 'true');
        } else {
            sessionStorage.removeItem('hideCustomRows');
        }
        
        // Zur neuen URL navigieren
        window.location.href = url.toString();
    } catch (error) {
        console.error('Error updating filters:', error);
    }
}

/**
 * Farbfilter sammeln
 * @return {Array} Gesammelte Farb-IDs
 * @private
 */
_collectColorFilters() {
    const colorFilters = [];
    
    // Farb-Checkboxen sammeln
    document.querySelectorAll('.offcanvas .filter-color-list input[type="checkbox"]:checked').forEach(input => {
        colorFilters.push(input.value);
    });
    
    return colorFilters;
}

/**
 * Größenfilter sammeln
 * @return {Array} Gesammelte Größen-IDs
 * @private
 */
_collectSizeFilters() {
    const sizeFilters = [];
    
    // Größen-Checkboxen sammeln (keine Farben)
    document.querySelectorAll('.offcanvas .filter-multi-select-checkbox:checked').forEach(input => {
        if (!input.closest('.filter-color-list')) {
            sizeFilters.push(input.value);
        }
    });
    
    return sizeFilters;
}

/**
 * Preisfilter sammeln
 * @private
 */
_collectPriceFilters(url) {
    // Min-Preis
    const minPriceInput = document.querySelector('.offcanvas input[name="min-price"]');
    if (minPriceInput && minPriceInput.value !== "" && parseInt(minPriceInput.value) > 0) {
        url.searchParams.append('min-price', minPriceInput.value);
    }
    
    // Max-Preis
    const maxPriceInput = document.querySelector('.offcanvas input[name="max-price"]');
    if (maxPriceInput && maxPriceInput.value !== "" && parseInt(maxPriceInput.value) < 300) {
        url.searchParams.append('max-price', maxPriceInput.value);
    }
}

/**
 * Sortierung sammeln
 * @private
 */
_collectSortingOption(url) {
    // Zuerst versuchen, den Wert vom aktiven Sortierungsbutton zu bekommen
    const activeButton = document.querySelector('.offcanvas .sorting-button.active');
    if (activeButton && activeButton.dataset.value && activeButton.dataset.value !== 'name-asc') {
        url.searchParams.set('order', activeButton.dataset.value);
        return;
    }
    
    // Fallback auf das Select-Element
    const sortingSelect = document.querySelector('.offcanvas .sorting select');
    if (sortingSelect && sortingSelect.value !== 'name-asc') {
        url.searchParams.set('order', sortingSelect.value);
    }
}

/**
 * Event-Handler für Sortierungsbuttons einrichten
 * @private
 */
_setupSortingButtons() {
    // Event-Handler für Sortierungsbuttons hinzufügen
    document.querySelectorAll('.offcanvas .sorting-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Alle aktiven Klassen entfernen
            document.querySelectorAll('.offcanvas .sorting-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Diesen Button aktivieren
            button.classList.add('active');
            
            // Hidden Input aktualisieren
            const hiddenInput = document.querySelector('.offcanvas #sorting-value');
            if (hiddenInput) {
                hiddenInput.value = button.dataset.value;
            }
        });
    });
}

/**
 * Optimiert die Darstellung der Filter-Buttons basierend auf ihrem Text
 * @private
 */
_optimizeButtonLayout() {
    // Für alle Multi-Select-Buttons
    document.querySelectorAll('.offcanvas .filter-multi-select-button').forEach(button => {
      const text = button.textContent.trim();
      
      // Wenn es ein Größenfilter in einem Größen-Container ist
      if (button.closest('.filter-multi-select-size')) {
        // Kurze Texte (Zahlen wie 34, 36, etc.)
        if (/^\d{1,2}$/.test(text)) {
          button.classList.add('size-button');
        } 
        // Mittellange Texte (S, M, L, XL)
        else if (/^[SMLX]{1,3}$/.test(text)) {
          button.classList.add('size-button');
        }
        // Längere Texte (ONE SIZE, etc.)
        else {
          button.classList.add('longtext-button');
          
          // Sehr lange Texte bekommen noch mehr Platz
          if (text.length > 10) {
            button.classList.add('extralong-button');
          }
        }
      }
      
      // Für Hersteller und andere lange Texte
      if (text.length > 10 && !button.closest('.filter-multi-select-size')) {
        button.classList.add('longtext-button');
      }
      if (text.length > 15) {
        button.classList.add('extralong-button');
      }
    });
  }

/**
 * Konvertiert UL/LI-Listen in Grid-Container, aber baut die Event-Handler neu auf
 * @private
 */
_convertListsToGridContainers() {
    // Farbfilter umwandeln
    document.querySelectorAll('.offcanvas .filter-multi-select-color .filter-multi-select-list').forEach(list => {
        // Klonen statt neu erstellen, um Event-Handler ggf. zu behalten
        const originalStructure = list.cloneNode(true);
        
        // Neuen Grid-Container erstellen
        const gridContainer = document.createElement('div');
        gridContainer.className = 'filter-grid-container filter-color-grid';
        
        // Alle LI-Elemente durchgehen
        const items = Array.from(originalStructure.querySelectorAll('.filter-multi-select-list-item'));
        items.forEach(item => {
            // Neuen Grid-Item Container erstellen
            const gridItem = document.createElement('div');
            gridItem.className = 'filter-grid-item filter-color-item';
            
            // Original-ID und Klassen für spätere Referenz speichern
            const checkbox = item.querySelector('input[type="checkbox"]');
            const originalId = checkbox ? checkbox.id : null;
            const isChecked = checkbox && checkbox.checked;
            const isDisabled = checkbox && checkbox.disabled;
            
            // Inhalt des LI in den Grid-Item Container verschieben
            gridItem.innerHTML = item.innerHTML;
            
            // IDs wiederherstellen für Event-Bindung
            if (originalId) {
                const newCheckbox = gridItem.querySelector('input[type="checkbox"]');
                if (newCheckbox) {
                    newCheckbox.id = originalId;
                }
            }
            
            // Aktivstatus und Deaktivierungsstatus wiederherstellen
            if (isChecked || isDisabled) {
                const newCheckbox = gridItem.querySelector('input[type="checkbox"]');
                if (newCheckbox) {
                    newCheckbox.checked = isChecked;
                    newCheckbox.disabled = isDisabled;
                    
                    // Visuellen Status wiederherstellen
                    const newLabel = gridItem.querySelector('label');
                    if (newLabel) {
                        if (isChecked) newLabel.classList.add('is-active');
                        if (isDisabled) newLabel.classList.add('disabled');
                    }
                }
            }
            
            // Zum Grid-Container hinzufügen
            gridContainer.appendChild(gridItem);
        });
        
        // Alte Liste mit Grid-Container ersetzen
        list.parentNode.replaceChild(gridContainer, list);
        
        // Farb-Filter Event-Handler einrichten
        this._setupColorFilterEvents(gridContainer);
    });
    
    // Größenfilter umwandeln
    document.querySelectorAll('.offcanvas .filter-multi-select-size .filter-multi-select-list').forEach(list => {
        // Originale Liste für Referenz speichern
        const originalList = list;
        
        // Neuen Grid-Container erstellen
        const gridContainer = document.createElement('div');
        gridContainer.className = 'filter-grid-container filter-size-grid';
        
        // Alle LI-Elemente durchgehen und IDs/Referenzen speichern
        const items = Array.from(originalList.querySelectorAll('.filter-multi-select-list-item'));
        const originalRefs = items.map(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            return {
                id: checkbox ? checkbox.id : null,
                checked: checkbox ? checkbox.checked : false,
                disabled: checkbox ? checkbox.disabled : false,
                buttonText: item.querySelector('.filter-multi-select-button') ? 
                            item.querySelector('.filter-multi-select-button').textContent.trim() : ''
            };
        });
        
        // Größenfilter neu aufbauen
        items.forEach((item, index) => {
            const originalRef = originalRefs[index];
            
            // Neuen Grid-Item Container erstellen
            const gridItem = document.createElement('div');
            gridItem.className = 'filter-grid-item filter-size-item';
            
            // One Size oder längere Texte nehmen mehr Platz ein
            if (originalRef.buttonText.length > 3) {
                gridItem.className += ' filter-grid-item-wide';
            }
            
            // Inhalt klonen statt direkt zu verschieben
            gridItem.innerHTML = item.innerHTML;
            
            // IDs wiederherstellen - wichtig für Event-Binding
            const newCheckbox = gridItem.querySelector('input[type="checkbox"]');
            if (newCheckbox && originalRef.id) {
                newCheckbox.id = originalRef.id;
                newCheckbox.checked = originalRef.checked;
                newCheckbox.disabled = originalRef.disabled;
            }
            
            // Visuellen Status wiederherstellen
            const newButton = gridItem.querySelector('.filter-multi-select-button');
            if (newButton) {
                if (originalRef.checked) {
                    newButton.classList.add('is-active');
                    newButton.style.backgroundColor = '#000';
                    newButton.style.color = '#fff';
                }
                
                if (originalRef.disabled) {
                    newButton.classList.add('unavailable');
                }
            }
            
            // Zum Grid-Container hinzufügen
            gridContainer.appendChild(gridItem);
        });
        
        // Alte Liste ersetzen, aber Event-Handler erneut einrichten
        list.parentNode.replaceChild(gridContainer, list);
        
        // Größenfilter Event-Handler einrichten
        this._setupSizeFilterEventHandlers(gridContainer);
    });
    
    // Herstellerfilter-Umwandlung...
    // (Code für Herstellerfilter ähnlich wie oben)
}

/**
 * Aktualisiert die Verfügbarkeit der Filter in Echtzeit über Shopware Ajax
 * @param {HTMLElement} changedCheckbox - Die geänderte Checkbox
 * @private
 */
_updateFilterAvailabilityInRealtime(changedCheckbox) {
    const navElement = document.querySelector('[data-category-id]');
    if (!navElement) {
        console.warn('[OffCanvasFilter] Kein [data-category-id] Element gefunden.');
        return;
    }

    const navigationId = navElement.dataset.categoryId;
    if (!navigationId || navigationId.length < 10) {
        console.warn(`[OffCanvasFilter] Ungültige navigationId: "${navigationId}"`);
        return;
    }

    // Richtigen Endpoint ermitteln
    let endpoint = '';

    if (window.router?.frontend?.listing?.filter) {
        endpoint = window.router.frontend.listing.filter({ navigationId });
    } else {
        console.warn('[OffCanvasFilter] Kein Router verfügbar – fallback auf statische URL');
        endpoint = `/widgets/cms/filter?navigationId=${navigationId}`;
    }
    

    const formData = new FormData();

    // Alle aktivierten Checkboxen hinzufügen
    document.querySelectorAll('.offcanvas input[type="checkbox"]:checked').forEach(input => {
        const name = input.name;
        const value = input.value;

        if (name.endsWith('[]')) {
            formData.append(name, value);
        } else {
            formData.set(name, value);
        }
    });

    // Preisfilter hinzufügen
    const min = document.querySelector('.offcanvas input[name="min-price"]')?.value;
    const max = document.querySelector('.offcanvas input[name="max-price"]')?.value;
    if (min) formData.append('min-price', min);
    if (max) formData.append('max-price', max);

    // AJAX
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onload = () => {
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = response.filter;

                const newPanel = tempDiv.querySelector('.filter-panel');
                this._updateDisabledStateFromNewPanel(newPanel);
                console.log('[OffCanvasFilter] Filter-Verfügbarkeit erfolgreich aktualisiert.');
            } catch (err) {
                console.error('[OffCanvasFilter] Fehler beim Parsen der Filter-Antwort:', err);
            }
        } else {
            console.error(`[OffCanvasFilter] Fehler: ${xhr.status} (${xhr.statusText}) beim Request an ${endpoint}`);
        }
    };

    xhr.onerror = () => {
        console.error('[OffCanvasFilter] Netzwerkfehler beim AJAX-Request.');
    };

    xhr.send(formData);
}



/**
 * Überträgt den disabled-Status von einem neuen Filter-Panel auf das aktuelle Offcanvas
 * @param {HTMLElement} newPanel - Das neu gerenderte Filter-Panel
 * @private
 */
_updateDisabledStateFromNewPanel(newPanel) {
    if (!newPanel) return;

    const newCheckboxes = newPanel.querySelectorAll('input[type="checkbox"]');

    newCheckboxes.forEach(newCheckbox => {
        const existing = document.getElementById(newCheckbox.id);
        if (!existing) return;

        existing.disabled = newCheckbox.disabled;

        const label = document.querySelector(`label[for="${existing.id}"]`);
        if (label) {
            if (newCheckbox.disabled) {
                label.classList.add('disabled', 'unavailable');
                label.style.pointerEvents = 'none';
                label.style.opacity = '0.5';
                label.style.cursor = 'not-allowed';
            } else {
                label.classList.remove('disabled', 'unavailable');
                label.style.pointerEvents = '';
                label.style.opacity = '';
                label.style.cursor = '';
            }
        }
    });
}


/**
 * Event-Handler für Größen-Filter mit Fokus auf Deaktivierung
 * @private
 */
_setupSizeFilterEventHandlers(container) {
    // Shopware-Filterbuttons überwachen
    container.querySelectorAll('.filter-multi-select-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Prüfen ob Button deaktiviert ist
            if (button.classList.contains('unavailable') || 
                button.classList.contains('disabled')) {
                return false;
            }
            
            // Checkbox finden und umschalten
            const forAttr = button.getAttribute('for');
            if (forAttr) {
                const checkbox = document.getElementById(forAttr);
                if (checkbox) {
                    // Checkbox umschalten
                    checkbox.checked = !checkbox.checked;
                    
                    // Wichtig: Event auslösen für Shopware
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Button-Status aktualisieren
                    button.classList.toggle('is-active', checkbox.checked);
                    
                    // Visueller Status
                    if (checkbox.checked) {
                        button.style.backgroundColor = '#000';
                        button.style.color = '#fff';
                    } else {
                        button.style.backgroundColor = '';
                        button.style.color = '';
                    }
                }
            }
            
            return false;
        });
    });
    
    // Auch direkte Klicks auf Checkboxen abfangen
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const label = document.querySelector(`label[for="${checkbox.id}"]`);
            if (label) {
                label.classList.toggle('is-active', checkbox.checked);
                
                // Visueller Status
                if (checkbox.checked) {
                    label.style.backgroundColor = '#000';
                    label.style.color = '#fff';
                } else {
                    label.style.backgroundColor = '';
                    label.style.color = '';
                }
            }
            this._updateFilterAvailabilityInRealtime(checkbox);
        });
    });
}

/**
 * Setzt Event-Listener für die Farb-Filter
 * @private
 */
_setupColorFilterEvents(container) {
    // Click-Events für Checkboxen
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        // Status prüfen (deaktiviert)
        if (checkbox.disabled) {
            const label = container.querySelector(`label[for="${checkbox.id}"]`);
            const preview = container.querySelector(`.filter-property-select-preview[title="${checkbox.dataset.label}"]`);
            
            if (label) {
                label.classList.add('unavailable');
            }
            
            if (preview) {
                preview.classList.add('unavailable');
                preview.style.opacity = '0.5';
                preview.style.pointerEvents = 'none';
            }
        }
        
        // Change-Event für Status-Updates
        checkbox.addEventListener('change', () => {
            // Label bei Aktivierung stylen
            const label = container.querySelector(`label[for="${checkbox.id}"]`);
            if (label) {
                label.classList.toggle('is-active', checkbox.checked);
            }
            this._updateFilterAvailabilityInRealtime(checkbox);
        });
    });
}

/**
 * Setzt Event-Listener für die Größen-Filter
 * @private
 */
_setupSizeFilterEvents(container) {
    // Alle Buttons
    container.querySelectorAll('.filter-multi-select-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Checkbox umschalten
            const forAttr = button.getAttribute('for');
            if (forAttr) {
                const checkbox = document.getElementById(forAttr);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    
                    // Button aktiv/inaktiv setzen
                    button.classList.toggle('is-active', checkbox.checked);
                    
                    // Visuelles Feedback sofort sichtbar machen
                    if (checkbox.checked) {
                        button.style.backgroundColor = '#000';
                        button.style.color = '#fff';
                    } else {
                        button.style.backgroundColor = '';
                        button.style.color = '';
                    }
                }
            }
            
            return false;
        });
    });
}

/**
 * Setzt Event-Listener für die Hersteller-Filter
 * @private
 */
_setupManufacturerFilterEvents(container) {
    // Wie bei Größen, aber spezifisch für Hersteller
    container.querySelectorAll('.filter-multi-select-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Checkbox umschalten
            const forAttr = button.getAttribute('for');
            if (forAttr) {
                const checkbox = document.getElementById(forAttr);
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    
                    // Button aktiv/inaktiv setzen
                    button.classList.toggle('is-active', checkbox.checked);
                    
                    // Visuelles Feedback sofort sichtbar machen
                    if (checkbox.checked) {
                        button.style.backgroundColor = '#000';
                        button.style.color = '#fff';
                    } else {
                        button.style.backgroundColor = '';
                        button.style.color = '';
                    }
                }
            }
            
            return false;
        });
    });
}
}