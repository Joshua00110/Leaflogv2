import React from 'react';
import InfoScreen from './info-screen';

export default function PrivacyScreen() {
  const content = [
    "Your privacy is important to us. This policy explains how we collect, use, and protect your information.",
    "We collect only the data necessary to provide our services, such as your email and plant care logs.",
    "We do not share your personal data with third parties except as required by law.",
    "You can request deletion of your account and data at any time by contacting support."
  ];
  return <InfoScreen title="Privacy Policy" content={content} />;
}