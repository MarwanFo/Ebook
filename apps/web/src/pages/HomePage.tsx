import React from 'react';
import { BookOpen, ShieldCheck, Database, Layers, Sparkles } from 'lucide-react';
import { ApiHealthStatus } from '../components/health/ApiHealthStatus';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const HomePage: React.FC = () => {
  const architectureHighlights = [
    {
      title: 'NestJS + Prisma API',
      description:
        'Robust REST backend with modular architecture, strict environment validation, request-ID tracking, and PostgreSQL models.',
      icon: Database,
      tag: 'Backend',
    },
    {
      title: 'React + Vite + Tailwind',
      description:
        'Modern client with warm book aesthetics, light/sepia/dark themes, TanStack Query server caching, and Zustand UI state.',
      icon: Sparkles,
      tag: 'Frontend',
    },
    {
      title: 'Shared TypeScript Contracts',
      description:
        'Zero-duplication API envelopes, public DTOs, and domain enums shared between client and server without exposing internal models.',
      icon: Layers,
      tag: 'Packages',
    },
    {
      title: 'Docker & PostgreSQL 16',
      description:
        'Containerized database infrastructure with automated health probes and persistent storage volume mappings.',
      icon: ShieldCheck,
      tag: 'DevOps',
    },
  ];

  const roadmapPhases = [
    {
      num: '1',
      name: 'Foundation',
      status: 'active',
      desc: 'Monorepo, NestJS, React, Prisma, Health Monitoring',
    },
    {
      num: '2',
      name: 'Authentication',
      status: 'upcoming',
      desc: 'Argon2, Access & Refresh Tokens, Session Rotation',
    },
    {
      num: '3',
      name: 'Library & Storage',
      status: 'upcoming',
      desc: 'EPUB/PDF Uploads, Storage Drivers, Metadata & Covers',
    },
    {
      num: '4',
      name: 'EPUB Reader',
      status: 'upcoming',
      desc: 'EPUB.js, Two-page spreads, CFI persistence',
    },
    {
      num: '5',
      name: 'PDF Reader',
      status: 'upcoming',
      desc: 'PDF.js, Two-page spreads, Zoom, Page restoration',
    },
    {
      num: '6',
      name: 'Bookmarks & Dashboard',
      status: 'upcoming',
      desc: 'Reading statistics, Bookmarks CRUD, Quick Resume',
    },
    {
      num: '7',
      name: 'Hardening & E2E',
      status: 'upcoming',
      desc: 'Playwright suites, Security audits, Performance',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-paper-100 via-paper-50 to-brand-50/50 dark:from-paper-900 dark:via-paper-950 dark:to-paper-900 border border-paper-200 dark:border-paper-800 p-8 sm:p-10 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>BookFlow Architecture — Phase 1</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-ink-900 dark:text-paper-50 tracking-tight leading-tight">
            Realistic Ebook Reading, <br className="hidden sm:inline" />
            Engineered for the Web.
          </h1>

          <p className="text-sm sm:text-base text-ink-600 dark:text-paper-300 leading-relaxed">
            Welcome to <strong>BookFlow</strong>, a production-grade ebook reader application
            crafted for authentic physical book reading on desktop with two-page spreads, responsive
            mobile layouts, and precise EPUB CFI & PDF page progress restoration.
          </p>
        </div>
      </div>

      {/* Live System Health & Readiness */}
      <ApiHealthStatus />

      {/* Architecture Highlights */}
      <div id="architecture" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-ink-900 dark:text-paper-50">
            System Architecture
          </h2>
          <span className="text-xs text-ink-500 dark:text-paper-400">
            Strict TypeScript Monorepo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architectureHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="p-5 flex flex-col justify-between"
                variant="elevated"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-paper-100 dark:bg-paper-800 text-brand-600 dark:text-brand-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral">{item.tag}</Badge>
                  </div>
                  <h3 className="font-semibold text-ink-900 dark:text-paper-100 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-paper-400 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Roadmap Tracker */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-ink-900 dark:text-paper-50">
            Phased Implementation Roadmap
          </h2>
          <Badge variant="success">Phase 1 Complete</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {roadmapPhases.map((phase) => (
            <div
              key={phase.num}
              className={`p-4 rounded-xl border transition-all ${
                phase.status === 'active'
                  ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-300 dark:border-brand-800 shadow-xs'
                  : 'bg-paper-100/60 dark:bg-paper-900/60 border-paper-200 dark:border-paper-800/80 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  Phase {phase.num}
                </span>
                {phase.status === 'active' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/80 text-brand-800 dark:text-brand-200">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-ink-400 dark:text-paper-500">
                    Next
                  </span>
                )}
              </div>
              <div className="font-semibold text-sm text-ink-900 dark:text-paper-100">
                {phase.name}
              </div>
              <div className="text-xs text-ink-600 dark:text-paper-400 mt-1 leading-normal">
                {phase.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
