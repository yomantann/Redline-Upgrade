import { CREDIT_EARNING_GUIDE } from '@/game/credit-rewards';

export function CreditEarningGuide({ compact = false }: { compact?: boolean }) {
  return (
    <details className={`credit-guide-disclosure${compact ? ' is-compact' : ''}`}>
      <summary>How to earn Credits <span aria-hidden="true">↗</span></summary>
      <div className="red-credit-guide">
        <div>
          <span className="eyebrow">CREDIT EARNING GUIDE</span>
          <h3>Ways to earn.</h3>
          <p>Game and endgame rewards are granted when an authenticated game is completed. Qualifying rewards can stack.</p>
        </div>
        <ul>
          {CREDIT_EARNING_GUIDE.map(row => (
            <li key={row.title}>
              <span>{row.title}</span>
              <strong>{row.value}{row.value !== 'Reward varies' ? ' Credits' : ''}</strong>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
