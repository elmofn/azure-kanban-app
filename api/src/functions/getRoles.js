const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

const connectionString = process.env.CosmosDB;
const client = new CosmosClient(connectionString);
const database = client.database("TasksDB");
const usersContainer = database.container("Users");

app.http('getRoles', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Função getRoles iniciada (lógica de whitelist).');

        try {
            await database.containers.createIfNotExists({ id: "Users", partitionKey: { paths: ["/email"] } });

            const clientPrincipal = await request.json();
            const emailClaim = clientPrincipal.claims.find(c => c.typ === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress');
            const email = emailClaim ? emailClaim.val : null;

            if (!email) {
                context.warn('Não foi possível encontrar o claim de e-mail.');
                // --- CORREÇÃO AQUI ---
                return { jsonBody: { roles: ['authenticated'] } };
            }

            const { resource: existingUser } = await usersContainer.item(email, email).read().catch(() => ({ resource: null }));

            if (existingUser) {
                context.log(`Utilizador ${email} encontrado na whitelist.`);
                
                const nameClaim = clientPrincipal.claims.find(c => c.typ === 'name');
                const pictureClaim = clientPrincipal.claims.find(c => c.typ === 'picture');
                existingUser.name = nameClaim ? nameClaim.val : email;
                existingUser.picture = pictureClaim ? pictureClaim.val : '';
                await usersContainer.items.upsert(existingUser);

                const roles = ['authenticated', 'travelcash_user'];

                if (existingUser.isAdmin === true) {
                    roles.push('admin');
                    context.log(`Utilizador ${email} autorizado com a role 'admin'.`);
                }

                // --- CORREÇÃO PRINCIPAL AQUI ---
                // A resposta DEVE ser um objeto com a chave "roles"
                return { jsonBody: { roles: roles } };

            } else {
                context.warn(`ACESSO NEGADO: Utilizador ${email} não encontrado na whitelist.`);
                // --- CORREÇÃO AQUI ---
                return { jsonBody: { roles: ['authenticated'] } };
            }

        } catch (error) {
            context.error(`Erro na função de roles: ${error.message}`);
            // --- CORREÇÃO AQUI ---
            return { jsonBody: { roles: ['authenticated'] } };
        }
    }
});