"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wine, Sparkles, Loader2, ArrowRight, Check } from "lucide-react";

interface Recommendation {
  name: string;
  distillery: string;
  region: string;
  type: string;
  reason: string;
  flavor_tags: string[];
}

type Step = "welcome" | "experience" | "flavors" | "style" | "region" | "budget" | "analyzing" | "results";

const FLAVOR_OPTIONS = [
  { id: "スモーキー", label: "スモーキー", desc: "焚き火やピートの香り" },
  { id: "フルーティー", label: "フルーティー", desc: "りんご、洋梨、柑橘" },
  { id: "甘い", label: "甘い", desc: "バニラ、キャラメル、蜂蜜" },
  { id: "スパイシー", label: "スパイシー", desc: "胡椒、シナモン、生姜" },
  { id: "フローラル", label: "フローラル", desc: "花のような華やかな香り" },
  { id: "リッチ", label: "リッチ", desc: "シェリー樽、ドライフルーツ" },
  { id: "クリーミー", label: "クリーミー", desc: "なめらかでまろやか" },
  { id: "潮風", label: "潮風・海", desc: "海の塩気、ヨード" },
];

const EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "はじめて", desc: "ウイスキーはまだ詳しくない" },
  { id: "casual", label: "たまに飲む", desc: "バーや居酒屋で時々" },
  { id: "enthusiast", label: "好き", desc: "自分で選んで楽しむ" },
  { id: "expert", label: "かなり飲む", desc: "銘柄や蒸留所に詳しい" },
];

const STYLE_OPTIONS = [
  { id: "straight", label: "ストレート", desc: "そのままの味わいを楽しむ" },
  { id: "rocks", label: "ロック", desc: "氷で冷やしてゆっくり" },
  { id: "highball", label: "ハイボール", desc: "ソーダで爽やかに" },
  { id: "mizuwari", label: "水割り", desc: "まろやかに楽しむ" },
  { id: "any", label: "いろいろ", desc: "気分で変える" },
];

const REGION_OPTIONS = [
  { id: "scotland", label: "スコットランド", desc: "ウイスキーの聖地" },
  { id: "japan", label: "日本", desc: "繊細で丁寧な味わい" },
  { id: "america", label: "アメリカ", desc: "バーボン・ライウイスキー" },
  { id: "ireland", label: "アイルランド", desc: "スムースで飲みやすい" },
  { id: "any", label: "特にこだわらない", desc: "いろいろ試したい" },
];

const BUDGET_OPTIONS = [
  { id: "under3000", label: "〜3,000円", desc: "気軽に楽しめる価格帯" },
  { id: "3000to5000", label: "3,000〜5,000円", desc: "少しいいものを" },
  { id: "5000to10000", label: "5,000〜10,000円", desc: "本格的に楽しむ" },
  { id: "over10000", label: "10,000円〜", desc: "特別な一本を" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [answers, setAnswers] = useState({
    experience: "",
    flavors: [] as string[],
    drinking_style: "",
    interest_region: "",
    budget: "",
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sommelierMessage, setSommelierMessage] = useState("");
  const router = useRouter();

  const handleFlavorToggle = (flavor: string) => {
    setAnswers((prev) => ({
      ...prev,
      flavors: prev.flavors.includes(flavor)
        ? prev.flavors.filter((f) => f !== flavor)
        : prev.flavors.length < 3
          ? [...prev.flavors, flavor]
          : prev.flavors,
    }));
  };

  const handleSubmit = async () => {
    setStep("analyzing");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
        setSommelierMessage(data.sommelier_message || "");
        setStep("results");
      } else {
        // Even on error, proceed to home
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  };

  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      // Ensure onboarding_completed is set before navigating
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // ignore - will try to navigate anyway
    }
    router.push("/");
  };

  const stepNumber = (() => {
    const steps: Step[] = ["experience", "flavors", "style", "region", "budget"];
    const idx = steps.indexOf(step);
    return idx >= 0 ? idx + 1 : 0;
  })();

  return (
    <div className="min-h-screen bg-whiskey-bg">
      {/* Progress bar */}
      {stepNumber > 0 && step !== "analyzing" && step !== "results" && (
        <div className="fixed top-0 left-0 right-0 z-10">
          <div className="h-1 bg-whiskey-border">
            <div
              className="h-full bg-whiskey-gold transition-all duration-500"
              style={{ width: `${(stepNumber / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Welcome */}
        {step === "welcome" && (
          <div className="flex flex-col items-center gap-6 py-12 animate-fadeIn">
            <div className="w-24 h-24 rounded-full bg-whiskey-gold/10 border-2 border-whiskey-gold flex items-center justify-center">
              <Wine size={40} className="text-whiskey-gold" />
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-2xl font-bold text-whiskey-text">
                ようこそ
              </h1>
              <p className="text-whiskey-gold font-serif text-lg">
                WHISKEY NOMITAI
              </p>
              <p className="text-whiskey-muted text-sm leading-relaxed">
                あなた専用のウイスキーソムリエAIです。
                <br />
                いくつか質問させてください。
                <br />
                あなたにぴったりのウイスキーを
                <br />
                ご提案します。
              </p>
            </div>
            <button
              onClick={() => setStep("experience")}
              className="bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              はじめる
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Experience */}
        {step === "experience" && (
          <QuestionStep
            question="ウイスキーの経験は？"
            subtitle="あなたに合わせたおすすめをご提案します"
            options={EXPERIENCE_OPTIONS}
            selected={answers.experience}
            onSelect={(v) => {
              setAnswers({ ...answers, experience: v });
              setTimeout(() => setStep("flavors"), 300);
            }}
          />
        )}

        {/* Flavors */}
        {step === "flavors" && (
          <div className="space-y-6 py-4 animate-fadeIn">
            <div className="text-center space-y-2">
              <p className="text-whiskey-gold text-xs font-bold tracking-wider">
                QUESTION 2/5
              </p>
              <h2 className="text-xl font-bold text-whiskey-text">
                惹かれる味わいは？
              </h2>
              <p className="text-whiskey-muted text-sm">
                最大3つまで選べます
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FLAVOR_OPTIONS.map((opt) => {
                const selected = answers.flavors.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleFlavorToggle(opt.id)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selected
                        ? "border-whiskey-gold bg-whiskey-gold/10"
                        : "border-whiskey-border bg-whiskey-card hover:border-whiskey-gold/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className={`text-sm font-bold ${selected ? "text-whiskey-gold" : "text-whiskey-text"}`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-whiskey-muted mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                      {selected && (
                        <Check size={16} className="text-whiskey-gold flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep("style")}
              disabled={answers.flavors.length === 0}
              className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold py-3 rounded-lg transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
            >
              次へ
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Drinking Style */}
        {step === "style" && (
          <QuestionStep
            question="よく飲む飲み方は？"
            subtitle="おすすめの銘柄選びの参考にします"
            questionNumber={3}
            options={STYLE_OPTIONS}
            selected={answers.drinking_style}
            onSelect={(v) => {
              setAnswers({ ...answers, drinking_style: v });
              setTimeout(() => setStep("region"), 300);
            }}
          />
        )}

        {/* Region */}
        {step === "region" && (
          <QuestionStep
            question="興味のある産地は？"
            subtitle="各産地には独自の個性があります"
            questionNumber={4}
            options={REGION_OPTIONS}
            selected={answers.interest_region}
            onSelect={(v) => {
              setAnswers({ ...answers, interest_region: v });
              setTimeout(() => setStep("budget"), 300);
            }}
          />
        )}

        {/* Budget */}
        {step === "budget" && (
          <QuestionStep
            question="1本あたりの予算は？"
            subtitle="コスパの良い銘柄をご提案します"
            questionNumber={5}
            options={BUDGET_OPTIONS}
            selected={answers.budget}
            onSelect={(v) => {
              setAnswers({ ...answers, budget: v });
              setTimeout(() => handleSubmit(), 300);
            }}
          />
        )}

        {/* Analyzing */}
        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-6 py-20 animate-fadeIn">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-whiskey-gold/10 border-2 border-whiskey-gold flex items-center justify-center">
                <Sparkles size={32} className="text-whiskey-gold" />
              </div>
              <Loader2
                size={80}
                className="absolute inset-0 animate-spin text-whiskey-gold/30"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-whiskey-gold font-bold">
                AIソムリエが分析中...
              </p>
              <p className="text-whiskey-muted text-sm">
                あなたにぴったりのウイスキーを
                <br />
                選んでいます
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {step === "results" && (
          <div className="space-y-6 py-4 animate-fadeIn">
            {/* Sommelier Message */}
            <div className="bg-gradient-to-br from-whiskey-gold/15 to-whiskey-gold/5 border border-whiskey-gold/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-whiskey-gold" />
                <p className="text-sm font-bold text-whiskey-gold">
                  AIソムリエより
                </p>
              </div>
              <p className="text-whiskey-text text-sm leading-relaxed">
                {sommelierMessage}
              </p>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-whiskey-gold">
                あなたへの最初のおすすめ
              </h2>
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-whiskey-card border border-whiskey-border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-whiskey-gold/10 border border-whiskey-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-whiskey-gold font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-whiskey-text">
                        {rec.name}
                      </h3>
                      <p className="text-xs text-whiskey-muted">
                        {[rec.distillery, rec.region, rec.type]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    </div>
                  </div>

                  {rec.flavor_tags && rec.flavor_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {rec.flavor_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-whiskey-gold/10 text-whiskey-gold text-xs rounded-full border border-whiskey-gold/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-whiskey-muted text-sm leading-relaxed pl-11">
                    {rec.reason}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="w-full bg-whiskey-gold hover:bg-whiskey-gold-dark text-whiskey-bg font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {finishing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    準備中...
                  </>
                ) : (
                  <>
                    ウイスキージャーナルをはじめる
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
              <p className="text-center text-xs text-whiskey-muted">
                記録するほど、AIソムリエがあなたの好みを学習します
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionStep({
  question,
  subtitle,
  questionNumber,
  options,
  selected,
  onSelect,
}: {
  question: string;
  subtitle: string;
  questionNumber?: number;
  options: { id: string; label: string; desc: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const qNum = questionNumber || 1;
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <div className="text-center space-y-2">
        <p className="text-whiskey-gold text-xs font-bold tracking-wider">
          QUESTION {qNum}/5
        </p>
        <h2 className="text-xl font-bold text-whiskey-text">{question}</h2>
        <p className="text-whiskey-muted text-sm">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selected === opt.id
                ? "border-whiskey-gold bg-whiskey-gold/10"
                : "border-whiskey-border bg-whiskey-card hover:border-whiskey-gold/30"
            }`}
          >
            <p
              className={`font-bold ${selected === opt.id ? "text-whiskey-gold" : "text-whiskey-text"}`}
            >
              {opt.label}
            </p>
            <p className="text-xs text-whiskey-muted mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
