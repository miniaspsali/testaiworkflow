---
name: sendgrid
description: 'Send transactional emails via the SendGrid v3 REST API. Use when asked to send an email, deliver a notification, or dispatch a message via SendGrid. Supports plain-text, HTML, and Markdown body formats. Fixed sender is service@miniasp.com (doggy8088-claw). Requires SENDGRID_API_KEY environment variable. Do NOT use SMTP – always call the REST API.'
---

# SendGrid Email Skill

Send emails through the [SendGrid v3 Mail Send API](https://docs.sendgrid.com/api-reference/mail-send/mail-send).

## Prerequisites

- `SENDGRID_API_KEY` environment variable set to a valid SendGrid API key.
- `curl` available in the shell (for REST calls).
- `node` available in the shell (only when sending Markdown content).

## Fixed sender

| Field | Value |
|---|---|
| `from.email` | `service@miniasp.com` |
| `from.name` | `doggy8088-claw` |

Do **not** change these values.

## Environment variable

```bash
# Must be set before calling any send command
export SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxx"
```

## Supported content types

| Type | `content[].type` | Notes |
|---|---|---|
| `text` (default) | `text/plain` | Pass the body as-is |
| `html` | `text/html` | Pass the HTML string as-is |
| `markdown` | `text/html` | Convert with `scripts/markdown-to-html.js` first, then send as HTML |

---

## Step-by-step workflows

### 1. Send a plain-text email (default)

```bash
curl -s --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer ${SENDGRID_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "personalizations": [
      {
        "to": [{"email": "recipient@example.com", "name": "Recipient Name"}]
      }
    ],
    "from": {"email": "service@miniasp.com", "name": "doggy8088-claw"},
    "subject": "Your subject here",
    "content": [
      {"type": "text/plain", "value": "Hello, this is a plain-text email."}
    ]
  }'
```

A **202 Accepted** response means the message was queued successfully.

---

### 2. Send an HTML email

Replace `text/plain` with `text/html` and provide an HTML body:

```bash
curl -s --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer ${SENDGRID_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "personalizations": [
      {
        "to": [{"email": "recipient@example.com", "name": "Recipient Name"}]
      }
    ],
    "from": {"email": "service@miniasp.com", "name": "doggy8088-claw"},
    "subject": "Your subject here",
    "content": [
      {"type": "text/html", "value": "<p>Hello, this is an <strong>HTML</strong> email.</p>"}
    ]
  }'
```

---

### 3. Send a Markdown email

**Step 3a – Convert Markdown to HTML** using the bundled script:

```bash
# Locate the script relative to the repo root
SKILL_DIR=".agents/skills/sendgrid"

# From a Markdown file
HTML_BODY=$(node "${SKILL_DIR}/scripts/markdown-to-html.js" email-body.md)

# Or from a variable
MARKDOWN_CONTENT="# Hello\n\nThis is **Markdown**."
HTML_BODY=$(printf '%s' "${MARKDOWN_CONTENT}" | node "${SKILL_DIR}/scripts/markdown-to-html.js")
```

**Step 3b – Send the converted HTML**

Build the JSON payload safely using `jq` (preferred) or encode the HTML inline:

```bash
# Using jq to safely embed the HTML (handles quotes, newlines, etc.)
PAYLOAD=$(jq -n \
  --arg to_email "recipient@example.com" \
  --arg to_name "Recipient Name" \
  --arg subject "Your Markdown subject" \
  --arg html_body "${HTML_BODY}" \
  '{
    personalizations: [{ to: [{ email: $to_email, name: $to_name }] }],
    from: { email: "service@miniasp.com", name: "doggy8088-claw" },
    subject: $subject,
    content: [{ type: "text/html", value: $html_body }]
  }')

curl -s --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer ${SENDGRID_API_KEY}" \
  --header "Content-Type: application/json" \
  --data "${PAYLOAD}"
```

---

### 4. Send to multiple recipients

Add more objects to the `to` array inside `personalizations`:

```json
"personalizations": [
  {
    "to": [
      {"email": "alice@example.com", "name": "Alice"},
      {"email": "bob@example.com",   "name": "Bob"}
    ]
  }
]
```

### 5. Add CC and BCC

```json
"personalizations": [
  {
    "to":  [{"email": "recipient@example.com"}],
    "cc":  [{"email": "cc@example.com"}],
    "bcc": [{"email": "bcc@example.com"}]
  }
]
```

---

## Using the markdown-to-html.js script

The bundled script at `scripts/markdown-to-html.js` auto-installs the [`marked`](https://www.npmjs.com/package/marked) npm package on first run (into the script's own directory).

```bash
SKILL_DIR=".agents/skills/sendgrid"

# Convert a file
node "${SKILL_DIR}/scripts/markdown-to-html.js" README.md

# Convert from stdin
echo "# Title\n\nParagraph" | node "${SKILL_DIR}/scripts/markdown-to-html.js"

# Capture output in a shell variable
HTML=$(node "${SKILL_DIR}/scripts/markdown-to-html.js" email.md)
```

---

## API response codes

| HTTP Status | Meaning |
|---|---|
| `202 Accepted` | Message queued – success |
| `400 Bad Request` | Invalid payload (check JSON structure and required fields) |
| `401 Unauthorized` | Invalid or missing `SENDGRID_API_KEY` |
| `403 Forbidden` | API key lacks Mail Send permission |
| `429 Too Many Requests` | Rate limit hit – back off and retry |
| `5xx` | SendGrid service error – retry with exponential back-off |

---

## Troubleshooting

| Symptom | Solution |
|---|---|
| `401 Unauthorized` | Verify `SENDGRID_API_KEY` is exported and starts with `SG.` |
| `403 Forbidden` | Ensure the API key has **Mail Send** permission in SendGrid dashboard |
| Empty response body on success | Normal – SendGrid returns no body on 202 |
| HTML shows as escaped text | Make sure `content[].type` is `text/html`, not `text/plain` |
| `marked` install fails | Run `npm install marked` manually in `scripts/` directory |
| JSON encoding errors with Markdown | Use `jq` to build the payload (handles special characters safely) |

---

## References

- [SendGrid v3 Mail Send API reference](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [SendGrid API key management](https://app.sendgrid.com/settings/api_keys)
- [marked npm package](https://www.npmjs.com/package/marked)
