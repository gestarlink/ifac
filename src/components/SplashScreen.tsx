import { useEffect, useState } from "react";
import logo from "@/assets/logo-fac.png";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

const SplashScreen = ({ onFinish, duration = 2500 }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setExiting(true), duration - 400);
    const t2 = window.setTimeout(() => onFinish(), duration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(circle at center, hsl(215 90% 18%) 0%, hsl(215 90% 8%) 70%, hsl(215 90% 5%) 100%)",
      }}
    >
      {/* halo pulsante */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div
          className="absolute w-56 h-56 rounded-full border border-primary/30"
          style={{ animation: "splash-ring 2.2s ease-out infinite" }}
        />
        <img
          src={logo}
          alt="Instituto FAC"
          className="relative w-56 h-56 object-contain drop-shadow-[0_0_30px_hsl(215_90%_55%/0.5)]"
          style={{ animation: "splash-logo 1.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        />
      </div>

      <div className="mt-10 text-center">
        <h1
          className="text-white font-display font-bold text-2xl tracking-wide"
          style={{ animation: "splash-text 1s ease-out 0.4s both" }}
        >
          Instituto
        </h1>
        <p
          className="text-white/70 text-sm mt-2"
          style={{ animation: "splash-text 1s ease-out 0.7s both" }}
        >
          Formando Águias & Campeões
        </p>
        <div className="mt-6 flex justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      <style>{`
        @keyframes splash-logo {
          0% { transform: scale(0.4) rotate(-12deg); opacity: 0; filter: blur(8px); }
          60% { transform: scale(1.08) rotate(2deg); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes splash-ring {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes splash-text {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
