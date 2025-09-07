import Link from 'next/link';
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{ padding: '2rem', overflow: 'scroll' }}>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 03/18/25</p>
      <style>{`
        * {
          overflow: visible !important;
        }
      `}</style>

      <h2>Introduction</h2>
      <p>
        Welcome to WorldGuessr, a free web game accessible at <Link href="https://worldguessr.com">worldguessr.com</Link>. Your privacy is important to us, and this
        Privacy Policy explains how we collect, use, and protect your personal information
        when you use our website and services.
      </p>

      <p>
        WorldGuessr is open to players of all ages for responsible free play. However, to create an account, you must be at least 13 years old, in accordance with Google policies. If you are under 13, you may only create an account with verifiable parental or guardian consent.
      </p>

      <h2>Information We Collect</h2>
      <h3>1. Google OAuth Data</h3>
      <p>
        We use Google OAuth to authenticate users. When you log in with your Google account,
        we collect your Google email address. This information is used solely to identify
        you and save your game progress.
      </p>

      <h3>2. Usage Data</h3>
      <p>
        We use Google Analytics to collect data on how you interact with our website.
        This includes information such as your IP address, browser type, and the pages you visit.
        This data helps us improve the game and your experience.
      </p>

      <h2>How We Use Your Information</h2>
      <p>
        The information we collect is used to:
      </p>
      <ul>
        <li>Authenticate users and save game progress.</li>
        <li>Analyze website usage to improve WorldGuessr.</li>
        <li>Show non-intrusive ads via our partners.</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        We use third-party services which may collect
        information as described in their respective privacy policies.
      </p>
      <p>All or partial advertising on this Website or App is managed by Nitro.</p>

      <h2>Cheating Policy</h2>
      <p>
        Cheating, exploiting bugs, or using unauthorized tools to gain an advantage in WorldGuessr is strictly prohibited. Players found engaging in such activities may have their accounts banned, and all progress may be forfeited. We encourage fair play and a positive gaming experience for everyone.
      </p>

      <h2>Data Security</h2>
      <p>
        We take the security of your data seriously and use industry-standard practices
        to protect your information. However, no method of transmission over the Internet
        or electronic storage is completely secure, so we cannot guarantee its absolute security.
      </p>

      <h2>Your Rights</h2>
      <p>
        You have the right to access, update, or delete the personal information we hold about you.
        If you wish to exercise these rights, please contact us at <Link href="mailto:support@worldguessr.com">support@worldguessr.com</Link>.
      </p>

      <h2>Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Any changes will be posted on this page,
        and we will update the &apos;Effective Date&apos; at the top of the policy.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions or concerns about this Privacy Policy, please contact us at <Link href="mailto:support@worldguessr.com">support@worldguessr.com</Link>.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
