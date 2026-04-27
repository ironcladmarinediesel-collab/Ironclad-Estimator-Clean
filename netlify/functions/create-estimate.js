exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      clientName,
      phoneNumber,
      email,
      vesselName,
      marina,
      scopeOfWork,
      estimatedHours,
      laborRate,
      partsSuppliedBy,
      notes,
    } = body;

    if (!clientName || !vesselName || !marina || !scopeOfWork) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields: clientName, vesselName, marina, scopeOfWork",
        }),
      };
    }

    const fields = {
      "Client Name": clientName,
      "Phone Number": phoneNumber || "",
      "Email": email || "",
      "Vessel Name": vesselName,
      "Marina": marina,
      "Scope of Work": scopeOfWork,
      "Estimated Hours": Number(estimatedHours || 0),
      "Labor Rate": Number(laborRate || 0),
      "Parts Supplied By": partsSuppliedBy || "Customer",
      "Notes": notes || "",
      "Status": "Draft",
    };

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`;

    const airtableResponse = await fetch(airtableUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    const airtableData = await airtableResponse.json();

    if (!airtableResponse.ok) {
      return {
        statusCode: airtableResponse.status,
        body: JSON.stringify({
          error: "Airtable error",
          details: airtableData,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        recordId: airtableData.id,
        estimateNumber: airtableData.fields["Estimate #"],
        fields: airtableData.fields,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        message: error.message,
      }),
    };
  }
};