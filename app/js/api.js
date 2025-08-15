export async function getUserInfo() {
    try {
        const response = await fetch('/.auth/me');
        if (!response.ok) return null;
        const payload = await response.json();
        return payload.clientPrincipal;
    } catch (error) {
        console.error('Não foi possível obter informações do usuário.', error);
        return null;
    }
}

export async function fetchTasks() {
    const fetchData = fetch('/api/getTasks').then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    });
    const minDisplayTime = new Promise(resolve => setTimeout(resolve, 3000));
    const [fetchedTasks] = await Promise.all([fetchData, minDisplayTime]);
    return fetchedTasks;
}

export async function createTask(taskPayload) {
    const response = await fetch('/api/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload),
    });
    if (!response.ok) throw new Error('Falha ao criar a tarefa.');
    return await response.json();
}

export async function updateTask(taskId, taskPayload) {
    const response = await fetch(`/api/updateTask/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
    });
    if (!response.ok) throw new Error('Falha ao atualizar a tarefa.');
    return await response.json();
}

export async function deleteTask(taskId) {
    const response = await fetch(`/api/deleteTask/${taskId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Falha ao excluir a tarefa.');
}

export async function addComment(taskId, commentPayload) {
    const response = await fetch(`/api/addComment/${taskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload)
    });
    if (!response.ok) throw new Error('Falha ao adicionar o comentário.');
    return await response.json();
}

export async function updateOrder(orderedTasksPayload) {
     const response = await fetch(`/api/updateOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderedTasksPayload)
    });
    if (!response.ok) throw new Error('Falha ao reordenar tarefas.');
}

export async function deleteComment(taskId, commentIndex) {
    const response = await fetch(`/api/deleteComment/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: commentIndex })
    });
    if (!response.ok) throw new Error('Falha ao excluir o comentário.');
    return await response.json();
}

export async function updateProjectColor(projectName, newColor) {
    const response = await fetch(`/api/updateProjectColor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, newColor })
    });
    if (!response.ok) throw new Error('Falha ao atualizar a cor do projeto.');
}

export async function fetchArchivedTasks() {
    const response = await fetch('/api/getArchivedTasks');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}