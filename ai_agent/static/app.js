document.addEventListener('DOMContentLoaded', () => {
    // ── Elements & State ────────────────────────────────────────────────
    const parseForm = document.getElementById('parse-form');
    const questionCountSlider = document.getElementById('question-count');
    const questionCountVal = document.getElementById('question-count-val');
    const cliSelect = document.getElementById('cli-select');
    const modelSelect = document.getElementById('model-select');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const previewGrid = document.getElementById('preview-grid');
    const clearBtn = document.getElementById('clear-btn');
    const submitBtn = document.getElementById('submit-btn');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const resultContent = document.getElementById('result-content');
    const promptInput = document.getElementById('prompt-input');
    const resetPromptBtn = document.getElementById('reset-prompt-btn');

    if (resetPromptBtn && promptInput) {
        resetPromptBtn.addEventListener('click', () => {
            promptInput.value = '';
        });
    }

    // ── Dynamic Model Fetching ───────────────────────────────────────────
    async function loadModels(cli) {
        if (!modelSelect) return;
        modelSelect.disabled = true;
        modelSelect.innerHTML = '<option value="">正在获取可用模型...</option>';
        try {
            const res = await fetch(`/models?cli=${cli}`);
            if (res.ok) {
                const data = await res.json();
                if (data.models && Array.isArray(data.models) && data.models.length > 0) {
                    modelSelect.innerHTML = '';
                    data.models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.id;
                        opt.textContent = m.name + (m.description && m.description !== m.name ? ` — ${m.description}` : '');
                        if (m.id === data.default_model) opt.selected = true;
                        modelSelect.appendChild(opt);
                    });
                    modelSelect.disabled = false;
                    return;
                }
            }
        } catch (e) {
            console.error('Failed to fetch models:', e);
        }
        // Fallback
        modelSelect.innerHTML = cli === 'codex' 
            ? '<option value="gpt-5.6-sol" selected>GPT-5.6 Sol (默认推荐)</option><option value="gpt-4o">GPT-4o</option>'
            : '<option value="gemini-3.7-flash-high" selected>Gemini 3.7 Flash (High) (默认推荐)</option><option value="gemini-3.6-flash-high">Gemini 3.6 Flash (High)</option>';
        modelSelect.disabled = false;
    }

    if (cliSelect) {
        cliSelect.addEventListener('change', (e) => {
            loadModels(e.target.value);
        });
        loadModels(cliSelect.value || 'agy');
    }
    
    // Result views
    const resultTitle = document.getElementById('result-title');
    const resultTheme = document.getElementById('result-theme');
    const pagesList = document.getElementById('pages-list');
    const vocabGrid = document.getElementById('vocab-grid');
    const questionsList = document.getElementById('questions-list');
    
    // File list state
    let selectedFiles = [];

    // ── Form Input Listeners ─────────────────────────────────────────────
    
    // Question slider value indicator
    questionCountSlider.addEventListener('input', (e) => {
        questionCountVal.textContent = e.target.value;
    });

    // ── Drag & Drop Event Handling ───────────────────────────────────────
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        handleFiles(files);
    });

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    // ── File Management ──────────────────────────────────────────────────
    function handleFiles(files) {
        // Filter only allowed image types
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const validFiles = files.filter(file => allowedTypes.includes(file.type));
        
        if (validFiles.length === 0) {
            alert('请上传 JPG, PNG 或 WEBP 格式的图片！');
            return;
        }

        // Check total limit (max 10)
        if (selectedFiles.length + validFiles.length > 10) {
            alert('最多支持上传 10 张页面图片。');
            return;
        }

        // Add to state
        selectedFiles = [...selectedFiles, ...validFiles];
        updatePreview();
    }

    function updatePreview() {
        previewGrid.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            previewContainer.classList.add('hidden');
            submitBtn.disabled = true;
            return;
        }

        previewContainer.classList.remove('hidden');
        submitBtn.disabled = false;

        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                previewItem.setAttribute('draggable', true);
                previewItem.dataset.index = index;

                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Page ${index + 1}">
                    <span class="preview-item-badge">P${index + 1}</span>
                    <button class="preview-item-remove" data-index="${index}">&times;</button>
                `;

                // Wire remove button
                previewItem.querySelector('.preview-item-remove').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    removeFile(index);
                });

                // Add drag/drop events for reordering
                wireDragAndDropForReorder(previewItem);

                previewGrid.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updatePreview();
        // Reset file input value so same file can be reselected
        fileInput.value = '';
    }

    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        updatePreview();
        fileInput.value = '';
    });

    // ── Drag to Reorder Pages ───────────────────────────────────────────
    let dragSrcEl = null;

    function wireDragAndDropForReorder(el) {
        el.addEventListener('dragstart', function(e) {
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
            this.style.opacity = '0.4';
        });

        el.addEventListener('dragover', function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            return false;
        });

        el.addEventListener('dragenter', function() {
            this.classList.add('drag-over');
        });

        el.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        el.addEventListener('drop', function(e) {
            e.stopPropagation();
            if (dragSrcEl !== this) {
                const srcIdx = parseInt(dragSrcEl.dataset.index);
                const targetIdx = parseInt(this.dataset.index);

                // Swap files in state array
                const temp = selectedFiles[srcIdx];
                selectedFiles.splice(srcIdx, 1);
                selectedFiles.splice(targetIdx, 0, temp);

                updatePreview();
            }
            return false;
        });

        el.addEventListener('dragend', function() {
            this.style.opacity = '1.0';
            const items = previewGrid.querySelectorAll('.preview-item');
            items.forEach(item => item.classList.remove('drag-over'));
        });
    }

    // ── Tabs Navigation ──────────────────────────────────────────────────
    const tabs = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPaneId = tab.dataset.tab;
            
            // Switch tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            // Switch panes
            tabPanes.forEach(pane => {
                if (pane.id === targetPaneId) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });

    // ── Submit & API Call ────────────────────────────────────────────────
    submitBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // UI States
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').textContent = '正在解析...';
        submitBtn.querySelector('.spinner').classList.remove('hidden');
        
        emptyState.classList.add('hidden');
        resultContent.classList.add('hidden');
        loadingState.classList.remove('hidden');

        // Build FormData
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('images', file);
        });
        formData.append('question_count', questionCountSlider.value);
        if (cliSelect) {
            formData.append('cli', cliSelect.value);
        }
        formData.append('model', modelSelect.value);
        if (promptInput && promptInput.value.trim()) {
            formData.append('prompt', promptInput.value.trim());
            formData.append('custom_prompt', promptInput.value.trim());
        }

        try {
            const response = await fetch('/parse', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errDetail = await response.json().catch(() => ({ detail: 'API Error' }));
                throw new Error(errDetail.detail || `HTTP Error ${response.status}`);
            }

            const apiResponse = await response.json();

            if (!apiResponse.success) {
                throw new Error(apiResponse.error || '解析失败，AI Agent 未能成功解析绘本。');
            }

            renderResult(apiResponse.data);

        } catch (error) {
            console.error('Parsing failed:', error);
            alert(`解析失败: ${error.message}`);
            
            // Revert state
            emptyState.classList.remove('hidden');
            loadingState.classList.add('hidden');
            resultContent.classList.add('hidden');

        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('.btn-text').textContent = '开始解析绘本';
            submitBtn.querySelector('.spinner').classList.add('hidden');
            loadingState.classList.add('hidden');
        }
    });

    // ── Render Response Data ─────────────────────────────────────────────
    function renderResult(data) {
        emptyState.classList.add('hidden');
        loadingState.classList.add('hidden');
        resultContent.classList.remove('hidden');

        // Set Book Info
        resultTitle.textContent = `📖 ${data.title}`;
        resultTheme.textContent = data.theme;

        // Render Page List (Bilingual content)
        pagesList.innerHTML = '';
        data.pages.forEach(pageData => {
            const pageCard = document.createElement('div');
            pageCard.className = 'page-card';
            
            let sentencesHTML = '';
            pageData.sentences.forEach(sentence => {
                sentencesHTML += `
                    <div class="sentence-pair">
                        <p class="en-text">${sentence.en}</p>
                        <p class="zh-text">${sentence.zh}</p>
                    </div>
                `;
            });

            pageCard.innerHTML = `
                <span class="page-badge">第 ${pageData.page} 页</span>
                <div class="page-sentences">
                    ${sentencesHTML || '<p class="text-secondary" style="font-size: 0.9rem; font-style: italic;">本页没有文字内容</p>'}
                </div>
            `;
            pagesList.appendChild(pageCard);
        });

        // Render Vocabulary Grid
        vocabGrid.innerHTML = '';
        if (data.vocabulary.length === 0) {
            vocabGrid.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1; text-align: center; padding: 20px; font-style: italic;">未在此绘本中挑选出超出 RAZ Level E 范围的难词。</p>';
        } else {
            data.vocabulary.forEach(vocab => {
                const vocabCard = document.createElement('div');
                vocabCard.className = 'vocab-card';
                vocabCard.innerHTML = `
                    <div class="vocab-header">
                        <span class="vocab-word">${vocab.word}</span>
                        <span class="vocab-phonetic">${vocab.phonetic}</span>
                    </div>
                    <p class="vocab-meaning">${vocab.meaning}</p>
                    <p class="vocab-example" title="书本中出现的句子">"${vocab.example_sentence}"</p>
                `;
                vocabGrid.appendChild(vocabCard);
            });
        }

        // Render Questions List
        questionsList.innerHTML = '';
        if (data.questions.length === 0) {
            questionsList.innerHTML = '<p class="text-secondary" style="text-align: center; padding: 20px; font-style: italic;">未生成提问。</p>';
        } else {
            data.questions.forEach((q, idx) => {
                const questionCard = document.createElement('div');
                questionCard.className = 'question-card';
                
                // Unique IDs for buttons and boxes
                const hintId = `hint-${idx}`;
                const answerId = `answer-${idx}`;

                questionCard.innerHTML = `
                    <p class="question-text">Q${idx + 1}: ${q.question}</p>
                    <div class="question-actions">
                        <button type="button" class="reveal-btn" data-target="${hintId}" data-type="hint">💡 显示提示</button>
                        <button type="button" class="reveal-btn" data-target="${answerId}" data-type="answer">✅ 显示答案</button>
                    </div>
                    <div id="${hintId}" class="question-reveal-box hint-box hidden">
                        <strong>Hint:</strong> ${q.hint}
                    </div>
                    <div id="${answerId}" class="question-reveal-box answer-box hidden">
                        <strong>Answer:</strong> ${q.answer}
                    </div>
                `;

                // Wire up hint & answer toggle listeners
                questionCard.querySelectorAll('.reveal-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const targetId = btn.dataset.target;
                        const type = btn.dataset.type;
                        const targetBox = document.getElementById(targetId);
                        
                        const isHidden = targetBox.classList.contains('hidden');
                        
                        if (isHidden) {
                            targetBox.classList.remove('hidden');
                            btn.textContent = type === 'hint' ? '🔒 隐藏提示' : '🔒 隐藏答案';
                        } else {
                            targetBox.classList.add('hidden');
                            btn.textContent = type === 'hint' ? '💡 显示提示' : '✅ 显示答案';
                        }
                    });
                });

                questionsList.appendChild(questionCard);
            });
        }

        // Default back to first tab
        tabs[0].click();
    }
});
