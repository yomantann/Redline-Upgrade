import { getAsset } from '@/game/assets';
import { getAssetArtworkUrl } from '@/game/asset-artwork';
import type { AssetLevel } from '@/game/assets';
import './asset-artwork.css';

const CATEGORY_ACCENTS = {
  car: '#d4e981',
  lifestyle: '#e9c477',
  pet: '#88c6c2',
  investment: '#a8df8d',
  property: '#f5a67e',
} as const;

function UpgradeDetails({ assetId, category, level }: { assetId: string; category: keyof typeof CATEGORY_ACCENTS; level: AssetLevel }) {
  const accent = CATEGORY_ACCENTS[category];
  return (
    <svg className="asset-upgrade-overlay" viewBox="0 0 640 640" aria-hidden="true" focusable="false" data-asset-id={assetId} data-asset-level={level}>
      <g className="asset-level-marker">
        <rect x="26" y="24" width="136" height="44" rx="6" fill="#111b17" stroke={accent} strokeWidth="4" />
        <text x="94" y="53" textAnchor="middle" fill={accent} fontFamily="Space Mono, monospace" fontSize="17" fontWeight="900">LEVEL {level}</text>
      </g>
      {level >= 2 && category === 'car' && (
        <g fill="none" stroke={accent} strokeWidth="12" strokeLinejoin="round">
          <path d="M454 173h104l-9 27H463l-18 19" />
          <path d="M486 172v-20m56 20v-20" strokeWidth="8" />
          <path d="M61 493h128" strokeWidth="8" />
        </g>
      )}
      {level >= 3 && category === 'car' && (
        <g fill="none" stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="M285 154h97l-12 25h-72z" />
          <path d="M115 464h390l-18 22H130z" />
          <circle cx="166" cy="472" r="15" fill={accent} stroke="none" />
          <circle cx="517" cy="437" r="15" fill={accent} stroke="none" />
        </g>
      )}
      {level >= 4 && category === 'car' && (
        <g fill="none" stroke={accent} strokeWidth="11" strokeLinejoin="round">
          <path d="m223 136 18-34h120l20 34" />
          <path d="m510 432 40-25 38 7-24 31z" />
          <path d="m77 452-35 19 19 20 40-11z" />
        </g>
      )}

      {level >= 2 && category === 'lifestyle' && (
        <g stroke={accent} strokeWidth="9" strokeLinejoin="round">
          <path d="m474 257 39-7 19 22-4 48-43 9-20-24z" fill="#222924" />
          <path d="m484 275 26-5m-19 21 30-6m-27 23 23-5" fill="none" />
          <circle cx="495" cy="336" r="8" fill={accent} stroke="none" />
        </g>
      )}
      {level >= 3 && category === 'lifestyle' && (
        <g stroke={accent} strokeWidth="9" strokeLinejoin="round">
          <path d="m84 423 43-26 34 20-6 53-54 14-22-20z" fill="#242c26" />
          <path d="m106 420 20 17 18-27" fill="none" />
          <path d="M105 459h37" fill="none" />
        </g>
      )}
      {level >= 4 && category === 'lifestyle' && (
        <g fill="none" stroke={accent} strokeWidth="11" strokeLinejoin="round">
          <path d="m484 164 31-29 31 29-31 30z" />
          <path d="M515 135v59m-31-30h62" />
          <circle cx="515" cy="164" r="7" fill={accent} stroke="none" />
        </g>
      )}

      {level >= 2 && category === 'pet' && (
        <g stroke={accent} strokeWidth="11" strokeLinejoin="round">
          <path d="M245 300q45 28 100-1l13 23q-64 38-126 1z" fill="#27332f" />
          <circle cx="305" cy="326" r="17" fill={accent} stroke="none" />
          <path d="m305 309 11 17-11 17-11-17z" fill="#28332e" stroke="none" />
        </g>
      )}
      {level >= 3 && category === 'pet' && (
        <g stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="m382 222 38-25 37 25-5 47-66 6z" fill="#283530" />
          <path d="m401 229 20-12 18 12v20h-38z" fill="none" />
          <circle cx="420" cy="239" r="7" fill={accent} stroke="none" />
        </g>
      )}
      {level >= 4 && category === 'pet' && (
        <g fill="none" stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="m156 121 23-39 23 39v37h-46z" />
          <path d="M179 83V56m-16 34h32" />
          <circle cx="179" cy="52" r="10" fill={accent} stroke="none" />
        </g>
      )}

      {level >= 2 && category === 'investment' && (
        <g stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="m492 213 67-70 38 2-3 39-78 77z" fill="#25332b" />
          <path d="m530 207 28 28m-5-69 34 1" fill="none" />
          <circle cx="572" cy="162" r="9" fill={accent} stroke="none" />
        </g>
      )}
      {level >= 3 && category === 'investment' && (
        <g stroke={accent} strokeWidth="9">
          <path d="M520 356h20v61h-20zm34-26h20v87h-20zm34-35h20v122h-20z" fill="#25332b" />
          <path d="M510 431h110" fill="none" />
        </g>
      )}
      {level >= 4 && category === 'investment' && (
        <g stroke={accent} strokeWidth="9" strokeLinejoin="round">
          <path d="m489 119 36-36 36 36-36 36z" fill="#26332b" />
          <path d="m525 101 16 18-16 18-16-18z" fill="none" />
          <path d="M525 83V61m-36 58h-22m94 0h22" fill="none" />
        </g>
      )}

      {level >= 2 && category === 'property' && (
        <g stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="m251 91 28-19 28 19v21h-56z" fill="#27332e" />
          <path d="M265 89h28v23h-28z" fill="none" />
          <path d="M279 72V58" fill="none" />
        </g>
      )}
      {level >= 3 && category === 'property' && (
        <g stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="M474 262h111v84H474z" fill="#27332e" />
          <path d="M464 263h130l-18-19H483z" fill="#27332e" />
          <path d="M492 282h27v31h-27zm47 0h27v31h-27z" fill="none" />
        </g>
      )}
      {level >= 4 && category === 'property' && (
        <g stroke={accent} strokeWidth="10" strokeLinejoin="round">
          <path d="m115 165 57-40 57 40v42H115z" fill="#27332e" />
          <path d="M143 166h24v27h-24zm37 0h24v27h-24z" fill="none" />
          <path d="M100 166h143" fill="none" />
        </g>
      )}
    </svg>
  );
}

export function AssetArtwork({
  assetId,
  level = 1,
  className,
  alt = '',
}: {
  assetId: string;
  level?: AssetLevel;
  className: string;
  alt?: string;
}) {
  const asset = getAsset(assetId);
  const artwork = getAssetArtworkUrl(assetId, level);
  if (!asset || !artwork) return null;
  const visualVariant = asset.visualVariants?.[level] ?? `${asset.id}:level-${level}`;
  return (
    <>
      <img
        className={className}
        src={artwork}
        alt={alt}
        data-asset-id={asset.id}
        data-asset-level={level}
        data-visual-variant={visualVariant}
        loading="eager"
        decoding="async"
        onLoad={event => {
          event.currentTarget.style.display = '';
          event.currentTarget.parentElement?.classList.remove('asset-artwork-failed');
        }}
        onError={event => {
          event.currentTarget.style.display = 'none';
          event.currentTarget.parentElement?.classList.add('asset-artwork-failed');
        }}
      />
      <span className="asset-artwork-unavailable" role="status">ARTWORK UNAVAILABLE</span>
      <UpgradeDetails assetId={asset.id} category={asset.category} level={level} />
    </>
  );
}