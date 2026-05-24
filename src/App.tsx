/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  Brain, 
  History, 
  Settings, 
  AlertCircle, 
  Calculator, 
  Layers, 
  Scissors,
  HelpCircle,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { type CaptchaConfig, type CaptchaStyle, type CaptchaSolvedResult, type CaptchaHistoryItem } from "./types";

const GEMINI_API_KEY_STORAGE = "cipher_gemini_api_key";

export default function App() {
  // Config & State
  const [config, setConfig] = useState<CaptchaConfig>({
    type: "alphanumeric",
    caseSensitive: true,
    length: "6",
  });

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<CaptchaSolvedResult | null>(null);
  const [history, setHistory] = useState<CaptchaHistoryItem[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [solveSpeed, setSolveSpeed] = useState<number | null>(null);
  
  // Stats
  const [totalSolved, setTotalSolved] = useState<number>(0);

  // Gemini API key (stored locally in browser)
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // References
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mainDropzoneRef = useRef<HTMLDivElement | null>(null);

  // Load History & Stats from local storage
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("cipher_solve_history");
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        setHistory(parsed);
      }
      
      const storedStats = localStorage.getItem("cipher_solve_stats");
      if (storedStats) {
        const stats = JSON.parse(storedStats);
        setTotalSolved(stats.totalSolved || 0);
      } else {
        setTotalSolved(0);
      }

      const storedApiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE);
      if (storedApiKey) {
        setApiKey(storedApiKey);
      }
    } catch (e) {
      console.error("Failed to load local storage stats", e);
    }
  }, []);

  // Sync to local storage
  const saveStats = (newTotal: number) => {
    setTotalSolved(newTotal);
    localStorage.setItem("cipher_solve_stats", JSON.stringify({ totalSolved: newTotal }));
  };

  const saveHistory = (updatedHistory: CaptchaHistoryItem[]) => {
    setHistory(updatedHistory);
    localStorage.setItem("cipher_solve_history", JSON.stringify(updatedHistory));
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  };

  const buildApiHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey.trim()) {
      headers["X-Gemini-Api-Key"] = apiKey.trim();
    }
    return headers;
  };

  // Clipboard Paste capture initialization
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            processFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [config]);

  // Handle file import processes
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSolveError("Invalid file type. Please upload a web-safe image (PNG, JPG, WEBP, GIF).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setUploadedImage(e.target.result);
        setSolveError(null);
        setCurrentResult(null);
        setSolveSpeed(null);
      }
    };
    reader.onerror = () => {
      setSolveError("Failed to read the selected file.");
    };
    reader.readAsDataURL(file);
  };

  // Drag listeners
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Target API documentation code sandbox template selection
  const [activeApiTab, setActiveApiTab] = useState<"curl" | "python" | "javascript">("curl");

  // Solve Captcha API Handler
  const handleSolveCaptcha = async () => {
    if (!uploadedImage) {
      setSolveError("Please select or paste a CAPTCHA image first.");
      return;
    }

    if (!apiKey.trim()) {
      setSolveError("Enter your Gemini API key in the sidebar settings first.");
      return;
    }

    setIsSolving(true);
    setSolveError(null);
    setCurrentResult(null);
    const startTime = performance.now();

    try {
      const response = await fetch("/api/solve-captcha", {
        method: "POST",
        headers: buildApiHeaders(),
        body: JSON.stringify({
          image: uploadedImage,
          type: config.type,
          caseSensitive: config.caseSensitive,
          length: config.length,
        }),
      });

      let data: { success?: boolean; result?: CaptchaSolvedResult; error?: string };
      try {
        data = await response.json();
      } catch {
        throw new Error(
          response.ok
            ? "Server returned an invalid response."
            : `Server error (${response.status}). The API may not be deployed correctly — check Vercel function logs.`
        );
      }

      const endTime = performance.now();
      setSolveSpeed(Math.round(endTime - startTime));

      if (response.ok && data.success && data.result) {
        const res: CaptchaSolvedResult = data.result;
        setCurrentResult(res);
        
        // Save history item
        const newHistoryItem: CaptchaHistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          image: uploadedImage,
          config: { ...config },
          result: res,
          timestamp: Date.now(),
        };

        const updatedHistory = [newHistoryItem, ...history.slice(0, 49)]; // Cap at 50 logs
        saveHistory(updatedHistory);

        // Update stats
        const nextTotal = totalSolved + 1;
        saveStats(nextTotal);
      } else {
        setSolveError(data.error || `Request failed (${response.status}). Check Vercel logs and GEMINI_API_KEY.`);
      }
    } catch (error: unknown) {
      console.error(error);
      setSolveError(
        error instanceof Error
          ? error.message
          : "API connection error. Check that the server is running and GEMINI_API_KEY is set."
      );
    } finally {
      setIsSolving(false);
    }
  };

  // Clipboard copy handler
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Quick Action: Delete history entry
  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = history.filter(item => item.id !== id);
    saveHistory(filtered);
  };

  // Clear entire histories
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your local capture solving logs?")) {
      saveHistory([]);
    }
  };

  // Quick Action: Reload an historical record in the viewport
  const handleLoadHistoryRecord = (item: CaptchaHistoryItem) => {
    setUploadedImage(item.image);
    setConfig(item.config);
    setCurrentResult(item.result);
    setSolveError(null);
    setSolveSpeed(null);
  };

  return (
    <div className="min-h-screen bg-[#0F0F11] text-gray-300 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white" id="main-application-container">
      
      {/* Header element */}
      <header className="h-16 border-b border-[#262629] flex items-center justify-between px-6 bg-[#0F0F11] shrink-0" id="header-container">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20" id="header-logo">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-wide uppercase">CipherSolve AI</h1>
            <p className="text-[10px] text-gray-500 font-medium">Neural Vision Captcha Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse"></div>
            <span className="text-[11px] text-gray-400 font-medium tracking-tight">AI Service Online</span>
          </div>
        </div>
      </header>

      {/* Main split-view dashboard */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Control Sidebar */}
        <aside className="w-72 border-r border-[#262629] bg-[#141417] flex flex-col shrink-0 overflow-y-auto" id="left-sidebar">
          
          {/* Quick Stats Widget */}
          <div className="p-5 border-b border-[#262629]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Status</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded font-mono font-bold">ONLINE</span>
            </div>
            <div className="p-3.5 bg-[#1C1C21] rounded-xl border border-[#262629] flex flex-col gap-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-400 font-semibold">Total Solved</span>
                <span className="text-lg font-mono font-bold text-white tracking-tight">{totalSolved}</span>
              </div>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="p-5 border-b border-[#262629] flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gemini API Key</h2>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => saveApiKey(e.target.value)}
                placeholder="Paste your API key here"
                className="w-full bg-[#1C1C21] border border-[#262629] rounded-xl pl-3 pr-10 py-2.5 text-xs font-mono text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                id="input-gemini-api-key"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                title={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[9px] text-gray-500 leading-relaxed">
              Stored locally in your browser. Get a free key from{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Google AI Studio
              </a>
              .
            </p>
            {apiKey.trim() ? (
              <span className="text-[10px] text-emerald-400 font-semibold">API key saved</span>
            ) : (
              <span className="text-[10px] text-amber-400 font-semibold">Required to solve CAPTCHAs</span>
            )}
          </div>

          {/* Model parameters / Solver options */}
          <div className="p-5 border-b border-[#262629] flex flex-col gap-4">
            <div className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Solver Configurations</h2>
            </div>

            {/* Captcha style option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Decoded Mode</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, type: "alphanumeric" }))}
                  className={`py-1.5 px-2 rounded-lg font-semibold border transition-all text-center ${
                    config.type === "alphanumeric"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                      : "bg-[#1C1C21] border-transparent text-gray-400 hover:border-[#262629] hover:text-white"
                  }`}
                  id="tab-mode-alphanumeric"
                >
                  Mixed Alphanum
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, type: "numeric" }))}
                  className={`py-1.5 px-2 rounded-lg font-semibold border transition-all text-center ${
                    config.type === "numeric"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                      : "bg-[#1C1C21] border-transparent text-gray-400 hover:border-[#262629] hover:text-white"
                  }`}
                  id="tab-mode-numeric"
                >
                  Digits Only
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, type: "math" }))}
                  className={`py-1.5 px-2 rounded-lg font-semibold border transition-all text-center col-span-2 ${
                    config.type === "math"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-sm"
                      : "bg-[#1C1C21] border-transparent text-gray-400 hover:border-[#262629] hover:text-white"
                  }`}
                  id="tab-mode-math"
                >
                  Mathematical Equation solver
                </button>
              </div>
            </div>

            {/* Character Length Constraint */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expected Length</label>
                <span className="text-[10px] font-mono font-bold text-indigo-400">{config.length === "any" ? "Adaptive" : `${config.length} Chars`}</span>
              </div>
              <select
                value={config.length}
                onChange={(e) => setConfig(prev => ({ ...prev, length: e.target.value }))}
                className="w-full bg-[#1C1C21] border border-[#262629] rounded-xl px-3 py-2 text-xs font-semibold text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
                id="select-config-length"
              >
                <option value="any">Adaptive Detection (Any)</option>
                <option value="4">Strictly 4 characters</option>
                <option value="5">Strictly 5 characters</option>
                <option value="6">Strictly 6 characters</option>
                <option value="7">Strictly 7 characters</option>
                <option value="8">Strictly 8 characters</option>
              </select>
            </div>

            {/* Case Sensitive Option if alphanumeric */}
            {config.type === "alphanumeric" && (
              <div className="flex items-center justify-between p-2.5 bg-[#1C1C21] rounded-xl border border-[#262629]">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white">Case-Sensitivity</span>
                  <span className="text-[9px] text-gray-500">Preserve upper/lowercase capitalization</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.caseSensitive} 
                    onChange={(e) => setConfig(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                    className="sr-only peer"
                    id="checkbox-case-sensitive"
                  />
                  <div className="w-9 h-5 bg-[#262629] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            )}
          </div>

          {/* Historical Logs List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gray-400" />
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historical Logs</h2>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium"
                  id="btn-clear-history"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {history.length === 0 ? (
                <div className="py-8 text-center bg-[#0F0F11]/40 rounded-xl border border-[#262629]/40 border-dashed">
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">No solved CAPTCHAs yet.<br/>Upload an image above to start.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistoryRecord(item)}
                    className="group p-2.5 bg-[#1C1C21]/60 hover:bg-[#1C1C21] rounded-xl border border-[#262629]/60 hover:border-indigo-500/40 transition-all cursor-pointer flex gap-3 items-center"
                  >
                    <div className="w-16 h-8 bg-black/40 rounded border border-[#262629] overflow-hidden flex items-center justify-center shrink-0">
                      <img src={item.image} alt="Thumbnail" className="max-w-full max-h-full object-contain filter brightness-90 border-none select-none pointer-events-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-bold text-white truncate">{item.result.text}</p>
                      <p className="text-[9px] text-gray-500">
                        {item.config.type === "math" ? "Math" : `Style: ${item.config.type}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 font-mono text-[9px] tracking-tight">
                      <span className={`px-1 rounded ${
                        item.result.confidence === "high" 
                          ? "bg-green-500/10 text-green-400" 
                          : item.result.confidence === "medium"
                            ? "bg-yellow-500/10 text-yellow-500" 
                            : "bg-red-500/10 text-red-400"
                      }`}>
                        {item.result.confidence}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 rounded transition-all"
                        title="Delete log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center / Solver Workstage */}
        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-y-auto" id="solver-stage">
          
          <div className="col-span-7 flex flex-col gap-6">
            
            {/* Active Image Upload/Paste Target View */}
            <div 
              ref={mainDropzoneRef}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative min-h-[280px] rounded-3xl border-2 border-dashed bg-[#141417] flex flex-col items-center justify-center p-8 transition-all ${
                dragActive 
                  ? "border-indigo-500 bg-[#1C1C21]/90 shadow-lg shadow-indigo-500/5 scale-[0.99]" 
                  : uploadedImage 
                    ? "border-[#262629] hover:border-indigo-500/40" 
                    : "border-[#262629] hover:border-indigo-500/30"
              }`}
              id="solver-preview-box"
            >
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />

              {!uploadedImage ? (
                <div className="flex flex-col items-center justify-center text-center max-w-sm pointer-events-none">
                  <div className="w-14 h-14 bg-[#1C1C21] rounded-2xl flex items-center justify-center border border-[#262629] mb-4 text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-1">Process CAPTCHA Image</h3>
                  <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
                    Drag and drop your image, browse, or simply hit <kbd className="bg-[#262629] text-gray-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/5 mx-1">Ctrl+V</kbd> to paste a captured screenshot!
                  </p>
                  <button 
                    onClick={triggerFileInput} 
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/20 pointer-events-auto transition-all"
                    id="btn-browse-file"
                  >
                    Browse Files
                  </button>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-between gap-4">
                  
                  {/* Loaded Image Display container */}
                  <div className="relative group/view w-full max-h-[170px] bg-[#0F0F11] rounded-2xl border border-[#262629] overflow-hidden flex items-center justify-center p-4">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded CAPTCHA" 
                      className="max-w-full max-h-[140px] object-contain rounded select-text selection:bg-indigo-500/30 filter contrast-[1.05]"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/view:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={triggerFileInput}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Change Image
                      </button>
                      <button
                        onClick={() => { setUploadedImage(null); setCurrentResult(null); }}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-lg text-[11px] font-semibold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="w-full flex justify-between items-center bg-[#1C1C21] p-2.5 rounded-2xl border border-[#262629]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Image Loaded</span>
                    </div>

                    <button
                      onClick={handleSolveCaptcha}
                      disabled={isSolving}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10"
                      id="btn-solve-captcha"
                    >
                      {isSolving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Solving Captcha...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-200" /> Solve with Gemini AI
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* API Integration Guide segment */}
            <div className="bg-[#141417] p-6 rounded-3xl border border-[#262629] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-semibold text-white text-xs uppercase tracking-wider font-mono">Screenshot Solve API Endpoint</h3>
                    <p className="text-[10px] text-gray-500 lowercase">Post screenshots to `/api/solve` programmatically</p>
                  </div>
                </div>
                <div className="flex bg-[#0F0F11] p-1 rounded-xl border border-[#262629]">
                  <button
                    onClick={() => setActiveApiTab("curl")}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                      activeApiTab === "curl" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveApiTab("python")}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                      activeApiTab === "python" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setActiveApiTab("javascript")}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                      activeApiTab === "javascript" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Node.js
                  </button>
                </div>
              </div>

              {/* Endpoint signature */}
              <div className="flex items-center justify-between bg-[#0F0F11] px-3.5 py-2 rounded-xl border border-[#262629] font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold">POST</span>
                  <span className="text-gray-300 font-bold">/api/solve</span>
                </div>
                <span className="text-gray-500">Content-Type: application/json</span>
              </div>

              {/* API tabs rendering code snippets */}
              <div className="bg-[#0F0F11] p-4 rounded-2xl border border-[#262629] font-mono text-xs text-indigo-200 overflow-x-auto selection:bg-indigo-500/40">
                {activeApiTab === "curl" && (
                  <pre className="leading-5">
{`curl -X POST \\
  ${typeof window !== 'undefined' ? window.location.origin : 'https://api-domain.com'}/api/solve \\
  -H "Content-Type: application/json" \\
  -d '{
    "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }'`}
                  </pre>
                )}
                {activeApiTab === "python" && (
                  <pre className="leading-5">
{`import requests
import base64

# Convert image to base64
with open("screenshot.png", "rb") as f:
    b64_str = base64.b64encode(f.read()).decode("utf-8")

response = requests.post(
    "${typeof window !== 'undefined' ? window.location.origin : 'https://api-domain.com'}/api/solve",
    json={"screenshot": b64_str}
)

print(response.json()) # {"success": true, "text": "..."}`}
                  </pre>
                )}
                {activeApiTab === "javascript" && (
                  <pre className="leading-5">
{`// Send captured screenshot using base64
const respond = await fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://api-domain.com'}/api/solve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    screenshot: 'data:image/png;base64,iVBORw0KG...'
  })
});

const data = await respond.json();
console.log("Decoded characters:", data.text);`}
                  </pre>
                )}
              </div>

              {/* Specification fields details list */}
              <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-500 border-t border-[#262629] pt-3 font-medium">
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5 uppercase tracking-wider">Payload Params</span>
                  <ul className="list-disc pl-3 space-y-0.5">
                    <li><code className="text-indigo-400 font-mono">screenshot:</code> Raw or dataURL base64 string</li>
                    <li><code className="text-gray-400 font-mono">type:</code> mixed, numeric, math (optional)</li>
                  </ul>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold mb-0.5 uppercase tracking-wider">Response JSON</span>
                  <ul className="list-disc pl-3 space-y-0.5">
                    <li><code className="text-emerald-400 font-mono">text:</code> Transcribed target string</li>
                    <li><code className="text-emerald-400 font-mono">mathResult:</code> Math equation result</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>

          {/* Results Output Section */}
          <div className="col-span-5 flex flex-col">
            <div className="flex-1 bg-[#141417] rounded-3xl border border-[#262629] p-6 flex flex-col">
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-white font-semibold text-xs uppercase tracking-wider font-mono">Processing Output</h3>
                </div>
                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-indigo-500/20">
                  Gemini-2.5-Flash
                </span>
              </div>

              {/* Solving Process View */}
              <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                
                {isSolving ? (
                  <div className="flex flex-col items-center gap-4 py-8 animate-pulse">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                      <div className="absolute inset-2 bg-indigo-500/5 rounded-full flex items-center justify-center">
                        <Brain className="w-5 h-5 text-indigo-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Segmenting characters...</p>
                      <p className="text-[11px] text-gray-500 mt-1">Filtering static foreground noise grids</p>
                    </div>
                  </div>
                ) : solveError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Solving Failed</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{solveError}</p>
                    </div>
                  </div>
                ) : currentResult ? (
                  <div className="w-full flex flex-col gap-6" id="solve-result-panel">
                    
                    {/* Character Output Display */}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">Decoded Text</p>
                      <div className="text-5xl font-mono font-bold text-white tracking-widest select-all select-text font-serif bg-[#0F0F11]/90 py-5 px-6 rounded-2xl border border-[#262629] overflow-x-auto min-w-0 break-all max-w-full">
                        {currentResult.text}
                      </div>

                      {/* Mathematical explicit computation result, if any */}
                      {currentResult.mathResult && (
                        <div className="mt-4 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-mono">
                          <Calculator className="w-4 h-4" />
                          <span>Math Equation Result: <strong className="text-white underline decoration-emerald-400">{currentResult.mathResult}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Reasoning Details Card */}
                    <div className="bg-[#0F0F11] p-4 rounded-2xl border border-[#262629] text-left">
                      <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        <Brain className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cognitive Segment Analysis</span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed italic">
                        "{currentResult.reasoning}"
                      </p>
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="p-3 bg-[#0F0F11] rounded-2xl border border-[#262629] text-left">
                        <p className="text-[9px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">CONFIDENCE</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            currentResult.confidence === "high" 
                              ? "bg-green-500" 
                              : currentResult.confidence === "medium" 
                                ? "bg-yellow-500" 
                                : "bg-red-500"
                          }`}></span>
                          <span className="text-sm font-semibold uppercase text-white font-mono">{currentResult.confidence}</span>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-[#0F0F11] rounded-2xl border border-[#262629] text-left">
                        <p className="text-[9px] text-gray-500 mb-0.5 font-bold uppercase tracking-wider">DECODE LATENCY</p>
                        <p className="text-sm font-semibold font-mono text-white">
                          {solveSpeed ? `${solveSpeed}ms` : "1.2s"}
                        </p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-12 text-gray-600">
                    <HelpCircle className="w-10 h-10 stroke-1" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Awaiting Input</p>
                      <p className="text-[11px] text-gray-600 mt-1 max-w-[200px] leading-relaxed mx-auto">Upload, paste, or select a generated CAPTCHA to decrypt.</p>
                    </div>
                  </div>
                )}

              </div>

              {/* Click to Copy Decoded string */}
              <button
                disabled={!currentResult}
                onClick={() => currentResult && copyToClipboard(currentResult.text)}
                className={`w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg ${
                  currentResult 
                    ? "hover:bg-indigo-500 hover:shadow-indigo-600/10 active:scale-[0.98] cursor-pointer" 
                    : "opacity-30 border border-white/5 bg-white/5 text-gray-500 cursor-not-allowed"
                }`}
                id="btn-copy-result"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-white" /> COPIED!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-200" /> Copy CAPTCHA Answer
                  </>
                )}
              </button>

            </div>
          </div>

        </main>
      </div>

      {/* Footer bar */}
      <footer className="h-10 bg-[#141417] border-t border-[#262629] px-6 flex items-center justify-between text-[10px] text-gray-500 font-semibold uppercase tracking-wide shrink-0">
        <div className="flex items-center gap-4">
          <span>v4.2.1-stable</span>
          <span className="opacity-30">|</span>
          <span className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-indigo-500"></div> Host Region: US-EAST-1-RUN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>LATENCY: {solveSpeed ? `${solveSpeed}MS` : "1.2s"}</span>
          <span className="opacity-30">|</span>
          <span>UPTIME: 99.98%</span>
        </div>
      </footer>

    </div>
  );
}
