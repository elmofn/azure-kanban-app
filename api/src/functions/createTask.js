const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require('uuid');

// Lê a string de conexão diretamente das configurações do ambiente
const connectionString = process.env.CosmosDB;

// Validação para garantir que a string de conexão foi encontrada
if (!connectionString) {
    throw new Error("A variável de ambiente 'CosmosDB' com a string de conexão não foi encontrada.");
}

const client = new CosmosClient(connectionString);
const databaseId = "TasksDB";
const containerId = "Tasks";

app.http('createTask', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('HTTP trigger function: Criando uma nova tarefa manualmente.');

        try {
            const taskData = await request.json();

            if (!taskData.description || !taskData.responsible) {
                return {
                    status: 400,
                    body: "Descrição e responsável são obrigatórios."
                };
            }

            // Cria o objeto completo da nova tarefa
            const newTask = {
                id: uuidv4(), // Gera um ID único universal
                description: taskData.description,
                responsible: taskData.responsible,
                azureLink: taskData.azureLink || '',
                status: 'todo',
                createdAt: new Date().toISOString(),
                history: [{ status: 'todo', timestamp: new Date().toISOString() }]
            };
            
            // Conecta ao container e cria o item
            const database = client.database(databaseId);
            const container = database.container(containerId);
            await container.items.create(newTask);

            // Retorna a tarefa recém-criada para o frontend como confirmação
            return { jsonBody: newTask };

        } catch (error) {
            context.log.error(`Erro ao criar tarefa: ${error.message}`);
            return { status: 500, body: "Erro ao salvar tarefa no banco de dados." };
        }
    }
});