function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "Resend API-nøkkelen mangler."
    });
  }

  try {
    const {
      customerEmail,
      customer,
      jobType,
      job,
      hours,
      materials,
      total
    } = req.body || {};

    const email = String(customerEmail || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: "En gyldig kunde-e-post mangler."
      });
    }

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: "TilbudsAI <tilbud@tilbudsai.no>",
          to: [email],
          subject: `Tilbud fra TilbudsAI – ${String(jobType || "jobb").slice(0, 100)}`,
          html: `
            <h2>Tilbud</h2>
            <p>Hei ${escapeHtml(customer || "Kunden")},</p>
            <p>Her kommer tilbudet på ${escapeHtml(jobType || "arbeidet")}.</p>

            <h3>Beskrivelse av arbeidet</h3>
            <p>${escapeHtml(job || "")}</p>

            <h3>Tilbudet inkluderer</h3>
            <p>Arbeid: ${escapeHtml(hours || 0)} timer</p>
            <p>Materialer: ${escapeHtml(materials || 0)} kr</p>

            <h3>Total inkl. MVA</h3>
            <p><strong>${escapeHtml(total || 0)} kr</strong></p>

            <p>Med vennlig hilsen<br>TilbudsAI</p>
          `
        })
      }
    );

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend-feil:", data);

      return res.status(502).json({
        success: false,
        error: "Kunne ikke sende e-post."
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error("E-postfeil:", error);

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
}
