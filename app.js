document.addEventListener('DOMContentLoaded', () => {
    let allModels = [];
    
    // Cargar datos JSON
    Promise.all([
        fetch('data/models.json').then(res => res.json()),
        fetch('data/history.json').then(res => res.json())
    ]).then(([modelsData, historyData]) => {
        allModels = Array.isArray(modelsData.models) ? modelsData.models : [];
        populateTaskFilter(allModels);
        populateProviderFilter(allModels);
        renderModels(allModels);
        renderTable(allModels);
        renderHistory(historyData.history);
    }).catch(error => console.error("Error al cargar los datos:", error));

    const taskFilter = document.getElementById('task-filter');
    const providerFilter = document.getElementById('provider-filter');
    const reasoningFilter = document.getElementById('reasoning-filter');

    function normalizeTask(task) {
        return String(task ?? '')
            .normalize('NFKC')
            .trim()
            .replace(/\s+/g, ' ')
            .toLocaleLowerCase('es');
    }

    function populateTaskFilter(models) {
        const uniqueTasks = new Map();

        models.forEach(model => {
            const tasks = Array.isArray(model.tasks) ? model.tasks : [];

            tasks.forEach(task => {
                const label = String(task).trim().replace(/\s+/g, ' ');
                const value = normalizeTask(task);

                if (value && !uniqueTasks.has(value)) {
                    uniqueTasks.set(value, label);
                }
            });
        });

        taskFilter.innerHTML = '<option value="all">Todas</option>';

        [...uniqueTasks.entries()]
            .sort(([, labelA], [, labelB]) =>
                labelA.localeCompare(labelB, 'es', { sensitivity: 'base' })
            )
            .forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                taskFilter.appendChild(option);
            });
    }

    function populateProviderFilter(models) {
        const providers = [...new Set(models.map(model => model.provider).filter(Boolean))]
            .sort((providerA, providerB) => providerA.localeCompare(providerB, 'es'));

        providerFilter.innerHTML = '<option value="all">Todos</option>';

        providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider;
            option.textContent = provider;
            providerFilter.appendChild(option);
        });
    }

    // Lógica de interactividad y transición fluida para cuadrícula
    function applyFilters() {
        const task = normalizeTask(taskFilter.value);
        const provider = providerFilter.value;
        const reasoning = reasoningFilter.value;

        document.querySelectorAll('.card').forEach(card => {
            const cardTasks = JSON.parse(card.dataset.tasks || '[]');
            const cardProvider = card.dataset.provider;
            const cardReasoning = card.dataset.reasoning;
            
            const matchTask = task === 'all' || cardTasks.includes(task);
            const matchProvider = provider === 'all' || cardProvider === provider;
            const matchReasoning = reasoning === 'all' || cardReasoning === reasoning;
            
            if (matchTask && matchProvider && matchReasoning) {
                card.classList.remove('hidden-card');
                // timeout de un milisegundo para forzar reflow y activar la animación de opacidad
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                // Se esconde del layout después de la animación de 300ms
                setTimeout(() => {
                    if (card.style.opacity === '0') {
                        card.classList.add('hidden-card');
                    }
                }, 300);
            }
        });

        const filteredModels = allModels.filter(model => {
            const modelTasks = (Array.isArray(model.tasks) ? model.tasks : [])
                .map(normalizeTask)
                .filter(Boolean);

            const matchTask = task === 'all' || modelTasks.includes(task);
            const matchProvider = provider === 'all' || model.provider === provider;
            const matchReasoning = reasoning === 'all' || model.reasoning_level === reasoning;

            return matchTask && matchProvider && matchReasoning;
        });

        renderTable(filteredModels);
    }

    taskFilter.addEventListener('change', applyFilters);
    providerFilter.addEventListener('change', applyFilters);
    reasoningFilter.addEventListener('change', applyFilters);

    function renderModels(models) {
        const providers = {
            'Anthropic': document.querySelector('#anthropic-column .cards-container'),
            'OpenAI': document.querySelector('#openai-column .cards-container'),
            'Google': document.querySelector('#google-column .cards-container')
        };

        Object.values(providers).forEach(container => container.innerHTML = '');

        models.forEach(model => {
            if (providers[model.provider]) {
                const card = document.createElement('div');
                card.className = 'card';
                const normalizedTasks = (Array.isArray(model.tasks) ? model.tasks : [])
                    .map(normalizeTask)
                    .filter(Boolean);

                card.dataset.tasks = JSON.stringify(normalizedTasks);
                card.dataset.provider = model.provider;
                card.dataset.reasoning = model.reasoning_level;
                
                card.innerHTML = `
                    <div class="card-header">
                        <h3 class="card-title">${model.name}</h3>
                        <div class="card-subtitle">API ID: ${model.api_id}</div>
                        <span class="badge ${model.reasoning_level.toLowerCase()}">${model.reasoning_level} Reasoning</span>
                    </div>
                    <div class="card-content">
                        <h4>Fortalezas</h4>
                        <ul>
                            ${model.strengths.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                        <h4>Limitaciones</h4>
                        <ul>
                            ${model.limitations.map(l => `<li>${l}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="card-cost-section">
                        <strong>Costo:</strong> In $${model.cost_input_1m}/1M | Out $${model.cost_output_1m}/1M
                    </div>
                `;
                providers[model.provider].appendChild(card);
            }
        });
    }

    function renderTable(models) {
        const tbody = document.querySelector('#comparative-table tbody');
        tbody.innerHTML = '';
        
        models.forEach(model => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${model.name}</strong><br><small style="color: #94a3b8;">${model.api_id}</small></td>
                <td>${model.provider}</td>
                <td><span class="badge ${model.reasoning_level.toLowerCase()}">${model.reasoning_level}</span></td>
                <td>$${model.cost_input_1m} / $${model.cost_output_1m}</td>
                <td>${model.strengths[0] || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderHistory(history) {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        
        // Regla estricta: Limitar el historial a las 3 ventanas de eventos más recientes
        history.slice(0, 3).forEach(entry => {
            const li = document.createElement('li');
            
            // Lógica de interactividad Acordeón
            li.onclick = function() {
                const details = this.querySelector('.history-details');
                const icon = this.querySelector('.accordion-icon');
                details.classList.toggle('expanded');
                icon.style.transform = details.classList.contains('expanded') ? 'rotate(45deg)' : 'rotate(0deg)';
            };

            const isNewFormat = entry.provider && entry.provider.includes("IA Autonomous Agent");
            const changeText = entry.change || entry.changes || 'Actualización general';
            const shortChange = changeText.length > 55 ? changeText.substring(0, 55) + '...' : changeText;

            // Formateador robusto de URLs para extraer dominios raíz y crear "Píldoras" visuales
            let sourcesHtml = '';
            if (entry.sources && entry.sources.length) {
                sourcesHtml = '<div style="margin-top: 10px;"><strong>Fuentes verificadas:</strong><br>';
                const seenDomains = new Set();
                entry.sources.forEach(url => {
                    try {
                        let cleanUrl = url.trim();
                        // Forzar el protocolo para que el constructor URL no falle
                        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
                        
                        const urlObj = new URL(cleanUrl);
                        let domain = urlObj.hostname.replace('www.', '');
                        
                        if (!seenDomains.has(domain)) {
                            seenDomains.add(domain);
                            let displayName = domain === "vertexaisearch.cloud.google.com" ? "Google Search Grounding" : domain;
                            sourcesHtml += `<a href="${cleanUrl}" target="_blank" class="source-badge" onclick="event.stopPropagation()">${displayName}</a>`;
                        }
                    } catch (e) {
                        // Fallback por si la IA generó texto en lugar de URL limpia
                        sourcesHtml += `<span class="source-badge" style="background-color: transparent; border-style: dashed;">${url.substring(0, 20)}...</span>`;
                    }
                });
                sourcesHtml += '</div>';
            }

            li.innerHTML = `
                <div class="history-summary">
                    <div>
                        <div class="history-date">${new Date(entry.date).toLocaleString()} ${isNewFormat ? '🤖 Auto-Update' : ''}</div>
                        <strong>${shortChange}</strong>
                    </div>
                    <div class="accordion-icon">+</div>
                </div>
                <div class="history-details">
                    <div class="history-details-inner">
                        <strong>Descripción completa:</strong> ${changeText}<br>
                        ${entry.reason ? `<span style="font-size: 0.85rem; color: #94a3b8;"><strong>Motivo técnico:</strong> ${entry.reason}</span><br>` : ''}
                        ${entry.model_added ? `<span style="font-size: 0.85rem; color: #94a3b8;"><strong>Modelos detectados:</strong> ${entry.model_added}</span>` : ''}
                        ${sourcesHtml}
                    </div>
                </div>
            `;
            
            list.appendChild(li);
        });
    }
});
