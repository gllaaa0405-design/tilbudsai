export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Bruk POST for å lage en reiseplan."
    });
  } 

  const apiKey = process.env.OPENAI_KEY_NEW;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
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

    const cleanDestination =
      typeof destination === "string"
        ? destination.trim().slice(0, 120)
        : "";

    const numericBudget = Number(budget);
    const numericDays = Number(days);
    const numericTravelers = Number(travelers);

    if (
      !cleanDestination ||
      !Number.isFinite(numericBudget) ||
      numericBudget < 1000 ||
      numericBudget > 1000000 ||
      !Number.isInteger(numericDays) ||
      numericDays < 1 ||
      numericDays > 30 ||
      !Number.isInteger(numericTravelers) ||
      numericTravelers < 1 ||
      numericTravelers > 20
    ) {
      return res.status(400).json({
        success: false,
        error: "Kontroller reisemål, budsjett, antall dager og reisende."
      });
    }

    const prompt = `
Du er TilbudsAI, en hjelpsom AI-reiseplanlegger.
Svar på norsk, med tydelige overskrifter og en praktisk reiseplan.

Lag en reiseplan basert på:
- Reisemål: ${cleanDestination}
- Totalbudsjett i NOK: ${numericBudget}
- Antall dager: ${numericDays}
- Antall reisende: ${numericTravelers}
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
7. Søkelenker til fly, hotell, aktiviteter og kart.

Bruk disse søkesidene:
- Fly: https://www.google.com/travel/flights
- Hotell: https://www.booking.com/
- Aktiviteter: https://www.getyourguide.com/
- Kart og restauranter: https://www.google.com/maps

Ikke finn på bekreftede flypriser, hotellpriser, ledige rom
eller tilgjengelighet. Opplys tydelig når priser bare er anslag.
Budsjettet skal være realistisk.
`;

    const openaiResponse = await fetch(
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

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API-feil:", data.error?.message || data);

     return res.status(502).json({
  success: false,
  error: data.error?.message || "Ukjent OpenAI-feil",
  code: data.error?.code || null
});
    }

    const answer =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        .find(item => item.type === "output_text")
        ?.text;

    if (!answer) {
      return res.status(502).json({
        success: false,
        error: "AI-en returnerte ikke en reiseplan."
      });
    }

    return res.status(200).json({
      success: true,
      plan: answer
    });

  } catch (error) {
    console.error("Travel planner error:", error);

    return res.status(500).json({
      success: false,
      error: "Noe gikk galt. Prøv igjen."
    });
  }
}
