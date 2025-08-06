const { app, output } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

const signalROutput = output.generic({
    type: 'signalR',
    name: 'signalRMessage',
    hubName: 'tasks',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('createTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        context.log('HTTP trigger function: Criando uma nova tarefa com ID sequencial.');
        try {
            // 1. Incrementa o contador de forma atómica. Esta é a única fonte da verdade.
            const operations = [{ op: 'incr', path: '/currentId', value: 1 }];
            const { resource: updatedCounter } = await container.item("taskCounter", "taskCounter").patch(operations);
            const newNumericId = updatedCounter.currentId;

            const newTaskId = `TC-${String(newNumericId).padStart(3, '0')}`;

            const taskData = await request.json();
            if (!taskData.title || !taskData.description || !taskData.responsible) {
                return { status: 400, body: "Título, Descrição e Responsável são obrigatórios." };
            }

            const responsibles = taskData.responsible.split(',').map(name => name.trim());

            const newTask = {
                id: newTaskId,
                numericId: newNumericId,
                title: taskData.title,
                description: taskData.description,
                responsible: responsibles,
                azureLink: taskData.azureLink || '',
                project: taskData.project || '',
                projectColor: taskData.projectColor || '#526D82',
                status: 'todo',
                createdAt: new Date().toISOString(),
                history: [{ status: 'todo', timestamp: new Date().toISOString() }],
                order: -Date.now(),
                dueDate: taskData.dueDate || null
            };

            // 2. Cria a nova tarefa com o ID único garantido.
            await container.items.create(newTask);

            context.extraOutputs.set(signalROutput, { target: 'tasksUpdated', arguments: [] });
            return { jsonBody: newTask };
        } catch (error) {
            context.log(`Erro ao criar tarefa: ${error.message}`);
            return { status: 500, body: "Erro ao salvar tarefa." };
        }
    }
});