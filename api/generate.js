export default async function handler(request, response) {

  if (request.method !== "POST") {
    return response.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const {
      customer,
      jobType,
      job,
      hours,
      hourly,
      materials
    } = request.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return response.status(500).json({
        error: "OPENAI_API_KEY mangler i Vercel"
      });
    }

    const prompt = `
Du er TilbudsAI, en profesjonell tilbudsassistent for norske håndverkere.

Lag en kort, profesjonell og hyggelig tilbudstekst på norsk.

Kunde: ${customer || "Kunden"}
Type jobb: ${jobType || "Annet"}
Beskrivelse: ${job || "Ikke oppgitt"}
Antall timer: ${hours || 0}
Timepris: ${hourly || 0} kr
Materialer: ${materials || 0} kr

Skriv teksten med disse tre delene:

1. Beskrivelse av arbeidet
2. Hva tilbudet inkluderer
3. Kort profesjonell avslutning

FORMAT:
- Ikke bruk Markdown.
- Ikke bruk stjerner eller **.
- Ikke skriv overskriftene med **.
- Skriv overskriftene som vanlig tekst.
- Bruk korte avsnitt og punktlister når det passer.

VIKTIG:
- Ikke skriv priser.
- Ikke skriv totalsum.
- Ikke skriv MVA.
- Ikke skriv timepris.
- Ikke finn på arbeid eller materialer.
- Svar kun med selve tilbudsteksten.
- Svar på norsk.
`;

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: prompt
        })
      }
    );

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {

      console.error("OpenAI error:", data);

      return response.status(500).json({
        error:
          data?.error?.message ||
          "OpenAI request failed"
      });
    }

    const text =
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n")
        ?.trim() || "";

    if (!text) {
      return response.status(500).json({
        error: "AI returnerte ingen tekst"
      });
    }

    return response.status(200).json({
      text
    });

  } catch (error) {

    console.error("Server error:", error);

    return response.status(500).json({
      error: error.message || "Server error"
    });

  }
}
