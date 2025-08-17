module.exports = async function (context, req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  context.res = {
    // status: 200, /* Defaults to 200 */
    headers: { 'Content-Type': 'text/plain' },
    body: `GOOGLE_CLIENT_ID lido pelo ambiente: ${clientId || 'NAO ENCONTRADO'}`
  };
}