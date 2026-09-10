export default async function handler(request, response) {

  if (request.method !== "POST") {
    return response.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const {
      customerEmail,
      customer,
      jobType,
      job,
      hours,
      hourly,
      materials,
      total
    } = request.body;

    if (!customerEmail) {
      return response.status(400).json({
        error: "Kundens e-post mangler"
      });
    }

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
        },

        body: JSON.stringify({
          from: "TilbudsAI <tilbud@tilbudsai.no>",
          to: [customerEmail],
          subject: `Tilbud fra TilbudsAI – ${jobType || "jobb"}`,

          html: `
            <h2>Tilbud</h2>

            <p>Hei ${customer || "Kunden"},</p>

            <p>Her kommer tilbudet på ${jobType || "arbeidet"}.</p>

            <h3>Beskrivelse av arbeidet</h3>
            <p>${job || ""}</p>

            <h3>Tilbudet inkluderer</h3>
            <p>Arbeid: ${hours || 0} timer</p>
            <p>Materialer: ${materials || 0} kr</p>

            <h3>Total inkl. MVA</h3>
            <p><strong>${total || 0} kr</strong></p>

            <p>Med vennlig hilsen<br>
            TilbudsAI</p>
          `
        })
      }
    );

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error(data);

      return response.status(500).json({
        error: "Kunne ikke sende e-post"
      });
    }

    return response.status(200).json({
      success: true,
      data
    });

  } catch (error) {

    console.error(error);

    return response.status(500).json({
      error: "Server error"
    });

  }
}
