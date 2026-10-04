import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronRight, Globe2, Minus, Plus, RotateCcw } from "lucide-react";
import type { CountryDataset, MatchResult } from "./domain/country";
import { formatMedianValue, formatValue, getMedianBands, measureDetails, scoreCountries } from "./domain/matching";
import type { Answers, IdealChoice, MedianChoice } from "./domain/questions";
import {
  createEmptyAnswers,
  idealOptions,
  idealStatements,
  medianOptions,
  medianQuestions,
  pointGroups,
  TOTAL_PRIORITY_POINTS,
} from "./domain/questions";

type Screen = "intro" | "quiz" | "report" | "methodology";
const STORAGE_KEY = "country-matcher-answers-v2";

function readSavedAnswers(): Answers {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createEmptyAnswers();
    const parsed = JSON.parse(saved) as Partial<Answers>;
    return {
      ...createEmptyAnswers(),
      ...parsed,
      points: parsed.points ?? {},
      ideals: parsed.ideals ?? {},
      medians: parsed.medians ?? {},
    };
  } catch {
    return createEmptyAnswers();
  }
}

function App() {
  const [dataset, setDataset] = useState<CountryDataset | null>(null);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<Answers>(readSavedAnswers);
  const [screen, setScreen] = useState<Screen>("intro");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<MatchResult | null>(null);
  const returnScreen = useRef<Screen>("intro");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/countries.json`)
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
  const activeAnswerCount = Object.keys(answers.ideals).length
    + Object.values(answers.medians).filter((answer) => answer !== "skip").length
    + (answers.pointsSkipped ? 0 : 1);

  function openMethodology() {
    returnScreen.current = screen;
    setScreen("methodology");
  }

  function beginQuestionnaire() {
    setSelectedCountry(null);
    setSectionIndex(0);
    setScreen("quiz");
  }

  function finishQuestionnaire() {
    setSelectedCountry(null);
    setScreen("report");
  }

  function restart() {
    setAnswers(createEmptyAnswers());
    setSectionIndex(0);
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
        {screen === "quiz" && (
          <Questionnaire
            dataset={dataset}
            sectionIndex={sectionIndex}
            answers={answers}
            onPointsChange={(id, points) => setAnswers((current) => ({ ...current, points: { ...current.points, [id]: points }, pointsSkipped: false }))}
            onSkipPoints={() => setAnswers((current) => ({ ...current, pointsSkipped: true }))}
            onResumePoints={() => setAnswers((current) => ({ ...current, pointsSkipped: false }))}
            onIdealChange={(id, answer) => setAnswers((current) => ({ ...current, ideals: { ...current.ideals, [id]: answer } }))}
            onMedianChange={(id, answer) => setAnswers((current) => ({ ...current, medians: { ...current.medians, [id]: answer } }))}
            onBack={() => sectionIndex > 0 ? setSectionIndex(sectionIndex - 1) : setScreen("intro")}
            onNext={() => sectionIndex < 2 ? setSectionIndex(sectionIndex + 1) : finishQuestionnaire()}
          />
        )}
        {screen === "report" && (
          <Report
            dataset={dataset}
            results={results}
            selectedCountry={selectedCountry}
            activeAnswerCount={activeAnswerCount}
            onSelectCountry={setSelectedCountry}
            onEdit={() => { setSectionIndex(0); setScreen("quiz"); }}
            onRestart={restart}
            onBackToResults={() => setSelectedCountry(null)}
          />
        )}
        {screen === "methodology" && <Methodology onBack={() => setScreen(returnScreen.current)} />}
      </main>
      <footer className="site-footer">
        <span>Built from public country-level indicators</span>
        <span>Data snapshot · {dataset?.generatedAt}</span>
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
        <p className="intro-description">Take a stance on what your ideal country looks like. We’ll compare it with measured outcomes across countries and show which country is your best fit.</p>
        <div className="intro-actions">
          <button className="primary-button" onClick={onStart} disabled={!ready || !dataset}>Start the questions <ArrowRight size={17} /></button>
          <span className="time-note">Three sections <span>·</span> Skip any preference</span>
        </div>
        <div className="intro-footnote"><Check size={15} /> Your answers stay in this browser.</div>
      </div>
      <div className="intro-aside" aria-label="Project summary">
        <div className="aside-index"><span>THE IDEA</span></div>
        <p>There is no perfect country. Some may align more closely with your values and priorities.</p>
        <div className="aside-divider" />
        <div className="stat-row"><span className="stat-number">{dataset?.countryCount ?? "—"}</span><span>countries compared</span></div>
        <div className="stat-row"><span>using</span><span className="stat-number">{dataset?.measureCount ?? "—"}</span><span>different measures</span></div>
      </div>
    </section>
  );
}

function Questionnaire({
  dataset, sectionIndex, answers, onPointsChange, onSkipPoints, onResumePoints,
  onIdealChange, onMedianChange, onBack, onNext,
}: {
  dataset: CountryDataset | null;
  sectionIndex: number;
  answers: Answers;
  onPointsChange: (id: string, points: number) => void;
  onSkipPoints: () => void;
  onResumePoints: () => void;
  onIdealChange: (id: string, answer: IdealChoice) => void;
  onMedianChange: (id: string, answer: MedianChoice) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const sectionNames = ["Allocate 10 points", "Ideal society", "Relative to the median"];
  const pointsUsed = Object.values(answers.points).reduce((total, points) => total + points, 0);
  const pointsLeft = TOTAL_PRIORITY_POINTS - pointsUsed;
  const progress = ((sectionIndex + 1) / sectionNames.length) * 100;
  const canContinue = sectionIndex !== 0 || answers.pointsSkipped || pointsUsed === TOTAL_PRIORITY_POINTS;

  function adjustPoints(id: string, change: number) {
    const currentPoints = answers.points[id] ?? 0;
    const otherPoints = pointsUsed - currentPoints;
    const nextPoints = Math.max(0, Math.min(TOTAL_PRIORITY_POINTS - otherPoints, currentPoints + change));
    onPointsChange(id, nextPoints);
  }

  return (
    <section className="quiz-view">
      <div className="quiz-heading">
        <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="quiz-progress-copy"><span>YOUR PERSPECTIVE · {sectionNames[sectionIndex]}</span><span>{String(sectionIndex + 1).padStart(2, "0")} <i>/</i> 03</span></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="question-layout">
        <aside className="question-aside">
          <p className="aside-index">HOW IT WORKS</p>
          <p>{sectionIndex === 0
            ? "Each group is scored from the average of its available measures, then weighted by the points you assign. Life satisfaction always contributes separately to the general score."
            : sectionIndex === 1
              ? "Agreement uses a multiplier of +1 or +2. Disagreement uses -1 or -2, reversing the preferred direction. Neutral statements have no effect."
              : "The middle band is within 25% of the median. Slightly lower or higher bands are 26-50% away; much lower or higher bands are more than 50% away. Displayed ranges are rounded, but scoring uses exact values."}</p>
        </aside>
        <div className="question-main">
          {sectionIndex === 0 && (
            <>
              <div className="question-meta"><span className="question-number">01</span><span>Shared foundations</span></div>
              <h1>What should matter most in a society?</h1>
              <p className="question-detail">Allocate exactly 10 points across these areas. Every point increases that area's influence; you can place all 10 on one area.</p>
              <div className="allocation-summary"><b>{answers.pointsSkipped ? "Point allocation skipped" : `${pointsUsed} / ${TOTAL_PRIORITY_POINTS} points allocated`}</b><span>{answers.pointsSkipped ? "The general score still applies." : `${pointsLeft} ${pointsLeft === 1 ? "point" : "points"} left to place`}</span></div>
              <div className={`allocation-list ${answers.pointsSkipped ? "is-disabled" : ""}`}>
                {pointGroups.map((group) => {
                  const value = answers.points[group.id] ?? 0;
                  return (
                    <div className="allocation-row" key={group.id}>
                      <div className="allocation-copy"><b>{group.label}</b></div>
                      <div className="point-stepper">
                        <button className="stepper-button" onClick={() => adjustPoints(group.id, -1)} disabled={answers.pointsSkipped || value === 0} aria-label={`Remove one point from ${group.label}`}><Minus size={15} /></button>
                        <strong>{value}</strong>
                        <button className="stepper-button" onClick={() => adjustPoints(group.id, 1)} disabled={answers.pointsSkipped || pointsLeft === 0} aria-label={`Add one point to ${group.label}`}><Plus size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {sectionIndex === 1 && (
            <>
              <div className="question-meta"><span className="question-number">02</span><span>Personal ideals</span></div>
              <h1>My ideal society is characterized by…</h1>
              <p className="question-detail">Choose how much you agree with each statement. Agreement strength changes that statement's influence; disagreement reverses its direction. “It doesn't matter” leaves it out.</p>
              <div className="ideal-list">
                {idealStatements.map((statement) => (
                  <div className="ideal-row" key={statement.id}>
                    <b className="ideal-statement">{statement.statement}</b>
                    <fieldset className="ideal-choices">
                      <legend className="visually-hidden">{statement.statement}</legend>
                      {idealOptions.map((option) => (
                        <label className="ideal-choice" key={option.value}>
                          <input
                            type="radio"
                            name={statement.id}
                            value={option.value}
                            checked={answers.ideals[statement.id] === option.value}
                            onChange={() => onIdealChange(statement.id, option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                ))}
              </div>
            </>
          )}

          {sectionIndex === 2 && (
            <>
              <div className="question-meta"><span className="question-number">03</span><span>Policy preferences</span></div>
              <h1>How should these rates compare with the median?</h1>
              <p className="question-detail">Options show absolute value ranges calculated from the median of countries with data. A range is a preferred band, not a precise point target. You may skip any item.</p>
              <div className="median-list">
                {medianQuestions.map((question) => {
                  const reference = dataset ? getMedianBands(dataset, question.measure) : null;
                  const answer = answers.medians[question.id];
                  return (
                    <div className="median-question" key={question.id}>
                      {reference ? (
                        <>
                          <div className="median-prompt">
                            <p>{question.medianSentence.replace("{value}", formatMedianValue(reference.median, question.displayDecimals))}</p>
                            <b>How much do you think is appropriate?</b>
                          </div>
                          {reference.usesSpreadFallback && <p className="median-fallback-note">The median is zero or below, so the bands use percentile cutoffs from distinct observed values instead of relative percentages.</p>}
                          <div className="median-options" role="radiogroup" aria-label={`Preferred range for ${question.label}`}>
                            {medianOptions.map((option) => {
                              const band = reference.bands.find((item) => item.value === option.value);
                              return (
                                <button className={`median-option ${answer === option.value ? "is-selected" : ""}`} key={option.value} onClick={() => onMedianChange(question.id, option.value)} role="radio" aria-checked={answer === option.value}>
                                  <span>{option.label}</span><small>{band?.label}</small>
                                </button>
                              );
                            })}
                            <button className={`median-skip ${answer === "skip" ? "is-selected" : ""}`} onClick={() => onMedianChange(question.id, "skip")}>{answer === "skip" ? "Skipped" : "Skip"}</button>
                          </div>
                        </>
                      ) : <p className="median-fallback-note">No country data is available for this measure.</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="quiz-actions">
            {sectionIndex === 0 ? (
              <button className={`skip-button ${answers.pointsSkipped ? "is-selected" : ""}`} onClick={answers.pointsSkipped ? onResumePoints : onSkipPoints}>
                <ArrowDown size={15} /> {answers.pointsSkipped ? "Allocate points instead" : "Skip point allocation"}
              </button>
            ) : <span className="skip-hint">Unanswered items do not affect your score.</span>}
            <button className="primary-button next-button" onClick={onNext} disabled={!canContinue}>
              {sectionIndex === 2 ? "See my matches" : "Continue"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="quiz-footerline"><span>YOUR ANSWERS STAY IN THIS BROWSER</span><span>{sectionNames.length - sectionIndex - 1} SECTIONS LEFT</span></div>
    </section>
  );
}

function Report({
  dataset, results, selectedCountry, activeAnswerCount, onSelectCountry, onEdit, onRestart, onBackToResults,
}: {
  dataset: CountryDataset | null;
  results: MatchResult[];
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
        <h1>No countries meet the data coverage requirement.</h1>
        <p>Try changing or skipping some preferences. The general score always includes life satisfaction where data is available.</p>
        <button className="primary-button" onClick={onEdit}>Review my answers <ArrowRight size={16} /></button>
      </section>
    );
  }

  if (selectedCountry) return <CountryDetail result={selectedCountry} onBack={onBackToResults} />;

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
      <div className="report-context">Based on {activeAnswerCount} answered preferences plus the general score</div>
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
                <span className="ranking-name">{result.country.name}<small>{result.measureCount} measures · {Math.round(result.coverage * 100)}% coverage</small></span>
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

function CountryDetail({ result, onBack }: { result: MatchResult; onBack: () => void }) {
  const details = measureDetails(result);
  return (
    <section className="detail-view">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> All matches</button>
      <div className="detail-heading">
        <div><p className="eyebrow"><span className="eyebrow-rule" /> COUNTRY BREAKDOWN</p><h1>{result.country.name}</h1></div>
        <div className="detail-total"><b>{Math.round(result.score)}</b><span>FIT SCORE</span></div>
      </div>
      <p className="detail-lede">{Math.round(result.coverage * 100)}% of the weighted measures relevant to your answers are available for this country.</p>
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
      <p className="detail-note">Peer position is a percentile among countries with data for that measure. Target-range fit is calculated from the observed value's distance from your selected absolute band.</p>
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
        <article><span>01</span><h2>General score</h2><p>Life satisfaction always contributes to every country score, with higher values scoring higher. It has a fixed weight alongside the preferences you choose.</p></article>
        <article><span>02</span><h2>Ten priority points</h2><p>Points are distributed across nine shared-foundation areas. Each area averages its available measures, and the points weight that area's score.</p></article>
        <article><span>03</span><h2>Ideal society</h2><p>Agreement gives a positive multiplier of 1 or 2; disagreement gives a negative multiplier of 1 or 2 and reverses the preference direction. “It doesn't matter” excludes the statement.</p></article>
        <article><span>04</span><h2>Median ranges</h2><p>The middle band is within 25% of the median, slightly bands are 26-50% away, and much bands are more than 50% away. Displayed values are rounded; scoring uses exact boundaries.</p></article>
        <article><span>05</span><h2>Country data</h2><p>Most indicators are sourced from <a href="https://ourworldindata.org/" target="_blank" rel="noreferrer">Our World in Data</a>. Each country uses its latest available observation per measure, so years can differ.</p></article>
        <article><span>06</span><h2>Read with care</h2><p>Indicators are imperfect proxies and include value judgments. Missing measures lower data coverage; scores are preference-fit comparisons, not universal country rankings.</p></article>
      </div>
      <div className="method-warning"><b>Zero-median rates</b><p>When a measure's median is zero or below, relative percentages cannot define meaningful ranges. In that case the options use percentile cutoffs from the distinct observed values, avoiding negative or repeated bands where possible, and the questionnaire identifies this fallback.</p></div>
      <button className="text-action method-back" onClick={onBack}>Return to the comparison <ArrowRight size={15} /></button>
    </section>
  );
}

function ordinal(value: number) {
  const remainder = value % 100;
  const suffix = remainder >= 11 && remainder <= 13 ? "th" : ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}

export default App;