"use client";

import Header from "../../components/header";
import { Footer } from "../../components/footer";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col bg-transparent text-slate-900">
      <Header />

      <section className="mt-24 px-6 pb-20 flex-1">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-serif font-semibold tracking-tight">
              Welcome to NyayAI
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-2xl mx-auto">
              Explore case summaries, legal insights, and community resources powered by
              AI and built for everyone.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold">Browse Cases</h2>
              <p className="mt-3 text-sm text-slate-600">
                Search and filter citizen case files, view status updates, and track
                progress in real time.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-8 shadow-sm">
              <h2 className="text-2xl font-semibold">Community & Resources</h2>
              <p className="mt-3 text-sm text-slate-600">
                Find help guides, legal resources, and connect with others using the
                platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
