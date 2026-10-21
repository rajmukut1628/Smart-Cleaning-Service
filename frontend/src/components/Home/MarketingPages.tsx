import { MarketingPage } from './MarketingLayout';
import HowItWorks from './HowItWorks';
import FAQSection from './FAQSection';
import ReviewSection from '../Review/ReviewSection';
import ContactSection from './ContactSection';
export function ContactPage() { return <MarketingPage eyebrow="Contact & support" title="Let’s talk about your space" description="Questions about your cleaning or an existing booking? Choose a contact option below."><ContactSection/></MarketingPage>; }
export function HowItWorksPage() { return <MarketingPage eyebrow="From booking to a fresh start" title="Cleaning, made simple" description="Everything you need to know about booking, tracking your service and paying after the job."><HowItWorks/><FAQSection/></MarketingPage>; }
export function ReviewsPage() { return <MarketingPage eyebrow="Customer experiences" title="Real feedback. Thoughtful care" description="Reviews shared by customers after their completed cleaning service."><ReviewSection standalone/></MarketingPage>; }

