// js/signalr.js
import { state } from './state.js';
import { updateActiveView, renderTaskHistory } from './ui.js';
import { fetchTasks } from './api.js';

export function connectToSignalR() {
    const connection = new signalR.HubConnectionBuilder()
        .withUrl('/api')
        .build();

    connection.on('taskCreated', (newTask) => {
        console.log('SignalR: Nova tarefa recebida!', newTask);
        state.tasks.push(newTask);
        updateActiveView();
    });

    connection.on('taskUpdated', (updatedTask) => {
        console.log('SignalR: Tarefa atualizada!', updatedTask);
        const index = state.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            state.tasks[index] = updatedTask;
        }
        updateActiveView();

        const isHistoryModalOpen = !document.getElementById('taskHistoryModal').classList.contains('hidden');
        if (isHistoryModalOpen && updatedTask.id === state.lastInteractedTaskId) {
            renderTaskHistory(updatedTask.id);
        }
    });

    connection.on('taskDeleted', (taskId) => {
        console.log('SignalR: Excluindo tarefa com ID:', taskId);
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        updateActiveView();
    });

    connection.on('tasksReordered', async () => {
        console.log('SignalR: Ordem das tarefas foi alterada, buscando a nova lista.');
        state.tasks = await fetchTasks();
        updateActiveView();
    });

    async function start() {
        try {
            await connection.start();
            console.log("Conectado ao SignalR.");
        } catch (err) {
            console.log(err);
            setTimeout(start, 5000);
        }
    };

    connection.onclose(start);
    start();
}