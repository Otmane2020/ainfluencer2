/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ClipMotion'
const SITE_URL = 'https://clipmotion.ai'

interface SubProps {
  name?: string
  planName?: string
  credits?: number
  amount?: string
}

const SubscriptionUpgradedEmail = ({ name, planName, credits, amount }: SubProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName ?? 'new'} plan is active on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Thanks, ${name}!` : 'Thanks for upgrading!'}</Heading>
        <Text style={text}>
          Your <strong>{planName ?? 'new'}</strong> plan is now active on {SITE_NAME}
          {amount ? ` (${amount})` : ''}.
          {credits ? ` ${credits} credits have been added to your account.` : ''}
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={`${SITE_URL}/dashboard`}>
            Start creating
          </Button>
        </Section>
        <Text style={text}>
          You can manage your subscription, invoices and billing details anytime from
          your account.
        </Text>
        <Text style={footer}>Need help? Just reply to this email.</Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionUpgradedEmail,
  subject: (d: Record<string, any>) =>
    `Your ${d?.planName ?? 'new'} plan is active 🎉`,
  displayName: 'Subscription upgraded',
  previewData: { name: 'Alex', planName: 'Pro', credits: 500, amount: '$29' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f0a1a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3d3548', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: '#a020c8',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#8a8295', margin: '24px 0 0' }
