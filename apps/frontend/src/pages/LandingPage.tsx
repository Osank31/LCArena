import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Code2,
  Cpu,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "../components/common/Button";
import { DifficultyBadge } from "../components/common/Badge";
import { problemService } from "../services/problemService";
import { ParsedProblem } from "../types/problem.types";

export const LandingPage: React.FC = () => {
  const [featuredProblems, setFeaturedProblems] = useState<ParsedProblem[]>([]);
  const [totalProblems, setTotalProblems] = useState<number>(50);

  useEffect(() => {
    let isMounted = true;
    problemService
      .getAllProblems()
      .then((problems) => {
        if (isMounted) {
          setTotalProblems(problems.length);
          setFeaturedProblems(problems.slice(0, 5));
        }
      })
      .catch(() => {
        // Fallback gracefully to static stats
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] text-slate-100">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Glow backdrop */}
        <div className="absolute inset-0 max-w-3xl mx-auto h-72 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-purple-600/20 blur-3xl -z-10 rounded-full" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Competitive Programming Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Master Algorithms in a{" "}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Secure Sandboxed Arena
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          LCArena evaluates untrusted code inside isolated, ephemeral Docker
          containers under strict resource limits. Experience sub-second verdicts,
          multi-language judging, and Monaco IDE integration.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/problems">
            <Button
              size="lg"
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shadow-lg shadow-blue-500/20"
            >
              Explore {totalProblems}+ Problems
            </Button>
          </Link>
          <Link to="/register">
            <Button size="lg" variant="secondary">
              Create Free Account
            </Button>
          </Link>
        </div>

        {/* Platform Metrics */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl border border-slate-800 bg-slate-900/50 backdrop-blur-md rounded-2xl p-6">
          <div className="text-center p-2">
            <div className="text-3xl font-extrabold text-blue-400 font-mono">
              {totalProblems}+
            </div>
            <div className="text-xs text-slate-400 mt-1">Curated Problems</div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-extrabold text-cyan-400 font-mono">
              4
            </div>
            <div className="text-xs text-slate-400 mt-1">Supported Languages</div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              100%
            </div>
            <div className="text-xs text-slate-400 mt-1">Docker Sandboxed</div>
          </div>
          <div className="text-center p-2">
            <div className="text-3xl font-extrabold text-purple-400 font-mono">
              &lt;2s
            </div>
            <div className="text-xs text-slate-400 mt-1">Judge Latency</div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Engineered for High Concurrency & Accuracy
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            From the API Gateway perimeter to the worker execution mesh, every layer
            is architected for reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              Ephemeral Sandboxing
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every submission spawns an isolated container with memory caps, CPU
              quotas, and process boundaries to prevent host tampering.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              Multi-Language Runtime
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Solve problems in modern C++ (GCC 13), Python 3.11, Java 21, and
              JavaScript (Node.js 20) with idiomatic templates.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              AI Code Completion
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              FastAPI-powered fill-in-the-middle code suggestions integrated directly
              inside Monaco Editor to boost your coding velocity.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Problems Preview */}
      {featuredProblems.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Popular Coding Challenges
              </h2>
              <p className="text-xs text-slate-400">
                Jump right in and start sharpening your skills.
              </p>
            </div>
            <Link
              to="/problems"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 bg-slate-900/40 rounded-xl overflow-hidden">
            {featuredProblems.map((prob, i) => (
              <div
                key={prob.id}
                className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 w-6">
                    {i + 1}.
                  </span>
                  <Link
                    to={`/problems/${prob.id}`}
                    className="text-sm font-medium text-slate-200 hover:text-blue-400"
                  >
                    {prob.title}
                  </Link>
                  <div className="hidden sm:flex gap-1 ml-2">
                    {prob.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <DifficultyBadge difficulty={prob.difficulty} size="sm" />
                  <Link to={`/problems/${prob.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Solve
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
