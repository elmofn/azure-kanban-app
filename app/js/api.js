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
    const response = await fetch('/api/getTasks');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// FUNÇÃO QUE ESTAVA EM FALTA
export async function fetchUsers() {
    const response = await fetch('/api/getUsers');
    if (!response.ok) throw new Error('Falha ao buscar usuários.');
    return await response.json();
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

export async function uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/tasks/attachments', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Falha no upload do anexo.');
    }
    return await response.json();
}

export async function deleteAttachment(blobName) {
    const response = await fetch(`/api/tasks/attachments/${blobName}`, {
        method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
        throw new Error('Falha ao eliminar o anexo.');
    }
    return response;
}

export async function addUser(userPayload) {
    const response = await fetch('/api/addUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || 'Falha ao adicionar o utilizador.');
    }
    return await response.json();
}

export async function deleteUser(userId) {
    // O userId é o email, por isso devemos usar encodeURIComponent para garantir que caracteres como '@' passam corretamente na URL
    const response = await fetch(`/api/deleteUser/${encodeURIComponent(userId)}`, { 
        method: 'DELETE' 
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Falha ao eliminar o utilizador.');
    }
}