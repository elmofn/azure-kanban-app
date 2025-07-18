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
            if (!taskData.description || !taskData.responsible) {
                return { status: 400, body: "Descrição e responsável são obrigatórios." };
            }
            const newTask = {
                id: uuidv4(),
                description: taskData.description, // Adiciona a Descrição
                responsible: taskData.responsible, // Adiciona o Responsavel
                azureLink: taskData.azureLink || '', // Adiciona o Link da Azure
                project: taskData.project || '', // Adiciona o nome do projeto
                projectColor: taskData.projectColor || '#526D82', // Adiciona a cor do projeto
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