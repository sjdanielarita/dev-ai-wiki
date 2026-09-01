document.addEventListener('DOMContentLoaded', () => {
    let allModels = [];
    
    // Cargar datos JSON
    Promise.all([
        fetch('data/models.json').then(res => res.json()),
        fetch('data/history.json').then(res => res.json())
    ]).then(([modelsData, historyData]) => {
        allModels = modelsData.models;
        renderModels(allModels);
        renderTable(allModels);
        renderHistory(historyData.history);
    }).catch(error => console.error("Error al cargar los datos:", error));

    const taskFilter = document.getElementById('task-filter');
    const reasoningFilter = document.getElementById('reasoning-filter');

    // Lógica de interactividad y transición fluida para cuadrícula
    function applyFilters() {
        const task = taskFilter.value;
        const reasoning = reasoningFilter.value;

        document.querySelectorAll('.card').forEach(card => {
            const cardTasks = card.dataset.task.split(',');
            const cardReasoning = card.dataset.reasoning;
            
            const matchTask = task === 'all' || cardTasks.includes(task);
            const matchReasoning = reasoning === 'all' || cardReasoning === reasoning;
            
            if (matchTask && matchReasoning) {
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
    }

    taskFilter.addEventListener('change', applyFilters);
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
                card.dataset.task = model.tasks.join(',');
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
                entry.sources.forEach(url => {
                    try {
                        let cleanUrl = url.trim();
                        // Forzar el protocolo para que el constructor URL no falle
                        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
                        
                        const urlObj = new URL(cleanUrl);
                        const domain = urlObj.hostname.replace('www.', '');
                        
                        sourcesHtml += `<a href="${cleanUrl}" target="_blank" class="source-badge" onclick="event.stopPropagation()">${domain}</a>`;
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
