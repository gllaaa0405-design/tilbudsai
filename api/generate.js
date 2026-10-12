export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Bruk POST for å lage en reiseplan."
    });
  }

  const apiKey = process.env.OPENAI_KEY_NEW;

  if (!apiKey) {
    return res.status(500).json({
      error: "OpenAI API-nøkkelen mangler i Vercel."
    });
  }

  try {
    const {
      destination,
      budget,
      days,
      travelers,
      departureAirport,
      departureDate,
      returnDate,
      style,
      flightsIncluded
    } = req.body || {};

    if (!destination || !budget || !days || !travelers) {
      return res.status(400).json({
        error: "Fyll inn reisemål, budsjett, antall dager og reisende."
      });
    }

    const prompt = `
Du er TilbudsAI, en hjelpsom AI-reiseplanlegger.
Svar på norsk, med tydelige overskrifter og en praktisk reiseplan.

Lag en reiseplan basert på:
- Reisemål: ${destination}
- Totalbudsjett i NOK: ${budget}
- Antall dager: ${days}
- Antall reisende: ${travelers}
- Avreiseflyplass: ${departureAirport || "Ikke oppgitt"}
- Utreisedato: ${departureDate || "Ikke oppgitt"}
- Hjemreisedato: ${returnDate || "Ikke oppgitt"}
- Reisestil: ${style || "Balansert"}
- Fly inkludert i budsjettet: ${flightsIncluded ? "Ja" : "Nei"}

Inkluder:
1. Kort oppsummering av reisen.
2. Forslag til budsjettfordeling i NOK.
3. En plan for hver dag med aktiviteter og sightseeing.
4. Forslag til mat og restauranter.
5. Forslag til hotellområder og overnatting.
6. Transporttips.
7. Lenker til flysøk, hotell, aktiviteter og kart.

Bruk disse søkelenkene:
- Fly: https://www.google.com/travel/flights
- Hotell: https://www.booking.com/
- Aktiviteter: https://www.getyourguide.com/
- Kart og restauranter: https://www.google.com/maps

Ikke finn på bekreftede flypriser, hotellpriser, ledige rom
eller tilgjengelighet. Opplys tydelig når priser bare er anslag.
Budsjettet skal være realistisk, og totalen skal ikke overskride
budsjettet uten at du forklarer hvorfor.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(502).json({
        error: "AI-tjenesten svarte med en feil. Kontroller API-tilgang og fakturering."
      });
    }

    const answer =
      data.output
        ?.flatMap(item => item.content || [])
        .find(item => item.type === "output_text")
        ?.text;

    if (!answer) {
      return res.status(502).json({
        error: "AI-en returnerte ikke en reiseplan. Prøv igjen."
      });
    }

    return res.status(200).json({
      success: true,
      plan: answer
    });
  } catch (error) {
    console.error("Travel planner error:", error);
    return res.status(500).json({
      error: "Noe gikk galt. Prøv igjen."
    });
  }
}
