import type { Company } from '@shared/types.js';
import { NOT_ESTABLISHED } from '@shared/constants.js';

interface Props {
  company: Company;
}

function Field({ label, value }: { label: string; value: string }) {
  const absent = value.trim() === NOT_ESTABLISHED;
  return (
    <div className="py-3">
      <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
      <dd className={`mt-1 text-sm leading-relaxed ${absent ? 'text-ink-muted italic' : 'text-ink-soft'}`}>
        {value}
      </dd>
    </div>
  );
}

export default function CompanyPanel({ company }: Props) {
  return (
    <section aria-labelledby="company-heading">
      <h2 id="company-heading" className="font-display text-sm tracking-wide text-ink-soft uppercase">
        What the pitch communicates
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-muted">
        Drawn only from what is stated in the video. Anything absent is marked as not established.
      </p>

      <div className="border border-line bg-paper-raised px-4 sm:px-5">
        <dl className="divide-y divide-line">
          <Field label="Problem" value={company.problem} />
          <Field label="Customer" value={company.customer} />
          <Field label="Solution" value={company.solution} />
          <Field label="Business model" value={company.businessModel} />
        </dl>
      </div>

      {company.missingInformation.length > 0 && (
        <div className="mt-3 border-l-2 border-line-strong bg-paper-raised py-3 pl-4">
          <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Not covered in this pitch
          </h3>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {company.missingInformation.map((item) => (
              <li key={item} className="text-sm text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
