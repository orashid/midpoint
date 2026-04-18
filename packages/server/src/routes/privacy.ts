import { Router } from 'express';

export const privacyRouter = Router();

const LAST_UPDATED = 'April 18, 2026';

privacyRouter.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — Midpoint</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1.25rem;
      color: #1a1a1a;
      line-height: 1.6;
    }
    h1 { margin-bottom: 0.25rem; }
    h2 { margin-top: 2rem; }
    .updated { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    ul { padding-left: 1.5rem; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <div class="updated">Last updated: ${LAST_UPDATED}</div>

  <p>
    Midpoint ("we", "our", "the app") is a mobile application that helps groups
    find meeting spots at the midpoint between their locations. This Privacy
    Policy explains what information we collect, how we use it, and your rights
    regarding that information.
  </p>

  <h2>Information We Collect</h2>

  <h3>Account Information</h3>
  <p>When you sign in with Google or Apple, we receive and store:</p>
  <ul>
    <li>Your email address</li>
    <li>Your display name</li>
    <li>Your profile picture URL (if available)</li>
    <li>A unique identifier from the sign-in provider</li>
  </ul>

  <h3>Location Information</h3>
  <p>
    Midpoint uses your device's location (with your permission) to calculate
    midpoints with other participants and to show nearby restaurants and
    venues. Location data is used in-session to process search requests and is
    not stored long-term on our servers unless you explicitly save a search.
  </p>

  <h3>User-Created Content</h3>
  <p>
    When you save spots, searches, or people (participants you meet with), this
    data is stored on our servers and associated with your account so it is
    available across your devices.
  </p>

  <h3>Technical Information</h3>
  <p>
    We log standard technical information (IP address, request timestamps,
    device type) for security, abuse prevention, and debugging. Logs are
    retained for up to 30 days.
  </p>

  <h2>How We Use Information</h2>
  <ul>
    <li>To authenticate you and maintain your account</li>
    <li>To calculate midpoints and search for nearby venues</li>
    <li>To sync your saved data across your devices</li>
    <li>To diagnose technical problems and prevent abuse</li>
  </ul>

  <h2>Third-Party Services</h2>
  <p>Midpoint uses the following third-party services:</p>
  <ul>
    <li>
      <strong>Google Maps Platform</strong> — for geocoding, place search, and
      directions. Your location and queries are sent to Google to fulfill
      these requests. See
      <a href="https://policies.google.com/privacy">Google's Privacy Policy</a>.
    </li>
    <li>
      <strong>Google Sign-In</strong> and <strong>Sign in with Apple</strong> —
      for authentication. These providers handle your credentials directly; we
      only receive the profile data described above.
    </li>
    <li>
      <strong>Railway</strong> — our hosting provider for the backend API and
      database.
    </li>
  </ul>

  <h2>Data Sharing</h2>
  <p>
    We do not sell, rent, or share your personal information with third parties
    for marketing purposes. We share data only with the service providers listed
    above as necessary to operate the app, or when required by law.
  </p>

  <h2>Data Retention and Deletion</h2>
  <p>
    We retain your account data for as long as your account is active. You can
    request deletion of your account and all associated data at any time by
    emailing
    <a href="mailto:obaidur.rashid@gmail.com">obaidur.rashid@gmail.com</a>.
    We will process deletion requests within 30 days.
  </p>

  <h2>Children's Privacy</h2>
  <p>
    Midpoint is not directed to children under 13. We do not knowingly collect
    information from children under 13. If you believe we have collected such
    information, please contact us and we will delete it.
  </p>

  <h2>Security</h2>
  <p>
    We use HTTPS for all network traffic, store authentication tokens in
    encrypted device storage, and follow industry-standard practices to protect
    your data. No system is perfectly secure, and we cannot guarantee absolute
    security.
  </p>

  <h2>Changes to This Policy</h2>
  <p>
    We may update this Privacy Policy from time to time. Changes will be posted
    to this page with an updated revision date.
  </p>

  <h2>Contact</h2>
  <p>
    Questions or requests? Email
    <a href="mailto:obaidur.rashid@gmail.com">obaidur.rashid@gmail.com</a>.
  </p>
</body>
</html>`);
});
