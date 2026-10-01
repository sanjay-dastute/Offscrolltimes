import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { newsletterSignup, newsletterSubscribers } from '#/lib/newsletter.server'
export const Route=createFileRoute('/api/newsletter')({server:{handlers:{POST:({request})=>newsletterSignup(request),GET:({request})=>newsletterSubscribers(request)}}})
