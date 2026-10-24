import type { WvsQuestion } from "./domain/country";
import type { ValueChoice } from "./domain/questions";
import { isTenPointScale, socialValueOptions } from "./domain/socialValues";

export default function SocialValueQuestion({ question, answer, onChange }: {
  question: WvsQuestion;
  answer: ValueChoice | undefined;
  onChange: (answer: ValueChoice) => void;
}) {
  const options = socialValueOptions(question);
  const selectedIndex = options.findIndex((option) => option.value === answer);
  const otherOptions = question.options.filter((option) => !option.scored && !/^(don't know|don't mind|no opinion)$/i.test(option.label));
  const otherSelected = otherOptions.some((option) => option.value === answer);
  const unknown = selectedIndex < 0 && !otherSelected;
  const slider = isTenPointScale(question);
  const name = `value-${question.id}`;

  return (
    <div className="value-question">
      <div className="value-prompt"><span>{question.area}</span><b id={`${name}-prompt`}>{question.prompt}</b></div>
      <fieldset className={`value-options ${slider ? "value-options-slider" : ""}`}>
        <legend className="visually-hidden">{question.prompt}</legend>
        <label className="value-option value-unknown">
          <input type="radio" name={name} checked={unknown} onChange={() => onChange("skip")} />
          <span>Don't know / no opinion</span>
        </label>
        {otherOptions.map((option) => (
          <label className="value-option value-unknown" key={option.value}>
            <input type="radio" name={name} checked={answer === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
        {slider ? (
          <div className="value-slider" data-answered={selectedIndex >= 0}>
            <input
              className="value-range"
              type="range"
              min={1}
              max={10}
              step={1}
              value={selectedIndex < 0 ? 5 : selectedIndex + 1}
              aria-labelledby={`${name}-prompt`}
              aria-valuetext={selectedIndex < 0 ? "No opinion" : `${selectedIndex + 1}: ${options[selectedIndex].label}`}
              onChange={(event) => onChange(options[Number(event.target.value) - 1].value)}
            />
            <div className="value-slider-ticks">
              {options.map((option, index) => (
                <label className="value-tick" key={option.value}>
                  <input type="radio" name={name} checked={answer === option.value} onChange={() => onChange(option.value)} aria-label={`${index + 1}: ${option.label}`} />
                  <span>{index + 1}</span>
                </label>
              ))}
            </div>
            <div className="value-slider-endpoints"><span>{options[0].label}</span><span>{options[options.length - 1].label}</span></div>
          </div>
        ) : options.map((option) => (
          <label className="value-option" key={option.value}>
            <input type="radio" name={name} checked={answer === option.value} onChange={() => onChange(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}