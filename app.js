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

    // Función de filtrado interactivo
    function applyFilters() {
        const task = taskFilter.value;
        const reasoning = reasoningFilter.value;

        const filtered = allModels.filter(model => {
            const matchTask = task === 'all' || model.tasks.includes(task);
            const matchReasoning = reasoning === 'all' || model.reasoning_level === reasoning;
            return matchTask && matchReasoning;
        });

        renderModels(filtered);
    }

    taskFilter.addEventListener('change', applyFilters);
    reasoningFilter.addEventListener('change', applyFilters);

    // Renderizar tarjetas de modelos
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
                        <div style="margin-top: 10px; font-size: 0.85rem; color: #94a3b8; border-top: 1px solid var(--border-color); padding-top: 10px;">
                            <strong>Costo:</strong> In $${model.cost_input_1m}/1M | Out $${model.cost_output_1m}/1M
                        </div>
                    </div>
                `;
                providers[model.provider].appendChild(card);
            }
        });
    }

    // Renderizar tabla transversal
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

    // Renderizar histórico
    function renderHistory(history) {
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        
        history.slice(0, 10).forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="history-date">${new Date(entry.date).toLocaleString()}</div>
                <strong>Versión ${entry.version}:</strong> ${entry.changes}
            `;
            list.appendChild(li);
        });
    }
});
