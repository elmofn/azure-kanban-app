import { state } from './state.js';

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const getSortIndicator = (columnName) => {
    if (state.sortColumn !== columnName) return '';
    const icon = state.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down';
    return `<i data-lucide="${icon}" class="w-4 h-4 ml-1"></i>`;
};

export const isTaskOverdue = (task) => {
    if (!task.dueDate || !['inprogress', 'stopped', 'homologation'].includes(task.status)) {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
};

export const createTaskElement = (task) => {
    const taskCard = document.createElement('div');
    const overdueClass = isTaskOverdue(task) ? ' task-overdue' : '';
    taskCard.className = `task-card bg-white dark:bg-custom-darkest rounded-lg border border-custom-medium/50 dark:border-custom-dark cursor-grab flex flex-col overflow-hidden${overdueClass}`;
    taskCard.dataset.taskId = task.id;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'p-4 relative';

    let approveButton = '';
    if (task.status === 'homologation') {
        approveButton = `<button class="approve-btn absolute top-4 right-4 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-700 dark:text-yellow-400 p-1.5 rounded-full" data-task-id="${task.id}" title="Aprovar e Arquivar"><i data-lucide="check-circle-2" class="w-5 h-5 pointer-events-none"></i></button>`;
    }

    let azureLinkIcon = '';
    if (task.azureLink) {
        azureLinkIcon = `<a href="${task.azureLink}" target="_blank" rel="noopener noreferrer" class="azure-link-btn text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-1" title="Abrir no Azure DevOps"><i data-lucide="external-link" class="w-4 h-4 pointer-events-none"></i></a>`;
    }

    let responsibleDisplay = '';
    if (Array.isArray(task.responsible) && task.responsible.length > 0) {
        const primaryResponsible = task.responsible[0];
        const otherResponsiblesCount = task.responsible.length - 1;
        responsibleDisplay = `<strong class="text-xs font-medium text-custom-dark dark:text-custom-medium">${primaryResponsible}</strong>`;
        if (otherResponsiblesCount > 0) {
            responsibleDisplay += `<span class="ml-1 text-xs font-bold bg-custom-medium text-custom-darkest rounded-full px-1.5 py-0.5" title="${task.responsible.slice(1).join(', ')}">+${otherResponsiblesCount}</span>`;
        }
    } else {
        responsibleDisplay = `<strong class="text-xs font-medium text-custom-dark dark:text-custom-medium">${task.responsible || 'N/D'}</strong>`;
    }

    let dueDateDisplay = '';
    if (task.dueDate) {
        dueDateDisplay = `
            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <i data-lucide="calendar" class="w-3 h-3"></i>
                <span>${formatDate(task.dueDate)}</span>
            </div>
        `;
    }

    contentDiv.innerHTML = `
        <p class="text-custom-darkest dark:text-custom-light pr-8" title="${task.description}">${task.title || ''}</p>
        ${approveButton}
        <div class="mt-3 pt-2 border-t border-custom-medium/50 dark:border-custom-dark flex justify-between items-center">
            <div class="flex items-center gap-1">
                <button class="info-btn text-custom-medium hover:text-custom-dark dark:hover:text-custom-light p-1" data-task-id="${task.id}" title="Ver histórico"><i data-lucide="info" class="w-4 h-4 pointer-events-none"></i></button>
                ${azureLinkIcon}
                <button class="delete-btn text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1" data-task-id="${task.id}" title="Excluir tarefa"><i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i></button>
            </div>
            <div class="flex items-center gap-2">
                ${dueDateDisplay}
                ${responsibleDisplay}
            </div>
        </div>
    `;
    taskCard.appendChild(contentDiv);

    if (task.project) {
        const projectBar = document.createElement('div');
        projectBar.className = 'text-xs text-white px-4 py-0.5 mt-auto';
        projectBar.style.backgroundColor = task.projectColor;
        projectBar.textContent = task.project;
        taskCard.appendChild(projectBar);
    }
    return taskCard;
};

export function renderKanbanView() {
    const kanbanViewEl = document.getElementById('kanbanView');
    kanbanViewEl.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
    
    let activeTasks = state.tasks.filter(t => t.status !== 'done');
    if (state.selectedResponsible !== 'all') {
        activeTasks = activeTasks.filter(t => Array.isArray(t.responsible) && t.responsible.includes(state.selectedResponsible));
    }
    if (state.selectedProject !== 'all') {
        activeTasks = activeTasks.filter(t => t.project === state.selectedProject);
    }

    const columns = [ { id: 'todo', name: 'A fazer' }, { id: 'stopped', name: 'Parado' }, { id: 'inprogress', name: 'Em Andamento' }, { id: 'homologation', name: 'Em Homologação' }];
    columns.forEach(col => {
        const columnEl = kanbanViewEl.querySelector(`.kanban-column:has([data-column-id="${col.id}"])`);
        if (columnEl) {
            const tasksForColumn = activeTasks.filter(t => t.status === col.id).sort((a, b) => a.order - b.order);
            const header = columnEl.querySelector('h2');
            const list = columnEl.querySelector('.task-list');
            header.innerHTML = `<span>${col.name}</span><span class="bg-custom-medium/50 dark:bg-custom-dark/80 text-custom-darkest dark:text-custom-light text-xs font-bold px-2 py-1 rounded-full">${tasksForColumn.length}</span>`;
            tasksForColumn.forEach(task => list.appendChild(createTaskElement(task)));
        }
    });
    lucide.createIcons();
}

export function renderListView() {
    const listViewEl = document.getElementById('listView');
    let activeTasks = state.tasks.filter(t => t.status !== 'done');
    if (state.selectedResponsible !== 'all') {
        activeTasks = activeTasks.filter(t => Array.isArray(t.responsible) && t.responsible.includes(state.selectedResponsible));
    }
    if (state.selectedProject !== 'all') {
        activeTasks = activeTasks.filter(t => t.project === state.selectedProject);
    }
    activeTasks.sort((a, b) => {
        const valA = (state.sortColumn === 'responsible' ? a.responsible?.[0] : a[state.sortColumn]) || '';
        const valB = (state.sortColumn === 'responsible' ? b.responsible?.[0] : b[state.sortColumn]) || '';
        if (state.sortColumn === 'createdAt' || state.sortColumn === 'dueDate') {
            if (!valA) return 1; if (!valB) return -1;
            return state.sortDirection === 'asc' ? new Date(valA) - new Date(valB) : new Date(valB) - new Date(valA);
        }
        return state.sortDirection === 'asc' ? String(valA).trim().toLowerCase().localeCompare(String(valB).trim().toLowerCase()) : String(valB).trim().toLowerCase().localeCompare(String(valA).trim().toLowerCase());
    });
    const statusLabels = { todo: 'A fazer', stopped: 'Parado', inprogress: 'Em Andamento', homologation: 'Em Homologação', done: 'Pronto', edited: 'Editado' };
    const tableBody = activeTasks.map(task => {
        let azureLinkIcon = task.azureLink ? `<a href="${task.azureLink}" target="_blank" rel="noopener noreferrer" class="azure-link-btn text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-1" title="Abrir no Azure DevOps"><i data-lucide="external-link" class="w-5 h-5 pointer-events-none"></i></a>` : `<div class="w-7 h-7"></div>`;
        let projectTag = task.project ? `<span class="text-xs font-bold rounded px-2 py-1" style="background-color:${task.projectColor}; color: #fff;">${task.project}</span>` : '';
        return `
            <tr class="list-row hover:bg-custom-light/50 dark:hover:bg-custom-dark/50" data-task-id="${task.id}">
                <td class="px-6 py-4 font-mono text-xs text-white-500" title="${task.id}">${task.id}</td>
                <td class="px-6 py-4"><div><div class="text-custom-darkest dark:text-custom-light" title="${task.description}">${task.title}</div></div></td>
                <td class="px-6 py-4 whitespace-nowrap">${projectTag}</td>
                <td class="px-6 py-4 whitespace-nowrap">${Array.isArray(task.responsible) ? task.responsible.join(', ') : task.responsible}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusLabels[task.status] || task.status}</td>
                <td class="px-6 py-4 whitespace-nowrap">${formatDate(task.createdAt)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${task.dueDate ? formatDate(task.dueDate) : ''}</td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center gap-2"><button class="info-btn text-custom-medium hover:text-custom-dark dark:hover:text-custom-light p-1" data-task-id="${task.id}" title="Ver histórico"><i data-lucide="info" class="w-5 h-5 pointer-events-none"></i></button>${azureLinkIcon}<button class="delete-btn text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1" data-task-id="${task.id}" title="Excluir tarefa"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button></div></td>
            </tr>`;
    }).join('');
    const tableHtml = `
        <div class="bg-white dark:bg-custom-darkest/40 rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-custom-light dark:bg-custom-darkest/60">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="id"><div class="flex items-center">ID ${getSortIndicator('id')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="title"><div class="flex items-center gap-2"><span>Tarefa</span><span class="bg-custom-medium/50 dark:bg-custom-dark/80 text-custom-darkest dark:text-custom-light text-xs font-bold px-2 py-1 rounded-full">${activeTasks.length}</span>${getSortIndicator('title')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="project"><div class="flex items-center">Projeto ${getSortIndicator('project')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="responsible"><div class="flex items-center">Responsável ${getSortIndicator('responsible')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="status"><div class="flex items-center">Estado ${getSortIndicator('status')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="createdAt"><div class="flex items-center">Criação ${getSortIndicator('createdAt')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider cursor-pointer sortable-header" data-sort-by="dueDate"><div class="flex items-center">Data Prevista ${getSortIndicator('dueDate')}</div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody id="list-view-tbody" class="divide-y divide-custom-light dark:divide-custom-dark">
                    ${tableBody}
                    ${activeTasks.length === 0 ? '<tr><td colspan="8" class="text-center py-10 text-custom-dark dark:text-custom-medium">Nenhuma tarefa encontrada.</td></tr>' : ''}
                </tbody>
            </table>
        </div>`;
    listViewEl.innerHTML = tableHtml;
    lucide.createIcons();
}

export function updateActiveView() {
    const viewSwitcherEl = document.getElementById('view-switcher');
    const kanbanViewEl = document.getElementById('kanbanView');
    const listViewEl = document.getElementById('listView');
    const archivedViewEl = document.getElementById('archivedView');

    populateResponsibleFilter();
    populateProjectFilter();
    
    viewSwitcherEl.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('bg-custom-light', btn.dataset.view === state.currentView);
        btn.classList.toggle('text-custom-darkest', btn.dataset.view === state.currentView);
        btn.classList.toggle('text-custom-light', btn.dataset.view !== state.currentView);
    });

    kanbanViewEl.classList.toggle('hidden', state.currentView !== 'kanban');
    listViewEl.classList.toggle('hidden', state.currentView !== 'list');
    archivedViewEl.classList.toggle('hidden', state.currentView !== 'archived');

    if (state.currentView === 'kanban') renderKanbanView();
    else if (state.currentView === 'list') renderListView();
    else if (state.currentView === 'archived') renderArchivedTasks();

    if (state.lastInteractedTaskId) {
        setTimeout(() => highlightTask(state.lastInteractedTaskId, state.currentView === 'kanban'), 0);
    }
}

export function renderArchivedTasks() {
    const archivedViewEl = document.getElementById('archivedView');
    const archivedTasks = state.tasks.filter(t => t.status === 'done');
    const tableBody = archivedTasks.map(task => `
        <tr class="list-row hover:bg-custom-light/50 dark:hover:bg-custom-dark/50" data-task-id="${task.id}">
            <td class="px-6 py-4"><div class="description-truncate" title="${task.description}">${task.description}</div></td>
            <td class="px-6 py-4 whitespace-nowrap">${task.project || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">${Array.isArray(task.responsible) ? task.responsible.join(', ') : task.responsible}</td>
            <td class="px-6 py-4 whitespace-nowrap">${formatDate(task.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap"><div class="flex items-center gap-2"><button class="restore-btn text-blue-400 hover:text-blue-600 p-1" data-task-id="${task.id}" title="Restaurar Tarefa"><i data-lucide="undo-2" class="w-5 h-5 pointer-events-none"></i></button><button class="delete-btn text-red-400 hover:text-red-600 p-1" data-task-id="${task.id}" title="Excluir Tarefa"><i data-lucide="trash-2" class="w-5 h-5 pointer-events-none"></i></button></div></td>
        </tr>`).join('');
    const tableHtml = `
        <div class="bg-white dark:bg-custom-darkest/40 rounded-lg shadow overflow-hidden">
            <table class="min-w-full">
                <thead class="bg-custom-light dark:bg-custom-darkest/60">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider"><div class="flex items-center gap-2"><span>Tarefa Concluída</span><span class="bg-custom-medium/50 dark:bg-custom-dark/80 text-custom-darkest dark:text-custom-light text-xs font-bold px-2 py-1 rounded-full">${archivedTasks.length}</span></div></th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider">Projeto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider">Responsável</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider">Criação</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-custom-dark dark:text-custom-light uppercase tracking-wider">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-custom-light dark:divide-custom-dark">
                    ${tableBody}
                    ${archivedTasks.length === 0 ? '<tr><td colspan="5" class="text-center py-10 text-custom-dark dark:text-custom-medium">Nenhuma tarefa arquivada.</td></tr>' : ''}
                </tbody>
            </table>
        </div>`;
    archivedViewEl.innerHTML = tableHtml;
    lucide.createIcons();
}

export function renderTaskHistory(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const statusLabels = { todo: 'A fazer', stopped: 'Parado', inprogress: 'Em Andamento', homologation: 'Em Homologação', done: 'Pronto', edited: 'Editado' };
    document.getElementById('modal-info-title').textContent = task.title || '';
    const projectTag = document.getElementById('modal-info-project');
    if (task.project) {
        projectTag.textContent = task.project;
        projectTag.style.color = task.projectColor;
    } else { projectTag.textContent = ''; }
    document.getElementById('modal-info-description').textContent = task.description;
    document.getElementById('modal-info-responsible').textContent = Array.isArray(task.responsible) ? task.responsible.join(', ') : task.responsible;
    const linkContainer = document.getElementById('modal-info-azure-link-container');
    const linkEl = document.getElementById('modal-info-azure-link');
    if (task.azureLink) {
        linkEl.href = task.azureLink;
        linkEl.textContent = task.azureLink;
        linkContainer.classList.remove('hidden');
    } else { linkContainer.classList.add('hidden'); }
    const dueDateContainer = document.getElementById('modal-info-dueDate-container');
    const dueDateEl = document.getElementById('modal-info-dueDate');
    if (task.dueDate) {
        dueDateEl.textContent = formatDate(task.dueDate);
        dueDateContainer.classList.remove('hidden');
    } else { dueDateContainer.classList.add('hidden'); }
    const historyItems = (task.history || []).map(item => ({ ...item, type: 'history' }));
    const commentItems = (task.comments || []).map((item, index) => ({ ...item, type: 'comment', index }));
    const activityFeedItems = [...historyItems, ...commentItems].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const feedEl = document.getElementById('activity-feed');
    feedEl.innerHTML = activityFeedItems.map(item => {
        if (item.type === 'history') {
            return `<div class="flex items-center gap-2 text-xs"><i data-lucide="history" class="w-4 h-4 text-custom-medium"></i><div><span class="font-semibold">${statusLabels[item.status] || item.status}</span><span class="text-custom-dark dark:text-custom-medium ml-1">${formatDateTime(item.timestamp)}</span></div></div>`;
        } else {
            return `<div class="p-2 bg-custom-light dark:bg-custom-dark/50 rounded-lg group relative"><div class="flex justify-between items-center text-xs mb-1"><span class="font-bold text-custom-darkest dark:text-custom-light">${item.author || 'Usuário'}</span><span class="text-custom-dark dark:text-custom-medium">${formatDateTime(item.timestamp)}</span></div><p class="text-sm text-custom-darkest dark:text-custom-light pr-6">${item.text}</p><button class="delete-comment-btn absolute top-1 right-1 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" data-task-id="${taskId}" data-comment-index="${item.index}" title="Excluir comentário"><i data-lucide="trash-2" class="w-3 h-3 pointer-events-none"></i></button></div>`;
        }
    }).join('');
    document.getElementById('taskHistoryModal').classList.remove('hidden');
    lucide.createIcons();
}

export function highlightTask(taskId, temporary = true) {
    document.querySelectorAll('.highlight, .new-card').forEach(el => {
        el.classList.remove('highlight');
        el.classList.remove('new-card');
    });
    if (!taskId) return;
    const selector = `.task-card[data-task-id="${taskId}"], .list-row[data-task-id="${taskId}"]`;
    const elementToHighlight = document.querySelector(selector);
    if (elementToHighlight) {
        const classToAdd = temporary ? 'new-card' : 'highlight';
        elementToHighlight.classList.add(classToAdd);
        if (temporary) {
            setTimeout(() => {
                if (elementToHighlight.classList.contains('new-card')) {
                    elementToHighlight.classList.remove('new-card');
                }
            }, 1500);
        }
    }
}

export function populateResponsibleFilter() {
    const responsibleFilterEl = document.getElementById('responsibleFilter');
    const responsibles = [...new Set(state.tasks.flatMap(t => t.responsible).filter(Boolean))];
    const currentFilterValue = responsibleFilterEl.value;
    responsibleFilterEl.innerHTML = '<option value="all">Todos</option>';
    responsibles.forEach(r => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r;
        responsibleFilterEl.appendChild(option);
    });
    responsibleFilterEl.value = currentFilterValue;
}

export function populateProjectFilter() {
    const projectFilterEl = document.getElementById('projectFilter');
    const projects = [...new Set(state.tasks.map(t => t.project).filter(Boolean))];
    const currentFilterValue = projectFilterEl.value;
    projectFilterEl.innerHTML = '<option value="all">Todos os Projetos</option>';
    projects.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        projectFilterEl.appendChild(option);
    });
    projectFilterEl.value = currentFilterValue;
}

export function setupTagInput(initialResponsibles = []) {
    const container = document.getElementById('responsible-input-container');
    const input = document.getElementById('taskResponsible');
    const suggestionsContainer = document.getElementById('responsible-suggestions');
    const allResponsibles = [...new Set(state.tasks.flatMap(t => t.responsible).filter(Boolean))];
    let currentResponsibles = [...initialResponsibles];

    const renderTags = () => {
        container.querySelectorAll('.responsible-tag').forEach(tag => tag.remove());
        currentResponsibles.forEach(name => {
            const tag = document.createElement('div');
            tag.className = 'responsible-tag';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            tag.appendChild(nameSpan);
            const removeBtn = document.createElement('span');
            removeBtn.className = 'tag-remove-btn';
            removeBtn.innerHTML = `<i data-lucide="x" class="w-3 h-3 pointer-events-none"></i>`;
            removeBtn.onclick = () => {
                currentResponsibles = currentResponsibles.filter(r => r !== name);
                renderTags();
            };
            tag.appendChild(removeBtn);
            container.insertBefore(tag, input);
        });
        lucide.createIcons();
    };

    const addResponsible = (name) => {
        const trimmedName = name.trim();
        if (trimmedName && !currentResponsibles.includes(trimmedName)) {
            currentResponsibles.push(trimmedName);
            renderTags();
        }
        input.value = '';
        suggestionsContainer.classList.add('hidden');
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === ',' || e.key === 'Enter') {
            e.preventDefault();
            addResponsible(input.value);
        }
        if (e.key === 'Backspace' && input.value === '' && currentResponsibles.length > 0) {
            currentResponsibles.pop();
            renderTags();
        }
    });

    const showSuggestions = (filteredData) => {
        suggestionsContainer.innerHTML = '';
        if (filteredData.length === 0) {
            suggestionsContainer.classList.add('hidden');
            return;
        }
        filteredData.forEach(name => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'p-2 cursor-pointer hover:bg-custom-light dark:hover:bg-custom-dark';
            suggestionItem.textContent = name;
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                addResponsible(name);
                input.focus();
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
        suggestionsContainer.classList.remove('hidden');
    };

    const updateSuggestions = () => {
        const query = input.value.trim().toLowerCase();
        const availableSuggestions = allResponsibles.filter(name => !currentResponsibles.includes(name));
        if (query === '') {
            showSuggestions(availableSuggestions);
        } else {
            const filtered = availableSuggestions.filter(name => name.toLowerCase().includes(query));
            showSuggestions(filtered);
        }
    };
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('input', updateSuggestions);
    renderTags();
};

export function setupProjectSuggestions() {
    const input = document.getElementById('taskProject');
    const suggestionsContainer = document.getElementById('project-suggestions');
    const colorInput = document.getElementById('taskProjectColor');
    const projects = new Map();
    state.tasks.forEach(task => {
        if (task.project && !projects.has(task.project)) {
            projects.set(task.project, task.projectColor);
        }
    });
    const allProjects = Array.from(projects.keys());
    const showSuggestions = (filteredData) => {
        suggestionsContainer.innerHTML = '';
        if (filteredData.length === 0) {
            suggestionsContainer.classList.add('hidden');
            return;
        }
        filteredData.forEach(name => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'p-2 cursor-pointer hover:bg-custom-light dark:hover:bg-custom-dark';
            suggestionItem.textContent = name;
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
                input.value = name;
                colorInput.value = projects.get(name);
                suggestionsContainer.classList.add('hidden');
            });
            suggestionsContainer.appendChild(suggestionItem);
        });
        suggestionsContainer.classList.remove('hidden');
    };
    const updateSuggestions = () => {
        const query = input.value.toLowerCase();
        const filtered = allProjects.filter(name => name.toLowerCase().includes(query));
        showSuggestions(filtered);
    };
    input.addEventListener('focus', updateSuggestions);
    input.addEventListener('input', updateSuggestions);
};

export function setupCustomColorPicker() {
    const colorInput = document.getElementById('taskProjectColor');
    const colorButton = document.getElementById('color-picker-button');
    const colorPalette = document.getElementById('color-palette');
    const nativePickerTrigger = document.getElementById('native-color-picker-trigger');
    const colors = ['#526D82', '#9DB2BF', '#27374D', '#1D5B79', '#468B97', '#EF6262', '#F3AA60', '#F9D949', '#68B984', '#3D5656', '#A25B5B', '#635985'];
    colorPalette.innerHTML = colors.map(color => `<div class="w-full h-8 rounded-md cursor-pointer color-swatch" style="background-color: ${color};" data-color="${color}"></div>`).join('');
    const syncColor = () => { colorButton.style.backgroundColor = colorInput.value; };
    colorButton.addEventListener('click', () => colorPalette.classList.toggle('hidden'));
    colorPalette.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (swatch) {
            colorInput.value = swatch.dataset.color;
            syncColor();
            colorPalette.classList.add('hidden');
        }
    });
    nativePickerTrigger.addEventListener('click', () => colorInput.click());
    colorInput.addEventListener('input', () => syncColor());
    syncColor();
};