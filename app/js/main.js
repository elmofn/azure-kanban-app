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

    // Modal de Tarefa (Adicionar/Editar)
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

        const projectName = document.getElementById('taskProject').value.trim();
        const newColor = document.getElementById('taskProjectColor').value;

        // --- LÓGICA DE VERIFICAÇÃO DE COR CORRIGIDA ---

        // 1. Encontra a cor original do projeto, se ele já existir.
        let originalProjectColor = null;
        const existingProjectTask = state.tasks.find(t => t.project === projectName);
        if (existingProjectTask) {
            originalProjectColor = existingProjectTask.projectColor;
        }

        // 2. Decide se o modal de confirmação deve ser exibido.
        // Isso acontece se o projeto já existia E a cor foi alterada.
        const shouldPromptColorChange = originalProjectColor && originalProjectColor !== newColor;

        // Constrói o payload da tarefa (o que será salvo)
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
            project: projectName,
            projectColor: newColor,
            priority: document.getElementById('taskPriority').value,
            dueDate: dueDateISO,
            azureLink: document.getElementById('taskAzureLink').value
        };

        // Ação de salvar a tarefa atual (será reutilizada)
        const saveTaskAction = async () => {
            try {
                const apiCall = state.editingTaskId ? api.updateTask(state.editingTaskId, taskPayload) : api.createTask(taskPayload);
                const savedTask = await apiCall;
                state.taskToHighlightTemporarily = savedTask.id;
                taskModal.classList.add('hidden');
            } catch (error) {
                console.error("Erro ao salvar tarefa:", error);
                alert('Falha ao salvar a tarefa.');
            }
        };
        
        // 3. Executa a lógica
        if (shouldPromptColorChange) {
            showConfirmModal(
                'Atualizar Cor do Projeto',
                `Você alterou a cor do projeto "${projectName}". Deseja aplicar esta nova cor para TODAS as tarefas deste projeto?`,
                // Ação se o usuário clicar "Sim, em todas"
                async () => { 
                    try {
                        // Primeiro, atualiza a cor globalmente
                        await api.updateProjectColor(projectName, newColor);
                    } catch (error) {
                        console.error("Erro ao atualizar a cor global do projeto:", error);
                        alert("Falha ao atualizar a cor de todas as tarefas.");
                    }
                    // Depois, salva a tarefa atual (a API do SignalR irá forçar a atualização de tudo)
                    await saveTaskAction();
                }
            );
            // Modifica o texto dos botões para ficar mais claro
            document.getElementById('confirmDeleteBtn').textContent = 'Sim, em todas';
            document.getElementById('cancelDeleteBtn').textContent = 'Não, só nesta';

            // Define a ação do botão "Cancelar" (neste caso, "Não, só nesta")
            document.getElementById('cancelDeleteBtn').onclick = async () => {
                await saveTaskAction(); // Apenas salva a tarefa atual com a nova cor
                deleteConfirmModal.classList.add('hidden');
            };

        } else {
            // Se não houver mudança de cor, ou se o projeto for novo, apenas salva a tarefa
            await saveTaskAction();
        }
    });
    
    // Modal de Histórico
    document.getElementById('closeHistoryBtn').addEventListener('click', () => historyModal.classList.add('hidden'));
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => deleteConfirmModal.classList.add('hidden'));

    // Adiciona o listener para o seletor de status (usando delegação de evento)
    historyModal.addEventListener('change', async (e) => {
        if (e.target.id === 'modal-status-selector') {
            const newStatus = e.target.value;
            const taskId = state.lastInteractedTaskId;
            if (!taskId) return;

            try {
                await api.updateTask(taskId, { status: newStatus });
                // O SignalR cuidará de atualizar a UI para todos.
            } catch (error) {
                console.error("Falha ao atualizar status pelo modal:", error);
                alert('Não foi possível alterar o status.');
            }
        }
    });
    
    // ---- BOTÃO DE EDITAR TAREFA (CORRIGIDO) ----
    document.getElementById('editTaskBtn').addEventListener('click', () => {
        const taskId = state.lastInteractedTaskId;
        const taskToEdit = state.tasks.find(t => t.id === taskId);
        if (!taskToEdit) return;

        state.editingTaskId = taskId;

        document.getElementById('modalTitle').textContent = 'Editar Tarefa';
        document.getElementById('taskTitle').value = taskToEdit.title || '';
        document.getElementById('taskDescription').value = taskToEdit.description || '';
        document.getElementById('taskAzureLink').value = taskToEdit.azureLink || '';
        document.getElementById('taskProject').value = taskToEdit.project || '';
        document.getElementById('taskProjectColor').value = taskToEdit.projectColor || '#526D82';
        document.getElementById('color-picker-button').style.backgroundColor = taskToEdit.projectColor || '#526D82';
        document.getElementById('taskDueDate').value = taskToEdit.dueDate ? taskToEdit.dueDate.split('T')[0] : '';
        document.getElementById('taskPriority').value = taskToEdit.priority || 'Média';

        ui.setupTagInput(taskToEdit.responsible || []);
        ui.setupProjectSuggestions();
        ui.setupCustomColorPicker();
        
        historyModal.classList.add('hidden');
        taskModal.classList.remove('hidden');
    });

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
        const deleteCommentBtn = target.closest('.delete-comment-btn');

        if (infoBtn) {
            state.lastInteractedTaskId = infoBtn.dataset.taskId;
            ui.highlightTask(state.lastInteractedTaskId, false);
            ui.renderTaskHistory(state.lastInteractedTaskId);
        }

        if (deleteBtn) {
            const taskId = deleteBtn.dataset.taskId;
            // --- LÓGICA ATUALIZADA ---
            showConfirmModal(
                'Excluir Tarefa',
                'Você tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
                async () => {
                    try {
                        await api.deleteTask(taskId);
                    } catch (error) {
                        console.error("Erro ao excluir tarefa:", error);
                    }
                }
            );
        }
        
        if (approveBtn) {
            try { await api.updateTask(approveBtn.dataset.taskId, { status: 'done' }); } 
            catch (error) { console.error("Erro ao aprovar tarefa:", error); }
        }

        if(restoreBtn) {
            try { await api.updateTask(restoreBtn.dataset.taskId, { status: 'todo' }); } 
            catch (error) { console.error("Erro ao restaurar tarefa:", error); }
        }

        if(deleteCommentBtn) {
            const taskId = deleteCommentBtn.dataset.taskId;
            const commentIndex = parseInt(deleteCommentBtn.dataset.commentIndex, 10);
             // --- LÓGICA ATUALIZADA ---
            showConfirmModal(
                'Excluir Comentário',
                'Você tem certeza que deseja excluir este comentário?',
                async () => {
                    try {
                        await api.deleteComment(taskId, commentIndex);
                    } catch (error) {
                        console.error("Erro ao excluir comentário:", error);
                    }
                }
            );
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

function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const confirmTitle = deleteConfirmModal.querySelector('h2');
    const confirmMessage = deleteConfirmModal.querySelector('p');
    const confirmButton = document.getElementById('confirmDeleteBtn');
    const cancelButton = document.getElementById('cancelDeleteBtn');

    // Restaura o texto padrão dos botões
    confirmButton.textContent = 'Confirmar'; // Mudei de 'Excluir' para um termo mais genérico
    cancelButton.textContent = 'Cancelar';

    confirmTitle.innerHTML = `<i data-lucide="alert-triangle" class="w-6 h-6 text-yellow-500"></i> ${title}`; // Mudei a cor para amarelo, mais genérico que vermelho
    confirmMessage.textContent = message;
    lucide.createIcons();

    confirmButton.onclick = () => {
        onConfirm();
        deleteConfirmModal.classList.add('hidden'); // <-- ESTA LINHA ESTAVA FALTANDO
    };

    cancelButton.onclick = () => {
        if (onCancel) {
            onCancel();
        }
        deleteConfirmModal.classList.add('hidden');
    };
    
    deleteConfirmModal.classList.remove('hidden');
}

export async function updateProjectColor(projectName, newColor) {
    const response = await fetch(`/api/updateProjectColor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, newColor })
    });
    if (!response.ok) throw new Error('Falha ao atualizar a cor do projeto.');
}