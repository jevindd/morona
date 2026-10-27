
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const formId = process.env.HUBSPOT_FORM_ID;

    if (!portalId || !formId) {
      return res.status(500).json({
        success: false,
        message: "HubSpot configuration is missing.",
      });
    }

    const body = req.body || {};
    const fields = body.fields;

    const allowedFields = new Set([
      "full_name",
      "email",
      "phone",
      "city",
      "main_bank",
      "bank_accounts",
      "most_interested_in",
      "i_agree_to_be_contacted_about_early_access_",
    ]);

    if (!Array.isArray(fields)) {
      return res.status(400).json({
        success: false,
        message: "Invalid form data.",
      });
    }

    const submittedFields = Object.fromEntries(
      fields.map(({ name, value }) => [
        name,
        String(value ?? "").trim(),
      ])
    );

    if (
      fields.some(({ name }) => !allowedFields.has(name)) ||
      !submittedFields.email ||
      !submittedFields.full_name ||
      !submittedFields.phone ||
      !submittedFields.city ||
      submittedFields
        .i_agree_to_be_contacted_about_early_access_ !== "true"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    const emailIsValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedFields.email);

    if (!emailIsValid) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const hubspotUrl =
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

    const hubspotResponse = await fetch(hubspotUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: fields.map(({ name, value }) => ({
          name,
          value: String(value ?? ""),
        })),
        context: {
          pageUri:
            typeof body.pageUri === "string"
              ? body.pageUri.slice(0, 2000)
              : "",
          pageName:
            typeof body.pageName === "string"
              ? body.pageName.slice(0, 200)
              : "",
        },
      }),
    });

    
    if (!hubspotResponse.ok) {
      const errorDetails = await hubspotResponse.text();

      console.error("HubSpot API error:", {
        status: hubspotResponse.status,
        details: errorDetails,
      });

      return res.status(502).json({
        success: false,
        message: "HubSpot rejected the submission.",
        debugId: "HUBSPOT_SUBMISSION_FAILED",
      });
    }


    return res.status(200).json({
      success: true,
      message: "Submission received.",
    });
  } catch (error) {
    console.error("Submission error:", error.message);

    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
}
