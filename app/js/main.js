import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { connectToSignalR } from './signalr.js';

// --- PONTO DE ENTRADA DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const loaderContainerEl = document.getElementById('loader-container');
    const mainContentEl = document.getElementById('main-content');

    try {
        initializeEventListeners();
        
        state.currentUser = await api.getUserInfo();
        if (!state.currentUser) {
            loaderContainerEl.innerHTML = '<p class="text-xl text-white">Acesso negado.</p>';
            return;
        }

        const tasks = await api.fetchTasks();
        state.tasks = tasks;

        loaderContainerEl.classList.add('hidden');
        mainContentEl.classList.add('content-reveal');

        ui.updateActiveView();
        lucide.createIcons();
        
        connectToSignalR();

    } catch (error) {
        console.error("Falha na inicialização:", error);
        loaderContainerEl.innerHTML = `<p class="text-red-500 text-2xl">Falha ao carregar: ${error.message}</p>`;
    }
});


// --- FUNÇÃO CENTRAL QUE INICIALIZA TODAS AS INTERAÇÕES ---

function initializeEventListeners() {
    const taskModal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const historyModal = document.getElementById('taskHistoryModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const dueDateModal = document.getElementById('dueDateModal');

    // Lógica do Tema (Dark/Light)
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const applyTheme = () => {
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            themeIconLight.classList.remove('hidden');
            themeIconDark.classList.add('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            themeIconLight.classList.add('hidden');
            themeIconDark.classList.remove('hidden');
        }
    }
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        applyTheme();
    });
    applyTheme();

    // Filtros
    document.getElementById('responsibleFilter').addEventListener('change', (e) => {
        state.selectedResponsible = e.target.value;
        ui.updateActiveView();
    });
    document.getElementById('projectFilter').addEventListener('change', (e) => {
        state.selectedProject = e.target.value;
        ui.updateActiveView();
    });

    // Seletor de View
    document.getElementById('view-switcher').addEventListener('click', (e) => {
        const view = e.target.closest('.view-btn')?.dataset.view;
        if (view && view !== state.currentView) {
            state.currentView = view;
            if (state.currentView === 'kanban') {
                state.lastInteractedTaskId = null;
                ui.highlightTask(null);
            }
            ui.updateActiveView();
        }
    });

    // Modal de Tarefa
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        state.editingTaskId = null;
        document.getElementById('modalTitle').textContent = 'Nova Tarefa';
        taskForm.reset();
        document.getElementById('color-picker-button').style.backgroundColor = '#526D82';
        ui.setupTagInput([]);
        ui.setupProjectSuggestions();
        ui.setupCustomColorPicker();
        taskModal.classList.remove('hidden');
    });
    document.getElementById('cancelBtn').addEventListener('click', () => taskModal.classList.add('hidden'));

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const responsibleTags = Array.from(document.querySelectorAll('#responsible-input-container .responsible-tag'));
        const dueDateValue = document.getElementById('taskDueDate').value;
        let dueDateISO = null;
        if (dueDateValue) {
            const dateParts = dueDateValue.split('-');
            dueDateISO = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10))).toISOString();
        }
        const taskPayload = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            responsible: responsibleTags.map(tag => tag.firstChild.textContent).join(','),
            project: document.getElementById('taskProject').value,
            projectColor: document.getElementById('taskProjectColor').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: dueDateISO,
            azureLink: document.getElementById('taskAzureLink').value
        };
        try {
            const apiCall = state.editingTaskId ? api.updateTask(state.editingTaskId, taskPayload) : api.createTask(taskPayload);
            const savedTask = await apiCall;
            state.taskToHighlightTemporarily = savedTask.id;
            taskModal.classList.add('hidden');
        } catch (error) {
            console.error("Erro ao salvar tarefa:", error);
            alert('Falha ao salvar a tarefa.');
        }
    });
    
    // Modais de Histórico, Exclusão e Data
    document.getElementById('closeHistoryBtn').addEventListener('click', () => historyModal.classList.add('hidden'));
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));
    document.getElementById('cancelDueDateBtn').addEventListener('click', () => dueDateModal.classList.add('hidden'));

    document.getElementById('add-comment-btn').addEventListener('click', async () => {
        const commentInput = document.getElementById('comment-input');
        const text = commentInput.value.trim();
        if (!text || !state.lastInteractedTaskId) return;
        try {
            await api.addComment(state.lastInteractedTaskId, { text });
            commentInput.value = '';
        } catch (error) {
            console.error("Erro ao adicionar comentário:", error);
        }
    });

    // Delegação de eventos para botões de ação
    document.body.addEventListener('click', async (e) => {
        const target = e.target;
        const infoBtn = target.closest('.info-btn');
        const deleteBtn = target.closest('.delete-btn');
        const approveBtn = target.closest('.approve-btn');
        const restoreBtn = target.closest('.restore-btn');

        if (infoBtn) {
            state.lastInteractedTaskId = infoBtn.dataset.taskId;
            ui.highlightTask(state.lastInteractedTaskId, false);
            ui.renderTaskHistory(state.lastInteractedTaskId);
        }

        if (deleteBtn) {
            const taskId = deleteBtn.dataset.taskId;
            document.getElementById('confirmDeleteBtn').onclick = async () => {
                try {
                    await api.deleteTask(taskId);
                    deleteConfirmModal.classList.add('hidden');
                } catch (error) {
                    console.error("Erro ao excluir:", error);
                }
            };
            deleteConfirmModal.classList.remove('hidden');
        }
        
        if (approveBtn) {
            try { await api.updateTask(approveBtn.dataset.taskId, { status: 'done' }); } 
            catch (error) { console.error("Erro ao aprovar tarefa:", error); }
        }

        if(restoreBtn) {
            try { await api.updateTask(restoreBtn.dataset.taskId, { status: 'todo' }); } 
            catch (error) { console.error("Erro ao restaurar tarefa:", error); }
        }
    });

    // Drag-and-Drop
    initializeDragAndDrop();
}

function initializeDragAndDrop() {
    document.querySelectorAll('.task-list').forEach(list => {
        new Sortable(list, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async function (evt) {
                const taskId = evt.item.dataset.taskId;
                const newStatus = evt.to.dataset.columnId;
                const task = state.tasks.find(t => t.id === taskId);
                
                state.taskToHighlightTemporarily = taskId;
                
                if (task && task.status !== newStatus) {
                    await api.updateTask(taskId, { status: newStatus });
                }

                const orderedTasksPayload = [];
                document.querySelectorAll('.kanban-column .task-list').forEach(column => {
                    Array.from(column.children).forEach((taskCard, index) => {
                        if (taskCard.dataset.taskId) {
                            orderedTasksPayload.push({
                                id: taskCard.dataset.taskId,
                                order: index
                            });
                        }
                    });
                });
                
                try {
                    await api.updateOrder(orderedTasksPayload);
                } catch (error) {
                     console.error("Erro ao reordenar tarefas:", error);
                }
            }
        });
    });
}