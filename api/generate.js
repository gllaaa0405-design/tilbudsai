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
    } = request.body;

    const prompt = `
Du er TilbudsAI, en profesjonell tilbudsassistent for norske håndverkere.

Lag en kort og profesjonell tekst til et tilbud basert på informasjonen under.

Kunde: ${customer || "Kunden"}
Type jobb: ${jobType || "Annet"}
Beskrivelse: ${job || "Ikke oppgitt"}
Antall timer: ${hours || 0}
Timepris: ${hourly || 0} kr
Materialer: ${materials || 0} kr

Skriv:
1. En profesjonell beskrivelse av arbeidet.
2. En kort tekst om hva tilbudet inkluderer.
3. En kort og profesjonell avslutning til kunden.

Ikke finn på ekstra arbeid, priser eller materialer som ikke er oppgitt.
Svar på norsk.
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
      console.error(data);

      return response.status(500).json({
        error: "OpenAI request failed"
      });
    }

    const text =
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n") || "";

    return response.status(200).json({
      text
    });

  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: "Server error"
    });
  }
}
