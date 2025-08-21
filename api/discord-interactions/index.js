const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

module.exports = async function (context, req) {
    context.log('Recebido um pedido do Discord.');

    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = req.rawBody;
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (!publicKey) {
        context.log.error('A DISCORD_PUBLIC_KEY não está configurada nas variáveis de ambiente.');
        context.res = { status: 500, body: 'Configuração interna do bot em falta.' };
        return;
    }

    try {
        const isValidRequest = verifyKey(rawBody, signature, timestamp, publicKey);

        if (!isValidRequest) {
            context.log.warn('Assinatura inválida. Acesso negado.');
            context.res = { status: 401, body: 'Assinatura inválida.' };
            return;
        }

        context.log('A assinatura do pedido é válida.');
        const interaction = req.body;

        if (interaction.type === InteractionType.PING) {
            context.log('É um PING. A responder com PONG.');
            context.res = {
                body: { type: InteractionResponseType.PONG }
            };
            return;
        }

        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            context.log(`Recebido o comando: ${interaction.data.name}`);
            // Apenas uma resposta temporária para a validação funcionar
             context.res = {
                body: {
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: 'O comando foi recebido, mas ainda não faz nada.' },
                }
            };
            return;
        }

    } catch (err) {
        context.log.error('Ocorreu um erro inesperado:', err);
        context.res = { status: 500, body: 'Erro interno no servidor.' };
        return;
    }
};