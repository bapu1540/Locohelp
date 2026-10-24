import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public declare props: Props;
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("LocoHelp ErrorBoundary caught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAll = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-amber-500/15 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-white">
                Something went wrong
              </h2>
              <p className="text-sm font-bold text-amber-300">
                कृपया पेज रीलोड करें (Please reload the page)
              </p>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                An unexpected interface issue occurred. Your saved account data and profiles are completely safe. Please reload to refresh the application.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page / पेज रीलोड करें</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAll}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Clear Cache &amp; Fresh Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
