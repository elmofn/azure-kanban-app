const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

module.exports = async function (context, req) {
    // Verificação de segurança mais robusta para o ambiente do Azure Functions
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    // O `req.rawBody` é crucial e específico do Azure Functions
    const rawBody = req.rawBody; 

    const isValidRequest = verifyKey(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
        context.log.warn('Assinatura inválida. Pedido recusado.');
        context.res = { status: 401, body: 'Assinatura inválida.' };
        return;
    }

    const interaction = req.body;

    // O Discord envia um "PING" para verificar se o bot está vivo.
    if (interaction.type === InteractionType.PING) {
        context.log('A responder a um PING do Discord.');
        context.res = {
            body: { type: InteractionResponseType.PONG }
        };
        return;
    }

    // Quando um comando é executado
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data.name;
        context.log(`A processar o comando: ${commandName}`);

        try {
            if (commandName === 'ping') {
                context.res = {
                    body: {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Pong! A minha ligação com o SyncBoard está a funcionar.',
                        },
                    }
                };
            } else {
                // Futuramente, outros comandos entrarão aqui
                context.res = {
                    body: {
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: 'Desculpe, ainda não sei como responder a este comando.',
                        },
                    }
                };
            }
        } catch (error) {
            context.log.error('Erro ao processar o comando:', error);
            // Envia uma mensagem de erro visível para o utilizador
            context.res = {
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Ocorreu um erro ao tentar executar este comando.',
                    },
                }
            };
        }
        return;
    }

    // Se for um tipo de interação desconhecido
    context.log.warn(`Tipo de interação não suportado: ${interaction.type}`);
    context.res = { status: 400, body: 'Tipo de interação não suportado.' };
};