// extensions/scaleway-tem-email/command.js

/**
 * Sends an email using Scaleway TEM API
 *
 * @param {Array} args - [to, subject, textContent, htmlContent?]
 * @param {Object} context - Contains:
 *   - SCW_API_KEY (required)
 *   - SCW_REGION (required, e.g. "fr-par")
 *   - SCW_PROJECT_ID (required)
 *   - SCW_FROM_EMAIL (required, verified sender)
 *   - SCW_FROM_NAME (optional)
 *
 * @returns {number} 0 on success, -1 on error
 */
export async function scaleway_tem_email(args, context) {
    const [to, subject, textContent, htmlContent] = args;
    const setName = context?.set_context ?? "prev";

    // Validate required arguments
    if (!to || !subject || (!textContent && !htmlContent) ) {
        context[`${setName}_error`] = {
            message: "Missing required arguments. Expected: [to, subject, textContent/htmlContent?]"
        };
        return [-1, context];
    }

    const {
        SCW_API_KEY: apiKey,
        SCW_REGION: region,
        SCW_PROJECT_ID: projectId,
        SCW_FROM_EMAIL: fromEmail,
        SCW_FROM_NAME: fromName
    } = context || {};

    if (!apiKey || !region || !projectId || !fromEmail) {
        context[`${setName}_error`] = {
            message: "Missing required Scaleway context values (SCW_API_KEY, SCW_REGION, SCW_PROJECT_ID, SCW_FROM_EMAIL)"
        };
        return [-1, context];
    }

    const recipients = Array.isArray(to) ? to : [to];

    const emailPayload = {
        project_id: projectId,
        from: {
            email: fromEmail,
            ...(fromName ? { name: fromName } : {})
        },
        to: recipients.map(email => ({ email })),
        subject,
        text: textContent,
        ...(htmlContent ? { html: htmlContent } : {})
    };

    try {
        const response = await fetch(
  `https://api.scaleway.com/transactional-email/v1alpha1/regions/${region}/emails`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": apiKey
    },
    body: JSON.stringify(emailPayload)
  }
);


        const responseData = await response.json();

        if (!response.ok) {
            context[`${setName}_error`] = {
                message: "Failed to send email",
                status: response.status,
                details: responseData
            };
            return [-1,context];
        }

        context[setName] = {
            success: true,
            message: "Email sent successfully",
            response: responseData
        };

        return [0, context];
    } catch (error) {
        context[`${setName}_error`] = {
            message: "Network error while sending email",
            error: error.message
        };
        return [-1,context];
    }
}

