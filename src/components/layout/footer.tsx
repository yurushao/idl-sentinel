"use client";

import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side - Copyright */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            © {new Date().getFullYear()} IDL Sentinel. All rights reserved.
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/yurushao/idl-sentinel"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <a
              href="https://github.com/yurushao/idl-sentinel/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              Report Issue
            </a>
            <a
              href="https://github.com/yurushao/idl-sentinel#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
