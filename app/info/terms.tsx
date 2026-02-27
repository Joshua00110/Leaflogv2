import React from 'react';
import InfoScreen from './info-screen';

export default function TermsScreen() {
  const content = [
    "By using LeafLog, you agree to these terms and conditions.",
    "You are responsible for maintaining the confidentiality of your account and for all activities under your account.",
    "We reserve the right to modify or terminate the service for any reason, without notice.",
    "LeafLog is provided 'as is' without warranties of any kind."
  ];
  return <InfoScreen title="Terms & Conditions" content={content} />;
}