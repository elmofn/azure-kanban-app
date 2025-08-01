const { app, output } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require('uuid');

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

const signalROutput = output.generic({
    type: 'signalR',
    direction: 'out',
    name: 'signalR',
    hubName: 'tasks',
    connectionStringSetting: 'AzureSignalRConnectionString',
});

app.http('createTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraOutputs: [signalROutput],
    handler: async (request, context) => {
        context.log('HTTP trigger function: Criando uma nova tarefa.');
        try {
            const taskData = await request.json();
            if (!taskData.title || !taskData.description || !taskData.responsible) {
                return { status: 400, body: "Título, Descrição e Responsável são obrigatórios." };
            }

            // Transforma a string de responsáveis num array, removendo espaços extra
            const responsibles = taskData.responsible.split(',').map(name => name.trim());

            const newTask = {
                id: uuidv4(),
                dueDate: taskData.dueDate || null,
                title: taskData.title,
                description: taskData.description,
                responsible: responsibles, // Guarda como um array
                azureLink: taskData.azureLink || '',
                project: taskData.project || '',
                projectColor: taskData.projectColor || '#526D82',
                status: 'todo',
                createdAt: new Date().toISOString(),
                history: [{ status: 'todo', timestamp: new Date().toISOString() }],
                order: Date.now()
            };
            await database.containers.createIfNotExists({ id: "Tasks", partitionKey: { paths: ["/id"] } });
            await container.items.create(newTask);
            context.extraOutputs.set(signalROutput, {
                target: 'tasksUpdated',
                arguments: []
            });
            return { jsonBody: newTask };
        } catch (error) {
            context.log.error(`Erro ao criar tarefa: ${error.message}`);
            return { status: 500, body: "Erro ao salvar tarefa." };
        }
    }
});