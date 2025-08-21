const { InteractionType, InteractionResponseType, verifyKeyMiddleware } = require('discord-interactions');

// Importar a lógica dos comandos de um ficheiro separado (que vamos criar)
// const { handleCommand } = require('./commands'); 

module.exports = async function (context, req) {
    // A verificação é feita através de um "middleware" que o Azure Functions não suporta nativamente.
    // Por isso, chamamos a função de verificação manualmente.
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = req.rawBody;

    const isValidRequest = verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY)(req);

    if (!isValidRequest) {
        context.log('Assinatura inválida.');
        context.res = {
            status: 401,
            body: 'Assinatura inválida.'
        };
        return;
    }
    
    const interaction = req.body;

    // O Discord envia um "PING" para verificar se o bot está vivo.
    if (interaction.type === InteractionType.PING) {
        context.res = {
            body: { type: InteractionResponseType.PONG }
        };
    // Quando um comando é executado
    } else if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        
        // Simples comando de teste por agora
        if (interaction.data.name === 'ping') {
            context.res = {
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Pong!',
                    },
                }
            };
        } else {
             context.res = {
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Comando desconhecido.',
                    },
                }
            };
        }

    } else {
        context.res = {
            status: 400,
            body: 'Tipo de interação não suportado.'
        };
    }
};