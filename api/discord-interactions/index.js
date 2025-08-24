const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

module.exports = async function (context, req) {
    // ... (código de verificação da assinatura - mantenha-o como está) ...
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = JSON.stringify(req.body); // Simplificado

    const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
        return { status: 401, body: 'Assinatura inválida.' };
    }

    const interaction = req.body;

    if (interaction.type === InteractionType.PING) {
         return { headers: { 'Content-Type': 'application/json' }, body: { type: InteractionResponseType.PONG }};
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE) {
        // ... (código do autocomplete - mantenha-o como está) ...
        // Este código é rápido, não precisa de ser mudado.
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const commandName = interaction.data.name;

        if (commandName === 'novatarefa') {
            // Adia a resposta para o utilizador ver "a pensar..."
            context.res = {
                headers: { 'Content-Type': 'application/json' },
                body: { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE }
            };

            // Envia os dados para a fila para serem processados em segundo plano
            context.bindings.outputQueueItem = {
                interaction: interaction,
                responsibleName: interaction.data.options.find(opt => opt.name === 'responsavel').value,
                project: interaction.data.options.find(opt => opt.name === 'projeto')?.value
            };
        } else {
             context.res = { 
                 headers: { 'Content-Type': 'application/json' },
                 body: { 
                     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                     data: { content: 'Comando não implementado.' }
                }
            };
        }
    }
};