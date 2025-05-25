document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const header = document.querySelector('header'); // For potential scroll effects later
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeDropdown = document.getElementById('theme-dropdown');
    const filterIconBtn = document.getElementById('filter-icon-btn');
    const situationalButtonsContainer = document.getElementById('situational-buttons');
    const situationalActionsBar = document.getElementById('situational-actions');
    
    const quotesDisplayArea = document.getElementById('quotes-display-area');
    const loadingMessage = document.getElementById('loading-message');
    const currentFiltersDisplay = document.getElementById('current-filters-display');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters-btn');
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Filter Panel Elements
    const filterPanel = document.getElementById('filter-panel');
    const filterPanelOverlay = document.getElementById('filter-panel-overlay');
    const closeFilterPanelBtn = document.getElementById('close-filter-panel-btn');
    const panelSearchInput = document.getElementById('panel-search-input');
    const panelTypeSelect = document.getElementById('panel-type-select');
    const panelSelectedTagsContainer = document.getElementById('panel-selected-tags');
    const openTagModalBtn = document.getElementById('open-tag-modal-btn');
    const panelResetFiltersBtn = document.getElementById('panel-reset-filters-btn');
    const panelApplyFiltersBtn = document.getElementById('panel-apply-filters-btn');

    // Tag Selection Modal Elements
    const tagSelectionModal = document.getElementById('tag-selection-modal');
    const tagModalOverlay = document.getElementById('tag-modal-overlay'); // Note: HTML uses filter-panel-overlay for both
    const closeTagModalBtn = document.getElementById('close-tag-modal-btn');
    const tagSearchInput = document.getElementById('tag-search-input');
    const modalTagListContainer = document.getElementById('modal-tag-list');
    const tagModalConfirmBtn = document.getElementById('tag-modal-confirm-btn');

    const quoteFilePaths = [
        'data/quotes/tech-innovation.json',
        'data/quotes/business-entrepreneurship.json', // 假設你有這個檔案
        'data/quotes/personal-growth.json',
        'data/quotes/sports-athletics.json',
        'data/quotes/arts-creativity.json',
        'data/quotes/life-philosophy.json',
        'data/quotes/movie-lines.json',
        'data/quotes/book-excerpts.json', // 假設你有這個檔案
        'data/quotes/famous-quotes.json', // 假設你有這個檔案
        'data/quotes/proverbs.json',
        'data/quotes/sayings.json', // 假設你有這個檔案
        // ... 添加所有你創建的類型 JSON 檔案路徑
    ];
    // --- State ---
    let allQuotes = [];
    let displayedQuotes = [];
    let availableTypes = [];
    let availableTags = [];
    
    let activeMainFilters = {
        searchTerm: '',
        type: '',
        tags: [] 
    };
    let tempModalSelectedTags = [];

    let currentSituationalContext = {
        name: null,
        quotes: [],
        isRandomMode: false,
        originalTags: []
    };

    const THEMES = ['light', 'dark', 'sepia']; // Available themes

    // --- Situational Guide Configuration ---
    const situationalGuideConfig = {
        "缺乏靈感": ["創作靈感", "創意思考", "想像力", "創意思考"],
        "需要動力": ["勵志", "堅持不懈", "行動力", "克服困難"],
        "感到迷茫": ["人生指引", "自我探索", "珍惜當下"],
        "尋求慰藉": ["喜悅", "幽默", "生命力"],
        "警惕反思": ["警惕", "處世", "名聲", "警惕反思", "自我探索"]
    };

    // --- Initialization ---
    async function initializeApp() {
        try {
            // 確保 loadingMessage 在開始載入時可見且顯示正確訊息
            loadingMessage.style.display = 'block';
            loadingMessage.textContent = '正在載入名言資料...';

            const fetchPromises = quoteFilePaths.map(path =>
                fetch(path)
                    .then(response => {
                        if (!response.ok) {
                            // 如果特定檔案載入失敗，打印錯誤並返回空陣列，避免 Promise.all 中斷
                            console.error(`無法載入名言檔案 ${path}: ${response.status} ${response.statusText}`);
                            return []; 
                        }
                        return response.json();
                    })
                    .catch(error => {
                        // 網路錯誤或其他 fetch 錯誤
                        console.error(`載入 ${path} 時發生錯誤:`, error);
                        return [];
                    })
            );

            const allQuotesArrays = await Promise.all(fetchPromises);
            
            // 使用 spread syntax 和 reduce 或 concat 來合併所有陣列
            allQuotes = [].concat(...allQuotesArrays); 
            // 或者: allQuotes = allQuotesArrays.reduce((acc, currentArray) => acc.concat(currentArray), []);

            if (allQuotes.length > 0) {
                // 後續的邏輯 (populateFilters, renderQuotes 等) 與之前類似，
                // 因為它們都是基於合併後的 allQuotes 操作。
                availableTypes = [...new Set(allQuotes.map(q => q.type).filter(Boolean))].sort();
                availableTags = [...new Set(allQuotes.flatMap(q => q.tags).filter(Boolean))].sort();
                
                populatePanelFilters(); // 確保這個函數使用更新後的 availableTypes
                populateSituationalButtons();

                // 初始顯示的名言，可以隨機幾條，或最新幾條，或留空等使用者操作
                // 例如，顯示隨機 6 條
                const initialQuotesToShow = allQuotes.length > 6 
                                            ? getRandomQuotes(allQuotes, 6) 
                                            : allQuotes;
                renderQuotes(initialQuotesToShow);
                
                loadingMessage.style.display = 'none';
            } else {
                loadingMessage.textContent = '暫無名言可顯示，或所有資料檔案載入失敗。';
            }
        } catch (error) {
            // 這個 catch 主要捕獲 Promise.all 本身的錯誤 (雖然我們內部已處理單個 fetch 錯誤)
            console.error("初始化應用程式時發生嚴重錯誤:", error);
            loadingMessage.textContent = '應用程式初始化失敗，請檢查主控台錯誤訊息。';
        }
        addEventListeners(); // 確保事件監聽器在資料處理後添加
        loadTheme(); // 加載主題
    }

    function getRandomQuotes(sourceArray, count) {
        if (!sourceArray || sourceArray.length === 0) return [];
        const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // --- Theme Switching Logic ---
    function applyTheme(themeName) {
        document.body.classList.remove(...THEMES.map(t => `theme-${t}`));
        if (themeName !== 'light') { // 'light' is the default, no class needed
            document.body.classList.add(`theme-${themeName}`);
        }
        localStorage.setItem('selectedTheme', themeName);
        updateThemeDropdownSelection(themeName);
        themeToggleBtn.setAttribute('aria-expanded', 'false'); // Close dropdown after selection
        themeDropdown.classList.remove('open');
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('selectedTheme') || 'light'; // Default to light
        if (THEMES.includes(savedTheme)) {
            applyTheme(savedTheme);
        } else {
            applyTheme('light'); // Fallback to light
        }
    }

    function updateThemeDropdownSelection(activeTheme) {
        themeDropdown.querySelectorAll('.theme-option').forEach(button => {
            if (button.dataset.theme === activeTheme) {
                button.classList.add('active-theme');
                button.setAttribute('aria-checked', 'true');
            } else {
                button.classList.remove('active-theme');
                button.setAttribute('aria-checked', 'false');
            }
        });
    }

    function toggleThemeDropdown() {
        const isOpen = themeDropdown.classList.toggle('open');
        themeToggleBtn.setAttribute('aria-expanded', isOpen.toString());
    }
    
    // --- Populate Filters (for Panel & Modal) ---
    function populatePanelFilters() {
        panelTypeSelect.innerHTML = '<option value="">所有類型</option>'; // Clear previous options
        availableTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            panelTypeSelect.appendChild(option);
        });
    }

    function populateTagSelectionModal(currentSelectedInPanel) {
        modalTagListContainer.innerHTML = '';
        tempModalSelectedTags = [...currentSelectedInPanel]; 

        availableTags.forEach(tag => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = tag;
            checkbox.id = `modal-tag-${tag.replace(/\s+/g, '-')}`;
            checkbox.checked = tempModalSelectedTags.includes(tag);
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!tempModalSelectedTags.includes(tag)) tempModalSelectedTags.push(tag);
                } else {
                    tempModalSelectedTags = tempModalSelectedTags.filter(t => t !== tag);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${tag}`));
            modalTagListContainer.appendChild(label);
        });
    }
    
    // --- Populate Situational Buttons ---
    function populateSituationalButtons() {
        situationalButtonsContainer.innerHTML = '';
        for (const situationName of Object.keys(situationalGuideConfig)) {
            const button = document.createElement('button');
            button.textContent = situationName;
            button.dataset.situation = situationName;
            button.addEventListener('click', handleSituationalGuideClick);
            situationalButtonsContainer.appendChild(button);
        }
    }
    
    // --- Render Quotes ---
    function renderQuotes(quotesToRender) {
        quotesDisplayArea.innerHTML = '';
        displayedQuotes = quotesToRender;

        if (quotesToRender.length === 0) {
            const noResultsMessage = document.createElement('p');
            noResultsMessage.textContent = currentSituationalContext.name ? `找不到符合「${currentSituationalContext.name}」情境的名言。` : '找不到符合條件的名言。';
            noResultsMessage.id = 'loading-message';
            quotesDisplayArea.appendChild(noResultsMessage);
            return;
        }
        
        quotesToRender.forEach(quote => {
            const card = document.createElement('article');
            card.className = 'quote-card';
            card.innerHTML = `
                <p class="quote-text">“${quote.quote}”</p>
                <div class="quote-source">
                    ${quote.author ? `<p class="quote-author">作者：<a href="#" data-author="${quote.author}">${quote.author}</a></p>` : ''}
                    ${quote.work ? `<p class="quote-work">作品：<a href="#" data-work="${quote.work}">${quote.work}</a></p>` : ''}
                </div>
                <div class="quote-meta">
                    <span class="quote-type">類型：${quote.type || '未分類'}</span>
                    ${quote.tags && quote.tags.length > 0 ? `
                        <div class="quote-tags">
                            標籤：${quote.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join(' ')}
                        </div>
                    ` : ''}
                </div>
            `;
            quotesDisplayArea.appendChild(card);
        });
        addClickableListenersToCards();
    }

    function addClickableListenersToCards() {
        quotesDisplayArea.querySelectorAll('[data-author]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                activeMainFilters.searchTerm = `author:"${el.dataset.author}"`;
                panelSearchInput.value = activeMainFilters.searchTerm;
                activeMainFilters.type = ''; panelTypeSelect.value = '';
                activeMainFilters.tags = []; updateSelectedTagPillsInPanel();
                applyMainFilters();
                openFilterPanel(); 
            });
        });
         quotesDisplayArea.querySelectorAll('[data-work]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                activeMainFilters.searchTerm = `work:"${el.dataset.work}"`;
                panelSearchInput.value = activeMainFilters.searchTerm;
                activeMainFilters.type = ''; panelTypeSelect.value = '';
                activeMainFilters.tags = []; updateSelectedTagPillsInPanel();
                applyMainFilters();
                openFilterPanel();
            });
        });
        quotesDisplayArea.querySelectorAll('.tag').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                activeMainFilters.searchTerm = ''; panelSearchInput.value = '';
                activeMainFilters.type = ''; panelTypeSelect.value = '';
                activeMainFilters.tags = [el.dataset.tag];
                updateSelectedTagPillsInPanel();
                applyMainFilters();
                openFilterPanel();
            });
        });
    }

    // --- Situational Guide Logic ---
    function handleSituationalGuideClick(event) {
        const situationName = event.target.dataset.situation;
        const situationTags = situationalGuideConfig[situationName];

        resetMainFilterState(); // Clear panel filters
        updateCurrentFiltersDisplay(); 
        
        situationalButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        currentSituationalContext.name = situationName;
        currentSituationalContext.originalTags = situationTags;
        currentSituationalContext.quotes = allQuotes.filter(q => 
            q.tags && situationTags.some(tag => q.tags.includes(tag)) // OR logic for situational tags
        );
        currentSituationalContext.isRandomMode = true;

        if (currentSituationalContext.quotes.length > 0) {
            const randomQuote = currentSituationalContext.quotes[Math.floor(Math.random() * currentSituationalContext.quotes.length)];
            renderQuotes([randomQuote]);
        } else {
            renderQuotes([]); 
        }
        updateSituationalActionButtons();
    }

    function updateSituationalActionButtons() {
        situationalActionsBar.innerHTML = '';
        if (!currentSituationalContext.name || currentSituationalContext.quotes.length === 0) {
            return;
        }

        if (currentSituationalContext.isRandomMode) {
            const againBtn = document.createElement('button');
            againBtn.className = 'btn-theme-secondary'; // Use new themeable class
            againBtn.textContent = `再來一句 (${currentSituationalContext.name})`;
            againBtn.addEventListener('click', () => {
                if (currentSituationalContext.quotes.length > 0) {
                    const randomQuote = currentSituationalContext.quotes[Math.floor(Math.random() * currentSituationalContext.quotes.length)];
                    renderQuotes([randomQuote]);
                }
            });
            situationalActionsBar.appendChild(againBtn);
        }

        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'btn-theme-primary'; // Use new themeable class
        if (currentSituationalContext.isRandomMode) {
            viewAllBtn.textContent = `查看全部 (${currentSituationalContext.name}) (共 ${currentSituationalContext.quotes.length} 條)`;
            viewAllBtn.addEventListener('click', () => {
                currentSituationalContext.isRandomMode = false;
                renderQuotes(currentSituationalContext.quotes);
                updateSituationalActionButtons(); 
            });
        } else { 
            viewAllBtn.textContent = `已顯示「${currentSituationalContext.name}」全部 (${currentSituationalContext.quotes.length} 條)`;
            viewAllBtn.disabled = true; 
        }
        situationalActionsBar.appendChild(viewAllBtn);
    }
    
    function clearSituationalContext() {
        currentSituationalContext.name = null;
        currentSituationalContext.quotes = [];
        currentSituationalContext.isRandomMode = false;
        currentSituationalContext.originalTags = [];
        situationalActionsBar.innerHTML = '';
        situationalButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    }

    // --- Filter Panel Logic ---
    function openFilterPanel() {
        panelSearchInput.value = activeMainFilters.searchTerm;
        panelTypeSelect.value = activeMainFilters.type;
        updateSelectedTagPillsInPanel();
        
        filterPanel.classList.add('open');
        filterPanelOverlay.classList.add('open'); // Open overlay
    }
    function closeFilterPanel() {
        filterPanel.classList.remove('open');
        filterPanelOverlay.classList.remove('open'); // Close overlay
    }

    function applyMainFilters() {
        clearSituationalContext(); 

        let filtered = [...allQuotes];
        const term = activeMainFilters.searchTerm.toLowerCase();
        // ... (search logic same as before) ...
         if (term) {
            if (term.startsWith('author:"') && term.endsWith('"')) {
                const author = term.slice(8, -1);
                filtered = filtered.filter(q => q.author && q.author.toLowerCase().includes(author));
            } else if (term.startsWith('work:"') && term.endsWith('"')) {
                const work = term.slice(6, -1);
                filtered = filtered.filter(q => q.work && q.work.toLowerCase().includes(work));
            } else {
                 filtered = filtered.filter(q => 
                    q.quote.toLowerCase().includes(term) ||
                    (q.author && q.author.toLowerCase().includes(term)) ||
                    (q.work && q.work.toLowerCase().includes(term))
                );
            }
        }

        if (activeMainFilters.type) {
            filtered = filtered.filter(q => q.type === activeMainFilters.type);
        }
        if (activeMainFilters.tags.length > 0) {
            filtered = filtered.filter(q => 
                q.tags && activeMainFilters.tags.every(tag => q.tags.includes(tag)) // AND logic
            );
        }
        renderQuotes(filtered);
        updateCurrentFiltersDisplay();
    }

    function resetMainFilterState() {
        activeMainFilters.searchTerm = '';
        activeMainFilters.type = '';
        activeMainFilters.tags = [];
        panelSearchInput.value = '';
        panelTypeSelect.value = '';
        updateSelectedTagPillsInPanel();
    }
    
    function handlePanelApply() {
        activeMainFilters.searchTerm = panelSearchInput.value;
        activeMainFilters.type = panelTypeSelect.value;
        applyMainFilters();
        closeFilterPanel();
    }

    function handlePanelReset() {
        resetMainFilterState();
        // Optionally, re-apply filters to show all quotes or a default set
        // applyMainFilters(); 
    }
    
    function updateSelectedTagPillsInPanel() {
        panelSelectedTagsContainer.innerHTML = '';
        activeMainFilters.tags.forEach(tag => {
            const pill = document.createElement('span');
            pill.className = 'tag-pill';
            pill.textContent = tag;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-tag';
            removeBtn.innerHTML = '×';
            removeBtn.setAttribute('aria-label', `移除標籤 ${tag}`);
            removeBtn.onclick = () => {
                activeMainFilters.tags = activeMainFilters.tags.filter(t => t !== tag);
                updateSelectedTagPillsInPanel();
            };
            pill.appendChild(removeBtn);
            panelSelectedTagsContainer.appendChild(pill);
        });
    }

    // --- Tag Selection Modal Logic ---
    function openTagModal() {
        populateTagSelectionModal(activeMainFilters.tags);
        tagSelectionModal.classList.add('open');
        tagModalOverlay.classList.add('open'); // Show overlay for modal
    }
    function closeTagModal() {
        tagSelectionModal.classList.remove('open');
        tagModalOverlay.classList.remove('open'); // Hide overlay for modal
        tagSearchInput.value = ''; 
    }
    function handleTagModalConfirm() {
        activeMainFilters.tags = [...tempModalSelectedTags]; 
        updateSelectedTagPillsInPanel(); 
        closeTagModal();
    }
    
    tagSearchInput.addEventListener('input', () => {
        const searchTerm = tagSearchInput.value.toLowerCase();
        modalTagListContainer.querySelectorAll('label').forEach(label => {
            const tagText = label.textContent.toLowerCase();
            label.style.display = tagText.includes(searchTerm) ? 'flex' : 'none'; // Use flex for label items
        });
    });

    // --- Update Current Filters Display (for main panel filters) ---
    function updateCurrentFiltersDisplay() {
        currentFiltersDisplay.innerHTML = '';
        let hasActivePanelFilters = false;
        if (activeMainFilters.searchTerm) {
            currentFiltersDisplay.innerHTML += `<span>搜尋: ${panelSearchInput.value}</span>`;
            hasActivePanelFilters = true;
        }
        if (activeMainFilters.type) {
            currentFiltersDisplay.innerHTML += `<span>類型: ${activeMainFilters.type}</span>`;
            hasActivePanelFilters = true;
        }
        if (activeMainFilters.tags.length > 0) {
            currentFiltersDisplay.innerHTML += `<span>標籤: ${activeMainFilters.tags.join(' & ')}</span>`; // Using AND
            hasActivePanelFilters = true;
        }
        clearAllFiltersBtn.style.display = hasActivePanelFilters ? 'block' : 'none';
    }

    // --- Global Clear Filters ---
    function handleClearAllFilters() {
        clearSituationalContext();
        resetMainFilterState();
        applyMainFilters(); // This will render all quotes (or initial set)
        updateCurrentFiltersDisplay();
    }

    // --- Add Event Listeners ---
    function addEventListeners() {
        // Theme Switcher
        themeToggleBtn.addEventListener('click', toggleThemeDropdown);
        themeDropdown.addEventListener('click', (event) => {
            const themeButton = event.target.closest('.theme-option');
            if (themeButton && themeButton.dataset.theme) {
                applyTheme(themeButton.dataset.theme);
            }
        });
        // Close dropdown if clicked outside
        document.addEventListener('click', (event) => {
            if (!themeToggleBtn.contains(event.target) && !themeDropdown.contains(event.target)) {
                themeDropdown.classList.remove('open');
                themeToggleBtn.setAttribute('aria-expanded', 'false');
            }
        });


        // Filter Panel
        filterIconBtn.addEventListener('click', openFilterPanel);
        closeFilterPanelBtn.addEventListener('click', closeFilterPanel);
        filterPanelOverlay.addEventListener('click', closeFilterPanel); // Close if overlay clicked
        
        panelApplyFiltersBtn.addEventListener('click', handlePanelApply);
        panelResetFiltersBtn.addEventListener('click', handlePanelReset);
        openTagModalBtn.addEventListener('click', openTagModal);

        // Tag Modal
        closeTagModalBtn.addEventListener('click', closeTagModal);
        tagModalOverlay.addEventListener('click', closeTagModal); // Close if overlay clicked for modal
        tagModalConfirmBtn.addEventListener('click', handleTagModalConfirm);

        // Global Clear
        clearAllFiltersBtn.addEventListener('click', handleClearAllFilters);
    }

    // --- Start the app ---
    initializeApp();
    // loadTheme() is called within initializeApp after DOM elements are ready
});