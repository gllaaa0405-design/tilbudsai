
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Ugyldig forespørsel."
    });
  }

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Skriv en melding først."
      });
    }

    const conversation = messages
      .filter(
        (message) =>
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
      )
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, 4000)
      }));

    if (
      conversation.length === 0 ||
      conversation[conversation.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        success: false,
        error: "Siste melding må være fra brukeren."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_KEY_NEW}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "Du er TilbudsAI sin vennlige AI-reiseassistent. " +
            "Svar på norsk med mindre brukeren skriver et annet språk. " +
            "Hjelp med reisemål, budsjetter, aktiviteter og reiseplaner. " +
            "Still spørsmål hvis du trenger mer informasjon. " +
            "Ikke finn på priser, bestillinger eller tilgjengelighet. " +
            "Vær tydelig på at reiseinformasjon må verifiseres.",
          input: conversation
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI-feil:", data.error?.message);

      return res.status(502).json({
        success: false,
        error: "AI-en kunne ikke svare akkurat nå."
      });
    }

    if (!data.output_text) {
      return res.status(502).json({
        success: false,
        error: "AI-en returnerte ikke noe svar."
      });
    }

    return res.status(200).json({
      success: true,
      reply: data.output_text
    });
  } catch (error) {
    console.error("Chat-feil:", error.message);

    return res.status(500).json({
      success: false,
      error: "Noe gikk galt. Prøv igjen."
    });
  }
}
