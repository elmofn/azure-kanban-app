const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require('uuid');

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const container = database.container("Tasks");

app.http('createTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Criando uma nova tarefa.');

        try {
            const taskData = await request.json();
            if (!taskData.description || !taskData.responsible) {
                return { status: 400, body: "Descrição e responsável são obrigatórios." };
            }

            const newTask = {
                id: uuidv4(),
                description: taskData.description,
                responsible: taskData.responsible,
                azureLink: taskData.azureLink || '',
                status: 'todo',
                createdAt: new Date().toISOString(),
                history: [{ status: 'todo', timestamp: new Date().toISOString() }]
            };

            // Garante que o contêiner exista antes de criar o item
            await database.containers.createIfNotExists({ id: "Tasks", partitionKey: { paths: ["/id"] } });
            await container.items.create(newTask);

            return { jsonBody: newTask };
        } catch (error) {
            context.log.error(`Erro ao criar tarefa: ${error.message}`);
            return { status: 500, body: "Erro ao salvar tarefa." };
        }
    }
});