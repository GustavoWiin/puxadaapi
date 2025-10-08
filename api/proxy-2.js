module.exports = async (req, res) => {
    const { cpf } = req.query;
    const apiUrl = `https://api.dbconsultas.com/api/v1/edb96619-27ba-4552-be8c-fcfc603e2527/cpf/${cpf}`;

    // Lista de origens permitidas
    const allowedOrigins = [
        'https://auxilio-resgate.site',
        'https://www.auxilio-resgate.site' // Adicione outras origens permitidas
    ];

    // Verifica a origem da requisição
    const origin = req.headers.origin;

    if (!origin || !allowedOrigins.includes(origin)) {
        // Bloqueia requisições diretas ou de origens não permitidas
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        // Faz a requisição à API externa
        const apiResponse = await fetch(apiUrl);

        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({ error: 'Failed to fetch data from the API' });
        }

        const data = await apiResponse.json();

        // Define os cabeçalhos CORS
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Retorna os dados da API
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
