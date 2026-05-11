exports.handler = async function(event) {

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({
                error: "Método não permitido"
            })
        };
    }

    try {

        const body =
        JSON.parse(event.body || "{}");

        const prompt = body.prompt;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key":
                    process.env.GEMINI_API_KEY
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0.6,
                        maxOutputTokens: 900
                    }
                })
            }
        );

        const data =
        await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch(error) {

        return {
            statusCode: 500,

            body: JSON.stringify({
                error: error.message
            })
        };
    }
    }
