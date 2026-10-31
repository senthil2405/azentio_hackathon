import { PublicForm } from "../PublicForm";
import { submitDemoRequest } from "@/server/public/actions";
export function ConnectPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      CONNECT WITH US
      </div>
      <h1>
      Have a Challenge?
      <br />
      Let&apos;s Build What Comes Next.
      </h1>
      <p>
      Explore a product, share an AI opportunity, or start a conversation about collaboration.
      </p>
      </div>
      </section>
      <section className="section container contact-layout">
      <div>
      <div className="eyebrow">
      LET&apos;S TALK
      </div>
      <h2>
      Start with a Conversation.
      </h2>
      <p className="muted">
      Tell us what you&apos;re exploring. We can discuss product capabilities, integration considerations, and opportunities to collaborate.
      </p>
      </div>
      <PublicForm className="contact-form" action={submitDemoRequest}>
      <label>
      I&apos;m interested in
      <select name="interest" required>
      <option>
      Requesting a product demo
      </option>
      <option>
      Exploring a collaboration
      </option>
      <option>
      Submitting an AI challenge
      </option>
      <option>
      General enquiry
      </option>
      </select>
      </label>
      <div className="two-col">
      <label>
      Name
      <input autoComplete="name" required placeholder="Your name" name="name" />
      </label>
      <label>
      Work email
      <input type="email" autoComplete="email" required placeholder="name@company.com" name="email" />
      </label>
      </div>
      <label>
      Organization
      <input autoComplete="organization" placeholder="Company name" name="organization" />
      </label>
      <label>
      Tell us more
      <textarea name="message" required rows={5} placeholder="Briefly describe your interest">
      </textarea>
      </label>
      <button className="btn" type="submit">
      Submit Enquiry{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
      </svg>
      </button>
      <p className="form-note" role="status">
      Synthetic hackathon environment: your request is stored for the demo; no email is sent.
      </p>
      </PublicForm>
      </section>
    </>
  );
}
