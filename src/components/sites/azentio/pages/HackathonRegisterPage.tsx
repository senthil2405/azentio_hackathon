export function HackathonRegisterPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      UPCOMING azentio.ai HACKATHON
      </div>
      <h1>
      Start with an idea.
      </h1>
      <p>
      Register your interest in building, experimenting, and collaborating. Dates and participation details will be announced.
      </p>
      </div>
      </section>
      <section className="section container">
      <form className="contact-form config-form">
      <label>
      Your name
      <input autoComplete="name" required minLength={2} maxLength={100} name="name" />
      </label>
      <label>
      Email address
      <input type="email" autoComplete="email" required maxLength={254} name="email" />
      </label>
      <label className="form-honeypot" aria-hidden="true">
      Website
      <input tabIndex={-1} autoComplete="off" name="website" />
      </label>
      <label className="config-checkbox">
      <input type="checkbox" required name="consent" />
      I agree that my name and email may be stored and shared with the event organizer for hackathon participation updates.
      </label>
      <p className="form-note">
      Your details are stored privately for this event. No dates or places are confirmed yet. The organizer receives your registration details by email when notifications are enabled. No confirmation email is sent to you.
      </p>
      <button className="btn">
      Register interest →
      </button>
      </form>
      </section>
    </>
  );
}
