/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ClipMotion'
const SITE_URL = 'https://clipmotion.ai'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's create your first AI campaign</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{name ? `Welcome, ${name}!` : `Welcome to ${SITE_NAME}!`}</Heading>
        <Text style={text}>
          You're all set. {SITE_NAME} helps you generate AI product shots, videos and
          social campaigns in minutes — and publish them automatically.
        </Text>
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={button} href={`${SITE_URL}/dashboard`}>
            Open dashboard
          </Button>
        </Section>
        <Text style={text}>Quick start:</Text>
        <Text style={li}>• Connect your social accounts (Instagram, TikTok, LinkedIn, YouTube)</Text>
        <Text style={li}>• Add your brand URL — we'll learn your tone and visuals</Text>
        <Text style={li}>• Launch a 30-day automated campaign</Text>
        <Text style={footer}>Need help? Just reply to this email.</Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Welcome to ${SITE_NAME} 🎬`,
  displayName: 'Welcome email',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f0a1a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#3d3548', lineHeight: '1.6', margin: '0 0 16px' }
const li = { fontSize: '15px', color: '#3d3548', lineHeight: '1.6', margin: '0 0 6px' }
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
