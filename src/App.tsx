import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronRight, Globe2, RotateCcw } from "lucide-react";
import type { CountryDataset, MatchResult } from "./domain/country";
import { measureDetails, scoreCountries } from "./domain/matching";
import type { Answer, Answers } from "./domain/questions";
import { importanceOptions, questions, targetOptions } from "./domain/questions";

type Screen = "intro" | "quiz" | "report" | "methodology";
const STORAGE_KEY = "country-matcher-answers-v1";

function readSavedAnswers(): Answers {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Answers : {};
  } catch {
    return {};
  }
}

function App() {
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<Answers>(readSavedAnswers);
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<MatchResult | null>(null);
  const returnScreen = useRef<Screen>("intro");

  useEffect(() => {
    fetch("/data/countries.json")
      .then((response) => {
        if (!response.ok) throw new Error("Country data could not be loaded.");
        return response.json() as Promise<CountryDataset>;
      })
      .then(setDataset)
      .catch(() => setLoadError("Country data is not available yet. Run the data preparation script, then reload."));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const results = dataset ? scoreCountries(dataset, answers) : [];
  const activeAnswerCount = Object.values(answers).filter((answer) => answer !== "skip").length;
  const question = questions[questionIndex];

  function updateAnswer(answer: Answer) {
    setAnswers((current) => ({ ...current, [question.id]: answer }));
  }

  function openMethodology() {
    returnScreen.current = screen;
    setScreen("methodology");
  }

  function beginQuestionnaire() {
    setSelectedCountry(null);
    setQuestionIndex(0);
    setScreen("quiz");
  }

  function finishQuestionnaire() {
    setSelectedCountry(null);
    setScreen("report");
  }

  function restart() {
    setAnswers({});
    setQuestionIndex(0);
    setSelectedCountry(null);
    setScreen("quiz");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("intro")} aria-label="Country Matcher home">
          <span className="brand-mark"><Globe2 size={18} strokeWidth={1.7} /></span>
          <span>COUNTRY <b>MATCHER</b></span>
        </button>
        <div className="topbar-right">
          <button className="text-action" onClick={openMethodology}>Our methodology</button>
        </div>
      </header>

      <main>
        {loadError && <div className="load-warning" role="status">{loadError}</div>}
        {screen === "intro" && <Intro dataset={dataset} onStart={beginQuestionnaire} ready={!loadError} />}
        {screen === "quiz" && question && (
          <Questionnaire
            question={question}
            index={questionIndex}
            answers={answers}
            onAnswer={updateAnswer}
            onBack={() => questionIndex > 0 ? setQuestionIndex(questionIndex - 1) : setScreen("intro")}
            onNext={() => questionIndex < questions.length - 1 ? setQuestionIndex(questionIndex + 1) : finishQuestionnaire()}
          />
        )}
        {screen === "report" && (
          <Report
            dataset={dataset}
            results={results}
            answers={answers}
            selectedCountry={selectedCountry}
            activeAnswerCount={activeAnswerCount}
            onSelectCountry={setSelectedCountry}
            onEdit={() => { setQuestionIndex(0); setScreen("quiz"); }}
            onRestart={restart}
            onBackToResults={() => setSelectedCountry(null)}
          />
        )}
        {screen === "methodology" && <Methodology onBack={() => setScreen(returnScreen.current)} />}
      </main>
      <footer className="site-footer">
        <span>Built from public country-level indicators</span>
        <span>Scores describe fit with your stated preferences, not a universal ranking.</span>
      </footer>
    </div>
  );
}

function Intro({ dataset, onStart, ready }: { dataset: CountryDataset | null; onStart: () => void; ready: boolean }) {
  return (
    <section className="intro-view">
      <div className="intro-copy">
        <p className="eyebrow"><span className="eyebrow-rule" /> Find your dream country.</p>
        <h1>Where would your values feel <em>at home?</em></h1>
        <p className="intro-description">
          Take a stance on what your ideal country looks like. We’ll compare it with measured outcomes across countries and show which country is your best fit.
        </p>
        <div className="intro-actions">
          <button className="primary-button" onClick={onStart} disabled={!ready || !dataset}>
            Start the questions <ArrowRight size={17} />
          </button>
          <span className="time-note">About 5 minutes <span>·</span> 12 questions</span>
        </div>
        <div className="intro-footnote"><Check size={15} /> Your answers are not saved or shared.</div>
      </div>
      <div className="intro-aside" aria-label="Project summary">
        <div className="aside-index"><span>THE IDEA</span></div>
        <p>There is no perfect country. But some may align more closely with your values and priorities.</p>
        <div className="aside-divider" />
        <div className="stat-row">
          <span className="stat-number">{dataset?.countryCount ?? "—"}</span>
          <span>countries compared</span>
        </div>
        <div className="stat-row">
          <span>over</span>
          <span className="stat-number">{dataset?.measureCount ?? "—"}</span>
          <span>different measures</span>
        </div>
        {dataset && <p className="data-date">Data snapshot · {dataset.generatedAt}</p>}
      </div>
    </section>
  );
}

function Questionnaire({
  question, index, answers, onAnswer, onBack, onNext,
}: {
  question: (typeof questions)[number];
  index: number;
  answers: Answers;
  onAnswer: (answer: Answer) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const answer = answers[question.id];
  const progress = ((index + 1) / questions.length) * 100;
  const canContinue = Boolean(answer);

  return (
    <section className="quiz-view">
      <div className="quiz-heading">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="quiz-progress-copy"><span>YOUR PERSPECTIVE</span><span>{String(index + 1).padStart(2, "0")} <i>/</i> {String(questions.length).padStart(2, "0")}</span></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="question-layout">
        <div className="question-main">
          <div className="question-meta"><span className="question-number">{String(index + 1).padStart(2, "0")}</span><span>{question.areaLabel}</span></div>
          <h1>{question.title}</h1>
          <p className="question-detail">{question.detail}</p>
          {question.type === "priority" ? (
            <div className="choice-list" role="radiogroup" aria-label="How much this area matters">
              {importanceOptions.map((option, optionIndex) => (
                <button
                  className={`choice-row ${answer === option.value ? "is-selected" : ""}`}
                  key={option.value}
                  onClick={() => onAnswer(option.value)}
                  role="radio"
                  aria-checked={answer === option.value}
                >
                  <span className="choice-number">0{optionIndex + 1}</span>
                  <span className="choice-label">{option.label}</span>
                  <span className="choice-scale">{option.score === 3 ? "A major priority" : option.score === 2 ? "Matters to me" : "A smaller factor"}</span>
                  <span className="choice-check">{answer === option.value && <Check size={15} />}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="target-options" role="radiogroup" aria-label="Preferred level compared with other countries">
              {targetOptions.map((option) => (
                <button
                  className={`target-option ${answer === option.value ? "is-selected" : ""}`}
                  key={option.value}
                  onClick={() => onAnswer(option.value)}
                  role="radio"
                  aria-checked={answer === option.value}
                >
                  <span className="target-tick" /><span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="quiz-actions">
            <button className={`skip-button ${answer === "skip" ? "is-selected" : ""}`} onClick={() => onAnswer("skip")}>
              <ArrowDown size={15} /> Skip this question
            </button>
            <button className="primary-button next-button" onClick={onNext} disabled={!canContinue}>
              {index === questions.length - 1 ? "See my matches" : "Continue"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <aside className="question-aside">
          <p className="aside-index">HOW IT WORKS</p>
          <p>{question.type === "priority"
            ? "Your answer sets the weight this area has in your results. Skipped areas do not count toward your score."
            : "Choose a preferred position relative to other countries. Your match is closer when a country is nearer to that position."}</p>
        </aside>
      </div>
    </section>
  );
}

function Report({
  dataset, results, answers, selectedCountry, activeAnswerCount, onSelectCountry, onEdit, onRestart, onBackToResults,
}: {
  dataset: CountryDataset | null;
  results: MatchResult[];
  answers: Answers;
  selectedCountry: MatchResult | null;
  activeAnswerCount: number;
  onSelectCountry: (result: MatchResult) => void;
  onEdit: () => void;
  onRestart: () => void;
  onBackToResults: () => void;
}) {
  if (!dataset) return <section className="report-view"><p>Loading country data…</p></section>;
  if (!results.length) {
    return (
      <section className="empty-report">
        <p className="eyebrow"><span className="eyebrow-rule" /> YOUR MATCH REPORT</p>
        <h1>Let’s give the comparison a little more to work with.</h1>
        <p>Choose at least one priority area and answer its importance question. With too few preferences, a country ranking would not mean much.</p>
        <button className="primary-button" onClick={onEdit}>Review my answers <ArrowRight size={16} /></button>
      </section>
    );
  }

  if (selectedCountry) {
    return (
      <CountryDetail result={selectedCountry} answers={answers} onBack={onBackToResults} />
    );
  }

  const leader = results[0];
  const bestArea = [...leader.areas].sort((a, b) => b.score - a.score)[0];
  const weakestArea = [...leader.areas].sort((a, b) => a.score - b.score)[0];
  const balancedFit = bestArea && weakestArea && bestArea.score - weakestArea.score < 5;

  return (
    <section className="report-view">
      <div className="report-topline">
        <div><p className="eyebrow"><span className="eyebrow-rule" /> YOUR MATCH REPORT</p><h1>A society that fits <em>your priorities.</em></h1></div>
        <button className="icon-text-button" onClick={onRestart}><RotateCcw size={15} /> Start over</button>
      </div>
      <div className="report-context">Based on {activeAnswerCount} answers</div>
      <div className="leader-panel">
        <div className="leader-rank"><span>01</span><span>YOUR CLOSEST FIT</span></div>
        <div className="leader-country"><h2>{leader.country.name}</h2><p>{leader.measureCount} matched measures · {Math.round(leader.coverage * 100)}% data coverage</p></div>
        <div className="leader-score"><strong>{Math.round(leader.score)}</strong><span>FIT SCORE</span></div>
        <div className="leader-insight"><span className="insight-label">WHY IT RANKS FIRST</span><p>{balancedFit ? <>Fit is balanced across <b>{bestArea?.label}</b> and <b>{weakestArea?.label}</b>.</> : <><b>{bestArea?.label}</b> aligns especially well; <b>{weakestArea?.label}</b> is a weaker fit.</>}</p></div>
      </div>
      <div className="report-columns">
        <section className="ranking-section">
          <div className="section-heading"><div><span className="section-kicker">THE SHORTLIST</span><h2>Closest country fits</h2></div><span className="muted-label">SCORED AGAINST YOUR ANSWERS</span></div>
          <div className="ranking-list">
            {results.slice(0, 3).map((result, index) => (
              <button className={`ranking-row ${index === 0 ? "is-first" : ""}`} key={result.country.name} onClick={() => onSelectCountry(result)}>
                <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="ranking-name">{result.country.name}<small>{result.measureCount} available measures · {Math.round(result.coverage * 100)}% coverage</small></span>
                <span className="ranking-meter"><i style={{ width: `${result.score}%` }} /></span>
                <strong className="ranking-score">{Math.round(result.score)}</strong>
                <ChevronRight className="ranking-chevron" size={16} />
              </button>
            ))}
          </div>
        </section>
        <section className="fit-section">
          <div className="section-heading"><div><span className="section-kicker">A CLOSER LOOK</span><h2>{leader.country.name}</h2></div></div>
          <div className="area-breakdown">
            {leader.areas.map((area) => (
              <div className="area-row" key={area.key}>
                <div className="area-row-label"><span>{area.label}</span><b>{Math.round(area.score)}</b></div>
                <div className="area-track"><i style={{ width: `${area.score}%` }} /></div>
              </div>
            ))}
          </div>
          <button className="detail-link" onClick={() => onSelectCountry(leader)}>Explore the score breakdown <ArrowRight size={15} /></button>
        </section>
      </div>
      <div className="report-caveat"><span className="caveat-mark">i</span><p>This is a preference-fit score, not a quality-of-life verdict. Countries with missing data may have lower coverage, and each measure may come from a different year.</p></div>
    </section>
  );
}

function CountryDetail({ result, answers, onBack }: { result: MatchResult; answers: Answers; onBack: () => void }) {
  const details = measureDetails(result, answers);
  return (
    <section className="detail-view">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> All matches</button>
      <div className="detail-heading">
        <div><p className="eyebrow"><span className="eyebrow-rule" /> COUNTRY BREAKDOWN</p><h1>{result.country.name}</h1></div>
        <div className="detail-total"><b>{Math.round(result.score)}</b><span>FIT SCORE</span></div>
      </div>
      <p className="detail-lede">{Math.round(result.coverage * 100)}% of the measures relevant to your answers are available for this country.</p>
      <div className="detail-table-wrap">
        <table className="detail-table">
          <thead><tr><th>AREA / MEASURE</th><th>OBSERVED VALUE</th><th>YEAR</th><th>PEER POSITION</th><th>FIT</th></tr></thead>
          <tbody>
            {details.map((item) => (
              <tr key={`${item.label}-${item.area}`}>
                <td><span className="table-area">{item.area}</span><b>{item.label}</b></td>
                  <td>{formatValue(item.value)} <span className="value-unit">{item.unit}</span><span className="mobile-year">{item.year}</span></td>
                <td>{item.year}</td>
                <td><span className="percentile-indicator"><i style={{ left: `${item.percentile}%` }} /></span>{ordinal(Math.round(item.percentile))}</td>
                <td><b className="table-fit">{Math.round(item.score)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="detail-note">Peer position is a percentile within countries that have data for that measure. Observation years can differ by measure; the methodology explains the scoring and indicator limitations.</p>
    </section>
  );
}

function Methodology({ onBack }: { onBack: () => void }) {
  return (
    <section className="methodology-view">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to the site</button>
      <p className="eyebrow"><span className="eyebrow-rule" /> HOW THE MATCH WORKS</p>
      <h1>Preferences in.<br /><em>Evidence alongside.</em></h1>
      <div className="method-grid">
        <article><span>01</span><h2>Your priorities</h2><p>Importance answers determine how much each area contributes. Skipped areas are left out entirely; they are not treated as a neutral preference.</p></article>
        <article><span>02</span><h2>Country measures</h2><p>Most indicators are sourced from <a href="https://ourworldindata.org/" target="_blank" rel="noreferrer">Our World in Data</a>, alongside local OWID extracts. Each country uses its latest available observation per measure; years can differ, and the report shows the year used.</p></article>
        <article><span>03</span><h2>Fit, not rank of worth</h2><p>For measures with a stated direction, country percentiles are used. For personal targets, countries score higher when their percentile is closer to your selected position.</p></article>
        <article><span>04</span><h2>Missing information</h2><p>Country scores use available measures only. A minimum coverage is required for a country to appear, and coverage is shown beside each match.</p></article>
      </div>
      <div className="method-warning"><b>Read the score with care.</b><p>Indicators are imperfect proxies, do not capture every lived experience, and include value judgments about direction. A high score is not a claim that a country is universally better or that you would necessarily be happy living there.</p></div>
      <button className="text-action method-back" onClick={onBack}>Return to the comparison <ArrowRight size={15} /></button>
    </section>
  );
}

function formatValue(value: number) {
  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 }).format(value);
}

function ordinal(value: number) {
  const remainder = value % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}

export default App;