import React from 'react';
import InfoScreen from './info-screen';

export default function HelpScreen() {
  const content = [
    "Welcome to LeafLog! Here are some ways to get help:",
    "• Visit our FAQ section on our website.\n• Email us at support@leaflog.com\n• Check the in-app tutorials.",
    "We're here to help you keep your plants happy and healthy!"
  ];
  return <InfoScreen title="Help & Support" content={content} />;
}