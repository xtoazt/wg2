import Link from 'next/link';
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> 08/14/24</p>

      <h2>Introduction</h2>
      <p>
        Welcome to WorldGuessr, a free web game. Your privacy is important to us, and this
        Privacy Policy explains how we collect, use, and protect your personal information
        when you use our website and services.
      </p>

      <h2>Information We Collect</h2>
      <h3>1. User Data</h3>
      <p>
        We collect your email address when you log in to save your game progress. This information is used solely to identify you within the game.
      </p>

      <h3>2. Usage Data</h3>
      <p>
        We use Google Analytics to collect data on how you interact with our website.
        Our database stores your game progress and settings to provide a better user experience and save your progress in leaderboards.
        This includes information such as your browser type, time spent and the pages you visit.
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
      <p>All or partial advertising on this Website or App is managed by Crazy Games. To learn more about the types of data collected, how data is used, and your choices as a user, please visit <Link href="https://www.crazygames.com/privacy-policy">https://www.crazygames.com/privacy-policy</Link>.</p>

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
