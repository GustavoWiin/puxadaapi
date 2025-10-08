module.exports = async (req, res) => {
    const { cpf } = req.query;

    // Updated API URL with encoded CPF
    const apiUrl = `https://api.mytrust.space/v1/cpf/${encodeURIComponent(cpf)}`;

    // Allowed origins
      const allowedOrigins = [
    'https://www.vazamentosdados.online',
    'https://vazamentosdados.online',
    // Adicione outras origens permitidas
];

    // Check the origin of the request
    const origin = req.headers.origin;

    if (!origin || !allowedOrigins.includes(origin)) {
        // Deny requests without a valid origin
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        // Make the request to the external API with the required header
        const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'x-trust-key': 'sk_01jqq1jxs3tts31nf5gpypakkh01jqq1jxs4hc71pemvz4ch40sm' // Required header
            }
        });

        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({ error: 'Failed to fetch data from the API' });
        }

        const data = await apiResponse.json();

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Return the API response to the frontend
        return res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
