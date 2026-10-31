"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

// Slide content copied from the reference prototype's home banners.
const SLIDES = [
  {
    image: "/banners/intelligence.svg",
    alt: "An illuminated intelligence network in azentio.ai green",
    eyebrow: "WELCOME TO azentio.ai",
    title: ["Build Intelligence.", "Create Impact."],
    description: "From ideas to intelligent products. From complexity to clarity. From AI potential to meaningful outcomes.",
    cta: { label: "Explore our products ↗", href: "/products" },
  },
  {
    image: "/banners/hackathon.svg",
    alt: "A coding canvas and connected ideas for the upcoming hackathon",
    eyebrow: "UPCOMING HACKATHON",
    title: ["Your next idea.", "Our next breakthrough."],
    description:
      "Build, experiment, and collaborate at the upcoming azentio.ai hackathon. Register your interest to hear when dates and participation details are announced.",
    cta: { label: "Register interest ↗", href: "/hackathon/register" },
  },
] as const;

const INTERVAL_MS = 7000;

export function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const go = (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);

  return (
    <section className="hero home-carousel" role="region" aria-roledescription="carousel" aria-label="azentio.ai highlights">
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG banner, same as the source */}
      <img className="banner-image" src={slide.image} alt={slide.alt} style={{ objectPosition: "center" }} fetchPriority="high" />
      <div className="banner-shade" />
      <div className="container hero-content" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${SLIDES.length}`}>
        <div className="eyebrow">{slide.eyebrow}</div>
        <h1>
          <span>
            {slide.title[0]}
            <br />
          </span>
          <span className="banner-accent">
            {slide.title[1]}
            <br />
          </span>
        </h1>
        <p>{slide.description}</p>
        <div className="actions">
          <Link className="btn" href={slide.cta.href}>
            {slide.cta.label}
          </Link>
        </div>
      </div>
      <div className="container carousel-controls">
        <button type="button" aria-label="Previous banner" onClick={() => go(-1)}>
          <ChevronLeft />
        </button>
        <div className="carousel-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.image}
              type="button"
              aria-label={`Show banner ${i + 1}: ${s.title.join(" ")}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button type="button" aria-label="Next banner" onClick={() => go(1)}>
          <ChevronRight />
        </button>
        <button type="button" aria-label={paused ? "Play carousel" : "Pause carousel"} onClick={() => setPaused((p) => !p)}>
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </div>
    </section>
  );
}
